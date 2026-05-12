package customer

import (
	"time"

	"github.com/google/uuid"
)

// Customer adalah entitas pelanggan platform-level yang dipakai lintas tenant.
type Customer struct {
	ID        uuid.UUID  `db:"id" json:"id"`
	TenantID  *uuid.UUID `db:"tenant_id" json:"tenant_id,omitempty"`
	Name      string     `db:"name" json:"name"`
	Phone     string     `db:"phone" json:"phone"`
	Email     *string    `db:"email" json:"email"`
	Password  *string    `db:"password" json:"-"`
	AvatarURL *string    `db:"avatar_url" json:"avatar_url,omitempty"`

	// CRM Fields (Physical Data - Persistent)
	Tier               string     `db:"tier" json:"tier"` // NEW, REGULAR, GOLD, VIP
	TotalVisits        int        `db:"total_visits" json:"total_visits"`
	TotalSpent         int64      `db:"total_spent" json:"total_spent"`
	LastVisit          *time.Time `db:"last_visit" json:"last_visit"`
	AccountStatus      string     `db:"account_status" json:"account_status"`
	AccountStage       string     `db:"account_stage" json:"account_stage"`
	RegistrationSource string     `db:"registration_source" json:"registration_source"`
	PhoneVerifiedAt    *time.Time `db:"phone_verified_at" json:"phone_verified_at"`
	EmailVerifiedAt    *time.Time `db:"email_verified_at" json:"email_verified_at,omitempty"`
	GoogleSubject      *string    `db:"google_subject" json:"-"`
	LastLoginMethod    *string    `db:"last_login_method" json:"last_login_method,omitempty"`
	LastLoginAt        *time.Time `db:"last_login_at" json:"last_login_at,omitempty"`
	SilentRegisteredAt *time.Time `db:"silent_registered_at" json:"silent_registered_at,omitempty"`
	ProfileCompletedAt *time.Time `db:"profile_completed_at" json:"profile_completed_at,omitempty"`
	MarketingOptIn     bool       `db:"marketing_opt_in" json:"marketing_opt_in"`
	BirthDate          *time.Time `db:"birth_date" json:"birth_date,omitempty"`
	Gender             *string    `db:"gender" json:"gender,omitempty"`
	City               *string    `db:"city" json:"city,omitempty"`
	Province           *string    `db:"province" json:"province,omitempty"`
	CountryCode        string     `db:"country_code" json:"country_code"`

	LoyaltyPoints int       `db:"loyalty_points" json:"loyalty_points"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time `db:"updated_at" json:"updated_at"`
}

// --- DTO (Data Transfer Object) ---

type RegisterReq struct {
	Name     string  `json:"name" binding:"required"`
	Phone    string  `json:"phone" binding:"required"`
	Email    *string `json:"email"`
	Password *string `json:"password"`
}

type LoginReq struct {
	Phone string `json:"phone" binding:"required"`
}

type VerifyOtpReq struct {
	Phone string `json:"phone" binding:"required"`
	Code  string `json:"code" binding:"required"`
}

type GoogleLoginReq struct {
	IDToken string `json:"id_token" binding:"required"`
}

type GoogleClaimReq struct {
	ClaimToken     string `json:"claim_token" binding:"required"`
	Phone          string `json:"phone" binding:"required"`
	Name           string `json:"name"`
	MarketingOptIn *bool  `json:"marketing_opt_in"`
}

type UpdateProfileReq struct {
	Name           *string `json:"name"`
	Email          *string `json:"email"`
	AvatarURL      *string `json:"avatar_url"`
	BirthDate      *string `json:"birth_date"`
	Gender         *string `json:"gender"`
	City           *string `json:"city"`
	Province       *string `json:"province"`
	CountryCode    *string `json:"country_code"`
	MarketingOptIn *bool   `json:"marketing_opt_in"`
}

type UpdatePasswordReq struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required"`
}

type RequestPasswordResetReq struct {
	Phone string `json:"phone" binding:"required"`
}

type RequestPasswordResetEmailReq struct {
	Email string `json:"email" binding:"required,email"`
}

