import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { apiFetch } from "@/lib/api";
import { HeroPanel, SectionHeader } from "@/components/admin-primitives";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { QuickLinkCard } from "@/components/quick-link-card";
import { ScreenShell } from "@/components/screen-shell";
import { StatTile } from "@/components/stat-tile";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useAdminIdentity } from "@/hooks/use-admin-identity";
import { hasAdminPermission, isOwner } from "@/lib/admin-access";
import { getTenantWebUrl } from "@/lib/urls";
import { useSession } from "@/providers/session-provider";

type BillingSubscription = {
  plan?: string;
  status?: string;
  current_period_end?: string;
};

type OnboardingSummary = {
  progress_percent?: number;
};

export default function AdminWorkspaceScreen() {
  const guard = useAuthGuard("admin");
  const session = useSession();
  const identity = useAdminIdentity();
  const user = identity.data;
  const workspaceQuery = useQuery({
    queryKey: ["admin-mobile-workspace"],
    enabled: guard.ready,
    queryFn: async () => {
      const canOwner = isOwner(user);
      const [profileRes, billingRes, onboardingRes] = await Promise.allSettled([
        apiFetch<{ name?: string; business_category?: string }>("/admin/profile", { audience: "admin" }),
        canOwner ? apiFetch<BillingSubscription>("/billing/subscription", { audience: "admin" }) : Promise.resolve(null),
        canOwner ? apiFetch<OnboardingSummary>("/admin/tenant/onboarding-summary", { audience: "admin" }) : Promise.resolve(null),
      ]);

      return {
        profile: profileRes.status === "fulfilled" ? profileRes.value : null,
        billing: billingRes.status === "fulfilled" ? billingRes.value : null,
        onboarding: onboardingRes.status === "fulfilled" ? onboardingRes.value : null,
      };
    },
  });

  const profile = workspaceQuery.data?.profile;
  const billing = workspaceQuery.data?.billing;
  const onboarding = workspaceQuery.data?.onboarding;

  return (
    <ScreenShell
      eyebrow="Workspace"
      title={profile?.name || session.tenantSlug || "Admin workspace"}
      description="Surface admin mobile untuk setup bisnis, tools internal, dan akses subscription tanpa harus bolak-balik ke web."
      includeBottomSafeArea={false}
      bottomDockInset={118}
    >
      <CardBlock>
        <HeroPanel
          eyebrow="Workspace"
          title="Pusat workspace"
          description="Masuk ke setup tenant, modul bisnis, dan billing handoff dari satu tempat."
          tone="slate"
        />
      </CardBlock>

      <CardBlock>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatTile label="Role" value={String(user?.role || "staff")} hint="Hak akses admin saat ini" tone="blue" />
          <StatTile label="Setup" value={`${Number(onboarding?.progress_percent || 0)}%`} hint="Kesiapan bisnis tenant" tone="emerald" />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatTile label="Plan" value={String(billing?.plan || "tenant")} hint={String(billing?.status || "active")} tone="violet" />
          <StatTile label="Kategori" value={String(profile?.business_category || "-")} hint="Context bisnis saat ini" tone="slate" />
        </View>
      </CardBlock>

      <CardBlock>
        <SectionHeader title="Modules" description="Akses area bisnis inti dari mobile admin." />
        <View style={{ gap: 10 }}>
          <QuickLinkCard
            label="Business setup"
            description="Lihat progress onboarding tenant, identitas bisnis, dan setup dasar outlet."
            icon={<MaterialIcons name="business-center" size={20} color="#2563eb" />}
            badge={`${Number(onboarding?.progress_percent || 0)}%`}
            onPress={() => router.push("/admin/business")}
          />
          {hasAdminPermission(user, "resources.read") ? (
            <QuickLinkCard
              label="Resources"
              description="Masuk ke daftar resource untuk cek kesiapan operasional lapangan."
              icon={<MaterialIcons name="grid-view" size={20} color="#2563eb" />}
              onPress={() => router.push("/admin/resources")}
            />
          ) : null}
          {hasAdminPermission(user, "fnb.read") ? (
            <QuickLinkCard
              label="Menu F&B"
              description="Pantau katalog jual tanpa buka dashboard desktop."
              icon={<MaterialIcons name="restaurant-menu" size={20} color="#2563eb" />}
              onPress={() => router.push("/admin/menu")}
            />
          ) : null}
          {hasAdminPermission(user, "expenses.read") ? (
            <QuickLinkCard
              label="Expenses"
              description="Cek pengeluaran terbaru dan total biaya tenant."
              icon={<MaterialIcons name="receipt-long" size={20} color="#2563eb" />}
              onPress={() => router.push("/admin/expenses")}
            />
          ) : null}
        </View>
      </CardBlock>

      <CardBlock>
        <SectionHeader title="Billing" description="Tetap web-only untuk checkout plan, invoice, dan perubahan subscription." />
        <View style={{ gap: 10 }}>
          <CtaButton
            label="Buka billing di web"
            onPress={() => {
              if (!session.tenantSlug) return;
              void WebBrowser.openBrowserAsync(getTenantWebUrl(session.tenantSlug, "/admin/settings/billing"));
            }}
            disabled={!session.tenantSlug}
          />
          <CtaButton
            tone="secondary"
            label="Buka subscription checkout"
            onPress={() => {
              if (!session.tenantSlug) return;
              void WebBrowser.openBrowserAsync(getTenantWebUrl(session.tenantSlug, "/admin/settings/billing/subscribe"));
            }}
            disabled={!session.tenantSlug}
          />
        </View>
      </CardBlock>

      <CardBlock>
        <SectionHeader title="Session" description="Keluar dari admin mobile saat shift selesai." />
        <CtaButton
          tone="secondary"
          label="Logout admin"
          onPress={() => {
            void session.signOutAdmin().then(() => router.replace("/admin/login"));
          }}
        />
      </CardBlock>
    </ScreenShell>
  );
}
