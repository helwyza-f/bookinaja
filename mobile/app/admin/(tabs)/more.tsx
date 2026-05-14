import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { Text } from "react-native";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useSession } from "@/providers/session-provider";
import { getCentralAdminAuthUrl, getTenantWebUrl } from "@/lib/urls";

export default function AdminMoreScreen() {
  const session = useSession();

  return (
    <ScreenShell eyebrow="Admin" title="More" description="Shortcut ke surface web yang belum dipindah penuh ke native dan kontrol session admin.">
      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Lanjut ke dashboard web
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
          Untuk area yang masih kompleks seperti settings discovery, page builder, atau promo.
        </Text>
        <CtaButton
          label="Buka tenant di web"
          onPress={() => {
            if (!session.tenantSlug) return;
            void WebBrowser.openBrowserAsync(getTenantWebUrl(session.tenantSlug, "/admin/dashboard"));
          }}
        />
      </CardBlock>
      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Auth pusat
        </Text>
        <CtaButton
          label="Buka auth admin pusat"
          onPress={() => {
            void WebBrowser.openBrowserAsync(getCentralAdminAuthUrl({ tenantSlug: session.tenantSlug }));
          }}
        />
      </CardBlock>
      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Session
        </Text>
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
