package platformadmin

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/helwiza/backend/internal/platform/access"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

type Repository struct {
	db  *sqlx.DB
	rdb *redis.Client
}

type DiscoveryFeedSetting struct {
	EnableDiscoveryPosts bool      `json:"enable_discovery_posts"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type PlanFeatureSettings struct {
	Plans     map[string][]string `json:"plans"`
	UpdatedAt time.Time           `json:"updated_at"`
}

type revenueReportRow struct {
	Revenue             float64 `db:"revenue" json:"revenue"`
	PendingCashflow     float64 `db:"pending_cashflow" json:"pending_cashflow"`
	Transactions        int64   `db:"transactions" json:"transactions"`
	PaidTransactions    int64   `db:"paid_transactions" json:"paid_transactions"`
	PendingTransactions int64   `db:"pending_transactions" json:"pending_transactions"`
}

type CreateEmailLogInput struct {
	Provider       string
	Source         string
	EventKey       string
	TemplateKey    string
	Recipient      string
	Subject        string
	Status         string
	RequestPayload any
	Tags           map[string]string
}

func NewRepository(db *sqlx.DB, rdb ...*redis.Client) *Repository {
	var client *redis.Client
	if len(rdb) > 0 {
		client = rdb[0]
	}
	return &Repository{db: db, rdb: client}
}

func (r *Repository) getPlanFeatureMatrixCacheKey() string {
	return "platform:plan-features:v1"
}

func (r *Repository) CreateEmailLog(ctx context.Context, input CreateEmailLogInput) (string, error) {
	var id string
	if err := r.db.GetContext(ctx, &id, `
		INSERT INTO platform_email_logs (
			provider,
			source,
			event_key,
			template_key,
			recipient,
			subject,
			status,
			request_payload,
			tags
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb
		)
		RETURNING id::text`,
		strings.TrimSpace(input.Provider),
		strings.TrimSpace(input.Source),
		strings.TrimSpace(input.EventKey),
		strings.TrimSpace(input.TemplateKey),
		strings.TrimSpace(input.Recipient),
		strings.TrimSpace(input.Subject),
		strings.TrimSpace(input.Status),
		mustJSON(input.RequestPayload),
		mustJSON(input.Tags),
	); err != nil {
		return "", err
	}
	return id, nil
}

func (r *Repository) UpdateEmailLogDispatch(ctx context.Context, id, providerMessageID, status, errorMessage string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE platform_email_logs
		SET provider_message_id = COALESCE(NULLIF($2, ''), provider_message_id),
			status = $3,
			error_message = $4,
			sent_at = CASE WHEN $3 IN ('accepted', 'sent') THEN NOW() ELSE sent_at END,
			updated_at = NOW()
		WHERE id::text = $1`,
		strings.TrimSpace(id),
		strings.TrimSpace(providerMessageID),
		strings.TrimSpace(status),
		strings.TrimSpace(errorMessage),
	)
	return err
}

func (r *Repository) GetDiscoveryFeedSetting(ctx context.Context) (*DiscoveryFeedSetting, error) {
	var row struct {
		ValueJSON json.RawMessage `db:"value_json"`
		UpdatedAt time.Time       `db:"updated_at"`
	}
	err := r.db.GetContext(ctx, &row, `
		SELECT value_json, updated_at
		FROM platform_feature_settings
		WHERE key = 'discovery_feed'
		LIMIT 1`)
	if err != nil {
		return nil, err
	}
	var payload struct {
		EnableDiscoveryPosts bool `json:"enable_discovery_posts"`
	}
	if err := json.Unmarshal(row.ValueJSON, &payload); err != nil {
		return nil, err
	}
	return &DiscoveryFeedSetting{
		EnableDiscoveryPosts: payload.EnableDiscoveryPosts,
		UpdatedAt:            row.UpdatedAt,
	}, nil
}

