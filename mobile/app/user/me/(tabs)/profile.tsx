import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useSession } from "@/providers/session-provider";
import { getCentralCustomerAuthUrl } from "@/lib/urls";

type SettingsResponse = {
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

export default function CustomerProfileScreen() {
  const guard = useAuthGuard("customer");
  const session = useSession();
  const settingsQuery = useQuery({
    queryKey: ["customer-settings"],
    queryFn: () => apiFetch<SettingsResponse>("/user/me/settings", { audience: "customer" }),
    enabled: guard.ready,
  });

  return (
    <ScreenShell eyebrow="Customer" title="Profil" description="Area profil customer native plus handoff ke auth pusat untuk flow web yang masih aktif.">
      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
          {settingsQuery.data?.customer?.name || "Customer"}
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14 }}>
          {settingsQuery.data?.customer?.email || settingsQuery.data?.customer?.phone || "Kontak belum tersedia"}
        </Text>
      </CardBlock>
      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Auth pusat customer
        </Text>
        <CtaButton
          label="Buka login web"
          onPress={() => {
            void WebBrowser.openBrowserAsync(getCentralCustomerAuthUrl("login", { tenantSlug: session.tenantSlug }));
          }}
        />
      </CardBlock>
      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Session
        </Text>
        <CtaButton
          tone="secondary"
          label="Logout"
          onPress={() => {
            void session.signOutCustomer().then(() => router.replace("/user/login"));
          }}
        />
      </CardBlock>
    </ScreenShell>
  );
}
