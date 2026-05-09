ALTER TABLE resources
    DROP CONSTRAINT IF EXISTS resources_operating_mode_check;

ALTER TABLE resources
    DROP COLUMN IF EXISTS operating_mode;