func (r *Repository) UpdateDiscoveryFeedSetting(ctx context.Context, enabled bool) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO platform_feature_settings (key, value_json, updated_at)
		VALUES ('discovery_feed', jsonb_build_object('enable_discovery_posts', $1::boolean), NOW())
		ON CONFLICT (key)
		DO UPDATE SET
			value_json = jsonb_build_object('enable_discovery_posts', $1::boolean),
			updated_at = NOW()`,
		enabled,
	)
	return err
}

func (r *Repository) GetPlanFeatureSettings(ctx context.Context) (*PlanFeatureSettings, error) {
	if r.rdb != nil {
		if cached, err := r.rdb.Get(ctx, r.getPlanFeatureMatrixCacheKey()).Result(); err == nil && strings.TrimSpace(cached) != "" {
			var payload struct {
				Plans map[string][]string `json:"plans"`
			}
			if err := json.Unmarshal([]byte(cached), &payload); err == nil {
				matrix := access.NormalizePlanFeatureMatrix(payload.Plans)
				return &PlanFeatureSettings{
					Plans:     matrix,
					UpdatedAt: time.Now().UTC(),
				}, nil
			}
		}
	}

	var row struct {
		ValueJSON json.RawMessage `db:"value_json"`
		UpdatedAt time.Time       `db:"updated_at"`
	}
	err := r.db.GetContext(ctx, &row, `
		SELECT value_json, updated_at
		FROM platform_feature_settings
		WHERE key = 'plan_features'
		LIMIT 1`)
	if err != nil {
		if seedErr := r.UpdatePlanFeatureSettings(ctx, access.GetPlanFeatureMatrix()); seedErr != nil {
			return nil, err
		}
		err = r.db.GetContext(ctx, &row, `
			SELECT value_json, updated_at
			FROM platform_feature_settings
			WHERE key = 'plan_features'
			LIMIT 1`)
		if err != nil {
			return nil, err
		}
	}

	var payload struct {
		Plans map[string][]string `json:"plans"`
	}
	if err := json.Unmarshal(row.ValueJSON, &payload); err != nil {
		return nil, err
	}
	payload.Plans = access.NormalizePlanFeatureMatrix(payload.Plans)

	if r.rdb != nil {
		if encoded, err := access.MarshalNormalizedPlanFeatureMatrix(payload.Plans); err == nil {
			_ = r.rdb.Set(ctx, r.getPlanFeatureMatrixCacheKey(), encoded, 30*time.Minute).Err()
		}
	}

	return &PlanFeatureSettings{
		Plans:     payload.Plans,
		UpdatedAt: row.UpdatedAt,
	}, nil
}

func (r *Repository) UpdatePlanFeatureSettings(ctx context.Context, plans map[string][]string) error {
	normalized := access.NormalizePlanFeatureMatrix(plans)
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO platform_feature_settings (key, value_json, updated_at)
		VALUES ('plan_features', jsonb_build_object('plans', $1::jsonb), NOW())
		ON CONFLICT (key)
		DO UPDATE SET
			value_json = jsonb_build_object('plans', $1::jsonb),
			updated_at = NOW()`,
		mustJSON(normalized),
	)
	if err == nil && r.rdb != nil {
		_ = r.rdb.Del(ctx, r.getPlanFeatureMatrixCacheKey()).Err()
	}
	return err
}

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
            -- Logic Status Otomatis untuk Platform Admin
            CASE 
                WHEN t.subscription_status = 'active' AND t.subscription_current_period_end > NOW() THEN 'active'
                WHEN t.subscription_status = 'trial' AND t.subscription_current_period_end > NOW() THEN 'trial'
                WHEN t.subscription_status = 'suspended' THEN 'suspended'
                ELSE 'inactive'
            END as status,
            t.address,
            t.whatsapp_number,
            t.instagram_url,
            t.tiktok_url,
            t.meta_title,
            t.meta_description,
            t.open_time,
            t.close_time,
            t.discovery_headline,
            t.discovery_subheadline,
            t.promo_label,
            t.featured_image_url,
            t.highlight_copy,
            COALESCE(t.discovery_tags, ARRAY[]::text[]) AS discovery_tags,
            COALESCE(t.discovery_badges, ARRAY[]::text[]) AS discovery_badges,
            COALESCE(t.discovery_featured, false) AS discovery_featured,
            COALESCE(t.discovery_promoted, false) AS discovery_promoted,
            COALESCE(t.discovery_priority, 0) AS discovery_priority,
            t.promo_starts_at,
            t.promo_ends_at,
            COALESCE(discovery_stats.impressions_30d, 0) AS discovery_impressions_30d,
            COALESCE(discovery_stats.clicks_30d, 0) AS discovery_clicks_30d,
            COALESCE(discovery_stats.ctr_30d, 0) AS discovery_ctr_30d,
            t.created_at,
            u.name AS owner_name,
            u.email AS owner_email,
            (SELECT COUNT(*) FROM customers c WHERE c.tenant_id = t.id) AS customers_count,
            (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id) AS bookings_count,
            COALESCE((SELECT SUM(COALESCE(bo.amount,0)) FROM billing_orders bo WHERE bo.tenant_id = t.id AND bo.status IN ('settlement','capture','paid')), 0) AS revenue,
            COALESCE((SELECT COUNT(*) FROM billing_orders bo WHERE bo.tenant_id = t.id), 0) AS transactions_count
        FROM tenants t
        LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'owner'
        LEFT JOIN (
            SELECT
                tenant_id,
                COUNT(*) FILTER (WHERE event_type = 'impression' AND created_at >= NOW() - INTERVAL '30 days') AS impressions_30d,
                COUNT(*) FILTER (WHERE event_type = 'click' AND created_at >= NOW() - INTERVAL '30 days') AS clicks_30d,
                CASE
                    WHEN COUNT(*) FILTER (WHERE event_type = 'impression' AND created_at >= NOW() - INTERVAL '30 days') = 0 THEN 0
                    ELSE ROUND(
                        (
                            COUNT(*) FILTER (WHERE event_type = 'click' AND created_at >= NOW() - INTERVAL '30 days')::numeric
                            / COUNT(*) FILTER (WHERE event_type = 'impression' AND created_at >= NOW() - INTERVAL '30 days')::numeric
                        ) * 100,
                        2
                    )
                END AS ctr_30d
            FROM discovery_feed_events
            GROUP BY tenant_id
        ) discovery_stats ON discovery_stats.tenant_id = t.id
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

