package booking

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

const (
	ItemTypeConsole = "console_option" // Pilihan utama (Eksklusif)
	ItemTypeAddon   = "add_on"         // Tambahan (Bisa banyak)

	// Definisi Unit Harga (Opsional: untuk konsistensi di level kode)
	PriceUnitHour    = "hour"
	PriceUnitDay     = "day"
	PriceUnitSession = "session"
	PriceUnitPcs     = "pcs"
)

// Tenant mewakili tabel 'tenants'
type Tenant struct {
	ID           uuid.UUID      `db:"id" json:"id"`
	Name         string         `db:"name" json:"name"`
	Slug         string         `db:"slug" json:"slug"`
	BusinessType string         `db:"business_type" json:"business_type"`
	Slogan       string         `db:"slogan" json:"slogan"`
	Address      string         `db:"address" json:"address"`
	OpenTime     string         `db:"open_time" json:"open_time"`
	CloseTime    string         `db:"close_time" json:"close_time"`
	LogoURL      string         `db:"logo_url" json:"logo_url"`
	BannerURL    string         `db:"banner_url" json:"banner_url"`
	Gallery      pq.StringArray `db:"gallery" json:"gallery"`
	CreatedAt    time.Time      `db:"created_at" json:"created_at"`
}

// Customer mewakili tabel 'customers'
type Customer struct {
	ID            uuid.UUID `db:"id" json:"id"`
	TenantID      uuid.UUID `db:"tenant_id" json:"tenant_id"`
	Name          string    `db:"name" json:"name"`
	Phone         string    `db:"phone" json:"phone"`
	Email         *string   `db:"email" json:"email"`
	LoyaltyPoints int       `db:"loyalty_points" json:"loyalty_points"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
}

// Resource mewakili tabel 'resources'
type Resource struct {
	ID        uuid.UUID       `db:"id" json:"id"`
	TenantID  uuid.UUID       `db:"tenant_id" json:"tenant_id"`
	Name      string          `db:"name" json:"name"`
	Category  string          `db:"category" json:"category"`
	Status    string          `db:"status" json:"status"`
	Metadata  json.RawMessage `db:"metadata" json:"metadata"`
	Items     []ResourceItem  `db:"-" json:"items"`
	CreatedAt time.Time       `db:"created_at" json:"created_at"`
}

// ResourceItem mewakili tabel 'resource_items'
type ResourceItem struct {
	ID           uuid.UUID       `db:"id" json:"id"`
	ResourceID   uuid.UUID       `db:"resource_id" json:"resource_id"`
	Name         string          `db:"name" json:"name"`
	PricePerHour float64         `db:"price_per_hour" json:"price_per_hour"` // Nilai nominal harga
	PriceUnit    string          `db:"price_unit" json:"price_unit"`         // New Field: hour, day, session, pcs
	ItemType     string          `db:"item_type" json:"item_type"`
	IsDefault    bool            `db:"is_default" json:"is_default"`
	Metadata     json.RawMessage `db:"metadata" json:"metadata"`
}

// Booking mewakili tabel 'bookings'
type Booking struct {
	ID          uuid.UUID `db:"id" json:"id"`
	TenantID    uuid.UUID `db:"tenant_id" json:"tenant_id"`
	CustomerID  uuid.UUID `db:"customer_id" json:"customer_id"`
	ResourceID  uuid.UUID `db:"resource_id" json:"resource_id"`
	StartTime   time.Time `db:"start_time" json:"start_time"`
	EndTime     time.Time `db:"end_time" json:"end_time"`
	AccessToken uuid.UUID `db:"access_token" json:"access_token"`
	Status      string    `db:"status" json:"status"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

// BookingOption mewakili tabel 'booking_options'
type BookingOption struct {
	ID             uuid.UUID `db:"id" json:"id"`
	BookingID      uuid.UUID `db:"booking_id" json:"booking_id"`
	ResourceItemID uuid.UUID `db:"resource_item_id" json:"resource_item_id"`
	PriceAtBooking float64   `db:"price_at_booking" json:"price_at_booking"`
}

// --- DTO ---

type CreateBookingReq struct {
	CustomerID string   `json:"customer_id" binding:"required"`
	ResourceID string   `json:"resource_id" binding:"required"`
	ItemIDs    []string `json:"item_ids"`
	StartTime  string   `json:"start_time" binding:"required"`
	Duration   int      `json:"duration" binding:"required"`
}

type User struct {
	ID        uuid.UUID `db:"id" json:"id"`
	TenantID  uuid.UUID `db:"tenant_id" json:"tenant_id"`
	Name      string    `db:"name" json:"name"`
	Email     string    `db:"email" json:"email"`
	Password  string    `db:"password" json:"-"`
	Role      string    `db:"role" json:"role"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

type RegisterTenantReq struct {
	TenantName   string `json:"tenant_name" binding:"required"`
	TenantSlug   string `json:"tenant_slug" binding:"required"`
	BusinessType string `json:"business_type"`
	AdminName    string `json:"admin_name" binding:"required"`
	AdminEmail   string `json:"admin_email" binding:"required,email"`
	AdminPass    string `json:"admin_password" binding:"required,min=6"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// internal/booking/model.go (atau file DTO terkait)
type ResourceListResponse struct {
    TenantCategory string     `json:"tenant_category"`
    TenantType     string     `json:"tenant_type"`
    Resources      []Resource `json:"resources"`
}