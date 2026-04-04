package reservation

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

// GetOrCreateCustomer mengidentifikasi customer berdasarkan nomor HP
func (r *Repository) GetOrCreateCustomer(ctx context.Context, tenantID uuid.UUID, name, phone string) (uuid.UUID, error) {
	var customerID uuid.UUID
	queryFind := `SELECT id FROM customers WHERE tenant_id = $1 AND phone = $2 LIMIT 1`
	err := r.db.GetContext(ctx, &customerID, queryFind, tenantID, phone)

	if err == sql.ErrNoRows {
		customerID = uuid.New()
		queryInsert := `INSERT INTO customers (id, tenant_id, name, phone) VALUES ($1, $2, $3, $4)`
		_, err = r.db.ExecContext(ctx, queryInsert, customerID, tenantID, name, phone)
		if err != nil {
			return uuid.Nil, err
		}
	}
	return customerID, err
}

// CheckAvailability memastikan tidak ada irisan waktu
func (r *Repository) CheckAvailability(ctx context.Context, resourceID uuid.UUID, start, end time.Time) (bool, error) {
	var count int
	query := `
        SELECT COUNT(*) 
        FROM bookings 
        WHERE resource_id = $1 
        AND status NOT IN ('cancelled', 'rejected')
        AND (start_time, end_time) OVERLAPS ($2, $3)`

	err := r.db.GetContext(ctx, &count, query, resourceID, start, end)
	return count == 0, err
}

