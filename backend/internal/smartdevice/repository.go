package smartdevice

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Device, error) {
	var items []Device
	err := r.db.SelectContext(ctx, &items, `
		SELECT *
		FROM smart_devices
		WHERE tenant_id = $1
		ORDER BY created_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	normalizeDevices(items)
	return items, nil
}

func (r *Repository) OverviewByTenant(ctx context.Context, tenantID uuid.UUID) (*Overview, error) {
	var overview Overview
	err := r.db.GetContext(ctx, &overview, `
		SELECT
			COUNT(*) AS total_devices,
			COUNT(*) FILTER (WHERE connection_status = 'online') AS online_devices,
			COUNT(*) FILTER (WHERE connection_status = 'offline') AS offline_devices,
			COUNT(*) FILTER (WHERE resource_id IS NOT NULL) AS assigned_devices,
			COUNT(*) FILTER (WHERE is_enabled = false) AS disabled_devices,
			COALESCE((
				SELECT COUNT(*)
				FROM smart_device_commands
				WHERE tenant_id = $1 AND status IN ('pending', 'retry', 'processing')
			), 0) AS pending_commands,
			COALESCE((
				SELECT COUNT(*)
				FROM smart_device_commands
				WHERE tenant_id = $1 AND status = 'failed' AND updated_at >= NOW() - INTERVAL '24 hours'
			), 0) AS failed_commands_24h,
			COALESCE((
				SELECT COUNT(*)
				FROM smart_device_commands
				WHERE tenant_id = $1 AND status = 'acked' AND acked_at >= NOW() - INTERVAL '24 hours'
			), 0) AS acked_commands_24h
		FROM smart_devices
		WHERE tenant_id = $1`, tenantID)
	if err != nil {
		return nil, err
	}
	return &overview, nil
}

func (r *Repository) FindByTenantAndID(ctx context.Context, tenantID, id uuid.UUID) (*Device, error) {
	var item Device
	err := r.db.GetContext(ctx, &item, `
		SELECT *
		FROM smart_devices
		WHERE id = $1 AND tenant_id = $2
		LIMIT 1`, id, tenantID)
	if err != nil {
		return nil, err
	}
	normalizeDevice(&item)
	return &item, nil
}

func (r *Repository) FindByTenantAndDeviceID(ctx context.Context, tenantID uuid.UUID, deviceID string) (*Device, error) {
	var item Device
	err := r.db.GetContext(ctx, &item, `
		SELECT *
		FROM smart_devices
		WHERE tenant_id = $1 AND device_id = $2
		LIMIT 1`, tenantID, deviceID)
	if err != nil {
		return nil, err
	}
	normalizeDevice(&item)
	return &item, nil
}

func (r *Repository) FindByDeviceID(ctx context.Context, deviceID string) (*Device, error) {
	var item Device
	err := r.db.GetContext(ctx, &item, `
		SELECT *
		FROM smart_devices
		WHERE device_id = $1
		LIMIT 1`, deviceID)
	if err != nil {
		return nil, err
	}
	normalizeDevice(&item)
	return &item, nil
}

func (r *Repository) UpsertClaim(ctx context.Context, tenantID uuid.UUID, actorID *uuid.UUID, deviceID, deviceName, deviceKeyHash string) (*Device, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var existing Device
	err = tx.GetContext(ctx, &existing, `SELECT * FROM smart_devices WHERE device_id = $1 LIMIT 1`, deviceID)
	switch err {
	case nil:
		_, err = tx.ExecContext(ctx, `
			UPDATE smart_devices
			SET tenant_id = $1,
				device_name = CASE WHEN $2 = '' THEN device_name ELSE $2 END,
				device_key_hash = $3,
				pairing_status = CASE WHEN pairing_status = 'paired' THEN pairing_status ELSE 'claimed' END,
				claimed_at = COALESCE(claimed_at, NOW()),
				updated_at = NOW()
			WHERE id = $4`,
			tenantID, deviceName, deviceKeyHash, existing.ID,
		)
		if err != nil {
			return nil, err
		}
		if err := r.insertEventTx(ctx, tx, existing.ID, &tenantID, actorID, "admin", "device.claimed", "Device diklaim", "Device berhasil terhubung ke tenant.", map[string]any{"device_id": deviceID}); err != nil {
			return nil, err
		}
	case sql.ErrNoRows:
		var created Device
		emptyState := json.RawMessage(`{}`)
		err = tx.GetContext(ctx, &created, `
			INSERT INTO smart_devices (
				id, tenant_id, device_id, device_name, device_key_hash, pairing_status, connection_status,
				is_enabled, firmware_version, hardware_revision, last_state_payload, last_state_topic, claimed_at, created_at, updated_at
			) VALUES (
				$1, $2, $3, $4, $5, 'claimed', 'unknown', true, '', '', $6, '', NOW(), NOW(), NOW()
			)
			RETURNING *`,
			uuid.New(), tenantID, deviceID, deviceName, deviceKeyHash, emptyState,
		)
		if err != nil {
			return nil, err
		}
		if err := r.insertEventTx(ctx, tx, created.ID, &tenantID, actorID, "admin", "device.registered", "Device didaftarkan", "Device baru didaftarkan ke tenant.", map[string]any{"device_id": deviceID}); err != nil {
			return nil, err
		}
	default:
		return nil, err
	}

	var item Device
	if err := tx.GetContext(ctx, &item, `SELECT * FROM smart_devices WHERE device_id = $1 LIMIT 1`, deviceID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	normalizeDevice(&item)
	return &item, nil
}

func (r *Repository) AssignResource(ctx context.Context, tenantID, deviceID, resourceID uuid.UUID, actorID *uuid.UUID) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var resourceTenantID uuid.UUID
	if err := tx.GetContext(ctx, &resourceTenantID, `SELECT tenant_id FROM resources WHERE id = $1 LIMIT 1`, resourceID); err != nil {
		return err
	}
	if resourceTenantID != tenantID {
		return fmt.Errorf("resource tidak milik tenant ini")
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE smart_device_assignments
		SET unassigned_at = NOW()
		WHERE (device_id = $1 OR resource_id = $2) AND unassigned_at IS NULL`,
		deviceID, resourceID,
	); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO smart_device_assignments (id, device_id, resource_id, tenant_id, assigned_by, assigned_at)
		VALUES ($1, $2, $3, $4, $5, NOW())`,
		uuid.New(), deviceID, resourceID, tenantID, actorID,
	); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE smart_devices
		SET resource_id = $1,
			updated_at = NOW()
		WHERE id = $2 AND tenant_id = $3`,
		resourceID, deviceID, tenantID,
	); err != nil {
		return err
	}

	if err := r.insertEventTx(ctx, tx, deviceID, &tenantID, actorID, "admin", "device.assigned", "Device di-assign", "Device dihubungkan ke resource.", map[string]any{"resource_id": resourceID}); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *Repository) UnassignResource(ctx context.Context, tenantID, deviceID uuid.UUID, actorID *uuid.UUID) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `
		UPDATE smart_device_assignments
		SET unassigned_at = NOW()
		WHERE device_id = $1 AND tenant_id = $2 AND unassigned_at IS NULL`,
		deviceID, tenantID,
	); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE smart_devices
		SET resource_id = NULL,
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2`,
		deviceID, tenantID,
	); err != nil {
		return err
	}

	if err := r.insertEventTx(ctx, tx, deviceID, &tenantID, actorID, "admin", "device.unassigned", "Device dilepas", "Device dilepas dari resource.", nil); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *Repository) SetEnabled(ctx context.Context, tenantID, deviceID uuid.UUID, enabled bool, actorID *uuid.UUID) error {
	disabledAt := any(nil)
	if !enabled {
		disabledAt = time.Now().UTC()
	}
	_, err := r.db.ExecContext(ctx, `
		UPDATE smart_devices
		SET is_enabled = $1,
			disabled_at = $2,
			updated_at = NOW()
		WHERE id = $3 AND tenant_id = $4`,
		enabled, disabledAt, deviceID, tenantID,
	)
	if err != nil {
		return err
	}
	eventType := "device.enabled"
	title := "Device diaktifkan"
	description := "Device siap menerima command kembali."
	if !enabled {
		eventType = "device.disabled"
		title = "Device dinonaktifkan"
		description = "Device tidak akan menerima command otomatis."
	}
	return r.InsertEvent(ctx, deviceID, &tenantID, actorID, "admin", eventType, title, description, map[string]any{"is_enabled": enabled})
}

func (r *Repository) GetDetail(ctx context.Context, tenantID, deviceID uuid.UUID) (*DeviceDetail, error) {
	var item DeviceDetail
	err := r.db.GetContext(ctx, &item, `
		SELECT d.*, COALESCE(r.name, '') AS resource_name
		FROM smart_devices d
		LEFT JOIN resources r ON r.id = d.resource_id
		WHERE d.id = $1 AND d.tenant_id = $2
		LIMIT 1`, deviceID, tenantID)
	if err != nil {
		return nil, err
	}
	normalizeDevice(&item.Device)

	item.Commands = []DeviceCommand{}
	_ = r.db.SelectContext(ctx, &item.Commands, `
		SELECT *
		FROM smart_device_commands
		WHERE device_id = $1
		ORDER BY created_at DESC
		LIMIT 20`, deviceID)

	item.Events = []DeviceEvent{}
	_ = r.db.SelectContext(ctx, &item.Events, `
		SELECT *
		FROM smart_device_events
		WHERE device_id = $1
		ORDER BY created_at DESC
		LIMIT 20`, deviceID)

	item.Telemetry = []DeviceTelemetry{}
	_ = r.db.SelectContext(ctx, &item.Telemetry, `
		SELECT *
		FROM smart_device_telemetry
		WHERE device_id = $1
		ORDER BY received_at DESC
		LIMIT 30`, deviceID)

	metrics, err := r.metricsByDevice(ctx, deviceID)
	if err == nil && metrics != nil {
		item.Metrics = *metrics
	}

	var assignment DeviceAssignment
	if err := r.db.GetContext(ctx, &assignment, `
		SELECT *
		FROM smart_device_assignments
		WHERE device_id = $1 AND unassigned_at IS NULL
		ORDER BY assigned_at DESC
		LIMIT 1`, deviceID); err == nil {
		item.LatestAssignment = &assignment
	}
	return &item, nil
}

func (r *Repository) metricsByDevice(ctx context.Context, deviceID uuid.UUID) (*DeviceMetrics, error) {
	var metrics DeviceMetrics
	var lastAck sql.NullTime
	err := r.db.QueryRowxContext(ctx, `
		SELECT
			COUNT(*) AS total_commands,
			COUNT(*) FILTER (WHERE status = 'acked') AS acked_commands,
			COUNT(*) FILTER (WHERE status = 'failed') AS failed_commands,
			COUNT(*) FILTER (WHERE status IN ('pending', 'retry', 'processing')) AS pending_commands,
			COALESCE(AVG(EXTRACT(EPOCH FROM (acked_at - published_at)) * 1000) FILTER (WHERE acked_at IS NOT NULL AND published_at IS NOT NULL), 0) AS avg_ack_latency_ms,
			COUNT(*) FILTER (WHERE status = 'acked' AND acked_at >= NOW() - INTERVAL '24 hours') AS ack_messages_24h
		FROM smart_device_commands
		WHERE device_id = $1`, deviceID).Scan(
		&metrics.TotalCommands,
		&metrics.AckedCommands,
		&metrics.FailedCommands,
		&metrics.PendingCommands,
		&metrics.AvgAckLatencyMs,
		&metrics.AckMessages24H,
	)
	if err != nil {
		return nil, err
	}
	_ = r.db.QueryRowxContext(ctx, `
		SELECT COUNT(*)
		FROM smart_device_telemetry
		WHERE device_id = $1
		  AND message_type = 'state'
		  AND received_at >= NOW() - INTERVAL '24 hours'`, deviceID).Scan(&metrics.StateMessages24H)
	_ = r.db.QueryRowxContext(ctx, `
		SELECT MAX(acked_at)
		FROM smart_device_commands
		WHERE device_id = $1
		  AND acked_at IS NOT NULL`, deviceID).Scan(&lastAck)
	if lastAck.Valid {
		metrics.LastAckAt = &lastAck.Time
	}
	return &metrics, nil
}

func (r *Repository) CreateCommand(ctx context.Context, item DeviceCommand) error {
	_, err := r.db.NamedExecContext(ctx, `
		INSERT INTO smart_device_commands (
			id, tenant_id, device_id, resource_id, booking_id, trigger_event, command_topic,
			payload, qos, retain, status, publish_attempts, next_attempt_at, published_at,
			acked_at, last_error, dedupe_key, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :device_id, :resource_id, :booking_id, :trigger_event, :command_topic,
			:payload, :qos, :retain, :status, :publish_attempts, :next_attempt_at, :published_at,
			:acked_at, :last_error, :dedupe_key, :created_at, :updated_at
		)
		ON CONFLICT (dedupe_key) DO NOTHING`, item)
	return err
}

func (r *Repository) FindEnabledDeviceByResource(ctx context.Context, tenantID, resourceID uuid.UUID) (*Device, error) {
	var item Device
	err := r.db.GetContext(ctx, &item, `
		SELECT *
		FROM smart_devices
		WHERE tenant_id = $1
		  AND resource_id = $2
		  AND is_enabled = true
		ORDER BY updated_at DESC
		LIMIT 1`, tenantID, resourceID)
	if err != nil {
		return nil, err
	}
	normalizeDevice(&item)
	return &item, nil
}

func (r *Repository) ClaimDueCommands(ctx context.Context, limit int) ([]DeviceCommand, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var items []DeviceCommand
	if err := tx.SelectContext(ctx, &items, `
		SELECT *
		FROM smart_device_commands
		WHERE status IN ('pending', 'retry')
		  AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
		ORDER BY created_at ASC
		LIMIT $1
		FOR UPDATE SKIP LOCKED`, limit); err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, tx.Commit()
	}

	var ids []uuid.UUID
	for _, item := range items {
		ids = append(ids, item.ID)
	}
	query, args, err := sqlx.In(`UPDATE smart_device_commands SET status = 'processing', updated_at = NOW() WHERE id IN (?)`, ids)
	if err != nil {
		return nil, err
	}
	query = tx.Rebind(query)
	if _, err := tx.ExecContext(ctx, query, args...); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return items, nil
}

func (r *Repository) MarkCommandPublished(ctx context.Context, commandID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE smart_device_commands
		SET status = 'sent',
			publish_attempts = publish_attempts + 1,
			next_attempt_at = NULL,
			last_error = '',
			published_at = NOW(),
			updated_at = NOW()
		WHERE id = $1`, commandID)
	return err
}

