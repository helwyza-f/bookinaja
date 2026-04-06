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

// GetOrCreateCustomer mengidentifikasi customer berdasarkan nomor HP (Silent Registration)
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
		AND (ri.item_type = 'main_option' OR ri.item_type = 'console_option')`
	
	_, err = tx.ExecContext(ctx, updateOptionQuery, bID, additionalDuration)
	if err != nil {
		return fmt.Errorf("gagal memperbarui durasi dan billing: %w", err)
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
		INSERT INTO bookings (id, tenant_id, customer_id, resource_id, start_time, end_time, access_token, status, created_at)
		VALUES (:id, :tenant_id, :customer_id, :resource_id, :start_time, :end_time, :access_token, :status, :created_at)`

	_, err = tx.NamedExecContext(ctx, queryBooking, b)
	if err != nil {
		return err
	}

	if len(itemIDs) > 0 {
		// Logic Quantity: 1 untuk Add-on, 'duration' untuk Main Option
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

// FindByID menarik detail lengkap booking untuk kebutuhan Dashboard Admin & POS
func (r *Repository) FindByID(ctx context.Context, id, tenantID uuid.UUID) (*BookingDetail, error) {
	var b BookingDetail
	query := `
		SELECT 
			b.*, c.name as customer_name, c.phone as customer_phone, r.name as resource_name,
			COALESCE(ri.price, 0) as unit_price, COALESCE(ri.unit_duration, 60) as unit_duration,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) as total_resource,
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_fnb
		FROM bookings b
		JOIN customers c ON b.customer_id = c.id
		JOIN resources r ON b.resource_id = r.id
		LEFT JOIN booking_options bo ON bo.booking_id = b.id
		LEFT JOIN resource_items ri ON bo.resource_item_id = ri.id AND (ri.item_type = 'main_option' OR ri.item_type = 'console_option')
		WHERE b.id = $1 AND b.tenant_id = $2
		LIMIT 1`

	err := r.db.GetContext(ctx, &b, query, id, tenantID)
	if err != nil {
		return nil, err
	}
	b.GrandTotal = b.TotalResource + b.TotalFnb

	// 1. Load detail item resource (PC/Console + Addons)
	b.Options = make([]BookingOptionDetail, 0)
	_ = r.db.SelectContext(ctx, &b.Options, `
		SELECT 
			bo.id, ri.name as item_name, ri.item_type, 
			bo.price_at_booking, bo.quantity, ri.price as unit_price
		FROM booking_options bo
		JOIN resource_items ri ON bo.resource_item_id = ri.id
		WHERE bo.booking_id = $1`, b.ID)

	// 2. Load detail pesanan F&B dari POS
	b.Orders = make([]OrderItem, 0)
	_ = r.db.SelectContext(ctx, &b.Orders, `
		SELECT oi.id, oi.booking_id, oi.fnb_item_id, f.name as item_name, oi.quantity, oi.price_at_purchase,
		(oi.quantity * oi.price_at_purchase) as subtotal
		FROM order_items oi
		JOIN fnb_items f ON oi.fnb_item_id = f.id
		WHERE oi.booking_id = $1`, b.ID)

	// 3. Load katalog addon untuk dropdown di POS
	b.ResourceAddons = make([]ResourceItemSimple, 0)
	_ = r.db.SelectContext(ctx, &b.ResourceAddons, `
		SELECT id, name, price, item_type 
		FROM resource_items 
		WHERE resource_id = $1 AND item_type = 'add_on'`, b.ResourceID)

	return &b, nil
}

// AddFnbOrder menambahkan pesanan makanan ke dalam bill transaksi
func (r *Repository) AddFnbOrder(ctx context.Context, bookingID uuid.UUID, fnbItemID uuid.UUID, qty int) error {
	query := `
		INSERT INTO order_items (id, booking_id, fnb_item_id, quantity, price_at_purchase, status)
		SELECT gen_random_uuid(), $1, id, $3, price, 'delivered'
		FROM fnb_items WHERE id = $2`
	
	_, err := r.db.ExecContext(ctx, query, bookingID, fnbItemID, qty)
	return err
}

// AddAddonOrder menambahkan layanan tambahan ke dalam bill transaksi
func (r *Repository) AddAddonOrder(ctx context.Context, bookingID uuid.UUID, itemID uuid.UUID) error {
	query := `
		INSERT INTO booking_options (id, booking_id, resource_item_id, quantity, price_at_booking)
		SELECT gen_random_uuid(), $1, id, 1, price
		FROM resource_items WHERE id = $2`
	
	_, err := r.db.ExecContext(ctx, query, bookingID, itemID)
	return err
}

// FindActiveSessions menarik semua bokingan Ongoing untuk Dashboard Live POS
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
	for i := range res {
		res[i].GrandTotal = res[i].TotalResource + res[i].TotalFnb
		res[i].Options = make([]BookingOptionDetail, 0)
		res[i].Orders = make([]OrderItem, 0)
		res[i].ResourceAddons = make([]ResourceItemSimple, 0)
	}
	return res, err
}

// UpdateStatus mengubah status transaksi (Check-in, Check-out, dll)
func (r *Repository) UpdateStatus(ctx context.Context, id, tenantID uuid.UUID, status string) error {
	query := `UPDATE bookings SET status = $1 WHERE id = $2 AND tenant_id = $3`
	_, err := r.db.ExecContext(ctx, query, status, id, tenantID)
	return err
}

// ListUpcoming menarik data jadwal boking masa depan untuk filter kalender
func (r *Repository) ListUpcoming(ctx context.Context, resourceID uuid.UUID, from time.Time) ([]Booking, error) {
	var bookings []Booking
	query := `SELECT * FROM bookings WHERE resource_id = $1 AND end_time > $2 AND status != 'cancelled' ORDER BY start_time ASC`
	err := r.db.SelectContext(ctx, &bookings, query, resourceID, from)
	return bookings, err
}

// FindAllByTenant list histori transaksi untuk tabel administrasi
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

// GetByToken menarik detail untuk pengecekan status tiket customer
func (r *Repository) GetByToken(ctx context.Context, token uuid.UUID) (*BookingDetail, error) {
	var b BookingDetail
	// 1. Ambil data utama booking
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

	// 2. Hydrate Options (Layanan/Unit yang dibooking)
	b.Options = make([]BookingOptionDetail, 0)
	_ = r.db.SelectContext(ctx, &b.Options, `
        SELECT 
            bo.id, ri.name as item_name, ri.item_type, 
            bo.price_at_booking, bo.quantity, ri.price as unit_price
        FROM booking_options bo
        JOIN resource_items ri ON bo.resource_item_id = ri.id
        WHERE bo.booking_id = $1`, b.ID)

	// 3. Hydrate Orders (Pesanan FnB POS jika ada)
	b.Orders = make([]OrderItem, 0)
	_ = r.db.SelectContext(ctx, &b.Orders, `
        SELECT oi.id, oi.booking_id, oi.fnb_item_id, f.name as item_name, oi.quantity, oi.price_at_purchase,
        (oi.quantity * oi.price_at_purchase) as subtotal
        FROM order_items oi
        JOIN fnb_items f ON oi.fnb_item_id = f.id
        WHERE oi.booking_id = $1`, b.ID)

	return &b, nil
}