# BYO Payment Gateway — Implementation Plan

Tenant memakai akun payment gateway mereka sendiri (Xendit / Midtrans),
mengisi API key sendiri. Tujuan strategis: **uang pembayaran customer→tenant
tidak pernah menyentuh akun Bookinaja**, sehingga Bookinaja keluar dari zona
PJP (Penyedia Jasa Pembayaran) dan tidak perlu lisensi Bank Indonesia.

## Goals / Non-goals

**Goals**
- Tenant bisa colok kredensial Xendit/Midtrans sendiri (Pro/Scale).
- Pembayaran booking & POS (customer→tenant) settle langsung ke akun tenant.
- Metode manual (transfer / QRIS static ke rekening tenant) tetap jadi default
  nol-friksi untuk tenant yang belum/tidak mau BYO.

**Non-goals**
- Bookinaja **tidak** menjadi merchant-of-record untuk uang tenant.
- Tidak menyimpan/menyentuh data kartu (tetap redirect/Snap → PCI scope rendah).
- **Tidak** mengubah billing subscription (tenant→Bookinaja) — itu tetap pakai
  akun platform karena memang revenue Bookinaja sendiri.

## Prinsip

1. **Money-of-record = tenant** untuk semua pembayaran customer (booking/POS).
2. **Secret terenkripsi at-rest**, tidak pernah di-log, tidak pernah di-return
   ke frontend (kecuali client key Midtrans yang memang publik).
3. **Trust webhook dari ID milik kita sendiri**: resolve tenant dari
   `order_id`/`external_id` DULU, baru muat kredensial tenant untuk verifikasi
   signature. Payload gateway tidak dipercaya sebelum itu.
4. **Backward compatible** selama rollout; per-tenant feature flag.

## Ringkasan kondisi sekarang (titik jangkar di kode)

- Outbound charge terpusat: `CreateGatewayCharge`
  (`backend/internal/billing/service.go:548`) → `createSnapTransaction`
  (Midtrans Snap) / `createXenditInvoice` (Xendit), **kredensial dari ENV**.
- Gateway aktif dipilih **platform-wide** via `platform_feature_settings`
  key `payment_gateway` — `ActiveGateway` (`billing/service.go:513`).
- Webhook Midtrans: verifikasi signature pakai `MIDTRANS_SERVER_KEY` env
  (`platform/midtrans/service.go:81`). Xendit: `XENDIT_CALLBACK_TOKEN` env.
- Mapping `order_id`/`external_id` → booking/sales/subscription → tenant sudah
  ada di `processNotification` (`platform/midtrans/service.go:98`).
- Metode manual (`bank_transfer`, `qris_static`) sudah memakai data rekening/
  QRIS **milik tenant** → aman, nol float.
- **Dua aliran uang memakai kode yang sama**:
  - Subscription (tenant→Bookinaja): `billing/service.go:64`.
  - Booking (customer→tenant): `billing/service.go:164`; POS: `sales`.

## Target arsitektur

- Pisahkan **platform charge** (subscription, akun Bookinaja) vs **tenant
  charge** (booking/POS, kredensial per-tenant).
- Auto-gateway di sisi customer hanya muncul kalau tenant sudah BYO & verified;
  kalau belum, customer hanya lihat metode manual.
- Webhook di-verifikasi dengan kredensial tenant (customer path) atau kredensial
  platform (subscription path).

## Data model

Tabel baru `tenant_payment_gateways`:

| kolom | tipe | catatan |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | unik per (tenant_id, provider) |
| provider | text | `midtrans` \| `xendit` |
| environment | text | `sandbox` \| `production` |
| server_key_enc | bytea | terenkripsi (secret) |
| client_key | text | Midtrans Snap client key (publik) — kosong untuk Xendit |
| callback_secret_enc | bytea | Xendit callback token / Midtrans (opsional), terenkripsi |
| status | text | `unverified` \| `verified` \| `disabled` |
| verified_at | timestamptz | |
| last_error | text | hasil test koneksi terakhir |
| created_at / updated_at | timestamptz | |

Enkripsi: helper baru `platform/secretbox` (AES-256-GCM), master key dari
`PAYMENT_SECRET_KEY` (idealnya KMS). Fungsi get me-return plaintext hanya
di memori; struct yang di-serialize ke JSON tidak pernah memuat `*_enc`.

