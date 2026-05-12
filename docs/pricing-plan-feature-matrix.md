# Bookinaja Pricing Plan Feature Matrix

Dokumen ini jadi acuan internal untuk menjaga konsistensi pricing, gating fitur, dan positioning value per plan.

## Prinsip utama

- Kita tidak menurunkan harga dengan plan "kosong".
- Kita menurunkan harga dengan mencabut value yang memang mahal untuk dibangun, dijaga, dan didukung.
- `Starter` dijual untuk merapikan operasional inti.
- `Pro` dijual untuk membuat tim dan operasional lebih terkontrol.
- `Scale` dijual untuk growth, repeat order, retention, dan kontrol bisnis yang lebih dalam.
- Fitur advanced seperti membership tidak boleh bocor ke plan bawah kalau positioning premium ingin tetap kuat.

## Struktur plan final

| Plan | Harga bulanan | Harga tahunan | Status komersial | Posisi |
| --- | ---: | ---: | --- | --- |
| Free Trial | Rp0 | - | Active | Trial 30 hari |
| Starter | Rp149.000 | Rp1.490.000 | Active | Entry plan |
| Pro | Rp349.000 | Rp3.490.000 | Active | Mid plan |
| Scale | Rp499.000 | Rp4.990.000 | Coming Soon | Top plan / anchor target |

## Rekomendasi harga bulanan

Harga aktif yang benar-benar dijual sekarang:

- `Free Trial` 30 hari
- `Starter` Rp149.000 / bulan
- `Pro` Rp349.000 / bulan

Harga anchor yang tetap ditampilkan untuk membentuk ekspektasi value tertinggi:

- `Scale` Rp499.000 / bulan (`Coming Soon`)

## Logika price anchoring

- `Free Trial` mengurangi friction masuk.
- `Starter -> Pro` harus terasa sebagai lompatan operasional.
- `Pro -> Scale` harus terasa dekat agar bisnis serius melihat value tertinggi sebagai arah upgrade berikutnya.
- Walau `Scale` belum aktif dijual penuh, keberadaannya tetap penting sebagai anchor premium.
- Selisih `Pro` ke `Scale` sengaja dibuat tidak terlalu jauh supaya nanti saat fitur growth siap, tenant yang sudah hampir butuh fitur itu akan cenderung naik sekalian.

## Narasi trial

### Free Trial

Untuk calon tenant yang ingin mencoba flow Bookinaja tanpa komitmen awal, sambil melihat apakah operasional harian mereka benar-benar jadi lebih rapi.

## Narasi per plan

### Starter

Untuk owner solo atau bisnis kecil yang ingin keluar dari catatan manual dan mulai operasional lebih rapi.

### Pro

Untuk bisnis yang sudah punya staff dan butuh kontrol operasional, role, dan flow pembayaran yang lebih disiplin.

### Scale

Untuk bisnis yang ingin bukan cuma rapi, tapi juga membangun repeat purchase, membership, retention, dan growth yang lebih terukur.

## Feature matrix

| Fitur | Starter | Pro | Scale |
| --- | :---: | :---: | :---: |
| Dashboard admin dasar | Yes | Yes | Yes |
| Kalender booking | Yes | Yes | Yes |
| Resource management | Yes | Yes | Yes |
| Website booking / subdomain tenant | Yes | Yes | Yes |
| Customer portal dasar | Yes | Yes | Yes |
| Detail booking customer | Yes | Yes | Yes |
| Tracking pembayaran dasar | Yes | Yes | Yes |
| Promo code dasar | Yes | Yes | Yes |
| Laporan pendapatan dasar | Yes | Yes | Yes |
| 1 akun owner | Yes | Yes | Yes |
| Multi staff account | No | Yes | Yes |
| Role-based access / permission | No | Yes | Yes |
| POS / kasir workflow penuh | No | Yes | Yes |
| Payment method management lanjutan | No | Yes | Yes |
| Manual payment verification | No | Yes | Yes |
| Import customer | No | Yes | Yes |
| Unlimited customer records | No | Yes | Yes |
| WhatsApp blast / reminder dasar | No | Yes | Yes |
| Pricing rules lebih fleksibel | No | Yes | Yes |
| CRM visibility dasar | No | Yes | Yes |
| Priority onboarding | No | Basic | High |
| Priority support | No | Basic | High |
| Membership auto-join | No | No | Yes |
| Membership enrollment per tenant | No | No | Yes |
| Loyalty / reward wallet per tenant | No | No | Yes |
| Repeat purchase reward | No | No | Yes |
| Reward redemption di checkout | No | No | Yes |
| Advanced CRM segmentation | No | No | Yes |
| Retention analytics | No | No | Yes |
| Growth / loyalty analytics | No | No | Yes |
| Multi-outlet / multi-branch readiness | No | No | Yes |
| Advanced automation controls | No | No | Yes |
| Franchise / group-level visibility | No | No | Yes |

