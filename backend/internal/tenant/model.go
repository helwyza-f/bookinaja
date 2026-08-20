package tenant

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// RegisterReq digunakan untuk pendaftaran tenant baru via Landing Page utama
type RegisterReq struct {
	TenantName       string `json:"tenant_name" binding:"required"`
	TenantSlug       string `json:"tenant_slug" binding:"required"`
	BusinessCategory string `json:"business_category" binding:"required"` // gaming_hub, creative_space, dll
	BusinessType     string `json:"business_type"`
	BootstrapMode    string `json:"bootstrap_mode"`
	ReferralCode     string `json:"referral_code"`
	AdminName        string `json:"admin_name" binding:"required"`
	AdminEmail       string `json:"admin_email" binding:"required,email"`
	AdminPass        string `json:"admin_password" binding:"omitempty,min=6"`
	GoogleIDToken    string `json:"google_id_token"`
	WhatsappNumber   string `json:"whatsapp_number"`
	Timezone         string `json:"timezone"`
}

// LoginReq digunakan untuk autentikasi Admin/Owner ke dashboard
type LoginReq struct {
	Email      string `json:"email" binding:"required,email"`
	Password   string `json:"password" binding:"required"`
	TenantSlug string `json:"tenant_slug"`
}

type LoginGoogleReq struct {
	GoogleIDToken string `json:"id_token" binding:"required"`
	TenantSlug    string `json:"tenant_slug"`
}

type GoogleIdentityReq struct {
	GoogleIDToken string `json:"id_token" binding:"required"`
}

// LoginResponse mengembalikan token akses dan profil singkat user
type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type RegisterResponse struct {
	Token   string `json:"token"`
	User    User   `json:"user"`
	Tenant  Tenant `json:"tenant"`
	IsNew   bool   `json:"is_new"`
	Message string `json:"message"`
}

type GoogleIdentityResponse struct {
	Name          string  `json:"name"`
	Email         string  `json:"email"`
	AvatarURL     *string `json:"avatar_url,omitempty"`
	EmailVerified bool    `json:"email_verified"`
}

// User merepresentasikan entitas pemilik bisnis atau staff
type User struct {
	ID                    uuid.UUID  `db:"id" json:"id"`
	TenantID              uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	RoleID                *uuid.UUID `db:"role_id" json:"role_id,omitempty"`
	Name                  string     `db:"name" json:"name"`
	Email                 string     `db:"email" json:"email"`
	Password              string     `db:"password" json:"-"`
	GoogleSubject         *string    `db:"google_subject" json:"google_subject,omitempty"`
	EmailVerifiedAt       *time.Time `db:"email_verified_at" json:"email_verified_at,omitempty"`
	PasswordSetupRequired bool       `db:"password_setup_required" json:"password_setup_required"`
	DeletedAt             *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
	Role                  string     `db:"role" json:"role"`
	CreatedAt             time.Time  `db:"created_at" json:"created_at"`
}

type OwnerAccountSettingsResponse struct {
	User   OwnerAccountUser      `json:"user"`
	Tenant OwnerAccountTenant    `json:"tenant"`
	Auth   OwnerAccountAuthState `json:"auth"`
}

type OwnerAccountUser struct {
	ID              uuid.UUID  `json:"id"`
	Name            string     `json:"name"`
	Email           string     `json:"email"`
	Role            string     `json:"role"`
	EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty"`
}

type OwnerAccountTenant struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
	Slug string    `json:"slug"`
}

type OwnerAccountAuthState struct {
	GoogleLinked          bool       `json:"google_linked"`
	HasPassword           bool       `json:"has_password"`
	PasswordSetupRequired bool       `json:"password_setup_required"`
	EmailVerified         bool       `json:"email_verified"`
	EmailVerifiedAt       *time.Time `json:"email_verified_at,omitempty"`
}

type OwnerAccountIdentityUpdateReq struct {
	Name  string `json:"name" binding:"required"`
	Email string `json:"email" binding:"required,email"`
}

type OwnerAccountPasswordSetupReq struct {
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

type OwnerAccountPasswordChangeReq struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=6"`
}

type OwnerPasswordResetRequestReq struct {
	Email string `json:"email" binding:"required,email"`
}

type OwnerPasswordResetVerifyReq struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

type OwnerEmailVerificationRequestReq struct {
	Email string `json:"email" binding:"omitempty,email"`
}

type OwnerTokenVerifyReq struct {
	Token string `json:"token" binding:"required"`
}

type OwnerDeleteAccountReq struct {
	ConfirmText     string `json:"confirm_text" binding:"required"`
	CurrentPassword string `json:"current_password"`
}

type OwnerAccountActionResult struct {
	TenantSlug string `json:"tenant_slug"`
	Email      string `json:"email,omitempty"`
	Message    string `json:"message,omitempty"`
}

type StaffCreateReq struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	RoleID   string `json:"role_id" binding:"required"`
}

type StaffUpdateReq struct {
	Name   string `json:"name"`
	Email  string `json:"email" binding:"omitempty,email"`
	RoleID string `json:"role_id"`
}

type StaffRole struct {
	ID             uuid.UUID      `db:"id" json:"id"`
	TenantID       uuid.UUID      `db:"tenant_id" json:"tenant_id"`
	Name           string         `db:"name" json:"name"`
	Description    string         `db:"description" json:"description"`
	PermissionKeys pq.StringArray `db:"permission_keys" json:"permission_keys"`
	IsDefault      bool           `db:"is_default" json:"is_default"`
	CreatedAt      time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time      `db:"updated_at" json:"updated_at"`
}

type StaffRoleReq struct {
	Name           string   `json:"name" binding:"required"`
	Description    string   `json:"description"`
	PermissionKeys []string `json:"permission_keys"`
	IsDefault      bool     `json:"is_default"`
}

type StaffPermissionsReq struct {
	PermissionKeys []string `json:"permission_keys"`
}

type AuditLog struct {
	ID           uuid.UUID       `db:"id" json:"id"`
	TenantID     uuid.UUID       `db:"tenant_id" json:"tenant_id"`
	ActorUserID  *uuid.UUID      `db:"actor_user_id" json:"actor_user_id"`
	Action       string          `db:"action" json:"action"`
	ResourceType string          `db:"resource_type" json:"resource_type"`
	ResourceID   *uuid.UUID      `db:"resource_id" json:"resource_id"`
	Metadata     json.RawMessage `db:"metadata" json:"metadata"`
	CreatedAt    time.Time       `db:"created_at" json:"created_at"`
}

type AuditLogEntry struct {
	ID           uuid.UUID       `db:"id" json:"id"`
	TenantID     uuid.UUID       `db:"tenant_id" json:"tenant_id"`
	ActorUserID  *uuid.UUID      `db:"actor_user_id" json:"actor_user_id"`
	ActorName    string          `db:"actor_name" json:"actor_name"`
	ActorEmail   string          `db:"actor_email" json:"actor_email"`
	Action       string          `db:"action" json:"action"`
	ResourceType string          `db:"resource_type" json:"resource_type"`
	ResourceID   *uuid.UUID      `db:"resource_id" json:"resource_id"`
	Metadata     json.RawMessage `db:"metadata" json:"metadata"`
	CreatedAt    time.Time       `db:"created_at" json:"created_at"`
}

