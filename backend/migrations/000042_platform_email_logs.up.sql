-- =============================================================================
-- MIGRATION: 000042_platform_email_logs.up.sql
-- DESCRIPTION: Audit trail email platform for programmatic sends
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(32) NOT NULL DEFAULT 'resend',
    provider_message_id VARCHAR(128) NOT NULL DEFAULT '',
    source VARCHAR(64) NOT NULL DEFAULT 'platform_admin',
    event_key VARCHAR(128) NOT NULL DEFAULT 'platform_manual',
    template_key VARCHAR(128) NOT NULL DEFAULT '',
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL DEFAULT '',
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    error_message TEXT NOT NULL DEFAULT '',
    request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    tags JSONB NOT NULL DEFAULT '{}'::jsonb,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_email_logs_created_at
    ON platform_email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_email_logs_event_key
    ON platform_email_logs(event_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_email_logs_status
    ON platform_email_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_email_logs_recipient
    ON platform_email_logs(recipient);
