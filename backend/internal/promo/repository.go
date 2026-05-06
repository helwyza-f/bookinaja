package promo

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(ctx context.Context, tenantID uuid.UUID, filter ListFilter) ([]Promo, error) {
	query := `
		SELECT
			id, tenant_id, code, name, description, discount_behavior, discount_type, discount_value,
			max_discount_amount, min_booking_amount, usage_limit_total, usage_limit_per_customer,
			valid_weekdays, time_start::text AS time_start, time_end::text AS time_end,
			starts_at, ends_at, is_active, created_by, updated_by, created_at, updated_at, deleted_at
		FROM tenant_promo_codes
		WHERE tenant_id = $1 AND deleted_at IS NULL`
	args := []any{tenantID}

	if search := strings.TrimSpace(filter.Search); search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		query += fmt.Sprintf(" AND (LOWER(code) LIKE $%d OR LOWER(name) LIKE $%d)", len(args), len(args))
	}

	now := time.Now().UTC()
	switch strings.ToLower(strings.TrimSpace(filter.Status)) {
	case "active":
		args = append(args, now, now)
		query += fmt.Sprintf(" AND is_active = true AND (starts_at IS NULL OR starts_at <= $%d) AND (ends_at IS NULL OR ends_at >= $%d)", len(args)-1, len(args))
	case "inactive":
		query += " AND is_active = false"
	case "scheduled":
		args = append(args, now)
		query += fmt.Sprintf(" AND is_active = true AND starts_at IS NOT NULL AND starts_at > $%d", len(args))
	case "expired":
		args = append(args, now)
		query += fmt.Sprintf(" AND ends_at IS NOT NULL AND ends_at < $%d", len(args))
	}

	query += " ORDER BY created_at DESC"
	var items []Promo
	if err := r.db.SelectContext(ctx, &items, query, args...); err != nil {
		return nil, err
	}
	for i := range items {
		resourceIDs, count, err := r.loadPromoStats(ctx, items[i].ID)
		if err != nil {
			return nil, err
		}
		items[i].ResourceIDs = resourceIDs
		items[i].UsageCount = count
	}
	return items, nil
}

func (r *Repository) GetByID(ctx context.Context, tenantID, promoID uuid.UUID) (*Promo, error) {
	var item Promo
	if err := r.db.GetContext(ctx, &item, `
		SELECT
			id, tenant_id, code, name, description, discount_behavior, discount_type, discount_value,
			max_discount_amount, min_booking_amount, usage_limit_total, usage_limit_per_customer,
			valid_weekdays, time_start::text AS time_start, time_end::text AS time_end,
			starts_at, ends_at, is_active, created_by, updated_by, created_at, updated_at, deleted_at
		FROM tenant_promo_codes
		WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
		LIMIT 1`, promoID, tenantID); err != nil {
		return nil, err
	}
	resourceIDs, count, err := r.loadPromoStats(ctx, item.ID)
	if err != nil {
		return nil, err
	}
	item.ResourceIDs = resourceIDs
	item.UsageCount = count
	return &item, nil
}

func (r *Repository) GetByCode(ctx context.Context, tenantID uuid.UUID, code string) (*Promo, error) {
	var item Promo
	if err := r.db.GetContext(ctx, &item, `
		SELECT
			id, tenant_id, code, name, description, discount_behavior, discount_type, discount_value,
			max_discount_amount, min_booking_amount, usage_limit_total, usage_limit_per_customer,
			valid_weekdays, time_start::text AS time_start, time_end::text AS time_end,
			starts_at, ends_at, is_active, created_by, updated_by, created_at, updated_at, deleted_at
		FROM tenant_promo_codes
		WHERE tenant_id = $1 AND LOWER(code) = LOWER($2) AND deleted_at IS NULL
		LIMIT 1`, tenantID, strings.TrimSpace(code)); err != nil {
		return nil, err
	}
	resourceIDs, count, err := r.loadPromoStats(ctx, item.ID)
	if err != nil {
		return nil, err
	}
	item.ResourceIDs = resourceIDs
	item.UsageCount = count
	return &item, nil
}

