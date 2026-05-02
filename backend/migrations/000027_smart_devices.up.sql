CREATE TABLE IF NOT EXISTS smart_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NULL REFERENCES tenants(id) ON DELETE SET NULL,
    resource_id UUID NULL REFERENCES resources(id) ON DELETE SET NULL,
    device_id VARCHAR(128) NOT NULL UNIQUE,
    device_name VARCHAR(255) NOT NULL,
    device_key_hash TEXT NOT NULL,
    pairing_status VARCHAR(32) NOT NULL DEFAULT 'unclaimed',
    connection_status VARCHAR(32) NOT NULL DEFAULT 'unknown',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    firmware_version VARCHAR(64) DEFAULT '',
    hardware_revision VARCHAR(64) DEFAULT '',
    last_seen_at TIMESTAMP WITH TIME ZONE NULL,
    last_state_payload JSONB NOT NULL DEFAULT '{}',
    last_state_topic TEXT DEFAULT '',
    last_ip INET NULL,
    claimed_at TIMESTAMP WITH TIME ZONE NULL,
    paired_at TIMESTAMP WITH TIME ZONE NULL,
    disabled_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_devices_tenant ON smart_devices(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smart_devices_resource ON smart_devices(resource_id);
CREATE INDEX IF NOT EXISTS idx_smart_devices_connection_status ON smart_devices(connection_status, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS smart_device_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES smart_devices(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assigned_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    unassigned_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_smart_device_assignments_active_device
    ON smart_device_assignments(device_id)
    WHERE unassigned_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_smart_device_assignments_active_resource
    ON smart_device_assignments(resource_id)
    WHERE unassigned_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_smart_device_assignments_tenant
    ON smart_device_assignments(tenant_id, assigned_at DESC);

CREATE TABLE IF NOT EXISTS smart_device_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES smart_devices(id) ON DELETE CASCADE,
    resource_id UUID NULL REFERENCES resources(id) ON DELETE SET NULL,
    booking_id UUID NULL REFERENCES bookings(id) ON DELETE SET NULL,
    trigger_event VARCHAR(64) NOT NULL,
    command_topic TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    qos SMALLINT NOT NULL DEFAULT 1,
    retain BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    publish_attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP WITH TIME ZONE NULL,
    published_at TIMESTAMP WITH TIME ZONE NULL,
    acked_at TIMESTAMP WITH TIME ZONE NULL,
    last_error TEXT DEFAULT '',
    dedupe_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_smart_device_commands_dedupe
    ON smart_device_commands(dedupe_key);

CREATE INDEX IF NOT EXISTS idx_smart_device_commands_device
    ON smart_device_commands(device_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_smart_device_commands_status
    ON smart_device_commands(status, next_attempt_at ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS smart_device_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NULL REFERENCES tenants(id) ON DELETE SET NULL,
    device_id UUID NULL REFERENCES smart_devices(id) ON DELETE SET NULL,
    mqtt_device_id VARCHAR(128) NOT NULL,
    topic TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    message_type VARCHAR(32) NOT NULL DEFAULT 'state',
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_device_telemetry_device
    ON smart_device_telemetry(device_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_smart_device_telemetry_mqtt_device
    ON smart_device_telemetry(mqtt_device_id, received_at DESC);

CREATE TABLE IF NOT EXISTS smart_device_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NULL REFERENCES tenants(id) ON DELETE SET NULL,
    device_id UUID NOT NULL REFERENCES smart_devices(id) ON DELETE CASCADE,
    actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    actor_type VARCHAR(32) NOT NULL DEFAULT 'system',
    event_type VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_device_events_device
    ON smart_device_events(device_id, created_at DESC);
