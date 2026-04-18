package reservation

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/customer"
	"github.com/helwiza/saas/internal/fnb"
	"github.com/helwiza/saas/internal/platform/fonnte"
	"github.com/helwiza/saas/internal/platform/security"
	"github.com/helwiza/saas/internal/resource"
)

type Service struct {
	repo            *Repository
	resourceRepo    *resource.Repository
	customerService *customer.Service
	fnbService      *fnb.Service
}

func NewService(r *Repository, resRepo *resource.Repository, custSvc *customer.Service, fnbSvc *fnb.Service) *Service {
	return &Service{
		repo:            r,
		resourceRepo:    resRepo,
		customerService: custSvc,
		fnbService:      fnbSvc,
	}
}

// Create menangani pendaftaran reservasi baru (Auto-detect TenantID & Silent Register CRM)
func (s *Service) Create(ctx context.Context, req CreateBookingReq, isManualWalkIn bool) (*Booking, *customer.Customer, error) {
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
	var grandTotal float64

	for _, item := range resDetail.Items {
		if item.ID == mainItemID {
			unitMinutes = item.UnitDuration
			grandTotal += item.Price * float64(req.Duration)
			break
		}
	}

	for _, idStr := range req.ItemIDs[1:] {
		itemID, err := uuid.Parse(idStr)
		if err != nil {
			continue
		}
		for _, item := range resDetail.Items {
			if item.ID == itemID && item.ItemType == "add_on" {
				grandTotal += item.Price
				break
			}
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

	// 7. TENTUKAN STATUS BERDASARKAN JALUR CREATE
	// Manual walk-in boleh langsung active tanpa DP.
	// Booking non-manual tetap dimulai dari pending supaya DP diverifikasi dulu.
	bookingStatus := "pending"
	if isManualWalkIn {
		bookingStatus = "active"
	} else if req.Status != "" {
		bookingStatus = strings.ToLower(strings.TrimSpace(req.Status))
		if bookingStatus == "active" {
			bookingStatus = "pending"
		}
	}

	depositAmount := calculateDepositAmount(grandTotal, bookingStatus)
	if isManualWalkIn {
		depositAmount = 0
	}
	paidAmount := float64(0)
	balanceDue := grandTotal
	if depositAmount > 0 {
		balanceDue = grandTotal - depositAmount
		if balanceDue < 0 {
			balanceDue = 0
		}
	}
	paymentStatus := "pending"
	paymentMethod := ""

	// 8. KONSTRUKSI MODEL BOOKING
	newBooking := Booking{
		ID:            uuid.New(),
		TenantID:      tID,
		CustomerID:    cust.ID,
		ResourceID:    rID,
		StartTime:     start,
		EndTime:       end,
		AccessToken:   uuid.New(),
		Status:        bookingStatus, // Gunakan status hasil seleksi
		GrandTotal:    grandTotal,
		DepositAmount: depositAmount,
		PaidAmount:    paidAmount,
		BalanceDue:    balanceDue,
		PaymentStatus: paymentStatus,
		PaymentMethod: paymentMethod,
		CreatedAt:     time.Now().UTC(),
	}

	// 9. EKSEKUSI PENYIMPANAN
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

	maxEnd := time.Date(
		booking.EndTime.Year(),
		booking.EndTime.Month(),
		booking.EndTime.Day(),
		23, 59, 59, 0,
		booking.EndTime.Location(),
	)
	if newEndTime.After(maxEnd) {
		return errors.New("MAX EXTENSION SESSION TERCAPAI")
	}

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

func (s *Service) SettleCash(ctx context.Context, id, tenantID string) error {
	bID, err := uuid.Parse(id)
	if err != nil {
		return errors.New("ID BOOKING TIDAK VALID")
	}
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return errors.New("ID TENANT TIDAK VALID")
	}
	return s.repo.SettlePaymentCash(ctx, bID, tID, nil, nil)
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

func (s *Service) ensureCustomerLiveSessionAccessible(ctx context.Context, bookingID, tenantID, customerID string) (*BookingDetail, error) {
	detail, err := s.GetDetailForCustomer(ctx, bookingID, tenantID, customerID)
	if err != nil {
		return nil, err
	}

	status := strings.ToLower(strings.TrimSpace(detail.Status))
	if status != "active" && status != "ongoing" {
		return nil, errors.New("LIVE CONTROLLER HANYA BISA DIAKSES SAAT SESI AKTIF")
	}

	return detail, nil
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

func (s *Service) GetDetailForCustomer(ctx context.Context, id, tenantID, customerID string) (*BookingDetail, error) {
	bID, err := uuid.Parse(id)
	if err != nil {
		return nil, errors.New("ID BOOKING TIDAK VALID")
	}

	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, errors.New("ID TENANT TIDAK VALID")
	}

	cID, err := uuid.Parse(customerID)
	if err != nil {
		return nil, errors.New("ID CUSTOMER TIDAK VALID")
	}

	return s.repo.FindByIDForCustomer(ctx, bID, tID, cID)
}

func (s *Service) GetCustomerResources(ctx context.Context, tenantID string) (any, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, errors.New("ID TENANT TIDAK VALID")
	}
	resources, category, bType, err := s.resourceRepo.ListByTenant(ctx, tID)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"business_category": category,
		"business_type":     bType,
		"resources":         resources,
	}, nil
}

func (s *Service) GetCustomerFnbMenu(ctx context.Context, tenantID string, search string) ([]fnb.Item, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, errors.New("ID TENANT TIDAK VALID")
	}
	if s.fnbService == nil {
		return nil, errors.New("layanan fnb tidak tersedia")
	}
	return s.fnbService.GetMenu(ctx, tID, search)
}

