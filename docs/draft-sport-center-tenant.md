# Draft Tenant — Sport Center

> Draft data untuk tenant **Sport Center** dengan banyak jenis lapangan, tiap jenis punya beberapa unit lapangan.
> Semua nama, harga, dan jam bisa disesuaikan. Struktur mengikuti model Bookinaja: **Resource** (lapangan) + **ResourceItem** (harga & add-on).

---

## 1. Profil Tenant

| Field | Isi |
|-------|-----|
| Nama | **Arena Champion Sports Center** |
| Slug | `arena-champion` |
| Kategori bisnis | Sport / Lapangan olahraga |
| Business type | Sport Courts |
| Alamat | Jl. Sudirman No. 88, Batam |
| WhatsApp | 0812-xxxx-xxxx |
| Jam operasional | 08:00 – 24:00 (setiap hari) |
| Meta title | Arena Champion — Sewa Lapangan Futsal, Badminton, Basket di Batam |
| Meta description | Booking lapangan olahraga online: futsal, badminton, basket, mini soccer, tenis. Cek slot realtime, bayar DP, main tanpa ribet. |

**Konsep DP:** semua lapangan `dp_enabled = true`, `dp_percentage = 50%` (booking dikonfirmasi setelah DP 50% masuk, pelunasan saat main).

---

## 2. Jenis Lapangan & Unit

Ringkasan — **6 jenis lapangan, total 19 unit**:

| Kategori (jenis) | Jumlah unit | Nama unit |
|------------------|-------------|-----------|
| Futsal | 3 | Futsal A, Futsal B, Futsal C |
| Badminton | 5 | Badminton 1–5 |
| Basket | 2 | Basket Indoor 1, Basket Indoor 2 |
| Mini Soccer | 2 | Mini Soccer North, Mini Soccer South |
| Tenis | 3 | Tenis Court 1–3 |
| Voli | 4 | Voli 1–4 |

> Tiap unit di atas = **1 Resource** di Bookinaja. Kategori dipakai untuk mengelompokkan di katalog booking.

---

## 3. Detail per Jenis (Resource + Pricing)

Pola harga standar: **satuan per jam** (`price_unit = "jam"`, `unit_duration = 60` menit), dengan tarif berbeda untuk **Weekday Siang / Weekday Malam / Weekend**.
Tarif "Malam" berlaku mulai 17:00. Set salah satu tarif sebagai `is_default` (biasanya Weekday Siang).

### 3.1 Futsal (3 unit) — *Rumput sintetis / vinyl indoor*
- **Unit:** Futsal A, Futsal B, Futsal C
- **Deskripsi:** Lapangan futsal indoor, rumput sintetis premium, full lighting, tribun kecil.
- **Harga per unit (per jam):**

  | Item | Price | Unit | Default |
  |------|-------|------|---------|
  | Weekday Siang (08–17) | Rp 120.000 | jam | ✅ |
  | Weekday Malam (17–24) | Rp 160.000 | jam | |
  | Weekend / Libur | Rp 180.000 | jam | |

### 3.2 Badminton (5 unit) — *Karpet vinyl BWF*
- **Unit:** Badminton 1, 2, 3, 4, 5
- **Deskripsi:** Court badminton karpet vinyl standar, pencahayaan anti-silau.
- **Harga per unit (per jam):**

  | Item | Price | Unit | Default |
  |------|-------|------|---------|
  | Weekday Siang | Rp 45.000 | jam | ✅ |
  | Weekday Malam | Rp 65.000 | jam | |
  | Weekend / Libur | Rp 75.000 | jam | |

### 3.3 Basket (2 unit) — *Indoor court*
- **Unit:** Basket Indoor 1, Basket Indoor 2
- **Deskripsi:** Lapangan basket indoor full-court, ring standar, papan skor.
- **Harga per unit (per jam):**

  | Item | Price | Unit | Default |
  |------|-------|------|---------|
  | Weekday Siang | Rp 150.000 | jam | ✅ |
  | Weekday Malam | Rp 200.000 | jam | |
  | Weekend / Libur | Rp 220.000 | jam | |

### 3.4 Mini Soccer (2 unit) — *Rumput sintetis outdoor*
- **Unit:** Mini Soccer North, Mini Soccer South
- **Deskripsi:** Lapangan mini soccer 7v7, rumput sintetis, lampu stadion.
- **Harga per unit (per jam):**

  | Item | Price | Unit | Default |
  |------|-------|------|---------|
  | Weekday Siang | Rp 250.000 | jam | ✅ |
  | Weekday Malam | Rp 350.000 | jam | |
  | Weekend / Libur | Rp 400.000 | jam | |

