package fnb

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

type Repository struct {
	db  *sqlx.DB
	rdb *redis.Client
}

func NewRepository(db *sqlx.DB, rdb *redis.Client) *Repository {
	return &Repository{db: db, rdb: rdb}
}

func (r *Repository) menuCacheKey(tenantID uuid.UUID, search string) string {
	search = strings.ToLower(strings.TrimSpace(search))
	if search == "" {
		search = "all"
	}
	return fmt.Sprintf("fnb:menu:%s:%s", tenantID.String(), search)
}

func (r *Repository) InvalidateTenantCache(ctx context.Context, tenantID uuid.UUID) {
	if r.rdb == nil {
		return
	}
	keys, err := r.rdb.Keys(ctx, fmt.Sprintf("fnb:menu:%s:*", tenantID.String())).Result()
	if err == nil && len(keys) > 0 {
		_ = r.rdb.Del(ctx, keys...).Err()
	}
	var slug string
	if err := r.db.GetContext(ctx, &slug, "SELECT slug FROM tenants WHERE id = $1", tenantID); err == nil {
		_ = r.rdb.Del(ctx, fmt.Sprintf("landing:full:%s", strings.ToLower(strings.TrimSpace(slug)))).Err()
	}
}

// Create menyisipkan item FnB baru
func (r *Repository) Create(ctx context.Context, item Item) error {
	query := `
		INSERT INTO fnb_items (
			id, tenant_id, name, description, price, 
			category, image_url, is_available
		) 
		VALUES (
			:id, :tenant_id, :name, :description, :price, 
			:category, :image_url, :is_available
		)`

	_, err := r.db.NamedExecContext(ctx, query, item)
	if err != nil {
		// Log ini sangat penting untuk debug error 500 tadi
		fmt.Printf("❌ REPO_ERROR (Create): %v\n", err)
		return err
	}
	r.InvalidateTenantCache(ctx, item.TenantID)
	return nil
}

// ListByTenant mengambil semua item milik tenant dengan fitur Search
func (r *Repository) ListByTenant(ctx context.Context, tenantID uuid.UUID, search string) ([]Item, error) {
	// Inisialisasi slice kosong agar JSON return [] bukan null
	items := []Item{}
	cacheKey := r.menuCacheKey(tenantID, search)
	if r.rdb != nil {
		if val, err := r.rdb.Get(ctx, cacheKey).Result(); err == nil {
			if err := json.Unmarshal([]byte(val), &items); err == nil {
				return items, nil
			}
		}
	}

	query := `SELECT * FROM fnb_items WHERE tenant_id = $1`
	params := []interface{}{tenantID}

	// Logic Search: Cari di Nama, Kategori, atau Deskripsi (Insenstive Like)
	if search != "" {
		query += ` AND (name ILIKE $2 OR category ILIKE $2 OR description ILIKE $2)`
		params = append(params, "%"+search+"%")
	}

	query += ` ORDER BY category ASC, name ASC`

	err := r.db.SelectContext(ctx, &items, query, params...)
	if err != nil {
		fmt.Printf("❌ REPO_ERROR (List): %v\n", err)
		return items, err
	}
	if r.rdb != nil {
		if raw, err := json.Marshal(items); err == nil {
			_ = r.rdb.Set(ctx, cacheKey, raw, 30*time.Minute).Err()
		}
	}
	return items, nil
}

