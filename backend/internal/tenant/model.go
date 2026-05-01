package tenant

import (
	"encoding/json"
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
	ReferralCode     string `json:"referral_code"`
	AdminName        string `json:"admin_name" binding:"required"`
	AdminEmail       string `json:"admin_email" binding:"required,email"`
	AdminPass        string `json:"admin_password" binding:"required,min=6"`
}

// LoginReq digunakan untuk autentikasi Admin/Owner ke dashboard
type LoginReq struct {
	Email      string `json:"email" binding:"required,email"`
	Password   string `json:"password" binding:"required"`
	TenantSlug string `json:"tenant_slug"`
}

// LoginResponse mengembalikan token akses dan profil singkat user
type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// User merepresentasikan entitas pemilik bisnis atau staff
type User struct {
	ID        uuid.UUID  `db:"id" json:"id"`
	TenantID  uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	RoleID    *uuid.UUID `db:"role_id" json:"role_id,omitempty"`
	Name      string     `db:"name" json:"name"`
	Email     string     `db:"email" json:"email"`
	Password  string     `db:"password" json:"-"`
	Role      string     `db:"role" json:"role"`
	CreatedAt time.Time  `db:"created_at" json:"created_at"`
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

// Tenant adalah jantung dari sistem Multi-Tenant lo, menyimpan data branding dan konfigurasi publik
type Tenant struct {
	ID               uuid.UUID `db:"id" json:"id"`
	Name             string    `db:"name" json:"name"`
	Slug             string    `db:"slug" json:"slug"`
	BusinessCategory string    `db:"business_category" json:"business_category"`
	BusinessType     string    `db:"business_type" json:"business_type"`

	// --- SUBSCRIPTION (SaaS Billing) ---
	Plan               string `db:"plan" json:"plan"`
	SubscriptionStatus string `db:"subscription_status" json:"subscription_status"`
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

	CreatedAt time.Time `db:"created_at" json:"created_at"`
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
	FeedTitle            string     `json:"feed_title"`
	FeedSummary          string     `json:"feed_summary"`
	FeedImageURL         string     `json:"feed_image_url"`
	FeedLabel            string     `json:"feed_label"`
	FeedReason           string     `json:"feed_reason"`
	FeedTags             []string   `json:"feed_tags"`
	FeedBadges           []string   `json:"feed_badges"`
	FeedCTA              string     `json:"feed_cta"`
	FeedScore            int        `json:"feed_score"`
	PersonalizationScore int        `json:"personalization_score"`
	PostID               *uuid.UUID `json:"post_id,omitempty"`
	PostType             string     `json:"post_type,omitempty"`
	PostStatus           string     `json:"post_status,omitempty"`
	PostVisibility       string     `json:"post_visibility,omitempty"`
	PostCaption          string     `json:"post_caption,omitempty"`
	PostPublishedAt      *time.Time `json:"post_published_at,omitempty"`
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
	ID            uuid.UUID       `db:"id" json:"id"`
	TenantID      uuid.UUID       `db:"tenant_id" json:"tenant_id"`
	AuthorUserID  *uuid.UUID      `db:"author_user_id" json:"author_user_id,omitempty"`
	Type          string          `db:"type" json:"type"`
	Title         string          `db:"title" json:"title"`
	Caption       string          `db:"caption" json:"caption"`
	CoverMediaURL string          `db:"cover_media_url" json:"cover_media_url"`
	ThumbnailURL  string          `db:"thumbnail_url" json:"thumbnail_url"`
	CTA           string          `db:"cta" json:"cta"`
	Status        string          `db:"status" json:"status"`
	Visibility    string          `db:"visibility" json:"visibility"`
	StartsAt      *time.Time      `db:"starts_at" json:"starts_at"`
	EndsAt        *time.Time      `db:"ends_at" json:"ends_at"`
	PublishedAt   *time.Time      `db:"published_at" json:"published_at"`
	Metadata      json.RawMessage `db:"metadata" json:"metadata"`
	CreatedAt     time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time       `db:"updated_at" json:"updated_at"`
}

type TenantPostMetric struct {
	PostID            uuid.UUID  `db:"post_id" json:"post_id"`
	Impressions7d     int64      `db:"impressions_7d" json:"impressions_7d"`
	Clicks7d          int64      `db:"clicks_7d" json:"clicks_7d"`
	CTR7d             float64    `db:"ctr_7d" json:"ctr_7d"`
	ProfileViews7d    int64      `db:"profile_views_7d" json:"profile_views_7d"`
	BookingStarts7d   int64      `db:"booking_starts_7d" json:"booking_starts_7d"`
	LastInteractionAt *time.Time `db:"last_interaction_at" json:"last_interaction_at"`
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