func (r *Repository) MarkCommandRetry(ctx context.Context, commandID uuid.UUID, lastError string, attempts int, retryAt time.Time) error {
	status := "retry"
	if attempts >= 5 {
		status = "failed"
	}
	_, err := r.db.ExecContext(ctx, `
		UPDATE smart_device_commands
		SET status = $2,
			publish_attempts = publish_attempts + 1,
			last_error = $3,
			next_attempt_at = CASE WHEN $2 = 'failed' THEN NULL ELSE $4 END,
			updated_at = NOW()
		WHERE id = $1`, commandID, status, lastError, retryAt)
	return err
}

func (r *Repository) MarkCommandAcked(ctx context.Context, commandID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE smart_device_commands
		SET status = 'acked',
			acked_at = NOW(),
			updated_at = NOW()
		WHERE id = $1`, commandID)
	return err
}

func (r *Repository) UpsertTelemetry(ctx context.Context, mqttDeviceID, topic string, payload []byte, messageType string) error {
	device, err := r.FindByDeviceID(ctx, mqttDeviceID)
	if err != nil && err != sql.ErrNoRows {
		return err
	}
	var tenantID *uuid.UUID
	var deviceUUID *uuid.UUID
	if device != nil {
		tenantID = device.TenantID
		deviceUUID = &device.ID
	}
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO smart_device_telemetry (
			id, tenant_id, device_id, mqtt_device_id, topic, payload, message_type, received_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, NOW()
		)`, uuid.New(), tenantID, deviceUUID, mqttDeviceID, topic, normalizeJSONPayload(payload), messageType)
	return err
}

