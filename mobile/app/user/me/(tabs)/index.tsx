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
import { DiscoveryFeedResponse } from "@/lib/discovery";

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
    return pool.filter((item) => {
      const itemKey = `${item.item_kind || "tenant"}:${item.id}:${item.slug}`;
      if (seen.has(itemKey)) {
        return false;
      }
      seen.add(itemKey);
      return true;
    }).slice(0, 4);
  }, [feedQuery.data]);

  const firstName = summaryQuery.data?.customer?.name?.split(" ")[0] || "Customer";
  const activeBookings = summaryQuery.data?.active_bookings || [];
  const activeOrders = summaryQuery.data?.active_orders || [];
  const activeItems = [
    ...activeBookings.map((item) => ({ ...item, kind: "booking" as const })),
    ...activeOrders.map((item) => ({ ...item, kind: "order" as const })),
  ].slice(0, 4);
  const activeCount = activeItems.length;

  return (
    <ScreenShell
      eyebrow="Customer"
      title={`Halo, ${firstName}`}
      description="Lanjutkan sesi aktifmu, cek transaksi penting, atau lompat ke tenant yang lagi relevan buat kamu."
    >
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
      ) : null}

      <View style={{ gap: 2 }}>
        <Text selectable style={{ color: "#0f172a", fontSize: 19, fontWeight: "900" }}>
          Temukan tenant berikutnya
        </Text>
        <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
          Rekomendasi yang paling layak dibuka dari mobile.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
        {suggestions.map((item, index) => (
          <View key={`${item.item_kind || "tenant"}-${item.id}-${item.slug}-${index}`} style={{ width: 308 }}>
            <DiscoveryCard item={item} />
          </View>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}
