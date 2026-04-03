package fnb

import (
	"time"

	"github.com/google/uuid"
)

type Item struct {
	ID          uuid.UUID `db:"id" json:"id"`
	TenantID    uuid.UUID `db:"tenant_id" json:"tenant_id"`
	Name        string    `db:"name" json:"name"`
	Price       float64   `db:"price" json:"price"`
	Category    string    `db:"category" json:"category"`
	// Menggunakan *string agar bisa menangani nilai NULL dari DB
	ImageURL    *string   `db:"image_url" json:"image_url"` 
	IsAvailable bool      `db:"is_available" json:"is_available"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

type UpsertItemReq struct {
	Name        string  `json:"name" binding:"required"`
	Price       float64 `json:"price" binding:"required"`
	Category    string  `json:"category"`
	ImageURL    *string `json:"image_url"`
	IsAvailable bool    `json:"is_available"`
}