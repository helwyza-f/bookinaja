package customer

import (
	"context"
	"fmt"
	"math"
	"math/rand"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/platform/fonnte"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

const pointRupiahDivisor int64 = 10000

type Service struct {
	repo  *Repository
	redis *redis.Client // Redis untuk OTP & Caching
}

func NewService(r *Repository, rdb *redis.Client) *Service {
	return &Service{
		repo:  r,
		redis: rdb,
	}
}

// --- AUTH & OTP LOGIC (REDIS + FONNTE) ---

// RequestOTP menangani alur permintaan login: Cek user -> Gen OTP -> Redis -> WhatsApp.
func (s *Service) RequestOTP(ctx context.Context, phone string) error {
	cust, err := s.repo.FindByPhone(ctx, phone)
	if err != nil || cust == nil {
		return fmt.Errorf("nomor WhatsApp ini belum terhubung ke akun Bookinaja. Silakan daftar dulu atau lanjut booking sebagai pelanggan baru")
	}
	if !cust.IsVerified() {
		return fmt.Errorf("akun ini belum aktif. Selesaikan verifikasi WhatsApp dari halaman daftar terlebih dahulu")
	}

	return s.sendOTP(ctx, cust.Phone, cust.Name, "login")
}

func (s *Service) ResendRegistrationOTP(ctx context.Context, phone string) error {
	cust, err := s.repo.FindByPhone(ctx, strings.TrimSpace(phone))
	if err != nil {
		return fmt.Errorf("kami belum bisa menyiapkan kode verifikasi saat ini")
	}
	if cust == nil {
		return fmt.Errorf("data pendaftaran belum ditemukan. Silakan isi formulir daftar terlebih dahulu")
	}
	if cust.IsVerified() {
		return fmt.Errorf("akun ini sudah aktif. Silakan langsung masuk ke Bookinaja")
	}

	return s.sendOTP(ctx, cust.Phone, cust.Name, "register")
}

// VerifyOTP memvalidasi kode dari customer dan mengembalikan data profil untuk JWT.
func (s *Service) VerifyOTP(ctx context.Context, phone, code string) (*Customer, error) {
	key := fmt.Sprintf("otp:%s", phone)

	savedCode, err := s.redis.Get(ctx, key).Result()
	if err == redis.Nil {
		return nil, fmt.Errorf("kode verifikasi sudah kedaluwarsa. Silakan kirim ulang OTP")
	} else if err != nil {
		return nil, fmt.Errorf("verifikasi sedang mengalami kendala. Silakan coba lagi sebentar")
	}

	if savedCode != code {
		return nil, fmt.Errorf("kode verifikasi belum sesuai. Coba periksa lagi")
	}

	s.redis.Del(ctx, key)

	cust, err := s.repo.FindByPhone(ctx, phone)
	if err != nil || cust == nil {
		return nil, fmt.Errorf("akun pelanggan belum ditemukan")
	}

	if !cust.IsVerified() {
		if err := s.repo.MarkPhoneVerified(ctx, cust.ID); err != nil {
			return nil, fmt.Errorf("akun belum berhasil diaktifkan. Silakan coba lagi")
		}
		return s.repo.FindByID(ctx, cust.ID)
	}

	return cust, nil
}

// --- CORE CUSTOMER LOGIC ---

// CheckExistence mengecek keberadaan customer berdasarkan nomor HP.
// Digunakan di frontend booking untuk mendeteksi pelanggan lama (Returning Customer).
func (s *Service) CheckExistence(ctx context.Context, phone string) (*Customer, error) {
	cust, err := s.repo.FindByPhone(ctx, phone)
	if err != nil {
		return nil, fmt.Errorf("service: gagal cek keberadaan pelanggan: %w", err)
	}
	// Mengembalikan pointer customer (bisa nil jika tidak ditemukan)
	return cust, nil
}

// Register menangani pendaftaran via Booking (Silent) atau manual Admin.
func (s *Service) Register(ctx context.Context, req RegisterReq) (*Customer, error) {
	var hashedPassword *string
	if req.Password != nil && strings.TrimSpace(*req.Password) != "" {
		hashed, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, fmt.Errorf("service: gagal mengamankan password pelanggan: %w", err)
		}
		hash := string(hashed)
		hashedPassword = &hash
	}

	cust := Customer{
		ID:              uuid.New(),
		Name:            req.Name,
		Phone:           req.Phone,
		Email:           req.Email,
		Password:        hashedPassword,
		AccountStatus:   "verified",
		PhoneVerifiedAt: timePtr(time.Now().UTC()),
		Tier:            "NEW",
		TotalVisits:     0,
		TotalSpent:      0,
		LoyaltyPoints:   0,
	}

	id, err := s.repo.Upsert(ctx, cust)
	if err != nil {
		return nil, fmt.Errorf("service: gagal registrasi pelanggan: %w", err)
	}

	return s.repo.FindByID(ctx, id)
}

