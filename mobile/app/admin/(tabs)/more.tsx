import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useSession } from "@/providers/session-provider";
import { getCentralAdminAuthUrl, getTenantWebUrl } from "@/lib/urls";

export default function AdminMoreScreen() {
  const session = useSession();

  return (
    <ScreenShell eyebrow="Admin" title="More" description="Area lanjutan untuk pengaturan tenant, billing, dan kontrol session admin.">
      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Lanjutan operasional
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
          Pakai web untuk area yang memang masih lebih kompleks seperti analytics, promo, billing, atau page builder.
        </Text>
        <View style={{ gap: 10 }}>
          <CtaButton
            label="Buka dashboard web"
            onPress={() => {
              if (!session.tenantSlug) return;
              void WebBrowser.openBrowserAsync(getTenantWebUrl(session.tenantSlug, "/admin/dashboard"));
            }}
          />
          <CtaButton
            tone="secondary"
            label="Buka auth admin pusat"
            onPress={() => {
              void WebBrowser.openBrowserAsync(getCentralAdminAuthUrl({ tenantSlug: session.tenantSlug }));
            }}
          />
        </View>
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
