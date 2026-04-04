package fnb

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

// Create menyisipkan item FnB baru dengan kolom description dan image_url
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
	return err
}

// ListByTenant mengambil semua item milik tenant dengan fitur Search
func (r *Repository) ListByTenant(ctx context.Context, tenantID uuid.UUID, search string) ([]Item, error) {
	// Gunakan slice kosong agar JSON return [] bukan null
	items := []Item{}
	
	query := `SELECT * FROM fnb_items WHERE tenant_id = $1`
	params := []interface{}{tenantID}

	// Logic Search: Cari di Nama, Kategori, atau Deskripsi
	if search != "" {
		query += ` AND (name ILIKE $2 OR category ILIKE $2 OR description ILIKE $2)`
		params = append(params, "%"+search+"%")
	}

	query += ` ORDER BY category ASC, name ASC`
	
	err := r.db.SelectContext(ctx, &items, query, params...)
	return items, err
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
	return err
}

// Delete menghapus item dengan proteksi tenant_id
func (r *Repository) Delete(ctx context.Context, id uuid.UUID, tenantID uuid.UUID) error {
	query := `DELETE FROM fnb_items WHERE id = $1 AND tenant_id = $2`
	_, err := r.db.ExecContext(ctx, query, id, tenantID)
	return err
}