package customer

import (
	"time"

	"github.com/google/uuid"
)

// Customer adalah entitas pelanggan utama yang terhubung ke Tenant (CRM).
type Customer struct {
	ID       uuid.UUID `db:"id" json:"id"`
	TenantID uuid.UUID `db:"tenant_id" json:"tenant_id"`
	Name     string    `db:"name" json:"name"`
	Phone    string    `db:"phone" json:"phone"`
	Email    *string   `db:"email" json:"email"`

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
	Name  string  `json:"name" binding:"required"`
	Phone string  `json:"phone" binding:"required"`
	Email *string `json:"email"`
}

type LoginReq struct {
	Phone string `json:"phone" binding:"required"`
}

type VerifyOtpReq struct {
	Phone string `json:"phone" binding:"required"`
	Code  string `json:"code" binding:"required"`
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
	ID            uuid.UUID `json:"id" db:"id"`
	Resource      string    `json:"resource" db:"resource"`
	Date          time.Time `json:"date" db:"date"`
	TotalSpent    int64     `json:"total_spent" db:"total_spent"`
	Status        string    `json:"status" db:"status"`
	PaymentStatus string    `json:"payment_status" db:"payment_status"`
}