type JSONB []byte

func (j JSONB) Value() (driver.Value, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	if !json.Valid(j) {
		return nil, fmt.Errorf("invalid jsonb payload")
	}
	return []byte(j), nil
}

func (j *JSONB) Scan(src any) error {
	switch value := src.(type) {
	case nil:
		*j = JSONB(`{}`)
		return nil
	case []byte:
		*j = append((*j)[:0], value...)
		return nil
	case string:
		*j = append((*j)[:0], value...)
		return nil
	default:
		return fmt.Errorf("unsupported jsonb source %T", src)
	}
}

func (j JSONB) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte(`{}`), nil
	}
	if json.Valid(j) {
		return j, nil
	}
	return json.Marshal(string(j))
}

func (j *JSONB) UnmarshalJSON(data []byte) error {
	if len(data) == 0 {
		*j = JSONB(`{}`)
		return nil
	}
	if !json.Valid(data) {
		return fmt.Errorf("invalid jsonb payload")
	}
	*j = append((*j)[:0], data...)
	return nil
}

type LandingBuilderSection struct {
	ID      string                 `json:"id"`
	Type    string                 `json:"type"`
	Label   string                 `json:"label"`
	Enabled bool                   `json:"enabled"`
	Variant string                 `json:"variant,omitempty"`
	Props   map[string]interface{} `json:"props,omitempty"`
}

type LandingPageConfig struct {
	Version  int                     `json:"version"`
	Sections []LandingBuilderSection `json:"sections"`
}

type LandingThemeConfig struct {
	Preset       string `json:"preset"`
	PrimaryColor string `json:"primary_color"`
	AccentColor  string `json:"accent_color"`
	SurfaceStyle string `json:"surface_style"`
	FontStyle    string `json:"font_style"`
	RadiusStyle  string `json:"radius_style"`
}

type BookingFormConfig struct {
	CTAButtonLabel   string `json:"cta_button_label"`
	StickyMobileCTA  bool   `json:"sticky_mobile_cta"`
	ShowWhatsappHelp bool   `json:"show_whatsapp_help"`
	WhatsappLabel    string `json:"whatsapp_label"`
}

type BookingControllerFeatures struct {
	EnableFnb    bool `json:"enable_fnb"`
	EnableAddons bool `json:"enable_addons"`
}

type TenantPaymentMethod struct {
	ID               uuid.UUID `db:"id" json:"id"`
	TenantID         uuid.UUID `db:"tenant_id" json:"tenant_id"`
	Code             string    `db:"code" json:"code"`
	DisplayName      string    `db:"display_name" json:"display_name"`
	Category         string    `db:"category" json:"category"`
	VerificationType string    `db:"verification_type" json:"verification_type"`
	Provider         string    `db:"provider" json:"provider"`
	Instructions     string    `db:"instructions" json:"instructions"`
	IsActive         bool      `db:"is_active" json:"is_active"`
	SortOrder        int       `db:"sort_order" json:"sort_order"`
	Metadata         JSONB     `db:"metadata" json:"metadata"`
	CreatedAt        time.Time `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time `db:"updated_at" json:"updated_at"`
}

type TenantPaymentMethodMeta struct {
	BankName      string `json:"bank_name,omitempty"`
	AccountName   string `json:"account_name,omitempty"`
	AccountNumber string `json:"account_number,omitempty"`
	QRImageURL    string `json:"qr_image_url,omitempty"`
	FooterNote    string `json:"footer_note,omitempty"`
}

type TenantPaymentMethodInput struct {
	Code             string                 `json:"code"`
	DisplayName      string                 `json:"display_name"`
	Category         string                 `json:"category"`
	VerificationType string                 `json:"verification_type"`
	Provider         string                 `json:"provider"`
	Instructions     string                 `json:"instructions"`
	IsActive         bool                   `json:"is_active"`
	SortOrder        int                    `json:"sort_order"`
	Metadata         map[string]interface{} `json:"metadata"`
}

type TenantPaymentMethodUpdateReq struct {
	Items []TenantPaymentMethodInput `json:"items" binding:"required"`
}

// Mode pembayaran yang tersedia untuk booking.
const (
	PaymentModePartial = "partial" // DP sebagian di awal
	PaymentModeNone    = "none"    // tanpa DP, bayar di tempat
	PaymentModeFull    = "full"    // bayar lunas di awal
)

// NormalizePaymentMode memetakan input mode + persen menjadi triple
// (mode, dpEnabled, dpPercentage) yang konsisten. dp_enabled & dp_percentage
// tetap dijaga sinkron demi kompatibilitas jalur lama.
func NormalizePaymentMode(mode string, dpEnabled bool, percentage float64) (string, bool, float64) {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case PaymentModeNone:
		return PaymentModeNone, false, 0
	case PaymentModeFull:
		return PaymentModeFull, true, 100
	case PaymentModePartial:
		if percentage <= 0 {
			percentage = 40
		}
		if percentage >= 100 {
			percentage = 100
		}
		return PaymentModePartial, true, percentage
	}
	// Fallback: turunkan dari knob lama bila mode kosong/tidak dikenal.
	if !dpEnabled {
		return PaymentModeNone, false, 0
	}
	if percentage >= 100 {
		return PaymentModeFull, true, 100
	}
	if percentage <= 0 {
		percentage = 40
	}
	return PaymentModePartial, true, percentage
}

type TenantDepositSetting struct {
	TenantID        uuid.UUID                 `db:"tenant_id" json:"tenant_id"`
	PaymentMode     string                    `db:"payment_mode" json:"payment_mode"`
	DPEnabled       bool                      `db:"dp_enabled" json:"dp_enabled"`
	DPPercentage    float64                   `db:"dp_percentage" json:"dp_percentage"`
	CreatedAt       time.Time                 `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time                 `db:"updated_at" json:"updated_at"`
	ResourceConfigs []ResourceDepositOverride `json:"resource_configs,omitempty"`
}

