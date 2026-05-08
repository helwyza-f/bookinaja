import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/platform/legal-page";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — Bookinaja",
  description:
    "Syarat dan ketentuan penggunaan website, aplikasi, fitur booking, pembayaran, dan layanan operasional Bookinaja.",
  alternates: { canonical: "/terms" },
};

const sections: LegalSection[] = [
  {
    title: "Penerimaan Ketentuan",
    body: [
      "Dengan mengakses atau menggunakan Bookinaja, kamu menyetujui syarat dan ketentuan ini. Jika kamu tidak setuju, mohon tidak menggunakan layanan kami.",
      "Ketentuan ini berlaku untuk pengunjung website, pelanggan yang melakukan booking, tenant, admin tenant, dan pihak lain yang memakai layanan Bookinaja.",
    ],
  },
  {
    title: "Ruang Lingkup Layanan",
    body: [
      "Bookinaja menyediakan platform untuk mendukung discovery, booking, pembayaran, operasional, CRM, dan pengelolaan bisnis tenant yang memakai layanan kami.",
      "Sebagian pengalaman pengguna juga dipengaruhi kebijakan dan operasional tenant masing-masing, termasuk jam operasional, aturan penggunaan resource, verifikasi pembayaran, dan refund.",
    ],
  },
  {
    title: "Akun dan Tanggung Jawab Pengguna",
    body: [
      "Kamu bertanggung jawab menjaga keamanan akun, OTP, password, dan akses device yang terhubung ke layanan Bookinaja.",
      "Kamu wajib memberikan informasi yang benar, akurat, dan tidak menyesatkan saat membuat akun, booking, atau melakukan pembayaran.",
    ],
    bullets: [
      "Dilarang menggunakan akun orang lain tanpa izin.",
      "Dilarang mencoba mengakses data tenant atau pengguna lain tanpa otorisasi.",
      "Dilarang menyalahgunakan promo, sistem pembayaran, atau fitur operasional untuk tujuan curang.",
    ],
  },
  {
    title: "Booking, Pembayaran, dan Promo",
    body: [
      "Booking yang dibuat melalui Bookinaja tunduk pada kebijakan tenant terkait ketersediaan resource, deposit, pelunasan, keterlambatan, dan pembatalan.",
      "Bookinaja dapat memfasilitasi pembayaran manual maupun gateway digital, tetapi keputusan operasional tertentu seperti verifikasi manual dan penanganan refund dapat melibatkan tenant terkait.",
    ],
    bullets: [
      "Promo dapat memiliki syarat khusus, masa berlaku, batas penggunaan, dan cakupan diskon tertentu.",
      "Booking dianggap valid setelah sistem atau tenant mengonfirmasi status pembayaran sesuai aturan yang berlaku.",
      "Perbedaan kebijakan antar tenant dapat memengaruhi jumlah deposit, pelunasan, atau refund yang berlaku pada transaksi tertentu.",
    ],
  },
  {
    title: "Kewajiban Tenant",
    body: [
      "Tenant bertanggung jawab atas informasi bisnis, harga, resource, kebijakan publik, dan interaksi operasional dengan pelanggan yang mereka tampilkan melalui Bookinaja.",
      "Tenant wajib menggunakan Bookinaja secara sah, tidak melanggar hukum, dan tidak memakai platform untuk aktivitas yang merugikan pelanggan, Bookinaja, atau pihak ketiga.",
    ],
  },
  {
    title: "Ketersediaan Layanan",
    body: [
      "Kami berupaya menjaga layanan tetap tersedia dan andal, namun Bookinaja tidak menjamin layanan bebas gangguan setiap saat.",
      "Pemeliharaan sistem, gangguan infrastruktur, integrasi pihak ketiga, atau kejadian di luar kendali yang wajar dapat memengaruhi ketersediaan layanan.",
    ],
  },
  {
    title: "Hak Kekayaan Intelektual",
    body: [
      "Seluruh hak atas software, desain, brand, konten sistem, dokumentasi, dan materi milik Bookinaja tetap menjadi milik Bookinaja atau pemberi lisensi yang sah.",
      "Pengguna tidak diperbolehkan menyalin, membongkar, menjual ulang, atau mengeksploitasi bagian layanan tanpa izin tertulis dari Bookinaja, kecuali sejauh diperbolehkan hukum.",
    ],
  },
  {
    title: "Pembatasan Tanggung Jawab",
    body: [
      "Sejauh diizinkan hukum yang berlaku, Bookinaja tidak bertanggung jawab atas kerugian tidak langsung, kehilangan keuntungan, kehilangan peluang bisnis, kehilangan data, atau kerugian konsekuensial yang timbul dari penggunaan layanan.",
      "Tanggung jawab operasional tertentu yang berasal dari kebijakan tenant, kondisi tempat usaha, atau tindakan pengguna lain berada di luar kendali langsung Bookinaja.",
    ],
  },
  {
    title: "Perubahan Layanan dan Ketentuan",
    body: [
      "Bookinaja dapat memperbarui fitur, integrasi, harga, kebijakan, dan syarat penggunaan dari waktu ke waktu.",
      "Perubahan material pada syarat ini akan dipublikasikan melalui website atau kanal komunikasi yang kami anggap wajar.",
    ],
  },
  {
    title: "Hubungi Kami",
    body: [
      "Untuk pertanyaan seputar syarat penggunaan, akun, atau penggunaan platform, silakan hubungi support@bookinaja.com.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Syarat & Ketentuan"
      title="Syarat dan Ketentuan Bookinaja"
      subtitle="Aturan dasar penggunaan Bookinaja untuk pelanggan, tenant, admin tenant, dan pengunjung website."
      effectiveDate="08 Mei 2026"
      introTitle="Platform operasional butuh aturan yang jelas."
      introBody="Syarat ini membantu menjelaskan bagaimana Bookinaja dipakai secara wajar, bagaimana tanggung jawab dibagi antara platform dan tenant, serta batasan yang perlu dipahami saat menggunakan layanan kami."
      sections={sections}
    />
  );
}
