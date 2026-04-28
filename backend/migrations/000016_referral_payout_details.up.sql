-- =============================================================================
-- MIGRATION: 000016_referral_payout_details.up.sql
-- DESCRIPTION: Payout destination for referral withdrawals
-- =============================================================================

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS payout_bank_name TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS payout_account_name TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS payout_account_number TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS payout_whatsapp TEXT DEFAULT '';
