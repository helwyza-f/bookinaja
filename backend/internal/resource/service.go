package resource

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(r *Repository) *Service {
	return &Service{repo: r}
}

// CreateResource membuat unit utama dengan informasi visual untuk marketing
func (s *Service) CreateResource(ctx context.Context, tenantID, name, category, description, imageURL string) (*Resource, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, err
	}

	// Inisialisasi metadata & gallery kosong agar tidak NULL di database (Clean JSON)
	emptyMeta := json.RawMessage("{}")

	res := Resource{
		ID:          uuid.New(),
		TenantID:    tID,
		Name:        name,
		Category:    category,
		Description: description,
		ImageURL:    imageURL,
		Gallery:     []string{}, // [] bukan null
		Status:      "available",
		Metadata:    &emptyMeta,
	}

	created, err := s.repo.Create(ctx, res)
	if err == nil {
		// INVALIDASI CACHE: Hapus landing data agar unit baru langsung muncul
		s.repo.InvalidateTenantCache(ctx, tID)
	}
	return created, err
}

// UpdateResource memperbarui data utama unit (termasuk deskripsi dan foto)
func (s *Service) UpdateResource(ctx context.Context, id string, req Resource) error {
	resID, err := uuid.Parse(id)
	if err != nil {
		return err
	}

	// Ambil data lama untuk memastikan tenant_id tetap aman (Proteksi Cross-Tenant)
	existing, err := s.repo.GetOneWithItems(ctx, resID)
	if err != nil {
		return err
	}

	req.ID = resID
	req.TenantID = existing.TenantID // Proteksi: jangan ubah kepemilikan tenant

	if req.Metadata == nil {
		req.Metadata = existing.Metadata
	}

	err = s.repo.Update(ctx, req)
	if err == nil {
		s.repo.InvalidateTenantCache(ctx, existing.TenantID)
	}
	return err
}

// ListResources mengambil semua resource milik tenant beserta items-nya
func (s *Service) ListResources(ctx context.Context, tenantID string) (any, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, err
	}

	resources, category, bType, err := s.repo.ListByTenant(ctx, tID)
	if err != nil {
		return nil, err
	}

	// Kembalikan objek gabungan agar frontend dapet konteks kategori bisnisnya
	return gin.H{
		"business_category": category,
		"business_type":     bType,
		"resources":         resources,
	}, nil
}

func (s *Service) ListResourceSummaries(ctx context.Context, tenantID string) ([]ResourceSummary, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListSummariesByTenant(ctx, tID)
}

// AddResourceItem menambahkan opsi harga/layanan/addons ke dalam resource
func (s *Service) AddResourceItem(ctx context.Context, resID, name string, price float64, priceUnit, iType string, isDefault bool, customDuration int) (*ResourceItem, error) {
	rID, err := uuid.Parse(resID)
	if err != nil {
		return nil, err
	}

	// Logic Otomatis Penentuan Durasi (Menit) berdasarkan Unit
	duration := customDuration
	if duration <= 0 {
		switch strings.ToLower(priceUnit) {
		case "hour":
			duration = 60
		case "day":
			duration = 1440
		case "session":
			duration = 120
		default:
			duration = 0
		}
	}

	emptyMeta := json.RawMessage("{}")

	item := ResourceItem{
		ID:           uuid.New(),
		ResourceID:   rID,
		Name:         name,
		Price:        price,
		PriceUnit:    priceUnit,
		UnitDuration: duration,
		ItemType:     iType,
		IsDefault:    isDefault,
		Metadata:     &emptyMeta,
	}

	created, err := s.repo.CreateItem(ctx, item)
	if err == nil {
		// Ambil tenant_id dari resource induk untuk hapus cache landing
		res, _ := s.repo.GetOneWithItems(ctx, rID)
		if res != nil {
			s.repo.InvalidateTenantCache(ctx, res.TenantID)
		}
	}
	return created, err
}

// GetItems mengambil daftar item berdasarkan Resource ID
func (s *Service) GetItems(ctx context.Context, resourceID string) ([]ResourceItem, error) {
	rID, err := uuid.Parse(resourceID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListItemsByResource(ctx, rID)
}

// DeleteResource menghapus unit secara permanen
func (s *Service) DeleteResource(ctx context.Context, id string) error {
	uID, err := uuid.Parse(id)
	if err != nil {
		return err
	}

	// Cari tahu tenant_id sebelum dihapus buat invalidate cache
	existing, _ := s.repo.GetOneWithItems(ctx, uID)

	err = s.repo.Delete(ctx, uID)
	if err == nil && existing != nil {
		s.repo.InvalidateTenantCache(ctx, existing.TenantID)
	}
	return err
}

// UpdateItem memperbarui detail harga/opsi
func (s *Service) UpdateItem(ctx context.Context, id string, item ResourceItem) error {
	uID, err := uuid.Parse(id)
	if err != nil {
		return err
	}

	existing, err := s.repo.GetItemByID(ctx, uID)
	if err != nil {
		return err
	}
	if item.ResourceID == uuid.Nil {
		item.ResourceID = existing.ResourceID
	}
	if item.Metadata == nil {
		item.Metadata = existing.Metadata
	}

	err = s.repo.UpdateItem(ctx, uID, item)
	if err == nil {
		if tenantID, _ := s.repo.GetTenantIDByItemID(ctx, uID); tenantID != nil {
			s.repo.InvalidateTenantCache(ctx, *tenantID)
		}
	}
	return err
}

// DeleteItem menghapus item (addons/opsi harga)
func (s *Service) DeleteItem(ctx context.Context, id string) error {
	uID, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	tenantID, _ := s.repo.GetTenantIDByItemID(ctx, uID)
	err = s.repo.DeleteItem(ctx, uID)
	if err == nil && tenantID != nil {
		s.repo.InvalidateTenantCache(ctx, *tenantID)
	}
	return err
}

// GetResourceDetail mengambil data lengkap satu unit
func (s *Service) GetResourceDetail(ctx context.Context, id string) (*Resource, error) {
	uID, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	return s.repo.GetOneWithItems(ctx, uID)
}
