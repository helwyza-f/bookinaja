package tenant

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/fnb"
	"github.com/helwiza/backend/internal/resource"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

type Repository struct {
	db  *sqlx.DB
	rdb *redis.Client
}

func NewRepository(db *sqlx.DB, rdb *redis.Client) *Repository {
	return &Repository{
		db:  db,
		rdb: rdb,
	}
}

// --- REDIS KEY HELPERS ---

func (r *Repository) getProfileCacheKey(slug string) string {
	return fmt.Sprintf("tenant:profile:slug:%s", strings.ToLower(strings.TrimSpace(slug)))
}

func (r *Repository) getProfileByIDCacheKey(id string) string {
	return fmt.Sprintf("tenant:profile:id:%s", id)
}

func (r *Repository) getLandingCacheKey(slug string) string {
	return fmt.Sprintf("landing:full:%s", strings.ToLower(strings.TrimSpace(slug)))
}

func (r *Repository) getUserCacheKey(id string) string {
	return fmt.Sprintf("user:profile:%s", id)
}

func (r *Repository) getPublicTenantsCacheKey() string {
	return "tenant:public:list"
}

func (r *Repository) invalidateUserCache(ctx context.Context, userIDs ...uuid.UUID) {
	if r.rdb == nil || len(userIDs) == 0 {
		return
	}
	keys := make([]string, 0, len(userIDs))
	for _, userID := range userIDs {
		if userID != uuid.Nil {
			keys = append(keys, r.getUserCacheKey(userID.String()))
		}
	}
	if len(keys) > 0 {
		_ = r.rdb.Del(ctx, keys...).Err()
	}
}

func (r *Repository) invalidateStaffCacheByRole(ctx context.Context, tenantID, roleID uuid.UUID) {
	if r.rdb == nil || tenantID == uuid.Nil || roleID == uuid.Nil {
		return
	}
	var userIDs []uuid.UUID
	err := r.db.SelectContext(ctx, &userIDs, `
		SELECT id
		FROM users
		WHERE tenant_id = $1 AND role_id = $2 AND role = 'staff'`,
		tenantID, roleID,
	)
	if err == nil {
		r.invalidateUserCache(ctx, userIDs...)
	}
}

// --- CORE REPOSITORY LOGIC ---

func (r *Repository) GetBySlug(ctx context.Context, slug string) (*Tenant, error) {
	slug = strings.ToLower(strings.TrimSpace(slug))
	cacheKey := r.getProfileCacheKey(slug)

	// 1. Try Redis
	val, err := r.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var t Tenant
		if err := json.Unmarshal([]byte(val), &t); err == nil {
			return &t, nil
		}
	}

	// 2. Database Lookup
	var t Tenant
	query := `SELECT * FROM tenants WHERE LOWER(TRIM(slug)) = $1 LIMIT 1`
	err = r.db.GetContext(ctx, &t, query, slug)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// 3. Set Cache (TTL 24 Jam)
	jsonData, _ := json.Marshal(t)
	r.rdb.Set(ctx, cacheKey, jsonData, 24*time.Hour)

	return &t, nil
}

func (r *Repository) GetPublicLandingData(ctx context.Context, slug string) (map[string]interface{}, error) {
	slug = strings.ToLower(strings.TrimSpace(slug))
	cacheKey := r.getLandingCacheKey(slug)

	// 1. Try Redis
	val, err := r.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var cachedData map[string]interface{}
		if err := json.Unmarshal([]byte(val), &cachedData); err == nil {
			return cachedData, nil
		}
	}

	// 2. DB Miss: Build Data
	tenant, err := r.GetBySlug(ctx, slug)
	if err != nil || tenant == nil {
		return nil, fmt.Errorf("business not found")
	}

	resources, err := r.ListResourcesWithItems(ctx, tenant.ID)
	if err != nil {
		return nil, err
	}

	result := map[string]interface{}{
		"profile":   tenant,
		"resources": resources,
	}

	// 3. Cache it (TTL 1 Jam - Karena resources sering berubah)
	jsonData, _ := json.Marshal(result)
	r.rdb.Set(ctx, cacheKey, jsonData, time.Hour)

	return result, nil
}