// GetByID mengambil detail satu item FnB
func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Item, error) {
	var item Item
	query := `SELECT * FROM fnb_items WHERE id = $1`
	err := r.db.GetContext(ctx, &item, query, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &item, err
}

// Update memperbarui data item termasuk description dan status availability
func (r *Repository) Update(ctx context.Context, item Item) error {
	query := `
		UPDATE fnb_items 
		SET 
			name = :name, 
			description = :description,
			price = :price, 
			category = :category, 
			image_url = :image_url, 
			is_available = :is_available 
		WHERE id = :id AND tenant_id = :tenant_id`

	_, err := r.db.NamedExecContext(ctx, query, item)
	if err != nil {
		fmt.Printf("❌ REPO_ERROR (Update): %v\n", err)
		return err
	}
	r.InvalidateTenantCache(ctx, item.TenantID)
	return nil
}

// Delete menghapus item dengan proteksi tenant_id
func (r *Repository) Delete(ctx context.Context, id uuid.UUID, tenantID uuid.UUID) error {
	query := `DELETE FROM fnb_items WHERE id = $1 AND tenant_id = $2`
	_, err := r.db.ExecContext(ctx, query, id, tenantID)
	if err != nil {
		fmt.Printf("❌ REPO_ERROR (Delete): %v\n", err)
		return err
	}
	r.InvalidateTenantCache(ctx, tenantID)
	return nil
}

func (r *Repository) CreateOrder(ctx context.Context, tenantID uuid.UUID, createdBy *uuid.UUID, req CreateOrderReq) (*Order, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	orderID := uuid.New()
	now := time.Now()
	orderNumber := fmt.Sprintf("FNB-%s-%s", now.Format("20060102-150405"), strings.ToUpper(orderID.String()[:6]))
	source := "standalone"
	var bookingID *uuid.UUID
	var customerID *uuid.UUID

	if strings.TrimSpace(req.BookingID) != "" {
		parsed, err := uuid.Parse(strings.TrimSpace(req.BookingID))
		if err != nil {
			return nil, fmt.Errorf("booking tidak valid")
		}
		var booking struct {
			ID         uuid.UUID `db:"id"`
			CustomerID uuid.UUID `db:"customer_id"`
		}
		if err := tx.GetContext(ctx, &booking, `
			SELECT id, customer_id
			FROM bookings
			WHERE id = $1 AND tenant_id = $2
			LIMIT 1`, parsed, tenantID); err != nil {
			return nil, fmt.Errorf("booking tidak ditemukan untuk tenant ini")
		}
		bookingID = &booking.ID
		customerID = &booking.CustomerID
		source = "booking"
	}

	paymentMethod := strings.TrimSpace(req.PaymentMethod)
	if paymentMethod == "" {
		paymentMethod = "cash"
	}

	subtotal := 0.0
	snapshots := make([]struct {
		Item     Item
		Quantity int
		Subtotal float64
	}, 0, len(req.Items))
	for _, input := range req.Items {
		itemID, err := uuid.Parse(strings.TrimSpace(input.FnbItemID))
		if err != nil {
			return nil, fmt.Errorf("item menu tidak valid")
		}
		qty := input.Quantity
		if qty <= 0 {
			return nil, fmt.Errorf("quantity harus lebih dari 0")
		}
		var item Item
		if err := tx.GetContext(ctx, &item, `
			SELECT *
			FROM fnb_items
			WHERE id = $1 AND tenant_id = $2 AND is_available = true
			LIMIT 1`, itemID, tenantID); err != nil {
			return nil, fmt.Errorf("menu tidak ditemukan atau sedang habis")
		}
		lineTotal := item.Price * float64(qty)
		subtotal += lineTotal
		snapshots = append(snapshots, struct {
			Item     Item
			Quantity int
			Subtotal float64
		}{Item: item, Quantity: qty, Subtotal: lineTotal})
	}
	if len(snapshots) == 0 {
		return nil, fmt.Errorf("minimal pilih satu menu")
	}

	order := Order{
		ID:              orderID,
		TenantID:        tenantID,
		BookingID:       bookingID,
		CustomerID:      customerID,
		OrderNumber:     orderNumber,
		Source:          source,
		Status:          "completed",
		PaymentStatus:   "settled",
		PaymentMethod:   paymentMethod,
		Subtotal:        subtotal,
		DiscountAmount:  0,
		GrandTotal:      subtotal,
		Notes:           strings.TrimSpace(req.Notes),
		CreatedByUserID: createdBy,
		CompletedAt:     &now,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if _, err := tx.NamedExecContext(ctx, `
		INSERT INTO fnb_orders (
			id, tenant_id, booking_id, customer_id, order_number, source, status,
			payment_status, payment_method, subtotal, discount_amount, grand_total,
			notes, created_by_user_id, completed_at, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :booking_id, :customer_id, :order_number, :source, :status,
			:payment_status, :payment_method, :subtotal, :discount_amount, :grand_total,
			:notes, :created_by_user_id, :completed_at, :created_at, :updated_at
		)`, order); err != nil {
		return nil, err
	}

	for _, snapshot := range snapshots {
		var legacyOrderItemID *uuid.UUID
		if bookingID != nil {
			legacyID := uuid.New()
			if _, err := tx.ExecContext(ctx, `
				INSERT INTO order_items (id, booking_id, fnb_item_id, quantity, price_at_purchase, status)
				VALUES ($1, $2, $3, $4, $5, 'delivered')`,
				legacyID, *bookingID, snapshot.Item.ID, snapshot.Quantity, snapshot.Item.Price); err != nil {
				return nil, err
			}
			legacyOrderItemID = &legacyID
		}

		if _, err := tx.ExecContext(ctx, `
			INSERT INTO fnb_order_items (
				id, fnb_order_id, fnb_item_id, booking_order_item_id, item_name,
				category, quantity, unit_price, subtotal
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			uuid.New(), orderID, snapshot.Item.ID, legacyOrderItemID, snapshot.Item.Name,
			snapshot.Item.Category, snapshot.Quantity, snapshot.Item.Price, snapshot.Subtotal); err != nil {
			return nil, err
		}
	}

	if bookingID != nil {
		if err := recalculateBookingTotals(ctx, tx, *bookingID); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return r.GetOrderByID(ctx, tenantID, orderID)
}

func (r *Repository) ListOrders(ctx context.Context, tenantID uuid.UUID, source string, limit int) ([]Order, error) {
	if limit <= 0 || limit > 100 {
		limit = 30
	}
	orders := []Order{}
	query := `
		SELECT
			fo.*,
			COALESCE(NULLIF(CONCAT(c.name, ' / ', res.name), ' / '), '') AS booking_label
		FROM fnb_orders fo
		LEFT JOIN bookings b ON b.id = fo.booking_id
		LEFT JOIN customers c ON c.id = b.customer_id
		LEFT JOIN resources res ON res.id = b.resource_id
		WHERE fo.tenant_id = $1`
	args := []any{tenantID}
	if source == "standalone" || source == "booking" {
		query += ` AND fo.source = $2`
		args = append(args, source)
	}
	query += fmt.Sprintf(` ORDER BY fo.created_at DESC LIMIT %d`, limit)

	if err := r.db.SelectContext(ctx, &orders, query, args...); err != nil {
		return orders, err
	}
	for i := range orders {
		items, err := r.ListOrderItems(ctx, orders[i].ID)
		if err != nil {
			return orders, err
		}
		orders[i].Items = items
	}
	return orders, nil
}

func (r *Repository) GetOrderByID(ctx context.Context, tenantID, orderID uuid.UUID) (*Order, error) {
	var order Order
	if err := r.db.GetContext(ctx, &order, `
		SELECT
			fo.*,
			COALESCE(NULLIF(CONCAT(c.name, ' / ', res.name), ' / '), '') AS booking_label
		FROM fnb_orders fo
		LEFT JOIN bookings b ON b.id = fo.booking_id
		LEFT JOIN customers c ON c.id = b.customer_id
		LEFT JOIN resources res ON res.id = b.resource_id
		WHERE fo.id = $1 AND fo.tenant_id = $2
		LIMIT 1`, orderID, tenantID); err != nil {
		return nil, err
	}
	items, err := r.ListOrderItems(ctx, orderID)
	if err != nil {
		return nil, err
	}
	order.Items = items
	return &order, nil
}

func (r *Repository) ListOrderItems(ctx context.Context, orderID uuid.UUID) ([]OrderItem, error) {
	items := []OrderItem{}
	err := r.db.SelectContext(ctx, &items, `
		SELECT *
		FROM fnb_order_items
		WHERE fnb_order_id = $1
		ORDER BY created_at ASC`, orderID)
	return items, err
}

func (r *Repository) OrderSummary(ctx context.Context, tenantID uuid.UUID) (OrderSummary, error) {
	var summary OrderSummary
	err := r.db.GetContext(ctx, &summary, `
		SELECT
			COUNT(*)::int AS total_orders,
			COUNT(*) FILTER (WHERE source = 'standalone')::int AS standalone_orders,
			COUNT(*) FILTER (WHERE source = 'booking')::int AS booking_orders,
			COALESCE(SUM(grand_total), 0) AS total_revenue,
			COALESCE(SUM(grand_total) FILTER (WHERE source = 'standalone'), 0) AS standalone_revenue,
			COALESCE(SUM(grand_total) FILTER (WHERE source = 'booking'), 0) AS booking_revenue
		FROM fnb_orders
		WHERE tenant_id = $1
			AND status = 'completed'`, tenantID)
	return summary, err
}

func recalculateBookingTotals(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID) error {
	var totals struct {
		OriginalTotal  float64 `db:"original_total"`
		DiscountAmount float64 `db:"discount_amount"`
		PaidAmount     float64 `db:"paid_amount"`
		DepositAmount  float64 `db:"deposit_amount"`
		PaymentStatus  string  `db:"payment_status"`
	}
	if err := sqlx.GetContext(ctx, exec, &totals, `
		SELECT
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0)
				+ COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) AS original_total,
			COALESCE(b.discount_amount, 0) AS discount_amount,
			COALESCE(b.paid_amount, 0) AS paid_amount,
			COALESCE(b.deposit_amount, 0) AS deposit_amount,
			COALESCE(b.payment_status, '') AS payment_status
		FROM bookings b
		WHERE b.id = $1
		LIMIT 1`, bookingID); err != nil {
		return err
	}
	grandTotal := totals.OriginalTotal - totals.DiscountAmount
	if grandTotal < 0 {
		grandTotal = 0
	}
	paidAmount := totals.PaidAmount
	if totals.PaymentStatus == "partial_paid" || totals.PaymentStatus == "paid" || totals.PaymentStatus == "settled" {
		if totals.DepositAmount > paidAmount {
			paidAmount = totals.DepositAmount
		}
	}
	balanceDue := grandTotal - paidAmount
	if balanceDue < 0 {
		balanceDue = 0
	}
	_, err := exec.ExecContext(ctx, `
		UPDATE bookings
		SET original_grand_total = $2,
			grand_total = $3,
			paid_amount = $4,
			balance_due = $5
		WHERE id = $1`, bookingID, totals.OriginalTotal, grandTotal, paidAmount, balanceDue)
	return err
}