type ResourceDepositOverride struct {
	ID           uuid.UUID `db:"id" json:"id"`
	TenantID     uuid.UUID `db:"tenant_id" json:"tenant_id"`
	ResourceID   uuid.UUID `db:"resource_id" json:"resource_id"`
	ResourceName string    `db:"resource_name" json:"resource_name"`
	OverrideDP   bool      `db:"override_dp" json:"override_dp"`
	PaymentMode  string    `db:"payment_mode" json:"payment_mode"`
	DPEnabled    bool      `db:"dp_enabled" json:"dp_enabled"`
	DPPercentage float64   `db:"dp_percentage" json:"dp_percentage"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time `db:"updated_at" json:"updated_at"`
}

type ResourceDepositOverrideInput struct {
	ResourceID   string  `json:"resource_id"`
	OverrideDP   bool    `json:"override_dp"`
	PaymentMode  string  `json:"payment_mode"`
	DPEnabled    bool    `json:"dp_enabled"`
	DPPercentage float64 `json:"dp_percentage"`
}

type TenantDepositSettingUpdateReq struct {
	PaymentMode     string                         `json:"payment_mode"`
	DPEnabled       bool                           `json:"dp_enabled"`
	DPPercentage    float64                        `json:"dp_percentage"`
	ResourceConfigs []ResourceDepositOverrideInput `json:"resource_configs"`
}

// TenantCancellationSetting menyimpan kebijakan pembatalan per tenant.
type TenantCancellationSetting struct {
	TenantID              uuid.UUID `db:"tenant_id" json:"tenant_id"`
	CustomerCancelEnabled bool      `db:"customer_cancel_enabled" json:"customer_cancel_enabled"`
	CutoffHours           int       `db:"cutoff_hours" json:"cutoff_hours"`
	RefundMode            string    `db:"refund_mode" json:"refund_mode"` // forfeit | full
	RequireReason         bool      `db:"require_reason" json:"require_reason"`
	AllowedStatuses       string    `db:"allowed_statuses" json:"allowed_statuses"` // comma-separated
	CreatedAt             time.Time `db:"created_at" json:"created_at"`
	UpdatedAt             time.Time `db:"updated_at" json:"updated_at"`
}

type TenantCancellationSettingUpdateReq struct {
	CustomerCancelEnabled bool   `json:"customer_cancel_enabled"`
	CutoffHours           int    `json:"cutoff_hours"`
	RefundMode            string `json:"refund_mode"`
	RequireReason         bool   `json:"require_reason"`
	AllowedStatuses       string `json:"allowed_statuses"`
}

type PageBuilderState struct {
	Profile       *Tenant            `json:"profile"`
	Page          LandingPageConfig  `json:"page"`
	Theme         LandingThemeConfig `json:"theme"`
	BookingForm   BookingFormConfig  `json:"booking_form"`
	PreviewURL    string             `json:"preview_url"`
	PreviewMobile bool               `json:"preview_mobile"`
}

type AdminBootstrapUser struct {
	ID                    uuid.UUID  `json:"id"`
	Name                  string     `json:"name"`
	Email                 string     `json:"email"`
	Role                  string     `json:"role"`
	PermissionKeys        []string   `json:"permission_keys"`
	EmailVerifiedAt       *time.Time `json:"email_verified_at,omitempty"`
	PasswordSetupRequired bool       `json:"password_setup_required"`
	GoogleLinked          bool       `json:"google_linked"`
}

type AdminBootstrapTenant struct {
	ID               uuid.UUID  `json:"id"`
	Name             string     `json:"name"`
	Slug             string     `json:"slug"`
	LogoURL          string     `json:"logo_url"`
	BusinessCategory string     `json:"business_category"`
	Plan             string     `json:"plan"`
	Status           string     `json:"status"`
	PeriodEnd        *time.Time `json:"period_end,omitempty"`
	// GraceActive: langganan non-aktif (trial habis / belum bayar) → tenant
	// masuk mode grace (boleh transaksi, tak boleh buat item baru). CanCreate =
	// kebalikannya; dipakai klien utk banner upgrade & menonaktifkan tombol
	// "＋ Buat". Selaras dgn middleware RequireActiveSubscription.
	GraceActive bool `json:"grace_active"`
	CanCreate   bool `json:"can_create"`
	// Eskalasi grace berbasis WAKTU (lihat access.GracePhase):
	//   GracePhase: 0 aktif | 1 soft (katalog beku, fitur penuh) | 2 friksi
	//     (convenience dicabut, interstitial) | 3 lock (transaksi baru dikunci)
	//   GraceDays: umur grace dalam hari sejak langganan lewat
	//   GraceFrictionDay / GraceLockDay: ambang hari (utk hitung mundur klien)
	//   TransactionsAllowed: boleh buat transaksi/booking/order baru (false di lock)
	GracePhase          int  `json:"grace_phase"`
	GraceDays           int  `json:"grace_days"`
	GraceFrictionDay    int  `json:"grace_friction_day"`
	GraceLockDay        int  `json:"grace_lock_day"`
	TransactionsAllowed bool `json:"transactions_allowed"`
}

type AdminBootstrapFeatures struct {
	EnableDiscoveryPosts bool                `json:"enable_discovery_posts"`
	PlanFeatures         []string            `json:"plan_features,omitempty"`
	PlanFeatureMatrix    map[string][]string `json:"plan_feature_matrix,omitempty"`
	// Mode Aplikasi (gating booking/kasir di mobile admin):
	//   AppMode: booking_pos | booking_only | pos_only
	//   PosStandalone:     kasir walk-in/customer (Kasir A) aktif
	//   PosOnSession:      F&B nempel ke sesi booking aktif
	//   PosAddonOnSession: Add-on/layanan nempel ke sesi booking aktif
	// FnbMode dipertahankan untuk kompat klien mobile lama.
	AppMode           string `json:"app_mode"`
	PosStandalone     bool   `json:"pos_standalone"`
	PosOnSession      bool   `json:"pos_on_session"`
	PosAddonOnSession bool   `json:"pos_addon_on_session"`
	FnbMode           string `json:"fnb_mode"`
}

type AdminBootstrapResponse struct {
	User         AdminBootstrapUser     `json:"user"`
	Tenant       AdminBootstrapTenant   `json:"tenant"`
	Features     AdminBootstrapFeatures `json:"features"`
	SessionToken string                 `json:"session_token,omitempty"`
}

type TenantIdentity struct {
	ID               uuid.UUID `db:"id" json:"id"`
	Name             string    `db:"name" json:"name"`
	Slug             string    `db:"slug" json:"slug"`
	BusinessCategory string    `db:"business_category" json:"business_category"`
	BusinessType     string    `db:"business_type" json:"business_type"`
	Tagline          string    `db:"tagline" json:"tagline"`
	Slogan           string    `db:"slogan" json:"slogan"`
	AboutUs          string    `db:"about_us" json:"about_us"`
	LogoURL          string    `db:"logo_url" json:"logo_url"`
	BannerURL        string    `db:"banner_url" json:"banner_url"`
	WhatsappNumber   string    `db:"whatsapp_number" json:"whatsapp_number"`
	Address          string    `db:"address" json:"address"`
	InstagramURL     string    `db:"instagram_url" json:"instagram_url"`
	TiktokURL        string    `db:"tiktok_url" json:"tiktok_url"`
	OpenTime         string    `db:"open_time" json:"open_time"`
	CloseTime        string    `db:"close_time" json:"close_time"`
	Timezone         string    `db:"timezone" json:"timezone"`
}

type TenantDiscoveryProfileSettings struct {
	DiscoveryHeadline    string         `db:"discovery_headline" json:"discovery_headline"`
	DiscoverySubheadline string         `db:"discovery_subheadline" json:"discovery_subheadline"`
	DiscoveryTags        pq.StringArray `db:"discovery_tags" json:"discovery_tags"`
	DiscoveryBadges      pq.StringArray `db:"discovery_badges" json:"discovery_badges"`
	PromoLabel           string         `db:"promo_label" json:"promo_label"`
	FeaturedImageURL     string         `db:"featured_image_url" json:"featured_image_url"`
	HighlightCopy        string         `db:"highlight_copy" json:"highlight_copy"`
	DiscoveryFeatured    bool           `db:"discovery_featured" json:"discovery_featured"`
	DiscoveryPromoted    bool           `db:"discovery_promoted" json:"discovery_promoted"`
	DiscoveryPriority    int            `db:"discovery_priority" json:"discovery_priority"`
	PromoStartsAt        *time.Time     `db:"promo_starts_at" json:"promo_starts_at"`
	PromoEndsAt          *time.Time     `db:"promo_ends_at" json:"promo_ends_at"`
}

type TenantReferralPayoutSettings struct {
	ReferralCode        string `db:"referral_code" json:"referral_code"`
	PayoutBankName      string `db:"payout_bank_name" json:"payout_bank_name"`
	PayoutAccountName   string `db:"payout_account_name" json:"payout_account_name"`
	PayoutAccountNumber string `db:"payout_account_number" json:"payout_account_number"`
	PayoutWhatsApp      string `db:"payout_whatsapp" json:"payout_whatsapp"`
}

type TenantOnboardingStep struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Href        string `json:"href"`
	Complete    bool   `json:"complete"`
	Required    bool   `json:"required"`
}

type TenantOnboardingSummary struct {
	HasBusinessIdentity bool                   `json:"has_business_identity"`
	HasBusinessContact  bool                   `json:"has_business_contact"`
	HasVisualIdentity   bool                   `json:"has_visual_identity"`
	ResourcesCount      int                    `json:"resources_count"`
	PricePackagesCount  int                    `json:"price_packages_count"`
	PaymentReady        bool                   `json:"payment_ready"`
	ProgressPercent     int                    `json:"progress_percent"`
	Steps               []TenantOnboardingStep `json:"steps"`
	// Gerbang publikasi: IsPublished = tenant sudah tampil ke customer;
	// CanPublish = semua langkah WAJIB terpenuhi (boleh menekan "Terbitkan").
	IsPublished bool `json:"is_published"`
	CanPublish  bool `json:"can_publish"`
}

// Tenant adalah jantung dari sistem Multi-Tenant lo, menyimpan data branding dan konfigurasi publik
type Tenant struct {
	ID               uuid.UUID `db:"id" json:"id"`
	Name             string    `db:"name" json:"name"`
	Slug             string    `db:"slug" json:"slug"`
	BusinessCategory string    `db:"business_category" json:"business_category"`
	BusinessType     string    `db:"business_type" json:"business_type"`

	// --- SUBSCRIPTION (SaaS Billing) ---
	Plan               string   `db:"plan" json:"plan"`
	SubscriptionStatus string   `db:"subscription_status" json:"subscription_status"`
	PlanFeatures       []string `db:"-" json:"plan_features,omitempty"`
	// Tambahkan ini untuk mempermudah handling di internal logic
	Status                         string     `db:"status" json:"status,omitempty"`
	SubscriptionCurrentPeriodStart *time.Time `db:"subscription_current_period_start" json:"subscription_current_period_start"`
	SubscriptionCurrentPeriodEnd   *time.Time `db:"subscription_current_period_end" json:"subscription_current_period_end"`

	// --- CONTENT & COPYWRITING ---
	Slogan   string         `db:"slogan" json:"slogan"`     // Teks kecil di bawah logo/nama
	Tagline  string         `db:"tagline" json:"tagline"`   // Judul BESAR di Hero Section
	AboutUs  string         `db:"about_us" json:"about_us"` // Deskripsi panjang (Copywriting)
	Features pq.StringArray `db:"features" json:"features"` // List keunggulan (RTX 4090, 1Gbps, dll)

	// --- VISUAL CONFIG ---
	PrimaryColor string         `db:"primary_color" json:"primary_color"`
	LogoURL      string         `db:"logo_url" json:"logo_url"`
	BannerURL    string         `db:"banner_url" json:"banner_url"`
	Gallery      pq.StringArray `db:"gallery" json:"gallery"`

	// --- CONTACT & SOCIAL MEDIA ---
	Address        string `db:"address" json:"address"`
	WhatsappNumber string `db:"whatsapp_number" json:"whatsapp_number"`
	InstagramURL   string `db:"instagram_url" json:"instagram_url"`
	TiktokURL      string `db:"tiktok_url" json:"tiktok_url"`
	MapIframeURL   string `db:"map_iframe_url" json:"map_iframe_url"`

	// --- SEO METADATA ---
	MetaTitle       string `db:"meta_title" json:"meta_title"`
	MetaDescription string `db:"meta_description" json:"meta_description"`

	// --- LANDING PAGE BUILDER ---
	LandingPageConfig  JSONB `db:"landing_page_config" json:"landing_page_config"`
	LandingThemeConfig JSONB `db:"landing_theme_config" json:"landing_theme_config"`
	BookingFormConfig  JSONB `db:"booking_form_config" json:"booking_form_config"`

	// --- CUSTOMER DISCOVERY FEED ---
	DiscoveryHeadline    string         `db:"discovery_headline" json:"discovery_headline"`
	DiscoverySubheadline string         `db:"discovery_subheadline" json:"discovery_subheadline"`
	DiscoveryTags        pq.StringArray `db:"discovery_tags" json:"discovery_tags"`
	DiscoveryBadges      pq.StringArray `db:"discovery_badges" json:"discovery_badges"`
	PromoLabel           string         `db:"promo_label" json:"promo_label"`
	FeaturedImageURL     string         `db:"featured_image_url" json:"featured_image_url"`
	HighlightCopy        string         `db:"highlight_copy" json:"highlight_copy"`
	DiscoveryFeatured    bool           `db:"discovery_featured" json:"discovery_featured"`
	DiscoveryPromoted    bool           `db:"discovery_promoted" json:"discovery_promoted"`
	DiscoveryPriority    int            `db:"discovery_priority" json:"discovery_priority"`
	PromoStartsAt        *time.Time     `db:"promo_starts_at" json:"promo_starts_at"`
	PromoEndsAt          *time.Time     `db:"promo_ends_at" json:"promo_ends_at"`

	// --- OPERATIONAL ---
	OpenTime  string `db:"open_time" json:"open_time"`
	CloseTime string `db:"close_time" json:"close_time"`
	Timezone  string `db:"timezone" json:"timezone"`

	// --- RECEIPT & PRINTER SETTINGS ---
	ReceiptTitle        string     `db:"receipt_title" json:"receipt_title"`
	ReceiptSubtitle     string     `db:"receipt_subtitle" json:"receipt_subtitle"`
	ReceiptFooter       string     `db:"receipt_footer" json:"receipt_footer"`
	ReceiptWhatsAppText string     `db:"receipt_whatsapp_text" json:"receipt_whatsapp_text"`
	ReceiptTemplate     string     `db:"receipt_template" json:"receipt_template"`
	ReceiptChannel      string     `db:"receipt_channel" json:"receipt_channel"`
	PrinterEnabled      bool       `db:"printer_enabled" json:"printer_enabled"`
	PrinterName         string     `db:"printer_name" json:"printer_name"`
	PrinterMode         string     `db:"printer_mode" json:"printer_mode"`
	PrinterEndpoint     string     `db:"printer_endpoint" json:"printer_endpoint"`
	PrinterAutoPrint    bool       `db:"printer_auto_print" json:"printer_auto_print"`
	PrinterStatus       string     `db:"printer_status" json:"printer_status"`
	ReferralCode        string     `db:"referral_code" json:"referral_code"`
	ReferredByTenantID  *uuid.UUID `db:"referred_by_tenant_id" json:"referred_by_tenant_id,omitempty"`
	PayoutBankName      string     `db:"payout_bank_name" json:"payout_bank_name"`
	PayoutAccountName   string     `db:"payout_account_name" json:"payout_account_name"`
	PayoutAccountNumber string     `db:"payout_account_number" json:"payout_account_number"`
	PayoutWhatsApp      string     `db:"payout_whatsapp" json:"payout_whatsapp"`

	PaymentSetupSnoozedAt *time.Time `db:"payment_setup_snoozed_at" json:"payment_setup_snoozed_at,omitempty"`

	// Gerbang publikasi (migration 000066). WAJIB dipetakan: GetByID memakai
	// `SELECT * FROM tenants` dan sqlx berjalan mode aman — kolom tanpa field
	// tujuan membuat seluruh scan gagal ("missing destination name is_published").
	IsPublished bool `db:"is_published" json:"is_published"`

	CreatedAt time.Time `db:"created_at" json:"created_at"`
	// WAJIB dipetakan sejak migrasi 000067 menambah kolomnya — `SELECT *` +
	// sqlx mode aman: kolom tanpa field tujuan menggagalkan seluruh scan.
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

type PublicTenantProfile struct {
	ID                 uuid.UUID      `db:"id" json:"id"`
	Name               string         `db:"name" json:"name"`
	Slug               string         `db:"slug" json:"slug"`
	IsPublished        bool           `db:"is_published" json:"is_published"`
	OwnerEmail         string         `db:"owner_email" json:"owner_email"`
	BusinessCategory   string         `db:"business_category" json:"business_category"`
	BusinessType       string         `db:"business_type" json:"business_type"`
	Slogan             string         `db:"slogan" json:"slogan"`
	Tagline            string         `db:"tagline" json:"tagline"`
	AboutUs            string         `db:"about_us" json:"about_us"`
	Features           pq.StringArray `db:"features" json:"features"`
	PrimaryColor       string         `db:"primary_color" json:"primary_color"`
	LogoURL            string         `db:"logo_url" json:"logo_url"`
	BannerURL          string         `db:"banner_url" json:"banner_url"`
	Gallery            pq.StringArray `db:"gallery" json:"gallery"`
	Address            string         `db:"address" json:"address"`
	WhatsappNumber     string         `db:"whatsapp_number" json:"whatsapp_number"`
	InstagramURL       string         `db:"instagram_url" json:"instagram_url"`
	TiktokURL          string         `db:"tiktok_url" json:"tiktok_url"`
	MapIframeURL       string         `db:"map_iframe_url" json:"map_iframe_url"`
	MetaTitle          string         `db:"meta_title" json:"meta_title"`
	MetaDescription    string         `db:"meta_description" json:"meta_description"`
	LandingPageConfig  JSONB          `db:"landing_page_config" json:"landing_page_config"`
	LandingThemeConfig JSONB          `db:"landing_theme_config" json:"landing_theme_config"`
	BookingFormConfig  JSONB          `db:"booking_form_config" json:"booking_form_config"`
	OpenTime           string         `db:"open_time" json:"open_time"`
	CloseTime          string         `db:"close_time" json:"close_time"`
	Timezone           string         `db:"timezone" json:"timezone"`
}

func DefaultLandingPageConfig() LandingPageConfig {
	return LandingPageConfig{
		Version: 1,
		Sections: []LandingBuilderSection{
			{ID: "hero", Type: "hero", Label: "Hero", Enabled: true, Variant: "immersive"},
			{ID: "highlights", Type: "highlights", Label: "Keunggulan", Enabled: true, Variant: "pills"},
			{ID: "catalog", Type: "catalog", Label: "Katalog", Enabled: true, Variant: "cards"},
			{ID: "gallery", Type: "gallery", Label: "Galeri", Enabled: true, Variant: "bento"},
			{ID: "testimonials", Type: "testimonials", Label: "Testimoni", Enabled: false, Variant: "cards", Props: map[string]interface{}{
				"items": []map[string]interface{}{
					{"name": "Customer pertama", "quote": "Pelayanan cepat dan proses booking mudah."},
					{"name": "Customer kedua", "quote": "Tempatnya rapi dan cocok untuk booking ulang."},
				},
			}},
			{ID: "faq", Type: "faq", Label: "FAQ", Enabled: false, Variant: "accordion", Props: map[string]interface{}{
				"items": []map[string]interface{}{
					{"question": "Bagaimana cara booking?", "answer": "Pilih resource, tentukan jadwal, lalu lanjutkan checkout."},
					{"question": "Apakah bisa hubungi WhatsApp?", "answer": "Bisa. Tombol WhatsApp akan tampil jika nomor bisnis sudah diisi."},
				},
			}},
			{ID: "about", Type: "about", Label: "Tentang Bisnis", Enabled: true, Variant: "split"},
		},
	}
}

func DefaultLandingThemeConfig(primary string) LandingThemeConfig {
	if primary == "" {
		primary = "#3b82f6"
	}
	return LandingThemeConfig{
		Preset:       "bookinaja-classic",
		PrimaryColor: primary,
		AccentColor:  "#0f1f4a",
		SurfaceStyle: "soft",
		FontStyle:    "bold",
		RadiusStyle:  "rounded",
	}
}

func DefaultBookingFormConfig() BookingFormConfig {
	return BookingFormConfig{
		CTAButtonLabel:   "Cek Ketersediaan",
		StickyMobileCTA:  true,
		ShowWhatsappHelp: true,
		WhatsappLabel:    "Butuh bantuan cepat? Chat WhatsApp",
	}
}

func DefaultBookingControllerFeatures() BookingControllerFeatures {
	return BookingControllerFeatures{
		EnableFnb:    true,
		EnableAddons: true,
	}
}

func DefaultBookingFormConfigJSON() JSONB {
	payload, _ := json.Marshal(map[string]any{
		"cta_button_label":   DefaultBookingFormConfig().CTAButtonLabel,
		"sticky_mobile_cta":  DefaultBookingFormConfig().StickyMobileCTA,
		"show_whatsapp_help": DefaultBookingFormConfig().ShowWhatsappHelp,
		"whatsapp_label":     DefaultBookingFormConfig().WhatsappLabel,
		"controller_features": map[string]any{
			"enable_fnb":    true,
			"enable_addons": true,
		},
	})
	return JSONB(payload)
}

func MergeBookingFormConfigJSON(current, incoming JSONB) JSONB {
	base := map[string]any{}
	_ = json.Unmarshal(DefaultBookingFormConfigJSON(), &base)

	merge := func(raw JSONB) {
		if len(raw) == 0 || string(raw) == "{}" {
			return
		}
		var patch map[string]any
		if err := json.Unmarshal(raw, &patch); err != nil {
			return
		}
		mergeMaps(base, patch)
	}

	merge(current)
	merge(incoming)

	controllerFeatures, _ := base["controller_features"].(map[string]any)
	if controllerFeatures == nil {
		controllerFeatures = map[string]any{}
	}
	if _, ok := controllerFeatures["enable_fnb"]; !ok {
		controllerFeatures["enable_fnb"] = true
	}
	if _, ok := controllerFeatures["enable_addons"]; !ok {
		controllerFeatures["enable_addons"] = true
	}
	base["controller_features"] = controllerFeatures

	payload, err := json.Marshal(base)
	if err != nil {
		return DefaultBookingFormConfigJSON()
	}
	return JSONB(payload)
}

func ExtractBookingControllerFeatures(raw JSONB) BookingControllerFeatures {
	features := DefaultBookingControllerFeatures()
	if len(raw) == 0 || string(raw) == "{}" {
		return features
	}

	var payload struct {
		ControllerFeatures struct {
			EnableFnb    *bool `json:"enable_fnb"`
			EnableAddons *bool `json:"enable_addons"`
		} `json:"controller_features"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return features
	}
	if payload.ControllerFeatures.EnableFnb != nil {
		features.EnableFnb = *payload.ControllerFeatures.EnableFnb
	}
	if payload.ControllerFeatures.EnableAddons != nil {
		features.EnableAddons = *payload.ControllerFeatures.EnableAddons
	}
	return features
}

