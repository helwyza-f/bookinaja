package customer

import (
	"context"
	"database/sql"
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

// Upsert menangani Silent Register: Insert jika nomor HP baru, Update nama jika sudah ada.
// Menggunakan ON CONFLICT agar aman dari race condition (double insert).
func (r *Repository) Upsert(ctx context.Context, c Customer) (uuid.UUID, error) {
	query := `
		INSERT INTO customers (
			id, tenant_id, name, phone, email, 
			total_visits, total_spent, tier, loyalty_points, 
			created_at, updated_at
		) 
		VALUES (
			$1, $2, $3, $4, $5, 
			0, 0, 'NEW', 0, 
			NOW(), NOW()
		)
		ON CONFLICT (tenant_id, phone) 
		DO UPDATE SET 
			name = EXCLUDED.name,
			updated_at = NOW()
		RETURNING id`

	var id uuid.UUID
	err := r.db.QueryRowContext(ctx, query, 
		c.ID, c.TenantID, c.Name, c.Phone, c.Email,
	).Scan(&id)
	
	if err != nil {
		return uuid.Nil, fmt.Errorf("repo: gagal upsert customer: %w", err)
	}
	return id, nil
}

// IncrementStats dipanggil saat booking status 'completed'.
// Melakukan kalkulasi tier otomatis (Tiering Logic) langsung di level DB.
func (r *Repository) IncrementStats(ctx context.Context, id uuid.UUID, amount int64) error {
	query := `
		UPDATE customers SET 
			total_visits = total_visits + 1,
			total_spent = total_spent + $2,
			last_visit = NOW(),
			updated_at = NOW(),
			tier = CASE 
				WHEN (total_visits + 1) >= 50 THEN 'VIP'
				WHEN (total_visits + 1) >= 15 THEN 'GOLD'
				ELSE 'REGULAR'
			END
		WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, id, amount)
	if err != nil {
		return fmt.Errorf("repo: gagal update stats customer: %w", err)
	}
	return nil
}

func (r *Repository) FindByTenant(ctx context.Context, tenantID uuid.UUID) ([]Customer, error) {
	var customers []Customer
	// Order by total_spent DESC biar admin langsung tau siapa "Whale" atau Top Spender-nya
	query := `SELECT * FROM customers WHERE tenant_id = $1 ORDER BY total_spent DESC`
	err := r.db.SelectContext(ctx, &customers, query, tenantID)
	return customers, err
}

func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*Customer, error) {
	var c Customer
	query := `SELECT * FROM customers WHERE id = $1 LIMIT 1`
	err := r.db.GetContext(ctx, &c, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (r *Repository) FindByPhone(ctx context.Context, tenantID uuid.UUID, phone string) (*Customer, error) {
	var c Customer
	query := `SELECT * FROM customers WHERE tenant_id = $1 AND phone = $2 LIMIT 1`
	err := r.db.GetContext(ctx, &c, query, tenantID, phone)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

// UpdateTier manual jika suatu saat dibutuhkan penyesuaian tier di luar logic otomatis
func (r *Repository) UpdateTier(ctx context.Context, id uuid.UUID, newTier string) error {
	query := `UPDATE customers SET tier = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, newTier, id)
	return err
}