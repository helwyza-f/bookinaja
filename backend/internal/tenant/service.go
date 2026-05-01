package tenant

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"sort"
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
	items, err := s.repo.ListPublicTenants(ctx)
	if err != nil {
		return nil, err
	}
	return s.decorateDiscoveryItems(items), nil
}

func (s *Service) GetPublicDiscoverFeed(ctx context.Context) (*PublicDiscoverFeedResponse, error) {
	items, err := s.ListPublicTenants(ctx)
	if err != nil {
		return nil, err
	}

	categoriesSet := map[string]struct{}{}
	for _, item := range items {
		category := strings.TrimSpace(item.BusinessCategory)
		if category == "" {
			continue
		}
		categoriesSet[category] = struct{}{}
	}

	quickCategories := make([]string, 0, len(categoriesSet))
	for category := range categoriesSet {
		quickCategories = append(quickCategories, category)
	}
	if len(quickCategories) > 6 {
		quickCategories = quickCategories[:6]
	}

	featured := make([]TenantDirectoryItem, 0, minInt(len(items), 4))
	trending := make([]TenantDirectoryItem, 0, minInt(len(items), 6))
	valuePicks := make([]TenantDirectoryItem, 0, minInt(len(items), 6))
	freshFinds := make([]TenantDirectoryItem, 0, minInt(len(items), 6))
	lateNight := make([]TenantDirectoryItem, 0, minInt(len(items), 6))

	for _, item := range items {
		if item.IsFeatured && len(featured) < 4 {
			featured = append(featured, item)
		}
		if item.DiscoveryClicks30d > 0 && len(trending) < 6 {
			trending = append(trending, item)
		}
		if item.StartingPrice > 0 && item.StartingPrice <= 150000 && len(valuePicks) < 6 {
			valuePicks = append(valuePicks, item)
		}
		if item.IsNew && len(freshFinds) < 6 {
			freshFinds = append(freshFinds, item)
		}
		if closesLate(item.CloseTime) && len(lateNight) < 6 {
			lateNight = append(lateNight, item)
		}
	}

	if len(featured) == 0 {
		featured = append(featured, items[:minInt(len(items), 4)]...)
	}
	if len(trending) == 0 {
		trending = append(trending, items[:minInt(len(items), 6)]...)
	}
	if len(valuePicks) == 0 {
		valuePicks = append(valuePicks, items[:minInt(len(items), 6)]...)
	}
	if len(freshFinds) == 0 {
		freshFinds = append(freshFinds, items[:minInt(len(items), 6)]...)
	}
	if len(lateNight) == 0 {
		lateNight = append(lateNight, items[:minInt(len(items), 6)]...)
	}

	return &PublicDiscoverFeedResponse{
		Hero: PublicDiscoveryHero{
			Eyebrow:     "Discovery Marketplace",
			Title:       "Temukan tempat, aktivitas, dan pengalaman berikutnya di Bookinaja.",
			Description: "Feed discovery Bookinaja membantu customer menjelajahi bisnis yang paling relevan, paling aktif, dan paling layak dicoba tanpa berhenti di daftar tenant biasa.",
			SearchHint:  "Cari tempat, kategori, aktivitas, atau suasana yang kamu cari",
		},
		QuickCategories: quickCategories,
		Featured:        featured,
		Sections: []PublicDiscoverySection{
			{
				ID:          "trending-now",
				Title:       "Lagi Ramai Dijelajahi",
				Description: "Bisnis yang sedang paling banyak menarik perhatian customer dalam discovery feed Bookinaja.",
				Style:       "trending",
				Items:       trending,
			},
			{
				ID:          "value-picks",
				Title:       "Mudah Dicoba Duluan",
				Description: "Pilihan dengan titik masuk harga yang lebih ringan tanpa kehilangan kualitas pengalaman.",
				Style:       "value",
				Items:       valuePicks,
			},
			{
				ID:          "fresh-finds",
				Title:       "Tempat Baru yang Layak Dicoba",
				Description: "Bisnis yang masih fresh di marketplace, tapi punya sinyal kualitas dan kesiapan yang bagus untuk dijelajahi lebih awal.",
				Style:       "fresh",
				Items:       freshFinds,
			},
			{
				ID:          "late-night",
				Title:       "Buka Sampai Malam",
				Description: "Cocok buat customer yang mencari slot sore hingga malam dengan waktu yang lebih fleksibel.",
				Style:       "night",
				Items:       lateNight,
			},
		},
	}, nil
}

