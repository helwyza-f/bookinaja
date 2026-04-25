package expense

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, expense Expense) (*Expense, error) {
	query := `
		INSERT INTO expenses (
			id, tenant_id, title, category, amount,
			expense_date, payment_method, vendor, notes,
			receipt_url, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :title, :category, :amount,
			:expense_date, :payment_method, :vendor, :notes,
			:receipt_url, :created_at, :updated_at
		)`
	_, err := r.db.NamedExecContext(ctx, query, expense)
	return &expense, err
}

func (r *Repository) Update(ctx context.Context, expense Expense) error {
	query := `
		UPDATE expenses
		SET
			title = :title,
			category = :category,
			amount = :amount,
			expense_date = :expense_date,
			payment_method = :payment_method,
			vendor = :vendor,
			notes = :notes,
			receipt_url = :receipt_url,
			updated_at = :updated_at
		WHERE id = :id AND tenant_id = :tenant_id`
	_, err := r.db.NamedExecContext(ctx, query, expense)
	return err
}

func (r *Repository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM expenses WHERE id = $1 AND tenant_id = $2`, id, tenantID)
	return err
}

func (r *Repository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Expense, error) {
	var expense Expense
	err := r.db.GetContext(ctx, &expense, `
		SELECT *
		FROM expenses
		WHERE id = $1 AND tenant_id = $2
		LIMIT 1`, id, tenantID)
	if err != nil {
		return nil, err
	}
	return &expense, nil
}

func (r *Repository) List(ctx context.Context, tenantID uuid.UUID, limit int, search, category, from, to string) ([]Expense, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	query := `
		SELECT *
		FROM expenses
		WHERE tenant_id = $1`
	args := []any{tenantID}
	argIndex := 2

	if search = strings.TrimSpace(search); search != "" {
		query += fmt.Sprintf(`
			AND (
				title ILIKE $%[1]d OR
				category ILIKE $%[1]d OR
				vendor ILIKE $%[1]d OR
				payment_method ILIKE $%[1]d OR
				notes ILIKE $%[1]d
			)`, argIndex)
		args = append(args, "%"+search+"%")
		argIndex++
	}

	if category = strings.TrimSpace(category); category != "" && strings.ToLower(category) != "all" {
		query += fmt.Sprintf(" AND LOWER(category) = LOWER($%d)", argIndex)
		args = append(args, category)
		argIndex++
	}

	if from = strings.TrimSpace(from); from != "" {
		query += fmt.Sprintf(" AND expense_date::date >= $%d::date", argIndex)
		args = append(args, from)
		argIndex++
	}

	if to = strings.TrimSpace(to); to != "" {
		query += fmt.Sprintf(" AND expense_date::date <= $%d::date", argIndex)
		args = append(args, to)
		argIndex++
	}

	query += fmt.Sprintf(" ORDER BY expense_date DESC, created_at DESC LIMIT $%d", argIndex)
	args = append(args, limit)

	var expenses []Expense
	if err := r.db.SelectContext(ctx, &expenses, query, args...); err != nil {
		return nil, err
	}
	return expenses, nil
}

func (r *Repository) Summary(ctx context.Context, tenantID uuid.UUID, from, to string, category string) (Summary, error) {
	query := `
		SELECT
			COALESCE(SUM(amount), 0) AS total,
			COUNT(*) AS entries
		FROM expenses
		WHERE tenant_id = $1`
	args := []any{tenantID}
	argIndex := 2

	if category = strings.TrimSpace(category); category != "" && strings.ToLower(category) != "all" {
		query += fmt.Sprintf(" AND LOWER(category) = LOWER($%d)", argIndex)
		args = append(args, category)
		argIndex++
	}

	if from = strings.TrimSpace(from); from != "" {
		query += fmt.Sprintf(" AND expense_date::date >= $%d::date", argIndex)
		args = append(args, from)
		argIndex++
	}

	if to = strings.TrimSpace(to); to != "" {
		query += fmt.Sprintf(" AND expense_date::date <= $%d::date", argIndex)
		args = append(args, to)
		argIndex++
	}

	var summary Summary
	if err := r.db.GetContext(ctx, &summary, query, args...); err != nil {
		return Summary{}, err
	}
	return summary, nil
}
