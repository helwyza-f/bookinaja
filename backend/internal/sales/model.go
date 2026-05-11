package sales

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type Order struct {
	ID              uuid.UUID             `db:"id" json:"id"`
	TenantID        uuid.UUID             `db:"tenant_id" json:"tenant_id"`
	CustomerID      *uuid.UUID            `db:"customer_id" json:"customer_id,omitempty"`
	ResourceID      uuid.UUID             `db:"resource_id" json:"resource_id"`
	AccessToken     uuid.UUID             `db:"access_token" json:"access_token,omitempty"`
	ResourceName    string                `db:"resource_name" json:"resource_name,omitempty"`
	OrderNumber     string                `db:"order_number" json:"order_number"`
	Status          string                `db:"status" json:"status"`
	Subtotal        float64               `db:"subtotal" json:"subtotal"`
	DiscountAmount  float64               `db:"discount_amount" json:"discount_amount"`
	GrandTotal      float64               `db:"grand_total" json:"grand_total"`
	PaidAmount      float64               `db:"paid_amount" json:"paid_amount"`
	BalanceDue      float64               `db:"balance_due" json:"balance_due"`
	PaymentStatus   string                `db:"payment_status" json:"payment_status"`
	PaymentMethod   string                `db:"payment_method" json:"payment_method"`
	Notes           string                `db:"notes" json:"notes"`
	CreatedByUserID *uuid.UUID            `db:"created_by_user_id" json:"created_by_user_id,omitempty"`
	CompletedAt     *time.Time            `db:"completed_at" json:"completed_at,omitempty"`
	CreatedAt       time.Time             `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time             `db:"updated_at" json:"updated_at"`
	PaymentMethods  []OrderPaymentMethod  `db:"-" json:"payment_methods"`
	PaymentAttempts []OrderPaymentAttempt `db:"-" json:"payment_attempts"`
	Items           []OrderItem           `db:"-" json:"items"`
}

type PublicOrderItemInput struct {
	ResourceItemID string `json:"resource_item_id"`
	Quantity       int    `json:"quantity"`
}

type CreatePublicOrderInput struct {
	ResourceID    string                 `json:"resource_id"`
	CustomerName  string                 `json:"customer_name"`
	CustomerPhone string                 `json:"customer_phone"`
	Notes         string                 `json:"notes"`
	Items         []PublicOrderItemInput `json:"items"`
}

type OrderItem struct {
	ID             uuid.UUID        `db:"id" json:"id"`
	SalesOrderID   uuid.UUID        `db:"sales_order_id" json:"sales_order_id"`
	ResourceItemID *uuid.UUID       `db:"resource_item_id" json:"resource_item_id,omitempty"`
	ItemName       string           `db:"item_name" json:"item_name"`
	ItemType       string           `db:"item_type" json:"item_type"`
	Quantity       int              `db:"quantity" json:"quantity"`
	UnitPrice      float64          `db:"unit_price" json:"unit_price"`
	Subtotal       float64          `db:"subtotal" json:"subtotal"`
	Metadata       *json.RawMessage `db:"metadata" json:"metadata,omitempty"`
	CreatedAt      time.Time        `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time        `db:"updated_at" json:"updated_at"`
}

type CreateOrderInput struct {
	ResourceID     string  `json:"resource_id"`
	CustomerID     string  `json:"customer_id"`
	DiscountAmount float64 `json:"discount_amount"`
	Notes          string  `json:"notes"`
	PaymentMethod  string  `json:"payment_method"`
}

type AddItemInput struct {
	ResourceItemID string  `json:"resource_item_id"`
	ItemName       string  `json:"item_name"`
	ItemType       string  `json:"item_type"`
	Quantity       int     `json:"quantity"`
	UnitPrice      float64 `json:"unit_price"`
}

type UpdateItemInput = AddItemInput

type CheckoutInput struct {
	PaymentMethod string `json:"payment_method"`
	Notes         string `json:"notes"`
}

type CashSettleInput struct {
	PaymentMethod string `json:"payment_method"`
	Notes         string `json:"notes"`
}

type PaymentCheckoutInput struct {
	Method string `json:"method"`
}

type ManualPaymentInput struct {
	Method   string `json:"method"`
	Note     string `json:"note"`
	ProofURL string `json:"proof_url"`
}

type PaymentVerificationInput struct {
	Notes string `json:"notes"`
}

type OrderPaymentMethod struct {
	Code             string `json:"code" db:"code"`
	DisplayName      string `json:"display_name" db:"display_name"`
	Category         string `json:"category" db:"category"`
	VerificationType string `json:"verification_type" db:"verification_type"`
	Provider         string `json:"provider" db:"provider"`
	Instructions     string `json:"instructions" db:"instructions"`
	IsActive         bool   `json:"is_active" db:"is_active"`
	SortOrder        int    `json:"sort_order" db:"sort_order"`
	Metadata         JSONB  `json:"metadata" db:"metadata"`
}

