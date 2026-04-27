package resource

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Resource struct {
	ID          uuid.UUID        `db:"id" json:"id"`
	TenantID    uuid.UUID        `db:"tenant_id" json:"tenant_id"`
	Name        string           `db:"name" json:"name"`
	Category    string           `db:"category" json:"category"`
	Description string           `db:"description" json:"description"`
	ImageURL    string           `db:"image_url" json:"image_url"`
	Gallery     pq.StringArray   `db:"gallery" json:"gallery"`
	Status      string           `db:"status" json:"status"`
	// FIX: Gunakan pointer agar bisa handle NULL dari DB
	Metadata    *json.RawMessage `db:"metadata" json:"metadata"`
	Items       []ResourceItem   `db:"-" json:"items"`
	CreatedAt   time.Time        `db:"created_at" json:"created_at"`
}

type ResourceItem struct {
	ID           uuid.UUID       `db:"id" json:"id"`
	ResourceID   uuid.UUID       `db:"resource_id" json:"resource_id"`
	Name         string          `db:"name" json:"name"`
	Price        float64         `db:"price" json:"price"` 
	PriceUnit    string          `db:"price_unit" json:"price_unit"` 
	UnitDuration int             `db:"unit_duration" json:"unit_duration"` 
	ItemType     string          `db:"item_type" json:"item_type"`
	IsDefault    bool            `db:"is_default" json:"is_default"`
	// FIX: Gunakan pointer agar bisa handle NULL dari DB
	Metadata     *json.RawMessage `db:"metadata" json:"metadata"`
}