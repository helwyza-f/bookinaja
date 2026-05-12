# Bookinaja Starter & Pro Readiness Checklist

Dokumen ini dipakai untuk mengunci apa yang harus benar-benar siap sebelum `Starter` dan `Pro` dijual dengan percaya diri.

Tujuannya bukan hanya memastikan fitur "ada", tapi memastikan:

- value proposition jelas
- behavior produk konsisten
- billing sinkron
- gating plan sinkron
- UI tidak menyesatkan
- sales tidak overpromise

## Struktur komersial saat ini

- `Free Trial`: 30 hari
- `Starter`: Rp149.000 / bulan
- `Pro`: Rp349.000 / bulan
- `Scale`: Rp499.000 / bulan (`Coming Soon`)

Konsekuensinya:

- fokus readiness aktif ada di `Starter` dan `Pro`
- `Scale` tetap boleh muncul di pricing sebagai anchor premium
- `Scale` tidak boleh dijual seolah fully available

## Definisi status

- `Ready`: sudah ada, usable, dan bisa dijanjikan ke customer
- `Partial`: fondasi ada, tapi masih perlu sinkronisasi, hardening, atau cleanup
- `Not Ready`: belum layak jadi promise plan

## Fokus fase ini

- `Free Trial` harus selaras dengan onboarding dan evaluasi value
- `Starter` harus 100% siap untuk core booking operations
- `Pro` harus 100% siap untuk team operations dan stronger admin control
- `Scale` tidak masuk scope readiness fase ini

---

## Starter readiness

### Value promise Starter

Starter dijual untuk tenant yang ingin:

- berhenti dari catatan manual
- menerima booking dengan flow yang lebih rapi
- punya portal customer dasar
- punya dashboard admin dasar
- mulai tracking pembayaran dan histori dengan lebih jelas

### Checklist Starter

| Area | Item | Status | Catatan |
| --- | --- | --- | --- |
| Booking core | Public booking flow tenant berjalan | Ready | Web booking flow sudah ada |
| Booking core | Resource booking detail + item selection | Ready | Sudah tersedia di web/mobile |
| Booking core | Booking creation dari public flow | Ready | Endpoint dan flow sudah ada |
| Booking core | Booking detail customer | Ready | Web/mobile customer sudah punya detail |
| Booking core | Booking status lifecycle dasar | Ready | Confirm/pending/active/completed sudah ada |
| Customer | Customer global login/register OTP | Ready | Sudah ada OTP flow |
| Customer | Email/password login | Ready | Sudah ada |
| Customer | Google login/claim | Ready | Sudah ada |
| Customer | Customer portal summary | Ready | Web/mobile sudah punya home/summary |
| Customer | Active booking list | Ready | Sudah ada |
| Customer | History booking list | Ready | Sudah ada |
| Payment | Booking payment checkout dasar | Ready | Sudah ada |
| Payment | DP vs pelunasan dasar | Ready | Sudah ada logic dasar |
| Payment | Manual payment upload customer | Ready | Sudah ada |
| Payment | Manual payment verification admin | Partial | Ada, tapi perlu packaging plan yang jelas |
| Payment | Payment methods tenant | Partial | Sudah ada setting, perlu pastikan Starter boleh subset apa |
| Promo | Promo preview customer | Ready | Sudah ada |
| Promo | Promo redemption dasar | Ready | Sudah ada engine promo |
| Admin | Dashboard admin dasar | Partial | Ada fondasi, perlu pastikan claim marketing tidak berlebihan |
| Admin | Resource management | Ready | Sudah ada |
| Admin | Customer lookup dasar | Ready | Sudah ada |
| Admin | Basic reporting | Partial | Ada analytics summary, perlu definisi batas "basic report" |
| Realtime | Customer booking realtime | Ready | Sudah ada |
| Realtime | Tenant booking realtime | Ready | Sudah ada |
| Website | Tenant public booking page | Ready | Sudah ada |
| Website | Tenant page builder / landing | Partial | Ada, tapi jangan jadi promise utama Starter kalau belum stabil |
| Billing | Billing backend support Starter | Ready | Sudah ada |
| Pricing | Marketing pricing copy sinkron dengan reality | Partial | Perlu finalisasi copy |
| Gating | Starter-only entitlement rules | Not Ready | Belum ada resolver entitlement yang rapi |

### Gap utama Starter

- Definisi "basic reporting" harus dipersempit supaya sales tidak overclaim
- Payment methods yang benar-benar termasuk Starter harus diputuskan
- Entitlement / feature gate Starter belum sistematis
- Pricing page masih harus disinkronkan dengan capability yang benar-benar dijual

---

## Pro readiness

### Value promise Pro

Pro dijual untuk tenant yang ingin:

- punya staff dan akses berbasis role
- operasional kasir / POS lebih rapi
- payment flow lebih disiplin
- customer ops lebih kuat
- admin control lebih aman

### Checklist Pro

