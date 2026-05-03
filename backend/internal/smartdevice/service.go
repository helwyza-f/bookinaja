package smartdevice

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	platformrealtime "github.com/helwiza/backend/internal/platform/realtime"
)

var colorPattern = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

var (
	ErrDeviceNotRegistered = errors.New("DEVICE BELUM TERDAFTAR")
	ErrDeviceNotClaimed    = errors.New("DEVICE BELUM DI-CLAIM")
	ErrDeviceDisabled      = errors.New("DEVICE SEDANG DINONAKTIFKAN")
	ErrDeviceKeyMismatch   = errors.New("DEVICE KEY SALAH")
)

type Publisher interface {
	IsConnected() bool
	Publish(ctx context.Context, topic string, qos byte, retain bool, payload []byte) error
}

type Service struct {
	repo      *Repository
	publisher Publisher
	realtime  realtimeBroadcaster
}

type realtimeBroadcaster interface {
	Publish(channel string, event platformrealtime.Event) error
}

func NewService(repo *Repository, publisher Publisher, realtime realtimeBroadcaster) *Service {
	return &Service{
		repo:      repo,
		publisher: publisher,
		realtime:  realtime,
	}
}

func (s *Service) List(ctx context.Context, tenantID string) ([]DeviceSummary, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, errors.New("ID TENANT TIDAK VALID")
	}
	items, err := s.repo.ListByTenant(ctx, tID)
	if err != nil {
		return nil, err
	}
	result := make([]DeviceSummary, 0, len(items))
	for _, item := range items {
		result = append(result, DeviceSummary{
			ID:               item.ID,
			DeviceID:         item.DeviceID,
			DeviceName:       item.DeviceName,
			ResourceID:       item.ResourceID,
			PairingStatus:    item.PairingStatus,
			ConnectionStatus: item.ConnectionStatus,
			IsEnabled:        item.IsEnabled,
			LastSeenAt:       item.LastSeenAt,
			FirmwareVersion:  item.FirmwareVersion,
		})
	}
	return result, nil
}

func (s *Service) Overview(ctx context.Context, tenantID string) (*Overview, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, errors.New("ID TENANT TIDAK VALID")
	}
	return s.repo.OverviewByTenant(ctx, tID)
}

func (s *Service) Claim(ctx context.Context, tenantID string, actorID *uuid.UUID, req ClaimDeviceReq) (*DeviceDetail, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, errors.New("ID TENANT TIDAK VALID")
	}
	deviceID := strings.TrimSpace(req.DeviceID)
	deviceKey := strings.TrimSpace(req.DeviceKey)
	if deviceID == "" || deviceKey == "" {
		return nil, errors.New("DEVICE ID DAN DEVICE KEY WAJIB DIISI")
	}
	deviceName := strings.TrimSpace(req.DeviceName)
	if deviceName == "" {
		deviceName = deviceID
	}

	item, err := s.repo.UpsertClaim(ctx, tID, actorID, deviceID, deviceName, hashDeviceKey(deviceKey))
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(req.ResourceID) != "" {
		if err := s.Assign(ctx, tenantID, item.ID.String(), actorID, AssignDeviceReq{ResourceID: req.ResourceID}); err != nil {
			return nil, err
		}
	}
	s.emitDeviceRealtime("device.claimed", item, map[string]any{"actor_id": actorID})
	return s.GetDetail(ctx, tenantID, item.ID.String())
}

func (s *Service) GetDetail(ctx context.Context, tenantID, deviceID string) (*DeviceDetail, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, errors.New("ID TENANT TIDAK VALID")
	}
	dID, err := uuid.Parse(deviceID)
	if err != nil {
		return nil, errors.New("ID DEVICE TIDAK VALID")
	}
	item, err := s.repo.GetDetail(ctx, tID, dID)
	if err != nil {
		return nil, errors.New("DEVICE TIDAK DITEMUKAN")
	}
	return item, nil
}

func (s *Service) Assign(ctx context.Context, tenantID, deviceID string, actorID *uuid.UUID, req AssignDeviceReq) error {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return errors.New("ID TENANT TIDAK VALID")
	}
	dID, err := uuid.Parse(deviceID)
	if err != nil {
		return errors.New("ID DEVICE TIDAK VALID")
	}
	rID, err := uuid.Parse(req.ResourceID)
	if err != nil {
		return errors.New("ID RESOURCE TIDAK VALID")
	}
	if err := s.repo.AssignResource(ctx, tID, dID, rID, actorID); err != nil {
		return err
	}
	if item, err := s.repo.FindByTenantAndID(ctx, tID, dID); err == nil {
		s.emitDeviceRealtime("device.assigned", item, map[string]any{"actor_id": actorID, "resource_id": rID.String()})
	}
	return nil
}

