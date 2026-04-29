package reservation

import (
	"time"

	"github.com/google/uuid"
)

type Booking struct {
	ID                  uuid.UUID  `db:"id" json:"id"`
	TenantID            uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	CustomerID          uuid.UUID  `db:"customer_id" json:"customer_id"`
	ResourceID          uuid.UUID  `db:"resource_id" json:"resource_id"`
	StartTime           time.Time  `db:"start_time" json:"start_time"`
	EndTime             time.Time  `db:"end_time" json:"end_time"`
	AccessToken         uuid.UUID  `db:"access_token" json:"access_token"`
	Status              string     `db:"status" json:"status"` // pending, active, ongoing, completed, cancelled
	GrandTotal          float64    `db:"grand_total" json:"grand_total"`
	DepositAmount       float64    `db:"deposit_amount" json:"deposit_amount"`
	PaidAmount          float64    `db:"paid_amount" json:"paid_amount"`
	BalanceDue          float64    `db:"balance_due" json:"balance_due"`
	PaymentStatus       string     `db:"payment_status" json:"payment_status"`
	PaymentMethod       string     `db:"payment_method" json:"payment_method"`
	Reminder20MSentAt   *time.Time `db:"reminder_20m_sent_at" json:"reminder_20m_sent_at"`
	Reminder5MSentAt    *time.Time `db:"reminder_5m_sent_at" json:"reminder_5m_sent_at"`
	SessionActivatedAt  *time.Time `db:"session_activated_at" json:"session_activated_at"`
	CompletedAt         *time.Time `db:"completed_at" json:"completed_at"`
	CancelledAt         *time.Time `db:"cancelled_at" json:"cancelled_at"`
	SettledAt           *time.Time `db:"settled_at" json:"settled_at"`
	LastStatusChangedAt *time.Time `db:"last_status_changed_at" json:"last_status_changed_at"`
	CreatedAt           time.Time  `db:"created_at" json:"created_at"`
}

type BookingOption struct {
	ID             uuid.UUID `db:"id" json:"id"`
	BookingID      uuid.UUID `db:"booking_id" json:"booking_id"`
	ResourceItemID uuid.UUID `db:"resource_item_id" json:"resource_item_id"`
	Quantity       int       `db:"quantity" json:"quantity"`
	PriceAtBooking float64   `db:"price_at_booking" json:"price_at_booking"`
}

type CreateBookingReq struct {
	ResourceID    string   `json:"resource_id" binding:"required"`
	CustomerName  string   `json:"customer_name" binding:"required"`
	CustomerPhone string   `json:"customer_phone" binding:"required"`
	ItemIDs       []string `json:"item_ids"`
	StartTime     string   `json:"start_time" binding:"required"`
	Duration      int      `json:"duration" binding:"required,min=1"`
	Status        string   `json:"status"` // Tambahkan ini: opsional (pending, active, confirmed)
}

type OrderItem struct {
	ID              uuid.UUID `db:"id" json:"id"`
	BookingID       uuid.UUID `db:"booking_id" json:"booking_id"`
	FnbItemID       uuid.UUID `db:"fnb_item_id" json:"fnb_item_id"`
	ItemName        string    `db:"item_name" json:"item_name"`
	Quantity        int       `db:"quantity" json:"quantity"`
	PriceAtPurchase float64   `db:"price_at_purchase" json:"price_at_purchase"`
	Subtotal        float64   `db:"subtotal" json:"subtotal"`
}

type BookingDetail struct {
	Booking
	TenantName     string                `db:"tenant_name" json:"tenant_name"`
	TenantSlug     string                `db:"tenant_slug" json:"tenant_slug"`
	CustomerName   string                `db:"customer_name" json:"customer_name"`
	CustomerPhone  string                `db:"customer_phone" json:"customer_phone"`
	ResourceName   string                `db:"resource_name" json:"resource_name"`
	UnitPrice      float64               `db:"unit_price" json:"unit_price"`
	UnitDuration   int                   `db:"unit_duration" json:"unit_duration"`
	TotalResource  float64               `db:"total_resource" json:"total_resource"`
	TotalFnb       float64               `db:"total_fnb" json:"total_fnb"`
	GrandTotal     float64               `db:"grand_total" json:"grand_total"`
	ResourceAddons []ResourceItemSimple  `json:"resource_addons"`
	Options        []BookingOptionDetail `json:"options"`
	Orders         []OrderItem           `json:"orders"`
	Events         []BookingEvent        `json:"events"`
}

type BookingEvent struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	BookingID   uuid.UUID  `db:"booking_id" json:"booking_id"`
	TenantID    uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	CustomerID  *uuid.UUID `db:"customer_id" json:"customer_id,omitempty"`
	ActorType   string     `db:"actor_type" json:"actor_type"`
	EventType   string     `db:"event_type" json:"event_type"`
	Title       string     `db:"title" json:"title"`
	Description string     `db:"description" json:"description"`
	Metadata    []byte     `db:"metadata" json:"metadata"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
}

type ReceiptDeliveryResult struct {
	Message string `json:"message"`
	Target  string `json:"target"`
}

type ReceiptContext struct {
	Booking
	TenantName          string  `db:"tenant_name"`
	TenantPlan          string  `db:"tenant_plan"`
	TenantStatus        string  `db:"tenant_status"`
	ReceiptTitle        string  `db:"receipt_title"`
	ReceiptSubtitle     string  `db:"receipt_subtitle"`
	ReceiptFooter       string  `db:"receipt_footer"`
	ReceiptWhatsAppText string  `db:"receipt_whatsapp_text"`
	ReceiptTemplate     string  `db:"receipt_template"`
	CustomerName        string  `db:"customer_name"`
	CustomerPhone       string  `db:"customer_phone"`
	ResourceName        string  `db:"resource_name"`
	TotalResource       float64 `db:"total_resource"`
	TotalFnb            float64 `db:"total_fnb"`
}

type BookingOptionDetail struct {
	ID             uuid.UUID `json:"id"`
	ItemName       string    `db:"item_name" json:"item_name"`
	ItemType       string    `db:"item_type" json:"item_type"`
	Quantity       int       `db:"quantity" json:"quantity"`
	UnitPrice      float64   `db:"unit_price" json:"unit_price"`
	PriceAtBooking float64   `db:"price_at_booking" json:"price_at_booking"`
}

type ResourceItemSimple struct {
	ID       uuid.UUID `json:"id" db:"id"`
	Name     string    `json:"name" db:"name"`
	Price    float64   `json:"price" db:"price"`
	ItemType string    `db:"item_type"`
}

type AddOrderReq struct {
	FnbItemID uuid.UUID `json:"fnb_item_id" binding:"required"`
	Quantity  int       `json:"quantity" binding:"required,min=1"`
}
