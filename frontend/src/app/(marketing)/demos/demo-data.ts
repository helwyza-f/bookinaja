export type DemoSector = {
  slug: string;
  title: string;
  shortTitle: string;
  category: string;
  icon: "monitor" | "camera" | "trophy" | "briefcase";
  color: string;
  accent: string;
  previewUrl: string;
  demoUrl: string;
  scheduleUrl: string;
  description: string;
  hero: string;
  subhero: string;
  features: string[];
  customerSteps: string[];
  adminPanels: { label: string; value: string; helper: string }[];
  resources: {
    name: string;
    status: string;
    meta: string;
    tone: "blue" | "green" | "amber" | "rose";
  }[];
  payments: { label: string; amount: string; method: string }[];
  staff: { role: string; access: string }[];
  report: { label: string; value: string }[];
};

export const demoSectors: DemoSector[] = [
  {
    slug: "gaming-rental",
    title: "Gaming & Rental",
    shortTitle: "Gaming Rental",
    category: "gaming_hub",
    icon: "monitor",
    color: "from-blue-600 to-indigo-600",
    accent: "blue",
    previewUrl: "gaminghub.bookinaja.com",
    demoUrl: "https://gaming-demo.bookinaja.com",
    scheduleUrl:
      "mailto:support@bookinaja.com?subject=Jadwalkan%20Demo%20Bookinaja%20-%20Gaming%20%26%20Rental&body=Halo%20Bookinaja%2C%20saya%20ingin%20jadwalkan%20demo%20dashboard%20untuk%20bisnis%20gaming%20atau%20rental.",
    description:
      "Untuk rental PS, PC, billiard, atau unit berbasis durasi yang butuh tagihan per sesi, DP, dan status unit real-time.",
    hero: "Rental gaming lebih rapi dari booking sampai durasi main.",
    subhero:
      "Pelanggan pilih paket dan jadwal dari website. Tim melihat unit aktif, sisa durasi, DP, pelunasan, dan aktivitas kasir dalam satu dashboard.",
    features: [
      "Tagihan per durasi",
      "DP dan pelunasan",
      "Pantau unit real-time",
      "Dashboard kasir dan owner",
    ],
    customerSteps: [
      "Pilih unit atau paket",
      "Tentukan durasi main",
      "Bayar DP",
      "Datang dan check-in",
    ],
    adminPanels: [
      { label: "Unit aktif", value: "18", helper: "PS, PC, dan VIP room" },
      { label: "Pendapatan hari ini", value: "Rp4,8 jt", helper: "DP + pelunasan" },
      { label: "Sesi berjalan", value: "12", helper: "terpantau real-time" },
    ],
    resources: [
      { name: "PS-01", status: "AKTIF", meta: "Rafi - 2j 15m", tone: "blue" },
      { name: "PS-02", status: "KOSONG", meta: "Siap dibooking", tone: "green" },
      { name: "PC-01", status: "DP", meta: "14:00 - Rp50rb", tone: "amber" },
      { name: "VIP", status: "DITAHAN", meta: "Maya - 30m", tone: "rose" },
    ],
    payments: [
      { label: "DP PS-03", amount: "Rp50.000", method: "QRIS" },
      { label: "Pelunasan PC-01", amount: "Rp85.000", method: "Tunai" },
      { label: "Paket VIP", amount: "Rp150.000", method: "Transfer" },
    ],
    staff: [
      { role: "Owner", access: "Lihat semua laporan dan koreksi transaksi" },
      { role: "Kasir", access: "Check-in, pembayaran, perpanjang sesi" },
      { role: "Operator", access: "Pantau unit dan bantu pelanggan" },
    ],
    report: [
      { label: "Jam paling ramai", value: "19.00-22.00" },
      { label: "Unit terlaris", value: "PS-01" },
      { label: "Metode favorit", value: "QRIS" },
    ],
  },
  {
    slug: "studio-creative",
    title: "Studio & Creative",
    shortTitle: "Studio Creative",
    category: "creative_space",
    icon: "camera",
    color: "from-fuchsia-600 to-pink-600",
    accent: "fuchsia",
    previewUrl: "studiofoto.bookinaja.com",
    demoUrl: "https://studio-demo.bookinaja.com",
    scheduleUrl:
      "mailto:support@bookinaja.com?subject=Jadwalkan%20Demo%20Bookinaja%20-%20Studio%20%26%20Creative&body=Halo%20Bookinaja%2C%20saya%20ingin%20jadwalkan%20demo%20dashboard%20untuk%20studio%20atau%20creative%20space.",
    description:
      "Untuk studio foto, podcast room, kelas kreatif, atau creative space yang menjual jadwal, add-on, dan DP.",
    hero: "Booking studio, add-on alat, dan DP dalam satu alur.",
    subhero:
      "Pelanggan pilih ruangan, jam, dan add-on. Tim studio langsung melihat jadwal, alat yang disewa, status DP, dan agenda sesi hari itu.",
    features: ["Kalender studio", "Add-on sewa alat", "DP online", "Agenda produksi"],
    customerSteps: ["Pilih tipe studio", "Tambah lighting atau kamera", "Pilih jam kosong", "Bayar DP"],
    adminPanels: [
      { label: "Booking hari ini", value: "9", helper: "studio foto + podcast" },
      { label: "Add-on aktif", value: "14", helper: "lighting, backdrop, mic" },
      { label: "DP masuk", value: "Rp2,6 jt", helper: "otomatis tercatat" },
    ],
    resources: [
      { name: "Studio A", status: "SESI", meta: "Foto produk - 2 jam", tone: "blue" },
      { name: "Podcast", status: "KOSONG", meta: "Slot 15:00 siap", tone: "green" },
      { name: "Studio B", status: "DP", meta: "Prewedding - 16:30", tone: "amber" },
      { name: "Makeup Room", status: "DITAHAN", meta: "Pelanggan VIP", tone: "rose" },
    ],
    payments: [
      { label: "DP Studio A", amount: "Rp300.000", method: "QRIS" },
      { label: "Add-on lighting", amount: "Rp125.000", method: "Transfer" },
      { label: "Pelunasan paket", amount: "Rp700.000", method: "Bank" },
    ],
    staff: [
      { role: "Koordinator studio", access: "Atur kalender, add-on, dan konfirmasi booking" },
      { role: "Fotografer", access: "Lihat agenda sesi dan catatan pelanggan" },
      { role: "Owner", access: "Pantau pendapatan, okupansi, dan performa paket" },
    ],
    report: [
      { label: "Paket terlaris", value: "Foto Produk" },
      { label: "Add-on favorit", value: "Lighting" },
      { label: "Slot ramai", value: "Akhir pekan" },
    ],
  },
  {
    slug: "sport-courts",
    title: "Sport & Courts",
    shortTitle: "Sport Courts",
    category: "sport_center",
    icon: "trophy",
    color: "from-emerald-600 to-teal-600",
    accent: "emerald",
    previewUrl: "arenafutsal.bookinaja.com",
    demoUrl: "https://sport-demo.bookinaja.com",
    scheduleUrl:
      "mailto:support@bookinaja.com?subject=Jadwalkan%20Demo%20Bookinaja%20-%20Sport%20%26%20Courts&body=Halo%20Bookinaja%2C%20saya%20ingin%20jadwalkan%20demo%20dashboard%20untuk%20lapangan%20atau%20venue%20olahraga.",
    description:
      "Untuk futsal, badminton, tenis, billiard, atau venue olahraga yang butuh slot lapangan dan pelunasan jelas.",
    hero: "Slot lapangan jelas, booking tidak tabrakan.",
    subhero:
      "Pelanggan memilih lapangan dan jam kosong. Tim venue melihat jadwal harian, DP, pelunasan, member, dan okupansi lapangan.",
    features: ["Grid jadwal lapangan", "DP dan pelunasan", "Member bulanan", "Okupansi venue"],
    customerSteps: ["Pilih lapangan", "Pilih jam main", "Bayar DP", "Check-in di venue"],
    adminPanels: [
      { label: "Lapangan terisi", value: "7/10", helper: "jadwal hari ini" },
      { label: "DP terkumpul", value: "Rp3,2 jt", helper: "booking terkonfirmasi" },
      { label: "Member aktif", value: "84", helper: "komunitas rutin" },
    ],
    resources: [
      { name: "Court A", status: "MAIN", meta: "Tim Alpha - 19:00", tone: "blue" },
      { name: "Court B", status: "KOSONG", meta: "Siap 20:00", tone: "green" },
      { name: "Court C", status: "DP", meta: "Badminton - 18:00", tone: "amber" },
      { name: "Court VIP", status: "DITAHAN", meta: "Turnamen", tone: "rose" },
    ],
    payments: [
      { label: "DP Court A", amount: "Rp100.000", method: "QRIS" },
      { label: "Pelunasan Court B", amount: "Rp250.000", method: "Tunai" },
      { label: "Perpanjangan member", amount: "Rp450.000", method: "Transfer" },
    ],
    staff: [
      { role: "Koordinator venue", access: "Kelola jadwal dan konfirmasi DP" },
      { role: "Meja depan", access: "Check-in, pelunasan, dan ubah jadwal" },
      { role: "Owner", access: "Lihat okupansi, pendapatan, dan member" },
    ],
    report: [
      { label: "Jam ramai", value: "18.00-21.00" },
      { label: "Court favorit", value: "Court A" },
      { label: "Booking ulang", value: "61%" },
    ],
  },
  {
    slug: "office-space",
    title: "Office Space",
    shortTitle: "Office Space",
    category: "social_space",
    icon: "briefcase",
    color: "from-orange-600 to-amber-600",
    accent: "orange",
    previewUrl: "officespace.bookinaja.com",
    demoUrl: "https://office-demo.bookinaja.com",
    scheduleUrl:
      "mailto:support@bookinaja.com?subject=Jadwalkan%20Demo%20Bookinaja%20-%20Office%20Space&body=Halo%20Bookinaja%2C%20saya%20ingin%20jadwalkan%20demo%20dashboard%20untuk%20office%20space%20atau%20meeting%20room.",
    description:
      "Untuk meeting room, coworking, private office, atau event space yang menjual ruangan per jam atau harian.",
    hero: "Ruang meeting dan coworking bisa dipesan tanpa bolak-balik chat.",
    subhero:
      "Pelanggan memilih ruangan dan fasilitas. Tim melihat jadwal ruang, add-on fasilitas, invoice, check-in, dan pemakaian harian.",
    features: ["Booking ruangan", "Fasilitas add-on", "Check-in QR", "Laporan pemakaian"],
    customerSteps: ["Pilih ruangan", "Pilih tanggal dan durasi", "Tambah fasilitas", "Konfirmasi booking"],
    adminPanels: [
      { label: "Ruang terpakai", value: "11", helper: "meeting + private room" },
      { label: "Booking korporat", value: "5", helper: "hari ini" },
      { label: "Pendapatan", value: "Rp6,1 jt", helper: "room + fasilitas" },
    ],
    resources: [
      { name: "Room 01", status: "MEETING", meta: "PT Nusantara - 2 jam", tone: "blue" },
      { name: "Hot Desk", status: "KOSONG", meta: "12 kursi siap", tone: "green" },
      { name: "Event Hall", status: "DP", meta: "Workshop - Jumat", tone: "amber" },
      { name: "Boardroom", status: "DITAHAN", meta: "Pelanggan korporat", tone: "rose" },
    ],
    payments: [
      { label: "DP Boardroom", amount: "Rp500.000", method: "Transfer" },
      { label: "Hot desk harian", amount: "Rp120.000", method: "QRIS" },
      { label: "Add-on projector", amount: "Rp75.000", method: "Invoice" },
    ],
    staff: [
      { role: "Front office", access: "Check-in, fasilitas, dan jadwal ruang" },
      { role: "Keuangan", access: "Invoice, DP, dan pelunasan korporat" },
      { role: "Owner", access: "Pantau okupansi dan pendapatan ruang" },
    ],
    report: [
      { label: "Room favorit", value: "Boardroom" },
      { label: "Durasi rata-rata", value: "3 jam" },
      { label: "Pelanggan korporat", value: "38%" },
    ],
  },
];

export function getDemoSector(slug: string) {
  return demoSectors.find((sector) => sector.slug === slug);
}
