DROP INDEX IF EXISTS idx_sales_orders_access_token;

ALTER TABLE sales_orders
    DROP COLUMN IF EXISTS access_token;
