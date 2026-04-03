package fnb

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) AddItem(ctx context.Context, tenantID uuid.UUID, req UpsertItemReq) (*Item, error) {
	item := Item{
		ID:          uuid.New(),
		TenantID:    tenantID,
		Name:        req.Name,
		Price:       req.Price,
		Category:    req.Category,
		ImageURL:    req.ImageURL, // Ini sekarang menerima *string
		IsAvailable: true,
	}

	if err := s.repo.Create(ctx, item); err != nil {
		return nil, err
	}
	return &item, nil
}

func (s *Service) GetMenu(ctx context.Context, tenantID uuid.UUID) ([]Item, error) {
	items, err := s.repo.ListByTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
    // Jika repo mengembalikan nil slice, ubah jadi empty slice agar JSON balikan [] bukan null
	if items == nil {
		return []Item{}, nil
	}
	return items, nil
}

func (s *Service) UpdateItem(ctx context.Context, id, tenantID uuid.UUID, req UpsertItemReq) (*Item, error) {
	curr, err := s.repo.GetByID(ctx, id)
	if err != nil || curr == nil || curr.TenantID != tenantID {
		return nil, errors.New("menu tidak ditemukan")
	}

	curr.Name = req.Name
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