func (s *Service) LoginWithEmail(ctx context.Context, email, password string) (*Customer, error) {
	cust, err := s.repo.FindByEmail(ctx, email)
	if err != nil || cust == nil {
		return nil, fmt.Errorf("email ini belum terdaftar di Bookinaja")
	}

	if cust.Password == nil || *cust.Password == "" {
		return nil, fmt.Errorf("akun ini belum memakai password. Masuk dengan WhatsApp dulu, lalu atur password di profil")
	}
	if !cust.IsVerified() {
		return nil, fmt.Errorf("akun ini belum aktif. Selesaikan verifikasi WhatsApp terlebih dahulu")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*cust.Password), []byte(password)); err != nil {
		return nil, fmt.Errorf("password belum sesuai")
	}

	return cust, nil
}

func (s *Service) StartRegistration(ctx context.Context, req RegisterReq) (*Customer, error) {
	if req.Email != nil && strings.TrimSpace(*req.Email) != "" {
		email := strings.TrimSpace(*req.Email)
		req.Email = &email

		existingByEmail, err := s.repo.FindByEmail(ctx, email)
		if err != nil {
			return nil, fmt.Errorf("kami belum bisa memeriksa email saat ini")
		}
		if existingByEmail != nil && existingByEmail.Phone != req.Phone {
			return nil, fmt.Errorf("email ini sudah dipakai akun lain")
		}
	}

	existingByPhone, err := s.repo.FindByPhone(ctx, req.Phone)
	if err != nil {
		return nil, fmt.Errorf("kami belum bisa memeriksa nomor WhatsApp saat ini")
	}
	if existingByPhone != nil && existingByPhone.IsVerified() {
		return nil, fmt.Errorf("nomor WhatsApp ini sudah terdaftar")
	}

	hashedPassword, err := hashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	cust := Customer{
		ID:            uuid.New(),
		Name:          strings.TrimSpace(req.Name),
		Phone:         strings.TrimSpace(req.Phone),
		Email:         req.Email,
		Password:      hashedPassword,
		AccountStatus: "unverified",
		Tier:          "NEW",
		TotalVisits:   0,
		TotalSpent:    0,
		LoyaltyPoints: 0,
	}

	id, err := s.repo.UpsertPendingRegistration(ctx, cust)
	if err != nil {
		return nil, fmt.Errorf("data pendaftaran belum berhasil disimpan")
	}

	created, err := s.repo.FindByID(ctx, id)
	if err != nil || created == nil {
		return nil, fmt.Errorf("data pendaftaran belum bisa dibaca kembali")
	}

	if err := s.sendOTP(ctx, created.Phone, created.Name, "register"); err != nil {
		return nil, err
	}

	return created, nil
}

func canCreateNewCustomer(plan, status string, periodEnd *time.Time) bool {
	plan = strings.ToLower(strings.TrimSpace(plan))
	status = strings.ToLower(strings.TrimSpace(status))
	now := time.Now().UTC()

	switch status {
	case "trial":
		return periodEnd == nil || periodEnd.After(now)
	case "active":
		if periodEnd != nil && periodEnd.Before(now) {
			return false
		}
		return plan == "starter" || plan == "pro"
	default:
		return false
	}
}

