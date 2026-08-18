/// Normalisasi kategori F&B ke bentuk kanonik: Bahasa Indonesia, Title Case.
///
/// Data lama bisa berisi nilai campur ("Drink", "FOOD", "SNACK", "makanan").
/// Fungsi ini menyeragamkan tampilan di semua layar (menu admin & kasir) tanpa
/// perlu migrasi data — nilai mentah dipetakan saat render.
library;

/// Tiga kategori kanonik yang dipakai selector di form menu.
const fnbCategories = ['Makanan', 'Minuman', 'Snack'];

const _aliases = {
  'MAKANAN': 'Makanan',
  'FOOD': 'Makanan',
  'FOODS': 'Makanan',
  'MINUMAN': 'Minuman',
  'MINUM': 'Minuman',
  'DRINK': 'Minuman',
  'DRINKS': 'Minuman',
  'BEVERAGE': 'Minuman',
  'SNACK': 'Snack',
  'SNACKS': 'Snack',
  'CEMILAN': 'Snack',
  'CAMILAN': 'Snack',
  'LAINNYA': 'Lainnya',
  'OTHER': 'Lainnya',
  'OTHERS': 'Lainnya',
};

/// Petakan kategori mentah → label kanonik. Kosong → 'Lainnya'. Nilai tak
/// dikenal di-Title-Case-kan agar kapitalisasi tetap konsisten.
String normalizeFnbCategory(String? raw) {
  final v = (raw ?? '').trim();
  if (v.isEmpty) return 'Lainnya';
  final up = v.toUpperCase();
  final mapped = _aliases[up];
  if (mapped != null) return mapped;
  return v[0].toUpperCase() + v.substring(1).toLowerCase();
}
