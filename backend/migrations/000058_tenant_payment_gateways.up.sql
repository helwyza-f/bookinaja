-- Kredensial payment gateway milik tenant (BYO gateway). Server key & callback
-- secret disimpan terenkripsi (bytea, AES-256-GCM) — tidak pernah plaintext.
-- Satu baris per tenant (tenant memilih satu provider aktif).
CREATE TABLE IF NOT EXISTS tenant_payment_gateways (
	id                  uuid PRIMARY KEY,
	tenant_id           uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
	provider            text NOT NULL,
	environment         text NOT NULL DEFAULT 'sandbox',
	server_key_enc      bytea,
	client_key          text NOT NULL DEFAULT '',
	callback_secret_enc bytea,
	status              text NOT NULL DEFAULT 'unverified',
	last_error          text NOT NULL DEFAULT '',
	verified_at         timestamptz,
	created_at          timestamptz NOT NULL DEFAULT now(),
	updated_at          timestamptz NOT NULL DEFAULT now()
);