func (r *Repository) ListPublicTenants(ctx context.Context) ([]TenantDirectoryItem, error) {
	var items []TenantDirectoryItem
	cacheKey := r.getPublicTenantsCacheKey()
	if val, err := r.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if err := json.Unmarshal([]byte(val), &items); err == nil {
			return items, nil
		}
	}
	err := r.db.SelectContext(ctx, &items, `
		SELECT
			tenants.id,
			tenants.name,
			tenants.slug,
			tenants.business_category,
			tenants.business_type,
			COALESCE(tenants.tagline, '') AS tagline,
			COALESCE(tenants.slogan, '') AS slogan,
			COALESCE(tenants.about_us, '') AS about_us,
			COALESCE(tenants.primary_color, '#3b82f6') AS primary_color,
			COALESCE(tenants.logo_url, '') AS logo_url,
			COALESCE(tenants.banner_url, '') AS banner_url,
			COALESCE(tenants.open_time, '09:00') AS open_time,
			COALESCE(tenants.close_time, '22:00') AS close_time,
			COALESCE(tenants.discovery_headline, '') AS discovery_headline,
			COALESCE(tenants.discovery_subheadline, '') AS discovery_subheadline,
			COALESCE(tenants.discovery_tags, ARRAY[]::text[]) AS discovery_tags,
			COALESCE(tenants.discovery_badges, ARRAY[]::text[]) AS discovery_badges,
			COALESCE(tenants.promo_label, '') AS promo_label,
			COALESCE(tenants.featured_image_url, '') AS featured_image_url,
			COALESCE(tenants.highlight_copy, '') AS highlight_copy,
			COALESCE(tenants.discovery_featured, false) AS discovery_featured,
			COALESCE(tenants.discovery_promoted, false) AS discovery_promoted,
			COALESCE(tenants.discovery_priority, 0) AS discovery_priority,
			tenants.promo_starts_at,
			tenants.promo_ends_at,
			COALESCE(discovery_stats.impressions_30d, 0) AS discovery_impressions_30d,
			COALESCE(discovery_stats.clicks_30d, 0) AS discovery_clicks_30d,
			COALESCE(discovery_stats.ctr_30d, 0) AS discovery_ctr_30d,
			COALESCE(resource_stats.resource_count, 0) AS resource_count,
			COALESCE(price_stats.starting_price, 0) AS starting_price,
			COALESCE(top_resource.name, '') AS top_resource_name,
			COALESCE(top_resource.category, '') AS top_resource_type,
			tenants.created_at
		FROM tenants
		LEFT JOIN (
			SELECT tenant_id, COUNT(*) AS resource_count
			FROM resources
			WHERE status != 'deleted'
			GROUP BY tenant_id
		) resource_stats ON resource_stats.tenant_id = tenants.id
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
		) discovery_stats ON discovery_stats.tenant_id = tenants.id
		LEFT JOIN (
			SELECT r.tenant_id, MIN(ri.price) AS starting_price
			FROM resources r
			JOIN resource_items ri ON ri.resource_id = r.id
			WHERE r.status != 'deleted'
			GROUP BY r.tenant_id
		) price_stats ON price_stats.tenant_id = tenants.id
		LEFT JOIN (
			SELECT DISTINCT ON (tenant_id)
				tenant_id, name, category
			FROM resources
			WHERE status != 'deleted'
			ORDER BY tenant_id, created_at DESC, name ASC
		) top_resource ON top_resource.tenant_id = tenants.id
		ORDER BY tenants.discovery_priority DESC, tenants.created_at DESC, tenants.name ASC`)
	if err != nil {
		if isDiscoverySchemaError(err) {
			items, err = r.listPublicTenantsLegacy(ctx)
		}
		if err != nil {
			return nil, err
		}
	}
	if raw, marshalErr := json.Marshal(items); marshalErr == nil {
		_ = r.rdb.Set(ctx, cacheKey, raw, 30*time.Minute).Err()
	}
	return items, nil
}

func (r *Repository) listPublicTenantsLegacy(ctx context.Context) ([]TenantDirectoryItem, error) {
	var items []TenantDirectoryItem
	err := r.db.SelectContext(ctx, &items, `
		SELECT
			tenants.id,
			tenants.name,
			tenants.slug,
			tenants.business_category,
			tenants.business_type,
			COALESCE(tenants.tagline, '') AS tagline,
			COALESCE(tenants.slogan, '') AS slogan,
			COALESCE(tenants.about_us, '') AS about_us,
			COALESCE(tenants.primary_color, '#3b82f6') AS primary_color,
			COALESCE(tenants.logo_url, '') AS logo_url,
			COALESCE(tenants.banner_url, '') AS banner_url,
			COALESCE(tenants.open_time, '09:00') AS open_time,
			COALESCE(tenants.close_time, '22:00') AS close_time,
			'' AS discovery_headline,
			'' AS discovery_subheadline,
			ARRAY[]::text[] AS discovery_tags,
			ARRAY[]::text[] AS discovery_badges,
			'' AS promo_label,
			'' AS featured_image_url,
			'' AS highlight_copy,
			false AS discovery_featured,
			false AS discovery_promoted,
			0 AS discovery_priority,
			NULL::timestamptz AS promo_starts_at,
			NULL::timestamptz AS promo_ends_at,
			0::bigint AS discovery_impressions_30d,
			0::bigint AS discovery_clicks_30d,
			0::numeric AS discovery_ctr_30d,
			COALESCE(resource_stats.resource_count, 0) AS resource_count,
			COALESCE(price_stats.starting_price, 0) AS starting_price,
			COALESCE(top_resource.name, '') AS top_resource_name,
			COALESCE(top_resource.category, '') AS top_resource_type,
			tenants.created_at
		FROM tenants
		LEFT JOIN (
			SELECT tenant_id, COUNT(*) AS resource_count
			FROM resources
			WHERE status != 'deleted'
			GROUP BY tenant_id
		) resource_stats ON resource_stats.tenant_id = tenants.id
		LEFT JOIN (
			SELECT r.tenant_id, MIN(ri.price) AS starting_price
			FROM resources r
			JOIN resource_items ri ON ri.resource_id = r.id
			WHERE r.status != 'deleted'
			GROUP BY r.tenant_id
		) price_stats ON price_stats.tenant_id = tenants.id
		LEFT JOIN (
			SELECT DISTINCT ON (tenant_id)
				tenant_id, name, category
			FROM resources
			WHERE status != 'deleted'
			ORDER BY tenant_id, created_at DESC, name ASC
		) top_resource ON top_resource.tenant_id = tenants.id
		ORDER BY tenants.created_at DESC, tenants.name ASC`)
	return items, err
}

