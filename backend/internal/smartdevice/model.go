package smartdevice

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Device struct {
	ID               uuid.UUID        `db:"id" json:"id"`
	TenantID         *uuid.UUID       `db:"tenant_id" json:"tenant_id,omitempty"`
	ResourceID       *uuid.UUID       `db:"resource_id" json:"resource_id,omitempty"`
	DeviceID         string           `db:"device_id" json:"device_id"`
	DeviceName       string           `db:"device_name" json:"device_name"`
	DeviceKeyHash    string           `db:"device_key_hash" json:"-"`
	PairingStatus    string           `db:"pairing_status" json:"pairing_status"`
	ConnectionStatus string           `db:"connection_status" json:"connection_status"`
	IsEnabled        bool             `db:"is_enabled" json:"is_enabled"`
	FirmwareVersion  string           `db:"firmware_version" json:"firmware_version"`
	HardwareRevision string           `db:"hardware_revision" json:"hardware_revision"`
	LastSeenAt       *time.Time       `db:"last_seen_at" json:"last_seen_at,omitempty"`
	LastStatePayload *json.RawMessage `db:"last_state_payload" json:"last_state_payload,omitempty"`
	LastStateTopic   string           `db:"last_state_topic" json:"last_state_topic"`
	LastIP           *string          `db:"last_ip" json:"last_ip,omitempty"`
	ClaimedAt        *time.Time       `db:"claimed_at" json:"claimed_at,omitempty"`
	PairedAt         *time.Time       `db:"paired_at" json:"paired_at,omitempty"`
	DisabledAt       *time.Time       `db:"disabled_at" json:"disabled_at,omitempty"`
	CreatedAt        time.Time        `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time        `db:"updated_at" json:"updated_at"`
}

type DeviceSummary struct {
	ID               uuid.UUID  `json:"id"`
	DeviceID         string     `json:"device_id"`
	DeviceName       string     `json:"device_name"`
	ResourceID       *uuid.UUID `json:"resource_id,omitempty"`
	PairingStatus    string     `json:"pairing_status"`
	ConnectionStatus string     `json:"connection_status"`
	IsEnabled        bool       `json:"is_enabled"`
	LastSeenAt       *time.Time `json:"last_seen_at,omitempty"`
	FirmwareVersion  string     `json:"firmware_version"`
}

type DeviceAssignment struct {
	ID           uuid.UUID  `db:"id" json:"id"`
	DeviceID     uuid.UUID  `db:"device_id" json:"device_id"`
	ResourceID   uuid.UUID  `db:"resource_id" json:"resource_id"`
	TenantID     uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	AssignedBy   *uuid.UUID `db:"assigned_by" json:"assigned_by,omitempty"`
	AssignedAt   time.Time  `db:"assigned_at" json:"assigned_at"`
	UnassignedAt *time.Time `db:"unassigned_at" json:"unassigned_at,omitempty"`
}

type DeviceCommand struct {
	ID              uuid.UUID       `db:"id" json:"id"`
	TenantID        uuid.UUID       `db:"tenant_id" json:"tenant_id"`
	DeviceID        uuid.UUID       `db:"device_id" json:"device_id"`
	ResourceID      *uuid.UUID      `db:"resource_id" json:"resource_id,omitempty"`
	BookingID       *uuid.UUID      `db:"booking_id" json:"booking_id,omitempty"`
	TriggerEvent    string          `db:"trigger_event" json:"trigger_event"`
	CommandTopic    string          `db:"command_topic" json:"command_topic"`
	Payload         json.RawMessage `db:"payload" json:"payload"`
	QoS             int16           `db:"qos" json:"qos"`
	Retain          bool            `db:"retain" json:"retain"`
	Status          string          `db:"status" json:"status"`
	PublishAttempts int             `db:"publish_attempts" json:"publish_attempts"`
	NextAttemptAt   *time.Time      `db:"next_attempt_at" json:"next_attempt_at,omitempty"`
	PublishedAt     *time.Time      `db:"published_at" json:"published_at,omitempty"`
	AckedAt         *time.Time      `db:"acked_at" json:"acked_at,omitempty"`
	LastError       string          `db:"last_error" json:"last_error"`
	DedupeKey       string          `db:"dedupe_key" json:"dedupe_key"`
	CreatedAt       time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time       `db:"updated_at" json:"updated_at"`
}

type DeviceEvent struct {
	ID          uuid.UUID       `db:"id" json:"id"`
	TenantID    *uuid.UUID      `db:"tenant_id" json:"tenant_id,omitempty"`
	DeviceID    uuid.UUID       `db:"device_id" json:"device_id"`
	ActorID     *uuid.UUID      `db:"actor_id" json:"actor_id,omitempty"`
	ActorType   string          `db:"actor_type" json:"actor_type"`
	EventType   string          `db:"event_type" json:"event_type"`
	Title       string          `db:"title" json:"title"`
	Description string          `db:"description" json:"description"`
	Metadata    json.RawMessage `db:"metadata" json:"metadata"`
	CreatedAt   time.Time       `db:"created_at" json:"created_at"`
}

type DeviceDetail struct {
	Device
	ResourceName     string            `db:"resource_name" json:"resource_name"`
	Commands         []DeviceCommand   `json:"commands"`
	Events           []DeviceEvent     `json:"events"`
	Telemetry        []DeviceTelemetry `json:"telemetry"`
	Metrics          DeviceMetrics     `json:"metrics"`
	LatestAssignment *DeviceAssignment `json:"latest_assignment,omitempty"`
}

type ClaimDeviceReq struct {
	DeviceID   string `json:"device_id" binding:"required"`
	DeviceName string `json:"device_name"`
	DeviceKey  string `json:"device_key" binding:"required"`
	ResourceID string `json:"resource_id"`
}

type AssignDeviceReq struct {
	ResourceID string `json:"resource_id" binding:"required"`
}

type TestDeviceReq struct {
	Event      string `json:"event"`
	AudioIndex int    `json:"audio_index"`
	LightMode  string `json:"light_mode"`
	Color      string `json:"color"`
	Volume     int    `json:"volume"`
}

type PairDeviceReq struct {
	DeviceID  string `json:"device_id" binding:"required"`
	DeviceKey string `json:"device_key" binding:"required"`
}

type DeviceTelemetry struct {
	ID           uuid.UUID       `db:"id" json:"id"`
	TenantID     *uuid.UUID      `db:"tenant_id" json:"tenant_id,omitempty"`
	DeviceID     *uuid.UUID      `db:"device_id" json:"device_id,omitempty"`
	MQTTDeviceID string          `db:"mqtt_device_id" json:"mqtt_device_id"`
	Topic        string          `db:"topic" json:"topic"`
	Payload      json.RawMessage `db:"payload" json:"payload"`
	MessageType  string          `db:"message_type" json:"message_type"`
	ReceivedAt   time.Time       `db:"received_at" json:"received_at"`
}

type DeviceMetrics struct {
	TotalCommands    int        `json:"total_commands"`
	AckedCommands    int        `json:"acked_commands"`
	FailedCommands   int        `json:"failed_commands"`
	PendingCommands  int        `json:"pending_commands"`
	AvgAckLatencyMs  float64    `json:"avg_ack_latency_ms"`
	LastAckAt        *time.Time `json:"last_ack_at,omitempty"`
	StateMessages24H int        `json:"state_messages_24h"`
	AckMessages24H   int        `json:"ack_messages_24h"`
}

type Overview struct {
	TotalDevices      int `db:"total_devices" json:"total_devices"`
	OnlineDevices     int `db:"online_devices" json:"online_devices"`
	OfflineDevices    int `db:"offline_devices" json:"offline_devices"`
	AssignedDevices   int `db:"assigned_devices" json:"assigned_devices"`
	DisabledDevices   int `db:"disabled_devices" json:"disabled_devices"`
	PendingCommands   int `db:"pending_commands" json:"pending_commands"`
	FailedCommands24H int `db:"failed_commands_24h" json:"failed_commands_24h"`
	AckedCommands24H  int `db:"acked_commands_24h" json:"acked_commands_24h"`
}

type CommandPayload struct {
	CommandID  string `json:"command_id"`
	Event      string `json:"event"`
	AudioIndex int    `json:"audio_index"`
	LightMode  string `json:"light_mode"`
	Color      string `json:"color"`
	Volume     int    `json:"volume"`
	IssuedAt   string `json:"issued_at"`
	BookingID  string `json:"booking_id,omitempty"`
	ResourceID string `json:"resource_id,omitempty"`
	TenantID   string `json:"tenant_id,omitempty"`
	DedupeKey  string `json:"dedupe_key"`
}
