package midtrans

import (
	"time"

	"github.com/google/uuid"
)

type BookingNotificationContext struct {
	BookingID     uuid.UUID `db:"booking_id"`
	TenantID      uuid.UUID `db:"tenant_id"`
	CustomerID    uuid.UUID `db:"customer_id"`
	AccessToken   uuid.UUID `db:"access_token"`
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

type SubscriptionOrder struct {
	TenantID        uuid.UUID
	Amount          int64
	Status          string
	Plan            string
	BillingInterval string
}
