package fnb

import (
	"time"

	"github.com/google/uuid"
)

// Item mewakili struktur tabel fnb_items di database
type Item struct {
	ID          uuid.UUID `db:"id" json:"id"`
	TenantID    uuid.UUID `db:"tenant_id" json:"tenant_id"`
	Name        string    `db:"name" json:"name"`
	Description string    `db:"description" json:"description"` // Kolom baru untuk detail menu
	Price       float64   `db:"price" json:"price"`
	Category    string    `db:"category" json:"category"`
	// Menggunakan *string agar aman jika di database nilainya NULL
	ImageURL    *string   `db:"image_url" json:"image_url"` 
	IsAvailable bool      `db:"is_available" json:"is_available"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

// UpsertItemReq digunakan sebagai skema input untuk Create (POST) dan Update (PUT)
type UpsertItemReq struct {
	Name        string  `json:"name" binding:"required"`
	Description string  `json:"description"`           // Opsional, tidak wajib diisi
	Price       float64 `json:"price" binding:"required"`
	Category    string  `json:"category"`             // Jika kosong, Service akan memberi "General"
	ImageURL    *string `json:"image_url"`            // Menerima URL string hasil upload S3
	IsAvailable bool    `json:"is_available"`         // Mengontrol stok (Ready/Out of Stock)
}

// ItemResponse (Opsional) jika kamu ingin mengontrol output JSON yang lebih spesifik
type ItemResponse struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Price       float64   `json:"price"`
	Category    string    `json:"category"`
	ImageURL    string    `json:"image_url,omitempty"` // Menghilangkan field jika kosong
	IsAvailable bool      `json:"is_available"`
}