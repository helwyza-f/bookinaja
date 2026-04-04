package fnb

import (
	"time"

	"github.com/google/uuid"
)

type Item struct {
	ID          uuid.UUID `db:"id" json:"id"`
	TenantID    uuid.UUID `db:"tenant_id" json:"tenant_id"`
	Name        string    `db:"name" json:"name"`
	Description string    `db:"description" json:"description"` // Tambahan untuk detail POS
	Price       float64   `db:"price" json:"price"`
	Category    string    `db:"category" json:"category"`
	// Menggunakan *string agar bisa menangani nilai NULL dari DB tanpa crash
	ImageURL    *string   `db:"image_url" json:"image_url"` 
	IsAvailable bool      `db:"is_available" json:"is_available"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

// UpsertItemReq digunakan untuk Create dan Update
type UpsertItemReq struct {
	Name        string  `json:"name" binding:"required"`
	Description string  `json:"description"` // Opsional
	Price       float64 `json:"price" binding:"required"`
	Category    string  `json:"category"`
	ImageURL    *string `json:"image_url"`    // Bisa null jika tidak upload gambar
	IsAvailable bool    `json:"is_available"` // Default true saat create
}

// Update Response Helper (Opsional, jika ingin response yang clean)
type ItemResponse struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Category    string  `json:"category"`
	ImageURL    string  `json:"image_url,omitempty"`
	IsAvailable bool    `json:"is_available"`
}