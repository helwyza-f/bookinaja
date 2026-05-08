import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/platform/legal-page";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — Bookinaja",
  description:
    "Pelajari bagaimana Bookinaja mengumpulkan, menggunakan, menyimpan, dan melindungi data pelanggan, tenant, dan pengunjung platform.",
  alternates: { canonical: "/privacy" },
};

const sections: LegalSection[] = [
  {
    title: "Informasi yang Kami Kumpulkan",
    body: [
      "Bookinaja mengumpulkan informasi yang diperlukan untuk menjalankan layanan booking, operasional tenant, pembayaran, dan dukungan pelanggan.",
      "Informasi tersebut dapat berasal langsung dari kamu saat mendaftar, saat tenant menggunakan Bookinaja untuk menerima booking, atau saat kamu berinteraksi dengan website dan aplikasi kami.",
    ],
    bullets: [
      "Data identitas seperti nama, email, nomor WhatsApp, dan informasi akun lain yang kamu isi sendiri.",
      "Data transaksi seperti booking, pembayaran, add-on, F&B, promo, dan riwayat interaksi dengan tenant yang memakai Bookinaja.",
      "Data teknis seperti alamat IP, device, log akses, token sesi, dan data penggunaan yang membantu keamanan serta stabilitas layanan.",
    ],
  },
  {
    title: "Cara Kami Menggunakan Data",
    body: [
      "Kami memakai data untuk menyediakan layanan inti Bookinaja dan menjaga pengalaman pengguna tetap aman, rapi, dan relevan.",
    ],
    bullets: [
      "Membuat dan mengelola akun pelanggan maupun tenant.",
      "Memproses booking, pembayaran, verifikasi, notifikasi, dan sesi operasional.",
      "Mengirim OTP, notifikasi transaksi, pengingat sesi, dan pembaruan penting akun.",
      "Mendeteksi penyalahgunaan, mencegah fraud, memantau performa sistem, dan meningkatkan kualitas produk.",
    ],
  },
  {
    title: "Pembagian Data dengan Pihak Ketiga",
    body: [
      "Bookinaja hanya membagikan data sejauh diperlukan untuk mengoperasikan layanan atau memenuhi kewajiban hukum.",
      "Kami tidak menjual data pribadi pelanggan atau tenant kepada pihak lain.",
    ],
    bullets: [
      "Penyedia pembayaran seperti Midtrans untuk memproses transaksi digital.",
      "Penyedia komunikasi seperti WhatsApp gateway untuk OTP atau notifikasi layanan.",
      "Penyedia infrastruktur seperti hosting, database, storage, analytics, dan layanan keamanan.",
      "Otoritas yang berwenang bila diwajibkan oleh hukum atau proses penegakan hukum yang sah.",
    ],
  },
  {
    title: "Data Tenant dan Data Pelanggan Tenant",
    body: [
      "Tenant yang menggunakan Bookinaja bertanggung jawab atas data bisnis dan data pelanggan yang mereka kelola di dalam platform.",
      "Dalam konteks ini, Bookinaja bertindak sebagai penyedia sistem yang membantu tenant memproses data untuk keperluan booking, operasional, dan pembayaran.",
    ],
    bullets: [
      "Tenant wajib memastikan informasi yang mereka kumpulkan dari pelanggan digunakan secara sah dan sesuai kebutuhan bisnis.",
      "Bookinaja dapat memproses data tersebut untuk menyediakan fitur sistem, keamanan, backup, audit, dan dukungan teknis.",
    ],
  },
  {
    title: "Penyimpanan dan Keamanan Data",
    body: [
      "Kami menyimpan data selama diperlukan untuk menyediakan layanan, memenuhi kewajiban hukum, menyelesaikan sengketa, dan menjaga integritas catatan transaksi.",
      "Bookinaja menerapkan langkah teknis dan organisasi yang wajar untuk melindungi data dari akses tanpa izin, perubahan tidak sah, kehilangan, atau penyalahgunaan.",
    ],
    bullets: [
      "Kontrol autentikasi dan sesi.",
      "Pembatasan akses berbasis peran dan tenant context.",
      "Logging, monitoring, cache invalidation, dan perlindungan sistem operasional.",
      "Penyimpanan file dan aset pada layanan infrastruktur pihak ketiga yang relevan.",
    ],
  },
  {
    title: "Hak Pengguna",
    body: [
      "Kamu dapat meminta pembaruan atau koreksi terhadap data akun yang kamu berikan kepada Bookinaja. Dalam kondisi tertentu, kamu juga dapat meminta penghapusan akun sesuai kewajiban hukum dan kebutuhan pencatatan transaksi yang masih berlaku.",
      "Untuk permintaan terkait data pribadi, silakan hubungi support@bookinaja.com.",
    ],
  },
  {
    title: "Cookie, Sesi, dan Teknologi Serupa",
    body: [
      "Website dan aplikasi Bookinaja dapat memakai cookie, token sesi, local storage, dan teknologi serupa untuk mempertahankan login, mengingat preferensi, melindungi sesi, dan meningkatkan pengalaman penggunaan.",
    ],
  },
  {
    title: "Perubahan Kebijakan Privasi",
    body: [
      "Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu untuk menyesuaikan perubahan produk, operasional, atau kewajiban hukum.",
      "Perubahan material akan dipublikasikan melalui website atau jalur komunikasi yang kami anggap wajar.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Kebijakan Privasi"
      title="Kebijakan Privasi Bookinaja"
      subtitle="Penjelasan tentang bagaimana Bookinaja mengelola data pelanggan, tenant, transaksi, dan penggunaan platform."
      effectiveDate="08 Mei 2026"
      introTitle="Privasi penting untuk operasional yang sehat."
      introBody="Bookinaja dibangun untuk membantu bisnis mengelola booking dan operasional secara lebih rapi. Karena itu, kami juga perlu menjelaskan dengan jelas bagaimana data dikumpulkan, digunakan, dilindungi, dan dibagikan dalam batas yang diperlukan."
      sections={sections}
    />
  );
}
