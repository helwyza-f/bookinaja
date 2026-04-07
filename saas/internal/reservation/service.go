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
	customerService *customer.Service
}

func NewService(r *Repository, resRepo *resource.Repository, custSvc *customer.Service) *Service {
	return &Service{
		repo:            r,
		resourceRepo:    resRepo,
		customerService: custSvc,
	}
}

// Create menangani pendaftaran reservasi baru (Auto-detect TenantID & Silent Register CRM)
func (s *Service) Create(ctx context.Context, req CreateBookingReq) (*Booking, *customer.Customer, error) {
	// 1. PARSE RESOURCE ID & AMBIL DATA TENANT (KEAMANAN: TenantID dari DB, bukan JSON)
	rID, err := uuid.Parse(req.ResourceID)
	if err != nil {
		return nil, nil, errors.New("ID UNIT TIDAK VALID")
	}

	resDetail, err := s.resourceRepo.GetOneWithItems(ctx, rID)
	if err != nil {
		return nil, nil, errors.New("UNIT TIDAK DITEMUKAN")
	}
	tID := resDetail.TenantID

	// 2. PARSE WAKTU MULAI (ISO8601)
	start, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		layout := "2006-01-02T15:04:05"
		start, err = time.ParseInLocation(layout, req.StartTime, time.Local)
		if err != nil {
			return nil, nil, errors.New("FORMAT WAKTU SALAH, GUNAKAN STANDAR ISO8601")
		}
	}
	start = start.UTC() // Database konsisten menggunakan UTC

	// 3. HITUNG END TIME BERDASARKAN DURASI UNIT
	if len(req.ItemIDs) == 0 {
		return nil, nil, errors.New("PILIH MINIMAL SATU PAKET UTAMA")
	}

	mainItemID, _ := uuid.Parse(req.ItemIDs[0])
	var unitMinutes int = 60 // Default fallback

	for _, item := range resDetail.Items {
		if item.ID == mainItemID {
			unitMinutes = item.UnitDuration
			break
		}
	}

	totalMinutes := req.Duration * unitMinutes
	end := start.Add(time.Duration(totalMinutes) * time.Minute)

	// 4. SILENT REGISTER / UPSERT PELANGGAN (CRM INTEGRATION)
	cust, err := s.customerService.Register(ctx, tID.String(), customer.RegisterReq{
		Name:  req.CustomerName,
		Phone: req.CustomerPhone,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("GAGAL MENGIDENTIFIKASI PELANGGAN: %w", err)
	}

	// 5. VALIDASI KETERSEDIAAN SLOT (MENCEGAH DOUBLE BOOKING)
	available, err := s.repo.CheckAvailability(ctx, rID, start, end)
	if err != nil || !available {
		return nil, nil, errors.New("MAAF, SLOT WAKTU TERSEBUT SUDAH TERISI")
	}

	// 6. KONVERSI ITEM IDS KE UUID
	var itemUUIDs []uuid.UUID
	for _, idStr := range req.ItemIDs {
		if uID, err := uuid.Parse(idStr); err == nil {
			itemUUIDs = append(itemUUIDs, uID)
		}
	}

	// 7. KONSTRUKSI MODEL BOOKING
	newBooking := Booking{
		ID:          uuid.New(),
		TenantID:    tID,
		CustomerID:  cust.ID,
		ResourceID:  rID,
		StartTime:   start,
		EndTime:     end,
		AccessToken: uuid.New(),
		Status:      "pending",
		CreatedAt:   time.Now().UTC(),
	}

	// 8. EKSEKUSI PENYIMPANAN DATA & BILLING
	if err := s.repo.CreateWithItems(ctx, newBooking, itemUUIDs, req.Duration); err != nil {
		return nil, nil, fmt.Errorf("GAGAL MENYIMPAN TRANSAKSI: %w", err)
	}

	return &newBooking, cust, nil
}

// ExtendSession menangani penambahan durasi dari Admin Panel/POS Live Dashboard
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