func (s *Service) GetCustomerAvailabilityByBooking(ctx context.Context, bookingID, tenantID, customerID string, date time.Time) ([]map[string]string, error) {
	detail, err := s.ensureCustomerLiveSessionAccessible(ctx, bookingID, tenantID, customerID)
	if err != nil {
		return nil, err
	}
	return s.GetAvailability(ctx, detail.ResourceID.String(), date)
}

func (s *Service) GetCustomerLiveSnapshot(ctx context.Context, bookingID, tenantID, customerID string, date time.Time) (map[string]any, error) {
	detail, err := s.ensureCustomerLiveSessionAccessible(ctx, bookingID, tenantID, customerID)
	if err != nil {
		return nil, err
	}
	busySlots, err := s.GetAvailability(ctx, detail.ResourceID.String(), date)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"booking":    detail,
		"busy_slots": busySlots,
	}, nil
}

func (s *Service) CustomerExtendSession(ctx context.Context, bookingID, tenantID, customerID string, additionalDuration int) error {
	if _, err := s.ensureCustomerLiveSessionAccessible(ctx, bookingID, tenantID, customerID); err != nil {
		return err
	}
	return s.ExtendSession(ctx, bookingID, tenantID, additionalDuration)
}

func (s *Service) CustomerAddFnbOrder(ctx context.Context, bookingID, tenantID, customerID string, req AddOrderReq) error {
	if _, err := s.ensureCustomerLiveSessionAccessible(ctx, bookingID, tenantID, customerID); err != nil {
		return err
	}
	return s.AddFnbOrder(ctx, bookingID, tenantID, req)
}

func (s *Service) CustomerAddAddonOrder(ctx context.Context, bookingID, tenantID, customerID, itemID string) error {
	if _, err := s.ensureCustomerLiveSessionAccessible(ctx, bookingID, tenantID, customerID); err != nil {
		return err
	}
	return s.AddAddonOrder(ctx, bookingID, tenantID, itemID)
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

func (s *Service) SyncSessionState(ctx context.Context, bookingID, tenantID string) (*BookingDetail, error) {
	bID, err := uuid.Parse(bookingID)
	if err != nil {
		return nil, errors.New("ID BOOKING TIDAK VALID")
	}
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, errors.New("ID TENANT TIDAK VALID")
	}

	booking, err := s.repo.FindByID(ctx, bID, tID)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	if (booking.Status == "pending" || booking.Status == "confirmed") && !now.Before(booking.StartTime) {
		if err := s.repo.UpdateStatus(ctx, bID, tID, "active"); err != nil {
			return nil, err
		}
		_ = s.repo.UpdateSessionActivatedAt(ctx, bID, tID)
		booking, err = s.repo.FindByID(ctx, bID, tID)
		if err != nil {
			return nil, err
		}
		_ = s.sendSessionStarted(ctx, booking)
	}

	_ = s.sendSessionReminders(ctx, booking)
	return booking, nil
}

