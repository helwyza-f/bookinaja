package fnb

import (
	"context"
	"errors"
	"fmt"
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
		Description: req.Description,
		Price:       req.Price,
		Category:    req.Category,
		ImageURL:    req.ImageURL,
		IsAvailable: true, // Default menu baru langsung ready
		CreatedAt:   time.Now(),
	}

	if err := s.repo.Create(ctx, item); err != nil {
		fmt.Printf("❌ SERVICE_ERROR (AddItem): %v\n", err)
		return nil, err
	}
	return &item, nil
}

// GetMenu mendukung parameter Search (pencarian nama/deskripsi)
func (s *Service) GetMenu(ctx context.Context, tenantID uuid.UUID, search string) ([]Item, error) {
	return s.repo.ListByTenant(ctx, tenantID, search)
}

// UpdateItem memperbarui detail menu dengan proteksi kepemilikan tenant
func (s *Service) UpdateItem(ctx context.Context, id, tenantID uuid.UUID, req UpsertItemReq) (*Item, error) {
	// 1. Cek keberadaan item dan hak akses
	curr, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	
	if curr == nil || curr.TenantID != tenantID {
		return nil, errors.New("menu tidak ditemukan atau anda tidak memiliki akses")
	}

	// 2. Normalisasi input
	if req.Category == "" {
		req.Category = "General"
	}

	// 3. Map update field
	curr.Name = req.Name
	curr.Description = req.Description
	curr.Price = req.Price
	curr.Category = req.Category
	curr.ImageURL = req.ImageURL
	curr.IsAvailable = req.IsAvailable

	// 4. Eksekusi ke Repo
	if err := s.repo.Update(ctx, *curr); err != nil {
		fmt.Printf("❌ SERVICE_ERROR (UpdateItem): %v\n", err)
		return nil, err
	}
	return curr, nil
}

// RemoveItem menghapus menu dari katalog
func (s *Service) RemoveItem(ctx context.Context, id, tenantID uuid.UUID) error {
	return s.repo.Delete(ctx, id, tenantID)
}