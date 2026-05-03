ALTER TABLE booking_events
    ADD COLUMN actor_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN actor_name VARCHAR(255),
    ADD COLUMN actor_email VARCHAR(255),
    ADD COLUMN actor_role VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_booking_events_actor_user_id
    ON booking_events(actor_user_id);
