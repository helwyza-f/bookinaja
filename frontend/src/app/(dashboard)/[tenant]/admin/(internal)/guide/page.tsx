import { BookOpen, CalendarRange, CreditCard, Grid2x2, Map } from "lucide-react";
import { WorkspaceUtilityPage } from "@/components/dashboard/workspace-utility-page";

export default function AdminGuidePage() {
  return (
    <WorkspaceUtilityPage
      eyebrow="Guide"
      title="Panduan setup Bookinaja"
      description="Jalur cepat untuk memahami resource, booking, payment, dan halaman publik workspace."
      icon={Map}
      actions={[
        {
          title: "Resource & harga",
          description: "Pastikan unit, durasi, dan harga sudah siap sebelum customer booking.",
          href: "/admin/resources",
          icon: Grid2x2,
        },
        {
          title: "Booking calendar",
          description: "Lihat bagaimana slot booking masuk ke operasional harian.",
          href: "/admin/bookings/calendar",
          icon: CalendarRange,
        },
        {
          title: "Metode pembayaran",
          description: "Atur Midtrans, cash, transfer manual, dan QRIS static.",
          href: "/admin/settings/payment-methods",
          icon: CreditCard,
        },
        {
          title: "Dokumentasi publik",
          description: "Buka dokumentasi Bookinaja untuk overview produk.",
          href: "/documentation",
          icon: BookOpen,
        },
      ]}
    />
  );
}
