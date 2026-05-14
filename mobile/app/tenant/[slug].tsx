import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { DiscoveryFeedResponse } from "@/lib/discovery";
import { formatCurrency } from "@/lib/format";
import { getCentralCustomerAuthUrl, getTenantWebUrl } from "@/lib/urls";

export default function TenantDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const feedQuery = useQuery({
    queryKey: ["discovery-feed", "tenant-detail"],
    queryFn: () => apiFetch<DiscoveryFeedResponse>("/public/discover/feed"),
  });

  const item =
    feedQuery.data?.featured.find((candidate) => candidate.slug === slug) ||
    feedQuery.data?.sections.flatMap((section) => section.items).find((candidate) => candidate.slug === slug);

  return (
    <ScreenShell
      eyebrow="Tenant"
      title={item?.name || slug}
      description={item?.tagline || "Detail tenant ini dibangun dari feed discovery yang sama dengan web."}
    >
      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Harga mulai
        </Text>
        <Text selectable style={{ color: "#1d4ed8", fontSize: 26, fontWeight: "900" }}>
          {formatCurrency(item?.starting_price)}
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
          {item?.about_us || "Buka halaman web tenant untuk booking flow yang lebih lengkap sementara parity mobile terus dibangun."}
        </Text>
      </CardBlock>
      <CtaButton
        label="Masuk sebagai customer"
        onPress={() => {
          void WebBrowser.openBrowserAsync(getCentralCustomerAuthUrl("login", { tenantSlug: slug, next: "/" }));
        }}
      />
      <CtaButton
        tone="secondary"
        label="Buka tenant di web"
        onPress={() => {
          void WebBrowser.openBrowserAsync(getTenantWebUrl(slug, "/"));
        }}
      />
    </ScreenShell>
  );
}