func mergeMaps(dst, src map[string]any) {
	for key, value := range src {
		if valueMap, ok := value.(map[string]any); ok {
			dstMap, dstOK := dst[key].(map[string]any)
			if !dstOK || dstMap == nil {
				dstMap = map[string]any{}
			}
			mergeMaps(dstMap, valueMap)
			dst[key] = dstMap
			continue
		}
		dst[key] = value
	}
}

func cloneLandingBuilderSection(section LandingBuilderSection) LandingBuilderSection {
	cloned := section
	if section.Props != nil {
		cloned.Props = make(map[string]interface{}, len(section.Props))
		for key, value := range section.Props {
			cloned.Props[key] = value
		}
	}
	return cloned
}

func NormalizeLandingPageConfig(input LandingPageConfig) LandingPageConfig {
	defaultConfig := DefaultLandingPageConfig()
	defaultSections := make([]LandingBuilderSection, 0, len(defaultConfig.Sections))
	defaultsByID := make(map[string]LandingBuilderSection, len(defaultConfig.Sections))
	for _, section := range defaultConfig.Sections {
		cloned := cloneLandingBuilderSection(section)
		defaultSections = append(defaultSections, cloned)
		defaultsByID[section.ID] = cloned
	}

	if input.Version == 0 {
		input.Version = defaultConfig.Version
	}
	if len(input.Sections) == 0 {
		input.Sections = defaultSections
		return input
	}

	// Pertahankan urutan tersimpan (input) supaya hasil reorder milik owner
	// tidak dipaksa balik ke urutan default. Default hanya mengisi field yang
	// hilang, bukan menentukan urutan.
	merged := make([]LandingBuilderSection, 0, len(input.Sections)+len(defaultSections))
	usedIDs := make(map[string]bool, len(input.Sections))
	for _, section := range input.Sections {
		if strings.TrimSpace(section.ID) == "" {
			continue
		}
		// Section yang sudah dipensiunkan dari landing tidak dipertahankan.
		if section.Type == "contact" || section.Type == "booking_form" {
			continue
		}
		usedIDs[section.ID] = true

		defaultSection, exists := defaultsByID[section.ID]
		if !exists {
			// Section custom milik tenant.
			if section.Props == nil {
				section.Props = map[string]interface{}{}
			}
			merged = append(merged, section)
			continue
		}

		props := map[string]interface{}{}
		for key, value := range defaultSection.Props {
			props[key] = value
		}
		for key, value := range section.Props {
			props[key] = value
		}

		merged = append(merged, LandingBuilderSection{
			ID:      defaultSection.ID,
			Type:    firstNonEmptyBuilderString(section.Type, defaultSection.Type),
			Label:   firstNonEmptyBuilderString(section.Label, defaultSection.Label),
			Enabled: section.Enabled,
			Variant: firstNonEmptyBuilderString(section.Variant, defaultSection.Variant),
			Props:   props,
		})
	}

	// Default yang belum pernah tersimpan (mis. section baru) ditempel di akhir.
	for _, defaultSection := range defaultSections {
		if !usedIDs[defaultSection.ID] {
			merged = append(merged, defaultSection)
		}
	}

	input.Sections = merged
	return input
}

