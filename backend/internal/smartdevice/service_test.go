package smartdevice

import (
	"context"
	"database/sql"
	"encoding/json"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

func newSmartDeviceTestService(t *testing.T) (*Service, sqlmock.Sqlmock) {
	t.Helper()

	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}
	t.Cleanup(func() {
		_ = db.Close()
	})

	sqlxDB := sqlx.NewDb(db, "sqlmock")
	return NewService(NewRepository(sqlxDB), nil, nil), mock
}

func TestBootstrapMissingCommandsCreatesStandbyCommandForAssignedDevice(t *testing.T) {
	svc, mock := newSmartDeviceTestService(t)
	tenantID := uuid.New()
	deviceID := uuid.New()
	resourceID := uuid.New()

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT d.*
		FROM smart_devices d
		WHERE d.tenant_id IS NOT NULL
		  AND d.resource_id IS NOT NULL
		  AND d.is_enabled = true
		  AND NOT EXISTS (
			SELECT 1
			FROM smart_device_commands c
			WHERE c.device_id = d.id
		  )
		ORDER BY d.created_at ASC`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id",
			"tenant_id",
			"resource_id",
			"device_id",
			"device_name",
			"device_key_hash",
			"pairing_status",
			"connection_status",
			"is_enabled",
			"firmware_version",
			"hardware_revision",
			"last_seen_at",
			"last_state_payload",
			"last_state_topic",
			"last_ip",
			"claimed_at",
			"paired_at",
			"disabled_at",
			"created_at",
			"updated_at",
		}).AddRow(
			deviceID,
			tenantID,
			resourceID,
			"studio-a",
			"Studio A",
			"hash",
			"paired",
			"online",
			true,
			"",
			"",
			nil,
			[]byte(`{}`),
			"",
			nil,
			nil,
			nil,
			nil,
			time.Now().UTC(),
			time.Now().UTC(),
		))

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT EXISTS (
			SELECT 1
			FROM smart_device_commands
			WHERE device_id = $1
		)`)).
		WithArgs(deviceID).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, tenant_id, resource_id
		FROM bookings
		WHERE tenant_id = $1
		  AND resource_id = $2
		  AND status IN ('active', 'ongoing')
		  AND end_time > NOW() - INTERVAL '1 minute'
		ORDER BY start_time ASC
		LIMIT 1`)).
		WithArgs(tenantID, resourceID).
		WillReturnError(sql.ErrNoRows)

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT *
		FROM smart_devices
		WHERE tenant_id = $1
		  AND resource_id = $2
		  AND is_enabled = true
		ORDER BY updated_at DESC
		LIMIT 1`)).
		WithArgs(tenantID, resourceID).
		WillReturnRows(sqlmock.NewRows([]string{
			"id",
			"tenant_id",
			"resource_id",
			"device_id",
			"device_name",
			"device_key_hash",
			"pairing_status",
			"connection_status",
			"is_enabled",
			"firmware_version",
			"hardware_revision",
			"last_seen_at",
			"last_state_payload",
			"last_state_topic",
			"last_ip",
			"claimed_at",
			"paired_at",
			"disabled_at",
			"created_at",
			"updated_at",
		}).AddRow(
			deviceID,
			tenantID,
			resourceID,
			"studio-a",
			"Studio A",
			"hash",
			"paired",
			"online",
			true,
			"",
			"",
			nil,
			[]byte(`{}`),
			"",
			nil,
			nil,
			nil,
			nil,
			time.Now().UTC(),
			time.Now().UTC(),
		))

	mock.ExpectExec(`INSERT INTO smart_device_commands`).
		WithArgs(
			sqlmock.AnyArg(),
			tenantID,
			deviceID,
			resourceID,
			nil,
			"standby",
			"bookinaja/devices/studio-a/set",
			sqlmock.AnyArg(),
			int16(1),
			false,
			"pending",
			0,
			nil,
			nil,
			nil,
			"",
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
		).
		WillReturnResult(sqlmock.NewResult(1, 1))

	if err := svc.BootstrapMissingCommands(context.Background()); err != nil {
		t.Fatalf("BootstrapMissingCommands() error = %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet() error = %v", err)
	}
}

