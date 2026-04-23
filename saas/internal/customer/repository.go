package customer

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

func (r *Repository) CountByTenant(ctx context.Context, tenantID uuid.UUID) (int, error) {
	var total int
	err := r.db.GetContext(ctx, &total, `SELECT COUNT(*) FROM customers WHERE tenant_id = $1`, tenantID)
	return total, err
}

func (r *Repository) GetTenantBillingState(ctx context.Context, tenantID uuid.UUID) (string, string, *time.Time, *time.Time, error) {
	type row struct {
		Plan   string     `db:"plan"`
		Status string     `db:"subscription_status"`
		Start  *time.Time `db:"subscription_current_period_start"`
		End    *time.Time `db:"subscription_current_period_end"`
	}

	var rrow row
	if err := r.db.GetContext(ctx, &rrow, `
		SELECT plan, subscription_status, subscription_current_period_start, subscription_current_period_end
		FROM tenants
		WHERE id = $1
		LIMIT 1`, tenantID); err != nil {
		return "", "", nil, nil, err
	}
	return rrow.Plan, rrow.Status, rrow.Start, rrow.End, nil
}

func (r *Repository) GetTenantName(ctx context.Context, tenantID uuid.UUID) (string, error) {
	var name string
	err := r.db.GetContext(ctx, &name, `SELECT name FROM tenants WHERE id = $1 LIMIT 1`, tenantID)
	return name, err
}

func (r *Repository) ListBroadcastTargets(ctx context.Context, tenantID uuid.UUID) ([]BroadcastTarget, error) {
	var targets []BroadcastTarget
	err := r.db.SelectContext(ctx, &targets, `
		SELECT id, name, phone
		FROM customers
		WHERE tenant_id = $1 AND COALESCE(phone, '') <> ''
		ORDER BY updated_at DESC, created_at DESC`, tenantID)
	return targets, err
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
	query := `
		SELECT
			c.*,
			COALESCE(stats.total_visits, 0) AS total_visits,
			COALESCE(stats.total_spent, 0) AS total_spent,
			stats.last_visit AS last_visit
		FROM customers c
		LEFT JOIN LATERAL (
			SELECT
				COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'pending', 'active', 'ongoing', 'completed')) AS total_visits,
				COALESCE(SUM(CASE WHEN b.payment_status IN ('settled', 'partial_paid', 'paid') THEN b.grand_total ELSE 0 END), 0) AS total_spent,
				MAX(b.end_time) FILTER (WHERE b.status IN ('completed', 'active', 'ongoing', 'confirmed', 'pending')) AS last_visit
			FROM bookings b
			WHERE b.customer_id = c.id
		) stats ON TRUE
		WHERE c.tenant_id = $1
		ORDER BY COALESCE(stats.total_spent, 0) DESC, c.updated_at DESC`
	err := r.db.SelectContext(ctx, &customers, query, tenantID)
	return customers, err
}

func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*Customer, error) {
	var c Customer
	query := `
		SELECT
			c.*,
			COALESCE(stats.total_visits, 0) AS total_visits,
			COALESCE(stats.total_spent, 0) AS total_spent,
			stats.last_visit AS last_visit
		FROM customers c
		LEFT JOIN LATERAL (
			SELECT
				COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'pending', 'active', 'ongoing', 'completed')) AS total_visits,
				COALESCE(SUM(CASE WHEN b.payment_status IN ('settled', 'partial_paid', 'paid') THEN b.grand_total ELSE 0 END), 0) AS total_spent,
				MAX(b.end_time) FILTER (WHERE b.status IN ('completed', 'active', 'ongoing', 'confirmed', 'pending')) AS last_visit
			FROM bookings b
			WHERE b.customer_id = c.id
		) stats ON TRUE
		WHERE c.id = $1
		LIMIT 1`
	err := r.db.GetContext(ctx, &c, query, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &c, err
}

func (r *Repository) FindByIDForTenant(ctx context.Context, id, tenantID uuid.UUID) (*Customer, error) {
	var c Customer
	query := `
		SELECT
			c.*,
			COALESCE(stats.total_visits, 0) AS total_visits,
			COALESCE(stats.total_spent, 0) AS total_spent,
			stats.last_visit AS last_visit
		FROM customers c
		LEFT JOIN LATERAL (
			SELECT
				COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'pending', 'active', 'ongoing', 'completed')) AS total_visits,
				COALESCE(SUM(CASE WHEN b.payment_status IN ('settled', 'partial_paid', 'paid') THEN b.grand_total ELSE 0 END), 0) AS total_spent,
				MAX(b.end_time) FILTER (WHERE b.status IN ('completed', 'active', 'ongoing', 'confirmed', 'pending')) AS last_visit
			FROM bookings b
			WHERE b.customer_id = c.id
		) stats ON TRUE
		WHERE c.id = $1 AND c.tenant_id = $2
		LIMIT 1`
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
			b.payment_status,
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
			b.id, res.name as resource, b.start_time as date, b.end_time as end_date,
			b.grand_total, b.deposit_amount, b.paid_amount, b.balance_due,
			b.status, b.payment_status, b.payment_method,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) +
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_spent
		FROM bookings b
		JOIN resources res ON b.resource_id = res.id
		WHERE b.customer_id = $1 AND b.status IN ('completed', 'cancelled')
		ORDER BY b.start_time DESC LIMIT $2`
	err := r.db.SelectContext(ctx, &history, query, customerID, limit)
	return history, err
}

func (r *Repository) GetTransactionHistory(ctx context.Context, customerID uuid.UUID, limit int) ([]RecentHistoryDTO, error) {
	var history []RecentHistoryDTO
	query := `
		SELECT 
			b.id, res.name as resource, b.start_time as date, b.end_time as end_date,
			b.grand_total, b.deposit_amount, b.paid_amount, b.balance_due,
			b.status, b.payment_status, b.payment_method,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) +
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_spent
		FROM bookings b
		JOIN resources res ON b.resource_id = res.id
		WHERE b.customer_id = $1
		ORDER BY b.start_time DESC
		LIMIT $2`
	err := r.db.SelectContext(ctx, &history, query, customerID, limit)
	return history, err
}
