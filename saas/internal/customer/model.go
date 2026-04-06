package customer

import (
	"time"

	"github.com/google/uuid"
)

type Customer struct {
    ID            uuid.UUID `db:"id" json:"id"`
    TenantID      uuid.UUID `db:"tenant_id" json:"tenant_id"`
    Name          string    `db:"name" json:"name"`
    Phone         string    `db:"phone" json:"phone"`
    Email         *string   `db:"email" json:"email"`
    
    // CRM Fields (Physical Data)
    TotalVisits   int       `db:"total_visits" json:"total_visits"`
    TotalSpent    int64     `db:"total_spent" json:"total_spent"` // Gunakan int64 untuk money
    LastVisit     *time.Time `db:"last_visit" json:"last_visit"`
    Tier          string    `db:"tier" json:"tier"` // NEW, GOLD, VIP
    
    LoyaltyPoints int       `db:"loyalty_points" json:"loyalty_points"`
    CreatedAt     time.Time `db:"created_at" json:"created_at"`
    UpdatedAt     time.Time `db:"updated_at" json:"updated_at"`
}

type RegisterReq struct {
    Name  string  `json:"name" binding:"required"`
    Phone string  `json:"phone" binding:"required"`
    Email *string `json:"email"`
}