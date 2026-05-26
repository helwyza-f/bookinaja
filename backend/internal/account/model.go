package account

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Account struct {
	ID              uuid.UUID  `db:"id" json:"id"`
	Name            string     `db:"name" json:"name"`
	Email           string     `db:"email" json:"email"`
	PasswordHash    string     `db:"password_hash" json:"-"`
	GoogleSubject   *string    `db:"google_subject" json:"google_subject,omitempty"`
	EmailVerifiedAt *time.Time `db:"email_verified_at" json:"email_verified_at,omitempty"`
	CreatedAt       time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time  `db:"updated_at" json:"updated_at"`
}

type Workspace struct {
	ID                 uuid.UUID  `db:"id" json:"id"`
	TenantID           uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	OwnerUserID        uuid.UUID  `db:"owner_user_id" json:"owner_user_id"`
	Name               string     `db:"name" json:"name"`
	Slug               string     `db:"slug" json:"slug"`
	BusinessCategory   string     `db:"business_category" json:"business_category"`
	BusinessType       string     `db:"business_type" json:"business_type"`
	Status             string     `db:"status" json:"status"`
	Plan               string     `db:"plan" json:"plan"`
	SubscriptionStatus string     `db:"subscription_status" json:"subscription_status"`
	Timezone           string     `db:"timezone" json:"timezone"`
	WhatsappNumber     string     `db:"whatsapp_number" json:"whatsapp_number"`
	ReferredByTenantID *uuid.UUID `db:"referred_by_tenant_id" json:"referred_by_tenant_id,omitempty"`
	CreatedAt          time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time  `db:"updated_at" json:"updated_at"`
}

type WorkspaceMembership struct {
	ID             uuid.UUID      `db:"id" json:"id"`
	AccountID      uuid.UUID      `db:"account_id" json:"account_id"`
	WorkspaceID    uuid.UUID      `db:"workspace_id" json:"workspace_id"`
	AdminUserID    uuid.UUID      `db:"admin_user_id" json:"admin_user_id"`
	Role           string         `db:"role" json:"role"`
	PermissionKeys pq.StringArray `db:"permission_keys" json:"permission_keys"`
	Status         string         `db:"status" json:"status"`
	CreatedAt      time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time      `db:"updated_at" json:"updated_at"`
}

type OnboardingState struct {
	WorkspaceID       uuid.UUID       `db:"workspace_id" json:"workspace_id"`
	CurrentStep       string          `db:"current_step" json:"current_step"`
	CompletedSteps    pq.StringArray  `db:"completed_steps" json:"completed_steps"`
	SelectedStartMode string          `db:"selected_start_mode" json:"selected_start_mode"`
	IsCompleted       bool            `db:"is_completed" json:"is_completed"`
	StartedAt         time.Time       `db:"started_at" json:"started_at"`
	CompletedAt       *time.Time      `db:"completed_at" json:"completed_at,omitempty"`
	UpdatedAt         time.Time       `db:"updated_at" json:"updated_at"`
	Seed              *OnboardingSeed `db:"-" json:"seed,omitempty"`
}

type OnboardingSeed struct {
	Resource       OnboardingResourceSeed `json:"resource"`
	Business       OnboardingBusinessSeed `json:"business"`
	PaymentMethods PaymentOnboardingReq   `json:"payment_methods"`
}

type OnboardingResourceSeed struct {
	ResourceName     string `db:"resource_name" json:"resource_name"`
	ResourceCategory string `db:"resource_category" json:"resource_category"`
	ResourceDesc     string `db:"resource_description" json:"resource_description"`
	ResourceImageURL string `db:"resource_image_url" json:"resource_image_url"`
	PriceName        string `db:"price_name" json:"price_name"`
	Price            int64  `db:"price" json:"price"`
	PriceUnit        string `db:"price_unit" json:"price_unit"`
	UnitDuration     int    `db:"unit_duration" json:"unit_duration"`
}

type OnboardingBusinessSeed struct {
	OpenTime       string `db:"open_time" json:"open_time"`
	CloseTime      string `db:"close_time" json:"close_time"`
	WhatsappNumber string `db:"whatsapp_number" json:"whatsapp_number"`
}

type SignupReq struct {
	Name         string `json:"name"`
	Email        string `json:"email" binding:"required,email"`
	Password     string `json:"password" binding:"required,min=6"`
	ReferralCode string `json:"referral_code"`
}

type SignupResponse struct {
	Account              Account `json:"account"`
	VerificationRequired bool    `json:"verification_required"`
	EmailSent            bool    `json:"email_sent"`
	Message              string  `json:"message"`
}

type LoginReq struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type GoogleAuthReq struct {
	IDToken string `json:"id_token" binding:"required"`
}

type EmailVerificationRequestReq struct {
	Email string `json:"email" binding:"required,email"`
}

type EmailVerificationVerifyReq struct {
	Token string `json:"token" binding:"required"`
}

type AuthResponse struct {
	Token   string  `json:"token"`
	Account Account `json:"account"`
}

type EmailVerificationResponse struct {
	Email   string `json:"email,omitempty"`
	Message string `json:"message"`
}

type AuthMeResponse struct {
	Account    Account             `json:"account"`
	Workspaces []WorkspaceListItem `json:"workspaces"`
}

type CreateWorkspaceReq struct {
	Name             string `json:"name" binding:"required"`
	Slug             string `json:"slug"`
	BusinessCategory string `json:"business_category"`
	ReferralCode     string `json:"referral_code"`
}

type OnboardingStepUpdateReq struct {
	SelectedStartMode string               `json:"selected_start_mode"`
	NextStep          string               `json:"next_step"`
	Complete          bool                 `json:"complete"`
	ResourceName      string               `json:"resource_name"`
	ResourceCategory  string               `json:"resource_category"`
	ResourceDesc      string               `json:"resource_description"`
	ResourceImageURL  string               `json:"resource_image_url"`
	PriceName         string               `json:"price_name"`
	Price             int64                `json:"price"`
	PriceUnit         string               `json:"price_unit"`
	UnitDuration      int                  `json:"unit_duration"`
	OpenTime          string               `json:"open_time"`
	CloseTime         string               `json:"close_time"`
	WhatsappNumber    string               `json:"whatsapp_number"`
	PaymentMethods    PaymentOnboardingReq `json:"payment_methods"`
	FirstBooking      FirstBookingReq      `json:"first_booking"`
}

type PaymentOnboardingReq struct {
	BankTransferEnabled bool   `json:"bank_transfer_enabled"`
	BankName            string `json:"bank_name"`
	BankAccountName     string `json:"bank_account_name"`
	BankAccountNumber   string `json:"bank_account_number"`
	BankInstructions    string `json:"bank_instructions"`
	QRISStaticEnabled   bool   `json:"qris_static_enabled"`
	QRISImageURL        string `json:"qris_image_url"`
	QRISInstructions    string `json:"qris_instructions"`
}

type FirstBookingReq struct {
	CustomerName  string `json:"customer_name"`
	CustomerPhone string `json:"customer_phone"`
	BookingDate   string `json:"booking_date"`
	BookingTime   string `json:"booking_time"`
	BookingMode   string `json:"booking_mode"`
	Quantity      int    `json:"quantity"`
}

type WorkspaceListItem struct {
	Workspace
	Role            string           `json:"role"`
	OnboardingState *OnboardingState `json:"onboarding_state,omitempty"`
}

type CreateWorkspaceResponse struct {
	Workspace       Workspace           `json:"workspace"`
	Membership      WorkspaceMembership `json:"membership"`
	OnboardingState OnboardingState     `json:"onboarding_state"`
}