func (r *Repository) GetCustomerDiscoverySignals(ctx context.Context, customerID uuid.UUID) (*CustomerDiscoverySignals, error) {
	signals := &CustomerDiscoverySignals{
		FavoriteCategories: map[string]int{},
		FavoriteTypes:      map[string]int{},
		VisitedTenants:     map[uuid.UUID]int{},
	}

	type categoryRow struct {
		Category string `db:"category"`
		Total    int    `db:"total"`
	}
	var categoryRows []categoryRow
	if err := r.db.SelectContext(ctx, &categoryRows, `
		SELECT
			LOWER(COALESCE(NULLIF(TRIM(t.business_category), ''), 'lainnya')) AS category,
			COUNT(*) AS total
		FROM bookings b
		JOIN tenants t ON t.id = b.tenant_id
		WHERE b.customer_id = $1
		GROUP BY 1
		ORDER BY total DESC`, customerID); err != nil {
		return nil, err
	}
	for _, row := range categoryRows {
		signals.FavoriteCategories[row.Category] = row.Total
		signals.TotalBookings += row.Total
	}

	type typeRow struct {
		BusinessType string `db:"business_type"`
		Total        int    `db:"total"`
	}
	var typeRows []typeRow
	if err := r.db.SelectContext(ctx, &typeRows, `
		SELECT
			LOWER(COALESCE(NULLIF(TRIM(t.business_type), ''), '')) AS business_type,
			COUNT(*) AS total
		FROM bookings b
		JOIN tenants t ON t.id = b.tenant_id
		WHERE b.customer_id = $1
		GROUP BY 1
		ORDER BY total DESC`, customerID); err != nil {
		return nil, err
	}
	for _, row := range typeRows {
		if strings.TrimSpace(row.BusinessType) == "" {
			continue
		}
		signals.FavoriteTypes[row.BusinessType] = row.Total
	}

	type tenantRow struct {
		TenantID uuid.UUID `db:"tenant_id"`
		Total    int       `db:"total"`
	}
	var tenantRows []tenantRow
	if err := r.db.SelectContext(ctx, &tenantRows, `
		SELECT tenant_id, COUNT(*) AS total
		FROM bookings
		WHERE customer_id = $1
		GROUP BY tenant_id
		ORDER BY total DESC`, customerID); err != nil {
		return nil, err
	}
	for _, row := range tenantRows {
		signals.VisitedTenants[row.TenantID] = row.Total
	}

	if err := r.db.GetContext(ctx, &signals.AverageSpend, `
		SELECT COALESCE(AVG(NULLIF(grand_total, 0)), 0)
		FROM bookings
		WHERE customer_id = $1
		  AND COALESCE(grand_total, 0) > 0`, customerID); err != nil {
		return nil, err
	}

	if err := r.db.GetContext(ctx, &signals.EveningBookings, `
		SELECT COUNT(*)
		FROM bookings
		WHERE customer_id = $1
		  AND EXTRACT(HOUR FROM start_time) >= 18`, customerID); err != nil {
		return nil, err
	}

	return signals, nil
}

func isDiscoverySchemaError(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "column") ||
		strings.Contains(message, "discovery_") ||
		strings.Contains(message, "featured_image_url") ||
		strings.Contains(message, "promo_starts_at") ||
		strings.Contains(message, "promo_ends_at")
}

func (r *Repository) CreateWithAdmin(ctx context.Context, t Tenant, u User) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.NamedExecContext(ctx, `
		INSERT INTO tenants (
			id, name, slug, business_category, business_type, 
			plan, subscription_status, subscription_current_period_start, subscription_current_period_end,
			slogan, tagline, about_us, features, primary_color,
			discovery_headline, discovery_subheadline, discovery_tags, discovery_badges, promo_label, featured_image_url, highlight_copy,
			discovery_featured, discovery_promoted, discovery_priority, promo_starts_at, promo_ends_at,
			receipt_title, receipt_subtitle, receipt_footer, receipt_whatsapp_text, receipt_template,
			receipt_channel, printer_enabled, printer_name, printer_mode, printer_endpoint, printer_auto_print, printer_status,
			referral_code, referred_by_tenant_id,
			created_at
		) VALUES (
			:id, :name, :slug, :business_category, :business_type, 
			:plan, :subscription_status, :subscription_current_period_start, :subscription_current_period_end,
			:slogan, :tagline, :about_us, :features, :primary_color,
			:discovery_headline, :discovery_subheadline, :discovery_tags, :discovery_badges, :promo_label, :featured_image_url, :highlight_copy,
			:discovery_featured, :discovery_promoted, :discovery_priority, :promo_starts_at, :promo_ends_at,
			:receipt_title, :receipt_subtitle, :receipt_footer, :receipt_whatsapp_text, :receipt_template,
			:receipt_channel, :printer_enabled, :printer_name, :printer_mode, :printer_endpoint, :printer_auto_print, :printer_status,
			:referral_code, :referred_by_tenant_id,
			:created_at
		)`, t)
	if err != nil {
		return err
	}

	_, err = tx.NamedExecContext(ctx, `
		INSERT INTO users (id, tenant_id, name, email, password, role, created_at) 
		VALUES (:id, :tenant_id, :name, :email, :password, :role, :created_at)`, u)
	if err != nil {
		return err
	}

	if err := r.seedDefaultStaffRolesTx(ctx, tx, t.ID); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	// Clear potential negative cache or pre-warm if necessary
	r.rdb.Del(ctx, r.getProfileCacheKey(t.Slug), r.getPublicTenantsCacheKey(), fmt.Sprintf("tenant_id_by_slug:%s", strings.ToLower(strings.TrimSpace(t.Slug))))
	return nil
}