// CreateWithItems membuat booking dan menghitung harga item secara dinamis
func (r *Repository) CreateWithItems(ctx context.Context, b Booking, itemIDs []uuid.UUID, duration int) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("repo: gagal memulai transaksi: %w", err)
	}
	defer tx.Rollback()

	queryBooking := `
        INSERT INTO bookings (id, tenant_id, customer_id, resource_id, start_time, end_time, access_token, status, created_at)
        VALUES (:id, :tenant_id, :customer_id, :resource_id, :start_time, :end_time, :access_token, :status, :created_at)`

	_, err = tx.NamedExecContext(ctx, queryBooking, b)
	if err != nil {
		return err
	}

	if len(itemIDs) > 0 {
		queryItem := `
            INSERT INTO booking_options (id, booking_id, resource_item_id, price_at_booking)
            SELECT gen_random_uuid(), $1, id, 
                CASE WHEN price_unit = 'pcs' THEN price ELSE (price * $4) END
            FROM resource_items WHERE id = $2 AND resource_id = $3`

		for _, itemID := range itemIDs {
			_, err = tx.ExecContext(ctx, queryItem, b.ID, itemID, b.ResourceID, duration)
			if err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

// --- POS & ORDERING LOGIC ---

// AddFnbOrder menambahkan pesanan F&B ke dalam sebuah sesi booking
func (r *Repository) AddFnbOrder(ctx context.Context, bookingID uuid.UUID, fnbItemID uuid.UUID, qty int) error {
	query := `
		INSERT INTO order_items (id, booking_id, fnb_item_id, quantity, price_at_purchase, status)
		SELECT 
			gen_random_uuid(), 
			$1, 
			id, 
			$3, 
			price, 
			'delivered'
		FROM fnb_items 
		WHERE id = $2`
	
	_, err := r.db.ExecContext(ctx, query, bookingID, fnbItemID, qty)
	return err
}

// FindActiveSessions mengambil semua unit yang sedang "In-Use" (Status: active/ongoing)
func (r *Repository) FindActiveSessions(ctx context.Context, tenantID uuid.UUID) ([]BookingDetail, error) {
	var res []BookingDetail
	query := `
		SELECT 
			b.*, c.name as customer_name, c.phone as customer_phone, r.name as resource_name,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) as total_resource,
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_fnb
		FROM bookings b
		JOIN customers c ON b.customer_id = c.id
		JOIN resources r ON b.resource_id = r.id
		WHERE b.tenant_id = $1 AND b.status IN ('active', 'ongoing')
		ORDER BY b.start_time ASC`

	err := r.db.SelectContext(ctx, &res, query, tenantID)
	// Calculate GrandTotal di level aplikasi
	for i := range res {
		res[i].GrandTotal = res[i].TotalResource + res[i].TotalFnb
	}
	return res, err
}

// FindByID mengambil detail lengkap termasuk Options dan F&B Orders
func (r *Repository) FindByID(ctx context.Context, id, tenantID uuid.UUID) (*BookingDetail, error) {
	var b BookingDetail
	query := `
        SELECT b.*, c.name as customer_name, c.phone as customer_phone, r.name as resource_name,
        COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) as total_resource,
		COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_fnb
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        JOIN resources r ON b.resource_id = r.id
        WHERE b.id = $1 AND b.tenant_id = $2
        LIMIT 1`

	err := r.db.GetContext(ctx, &b, query, id, tenantID)
	if err != nil {
		return nil, err
	}
	b.GrandTotal = b.TotalResource + b.TotalFnb

	// 1. Get Resource Add-ons
	var options []BookingOptionDetail
	queryOptions := `
        SELECT bo.id, ri.name as item_name, ri.item_type, bo.price_at_booking
        FROM booking_options bo
        JOIN resource_items ri ON bo.resource_item_id = ri.id
        WHERE bo.booking_id = $1`
	r.db.SelectContext(ctx, &options, queryOptions, b.ID)
	b.Options = options

	// 2. Get F&B Orders (POS)
	var orders []OrderItem
	queryOrders := `
		SELECT oi.id, oi.booking_id, oi.fnb_item_id, f.name as item_name, oi.quantity, oi.price_at_purchase,
		(oi.quantity * oi.price_at_purchase) as subtotal
		FROM order_items oi
		JOIN fnb_items f ON oi.fnb_item_id = f.id
		WHERE oi.booking_id = $1`
	r.db.SelectContext(ctx, &orders, queryOrders, b.ID)
	b.Orders = orders

	return &b, nil
}

// --- FUNGSI EXISTING LAINNYA ---

func (r *Repository) GetByToken(ctx context.Context, token uuid.UUID) (*BookingDetail, error) {
	// Re-use logic FindByID tapi filter by access_token
	var b BookingDetail
	query := `
        SELECT b.*, c.name as customer_name, c.phone as customer_phone, r.name as resource_name,
        COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) as total_resource,
		COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_fnb
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        JOIN resources r ON b.resource_id = r.id
        WHERE b.access_token = $1 LIMIT 1`

	err := r.db.GetContext(ctx, &b, query, token)
	if err != nil {
		return nil, err
	}
	b.GrandTotal = b.TotalResource + b.TotalFnb
	return &b, nil
}

func (r *Repository) ListUpcoming(ctx context.Context, resourceID uuid.UUID, from time.Time) ([]Booking, error) {
	var bookings []Booking
	query := `SELECT * FROM bookings WHERE resource_id = $1 AND end_time > $2 AND status != 'cancelled' ORDER BY start_time ASC`
	err := r.db.SelectContext(ctx, &bookings, query, resourceID, from)
	return bookings, err
}

func (r *Repository) FindAllByTenant(ctx context.Context, tenantID uuid.UUID, status string) ([]BookingDetail, error) {
	var res []BookingDetail
	query := `
        SELECT b.*, c.name as customer_name, c.phone as customer_phone, r.name as resource_name,
        COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) as total_resource,
		COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_fnb
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        JOIN resources r ON b.resource_id = r.id
        WHERE b.tenant_id = $1`

	if status != "" {
		query += " AND b.status = $2 ORDER BY b.created_at DESC"
		err := r.db.SelectContext(ctx, &res, query, tenantID, status)
		return res, err
	}

	err := r.db.SelectContext(ctx, &res, query+" ORDER BY b.created_at DESC", tenantID)
	return res, err
}

func (r *Repository) UpdateStatus(ctx context.Context, id, tenantID uuid.UUID, status string) error {
	query := `UPDATE bookings SET status = $1 WHERE id = $2 AND tenant_id = $3`
	_, err := r.db.ExecContext(ctx, query, status, id, tenantID)
	return err
}