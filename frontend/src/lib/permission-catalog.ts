export const LEGACY_PERMISSION_ALIASES = [
  "bookings.write",
  "pos.manage",
  "resources.manage",
  "fnb.manage",
  "expenses.manage",
] as const;

export const PERMISSION_IMPLICATIONS: Record<string, string[]> = {
  "bookings.write": [
    "bookings.read",
    "bookings.create",
    "bookings.update",
    "bookings.confirm",
    "bookings.cancel",
    "sessions.start",
    "sessions.extend",
    "sessions.complete",
    "pos.read",
    "pos.checkout",
    "pos.cash.settle",
    "receipts.send",
    "receipts.print",
  ],
  "pos.manage": [
    "pos.read",
    "pos.order.add",
    "pos.checkout",
    "pos.cash.settle",
    "sessions.extend",
    "receipts.send",
    "receipts.print",
  ],
  "resources.manage": [
    "resources.read",
    "resources.create",
    "resources.update",
    "resources.delete",
  ],
  "fnb.manage": ["fnb.read", "fnb.create", "fnb.update", "fnb.delete"],
  "expenses.manage": [
    "expenses.read",
    "expenses.create",
    "expenses.update",
    "expenses.delete",
  ],
  "bookings.create": ["bookings.read"],
  "bookings.update": ["bookings.read"],
  "bookings.confirm": ["bookings.read", "bookings.update"],
  "bookings.cancel": ["bookings.read", "bookings.update"],
  "sessions.start": ["bookings.read", "bookings.update", "pos.read"],
  "sessions.extend": ["bookings.read", "pos.read"],
  "sessions.complete": ["bookings.read", "bookings.update", "pos.read"],
  "pos.order.add": ["pos.read", "bookings.read"],
  "pos.checkout": ["pos.read", "bookings.read"],
  "pos.cash.settle": ["pos.read", "bookings.read", "pos.checkout"],
  "resources.create": ["resources.read"],
  "resources.update": ["resources.read"],
  "resources.delete": ["resources.read"],
  "fnb.create": ["fnb.read"],
  "fnb.update": ["fnb.read"],
  "fnb.delete": ["fnb.read"],
  "expenses.create": ["expenses.read"],
  "expenses.update": ["expenses.read"],
  "expenses.delete": ["expenses.read"],
  "receipts.send": ["bookings.read", "pos.read"],
  "receipts.print": ["bookings.read", "pos.read"],
  "analytics.read": [
    "bookings.read",
    "resources.read",
    "customers.read",
    "expenses.read",
  ],
};

export const PERMISSION_GROUPS = [
  {
    title: "Frontdesk & Booking",
    description:
      "Kontrol penerimaan booking, konfirmasi jadwal, dan perubahan dasar status booking.",
    items: [
      {
        key: "bookings.read",
        label: "Booking - lihat",
        help: "Membuka daftar booking, detail booking, dan ringkasan operasional dasar.",
      },
      {
        key: "bookings.create",
        label: "Booking - buat manual",
        help: "Input booking baru dari counter atau walk-in.",
      },
      {
        key: "bookings.confirm",
        label: "Booking - konfirmasi",
        help: "Mengubah booking pending menjadi confirmed setelah DP atau verifikasi masuk.",
      },
      {
        key: "bookings.update",
        label: "Booking - ubah umum",
        help: "Cadangan untuk perubahan status non-standar yang tidak termasuk confirm/cancel.",
      },
      {
        key: "bookings.cancel",
        label: "Booking - batalkan",
        help: "Membatalkan booking yang belum selesai. Ini termasuk aksi sensitif.",
      },
    ],
  },
  {
    title: "Sesi & POS",
    description:
      "Kontrol sesi berjalan, terminal POS, order tambahan, checkout, dan settlement tagihan.",
    items: [
      {
        key: "pos.read",
        label: "POS - buka terminal",
        help: "Mengakses halaman POS dan melihat sesi aktif yang perlu ditangani.",
      },
      {
        key: "sessions.start",
        label: "Sesi - mulai",
        help: "Memulai sesi saat customer hadir dan siap bermain/masuk.",
      },
      {
        key: "sessions.extend",
        label: "Sesi - extend",
        help: "Menambah durasi sesi yang sedang berjalan.",
      },
      {
        key: "sessions.complete",
        label: "Sesi - akhiri",
        help: "Mengakhiri sesi dan mengunci pemakaian agar siap checkout.",
      },
      {
        key: "pos.order.add",
        label: "POS - tambah order",
        help: "Menambahkan F&B atau addon ke tagihan sesi.",
      },
      {
        key: "pos.checkout",
        label: "POS - checkout",
        help: "Membuka dan memproses checkout tagihan sesi.",
      },
      {
        key: "pos.cash.settle",
        label: "POS - lunasi cash",
        help: "Melunasi tagihan secara cash. Ini termasuk akses ke area kas.",
      },
      {
        key: "receipts.send",
        label: "Nota - kirim",
        help: "Mengirim nota ke customer melalui WhatsApp/Fonnte.",
      },
      {
        key: "receipts.print",
        label: "Nota - cetak",
        help: "Mengirim nota ke printer atau mencetak bukti transaksi.",
      },
    ],
  },
  {
    title: "Resource & Operasional Lapangan",
    description:
      "Kontrol unit/resource, item tambahan resource, dan kesiapan operasional outlet.",
    items: [
      {
        key: "resources.read",
        label: "Resource - lihat",
        help: "Melihat unit/resource, item resource, dan kapasitas outlet.",
      },
      {
        key: "resources.create",
        label: "Resource - tambah",
        help: "Menambah unit/resource atau item resource baru.",
      },
      {
        key: "resources.update",
        label: "Resource - ubah",
        help: "Mengubah status, detail, gambar, atau item resource yang sudah ada.",
      },
      {
        key: "resources.delete",
        label: "Resource - hapus",
        help: "Menghapus resource atau item resource. Ini termasuk aksi sensitif.",
      },
    ],
  },
  {
    title: "Katalog & Customer",
    description:
      "Kontrol menu F&B dan akses ke basis data customer untuk pelayanan harian.",
    items: [
      {
        key: "fnb.read",
        label: "F&B - lihat",
        help: "Melihat katalog menu untuk kebutuhan POS dan operasional.",
      },
      {
        key: "fnb.create",
        label: "F&B - tambah",
        help: "Menambah produk/menu baru ke katalog.",
      },
      {
        key: "fnb.update",
        label: "F&B - ubah",
        help: "Mengubah harga, stok, foto, atau detail menu F&B.",
      },
      {
        key: "fnb.delete",
        label: "F&B - hapus",
        help: "Menghapus menu dari katalog. Ini termasuk aksi sensitif.",
      },
      {
        key: "customers.read",
        label: "Customer - lihat",
        help: "Melihat daftar customer, riwayat booking, pencarian nomor, dan poin.",
      },
    ],
  },
  {
    title: "Keuangan & Insight",
    description:
      "Kontrol pengeluaran harian dan akses insight bisnis yang lebih sensitif.",
    items: [
      {
        key: "expenses.read",
        label: "Expenses - lihat",
        help: "Melihat daftar, summary, dan detail pengeluaran outlet.",
      },
      {
        key: "expenses.create",
        label: "Expenses - tambah",
        help: "Mencatat pengeluaran baru beserta bukti transaksi.",
      },
      {
        key: "expenses.update",
        label: "Expenses - ubah",
        help: "Mengubah data pengeluaran yang sudah tercatat.",
      },
      {
        key: "expenses.delete",
        label: "Expenses - hapus",
        help: "Menghapus pengeluaran. Ini termasuk aksi sensitif.",
      },
      {
        key: "analytics.read",
        label: "Analytics - lihat",
        help: "Membuka insight outlet seperti performa, tren, dan ringkasan bisnis sensitif.",
      },
    ],
  },
] as const;

