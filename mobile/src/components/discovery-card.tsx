import { Link } from "expo-router";
import { Text, View } from "react-native";
import { CardBlock } from "@/components/card-block";
import { formatCurrency } from "@/lib/format";
import { DiscoveryTenant, getDiscoverySummary, getDiscoveryTitle } from "@/lib/discovery";

export function DiscoveryCard({ item }: { item: DiscoveryTenant }) {
  return (
    <Link href={`/tenant/${item.slug}` as const} asChild>
      <View>
        <CardBlock>
          <View
            style={{
              minHeight: 134,
              borderRadius: 24,
              backgroundColor: "#0f172a",
              padding: 16,
              justifyContent: "space-between",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                position: "absolute",
                right: -24,
                top: -18,
                width: 118,
                height: 118,
                borderRadius: 999,
                backgroundColor: "#1d4ed8",
                opacity: 0.24,
              }}
            />
            <View
              style={{
                position: "absolute",
                left: -30,
                bottom: -42,
                width: 132,
                height: 132,
                borderRadius: 34,
                borderWidth: 1,
                borderColor: "rgba(191,219,254,0.24)",
                backgroundColor: "rgba(148,163,184,0.08)",
                transform: [{ rotate: "-14deg" }],
              }}
            />
            <View
              style={{
                alignSelf: "flex-start",
                borderRadius: 999,
                backgroundColor: "rgba(219,234,254,0.12)",
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Text selectable style={{ color: "#bfdbfe", fontSize: 11, fontWeight: "800" }}>
                {item.business_category || item.business_type || "Tenant"}
              </Text>
            </View>
            <Text
              selectable
              style={{
                color: "#f8fafc",
                fontSize: 22,
                fontWeight: "900",
                letterSpacing: -0.5,
                lineHeight: 25,
                maxWidth: "82%",
              }}
            >
              {getDiscoveryTitle(item)}
            </Text>
          </View>

          <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
            {getDiscoverySummary(item)}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <View
              style={{
                borderRadius: 999,
                backgroundColor: "#eff6ff",
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text selectable style={{ color: "#1d4ed8", fontSize: 13, fontWeight: "800" }}>
                {formatCurrency(item.starting_price)}
              </Text>
            </View>
            <View
              style={{
                borderRadius: 999,
                backgroundColor: "#f8fafc",
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text selectable style={{ color: "#475569", fontSize: 13, fontWeight: "700" }}>
                {item.resource_count || 0} resource
              </Text>
            </View>
          </View>
        </CardBlock>
      </View>
    </Link>
  );
}