func (s *Service) TrackDiscoveryEvent(ctx context.Context, req DiscoveryEventReq) error {
	eventType := strings.ToLower(strings.TrimSpace(req.EventType))
	if eventType != "impression" && eventType != "click" {
		return errors.New("event_type tidak valid")
	}

	var tenantRef *Tenant
	var err error
	if rawID := strings.TrimSpace(req.TenantID); rawID != "" {
		tenantUUID, parseErr := uuid.Parse(rawID)
		if parseErr != nil {
			return errors.New("tenant_id tidak valid")
		}
		tenantRef, err = s.repo.GetByID(ctx, tenantUUID)
		if err != nil {
			return err
		}
	} else if slug := strings.TrimSpace(strings.ToLower(req.TenantSlug)); slug != "" {
		tenantRef, err = s.repo.GetBySlug(ctx, slug)
		if err != nil {
			return err
		}
	} else {
		return errors.New("tenant diperlukan")
	}

	if tenantRef == nil {
		return errors.New("tenant tidak ditemukan")
	}

	metadata := req.Metadata
	if len(metadata) == 0 {
		metadata = json.RawMessage(`{}`)
	}

	return s.repo.CreateDiscoveryFeedEvent(ctx, DiscoveryFeedEvent{
		ID:            uuid.New(),
		TenantID:      tenantRef.ID,
		EventType:     eventType,
		Surface:       firstNonEmpty(req.Surface, "discover"),
		SectionID:     strings.TrimSpace(req.SectionID),
		CardVariant:   strings.TrimSpace(req.CardVariant),
		PositionIndex: req.PositionIndex,
		SessionID:     strings.TrimSpace(req.SessionID),
		PromoLabel:    strings.TrimSpace(req.PromoLabel),
		Metadata:      metadata,
		CreatedAt:     time.Now().UTC(),
	})
}

func (s *Service) decorateDiscoveryItems(items []TenantDirectoryItem) []TenantDirectoryItem {
	decorated := make([]TenantDirectoryItem, 0, len(items))
	now := time.Now()

	for _, item := range items {
		entry := item
		promoActive := promoWindowActive(item.PromoStartsAt, item.PromoEndsAt, now)
		entry.DiscoveryHeadline = firstNonEmpty(item.DiscoveryHeadline, buildDiscoveryHeadline(item))
		entry.DiscoverySubheadline = firstNonEmpty(item.DiscoverySubheadline, buildDiscoverySubheadline(item))
		entry.DiscoveryTags = firstStringSlice(item.DiscoveryTags, buildDiscoveryTags(item))
		entry.DiscoveryBadges = firstStringSlice(item.DiscoveryBadges, buildDiscoveryBadges(item))
		entry.IsNew = now.Sub(item.CreatedAt) <= 45*24*time.Hour
		entry.IsPromoted = (item.DiscoveryPromoted && promoActive) || shouldAutoPromote(item)
		entry.IsFeatured = item.DiscoveryFeatured || shouldAutoFeature(item, entry)
		entry.PromoLabel = firstNonEmpty(curatedPromoLabel(item, promoActive), buildPromoLabel(item, entry))
		entry.FeaturedReason = firstNonEmpty(item.HighlightCopy, buildFeaturedReason(item, entry))
		entry.AvailabilityHint = buildAvailabilityHint(item)
		decorated = append(decorated, entry)
	}

	sort.SliceStable(decorated, func(i, j int) bool {
		left := discoveryRank(decorated[i])
		right := discoveryRank(decorated[j])
		if left != right {
			return left > right
		}
		if decorated[i].DiscoveryPriority != decorated[j].DiscoveryPriority {
			return decorated[i].DiscoveryPriority > decorated[j].DiscoveryPriority
		}
		if !decorated[i].CreatedAt.Equal(decorated[j].CreatedAt) {
			return decorated[i].CreatedAt.After(decorated[j].CreatedAt)
		}
		return strings.ToLower(decorated[i].Name) < strings.ToLower(decorated[j].Name)
	})

	return decorated
}