func TestAssignBootstrapsInitialCommandWhenHistoryEmpty(t *testing.T) {
	svc, mock := newSmartDeviceTestService(t)
	tenantID := uuid.New()
	deviceID := uuid.New()
	resourceID := uuid.New()
	tenantIDText := tenantID.String()

	mock.ExpectBegin()

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT tenant_id FROM resources WHERE id = $1 LIMIT 1`)).
		WithArgs(resourceID).
		WillReturnRows(sqlmock.NewRows([]string{"tenant_id"}).AddRow(tenantID))

	mock.ExpectExec(regexp.QuoteMeta(`
		UPDATE smart_device_assignments
		SET unassigned_at = NOW()
		WHERE (device_id = $1 OR resource_id = $2) AND unassigned_at IS NULL`)).
		WithArgs(deviceID, resourceID).
		WillReturnResult(sqlmock.NewResult(1, 0))

	mock.ExpectExec(regexp.QuoteMeta(`
		INSERT INTO smart_device_assignments (id, device_id, resource_id, tenant_id, assigned_by, assigned_at)
		VALUES ($1, $2, $3, $4, $5, NOW())`)).
		WithArgs(sqlmock.AnyArg(), deviceID, resourceID, tenantID, nil).
		WillReturnResult(sqlmock.NewResult(1, 1))

	mock.ExpectExec(regexp.QuoteMeta(`
		UPDATE smart_devices
		SET resource_id = $1,
			updated_at = NOW()
		WHERE id = $2 AND tenant_id = $3`)).
		WithArgs(resourceID, deviceID, tenantID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	mock.ExpectExec(regexp.QuoteMeta(`
		INSERT INTO smart_device_events (
			id, tenant_id, device_id, actor_id, actor_type, event_type, title, description, metadata, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
		)`)).
		WithArgs(
			sqlmock.AnyArg(),
			tenantID,
			deviceID,
			nil,
			"admin",
			"device.assigned",
			"Device di-assign",
			"Device dihubungkan ke resource.",
			sqlmock.AnyArg(),
		).
		WillReturnResult(sqlmock.NewResult(1, 1))

	mock.ExpectCommit()

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT *
		FROM smart_devices
		WHERE id = $1 AND tenant_id = $2
		LIMIT 1`)).
		WithArgs(deviceID, tenantID).
		WillReturnRows(sqlmock.NewRows([]string{
			"id",
			"tenant_id",
			"resource_id",
			"device_id",
			"device_name",
			"device_key_hash",
			"pairing_status",
			"connection_status",
			"is_enabled",
			"firmware_version",
			"hardware_revision",
			"last_seen_at",
			"last_state_payload",
			"last_state_topic",
			"last_ip",
			"claimed_at",
			"paired_at",
			"disabled_at",
			"created_at",
			"updated_at",
		}).AddRow(
			deviceID,
			tenantID,
			resourceID,
			"studio-a",
			"Studio A",
			"hash",
			"claimed",
			"unknown",
			true,
			"",
			"",
			nil,
			[]byte(`{}`),
			"",
			nil,
			nil,
			nil,
			nil,
			time.Now().UTC(),
			time.Now().UTC(),
		))

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT EXISTS (
			SELECT 1
			FROM smart_device_commands
			WHERE device_id = $1
		)`)).
		WithArgs(deviceID).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, tenant_id, resource_id
		FROM bookings
		WHERE tenant_id = $1
		  AND resource_id = $2
		  AND status IN ('active', 'ongoing')
		  AND end_time > NOW() - INTERVAL '1 minute'
		ORDER BY start_time ASC
		LIMIT 1`)).
		WithArgs(tenantID, resourceID).
		WillReturnError(sql.ErrNoRows)

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT *
		FROM smart_devices
		WHERE tenant_id = $1
		  AND resource_id = $2
		  AND is_enabled = true
		ORDER BY updated_at DESC
		LIMIT 1`)).
		WithArgs(tenantID, resourceID).
		WillReturnRows(sqlmock.NewRows([]string{
			"id",
			"tenant_id",
			"resource_id",
			"device_id",
			"device_name",
			"device_key_hash",
			"pairing_status",
			"connection_status",
			"is_enabled",
			"firmware_version",
			"hardware_revision",
			"last_seen_at",
			"last_state_payload",
			"last_state_topic",
			"last_ip",
			"claimed_at",
			"paired_at",
			"disabled_at",
			"created_at",
			"updated_at",
		}).AddRow(
			deviceID,
			tenantID,
			resourceID,
			"studio-a",
			"Studio A",
			"hash",
			"claimed",
			"unknown",
			true,
			"",
			"",
			nil,
			[]byte(`{}`),
			"",
			nil,
			nil,
			nil,
			nil,
			time.Now().UTC(),
			time.Now().UTC(),
		))

	mock.ExpectExec(`INSERT INTO smart_device_commands`).
		WithArgs(
			sqlmock.AnyArg(),
			tenantID,
			deviceID,
			resourceID,
			nil,
			"standby",
			"bookinaja/devices/studio-a/set",
			sqlmock.AnyArg(),
			int16(1),
			false,
			"pending",
			0,
			nil,
			nil,
			nil,
			"",
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
		).
		WillReturnResult(sqlmock.NewResult(1, 1))

	if err := svc.Assign(context.Background(), tenantIDText, deviceID.String(), nil, AssignDeviceReq{ResourceID: resourceID.String()}); err != nil {
		t.Fatalf("Assign() error = %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet() error = %v", err)
	}
}

func TestBuildPayloadStandbyIncludesNormalizedCommandBody(t *testing.T) {
	svc, _ := newSmartDeviceTestService(t)
	tenantID := uuid.New()
	deviceID := uuid.New()
	resourceID := uuid.New()
	commandID := uuid.New()
	issuedAt := time.Now().UTC()

	payload, topic, dedupeKey, err := svc.buildPayload(commandID, Device{
		ID:         deviceID,
		TenantID:   &tenantID,
		ResourceID: &resourceID,
		DeviceID:   "studio-a",
	}, TestDeviceReq{
		Event:      "standby",
		AudioIndex: 0,
		LightMode:  "off",
		Color:      "#ffffff",
		Volume:     0,
	}, issuedAt, "", resourceID.String())
	if err != nil {
		t.Fatalf("buildPayload() error = %v", err)
	}

	if topic != "bookinaja/devices/studio-a/set" {
		t.Fatalf("topic = %s, want standby topic", topic)
	}
	if dedupeKey == "" {
		t.Fatal("dedupeKey = empty, want generated key")
	}

	var body CommandPayload
	if err := json.Unmarshal(payload, &body); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if body.Event != "standby" {
		t.Fatalf("body.Event = %s, want standby", body.Event)
	}
	if body.LightMode != "off" {
		t.Fatalf("body.LightMode = %s, want off", body.LightMode)
	}
	if body.Color != "#FFFFFF" {
		t.Fatalf("body.Color = %s, want #FFFFFF", body.Color)
	}
	if body.Volume != 0 {
		t.Fatalf("body.Volume = %d, want silent standby volume", body.Volume)
	}
	if body.ResourceID != resourceID.String() {
		t.Fatalf("body.ResourceID = %s, want %s", body.ResourceID, resourceID.String())
	}
}

func TestBuildPayloadDefaultsManualCommandVolumeToTwenty(t *testing.T) {
	svc, _ := newSmartDeviceTestService(t)
	tenantID := uuid.New()
	deviceID := uuid.New()
	commandID := uuid.New()

	payload, _, _, err := svc.buildPayload(commandID, Device{
		ID:       deviceID,
		TenantID: &tenantID,
		DeviceID: "studio-a",
	}, TestDeviceReq{
		Event:      "warning",
		AudioIndex: 2,
		LightMode:  "blink",
		Color:      "#ffaa00",
		Volume:     0,
	}, time.Now().UTC(), "", "")
	if err != nil {
		t.Fatalf("buildPayload() error = %v", err)
	}

	var body CommandPayload
	if err := json.Unmarshal(payload, &body); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if body.Volume != 20 {
		t.Fatalf("body.Volume = %d, want default 20", body.Volume)
	}
}
