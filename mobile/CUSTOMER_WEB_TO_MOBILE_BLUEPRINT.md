# Bookinaja Customer Web -> Mobile Mirror

Dokumen ini mengunci prinsip implementasi mobile customer:

- web customer adalah source of truth
- mobile meniru flow, urutan, copy, dan logic web semaksimal mungkin
- improvisasi native hanya dilakukan bila benar-benar perlu untuk ergonomi mobile
- jangan membuat pola baru jika web sudah punya pola yang matang

## Source of Truth Web Surfaces

### Auth

- `/user/login`
  - file: `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/login/user-login-client.tsx`
  - mode utama:
    - WhatsApp OTP
    - email/password
  - tambahan:
    - forgot password via OTP
    - tenant-mismatch handling

- `/user/login/phone`
  - file: `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/login/phone/phone-login-client.tsx`
  - versi fokus nomor HP + OTP

- `/user/register`
  - file: `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/register/register-client.tsx`
  - register customer
  - lanjut verifikasi OTP

- `/user/verify`
  - file: `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/verify/user-verify-client.tsx`
  - exchange booking access token ke customer session

### Public Booking Flow

- `/[tenant]/bookings`
  - file: `/Users/helwiza/Projects/bookinaja/frontend/src/app/(dashboard)/[tenant]/(public)/bookings/page.tsx`
  - katalog resource tenant

- `/[tenant]/bookings/[id]`
  - file: `/Users/helwiza/Projects/bookinaja/frontend/src/app/(dashboard)/[tenant]/(public)/bookings/[id]/page.tsx`
  - customer-facing booking builder
  - ini surface paling penting untuk kita mirror ke mobile

### Customer Portal

- `/user/me`
  - file: `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/me/page.tsx`
  - customer home/dashboard

- `/user/me/active`
  - file: `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/me/active/page.tsx`
  - daftar booking aktif

- `/user/me/history`
  - file: `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/me/history/page.tsx`
  - riwayat booking selesai

- `/user/me/bookings/[id]`
  - file: `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/me/bookings/[id]/page.tsx`
  - detail booking

- `/user/me/bookings/[id]/live`
  - file: `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/me/bookings/[id]/live/page.tsx`
  - live controller customer

- `/user/me/bookings/[id]/payment`
  - file: `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/me/bookings/[id]/payment/page.tsx`
  - dedicated payment page untuk DP / pelunasan

- `/user/me/settings`
  - file: `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/me/settings/page.tsx`
  - profil, avatar, password, phone change

## Web Booking Flow That Must Be Mirrored

Referensi utama:
- `/Users/helwiza/Projects/bookinaja/frontend/src/app/(dashboard)/[tenant]/(public)/bookings/[id]/page.tsx`

### Flow Order

1. pilih layanan utama
2. pilih tanggal
3. pilih slot waktu
4. pilih durasi
5. pilih add-on
6. masukkan promo
7. konfirmasi identitas customer
8. buat booking
9. jika ada DP:
   - redirect ke payment flow
10. jika tidak ada DP:
   - redirect ke verify/live entry

### Logic That Must Be Preserved

- busy slots diambil dari `/guest/availability/:resource_id`
- slot hari ini harus memfilter jam yang sudah lewat
- durasi maksimum dihitung dari:
  - jam tutup
  - next busy slot
  - unit duration layanan
- promo preview hanya valid jika:
  - layanan sudah dipilih
  - tanggal/jam sudah dipilih
  - subtotal sudah jelas
- setiap perubahan penting seperti:
  - layanan
  - tanggal
  - jam
  harus mereset state turunan yang relevan
- total harus menghitung:
  - harga layanan utama x durasi
  - + add-on
  - - promo bila valid
- setelah submit:
  - kalau `deposit_amount > 0`, arahkan ke payment
  - kalau tidak, arahkan ke verify/live

### Validation That Must Be Preserved

- nomor WhatsApp harus valid
- identitas customer wajib lengkap
- layanan wajib dipilih
- jadwal wajib dipilih
- duration minimal 1
- promo invalid tidak boleh ikut submit sebagai applied promo

### Copy / UX Principles That Must Be Preserved

- wizard step-based
- setiap step punya heading kuat
- customer paham mereka sedang ada di flow booking, bukan form random
- promo bukan langkah utama, tapi enhancement
- payment / DP dijelaskan sesudah booking berhasil

## Customer Portal Flow That Must Be Mirrored

### Home

Referensi:
- `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/me/page.tsx`

Core structure:
- greeting customer
- metrics:
  - points
  - tier
  - active booking count
- quick links:
  - booking aktif
  - riwayat
  - profil
  - keamanan
- active booking continuation
- discovery / recommended tenants

Mobile principle:
- home mobile harus mengikuti urutan ini
- bukan diganti jadi feed-only

### Active

Referensi:
- `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/me/active/page.tsx`

Core structure:
- summary hero kecil
- list active bookings
- tiap item punya CTA:
  - live
  - detail
  - buka tenant

### History

Referensi:
- `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/me/history/page.tsx`

Core structure:
- header ringkas
- list completed bookings
- empty state sederhana

### Booking Detail

Referensi:
- `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/me/bookings/[id]/page.tsx`

Core structure:
- resource + tenant + ref
- badge sesi
- badge bayar
- tanggal / jam
- DP / sisa
- promo breakdown bila ada
- langkah berikutnya
- CTA ke live atau payment bila perlu

### Live Controller

Referensi:
- `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/me/bookings/[id]/live/page.tsx`

Core structure:
- hero booking/live status
- realtime badge
- countdown
- payment state
- activate session
- extend
- F&B
- add-on
- complete session

Mobile principle:
- screen ini harus jadi salah satu prioritas tertinggi setelah booking + payment

### Payment

Referensi:
- `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/me/bookings/[id]/payment/page.tsx`

Core structure:
- scope DP vs settlement
- amount due
- available methods
- instruction panel sesuai method
- upload proof untuk manual
- pending manual transaction state

Mobile principle:
- copy dan urutan harus sangat dekat ke web
- jangan bikin model payment lain yang berbeda

### Settings

Referensi:
- `/Users/helwiza/Projects/bookinaja/frontend/src/app/user/me/settings/page.tsx`

Core structure:
- avatar
- name / email
- password change
- phone change request + verify
- logout

## Translation Rules For Mobile

### Allowed Adaptations

- grid web boleh diubah jadi stack mobile
- popover web boleh jadi inline card atau native modal ringan
- long desktop copy boleh dipadatkan
- CTA boleh dibuat lebih besar untuk touch

### Not Allowed

- mengubah urutan flow utama
- memindahkan promo jadi langkah utama
- membuat interaction model baru yang bertentangan dengan mental model web
- menghilangkan status penting
- mengubah hasil validasi atau business rule hanya demi UI

## Mobile Implementation Order

### Phase A

1. auth mirror:
   - login otp
   - login email
   - forgot password
   - register
   - verify

2. public booking mirror:
   - catalog
   - resource booking builder
   - success redirect

### Phase B

3. portal mirror:
   - home
   - active
   - history
   - booking detail

### Phase C

4. live + payment mirror:
   - live controller
   - payment page
   - upload proof
   - pending verification state

### Phase D

5. settings mirror:
   - profile
   - password
   - phone change
   - logout

## Immediate Action

Mulai sekarang, setiap screen mobile customer harus dicek terhadap screen web pasangannya:

- apakah flow order sama
- apakah state penting sama
- apakah copy utamanya sama
- apakah validasi utamanya sama
- apakah redirect hasil aksinya sama

Kalau belum, web yang menang.
