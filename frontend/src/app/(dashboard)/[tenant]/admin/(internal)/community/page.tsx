import { LifeBuoy, MessageCircle, UsersRound } from "lucide-react";
import { WorkspaceUtilityPage } from "@/components/dashboard/workspace-utility-page";

export default function AdminCommunityPage() {
  return (
    <WorkspaceUtilityPage
      eyebrow="Community"
      title="Komunitas & bantuan"
      description="Tempat owner mendapatkan bantuan, diskusi produk, dan update workflow Bookinaja."
      icon={LifeBuoy}
      actions={[
        {
          title: "Support owner",
          description: "Buka pengaturan akun dan workspace untuk konteks bantuan paling cepat.",
          href: "/admin/settings/akun",
          icon: MessageCircle,
        },
        {
          title: "Workspace team",
          description: "Atur akses staff sebelum mengundang tim operasional.",
          href: "/admin/settings/staff",
          icon: UsersRound,
        },
      ]}
      note="Link Discord resmi belum dikonfigurasi di environment, jadi halaman ini tetap internal dulu agar sidebar tidak mengarah ke URL yang salah."
    />
  );
}
