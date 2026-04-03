package tenant

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/booking"
	"github.com/helwiza/saas/internal/fnb" // Import package fnb yang akan kita buat
	"github.com/jmoiron/sqlx"
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

// CreateWithAdmin membuat Tenant dan Admin User dalam satu transaksi
func (r *Repository) CreateWithAdmin(ctx context.Context, t Tenant, u booking.User) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.NamedExecContext(ctx, `
		INSERT INTO tenants (id, name, slug, business_category, business_type) 
		VALUES (:id, :name, :slug, :business_category, :business_type)`, t)
	if err != nil {
		return err
	}

	_, err = tx.NamedExecContext(ctx, `
		INSERT INTO users (id, tenant_id, name, email, password, role) 
		VALUES (:id, :tenant_id, :name, :email, :password, :role)`, u)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// SeedTenantData menyuntikkan data fisik (resources & operational items)
func (r *Repository) SeedTenantData(ctx context.Context, tenantID uuid.UUID, resources []booking.Resource) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, res := range resources {
		res.ID = uuid.New()
		res.TenantID = tenantID
		res.Status = "available"
		res.Metadata = []byte("{}")

		_, err = tx.NamedExecContext(ctx, `
			INSERT INTO resources (id, tenant_id, name, category, status, metadata) 
			VALUES (:id, :tenant_id, :name, :category, :status, :metadata)`, res)
		if err != nil {
			return fmt.Errorf("failed seed resource %s: %w", res.Name, err)
		}

		for _, item := range res.Items {
			item.ID = uuid.New()
			item.ResourceID = res.ID
			item.Metadata = []byte("{}")

			_, err = tx.NamedExecContext(ctx, `
				INSERT INTO resource_items (id, resource_id, name, price_per_hour, price_unit, item_type, is_default, metadata) 
				VALUES (:id, :resource_id, :name, :price_per_hour, :price_unit, :item_type, :is_default, :metadata)`, item)
			if err != nil {
				return fmt.Errorf("failed seed item %s: %w", item.Name, err)
			}
		}
	}
	return tx.Commit()
}

// SeedFnbData menyuntikkan data katalog makanan/minuman global
func (r *Repository) SeedFnbData(ctx context.Context, tenantID uuid.UUID, items []fnb.Item) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, item := range items {
		item.ID = uuid.New()
		item.TenantID = tenantID
		
		_, err = tx.NamedExecContext(ctx, `
			INSERT INTO fnb_items (id, tenant_id, name, price, category, is_available) 
			VALUES (:id, :tenant_id, :name, :price, :category, :is_available)`, item)
		if err != nil {
			return fmt.Errorf("failed seed fnb item %s: %w", item.Name, err)
		}
	}
	return tx.Commit()
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*booking.User, error) {
	var u booking.User
	err := r.db.GetContext(ctx, &u, `SELECT * FROM users WHERE email = $1 LIMIT 1`, email)
	if err == sql.ErrNoRows { return nil, nil }
	return &u, err
}

func (r *Repository) GetBySlug(ctx context.Context, slug string) (*Tenant, error) {
	var t Tenant
	err := r.db.GetContext(ctx, &t, `SELECT * FROM tenants WHERE slug = $1`, slug)
	if err == sql.ErrNoRows { return nil, nil }
	return &t, err
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Tenant, error) {
	var t Tenant
	err := r.db.GetContext(ctx, &t, `SELECT * FROM tenants WHERE id = $1`, id)
	return &t, err
}

func (r *Repository) Update(ctx context.Context, t Tenant) error {
	query := `UPDATE tenants SET 
		name=:name, slogan=:slogan, address=:address, open_time=:open_time, 
		close_time=:close_time, logo_url=:logo_url, banner_url=:banner_url, 
		gallery=:gallery, business_category=:business_category WHERE id=:id`
	_, err := r.db.NamedExecContext(ctx, query, t)
	return err
}

func (r *Repository) Exists(ctx context.Context, slug, email string) (bool, bool, error) {
	var slugExists, emailExists bool
	err := r.db.GetContext(ctx, &slugExists, "SELECT EXISTS(SELECT 1 FROM tenants WHERE slug = $1)", slug)
	if err != nil { return false, false, err }
	err = r.db.GetContext(ctx, &emailExists, "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email)
	if err != nil { return false, false, err }
	return slugExists, emailExists, nil
}

func (r *Repository) ListResourcesWithItems(ctx context.Context, tenantID uuid.UUID) ([]map[string]interface{}, error) {
	query := `
		SELECT 
			r.id::text as id, 
			r.name, 
			r.category, 
			r.status,
			COALESCE(json_agg(json_build_object(
				'id', i.id::text, 
				'name', i.name,
				'item_type', i.item_type,
				'price_per_hour', i.price_per_hour,
				'price_unit', i.price_unit
			)) FILTER (WHERE i.id IS NOT NULL), '[]') as items
		FROM resources r
		LEFT JOIN resource_items i ON r.id = i.resource_id
		WHERE r.tenant_id = $1 AND r.status != 'deleted'
		GROUP BY r.id
		ORDER BY r.created_at DESC`

	rows, err := r.db.QueryxContext(ctx, query, tenantID)
	if err != nil { return nil, err }
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		res := make(map[string]interface{})
		err := rows.MapScan(res)
		if err != nil { return nil, err }

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