func (s *Service) Unassign(ctx context.Context, tenantID, deviceID string, actorID *uuid.UUID) error {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return errors.New("ID TENANT TIDAK VALID")
	}
	dID, err := uuid.Parse(deviceID)
	if err != nil {
		return errors.New("ID DEVICE TIDAK VALID")
	}
	if err := s.repo.UnassignResource(ctx, tID, dID, actorID); err != nil {
		return err
	}
	if item, err := s.repo.FindByTenantAndID(ctx, tID, dID); err == nil {
		s.emitDeviceRealtime("device.unassigned", item, map[string]any{"actor_id": actorID})
	}
	return nil
}

func (s *Service) Enable(ctx context.Context, tenantID, deviceID string, actorID *uuid.UUID, enabled bool) error {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return errors.New("ID TENANT TIDAK VALID")
	}
	dID, err := uuid.Parse(deviceID)
	if err != nil {
		return errors.New("ID DEVICE TIDAK VALID")
	}
	if err := s.repo.SetEnabled(ctx, tID, dID, enabled, actorID); err != nil {
		return err
	}
	if item, err := s.repo.FindByTenantAndID(ctx, tID, dID); err == nil {
		eventType := "device.enabled"
		if !enabled {
			eventType = "device.disabled"
		}
		s.emitDeviceRealtime(eventType, item, map[string]any{"actor_id": actorID, "is_enabled": enabled})
	}
	return nil
}

func (s *Service) SendTestCommand(ctx context.Context, tenantID, deviceID string, actorID *uuid.UUID, req TestDeviceReq) (*DeviceCommand, error) {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, errors.New("ID TENANT TIDAK VALID")
	}
	dID, err := uuid.Parse(deviceID)
	if err != nil {
		return nil, errors.New("ID DEVICE TIDAK VALID")
	}

	device, err := s.repo.FindByTenantAndID(ctx, tID, dID)
	if err != nil {
		return nil, errors.New("DEVICE TIDAK DITEMUKAN")
	}
	if !device.IsEnabled {
		return nil, errors.New("DEVICE SEDANG DINONAKTIFKAN")
	}

	now := time.Now().UTC()
	commandID := uuid.New()
	payload, topic, dedupeKey, err := s.buildPayload(commandID, *device, req, now, "", "")
	if err != nil {
		return nil, err
	}
	command := DeviceCommand{
		ID:              commandID,
		TenantID:        tID,
		DeviceID:        dID,
		ResourceID:      device.ResourceID,
		TriggerEvent:    "manual.test",
		CommandTopic:    topic,
		Payload:         payload,
		QoS:             1,
		Retain:          false,
		Status:          "pending",
		PublishAttempts: 0,
		DedupeKey:       dedupeKey,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := s.repo.CreateCommand(ctx, command); err != nil {
		return nil, err
	}

	var publishErr error
	if s.publisher != nil && s.publisher.IsConnected() {
		publishErr = s.publisher.Publish(ctx, topic, byte(command.QoS), command.Retain, payload)
	}
	if publishErr != nil {
		_ = s.repo.MarkCommandRetry(ctx, command.ID, publishErr.Error(), 1, time.Now().UTC().Add(30*time.Second))
		_ = s.repo.InsertEvent(ctx, dID, &tID, actorID, "admin", "device.test.failed", "Test command gagal", "Command test gagal dipublish ke broker.", map[string]any{"error": publishErr.Error()})
		return nil, fmt.Errorf("GAGAL MENGIRIM COMMAND TEST: %w", publishErr)
	}

	if s.publisher == nil || !s.publisher.IsConnected() {
		_ = s.repo.MarkCommandRetry(ctx, command.ID, "mqtt publisher not connected", 1, time.Now().UTC().Add(30*time.Second))
		return nil, errors.New("MQTT BELUM TERHUBUNG")
	}

	_ = s.repo.MarkCommandPublished(ctx, command.ID)
	_ = s.repo.InsertEvent(ctx, dID, &tID, actorID, "admin", "device.test.sent", "Test command terkirim", "Command test dikirim ke broker MQTT.", map[string]any{"topic": topic})
	command.Status = "sent"
	publishedAt := time.Now().UTC()
	command.PublishedAt = &publishedAt
	command.PublishAttempts = 1
	command.UpdatedAt = publishedAt
	return &command, nil
}

