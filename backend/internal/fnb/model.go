package fnb

import (
	"time"

	"github.com/google/uuid"
)

// Item mewakili struktur tabel fnb_items di database
type Item struct {
	ID          uuid.UUID `db:"id" json:"id"`
	TenantID    uuid.UUID `db:"tenant_id" json:"tenant_id"`
	Name        string    `db:"name" json:"name"`
	Description string    `db:"description" json:"description"` // Kolom baru untuk detail menu
	Price       float64   `db:"price" json:"price"`
	Category    string    `db:"category" json:"category"`
	// Menggunakan *string agar aman jika di database nilainya NULL
	ImageURL    *string   `db:"image_url" json:"image_url"`
	IsAvailable bool      `db:"is_available" json:"is_available"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

// UpsertItemReq digunakan sebagai skema input untuk Create (POST) dan Update (PUT)
type UpsertItemReq struct {
	Name        string  `json:"name" binding:"required"`
	Description string  `json:"description"` // Opsional, tidak wajib diisi
	Price       float64 `json:"price" binding:"required"`
	Category    string  `json:"category"`     // Jika kosong, Service akan memberi "General"
	ImageURL    *string `json:"image_url"`    // Menerima URL string hasil upload S3
	IsAvailable bool    `json:"is_available"` // Mengontrol stok (Ready/Out of Stock)
}

// ItemResponse (Opsional) jika kamu ingin mengontrol output JSON yang lebih spesifik
type ItemResponse struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Price       float64   `json:"price"`
	Category    string    `json:"category"`
	ImageURL    string    `json:"image_url,omitempty"` // Menghilangkan field jika kosong
	IsAvailable bool      `json:"is_available"`
}

type Order struct {
	ID              uuid.UUID   `db:"id" json:"id"`
	TenantID        uuid.UUID   `db:"tenant_id" json:"tenant_id"`
	BookingID       *uuid.UUID  `db:"booking_id" json:"booking_id,omitempty"`
	CustomerID      *uuid.UUID  `db:"customer_id" json:"customer_id,omitempty"`
	OrderNumber     string      `db:"order_number" json:"order_number"`
	Source          string      `db:"source" json:"source"`
	Status          string      `db:"status" json:"status"`
	PaymentStatus   string      `db:"payment_status" json:"payment_status"`
	PaymentMethod   string      `db:"payment_method" json:"payment_method"`
	Subtotal        float64     `db:"subtotal" json:"subtotal"`
	DiscountAmount  float64     `db:"discount_amount" json:"discount_amount"`
	GrandTotal      float64     `db:"grand_total" json:"grand_total"`
	Notes           string      `db:"notes" json:"notes"`
	CreatedByUserID *uuid.UUID  `db:"created_by_user_id" json:"created_by_user_id,omitempty"`
	CompletedAt     *time.Time  `db:"completed_at" json:"completed_at,omitempty"`
	CreatedAt       time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time   `db:"updated_at" json:"updated_at"`
	BookingLabel    string      `db:"booking_label" json:"booking_label,omitempty"`
	Items           []OrderItem `db:"-" json:"items"`
}

type OrderItem struct {
	ID                 uuid.UUID  `db:"id" json:"id"`
	FnbOrderID         uuid.UUID  `db:"fnb_order_id" json:"fnb_order_id"`
	FnbItemID          *uuid.UUID `db:"fnb_item_id" json:"fnb_item_id,omitempty"`
	BookingOrderItemID *uuid.UUID `db:"booking_order_item_id" json:"booking_order_item_id,omitempty"`
	ItemName           string     `db:"item_name" json:"item_name"`
	Category           string     `db:"category" json:"category"`
	Quantity           int        `db:"quantity" json:"quantity"`
	UnitPrice          float64    `db:"unit_price" json:"unit_price"`
	Subtotal           float64    `db:"subtotal" json:"subtotal"`
	CreatedAt          time.Time  `db:"created_at" json:"created_at"`
}

type CreateOrderItemReq struct {
	FnbItemID string `json:"fnb_item_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required"`
}

type CreateOrderReq struct {
	BookingID     string               `json:"booking_id"`
	PaymentMethod string               `json:"payment_method"`
	Notes         string               `json:"notes"`
	Items         []CreateOrderItemReq `json:"items" binding:"required"`
}

type OrderSummary struct {
	TotalOrders       int     `db:"total_orders" json:"total_orders"`
	StandaloneOrders  int     `db:"standalone_orders" json:"standalone_orders"`
	BookingOrders     int     `db:"booking_orders" json:"booking_orders"`
	TotalRevenue      float64 `db:"total_revenue" json:"total_revenue"`
	StandaloneRevenue float64 `db:"standalone_revenue" json:"standalone_revenue"`
	BookingRevenue    float64 `db:"booking_revenue" json:"booking_revenue"`
}
