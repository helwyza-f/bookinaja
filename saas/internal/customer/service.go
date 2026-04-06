package customer

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(r *Repository) *Service {
	return &Service{repo: r}
}

// Register menangani pendaftaran manual maupun "Silent Register" via Booking.
// Sekarang lebih efisien karena mengandalkan metode Upsert di repository.
func (s *Service) Register(ctx context.Context, tenantID string, req RegisterReq) (*Customer, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, fmt.Errorf("service: id tenant tidak valid")
	}

	// Buat objek customer baru
	// Jika nomor HP sudah ada, Repository akan mengupdate nama dan mengembalikan ID lama
	cust := Customer{
		ID:       uuid.New(),
		TenantID: tID,
		Name:     req.Name,
		Phone:    req.Phone,
		Email:    req.Email,
	}

	// Gunakan metode Upsert agar logic "Cek dulu baru Insert" dilakukan di level Database (Atomic)
	id, err := s.repo.Upsert(ctx, cust)
	if err != nil {
		return nil, fmt.Errorf("service: gagal registrasi pelanggan: %w", err)
	}

	// Ambil data lengkap hasil upsert untuk dikembalikan ke pemanggil
	return s.repo.FindByID(ctx, id)
}

// SyncStats digunakan untuk memperbarui total kunjungan dan belanja pelanggan.
// Biasanya dipanggil dari modul Reservation saat status bokingan menjadi 'completed'.
func (s *Service) SyncStats(ctx context.Context, customerID uuid.UUID, totalSpent int64) error {
	return s.repo.IncrementStats(ctx, customerID, totalSpent)
}

// ListByTenant mengambil semua database pelanggan untuk halaman CRM.
func (s *Service) ListByTenant(ctx context.Context, tenantID string) ([]Customer, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, fmt.Errorf("service: id tenant tidak valid")
	}
	return s.repo.FindByTenant(ctx, tID)
}

// GetDetail mengambil profil lengkap pelanggan beserta statistik CRM-nya.
func (s *Service) GetDetail(ctx context.Context, id string) (*Customer, error) {
	cID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("service: id customer tidak valid")
	}
	return s.repo.FindByID(ctx, cID)
}

// GetByPhone pencarian cepat berdasarkan nomor HP (sering dipakai di Kasir/POS)
func (s *Service) GetByPhone(ctx context.Context, tenantID uuid.UUID, phone string) (*Customer, error) {
	return s.repo.FindByPhone(ctx, tenantID, phone)
}