package tenant

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/fnb"
	"github.com/helwiza/saas/internal/resource"
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

// --- REDIS HELPERS (Pusat Kendali Key) ---

func (r *Repository) getProfileCacheKey(slug string) string {
	return fmt.Sprintf("tenant_profile:%s", strings.ToLower(strings.TrimSpace(slug)))
}

func (r *Repository) getLandingCacheKey(slug string) string {
	return fmt.Sprintf("landing_full:%s", strings.ToLower(strings.TrimSpace(slug)))
}

// --- CORE REPOSITORY LOGIC ---

// GetBySlug mengambil data profil tenant dengan pola Cache-Aside
func (r *Repository) GetBySlug(ctx context.Context, slug string) (*Tenant, error) {
	slug = strings.ToLower(strings.TrimSpace(slug))
	cacheKey := r.getProfileCacheKey(slug)

	// 1. Cek Redis
	val, err := r.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var t Tenant
		if err := json.Unmarshal([]byte(val), &t); err == nil {
			fmt.Printf("[CACHE HIT] Serving profile from Redis: %s\n", slug)
			return &t, nil
		}
	}

	// 2. Database Lookup
	fmt.Printf("[CACHE MISS] Querying DB profile for slug: '%s'\n", slug)
	var t Tenant
	query := `SELECT * FROM tenants WHERE LOWER(TRIM(slug)) = $1 LIMIT 1`
	err = r.db.GetContext(ctx, &t, query, slug)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// 3. Update Cache (TTL 24 Jam)
	jsonData, _ := json.Marshal(t)
	r.rdb.Set(ctx, cacheKey, jsonData, 24*time.Hour)

	return &t, nil
}

// GetPublicLandingData mengumpulkan Profile & Resources (Optimized)
func (r *Repository) GetPublicLandingData(ctx context.Context, slug string) (map[string]interface{}, error) {
	slug = strings.ToLower(strings.TrimSpace(slug))
	cacheKey := r.getLandingCacheKey(slug)

	// 1. HIT: Cek Redis Landing Full
	val, err := r.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var cachedData map[string]interface{}
		if err := json.Unmarshal([]byte(val), &cachedData); err == nil {
			fmt.Printf("[CACHE HIT] Serving full landing for: %s\n", slug)
			return cachedData, nil
		}
	}

	// 2. MISS: Searching Postgres
	fmt.Printf("[CACHE MISS] Building full landing data for slug: '%s'\n", slug)

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

	// 3. WRITE: Simpan ke Redis (TTL 1 Jam)
	jsonData, _ := json.Marshal(result)
	r.rdb.Set(ctx, cacheKey, jsonData, time.Hour)

	return result, nil
}

// CreateWithAdmin membuat Tenant dan Admin User dalam satu transaksi
func (r *Repository) CreateWithAdmin(ctx context.Context, t Tenant, u User) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.NamedExecContext(ctx, `
		INSERT INTO tenants (
			id, name, slug, business_category, business_type, 
			slogan, tagline, about_us, features, primary_color, created_at
		) VALUES (
			:id, :name, :slug, :business_category, :business_type, 
			:slogan, :tagline, :about_us, :features, :primary_color, :created_at
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

	return tx.Commit()
}

func (r *Repository) Update(ctx context.Context, t Tenant) error {
	query := `
		UPDATE tenants SET 
			name=:name, slogan=:slogan, tagline=:tagline, about_us=:about_us, 
			features=:features, address=:address, open_time=:open_time, 
			close_time=:close_time, logo_url=:logo_url, banner_url=:banner_url, 
			gallery=:gallery, business_category=:business_category, primary_color=:primary_color, 
			whatsapp_number=:whatsapp_number, instagram_url=:instagram_url, 
			tiktok_url=:tiktok_url, map_iframe_url=:map_iframe_url, 
			meta_title=:meta_title, meta_description=:meta_description
		WHERE id=:id`

	_, err := r.db.NamedExecContext(ctx, query, t)
	if err != nil {
		return err
	}

	// INVALIDASI CACHE
	r.rdb.Del(ctx, r.getLandingCacheKey(t.Slug))
	r.rdb.Del(ctx, r.getProfileCacheKey(t.Slug))
	fmt.Printf("[CACHE INVALIDATED] Profile & Landing cleared for: %s\n", t.Slug)

	return nil
}

// ListResourcesWithItems (Single Query Aggregation)
func (r *Repository) ListResourcesWithItems(ctx context.Context, tenantID uuid.UUID) ([]map[string]interface{}, error) {
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

// --- SISTEM SEEDING ---

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

// --- BASIC GETTERS ---

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

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Tenant, error) {
	var t Tenant
	err := r.db.GetContext(ctx, &t, `SELECT * FROM tenants WHERE id = $1`, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &t, err
}

func (r *Repository) Exists(ctx context.Context, slug, email string) (bool, bool, error) {
	var slugExists, emailExists bool
	r.db.GetContext(ctx, &slugExists, "SELECT EXISTS(SELECT 1 FROM tenants WHERE LOWER(slug) = LOWER($1))", slug)
	r.db.GetContext(ctx, &emailExists, "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email)
	return slugExists, emailExists, nil
}

func (r *Repository) GetUserByID(ctx context.Context, id uuid.UUID) (*User, string, error) {
	var u struct {
		User
		TenantLogo string `db:"logo_url"`
	}

	// Query dengan JOIN untuk ambil logo dari tabel tenants
	query := `
		SELECT 
			u.id, u.tenant_id, u.name, u.email, u.role, u.created_at,
			COALESCE(t.logo_url, '') as logo_url
		FROM users u
		JOIN tenants t ON t.id = u.tenant_id
		WHERE u.id = $1 LIMIT 1`

	err := r.db.GetContext(ctx, &u, query, id)
	if err == sql.ErrNoRows {
		return nil, "", nil
	}
	if err != nil {
		return nil, "", err
	}

	return &u.User, u.TenantLogo, nil
}