| Area | Item | Status | Catatan |
| --- | --- | --- | --- |
| Staff | Multi staff accounts | Ready | Sudah ada CRUD staff |
| Staff | Staff roles | Ready | Sudah ada CRUD role |
| Staff | Permission model | Ready | Permission granular sudah ada |
| Staff | Permission enforcement di route | Ready | Sudah dipakai luas di router |
| Booking ops | Manual booking dari admin | Ready | Sudah ada |
| Booking ops | Session start/extend/complete | Ready | Sudah ada |
| POS | POS action feed | Partial | Ada fondasi backend, pastikan UX utamanya matang |
| POS | Add order ke booking | Ready | Sudah ada |
| POS | Add addon item | Ready | Sudah ada |
| POS | Sales order flow | Ready | Sudah ada backend route |
| POS | Cash settle flow | Ready | Sudah ada |
| POS | Mobile admin POS | Partial | Mobile masih lebih ke quick action / belum penuh |
| Payment | Manual payment verification | Ready | Ada untuk booking dan sales order |
| Payment | Payment method management | Ready | Sudah ada settings tenant |
| Payment | Deposit settings | Ready | Sudah ada settings tenant |
| Customer ops | Customer import | Ready | Sudah ada, bahkan sudah gated pro active |
| Customer ops | Customer blast | Ready | Sudah ada, gated pro active |
| Customer ops | Customer detail/history | Ready | Sudah ada |
| Customer ops | Customer points view global | Ready | Sudah ada, walau belum tenant membership |
| Analytics | Analytics summary | Partial | Ada, tapi definisi "full analytics" jangan terlalu tinggi |
| Analytics | Revenue/ops visibility | Partial | Ada sebagian, perlu audit mana yang layak dijual di Pro |
| Promo | Full promo CRUD | Ready | Sudah ada |
| Promo | Promo redemptions visibility | Ready | Sudah ada |
| Realtime | Tenant dashboard realtime | Ready | Sudah ada |
| Admin settings | Receipt settings | Ready | Sudah ada |
| Admin settings | Referral payout settings | Ready | Sudah ada |
| Admin settings | Growth/discovery settings | Partial | Ada, tapi lebih cocok bonus value daripada core Pro promise |
| Billing | Billing backend support Pro | Ready | Sudah ada |
| Pricing | Pro packaging di pricing page | Partial | Perlu revisi supaya sesuai product reality |
| Gating | Pro-only entitlement rules | Partial | Beberapa fitur sudah di-gate dengan `isProActive`, tapi belum menyeluruh |

### Gap utama Pro

- Entitlement Pro belum terpusat, masih tersebar
- Mobile admin POS belum sekuat web
- Analytics Pro harus dipersempit definisinya supaya tidak overpromise
- Discovery/growth jangan dijadikan value inti Pro kalau belum mau dijaga serius

---

## Cross-plan checklist

### 0. Trial positioning

| Item | Status | Catatan |
| --- | --- | --- |
| Free Trial 30 hari ditampilkan jelas | Partial | Perlu sinkron dengan pricing page final |
| Trial scope mengikuti plan apa | Not Ready | Perlu diputuskan: trial rasa Starter atau trial rasa Pro |
| Trial to paid conversion path jelas | Not Ready | Perlu flow komersial yang lebih eksplisit |

### 1. Billing dan pricing sinkron

| Item | Status | Catatan |
| --- | --- | --- |
| Backend billing hanya expose plan aktif yang benar | Partial | Saat ini backend masih `starter` dan `pro`, ini justru cocok untuk fase sekarang |
| Frontend pricing sinkron dengan plan yang benar-benar aktif | Partial | Perlu revisi supaya `Free Trial` dan `Scale Coming Soon` tampil sesuai keputusan terbaru |
| Annual pricing sinkron dengan strategy baru | Not Ready | Perlu update angka final |

### 2. Entitlement dan feature gate

| Item | Status | Catatan |
| --- | --- | --- |
| Resolver entitlement per plan | Not Ready | Ini gap terbesar |
| Blast/import customer hanya Pro | Ready | Sudah ada pattern check |
| Staff & role hanya Pro | Partial | Secara product iya, tapi perlu hard gate sistematis |
| Membership tidak muncul di Starter/Pro | Ready by absence | Belum ada fiturnya, jadi aman untuk saat ini |

### 3. Marketing dan sales alignment

| Item | Status | Catatan |
| --- | --- | --- |
| Pricing page narasi Starter akurat | Partial | Perlu tightening |
| Pricing page narasi Pro akurat | Partial | Perlu tightening |
| `Scale` diberi label coming soon / contact us | Not Ready | Perlu update pricing page |
| Demo flow sesuai promise plan | Partial | Perlu audit dari sisi GTM |

### 4. UX consistency

| Item | Status | Catatan |
| --- | --- | --- |
| Web customer portal cukup konsisten | Ready | Sudah cukup kuat |
| Mobile customer portal cukup konsisten | Ready | Sudah cukup kuat |
| Admin web untuk Starter/Pro cukup usable | Partial | Sebagian matang, sebagian masih perlu polish |
| Mobile admin untuk Pro | Partial | Belum bisa jadi sales pillar utama |

---

## Prioritas implementasi

### Prioritas 1

- Finalkan positioning `Starter` dan `Pro`
- Ubah pricing page supaya cuma menjual value yang benar-benar ada
- Putuskan `Scale` jadi `Coming Soon` / `Early Access`

### Prioritas 2

- Buat entitlement resolver per plan
- Audit semua route/settings yang harus `Starter` vs `Pro`
- Pastikan staff/roles/import/blast benar-benar konsisten sebagai `Pro`

### Prioritas 3

- Rapikan definisi analytics untuk `Starter` dan `Pro`
- Audit payment method scope per plan
- Audit admin/mobile UX mana yang cukup matang untuk dijual

---

## Definition of done fase Starter + Pro

Fase ini dianggap selesai kalau:

- pricing page sinkron dengan product reality
- billing hanya menjual plan yang benar-benar siap
- `Starter` dan `Pro` punya entitlement jelas
- fitur `Pro` tidak bocor ke `Starter`
- sales dan marketing punya narasi yang konsisten
- tidak ada promise utama di pricing yang masih "partial besar"

---

## Keputusan saat ini

- `Free Trial`: aktif 30 hari
- Fokus komersial sekarang: `Starter` dan `Pro`
- `Scale`: plan anchor `Coming Soon`
- Membership/lifecycle/retention premium: ditahan untuk fase berikutnya