func (r *Repository) seedDefaultStaffRolesTx(ctx context.Context, tx *sqlx.Tx, tenantID uuid.UUID) error {
	defaults := defaultStaffRoles()
	for _, role := range defaults {
		role.TenantID = tenantID
		role.ID = uuid.New()
		_, err := tx.NamedExecContext(ctx, `
			INSERT INTO staff_roles (id, tenant_id, name, description, permission_keys, is_default, created_at, updated_at)
			VALUES (:id, :tenant_id, :name, :description, :permission_keys, :is_default, NOW(), NOW())`, role)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) Update(ctx context.Context, t Tenant) error {
	// 1. Database Update
	query := `
        UPDATE tenants SET 
            name=:name, slogan=:slogan, tagline=:tagline, about_us=:about_us, 
            features=:features, address=:address, open_time=:open_time, 
            close_time=:close_time, logo_url=:logo_url, banner_url=:banner_url, 
            gallery=:gallery, business_category=:business_category, primary_color=:primary_color, 
            whatsapp_number=:whatsapp_number, instagram_url=:instagram_url, 
            tiktok_url=:tiktok_url, map_iframe_url=:map_iframe_url, 
            meta_title=:meta_title, meta_description=:meta_description,
            discovery_headline=:discovery_headline, discovery_subheadline=:discovery_subheadline,
            discovery_tags=:discovery_tags, discovery_badges=:discovery_badges,
            promo_label=:promo_label, featured_image_url=:featured_image_url, highlight_copy=:highlight_copy,
            discovery_featured=:discovery_featured, discovery_promoted=:discovery_promoted,
            discovery_priority=:discovery_priority,
            promo_starts_at=:promo_starts_at, promo_ends_at=:promo_ends_at,
            receipt_title=:receipt_title, receipt_subtitle=:receipt_subtitle, receipt_footer=:receipt_footer,
            receipt_whatsapp_text=:receipt_whatsapp_text, receipt_template=:receipt_template, receipt_channel=:receipt_channel,
            printer_enabled=:printer_enabled, printer_name=:printer_name, printer_mode=:printer_mode,
			printer_endpoint=:printer_endpoint, printer_auto_print=:printer_auto_print, printer_status=:printer_status,
            referral_code=:referral_code, referred_by_tenant_id=:referred_by_tenant_id,
            payout_bank_name=:payout_bank_name, payout_account_name=:payout_account_name,
            payout_account_number=:payout_account_number, payout_whatsapp=:payout_whatsapp
        WHERE id=:id`

	_, err := r.db.NamedExecContext(ctx, query, t)
	if err != nil {
		return err
	}

	// 2. SMART INVALIDATION (Total Purge)
	// Kita kumpulin semua key yang mungkin mengandung data tenant ini
	keysToDel := []string{
		r.getLandingCacheKey(t.Slug),            // Cache Landing Page
		r.getProfileCacheKey(t.Slug),            // Cache Profile by Slug
		r.getProfileByIDCacheKey(t.ID.String()), // Cache Profile by ID
		r.getPublicTenantsCacheKey(),
		fmt.Sprintf("tenant_id_by_slug:%s", strings.ToLower(strings.TrimSpace(t.Slug))),
	}

	// 3. CRITICAL: Kita juga harus hapus cache USER!
	// Karena di GetUserByID kita simpan LogoURL, kalau logo diupdate,
	// cache user harus dibuang biar sidebar admin berubah.
	// Kita cari semua admin/owner dari tenant ini.
	var userIDs []string
	err = r.db.SelectContext(ctx, &userIDs, `SELECT id::text FROM users WHERE tenant_id = $1`, t.ID)
	if err == nil {
		for _, uID := range userIDs {
			keysToDel = append(keysToDel, r.getUserCacheKey(uID))
		}
	}

	// 4. Eksekusi Delete di Redis
	if len(keysToDel) > 0 {
		errDel := r.rdb.Del(ctx, keysToDel...).Err()
		if errDel != nil {
			fmt.Printf("⚠️  [REDIS] CACHE PURGE FAILED: %v\n", errDel)
		} else {
			fmt.Printf("🧹 [REDIS] CACHE PURGED for Tenant: %s (Slug: %s)\n", t.ID.String(), t.Slug)
			for _, k := range keysToDel {
				fmt.Printf("   -> Deleted: %s\n", k)
			}
		}
	}

	return nil
}

func (r *Repository) GetByReferralCode(ctx context.Context, code string) (*Tenant, error) {
	var t Tenant
	err := r.db.GetContext(ctx, &t, `SELECT * FROM tenants WHERE LOWER(TRIM(referral_code)) = $1 LIMIT 1`, strings.ToLower(strings.TrimSpace(code)))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *Repository) GetReferralChildren(ctx context.Context, tenantID uuid.UUID) ([]ReferralListItem, error) {
	var items []ReferralListItem
	err := r.db.SelectContext(ctx, &items, `
		SELECT
			t.id AS tenant_id,
			t.name AS tenant_name,
			t.slug AS tenant_slug,
			t.subscription_status AS status,
			CASE
				WHEN t.subscription_status = 'trial' THEN t.subscription_current_period_end
				ELSE NULL
			END AS trial_ends_at,
			CASE
				WHEN t.subscription_status = 'active' THEN t.subscription_current_period_start
				ELSE NULL
			END AS subscribed_at,
			CASE
				WHEN rr.status = 'pending' AND EXISTS (
					SELECT 1
					FROM referral_withdrawal_requests rwr
					WHERE rwr.tenant_id = $1
						AND rwr.status IN ('approved', 'paid')
				) THEN 'withdrawn'
				ELSE COALESCE(rr.status, '')
			END AS reward_status,
			COALESCE(rr.reward_amount, 0) AS reward_amount
		FROM tenants t
		LEFT JOIN referral_rewards rr ON rr.referred_tenant_id = t.id
		WHERE t.referred_by_tenant_id = $1
		ORDER BY t.created_at DESC`, tenantID)
	return items, err
}

func (r *Repository) ReferralSummary(ctx context.Context, tenantID uuid.UUID) (map[string]any, error) {
	var out map[string]any = map[string]any{}
	var referrals int
	var active int
	var pending int
	var available int64
	var pendingWithdrawal int64
	err := r.db.GetContext(ctx, &referrals, `SELECT COUNT(*) FROM tenants WHERE referred_by_tenant_id = $1`, tenantID)
	if err != nil {
		return nil, err
	}
	_ = r.db.GetContext(ctx, &active, `SELECT COUNT(*) FROM tenants t WHERE t.referred_by_tenant_id = $1 AND t.subscription_status = 'active'`, tenantID)
	_ = r.db.GetContext(ctx, &pending, `SELECT COUNT(*) FROM tenants t WHERE t.referred_by_tenant_id = $1 AND t.subscription_status = 'trial'`, tenantID)
	_ = r.db.GetContext(ctx, &available, `SELECT COALESCE(SUM(reward_amount),0) FROM referral_rewards WHERE referrer_tenant_id = $1 AND status = 'available'`, tenantID)
	_ = r.db.GetContext(ctx, &pendingWithdrawal, `SELECT COALESCE(SUM(amount),0) FROM referral_withdrawal_requests WHERE tenant_id = $1 AND status = 'pending'`, tenantID)
	out["total_referred"] = referrals
	out["active_referred"] = active
	out["trial_referred"] = pending
	out["available_balance"] = available
	out["pending_withdrawal"] = pendingWithdrawal
	return out, nil
}

func (r *Repository) CreateReferralReward(ctx context.Context, reward ReferralReward) error {
	_, err := r.db.NamedExecContext(ctx, `
		INSERT INTO referral_rewards (
			id, referrer_tenant_id, referred_tenant_id, source_order_id, reward_amount, status, available_at, metadata, created_at, updated_at
		) VALUES (
			:id, :referrer_tenant_id, :referred_tenant_id, :source_order_id, :reward_amount, :status, :available_at, :metadata, :created_at, :updated_at
	)`, reward)
	return err
}

func (r *Repository) RequestReferralWithdrawal(ctx context.Context, req ReferralWithdrawalRequest) error {
	_, err := r.db.NamedExecContext(ctx, `
		INSERT INTO referral_withdrawal_requests (
			id, tenant_id, amount, status, requested_by_user_id, note, metadata, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :amount, :status, :requested_by_user_id, :note, :metadata, :created_at, :updated_at
		)`, req)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, `
		UPDATE referral_rewards
		SET status = 'pending', updated_at = NOW()
		WHERE referrer_tenant_id = $1 AND status = 'available'`,
		req.TenantID,
	)
	return err
}