export const RECOMMENDED_ROLE_PRESETS = [
  {
    name: "Frontdesk",
    summary:
      "Untuk staff frontdesk yang fokus menerima booking, konfirmasi jadwal, dan melayani customer datang.",
    permissions: [
      "bookings.read",
      "bookings.create",
      "bookings.confirm",
      "customers.read",
    ],
  },
  {
    name: "Kasir / POS",
    summary:
      "Untuk staff kasir yang fokus ke POS, tambah order, checkout, settlement cash, dan pengiriman nota.",
    permissions: [
      "bookings.read",
      "pos.read",
      "pos.order.add",
      "pos.checkout",
      "pos.cash.settle",
      "fnb.read",
      "customers.read",
      "receipts.send",
      "receipts.print",
    ],
  },
  {
    name: "Operator Operasional",
    summary:
      "Untuk staff operasional yang memulai layanan aktif, extend, mengakhiri sesi, dan menjaga resource tetap siap dipakai.",
    permissions: [
      "bookings.read",
      "sessions.start",
      "sessions.extend",
      "sessions.complete",
      "pos.read",
      "resources.read",
      "resources.update",
      "fnb.read",
      "customers.read",
    ],
  },
  {
    name: "Supervisor Operasional",
    summary:
      "Untuk PIC operasional yang mengawasi booking, POS, resource, katalog, pengeluaran, dan insight harian.",
    permissions: [
      "bookings.read",
      "bookings.create",
      "bookings.confirm",
      "bookings.cancel",
      "sessions.start",
      "sessions.extend",
      "sessions.complete",
      "pos.read",
      "pos.order.add",
      "pos.checkout",
      "pos.cash.settle",
      "resources.read",
      "resources.update",
      "fnb.read",
      "fnb.update",
      "customers.read",
      "expenses.read",
      "expenses.create",
      "expenses.update",
      "receipts.send",
      "receipts.print",
      "analytics.read",
    ],
  },
  {
    name: "Admin Operasional",
    summary:
      "Delegasi tertinggi untuk pengelola operasional yang butuh akses hampir penuh ke modul bisnis, katalog, dan insight.",
    permissions: [
      "bookings.read",
      "bookings.create",
      "bookings.update",
      "bookings.confirm",
      "bookings.cancel",
      "sessions.start",
      "sessions.extend",
      "sessions.complete",
      "pos.read",
      "pos.order.add",
      "pos.checkout",
      "pos.cash.settle",
      "resources.read",
      "resources.create",
      "resources.update",
      "resources.delete",
      "fnb.read",
      "fnb.create",
      "fnb.update",
      "fnb.delete",
      "customers.read",
      "expenses.read",
      "expenses.create",
      "expenses.update",
      "expenses.delete",
      "receipts.send",
      "receipts.print",
      "analytics.read",
    ],
  },
] as const;

export function expandPermissionKeys(permissionKeys?: string[] | null) {
  const queue = [...new Set(permissionKeys || [])];
  const visited = new Set<string>(queue);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const implied = PERMISSION_IMPLICATIONS[current] || [];
    for (const next of implied) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }

  return queue;
}
