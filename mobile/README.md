# Bookinaja Mobile App Blueprint

Dokumen ini adalah final draft blueprint untuk mobile app Bookinaja.

Tujuannya:
- mengunci arah produk mobile
- mengunci keputusan teknis utama
- menjadi acuan implementasi bertahap

Status saat ini:
- `draft final approved`
- belum masuk tahap scaffold dan implementasi screen

## Ringkasan Keputusan

Bookinaja mobile akan dibangun sebagai:
- `1 app`
- `multi-role`
- `React Native + Expo`
- `customer + admin/staff` dalam app yang sama
- subscription tenant tetap `web-first`

Artinya:
- customer dan admin tidak dibuat menjadi dua app terpisah
- pengalaman app akan berubah sesuai role dan tenant context
- mobile tidak menjadi pusat checkout subscription Bookinaja

## Kenapa Satu App

Satu app lebih masuk akal untuk Bookinaja karena:
- owner bisa juga menjadi customer
- staff dan owner sering hidup dalam tenant context yang sama
- banyak flow berbagi domain yang sama: booking, payment, realtime, customer
- satu codebase dan satu distribusi app lebih mudah dikelola pada fase produk saat ini

Yang dibedakan bukan app-nya, tapi shell dan surface-nya:
- `customer shell`
- `admin ops shell`

## Kenapa React Native + Expo

Keputusan stack:
- `React Native`
- `Expo`
- `TypeScript`

Alasan utama:
- codebase saat ini sudah sangat React-heavy
- flow customer dan admin yang ada di web sudah mudah diterjemahkan ke pola React Native
- iteration speed lebih cepat
- OTA updates cocok untuk produk yang masih sering dipoles
- kebutuhan mobile saat ini lebih condong ke operasional dan product velocity daripada custom rendering ekstrem

Catatan:
- Flutter tetap menarik untuk visual yang sangat graphic-heavy dan motion-heavy
- tapi untuk fase sekarang, React Native + Expo memberi time-to-value yang lebih cepat

## Posisi Mobile App Dalam Produk

Mobile app Bookinaja akan berfokus pada:
- booking
- payment
- live session
- promo
- admin operational companion
- realtime updates
- notifications

Yang tidak menjadi prioritas utama mobile fase awal:
- platform admin penuh
- analytics kompleks
- page builder
- discovery editorial management penuh
- tenant subscription checkout

## Subscription Strategy

Tenant subscription tetap `web-first`.

Mobile hanya akan menampilkan:
- status billing
- status subscription
- reminder
- CTA untuk buka halaman billing di web

Subscription checkout tidak dijadikan pusat pengalaman mobile dulu.

## Product Shape

### Customer Shell

Tab utama:
- `Home`
- `Jelajah`
- `Aktif`
- `Riwayat`
- `Profil`

Tujuan utama:
- memudahkan booking
- memudahkan pembayaran
- memudahkan kontrol sesi
- tetap memberi discovery tenant dan promo

### Admin Ops Shell

Tab utama:
- `Hari Ini`
- `Bookings`
- `POS`
- `Customers`
- `More`

Tujuan utama:
- menjadi companion operasional
- membantu tindakan cepat
- membantu verifikasi pembayaran
- membantu live session management

## Customer Home Strategy

Customer home di mobile tidak akan dibuat sebagai feed murni.

Struktur home:

1. `Utility layer`
- booking aktif
- upcoming booking
- pending payment
- pending verification

2. `Discovery layer`
- tenant cards
- kategori
- featured tenants
- nearby / popular / new

3. `Promo and content layer`
- promo cards
- post/konten tenant bila aktif

4. `Early-stage fallback`
- curated cards
- demo tenant
- featured listings
- jangan ada empty feed yang terasa mati

Prinsip:
- kalau user punya urusan sekarang, tampilkan itu dulu
- kalau tidak ada urusan aktif, discovery naik ke atas
- kalau tenant masih sedikit, gunakan curated fallback

## Admin Experience Strategy

Admin mobile tidak akan menjadi mini desktop dashboard.

Admin mobile harus menjadi:
- ringkas
- taktikal
- realtime
- cepat
- jelas

Fokus utama:
- booking queue
- booking detail controller
- payment verification queue
- POS quick actions
- customer lookup

## Technical Stack

