package customer

import (
	"time"

	"github.com/google/uuid"
)

// Customer adalah entitas pelanggan platform-level yang dipakai lintas tenant.
type Customer struct {
	ID       uuid.UUID `db:"id" json:"id"`
	TenantID *uuid.UUID `db:"tenant_id" json:"tenant_id,omitempty"`
	Name     string    `db:"name" json:"name"`
	Phone    string    `db:"phone" json:"phone"`
	Email    *string   `db:"email" json:"email"`
	Password *string   `db:"password" json:"-"`

	// CRM Fields (Physical Data - Persistent)
	Tier        string     `db:"tier" json:"tier"` // NEW, REGULAR, GOLD, VIP
	TotalVisits int        `db:"total_visits" json:"total_visits"`
	TotalSpent  int64      `db:"total_spent" json:"total_spent"`
	LastVisit   *time.Time `db:"last_visit" json:"last_visit"`

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

type UpdateProfileReq struct {
	Name     *string `json:"name"`
	Email    *string `json:"email"`
	Password *string `json:"password"`
}

type AuthResponse struct {
	Token    string   `json:"token"`
	Customer Customer `json:"customer"`
}

// CustomerDashboardData: Menampung data untuk Mobile Dashboard /me
type CustomerDashboardData struct {
	Customer Customer `json:"customer"`
	Points   int      `json:"points"`
	// Dipisah agar Frontend bisa render Tab "Active" vs "History" dengan benar
	ActiveBookings []RecentHistoryDTO `json:"active_bookings"`
	PastHistory    []RecentHistoryDTO `json:"past_history"`
}

// RecentHistoryDTO digunakan untuk list bokingan di dashboard customer
type RecentHistoryDTO struct {
	ID            uuid.UUID  `json:"id" db:"id"`
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
