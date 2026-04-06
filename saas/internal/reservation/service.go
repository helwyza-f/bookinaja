package reservation

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/customer"
	"github.com/helwiza/saas/internal/resource"
)

type Service struct {
	repo            *Repository
	resourceRepo    *resource.Repository
	customerService *customer.Service // Tambahkan dependensi ke modul customer
}

func NewService(r *Repository, resRepo *resource.Repository, custSvc *customer.Service) *Service {
	return &Service{
		repo:            r,
		resourceRepo:    resRepo,
		customerService: custSvc,
	}
}

// Create menangani pendaftaran reservasi baru (Silent Register Integrasi)
func (s *Service) Create(ctx context.Context, req CreateBookingReq) (*Booking, error) {
	// 1. PARSE WAKTU AWAL
	start, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		layout := "2006-01-02T15:04:05"
		start, err = time.ParseInLocation(layout, req.StartTime, time.Local)
		if err != nil {
			return nil, errors.New("FORMAT WAKTU SALAH, GUNAKAN ISO8601 DENGAN OFFSET")
		}
	}

	// FORCE TO UTC: Agar database konsisten
	start = start.UTC()

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

	// 3. REFACTORED: SILENT REGISTER CUSTOMER (Gunakan Customer Service)
	// Logic Upsert ada di dalam modul customer, reservation tinggal terima ID
	cust, err := s.customerService.Register(ctx, req.TenantID, customer.RegisterReq{
		Name:  req.CustomerName,
		Phone: req.CustomerPhone,
	})
	if err != nil {
		return nil, fmt.Errorf("GAGAL MENGIDENTIFIKASI PELANGGAN: %w", err)
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
		CustomerID:  cust.ID, // Gunakan ID dari hasil Register/Upsert
		ResourceID:  rID,
		StartTime:   start,
		EndTime:     end,
		AccessToken: uuid.New(),
		Status:      "pending",
		CreatedAt:   time.Now().UTC(),
	}

	// 6. SIMPAN KE DATABASE
	if err := s.repo.CreateWithItems(ctx, newBooking, itemUUIDs, req.Duration); err != nil {
		return nil, err
	}

	return &newBooking, nil
}

// --- POS & EXTENSION SERVICES ---

func (s *Service) ExtendSession(ctx context.Context, bookingID string, tenantID string, additionalDuration int) error {
	bID, _ := uuid.Parse(bookingID)
	tID, _ := uuid.Parse(tenantID)

	booking, err := s.repo.FindByID(ctx, bID, tID)
	if err != nil || booking == nil {
		return errors.New("SESI TIDAK DITEMUKAN")
	}

	unitMinutes := booking.UnitDuration
	if unitMinutes <= 0 {
		unitMinutes = 60
	}
	newEndTime := booking.EndTime.Add(time.Duration(additionalDuration*unitMinutes) * time.Minute)

	return s.repo.ExtendSessionWithValidation(
		ctx,
		bID,
		booking.ResourceID,
		booking.EndTime,
		newEndTime,
		additionalDuration,
	)
}

func (s *Service) AddAddonOrder(ctx context.Context, bookingID string, tenantID string, itemID string) error {
	bID, _ := uuid.Parse(bookingID)
	tID, _ := uuid.Parse(tenantID)
	iID, _ := uuid.Parse(itemID)

	booking, err := s.repo.FindByID(ctx, bID, tID)
	if err != nil || booking == nil {
		return errors.New("SESI TIDAK DITEMUKAN")
	}

	if booking.Status != "active" && booking.Status != "ongoing" {
		return errors.New("HANYA BISA TAMBAH LAYANAN PADA SESI AKTIF")
	}

	return s.repo.AddAddonOrder(ctx, bID, iID)
}

func (s *Service) GetActiveSessions(ctx context.Context, tenantID string) ([]BookingDetail, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, errors.New("ID TENANT TIDAK VALID")
	}
	return s.repo.FindActiveSessions(ctx, tID)
}

func (s *Service) AddFnbOrder(ctx context.Context, bookingID string, tenantID string, req AddOrderReq) error {
	bID, err := uuid.Parse(bookingID)
	tID, _ := uuid.Parse(tenantID)

	if err != nil {
		return errors.New("ID BOOKING TIDAK VALID")
	}

	booking, err := s.repo.FindByID(ctx, bID, tID)
	if err != nil || booking == nil {
		return errors.New("SESI BOOKING TIDAK DITEMUKAN")
	}

	if booking.Status != "active" && booking.Status != "ongoing" {
		return errors.New("PESANAN HANYA BISA DITAMBAHKAN PADA SESI AKTIF")
	}

	return s.repo.AddFnbOrder(ctx, bID, req.FnbItemID, req.Quantity)
}

// --- CORE UPDATES ---

// UpdateStatus menangani perubahan status DAN sinkronisasi statistik CRM
func (s *Service) UpdateStatus(ctx context.Context, id, tenantID, status string) error {
	bID, _ := uuid.Parse(id)
	tID, _ := uuid.Parse(tenantID)

	// 1. Ambil detail bokingan sebelum diupdate (untuk kebutuhan CRM Stats)
	booking, err := s.repo.FindByID(ctx, bID, tID)
	if err != nil {
		return err
	}

	// 2. Lakukan update status di repository
	if err := s.repo.UpdateStatus(ctx, bID, tID, status); err != nil {
		return err
	}

	// 3. CRM SYNC HOOK: Jika status menjadi 'completed', update stats pelanggan
	if status == "completed" {
		// Panggil service customer untuk increment visits dan spending secara fisik
		totalSpent := int64(booking.GrandTotal) // Asumsikan GrandTotal sudah dihitung di level repository
		err := s.customerService.SyncStats(ctx, booking.CustomerID, totalSpent)
		if err != nil {
			// Kita tidak return error agar flow checkout tidak terhenti, tapi log error-nya
			fmt.Printf("CRM Sync Error: %v\n", err)
		}
	}

	return nil
}

// --- EXISTING SERVICES ---

func (s *Service) GetAvailability(ctx context.Context, resourceID string, date time.Time) ([]map[string]string, error) {
	rID, err := uuid.Parse(resourceID)
	if err != nil {
		return nil, errors.New("ID RESOURCE TIDAK VALID")
	}

	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)
	bookings, err := s.repo.ListUpcoming(ctx, rID, startOfDay)
	if err != nil {
		return nil, err
	}

	busySlots := []map[string]string{}
	for _, b := range bookings {
		busySlots = append(busySlots, map[string]string{
			"id":         b.ID.String(),
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