package platformadmin

import "time"

type LoginReq struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
}

type TenantSummary struct {
	ID                 string     `db:"id" json:"id"`
	Name               string     `db:"name" json:"name"`
	Slug               string     `db:"slug" json:"slug"`
	BusinessCategory   string     `db:"business_category" json:"business_category"`
	Plan               string     `db:"plan" json:"plan"`
	SubscriptionStatus string     `db:"subscription_status" json:"subscription_status"`
	PeriodStart        *time.Time `db:"subscription_current_period_start" json:"subscription_current_period_start"`
	PeriodEnd          *time.Time `db:"subscription_current_period_end" json:"subscription_current_period_end"`
	CreatedAt          time.Time  `db:"created_at" json:"created_at"`
}

type CustomerSummary struct {
	ID          string     `db:"id" json:"id"`
	TenantID    string     `db:"tenant_id" json:"tenant_id"`
	TenantSlug  string     `db:"tenant_slug" json:"tenant_slug"`
	TenantName  string     `db:"tenant_name" json:"tenant_name"`
	Name        string     `db:"name" json:"name"`
	Phone       string     `db:"phone" json:"phone"`
	Tier        string     `db:"tier" json:"tier"`
	TotalVisits int        `db:"total_visits" json:"total_visits"`
	TotalSpent  int64      `db:"total_spent" json:"total_spent"`
	LastVisit   *time.Time `db:"last_visit" json:"last_visit"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
}

type BillingSummary struct {
	ID              string    `db:"id" json:"id"`
	TenantID        string    `db:"tenant_id" json:"tenant_id"`
	TenantSlug      string    `db:"tenant_slug" json:"tenant_slug"`
	TenantName      string    `db:"tenant_name" json:"tenant_name"`
	OrderID         string    `db:"order_id" json:"order_id"`
	Plan            string    `db:"plan" json:"plan"`
	BillingInterval string    `db:"billing_interval" json:"billing_interval"`
	Amount          int64     `db:"amount" json:"amount"`
	Currency        string    `db:"currency" json:"currency"`
	Status          string    `db:"status" json:"status"`
	PaymentType     *string   `db:"midtrans_payment_type" json:"midtrans_payment_type"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
}