func (r *Repository) UpdateDeviceState(ctx context.Context, mqttDeviceID, topic string, payload []byte, connectionStatus string, lastIP *string) (*Device, error) {
	normalizedPayload := normalizeJSONPayload(payload)
	var item Device
	err := r.db.GetContext(ctx, &item, `
		UPDATE smart_devices
		SET connection_status = $2,
			pairing_status = CASE WHEN pairing_status IN ('claimed', 'paired') THEN 'paired' ELSE pairing_status END,
			last_seen_at = NOW(),
			last_state_payload = $3::jsonb,
			last_state_topic = $4,
			last_ip = COALESCE($5, last_ip),
			paired_at = COALESCE(paired_at, NOW()),
			updated_at = NOW()
		WHERE device_id = $1
		RETURNING *`, mqttDeviceID, connectionStatus, string(normalizedPayload), topic, lastIP)
	if err != nil {
		return nil, err
	}
	normalizeDevice(&item)
	return &item, nil
}

func (r *Repository) MarkDeviceOffline(ctx context.Context, mqttDeviceID, topic string) (*Device, error) {
	offlinePayload := []byte(`{"status":"offline"}`)
	var item Device
	err := r.db.GetContext(ctx, &item, `
		UPDATE smart_devices
		SET connection_status = 'offline',
			last_seen_at = NOW(),
			last_state_payload = $2::jsonb,
			last_state_topic = $3,
			updated_at = NOW()
		WHERE device_id = $1
		RETURNING *`, mqttDeviceID, string(offlinePayload), topic)
	if err != nil {
		return nil, err
	}
	normalizeDevice(&item)
	return &item, nil
}

