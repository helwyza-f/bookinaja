import * as WebBrowser from "expo-web-browser";
import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { StatTile } from "@/components/stat-tile";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { getTenantWebUrl } from "@/lib/urls";
import { useSession } from "@/providers/session-provider";

type TenantProfile = {
  name?: string;
  slug?: string;
  business_category?: string;
  business_type?: string;
  tagline?: string;
  whatsapp_number?: string;
  address?: string;
  open_time?: string;
  close_time?: string;
  timezone?: string;
};

type OnboardingSummary = {
  progress_percent?: number;
  steps?: Array<{
    id: string;
    label: string;
    description: string;
    complete: boolean;
  }>;
};

export default function AdminBusinessScreen() {
  const guard = useAuthGuard("admin");
  const session = useSession();
  const query = useQuery({
    queryKey: ["admin-mobile-business"],
    enabled: guard.ready,
    queryFn: async () => {
      const [profile, summary] = await Promise.all([
        apiFetch<TenantProfile>("/admin/profile", { audience: "admin" }),
        apiFetch<OnboardingSummary>("/admin/tenant/onboarding-summary", { audience: "admin" }),
      ]);
      return { profile, summary };
    },
  });

  const profile = query.data?.profile;
  const summary = query.data?.summary;
  const completedSteps = (summary?.steps || []).filter((step) => step.complete).length;
  const totalSteps = (summary?.steps || []).length;

  return (
    <ScreenShell
      eyebrow="Workspace"
      title="Business setup"
      description="Identitas tenant, kontak, dan kesiapan onboarding bisnis dalam satu ringkasan mobile."
    >
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/admin/workspace"))}>
        <Text selectable style={{ color: "#64748b", fontSize: 13, fontWeight: "800" }}>
          Kembali
        </Text>
      </Pressable>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 22, fontWeight: "900" }}>
          {profile?.name || session.tenantSlug || "Tenant"}
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 21 }}>
          {profile?.tagline || "Ringkasan setup inti tenant untuk owner/admin."}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatTile label="Progress" value={`${Number(summary?.progress_percent || 0)}%`} hint="Kesiapan setup bisnis" tone="blue" />
          <StatTile label="Checklist" value={`${completedSteps}/${totalSteps || 0}`} hint="Langkah onboarding selesai" tone="emerald" />
        </View>
      </CardBlock>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Profil inti
        </Text>
        <InfoRow label="Slug" value={profile?.slug || "-"} />
        <InfoRow label="Kategori" value={profile?.business_category || "-"} />
        <InfoRow label="Tipe bisnis" value={profile?.business_type || "-"} />
        <InfoRow label="WhatsApp" value={profile?.whatsapp_number || "-"} />
        <InfoRow label="Alamat" value={profile?.address || "-"} />
        <InfoRow label="Operasional" value={profile?.open_time && profile?.close_time ? `${profile.open_time} - ${profile.close_time}` : "-"} />
        <InfoRow label="Timezone" value={profile?.timezone || "-"} />
      </CardBlock>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Step berikutnya
        </Text>
        {(summary?.steps || []).slice(0, 5).map((step) => (
          <View key={step.id} style={{ borderRadius: 18, backgroundColor: step.complete ? "#ecfdf5" : "#f8fafc", paddingHorizontal: 14, paddingVertical: 14, gap: 4 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
              {step.label}
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
              {step.description}
            </Text>
            <Text selectable style={{ color: step.complete ? "#059669" : "#b45309", fontSize: 11, fontWeight: "800" }}>
              {step.complete ? "Sudah rapi" : "Masih perlu dibereskan"}
            </Text>
          </View>
        ))}
      </CardBlock>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Public preview
        </Text>
        <CtaButton
          label="Buka landing tenant"
          onPress={() => {
            if (!session.tenantSlug) return;
            void WebBrowser.openBrowserAsync(getTenantWebUrl(session.tenantSlug, "/"));
          }}
          disabled={!session.tenantSlug}
        />
      </CardBlock>
    </ScreenShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
        {label.toUpperCase()}
      </Text>
      <Text selectable style={{ color: "#0f172a", fontSize: 14, lineHeight: 20 }}>
        {value}
      </Text>
    </View>
  );
}