// UpdateStatus menangani transisi status (Ongoing, Completed, dll) & Sinkronisasi CRM Stats
func (s *Service) UpdateStatus(ctx context.Context, id, tenantID, status string) error {
	bID, _ := uuid.Parse(id)
	tID, _ := uuid.Parse(tenantID)

	// Ambil detail sebelum update untuk mendapatkan CustomerID & Total Spending
	booking, err := s.repo.FindByID(ctx, bID, tID)
	if err != nil {
		return err
	}

	if err := s.repo.UpdateStatus(ctx, bID, tID, status); err != nil {
		return err
	}

	// CRM HOOK: Update statistik kunjungan & belanja jika status selesai
	if status == "completed" {
		totalSpent := int64(booking.GrandTotal)
		_ = s.customerService.SyncStats(ctx, booking.CustomerID, totalSpent)
	}

	return nil
}

// AddAddonOrder menambahkan layanan tambahan (Add-on on-the-spot)
func (s *Service) AddAddonOrder(ctx context.Context, bookingID string, tenantID string, itemID string) error {
	bID, _ := uuid.Parse(bookingID)
	tID, _ := uuid.Parse(tenantID)
	iID, _ := uuid.Parse(itemID)

	booking, err := s.repo.FindByID(ctx, bID, tID)
	if err != nil || booking == nil {
		return errors.New("SESI TIDAK DITEMUKAN")
	}

	if booking.Status != "active" && booking.Status != "ongoing" {
		return errors.New("ADD-ON HANYA BISA DITAMBAHKAN PADA SESI YANG SEDANG BERJALAN")
	}

	return s.repo.AddAddonOrder(ctx, bID, iID)
}

// GetActiveSessions untuk Live Monitoring Grid di Dashboard
func (s *Service) GetActiveSessions(ctx context.Context, tenantID string) ([]BookingDetail, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, errors.New("ID TENANT TIDAK VALID")
	}
	return s.repo.FindActiveSessions(ctx, tID)
}

// AddFnbOrder integrasi pesanan makanan dari sistem POS ke billing reservasi
func (s *Service) AddFnbOrder(ctx context.Context, bookingID string, tenantID string, req AddOrderReq) error {
	bID, _ := uuid.Parse(bookingID)
	tID, _ := uuid.Parse(tenantID)

	booking, err := s.repo.FindByID(ctx, bID, tID)
	if err != nil || booking == nil {
		return errors.New("DATA BOOKING TIDAK DITEMUKAN")
	}

	if booking.Status != "active" && booking.Status != "ongoing" {
		return errors.New("PESANAN HANYA BISA DITAMBAHKAN PADA SESI AKTIF")
	}

	return s.repo.AddFnbOrder(ctx, bID, req.FnbItemID, req.Quantity)
}

// --- UTILITIES & SEARCH ---

func (s *Service) GetAvailability(ctx context.Context, resourceID string, date time.Time) ([]map[string]string, error) {
	rID, err := uuid.Parse(resourceID)
	if err != nil {
		return nil, errors.New("ID UNIT TIDAK VALID")
	}

	location, _ := time.LoadLocation("Asia/Jakarta")
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)
	
	bookings, err := s.repo.ListUpcoming(ctx, rID, startOfDay)
	if err != nil {
		return nil, err
	}

	busySlots := []map[string]string{}
	for _, b := range bookings {
		// Konversi UTC ke Local agar frontend tidak geser jamnya
		localStart := b.StartTime.In(location)
		localEnd := b.EndTime.In(location)

		busySlots = append(busySlots, map[string]string{
			"id":         b.ID.String(),
			"start_time": localStart.Format("15:04"),
			"end_time":   localEnd.Format("15:04"),
		})
	}

	return busySlots, nil
}

func (s *Service) GetStatusByToken(ctx context.Context, token string) (*BookingDetail, error) {
	tkn, err := uuid.Parse(token)
	if err != nil {
		return nil, errors.New("TOKEN AKSES TIDAK VALID")
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