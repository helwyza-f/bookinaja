# Tenant Membership Implementation Plan

Dokumen ini merangkum rencana implementasi membership per tenant di Bookinaja berdasarkan keputusan product yang sudah dibahas.

## Tujuan

Menyediakan sistem membership per tenant tanpa mengembalikan customer menjadi tenant-scoped.

Artinya:

- customer tetap platform-level
- membership menjadi relasi antara customer global dan tenant tertentu
- satu customer bisa jadi member di tenant A, non-member di tenant B, dan punya progress berbeda di tenant C

## Keputusan inti

### 1. Customer tetap global

Customer tidak dipecah lagi per tenant.

Yang dipertahankan:

- identity customer global
- login customer global
- profile customer global
- histori customer lintas tenant

Yang ditambahkan:

- status membership per tenant
- progress reward per tenant
- ledger reward per tenant

### 2. Membership adalah fitur premium

Membership tidak dibuka untuk semua plan.

Mapping plan:

- `Free Trial`: tidak jadi promise utama, bisa diputuskan kemudian apakah trial mencicipi membership atau tidak
- `Starter`: tidak ada membership
- `Pro`: tidak ada membership
- `Scale`: membership aktif

Untuk fase sekarang:

- `Scale` masih `Coming Soon`
- membership belum dijual aktif
- dokumen ini menjadi acuan implementasi sebelum `Scale` diaktifkan

### 3. Enrollment awal memakai auto join

Versi pertama membership akan memakai:

- `auto join`

Artinya:

- customer otomatis menjadi member tenant setelah event transaksi pertama yang valid atau event yang ditetapkan
- belum perlu form join kompleks
- friction awal dijaga serendah mungkin

### 4. Reward rule awal

Use case pertama:

- setiap `5` purchase eligible
- customer mendapat `1` reward
- reward dipakai pada purchase berikutnya

## Prinsip desain

### Jangan masukkan data membership ke tabel `customers`

Field seperti ini tidak boleh menjadi source of truth global:

- membership tier tenant
- membership points tenant
- reward balance tenant
- joined at tenant

Semua state tenant-specific harus ditaruh di entitas tenant membership.

### Pisahkan promo dari reward membership

Promo dan membership reward adalah dua hal yang berbeda.

Promo:

- marketing / acquisition
- biasanya code-based
- event-driven secara kampanye

Membership reward:

- retention / repeat order
- hasil akumulasi perilaku customer
- punya lifecycle sendiri

### Jangan auto-gratis di transaksi ke-5

Lebih aman:

- transaksi ke-5 menghasilkan reward
- reward disimpan
- reward dipakai di transaksi berikutnya

Alasan:

- lebih mudah di-audit
- lebih aman untuk refund / cancel / retry
- lebih mudah dijelaskan ke customer

## Scope versi 1

Versi pertama hanya fokus pada:

- membership per tenant
- auto join
- progress purchase count
- reward issue after threshold
- reward apply on next purchase
- reward tidak bisa stack dengan promo

Belum masuk:

- multi-tier membership
- reward expiry kompleks
- advanced segmentation automation
- multiple reward programs per tenant
- multi-outlet loyalty hierarchy

## Model domain

### 1. Tenant membership program

Satu tenant punya satu program membership aktif pada versi awal.

Contoh entitas:

- `tenant_membership_programs`

Kolom inti:

- `id`
- `tenant_id`
- `name`
- `status`
- `join_mode`
- `reward_mode`
- `is_active`
- `created_at`
- `updated_at`

Nilai awal:

- `join_mode = auto`
- `reward_mode = purchase_count`

### 2. Tenant customer membership

Relasi resmi customer dengan tenant.

Contoh entitas:

- `tenant_customer_memberships`

Kolom inti:

- `id`
- `tenant_id`
- `customer_id`
- `program_id`
- `membership_status`
- `joined_at`
- `approved_at`
- `enrollment_source`
- `current_tier_code` nullable
- `last_activity_at`
- `created_at`
- `updated_at`

Nilai awal yang disarankan:

- `membership_status = active`
- `enrollment_source = auto_join`

Constraint penting:

- unique `(tenant_id, customer_id)`

### 3. Membership wallet / progress

Menyimpan state cepat yang sering dibaca.

Contoh entitas:

- `tenant_membership_wallets`

Kolom inti:

- `id`
- `membership_id`
- `tenant_id`
- `customer_id`
- `eligible_purchase_count`
- `current_cycle_progress`
- `reward_credits_available`
- `reward_credits_reserved`
- `reward_credits_redeemed`
- `lifetime_eligible_purchases`
- `lifetime_reward_issued`
- `last_earned_at`
- `created_at`
- `updated_at`