func (s *Service) Pair(ctx context.Context, req PairDeviceReq) (*Device, error) {
	deviceID := strings.TrimSpace(req.DeviceID)
	deviceKey := strings.TrimSpace(req.DeviceKey)
	if deviceID == "" || deviceKey == "" {
		return nil, errors.New("DEVICE ID DAN DEVICE KEY WAJIB DIISI")
	}
	existing, err := s.repo.FindByDeviceID(ctx, deviceID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrDeviceNotRegistered
		}
		return nil, err
	}
	if existing.TenantID == nil {
		return nil, ErrDeviceNotClaimed
	}
	if !existing.IsEnabled {
		return nil, ErrDeviceDisabled
	}
	device, err := s.repo.PairClaimedDevice(ctx, deviceID, hashDeviceKey(deviceKey))
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrDeviceKeyMismatch
		}
		return nil, err
	}
	if device.TenantID != nil {
		_ = s.repo.InsertEvent(ctx, device.ID, device.TenantID, nil, "device", "device.paired", "Device paired", "Device berhasil pairing ke backend.", nil)
	}
	s.emitDeviceRealtime("device.paired", device, nil)
	return device, nil
}

func (s *Service) EnqueueSessionStart(ctx context.Context, tenantID, bookingID string) error {
	return s.enqueueBookingCommand(ctx, tenantID, bookingID, "session_start", TestDeviceReq{
		Event:      "session_start",
		AudioIndex: 1,
		LightMode:  "solid",
		Color:      "#00FF00",
		Volume:     20,
	})
}

func (s *Service) EnqueueWarning(ctx context.Context, tenantID, bookingID string) error {
	return s.enqueueBookingCommand(ctx, tenantID, bookingID, "warning", TestDeviceReq{
		Event:      "warning",
		AudioIndex: 2,
		LightMode:  "breathe",
		Color:      "#FFFF00",
		Volume:     20,
	})
}

func (s *Service) EnqueueTimeout(ctx context.Context, tenantID, bookingID string) error {
	return s.enqueueBookingCommand(ctx, tenantID, bookingID, "timeout", TestDeviceReq{
		Event:      "timeout",
		AudioIndex: 3,
		LightMode:  "blink",
		Color:      "#FF0000",
		Volume:     20,
	})
}

func (s *Service) EnqueueStandbyByResource(ctx context.Context, tenantID, resourceID string) error {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return err
	}
	rID, err := uuid.Parse(resourceID)
	if err != nil {
		return err
	}
	device, err := s.repo.FindEnabledDeviceByResource(ctx, tID, rID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}
	now := time.Now().UTC()
	commandID := uuid.New()
	payload, topic, dedupeKey, err := s.buildPayload(commandID, *device, TestDeviceReq{
		Event:      "standby",
		AudioIndex: 0,
		LightMode:  "off",
		Color:      "#FFFFFF",
		Volume:     0,
	}, now, "", "")
	if err != nil {
		return err
	}
	command := DeviceCommand{
		ID:              commandID,
		TenantID:        tID,
		DeviceID:        device.ID,
		ResourceID:      device.ResourceID,
		TriggerEvent:    "standby",
		CommandTopic:    topic,
		Payload:         payload,
		QoS:             1,
		Retain:          false,
		Status:          "pending",
		PublishAttempts: 0,
		DedupeKey:       fmt.Sprintf("%s:%s", dedupeKey, now.Format("200601021504")),
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := s.repo.CreateCommand(ctx, command); err != nil {
		return err
	}
	s.tryPublishQueuedCommand(ctx, command, "command.sent")
	return nil
}