func (r *Repository) ListReferralWithdrawals(ctx context.Context, tenantID uuid.UUID) ([]ReferralWithdrawalRequest, error) {
	var items []ReferralWithdrawalRequest
	err := r.db.SelectContext(ctx, &items, `
		SELECT *
		FROM referral_withdrawal_requests
		WHERE tenant_id = $1
		ORDER BY created_at DESC`,
		tenantID,
	)
	return items, err
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Tenant, error) {
	cacheKey := r.getProfileByIDCacheKey(id.String())

	// 1. Try Redis
	val, err := r.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var t Tenant
		if err := json.Unmarshal([]byte(val), &t); err == nil {
			return &t, nil
		}
	}

	// 2. DB
	var t Tenant
	err = r.db.GetContext(ctx, &t, `SELECT * FROM tenants WHERE id = $1`, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// 3. Update Cache
	jsonData, _ := json.Marshal(t)
	r.rdb.Set(ctx, cacheKey, jsonData, 24*time.Hour)

	return &t, nil
}

func (r *Repository) CreateDiscoveryFeedEvent(ctx context.Context, event DiscoveryFeedEvent) error {
	_, err := r.db.NamedExecContext(ctx, `
		INSERT INTO discovery_feed_events (
			id, tenant_id, event_type, surface, section_id, card_variant,
			position_index, session_id, promo_label, metadata, created_at
		) VALUES (
			:id, :tenant_id, :event_type, :surface, :section_id, :card_variant,
			:position_index, :session_id, :promo_label, :metadata, :created_at
		)`,
		event,
	)
	return err
}

