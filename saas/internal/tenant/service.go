package tenant

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/auth"
	"github.com/helwiza/saas/internal/fnb"
	"github.com/helwiza/saas/internal/resource"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

const freeTrialDuration = 30 * 24 * time.Hour

type Service struct {
	repo        *Repository
	authService *auth.Service
}

func NewService(r *Repository, authService *auth.Service) *Service {
	return &Service{
		repo:        r,
		authService: authService,
	}
}

// GetPublicProfile Baru: Jalur cepat buat ambil tema & identitas (Granular)
func (s *Service) GetPublicProfile(ctx context.Context, slug string) (*Tenant, error) {
	// Repo ini harus sudah punya logic Cache-Aside Redis
	return s.repo.GetBySlug(ctx, slug)
}

// GetPublicLandingData mengambil full data (Profile + Resources)
func (s *Service) GetPublicLandingData(ctx context.Context, slug string) (map[string]interface{}, error) {
	return s.repo.GetPublicLandingData(ctx, slug)
}

// Register menangani pendaftaran tenant baru & inisialisasi default branding
func (s *Service) Register(ctx context.Context, req RegisterReq) (*Tenant, error) {
	slug := strings.ToLower(strings.TrimSpace(req.TenantSlug))

	// 1. Validasi keberadaan slug dan email
	slugEx, emailEx, err := s.repo.Exists(ctx, slug, req.AdminEmail)
	if err != nil {
		return nil, err
	}
	if slugEx {
		return nil, errors.New("subdomain sudah digunakan")
	}
	if emailEx {
		return nil, errors.New("email sudah terdaftar")
	}

	// 2. Hash Password Owner
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.AdminPass), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	tID := uuid.New()
	now := time.Now().UTC()

	// --- DYNAMIC DEFAULT BRANDING ---
	defaultColor := "#3b82f6"
	defaultTagline := "Professional Booking System"
	defaultSlogan := "Control your branch, grow your business"
	defaultAbout := "Kami menyediakan layanan berkualitas dengan sistem manajemen modern."
	var defaultFeatures pq.StringArray

	switch req.BusinessCategory {
	case "gaming_hub":
		defaultColor = "#2563eb"
		defaultTagline = "The Ultimate Arena for Pro Players"
		defaultSlogan = "Experience Gaming at its Peak"
		defaultAbout = "Pusat gaming dengan spesifikasi PC tertinggi dan koneksi internet stabil."
		defaultFeatures = pq.StringArray{"RTX 4090 Ready", "Internet 1Gbps", "Pro Peripherals", "240Hz Monitor"}
	case "creative_space":
		defaultColor = "#e11d48"
		defaultTagline = "Studio Creative for Unlimited Ideas"
		defaultFeatures = pq.StringArray{"Pro Lighting", "Set Aesthetic", "High-End Camera", "Private Studio"}
	case "sport_center":
		defaultColor = "#10b981"
		defaultTagline = "World Class Sports Facility"
		defaultFeatures = pq.StringArray{"Vinyl Court", "Locker Room", "Standard Inter", "Training Gear"}
	case "social_space":
		defaultColor = "#4f46e5"
		defaultTagline = "Elite Space for Collaboration"
		defaultFeatures = pq.StringArray{"Fast Wi-Fi", "Free Coffee", "Focus Zone", "Meeting Room"}
	}

	tenant := Tenant{
		ID:                             tID,
		Name:                           req.TenantName,
		Slug:                           slug,
		BusinessCategory:               req.BusinessCategory,
		BusinessType:                   req.BusinessType,
		Plan:                           "starter",
		SubscriptionStatus:             "trial",
		SubscriptionCurrentPeriodStart: ptrTime(now),
		SubscriptionCurrentPeriodEnd:   ptrTime(now.Add(freeTrialDuration)),
		Tagline:                        defaultTagline,
		Slogan:                         defaultSlogan,
		AboutUs:                        defaultAbout,
		Features:                       defaultFeatures,
		PrimaryColor:                   defaultColor,
		CreatedAt:                      now,
	}

	user := User{
		ID:        uuid.New(),
		TenantID:  tID,
		Name:      req.AdminName,
		Email:     req.AdminEmail,
		Password:  string(hashed),
		Role:      "owner",
		CreatedAt: time.Now(),
	}

	// 3. Simpan ke Database
	if err := s.repo.CreateWithAdmin(ctx, tenant, user); err != nil {
		return nil, err
	}

	// 4. Seeding Template Asynchronous
	go s.SeedTemplate(context.Background(), tID, req.BusinessCategory)

	return &tenant, nil
}

func ptrTime(t time.Time) *time.Time {
	v := t
	return &v
}

