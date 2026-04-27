package customer

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
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
			id, name, phone, email, password, 
			total_visits, total_spent, tier, loyalty_points, 
			created_at, updated_at
		) 
		VALUES (
			$1, $2, $3, $4, $5, 
			0, 0, 'NEW', 0, 
			NOW(), NOW()
		)
		ON CONFLICT (phone) 
		DO UPDATE SET 
			name = EXCLUDED.name,
			email = COALESCE(EXCLUDED.email, customers.email),
			password = COALESCE(EXCLUDED.password, customers.password),
			updated_at = NOW()
		RETURNING id`

	var id uuid.UUID
	err := r.db.QueryRowContext(ctx, query,
		c.ID, c.Name, c.Phone, c.Email, c.Password,
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
		FROM customers c
		WHERE COALESCE(c.phone, '') <> ''
		AND EXISTS (
			SELECT 1
			FROM bookings b
			WHERE b.customer_id = c.id
			AND b.tenant_id = $1
		)
		ORDER BY c.updated_at DESC, c.created_at DESC`, tenantID)
	return targets, err
}

func (r *Repository) CreateAuditLog(ctx context.Context, tenantID uuid.UUID, actorUserID *uuid.UUID, action, resourceType string, resourceID *uuid.UUID, metadata map[string]any) error {
	rawMetadata, _ := json.Marshal(metadata)
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO tenant_audit_logs (
			id, tenant_id, actor_user_id, action, resource_type, resource_id, metadata, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, NOW()
		)`,
		uuid.New(), tenantID, actorUserID, action, resourceType, resourceID, rawMetadata,
	)
	return err
}

// FindByPhone digunakan untuk validasi awal sebelum booking & login OTP.
func (r *Repository) FindByPhone(ctx context.Context, phone string) (*Customer, error) {
	var c Customer
	query := `SELECT * FROM customers WHERE phone = $1 LIMIT 1`
	err := r.db.GetContext(ctx, &c, query, phone)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *Repository) UpdateProfile(ctx context.Context, id uuid.UUID, req UpdateProfileReq) (*Customer, error) {
	setClauses := []string{"updated_at = NOW()"}
	args := []any{}
	argIdx := 1

	if req.Name != nil && strings.TrimSpace(*req.Name) != "" {
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", argIdx))
		args = append(args, strings.TrimSpace(*req.Name))
		argIdx++
	}
	if req.Email != nil {
		setClauses = append(setClauses, fmt.Sprintf("email = $%d", argIdx))
		args = append(args, strings.TrimSpace(*req.Email))
		argIdx++
	}
	if req.Password != nil && strings.TrimSpace(*req.Password) != "" {
		hashed, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, fmt.Errorf("gagal mengamankan password pelanggan: %w", err)
		}
		setClauses = append(setClauses, fmt.Sprintf("password = $%d", argIdx))
		args = append(args, string(hashed))
		argIdx++
	}

	if len(args) == 0 {
		return r.FindByID(ctx, id)
	}

	query := fmt.Sprintf(`
		UPDATE customers
		SET %s
		WHERE id = $%d
		RETURNING *`,
		strings.Join(setClauses, ", "),
		argIdx,
	)
	args = append(args, id)

	var c Customer
	if err := r.db.GetContext(ctx, &c, query, args...); err != nil {
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
		JOIN LATERAL (
			SELECT
				COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'pending', 'active', 'ongoing', 'completed')) AS total_visits,
				COALESCE(SUM(CASE WHEN b.payment_status IN ('settled', 'partial_paid', 'paid') THEN b.grand_total ELSE 0 END), 0) AS total_spent,
				MAX(b.end_time) FILTER (WHERE b.status IN ('completed', 'active', 'ongoing', 'confirmed', 'pending')) AS last_visit
			FROM bookings b
			WHERE b.customer_id = c.id AND b.tenant_id = $1
		) stats ON TRUE
		WHERE EXISTS (
			SELECT 1 FROM bookings b WHERE b.customer_id = c.id AND b.tenant_id = $1
		)
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
		JOIN LATERAL (
			SELECT
				COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'pending', 'active', 'ongoing', 'completed')) AS total_visits,
				COALESCE(SUM(CASE WHEN b.payment_status IN ('settled', 'partial_paid', 'paid') THEN b.grand_total ELSE 0 END), 0) AS total_spent,
				MAX(b.end_time) FILTER (WHERE b.status IN ('completed', 'active', 'ongoing', 'confirmed', 'pending')) AS last_visit
			FROM bookings b
			WHERE b.customer_id = c.id AND b.tenant_id = $2
		) stats ON TRUE
		WHERE c.id = $1
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
			b.id, b.tenant_id, t.name as tenant_name, t.slug as tenant_slug,
			res.name as resource, b.start_time as date, b.status,
			b.payment_status,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) +
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_spent
		FROM bookings b
		JOIN resources res ON b.resource_id = res.id
		JOIN tenants t ON t.id = b.tenant_id
		WHERE b.customer_id = $1 AND b.status IN ('confirmed', 'pending', 'active')
		ORDER BY b.start_time ASC`
	err := r.db.SelectContext(ctx, &bookings, query, customerID)
	return bookings, err
}

func (r *Repository) GetPastHistory(ctx context.Context, customerID uuid.UUID, limit int) ([]RecentHistoryDTO, error) {
	var history []RecentHistoryDTO
	query := `
		SELECT 
			b.id, b.tenant_id, t.name as tenant_name, t.slug as tenant_slug,
			res.name as resource, b.start_time as date, b.end_time as end_date,
			b.grand_total, b.deposit_amount, b.paid_amount, b.balance_due,
			b.status, b.payment_status, b.payment_method,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) +
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_spent
		FROM bookings b
		JOIN resources res ON b.resource_id = res.id
		JOIN tenants t ON t.id = b.tenant_id
		WHERE b.customer_id = $1 AND b.status IN ('completed', 'cancelled')
		ORDER BY b.start_time DESC LIMIT $2`
	err := r.db.SelectContext(ctx, &history, query, customerID, limit)
	return history, err
}

func (r *Repository) GetTransactionHistory(ctx context.Context, customerID uuid.UUID, limit int) ([]RecentHistoryDTO, error) {
	var history []RecentHistoryDTO
	query := `
		SELECT 
			b.id, b.tenant_id, t.name as tenant_name, t.slug as tenant_slug,
			res.name as resource, b.start_time as date, b.end_time as end_date,
			b.grand_total, b.deposit_amount, b.paid_amount, b.balance_due,
			b.status, b.payment_status, b.payment_method,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) +
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_spent
		FROM bookings b
		JOIN resources res ON b.resource_id = res.id
		JOIN tenants t ON t.id = b.tenant_id
		WHERE b.customer_id = $1
		ORDER BY b.start_time DESC
		LIMIT $2`
	err := r.db.SelectContext(ctx, &history, query, customerID, limit)
	return history, err
}
