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

func (r *Repository) GetTenantSlug(ctx context.Context, tenantID uuid.UUID) (string, error) {
	var slug string
	err := r.db.GetContext(ctx, &slug, `SELECT slug FROM tenants WHERE id = $1 LIMIT 1`, tenantID)
	if err != nil {
		return "", err
	}
	return slug, nil
}

func (r *Repository) GetTenantIDByBookingID(ctx context.Context, id uuid.UUID) (uuid.UUID, error) {
	var tID uuid.UUID
	err := r.db.GetContext(ctx, &tID, `SELECT tenant_id FROM bookings WHERE id = $1 LIMIT 1`, id)
	return tID, err
}

// GetOrCreateCustomer mengidentifikasi customer berdasarkan nomor HP (Silent Registration)
func (r *Repository) GetOrCreateCustomer(ctx context.Context, tenantID uuid.UUID, name, phone string) (uuid.UUID, error) {
	_ = tenantID
	var customerID uuid.UUID
	queryFind := `SELECT id FROM customers WHERE phone = $1 LIMIT 1`
	err := r.db.GetContext(ctx, &customerID, queryFind, phone)

	if err == sql.ErrNoRows {
		customerID = uuid.New()
		queryInsert := `
			INSERT INTO customers (
				id, name, phone, total_visits, total_spent, tier, loyalty_points, created_at, updated_at
			) VALUES (
				$1, $2, $3, 0, 0, 'NEW', 0, NOW(), NOW()
			)`
		_, err = r.db.ExecContext(ctx, queryInsert, customerID, name, phone)
		if err != nil {
			return uuid.Nil, err
		}
	}
	return customerID, err
}

// CheckAvailability memastikan tidak ada bentrokan waktu pada resource tertentu
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

// ExtendSessionWithValidation memperbarui Quantity durasi paket utama dan billing secara atomik
func (r *Repository) ExtendSessionWithValidation(ctx context.Context, bID uuid.UUID, resourceID uuid.UUID, currentEnd, newEnd time.Time, additionalDuration int) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Validasi ketersediaan slot tambahan agar tidak menabrak booking lain
	var count int
	checkQuery := `
		SELECT COUNT(*) FROM bookings 
		WHERE resource_id = $1 AND id != $2 
		AND status NOT IN ('cancelled', 'rejected')
		AND start_time < $4 AND end_time > $3`

	err = tx.GetContext(ctx, &count, checkQuery, resourceID, bID, currentEnd, newEnd)
	if err != nil {
		return err
	}
	if count > 0 {
		return fmt.Errorf("SLOT WAKTU SUDAH TERISI")
	}

	// 2. Update jam selesai (END_TIME) pada tabel utama
	updateBookingQuery := `UPDATE bookings SET end_time = $1 WHERE id = $2`
	_, err = tx.ExecContext(ctx, updateBookingQuery, newEnd, bID)
	if err != nil {
		return err
	}

	// 3. Update Quantity & Subtotal pada Paket Utama (Bukan Insert Baru)
	updateOptionQuery := `
		UPDATE booking_options 
		SET 
			quantity = quantity + $2,
			price_at_booking = price_at_booking + (ri.price * $2)
		FROM resource_items ri 
		WHERE booking_options.resource_item_id = ri.id 
		AND booking_options.booking_id = $1 
		AND (ri.item_type = 'main_option' OR ri.item_type = 'console_option' OR ri.item_type = 'main')`

	_, err = tx.ExecContext(ctx, updateOptionQuery, bID, additionalDuration)
	if err != nil {
		return fmt.Errorf("gagal memperbarui durasi dan billing: %w", err)
	}

	if err := r.recalculateBookingTotalsTx(ctx, tx, bID); err != nil {
		return err
	}

	return tx.Commit()
}

