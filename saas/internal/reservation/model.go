package reservation

import (
	"time"

	"github.com/google/uuid"
)

// Booking adalah model utama untuk tabel bookings
type Booking struct {
	ID          uuid.UUID `db:"id" json:"id"`
	TenantID    uuid.UUID `db:"tenant_id" json:"tenant_id"`
	CustomerID  uuid.UUID `db:"customer_id" json:"customer_id"`
	ResourceID  uuid.UUID `db:"resource_id" json:"resource_id"`
	StartTime   time.Time `db:"start_time" json:"start_time"`
	EndTime     time.Time `db:"end_time" json:"end_time"`
	AccessToken uuid.UUID `db:"access_token" json:"access_token"`
	Status      string    `db:"status" json:"status"` // pending, active, ongoing, completed, cancelled
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

// BookingOption menyimpan item resource yang dipilih (misal: Paket Utama, Alat Tambahan)
type BookingOption struct {
	ID             uuid.UUID `db:"id" json:"id"`
	BookingID      uuid.UUID `db:"booking_id" json:"booking_id"`
	ResourceItemID uuid.UUID `db:"resource_item_id" json:"resource_item_id"`
	PriceAtBooking float64   `db:"price_at_booking" json:"price_at_booking"`
}

// CreateBookingReq untuk payload dari Frontend/Public
type CreateBookingReq struct {
	TenantID      string   `json:"tenant_id" binding:"required"`
	ResourceID    string   `json:"resource_id" binding:"required"`
	CustomerName  string   `json:"customer_name" binding:"required"`
	CustomerPhone string   `json:"customer_phone" binding:"required"`
	ItemIDs       []string `json:"item_ids"` // Daftar ID dari resource_items
	StartTime     string   `json:"start_time" binding:"required"`
	Duration      int      `json:"duration" binding:"required"`
}

// --- MODEL UNTUK POS INTEGRATION ---

// OrderItem mewakili item F&B yang dipesan melalui POS saat booking berlangsung
type OrderItem struct {
	ID              uuid.UUID `db:"id" json:"id"`
	BookingID       uuid.UUID `db:"booking_id" json:"booking_id"`
	FnbItemID       uuid.UUID `db:"fnb_item_id" json:"fnb_item_id"`
	ItemName        string    `db:"item_name" json:"item_name"`
	Quantity        int       `db:"quantity" json:"quantity"`
	PriceAtPurchase float64   `db:"price_at_purchase" json:"price_at_purchase"`
	Subtotal        float64   `db:"subtotal" json:"subtotal"`
}

// BookingDetail adalah view lengkap untuk Admin Panel & POS Dashboard
type BookingDetail struct {
	Booking
	CustomerName  string `db:"customer_name" json:"customer_name"`
	CustomerPhone string `db:"customer_phone" json:"customer_phone"`
	ResourceName  string `db:"resource_name" json:"resource_name"`

	// --- Field untuk Suplai Dialog Extend ---
	UnitPrice    float64 `db:"unit_price" json:"unit_price"`       // Harga dasar per jam/sesi (dari item utama)
	UnitDuration int     `db:"unit_duration" json:"unit_duration"` // Durasi per unit dalam menit (misal: 60)

	TotalResource float64 `db:"total_resource" json:"total_resource"`
	TotalFnb      float64 `db:"total_fnb" json:"total_fnb"`
	GrandTotal    float64 `db:"grand_total" json:"grand_total"`

	ResourceAddons []ResourceItemSimple `json:"resource_addons"` // Daftar katalog addon tersedia
	Options        []BookingOptionDetail `json:"options"`         // Items yang sudah dibeli
	Orders         []OrderItem           `json:"orders"`          // Pesanan F&B POS
}

type BookingOptionDetail struct {
	ID             uuid.UUID `json:"id"`
	ItemName       string    `db:"item_name" json:"item_name"`
	ItemType       string    `db:"item_type" json:"item_type"`
	PriceAtBooking float64   `db:"price_at_booking" json:"price_at_booking"`
}

// --- POS SPECIFIC REQUESTS ---

// AddOrderReq untuk payload saat admin menambah pesanan F&B di POS
type AddOrderReq struct {
	FnbItemID uuid.UUID `json:"fnb_item_id" binding:"required"`
	Quantity  int       `json:"quantity" binding:"required,min=1"`
}

// ResourceItemSimple untuk daftar katalog addon yang bisa dipilih di POS
type ResourceItemSimple struct {
	ID       uuid.UUID `json:"id" db:"id"`
	Name     string    `json:"name" db:"name"`
	Price    float64   `json:"price" db:"price"`
	ItemType string    `json:"item_type" db:"item_type"`
}