func buildDiscoveryHeadline(item TenantDirectoryItem) string {
	if text := strings.TrimSpace(item.Tagline); text != "" {
		return text
	}
	if text := strings.TrimSpace(item.Slogan); text != "" {
		return text
	}
	category := prettifyLabel(item.BusinessCategory)
	if category == "" {
		category = "tempat baru"
	}
	return fmt.Sprintf("Temukan pengalaman %s yang lebih mudah dipesan.", strings.ToLower(category))
}

func buildDiscoverySubheadline(item TenantDirectoryItem) string {
	parts := []string{}
	if item.TopResourceName != "" {
		parts = append(parts, fmt.Sprintf("Highlight: %s", item.TopResourceName))
	}
	if item.StartingPrice > 0 {
		parts = append(parts, fmt.Sprintf("Mulai dari Rp%.0f", item.StartingPrice))
	}
	if item.ResourceCount > 0 {
		parts = append(parts, fmt.Sprintf("%d pilihan resource", item.ResourceCount))
	}
	if len(parts) == 0 {
		if text := strings.TrimSpace(item.AboutUs); text != "" {
			return text
		}
		return "Jelajahi bisnis ini dan lihat apakah cocok untuk rencana berikutnya."
	}
	return strings.Join(parts, " • ")
}

func buildDiscoveryTags(item TenantDirectoryItem) []string {
	tags := []string{}
	if category := prettifyLabel(item.BusinessCategory); category != "" {
		tags = append(tags, category)
	}
	if businessType := prettifyLabel(item.BusinessType); businessType != "" && !containsIgnoreCase(tags, businessType) {
		tags = append(tags, businessType)
	}
	if item.TopResourceType != "" && !containsIgnoreCase(tags, item.TopResourceType) {
		tags = append(tags, prettifyLabel(item.TopResourceType))
	}
	if item.ResourceCount >= 5 {
		tags = append(tags, "Pilihan Lengkap")
	}
	return tags[:minInt(len(tags), 4)]
}

func buildDiscoveryBadges(item TenantDirectoryItem) []string {
	badges := []string{}
	if item.DiscoveryCtr30d >= 5 && item.DiscoveryClicks30d >= 5 {
		badges = append(badges, "Lagi Ramai")
	}
	if closesLate(item.CloseTime) {
		badges = append(badges, "Buka Sampai Malam")
	}
	if item.ResourceCount >= 4 {
		badges = append(badges, "Banyak Pilihan")
	}
	if item.StartingPrice > 0 && item.StartingPrice <= 100000 {
		badges = append(badges, "Mulai Ramah Budget")
	}
	return badges[:minInt(len(badges), 3)]
}

func buildPromoLabel(item TenantDirectoryItem, entry TenantDirectoryItem) string {
	if item.DiscoveryCtr30d >= 5 && item.DiscoveryClicks30d >= 5 {
		return "Lagi banyak dilihat"
	}
	if entry.IsNew {
		return "Baru di Bookinaja"
	}
	if item.StartingPrice > 0 && item.StartingPrice <= 100000 {
		return "Mulai dari harga ringan"
	}
	if item.ResourceCount >= 5 {
		return "Pilihan resource lengkap"
	}
	return ""
}

func curatedPromoLabel(item TenantDirectoryItem, promoActive bool) string {
	if !promoActive {
		return ""
	}
	if text := strings.TrimSpace(item.PromoLabel); text != "" {
		return text
	}
	if item.DiscoveryPromoted {
		return "Promo aktif"
	}
	return ""
}