func (r *Repository) ListTenantPosts(ctx context.Context, tenantID uuid.UUID) ([]TenantPost, error) {
	var posts []TenantPost
	err := r.db.SelectContext(ctx, &posts, `
		SELECT
			id, tenant_id, author_user_id, type, title, caption, cover_media_url,
			thumbnail_url, cta, status, visibility, starts_at, ends_at,
			published_at, metadata, created_at, updated_at
		FROM tenant_posts
		WHERE tenant_id = $1
		ORDER BY
			CASE status
				WHEN 'published' THEN 1
				WHEN 'scheduled' THEN 2
				ELSE 3
			END,
			COALESCE(published_at, created_at) DESC,
			updated_at DESC`,
		tenantID,
	)
	return posts, err
}

func (r *Repository) ListActiveDiscoveryPosts(ctx context.Context) ([]TenantPost, error) {
	var posts []TenantPost
	err := r.db.SelectContext(ctx, &posts, `
		SELECT
			id, tenant_id, author_user_id, type, title, caption, cover_media_url,
			thumbnail_url, cta, status, visibility, starts_at, ends_at,
			published_at, metadata, created_at, updated_at
		FROM tenant_posts
		WHERE status = 'published'
		  AND visibility IN ('feed', 'highlight')
		  AND (starts_at IS NULL OR starts_at <= NOW())
		  AND (ends_at IS NULL OR ends_at >= NOW())
		ORDER BY COALESCE(published_at, updated_at, created_at) DESC,
		         updated_at DESC`)
	return posts, err
}

