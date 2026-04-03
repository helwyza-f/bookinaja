package resource

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/booking"
	"github.com/jmoiron/sqlx"
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, res booking.Resource) (*booking.Resource, error) {
	query := `INSERT INTO resources (id, tenant_id, name, category, status, metadata) 
			  VALUES (:id, :tenant_id, :name, :category, :status, :metadata)`
	_, err := r.db.NamedExecContext(ctx, query, res)
	return &res, err
}

func (r *Repository) FindAllByTenant(ctx context.Context, tenantID uuid.UUID) ([]booking.Resource, error) {
	var res []booking.Resource
	query := `SELECT * FROM resources WHERE tenant_id = $1 ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &res, query, tenantID)
	return res, err
}

func (r *Repository) CreateItem(ctx context.Context, item booking.ResourceItem) (*booking.ResourceItem, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 1. Jika item baru ini adalah DEFAULT, maka matikan default lainnya di resource ini
	// Logika ini hanya berlaku jika item_type adalah 'console_option' / Main Asset
	if item.IsDefault {
		queryDisable := `UPDATE resource_items SET is_default = false WHERE resource_id = $1 AND item_type = $2`
		_, err = tx.ExecContext(ctx, queryDisable, item.ResourceID, item.ItemType)
		if err != nil {
			return nil, fmt.Errorf("gagal mereset default items: %w", err)
		}
	}

	// 2. Insert item baru (Termasuk price_unit)
	queryInsert := `INSERT INTO resource_items (id, resource_id, name, price_per_hour, price_unit, item_type, is_default, metadata) 
			  VALUES (:id, :resource_id, :name, :price_per_hour, :price_unit, :item_type, :is_default, :metadata)`
	
	_, err = tx.NamedExecContext(ctx, queryInsert, item)
	if err != nil {
		return nil, fmt.Errorf("gagal insert item: %w", err)
	}

	return &item, tx.Commit()
}

func (r *Repository) ListItemsByResource(ctx context.Context, resourceID uuid.UUID) ([]booking.ResourceItem, error) {
	var items []booking.ResourceItem
	query := `SELECT * FROM resource_items WHERE resource_id = $1 ORDER BY name ASC`
	err := r.db.SelectContext(ctx, &items, query, resourceID)
	return items, err
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM resources WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

// UpdateItem menangani update detail barang, price_unit & logika swap Default
func (r *Repository) UpdateItem(ctx context.Context, itemID uuid.UUID, item booking.ResourceItem) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil { return err }
	defer tx.Rollback()

	// Jika item ini diset jadi DEFAULT, matikan default lain di resource yang sama untuk tipe yang sama
	if item.IsDefault {
		_, err = tx.ExecContext(ctx, `UPDATE resource_items SET is_default = false WHERE resource_id = $1 AND item_type = $2`, item.ResourceID, item.ItemType)
		if err != nil { return err }
	}

	// Update query menyertakan price_unit
	query := `UPDATE resource_items 
			  SET name=:name, price_per_hour=:price_per_hour, price_unit=:price_unit, is_default=:is_default 
			  WHERE id=:id`
	
	item.ID = itemID
	_, err = tx.NamedExecContext(ctx, query, item)
	if err != nil { return err }

	return tx.Commit()
}

// ListByTenant mengambil Resource beserta Items-nya
func (r *Repository) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]booking.Resource, string, string, error) {
    var resources []booking.Resource
    var businessCategory string
    var businessType string

    // 1. Ambil informasi kategori dari tabel tenants
    err := r.db.QueryRowxContext(ctx, 
        `SELECT business_category, business_type FROM tenants WHERE id = $1`, 
        tenantID).Scan(&businessCategory, &businessType)
    if err != nil {
        return nil, "", "", fmt.Errorf("failed to fetch tenant category: %w", err)
    }

    // 2. Ambil semua resource
    err = r.db.SelectContext(ctx, &resources, 
        `SELECT * FROM resources WHERE tenant_id = $1 ORDER BY created_at DESC`, 
        tenantID)
    if err != nil {
        return nil, "", "", err
    }

    // 3. Simple Eager Loading untuk items
    for i := range resources {
        var items []booking.ResourceItem
        err := r.db.SelectContext(ctx, &items, 
            `SELECT * FROM resource_items WHERE resource_id = $1 ORDER BY item_type ASC, is_default DESC`, 
            resources[i].ID)
        if err == nil {
            resources[i].Items = items
        }
    }

    return resources, businessCategory, businessType, nil
}

func (r *Repository) DeleteItem(ctx context.Context, itemID uuid.UUID) error {
	query := `DELETE FROM resource_items WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, itemID)
	return err
}

func (r *Repository) GetOneWithItems(ctx context.Context, id uuid.UUID) (*booking.Resource, error) {
	var res booking.Resource
	err := r.db.GetContext(ctx, &res, `SELECT * FROM resources WHERE id = $1`, id)
	if err != nil { return nil, err }

	var items []booking.ResourceItem
	err = r.db.SelectContext(ctx, &items, `
		SELECT * FROM resource_items 
		WHERE resource_id = $1 
		ORDER BY item_type ASC, is_default DESC`, id)
	
	if err == nil {
		res.Items = items
	}
	
	return &res, nil
}