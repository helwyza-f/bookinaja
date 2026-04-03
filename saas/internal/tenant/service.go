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
	"github.com/helwiza/saas/internal/booking"
	"github.com/helwiza/saas/internal/fnb"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo        *Repository
	authService *auth.Service
}

func NewService(r *Repository, authService *auth.Service) *Service {
	return &Service{repo: r, authService: authService}
}

// Register menangani pendaftaran tenant baru dan otomatis menyuntikkan template data
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

	// 2. Hash Password
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.AdminPass), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	tID := uuid.New()
	tenant := Tenant{
		ID:               tID,
		Name:             req.TenantName,
		Slug:             slug,
		BusinessCategory: req.BusinessCategory,
		BusinessType:     req.BusinessType,
		CreatedAt:        time.Now(),
	}

	user := booking.User{
		ID:        uuid.New(),
		TenantID:  tID,
		Name:      req.AdminName,
		Email:     req.AdminEmail,
		Password:  string(hashed),
		Role:      "owner",
		CreatedAt: time.Now(),
	}

	// 3. Simpan Tenant & Admin
	if err := s.repo.CreateWithAdmin(ctx, tenant, user); err != nil {
		return nil, err
	}

	// 4. Trigger Seeding Template secara Asynchronous
	go s.SeedTemplate(context.Background(), tID, req.BusinessCategory)

	return &tenant, nil
}

// SeedTemplate membaca file templates.json dan memasukkan data awal ke database tenant
func (s *Service) SeedTemplate(ctx context.Context, tenantID uuid.UUID, category string) {
	// 1. Baca file templates.json
	file, err := os.ReadFile("internal/tenant/templates.json")
	if err != nil {
		log.Printf("[SEEDER] Gagal membaca file template: %v", err)
		return
	}

	// 2. Struktur parsing JSON disesuaikan dengan format terbaru
	var allTemplates map[string]struct {
		Resources []struct {
			Name     string `json:"name"`
			Category string `json:"category"`
		} `json:"resources"`
		MainItems []struct {
			Name      string  `json:"name"`
			Price     float64 `json:"price"`
			PriceUnit string  `json:"price_unit"`
			IsDefault bool    `json:"is_default"`
		} `json:"main_items"`
		UnitAddons []struct {
			Name      string  `json:"name"`
			Price     float64 `json:"price"`
			PriceUnit string  `json:"price_unit"`
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

	// 3. Mapping Resource & Unit Addons
	var resourcesToSeed []booking.Resource
	for _, r := range tpl.Resources {
		res := booking.Resource{
			Name:     r.Name,
			Category: r.Category,
		}

		// Masukkan Main Items
		for _, mi := range tpl.MainItems {
			res.Items = append(res.Items, booking.ResourceItem{
				Name:         mi.Name,
				PricePerHour: mi.Price,
				PriceUnit:    mi.PriceUnit,
				ItemType:     "console_option",
				IsDefault:    mi.IsDefault,
			})
		}

		// Masukkan Unit Addons (Item yang nempel ke aset)
		for _, ua := range tpl.UnitAddons {
			res.Items = append(res.Items, booking.ResourceItem{
				Name:         ua.Name,
				PricePerHour: ua.Price,
				PriceUnit:    ua.PriceUnit,
				ItemType:     "add_on",
				IsDefault:    false,
			})
		}
		resourcesToSeed = append(resourcesToSeed, res)
	}

	// 4. Mapping F&B Catalog
	var fnbToSeed []fnb.Item
	for _, f := range tpl.FnbCatalog {
		fnbToSeed = append(fnbToSeed, fnb.Item{
			Name:        f.Name,
			Price:       f.Price,
			Category:    f.Category,
			IsAvailable: true,
		})
	}

	// 5. Eksekusi Seeding melalui Repo
	// Seed Data Fisik (Resource & Item)
	if err := s.repo.SeedTenantData(ctx, tenantID, resourcesToSeed); err != nil {
		log.Printf("[SEEDER] Gagal seeding Resource/Items: %v", err)
	}

	// Seed Katalog F&B (Global)
	if err := s.repo.SeedFnbData(ctx, tenantID, fnbToSeed); err != nil {
		log.Printf("[SEEDER] Gagal seeding F&B Catalog: %v", err)
	}

	log.Printf("[SEEDER] Berhasil menyuntikkan template lengkap untuk tenant %s", tenantID)
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
	req.Slug = curr.Slug // Protect slug
	if err := s.repo.Update(ctx, req); err != nil {
		return nil, err
	}
	return &req, nil
}