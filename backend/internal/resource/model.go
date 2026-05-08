package resource

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Resource struct {
	ID          uuid.UUID      `db:"id" json:"id"`
	TenantID    uuid.UUID      `db:"tenant_id" json:"tenant_id"`
	Name        string         `db:"name" json:"name"`
	Category    string         `db:"category" json:"category"`
	Description string         `db:"description" json:"description"`
	ImageURL    string         `db:"image_url" json:"image_url"`
	Gallery     pq.StringArray `db:"gallery" json:"gallery"`
	Status      string         `db:"status" json:"status"`
	// FIX: Gunakan pointer agar bisa handle NULL dari DB
	Metadata           *json.RawMessage     `db:"metadata" json:"metadata"`
	Items              []ResourceItem       `db:"-" json:"items"`
	SmartDeviceSummary *ResourceDeviceState `db:"-" json:"smart_device_summary,omitempty"`
	CreatedAt          time.Time            `db:"created_at" json:"created_at"`
}

type ResourceSummary struct {
	ID     uuid.UUID `db:"id" json:"id"`
	Name   string    `db:"name" json:"name"`
	Status string    `db:"status" json:"status"`
}

type ResourceDeviceState struct {
	ID               uuid.UUID  `db:"id" json:"id"`
	DeviceID         string     `db:"device_id" json:"device_id"`
	DeviceName       string     `db:"device_name" json:"device_name"`
	PairingStatus    string     `db:"pairing_status" json:"pairing_status"`
	ConnectionStatus string     `db:"connection_status" json:"connection_status"`
	IsEnabled        bool       `db:"is_enabled" json:"is_enabled"`
	LastSeenAt       *time.Time `db:"last_seen_at" json:"last_seen_at,omitempty"`
	FirmwareVersion  string     `db:"firmware_version" json:"firmware_version"`
}

type ResourceItem struct {
	ID           uuid.UUID `db:"id" json:"id"`
	ResourceID   uuid.UUID `db:"resource_id" json:"resource_id"`
	Name         string    `db:"name" json:"name"`
	Price        float64   `db:"price" json:"price"`
	PriceUnit    string    `db:"price_unit" json:"price_unit"`
	UnitDuration int       `db:"unit_duration" json:"unit_duration"`
	ItemType     string    `db:"item_type" json:"item_type"`
	IsDefault    bool      `db:"is_default" json:"is_default"`
	// FIX: Gunakan pointer agar bisa handle NULL dari DB
	Metadata *json.RawMessage `db:"metadata" json:"metadata"`
}