Rencana stack:
- `Expo`
- `React Native`
- `TypeScript`
- `expo-router`
- `TanStack Query`
- `Zustand`
- `react-hook-form`
- `expo-secure-store`
- native `WebSocket manager`
- `FlashList`

## App Architecture

Struktur besar:

```text
mobile/
  app/
    _layout.tsx
    index.tsx
    (auth)/
    (customer)/
    (admin)/
    modal/
  src/
    components/
    features/
      auth/
      tenant/
      booking/
      payment/
      live-session/
      promo/
      notifications/
      admin-bookings/
      admin-pos/
      customers/
      billing/
    lib/
      api/
      realtime/
      session/
      permissions/
      utils/
    stores/
    theme/
    types/
    constants/
```

Prinsip arsitektur:
- `app/` hanya untuk route entry dan shell
- `features/` untuk domain logic
- `lib/` untuk infrastruktur bersama
- `stores/` untuk app/session state ringan
- `theme/` sebagai single source of truth visual system

## Role-Based Navigation

Flow bootstrap:

1. restore session
2. resolve tenant context
3. fetch user profile / me
4. tentukan shell aktif

Kemungkinan shell:
- `customer shell`
- `admin shell`

Jika user punya lebih dari satu akses:
- tampilkan role/context switcher
- jangan paksa 2 app atau 2 login flow yang sepenuhnya terpisah

## Screen List

### Customer Screens

- Splash
- Login
- Register
- Verify OTP
- Home
- Jelajah tenant
- Tenant detail
- Resource list
- Resource detail
- Booking form
- Promo apply
- Booking summary
- Payment
- Manual payment proof upload
- Booking live
- Extend session
- F&B order
- Add-on order
- Active bookings
- History
- Booking detail
- Profile
- Settings

### Admin Screens

- Admin login
- Today board
- Bookings list
- Booking detail controller
- Booking payment page
- Pending verification queue
- POS active sessions
- POS session detail
- Customer list
- Customer detail lite
- Billing status
- Settings lite

## Shared Modules

Module bersama yang dipakai lintas role:

- `auth`
- `tenant-context`
- `api-client`
- `realtime`
- `booking-core`
- `payment-core`
- `promo-core`
- `permissions`
- `notifications`
- `theme`

Tujuan:
- mengurangi duplikasi
- menjaga rule bisnis tetap konsisten
- menjaga mapping status dan payment logic tidak bercabang liar

## State Management Strategy

### 1. Server State: TanStack Query

Dipakai untuk:
- profile
- booking detail
- booking list
- history
- payment methods
- promo preview
- admin queue
- customer list

Prinsip:
- sebagian besar data Bookinaja adalah server state
- query cache adalah tulang punggung utama

### 2. App Shell State: Zustand

Dipakai untuk:
- auth session
- active role shell
- tenant context
- small cross-screen UI state
- realtime connection meta

Jangan digunakan untuk:
- semua fetched data
- semua booking data
- semua form state

### 3. Screen State

Dipakai untuk:
- form state
- modal/sheet state
- upload state
- selected method
- temporary filter/search

Menggunakan:
- `useState`
- `react-hook-form`

## Performance Optimization Strategy

### Cache Strategy
- data aktif punya `staleTime` pendek
- data histori/profil punya `staleTime` lebih panjang
- refetch hanya saat dibutuhkan
- invalidation harus presisi

### Realtime Strategy
- subscribe hanya pada channel yang relevan
- patch query cache yang relevan
- optional targeted refetch
- jangan buat websocket meng-update seluruh tree

### List Strategy
- gunakan `FlashList` untuk list besar
- gunakan pagination / infinite scroll
- hindari render banyak card sekaligus

### Media Strategy
- compress image sebelum upload
- cache remote images
- preview seperlunya
- hindari render full-resolution tanpa perlu

### Boot Strategy
- restore session dulu
- tentukan shell dulu
- fetch data awal seperlunya
- connect realtime setelah screen siap

## Theming Strategy

Theming harus terpusat di satu tempat.

Struktur:

```text
mobile/src/theme/
  index.ts
  tokens.ts
  colors.ts
  typography.ts
  spacing.ts
  radius.ts
  shadows.ts
  components.ts
  theme-provider.tsx
  use-theme.ts
```

