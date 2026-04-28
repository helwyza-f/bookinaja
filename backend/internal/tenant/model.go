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

	// --- OPERATIONAL ---
	OpenTime  string    `db:"open_time" json:"open_time"`
	CloseTime string    `db:"close_time" json:"close_time"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

type TenantDirectoryItem struct {
	ID               uuid.UUID `db:"id" json:"id"`
	Name             string    `db:"name" json:"name"`
	Slug             string    `db:"slug" json:"slug"`
	BusinessCategory string    `db:"business_category" json:"business_category"`
	BusinessType     string    `db:"business_type" json:"business_type"`
	Tagline          string    `db:"tagline" json:"tagline"`
	Slogan           string    `db:"slogan" json:"slogan"`
	AboutUs          string    `db:"about_us" json:"about_us"`
	PrimaryColor     string    `db:"primary_color" json:"primary_color"`
	LogoURL          string    `db:"logo_url" json:"logo_url"`
	BannerURL        string    `db:"banner_url" json:"banner_url"`
	OpenTime         string    `db:"open_time" json:"open_time"`
	CloseTime        string    `db:"close_time" json:"close_time"`
	CreatedAt        time.Time `db:"created_at" json:"created_at"`
}
