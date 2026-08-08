# Desain Produk — Mode F&B / Menu (Integrated · Standalone · Off)

> Tujuan: satu tenant, satu akun Bookinaja, tapi hubungan **Menu/F&B ↔ Booking** bisa dipilih sesuai cara bisnis mereka jalan — dengan **pembukuan yang jelas** dan **UX yang terasa satu produk**, bukan dua aplikasi yang ditempel.
>
> Prinsip: kode-nya sudah 80% ada. Yang dinilai adalah **kejelasan model + kualitas UX**. Dokumen ini fokus di sana.

---

## 1. Kondisi sekarang (grounded di kode)

| Kapabilitas | Status | Bukti |
|-------------|--------|-------|
| Engine order standalone (buka→item→checkout→bayar→tutup) | ✅ Ada | modul `sales` (Create, AddItem, Checkout, SettleCash, CheckoutPayment, Close) + portal customer `/me/orders` |
| POS feed gabungan (booking + sales order dalam satu layar) | ✅ Ada | `isBookingItem` vs `isSalesOrderItem`, `DirectSaleDraftItem` (walk-in) di POS page |
| F&B menu (CRUD + kategori + stok) | ✅ Ada | modul `fnb` (GetMenu, CreateItem, IsAvailable) |
| F&B nempel ke sesi booking | ✅ Ada | `ControllerFeatures.EnableFnb`, event `order.fnb.added` |
| Toggle F&B di controller (on/off) | ✅ Ada | `enable_fnb` (default tenant + override per-booking) |
| Pembukuan terpisah (sumber uang di-tag) | ✅ Ada | ledger `source_type`: `booking_payment` vs `sales_order` / `direct_sale` / `pos` |

### Gap presisi (satu-satunya yang kurang)
> **Menu F&B belum bisa dijual standalone.** Sales order saat ini hanya menampung `resource_item_id` (item resource / direct-sale). Menu F&B (`fnb`) cuma bisa masuk lewat sesi booking. Backend `sales` tidak punya referensi ke `fnb` sama sekali.

Artinya: untuk "POS menu isolated dengan buku terpisah", yang perlu dibangun **bukan engine baru** — cukup **menyambungkan menu F&B ke engine sales yang sudah ada**, lalu membungkusnya dengan **mode + UX** yang jelas.

---

## 2. Model produk: satu setting, tiga mode

Satu pengaturan tenant: **Mode F&B** — yang menyetir controller, POS, dan laporan sekaligus. Mental model-nya sengaja dibuat 1 pilihan biar owner tidak bingung.

```
┌───────────── MODE F&B ─────────────┐
│                                    │
│  ○ Nyatu dengan booking            │  integrated
│    F&B & add-on muncul saat sesi.  │  → 1 buku (gabung)
│    Cocok: gaming lounge, studio.   │
│                                    │
│  ○ POS Menu terpisah               │  standalone
│    Menu punya kasir & buku sendiri.│  → 2 buku (Booking | Menu)
│    Cocok: sport center + kafe.     │
│                                    │
│  ○ Matikan (pakai app lain)        │  off
│    Bookinaja fokus booking saja.   │  → 1 buku (Booking)
│    Cocok: F&B pakai Majoo, dll.    │
│                                    │
└────────────────────────────────────┘
```

Kunci UX: **deskripsi + contoh bisnis** di tiap opsi, bukan istilah teknis. Owner memilih berdasarkan "bisnis saya yang mana", bukan "integrated itu apa".

---

## 3. UX per surface

### 3.1 Tempat memilih mode
- **Onboarding (opsional, bisa di-skip)**: setelah langkah resource, satu kartu ringan — "Punya F&B / menu?" dengan 3 pilihan di atas. Default **off** (nol friction; sejalan dengan prinsip default cash/no-DP). Bisa diubah kapan saja.
- **Settings → Menu**: tempat permanen mengubah mode. Perubahan mode langsung mengubah tampilan POS & controller (live, tanpa reload konsep).

### 3.2 POS — "dua wajah" yang terasa satu layar
POS tetap **satu halaman**, dengan **segmented switch** di atas (bukan dua menu terpisah di sidebar — biar kasir tidak pindah-pindah tempat):

```
┌──────────────────────────────────────────────┐
│  POS        [ Booking ]  [ Menu ]   🔎 cari   │  ← segmented, muncul hanya bila mode = standalone
├──────────────────────────────────────────────┤
│  (Booking)  feed sesi + walk-in resource      │
│  (Menu)     katalog F&B → keranjang → bayar   │
└──────────────────────────────────────────────┘
```

- **Mode integrated** → tab "Menu" tidak ada; F&B muncul sebagai add-on di dalam sesi booking (seperti sekarang). Satu wajah.
- **Mode standalone** → muncul switch **Booking | Menu**. Tab "Menu" = kasir F&B murni (katalog menu → keranjang → bayar → order masuk buku Menu). Tab "Booking" = seperti sekarang, TANPA F&B di dalam sesi.
- **Mode off** → tidak ada F&B di mana pun.