func (s *Service) HandleStateMessage(ctx context.Context, topic string, payload []byte) error {
	deviceMQTTID, err := mqttDeviceIDFromTopic(topic)
	if err != nil {
		return err
	}
	previous, _ := s.repo.FindByDeviceID(ctx, deviceMQTTID)
	if err := s.repo.UpsertTelemetry(ctx, deviceMQTTID, topic, payload, "state"); err != nil {
		return err
	}
	raw := strings.TrimSpace(string(payload))
	if strings.EqualFold(raw, "offline") {
		device, err := s.repo.MarkDeviceOffline(ctx, deviceMQTTID, topic)
		if err == nil && device.TenantID != nil {
			_ = s.repo.InsertEvent(ctx, device.ID, device.TenantID, nil, "device", "device.offline", "Device offline", "Broker menerima status offline dari device.", nil)
		}
		return err
	}
	connectionStatus := "online"
	lastIP := parseStringField(payload, "ip_address")
	device, err := s.repo.UpdateDeviceState(ctx, deviceMQTTID, topic, normalizeJSONPayload(payload), connectionStatus, lastIP)
	if err == sql.ErrNoRows {
		return nil
	}
	if err == nil && device.TenantID != nil {
		_ = s.repo.InsertEvent(ctx, device.ID, device.TenantID, nil, "device", "device.state", "State diterima", "Telemetry state terbaru diterima dari device.", nil)
		s.emitDeviceRealtime("device.state", device, map[string]any{"topic": topic})
		if previous == nil || previous.ConnectionStatus != "online" {
			_ = s.ReconcileDesiredStateForDevice(ctx, device)
		}
	}
	return err
}

func (s *Service) HandleAckMessage(ctx context.Context, topic string, payload []byte) error {
	deviceMQTTID, err := mqttDeviceIDFromTopic(topic)
	if err != nil {
		return err
	}
	if err := s.repo.UpsertTelemetry(ctx, deviceMQTTID, topic, payload, "ack"); err != nil {
		return err
	}
	var message struct {
		CommandID string `json:"command_id"`
		Result    string `json:"result"`
	}
	if err := json.Unmarshal(payload, &message); err != nil {
		return nil
	}
	commandID, err := uuid.Parse(strings.TrimSpace(message.CommandID))
	if err != nil {
		return nil
	}
	command, err := s.repo.FindCommandByID(ctx, commandID)
	if err != nil {
		return nil
	}
	if strings.EqualFold(strings.TrimSpace(message.Result), "accepted") || strings.TrimSpace(message.Result) == "" {
		_ = s.repo.MarkCommandAcked(ctx, commandID)
		if device, derr := s.repo.FindByTenantAndID(ctx, command.TenantID, command.DeviceID); derr == nil {
			_ = s.repo.InsertEvent(ctx, device.ID, device.TenantID, nil, "device", "device.ack", "Command di-ack", "Device mengonfirmasi command diterima.", map[string]any{"command_id": commandID})
			s.emitDeviceCommandRealtime("device_command.acked", device, command, map[string]any{"command_id": commandID.String()})
		}
	}
	return nil
}

