DROP INDEX IF EXISTS idx_sales_orders_kind;

ALTER TABLE sales_orders DROP COLUMN IF EXISTS order_kind;

-- Re-add NOT NULL only works if no menu orders (NULL resource_id) exist.
ALTER TABLE sales_orders ALTER COLUMN resource_id SET NOT NULL;