### 4. Membership ledger

Semua perubahan state harus terekam di ledger.

Contoh entitas:

- `tenant_membership_ledger`

Kolom inti:

- `id`
- `membership_id`
- `tenant_id`
- `customer_id`
- `booking_id` nullable
- `sales_order_id` nullable
- `event_type`
- `quantity`
- `description`
- `metadata`
- `created_at`

Event type awal:

- `auto_joined`
- `purchase_earned`
- `reward_issued`
- `reward_reserved`
- `reward_redeemed`
- `reward_released`
- `manual_adjustment`
- `purchase_reversed`

## Reward policy versi 1

### Rule utama

- setiap `5` transaksi eligible
- issue `1` reward credit
- reward credit berlaku untuk purchase berikutnya

### Transaksi yang dianggap eligible

Rekomendasi versi awal:

- status transaksi completed
- payment status paid / settled
- bukan transaksi gratis dari reward
- bukan transaksi refunded / cancelled

### Transaksi yang tidak eligible

- booking pending
- booking cancelled
- payment gagal / belum lunas
- transaksi yang dibayar memakai reward membership

### Bentuk reward

Versi awal paling aman:

- reward menjadi `1 credit`
- credit dikonversi menjadi discount logic saat checkout

Rekomendasi pembatasan:

- reward hanya berlaku untuk resource tertentu atau plan tertentu jika tenant mengatur
- reward tidak stack dengan promo
- reward bisa diberi `max_discount_amount`

## Checkout behavior

### Sebelum checkout

Saat customer sudah teridentifikasi:

- sistem baca membership tenant
- sistem baca progress
- sistem baca reward available

### Saat reward tersedia

UI tampilkan:

- progress membership
- reward available
- toggle atau CTA untuk pakai reward

### Saat customer memakai reward

Flow backend:

1. validasi membership aktif
2. validasi reward available > 0
3. validasi transaksi eligible untuk ditebus
4. reserve reward dulu
5. create booking/order
6. setelah sukses, mark reward redeemed
7. kalau gagal, release reward

### Konflik promo dan membership

Rule versi awal:

- promo code dan membership reward tidak bisa digabung

Alasan:

- lebih mudah dijelaskan
- mengurangi abuse
- margin tenant lebih aman

## Auto join flow

Versi pertama memakai `auto join`.

### Opsi trigger

Trigger terbaik untuk versi awal:

- saat transaksi pertama customer di tenant tersebut menjadi `completed` dan `paid`

Kenapa bukan saat booking dibuat:

- booking bisa gagal, batal, atau no-show
- member yang lahir dari transaksi valid lebih bersih datanya

### Flow

1. customer menyelesaikan transaksi valid di tenant
2. sistem cek apakah tenant punya membership program aktif
3. sistem cek apakah feature gate plan mengizinkan membership
4. sistem cek apakah customer sudah punya membership di tenant ini
5. kalau belum:
   - create membership
   - create wallet
   - insert ledger `auto_joined`
6. transaksi tersebut tetap dihitung sebagai progress pertama

## Plan gating

Membership harus gated by entitlement, bukan hanya string plan yang tersebar di banyak file.

### Entitlement yang disarankan

- `membership_enabled`
- `membership_auto_join_enabled`
- `membership_reward_redeem_enabled`
- `membership_analytics_enabled`

### Mapping awal

- `starter`: semua `false`
- `pro`: semua `false`
- `scale`: semua `true`

### Downgrade behavior

Kalau tenant turun dari `Scale` ke plan bawah:

- data membership tidak dihapus
- program menjadi `suspended_by_plan`
- progress tetap disimpan
- reward tidak bisa earn baru
- reward tidak bisa redeem

### Upgrade behavior

Kalau tenant naik lagi ke `Scale`:

- membership re-enabled
- wallet dan progress lama bisa dipakai lagi

## API plan

### Admin APIs

#### Program settings

- `GET /admin/settings/membership`
- `PUT /admin/settings/membership`

Fungsi:

- lihat status program
- aktif/nonaktif
- atur threshold awal
- atur nilai reward dasar

#### Members list

- `GET /admin/memberships`
- `GET /admin/memberships/:id`

Fungsi:

- list member tenant
- lihat progress
- lihat reward balance
- lihat histori ledger

#### Adjustments

- `POST /admin/memberships/:id/adjust`