func (r *Repository) GetTenantPostByID(ctx context.Context, tenantID, postID uuid.UUID) (*TenantPost, error) {
	var post TenantPost
	err := r.db.GetContext(ctx, &post, `
		SELECT
			id, tenant_id, author_user_id, type, title, caption, cover_media_url,
			thumbnail_url, cta, status, visibility, starts_at, ends_at,
			published_at, metadata, created_at, updated_at
		FROM tenant_posts
		WHERE tenant_id = $1 AND id = $2
		LIMIT 1`,
		tenantID, postID,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &post, err
}

func (r *Repository) CreateTenantPost(ctx context.Context, post TenantPost) (*TenantPost, error) {
	_, err := r.db.NamedExecContext(ctx, `
		INSERT INTO tenant_posts (
			id, tenant_id, author_user_id, type, title, caption, cover_media_url,
			thumbnail_url, cta, status, visibility, starts_at, ends_at,
			published_at, metadata, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :author_user_id, :type, :title, :caption, :cover_media_url,
			:thumbnail_url, :cta, :status, :visibility, :starts_at, :ends_at,
			:published_at, :metadata, :created_at, :updated_at
		)`,
		post,
	)
	if err != nil {
		return nil, err
	}
	return &post, nil
}

func (r *Repository) UpdateTenantPost(ctx context.Context, post TenantPost) (*TenantPost, error) {
	_, err := r.db.NamedExecContext(ctx, `
		UPDATE tenant_posts
		SET
			type = :type,
			title = :title,
			caption = :caption,
			cover_media_url = :cover_media_url,
			thumbnail_url = :thumbnail_url,
			cta = :cta,
			status = :status,
			visibility = :visibility,
			starts_at = :starts_at,
			ends_at = :ends_at,
			published_at = :published_at,
			metadata = :metadata,
			updated_at = :updated_at
		WHERE tenant_id = :tenant_id AND id = :id`,
		post,
	)
	if err != nil {
		return nil, err
	}
	return &post, nil
}

func (r *Repository) DeleteTenantPost(ctx context.Context, tenantID, postID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM tenant_posts WHERE tenant_id = $1 AND id = $2`, tenantID, postID)
	return err
}

func (r *Repository) GetUserByID(ctx context.Context, id uuid.UUID) (*User, string, error) {
	cacheKey := r.getUserCacheKey(id.String())

	// 1. Try Cache
	val, err := r.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var cached struct {
			User User   `json:"user"`
			Logo string `json:"logo"`
		}
		if err := json.Unmarshal([]byte(val), &cached); err == nil {
			// LOG HIT: Data ada di Redis
			fmt.Printf("⚡ [REDIS] CACHE HIT: user_profile:%s\n", id.String())
			return &cached.User, cached.Logo, nil
		}
	}

	// 2. DB Lookup
	// LOG MISS: Redis zonk, terpaksa ngetok pintu Postgres
	fmt.Printf("🗄️  [DB] CACHE MISS: user_profile:%s (Querying Postgres...)\n", id.String())

	var u struct {
		User
		TenantLogo string `db:"logo_url"`
	}

	query := `
		SELECT 
			u.id, u.tenant_id, u.role_id, u.name, u.email, u.role, u.created_at,
			COALESCE(t.logo_url, '') as logo_url
		FROM users u
		JOIN tenants t ON t.id = u.tenant_id
		LEFT JOIN staff_roles sr ON sr.id = u.role_id
		WHERE u.id = $1
		GROUP BY u.id, t.logo_url
		LIMIT 1`

	err = r.db.GetContext(ctx, &u, query, id)
	if err == sql.ErrNoRows {
		return nil, "", nil
	}
	if err != nil {
		return nil, "", err
	}

	// 3. Set Cache (TTL 6 Jam)
	cachedData := struct {
		User User   `json:"user"`
		Logo string `json:"logo"`
	}{User: u.User, Logo: u.TenantLogo}

	jsonData, _ := json.Marshal(cachedData)
	if err := r.rdb.Set(ctx, cacheKey, jsonData, 6*time.Hour).Err(); err != nil {
		fmt.Printf("⚠️  [REDIS] FAILED TO SET CACHE: %v\n", err)
	} else {
		fmt.Printf("💾 [REDIS] CACHE STORED: user_profile:%s (TTL: 6h)\n", id.String())
	}

	return &u.User, u.TenantLogo, nil
}

// --- REMAINING GETTERS (Always Fresh / Low Frequency) ---

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	var u User
	err := r.db.GetContext(ctx, &u, `SELECT * FROM users WHERE email = $1 LIMIT 1`, email)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}

func (r *Repository) GetUserByEmailAndSlug(ctx context.Context, email, slug string) (*User, error) {
	var u User
	query := `
		SELECT u.*
		FROM users u
		JOIN tenants t ON t.id = u.tenant_id
		WHERE u.email = $1 AND LOWER(TRIM(t.slug)) = LOWER(TRIM($2))
		LIMIT 1`
	err := r.db.GetContext(ctx, &u, query, email, slug)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}

func (r *Repository) ListUsersByTenant(ctx context.Context, tenantID uuid.UUID) ([]User, error) {
	var users []User
	err := r.db.SelectContext(ctx, &users, `
		SELECT 
			u.id, u.tenant_id, u.role_id, u.name, u.email, u.role, u.created_at
		FROM users u
		WHERE u.tenant_id = $1 AND u.role = 'staff'
		GROUP BY u.id
		ORDER BY u.role ASC, u.created_at ASC`, tenantID)
	return users, err
}

func (r *Repository) CreateStaff(ctx context.Context, tenantID uuid.UUID, name, email, password string, roleID uuid.UUID) (*User, error) {
	query := `
		INSERT INTO users (id, tenant_id, role_id, name, email, password, role, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, 'staff', NOW())
		RETURNING id, tenant_id, role_id, name, email, role, created_at`
	var u User
	if err := r.db.GetContext(ctx, &u, query, uuid.New(), tenantID, roleID, name, email, password); err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) UpdateStaff(ctx context.Context, tenantID, staffID, roleID uuid.UUID, name, email string) (*User, error) {
	query := `
		UPDATE users
		SET name = COALESCE(NULLIF($4, ''), name),
		    email = COALESCE(NULLIF($5, ''), email),
		    role_id = $3
		WHERE id = $1 AND tenant_id = $2 AND role = 'staff'
		RETURNING id, tenant_id, role_id, name, email, role, created_at`
	var u User
	if err := r.db.GetContext(ctx, &u, query, staffID, tenantID, roleID, name, email); err != nil {
		return nil, err
	}
	r.invalidateUserCache(ctx, staffID)
	return &u, nil
}

func (r *Repository) ListStaffRoles(ctx context.Context, tenantID uuid.UUID) ([]StaffRole, error) {
	var roles []StaffRole
	err := r.db.SelectContext(ctx, &roles, `
		SELECT id, tenant_id, name, description, permission_keys, is_default, created_at, updated_at
		FROM staff_roles
		WHERE tenant_id = $1
		ORDER BY is_default DESC, name ASC`, tenantID)
	return roles, err
}

func (r *Repository) GetStaffRoleByID(ctx context.Context, tenantID, roleID uuid.UUID) (*StaffRole, error) {
	var role StaffRole
	err := r.db.GetContext(ctx, &role, `
		SELECT id, tenant_id, name, description, permission_keys, is_default, created_at, updated_at
		FROM staff_roles
		WHERE tenant_id = $1 AND id = $2
		LIMIT 1`, tenantID, roleID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &role, err
}

func (r *Repository) CreateStaffRole(ctx context.Context, role StaffRole) (*StaffRole, error) {
	_, err := r.db.NamedExecContext(ctx, `
		INSERT INTO staff_roles (id, tenant_id, name, description, permission_keys, is_default, created_at, updated_at)
		VALUES (:id, :tenant_id, :name, :description, :permission_keys, :is_default, NOW(), NOW())`, role)
	if err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *Repository) UpdateStaffRole(ctx context.Context, role StaffRole) (*StaffRole, error) {
	_, err := r.db.NamedExecContext(ctx, `
		UPDATE staff_roles
		SET name=:name, description=:description, permission_keys=:permission_keys, is_default=:is_default, updated_at=NOW()
		WHERE tenant_id=:tenant_id AND id=:id`, role)
	if err != nil {
		return nil, err
	}
	r.invalidateStaffCacheByRole(ctx, role.TenantID, role.ID)
	return &role, nil
}

func (r *Repository) DeleteStaffRole(ctx context.Context, tenantID, roleID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM staff_roles WHERE tenant_id = $1 AND id = $2 AND is_default = false`, tenantID, roleID)
	if err == nil {
		r.invalidateStaffCacheByRole(ctx, tenantID, roleID)
	}
	return err
}