func NormalizeLandingThemeConfig(input LandingThemeConfig, primary string) LandingThemeConfig {
	config := DefaultLandingThemeConfig(primary)
	if strings.TrimSpace(input.Preset) != "" {
		config.Preset = input.Preset
	}
	if strings.TrimSpace(input.PrimaryColor) != "" {
		config.PrimaryColor = input.PrimaryColor
	}
	if strings.TrimSpace(input.AccentColor) != "" {
		config.AccentColor = input.AccentColor
	}
	if strings.TrimSpace(input.SurfaceStyle) != "" {
		config.SurfaceStyle = input.SurfaceStyle
	}
	if strings.TrimSpace(input.FontStyle) != "" {
		config.FontStyle = input.FontStyle
	}
	if strings.TrimSpace(input.RadiusStyle) != "" {
		config.RadiusStyle = input.RadiusStyle
	}
	return config
}

func NormalizeBookingFormConfig(input BookingFormConfig) BookingFormConfig {
	config := DefaultBookingFormConfig()
	if strings.TrimSpace(input.CTAButtonLabel) != "" {
		config.CTAButtonLabel = input.CTAButtonLabel
	}
	if strings.TrimSpace(input.WhatsappLabel) != "" {
		config.WhatsappLabel = input.WhatsappLabel
	}
	config.StickyMobileCTA = input.StickyMobileCTA
	config.ShowWhatsappHelp = input.ShowWhatsappHelp
	return config
}

