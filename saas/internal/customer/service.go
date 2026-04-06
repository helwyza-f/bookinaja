package customer

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/platform/fonnte"
	"github.com/redis/go-redis/v9"
)

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
	
	success, err := fonnte.SendMessage(phone, msg)
	if err != nil || !success {
		return fmt.Errorf("gagal mengirim kode ke WhatsApp: %v", err)
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

// Register menangani pendaftaran via Booking (Silent) atau manual Admin.
func (s *Service) Register(ctx context.Context, tenantID string, req RegisterReq) (*Customer, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, fmt.Errorf("service: id tenant tidak valid")
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

func (s *Service) GetDetail(ctx context.Context, id string) (*Customer, error) {
	cID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("id customer tidak valid")
	}
	return s.repo.FindByID(ctx, cID)
}