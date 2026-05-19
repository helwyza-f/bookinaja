import { useMemo } from "react";
import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { DiscoveryCard } from "@/components/discovery-card";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { DiscoveryFeedResponse, getDiscoverySummary, getDiscoveryTitle } from "@/lib/discovery";

type CustomerSummary = {
  customer?: {
    name?: string;
    tier?: string;
  };
  points?: number;
  active_bookings?: Array<{ id: string; tenant_name?: string; status?: string }>;
  active_orders?: Array<{ id: string; tenant_name?: string; status?: string }>;
};

export default function CustomerHomeScreen() {
  const guard = useAuthGuard("customer");
  const summaryQuery = useQuery({
    queryKey: ["customer-summary"],
    queryFn: () => apiFetch<CustomerSummary>("/user/me/summary", { audience: "customer" }),
    enabled: guard.ready,
  });
  const feedQuery = useQuery({
    queryKey: ["customer-discover-feed"],
    queryFn: () => apiFetch<DiscoveryFeedResponse>("/user/me/discover/feed", { audience: "customer" }),
    enabled: guard.ready,
  });

  const suggestions = useMemo(() => {
    const feed = feedQuery.data;
    if (!feed) return [];
    const pool = [...feed.featured, ...feed.sections.flatMap((section) => section.items)];
    const seen = new Set<string>();
    return pool
      .filter((item) => {
      const itemKey = `${item.item_kind || "tenant"}:${item.id}:${item.slug}`;
      if (seen.has(itemKey)) {
        return false;
      }
      seen.add(itemKey);
      return true;
      })
      .slice(0, 6);
  }, [feedQuery.data]);

  const firstName = summaryQuery.data?.customer?.name?.split(" ")[0] || "Customer";
  const tier = summaryQuery.data?.customer?.tier || "Regular";
  const points = Number(summaryQuery.data?.points || 0);
  const activeBookings = summaryQuery.data?.active_bookings || [];
  const activeOrders = summaryQuery.data?.active_orders || [];
  const activeItems = [
    ...activeBookings.map((item) => ({ ...item, kind: "booking" as const })),
    ...activeOrders.map((item) => ({ ...item, kind: "order" as const })),
  ].slice(0, 4);
  const activeCount = activeItems.length;
  const featuredSuggestions = suggestions.slice(0, 3);
  const moreSuggestions = suggestions.slice(3, 6);
  const quickCategories = (feedQuery.data?.quick_categories || []).slice(0, 4);

  return (
    <ScreenShell
      eyebrow="Customer"
      title={`Halo, ${firstName}`}
      description="Lanjutkan sesi aktifmu, cek transaksi penting, atau lompat ke tenant yang lagi relevan buat kamu."
      includeBottomSafeArea={false}
    >
      <CardBlock>
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
                Ringkasan akunmu
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
                Biar sekali buka langsung kebaca apa yang perlu kamu lakukan.
              </Text>
            </View>
            <View
              style={{
                borderRadius: 999,
                backgroundColor: "#eff6ff",
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Text selectable style={{ color: "#1d4ed8", fontSize: 11, fontWeight: "800" }}>
                {tier}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              {
                label: "Aktif",
                value: String(activeCount),
                hint: activeCount ? "Perlu dipantau" : "Masih kosong",
                tone: "#2563eb",
                bg: "#eff6ff",
                icon: "bolt" as const,
              },
              {
                label: "Poin",
                value: points.toLocaleString("id-ID"),
                hint: "Siap dipakai",
                tone: "#059669",
                bg: "#ecfdf5",
                icon: "workspace-premium" as const,
              },
              {
                label: "Tenant",
                value: String(suggestions.length),
                hint: "Relevan buatmu",
                tone: "#7c3aed",
                bg: "#f5f3ff",
                icon: "storefront" as const,
              },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  borderRadius: 20,
                  backgroundColor: item.bg,
                  paddingHorizontal: 12,
                  paddingVertical: 14,
                  gap: 7,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    backgroundColor: "#ffffff",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name={item.icon} size={18} color={item.tone} />
                </View>
                <View style={{ gap: 2 }}>
                  <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                    {item.label.toUpperCase()}
                  </Text>
                  <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
                    {item.value}
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 11 }}>
                    {item.hint}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </CardBlock>

      <CardBlock>
        <View style={{ gap: 12 }}>
          <View style={{ gap: 2 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
              Mau ke mana?
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
              Shortcut paling sering dipakai dari home.
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              {
                href: "/user/me/active" as const,
                label: "Cek aktif",
                hint: "Booking dan order",
                icon: "bolt" as const,
                tone: "#2563eb",
                bg: "#eff6ff",
              },
              {
                href: "/discovery" as const,
                label: "Jelajah tenant",
                hint: "Cari tempat baru",
                icon: "travel-explore" as const,
                tone: "#0f766e",
                bg: "#ecfeff",
              },
              {
                href: "/user/me/profile" as const,
                label: "Profil",
                hint: "Akun dan preferensi",
                icon: "person-outline" as const,
                tone: "#7c3aed",
                bg: "#f5f3ff",
              },
            ].map((item) => (
              <Link key={item.label} href={item.href} asChild>
                <Pressable style={{ flex: 1 }}>
                  <View
                    style={{
                      minHeight: 112,
                      borderRadius: 22,
                      backgroundColor: item.bg,
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 14,
                        backgroundColor: "#ffffff",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons name={item.icon} size={20} color={item.tone} />
                    </View>
                    <View style={{ gap: 3 }}>
                      <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                        {item.label}
                      </Text>
                      <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 17 }}>
                        {item.hint}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </Link>
            ))}
          </View>
        </View>
      </CardBlock>

      {activeCount ? (
        <View style={{ gap: 10 }}>
          <View style={{ gap: 2 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 19, fontWeight: "900" }}>
              Lanjutkan yang aktif
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
              Masuk lagi ke sesi yang masih berjalan.
            </Text>
          </View>

          {activeItems.map((item) => (
            <Link
              key={`${item.kind}-${item.id}`}
              href={item.kind === "order" ? (`/user/me/orders/${item.id}` as const) : (`/user/me/bookings/${item.id}` as const)}
              asChild
            >
              <Pressable>
                <CardBlock>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 14,
                          backgroundColor: item.kind === "order" ? "#f8fafc" : "#eff6ff",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MaterialIcons
                          name={item.kind === "order" ? "receipt-long" : "event-seat"}
                          size={18}
                          color={item.kind === "order" ? "#475569" : "#2563eb"}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
                          {item.tenant_name || "Tenant"}
                        </Text>
                        <Text selectable style={{ color: "#475569", fontSize: 13 }}>
                          {item.kind === "order" ? "Order aktif" : "Booking aktif"}
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                  </View>
                </CardBlock>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : (
        <CardBlock>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                backgroundColor: "#eff6ff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="event-available" size={22} color="#2563eb" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                Belum ada yang aktif sekarang
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
                Tenang, kamu bisa langsung cari tenant baru atau lanjut jelajah dari rekomendasi di bawah.
              </Text>
            </View>
          </View>
        </CardBlock>
      )}

      <View style={{ gap: 2 }}>
        <Text selectable style={{ color: "#0f172a", fontSize: 19, fontWeight: "900" }}>
          Temukan tenant berikutnya
        </Text>
        <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
          Rekomendasi yang paling layak dibuka dari mobile.
        </Text>
      </View>

      {quickCategories.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {quickCategories.map((item) => (
            <View
              key={item}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "#dbeafe",
                backgroundColor: "#ffffff",
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text selectable style={{ color: "#475569", fontSize: 12, fontWeight: "800" }}>
                {item}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
        {featuredSuggestions.map((item, index) => (
          <View key={`${item.item_kind || "tenant"}-${item.id}-${item.slug}-${index}`} style={{ width: 308 }}>
            <DiscoveryCard item={item} />
          </View>
        ))}
      </ScrollView>

      {moreSuggestions.length ? (
        <CardBlock>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
                  Masih bisa kamu cek
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
                  Pilihan cepat kalau mau lanjut browsing tanpa pindah tab dulu.
                </Text>
              </View>
              <Link href="/discovery" asChild>
                <Pressable>
                  <Text selectable style={{ color: "#2563eb", fontSize: 13, fontWeight: "800" }}>
                    Buka jelajah
                  </Text>
                </Pressable>
              </Link>
            </View>

            {moreSuggestions.map((item) => (
              <Link key={`${item.item_kind || "tenant"}:${item.id}:${item.slug}`} href={`/tenant/${item.slug}` as const} asChild>
                <Pressable>
                  <View
                    style={{
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      backgroundColor: "#fbfdff",
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                          {getDiscoveryTitle(item)}
                        </Text>
                        <Text selectable numberOfLines={2} style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
                          {getDiscoverySummary(item)}
                        </Text>
                      </View>
                      <MaterialIcons name="arrow-forward" size={18} color="#94a3b8" />
                    </View>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {[
                        item.business_category || item.business_type,
                        item.starting_price ? `Mulai ${item.starting_price.toLocaleString("id-ID")}` : null,
                        item.resource_count ? `${item.resource_count} pilihan` : null,
                      ]
                        .filter(Boolean)
                        .slice(0, 3)
                        .map((badge) => (
                          <View
                            key={String(badge)}
                            style={{
                              borderRadius: 999,
                              backgroundColor: "#f8fafc",
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                            }}
                          >
                            <Text selectable style={{ color: "#475569", fontSize: 11, fontWeight: "800" }}>
                              {badge}
                            </Text>
                          </View>
                        ))}
                    </View>
                  </View>
                </Pressable>
              </Link>
            ))}
          </View>
        </CardBlock>
      ) : null}
    </ScreenShell>
  );
}