func firstNonEmptyBuilderString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

type TenantDirectoryItem struct {
	ID                      uuid.UUID      `db:"id" json:"id"`
	Name                    string         `db:"name" json:"name"`
	Slug                    string         `db:"slug" json:"slug"`
	BusinessCategory        string         `db:"business_category" json:"business_category"`
	BusinessType            string         `db:"business_type" json:"business_type"`
	Tagline                 string         `db:"tagline" json:"tagline"`
	Slogan                  string         `db:"slogan" json:"slogan"`
	AboutUs                 string         `db:"about_us" json:"about_us"`
	PrimaryColor            string         `db:"primary_color" json:"primary_color"`
	LogoURL                 string         `db:"logo_url" json:"logo_url"`
	BannerURL               string         `db:"banner_url" json:"banner_url"`
	OpenTime                string         `db:"open_time" json:"open_time"`
	CloseTime               string         `db:"close_time" json:"close_time"`
	ResourceCount           int            `db:"resource_count" json:"resource_count"`
	StartingPrice           float64        `db:"starting_price" json:"starting_price"`
	TopResourceName         string         `db:"top_resource_name" json:"top_resource_name"`
	TopResourceType         string         `db:"top_resource_type" json:"top_resource_type"`
	DiscoveryHeadline       string         `db:"discovery_headline" json:"discovery_headline"`
	DiscoverySubheadline    string         `db:"discovery_subheadline" json:"discovery_subheadline"`
	DiscoveryTags           pq.StringArray `db:"discovery_tags" json:"discovery_tags"`
	DiscoveryBadges         pq.StringArray `db:"discovery_badges" json:"discovery_badges"`
	PromoLabel              string         `db:"promo_label" json:"promo_label"`
	FeaturedImageURL        string         `db:"featured_image_url" json:"featured_image_url"`
	HighlightCopy           string         `db:"highlight_copy" json:"highlight_copy"`
	DiscoveryFeatured       bool           `db:"discovery_featured" json:"discovery_featured"`
	DiscoveryPromoted       bool           `db:"discovery_promoted" json:"discovery_promoted"`
	DiscoveryPriority       int            `db:"discovery_priority" json:"discovery_priority"`
	PromoStartsAt           *time.Time     `db:"promo_starts_at" json:"promo_starts_at"`
	PromoEndsAt             *time.Time     `db:"promo_ends_at" json:"promo_ends_at"`
	DiscoveryImpressions30d int64          `db:"discovery_impressions_30d" json:"discovery_impressions_30d"`
	DiscoveryClicks30d      int64          `db:"discovery_clicks_30d" json:"discovery_clicks_30d"`
	DiscoveryCtr30d         float64        `db:"discovery_ctr_30d" json:"discovery_ctr_30d"`
	FeaturedReason          string         `db:"-" json:"featured_reason"`
	AvailabilityHint        string         `db:"-" json:"availability_hint"`
	RecommendationReason    string         `db:"-" json:"recommendation_reason"`
	PersonalizationScore    int            `db:"-" json:"personalization_score"`
	IsFeatured              bool           `db:"-" json:"is_featured"`
	IsNew                   bool           `db:"-" json:"is_new"`
	IsPromoted              bool           `db:"-" json:"is_promoted"`
	CreatedAt               time.Time      `db:"created_at" json:"created_at"`
}

