package billing

import (
	"time"

	"github.com/google/uuid"
)

type CheckoutReq struct {
	Plan     string `json:"plan" binding:"required"`     // starter | pro
	Interval string `json:"interval" binding:"required"` // monthly | annual
}

type BookingCheckoutReq struct {
	BookingID string `json:"booking_id" binding:"required"`
	Mode      string `json:"mode"`
}

type CheckoutRes struct {
	OrderID      string `json:"order_id"`
	SnapToken    string `json:"snap_token"`
	RedirectURL  string `json:"redirect_url"`
	Amount       int64  `json:"amount"`
	Currency     string `json:"currency"`
	Plan         string `json:"plan"`
	Interval     string `json:"interval"`
	DisplayLabel string `json:"display_label"`
}

type BookingCheckoutRes struct {
	OrderID      string  `json:"order_id"`
	SnapToken    string  `json:"snap_token"`
	RedirectURL  string  `json:"redirect_url"`
	Amount       float64 `json:"amount"`
	Currency     string  `json:"currency"`
	BookingID    string  `json:"booking_id"`
	DisplayLabel string  `json:"display_label"`
}

type SubscriptionInfo struct {
	TenantID           uuid.UUID  `json:"tenant_id"`
	Plan               string     `json:"plan"`
	Status             string     `json:"status"`
	CurrentPeriodStart *time.Time `json:"current_period_start"`
	CurrentPeriodEnd   *time.Time `json:"current_period_end"`
}

type BillingOrder struct {
	ID                    uuid.UUID `db:"id"`
	TenantID              uuid.UUID `db:"tenant_id"`
	OrderID               string    `db:"order_id"`
	Plan                  string    `db:"plan"`
	BillingInterval       string    `db:"billing_interval"`
	Amount                int64     `db:"amount"`
	Currency              string    `db:"currency"`
	Status                string    `db:"status"`
	MidtransTransactionID *string   `db:"midtrans_transaction_id"`
	MidtransPaymentType   *string   `db:"midtrans_payment_type"`
	MidtransRaw           []byte    `db:"midtrans_raw"`
	CreatedAt             time.Time `db:"created_at"`
	UpdatedAt             time.Time `db:"updated_at"`
}

type BookingPaymentSnapshot struct {
	ID            uuid.UUID `db:"id"`
	TenantID      uuid.UUID `db:"tenant_id"`
	GrandTotal    float64   `db:"grand_total"`
	DepositAmount float64   `db:"deposit_amount"`
	PaidAmount    float64   `db:"paid_amount"`
	BalanceDue    float64   `db:"balance_due"`
	PaymentStatus string    `db:"payment_status"`
	Status        string    `db:"status"`
}

type BookingNotificationContext struct {
	BookingID     uuid.UUID `db:"booking_id"`
	TenantID      uuid.UUID `db:"tenant_id"`
	CustomerID    uuid.UUID `db:"customer_id"`
	CustomerName  string    `db:"customer_name"`
	CustomerPhone string    `db:"customer_phone"`
	TenantSlug    string    `db:"tenant_slug"`
	ResourceName  string    `db:"resource_name"`
	GrandTotal    float64   `db:"grand_total"`
	DepositAmount float64   `db:"deposit_amount"`
	PaidAmount    float64   `db:"paid_amount"`
	BalanceDue    float64   `db:"balance_due"`
	PaymentStatus string    `db:"payment_status"`
	Status        string    `db:"status"`
}

type TenantLedgerEntry struct {
	ID                    uuid.UUID  `db:"id" json:"id"`
	TenantID              uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	SourceType            string     `db:"source_type" json:"source_type"`
	SourceID              *uuid.UUID `db:"source_id" json:"source_id"`
	SourceRef             string     `db:"source_ref" json:"source_ref"`
	MidtransOrderID       string     `db:"midtrans_order_id" json:"midtrans_order_id"`
	MidtransTransactionID string     `db:"midtrans_transaction_id" json:"midtrans_transaction_id"`
	TransactionStatus     string     `db:"transaction_status" json:"transaction_status"`
	PaymentType           string     `db:"payment_type" json:"payment_type"`
	Direction             string     `db:"direction" json:"direction"`
	GrossAmount           int64      `db:"gross_amount" json:"gross_amount"`
	PlatformFee           int64      `db:"platform_fee" json:"platform_fee"`
	NetAmount             int64      `db:"net_amount" json:"net_amount"`
	BalanceAfter          int64      `db:"balance_after" json:"balance_after"`
	Status                string     `db:"status" json:"status"`
	DedupeKey             string     `db:"dedupe_key" json:"dedupe_key"`
	RawPayload            []byte     `db:"raw_payload" json:"raw_payload"`
	CreatedAt             time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt             time.Time  `db:"updated_at" json:"updated_at"`
}

type MidtransNotificationLog struct {
	ID                uuid.UUID  `db:"id" json:"id"`
	TenantID          *uuid.UUID `db:"tenant_id" json:"tenant_id"`
	BookingID         *uuid.UUID `db:"booking_id" json:"booking_id"`
	OrderID           string     `db:"order_id" json:"order_id"`
	TransactionID     string     `db:"transaction_id" json:"transaction_id"`
	TransactionStatus string     `db:"transaction_status" json:"transaction_status"`
	FraudStatus       string     `db:"fraud_status" json:"fraud_status"`
	PaymentType       string     `db:"payment_type" json:"payment_type"`
	GrossAmount       int64      `db:"gross_amount" json:"gross_amount"`
	SignatureValid    bool       `db:"signature_valid" json:"signature_valid"`
	ProcessingStatus  string     `db:"processing_status" json:"processing_status"`
	ErrorMessage      string     `db:"error_message" json:"error_message"`
	RawPayload        []byte     `db:"raw_payload" json:"raw_payload"`
	ReceivedAt        time.Time  `db:"received_at" json:"received_at"`
	ProcessedAt       *time.Time `db:"processed_at" json:"processed_at"`
}
