package customer

import (
	"context"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/platform/fonnte"
	"github.com/redis/go-redis/v9"
)

type Service struct {
	repo  *Repository
	redis *redis.Client // Redis untuk OTP & Caching
}

const starterCustomerLimit = 10

func NewService(r *Repository, rdb *redis.Client) *Service {
	return &Service{
		repo:  r,
		redis: rdb,
	}
}

// --- AUTH & OTP LOGIC (REDIS + FONNTE) ---

// RequestOTP menangani alur permintaan login: Cek user -> Gen OTP -> Redis -> WhatsApp.
func (s *Service) RequestOTP(ctx context.Context, tenantID uuid.UUID, phone string) error {
	// 1. Pastikan nomor terdaftar di tenant ini (Postgres Check)
	cust, err := s.repo.FindByPhone(ctx, tenantID, phone)
	if err != nil || cust == nil {
		return fmt.Errorf("nomor %s tidak terdaftar. silakan hubungi admin atau buat reservasi baru", phone)
	}

	// 2. Generate 6 digit OTP acak
	otpCode := fmt.Sprintf("%06d", rand.New(rand.NewSource(time.Now().UnixNano())).Intn(1000000))

	// 3. Simpan ke Redis Cloud dengan TTL 5 Menit
	key := fmt.Sprintf("otp:%s:%s", tenantID.String(), phone)
	err = s.redis.Set(ctx, key, otpCode, 5*time.Minute).Err()
	if err != nil {
		return fmt.Errorf("sistem login sedang sibuk (redis error): %w", err)
	}

	// 4. Integrasi Fonnte (Kirim WhatsApp Real-time)
	msg := fmt.Sprintf(
		"Halo *%s*,\n\nKode OTP login Anda adalah: *%s*\n\nKode ini berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun termasuk pihak staff.",
		cust.Name,
		otpCode,
	)

	if strings.ToLower(strings.TrimSpace(os.Getenv("GIN_MODE"))) != "release" {
		fmt.Printf("[WA OTP] tenant=%s phone=%s message_len=%d\n", tenantID.String(), phone, len(msg))
	}

	success, err := fonnte.SendMessage(phone, msg)
	if err != nil || !success {
		if strings.ToLower(strings.TrimSpace(os.Getenv("GIN_MODE"))) != "release" {
			fmt.Printf("[WA OTP] send_failed tenant=%s phone=%s err=%v\n", tenantID.String(), phone, err)
		}
		return fmt.Errorf("gagal mengirim kode ke WhatsApp: %v", err)
	}

	if strings.ToLower(strings.TrimSpace(os.Getenv("GIN_MODE"))) != "release" {
		fmt.Printf("[WA OTP] send_success tenant=%s phone=%s\n", tenantID.String(), phone)
	}

	fmt.Printf("[AUTH] OTP Request Success: %s -> %s\n", phone, otpCode)
	return nil
}

// VerifyOTP memvalidasi kode dari customer dan mengembalikan data profil untuk JWT.
func (s *Service) VerifyOTP(ctx context.Context, tenantID uuid.UUID, phone, code string) (*Customer, error) {
	key := fmt.Sprintf("otp:%s:%s", tenantID.String(), phone)

	savedCode, err := s.redis.Get(ctx, key).Result()
	if err == redis.Nil {
		return nil, fmt.Errorf("kode OTP sudah kadaluarsa, silakan minta kode baru")
	} else if err != nil {
		return nil, fmt.Errorf("gagal verifikasi (redis error): %w", err)
	}

	if savedCode != code {
		return nil, fmt.Errorf("kode OTP yang Anda masukkan salah")
	}

	s.redis.Del(ctx, key)

	return s.repo.FindByPhone(ctx, tenantID, phone)
}

// --- CORE CUSTOMER LOGIC ---