### 3.5 Tenis (3 unit) — *Hard court*
- **Unit:** Tenis Court 1, 2, 3
- **Deskripsi:** Lapangan tenis hard court outdoor, net standar ITF.
- **Harga per unit (per jam):**

  | Item | Price | Unit | Default |
  |------|-------|------|---------|
  | Weekday Siang | Rp 80.000 | jam | ✅ |
  | Weekday Malam | Rp 110.000 | jam | |
  | Weekend / Libur | Rp 120.000 | jam | |

### 3.6 Voli (4 unit) — *Indoor / outdoor*
- **Unit:** Voli 1, 2, 3, 4
- **Deskripsi:** Lapangan voli standar, net adjustable, garis lapangan jelas.
- **Harga per unit (per jam):**

  | Item | Price | Unit | Default |
  |------|-------|------|---------|
  | Weekday Siang | Rp 70.000 | jam | ✅ |
  | Weekday Malam | Rp 95.000 | jam | |
  | Weekend / Libur | Rp 110.000 | jam | |

---

## 4. Add-on (ResourceItem `item_type = "addon"`)

Add-on bisa ditempel ke lapangan terkait (atau dijadikan katalog POS umum). Satuan `pcs` / `unit` (sekali sewa, bukan per jam).

| Add-on | Harga | Satuan | Cocok untuk |
|--------|-------|--------|-------------|
| Sewa raket badminton | Rp 15.000 | pcs | Badminton |
| Shuttlecock (per tabung) | Rp 90.000 | tabung | Badminton |
| Sewa bola futsal | Rp 20.000 | unit | Futsal |
| Sewa bola basket | Rp 20.000 | unit | Basket |
| Sewa bola voli | Rp 20.000 | unit | Voli |
| Sewa rompi (per set 6) | Rp 30.000 | set | Futsal, Mini Soccer |
| Sewa sepatu | Rp 25.000 | pasang | Semua |
| Wasit / referee (per jam) | Rp 75.000 | jam | Futsal, Mini Soccer, Basket |
| Handuk | Rp 10.000 | pcs | Semua |

---

## 5. F&B / POS (opsional, dijual saat main)

| Item | Harga | Satuan |
|------|-------|--------|
| Air mineral 600ml | Rp 5.000 | botol |
| Isotonik (Pocari/Mizone) | Rp 10.000 | botol |
| Kopi / teh | Rp 8.000 | cup |
| Snack / roti | Rp 12.000 | pcs |
| Energy bar | Rp 15.000 | pcs |

---

## 6. Contoh Seed (JSON, siap dipakai untuk import/API)

Struktur mengikuti `Resource` + `items[]` (`ResourceItem`). Contoh untuk 1 unit Futsal — pola sama untuk unit lain:

```json
{
  "name": "Futsal A",
  "category": "Futsal",
  "operating_mode": "time_slot",
  "description": "Lapangan futsal indoor, rumput sintetis premium, full lighting.",
  "about": "Futsal A adalah lapangan unggulan dengan rumput sintetis premium dan pencahayaan LED anti-silau.",
  "status": "active",
  "dp_enabled": true,
  "dp_percentage": 50,
  "items": [
    { "name": "Weekday Siang", "price": 120000, "price_unit": "jam", "unit_duration": 60, "item_type": "main", "is_default": true },
    { "name": "Weekday Malam", "price": 160000, "price_unit": "jam", "unit_duration": 60, "item_type": "main", "is_default": false },
    { "name": "Weekend / Libur", "price": 180000, "price_unit": "jam", "unit_duration": 60, "item_type": "main", "is_default": false },
    { "name": "Sewa bola futsal", "price": 20000, "price_unit": "unit", "unit_duration": 0, "item_type": "addon", "is_default": false },
    { "name": "Sewa rompi (set 6)", "price": 30000, "price_unit": "set", "unit_duration": 0, "item_type": "addon", "is_default": false }
  ]
}
```

---

## 7. Checklist Setup di Dashboard Tenant

1. [ ] Buat tenant + isi profil bisnis (nama, slug, alamat, jam operasional, WA)
2. [ ] Aktifkan DP 50% sebagai default
3. [ ] Tambah resource per jenis lapangan (total 19 unit) dengan kategori yang benar
4. [ ] Isi pricing per unit (Weekday Siang default + Malam + Weekend)
5. [ ] Tambah add-on ke lapangan terkait
6. [ ] Isi katalog F&B / POS
7. [ ] Upload foto tiap jenis lapangan (cover + gallery)
8. [ ] Test booking end-to-end (pilih slot → DP → konfirmasi → main → pelunasan)
```
