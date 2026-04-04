package reservation

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/resource"
)

type Service struct {
	repo         *Repository
	resourceRepo *resource.Repository
}

func NewService(r *Repository, resRepo *resource.Repository) *Service {
	return &Service{
		repo:         r,
		resourceRepo: resRepo,
	}
}

// Create menangani pendaftaran reservasi baru
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
	if len(req.ItemIDs) == 0 {
		return nil, errors.New("PILIH MINIMAL SATU PAKET/UNIT")
	}
	
	mainItemID, _ := uuid.Parse(req.ItemIDs[0])
	var unitMinutes int = 60 
	
	resDetail, err := s.resourceRepo.GetOneWithItems(ctx, rID)
	if err == nil {
		for _, item := range resDetail.Items {
			if item.ID == mainItemID {
				unitMinutes = item.UnitDuration
				break
			}
		}
	}

	totalMinutes := req.Duration * unitMinutes
	end := start.Add(time.Duration(totalMinutes) * time.Minute)

	// 3. SILENT REGISTER CUSTOMER
	cID, err := s.repo.GetOrCreateCustomer(ctx, tID, req.CustomerName, req.CustomerPhone)
	if err != nil {
		return nil, fmt.Errorf("GAGAL MENGIDENTIFIKASI CUSTOMER")
	}

	// 4. CEK KETERSEDIAAN
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

	if err := s.repo.CreateWithItems(ctx, newBooking, itemUUIDs, req.Duration); err != nil {
		return nil, err
	}

	return &newBooking, nil
}

// --- POS & ORDERING SERVICES ---

// GetActiveSessions mengambil sesi yang sedang berlangsung untuk dashboard POS
func (s *Service) GetActiveSessions(ctx context.Context, tenantID string) ([]BookingDetail, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, errors.New("ID TENANT TIDAK VALID")
	}
	return s.repo.FindActiveSessions(ctx, tID)
}

// AddFnbOrder menambahkan pesanan makanan/minuman ke dalam bill booking
func (s *Service) AddFnbOrder(ctx context.Context, bookingID string, req AddOrderReq) error {
	bID, err := uuid.Parse(bookingID)
	if err != nil {
		return errors.New("ID BOOKING TIDAK VALID")
	}

	// Validasi tambahan: Pastikan booking exists dan statusnya active/ongoing
	// (Opsional, tapi bagus untuk keamanan data)
	booking, err := s.repo.FindByID(ctx, bID, uuid.Nil) // tenantID Nil jika bypass check di repo
	if err != nil || booking == nil {
		return errors.New("SESI BOOKING TIDAK DITEMUKAN")
	}

	if booking.Status != "active" && booking.Status != "ongoing" {
		return errors.New("PESANAN HANYA BISA DITAMBAHKAN PADA SESI AKTIF")
	}

	return s.repo.AddFnbOrder(ctx, bID, req.FnbItemID, req.Quantity)
}

// --- EXISTING SERVICES ---

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