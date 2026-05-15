import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { DiscoveryTenant, getDiscoverySummary, getDiscoveryTitle } from "@/lib/discovery";

function getBannerSource(item: DiscoveryTenant) {
  return item.feed_image_url || item.featured_image_url || item.banner_url || "";
}

function getLogoSource(item: DiscoveryTenant) {
  return item.logo_url || "";
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "T";
}

export function DiscoveryCard({ item }: { item: DiscoveryTenant }) {
  const bannerSource = getBannerSource(item);
  const logoSource = getLogoSource(item);
  const badges = [
    item.starting_price ? `Mulai ${Intl.NumberFormat("id-ID").format(item.starting_price)}` : null,
    item.resource_count ? `${item.resource_count} pilihan` : item.business_category || item.business_type,
  ].filter(Boolean);

  return (
    <Link href={`/tenant/${item.slug}` as const} asChild>
      <Pressable>
        <View
          style={{
            borderRadius: 32,
            overflow: "hidden",
            backgroundColor: "#ffffff",
            borderWidth: 1,
            borderColor: "#dbeafe",
            shadowColor: "#0f172a",
            shadowOpacity: 0.065,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
          }}
        >
          <View
            style={{
              height: 248,
              backgroundColor: item.primary_color || "#c7d2fe",
            }}
          >
            {bannerSource ? (
              <Image source={bannerSource} contentFit="cover" style={{ width: "100%", height: "100%" }} />
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    top: 20,
                    right: -10,
                    width: 110,
                    height: 110,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.16)",
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    bottom: -18,
                    left: -18,
                    width: 126,
                    height: 126,
                    borderRadius: 34,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.22)",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    transform: [{ rotate: "-12deg" }],
                  }}
                />
                <Text selectable style={{ color: "#ffffff", fontSize: 52, fontWeight: "900" }}>
                  {getInitial(item.name)}
                </Text>
              </View>
            )}

            <View
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(15,23,42,0.18)",
              }}
            />

            <View
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                bottom: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.98)",
                  borderWidth: 1,
                  borderColor: "rgba(226,232,240,0.92)",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  shadowColor: "#0f172a",
                  shadowOpacity: 0.08,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 2,
                }}
              >
                {logoSource ? (
                  <Image source={logoSource} contentFit="cover" style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
                    {getInitial(item.name)}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  selectable
                  numberOfLines={2}
                  style={{
                    color: "#ffffff",
                    fontSize: 24,
                    fontWeight: "900",
                    lineHeight: 27,
                  }}
                >
                  {item.name}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {badges.slice(0, 2).map((badge) => (
                <View
                  key={String(badge)}
                  style={{
                    borderRadius: 999,
                    backgroundColor: "#eff6ff",
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                  }}
                >
                  <Text selectable style={{ color: "#1d4ed8", fontSize: 11, fontWeight: "800" }}>
                    {badge}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                Lihat detail tenant
              </Text>
              <MaterialIcons name="arrow-forward" size={18} color="#94a3b8" />
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