func (r *Repository) FindCommandByID(ctx context.Context, commandID uuid.UUID) (*DeviceCommand, error) {
	var item DeviceCommand
	if err := r.db.GetContext(ctx, &item, `SELECT * FROM smart_device_commands WHERE id = $1 LIMIT 1`, commandID); err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) FindStaleDevices(ctx context.Context, cutoff time.Time) ([]Device, error) {
	var items []Device
	err := r.db.SelectContext(ctx, &items, `
		SELECT *
		FROM smart_devices
		WHERE connection_status = 'online'
		  AND last_seen_at IS NOT NULL
		  AND last_seen_at < $1`, cutoff)
	if err != nil {
		return nil, err
	}
	normalizeDevices(items)
	return items, nil
}

func (r *Repository) MarkDeviceOfflineByID(ctx context.Context, deviceID uuid.UUID, reason string) error {
	payload := mustJSON(map[string]any{
		"status": "offline",
		"reason": reason,
	})
	_, err := r.db.ExecContext(ctx, `
		UPDATE smart_devices
		SET connection_status = 'offline',
			last_state_payload = $2::jsonb,
			last_state_topic = 'system/reconciler',
			updated_at = NOW()
		WHERE id = $1`, deviceID, string(payload))
	return err
}

func (r *Repository) FindActiveBookingForResource(ctx context.Context, tenantID, resourceID uuid.UUID) (*BookingProjection, error) {
	var item BookingProjection
	err := r.db.GetContext(ctx, &item, `
		SELECT id, tenant_id, resource_id
		FROM bookings
		WHERE tenant_id = $1
		  AND resource_id = $2
		  AND status IN ('active', 'ongoing')
		  AND end_time > NOW() - INTERVAL '1 minute'
		ORDER BY start_time ASC
		LIMIT 1`, tenantID, resourceID)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) PairClaimedDevice(ctx context.Context, deviceID, deviceKeyHash string) (*Device, error) {
	var item Device
	err := r.db.GetContext(ctx, &item, `
		UPDATE smart_devices
		SET pairing_status = 'paired',
			paired_at = COALESCE(paired_at, NOW()),
			updated_at = NOW()
		WHERE device_id = $1
		  AND device_key_hash = $2
		  AND tenant_id IS NOT NULL
		RETURNING *`, deviceID, deviceKeyHash)
	if err != nil {
		return nil, err
	}
	normalizeDevice(&item)
	return &item, nil
}

