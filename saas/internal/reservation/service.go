package reservation

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/resource" // Import modul resource untuk akses detail item
)

type Service struct {
	repo         *Repository
	resourceRepo *resource.Repository // Tambahkan akses ke resource repo untuk ambil UnitDuration
}

func NewService(r *Repository, resRepo *resource.Repository) *Service {
	return &Service{
		repo:         r,
		resourceRepo: resRepo,
	}
}

func (s *Service) Create(ctx context.Context, req CreateBookingReq) (*Booking, error) {
	// 1. PARSE WAKTU AWAL
	layout := "2006-01-02T15:04:05"
	start, err := time.ParseInLocation(layout, req.StartTime, time.Local)
	if err != nil {
		start, err = time.Parse(time.RFC3339, req.StartTime)
		if err != nil {
			return nil, errors.New("FORMAT WAKTU SALAH, GUNAKAN YYYY-MM-DDTHH:MM:SS")
		}
	}

	tID, _ := uuid.Parse(req.TenantID)
	rID, _ := uuid.Parse(req.ResourceID)

	// 2. HITUNG END TIME BERDASARKAN UNIT DURATION
	// Ambil item utama (biasanya item pertama dalam list req.ItemIDs)
	if len(req.ItemIDs) == 0 {
		return nil, errors.New("PILIH MINIMAL SATU PAKET/UNIT")
	}
	
	mainItemID, _ := uuid.Parse(req.ItemIDs[0])
	
	// Kita perlu tau durasi per unit dari database
	// Catatan: Pastikan di repository resource ada method GetItemByID atau gunakan repository yang sudah ada
	// Untuk demo ini, kita asumsikan item utama menentukan durasi
	var unitMinutes int = 60 // Default 1 jam
	
	// Cari detail item untuk ambil UnitDuration
	resDetail, err := s.resourceRepo.GetOneWithItems(ctx, rID)
	if err == nil {
		for _, item := range resDetail.Items {
			if item.ID == mainItemID {
				unitMinutes = item.UnitDuration
				break
			}
		}
	}

	// EndTime = StartTime + (Durasi x Menit per unit)
	totalMinutes := req.Duration * unitMinutes
	end := start.Add(time.Duration(totalMinutes) * time.Minute)

	// 3. SILENT REGISTER CUSTOMER
	cID, err := s.repo.GetOrCreateCustomer(ctx, tID, req.CustomerName, req.CustomerPhone)
	if err != nil {
		return nil, fmt.Errorf("GAGAL MENGIDENTIFIKASI CUSTOMER")
	}

	// 4. CEK KETERSEDIAAN (Tabrakan Jadwal)
	available, err := s.repo.CheckAvailability(ctx, rID, start, end)
	if err != nil || !available {
		return nil, errors.New("SLOT WAKTU SUDAH TERISI")
	}

	// 5. PREPARE UUIDS
	var itemUUIDs []uuid.UUID
	for _, idStr := range req.ItemIDs {
		if uID, err := uuid.Parse(idStr); err == nil {
			itemUUIDs = append(itemUUIDs, uID)
		}
	}

	newBooking := Booking{
		ID:          uuid.New(),
		TenantID:    tID,
		CustomerID:  cID,
		ResourceID:  rID,
		StartTime:   start,
		EndTime:     end,
		AccessToken: uuid.New(),
		Status:      "pending",
		CreatedAt:   time.Now(),
	}

	// 6. SIMPAN KE DATABASE
	if err := s.repo.CreateWithItems(ctx, newBooking, itemUUIDs, req.Duration); err != nil {
		return nil, err
	}

	return &newBooking, nil
}

func (s *Service) GetAvailability(ctx context.Context, resourceID string, date time.Time) ([]map[string]string, error) {
	rID, err := uuid.Parse(resourceID)
	if err != nil {
		return nil, errors.New("ID RESOURCE TIDAK VALID")
	}

	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.Local)
	bookings, err := s.repo.ListUpcoming(ctx, rID, startOfDay)
	if err != nil {
		return nil, err
	}

	// Kembalikan start dan end agar frontend bisa blokir slot dengan presisi menit
	busySlots := []map[string]string{}
	for _, b := range bookings {
		busySlots = append(busySlots, map[string]string{
			"start_time": b.StartTime.Format("15:04"),
			"end_time":   b.EndTime.Format("15:04"),
		})
	}

	return busySlots, nil
}

func (s *Service) GetStatusByToken(ctx context.Context, token string) (*BookingDetail, error) {
	tkn, err := uuid.Parse(token)
	if err != nil {
		return nil, errors.New("FORMAT TOKEN TIDAK VALID")
	}
	return s.repo.GetByToken(ctx, tkn)
}

func (s *Service) ListByTenant(ctx context.Context, tenantID, status string) ([]BookingDetail, error) {
	tID, _ := uuid.Parse(tenantID)
	return s.repo.FindAllByTenant(ctx, tID, status)
}

func (s *Service) GetDetailForAdmin(ctx context.Context, id, tenantID string) (*BookingDetail, error) {
	bID, _ := uuid.Parse(id)
	tID, _ := uuid.Parse(tenantID)
	return s.repo.FindByID(ctx, bID, tID)
}

func (s *Service) UpdateStatus(ctx context.Context, id, tenantID, status string) error {
	bID, _ := uuid.Parse(id)
	tID, _ := uuid.Parse(tenantID)
	return s.repo.UpdateStatus(ctx, bID, tID, status)
}