// SeedTemplate menyuntikkan data awal berdasarkan kategori bisnis
// SeedTemplate menyuntikkan data awal berdasarkan kategori bisnis
func (s *Service) SeedTemplate(ctx context.Context, tenantID uuid.UUID, category string) {
	file, err := os.ReadFile("internal/tenant/templates.json")
	if err != nil {
		log.Printf("[SEEDER] Error read template file: %v", err)
		return
	}

	var allTemplates map[string]struct {
		Resources []struct {
			Name        string `json:"name"`
			Category    string `json:"category"`
			Description string `json:"description"`
			ImageURL    string `json:"image_url"`
		} `json:"resources"`
		MainItems []struct {
			Name         string  `json:"name"`
			Price        float64 `json:"price"`
			PriceUnit    string  `json:"price_unit"`
			UnitDuration int     `json:"unit_duration"`
			IsDefault    bool    `json:"is_default"`
		} `json:"main_items"`
		UnitAddons []struct {
			Name         string  `json:"name"`
			Price        float64 `json:"price"`
			PriceUnit    string  `json:"price_unit"`
			UnitDuration int     `json:"unit_duration"`
		} `json:"unit_addons"`
		FnbCatalog []struct {
			Name     string  `json:"name"`
			Price    float64 `json:"price"`
			Category string  `json:"category"`
			ImageURL string  `json:"image_url"`
		} `json:"fnb_catalog"`
	}

	if err := json.Unmarshal(file, &allTemplates); err != nil {
		log.Printf("[SEEDER] Error unmarshal template: %v", err)
		return
	}

	tpl, ok := allTemplates[category]
	if !ok {
		log.Printf("[SEEDER] Category %s template not found", category)
		return
	}

	emptyMeta := json.RawMessage("{}")

	var resourcesToSeed []resource.Resource
	for _, r := range tpl.Resources {
		res := resource.Resource{
			Name:        r.Name,
			Category:    r.Category,
			Description: r.Description,
			ImageURL:    r.ImageURL,
			Gallery:     []string{},
			Metadata:    &emptyMeta,
		}

		for _, mi := range tpl.MainItems {
			duration := mi.UnitDuration
			if duration <= 0 {
				duration = s.getDefaultDuration(mi.PriceUnit)
			}
			res.Items = append(res.Items, resource.ResourceItem{
				Name:         mi.Name,
				Price:        mi.Price,
				PriceUnit:    mi.PriceUnit,
				UnitDuration: duration,
				ItemType:     "main_option",
				IsDefault:    mi.IsDefault,
				Metadata:     &emptyMeta,
			})
		}

		for _, ua := range tpl.UnitAddons {
			duration := ua.UnitDuration
			if duration <= 0 {
				duration = s.getDefaultDuration(ua.PriceUnit)
			}
			res.Items = append(res.Items, resource.ResourceItem{
				Name:         ua.Name,
				Price:        ua.Price,
				PriceUnit:    ua.PriceUnit,
				UnitDuration: duration,
				ItemType:     "add_on",
				IsDefault:    false,
				Metadata:     &emptyMeta,
			})
		}
		resourcesToSeed = append(resourcesToSeed, res)
	}

	var fnbToSeed []fnb.Item
	for _, f := range tpl.FnbCatalog {
		imgURL := f.ImageURL
		fnbToSeed = append(fnbToSeed, fnb.Item{
			Name:        f.Name,
			Price:       f.Price,
			Category:    f.Category,
			ImageURL:    &imgURL,
			IsAvailable: true,
		})
	}

	if err := s.repo.SeedTenantData(ctx, tenantID, resourcesToSeed); err != nil {
		log.Printf("[SEEDER] DB Error resources: %v", err)
	}
	if err := s.repo.SeedFnbData(ctx, tenantID, fnbToSeed); err != nil {
		log.Printf("[SEEDER] DB Error fnb: %v", err)
	}

	log.Printf("[SEEDER] ✅ SUCCESS: Template %s applied for tenant %s", category, tenantID)
}

func (s *Service) getDefaultDuration(unit string) int {
	switch strings.ToLower(unit) {
	case "hour":
		return 60
	case "day":
		return 1440
	default:
		return 0
	}
}

func (s *Service) Login(ctx context.Context, email, password, tenantSlug string) (*LoginResponse, error) {
	var (
		u   *User
		err error
	)

	if strings.TrimSpace(tenantSlug) != "" {
		u, err = s.repo.GetUserByEmailAndSlug(ctx, email, tenantSlug)
	} else {
		u, err = s.repo.GetUserByEmail(ctx, email)
	}
	if err != nil || u == nil {
		return nil, errors.New("email atau password salah")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password)); err != nil {
		return nil, errors.New("email atau password salah")
	}

	token, err := s.authService.GenerateToken(u.ID, u.TenantID, u.Role)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{Token: token, User: *u}, nil
}

func (s *Service) GetProfile(ctx context.Context, id uuid.UUID) (*Tenant, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) UpdateProfile(ctx context.Context, id uuid.UUID, req Tenant) (*Tenant, error) {
	curr, err := s.repo.GetByID(ctx, id)
	if err != nil || curr == nil {
		return nil, errors.New("tenant tidak ditemukan")
	}

	req.ID = id
	req.Slug = curr.Slug
	req.CreatedAt = curr.CreatedAt

	if err := s.repo.Update(ctx, req); err != nil {
		return nil, err
	}
	return &req, nil
}

// GetUserByID sekarang me-return DTO yang diminta oleh auth handler
// Gunakan alias atau mapping manual
func (s *Service) GetUserByID(ctx context.Context, id uuid.UUID) (*auth.CheckMeUserResponse, error) {
	u, logo, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, nil
	}

	// Mapping data termasuk LogoURL
	return &auth.CheckMeUserResponse{
		ID:       u.ID,
		TenantID: u.TenantID,
		Name:     u.Name,
		Email:    u.Email,
		Role:     u.Role,
		LogoURL:  logo, // Data hasil JOIN tadi
	}, nil
}
