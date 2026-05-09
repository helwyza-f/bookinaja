ALTER TABLE resources
    ADD COLUMN IF NOT EXISTS operating_mode VARCHAR(24) NOT NULL DEFAULT 'timed';

UPDATE resources
SET operating_mode = 'timed'
WHERE operating_mode IS NULL
   OR BTRIM(operating_mode) = '';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'resources_operating_mode_check'
    ) THEN
        ALTER TABLE resources
            ADD CONSTRAINT resources_operating_mode_check
            CHECK (operating_mode IN ('timed', 'direct_sale', 'hybrid'));
    END IF;
END $$;
