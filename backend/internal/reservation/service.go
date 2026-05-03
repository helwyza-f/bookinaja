package reservation

import (
	"context"
	"errors"
	"fmt"
	"math"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/customer"
	"github.com/helwiza/backend/internal/fnb"
	"github.com/helwiza/backend/internal/platform/env"
	"github.com/helwiza/backend/internal/platform/fonnte"
	platformrealtime "github.com/helwiza/backend/internal/platform/realtime"
	"github.com/helwiza/backend/internal/resource"
)

type Service struct {
	repo            *Repository
	resourceRepo    *resource.Repository
	customerService *customer.Service
	fnbService      *fnb.Service
	deviceService   deviceAutomation
	realtime        realtimeBroadcaster
}

type deviceAutomation interface {
	EnqueueSessionStart(ctx context.Context, tenantID, bookingID string) error
	EnqueueWarning(ctx context.Context, tenantID, bookingID string) error
	EnqueueTimeout(ctx context.Context, tenantID, bookingID string) error
	EnqueueStandbyByResource(ctx context.Context, tenantID, resourceID string) error
}

type realtimeBroadcaster interface {
	Publish(channel string, event platformrealtime.Event) error
}

func actorIDString(id *uuid.UUID) string {
	if id == nil {
		return ""
	}
	return id.String()
}

func (s *Service) SendReceiptWhatsApp(ctx context.Context, bookingIDRaw, tenantIDRaw string) (*ReceiptDeliveryResult, error) {
	bookingID, err := uuid.Parse(bookingIDRaw)
	if err != nil {
		return nil, errors.New("booking tidak valid")
	}
	tenantID, err := uuid.Parse(tenantIDRaw)
	if err != nil {
		return nil, errors.New("tenant tidak valid")
	}

	receipt, err := s.repo.GetReceiptContext(ctx, bookingID, tenantID)
	if err != nil {
		return nil, errors.New("booking tidak ditemukan")
	}
	if !isProReceiptTenant(receipt.TenantPlan, receipt.TenantStatus) {
		return nil, errors.New("fitur nota hanya tersedia untuk paket pro aktif")
	}
	if strings.TrimSpace(receipt.CustomerPhone) == "" {
		return nil, errors.New("nomor whatsapp customer belum tersedia")
	}

	message := buildReceiptMessage(receipt)
	ok, err := fonnte.SendMessage(receipt.CustomerPhone, message)
	if err != nil || !ok {
		if err != nil {
			return nil, err
		}
		return nil, errors.New("gagal mengirim nota whatsapp")
	}

	return &ReceiptDeliveryResult{
		Message: "Nota WhatsApp terkirim",
		Target:  receipt.CustomerPhone,
	}, nil
}

func isProReceiptTenant(plan, status string) bool {
	return strings.EqualFold(strings.TrimSpace(plan), "pro") && strings.EqualFold(strings.TrimSpace(status), "active")
}

func buildReceiptMessage(receipt *ReceiptContext) string {
	intro := strings.TrimSpace(receipt.ReceiptWhatsAppText)
	if intro == "" {
		intro = "Berikut struk transaksi Anda dari Bookinaja."
	}
	return intro + "\n\n" + renderReceiptTemplate(receipt)
}

