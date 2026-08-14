# Bookinaja Customer App — Alur & Arsitektur (Mobile)

> Rencana teknis: menambahkan sisi **customer** ke dalam app Flutter yang sudah
> ada (`mobile/bookinaja`). Satu binary, dua peran (tenant staff &
> customer), dipisah **setelah** autentikasi.
>
> **Status implementasi:** Fase 1 (fondasi & baca) dan Fase 2 (booking & bayar
> manual) **sudah di-code & lolos `flutter analyze`**. Fase 3 (sesi live, order
> in-session, loyalty penuh) **belum** — baru tab Profil dasar yang menampilkan
> tier + poin dari akun. Detail per fase di §05.
>
> Status doc: living plan · terakhir diperbarui pada 2026-08-14 · versi visual: [artifact](https://claude.ai/code/artifact/04207355-93dd-4466-993f-74ec1f1cd476)

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
| Realtime | channel `customer:{id}:booking:{id}` dst. — backend ada, belum disambung | baru (sambung) |
| Repository | `DiscoveryRepository`, `CustomerBookingRepository`, `LoyaltyRepository` | baru |
| Layar | `DiscoverScreen`, `TenantProfileScreen` | baru |
| Layar | `CustomerBookingFlow` (mirip `create_booking.dart`, POV customer + bayar inline) | baru |
| Layar | `MyBookingsScreen`, `CustomerBookingDetailScreen`, `CustomerProfileScreen` | baru |
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

**Fase 3 — Sesi hidup & profil** 🚧 BELUM (baru profil dasar)
Sambung channel realtime `customer:*` untuk status sesi live · tambah order
F&B/addon dalam sesi · profil, poin loyalty, riwayat lengkap.

Status kode saat ini:
- ✅ **Tab Profil dasar** — `_CustomerProfileTab` di
  [customer_home_shell.dart](../mobile/bookinaja/lib/screens/customer/customer_home_shell.dart)
  menampilkan `tier` + `loyaltyPoints` dari model
  [customer_account.dart](../mobile/bookinaja/lib/models/customer_account.dart)
  (read-only, dari field akun — belum ada ledger/riwayat/redeem).
- ❌ **Realtime sesi live** — channel `customer:{id}:booking:{id}` dst. belum
  disambung di app (backend sudah gate JWT-nya). `RealtimeClient` belum dipakai
  di jalur customer.
- ❌ **Order F&B/addon dalam sesi** — belum ada; `my_bookings_screen` masih
  read-only, belum panggil `/me/bookings/:id/context` / `orders` / `addons`.
- ❌ **Riwayat & loyalty penuh** — belum ada layar riwayat (`/me/history`)
  maupun ledger poin.

Belum dibuat: `LoyaltyRepository`, layar riwayat, wiring realtime customer.

---

## Item terbuka / ditunda

- **Push notification (FCM/APNs)** — belum ada infrastruktur di backend. MVP
  numpang WhatsApp dulu.
- **Review/rating** — belum ada model data di backend (hanya field
  `testimonials` di config UI tenant, disabled). Butuh fitur backend baru bila
  mau ada rating setelah sesi. Ditunda dari fase awal.
- **Switch role dalam satu sesi** — untuk MVP: logout-login ulang bila satu
  orang perlu ganti peran. Switch-in-place nanti.

## Referensi

- Artifact visual (diagram): https://claude.ai/code/artifact/04207355-93dd-4466-993f-74ec1f1cd476
- `docs/byo-payment-gateway-plan.md` — arsitektur payment gateway per-tenant
- `docs/fnb-mode-design.md` — mode F&B (integrated/standalone/off)
- `docs/tenant-membership-implementation-plan.md` — model staff/membership tenant
