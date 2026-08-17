-- Timeline event log untuk sales order (kasir): mencatat tiap transisi —
-- pesanan dibuat, item ditambahkan, pembayaran (tunai/manual), bon ditutup,
-- dibatalkan — agar kasir bisa melacak kronologi (termasuk pembayaran kedua).
CREATE TABLE IF NOT EXISTS sales_order_events (
    id             UUID PRIMARY KEY,
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    tenant_id      UUID NOT NULL,
    event_type     TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    amount         BIGINT NOT NULL DEFAULT 0,
    method_code    TEXT NOT NULL DEFAULT '',
    metadata       JSONB NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_order_events_order
    ON sales_order_events (sales_order_id, created_at);
