package customer

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

// Upsert menangani Silent Register: Insert jika HP baru, Update nama sesuai request.
func (r *Repository) Upsert(ctx context.Context, c Customer) (uuid.UUID, error) {
	query := `
		INSERT INTO customers (
			id, tenant_id, name, phone, email, 
			total_visits, total_spent, tier, loyalty_points, 
			created_at, updated_at
		) 
		VALUES (
			$1, $2, $3, $4, $5, 
			0, 0, 'NEW', 0, 
			NOW(), NOW()
		)
		ON CONFLICT (tenant_id, phone) 
		DO UPDATE SET 
			name = EXCLUDED.name,
			updated_at = NOW()
		RETURNING id`

	var id uuid.UUID
	err := r.db.QueryRowContext(ctx, query,
		c.ID, c.TenantID, c.Name, c.Phone, c.Email,
	).Scan(&id)

	if err != nil {
		return uuid.Nil, fmt.Errorf("repo: gagal upsert customer: %w", err)
	}
	return id, nil
}

// FindByPhone digunakan untuk validasi awal sebelum booking & login OTP.
func (r *Repository) FindByPhone(ctx context.Context, tenantID uuid.UUID, phone string) (*Customer, error) {
	var c Customer
	query := `SELECT * FROM customers WHERE tenant_id = $1 AND phone = $2 LIMIT 1`
	err := r.db.GetContext(ctx, &c, query, tenantID, phone)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

// --- FUNGSI LAINNYA ---

func (r *Repository) IncrementStats(ctx context.Context, id uuid.UUID, amount int64) error {
	query := `
		UPDATE customers SET 
			total_visits = total_visits + 1,
			total_spent = total_spent + $2,
			last_visit = NOW(),
			updated_at = NOW(),
			tier = CASE 
				WHEN (total_visits + 1) >= 50 THEN 'VIP'
				WHEN (total_visits + 1) >= 15 THEN 'GOLD'
				ELSE 'REGULAR'
			END
		WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, id, amount)
	return err
}

func (r *Repository) FindByTenant(ctx context.Context, tenantID uuid.UUID) ([]Customer, error) {
	var customers []Customer
	query := `SELECT * FROM customers WHERE tenant_id = $1 ORDER BY total_spent DESC`
	err := r.db.SelectContext(ctx, &customers, query, tenantID)
	return customers, err
}

func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*Customer, error) {
	var c Customer
	query := `SELECT * FROM customers WHERE id = $1 LIMIT 1`
	err := r.db.GetContext(ctx, &c, query, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &c, err
}

func (r *Repository) FindByIDForTenant(ctx context.Context, id, tenantID uuid.UUID) (*Customer, error) {
	var c Customer
	query := `SELECT * FROM customers WHERE id = $1 AND tenant_id = $2 LIMIT 1`
	err := r.db.GetContext(ctx, &c, query, id, tenantID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &c, err
}

func (r *Repository) GetActiveBookings(ctx context.Context, customerID uuid.UUID) ([]RecentHistoryDTO, error) {
	var bookings []RecentHistoryDTO
	query := `
		SELECT 
			b.id, res.name as resource, b.start_time as date, b.status,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) +
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_spent
		FROM bookings b
		JOIN resources res ON b.resource_id = res.id
		WHERE b.customer_id = $1 AND b.status IN ('confirmed', 'pending', 'active')
		ORDER BY b.start_time ASC`
	err := r.db.SelectContext(ctx, &bookings, query, customerID)
	return bookings, err
}

func (r *Repository) GetPastHistory(ctx context.Context, customerID uuid.UUID, limit int) ([]RecentHistoryDTO, error) {
	var history []RecentHistoryDTO
	query := `
		SELECT 
			b.id, res.name as resource, b.start_time as date, b.status,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) +
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_spent
		FROM bookings b
		JOIN resources res ON b.resource_id = res.id
		WHERE b.customer_id = $1 AND b.status IN ('completed', 'cancelled')
		ORDER BY b.start_time DESC LIMIT $2`
	err := r.db.SelectContext(ctx, &history, query, customerID, limit)
	return history, err
}
