-- Standalone menu orders (mode F&B "standalone"): sales order tanpa resource.
-- Order menu walk-in tidak terikat ke lapangan/resource mana pun, jadi
-- resource_id boleh NULL. order_kind memisahkan buku: 'direct_sale' (default,
-- perilaku lama) vs 'menu' (kasir F&B terpisah).

ALTER TABLE sales_orders ALTER COLUMN resource_id DROP NOT NULL;

ALTER TABLE sales_orders
    ADD COLUMN IF NOT EXISTS order_kind VARCHAR(24) NOT NULL DEFAULT 'direct_sale';

CREATE INDEX IF NOT EXISTS idx_sales_orders_kind
    ON sales_orders (tenant_id, order_kind, created_at DESC);