func (r *Repository) ClearDefaultRoles(ctx context.Context, tenantID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `UPDATE staff_roles SET is_default = false WHERE tenant_id = $1`, tenantID)
	if err == nil && r.rdb != nil {
		var userIDs []uuid.UUID
		if selectErr := r.db.SelectContext(ctx, &userIDs, `
			SELECT id
			FROM users
			WHERE tenant_id = $1 AND role = 'staff'`, tenantID); selectErr == nil {
			r.invalidateUserCache(ctx, userIDs...)
		}
	}
	return err
}

func (r *Repository) DeleteStaff(ctx context.Context, tenantID, staffID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM users
		WHERE id = $1 AND tenant_id = $2 AND role = 'staff'`,
		staffID, tenantID,
	)
	if err != nil {
		return err
	}

	r.invalidateUserCache(ctx, staffID)
	return nil
}

func (r *Repository) CreateAuditLog(ctx context.Context, logEntry AuditLog) error {
	_, err := r.db.NamedExecContext(ctx, `
		INSERT INTO tenant_audit_logs (
			id, tenant_id, actor_user_id, action, resource_type, resource_id, metadata, created_at
		) VALUES (
			:id, :tenant_id, :actor_user_id, :action, :resource_type, :resource_id, :metadata, :created_at
	)`, logEntry)
	return err
}

func (r *Repository) ListAuditLogsByTenant(ctx context.Context, tenantID uuid.UUID, limit int) ([]AuditLogEntry, error) {
	if limit <= 0 {
		limit = 25
	}

	var logs []AuditLogEntry
	err := r.db.SelectContext(ctx, &logs, `
		SELECT
			l.id,
			l.tenant_id,
			l.actor_user_id,
			COALESCE(u.name, 'System') AS actor_name,
			COALESCE(u.email, '') AS actor_email,
			l.action,
			l.resource_type,
			l.resource_id,
			l.metadata,
			l.created_at
		FROM tenant_audit_logs l
		LEFT JOIN users u ON u.id = l.actor_user_id
		WHERE l.tenant_id = $1
		ORDER BY l.created_at DESC
		LIMIT $2`,
		tenantID, limit,
	)
	return logs, err
}

func (r *Repository) Exists(ctx context.Context, slug, email string) (bool, bool, error) {
	var slugExists, emailExists bool
	r.db.GetContext(ctx, &slugExists, "SELECT EXISTS(SELECT 1 FROM tenants WHERE LOWER(slug) = LOWER($1))", slug)
	r.db.GetContext(ctx, &emailExists, "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email)
	return slugExists, emailExists, nil
}

func (r *Repository) ListResourcesWithItems(ctx context.Context, tenantID uuid.UUID) ([]map[string]interface{}, error) {
	// Query Aggregation ini biarkan ke DB karena transaksinya kompleks,
	// tapi hasilnya sudah di-cache oleh GetPublicLandingData di atas.
	query := `
		SELECT 
			r.id::text as id, r.name, r.category, r.status, r.description, r.image_url,
			COALESCE(json_agg(json_build_object(
				'id', i.id::text, 'name', i.name, 'item_type', i.item_type,
				'price', i.price, 'price_unit', i.price_unit, 'unit_duration', i.unit_duration
			) ORDER BY i.item_type ASC, i.price ASC) FILTER (WHERE i.id IS NOT NULL), '[]') as items
		FROM resources r
		LEFT JOIN resource_items i ON r.id = i.resource_id
		WHERE r.tenant_id = $1 AND r.status != 'deleted'
		GROUP BY r.id
		ORDER BY r.category ASC, r.name ASC`

	rows, err := r.db.QueryxContext(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		res := make(map[string]interface{})
		if err := rows.MapScan(res); err != nil {
			return nil, err
		}

		if itemsBytes, ok := res["items"].([]byte); ok {
			var itemsArray []map[string]interface{}
			if err := json.Unmarshal(itemsBytes, &itemsArray); err == nil {
				res["items"] = itemsArray
			}
		}
		results = append(results, res)
	}
	return results, nil
}

// --- SEEDING LOGIC ---
func (r *Repository) SeedTenantData(ctx context.Context, tenantID uuid.UUID, resources []resource.Resource) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, res := range resources {
		res.ID = uuid.New()
		res.TenantID = tenantID
		res.Status = "available"
		_, err = tx.NamedExecContext(ctx, `INSERT INTO resources (id, tenant_id, name, category, description, image_url, gallery, status, metadata) VALUES (:id, :tenant_id, :name, :category, :description, :image_url, :gallery, :status, :metadata)`, res)
		if err != nil {
			return err
		}

		for _, item := range res.Items {
			item.ID = uuid.New()
			item.ResourceID = res.ID
			_, err = tx.NamedExecContext(ctx, `INSERT INTO resource_items (id, resource_id, name, price, price_unit, unit_duration, item_type, is_default, metadata) VALUES (:id, :resource_id, :name, :price, :price_unit, :unit_duration, :item_type, :is_default, :metadata)`, item)
			if err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

func (r *Repository) SeedFnbData(ctx context.Context, tenantID uuid.UUID, items []fnb.Item) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, item := range items {
		item.ID = uuid.New()
		item.TenantID = tenantID
		_, err = tx.NamedExecContext(ctx, `INSERT INTO fnb_items (id, tenant_id, name, price, category, image_url, is_available) VALUES (:id, :tenant_id, :name, :price, :category, :image_url, :is_available)`, item)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}