func (s *Service) enqueueBookingCommand(ctx context.Context, tenantID, bookingID, triggerEvent string, req TestDeviceReq) error {
	tID, err := uuid.Parse(tenantID)
	if err != nil {
		return err
	}
	bID, err := uuid.Parse(bookingID)
	if err != nil {
		return err
	}
	detail, err := s.loadBooking(ctx, bID, tID)
	if err != nil || detail == nil {
		return err
	}
	device, err := s.repo.FindEnabledDeviceByResource(ctx, tID, detail.ResourceID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}

	commandID := uuid.New()
	now := time.Now().UTC()
	payload, topic, _, err := s.buildPayload(commandID, *device, req, now, detail.ID.String(), detail.ResourceID.String())
	if err != nil {
		return err
	}
	command := DeviceCommand{
		ID:              commandID,
		TenantID:        tID,
		DeviceID:        device.ID,
		ResourceID:      &detail.ResourceID,
		BookingID:       &detail.ID,
		TriggerEvent:    triggerEvent,
		CommandTopic:    topic,
		Payload:         payload,
		QoS:             1,
		Retain:          false,
		Status:          "pending",
		PublishAttempts: 0,
		DedupeKey:       fmt.Sprintf("booking:%s:%s", detail.ID.String(), triggerEvent),
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := s.repo.CreateCommand(ctx, command); err != nil {
		return err
	}
	s.tryPublishQueuedCommand(ctx, command, "command.sent")
	return nil
}

func (s *Service) tryPublishQueuedCommand(ctx context.Context, command DeviceCommand, eventType string) {
	if s.publisher == nil || !s.publisher.IsConnected() {
		return
	}
	publishCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := s.publisher.Publish(publishCtx, command.CommandTopic, byte(command.QoS), command.Retain, command.Payload); err != nil {
		retryAt := time.Now().UTC().Add(30 * time.Second)
		_ = s.repo.MarkCommandRetry(ctx, command.ID, err.Error(), command.PublishAttempts+1, retryAt)
		_ = s.repo.InsertEvent(ctx, command.DeviceID, &command.TenantID, nil, "system", "command.retry", "Command retry dijadwalkan", "Publish ke broker gagal dan command akan dicoba ulang.", map[string]any{"command_id": command.ID, "error": err.Error()})
		return
	}

	_ = s.repo.MarkCommandPublished(ctx, command.ID)
	_ = s.repo.InsertEvent(ctx, command.DeviceID, &command.TenantID, nil, "system", eventType, "Command terkirim", "Command otomatis berhasil dipublish ke broker.", map[string]any{"command_id": command.ID, "trigger_event": command.TriggerEvent})
	if device, err := s.repo.FindByTenantAndID(ctx, command.TenantID, command.DeviceID); err == nil {
		s.emitDeviceCommandRealtime("device_command.sent", device, &command, map[string]any{"command_id": command.ID.String(), "trigger_event": command.TriggerEvent})
	}
}

func (s *Service) ReconcileHeartbeats(ctx context.Context, staleAfter time.Duration) error {
	cutoff := time.Now().UTC().Add(-staleAfter)
	items, err := s.repo.FindStaleDevices(ctx, cutoff)
	if err != nil {
		return err
	}
	for _, item := range items {
		if err := s.repo.MarkDeviceOfflineByID(ctx, item.ID, "stale-heartbeat"); err != nil {
			continue
		}
		_ = s.repo.InsertEvent(ctx, item.ID, item.TenantID, nil, "system", "device.offline.stale", "Device dianggap offline", "Heartbeat device melewati ambang stale dan ditandai offline.", map[string]any{"last_seen_at": item.LastSeenAt})
	}
	return nil
}

func (s *Service) ReconcileDesiredStateForDevice(ctx context.Context, device *Device) error {
	if device == nil || device.TenantID == nil || device.ResourceID == nil || !device.IsEnabled {
		return nil
	}
	activeBooking, err := s.repo.FindActiveBookingForResource(ctx, *device.TenantID, *device.ResourceID)
	if err == nil && activeBooking != nil {
		return s.enqueueBookingCommand(ctx, device.TenantID.String(), activeBooking.ID.String(), "reconnect_session_start", TestDeviceReq{
			Event:      "session_start",
			AudioIndex: 1,
			LightMode:  "solid",
			Color:      "#00FF00",
			Volume:     20,
		})
	}
	if err != nil && err != sql.ErrNoRows {
		return err
	}
	return s.EnqueueStandbyByResource(ctx, device.TenantID.String(), device.ResourceID.String())
}

func (s *Service) buildPayload(commandID uuid.UUID, device Device, req TestDeviceReq, issuedAt time.Time, bookingID string, resourceID string) ([]byte, string, string, error) {
	event := strings.TrimSpace(req.Event)
	if event == "" {
		event = "manual_test"
	}
	lightMode := strings.TrimSpace(req.LightMode)
	if lightMode == "" {
		lightMode = "solid"
	}
	switch lightMode {
	case "solid", "blink", "chase", "breathe", "off":
	default:
		return nil, "", "", errors.New("LIGHT MODE TIDAK VALID")
	}
	color := strings.TrimSpace(req.Color)
	if color == "" {
		color = "#00FF00"
	}
	if !colorPattern.MatchString(color) {
		return nil, "", "", errors.New("FORMAT COLOR HEX TIDAK VALID")
	}
	volume := req.Volume
	if volume <= 0 {
		volume = 20
	}
	if volume > 30 {
		return nil, "", "", errors.New("VOLUME MAKSIMAL 30")
	}
	audioIndex := req.AudioIndex
	if audioIndex < 0 {
		return nil, "", "", errors.New("AUDIO INDEX TIDAK VALID")
	}
	dedupeKey := fmt.Sprintf("%s:%s:%d", event, device.ID.String(), issuedAt.UnixMilli())
	payload := CommandPayload{
		CommandID:  commandID.String(),
		Event:      event,
		AudioIndex: audioIndex,
		LightMode:  lightMode,
		Color:      strings.ToUpper(color),
		Volume:     volume,
		IssuedAt:   issuedAt.Format(time.RFC3339),
		BookingID:  bookingID,
		ResourceID: resourceID,
		DedupeKey:  dedupeKey,
	}
	if payload.ResourceID == "" && device.ResourceID != nil {
		payload.ResourceID = device.ResourceID.String()
	}
	if device.TenantID != nil {
		payload.TenantID = device.TenantID.String()
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, "", "", err
	}
	return raw, fmt.Sprintf("bookinaja/devices/%s/set", device.DeviceID), dedupeKey, nil
}

func hashDeviceKey(raw string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(raw)))
	return hex.EncodeToString(sum[:])
}