## Rencana bertahap

### Phase 0 — Audit & guardrail
- Enumerasi SEMUA call-site gateway; klasifikasi subscription vs customer.
- Target audit: **tidak boleh ada** `os.Getenv("MIDTRANS_*"/"XENDIT_*")` di jalur
  customer (booking/POS) setelah refactor.

### Phase 1 — Penyimpanan kredensial + crypto
- Migration tabel `tenant_payment_gateways`.
- `platform/secretbox`: `Encrypt/Decrypt` AES-256-GCM.
- Repository: upsert / get(decrypted, in-memory) / disable. Jangan pernah log.

### Phase 2 — Resolver + refactor outbound
- `ResolveTenantGateway(ctx, tenantID) → (creds, ok)`.
- Pecah `CreateGatewayCharge` menjadi:
  - `CreatePlatformCharge` (subscription) — env keys, perilaku lama.
  - `CreateTenantCharge` (booking/POS) — wajib kredensial tenant; kalau tidak
    ada → tolak (customer diarahkan ke metode manual).
- `createSnapTransaction` / `createXenditInvoice` menerima `creds` sebagai
  parameter, bukan `os.Getenv`.

### Phase 3 — Webhook per-tenant
- Midtrans: tetap 1 endpoint; resolve tenant dari `order_id` → muat server key
  tenant → verifikasi. Order subscription → verifikasi pakai key platform.
- Xendit: lebih bersih pakai `/webhooks/xendit/:tenantId` (tiap tenant set URL
  sendiri di dashboard) ATAU resolve via `external_id`; verifikasi dengan
  callback token tenant.
- Idempotensi tetap lewat `midtrans_notification_logs`.

### Phase 4 — Client key Snap runtime
- Endpoint `GET /public/tenant/:slug/payment-config` → `{ provider,
  snap_client_key, environment }` (hanya client key publik; **tidak pernah**
  server key).
- Halaman pembayaran customer memuat Snap script + client key saat runtime,
  bukan dari `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`.
- Gating: metode auto-gateway hanya tampil kalau tenant configured & verified.

### Phase 5 — Settings UI tenant (Pro/Scale)
- Pilih provider, paste server key + client key (+ Xendit callback token),
  toggle sandbox/production.
- Secret di-mask; tombol **Test koneksi** (auth ping ke gateway).
- Tampilkan **webhook URL** untuk di-copy ke dashboard gateway tenant.
- Status verified/last_error.

### Phase 6 — Pensiunkan gateway platform di jalur customer
- Hapus auto-gateway platform dari seeding metode pembayaran booking/POS.
- Pastikan customer tenant yang belum BYO hanya melihat metode manual.
- Bereskan baris metode `midtrans` lama di `tenant_payment_methods` (repurpose
  jadi label "BYO gateway" atau nonaktifkan).

## Checklist keamanan
- Enkripsi at-rest; rencana rotasi key; redaksi secret di semua log/error.
- Webhook: verifikasi sebelum percaya; resolve tenant dari ID milik kita;
  rate-limit; idempoten.
- Isolasi sandbox vs production.
- Batasi akses baca kredensial (owner tenant saja) + audit trail perubahan.

## Rollout & titik audit
- Feature flag per tenant (Pro/Scale gate).
- Dual-run: manual + BYO aktif; gateway platform dibatasi HANYA untuk subscription.
- Audit akhir: grep `os.Getenv` gateway di jalur customer = **nol**.
- Rekonsiliasi: karena dana kini di akun tenant, hapus asumsi settlement lewat
  platform pada jalur booking/POS.

## Rekomendasi urutan (tactical)

**Ship Xendit BYO lebih dulu.** Xendit invoice adalah **pure redirect**
(`invoice_url`) — tanpa client key sisi-klien, tanpa Snap script. Jadi Phase 4
(client key runtime) bisa ditunda; MVP-nya = tabel + resolver + outbound +
webhook `/webhooks/xendit/:tenantId` + settings UI. Midtrans (Snap) menyusul
karena butuh client key runtime.

## Keputusan terbuka
- Provider pertama: **Xendit** (rekomendasi) vs Midtrans.
- Master key: env vs KMS.
- Webhook: URL per-tenant vs shared + resolve.
- Nasib dana in-flight di akun platform saat masa transisi.
