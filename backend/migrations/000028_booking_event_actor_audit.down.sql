DROP INDEX IF EXISTS idx_booking_events_actor_user_id;

ALTER TABLE booking_events
    DROP COLUMN IF EXISTS actor_role,
    DROP COLUMN IF EXISTS actor_email,
    DROP COLUMN IF EXISTS actor_name,
    DROP COLUMN IF EXISTS actor_user_id;