type PublicDiscoveryHero struct {
	Eyebrow     string `json:"eyebrow"`
	Title       string `json:"title"`
	Description string `json:"description"`
	SearchHint  string `json:"search_hint"`
}

type DiscoveryFeedItem struct {
	ID       string    `json:"id"`
	ItemKind string    `json:"item_kind"`
	TenantID uuid.UUID `json:"tenant_id"`
	TenantDirectoryItem
	FeedTitle                string     `json:"feed_title"`
	FeedSummary              string     `json:"feed_summary"`
	FeedImageURL             string     `json:"feed_image_url"`
	FeedLabel                string     `json:"feed_label"`
	FeedReason               string     `json:"feed_reason"`
	FeedTags                 []string   `json:"feed_tags"`
	FeedBadges               []string   `json:"feed_badges"`
	FeedCTA                  string     `json:"feed_cta"`
	FeedScore                int        `json:"feed_score"`
	PersonalizationScore     int        `json:"personalization_score"`
	PostImpressions7d        int64      `json:"post_impressions_7d,omitempty"`
	PostClicks7d             int64      `json:"post_clicks_7d,omitempty"`
	PostCTR7d                float64    `json:"post_ctr_7d,omitempty"`
	PostDetailViews7d        int64      `json:"post_detail_views_7d,omitempty"`
	PostTenantOpens7d        int64      `json:"post_tenant_opens_7d,omitempty"`
	PostRelatedClicks7d      int64      `json:"post_related_clicks_7d,omitempty"`
	PostRelatedTenantOpens7d int64      `json:"post_related_tenant_opens_7d,omitempty"`
	PostBookingStarts7d      int64      `json:"post_booking_starts_7d,omitempty"`
	PostLastInteractionAt    *time.Time `json:"post_last_interaction_at,omitempty"`
	PostID                   *uuid.UUID `json:"post_id,omitempty"`
	PostType                 string     `json:"post_type,omitempty"`
	PostStatus               string     `json:"post_status,omitempty"`
	PostVisibility           string     `json:"post_visibility,omitempty"`
	PostCaption              string     `json:"post_caption,omitempty"`
	PostCoverMediaURL        string     `json:"post_cover_media_url,omitempty"`
	PostThumbnailURL         string     `json:"post_thumbnail_url,omitempty"`
	PostPosterURL            string     `json:"post_poster_url,omitempty"`
	PostMimeType             string     `json:"post_mime_type,omitempty"`
	PostStreamURLHLS         string     `json:"post_stream_url_hls,omitempty"`
	PostDurationSeconds      int        `json:"post_duration_seconds,omitempty"`
	PostWidth                int        `json:"post_width,omitempty"`
	PostHeight               int        `json:"post_height,omitempty"`
	PostPublishedAt          *time.Time `json:"post_published_at,omitempty"`
}

type PublicDiscoverySection struct {
	ID          string              `json:"id"`
	Title       string              `json:"title"`
	Description string              `json:"description"`
	Style       string              `json:"style"`
	Items       []DiscoveryFeedItem `json:"items"`
}

type PublicDiscoverFeedResponse struct {
	Hero            PublicDiscoveryHero      `json:"hero"`
	QuickCategories []string                 `json:"quick_categories"`
	Featured        []DiscoveryFeedItem      `json:"featured"`
	Sections        []PublicDiscoverySection `json:"sections"`
	Personalized    bool                     `json:"personalized"`
}

type PublicDiscoveryPostDetailResponse struct {
	Item    DiscoveryFeedItem   `json:"item"`
	Tenant  TenantDirectoryItem `json:"tenant"`
	Related []DiscoveryFeedItem `json:"related"`
}

type TenantDiscoveryProfile struct {
	TenantID         uuid.UUID      `db:"tenant_id" json:"tenant_id"`
	Headline         string         `db:"headline" json:"headline"`
	Subheadline      string         `db:"subheadline" json:"subheadline"`
	FeaturedImageURL string         `db:"featured_image_url" json:"featured_image_url"`
	HighlightCopy    string         `db:"highlight_copy" json:"highlight_copy"`
	Tags             pq.StringArray `db:"tags" json:"tags"`
	Badges           pq.StringArray `db:"badges" json:"badges"`
	PrimaryCTA       string         `db:"primary_cta" json:"primary_cta"`
	SecondaryCTA     string         `db:"secondary_cta" json:"secondary_cta"`
	Status           string         `db:"status" json:"status"`
	LastPublishedAt  *time.Time     `db:"last_published_at" json:"last_published_at"`
	CreatedAt        time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time      `db:"updated_at" json:"updated_at"`
}