func (s *Service) SendBookingConfirmation(ctx context.Context, booking *Booking, cust *customer.Customer, tenantSlug, sessionToken string) error {
	if cust == nil {
		return nil
	}

	detailURL := bookingDetailURL(tenantSlug, booking.ID.String(), sessionToken)
	paymentLine := "Tidak ada DP, silakan lihat detail booking."
	if booking.DepositAmount > 0 {
		paymentLine = fmt.Sprintf("DP booking: Rp %s. Sisa bayar: Rp %s.", formatMoney(booking.DepositAmount), formatMoney(booking.BalanceDue))
	}

	msg := fmt.Sprintf(
		"Halo %s, booking kamu sudah berhasil.\n\nNomor booking: %s\nMulai: %s\nSelesai: %s\n%s\n\nBuka detail booking di sini:\n%s",
		cust.Name,
		booking.ID.String(),
		booking.StartTime.In(time.Local).Format("02 Jan 2006 15:04"),
		booking.EndTime.In(time.Local).Format("02 Jan 2006 15:04"),
		paymentLine,
		detailURL,
	)
	_, _ = fonnte.SendMessage(cust.Phone, msg)
	return nil
}

func bookingDetailURL(tenantSlug, bookingID, token string) string {
	slug := strings.TrimSpace(tenantSlug)
	if slug == "" {
		slug = "tenant"
	}
	return fmt.Sprintf("https://%s.bookinaja.com/me/bookings/%s?token=%s", slug, bookingID, token)
}

func generateCustomerSessionToken(customerID, tenantID string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"customer_id": customerID,
		"tenant_id":   tenantID,
		"exp":         time.Now().Add(time.Hour * 72).Unix(),
	})
	return token.SignedString([]byte(security.JWTSecret()))
}

func formatMoney(v float64) string {
	return fmt.Sprintf("%d", int64(math.Round(v)))
}

func (s *Service) sendSessionStarted(ctx context.Context, booking *BookingDetail) error {
	if booking == nil {
		return nil
	}
	cust := booking.CustomerName
	phone := booking.CustomerPhone
	if phone == "" {
		return nil
	}
	tenantSlug, _ := s.repo.GetTenantSlug(ctx, booking.TenantID)
	msg := fmt.Sprintf(
		"Halo %s, sesi booking kamu untuk %s sekarang sudah aktif.\n\nBuka detail booking:\n%s",
		cust,
		booking.ResourceName,
		bookingDetailURL(tenantSlug, booking.ID.String(), booking.AccessToken.String()),
	)
	_, _ = fonnte.SendMessage(phone, msg)
	return nil
}

func (s *Service) sendSessionReminders(ctx context.Context, booking *BookingDetail) error {
	if booking == nil {
		return nil
	}
	phone := booking.CustomerPhone
	if phone == "" {
		return nil
	}
	now := time.Now().UTC()
	due := booking.StartTime.Sub(now)
	tenantSlug, _ := s.repo.GetTenantSlug(ctx, booking.TenantID)

	if due <= 20*time.Minute && due > 19*time.Minute && booking.Reminder20MSentAt == nil {
		msg := fmt.Sprintf(
			"Halo %s, sesi booking kamu untuk %s mulai 20 menit lagi pada %s.\n\nDetail booking:\n%s",
			booking.CustomerName,
			booking.ResourceName,
			booking.StartTime.In(time.Local).Format("02 Jan 2006 15:04"),
			bookingDetailURL(tenantSlug, booking.ID.String(), booking.AccessToken.String()),
		)
		_, _ = fonnte.SendMessage(phone, msg)
		_ = s.repo.MarkReminderSent(ctx, booking.ID, booking.TenantID, "reminder_20m_sent_at")
	}

	if due <= 5*time.Minute && due > 4*time.Minute && booking.Reminder5MSentAt == nil {
		msg := fmt.Sprintf(
			"Halo %s, sesi booking kamu untuk %s mulai 5 menit lagi.\n\nDetail booking:\n%s",
			booking.CustomerName,
			booking.ResourceName,
			bookingDetailURL(tenantSlug, booking.ID.String(), booking.AccessToken.String()),
		)
		_, _ = fonnte.SendMessage(phone, msg)
		_ = s.repo.MarkReminderSent(ctx, booking.ID, booking.TenantID, "reminder_5m_sent_at")
	}
	return nil
}

func calculateDepositAmount(grandTotal float64, bookingStatus string) float64 {
	if bookingStatus == "active" {
		return grandTotal
	}

	dp := math.Round(grandTotal * 0.4)
	if dp < 10000 {
		dp = 10000
	}
	if dp > grandTotal {
		dp = grandTotal
	}
	return dp
}
