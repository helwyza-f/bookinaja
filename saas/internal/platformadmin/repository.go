package platformadmin

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

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
			t.plan,
			t.subscription_status,
			t.subscription_current_period_start,
			t.subscription_current_period_end,
			t.address,
			t.whatsapp_number,
			t.instagram_url,
			t.tiktok_url,
			t.meta_title,
			t.meta_description,
			t.open_time,
			t.close_time,
			t.business_category,
			t.business_type,
			t.created_at,
			u.name AS owner_name,
			u.email AS owner_email,
			(SELECT COUNT(*) FROM customers c WHERE c.tenant_id = t.id) AS customers_count,
			(SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id) AS bookings_count,
			COALESCE((SELECT SUM(COALESCE(bo.amount,0)) FROM billing_orders bo WHERE bo.tenant_id = t.id AND bo.status IN ('settlement','capture','paid')), 0) AS revenue
			,
			COALESCE((SELECT COUNT(*) FROM billing_orders bo WHERE bo.tenant_id = t.id), 0) AS transactions_count
		FROM tenants t
		LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'owner'
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
			c.email,
			c.phone,
			c.tier,
			c.total_visits,
			c.total_spent,
			c.last_visit,
			c.updated_at,
			t.slug AS tenant_slug,
			t.name AS tenant_name,
			t.id::text AS tenant_id
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
			bo.id::text,
			bo.order_id,
			bo.plan,
			bo.billing_interval,
			bo.amount,
			bo.currency,
			bo.status,
			bo.created_at,
			bo.updated_at,
			t.slug AS tenant_slug,
			t.name AS tenant_name,
			t.id::text AS tenant_id
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

func (r *Repository) RevenueReport(ctx context.Context, tenantSlug string, start, end *time.Time) (map[string]any, error) {
	where := "WHERE 1=1"
	args := []any{}
	if tenantSlug != "" {
		where += " AND t.slug = $1"
		args = append(args, tenantSlug)
	}
	if start != nil {
		where += fmt.Sprintf(" AND bo.created_at >= $%d", len(args)+1)
		args = append(args, *start)
	}
	if end != nil {
		where += fmt.Sprintf(" AND bo.created_at <= $%d", len(args)+1)
		args = append(args, *end)
	}

	query := fmt.Sprintf(`
		SELECT
			COALESCE(SUM(CASE WHEN bo.status IN ('settlement','capture','paid') THEN bo.amount ELSE 0 END), 0) AS revenue,
			COALESCE(SUM(CASE WHEN bo.status IN ('pending','created') THEN bo.amount ELSE 0 END), 0) AS pending_cashflow,
			COUNT(*) AS transactions,
			COUNT(*) FILTER (WHERE bo.status IN ('settlement','capture','paid')) AS paid_transactions,
			COUNT(*) FILTER (WHERE bo.status IN ('pending','created')) AS pending_transactions
		FROM billing_orders bo
		JOIN tenants t ON t.id = bo.tenant_id
		%s`, where)

	var row map[string]any
	if err := r.db.GetContext(ctx, &row, query, args...); err != nil {
		return nil, err
	}
	return normalizeRow(row), nil
}
