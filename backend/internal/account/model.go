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
	ID                 uuid.UUID `db:"id" json:"id"`
	TenantID           uuid.UUID `db:"tenant_id" json:"tenant_id"`
	OwnerUserID        uuid.UUID `db:"owner_user_id" json:"owner_user_id"`
	Name               string    `db:"name" json:"name"`
	Slug               string    `db:"slug" json:"slug"`
	BusinessCategory   string    `db:"business_category" json:"business_category"`
	BusinessType       string    `db:"business_type" json:"business_type"`
	Status             string    `db:"status" json:"status"`
	Plan               string    `db:"plan" json:"plan"`
	SubscriptionStatus string    `db:"subscription_status" json:"subscription_status"`
	Timezone           string    `db:"timezone" json:"timezone"`
	WhatsappNumber     string    `db:"whatsapp_number" json:"whatsapp_number"`
	CreatedAt          time.Time `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time `db:"updated_at" json:"updated_at"`
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
	WorkspaceID       uuid.UUID      `db:"workspace_id" json:"workspace_id"`
	CurrentStep       string         `db:"current_step" json:"current_step"`
	CompletedSteps    pq.StringArray `db:"completed_steps" json:"completed_steps"`
	SelectedStartMode string         `db:"selected_start_mode" json:"selected_start_mode"`
	IsCompleted       bool           `db:"is_completed" json:"is_completed"`
	StartedAt         time.Time      `db:"started_at" json:"started_at"`
	CompletedAt       *time.Time     `db:"completed_at" json:"completed_at,omitempty"`
	UpdatedAt         time.Time      `db:"updated_at" json:"updated_at"`
}

type SignupReq struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginReq struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type GoogleAuthReq struct {
	IDToken string `json:"id_token" binding:"required"`
}

type AuthResponse struct {
	Token   string  `json:"token"`
	Account Account `json:"account"`
}

type AuthMeResponse struct {
	Account    Account             `json:"account"`
	Workspaces []WorkspaceListItem `json:"workspaces"`
}

type CreateWorkspaceReq struct {
	Name             string `json:"name" binding:"required"`
	Slug             string `json:"slug"`
	BusinessCategory string `json:"business_category"`
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
