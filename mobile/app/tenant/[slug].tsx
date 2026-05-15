import { Link, router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { formatCurrency } from "@/lib/format";
import { useSession } from "@/providers/session-provider";
import { PublicTenantProfile, PublicTenantResourcesResponse } from "@/lib/tenant-public";

function makeTenantPath(path: string, slug: string) {
  return `${path}${path.includes("?") ? "&" : "?"}slug=${encodeURIComponent(slug)}`;
}

function getInitial(name?: string) {
  return String(name || "T").trim().charAt(0).toUpperCase() || "T";
}

export default function TenantDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const session = useSession();

  const profileQuery = useQuery({
    queryKey: ["tenant-public-profile", slug],
    enabled: Boolean(slug),
    queryFn: () => apiFetch<PublicTenantProfile>(makeTenantPath("/public/profile", String(slug))),
  });

  const resourcesQuery = useQuery({
    queryKey: ["tenant-public-resources", slug],
    enabled: Boolean(slug),
    queryFn: () => apiFetch<PublicTenantResourcesResponse>(makeTenantPath("/public/resources", String(slug))),
  });

  const profile = profileQuery.data;
  const resources = resourcesQuery.data?.resources || [];
  const gallery = [profile?.banner_url, ...(profile?.gallery || [])].filter(Boolean) as string[];
  const logoSource = profile?.logo_url || "";
  const showLoginCta = !session.customerToken;
  const quickFacts = [
    profile?.business_category || profile?.business_type,
    profile?.open_time && profile?.close_time ? `${profile.open_time} - ${profile.close_time}` : null,
    resources.length ? `${resources.length} resource` : null,
  ].filter(Boolean);

  async function continueAsCustomer() {
    if (!slug) return;
    await session.setTenantSlug(String(slug));
    router.push("/user/login");
  }

  return (
    <ScreenShell
      eyebrow="Tenant"
      title={profile?.name || String(slug || "Tenant")}
      description={profile?.tagline || profile?.slogan || "Pilih resource yang paling cocok, lalu lanjut booking langsung dari app."}
    >
      <View style={{ gap: 10 }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {(gallery.length ? gallery : [""]).map((source, index) => (
            <View
              key={`${source || "fallback"}-${index}`}
              style={{
                width: 356,
                height: 244,
                borderRadius: 24,
                overflow: "hidden",
                backgroundColor: profile?.primary_color || "#dbeafe",
              }}
            >
              {source ? (
                <Image source={source} contentFit="cover" style={{ width: "100%", height: "100%" }} />
              ) : (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: profile?.primary_color || "#dbeafe",
                  }}
                >
                  <Text selectable style={{ color: "#ffffff", fontSize: 54, fontWeight: "900" }}>
                    {getInitial(profile?.name)}
                  </Text>
                </View>
              )}

              <View
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(15,23,42,0.24)",
                }}
              />

              <View
                style={{
                  position: "absolute",
                  left: 18,
                  right: 18,
                  bottom: 18,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    backgroundColor: "rgba(255,255,255,0.97)",
                    borderWidth: 1,
                    borderColor: "rgba(226,232,240,0.9)",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {logoSource ? (
                    <Image source={logoSource} contentFit="cover" style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <Text selectable style={{ color: "#0f172a", fontSize: 20, fontWeight: "900" }}>
                      {getInitial(profile?.name)}
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <Text selectable style={{ color: "#ffffff", fontSize: 22, fontWeight: "900", lineHeight: 25 }}>
                    {profile?.name || slug}
                  </Text>
                  <Text selectable numberOfLines={2} style={{ color: "rgba(255,255,255,0.84)", fontSize: 13, lineHeight: 18 }}>
                    {profile?.tagline || profile?.business_category || profile?.business_type || "Tenant Bookinaja"}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        {gallery.length > 1 ? (
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
            {gallery.map((_, index) => (
              <View
                key={`gallery-dot-${index}`}
                style={{
                  width: index === 0 ? 20 : 6,
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: index === 0 ? "#2563eb" : "#cbd5e1",
                }}
              />
            ))}
          </View>
        ) : null}
      </View>

      <CardBlock>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {quickFacts.map((item) => (
            <View
              key={String(item)}
              style={{
                borderRadius: 999,
                backgroundColor: "#eff6ff",
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text selectable style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "800" }}>
                {item}
              </Text>
            </View>
          ))}
        </View>

        <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
          {profile?.about_us || "Bisnis ini sudah aktif di Bookinaja dan siap dibuka penuh dari app."}
        </Text>

        {showLoginCta ? <CtaButton label="Masuk untuk booking" onPress={() => void continueAsCustomer()} /> : null}
      </CardBlock>

      <View style={{ gap: 2 }}>
        <Text selectable style={{ color: "#0f172a", fontSize: 20, fontWeight: "900" }}>
          Pilihan resource
        </Text>
        <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
          Buka detail resource untuk lihat paket, jadwal, dan langkah booking.
        </Text>
      </View>

      {resources.map((resource) => (
        <Link key={resource.id} href={`/tenant/${slug}/resource/${resource.id}` as const} asChild>
          <Pressable>
            <CardBlock>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 18,
                    overflow: "hidden",
                    backgroundColor: "#f8fafc",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {resource.image_url ? (
                    <Image source={resource.image_url} contentFit="cover" style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <MaterialIcons name="image" size={26} color="#94a3b8" />
                  )}
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
                    {resource.name}
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>
                    {resource.primary_offer_name || resource.category || resource.operating_mode || "Resource"}
                  </Text>
                  {resource.description ? (
                    <Text selectable numberOfLines={2} style={{ color: "#94a3b8", fontSize: 12, lineHeight: 18 }}>
                      {resource.description}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ gap: 3 }}>
                  <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                    MULAI DARI
                  </Text>
                  <Text selectable style={{ color: "#1d4ed8", fontSize: 19, fontWeight: "900" }}>
                    {formatCurrency(resource.starting_price)}
                  </Text>
                </View>

                {resource.primary_offer_name ? (
                  <View
                    style={{
                      borderRadius: 999,
                      backgroundColor: "#eff6ff",
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                    }}
                  >
                    <Text selectable style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "800" }}>
                      {resource.primary_offer_name}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    borderRadius: 999,
                    backgroundColor: resource.operating_mode === "direct_sale" ? "#ecfeff" : "#eef2ff",
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                  }}
                >
                  <Text
                    selectable
                    style={{
                      color: resource.operating_mode === "direct_sale" ? "#0f766e" : "#3730a3",
                      fontSize: 11,
                      fontWeight: "800",
                    }}
                  >
                    {resource.operating_mode === "direct_sale" ? "Beli langsung" : "Booking waktu"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text selectable style={{ color: "#64748b", fontSize: 12, fontWeight: "800" }}>
                    Buka detail
                  </Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#94a3b8" />
                </View>
              </View>
            </CardBlock>
          </Pressable>
        </Link>
      ))}

      {!resourcesQuery.isLoading && !resources.length ? (
        <CardBlock>
          <View style={{ alignItems: "center", gap: 10, paddingVertical: 10 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: "#eff6ff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="inventory-2" size={24} color="#2563eb" />
            </View>
            <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
              Resource belum ditampilkan
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 14, lineHeight: 21, textAlign: "center" }}>
              Tenant ini belum punya katalog publik yang siap dibuka di app.
            </Text>
          </View>
        </CardBlock>
      ) : null}
    </ScreenShell>
  );
}