func buildFeaturedReason(item TenantDirectoryItem, entry TenantDirectoryItem) string {
	if item.DiscoveryClicks30d >= 5 && item.DiscoveryCtr30d >= 4 {
		return fmt.Sprintf("Sedang menarik perhatian customer dengan CTR %.1f%% dalam 30 hari terakhir.", item.DiscoveryCtr30d)
	}
	if entry.IsNew {
		return "Cocok buat yang suka coba tempat baru lebih awal."
	}
	if item.StartingPrice > 0 && item.ResourceCount > 0 {
		return fmt.Sprintf("Mulai dari Rp%.0f dengan %d pilihan resource.", item.StartingPrice, item.ResourceCount)
	}
	if item.TopResourceName != "" {
		return fmt.Sprintf("Paling cocok kalau kamu ingin langsung cek %s.", item.TopResourceName)
	}
	return "Layak dijelajahi untuk rencana booking berikutnya."
}

func buildAvailabilityHint(item TenantDirectoryItem) string {
	if item.DiscoveryClicks30d >= 5 {
		return "Sedang aktif dijelajahi customer lain di Bookinaja."
	}
	if item.ResourceCount >= 6 {
		return "Lebih banyak pilihan resource untuk dicoba."
	}
	if closesLate(item.CloseTime) {
		return "Cocok untuk booking sore sampai malam."
	}
	if item.StartingPrice > 0 {
		return fmt.Sprintf("Bisa mulai eksplor dari Rp%.0f.", item.StartingPrice)
	}
	return "Lihat detail bisnis untuk tahu apa yang bisa kamu lakukan di sini."
}

func closesLate(closeTime string) bool {
	closeTime = strings.TrimSpace(closeTime)
	if closeTime == "" {
		return false
	}
	parsed, err := time.Parse("15:04", closeTime)
	if err != nil {
		return false
	}
	return parsed.Hour() >= 21
}

func prettifyLabel(value string) string {
	value = strings.TrimSpace(strings.ReplaceAll(value, "_", " "))
	if value == "" {
		return ""
	}
	return strings.Title(strings.ToLower(value))
}