## Fitur yang wajib dikunci di plan Scale

Fitur-fitur ini adalah premium value dan tidak boleh turun ke plan bawah:

- Membership per tenant
- Auto-join membership
- Loyalty ledger / reward ledger
- Reward `N purchase -> reward on next purchase`
- Reward redemption di checkout
- Advanced CRM segmentation
- Retention analytics
- Multi-outlet readiness
- Growth automation yang berbasis lifecycle customer

## Fitur yang menjadi pembeda utama tiap plan

### Starter dibayar untuk

- Berhenti dari pencatatan manual
- Booking lebih rapi
- Admin dan customer punya alur dasar yang jelas

### Pro dibayar untuk

- Tim bisa kerja bareng
- Akses staff lebih aman
- Flow pembayaran dan operasional lebih disiplin
- Customer base dan aktivitas mulai lebih besar

### Scale dibayar untuk

- Customer repeat lebih tinggi
- Loyalty dan membership bisa dijalankan
- Bisnis mulai siap scale
- Owner dapat visibilitas growth dan retention yang lebih jelas

## Gating produk yang direkomendasikan

### Free Trial

- Trial 30 hari
- Fokus ke pengalaman setup dan evaluasi value
- Tidak boleh terasa "kosong", tapi tidak perlu membuka semua fitur premium permanen
- Perlu diputuskan terpisah apakah trial mengikuti `Starter trial` atau `Pro trial`

### Starter

- Tidak bisa mengakses halaman membership
- Tidak bisa membuat program loyalty
- Tidak bisa mengirim blast customer
- Tidak bisa memakai multi-staff permission

### Pro

- Bisa akses operasional tim dan CRM dasar
- Tidak bisa memakai membership
- Tidak bisa memakai loyalty / reward engine
- Tidak bisa memakai fitur retention advanced

### Scale

- Semua fitur Pro
- Membership aktif
- Loyalty aktif
- Reward engine aktif
- Analitik growth dan retention aktif

## Aturan downgrade dan upgrade

### Upgrade

- Fitur premium langsung aktif sesuai entitlement plan
- Data membership atau loyalty yang sebelumnya disimpan bisa dipakai lagi

### Downgrade

- Data premium tidak dihapus
- Data hanya di-freeze
- Tenant tidak bisa earn reward baru
- Tenant tidak bisa redeem reward
- Tenant tidak bisa mengubah program membership sampai upgrade lagi

## Catatan implementasi engineering

- Backend sebaiknya cek capability, bukan hanya string plan.
- Jangan hardcode semua logic ke `plan == "scale"` di banyak tempat.
- Idealnya ada resolver entitlement, misalnya:
  - `membership_enabled`
  - `customer_blast_enabled`
  - `multi_staff_enabled`
  - `advanced_analytics_enabled`
  - `multi_outlet_enabled`

## Status keputusan saat ini

- `Free Trial`: 30 hari
- `Starter`: core booking operations only
- `Pro`: team operations and stronger admin control
- `Scale`: membership, loyalty, retention, and growth tools
- `Scale`: `Coming Soon`
- Membership per tenant: `Scale only`
- Mode membership awal: `auto join`