func (s *Service) BlastAnnouncement(ctx context.Context, actorUserID uuid.UUID, tenantID string, req BroadcastAnnouncementReq) (*BroadcastResult, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, fmt.Errorf("service: id tenant tidak valid")
	}

	plan, status, _, periodEnd, err := s.repo.GetTenantBillingState(ctx, tID)
	if err != nil {
		return nil, fmt.Errorf("service: gagal membaca status subscription: %w", err)
	}

	if !canCreateNewCustomer(plan, status, periodEnd) {
		return nil, fmt.Errorf("tenant ini tidak aktif untuk blast pelanggan")
	}

	targets, err := s.repo.ListBroadcastTargets(ctx, tID)
	if err != nil {
		return nil, fmt.Errorf("service: gagal mengambil daftar pelanggan: %w", err)
	}

	tenantName, _ := s.repo.GetTenantName(ctx, tID)
	tenantName = strings.TrimSpace(tenantName)
	if tenantName == "" {
		tenantName = "tenant kamu"
	}
	message := strings.TrimSpace(req.Message)
	if message == "" {
		message = fmt.Sprintf(
			"Halo %s, sekarang %s sudah resmi pakai Bookinaja.\n\nKamu tetap bisa booking dan dapat info terbaru langsung dari WhatsApp ini. Simpan nomor ini agar tidak ketinggalan update.",
			"{nama pelanggan}",
			tenantName,
		)
	}

	result := &BroadcastResult{TenantID: tID, Total: len(targets), DefaultMsg: strings.TrimSpace(req.Message) == ""}
	for _, target := range targets {
		recipientName := strings.TrimSpace(target.Name)
		if recipientName == "" {
			recipientName = "Pelanggan"
		}

		msg := strings.ReplaceAll(message, "{nama pelanggan}", recipientName)
		if strings.TrimSpace(msg) == "" {
			result.Skipped++
			continue
		}

		ok, sendErr := fonnte.SendMessage(target.Phone, msg)
		if sendErr != nil || !ok {
			result.Failed++
			continue
		}
		result.Sent++
	}

	result.Skipped = result.Total - result.Sent - result.Failed
	_ = s.repo.CreateAuditLog(ctx, tID, &actorUserID, "customer_blast", "customer", nil, map[string]any{
		"message":          message,
		"total":            result.Total,
		"sent":             result.Sent,
		"failed":           result.Failed,
		"skipped":          result.Skipped,
		"default_message":  result.DefaultMsg,
		"broadcast_target": "all_customers",
	})
	return result, nil
}

// SyncStats memperbarui total visits dan total spent (CRM logic).
func (s *Service) SyncStats(ctx context.Context, customerID uuid.UUID, totalSpent int64) error {
	return s.repo.IncrementStats(ctx, customerID, totalSpent)
}

func (s *Service) AwardBookingPoints(ctx context.Context, customerID, tenantID, bookingID uuid.UUID, paidAmount int64) (int, error) {
	if paidAmount <= 0 {
		return 0, nil
	}
	points := int(math.Floor(float64(paidAmount) / float64(pointRupiahDivisor)))
	if points <= 0 {
		return 0, nil
	}
	return s.repo.AwardBookingPoints(
		ctx,
		customerID,
		tenantID,
		bookingID,
		paidAmount,
		points,
		"Earned from booking payment",
	)
}

// GetDashboardData menyiapkan data untuk Portal Customer (/me) dengan pemisahan Active vs History.
func (s *Service) GetDashboardData(ctx context.Context, customerID uuid.UUID) (*CustomerDashboardData, error) {
	cust, err := s.repo.FindByID(ctx, customerID)
	if err != nil || cust == nil {
		return nil, fmt.Errorf("profil pelanggan tidak ditemukan")
	}

	// 1. Ambil bokingan aktif (Upcoming/In-Progress)
	active, _ := s.repo.GetActiveBookings(ctx, customerID)

	// 2. Ambil riwayat lampau (Limit 10 history terakhir)
	past, _ := s.repo.GetPastHistory(ctx, customerID, 10)
	pointActivity, _ := s.repo.ListPointActivity(ctx, customerID, nil, 8)

	return &CustomerDashboardData{
		Customer:       *cust,
		Points:         cust.LoyaltyPoints,
		PointActivity:  pointActivity,
		ActiveBookings: active,
		PastHistory:    past,
	}, nil
}

func (s *Service) UpdateAccount(ctx context.Context, customerID string, req UpdateProfileReq) (*Customer, error) {
	cID, err := uuid.Parse(customerID)
	if err != nil {
		return nil, fmt.Errorf("id customer tidak valid")
	}

	updated, err := s.repo.UpdateProfile(ctx, cID, req)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, fmt.Errorf("customer tidak ditemukan")
	}
	return updated, nil
}

// --- UTILITIES ---

func (s *Service) ListByTenant(ctx context.Context, tenantID string) ([]Customer, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, fmt.Errorf("id tenant tidak valid")
	}
	return s.repo.FindByTenant(ctx, tID)
}

func (s *Service) GetByPhone(ctx context.Context, phone string) (*Customer, error) {
	return s.repo.FindByPhone(ctx, phone)
}

