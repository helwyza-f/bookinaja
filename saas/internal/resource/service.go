package resource

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/booking"
)

type Service struct {
	repo *Repository
}

func NewService(r *Repository) *Service {
	return &Service{repo: r}
}

// CreateResource membuat unit utama (misal: Meja 1, Lapangan A)
func (s *Service) CreateResource(ctx context.Context, tenantID, name, category string) (*booking.Resource, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, err
	}
	res := booking.Resource{
		ID:       uuid.New(),
		TenantID: tID,
		Name:     name,
		Category: category,
		Status:   "available",
		Metadata: []byte("{}"),
	}
	return s.repo.Create(ctx, res)
}

// ListResources mengambil semua resource milik tenant beserta items di dalamnya
// internal/resource/service.go
func (s *Service) ListResources(ctx context.Context, tenantID string) (any, error) {
    tID, err := uuid.Parse(tenantID)
    if err != nil {
        return nil, err
    }

    resources, category, bType, err := s.repo.ListByTenant(ctx, tID)
    if err != nil {
        return nil, err
    }

    // Kembalikan objek gabungan
    return gin.H{
        "business_category": category,
        "business_type":     bType,
        "resources":         resources,
    }, nil
}

// AddResourceItem menambahkan opsi barang/layanan ke dalam resource (dengan dukungan PriceUnit)
func (s *Service) AddResourceItem(ctx context.Context, resID, name string, price float64, priceUnit, iType string, isDefault bool) (*booking.ResourceItem, error) {
	rID, err := uuid.Parse(resID)
	if err != nil {
		return nil, err
	}
	item := booking.ResourceItem{
		ID:           uuid.New(),
		ResourceID:   rID,
		Name:         name,
		PricePerHour: price,
		PriceUnit:    priceUnit, // Field baru: hour, session, day, pcs
		ItemType:     iType,
		IsDefault:    isDefault,
		Metadata:     []byte("{}"),
	}
	return s.repo.CreateItem(ctx, item)
}

// GetItems mengambil daftar item berdasarkan Resource ID
func (s *Service) GetItems(ctx context.Context, resourceID string) ([]booking.ResourceItem, error) {
	rID, err := uuid.Parse(resourceID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListItemsByResource(ctx, rID)
}

// DeleteResource menghapus unit resource secara permanen
func (s *Service) DeleteResource(ctx context.Context, id string) error {
	uID, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	return s.repo.Delete(ctx, uID)
}

// UpdateItem memperbarui detail item (Nama, Harga, Satuan, Default status)
func (s *Service) UpdateItem(ctx context.Context, id string, item booking.ResourceItem) error {
	uID, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	// Pastikan ID di dalam struct item konsisten dengan ID di parameter
	return s.repo.UpdateItem(ctx, uID, item)
}

// DeleteItem menghapus item dari resource
func (s *Service) DeleteItem(ctx context.Context, id string) error {
	uID, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	return s.repo.DeleteItem(ctx, uID)
}

// GetResourceDetail mengambil satu resource lengkap dengan daftar itemnya
func (s *Service) GetResourceDetail(ctx context.Context, id string) (*booking.Resource, error) {
	uID, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	return s.repo.GetOneWithItems(ctx, uID)
}