type bookingLookup interface {
	GetDetail(ctx context.Context, bookingID, tenantID string) (*BookingProjection, error)
}

type BookingProjection struct {
	ID         uuid.UUID `db:"id"`
	TenantID   uuid.UUID `db:"tenant_id"`
	ResourceID uuid.UUID `db:"resource_id"`
}

func (s *Service) loadBooking(ctx context.Context, bookingID, tenantID uuid.UUID) (*BookingProjection, error) {
	// local projection query without importing reservation package to avoid cross-domain coupling
	const query = `
		SELECT id, tenant_id, resource_id
		FROM bookings
		WHERE id = $1 AND tenant_id = $2
		LIMIT 1`
	var item BookingProjection
	if err := s.repo.db.GetContext(ctx, &item, query, bookingID, tenantID); err != nil {
		return nil, err
	}
	return &item, nil
}

func mqttDeviceIDFromTopic(topic string) (string, error) {
	parts := strings.Split(topic, "/")
	if len(parts) < 4 {
		return "", fmt.Errorf("topic mqtt tidak valid")
	}
	return parts[2], nil
}

func normalizeJSONPayload(payload []byte) []byte {
	if json.Valid(payload) {
		return payload
	}
	escaped, _ := json.Marshal(map[string]any{"raw": string(payload)})
	return escaped
}

func parseStringField(payload []byte, field string) *string {
	var body map[string]any
	if err := json.Unmarshal(payload, &body); err != nil {
		return nil
	}
	value, ok := body[field].(string)
	if !ok || strings.TrimSpace(value) == "" {
		return nil
	}
	trimmed := strings.TrimSpace(value)
	return &trimmed
}

func (s *Service) emitDeviceRealtime(eventType string, device *Device, meta map[string]any) {
	if s.realtime == nil || device == nil || device.TenantID == nil {
		return
	}
	event := platformrealtime.NewEvent(eventType)
	event.TenantID = device.TenantID.String()
	event.EntityType = "device"
	event.EntityID = device.ID.String()
	event.Summary = map[string]any{
		"device_id":         device.DeviceID,
		"device_name":       device.DeviceName,
		"pairing_status":    device.PairingStatus,
		"connection_status": device.ConnectionStatus,
		"is_enabled":        device.IsEnabled,
		"resource_id":       device.ResourceID,
		"last_seen_at":      device.LastSeenAt,
	}
	event.Refs = map[string]any{
		"device_id":   device.ID.String(),
		"resource_id": device.ResourceID,
	}
	event.Meta = meta
	_ = s.realtime.Publish(platformrealtime.TenantDevicesChannel(device.TenantID.String()), event)
	_ = s.realtime.Publish(platformrealtime.TenantDeviceChannel(device.TenantID.String(), device.ID.String()), event)
}

func (s *Service) emitDeviceCommandRealtime(eventType string, device *Device, command *DeviceCommand, meta map[string]any) {
	if s.realtime == nil || device == nil || command == nil || device.TenantID == nil {
		return
	}
	event := platformrealtime.NewEvent(eventType)
	event.TenantID = device.TenantID.String()
	event.EntityType = "device_command"
	event.EntityID = command.ID.String()
	event.Summary = map[string]any{
		"device_id":      device.DeviceID,
		"trigger_event":  command.TriggerEvent,
		"status":         command.Status,
		"booking_id":     command.BookingID,
		"published_at":   command.PublishedAt,
		"acked_at":       command.AckedAt,
	}
	event.Refs = map[string]any{
		"device_id":        device.ID.String(),
		"device_command_id": command.ID.String(),
		"booking_id":       command.BookingID,
	}
	event.Meta = meta
	_ = s.realtime.Publish(platformrealtime.TenantDevicesChannel(device.TenantID.String()), event)
	_ = s.realtime.Publish(platformrealtime.TenantDeviceChannel(device.TenantID.String(), device.ID.String()), event)
}