func (s *Service) GetDetail(ctx context.Context, id, tenantID string) (*Customer, error) {
	cID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("id customer tidak valid")
	}
	if strings.TrimSpace(tenantID) == "" {
		return s.repo.FindByID(ctx, cID)
	}
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, fmt.Errorf("id tenant tidak valid")
	}
	return s.repo.FindByIDForTenant(ctx, cID, tID)
}

func (s *Service) GetTransactionHistory(ctx context.Context, id, tenantID string, limit int) ([]RecentHistoryDTO, error) {
	cID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("id customer tidak valid")
	}
	if strings.TrimSpace(tenantID) != "" {
		tID, err := uuid.Parse(tenantID)
		if err != nil {
			return nil, fmt.Errorf("id tenant tidak valid")
		}

		cust, err := s.repo.FindByIDForTenant(ctx, cID, tID)
		if err != nil || cust == nil {
			return nil, fmt.Errorf("customer tidak ditemukan")
		}
	} else {
		cust, err := s.repo.FindByID(ctx, cID)
		if err != nil || cust == nil {
			return nil, fmt.Errorf("customer tidak ditemukan")
		}
	}

	if limit <= 0 || limit > 100 {
		limit = 20
	}
	return s.repo.GetTransactionHistory(ctx, cID, limit)
}

func (s *Service) GetPointSummary(ctx context.Context, id, tenantID string, limit int) (*CustomerPointSummary, error) {
	cID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("id customer tidak valid")
	}

	cust, err := s.repo.FindByID(ctx, cID)
	if err != nil || cust == nil {
		return nil, fmt.Errorf("customer tidak ditemukan")
	}

	var tenantUUID *uuid.UUID
	earnedAtTenant := 0
	if strings.TrimSpace(tenantID) != "" {
		tID, err := uuid.Parse(tenantID)
		if err != nil {
			return nil, fmt.Errorf("id tenant tidak valid")
		}
		tenantUUID = &tID
		earnedAtTenant, _ = s.repo.SumEarnedPointsAtTenant(ctx, cID, tID)
	}

	activity, err := s.repo.ListPointActivity(ctx, cID, tenantUUID, limit)
	if err != nil {
		return nil, err
	}

	return &CustomerPointSummary{
		Balance:          cust.LoyaltyPoints,
		EarnedAtTenant:   earnedAtTenant,
		Activity:         activity,
		EarningRuleLabel: "1 poin setiap Rp10.000 pembayaran lunas",
	}, nil
}

func (s *Service) sendOTP(ctx context.Context, phone, name, purpose string) error {
	otpCode := fmt.Sprintf("%06d", rand.New(rand.NewSource(time.Now().UnixNano())).Intn(1000000))
	key := fmt.Sprintf("otp:%s", phone)
	if err := s.redis.Set(ctx, key, otpCode, 5*time.Minute).Err(); err != nil {
		return fmt.Errorf("sistem verifikasi sedang sibuk. Silakan coba lagi sebentar")
	}

	actionLabel := "login"
	if purpose == "register" {
		actionLabel = "aktivasi akun"
	}
	msg := fmt.Sprintf(
		"Halo *%s*,\n\nKode OTP %s Anda adalah: *%s*\n\nKode ini berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun termasuk pihak staff.",
		name,
		actionLabel,
		otpCode,
	)

	if strings.ToLower(strings.TrimSpace(os.Getenv("GIN_MODE"))) != "release" {
		fmt.Printf("[WA OTP] purpose=%s phone=%s message_len=%d\n", purpose, phone, len(msg))
	}

	success, err := fonnte.SendMessage(phone, msg)
	if err != nil || !success {
		if strings.ToLower(strings.TrimSpace(os.Getenv("GIN_MODE"))) != "release" {
			fmt.Printf("[WA OTP] send_failed purpose=%s phone=%s err=%v\n", purpose, phone, err)
		}
		return fmt.Errorf("kode verifikasi belum berhasil dikirim ke WhatsApp. Silakan coba lagi")
	}

	return nil
}

func hashPassword(password *string) (*string, error) {
	if password == nil || strings.TrimSpace(*password) == "" {
		return nil, nil
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(*password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("service: gagal mengamankan password pelanggan: %w", err)
	}

	hash := string(hashed)
	return &hash, nil
}

func timePtr(t time.Time) *time.Time {
	return &t
}