type TenantPost struct {
	ID                   uuid.UUID       `db:"id" json:"id"`
	TenantID             uuid.UUID       `db:"tenant_id" json:"tenant_id"`
	AuthorUserID         *uuid.UUID      `db:"author_user_id" json:"author_user_id,omitempty"`
	Type                 string          `db:"type" json:"type"`
	Title                string          `db:"title" json:"title"`
	Caption              string          `db:"caption" json:"caption"`
	CoverMediaURL        string          `db:"cover_media_url" json:"cover_media_url"`
	ThumbnailURL         string          `db:"thumbnail_url" json:"thumbnail_url"`
	CTA                  string          `db:"cta" json:"cta"`
	Status               string          `db:"status" json:"status"`
	Visibility           string          `db:"visibility" json:"visibility"`
	StartsAt             *time.Time      `db:"starts_at" json:"starts_at"`
	EndsAt               *time.Time      `db:"ends_at" json:"ends_at"`
	PublishedAt          *time.Time      `db:"published_at" json:"published_at"`
	Metadata             json.RawMessage `db:"metadata" json:"metadata"`
	Impressions7d        int64           `db:"-" json:"impressions_7d,omitempty"`
	Clicks7d             int64           `db:"-" json:"clicks_7d,omitempty"`
	CTR7d                float64         `db:"-" json:"ctr_7d,omitempty"`
	DetailViews7d        int64           `db:"-" json:"detail_views_7d,omitempty"`
	TenantOpens7d        int64           `db:"-" json:"tenant_opens_7d,omitempty"`
	RelatedClicks7d      int64           `db:"-" json:"related_clicks_7d,omitempty"`
	RelatedTenantOpens7d int64           `db:"-" json:"related_tenant_opens_7d,omitempty"`
	BookingStarts7d      int64           `db:"-" json:"booking_starts_7d,omitempty"`
	LastInteractionAt    *time.Time      `db:"-" json:"last_interaction_at,omitempty"`
	CreatedAt            time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt            time.Time       `db:"updated_at" json:"updated_at"`
}

type TenantPostMetric struct {
	PostID               uuid.UUID  `db:"post_id" json:"post_id"`
	Impressions7d        int64      `db:"impressions_7d" json:"impressions_7d"`
	Clicks7d             int64      `db:"clicks_7d" json:"clicks_7d"`
	CTR7d                float64    `db:"ctr_7d" json:"ctr_7d"`
	DetailViews7d        int64      `db:"detail_views_7d" json:"detail_views_7d"`
	TenantOpens7d        int64      `db:"tenant_opens_7d" json:"tenant_opens_7d"`
	RelatedClicks7d      int64      `db:"related_clicks_7d" json:"related_clicks_7d"`
	RelatedTenantOpens7d int64      `db:"related_tenant_opens_7d" json:"related_tenant_opens_7d"`
	BookingStarts7d      int64      `db:"booking_starts_7d" json:"booking_starts_7d"`
	LastInteractionAt    *time.Time `db:"last_interaction_at" json:"last_interaction_at"`
}

type TenantPostMediaMetadata struct {
	DurationSeconds int    `json:"duration_seconds,omitempty"`
	PosterURL       string `json:"poster_url,omitempty"`
	MIMEType        string `json:"mime_type,omitempty"`
	Width           int    `json:"width,omitempty"`
	Height          int    `json:"height,omitempty"`
	StreamURLHLS    string `json:"stream_url_hls,omitempty"`
}

type CustomerDiscoverySignals struct {
	FavoriteCategories map[string]int
	FavoriteTypes      map[string]int
	VisitedTenants     map[uuid.UUID]int
	AverageSpend       float64
	EveningBookings    int
	TotalBookings      int
}

type TenantPostUpsertReq struct {
	Type          string          `json:"type"`
	Title         string          `json:"title"`
	Caption       string          `json:"caption"`
	CoverMediaURL string          `json:"cover_media_url"`
	ThumbnailURL  string          `json:"thumbnail_url"`
	CTA           string          `json:"cta"`
	Status        string          `json:"status"`
	Visibility    string          `json:"visibility"`
	StartsAt      *time.Time      `json:"starts_at"`
	EndsAt        *time.Time      `json:"ends_at"`
	Metadata      json.RawMessage `json:"metadata"`
}

type DiscoveryEventReq struct {
	TenantID      string          `json:"tenant_id"`
	TenantSlug    string          `json:"tenant_slug"`
	EventType     string          `json:"event_type"`
	Surface       string          `json:"surface"`
	SectionID     string          `json:"section_id"`
	CardVariant   string          `json:"card_variant"`
	PositionIndex int             `json:"position_index"`
	SessionID     string          `json:"session_id"`
	PromoLabel    string          `json:"promo_label"`
	Metadata      json.RawMessage `json:"metadata"`
}

type DiscoveryFeedEvent struct {
	ID            uuid.UUID       `db:"id" json:"id"`
	TenantID      uuid.UUID       `db:"tenant_id" json:"tenant_id"`
	EventType     string          `db:"event_type" json:"event_type"`
	Surface       string          `db:"surface" json:"surface"`
	SectionID     string          `db:"section_id" json:"section_id"`
	CardVariant   string          `db:"card_variant" json:"card_variant"`
	PositionIndex int             `db:"position_index" json:"position_index"`
	SessionID     string          `db:"session_id" json:"session_id"`
	PromoLabel    string          `db:"promo_label" json:"promo_label"`
	Metadata      json.RawMessage `db:"metadata" json:"metadata"`
	CreatedAt     time.Time       `db:"created_at" json:"created_at"`
}

type ReferralReward struct {
	ID               uuid.UUID  `db:"id" json:"id"`
	ReferrerTenantID uuid.UUID  `db:"referrer_tenant_id" json:"referrer_tenant_id"`
	ReferredTenantID uuid.UUID  `db:"referred_tenant_id" json:"referred_tenant_id"`
	SourceOrderID    string     `db:"source_order_id" json:"source_order_id"`
	RewardAmount     int64      `db:"reward_amount" json:"reward_amount"`
	Status           string     `db:"status" json:"status"`
	AvailableAt      *time.Time `db:"available_at" json:"available_at"`
	PaidAt           *time.Time `db:"paid_at" json:"paid_at"`
	Metadata         []byte     `db:"metadata" json:"metadata"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time  `db:"updated_at" json:"updated_at"`
}

type ReferralListItem struct {
	TenantID     uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	TenantName   string     `db:"tenant_name" json:"tenant_name"`
	TenantSlug   string     `db:"tenant_slug" json:"tenant_slug"`
	Status       string     `db:"status" json:"status"`
	TrialEndsAt  *time.Time `db:"trial_ends_at" json:"trial_ends_at,omitempty"`
	SubscribedAt *time.Time `db:"subscribed_at" json:"subscribed_at,omitempty"`
	RewardStatus string     `db:"reward_status" json:"reward_status"`
	RewardAmount int64      `db:"reward_amount" json:"reward_amount"`
}

type ReferralWithdrawalRequest struct {
	ID                uuid.UUID  `db:"id" json:"id"`
	TenantID          uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	Amount            int64      `db:"amount" json:"amount"`
	Status            string     `db:"status" json:"status"`
	RequestedByUserID *uuid.UUID `db:"requested_by_user_id" json:"requested_by_user_id,omitempty"`
	ReviewedByUserID  *uuid.UUID `db:"reviewed_by_user_id" json:"reviewed_by_user_id,omitempty"`
	ReviewedAt        *time.Time `db:"reviewed_at" json:"reviewed_at,omitempty"`
	PaidAt            *time.Time `db:"paid_at" json:"paid_at,omitempty"`
	Note              string     `db:"note" json:"note"`
	Metadata          []byte     `db:"metadata" json:"metadata"`
	CreatedAt         time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time  `db:"updated_at" json:"updated_at"`
}