type VerifyPasswordResetReq struct {
	Phone       string `json:"phone" binding:"required"`
	Code        string `json:"code" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}

type VerifyPasswordResetEmailReq struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}

type RequestEmailVerificationReq struct {
	Email string `json:"email" binding:"omitempty,email"`
}

type VerifyEmailReq struct {
	Token string `json:"token" binding:"required"`
}

type RequestPhoneChangeReq struct {
	NewPhone string `json:"new_phone" binding:"required"`
}

type VerifyPhoneChangeReq struct {
	NewPhone string `json:"new_phone" binding:"required"`
	Code     string `json:"code" binding:"required"`
}

type AuthResponse struct {
	Token    string   `json:"token"`
	Customer Customer `json:"customer"`
}

type GoogleAuthResponse struct {
	Status     string    `json:"status"`
	Token      string    `json:"token,omitempty"`
	Customer   *Customer `json:"customer,omitempty"`
	ClaimToken string    `json:"claim_token,omitempty"`
	Profile    any       `json:"profile,omitempty"`
	Message    string    `json:"message,omitempty"`
}

type RegisterStartResponse struct {
	Message  string   `json:"message"`
	Phone    string   `json:"phone"`
	Customer Customer `json:"customer"`
}

type GoogleProfilePreview struct {
	Name      string  `json:"name"`
	Email     *string `json:"email,omitempty"`
	AvatarURL *string `json:"avatar_url,omitempty"`
}

// CustomerDashboardData: Menampung data untuk Mobile Dashboard /me
type CustomerDashboardData struct {
	Customer          Customer             `json:"customer"`
	Points            int                  `json:"points"`
	PointActivity     []CustomerPointEvent `json:"point_activity"`
	ProfileCompletion int                  `json:"profile_completion"`
	IdentityMethods   []string             `json:"identity_methods"`
	// Dipisah agar Frontend bisa render Tab "Active" vs "History" dengan benar
	ActiveBookings []RecentHistoryDTO `json:"active_bookings"`
	ActiveOrders   []RecentHistoryDTO `json:"active_orders"`
	PastHistory    []RecentHistoryDTO `json:"past_history"`
	PastOrders     []RecentHistoryDTO `json:"past_orders"`
}

type CustomerPortalSummaryData struct {
	CustomerID        string               `json:"customer_id"`
	Customer          Customer             `json:"customer"`
	Points            int                  `json:"points"`
	PointActivity     []CustomerPointEvent `json:"point_activity"`
	ProfileCompletion int                  `json:"profile_completion"`
	IdentityMethods   []string             `json:"identity_methods"`
	ActiveBookings    []RecentHistoryDTO   `json:"active_bookings"`
	ActiveOrders      []RecentHistoryDTO   `json:"active_orders"`
	PastHistory       []RecentHistoryDTO   `json:"past_history"`
}

type CustomerPortalActiveData struct {
	CustomerID     string             `json:"customer_id"`
	ActiveBookings []RecentHistoryDTO `json:"active_bookings"`
	ActiveOrders   []RecentHistoryDTO `json:"active_orders"`
}

type CustomerPortalHistoryData struct {
	CustomerID  string             `json:"customer_id"`
	PastHistory []RecentHistoryDTO `json:"past_history"`
	PastOrders  []RecentHistoryDTO `json:"past_orders"`
}

type CustomerPortalSettingsData struct {
	Customer        Customer             `json:"customer"`
	Points          int                  `json:"points"`
	PointActivity   []CustomerPointEvent `json:"point_activity"`
	PastHistory     []RecentHistoryDTO   `json:"past_history"`
	IdentityMethods []string             `json:"identity_methods"`
	HasPassword     bool                 `json:"has_password"`
}

type CustomerPointEvent struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	CustomerID  uuid.UUID  `json:"customer_id" db:"customer_id"`
	TenantID    *uuid.UUID `json:"tenant_id" db:"tenant_id"`
	TenantName  *string    `json:"tenant_name" db:"tenant_name"`
	TenantSlug  *string    `json:"tenant_slug" db:"tenant_slug"`
	BookingID   *uuid.UUID `json:"booking_id" db:"booking_id"`
	EventType   string     `json:"event_type" db:"event_type"`
	Points      int        `json:"points" db:"points"`
	Description *string    `json:"description" db:"description"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
}

type CustomerPointSummary struct {
	Balance          int                  `json:"balance"`
	EarnedAtTenant   int                  `json:"earned_at_tenant"`
	Activity         []CustomerPointEvent `json:"activity"`
	EarningRuleLabel string               `json:"earning_rule_label"`
}

// RecentHistoryDTO digunakan untuk list bokingan di dashboard customer
type RecentHistoryDTO struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	Kind          string     `json:"kind" db:"kind"`
	TenantID      uuid.UUID  `json:"tenant_id" db:"tenant_id"`
	TenantName    string     `json:"tenant_name" db:"tenant_name"`
	TenantSlug    string     `json:"tenant_slug" db:"tenant_slug"`
	Resource      string     `json:"resource" db:"resource"`
	Date          time.Time  `json:"date" db:"date"`
	EndDate       *time.Time `json:"end_date" db:"end_date"`
	GrandTotal    int64      `json:"grand_total" db:"grand_total"`
	DepositAmount int64      `json:"deposit_amount" db:"deposit_amount"`
	TotalSpent    int64      `json:"total_spent" db:"total_spent"`
	PaidAmount    int64      `json:"paid_amount" db:"paid_amount"`
	BalanceDue    int64      `json:"balance_due" db:"balance_due"`
	Status        string     `json:"status" db:"status"`
	PaymentStatus string     `json:"payment_status" db:"payment_status"`
	PaymentMethod string     `json:"payment_method" db:"payment_method"`
}

type CustomerDetailWithHistory struct {
	Customer
	TransactionHistory []RecentHistoryDTO `json:"transaction_history"`
}

type BroadcastAnnouncementReq struct {
	Message string `json:"message"`
	Target  string `json:"target"`
}

type BroadcastTarget struct {
	ID    uuid.UUID `db:"id" json:"id"`
	Name  string    `db:"name" json:"name"`
	Phone string    `db:"phone" json:"phone"`
}

type BroadcastResult struct {
	TenantID   uuid.UUID `json:"tenant_id"`
	Total      int       `json:"total"`
	Sent       int       `json:"sent"`
	Skipped    int       `json:"skipped"`
	Failed     int       `json:"failed"`
	DefaultMsg bool      `json:"default_message"`
}

type CustomerImportRow struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
}

type CustomerImportResult struct {
	Total    int      `json:"total"`
	Created  int      `json:"created"`
	Updated  int      `json:"updated"`
	Skipped  int      `json:"skipped"`
	Failed   int      `json:"failed"`
	Messages []string `json:"messages"`
}

func (c Customer) IsVerified() bool {
	return c.AccountStatus == "" || c.AccountStatus == "verified"
}

func (c Customer) IsProvisioned() bool {
	return c.AccountStage == "" || c.AccountStage == "provisioned"
}

type LegacyCustomerContact struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	TenantID    uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	Name        string     `db:"name" json:"name"`
	Phone       string     `db:"phone" json:"phone"`
	Source      string     `db:"source" json:"source"`
	LastBlastAt *time.Time `db:"last_blast_at" json:"last_blast_at"`
	BlastCount  int        `db:"blast_count" json:"blast_count"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updated_at"`
}
