package platformadmin

import (
	"context"
	"encoding/json"

	"github.com/jmoiron/sqlx"
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository { return &Repository{db: db} }

func (r *Repository) ListTenants(ctx context.Context) ([]map[string]any, error) {
	rows, err := r.db.QueryxContext(ctx, `
		SELECT
			t.id::text,
			t.name,
			t.slug,
			t.business_category,
			t.business_type,
			COALESCE(t.subscription_status, 'inactive') AS status,
			t.plan,
			t.created_at,
			(SELECT COUNT(*) FROM customers c WHERE c.tenant_id = t.id) AS customers_count,
			(SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id) AS bookings_count,
			COALESCE((SELECT SUM(COALESCE(bo.amount,0)) FROM billing_orders bo WHERE bo.tenant_id = t.id AND bo.status IN ('settlement','capture','paid')), 0) AS revenue
		FROM tenants t
		ORDER BY t.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []map[string]any
	for rows.Next() {
		row := map[string]any{}
		if err := rows.MapScan(row); err != nil {
			return nil, err
		}
		result = append(result, normalizeRow(row))
	}
	return result, nil
}

func (r *Repository) ListCustomers(ctx context.Context) ([]map[string]any, error) {
	rows, err := r.db.QueryxContext(ctx, `
		SELECT
			c.id::text,
			c.name,
			c.phone,
			c.tier,
			c.total_visits,
			c.total_spent,
			c.last_visit,
			t.slug AS tenant_slug,
			t.name AS tenant_name
		FROM customers c
		JOIN tenants t ON t.id = c.tenant_id
		ORDER BY c.total_spent DESC, c.updated_at DESC
		LIMIT 500`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []map[string]any
	for rows.Next() {
		row := map[string]any{}
		if err := rows.MapScan(row); err != nil {
			return nil, err
		}
		result = append(result, normalizeRow(row))
	}
	return result, nil
}

func (r *Repository) ListTransactions(ctx context.Context) ([]map[string]any, error) {
	rows, err := r.db.QueryxContext(ctx, `
		SELECT
			bo.order_id,
			bo.plan,
			bo.billing_interval,
			bo.amount,
			bo.currency,
			bo.status,
			bo.created_at,
			t.slug AS tenant_slug,
			t.name AS tenant_name
		FROM billing_orders bo
		JOIN tenants t ON t.id = bo.tenant_id
		ORDER BY bo.created_at DESC
		LIMIT 500`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []map[string]any
	for rows.Next() {
		row := map[string]any{}
		if err := rows.MapScan(row); err != nil {
			return nil, err
		}
		result = append(result, normalizeRow(row))
	}
	return result, nil
}

func normalizeRow(row map[string]any) map[string]any {
	for k, v := range row {
		if b, ok := v.([]byte); ok {
			var decoded any
			if json.Unmarshal(b, &decoded) == nil {
				row[k] = decoded
			} else {
				row[k] = string(b)
			}
		}
	}
	return row
}

func (r *Repository) Summary(ctx context.Context) (map[string]any, error) {
	var totalTenants, activeTenants, totalCustomers, totalTransactions int
	var revenue float64
	if err := r.db.GetContext(ctx, &totalTenants, `SELECT COUNT(*) FROM tenants`); err != nil {
		return nil, err
	}
	if err := r.db.GetContext(ctx, &activeTenants, `SELECT COUNT(*) FROM tenants WHERE COALESCE(subscription_status, '') = 'active'`); err != nil {
		return nil, err
	}
	if err := r.db.GetContext(ctx, &totalCustomers, `SELECT COUNT(*) FROM customers`); err != nil {
		return nil, err
	}
	if err := r.db.GetContext(ctx, &totalTransactions, `SELECT COUNT(*) FROM billing_orders`); err != nil {
		return nil, err
	}
	if err := r.db.GetContext(ctx, &revenue, `SELECT COALESCE(SUM(amount),0) FROM billing_orders WHERE status IN ('settlement','capture','paid')`); err != nil {
		return nil, err
	}
	return map[string]any{
		"tenants":         totalTenants,
		"active_tenants":  activeTenants,
		"customers":       totalCustomers,
		"transactions":    totalTransactions,
		"revenue":         revenue,
	}, nil
}