Prinsip:
- tidak hardcode warna semaunya di screen
- semua pakai token
- light/dark mode berasal dari satu source of truth
- visual direction mengikuti keluarga brand di repo sekarang

Tujuan:
- kalau mau ganti theme, cukup ubah di satu tempat

## Auth and Session Strategy

Mobile tidak akan menyalin model cookie web apa adanya.

Strategi mobile:
- bearer token
- secure storage
- tenant context explicit
- logout dan tenant mismatch ditangani native-friendly

## Google Auth Setup Notes

Google login Android di Bookinaja sekarang memakai native SDK, bukan browser redirect.

Konfigurasi yang harus selalu cocok:
- Android package name: `com.bookinaja.mobile`
- Native Android client ID untuk app: `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- Web client ID untuk backend token verification dan native sign-in handshake: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- Backend verifier audiences:
  - `GOOGLE_CLIENT_ID_WEB`
  - `GOOGLE_CLIENT_ID_IOS`
  - `GOOGLE_CLIENT_ID_ANDROID`

Debug SHA-1 laptop Windows saat ini:
- `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

Debug SHA-256 laptop Windows saat ini:
- `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C`

Checklist saat menambah machine baru atau release signing:
1. Ambil SHA-1 dan SHA-256 dari keystore yang benar.
2. Daftarkan fingerprint itu ke Android OAuth client atau Firebase project yang dipakai.
3. Pastikan client ID Android milik package `com.bookinaja.mobile`, bukan package lain.
4. Bedakan debug keystore lokal dan release keystore produksi; keduanya butuh fingerprint sendiri.
5. Kalau Google login sukses di akun Google tetapi backend menolak token, cek variabel `GOOGLE_CLIENT_ID_*` di backend terlebih dahulu.

## Payment Strategy

Booking payment di mobile tetap mengikuti sistem produk sekarang:
- Midtrans
- manual transfer
- QRIS static
- cash/manual verify

Ini bukan in-app purchase.

In-app purchase tidak dipakai untuk:
- booking payment
- DP
- pelunasan

## Promo and Deposit Rules

Mobile harus mengikuti backend sebagai source of truth.

Rule penting:
- promo `locked` atau `floating`
- DP adalah snapshot awal
- floating promo boleh memengaruhi `balance_due`
- DP tidak ikut berubah setelah booking terbentuk
- UI mobile tidak boleh hardcode kalkulasi yang bertentangan dengan backend

## Realtime Channels

Mobile akan mengikuti pola channel yang sudah ada:
- `customer:{customerId}:booking:{bookingId}`
- `tenant:{tenantId}:booking:{bookingId}`
- `tenant:{tenantId}:dashboard`

Pemakaian:
- customer live booking
- admin booking detail
- admin queue
- status pembayaran

## Notifications

### Customer
- booking confirmed
- DP verified
- session about to start
- session active
- payment verified/rejected
- session completed

### Admin
- booking baru
- manual payment pending
- session about to start
- critical operational alert

## Delivery Phases

### Phase 1: Foundation
- scaffold `mobile/`
- setup Expo
- setup routing
- setup theme system
- setup auth/session
- setup API client
- setup query provider
- setup realtime manager skeleton

### Phase 2: Customer Core
- login/register/verify
- home/jelajah
- booking create
- promo apply
- payment
- booking detail
- active/live
- history/profile

### Phase 3: Customer Realtime and Polish
- live updates
- upload proof
- push notifications
- deep links booking/payment

### Phase 4: Admin Ops Core
- admin login
- today board
- bookings list
- booking detail controller
- payment verification queue
- payment page
- POS quick actions
- customers lite

### Phase 5: Hardening
- offline resilience ringan
- analytics/events
- observability
- release readiness

## Definition of Success

Blueprint ini dianggap sukses bila implementasi mobile nanti menghasilkan:
- satu app yang jelas untuk multi-role
- customer flow yang cepat dan modern
- admin flow yang operasional dan ringkas
- realtime yang stabil
- payment flow yang konsisten dengan backend
- theme system yang terpusat
- architecture yang scalable tanpa cepat kusut

## Next Step

Setelah README ini, implementasi dimulai bertahap:

1. scaffold workspace `mobile/`
2. setup theme system
3. setup role-based router shell
4. setup auth + session + API layer
5. masuk ke customer core screens
