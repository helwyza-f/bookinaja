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
	"github.com/lib/pq"
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
	err := r.db.SelectContext(ctx, &items, `
		SELECT
			id, name, slug, business_category, business_type,
			COALESCE(tagline, '') AS tagline,
			COALESCE(slogan, '') AS slogan,
			COALESCE(about_us, '') AS about_us,
			COALESCE(primary_color, '#3b82f6') AS primary_color,
			COALESCE(logo_url, '') AS logo_url,
			COALESCE(banner_url, '') AS banner_url,
			COALESCE(open_time, '09:00') AS open_time,
			COALESCE(close_time, '22:00') AS close_time,
			created_at
		FROM tenants
		ORDER BY created_at DESC, name ASC`)
	return items, err
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
			receipt_title, receipt_subtitle, receipt_footer, receipt_whatsapp_text, receipt_template,
			receipt_channel, printer_enabled, printer_name, printer_mode, printer_endpoint, printer_auto_print, printer_status,
			created_at
		) VALUES (
			:id, :name, :slug, :business_category, :business_type, 
			:plan, :subscription_status, :subscription_current_period_start, :subscription_current_period_end,
			:slogan, :tagline, :about_us, :features, :primary_color,
			:receipt_title, :receipt_subtitle, :receipt_footer, :receipt_whatsapp_text, :receipt_template,
			:receipt_channel, :printer_enabled, :printer_name, :printer_mode, :printer_endpoint, :printer_auto_print, :printer_status,
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
	r.rdb.Del(ctx, r.getProfileCacheKey(t.Slug))
	return nil
}

func (r *Repository) seedDefaultStaffRolesTx(ctx context.Context, tx *sqlx.Tx, tenantID uuid.UUID) error {
	defaults := []StaffRole{
		{TenantID: tenantID, Name: "Kasir", Description: "Handle booking dan POS", PermissionKeys: pq.StringArray{"bookings.read", "bookings.write", "pos.manage"}, IsDefault: true},
		{TenantID: tenantID, Name: "Operasional", Description: "Kelola resource dan F&B", PermissionKeys: pq.StringArray{"bookings.read", "resources.manage", "fnb.manage", "customers.read"}, IsDefault: false},
		{TenantID: tenantID, Name: "Supervisor", Description: "Akses analitik dan pengeluaran", PermissionKeys: pq.StringArray{"bookings.read", "resources.manage", "fnb.manage", "customers.read", "expenses.manage", "reports.view"}, IsDefault: false},
	}
	for _, role := range defaults {
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
            receipt_title=:receipt_title, receipt_subtitle=:receipt_subtitle, receipt_footer=:receipt_footer,
            receipt_whatsapp_text=:receipt_whatsapp_text, receipt_template=:receipt_template, receipt_channel=:receipt_channel,
            printer_enabled=:printer_enabled, printer_name=:printer_name, printer_mode=:printer_mode,
            printer_endpoint=:printer_endpoint, printer_auto_print=:printer_auto_print, printer_status=:printer_status
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
	return &role, nil
}

func (r *Repository) DeleteStaffRole(ctx context.Context, tenantID, roleID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM staff_roles WHERE tenant_id = $1 AND id = $2 AND is_default = false`, tenantID, roleID)
	return err
}

func (r *Repository) ClearDefaultRoles(ctx context.Context, tenantID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `UPDATE staff_roles SET is_default = false WHERE tenant_id = $1`, tenantID)
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

	r.rdb.Del(ctx, r.getUserCacheKey(staffID.String()))
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