func (r *Repository) InsertEvent(ctx context.Context, deviceID uuid.UUID, tenantID, actorID *uuid.UUID, actorType, eventType, title, description string, metadata map[string]any) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO smart_device_events (
			id, tenant_id, device_id, actor_id, actor_type, event_type, title, description, metadata, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
		)`,
		uuid.New(), tenantID, deviceID, actorID, actorType, eventType, title, description, mustJSON(metadata),
	)
	return err
}

func (r *Repository) insertEventTx(ctx context.Context, tx *sqlx.Tx, deviceID uuid.UUID, tenantID, actorID *uuid.UUID, actorType, eventType, title, description string, metadata map[string]any) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO smart_device_events (
			id, tenant_id, device_id, actor_id, actor_type, event_type, title, description, metadata, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
		)`,
		uuid.New(), tenantID, deviceID, actorID, actorType, eventType, title, description, mustJSON(metadata),
	)
	return err
}

func normalizeDevices(items []Device) {
	for i := range items {
		normalizeDevice(&items[i])
	}
}

func normalizeDevice(item *Device) {
	if item == nil {
		return
	}
	if item.LastStatePayload == nil {
		empty := json.RawMessage(`{}`)
		item.LastStatePayload = &empty
	}
}

func mustJSON(v map[string]any) []byte {
	if v == nil {
		return []byte(`{}`)
	}
	raw, err := json.Marshal(v)
	if err != nil || len(raw) == 0 {
		return []byte(`{}`)
	}
	return raw
}