func (r *Repository) Upsert(ctx context.Context, promo Promo) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if promo.CreatedAt.IsZero() {
		promo.CreatedAt = time.Now().UTC()
	}
	promo.UpdatedAt = time.Now().UTC()

	if promo.ID == uuid.Nil {
		promo.ID = uuid.New()
		_, err = tx.NamedExecContext(ctx, `
			INSERT INTO tenant_promo_codes (
				id, tenant_id, code, name, description, discount_behavior, discount_type, discount_value,
				max_discount_amount, min_booking_amount, usage_limit_total, usage_limit_per_customer,
				starts_at, ends_at, valid_weekdays, time_start, time_end, is_active,
				created_by, updated_by, created_at, updated_at
			) VALUES (
				:id, :tenant_id, :code, :name, :description, :discount_behavior, :discount_type, :discount_value,
				:max_discount_amount, :min_booking_amount, :usage_limit_total, :usage_limit_per_customer,
				:starts_at, :ends_at, :valid_weekdays, :time_start, :time_end, :is_active,
				:created_by, :updated_by, :created_at, :updated_at
			)`, promo)
	} else {
		_, err = tx.NamedExecContext(ctx, `
			UPDATE tenant_promo_codes
			SET
				code = :code,
				name = :name,
				description = :description,
				discount_behavior = :discount_behavior,
				discount_type = :discount_type,
				discount_value = :discount_value,
				max_discount_amount = :max_discount_amount,
				min_booking_amount = :min_booking_amount,
				usage_limit_total = :usage_limit_total,
				usage_limit_per_customer = :usage_limit_per_customer,
				starts_at = :starts_at,
				ends_at = :ends_at,
				valid_weekdays = :valid_weekdays,
				time_start = :time_start,
				time_end = :time_end,
				is_active = :is_active,
				updated_by = :updated_by,
				updated_at = :updated_at
			WHERE id = :id AND tenant_id = :tenant_id AND deleted_at IS NULL`, promo)
	}
	if err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM tenant_promo_resources WHERE promo_id = $1`, promo.ID); err != nil {
		return err
	}
	for _, resourceID := range promo.ResourceIDs {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO tenant_promo_resources (id, promo_id, tenant_id, resource_id, created_at)
			VALUES ($1, $2, $3, $4, NOW())`,
			uuid.New(), promo.ID, promo.TenantID, resourceID,
		); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *Repository) UpdateStatus(ctx context.Context, tenantID, promoID uuid.UUID, isActive bool, actorID *uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE tenant_promo_codes
		SET is_active = $1, updated_by = $2, updated_at = NOW()
		WHERE id = $3 AND tenant_id = $4 AND deleted_at IS NULL`,
		isActive, actorID, promoID, tenantID,
	)
	return err
}

func (r *Repository) CountRedemptions(ctx context.Context, promoID uuid.UUID) (int, error) {
	var count int
	err := r.db.GetContext(ctx, &count, `
		SELECT COUNT(*) FROM tenant_promo_redemptions
		WHERE promo_id = $1 AND status = 'redeemed'`, promoID)
	return count, err
}

func (r *Repository) CountCustomerRedemptions(ctx context.Context, promoID uuid.UUID, customerID uuid.UUID) (int, error) {
	var count int
	err := r.db.GetContext(ctx, &count, `
		SELECT COUNT(*) FROM tenant_promo_redemptions
		WHERE promo_id = $1 AND customer_id = $2 AND status = 'redeemed'`, promoID, customerID)
	return count, err
}

func (r *Repository) ListRedemptions(ctx context.Context, tenantID, promoID uuid.UUID) ([]Redemption, error) {
	var items []Redemption
	err := r.db.SelectContext(ctx, &items, `
		SELECT
			r.id, r.promo_id, r.tenant_id, r.booking_id, r.customer_id, r.promo_code,
			r.discount_amount, r.original_amount, r.final_amount, r.status, r.redeemed_at,
			COALESCE(c.name, '-') AS customer_name,
			COALESCE(res.name, '-') AS resource_name,
			COALESCE(b.status, '') AS booking_status
		FROM tenant_promo_redemptions r
		LEFT JOIN bookings b ON b.id = r.booking_id
		LEFT JOIN customers c ON c.id = r.customer_id
		LEFT JOIN resources res ON res.id = b.resource_id
		WHERE r.tenant_id = $1 AND r.promo_id = $2
		ORDER BY r.redeemed_at DESC
		LIMIT 50`, tenantID, promoID)
	return items, err
}

func (r *Repository) loadPromoStats(ctx context.Context, promoID uuid.UUID) ([]uuid.UUID, int, error) {
	var resourceIDs []uuid.UUID
	if err := r.db.SelectContext(ctx, &resourceIDs, `
		SELECT resource_id FROM tenant_promo_resources
		WHERE promo_id = $1
		ORDER BY created_at ASC`, promoID); err != nil {
		return nil, 0, err
	}
	count, err := r.CountRedemptions(ctx, promoID)
	if err != nil {
		return nil, 0, err
	}
	return resourceIDs, count, nil
}
