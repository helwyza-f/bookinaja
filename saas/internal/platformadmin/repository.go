package platformadmin

import (
	"context"

	"github.com/jmoiron/sqlx"
)

type Repository struct{ db *sqlx.DB }

func NewRepository(db *sqlx.DB) *Repository { return &Repository{db: db} }

func (r *Repository) ListTenants(ctx context.Context, limit int) ([]TenantSummary, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	var rows []TenantSummary
	err := r.db.SelectContext(ctx, &rows, `
		SELECT id::text, name, slug, business_category, plan, subscription_status,
		       subscription_current_period_start, subscription_current_period_end, created_at
		FROM tenants
		ORDER BY created_at DESC
		LIMIT $1`, limit)
	return rows, err
}

func (r *Repository) ListCustomers(ctx context.Context, limit int) ([]CustomerSummary, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	var rows []CustomerSummary
	err := r.db.SelectContext(ctx, &rows, `
		SELECT c.id::text, c.tenant_id::text, t.slug AS tenant_slug, t.name AS tenant_name,
		       c.name, c.phone, c.tier, c.total_visits, c.total_spent, c.last_visit, c.created_at
		FROM customers c
		JOIN tenants t ON t.id = c.tenant_id
		ORDER BY c.created_at DESC
		LIMIT $1`, limit)
	return rows, err
}

func (r *Repository) ListBillingOrders(ctx context.Context, limit int) ([]BillingSummary, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	var rows []BillingSummary
	err := r.db.SelectContext(ctx, &rows, `
		SELECT bo.id::text, bo.tenant_id::text, t.slug AS tenant_slug, t.name AS tenant_name,
		       bo.order_id, bo.plan, bo.billing_interval, bo.amount, bo.currency, bo.status,
		       bo.midtrans_payment_type, bo.created_at
		FROM billing_orders bo
		JOIN tenants t ON t.id = bo.tenant_id
		ORDER BY bo.created_at DESC
		LIMIT $1`, limit)
	return rows, err
}
