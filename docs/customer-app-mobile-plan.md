# Bookinaja Customer App — Alur & Arsitektur (Mobile)

> Rencana teknis: menambahkan sisi **customer** ke dalam app Flutter yang sudah
> ada (`mobile/bookinaja`). Satu binary, dua peran (tenant staff &
> customer), dipisah **setelah** autentikasi.
>
> **Status implementasi:** Fase 1 (fondasi & baca), Fase 2 (booking & bayar
> manual), dan Fase 3 (sesi live & profil) **selesai secara fungsional** —
> realtime `customer:*` tersambung, sesi live + order in-session, detail
> booking/order, riwayat (`/me/history`), dan account management (edit profil,
> ganti password, ganti WA/OTP, hapus akun) sudah di-code. **Loyalty penuh
> (ledger poin + redeem) DIPINDAH ke backlog "ditunda"**, bukan lagi sisa Fase 3:
> loop inti sudah jalan (poin accrue + tier naik otomatis di backend, tampil
> read-only di profil), dan redeem tidak bisa dibangun sebelum ada keputusan
> bisnis "poin ditukar jadi apa" + endpoint spend di backend (belum ada). Detail
> per fase di §05, rasional di §Item terbuka.
>
> Status doc: living plan · terakhir diperbarui pada 2026-08-15 · versi visual: [artifact](https://claude.ai/code/artifact/76ba7f51-e2d8-473f-9e38-e0cf3475997c)

## Ringkasan keputusan

- **Satu app, bukan dua.** Sisi customer masuk ke binary Flutter yang sama
  (`mobile/bookinaja`). Yang di-tuning utamanya auth; jalur staff yang
  sudah ada (`HomeShell`) tidak diubah.
- **Nama consumer-first.** Package Dart `bookinaja` (bukan lagi
  `bookinaja_admin`), `applicationId`/`namespace` `id.bookinaja.app`, display
  name "Bookinaja". Karena volume utama adalah customer, identitas app tidak
  boleh terbaca "admin". Nama staff tetap muncul hanya sebagai link kecil di
  Landing, bukan brand app-nya.
- **Model marketplace.** Satu app untuk semua tenant. Customer cari/pilih tenant
  di dalam app (mirip Gojek/Fore), bukan white-label per tenant.
- **Role split setelah login.** `AuthController` menyimpan `role`
  (`tenantStaff` | `customer`) bersama token. `AuthGate` di `main.dart`
  bercabang berdasarkan role.
- **Landing default ke customer.** Volume customer jauh lebih besar dari staff;
  jalur staff hanya link kecil "Masuk sebagai tenant staff".
- **Satu nomor HP = satu peran.** Registrasi/OTP customer ditolak bila nomor
  sama dengan `tenants.whatsapp_number` tenant manapun. Nomor bisnis untuk
  tenant, tidak boleh dipakai bikin akun customer.

## Kenapa backend hampir tidak perlu berubah

Backend sudah punya seluruh permukaan API customer, terpisah dari staff:

- **Auth customer** (`backend/internal/customer/`) — OTP WhatsApp
  (`POST /public/customer/login` → `verify`), email+password
  (`CustomerLoginEmail`), Google OAuth. Model akun `customers` terpisah dari
  `accounts` (staff), dibedakan lewat JWT claim `customer_id` vs `account_id`
  (`backend/internal/middleware/auth.go`).
- **Booking guest & customer** — `POST /public/bookings`,
  `/public/bookings/exchange`, `/guest/availability/:resource_id`, dan grup
  `/me/bookings/*` (aktif, cancel, extend, order, addon, upload bukti).
- **Payment gateway BYO** — `GET /public/payment-gateway/:tenantId` sudah
  per-tenant (Midtrans Snap / Xendit pakai kredensial tenant sendiri). Lihat
  `docs/byo-payment-gateway-plan.md`.
- **Profil, loyalty, discovery** — `/me`, `/me/history`, `GetPoints`/`GetHistory`,
  `GET /public/tenants`, `/discover/feed`.
- **Realtime customer-scoped** — channel `customer:{customerID}:booking:{bookingID}`,
  `customer:{customerID}:bookings`, `customer:{customerID}:orders`,
  `customer:{customerID}:order:{orderID}` **sudah didefinisikan & di-gate JWT**
  (`backend/internal/platform/realtime/hub.go` `validateChannel`), tapi belum
  dipakai app manapun.

Satu-satunya penambahan backend yang benar-benar baru adalah **validasi nomor HP**
(lihat bagian bawah).

---

## 01 — Boot & role split

Splash screen hanya satu, tapi ujungnya menentukan dua dunia. `AuthGate`
memutuskan tiga jalur:

1. **Tanpa token** → Landing (default tab Customer, link kecil ke Staff).
2. **Token & role valid** → langsung lompat ke shell sesuai role.
3. Landing memisahkan **Auth Customer** vs **Auth Staff**.

```
Splash Screen
    │
    ▼
AuthGate ──(token & role valid)──┐
    │ (tidak ada token)          │ lompat langsung
    ▼                            │
Landing                          │
 ├─ default ───► Auth Customer   │   Auth Staff ◄─── link kecil
 │              (OTP WA/Email/    │  (Email+Password)
 │               Google)         │        │
 │              + cek nomor ≠     │        ▼
 │              WA bisnis tenant  │  Pilih Workspace
 │                    │          │        │
 │                    ▼          ▼        ▼
 │            CustomerHomeShell      HomeShell (existing, tak berubah)
 │           (Discover · Booking      (Dashboard · Booking · Ops · More)
 │            Saya · Profil)
```

Perubahan konkret:

- `AuthController` — tambah field `role` + method login customer
  (OTP/email/Google), terpisah dari `staffLogin` yang sudah ada.
- `_AuthGate` di `main.dart` — tambah satu cabang berdasarkan role, di atas
  cabang booting/login/workspace/`HomeShell` yang sekarang.
- `CustomerHomeShell` baru: tab `Discover · Booking Saya · Profil`.

---

## 02 — Alur customer end-to-end

Booking bisa dimulai sebagai **guest** — customer belum wajib login sampai mau
bayar. Titik penting: penggabungan booking guest ke akun saat login, dan jalur
pintas kalau customer sudah login dari awal.

| Langkah | Aksi | API |
|---|---|---|
| 1. Discovery | Cari/browse tenant (tanpa login) | `GET /public/tenants`, `/discover/feed` |
| 2. Profil tenant | Lihat resource, paket, harga, foto | `/public/site`, `/public/profile`, `/public/landing` |
| 3. Draft booking | Cek slot → pilih paket/durasi → addon → promo → submit (guest) | `GET /guest/availability/:resource_id`, `POST /public/promos/preview`, `POST /public/bookings` |
| 4. Auth customer | OTP WA / email / Google — **+ validasi nomor ≠ WA bisnis tenant** | `/public/customer/login` → `verify` |
| 5. Gabung ke akun | Booking guest di-exchange ke `customer_id` | `POST /public/bookings/exchange` |
| 6. Bayar | DP atau lunas — Snap BYO per-tenant / transfer manual + bukti | `GET /public/payment-gateway/:tenantId` |
| 7. Confirmed | Muncul di `/me/active`, menunggu jadwal | `GET /me/active` |
| 8. Sesi aktif | Live snapshot + tambah order F&B/addon dalam sesi | `GET /me/bookings/:id/context`, `POST /me/bookings/:id/orders`, `/addons` |
| 9. Selesai/riwayat | Pindah ke riwayat | `GET /me/history` |

**Jalur pintas (sudah login):** dari profil tenant langsung ke pembayaran,
melewati draft-guest & penggabungan akun.

**Reminder:** H-1/H-jam pakai WhatsApp (Fonnte sudah jalan). Push notification
(FCM/APNs) **belum ada** di backend — item terpisah untuk nanti.

---

## 03 — Lifecycle status booking

State machine sudah aktif di backend (`validateBookingTransition` di
`backend/internal/reservation/service.go`). App customer hanya **menampilkan**
status yang sama, tidak menciptakan aturan baru.

```
        reschedule (loop)      reschedule (loop)
          ↺                      ↺
       pending ──dp/pelunasan──► confirmed ──admin mulai sesi──► active ──selesai──► completed
          │      terverifikasi      │                             │
          │ batal                   │ batal                       │
          ▼                         ▼                             │
      cancelled ◄───────────────────┘                             │
                                    │                             │
                          admin tandai no-show ◄──────────────────┘
                          (syarat: waktu mulai sudah lewat)
                                    ▼
                                 no_show
```

- **Loop `reschedule`** di `pending` & `confirmed` — status **tidak** berubah,
  hanya jadwal + `reschedule_count`. (Backend: migration `000063`,
  `RescheduleBooking`.)
- **`no_show`** bergerbang syarat waktu (jadwal mulai sudah lewat), bukan
  transisi bebas. Hanya dari `confirmed`/`active`.

---

## 04 — Yang perlu dibangun

| Lapisan | Komponen | Status |
|---|---|---|
| Infrastruktur | `ApiClient`, `TokenStore`, `RealtimeClient`, tema `BK` | **pakai ulang** |
| State | `AuthController` — tambah field role & login OTP/email/Google | diperluas |
| Realtime | channel `customer:{id}:booking:{id}` dst. — backend ada, belum disambung | ✅ tersambung (05f5526f) |
| Repository | `DiscoveryRepository`, `CustomerBookingRepository` | ✅ selesai |
| Repository | `LoyaltyRepository` (ledger + redeem) | ⏸️ ditunda (backlog) |
| Layar | `DiscoverScreen`, `TenantProfileScreen` | ✅ selesai |
| Layar | `CustomerBookingFlow` (mirip `create_booking.dart`, POV customer + bayar inline) | ✅ selesai |
| Layar | `MyBookingsScreen`, `CustomerBookingDetailScreen`, `CustomerOrderDetailScreen`, `CustomerAccountScreen` | ✅ selesai |
| Backend | validasi nomor HP: tolak registrasi customer bila nomor = `tenants.whatsapp_number` tenant manapun | baru (kecil) |

### Validasi nomor HP (backend)

Fakta database saat ini:

- Tabel `accounts` (staff) **tidak punya kolom phone** — staff login pakai
  email/password/Google. Tidak ada risiko tabrakan di sisi staff.
- Tabel `customers` sudah punya **unique index global** di kolom `phone`
  (`migrations/000008_platform_customers.up.sql`) — satu nomor = satu customer,
  otomatis terjamin.
- Nomor "HP bisnis" = field `whatsapp_number` di tabel `tenants`
  (`backend/internal/tenant/model.go`), dipajang di profil publik & dipakai
  kirim notifikasi. **Belum ada validasi** terhadap `customers.phone`.

Fix (penambahan validasi kecil, tanpa ubah skema):

1. Di `customer/service.go` — `Register`/`StartRegistration` (idealnya juga
   `RequestOTP` supaya ditolak sebelum OTP terkirim): tolak bila
   `SELECT 1 FROM tenants WHERE whatsapp_number = $1` ketemu. Pesan jelas:
   "Nomor ini terdaftar sebagai nomor bisnis, tidak bisa dipakai untuk akun
   customer."
2. Konsistensi dua arah: di flow registrasi tenant (`RegisterReq` di
   `tenant/model.go`), tolak bila nomor sudah ada di `customers.phone`.

---

## 05 — Urutan fase

Tiga fase, masing-masing bisa dites & dirilis terpisah.

**Fase 1 — Fondasi & baca** ✅ SELESAI (Google login ditunda)
Validasi nomor HP di backend · AuthGate role split · Landing · Auth customer
(OTP/Email) · Discovery & profil tenant · `MyBookingsScreen` baca-saja.

Berkas yang dibuat/diubah:
- Backend: `customer/service.go` + `repository.go` (`PhoneIsTenantBusinessNumber`,
  `localizePhone`, `ensurePhoneNotTenantBusiness` di RequestOTP/Register/StartRegistration);
  `tenant/service.go` + `repository.go` (`PhoneUsedByCustomer`, cek di Register).
- Mobile models: `customer_account.dart`, `discovery.dart`, `customer_booking.dart`.
- Mobile repos: `customer_auth_repository.dart`, `discovery_repository.dart`,
  `customer_booking_repository.dart`.
- Mobile state: `auth_controller.dart` (role split + login customer),
  `discovery_controller.dart`, `my_bookings_controller.dart`,
  `token_store.dart` (role-aware).
- Mobile screens: `landing_screen.dart`, `customer/customer_auth_screen.dart`
  (OTP+email+register), `customer/customer_home_shell.dart`,
  `customer/discover_screen.dart`, `customer/tenant_profile_screen.dart`,
  `customer/my_bookings_screen.dart`; `main.dart` `_AuthGate` role branch.
- Ditunda: **Login Google customer** (butuh plugin `google_sign_in` + config
  native OAuth). OTP WhatsApp jadi jalur utama.
- Placeholder Fase 2: tombol "Booking" di profil tenant & detail booking masih
  menampilkan toast "segera hadir".

**Fase 2 — Booking & bayar** ✅ SELESAI (Snap otomatis ditunda → manual only)

Berkas Fase 2 (2b + 2c):
- Repos: `customer_reservation_repository.dart` (availability/promo/create),
  `customer_payment_repository.dart` (info/upload-proof/manual-payment).
- State: `customer_booking_controller.dart` (slot/durasi/promo, 1 resource).
- Models: `discovery.dart` (dipakai ulang), `customer_payment.dart`.
- Screens: `customer/customer_booking_flow.dart` (paket→tanggal→slot→durasi→
  promo→buat), `customer/customer_payment_screen.dart` (metode manual,
  instruksi bank/QR, upload bukti via image_picker, kirim untuk verifikasi).
- Wiring: tombol "Booking" di profil tenant → flow → sukses → layar pembayaran.
- **Penyederhanaan**: customer di app selalu login saat booking, jadi TIDAK
  pakai alur guest→exchange (itu khusus deep-link web). Nama/nomor dari akun.
- **Ditunda**: pembayaran otomatis Snap/midtrans (butuh url_launcher/webview);
  default manual sesuai arah BYO. Interday booking (mobile hanya paket jam/sesi).
`CustomerBookingFlow` penuh (guest & sudah-login) · penggabungan booking guest
ke akun · pembayaran Snap BYO + manual/bukti transfer.

Survei endpoint (2a — selesai):
- **Tenant di-resolve via `?slug=`** — `TenantIdentifier` global dukung query
  `slug` ([middleware/tenant.go:26](backend/internal/middleware/tenant.go)),
  jadi `POST /public/bookings?slug=<slug>` cukup tanpa mutasi ApiClient.
- **Buat booking**: `POST /public/bookings?slug=X`
  `{resource_id, customer_name, customer_phone, item_ids[], start_time(ISO),
  duration(min 1), promo_code, booking_mode}` →
  `{booking_id, booking(+access_token), customer, redirect_url}`.
- **Gabung akun (guest→login)**: `POST /public/bookings/exchange {code: access_token}`
  → `{customer_token, customer, booking_id}`.
- **Availability**: `GET /guest/availability/:resource_id?date=YYYY-MM-DD`
  → `{busy_slots:[...]}`.
- **Promo**: `POST /public/promos/preview` (butuh `tenant_id`).
- **Pembayaran** (dari halaman web payment yang sudah jalan):
  - Detail: `GET /user/me/bookings/:id` → `payment_methods[]`,
    `deposit_amount`, `payment_status`, `tenant_id`, `status`.
  - Gateway config: `GET /public/payment-gateway/:tenant_id` →
    `{data:{configured, provider, client_key}}`.
  - **Auto (Snap/midtrans)**: `POST /public/bookings/:id/checkout?mode=dp|settlement&method=<code>`
    → `{snap_token, redirect_url}`. **Di mobile: buka `redirect_url`
    (halaman Snap ter-host) di browser** — bukan JS SDK. Perlu `url_launcher`.
  - **Manual (bank_transfer/qris_static)**: upload bukti
    `POST /user/me/bookings/:id/upload-proof` (multipart) → `{url}`, lalu
    `POST /user/me/bookings/:id/manual-payment {booking_id, scope, method,
    note, proof_url}`.
  - `scope`: `deposit` (DP) | `settlement` (pelunasan).

Reuse dari app admin: model `BusySlot` ([models/catalog.dart:73]),
`CreateBookingController` sebagai referensi logika slot/durasi/promo (tapi
endpoint diarahkan ke `/public/*`).

**Fase 3 — Sesi hidup & profil** ✅ SELESAI FUNGSIONAL (loyalty penuh → backlog)
Sambung channel realtime `customer:*` untuk status sesi live · tambah order
F&B/addon dalam sesi · profil, poin loyalty, riwayat lengkap.

Status kode saat ini (per commit 05f5526f):
- ✅ **Realtime sesi live** — `RealtimeClient` kini token-only, sesi customer
  subscribe channel `customer:*` tanpa slug
  ([realtime_client.dart](../mobile/bookinaja/lib/realtime/realtime_client.dart)).
  Detail booking/order auto-update via channel + silent refresh.
- ✅ **Sesi live penuh** — activate, countdown ticking, extend slot-aware,
  complete, plus order F&B/addon dalam sesi
  ([customer_booking_detail_screen.dart](../mobile/bookinaja/lib/screens/customer/customer_booking_detail_screen.dart)).
- ✅ **Detail order F&B/direct-sale** —
  [customer_order_detail_screen.dart](../mobile/bookinaja/lib/screens/customer/customer_order_detail_screen.dart)
  (item, total, riwayat bayar, realtime, manual payment).
- ✅ **Riwayat** — `GET /user/me/history` di
  [customer_booking_repository.dart](../mobile/bookinaja/lib/repositories/customer_booking_repository.dart),
  tampil di tab "Riwayat"
  [my_bookings_screen.dart](../mobile/bookinaja/lib/screens/customer/my_bookings_screen.dart)
  yang kini auto-update over realtime.
- ✅ **Account management** (di luar rencana awal) —
  [customer_account_screen.dart](../mobile/bookinaja/lib/screens/customer/customer_account_screen.dart):
  edit profil, ganti password, ganti nomor WA via OTP, dan hapus akun
  self-service (`DELETE /user/me`, type-to-confirm).
- ⏸️ **Loyalty penuh → dipindah ke backlog "ditunda"** (lihat §Item terbuka).
  Profil masih read-only `tier` + `loyaltyPoints` dari field akun. Loop inti
  sudah jalan otomatis di backend; UI ledger + redeem menunggu keputusan bisnis
  & endpoint spend.

---

## Item terbuka / ditunda

- **Loyalty penuh (ledger poin + redeem)** — ditunda, bukan blocker MVP.
  - **Sudah jalan (otomatis, tanpa kerjaan tambahan):** poin accrue tiap booking
    lunas — `AwardBookingPoints` dipanggil dari
    [reservation/service.go:1070](../backend/internal/reservation/service.go),
    rate 1 poin per Rp10.000 (`pointRupiahDivisor` di
    [customer/service.go](../backend/internal/customer/service.go)); tier naik
    otomatis (`NEW→REGULAR→GOLD→VIP`); ledger tercatat per event; profil app
    tampilkan `tier` + total poin read-only.
  - **Kenapa ditunda:** (1) **Redeem belum ada di backend** — tidak ada endpoint
    spend/deduct poin, jadi UI redeem di mobile = tombol mati. (2) Butuh
    **keputusan bisnis dulu**: poin ditukar jadi apa (diskon / voucher / free
    session)? (3) Endpoint `GetPoints` ledger baru di-route ke admin CRM
    (`/customers/:id/points`), belum ada self-service `/me/points`.
  - **Kalau dibuka lagi, urutannya:** backend dulu (`/me/points` untuk ledger +
    endpoint redeem/spend sesuai mekanik yang diputuskan) → baru mobile
    (`LoyaltyRepository`, layar ledger + redeem).
- **Push notification (FCM/APNs)** — belum ada infrastruktur di backend. MVP
  numpang WhatsApp dulu.
- **Review/rating** — belum ada model data di backend (hanya field
  `testimonials` di config UI tenant, disabled). Butuh fitur backend baru bila
  mau ada rating setelah sesi. Ditunda dari fase awal.
- **Switch role dalam satu sesi** — untuk MVP: logout-login ulang bila satu
  orang perlu ganti peran. Switch-in-place nanti.

## Referensi

- Artifact visual (diagram): https://claude.ai/code/artifact/76ba7f51-e2d8-473f-9e38-e0cf3475997c
- `docs/byo-payment-gateway-plan.md` — arsitektur payment gateway per-tenant
- `docs/fnb-mode-design.md` — mode F&B (integrated/standalone/off)
- `docs/tenant-membership-implementation-plan.md` — model staff/membership tenant