func containsIgnoreCase(values []string, candidate string) bool {
	for _, value := range values {
		if strings.EqualFold(strings.TrimSpace(value), strings.TrimSpace(candidate)) {
			return true
		}
	}
	return false
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
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
		DiscoveryHeadline:              defaultTagline,
		DiscoverySubheadline:           "Temukan pengalaman yang paling cocok untuk rencana berikutnya.",
		DiscoveryTags:                  pq.StringArray{prettifyLabel(req.BusinessCategory)},
		DiscoveryBadges:                pq.StringArray{},
		PromoLabel:                     "Baru di Bookinaja",
		DiscoveryFeatured:              false,
		DiscoveryPromoted:              false,
		DiscoveryPriority:              0,
		PromoStartsAt:                  nil,
		PromoEndsAt:                    nil,
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

func (s *Service) ListReferralFriends(ctx context.Context, id uuid.UUID) ([]ReferralListItem, error) {
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
	req.DiscoveryHeadline = curr.DiscoveryHeadline
	req.DiscoverySubheadline = curr.DiscoverySubheadline
	req.DiscoveryTags = curr.DiscoveryTags
	req.DiscoveryBadges = curr.DiscoveryBadges
	req.PromoLabel = curr.PromoLabel
	req.FeaturedImageURL = curr.FeaturedImageURL
	req.HighlightCopy = curr.HighlightCopy
	req.DiscoveryFeatured = curr.DiscoveryFeatured
	req.DiscoveryPromoted = curr.DiscoveryPromoted
	req.DiscoveryPriority = curr.DiscoveryPriority
	req.PromoStartsAt = curr.PromoStartsAt
	req.PromoEndsAt = curr.PromoEndsAt
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
	req.DiscoveryHeadline = curr.DiscoveryHeadline
	req.DiscoverySubheadline = curr.DiscoverySubheadline
	req.DiscoveryTags = curr.DiscoveryTags
	req.DiscoveryBadges = curr.DiscoveryBadges
	req.PromoLabel = curr.PromoLabel
	req.FeaturedImageURL = curr.FeaturedImageURL
	req.HighlightCopy = curr.HighlightCopy
	req.DiscoveryFeatured = curr.DiscoveryFeatured
	req.DiscoveryPromoted = curr.DiscoveryPromoted
	req.DiscoveryPriority = curr.DiscoveryPriority
	req.PromoStartsAt = curr.PromoStartsAt
	req.PromoEndsAt = curr.PromoEndsAt
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
		if _, allowed := AllowedPermissionKeys[key]; !allowed {
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

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func firstStringSlice(values ...[]string) []string {
	for _, value := range values {
		if len(value) == 0 {
			continue
		}
		out := make([]string, 0, len(value))
		seen := map[string]struct{}{}
		for _, item := range value {
			trimmed := strings.TrimSpace(item)
			if trimmed == "" {
				continue
			}
			if _, exists := seen[trimmed]; exists {
				continue
			}
			seen[trimmed] = struct{}{}
			out = append(out, trimmed)
		}
		if len(out) > 0 {
			return out
		}
	}
	return []string{}
}

func promoWindowActive(start, end *time.Time, now time.Time) bool {
	if start != nil && now.Before(*start) {
		return false
	}
	if end != nil && now.After(*end) {
		return false
	}
	return true
}

func discoveryRank(item TenantDirectoryItem) int {
	score := item.DiscoveryPriority * 80
	score += discoveryBehaviorScore(item)
	score += discoveryQualityScore(item)
	if item.IsFeatured {
		score += 40
	}
	if item.IsPromoted {
		score += 25
	}
	if item.IsNew {
		score += 15
	}
	if item.ResourceCount >= 5 {
		score += 10
	}
	if item.StartingPrice > 0 && item.StartingPrice <= 100000 {
		score += 5
	}
	return score
}

func shouldAutoFeature(item TenantDirectoryItem, entry TenantDirectoryItem) bool {
	return entry.IsNew ||
		entry.IsPromoted ||
		item.ResourceCount >= 5 ||
		(item.DiscoveryClicks30d >= 8 && item.DiscoveryCtr30d >= 4)
}

func shouldAutoPromote(item TenantDirectoryItem) bool {
	return item.StartingPrice > 0 && item.ResourceCount >= 3 ||
		(item.DiscoveryClicks30d >= 6 && item.DiscoveryCtr30d >= 3)
}

func discoveryBehaviorScore(item TenantDirectoryItem) int {
	score := 0
	if item.DiscoveryImpressions30d >= 25 {
		score += 6
	}
	if item.DiscoveryClicks30d >= 5 {
		score += 12
	}
	if item.DiscoveryClicks30d >= 10 {
		score += 8
	}
	if item.DiscoveryCtr30d >= 2 {
		score += 8
	}
	if item.DiscoveryCtr30d >= 5 {
		score += 14
	}
	return score
}

func discoveryQualityScore(item TenantDirectoryItem) int {
	score := 0
	if strings.TrimSpace(item.FeaturedImageURL) != "" || strings.TrimSpace(item.BannerURL) != "" {
		score += 6
	}
	if strings.TrimSpace(item.LogoURL) != "" {
		score += 4
	}
	if len(item.DiscoveryTags) >= 2 {
		score += 4
	}
	if len(item.DiscoveryBadges) >= 1 {
		score += 4
	}
	if item.ResourceCount >= 3 {
		score += 6
	}
	if item.ResourceCount >= 6 {
		score += 6
	}
	if item.StartingPrice > 0 && item.StartingPrice <= 150000 {
		score += 3
	}
	if closesLate(item.CloseTime) {
		score += 3
	}
	return score
}
