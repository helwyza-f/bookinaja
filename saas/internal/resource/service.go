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

	// Inisialisasi metadata kosong agar tidak NULL di database
	emptyMeta := json.RawMessage("{}")

	res := Resource{
		ID:          uuid.New(),
		TenantID:    tID,
		Name:        name,
		Category:    category,
		Description: description,
		ImageURL:    imageURL,
		Gallery:     []string{}, // Inisialisasi gallery kosong [] bukan null
		Status:      "available",
		Metadata:    &emptyMeta,
	}
	return s.repo.Create(ctx, res)
}

// UpdateResource memperbarui data utama unit (termasuk deskripsi dan foto)
func (s *Service) UpdateResource(ctx context.Context, id string, req Resource) error {
	resID, err := uuid.Parse(id)
	if err != nil {
		return err
	}

	// Ambil data lama untuk memastikan tenant_id konsisten (keamanan)
	existing, err := s.repo.GetOneWithItems(ctx, resID)
	if err != nil {
		return err
	}

	req.ID = resID
	req.TenantID = existing.TenantID // Proteksi: jangan ubah kepemilikan tenant

	// Jaga agar metadata tetap aman jika request tidak mengirimkan metadata
	if req.Metadata == nil {
		req.Metadata = existing.Metadata
	}

	return s.repo.Update(ctx, req)
}

// ListResources mengambil semua resource milik tenant beserta items di dalamnya
func (s *Service) ListResources(ctx context.Context, tenantID string) (any, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, err
	}

	resources, category, bType, err := s.repo.ListByTenant(ctx, tID)
	if err != nil {
		return nil, err
	}

	// Kembalikan objek gabungan untuk dashboard admin/public
	return gin.H{
		"business_category": category,
		"business_type":     bType,
		"resources":         resources,
	}, nil
}

// AddResourceItem menambahkan opsi barang/layanan ke dalam resource
func (s *Service) AddResourceItem(ctx context.Context, resID, name string, price float64, priceUnit, iType string, isDefault bool, customDuration int) (*ResourceItem, error) {
	rID, err := uuid.Parse(resID)
	if err != nil {
		return nil, err
	}

	// Logic Otomatis Penentuan Durasi (dalam Menit)
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

	// Inisialisasi metadata kosong
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

	return s.repo.CreateItem(ctx, item)
}

// GetItems mengambil daftar item berdasarkan Resource ID
func (s *Service) GetItems(ctx context.Context, resourceID string) ([]ResourceItem, error) {
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
func (s *Service) UpdateItem(ctx context.Context, id string, item ResourceItem) error {
	uID, err := uuid.Parse(id)
	if err != nil {
		return err
	}
	
	// Pastikan metadata tidak nil sebelum masuk ke repo untuk menghindari error scan
	if item.Metadata == nil {
		emptyMeta := json.RawMessage("{}")
		item.Metadata = &emptyMeta
	}

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

// GetResourceDetail mengambil satu resource lengkap dengan daftar item & visual data
func (s *Service) GetResourceDetail(ctx context.Context, id string) (*Resource, error) {
	uID, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	return s.repo.GetOneWithItems(ctx, uID)
}