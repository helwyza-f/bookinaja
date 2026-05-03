package realtime

import "time"

type Event struct {
	Type       string         `json:"type"`
	TenantID   string         `json:"tenant_id,omitempty"`
	Channel    string         `json:"channel,omitempty"`
	EntityType string         `json:"entity_type,omitempty"`
	EntityID   string         `json:"entity_id,omitempty"`
	OccurredAt time.Time      `json:"occurred_at"`
	Version    int            `json:"version"`
	Summary    map[string]any `json:"summary,omitempty"`
	Refs       map[string]any `json:"refs,omitempty"`
	Meta       map[string]any `json:"meta,omitempty"`
}

func NewEvent(eventType string) Event {
	return Event{
		Type:       eventType,
		OccurredAt: time.Now().UTC(),
		Version:    1,
	}
}

type clientMessage struct {
	Action   string   `json:"action"`
	Channels []string `json:"channels"`
}

func TenantBookingsChannel(tenantID string) string {
	return "tenant:" + tenantID + ":bookings"
}

func TenantBookingChannel(tenantID, bookingID string) string {
	return "tenant:" + tenantID + ":booking:" + bookingID
}

func TenantDashboardChannel(tenantID string) string {
	return "tenant:" + tenantID + ":dashboard"
}

func TenantDevicesChannel(tenantID string) string {
	return "tenant:" + tenantID + ":devices"
}

func TenantDeviceChannel(tenantID, deviceID string) string {
	return "tenant:" + tenantID + ":device:" + deviceID
}

func CustomerBookingChannel(customerID, bookingID string) string {
	return "customer:" + customerID + ":booking:" + bookingID
}
