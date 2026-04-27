package expense

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type CreateExpenseInput struct {
	Title         string
	Category      string
	Amount        int64
	ExpenseDate   time.Time
	PaymentMethod string
	Vendor        string
	Notes         string
	ReceiptURL    string
}

type UpdateExpenseInput = CreateExpenseInput

func (s *Service) Create(ctx context.Context, tenantID uuid.UUID, input CreateExpenseInput) (*Expense, error) {
	if err := validateExpenseInput(input); err != nil {
		return nil, err
	}

	now := time.Now()
	expense := Expense{
		ID:            uuid.New(),
		TenantID:      tenantID,
		Title:         strings.TrimSpace(input.Title),
		Category:      normalizeExpenseCategory(input.Category),
		Amount:        input.Amount,
		ExpenseDate:   input.ExpenseDate,
		PaymentMethod: normalizeExpensePaymentMethod(input.PaymentMethod),
		Vendor:        strings.TrimSpace(input.Vendor),
		Notes:         strings.TrimSpace(input.Notes),
		ReceiptURL:    strings.TrimSpace(input.ReceiptURL),
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	return s.repo.Create(ctx, expense)
}

func (s *Service) Update(ctx context.Context, tenantID, id uuid.UUID, input UpdateExpenseInput) error {
	if err := validateExpenseInput(input); err != nil {
		return err
	}

	existing, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.New("expense not found")
	}

	expense := Expense{
		ID:            id,
		TenantID:      tenantID,
		Title:         strings.TrimSpace(input.Title),
		Category:      normalizeExpenseCategory(input.Category),
		Amount:        input.Amount,
		ExpenseDate:   input.ExpenseDate,
		PaymentMethod: normalizeExpensePaymentMethod(input.PaymentMethod),
		Vendor:        strings.TrimSpace(input.Vendor),
		Notes:         strings.TrimSpace(input.Notes),
		ReceiptURL:    strings.TrimSpace(input.ReceiptURL),
		CreatedAt:     existing.CreatedAt,
		UpdatedAt:     time.Now(),
	}

	return s.repo.Update(ctx, expense)
}

func (s *Service) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.repo.Delete(ctx, tenantID, id)
}

func (s *Service) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Expense, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

func (s *Service) List(ctx context.Context, tenantID uuid.UUID, limit int, search, category, from, to string) ([]Expense, error) {
	return s.repo.List(ctx, tenantID, limit, search, category, from, to)
}

func (s *Service) Summary(ctx context.Context, tenantID uuid.UUID, from, to, category string) (Summary, error) {
	return s.repo.Summary(ctx, tenantID, from, to, category)
}

func validateExpenseInput(input CreateExpenseInput) error {
	if strings.TrimSpace(input.Title) == "" {
		return errors.New("title is required")
	}
	if input.Amount <= 0 {
		return errors.New("amount must be greater than zero")
	}
	if input.ExpenseDate.IsZero() {
		return errors.New("expense_date is required")
	}
	return nil
}

func normalizeExpenseCategory(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "Operasional"
	}
	return value
}

func normalizeExpensePaymentMethod(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "Cash"
	}
	return value
}
