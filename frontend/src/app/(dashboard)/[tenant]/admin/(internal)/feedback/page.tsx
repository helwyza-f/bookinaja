import { MessageSquare, Sparkles, Wrench } from "lucide-react";
import { WorkspaceUtilityPage } from "@/components/dashboard/workspace-utility-page";

export default function AdminFeedbackPage() {
  return (
    <WorkspaceUtilityPage
      eyebrow="Feedback"
      title="Bantu arahkan produk"
      description="Kumpulkan feedback operasional dan request fitur penting supaya workspace makin sesuai alur bisnis kamu."
      icon={MessageSquare}
      actions={[
        {
          title: "Request fitur",
          description: "Catat kebutuhan operasional yang belum tertutup oleh flow sekarang.",
          href: "/admin/settings/crm",
          icon: Sparkles,
        },
        {
          title: "Laporkan kendala",
          description: "Simpan konteks kendala dan buka area konfigurasi yang paling sering terkait.",
          href: "/admin/brand",
          icon: Wrench,
        },
      ]}
      note="Form feedback native bisa ditambahkan berikutnya setelah endpoint feedback disiapkan. Untuk sekarang item ini sudah ditempatkan sebagai surface utama, bukan tersembunyi di Settings."
    />
  );
}
