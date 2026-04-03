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

func (r *Repository) Create(ctx context.Context, item Item) error {
	query := `INSERT INTO fnb_items (id, tenant_id, name, price, category, image_url, is_available) 
              VALUES (:id, :tenant_id, :name, :price, :category, :image_url, :is_available)`
	_, err := r.db.NamedExecContext(ctx, query, item)
	return err
}

func (r *Repository) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Item, error) {
	var items []Item
	query := `SELECT * FROM fnb_items WHERE tenant_id = $1 ORDER BY category, name ASC`
	err := r.db.SelectContext(ctx, &items, query, tenantID)
	return items, err
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Item, error) {
	var item Item
	query := `SELECT * FROM fnb_items WHERE id = $1`
	err := r.db.GetContext(ctx, &item, query, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &item, err
}

func (r *Repository) Update(ctx context.Context, item Item) error {
	query := `UPDATE fnb_items SET name=:name, price=:price, category=:category, 
              image_url=:image_url, is_available=:is_available WHERE id=:id`
	_, err := r.db.NamedExecContext(ctx, query, item)
	return err
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID, tenantID uuid.UUID) error {
	query := `DELETE FROM fnb_items WHERE id = $1 AND tenant_id = $2`
	_, err := r.db.ExecContext(ctx, query, id, tenantID)
	return err
}