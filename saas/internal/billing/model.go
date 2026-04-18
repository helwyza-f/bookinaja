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