// CreateWithItems menyimpan data booking beserta pilihan item dengan Quantity dinamis
func (r *Repository) CreateWithItems(ctx context.Context, b Booking, itemIDs []uuid.UUID, duration int) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("repo: gagal memulai transaksi: %w", err)
	}
	defer tx.Rollback()

	queryBooking := `
		INSERT INTO bookings (
			id, tenant_id, customer_id, resource_id, start_time, end_time, access_token,
			status, grand_total, deposit_amount, paid_amount, balance_due, payment_status, payment_method, created_at
		)
		VALUES (
			:id, :tenant_id, :customer_id, :resource_id, :start_time, :end_time, :access_token,
			:status, :grand_total, :deposit_amount, :paid_amount, :balance_due, :payment_status, :payment_method, :created_at
		)`

	_, err = tx.NamedExecContext(ctx, queryBooking, b)
	if err != nil {
		return err
	}

	if len(itemIDs) > 0 {
		queryItem := `
			INSERT INTO booking_options (id, booking_id, resource_item_id, quantity, price_at_booking)
			SELECT gen_random_uuid(), $1, id, 
				CASE 
					WHEN item_type = 'add_on' THEN 1 
					ELSE $4 
				END,
				CASE 
					WHEN item_type = 'add_on' THEN price 
					ELSE (price * $4) 
				END
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

// FindByID menarik detail lengkap booking untuk Dashboard Admin & POS
func (r *Repository) FindByID(ctx context.Context, id, tenantID uuid.UUID) (*BookingDetail, error) {
	var b BookingDetail
	if err := r.recalculateBookingTotalsTx(ctx, r.db, id); err != nil {
		return nil, err
	}
	// Kita pake versi asli lo yang stabil, tapi kita lock DISTINCT biar gak duplikat item
	query := `
		SELECT 
			b.*, c.name as customer_name, c.phone as customer_phone, res.name as resource_name,
			COALESCE(ri.price, 0) as unit_price, 
			COALESCE(ri.unit_duration, 60) as unit_duration,
			-- Subquery tetap yang paling akurat buat totalan biaya
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) as total_resource,
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_fnb
		FROM bookings b
		JOIN customers c ON b.customer_id = c.id
		JOIN resources res ON b.resource_id = res.id
		LEFT JOIN booking_options bo ON bo.booking_id = b.id
		LEFT JOIN resource_items ri ON bo.resource_item_id = ri.id AND (ri.item_type = 'main_option' OR ri.item_type = 'console_option' OR ri.item_type = 'main')
		WHERE b.id = $1 AND b.tenant_id = $2
		LIMIT 1`

	err := r.db.GetContext(ctx, &b, query, id, tenantID)
	if err != nil {
		return nil, err
	}

	if b.GrandTotal <= 0 {
		b.GrandTotal = b.TotalResource + b.TotalFnb
	}
	if b.BalanceDue <= 0 && b.GrandTotal > 0 {
		b.BalanceDue = b.GrandTotal - b.PaidAmount
		if b.BalanceDue < 0 {
			b.BalanceDue = 0
		}
	}

	// Hydrate data relasi
	err = r.HydrateBooking(ctx, &b)
	return &b, err
}

// HydrateBooking mengisi data relasi (options & orders) ke dalam objek BookingDetail
func (r *Repository) HydrateBooking(ctx context.Context, b *BookingDetail) error {
	// 1. Load Options (Layanan/Unit)
	b.Options = make([]BookingOptionDetail, 0)
	err := r.db.SelectContext(ctx, &b.Options, `
		SELECT 
			bo.id, ri.name as item_name, ri.item_type, 
			bo.price_at_booking, bo.quantity, ri.price as unit_price
		FROM booking_options bo
		JOIN resource_items ri ON bo.resource_item_id = ri.id
		WHERE bo.booking_id = $1
		ORDER BY bo.price_at_booking DESC`, b.ID)
	if err != nil {
		return err
	}

	// 2. Load F&B Orders
	b.Orders = make([]OrderItem, 0)
	err = r.db.SelectContext(ctx, &b.Orders, `
		SELECT oi.id, oi.booking_id, oi.fnb_item_id, f.name as item_name, oi.quantity, oi.price_at_purchase,
		(oi.quantity * oi.price_at_purchase) as subtotal
		FROM order_items oi
		JOIN fnb_items f ON oi.fnb_item_id = f.id
		WHERE oi.booking_id = $1
		ORDER BY oi.created_at DESC`, b.ID)
	if err != nil {
		return err
	}

	// 3. Load Katalog Addons
	b.ResourceAddons = make([]ResourceItemSimple, 0)
	err = r.db.SelectContext(ctx, &b.ResourceAddons, `
		SELECT id, name, price, item_type 
		FROM resource_items 
		WHERE resource_id = $1 AND item_type = 'add_on'
		ORDER BY name ASC`, b.ResourceID)

	return err
}

// GetByToken menarik detail untuk pengecekan status tiket customer (Hydrated)
func (r *Repository) GetByToken(ctx context.Context, token uuid.UUID) (*BookingDetail, error) {
	var b BookingDetail
	query := `
		SELECT b.*, t.name as tenant_name, t.slug as tenant_slug,
		c.name as customer_name, c.phone as customer_phone, res.name as resource_name,
		COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) as total_resource,
		COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_fnb
		FROM bookings b
		JOIN tenants t ON t.id = b.tenant_id
		JOIN customers c ON b.customer_id = c.id
		JOIN resources res ON b.resource_id = res.id
		WHERE b.access_token = $1 LIMIT 1`

	err := r.db.GetContext(ctx, &b, query, token)
	if err != nil {
		return nil, err
	}

	if b.GrandTotal <= 0 {
		b.GrandTotal = b.TotalResource + b.TotalFnb
	}
	if b.BalanceDue <= 0 && b.GrandTotal > 0 {
		b.BalanceDue = b.GrandTotal - b.PaidAmount
		if b.BalanceDue < 0 {
			b.BalanceDue = 0
		}
	}
	err = r.HydrateBooking(ctx, &b)
	return &b, err
}

func (r *Repository) FindByIDForCustomer(ctx context.Context, id, tenantID, customerID uuid.UUID) (*BookingDetail, error) {
	if tenantID == uuid.Nil {
		return r.FindByIDForCustomerGlobal(ctx, id, customerID)
	}

	var b BookingDetail
	if err := r.recalculateBookingTotalsTx(ctx, r.db, id); err != nil {
		return nil, err
	}
	query := `
		SELECT 
			b.*, c.name as customer_name, c.phone as customer_phone, res.name as resource_name,
			COALESCE(ri.price, 0) as unit_price, 
			COALESCE(ri.unit_duration, 60) as unit_duration,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) as total_resource,
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_fnb
		FROM bookings b
		JOIN customers c ON b.customer_id = c.id
		JOIN resources res ON b.resource_id = res.id
		LEFT JOIN booking_options bo ON bo.booking_id = b.id
		LEFT JOIN resource_items ri ON bo.resource_item_id = ri.id AND (ri.item_type = 'main_option' OR ri.item_type = 'console_option' OR ri.item_type = 'main')
		WHERE b.id = $1 AND b.tenant_id = $2 AND b.customer_id = $3
		LIMIT 1`

	err := r.db.GetContext(ctx, &b, query, id, tenantID, customerID)
	if err != nil {
		return nil, err
	}

	if b.GrandTotal <= 0 {
		b.GrandTotal = b.TotalResource + b.TotalFnb
	}
	if b.BalanceDue <= 0 && b.GrandTotal > 0 {
		b.BalanceDue = b.GrandTotal - b.PaidAmount
		if b.BalanceDue < 0 {
			b.BalanceDue = 0
		}
	}
	err = r.HydrateBooking(ctx, &b)
	return &b, err
}

func (r *Repository) FindByIDForCustomerGlobal(ctx context.Context, id, customerID uuid.UUID) (*BookingDetail, error) {
	var b BookingDetail
	if err := r.recalculateBookingTotalsTx(ctx, r.db, id); err != nil {
		return nil, err
	}
	query := `
		SELECT 
			b.*, t.name as tenant_name, t.slug as tenant_slug,
			c.name as customer_name, c.phone as customer_phone, res.name as resource_name,
			COALESCE(ri.price, 0) as unit_price, 
			COALESCE(ri.unit_duration, 60) as unit_duration,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) as total_resource,
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_fnb
		FROM bookings b
		JOIN tenants t ON t.id = b.tenant_id
		JOIN customers c ON b.customer_id = c.id
		JOIN resources res ON b.resource_id = res.id
		LEFT JOIN booking_options bo ON bo.booking_id = b.id
		LEFT JOIN resource_items ri ON bo.resource_item_id = ri.id AND (ri.item_type = 'main_option' OR ri.item_type = 'console_option' OR ri.item_type = 'main')
		WHERE b.id = $1 AND b.customer_id = $2
		LIMIT 1`

	err := r.db.GetContext(ctx, &b, query, id, customerID)
	if err != nil {
		return nil, err
	}

	if b.GrandTotal <= 0 {
		b.GrandTotal = b.TotalResource + b.TotalFnb
	}
	if b.BalanceDue <= 0 && b.GrandTotal > 0 {
		b.BalanceDue = b.GrandTotal - b.PaidAmount
		if b.BalanceDue < 0 {
			b.BalanceDue = 0
		}
	}
	err = r.HydrateBooking(ctx, &b)
	return &b, err
}

func (r *Repository) AddFnbOrder(ctx context.Context, bookingID uuid.UUID, fnbItemID uuid.UUID, qty int) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO order_items (id, booking_id, fnb_item_id, quantity, price_at_purchase, status)
		SELECT gen_random_uuid(), b.id, f.id, $3, f.price, 'delivered'
		FROM bookings b
		JOIN fnb_items f ON f.id = $2 AND f.tenant_id = b.tenant_id
		WHERE b.id = $1`
	result, err := tx.ExecContext(ctx, query, bookingID, fnbItemID, qty)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("ITEM FNB TIDAK VALID UNTUK TENANT INI")
	}
	if err := r.recalculateBookingTotalsTx(ctx, tx, bookingID); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *Repository) AddAddonOrder(ctx context.Context, bookingID uuid.UUID, itemID uuid.UUID) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO booking_options (id, booking_id, resource_item_id, quantity, price_at_booking)
		SELECT gen_random_uuid(), b.id, ri.id, 1, ri.price
		FROM bookings b
		JOIN resource_items ri ON ri.id = $2 AND ri.resource_id = b.resource_id AND ri.item_type = 'add_on'
		WHERE b.id = $1`
	result, err := tx.ExecContext(ctx, query, bookingID, itemID)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("ADD-ON TIDAK VALID UNTUK RESOURCE INI")
	}
	if err := r.recalculateBookingTotalsTx(ctx, tx, bookingID); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *Repository) recalculateBookingTotalsTx(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID) error {
	_, err := exec.ExecContext(ctx, `
		UPDATE bookings
		SET
			grand_total = COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = $1), 0)
				+ COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = $1), 0),
			paid_amount = CASE
				WHEN payment_status IN ('partial_paid', 'paid', 'settled') THEN GREATEST(paid_amount, deposit_amount)
				ELSE paid_amount
			END,
			balance_due = GREATEST(
				COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = $1), 0)
				+ COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = $1), 0)
				- paid_amount,
				0
			)
		WHERE id = $1`,
		bookingID,
	)
	return err
}

func (r *Repository) FindActiveSessions(ctx context.Context, tenantID uuid.UUID) ([]BookingDetail, error) {
	var res []BookingDetail
	query := `
		SELECT 
			b.*, t.name as tenant_name, t.slug as tenant_slug,
			c.name as customer_name, c.phone as customer_phone, res.name as resource_name,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) as total_resource,
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_fnb
		FROM bookings b
		JOIN tenants t ON t.id = b.tenant_id
		JOIN customers c ON b.customer_id = c.id
		JOIN resources res ON b.resource_id = res.id
		WHERE b.tenant_id = $1 AND b.status IN ('active', 'ongoing')
		ORDER BY b.start_time ASC`

	err := r.db.SelectContext(ctx, &res, query, tenantID)
	if err != nil {
		return nil, err
	}

	for i := range res {
		if res[i].GrandTotal <= 0 {
			res[i].GrandTotal = res[i].TotalResource + res[i].TotalFnb
		}
		if res[i].BalanceDue <= 0 && res[i].GrandTotal > 0 {
			res[i].BalanceDue = res[i].GrandTotal - res[i].PaidAmount
			if res[i].BalanceDue < 0 {
				res[i].BalanceDue = 0
			}
		}
		// Catatan: Biasanya tidak perlu Hydrate penuh untuk view list agar hemat query
		res[i].Options = []BookingOptionDetail{}
		res[i].Orders = []OrderItem{}
	}
	return res, nil
}

func (r *Repository) UpdateStatus(ctx context.Context, id, tenantID uuid.UUID, status string) error {
	query := `
		UPDATE bookings
		SET
			status = $1::text,
			session_activated_at = CASE
				WHEN $1::text IN ('active', 'ongoing') AND session_activated_at IS NULL THEN NOW()
				ELSE session_activated_at
			END
		WHERE id = $2 AND tenant_id = $3`
	_, err := r.db.ExecContext(ctx, query, status, id, tenantID)
	return err
}

func (r *Repository) SettlePaymentCash(ctx context.Context, id, tenantID uuid.UUID, cashReceived *float64, notes *string) error {
	query := `
		UPDATE bookings
		SET payment_status = 'settled',
			payment_method = 'cash',
			paid_amount = grand_total,
			balance_due = 0
		WHERE id = $1 AND tenant_id = $2`
	_, err := r.db.ExecContext(ctx, query, id, tenantID)
	return err
}

func (r *Repository) UpdateSessionActivatedAt(ctx context.Context, id, tenantID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE bookings
		SET session_activated_at = NOW()
		WHERE id = $1 AND tenant_id = $2 AND session_activated_at IS NULL`,
		id, tenantID,
	)
	return err
}