func (r *Repository) UpdateTenantDiscoveryEditorial(ctx context.Context, tenantID string, payload map[string]any) error {
	_, err := r.db.NamedExecContext(ctx, `
		UPDATE tenants
		SET
			discovery_headline = :discovery_headline,
			discovery_subheadline = :discovery_subheadline,
			promo_label = :promo_label,
			featured_image_url = :featured_image_url,
			highlight_copy = :highlight_copy,
			discovery_tags = :discovery_tags,
			discovery_badges = :discovery_badges,
			discovery_featured = :discovery_featured,
			discovery_promoted = :discovery_promoted,
			discovery_priority = :discovery_priority,
			promo_starts_at = :promo_starts_at,
			promo_ends_at = :promo_ends_at
		WHERE id::text = :tenant_id`,
		payload,
	)
	return err
}

func (r *Repository) GetDiscoveryAnalytics(ctx context.Context) (map[string]any, error) {
	sections, err := r.discoveryBreakdown(ctx, "section_id")
	if err != nil {
		return nil, err
	}
	cardVariants, err := r.discoveryBreakdown(ctx, "card_variant")
	if err != nil {
		return nil, err
	}
	topFeatured, err := r.discoveryTenantPerformance(ctx, true)
	if err != nil {
		return nil, err
	}
	underperformingPromoted, err := r.discoveryTenantPerformance(ctx, false)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"sections":                 sections,
		"card_variants":            cardVariants,
		"top_featured":             topFeatured,
		"underperforming_promoted": underperformingPromoted,
	}, nil
}

func (r *Repository) discoveryBreakdown(ctx context.Context, dimension string) ([]map[string]any, error) {
	if dimension != "section_id" && dimension != "card_variant" {
		return []map[string]any{}, nil
	}

	query := fmt.Sprintf(`
		SELECT
			COALESCE(%s, '') AS bucket,
			COUNT(*) FILTER (WHERE event_type = 'impression' AND created_at >= NOW() - INTERVAL '30 days') AS impressions_30d,
			COUNT(*) FILTER (WHERE event_type = 'click' AND created_at >= NOW() - INTERVAL '30 days') AS clicks_30d,
			CASE
				WHEN COUNT(*) FILTER (WHERE event_type = 'impression' AND created_at >= NOW() - INTERVAL '30 days') = 0 THEN 0
				ELSE ROUND(
					(
						COUNT(*) FILTER (WHERE event_type = 'click' AND created_at >= NOW() - INTERVAL '30 days')::numeric
						/ COUNT(*) FILTER (WHERE event_type = 'impression' AND created_at >= NOW() - INTERVAL '30 days')::numeric
					) * 100,
					2
				)
			END AS ctr_30d
		FROM discovery_feed_events
		GROUP BY bucket
		ORDER BY impressions_30d DESC, clicks_30d DESC`, dimension)

	rows, err := r.db.QueryxContext(ctx, query)
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

func (r *Repository) discoveryTenantPerformance(ctx context.Context, topFeatured bool) (map[string]any, error) {
	where := "t.discovery_featured = TRUE"
	order := "ctr_30d DESC, impressions_30d DESC"
	if !topFeatured {
		where = "t.discovery_promoted = TRUE"
		order = "ctr_30d ASC, impressions_30d DESC"
	}

	query := fmt.Sprintf(`
		SELECT
			t.id::text AS tenant_id,
			t.name AS tenant_name,
			t.slug AS tenant_slug,
			COALESCE(t.discovery_priority, 0) AS discovery_priority,
			COUNT(*) FILTER (WHERE e.event_type = 'impression' AND e.created_at >= NOW() - INTERVAL '30 days') AS impressions_30d,
			COUNT(*) FILTER (WHERE e.event_type = 'click' AND e.created_at >= NOW() - INTERVAL '30 days') AS clicks_30d,
			CASE
				WHEN COUNT(*) FILTER (WHERE e.event_type = 'impression' AND e.created_at >= NOW() - INTERVAL '30 days') = 0 THEN 0
				ELSE ROUND(
					(
						COUNT(*) FILTER (WHERE e.event_type = 'click' AND e.created_at >= NOW() - INTERVAL '30 days')::numeric
						/ COUNT(*) FILTER (WHERE e.event_type = 'impression' AND e.created_at >= NOW() - INTERVAL '30 days')::numeric
					) * 100,
					2
				)
			END AS ctr_30d
		FROM tenants t
		LEFT JOIN discovery_feed_events e ON e.tenant_id = t.id
		WHERE %s
		GROUP BY t.id, t.name, t.slug, t.discovery_priority
		ORDER BY %s
		LIMIT 1`, where, order)

	rows, err := r.db.QueryxContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return map[string]any{}, nil
	}
	row := map[string]any{}
	if err := rows.MapScan(row); err != nil {
		return nil, err
	}
	return normalizeRow(row), nil
}

