-- Trial-of-Pro: pastikan tenant trial punya tanggal berakhir (created + 14 hari).
-- Tenant trial lama yang sudah lewat 14 hari otomatis jadi setara Free
-- (entitlement mati via IsSubscriptionActive; billing menampilkan "Free").
UPDATE tenants
SET subscription_current_period_start = COALESCE(subscription_current_period_start, created_at),
    subscription_current_period_end = created_at + INTERVAL '14 days'
WHERE subscription_status = 'trial'
  AND subscription_current_period_end IS NULL;

-- Selama masih dalam jendela trial, beri akses Pro (plan='pro') supaya
-- benar-benar mencicipi. Yang sudah lewat tidak terpengaruh entitlement-nya.
UPDATE tenants
SET plan = 'pro'
WHERE subscription_status = 'trial'
  AND plan = 'trial';