Fungsi:

- koreksi progress
- tambah / kurangi reward

### Customer APIs

#### Membership summary per tenant

- `GET /user/me/tenants/:tenant_id/membership`

Fungsi:

- status member
- progress current cycle
- reward available
- benefit summary

#### Reward preview at checkout

- `POST /public/membership/reward/preview`

Fungsi:

- validasi reward
- hitung preview discount

#### Reward apply at checkout

Masuk ke flow booking/order create.

Payload tambahan yang disarankan:

- `membership_reward_apply: true`
- atau `membership_reward_id`

## UI plan

### Admin UI

#### Lokasi

Disarankan di:

- `Settings > CRM > Membership`

Kenapa:

- membership lebih dekat ke CRM/retention daripada promo campaign

#### Halaman settings membership

Isi minimal:

- status feature
- status program
- reward rule plain language
- threshold progress
- stack rule dengan promo
- resource applicability jika dibutuhkan

#### Customer detail admin

Tambahkan section:

- membership status
- progress `x / 5`
- reward available
- recent reward activity

### Customer UI

#### Profile global

Profile utama tetap global.

Jangan tampilkan detail loyalty semua tenant secara panjang di halaman utama.

Yang cukup:

- ringkasan membership tenant
- tenant aktif dengan progress tertinggi
- CTA lihat detail

#### Membership detail per tenant

Halaman detail tenant membership menampilkan:

- status member
- progress cycle
- reward available
- benefit explanation
- recent eligible purchases
- reward history

#### Booking page

Tempat paling relevan untuk membership adalah di booking page tenant.

Tampilkan:

- status member
- progress current cycle
- reward available
- opsi pakai reward jika ada

## Copy guidance

Hindari istilah teknis seperti:

- entitlement
- ledger
- reserve
- redemption

Pakai copy yang lebih mudah:

- Member tenant ini
- Progress pembelian
- Reward tersedia
- 5 transaksi selesai = 1 reward
- Pakai reward di booking berikutnya

## Data integrity rules

### Idempotency

Issue reward harus idempotent.

Artinya:

- event transaksi yang sama tidak boleh menghasilkan reward dua kali
- gunakan dedupe key berbasis booking/order + event type

### Reversal

Kalau transaksi yang sudah dihitung ternyata dibatalkan / direfund:

- insert ledger reversal
- kurangi progress bila perlu
- kalau reward sudah dipakai, perlu policy manual atau reversal handling lanjutan

Versi awal yang paling aman:

- hanya hitung transaksi yang benar-benar final

### Auditability

Semua perubahan progress dan reward wajib lewat ledger.

Wallet hanya cache / summary state.

## Rollout plan

### Phase 0 - design alignment

- finalkan model data
- finalkan reward rule versi awal
- finalkan plan gating
- finalkan copy UX

### Phase 1 - backend foundation

- migration tables membership
- repository
- service
- ledger logic
- entitlement check

### Phase 2 - auto join + earning

- auto join saat transaksi valid pertama
- progress update
- reward issue

### Phase 3 - admin visibility

- membership settings
- member list
- member detail

### Phase 4 - customer visibility

- booking page membership state
- customer profile summary
- tenant membership detail

### Phase 5 - redeem flow

- reward preview
- reward reserve
- reward redeem
- reward release on failure

## Risiko utama

### 1. Customer global vs tenant-specific state tercampur

Solusi:

- semua state membership tenant disimpan di tabel khusus

### 2. Promo dan reward conflict

Solusi:

- non-stack rule pada versi awal

### 3. Duplicate earning

Solusi:

- ledger idempotency dan event dedupe

### 4. Downgrade plan menghilangkan data

Solusi:

- freeze, jangan delete

### 5. UI terlalu ramai

Solusi:

- profile global tetap ringkas
- detail membership dipindahkan ke context tenant

## Definition of done versi 1

Versi 1 dianggap selesai kalau:

- tenant `Scale` bisa mengaktifkan 1 program membership
- customer auto join setelah transaksi valid pertama
- progress pembelian tampil konsisten
- reward issue setelah threshold tercapai
- reward bisa dipakai di checkout berikutnya
- promo dan reward tidak stack
- admin bisa melihat member dan progress
- customer bisa melihat status member dan reward di surface yang relevan

## Keputusan saat ini

- customer tetap global
- membership per tenant
- join mode awal: `auto join`
- reward mode awal: `5 purchase -> 1 reward next purchase`
- membership hanya untuk `Scale`
- `Scale` saat ini masih `Coming Soon`