// CheckExistence mengecek keberadaan customer berdasarkan nomor HP.
// Digunakan di frontend booking untuk mendeteksi pelanggan lama (Returning Customer).
func (s *Service) CheckExistence(ctx context.Context, tenantID uuid.UUID, phone string) (*Customer, error) {
	cust, err := s.repo.FindByPhone(ctx, tenantID, phone)
	if err != nil {
		return nil, fmt.Errorf("service: gagal cek keberadaan pelanggan: %w", err)
	}
	// Mengembalikan pointer customer (bisa nil jika tidak ditemukan)
	return cust, nil
}

// Register menangani pendaftaran via Booking (Silent) atau manual Admin.
func (s *Service) Register(ctx context.Context, tenantID string, req RegisterReq) (*Customer, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, fmt.Errorf("service: id tenant tidak valid")
	}

	existing, err := s.repo.FindByPhone(ctx, tID, req.Phone)
	if err != nil {
		return nil, fmt.Errorf("service: gagal cek pelanggan existing: %w", err)
	}

	if existing == nil {
		plan, status, _, periodEnd, err := s.repo.GetTenantBillingState(ctx, tID)
		if err != nil {
			return nil, fmt.Errorf("service: gagal membaca status subscription: %w", err)
		}

		if !canCreateNewCustomer(plan, status, periodEnd) {
			return nil, fmt.Errorf("tenant ini perlu upgrade paket untuk menambah pelanggan baru")
		}

		if strings.ToLower(strings.TrimSpace(status)) != "trial" && strings.ToLower(strings.TrimSpace(plan)) == "starter" {
			total, err := s.repo.CountByTenant(ctx, tID)
			if err != nil {
				return nil, fmt.Errorf("service: gagal menghitung pelanggan: %w", err)
			}
			if total >= starterCustomerLimit {
				return nil, fmt.Errorf("paket starter hanya mendukung %d pelanggan. upgrade ke pro untuk unlimited", starterCustomerLimit)
			}
		}
	}

	cust := Customer{
		ID:            uuid.New(),
		TenantID:      tID,
		Name:          req.Name,
		Phone:         req.Phone,
		Email:         req.Email,
		Tier:          "NEW",
		TotalVisits:   0,
		TotalSpent:    0,
		LoyaltyPoints: 0,
	}

	id, err := s.repo.Upsert(ctx, cust)
	if err != nil {
		return nil, fmt.Errorf("service: gagal registrasi pelanggan: %w", err)
	}

	return s.repo.FindByID(ctx, id)
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

func (s *Service) BlastAnnouncement(ctx context.Context, tenantID string, req BroadcastAnnouncementReq) (*BroadcastResult, error) {
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
	return result, nil
}

// SyncStats memperbarui total visits dan total spent (CRM logic).
func (s *Service) SyncStats(ctx context.Context, customerID uuid.UUID, totalSpent int64) error {
	return s.repo.IncrementStats(ctx, customerID, totalSpent)
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

	return &CustomerDashboardData{
		Customer:       *cust,
		Points:         cust.LoyaltyPoints,
		ActiveBookings: active,
		PastHistory:    past,
	}, nil
}

// --- UTILITIES ---

func (s *Service) ListByTenant(ctx context.Context, tenantID string) ([]Customer, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, fmt.Errorf("id tenant tidak valid")
	}
	return s.repo.FindByTenant(ctx, tID)
}

func (s *Service) GetByPhone(ctx context.Context, tenantID uuid.UUID, phone string) (*Customer, error) {
	return s.repo.FindByPhone(ctx, tenantID, phone)
}

func (s *Service) GetDetail(ctx context.Context, id, tenantID string) (*Customer, error) {
	cID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("id customer tidak valid")
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
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, fmt.Errorf("id tenant tidak valid")
	}

	cust, err := s.repo.FindByIDForTenant(ctx, cID, tID)
	if err != nil || cust == nil {
		return nil, fmt.Errorf("customer tidak ditemukan")
	}

	if limit <= 0 || limit > 100 {
		limit = 20
	}
	return s.repo.GetTransactionHistory(ctx, cust.ID, limit)
}
