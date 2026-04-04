package fnb

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// AddItem sekarang mendukung Description dan inisialisasi CreatedAt
func (s *Service) AddItem(ctx context.Context, tenantID uuid.UUID, req UpsertItemReq) (*Item, error) {
	// Normalisasi kategori agar tidak kosong
	if req.Category == "" {
		req.Category = "General"
	}

	item := Item{
		ID:          uuid.New(),
		TenantID:    tenantID,
		Name:        req.Name,
		Description: req.Description, // Map description dari request
		Price:       req.Price,
		Category:    req.Category,
		ImageURL:    req.ImageURL,
		IsAvailable: true,
		CreatedAt:   time.Now(),
	}

	if err := s.repo.Create(ctx, item); err != nil {
		return nil, err
	}
	return &item, nil
}

// GetMenu sekarang mendukung parameter Search (opsional)
func (s *Service) GetMenu(ctx context.Context, tenantID uuid.UUID, search string) ([]Item, error) {
	return s.repo.ListByTenant(ctx, tenantID, search)
}

// UpdateItem sekarang memperbarui Description dan menjaga proteksi TenantID
func (s *Service) UpdateItem(ctx context.Context, id, tenantID uuid.UUID, req UpsertItemReq) (*Item, error) {
	curr, err := s.repo.GetByID(ctx, id)
	if err != nil || curr == nil || curr.TenantID != tenantID {
		return nil, errors.New("menu tidak ditemukan atau anda tidak memiliki akses")
	}

	// Update field
	curr.Name = req.Name
	curr.Description = req.Description
	curr.Price = req.Price
	curr.Category = req.Category
	curr.ImageURL = req.ImageURL
	curr.IsAvailable = req.IsAvailable

	if err := s.repo.Update(ctx, *curr); err != nil {
		return nil, err
	}
	return curr, nil
}

func (s *Service) RemoveItem(ctx context.Context, id, tenantID uuid.UUID) error {
	return s.repo.Delete(ctx, id, tenantID)
}