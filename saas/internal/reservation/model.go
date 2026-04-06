package reservation

import (
	"time"

	"github.com/google/uuid"
)

// Booking adalah model utama untuk tabel bookings (induk transaksi)
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

// BookingOption menyimpan item resource yang dipilih (Quantity menyimpan durasi atau jumlah item)
type BookingOption struct {
	ID             uuid.UUID `db:"id" json:"id"`
	BookingID      uuid.UUID `db:"booking_id" json:"booking_id"`
	ResourceItemID uuid.UUID `db:"resource_item_id" json:"resource_item_id"`
	Quantity       int       `db:"quantity" json:"quantity"`             // Durasi (jam) atau jumlah unit addon
	PriceAtBooking float64   `db:"price_at_booking" json:"price_at_booking"` // Subtotal (Price * Quantity)
}

// CreateBookingReq payload dari Frontend Public / Admin Manual
// REFACTORED: TenantID dihilangkan dari binding required karena dicari via ResourceID di Service
type CreateBookingReq struct {
	ResourceID    string   `json:"resource_id" binding:"required"`
	CustomerName  string   `json:"customer_name" binding:"required"`
	CustomerPhone string   `json:"customer_phone" binding:"required"`
	ItemIDs       []string `json:"item_ids"` // Daftar ID dari resource_items (Paket Utama + Addons)
	StartTime     string   `json:"start_time" binding:"required"`
	Duration      int      `json:"duration" binding:"required,min=1"`
}

// --- MODEL UNTUK POS & DASHBOARD INTEGRATION ---

// OrderItem mewakili item F&B yang dipesan melalui POS saat sesi berlangsung
type OrderItem struct {
	ID              uuid.UUID `db:"id" json:"id"`
	BookingID       uuid.UUID `db:"booking_id" json:"booking_id"`
	FnbItemID       uuid.UUID `db:"fnb_item_id" json:"fnb_item_id"`
	ItemName        string    `db:"item_name" json:"item_name"` // Virtual field from JOIN
	Quantity        int       `db:"quantity" json:"quantity"`
	PriceAtPurchase float64   `db:"price_at_purchase" json:"price_at_purchase"`
	Subtotal        float64   `db:"subtotal" json:"subtotal"`
}

// BookingDetail adalah view lengkap (Rich Object) untuk Admin Panel, POS, & Invoice
type BookingDetail struct {
	Booking
	CustomerName  string `db:"customer_name" json:"customer_name"`
	CustomerPhone string `db:"customer_phone" json:"customer_phone"`
	ResourceName  string `db:"resource_name" json:"resource_name"`

	// Field pendukung untuk fitur kalkulasi sisa waktu & Extension di POS
	UnitPrice    float64 `db:"unit_price" json:"unit_price"`    // Harga dasar per unit (misal: Rp 15.000)
	UnitDuration int     `db:"unit_duration" json:"unit_duration"` // Menit per unit (misal: 60)

	TotalResource float64 `db:"total_resource" json:"total_resource"` // Total sewa unit + addons resource
	TotalFnb      float64 `db:"total_fnb" json:"total_fnb"`           // Total pesanan makanan dari POS
	GrandTotal    float64 `db:"grand_total" json:"grand_total"`       // Total keseluruhan bill

	ResourceAddons []ResourceItemSimple `json:"resource_addons"` // Daftar katalog addon tersedia untuk unit ini
	Options        []BookingOptionDetail `json:"options"`         // Detail item unit yang sudah masuk bill
	Orders         []OrderItem           `json:"orders"`          // Detail pesanan F&B yang sudah masuk bill
}

// BookingOptionDetail menyertakan metadata item untuk kebutuhan UI Tabel Billing
type BookingOptionDetail struct {
	ID             uuid.UUID `json:"id"`
	ItemName       string    `db:"item_name" json:"item_name"`
	ItemType       string    `db:"item_type" json:"item_type"`
	Quantity       int       `db:"quantity" json:"quantity"`
	UnitPrice      float64   `db:"unit_price" json:"unit_price"`
	PriceAtBooking float64   `db:"price_at_booking" json:"price_at_booking"` // Subtotal billing
}

// --- POS SPECIFIC REQUESTS ---

// AddOrderReq payload saat admin menambah pesanan F&B di POS Dialog
type AddOrderReq struct {
	FnbItemID uuid.UUID `json:"fnb_item_id" binding:"required"`
	Quantity  int       `json:"quantity" binding:"required,min=1"`
}

// ResourceItemSimple view ringkas katalog addon untuk dropdown di POS
type ResourceItemSimple struct {
	ID       uuid.UUID `json:"id" db:"id"`
	Name     string    `json:"name" db:"name"`
	Price    float64   `json:"price" db:"price"`
	ItemType string    `db:"item_type" `
}