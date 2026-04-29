package tenant

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/auth"
	"github.com/helwiza/backend/internal/fnb"
	"github.com/helwiza/backend/internal/resource"
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

func (s *Service) ListPublicTenants(ctx context.Context) ([]TenantDirectoryItem, error) {
	return s.repo.ListPublicTenants(ctx)
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
	referralCode := generateReferralCode(req.TenantSlug)
	var referredBy *uuid.UUID
	if code := strings.TrimSpace(strings.ToLower(req.ReferralCode)); code != "" {
		if refTenant, err := s.repo.GetByReferralCode(ctx, code); err == nil && refTenant != nil {
			referredBy = &refTenant.ID
		} else {
			return nil, errors.New("kode referral tidak valid")
		}
	}

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
		ReceiptTitle:                   "Struk Bookinaja",
		ReceiptSubtitle:                "Bukti transaksi resmi",
		ReceiptFooter:                  "Terima kasih sudah berkunjung",
		ReceiptWhatsAppText:            "Berikut struk transaksi Anda dari Bookinaja.",
		ReceiptChannel:                 "whatsapp",
		PrinterMode:                    "whatsapp",
		PrinterStatus:                  "disconnected",
		ReferralCode:                   referralCode,
		ReferredByTenantID:             referredBy,
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

func generateReferralCode(slug string) string {
	base := strings.ToUpper(strings.TrimSpace(slug))
	base = strings.ReplaceAll(base, " ", "")
	base = strings.ReplaceAll(base, ".", "")
	base = strings.ReplaceAll(base, "-", "")
	if base == "" {
		base = "BOOK"
	}
	if len(base) > 8 {
		base = base[:8]
	}
	return fmt.Sprintf("%s%s", base, strings.ToUpper(uuid.NewString()[:4]))
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

func (s *Service) GetReceiptSettings(ctx context.Context, id uuid.UUID) (*Tenant, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) GetReferralSummary(ctx context.Context, id uuid.UUID) (map[string]any, error) {
	tenant, err := s.repo.GetByID(ctx, id)
	if err != nil || tenant == nil {
		return nil, errors.New("tenant tidak ditemukan")
	}
	summary, err := s.repo.ReferralSummary(ctx, id)
	if err != nil {
		return nil, err
	}
	summary["referral_code"] = tenant.ReferralCode
	summary["payout_bank_name"] = tenant.PayoutBankName
	summary["payout_account_name"] = tenant.PayoutAccountName
	summary["payout_account_number"] = tenant.PayoutAccountNumber
	summary["payout_whatsapp"] = tenant.PayoutWhatsApp
	return summary, nil
}

func (s *Service) ListReferralFriends(ctx context.Context, id uuid.UUID) ([]Tenant, error) {
	return s.repo.GetReferralChildren(ctx, id)
}

func (s *Service) RequestReferralWithdrawal(ctx context.Context, actorUserID uuid.UUID, tenantID uuid.UUID, amount int64, note string) (*ReferralWithdrawalRequest, error) {
	if amount <= 0 {
		return nil, errors.New("jumlah penarikan harus lebih dari nol")
	}

	tenant, err := s.repo.GetByID(ctx, tenantID)
	if err != nil || tenant == nil {
		return nil, errors.New("tenant tidak ditemukan")
	}
	if strings.TrimSpace(tenant.PayoutBankName) == "" || strings.TrimSpace(tenant.PayoutAccountName) == "" || strings.TrimSpace(tenant.PayoutAccountNumber) == "" || strings.TrimSpace(tenant.PayoutWhatsApp) == "" {
		return nil, errors.New("rekening pencairan belum lengkap")
	}

	summary, err := s.repo.ReferralSummary(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	available := int64(0)
	if raw, ok := summary["available_balance"].(int64); ok {
		available = raw
	}
	if available < amount {
		return nil, errors.New("saldo tersedia tidak mencukupi")
	}

	req := ReferralWithdrawalRequest{
		ID:                uuid.New(),
		TenantID:          tenantID,
		Amount:            amount,
		Status:            "pending",
		RequestedByUserID: &actorUserID,
		Note:              note,
		Metadata:          []byte(`{}`),
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}
	if err := s.repo.RequestReferralWithdrawal(ctx, req); err != nil {
		return nil, err
	}
	return &req, nil
}

func (s *Service) ListReferralWithdrawals(ctx context.Context, tenantID uuid.UUID) ([]ReferralWithdrawalRequest, error) {
	return s.repo.ListReferralWithdrawals(ctx, tenantID)
}

func (s *Service) UpdateReferralPayout(ctx context.Context, actorUserID uuid.UUID, id uuid.UUID, req Tenant) (*Tenant, error) {
	curr, err := s.repo.GetByID(ctx, id)
	if err != nil || curr == nil {
		return nil, errors.New("tenant tidak ditemukan")
	}
	req.ID = id
	req.Slug = curr.Slug
	req.Name = curr.Name
	req.BusinessCategory = curr.BusinessCategory
	req.BusinessType = curr.BusinessType
	req.Plan = curr.Plan
	req.SubscriptionStatus = curr.SubscriptionStatus
	req.SubscriptionCurrentPeriodStart = curr.SubscriptionCurrentPeriodStart
	req.SubscriptionCurrentPeriodEnd = curr.SubscriptionCurrentPeriodEnd
	req.Slogan = curr.Slogan
	req.Tagline = curr.Tagline
	req.AboutUs = curr.AboutUs
	req.Features = curr.Features
	req.PrimaryColor = curr.PrimaryColor
	req.LogoURL = curr.LogoURL
	req.BannerURL = curr.BannerURL
	req.Gallery = curr.Gallery
	req.Address = curr.Address
	req.WhatsappNumber = curr.WhatsappNumber
	req.InstagramURL = curr.InstagramURL
	req.TiktokURL = curr.TiktokURL
	req.MapIframeURL = curr.MapIframeURL
	req.MetaTitle = curr.MetaTitle
	req.MetaDescription = curr.MetaDescription
	req.OpenTime = curr.OpenTime
	req.CloseTime = curr.CloseTime
	req.ReferralCode = curr.ReferralCode
	req.ReferredByTenantID = curr.ReferredByTenantID
	req.ReceiptTitle = curr.ReceiptTitle
	req.ReceiptSubtitle = curr.ReceiptSubtitle
	req.ReceiptFooter = curr.ReceiptFooter
	req.ReceiptWhatsAppText = curr.ReceiptWhatsAppText
	req.ReceiptTemplate = curr.ReceiptTemplate
	req.ReceiptChannel = curr.ReceiptChannel
	req.PrinterEnabled = curr.PrinterEnabled
	req.PrinterName = curr.PrinterName
	req.PrinterMode = curr.PrinterMode
	req.PrinterEndpoint = curr.PrinterEndpoint
	req.PrinterAutoPrint = curr.PrinterAutoPrint
	req.PrinterStatus = curr.PrinterStatus
	req.CreatedAt = curr.CreatedAt
	if err := s.repo.Update(ctx, req); err != nil {
		return nil, err
	}
	_ = s.repo.CreateAuditLog(ctx, AuditLog{
		ID:           uuid.New(),
		TenantID:     id,
		ActorUserID:  &actorUserID,
		Action:       "update_referral_payout",
		ResourceType: "tenant",
		ResourceID:   &id,
		Metadata:     []byte(`{}`),
		CreatedAt:    time.Now().UTC(),
	})
	return &req, nil
}

func (s *Service) UpdateProfile(ctx context.Context, actorUserID uuid.UUID, id uuid.UUID, req Tenant) (*Tenant, error) {
	curr, err := s.repo.GetByID(ctx, id)
	if err != nil || curr == nil {
		return nil, errors.New("tenant tidak ditemukan")
	}

	req.ID = id
	req.Slug = curr.Slug
	req.ReferralCode = curr.ReferralCode
	req.ReferredByTenantID = curr.ReferredByTenantID
	req.PayoutBankName = curr.PayoutBankName
	req.PayoutAccountName = curr.PayoutAccountName
	req.PayoutAccountNumber = curr.PayoutAccountNumber
	req.PayoutWhatsApp = curr.PayoutWhatsApp
	req.CreatedAt = curr.CreatedAt

	if err := s.repo.Update(ctx, req); err != nil {
		return nil, err
	}

	metadata, _ := json.Marshal(map[string]any{
		"tenant_name": req.Name,
		"tenant_slug": req.Slug,
	})
	_ = s.repo.CreateAuditLog(ctx, AuditLog{
		ID:           uuid.New(),
		TenantID:     id,
		ActorUserID:  &actorUserID,
		Action:       "update_business_profile",
		ResourceType: "tenant",
		ResourceID:   &id,
		Metadata:     metadata,
		CreatedAt:    time.Now().UTC(),
	})

	return &req, nil
}

func (s *Service) UpdateReceiptSettings(ctx context.Context, actorUserID uuid.UUID, id uuid.UUID, req Tenant) (*Tenant, error) {
	curr, err := s.repo.GetByID(ctx, id)
	if err != nil || curr == nil {
		return nil, errors.New("tenant tidak ditemukan")
	}

	req.ID = id
	req.Slug = curr.Slug
	req.Name = curr.Name
	req.BusinessCategory = curr.BusinessCategory
	req.BusinessType = curr.BusinessType
	req.Plan = curr.Plan
	req.SubscriptionStatus = curr.SubscriptionStatus
	req.SubscriptionCurrentPeriodStart = curr.SubscriptionCurrentPeriodStart
	req.SubscriptionCurrentPeriodEnd = curr.SubscriptionCurrentPeriodEnd
	req.Slogan = curr.Slogan
	req.Tagline = curr.Tagline
	req.AboutUs = curr.AboutUs
	req.Features = curr.Features
	req.PrimaryColor = curr.PrimaryColor
	req.LogoURL = curr.LogoURL
	req.BannerURL = curr.BannerURL
	req.Gallery = curr.Gallery
	req.Address = curr.Address
	req.WhatsappNumber = curr.WhatsappNumber
	req.InstagramURL = curr.InstagramURL
	req.TiktokURL = curr.TiktokURL
	req.MapIframeURL = curr.MapIframeURL
	req.MetaTitle = curr.MetaTitle
	req.MetaDescription = curr.MetaDescription
	req.OpenTime = curr.OpenTime
	req.CloseTime = curr.CloseTime
	req.ReferralCode = curr.ReferralCode
	req.ReferredByTenantID = curr.ReferredByTenantID
	req.PayoutBankName = curr.PayoutBankName
	req.PayoutAccountName = curr.PayoutAccountName
	req.PayoutAccountNumber = curr.PayoutAccountNumber
	req.PayoutWhatsApp = curr.PayoutWhatsApp
	req.ReceiptTitle = curr.ReceiptTitle
	req.ReceiptSubtitle = curr.ReceiptSubtitle
	req.ReceiptFooter = curr.ReceiptFooter
	req.ReceiptWhatsAppText = curr.ReceiptWhatsAppText
	req.ReceiptTemplate = curr.ReceiptTemplate
	req.ReceiptChannel = curr.ReceiptChannel
	req.PrinterEnabled = curr.PrinterEnabled
	req.PrinterName = curr.PrinterName
	req.PrinterMode = curr.PrinterMode
	req.PrinterEndpoint = curr.PrinterEndpoint
	req.PrinterAutoPrint = curr.PrinterAutoPrint
	req.PrinterStatus = curr.PrinterStatus
	req.CreatedAt = curr.CreatedAt

	if err := s.repo.Update(ctx, req); err != nil {
		return nil, err
	}

	metadata, _ := json.Marshal(map[string]any{
		"receipt_title":      req.ReceiptTitle,
		"printer_enabled":    req.PrinterEnabled,
		"printer_name":       req.PrinterName,
		"printer_mode":       req.PrinterMode,
		"receipt_channel":    req.ReceiptChannel,
		"printer_status":     req.PrinterStatus,
		"printer_auto_print": req.PrinterAutoPrint,
	})
	_ = s.repo.CreateAuditLog(ctx, AuditLog{
		ID:           uuid.New(),
		TenantID:     id,
		ActorUserID:  &actorUserID,
		Action:       "update_receipt_settings",
		ResourceType: "tenant",
		ResourceID:   &id,
		Metadata:     metadata,
		CreatedAt:    time.Now().UTC(),
	})

	return &req, nil
}

func (s *Service) ListStaff(ctx context.Context, tenantID uuid.UUID) ([]User, error) {
	return s.repo.ListUsersByTenant(ctx, tenantID)
}

func (s *Service) ListStaffRoles(ctx context.Context, tenantID uuid.UUID) ([]StaffRole, error) {
	return s.repo.ListStaffRoles(ctx, tenantID)
}

func (s *Service) CreateStaffRole(ctx context.Context, tenantID uuid.UUID, req StaffRoleReq) (*StaffRole, error) {
	role := StaffRole{
		ID:             uuid.New(),
		TenantID:       tenantID,
		Name:           strings.TrimSpace(req.Name),
		Description:    strings.TrimSpace(req.Description),
		PermissionKeys: sanitizePermissions(req.PermissionKeys),
		IsDefault:      req.IsDefault,
	}
	if role.IsDefault {
		_ = s.repo.ClearDefaultRoles(ctx, tenantID)
	}
	return s.repo.CreateStaffRole(ctx, role)
}

func (s *Service) UpdateStaffRole(ctx context.Context, tenantID, roleID uuid.UUID, req StaffRoleReq) (*StaffRole, error) {
	role := StaffRole{
		ID:             roleID,
		TenantID:       tenantID,
		Name:           strings.TrimSpace(req.Name),
		Description:    strings.TrimSpace(req.Description),
		PermissionKeys: sanitizePermissions(req.PermissionKeys),
		IsDefault:      req.IsDefault,
	}
	if role.IsDefault {
		_ = s.repo.ClearDefaultRoles(ctx, tenantID)
	}
	return s.repo.UpdateStaffRole(ctx, role)
}

func (s *Service) DeleteStaffRole(ctx context.Context, tenantID, roleID uuid.UUID) error {
	return s.repo.DeleteStaffRole(ctx, tenantID, roleID)
}

func (s *Service) CreateStaff(ctx context.Context, actorUserID uuid.UUID, tenantID uuid.UUID, req StaffCreateReq) (*User, error) {
	existing, err := s.repo.GetUserByEmail(ctx, strings.TrimSpace(req.Email))
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("email staff sudah terdaftar")
	}
	roleID, err := uuid.Parse(req.RoleID)
	if err != nil {
		return nil, errors.New("role staff tidak valid")
	}
	role, err := s.repo.GetStaffRoleByID(ctx, tenantID, roleID)
	if err != nil {
		return nil, err
	}
	if role == nil {
		return nil, errors.New("role staff tidak ditemukan")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	staff, err := s.repo.CreateStaff(ctx, tenantID, req.Name, req.Email, string(hashed), role.ID)
	if err != nil {
		return nil, err
	}

	metadata, _ := json.Marshal(map[string]any{
		"name":  req.Name,
		"email": req.Email,
		"role":  role.Name,
	})
	_ = s.repo.CreateAuditLog(ctx, AuditLog{
		ID:           uuid.New(),
		TenantID:     tenantID,
		ActorUserID:  &actorUserID,
		Action:       "create_staff",
		ResourceType: "user",
		ResourceID:   &staff.ID,
		Metadata:     metadata,
		CreatedAt:    time.Now().UTC(),
	})

	return staff, nil
}

func (s *Service) UpdateStaff(ctx context.Context, actorUserID uuid.UUID, tenantID, staffID uuid.UUID, req StaffUpdateReq) (*User, error) {
	target, _, err := s.repo.GetUserByID(ctx, staffID)
	if err != nil {
		return nil, err
	}
	if target == nil || target.TenantID != tenantID || target.Role != "staff" {
		return nil, errors.New("pegawai tidak ditemukan")
	}

	var roleID uuid.UUID
	if strings.TrimSpace(req.RoleID) != "" {
		roleID, err = uuid.Parse(req.RoleID)
		if err != nil {
			return nil, errors.New("role staff tidak valid")
		}
		role, err := s.repo.GetStaffRoleByID(ctx, tenantID, roleID)
		if err != nil {
			return nil, err
		}
		if role == nil {
			return nil, errors.New("role staff tidak ditemukan")
		}
	} else if target.RoleID != nil {
		roleID = *target.RoleID
	}

	updated, err := s.repo.UpdateStaff(ctx, tenantID, staffID, roleID, strings.TrimSpace(req.Name), strings.TrimSpace(req.Email))
	if err != nil {
		return nil, err
	}

	role, _ := s.repo.GetStaffRoleByID(ctx, tenantID, roleID)
	metadata, _ := json.Marshal(map[string]any{
		"name":  updated.Name,
		"email": updated.Email,
		"role": func() string {
			if role != nil {
				return role.Name
			}
			return "staff"
		}(),
	})
	_ = s.repo.CreateAuditLog(ctx, AuditLog{
		ID:           uuid.New(),
		TenantID:     tenantID,
		ActorUserID:  &actorUserID,
		Action:       "update_staff",
		ResourceType: "user",
		ResourceID:   &staffID,
		Metadata:     metadata,
		CreatedAt:    time.Now().UTC(),
	})
	return updated, nil
}

func (s *Service) DeleteStaff(ctx context.Context, actorUserID uuid.UUID, tenantID, staffID uuid.UUID) error {
	if actorUserID == staffID {
		return errors.New("akun sendiri tidak bisa dihapus")
	}

	target, _, err := s.repo.GetUserByID(ctx, staffID)
	if err != nil {
		return err
	}
	if target == nil || target.TenantID != tenantID || target.Role != "staff" {
		return errors.New("pegawai tidak ditemukan")
	}

	if err := s.repo.DeleteStaff(ctx, tenantID, staffID); err != nil {
		return err
	}

	metadata, _ := json.Marshal(map[string]any{
		"name":  target.Name,
		"email": target.Email,
		"role":  target.Role,
	})
	_ = s.repo.CreateAuditLog(ctx, AuditLog{
		ID:           uuid.New(),
		TenantID:     tenantID,
		ActorUserID:  &actorUserID,
		Action:       "delete_staff",
		ResourceType: "user",
		ResourceID:   &staffID,
		Metadata:     metadata,
		CreatedAt:    time.Now().UTC(),
	})

	return nil
}

func (s *Service) ListActivity(ctx context.Context, tenantID uuid.UUID, limit int) ([]AuditLogEntry, error) {
	return s.repo.ListAuditLogsByTenant(ctx, tenantID, limit)
}

func (s *Service) GetStaffPermissions(ctx context.Context, tenantID, staffID uuid.UUID) ([]string, error) {
	staff, _, err := s.repo.GetUserByID(ctx, staffID)
	if err != nil || staff == nil || staff.TenantID != tenantID || staff.RoleID == nil {
		return []string{}, err
	}
	role, err := s.repo.GetStaffRoleByID(ctx, tenantID, *staff.RoleID)
	if err != nil || role == nil {
		return []string{}, err
	}
	return []string(role.PermissionKeys), nil
}

func (s *Service) UpdateStaffPermissions(ctx context.Context, tenantID, staffID uuid.UUID, permissions []string) error {
	return errors.New("edit permission langsung tidak didukung; gunakan role")
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

	permissionKeys := []string{}
	if u.RoleID != nil && u.Role == "staff" {
		if role, err := s.repo.GetStaffRoleByID(ctx, u.TenantID, *u.RoleID); err == nil && role != nil {
			permissionKeys = []string(role.PermissionKeys)
		}
	}

	// Mapping data termasuk LogoURL
	return &auth.CheckMeUserResponse{
		ID:             u.ID,
		TenantID:       u.TenantID,
		Name:           u.Name,
		Email:          u.Email,
		Role:           u.Role,
		LogoURL:        logo, // Data hasil JOIN tadi
		PermissionKeys: permissionKeys,
	}, nil
}

func sanitizePermissions(values []string) []string {
	seen := make(map[string]struct{})
	out := make([]string, 0, len(values))
	for _, value := range values {
		key := strings.TrimSpace(value)
		if key == "" {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, key)
	}
	return out
}