Detail UX yang bikin terasa bagus:
- **Switch mengingat konteks**: kasir yang sering di "Menu" tetap di situ sampai pindah manual.
- **Keranjang Menu = pola kasir umum** (grid item + kategori chip + qty + total sticky bawah + tombol bayar) — familiar, cepat, cocok layar sentuh.
- **Satu antrian pembayaran**: metode bayar (cash / QRIS / gateway) sama persis dengan booking — kasir tidak belajar dua sistem.
- **Warna/badge buku**: order Menu diberi label kecil "Menu" di feed, order booking label "Booking" — supaya satu feed tetap terbaca saat digabung.

### 3.3 Live controller (customer)
- **integrated** → F&B tampil di controller, customer bisa pesan saat main.
- **standalone / off** → controller **bersih** (murni kontrol sesi lapangan). Gate pakai `enable_fnb` yang sudah ada.

Ini menjawab kasus "sport center + F&B pakai Majoo" **dan** "sport center + kafe sendiri tapi buku pisah" tanpa mengubah controller: controller selalu fokus booking kecuali mode integrated.

### 3.4 Laporan — filter "Buku"
Karena `source_type` sudah ada, laporan cukup dapat **segmented filter di atas**:

```
Laporan   [ Semua ]  [ Booking ]  [ Menu ]
```

- **standalone** → default tampil **terpisah**; owner bisa lihat P&L Booking dan P&L Menu masing-masing, atau "Semua" untuk gabungan.
- **integrated** → default "Semua" (F&B memang bagian dari booking); filter tetap ada kalau mau bedah.
- **off** → filter Menu disembunyikan.

Nilai produk: owner sport-center bisa jawab "lapangan untung berapa" dan "kafe untung berapa" **terpisah**, dalam satu dashboard. Ini justru fitur jual.

---

## 4. Prinsip produk yang dipegang

1. **Satu keputusan, bukan banyak toggle.** Owner pilih 1 mode; sistem yang mengatur controller + POS + laporan. Hindari 5 switch terpisah yang bikin state membingungkan.
2. **Default nol friction.** Mode default = **off**. Tenant baru langsung bisa booking tanpa mikir F&B. F&B adalah opt-in yang menarik konfigurasinya sendiri (sejalan dgn default cash/no-DP).
3. **Progressive disclosure.** Tab "Menu", filter "Buku", F&B di controller — semua baru muncul setelah mode relevan dipilih. Layar tidak pernah menampilkan hal yang belum dipakai.
4. **Satu produk, bukan dua app.** Pembayaran, feed, portal customer, desain — konsisten lintas Booking & Menu. Perbedaannya cuma "buku", bukan "aplikasi".
5. **Reversible.** Ganti mode kapan saja tanpa kehilangan data; histori tetap ter-tag source-nya.

---

## 5. Keputusan & edge case (perlu disepakati)

| Topik | Opsi | Rekomendasi |
|-------|------|-------------|
| Item menu di 2 mode | (a) fnb items dipakai lintas mode; (b) katalog terpisah | **(a)** — satu menu, dipakai di controller (integrated) atau POS Menu (standalone). Hindari input dobel. |
| Order Menu punya customer? | (a) walk-in anonim; (b) bisa attach customer/CRM | **(a) default**, (b) opsional — biar cepat, tapi bisa tautkan ke CRM kalau mau. |
| Stok/inventory menu | ikut `is_available` (ready/out) yang sudah ada | cukup untuk fase awal; inventory kuantitatif = fase lanjut. |
| Buku "Menu" di ledger | pakai `source_type=sales_order` yang sudah ada | ya — tak perlu source baru. |
| Pindah mode saat ada sesi jalan | integrated→standalone di tengah sesi | terapkan mode ke booking baru; sesi berjalan pakai setting saat dibuat (sudah pola `enable_fnb` per-booking). |

---

## 6. Yang perlu dibangun (bertahap, grounded)

| Fase | Item | Effort | Catatan |
|------|------|--------|---------|
| **1** | Setting `fnb_mode` (tenant) + gate controller/POS/laporan | Kecil | flag + kondisional UI; controller sudah pakai `enable_fnb` |
| **2** | Bridge: sales order bisa menampung **item F&B** | Sedang | tambah dukungan `fnb_item_id` di `sales.OrderItem` (saat ini `resource_item_id` saja) — **satu-satunya gap engine** |
| **3** | POS: segmented **Booking \| Menu** + kasir Menu (katalog→keranjang→bayar) | Sedang | reuse komponen katalog F&B + alur pembayaran sales yang sudah ada |
| **4** | Laporan: filter **Buku** (Booking/Menu/Semua) | Kecil | `source_type` sudah ada, tinggal segmented filter |
| **5** | Onboarding: kartu pilih Mode F&B (default off) | Kecil | copy berbasis contoh bisnis |

Tidak ada engine baru. Tidak ada migrasi berisiko. Yang inti (Fase 2) cuma menyambung F&B ke engine sales yang sudah lengkap.

---

## 7. Kenapa ini kuat dari sisi produk
- **Menutup 3 tipe tenant sekaligus** dengan satu model: nyatu (gaming/studio), pisah-buku (sport+kafe), dan booking-only (F&B eksternal).
- **Jualan yang jelas**: "P&L lapangan vs P&L kafe terpisah, satu dashboard".
- **Friction rendah**: default off, opt-in progresif, satu keputusan.
- **Terasa satu produk**: pembayaran & desain konsisten — bukan dua aplikasi ditempel.
