package resource

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Resource struct {
	ID            uuid.UUID      `db:"id" json:"id"`
	TenantID      uuid.UUID      `db:"tenant_id" json:"tenant_id"`
	Name          string         `db:"name" json:"name"`
	Category      string         `db:"category" json:"category"`
	OperatingMode string         `db:"operating_mode" json:"operating_mode"`
	Description   string         `db:"description" json:"description"`
	ImageURL      string         `db:"image_url" json:"image_url"`
	Gallery       pq.StringArray `db:"gallery" json:"gallery"`
	Status        string         `db:"status" json:"status"`
	DPEnabled     bool           `db:"dp_enabled" json:"dp_enabled"`
	DPPercentage  float64        `db:"dp_percentage" json:"dp_percentage"`
	// FIX: Gunakan pointer agar bisa handle NULL dari DB
	Metadata           *json.RawMessage     `db:"metadata" json:"metadata"`
	Items              []ResourceItem       `db:"-" json:"items"`
	SmartDeviceSummary *ResourceDeviceState `db:"-" json:"smart_device_summary,omitempty"`
	CreatedAt          time.Time            `db:"created_at" json:"created_at"`
}

type ResourceSummary struct {
	ID            uuid.UUID `db:"id" json:"id"`
	Name          string    `db:"name" json:"name"`
	Status        string    `db:"status" json:"status"`
	Category      string    `db:"category" json:"category"`
	OperatingMode string    `db:"operating_mode" json:"operating_mode"`
}

type PublicResourceCatalogItem struct {
	ID                   uuid.UUID `db:"id" json:"id"`
	Name                 string    `db:"name" json:"name"`
	Category             string    `db:"category" json:"category"`
	OperatingMode        string    `db:"operating_mode" json:"operating_mode"`
	Description          string    `db:"description" json:"description"`
	ImageURL             string    `db:"image_url" json:"image_url"`
	StartingPrice        float64   `db:"starting_price" json:"starting_price"`
	StartingPriceUnit    string    `db:"starting_price_unit" json:"starting_price_unit"`
	PrimaryOfferName     string    `db:"primary_offer_name" json:"primary_offer_name"`
	PrimaryOfferPrice    float64   `db:"primary_offer_price" json:"primary_offer_price"`
	PrimaryOfferUnit     string    `db:"primary_offer_unit" json:"primary_offer_unit"`
	PrimaryOfferDuration int       `db:"primary_offer_duration" json:"primary_offer_duration"`
}

type ResourceListItem struct {
	ID              uuid.UUID `db:"id" json:"id"`
	Name            string    `db:"name" json:"name"`
	Category        string    `db:"category" json:"category"`
	Status          string    `db:"status" json:"status"`
	OperatingMode   string    `db:"operating_mode" json:"operating_mode"`
	ImageURL        string    `db:"image_url" json:"image_url"`
	Description     string    `db:"description" json:"description"`
	MainOptionCount int       `db:"main_option_count" json:"main_option_count"`
	AddonCount      int       `db:"addon_count" json:"addon_count"`
}

type ResourcePricingItem struct {
	ID           uuid.UUID `db:"id" json:"id"`
	Name         string    `db:"name" json:"name"`
	Price        float64   `db:"price" json:"price"`
	PriceUnit    string    `db:"price_unit" json:"price_unit"`
	UnitDuration int       `db:"unit_duration" json:"unit_duration"`
	IsDefault    bool      `db:"is_default" json:"is_default"`
}

type ResourcePricingCatalogItem struct {
	ResourceID    uuid.UUID             `json:"resource_id"`
	ResourceName  string                `json:"resource_name"`
	Category      string                `json:"category"`
	Status        string                `json:"status"`
	OperatingMode string                `json:"operating_mode"`
	MainItems     []ResourcePricingItem `json:"main_items"`
}

type ResourceAddonCatalogItem struct {
	ResourceID    uuid.UUID      `json:"resource_id"`
	ResourceName  string         `json:"resource_name"`
	Category      string         `json:"category"`
	Status        string         `json:"status"`
	OperatingMode string         `json:"operating_mode"`
	Addons        []ResourceItem `json:"addons"`
}

type ResourcePOSCatalogItem struct {
	ResourceID       uuid.UUID      `json:"resource_id"`
	ResourceName     string         `json:"resource_name"`
	ResourceImageURL string         `json:"resource_image_url"`
	Category         string         `json:"category"`
	Status           string         `json:"status"`
	OperatingMode    string         `json:"operating_mode"`
	AvailableItems   []ResourceItem `json:"available_items"`
}

type ResourceDeviceMapItem struct {
	ResourceID       uuid.UUID  `db:"resource_id" json:"resource_id"`
	ResourceName     string     `db:"resource_name" json:"resource_name"`
	Category         string     `db:"category" json:"category"`
	Status           string     `db:"status" json:"status"`
	OperatingMode    string     `db:"operating_mode" json:"operating_mode"`
	SmartDeviceID    *uuid.UUID `db:"device_uuid" json:"device_uuid,omitempty"`
	DeviceID         string     `db:"device_id" json:"device_id"`
	DeviceName       string     `db:"device_name" json:"device_name"`
	PairingStatus    string     `db:"pairing_status" json:"pairing_status"`
	ConnectionStatus string     `db:"connection_status" json:"connection_status"`
	DeviceEnabled    bool       `db:"is_enabled" json:"is_enabled"`
	DeviceLastSeenAt *time.Time `db:"last_seen_at" json:"last_seen_at,omitempty"`
	DeviceFirmware   string     `db:"firmware_version" json:"firmware_version"`
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