type OrderPaymentAttempt struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	MethodCode       string     `json:"method_code" db:"method_code"`
	MethodLabel      string     `json:"method_label" db:"method_label"`
	VerificationType string     `json:"verification_type" db:"verification_type"`
	PaymentScope     string     `json:"payment_scope" db:"payment_scope"`
	Amount           int64      `json:"amount" db:"amount"`
	Status           string     `json:"status" db:"status"`
	ReferenceCode    string     `json:"reference_code" db:"reference_code"`
	PayerNote        string     `json:"payer_note" db:"payer_note"`
	AdminNote        string     `json:"admin_note" db:"admin_note"`
	ProofURL         string     `json:"proof_url" db:"proof_url"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	SubmittedAt      *time.Time `json:"submitted_at" db:"submitted_at"`
	VerifiedAt       *time.Time `json:"verified_at" db:"verified_at"`
	RejectedAt       *time.Time `json:"rejected_at" db:"rejected_at"`
}

type paymentAttemptRecord struct {
	ID                   uuid.UUID  `db:"id"`
	SalesOrderID         uuid.UUID  `db:"sales_order_id"`
	TenantID             uuid.UUID  `db:"tenant_id"`
	CustomerID           *uuid.UUID `db:"customer_id"`
	MethodCode           string     `db:"method_code"`
	MethodLabel          string     `db:"method_label"`
	Category             string     `db:"category"`
	VerificationType     string     `db:"verification_type"`
	PaymentScope         string     `db:"payment_scope"`
	Amount               int64      `db:"amount"`
	Status               string     `db:"status"`
	ReferenceCode        string     `db:"reference_code"`
	GatewayOrderID       string     `db:"gateway_order_id"`
	GatewayTransactionID string     `db:"gateway_transaction_id"`
	PayerNote            string     `db:"payer_note"`
	AdminNote            string     `db:"admin_note"`
	ProofURL             string     `db:"proof_url"`
	Metadata             JSONB      `db:"metadata"`
	SubmittedAt          *time.Time `db:"submitted_at"`
	VerifiedAt           *time.Time `db:"verified_at"`
	RejectedAt           *time.Time `db:"rejected_at"`
	ExpiresAt            *time.Time `db:"expires_at"`
	CreatedAt            time.Time  `db:"created_at"`
	UpdatedAt            time.Time  `db:"updated_at"`
}

type PaymentCheckoutRes struct {
	OrderID      string  `json:"order_id"`
	SnapToken    string  `json:"snap_token"`
	RedirectURL  string  `json:"redirect_url"`
	Amount       float64 `json:"amount"`
	Currency     string  `json:"currency"`
	SalesOrderID string  `json:"sales_order_id"`
	DisplayLabel string  `json:"display_label"`
	MethodCode   string  `json:"method_code"`
	MethodLabel  string  `json:"method_label"`
	Status       string  `json:"status"`
	Instructions string  `json:"instructions,omitempty"`
	Reference    string  `json:"reference,omitempty"`
	ProofUpload  bool    `json:"proof_upload"`
}

type POSActionFeedItem struct {
	Kind          string     `db:"kind" json:"kind"`
	ID            uuid.UUID  `db:"id" json:"id"`
	TenantID      uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	ResourceID    uuid.UUID  `db:"resource_id" json:"resource_id"`
	ResourceName  string     `db:"resource_name" json:"resource_name"`
	CustomerID    *uuid.UUID `db:"customer_id" json:"customer_id,omitempty"`
	CustomerName  string     `db:"customer_name" json:"customer_name,omitempty"`
	CustomerPhone string     `db:"customer_phone" json:"customer_phone,omitempty"`
	Status        string     `db:"status" json:"status"`
	PaymentStatus string     `db:"payment_status" json:"payment_status"`
	ActionLabel   string     `db:"action_label" json:"action_label"`
	Priority      int        `db:"priority" json:"priority"`
	ScheduledAt   *time.Time `db:"scheduled_at" json:"scheduled_at,omitempty"`
	EndTime       *time.Time `db:"end_time" json:"end_time,omitempty"`
	Total         float64    `db:"total" json:"total"`
	BalanceDue    float64    `db:"balance_due" json:"balance_due"`
	OperatingMode string     `db:"operating_mode" json:"operating_mode"`
}

type JSONB []byte

func (j JSONB) Value() (driver.Value, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	if !json.Valid(j) {
		return nil, fmt.Errorf("invalid jsonb payload")
	}
	return []byte(j), nil
}

func (j *JSONB) Scan(src any) error {
	switch value := src.(type) {
	case nil:
		*j = JSONB(`{}`)
		return nil
	case []byte:
		*j = append((*j)[:0], value...)
		return nil
	case string:
		*j = append((*j)[:0], value...)
		return nil
	default:
		return fmt.Errorf("unsupported jsonb source %T", src)
	}
}

func (j JSONB) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte(`{}`), nil
	}
	if json.Valid(j) {
		return j, nil
	}
	return json.Marshal(string(j))
}