func renderReceiptTemplate(receipt *ReceiptContext) string {
	template := strings.TrimSpace(receipt.ReceiptTemplate)
	if template == "" {
		template = strings.Join([]string{
			"=== {receipt_title} ===",
			"{receipt_subtitle}",
			"",
			"Pelanggan : {customer_name}",
			"Booking   : {booking_id}",
			"Unit      : {resource_name}",
			"Waktu     : {booking_time}",
			"",
			"Total     : {grand_total}",
			"DP        : {deposit_amount}",
			"Dibayar   : {paid_amount}",
			"Sisa      : {balance_due}",
			"",
			"{receipt_footer}",
		}, "\n")
	}

	values := map[string]string{
		"receipt_title":    defaultString(receipt.ReceiptTitle, "Struk Bookinaja"),
		"receipt_subtitle": defaultString(receipt.ReceiptSubtitle, "Bukti transaksi resmi"),
		"receipt_footer":   defaultString(receipt.ReceiptFooter, "Terima kasih sudah berkunjung"),
		"tenant_name":      defaultString(receipt.TenantName, "Bookinaja"),
		"customer_name":    defaultString(receipt.CustomerName, "Customer"),
		"customer_phone":   defaultString(receipt.CustomerPhone, "-"),
		"booking_id":       strings.ToUpper(receipt.ID.String()[:8]),
		"resource_name":    defaultString(receipt.ResourceName, "Unit"),
		"booking_time":     formatReceiptTime(receipt.StartTime, receipt.EndTime),
		"grand_total":      formatReceiptIDR(receipt.GrandTotal),
		"deposit_amount":   formatReceiptIDR(receipt.DepositAmount),
		"paid_amount":      formatReceiptIDR(receipt.PaidAmount),
		"balance_due":      formatReceiptIDR(receipt.BalanceDue),
		"payment_status":   defaultString(receipt.PaymentStatus, "-"),
	}

	for key, value := range values {
		template = strings.ReplaceAll(template, "{"+key+"}", value)
	}
	return template
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func formatReceiptTime(start, end time.Time) string {
	return fmt.Sprintf("%s %s-%s", start.Format("02 Jan 2006"), start.Format("15:04"), end.Format("15:04"))
}

func formatReceiptIDR(value float64) string {
	raw := fmt.Sprintf("%.0f", math.Round(value))
	var b strings.Builder
	for i, r := range raw {
		if i > 0 && (len(raw)-i)%3 == 0 {
			b.WriteString(".")
		}
		b.WriteRune(r)
	}
	return "Rp " + b.String()
}

func NewService(r *Repository, resRepo *resource.Repository, custSvc *customer.Service, fnbSvc *fnb.Service, deviceSvc deviceAutomation, realtime realtimeBroadcaster) *Service {
	return &Service{
		repo:            r,
		resourceRepo:    resRepo,
		customerService: custSvc,
		fnbService:      fnbSvc,
		deviceService:   deviceSvc,
		realtime:        realtime,
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
	cust, err := s.customerService.Register(ctx, customer.RegisterReq{
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

	// 7. SEMUA BOOKING SELALU DIMULAI DARI PENDING.
	// Aktivasi sesi dilakukan manual oleh customer/admin saat memang sudah siap masuk.
	_ = isManualWalkIn
	bookingStatus := "pending"

	depositAmount := calculateDepositAmount(grandTotal)
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
	s.customerService.InvalidateTenantCache(ctx, tID)
	if detail, detailErr := s.repo.FindByID(ctx, newBooking.ID, tID); detailErr == nil {
		s.emitBookingRealtime(ctx, "booking.created", detail, map[string]any{
			"actor_type": "customer",
		})
	}

	return &newBooking, cust, nil
}

// ExtendSession menangani penambahan durasi dari Admin Panel/POS Live Dashboard
func (s *Service) ExtendSession(ctx context.Context, bookingID string, tenantID string, additionalDuration int, actor ActorContext) error {
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

	err = s.repo.ExtendSessionWithValidation(
		ctx,
		bID,
		booking.ResourceID,
		booking.EndTime,
		newEndTime,
		additionalDuration,
		actor,
	)
	if err == nil {
		s.customerService.InvalidateTenantCache(ctx, tID)
		if detail, detailErr := s.repo.FindByID(ctx, bID, tID); detailErr == nil {
			s.emitBookingRealtime(ctx, "session.extended", detail, map[string]any{
				"actor_type":          actor.Type,
				"actor_user_id":       actorIDString(actor.UserID),
				"actor_name":          actor.Name,
				"actor_role":          actor.Role,
				"additional_duration": additionalDuration,
			})
		}
	}
	return err
}

// UpdateStatus menangani transisi status (Ongoing, Completed, dll) & Sinkronisasi CRM Stats
func (s *Service) UpdateStatus(ctx context.Context, id, tenantID, status string, actor ActorContext) error {
	bID, _ := uuid.Parse(id)
	tID, _ := uuid.Parse(tenantID)
	status = strings.ToLower(strings.TrimSpace(status))
	if status == "ongoing" {
		status = "active"
	}

	// Ambil detail sebelum update untuk mendapatkan CustomerID & Total Spending
	booking, err := s.repo.FindByID(ctx, bID, tID)
	if err != nil {
		return err
	}
	if err := validateBookingTransition(booking.Status, status, booking.PaymentStatus, booking.DepositAmount); err != nil {
		return err
	}

	if err := s.repo.UpdateStatus(ctx, bID, tID, status, actor); err != nil {
		return err
	}
	s.customerService.InvalidateTenantCache(ctx, tID)

	if updatedRealtime, realtimeErr := s.repo.FindByID(ctx, bID, tID); realtimeErr == nil {
		s.emitBookingRealtime(ctx, mapBookingRealtimeType(status), updatedRealtime, map[string]any{
			"actor_type":    actor.Type,
			"actor_user_id": actorIDString(actor.UserID),
			"actor_name":    actor.Name,
			"actor_role":    actor.Role,
		})
	}

	if status == "active" {
		updated, findErr := s.repo.FindByID(ctx, bID, tID)
		if findErr == nil {
			_ = s.sendSessionStarted(ctx, updated)
			if s.deviceService != nil {
				_ = s.deviceService.EnqueueSessionStart(ctx, tID.String(), bID.String())
			}
		}
	}

	// CRM HOOK: Update statistik kunjungan & belanja jika status selesai
	if status == "completed" {
		totalSpent := int64(booking.GrandTotal)
		_ = s.customerService.SyncStats(ctx, booking.CustomerID, totalSpent)
		if s.deviceService != nil {
			_ = s.deviceService.EnqueueTimeout(ctx, tID.String(), bID.String())
			_ = s.deviceService.EnqueueStandbyByResource(ctx, tID.String(), booking.ResourceID.String())
		}
	}

	if status == "cancelled" && s.deviceService != nil {
		_ = s.deviceService.EnqueueStandbyByResource(ctx, tID.String(), booking.ResourceID.String())
	}

	return nil
}

func (s *Service) ActivateForCustomer(ctx context.Context, bookingID, tenantID, customerID string) (*BookingDetail, error) {
	detail, err := s.GetDetailForCustomer(ctx, bookingID, tenantID, customerID)
	if err != nil {
		return nil, err
	}

	status := strings.ToLower(strings.TrimSpace(detail.Status))
	if status == "active" || status == "ongoing" {
		return detail, nil
	}
	if status == "completed" || status == "cancelled" {
		return nil, errors.New("SESI SUDAH TIDAK BISA DIAKTIFKAN")
	}

	// Validasi Waktu: Tidak bisa diaktifkan sebelum StartTime
	now := time.Now().UTC()
	if now.Before(detail.StartTime) {
		return nil, errors.New("SESI BELUM BISA DIAKTIFKAN SEBELUM WAKTUNYA DIMULAI")
	}

	// Validasi Pembayaran: Wajib sudah bayar DP (status minimal partial_paid, paid, atau settled)
	paymentStatus := strings.ToLower(strings.TrimSpace(detail.PaymentStatus))
	if paymentStatus == "pending" || paymentStatus == "expired" || paymentStatus == "failed" {
		if detail.DepositAmount > 0 {
			return nil, errors.New("SELESAIKAN PEMBAYARAN DP TERLEBIH DAHULU UNTUK MENGAKTIFKAN SESI")
		}
	}

	if err := s.UpdateStatus(ctx, bookingID, detail.TenantID.String(), "active", ActorContext{Type: "customer"}); err != nil {
		return nil, err
	}
	return s.GetDetailForCustomer(ctx, bookingID, detail.TenantID.String(), customerID)
}

func (s *Service) CompleteForCustomer(ctx context.Context, bookingID, tenantID, customerID string) (*BookingDetail, error) {
	detail, err := s.GetDetailForCustomer(ctx, bookingID, tenantID, customerID)
	if err != nil {
		return nil, err
	}

	status := strings.ToLower(strings.TrimSpace(detail.Status))
	if status != "active" && status != "ongoing" {
		return nil, errors.New("HANYA SESI YANG SEDANG AKTIF YANG BISA DIAKHIRI")
	}

	if err := s.UpdateStatus(ctx, bookingID, detail.TenantID.String(), "completed", ActorContext{Type: "customer"}); err != nil {
		return nil, err
	}
	return s.GetDetailForCustomer(ctx, bookingID, detail.TenantID.String(), customerID)
}

func (s *Service) SettleCash(ctx context.Context, id, tenantID string, actor ActorContext) error {
	bID, err := uuid.Parse(id)
	if err != nil {
		return errors.New("ID BOOKING TIDAK VALID")
	}
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return errors.New("ID TENANT TIDAK VALID")
	}
	if err := s.repo.SettlePaymentCash(ctx, bID, tID, actor, nil, nil); err != nil {
		return err
	}
	s.customerService.InvalidateTenantCache(ctx, tID)

	detail, err := s.repo.FindByID(ctx, bID, tID)
	if err != nil || detail == nil {
		return nil
	}
	s.emitBookingRealtime(ctx, "payment.cash.settled", detail, map[string]any{
		"actor_type":      actor.Type,
		"actor_user_id":   actorIDString(actor.UserID),
		"actor_name":      actor.Name,
		"actor_role":      actor.Role,
		"settlement_mode": "cash",
	})
	_, _ = s.customerService.AwardBookingPoints(ctx, detail.CustomerID, detail.TenantID, detail.ID, int64(detail.GrandTotal))

	tenantSlug, err := s.repo.GetTenantSlug(ctx, tID)
	if err != nil {
		return nil
	}

	msg := waPaymentReceivedMessage(detail.CustomerName, "pelunasan cash", detail.ID.String(), detail.ResourceName, detail.GrandTotal, detail.DepositAmount, detail.PaidAmount, detail.BalanceDue, bookingVerifyURL(tenantSlug, detail.AccessToken.String()))
	_, _ = fonnte.SendMessage(detail.CustomerPhone, msg)
	return nil
}

func (s *Service) emitBookingRealtime(ctx context.Context, eventType string, booking *BookingDetail, meta map[string]any) {
	if s.realtime == nil || booking == nil {
		return
	}

	event := platformrealtime.NewEvent(eventType)
	event.TenantID = booking.TenantID.String()
	event.EntityType = "booking"
	event.EntityID = booking.ID.String()
	event.Summary = map[string]any{
		"status":         booking.Status,
		"payment_status": booking.PaymentStatus,
		"resource_name":  booking.ResourceName,
		"customer_name":  booking.CustomerName,
		"start_time":     booking.StartTime,
		"end_time":       booking.EndTime,
		"grand_total":    booking.GrandTotal,
		"balance_due":    booking.BalanceDue,
	}
	event.Refs = map[string]any{
		"booking_id":  booking.ID.String(),
		"resource_id": booking.ResourceID.String(),
		"customer_id": booking.CustomerID.String(),
	}
	event.Meta = meta

	_ = s.realtime.Publish(platformrealtime.TenantBookingsChannel(booking.TenantID.String()), event)
	_ = s.realtime.Publish(platformrealtime.TenantBookingChannel(booking.TenantID.String(), booking.ID.String()), event)
	_ = s.realtime.Publish(platformrealtime.TenantDashboardChannel(booking.TenantID.String()), event)
	if booking.CustomerID != uuid.Nil {
		_ = s.realtime.Publish(platformrealtime.CustomerBookingChannel(booking.CustomerID.String(), booking.ID.String()), event)
	}
	_ = ctx
}

func mapBookingRealtimeType(status string) string {
	switch status {
	case "confirmed":
		return "booking.confirmed"
	case "active":
		return "session.activated"
	case "completed":
		return "session.completed"
	case "cancelled":
		return "booking.cancelled"
	default:
		return "booking.updated"
	}
}

func (s *Service) ExchangeAccessToken(ctx context.Context, accessToken string) (*BookingDetail, *customer.Customer, string, error) {
	tokenUUID, err := uuid.Parse(accessToken)
	if err != nil {
		return nil, nil, "", errors.New("LINK SUDAH KADALUARSA ATAU TIDAK VALID")
	}

	booking, err := s.repo.GetByToken(ctx, tokenUUID)
	if err != nil || booking == nil {
		return nil, nil, "", errors.New("LINK SUDAH KADALUARSA ATAU TIDAK VALID")
	}

	cust, err := s.customerService.GetDetail(ctx, booking.CustomerID.String(), booking.TenantID.String())
	if err != nil || cust == nil {
		return nil, nil, "", errors.New("DATA PELANGGAN TIDAK DITEMUKAN")
	}

	tenantSlug, _ := s.repo.GetTenantSlug(ctx, booking.TenantID)
	sessionToken, err := customer.GenerateAuthToken(
		cust.ID.String(),
		booking.TenantID.String(),
		tenantSlug,
		time.Hour*72,
	)
	if err != nil {
		return nil, nil, "", fmt.Errorf("GAGAL MENUKAR AKSES: %w", err)
	}

	return booking, cust, sessionToken, nil
}

// AddAddonOrder menambahkan layanan tambahan (Add-on on-the-spot)
func (s *Service) AddAddonOrder(ctx context.Context, bookingID string, tenantID string, itemID string, actor ActorContext) error {
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

	err = s.repo.AddAddonOrder(ctx, bID, iID, actor)
	if err == nil {
		s.customerService.InvalidateTenantCache(ctx, tID)
		if detail, detailErr := s.repo.FindByID(ctx, bID, tID); detailErr == nil {
			s.emitBookingRealtime(ctx, "order.addon.added", detail, map[string]any{
				"actor_type":    actor.Type,
				"actor_user_id": actorIDString(actor.UserID),
				"actor_name":    actor.Name,
				"actor_role":    actor.Role,
				"item_id":       itemID,
			})
		}
	}
	return err
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
func (s *Service) AddFnbOrder(ctx context.Context, bookingID string, tenantID string, req AddOrderReq, actor ActorContext) error {
	bID, _ := uuid.Parse(bookingID)
	tID, _ := uuid.Parse(tenantID)

	booking, err := s.repo.FindByID(ctx, bID, tID)
	if err != nil || booking == nil {
		return errors.New("DATA BOOKING TIDAK DITEMUKAN")
	}

	if booking.Status != "active" && booking.Status != "ongoing" {
		return errors.New("PESANAN HANYA BISA DITAMBAHKAN PADA SESI AKTIF")
	}

	err = s.repo.AddFnbOrder(ctx, bID, req.FnbItemID, req.Quantity, actor)
	if err == nil {
		s.customerService.InvalidateTenantCache(ctx, tID)
		if detail, detailErr := s.repo.FindByID(ctx, bID, tID); detailErr == nil {
			s.emitBookingRealtime(ctx, "order.fnb.added", detail, map[string]any{
				"actor_type":    actor.Type,
				"actor_user_id": actorIDString(actor.UserID),
				"actor_name":    actor.Name,
				"actor_role":    actor.Role,
				"fnb_item_id":   req.FnbItemID,
				"quantity":      req.Quantity,
			})
		}
	}
	return err
}

// --- UTILITIES & SEARCH ---

func (s *Service) GetAvailability(ctx context.Context, resourceID string, date time.Time) ([]map[string]string, error) {
	rID, err := uuid.Parse(resourceID)
	if err != nil {
		return nil, errors.New("ID UNIT TIDAK VALID")
	}

	location, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		location = time.FixedZone("WIB", 7*60*60)
	}
	localDate := date.In(location)
	startOfDay := time.Date(localDate.Year(), localDate.Month(), localDate.Day(), 0, 0, 0, 0, location)
	endOfDay := startOfDay.Add(24 * time.Hour)

	bookings, err := s.repo.ListUpcoming(ctx, rID, startOfDay)
	if err != nil {
		return nil, err
	}

	busySlots := []map[string]string{}
	for _, b := range bookings {
		// Konversi UTC ke Local agar frontend tidak geser jamnya
		localStart := b.StartTime.In(location)
		localEnd := b.EndTime.In(location)
		if localEnd.Before(startOfDay) || localStart.After(endOfDay) {
			continue
		}

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

	if strings.TrimSpace(tenantID) == "" {
		cID, err := uuid.Parse(customerID)
		if err != nil {
			return nil, errors.New("ID CUSTOMER TIDAK VALID")
		}
		return s.repo.FindByIDForCustomerGlobal(ctx, bID, cID)
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
	detail, err := s.ensureCustomerLiveSessionAccessible(ctx, bookingID, tenantID, customerID)
	if err != nil {
		return err
	}
	return s.ExtendSession(ctx, bookingID, detail.TenantID.String(), additionalDuration, ActorContext{Type: "customer"})
}

func (s *Service) CustomerAddFnbOrder(ctx context.Context, bookingID, tenantID, customerID string, req AddOrderReq) error {
	detail, err := s.ensureCustomerLiveSessionAccessible(ctx, bookingID, tenantID, customerID)
	if err != nil {
		return err
	}
	return s.AddFnbOrder(ctx, bookingID, detail.TenantID.String(), req, ActorContext{Type: "customer"})
}

func (s *Service) CustomerAddAddonOrder(ctx context.Context, bookingID, tenantID, customerID, itemID string) error {
	detail, err := s.ensureCustomerLiveSessionAccessible(ctx, bookingID, tenantID, customerID)
	if err != nil {
		return err
	}
	return s.AddAddonOrder(ctx, bookingID, detail.TenantID.String(), itemID, ActorContext{Type: "customer"})
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

	var tID uuid.UUID
	if tenantID != "" {
		tID, err = uuid.Parse(tenantID)
		if err != nil {
			return nil, errors.New("ID TENANT TIDAK VALID")
		}
	} else {
		tID, err = s.repo.GetTenantIDByBookingID(ctx, bID)
		if err != nil {
			return nil, errors.New("SESI TIDAK DITEMUKAN")
		}
	}

	booking, err := s.repo.FindByID(ctx, bID, tID)
	if err != nil {
		return nil, err
	}

	_ = s.sendSessionReminders(ctx, booking)
	return booking, nil
}

func (s *Service) SendBookingConfirmation(ctx context.Context, booking *Booking, cust *customer.Customer, tenantSlug string) error {
	if cust == nil {
		return nil
	}

	detailURL := bookingVerifyURL(tenantSlug, booking.AccessToken.String())
	msg := waBookingCreatedMessage(cust.Name, booking.ID.String(), booking.StartTime, booking.EndTime, booking.DepositAmount, booking.BalanceDue, detailURL)
	if strings.ToLower(strings.TrimSpace(os.Getenv("GIN_MODE"))) != "release" {
		fmt.Printf("[WA BOOKING] event=booking_created tenant=%s booking=%s phone=%s message_len=%d url=%s\n", tenantSlug, booking.ID.String(), cust.Phone, len(msg), detailURL)
	}
	_, _ = fonnte.SendMessage(cust.Phone, msg)
	return nil
}

func bookingVerifyURL(tenantSlug, accessToken string) string {
	return env.PlatformURL(fmt.Sprintf("/user/verify?code=%s", accessToken))
}

func wibLocation() *time.Location {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.FixedZone("WIB", 7*60*60)
	}
	return loc
}

func formatWIB(t time.Time) string {
	return t.In(wibLocation()).Format("02 Jan 2006, 15:04 WIB")
}

func formatRupiah(v float64) string {
	val := int64(math.Round(v))
	s := fmt.Sprintf("%d", val)
	if len(s) <= 3 {
		return "Rp " + s
	}
	var result []byte
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result = append(result, '.')
		}
		result = append(result, byte(c))
	}
	return "Rp " + string(result)
}

func shortRef(id string) string {
	if len(id) >= 8 {
		return strings.ToUpper(id[:8])
	}
	return strings.ToUpper(id)
}

func formatMoney(v float64) string {
	return fmt.Sprintf("%d", int64(math.Round(v)))
}

func (s *Service) sendSessionStarted(ctx context.Context, booking *BookingDetail) error {
	if booking == nil {
		return nil
	}
	phone := booking.CustomerPhone
	if phone == "" {
		return nil
	}
	tenantSlug, _ := s.repo.GetTenantSlug(ctx, booking.TenantID)
	url := bookingVerifyURL(tenantSlug, booking.AccessToken.String())
	msg := fmt.Sprintf(
		"🟢 *Sesi Dimulai!*\n\n"+
			"Halo *%s*, sesi booking kamu sudah aktif.\n\n"+
			"📍 *%s* — %s\n"+
			"🎯 Unit: *%s*\n"+
			"⏰ %s — %s\n\n"+
			"Kontrol sesi, pesan F&B, dan perpanjang waktu langsung di sini:\n%s",
		booking.CustomerName,
		booking.TenantName,
		booking.TenantSlug,
		booking.ResourceName,
		formatWIB(booking.StartTime),
		booking.EndTime.In(wibLocation()).Format("15:04 WIB"),
		url,
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
	url := bookingVerifyURL(tenantSlug, booking.AccessToken.String())

	if due <= 20*time.Minute && due > 19*time.Minute && booking.Reminder20MSentAt == nil {
		msg := fmt.Sprintf(
			"⏳ *Reminder: %d Menit Lagi!*\n\n"+
				"Halo *%s*, sesi booking kamu di *%s* mulai *%d menit lagi*.\n\n"+
				"🎯 Unit: *%s*\n"+
				"⏰ Mulai: %s\n\n"+
				"Siap-siap ya! Buka detail booking:\n%s",
			20,
			booking.CustomerName,
			booking.TenantName,
			20,
			booking.ResourceName,
			formatWIB(booking.StartTime),
			url,
		)
		_, _ = fonnte.SendMessage(phone, msg)
		_ = s.repo.MarkReminderSent(ctx, booking.ID, booking.TenantID, "reminder_20m_sent_at")
	}

	if due <= 5*time.Minute && due > 4*time.Minute && booking.Reminder5MSentAt == nil {
		msg := fmt.Sprintf(
			"🔔 *Reminder: %d Menit Lagi!*\n\n"+
				"Halo *%s*, sesi kamu di *%s* hampir dimulai!\n\n"+
				"🎯 Unit: *%s*\n"+
				"⏰ Mulai: %s\n\n"+
				"Yuk langsung masuk! Buka detail booking:\n%s",
			5,
			booking.CustomerName,
			booking.TenantName,
			booking.ResourceName,
			formatWIB(booking.StartTime),
			url,
		)
		_, _ = fonnte.SendMessage(phone, msg)
		_ = s.repo.MarkReminderSent(ctx, booking.ID, booking.TenantID, "reminder_5m_sent_at")
	}
	return nil
}

func waBookingCreatedMessage(name, bookingID string, startTime, endTime time.Time, depositAmount, balanceDue float64, detailURL string) string {
	paymentLine := "Booking ini tanpa DP. Langsung datang saat jadwal sesi."
	if depositAmount > 0 {
		paymentLine = fmt.Sprintf(
			"💰 DP: %s\n💳 Sisa bayar: %s\n\nSegera selesaikan DP agar booking terkonfirmasi.",
			formatRupiah(depositAmount),
			formatRupiah(balanceDue),
		)
	}
	return fmt.Sprintf(
		"✅ *Booking Berhasil!*\n\n"+
			"Halo *%s*, booking kamu sudah tercatat.\n\n"+
			"🔖 Ref: *%s*\n"+
			"⏰ Mulai: %s\n"+
			"⏰ Selesai: %s\n\n"+
			"%s\n\n"+
			"Buka e-tiket & kontrol sesi di sini:\n%s",
		name,
		shortRef(bookingID),
		formatWIB(startTime),
		formatWIB(endTime),
		paymentLine,
		detailURL,
	)
}

func waSessionStartedMessage(name, resourceName, detailURL string) string {
	return fmt.Sprintf(
		"🟢 *Sesi Aktif!*\n\nHalo *%s*, sesi kamu untuk *%s* sekarang sudah berjalan.\n\nBuka live controller:\n%s",
		name,
		resourceName,
		detailURL,
	)
}

func waSessionReminderMessage(name, resourceName string, minutes int, startTime time.Time, detailURL string) string {
	return fmt.Sprintf(
		"⏳ *Reminder: %d Menit Lagi!*\n\nHalo *%s*, sesi kamu untuk *%s* mulai %d menit lagi (%s).\n\nBuka detail booking:\n%s",
		minutes,
		name,
		resourceName,
		minutes,
		formatWIB(startTime),
		detailURL,
	)
}

func calculateDepositAmount(grandTotal float64) float64 {
	dp := math.Round(grandTotal * 0.4)
	if dp < 10000 {
		dp = 10000
	}
	if dp > grandTotal {
		dp = grandTotal
	}
	return dp
}

func validateBookingTransition(currentStatus, nextStatus, paymentStatus string, depositAmount float64) error {
	currentStatus = strings.ToLower(strings.TrimSpace(currentStatus))
	nextStatus = strings.ToLower(strings.TrimSpace(nextStatus))
	paymentStatus = strings.ToLower(strings.TrimSpace(paymentStatus))
	if nextStatus == "ongoing" {
		nextStatus = "active"
	}
	if currentStatus == nextStatus {
		return nil
	}
	if currentStatus == "completed" || currentStatus == "cancelled" {
		return errors.New("BOOKING SUDAH FINAL DAN TIDAK BISA DIUBAH")
	}
	if nextStatus == "cancelled" {
		return nil
	}
	if nextStatus == "confirmed" {
		if currentStatus != "pending" {
			return errors.New("HANYA BOOKING PENDING YANG BISA DIKONFIRMASI")
		}
		return nil
	}
	if nextStatus == "active" {
		if currentStatus != "pending" && currentStatus != "confirmed" {
			return errors.New("HANYA BOOKING PENDING/CONFIRMED YANG BISA DIMULAI")
		}
		if depositAmount > 0 && paymentStatus != "partial_paid" && paymentStatus != "paid" && paymentStatus != "settled" {
			return errors.New("DP HARUS TERCATAT SEBELUM SESI DIMULAI")
		}
		return nil
	}
	if nextStatus == "completed" {
		if currentStatus != "active" {
			return errors.New("HANYA SESI AKTIF YANG BISA DISELESAIKAN")
		}
		return nil
	}
	return errors.New("STATUS BOOKING TIDAK VALID")
}

func waPaymentReceivedMessage(name, note, bookingID, resourceName string, grandTotal, depositAmount, paidAmount, balanceDue float64, detailURL string) string {
	remaining := balanceDue
	if remaining < 0 {
		remaining = 0
	}
	statusLine := ""
	if remaining <= 0 {
		statusLine = "\n✅ *Booking sudah LUNAS!*"
	} else {
		statusLine = fmt.Sprintf("\n💳 Sisa bayar: %s", formatRupiah(remaining))
	}
	return fmt.Sprintf(
		"💵 *Pembayaran Diterima*\n\n"+
			"Halo *%s*, %s\n\n"+
			"🔖 Ref: *%s*\n"+
			"🎯 Unit: *%s*\n"+
			"💰 Total: %s\n"+
			"💰 DP: %s\n"+
			"💰 Dibayar: %s%s\n\n"+
			"Buka detail booking:\n%s",
		name,
		note,
		shortRef(bookingID),
		resourceName,
		formatRupiah(grandTotal),
		formatRupiah(depositAmount),
		formatRupiah(paidAmount),
		statusLine,
		detailURL,
	)
}
