import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useSession } from "@/providers/session-provider";

type AdminProfile = {
  id?: string;
  name?: string;
  business_category?: string;
  tagline?: string;
  subdomain?: string;
};

export default function AdminDashboardScreen() {
  const guard = useAuthGuard("admin");
  const session = useSession();
  const profileQuery = useQuery({
    queryKey: ["admin-profile"],
    queryFn: () => apiFetch<AdminProfile>("/admin/profile", { audience: "admin" }),
    enabled: guard.ready,
  });

  return (
    <ScreenShell
      eyebrow="Admin"
      title="Workspace tenant di app mulai dari panel inti."
      description="Shell admin mobile ini mengikuti flow web: dashboard, bookings, customers, lalu shortcut ke surface web untuk area yang masih lebih cocok dikerjakan di browser."
    >
      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
          {profileQuery.data?.name || session.tenantSlug || "Tenant"}
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
          {profileQuery.data?.tagline || "Profile tenant berhasil dihubungkan ke session native."}
        </Text>
      </CardBlock>
      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Baseline admin yang sudah siap
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
          Token admin disimpan secara native, route dipisah lewat Expo Router, dan surface utama sudah disusun agar nanti mudah diisi modul dashboard web satu per satu.
        </Text>
      </CardBlock>
    </ScreenShell>
  );
}
