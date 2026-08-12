ALTER TABLE bookings
    DROP COLUMN IF EXISTS internal_note,
    DROP COLUMN IF EXISTS rescheduled_at,
    DROP COLUMN IF EXISTS reschedule_count,
    DROP COLUMN IF EXISTS no_show_at;