func (r *Repository) ListCustomers(ctx context.Context) ([]map[string]any, error) {
	rows, err := r.db.QueryxContext(ctx, `
		SELECT
			c.id::text,
			c.name,
			c.email,
			c.phone,
			c.tier,
			COALESCE(c.total_visits, 0) AS visits,
			COALESCE(c.total_spent, 0) AS spend,
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

func (r *Repository) ListCustomersByTenant(ctx context.Context, tenantID string) ([]map[string]any, error) {
	rows, err := r.db.QueryxContext(ctx, `
		SELECT
			c.id::text,
			c.name,
			c.email,
			c.phone,
			c.tier,
			COALESCE(c.total_visits, 0) AS visits,
			COALESCE(c.total_spent, 0) AS spend,
			c.last_visit,
			c.updated_at,
			t.slug AS tenant_slug,
			t.name AS tenant_name,
			t.id::text AS tenant_id
		FROM customers c
		JOIN tenants t ON t.id = c.tenant_id
		WHERE t.id::text = $1
		ORDER BY c.total_spent DESC, c.updated_at DESC
		LIMIT 500`, tenantID)
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

func (r *Repository) ListTransactions(ctx context.Context, page, pageSize int) ([]map[string]any, int, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 200 {
		pageSize = 25
	}
	offset := (page - 1) * pageSize
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
		LIMIT $1 OFFSET $2`, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var result []map[string]any
	for rows.Next() {
		row := map[string]any{}
		if err := rows.MapScan(row); err != nil {
			return nil, 0, err
		}
		result = append(result, normalizeRow(row))
	}
	var total int
	if err := r.db.GetContext(ctx, &total, `SELECT COUNT(*) FROM billing_orders`); err != nil {
		return nil, 0, err
	}
	return result, total, nil
}

func (r *Repository) ListTransactionsByTenant(ctx context.Context, tenantID string, page, pageSize int) ([]map[string]any, int, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 200 {
		pageSize = 25
	}
	offset := (page - 1) * pageSize
	rows, err := r.db.QueryxContext(ctx, `
		SELECT
			id,
			source_type,
			order_id,
			plan,
			billing_interval,
			amount,
			currency,
			status,
			transaction_status,
			created_at,
			updated_at,
			tenant_slug,
			tenant_name,
			tenant_id
		FROM (
			SELECT
				bo.id::text AS id,
				'subscription'::text AS source_type,
				bo.order_id,
				bo.plan,
				bo.billing_interval,
				bo.amount,
				bo.currency,
				bo.status,
				bo.status AS transaction_status,
				bo.created_at,
				bo.updated_at,
				t.slug AS tenant_slug,
				t.name AS tenant_name,
				t.id::text AS tenant_id
			FROM billing_orders bo
			JOIN tenants t ON t.id = bo.tenant_id
			WHERE t.id::text = $1

			UNION ALL

			SELECT
				l.id::text AS id,
				'booking'::text AS source_type,
				l.midtrans_order_id AS order_id,
				CASE
					WHEN l.source_ref IS NOT NULL THEN l.source_ref
					ELSE l.source_type
				END AS plan,
				CASE
					WHEN l.source_type = 'booking_payment' THEN 'booking'
					ELSE 'booking'
				END AS billing_interval,
				l.net_amount AS amount,
				'IDR'::text AS currency,
				l.status,
				l.transaction_status,
				l.created_at,
				l.updated_at,
				t.slug AS tenant_slug,
				t.name AS tenant_name,
				t.id::text AS tenant_id
			FROM tenant_ledger_entries l
			JOIN tenants t ON t.id = l.tenant_id
			WHERE t.id::text = $1
			  AND l.source_type = 'booking_payment'
		) x
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`, tenantID, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var result []map[string]any
	for rows.Next() {
		row := map[string]any{}
		if err := rows.MapScan(row); err != nil {
			return nil, 0, err
		}
		result = append(result, normalizeRow(row))
	}
	var total int
	if err := r.db.GetContext(ctx, &total, `SELECT COUNT(*) FROM billing_orders bo JOIN tenants t ON t.id = bo.tenant_id WHERE t.id::text = $1`, tenantID); err != nil {
		return nil, 0, err
	}
	bookingCount := 0
	if err := r.db.GetContext(ctx, &bookingCount, `SELECT COUNT(*) FROM tenant_ledger_entries l WHERE l.tenant_id::text = $1 AND l.source_type = 'booking_payment'`, tenantID); err != nil {
		return nil, 0, err
	}
	return result, total + bookingCount, nil
}

func (r *Repository) ListTenantBalances(ctx context.Context) ([]map[string]any, error) {
	rows, err := r.db.QueryxContext(ctx, `
		SELECT
			t.id::text AS tenant_id,
			t.slug AS tenant_slug,
			t.name AS tenant_name,
			COALESCE(u.name, '-') AS owner_name,
			COALESCE(u.email, '-') AS owner_email,
			COALESCE(SUM(CASE WHEN l.status = 'settled' AND l.direction = 'credit' THEN l.net_amount ELSE 0 END), 0)
				- COALESCE(SUM(CASE WHEN l.status = 'settled' AND l.direction = 'debit' THEN l.net_amount ELSE 0 END), 0) AS balance,
			COALESCE(SUM(CASE WHEN l.status = 'pending' AND l.direction = 'credit' THEN l.net_amount ELSE 0 END), 0) AS pending_credit,
			COALESCE(SUM(CASE WHEN l.status = 'pending' AND l.direction = 'debit' THEN l.net_amount ELSE 0 END), 0) AS pending_debit,
			COUNT(l.id) AS ledger_entries,
			MAX(l.created_at) AS last_ledger_at
		FROM tenants t
		LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'owner'
		LEFT JOIN tenant_ledger_entries l ON l.tenant_id = t.id
		GROUP BY t.id, t.slug, t.name, u.name, u.email
		ORDER BY balance DESC, t.created_at DESC`)
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

func (r *Repository) GetTenantBalance(ctx context.Context, tenantID string) (map[string]any, error) {
	rows, err := r.db.QueryxContext(ctx, `
		SELECT
			t.id::text AS tenant_id,
			t.slug AS tenant_slug,
			t.name AS tenant_name,
			COALESCE(u.name, '-') AS owner_name,
			COALESCE(u.email, '-') AS owner_email,
			COALESCE(SUM(CASE WHEN l.status = 'settled' AND l.direction = 'credit' THEN l.net_amount ELSE 0 END), 0)
				- COALESCE(SUM(CASE WHEN l.status = 'settled' AND l.direction = 'debit' THEN l.net_amount ELSE 0 END), 0) AS balance,
			COALESCE(SUM(CASE WHEN l.status = 'pending' AND l.direction = 'credit' THEN l.net_amount ELSE 0 END), 0) AS pending_credit,
			COALESCE(SUM(CASE WHEN l.status = 'pending' AND l.direction = 'debit' THEN l.net_amount ELSE 0 END), 0) AS pending_debit,
			COUNT(l.id) AS ledger_entries,
			MAX(l.created_at) AS last_ledger_at
		FROM tenants t
		LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'owner'
		LEFT JOIN tenant_ledger_entries l ON l.tenant_id = t.id
		WHERE t.id::text = $1
		GROUP BY t.id, t.slug, t.name, u.name, u.email`,
		tenantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return map[string]any{}, nil
	}
	row := map[string]any{}
	if err := rows.MapScan(row); err != nil {
		return nil, err
	}
	return normalizeRow(row), nil
}

func (r *Repository) ListMidtransNotificationLogs(ctx context.Context, page, pageSize int, tenantSlug string) ([]map[string]any, int, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 200 {
		pageSize = 25
	}
	offset := (page - 1) * pageSize
	args := []any{pageSize, offset}
	where := ""
	if tenantSlug != "" {
		where = "WHERE t.slug = $3"
		args = append(args, tenantSlug)
	}
	query := fmt.Sprintf(`
		SELECT
			l.id::text,
			l.received_at,
			l.processed_at,
			l.order_id,
			l.transaction_id,
			l.transaction_status,
			l.fraud_status,
			l.payment_type,
			l.gross_amount,
			l.signature_valid,
			l.processing_status,
			l.error_message,
			l.tenant_id::text,
			l.booking_id::text,
			t.slug AS tenant_slug,
			t.name AS tenant_name
		FROM midtrans_notification_logs l
		LEFT JOIN tenants t ON t.id = l.tenant_id
		%s
		ORDER BY l.received_at DESC
		LIMIT $1 OFFSET $2`, where)
	rows, err := r.db.QueryxContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var result []map[string]any
	for rows.Next() {
		row := map[string]any{}
		if err := rows.MapScan(row); err != nil {
			return nil, 0, err
		}
		result = append(result, normalizeRow(row))
	}
	var total int
	if tenantSlug != "" {
		if err := r.db.GetContext(ctx, &total, `
			SELECT COUNT(*)
			FROM midtrans_notification_logs l
			LEFT JOIN tenants t ON t.id = l.tenant_id
			WHERE t.slug = $1`, tenantSlug); err != nil {
			return nil, 0, err
		}
	} else {
		if err := r.db.GetContext(ctx, &total, `SELECT COUNT(*) FROM midtrans_notification_logs`); err != nil {
			return nil, 0, err
		}
	}
	return result, total, nil
}

func (r *Repository) ListMidtransNotificationLogsByTenantID(ctx context.Context, tenantID string, page, pageSize int) ([]map[string]any, int, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 200 {
		pageSize = 25
	}
	offset := (page - 1) * pageSize
	rows, err := r.db.QueryxContext(ctx, `
		SELECT
			l.id::text,
			CASE
				WHEN l.order_id LIKE 'sub-%' THEN 'subscription'
				WHEN l.order_id LIKE 'bk-%' THEN 'booking'
				ELSE 'unknown'
			END AS source_type,
			l.received_at,
			l.processed_at,
			l.order_id,
			l.transaction_id,
			l.transaction_status,
			l.fraud_status,
			l.payment_type,
			l.gross_amount,
			l.signature_valid,
			l.processing_status,
			l.error_message,
			l.tenant_id::text,
			l.booking_id::text,
			t.slug AS tenant_slug,
			t.name AS tenant_name
		FROM midtrans_notification_logs l
		LEFT JOIN tenants t ON t.id = l.tenant_id
		WHERE t.id::text = $1
		ORDER BY l.received_at DESC
		LIMIT $2 OFFSET $3`, tenantID, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var result []map[string]any
	for rows.Next() {
		row := map[string]any{}
		if err := rows.MapScan(row); err != nil {
			return nil, 0, err
		}
		result = append(result, normalizeRow(row))
	}
	var total int
	if err := r.db.GetContext(ctx, &total, `SELECT COUNT(*) FROM midtrans_notification_logs WHERE tenant_id::text = $1`, tenantID); err != nil {
		return nil, 0, err
	}
	return result, total, nil
}

func (r *Repository) GetTenantDetail(ctx context.Context, tenantID string) (map[string]any, error) {
	rows, err := r.db.QueryxContext(ctx, `
		SELECT
			t.id::text AS tenant_id,
			t.slug AS tenant_slug,
			t.name AS tenant_name,
			t.business_category,
			t.business_type,
			t.plan,
			t.subscription_status,
			t.subscription_current_period_start,
			t.subscription_current_period_end,
			CASE
				WHEN t.subscription_status = 'active' AND t.subscription_current_period_end > NOW() THEN 'active'
				WHEN t.subscription_status = 'trial' AND t.subscription_current_period_end > NOW() THEN 'trial'
				WHEN t.subscription_status = 'suspended' THEN 'suspended'
				ELSE 'inactive'
			END AS status,
			t.address,
			t.whatsapp_number,
			t.instagram_url,
			t.tiktok_url,
			t.meta_title,
			t.meta_description,
			t.open_time,
			t.close_time,
			t.created_at,
			u.name AS owner_name,
			u.email AS owner_email,
			COALESCE((SELECT COUNT(*) FROM customers c WHERE c.tenant_id = t.id), 0) AS customers_count,
			COALESCE((SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id), 0) AS bookings_count,
			COALESCE((SELECT SUM(COALESCE(bo.amount,0)) FROM billing_orders bo WHERE bo.tenant_id = t.id AND bo.status IN ('settlement','capture','paid')), 0) AS subscription_revenue,
			COALESCE((SELECT COUNT(*) FROM billing_orders bo WHERE bo.tenant_id = t.id), 0) AS subscription_transactions_count,
			COALESCE((SELECT SUM(CASE WHEN l.status = 'settled' AND l.direction = 'credit' THEN l.net_amount ELSE 0 END) FROM tenant_ledger_entries l WHERE l.tenant_id = t.id AND l.source_type = 'booking_payment'), 0) AS booking_revenue,
			COALESCE((SELECT SUM(CASE WHEN l.status = 'settled' AND l.direction = 'debit' THEN l.net_amount ELSE 0 END) FROM tenant_ledger_entries l WHERE l.tenant_id = t.id AND l.source_type = 'booking_payment'), 0) AS booking_deductions,
			COALESCE((SELECT COUNT(*) FROM tenant_ledger_entries l WHERE l.tenant_id = t.id AND l.source_type = 'booking_payment'), 0) AS booking_transactions_count
		FROM tenants t
		LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'owner'
		WHERE t.id::text = $1
		LIMIT 1`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return map[string]any{}, nil
	}
	row := map[string]any{}
	if err := rows.MapScan(row); err != nil {
		return nil, err
	}
	return normalizeRow(row), nil
}

func (r *Repository) GetTenantInsights(ctx context.Context, tenantID string) (map[string]any, error) {
	rows, err := r.db.QueryxContext(ctx, `
		SELECT
			t.id::text AS tenant_id,
			t.slug AS tenant_slug,
			t.name AS tenant_name,
			COALESCE(u.name, '-') AS owner_name,
			COALESCE(u.email, '-') AS owner_email,
			COALESCE((SELECT SUM(COALESCE(bo.amount,0)) FROM billing_orders bo WHERE bo.tenant_id = t.id AND bo.status IN ('settlement','capture','paid')), 0) AS subscription_revenue,
			COALESCE((SELECT COUNT(*) FROM billing_orders bo WHERE bo.tenant_id = t.id), 0) AS subscription_transactions,
			COALESCE((SELECT SUM(CASE WHEN l.status = 'settled' AND l.direction = 'credit' THEN l.net_amount ELSE 0 END) FROM tenant_ledger_entries l WHERE l.tenant_id = t.id AND l.source_type = 'booking_payment'), 0) AS booking_balance,
			COALESCE((SELECT COUNT(*) FROM tenant_ledger_entries l WHERE l.tenant_id = t.id AND l.source_type = 'booking_payment'), 0) AS booking_transactions,
			COALESCE((SELECT COUNT(*) FROM midtrans_notification_logs l WHERE l.tenant_id = t.id), 0) AS midtrans_logs,
			COALESCE((SELECT COUNT(*) FROM customers c WHERE c.tenant_id = t.id), 0) AS customers_count,
			COALESCE((SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = t.id), 0) AS bookings_count
		FROM tenants t
		LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'owner'
		WHERE t.id::text = $1
		LIMIT 1`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return map[string]any{}, nil
	}
	row := map[string]any{}
	if err := rows.MapScan(row); err != nil {
		return nil, err
	}
	return normalizeRow(row), nil
}

func normalizeRow(row map[string]any) map[string]any {
	for k, v := range row {
		if b, ok := v.([]byte); ok {
			var decoded any
			if json.Unmarshal(b, &decoded) == nil {
				row[k] = decoded
			} else if strings.HasPrefix(string(b), "{") && strings.HasSuffix(string(b), "}") {
				row[k] = parsePostgresArray(string(b))
			} else {
				row[k] = string(b)
			}
		}
	}
	return row
}

func parsePostgresArray(value string) []string {
	trimmed := strings.TrimSpace(value)
	trimmed = strings.TrimPrefix(trimmed, "{")
	trimmed = strings.TrimSuffix(trimmed, "}")
	if trimmed == "" {
		return []string{}
	}
	parts := strings.Split(trimmed, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		item := strings.Trim(strings.TrimSpace(part), `"`)
		if item == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}

func (r *Repository) Summary(ctx context.Context) (map[string]any, error) {
	var totalTenants, activeTenants, totalCustomers, totalTransactions int
	var revenue float64
	if err := r.db.GetContext(ctx, &totalTenants, `SELECT COUNT(*) FROM tenants`); err != nil {
		return nil, err
	}
	if err := r.db.GetContext(ctx, &activeTenants, `SELECT COUNT(*) FROM tenants WHERE COALESCE(subscription_status, '') IN ('active', 'trial')`); err != nil {
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
		"tenants":        totalTenants,
		"active_tenants": activeTenants,
		"customers":      totalCustomers,
		"transactions":   totalTransactions,
		"revenue":        revenue,
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

	var row revenueReportRow
	if err := r.db.GetContext(ctx, &row, query, args...); err != nil {
		return nil, err
	}
	return map[string]any{
		"revenue":              row.Revenue,
		"pending_cashflow":     row.PendingCashflow,
		"transactions":         row.Transactions,
		"paid_transactions":    row.PaidTransactions,
		"pending_transactions": row.PendingTransactions,
	}, nil
}

func (r *Repository) RevenueByTenant(ctx context.Context, start, end *time.Time) ([]map[string]any, error) {
	where := "WHERE 1=1"
	args := []any{}
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
			t.id::text AS tenant_id,
			t.slug AS tenant_slug,
			t.name AS tenant_name,
			COALESCE(u.name, '-') AS owner_name,
			COALESCE(u.email, '-') AS owner_email,
			COALESCE(SUM(CASE WHEN bo.status IN ('settlement','capture','paid') THEN bo.amount ELSE 0 END), 0) AS revenue,
			COUNT(*) FILTER (WHERE bo.status IN ('settlement','capture','paid')) AS paid_orders,
			COUNT(*) FILTER (WHERE bo.status IN ('pending','created')) AS pending_orders
		FROM billing_orders bo
		JOIN tenants t ON t.id = bo.tenant_id
		LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'owner'
		%s
		GROUP BY t.id, t.slug, t.name, u.name, u.email
		ORDER BY revenue DESC`, where)

	rows, err := r.db.QueryxContext(ctx, query, args...)
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

func (r *Repository) RevenueTimeseries(ctx context.Context, tenantSlug, interval string, start, end *time.Time) ([]map[string]any, error) {
	if interval != "week" && interval != "month" {
		interval = "month"
	}

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
			to_char(date_trunc('%s', bo.created_at), 'YYYY-MM-DD') AS period,
			COALESCE(SUM(CASE WHEN bo.status IN ('settlement','capture','paid') THEN bo.amount ELSE 0 END), 0) AS revenue,
			COALESCE(SUM(CASE WHEN bo.status IN ('pending','created') THEN bo.amount ELSE 0 END), 0) AS cashflow,
			COUNT(*) AS orders
		FROM billing_orders bo
		JOIN tenants t ON t.id = bo.tenant_id
		%s
		GROUP BY date_trunc('%s', bo.created_at)
		ORDER BY date_trunc('%s', bo.created_at) ASC`, interval, where, interval, interval)

	rows, err := r.db.QueryxContext(ctx, query, args...)
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

func (r *Repository) RevenueCSV(ctx context.Context, tenantSlug string, start, end *time.Time) (string, error) {
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
			bo.order_id,
			t.slug AS tenant_slug,
			t.name AS tenant_name,
			bo.plan,
			bo.billing_interval,
			bo.amount,
			bo.currency,
			bo.status,
			bo.created_at
		FROM billing_orders bo
		JOIN tenants t ON t.id = bo.tenant_id
		%s
		ORDER BY bo.created_at DESC`, where)

	rows, err := r.db.QueryxContext(ctx, query, args...)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	var b strings.Builder
	b.WriteString("order_id,tenant_slug,tenant_name,plan,billing_interval,amount,currency,status,created_at\n")
	for rows.Next() {
		row := map[string]any{}
		if err := rows.MapScan(row); err != nil {
			return "", err
		}
		row = normalizeRow(row)
		fmt.Fprintf(&b, "%v,%v,%v,%v,%v,%v,%v,%v,%v\n",
			row["order_id"], row["tenant_slug"], row["tenant_name"], row["plan"], row["billing_interval"],
			row["amount"], row["currency"], row["status"], row["created_at"])
	}
	return b.String(), nil
}

func (r *Repository) ListReferralWithdrawals(ctx context.Context, status string) ([]map[string]any, error) {
	query := `
		SELECT
			r.id::text,
			r.tenant_id::text,
			t.name AS tenant_name,
			t.slug AS tenant_slug,
			r.amount,
			r.status,
			r.note,
			r.requested_by_user_id::text,
			r.reviewed_by_user_id::text,
			r.reviewed_at,
			r.paid_at,
			r.created_at,
			r.updated_at
		FROM referral_withdrawal_requests r
		JOIN tenants t ON t.id = r.tenant_id`
	args := []any{}
	if strings.TrimSpace(status) != "" {
		query += " WHERE r.status = $1"
		args = append(args, status)
	}
	query += " ORDER BY r.created_at DESC LIMIT 200"

	rows, err := r.db.QueryxContext(ctx, query, args...)
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

func (r *Repository) UpdateReferralWithdrawalStatus(ctx context.Context, withdrawalID string, status string) error {
	status = strings.ToLower(strings.TrimSpace(status))
	switch status {
	case "approved", "rejected", "paid":
	default:
		return fmt.Errorf("status tidak valid")
	}

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var tenantID string
	if err := tx.GetContext(ctx, &tenantID, `
		SELECT tenant_id::text
		FROM referral_withdrawal_requests
		WHERE id::text = $1`, withdrawalID); err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE referral_withdrawal_requests
		SET status = $2,
			reviewed_at = CASE WHEN $2 IN ('approved', 'rejected', 'paid') THEN NOW() ELSE reviewed_at END,
			paid_at = CASE WHEN $2 = 'paid' THEN NOW() ELSE paid_at END,
			updated_at = NOW()
		WHERE id::text = $1`,
		withdrawalID, status,
	)
	if err != nil {
		return err
	}

	rewardStatus := "withdrawn"
	if status == "rejected" {
		rewardStatus = "available"
	}
	_, err = tx.ExecContext(ctx, `
		UPDATE referral_rewards
		SET status = $2,
			paid_at = CASE WHEN $2 = 'withdrawn' THEN NOW() ELSE paid_at END,
			updated_at = NOW()
		WHERE referrer_tenant_id::text = $1
			AND status = 'pending'`,
		tenantID, rewardStatus,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *Repository) ListEmailLogs(ctx context.Context, page, pageSize int, eventKey, status, query string) ([]map[string]any, int, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 200 {
		pageSize = 25
	}
	offset := (page - 1) * pageSize

	whereParts := []string{"1=1"}
	args := []any{}

	if eventKey = strings.TrimSpace(eventKey); eventKey != "" {
		args = append(args, eventKey)
		whereParts = append(whereParts, fmt.Sprintf("event_key = $%d", len(args)))
	}
	if status = strings.TrimSpace(status); status != "" {
		args = append(args, status)
		whereParts = append(whereParts, fmt.Sprintf("status = $%d", len(args)))
	}
	if query = strings.TrimSpace(query); query != "" {
		args = append(args, "%"+strings.ToLower(query)+"%")
		whereParts = append(whereParts, fmt.Sprintf(`(
			LOWER(recipient) LIKE $%d OR
			LOWER(subject) LIKE $%d OR
			LOWER(event_key) LIKE $%d OR
			LOWER(source) LIKE $%d
		)`, len(args), len(args), len(args), len(args)))
	}

	where := strings.Join(whereParts, " AND ")
	args = append(args, pageSize, offset)
	limitArg := len(args) - 1
	offsetArg := len(args)

	querySQL := fmt.Sprintf(`
		SELECT
			id::text,
			provider,
			provider_message_id,
			source,
			event_key,
			template_key,
			recipient,
			subject,
			status,
			error_message,
			request_payload,
			tags,
			sent_at,
			created_at,
			updated_at
		FROM platform_email_logs
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, where, limitArg, offsetArg)

	rows, err := r.db.QueryxContext(ctx, querySQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var result []map[string]any
	for rows.Next() {
		row := map[string]any{}
		if err := rows.MapScan(row); err != nil {
			return nil, 0, err
		}
		result = append(result, normalizeRow(row))
	}

	countSQL := fmt.Sprintf(`SELECT COUNT(*) FROM platform_email_logs WHERE %s`, where)
	countArgs := []any{}
	if len(args) > 2 {
		countArgs = args[:len(args)-2]
	}
	var total int
	if err := r.db.GetContext(ctx, &total, countSQL, countArgs...); err != nil {
		return nil, 0, err
	}
	return result, total, nil
}

func (r *Repository) GetEmailLog(ctx context.Context, id string) (map[string]any, error) {
	rows, err := r.db.QueryxContext(ctx, `
		SELECT
			id::text,
			provider,
			provider_message_id,
			source,
			event_key,
			template_key,
			recipient,
			subject,
			status,
			error_message,
			request_payload,
			tags,
			sent_at,
			created_at,
			updated_at
		FROM platform_email_logs
		WHERE id::text = $1
		LIMIT 1`, strings.TrimSpace(id))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return map[string]any{}, nil
	}
	row := map[string]any{}
	if err := rows.MapScan(row); err != nil {
		return nil, err
	}
	return normalizeRow(row), nil
}

func mustJSON(value any) string {
	raw, err := json.Marshal(value)
	if err != nil {
		return "{}"
	}
	return string(raw)
}
