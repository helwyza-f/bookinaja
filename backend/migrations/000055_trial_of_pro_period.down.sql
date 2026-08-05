-- Non-destructive rollback: kembalikan plan trial, biarkan period_end apa adanya.
UPDATE tenants
SET plan = 'trial'
WHERE subscription_status = 'trial'
  AND plan = 'pro';
