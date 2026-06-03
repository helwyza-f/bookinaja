DELETE FROM tenant_ledger_entries
WHERE source_type = 'subscription';

WITH ordered AS (
    SELECT
        id,
        SUM(
            CASE
                WHEN status = 'settled' AND direction = 'credit' THEN net_amount
                WHEN status = 'settled' AND direction = 'debit' THEN -net_amount
                ELSE 0
            END
        ) OVER (
            PARTITION BY tenant_id
            ORDER BY created_at ASC, id ASC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS recalculated_balance
    FROM tenant_ledger_entries
    WHERE source_type IN ('booking_payment', 'sales_order_payment', 'refund', 'payout', 'adjustment')
)
UPDATE tenant_ledger_entries l
SET balance_after = ordered.recalculated_balance,
    updated_at = NOW()
FROM ordered
WHERE ordered.id = l.id;
