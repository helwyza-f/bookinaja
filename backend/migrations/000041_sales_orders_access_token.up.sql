ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS access_token UUID DEFAULT uuid_generate_v4();

UPDATE sales_orders
SET access_token = uuid_generate_v4()
WHERE access_token IS NULL;

ALTER TABLE sales_orders
    ALTER COLUMN access_token SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_orders_access_token
    ON sales_orders (access_token);
