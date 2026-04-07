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

// Register menangani pendaftaran tenant baru, admin owner, dan inisialisasi branding
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

	// --- DYNAMIC DEFAULT BRANDING & COPYWRITING ---
	// Data ini yang bakal muncul di pill-pill visual dan hero section
	defaultColor := "#3b82f6"
	defaultTagline := "Professional Booking System"
	defaultSlogan := "Control your branch, grow your business"
	defaultAbout := "Kami menyediakan layanan berkualitas dengan sistem manajemen modern untuk kenyamanan Anda."
	var defaultFeatures pq.StringArray

	switch req.BusinessCategory {
	case "gaming_hub":
		defaultColor = "#2563eb"
		defaultTagline = "The Ultimate Arena for Pro Players"
		defaultSlogan = "Experience Gaming at its Peak"
		defaultAbout = "Pusat gaming dengan spesifikasi PC tertinggi dan koneksi internet stabil. Tempat berkumpulnya komunitas gamers sejati."
		defaultFeatures = pq.StringArray{"RTX 4090 Ready", "Internet 1Gbps", "Pro Peripherals", "240Hz Monitor"}
	case "creative_space":
		defaultColor = "#e11d48"
		defaultTagline = "Studio Creative for Unlimited Ideas"
		defaultAbout = "Ruang estetik dengan pencahayaan profesional dan peralatan lengkap untuk mendukung proses kreatif Anda."
		defaultFeatures = pq.StringArray{"Pro Lighting", "Set Aesthetic", "High-End Camera", "Private Studio"}
	case "sport_center":
		defaultColor = "#10b981"
		defaultTagline = "World Class Sports Facility"
		defaultAbout = "Fasilitas olahraga standar internasional dengan sistem booking yang mudah dan transparan."
		defaultFeatures = pq.StringArray{"Vinyl Court", "Locker Room", "Standard Inter", "Training Gear"}
	case "social_space":
		defaultColor = "#4f46e5"
		defaultTagline = "Elite Space for Collaboration"
		defaultAbout = "Lingkungan produktif yang homey, sangat cocok untuk fokus bekerja atau berdiskusi santai bersama rekan."
		defaultFeatures = pq.StringArray{"Fast Wi-Fi", "Free Coffee", "Focus Zone", "Meeting Room"}
	}

	tenant := Tenant{
		ID:               tID,
		Name:             req.TenantName,
		Slug:             slug,
		BusinessCategory: req.BusinessCategory,
		BusinessType:     req.BusinessType,
		Tagline:          defaultTagline,
		Slogan:           defaultSlogan,
		AboutUs:          defaultAbout,
		Features:         defaultFeatures,
		PrimaryColor:     defaultColor,
		CreatedAt:        time.Now(),
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

	// 3. Simpan Tenant & Admin ke Database
	if err := s.repo.CreateWithAdmin(ctx, tenant, user); err != nil {
		return nil, err
	}

	// 4. Trigger Seeding Template secara Asynchronous
	go s.SeedTemplate(context.Background(), tID, req.BusinessCategory)

	return &tenant, nil
}

// SeedTemplate menyuntikkan data inventori awal (Resources, Items, FnB)
func (s *Service) SeedTemplate(ctx context.Context, tenantID uuid.UUID, category string) {
	file, err := os.ReadFile("internal/tenant/templates.json")
	if err != nil {
		log.Printf("[SEEDER] Gagal membaca file template: %v", err)
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
		} `json:"fnb_catalog"`
	}

	if err := json.Unmarshal(file, &allTemplates); err != nil {
		log.Printf("[SEEDER] Gagal parse JSON template: %v", err)
		return
	}

	tpl, ok := allTemplates[category]
	if !ok {
		log.Printf("[SEEDER] Kategori %s tidak punya template", category)
		return
	}

	emptyMeta := json.RawMessage("{}")

	// Mapping Resources
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
		fnbToSeed = append(fnbToSeed, fnb.Item{
			Name:        f.Name,
			Price:       f.Price,
			Category:    f.Category,
			IsAvailable: true,
		})
	}

	if err := s.repo.SeedTenantData(ctx, tenantID, resourcesToSeed); err != nil {
		log.Printf("[SEEDER] Error seeding resources: %v", err)
	}
	if err := s.repo.SeedFnbData(ctx, tenantID, fnbToSeed); err != nil {
		log.Printf("[SEEDER] Error seeding fnb catalog: %v", err)
	}

	log.Printf("[SEEDER] SUCCESS: Data template disuntikkan untuk tenant %s", tenantID)
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

func (s *Service) Login(ctx context.Context, email, password string) (*LoginResponse, error) {
	u, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if u == nil {
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

func (s *Service) GetPublicLandingData(ctx context.Context, slug string) (map[string]interface{}, error) {
	return s.repo.GetPublicLandingData(ctx, slug)
}