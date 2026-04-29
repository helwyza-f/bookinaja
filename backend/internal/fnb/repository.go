package fnb

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

type Repository struct {
	db  *sqlx.DB
	rdb *redis.Client
}

func NewRepository(db *sqlx.DB, rdb *redis.Client) *Repository {
	return &Repository{db: db, rdb: rdb}
}

func (r *Repository) menuCacheKey(tenantID uuid.UUID, search string) string {
	search = strings.ToLower(strings.TrimSpace(search))
	if search == "" {
		search = "all"
	}
	return fmt.Sprintf("fnb:menu:%s:%s", tenantID.String(), search)
}

func (r *Repository) InvalidateTenantCache(ctx context.Context, tenantID uuid.UUID) {
	if r.rdb == nil {
		return
	}
	keys, err := r.rdb.Keys(ctx, fmt.Sprintf("fnb:menu:%s:*", tenantID.String())).Result()
	if err == nil && len(keys) > 0 {
		_ = r.rdb.Del(ctx, keys...).Err()
	}
	var slug string
	if err := r.db.GetContext(ctx, &slug, "SELECT slug FROM tenants WHERE id = $1", tenantID); err == nil {
		_ = r.rdb.Del(ctx, fmt.Sprintf("landing:full:%s", strings.ToLower(strings.TrimSpace(slug)))).Err()
	}
}

// Create menyisipkan item FnB baru
func (r *Repository) Create(ctx context.Context, item Item) error {
	query := `
		INSERT INTO fnb_items (
			id, tenant_id, name, description, price, 
			category, image_url, is_available
		) 
		VALUES (
			:id, :tenant_id, :name, :description, :price, 
			:category, :image_url, :is_available
		)`

	_, err := r.db.NamedExecContext(ctx, query, item)
	if err != nil {
		// Log ini sangat penting untuk debug error 500 tadi
		fmt.Printf("❌ REPO_ERROR (Create): %v\n", err)
		return err
	}
	r.InvalidateTenantCache(ctx, item.TenantID)
	return nil
}

// ListByTenant mengambil semua item milik tenant dengan fitur Search
func (r *Repository) ListByTenant(ctx context.Context, tenantID uuid.UUID, search string) ([]Item, error) {
	// Inisialisasi slice kosong agar JSON return [] bukan null
	items := []Item{}
	cacheKey := r.menuCacheKey(tenantID, search)
	if r.rdb != nil {
		if val, err := r.rdb.Get(ctx, cacheKey).Result(); err == nil {
			if err := json.Unmarshal([]byte(val), &items); err == nil {
				return items, nil
			}
		}
	}

	query := `SELECT * FROM fnb_items WHERE tenant_id = $1`
	params := []interface{}{tenantID}

	// Logic Search: Cari di Nama, Kategori, atau Deskripsi (Insenstive Like)
	if search != "" {
		query += ` AND (name ILIKE $2 OR category ILIKE $2 OR description ILIKE $2)`
		params = append(params, "%"+search+"%")
	}

	query += ` ORDER BY category ASC, name ASC`

	err := r.db.SelectContext(ctx, &items, query, params...)
	if err != nil {
		fmt.Printf("❌ REPO_ERROR (List): %v\n", err)
		return items, err
	}
	if r.rdb != nil {
		if raw, err := json.Marshal(items); err == nil {
			_ = r.rdb.Set(ctx, cacheKey, raw, 30*time.Minute).Err()
		}
	}
	return items, nil
}

// GetByID mengambil detail satu item FnB
func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Item, error) {
	var item Item
	query := `SELECT * FROM fnb_items WHERE id = $1`
	err := r.db.GetContext(ctx, &item, query, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &item, err
}

// Update memperbarui data item termasuk description dan status availability
func (r *Repository) Update(ctx context.Context, item Item) error {
	query := `
		UPDATE fnb_items 
		SET 
			name = :name, 
			description = :description,
			price = :price, 
			category = :category, 
			image_url = :image_url, 
			is_available = :is_available 
		WHERE id = :id AND tenant_id = :tenant_id`

	_, err := r.db.NamedExecContext(ctx, query, item)
	if err != nil {
		fmt.Printf("❌ REPO_ERROR (Update): %v\n", err)
		return err
	}
	r.InvalidateTenantCache(ctx, item.TenantID)
	return nil
}

// Delete menghapus item dengan proteksi tenant_id
func (r *Repository) Delete(ctx context.Context, id uuid.UUID, tenantID uuid.UUID) error {
	query := `DELETE FROM fnb_items WHERE id = $1 AND tenant_id = $2`
	_, err := r.db.ExecContext(ctx, query, id, tenantID)
	if err != nil {
		fmt.Printf("❌ REPO_ERROR (Delete): %v\n", err)
		return err
	}
	r.InvalidateTenantCache(ctx, tenantID)
	return nil
}
