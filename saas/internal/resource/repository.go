package resource

import (
	"context"
	"encoding/json"

	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

// Create menyisipkan resource baru dengan kolom marketing (description, image_url, gallery)
func (r *Repository) Create(ctx context.Context, res Resource) (*Resource, error) {
	query := `
		INSERT INTO resources (
			id, tenant_id, name, category, description, 
			image_url, gallery, status, metadata
		) 
		VALUES (
			:id, :tenant_id, :name, :category, :description, 
			:image_url, :gallery, :status, :metadata
		)`
	_, err := r.db.NamedExecContext(ctx, query, res)
	return &res, err
}

// Update memperbarui data utama resource termasuk informasi marketing
func (r *Repository) Update(ctx context.Context, res Resource) error {
	query := `
		UPDATE resources 
		SET 
			name = :name, 
			category = :category, 
			description = :description, 
			image_url = :image_url, 
			gallery = :gallery, 
			status = :status, 
			metadata = :metadata 
		WHERE id = :id AND tenant_id = :tenant_id`
	_, err := r.db.NamedExecContext(ctx, query, res)
	return err
}

// FindAllByTenant mengambil list resource (termasuk visual data) tanpa items
func (r *Repository) FindAllByTenant(ctx context.Context, tenantID uuid.UUID) ([]Resource, error) {
	var res []Resource
	query := `SELECT * FROM resources WHERE tenant_id = $1 ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &res, query, tenantID)
	return res, err
}

// CreateItem menyisipkan item/opsi ke dalam resource (price & unit_duration)
func (r *Repository) CreateItem(ctx context.Context, item ResourceItem) (*ResourceItem, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if item.IsDefault {
		queryDisable := `UPDATE resource_items SET is_default = false WHERE resource_id = $1 AND item_type = $2`
		_, err = tx.ExecContext(ctx, queryDisable, item.ResourceID, item.ItemType)
		if err != nil {
			return nil, fmt.Errorf("failed to reset default items: %w", err)
		}
	}

	queryInsert := `
		INSERT INTO resource_items (
			id, resource_id, name, price, price_unit, 
			unit_duration, item_type, is_default, metadata
		) 
		VALUES (
			:id, :resource_id, :name, :price, :price_unit, 
			:unit_duration, :item_type, :is_default, :metadata
		)`
	
	_, err = tx.NamedExecContext(ctx, queryInsert, item)
	if err != nil {
		return nil, fmt.Errorf("failed to insert item: %w", err)
	}

	return &item, tx.Commit()
}

// UpdateItem memperbarui detail item (harga, durasi, status default)
func (r *Repository) UpdateItem(ctx context.Context, itemID uuid.UUID, item ResourceItem) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if item.IsDefault {
		_, err = tx.ExecContext(ctx, `UPDATE resource_items SET is_default = false WHERE resource_id = $1 AND item_type = $2`, item.ResourceID, item.ItemType)
		if err != nil {
			return err
		}
	}

	query := `
		UPDATE resource_items 
		SET 
			name = :name, 
			price = :price, 
			price_unit = :price_unit, 
			unit_duration = :unit_duration, 
			is_default = :is_default, 
			metadata = :metadata 
		WHERE id = :id`
	
	item.ID = itemID
	_, err = tx.NamedExecContext(ctx, query, item)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// ListItemsByResource mengambil semua item milik satu resource
func (r *Repository) ListItemsByResource(ctx context.Context, resourceID uuid.UUID) ([]ResourceItem, error) {
	var items []ResourceItem
	query := `SELECT * FROM resource_items WHERE resource_id = $1 ORDER BY item_type ASC, name ASC`
	err := r.db.SelectContext(ctx, &items, query, resourceID)
	return items, err
}

// Delete menghapus resource (unit) secara permanen
func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM resources WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

// ListByTenant mengambil semua Resource beserta Items-nya (Eager Loading)
func (r *Repository) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Resource, string, string, error) {
	var resources []Resource
	var businessCategory string
	var businessType string

	// 1. Ambil info tenant
	err := r.db.QueryRowxContext(ctx, 
		`SELECT business_category, business_type FROM tenants WHERE id = $1`, 
		tenantID).Scan(&businessCategory, &businessType)
	if err != nil {
		return nil, "", "", err
	}

	// 2. Ambil semua resource
	err = r.db.SelectContext(ctx, &resources, 
		`SELECT * FROM resources WHERE tenant_id = $1 ORDER BY created_at DESC`, 
		tenantID)
	if err != nil {
		return nil, "", "", err
	}

	emptyJSON := json.RawMessage("{}")

	// 3. Eager Loading items & Nil Check
	for i := range resources {
		// Handle NULL Metadata for Resource
		if resources[i].Metadata == nil {
			resources[i].Metadata = &emptyJSON
		}

		var items []ResourceItem
		err := r.db.SelectContext(ctx, &items, 
			`SELECT * FROM resource_items WHERE resource_id = $1 ORDER BY item_type ASC, is_default DESC`, 
			resources[i].ID)
		
		if err == nil {
			for j := range items {
				// Handle NULL Metadata for Items
				if items[j].Metadata == nil {
					items[j].Metadata = &emptyJSON
				}
			}
			resources[i].Items = items
		}
	}

	return resources, businessCategory, businessType, nil
}

// DeleteItem menghapus item dari suatu resource
func (r *Repository) DeleteItem(ctx context.Context, itemID uuid.UUID) error {
	query := `DELETE FROM resource_items WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, itemID)
	return err
}

// GetOneWithItems mengambil detail satu resource lengkap dengan marketing data & items
func (r *Repository) GetOneWithItems(ctx context.Context, id uuid.UUID) (*Resource, error) {
	var res Resource
	err := r.db.GetContext(ctx, &res, `SELECT * FROM resources WHERE id = $1`, id)
	if err != nil {
		return nil, err
	}

	var items []ResourceItem
	err = r.db.SelectContext(ctx, &items, `
		SELECT * FROM resource_items 
		WHERE resource_id = $1 
		ORDER BY item_type ASC, is_default DESC`, id)
	
	if err == nil {
		res.Items = items
	}
	
	return &res, nil
}