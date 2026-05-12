CREATE UNIQUE INDEX IF NOT EXISTS uniq_customers_email_lower
    ON customers (LOWER(email))
    WHERE COALESCE(NULLIF(BTRIM(email), ''), '') <> '';