func (r *Repository) MarkReminderSent(ctx context.Context, id, tenantID uuid.UUID, field string) error {
	if field != "reminder_20m_sent_at" && field != "reminder_5m_sent_at" {
		return fmt.Errorf("invalid reminder field")
	}
	query := fmt.Sprintf(`UPDATE bookings SET %s = NOW() WHERE id = $1 AND tenant_id = $2 AND %s IS NULL`, field, field)
	_, err := r.db.ExecContext(ctx, query, id, tenantID)
	return err
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
		SELECT b.*, c.name as customer_name, c.phone as customer_phone, res.name as resource_name,
		COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) as total_resource,
		COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_fnb
		FROM bookings b
		JOIN customers c ON b.customer_id = c.id
		JOIN resources res ON b.resource_id = res.id
		WHERE b.tenant_id = $1`

	if status != "" {
		query += " AND b.status = $2"
		err := r.db.SelectContext(ctx, &res, query+" ORDER BY b.created_at DESC", tenantID, status)
		return res, err
	}

	err := r.db.SelectContext(ctx, &res, query+" ORDER BY b.created_at DESC", tenantID)
	if err != nil {
		return nil, err
	}

	for i := range res {
		if res[i].GrandTotal <= 0 {
			res[i].GrandTotal = res[i].TotalResource + res[i].TotalFnb
		}
		if res[i].BalanceDue <= 0 && res[i].GrandTotal > 0 {
			res[i].BalanceDue = res[i].GrandTotal - res[i].PaidAmount
			if res[i].BalanceDue < 0 {
				res[i].BalanceDue = 0
			}
		}
	}
	return res, nil
}
