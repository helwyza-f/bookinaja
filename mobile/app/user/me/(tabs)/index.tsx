import { useMemo } from "react";
import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
    return [...feed.featured, ...feed.sections.flatMap((section) => section.items)].slice(0, 4);
  }, [feedQuery.data]);

  const firstName = summaryQuery.data?.customer?.name?.split(" ")[0] || "Customer";
  const initials = String(summaryQuery.data?.customer?.name || "CU")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return (
    <ScreenShell
      eyebrow="Customer"
      title={`Halo, ${firstName}`}
      description="Lanjutkan sesi aktifmu, cek transaksi penting, atau lompat ke tenant yang lagi relevan buat kamu."
    >
      <LinearGradient
        colors={["#0f172a", "#1e3a8a", "#2563eb"]}
        style={{
          borderRadius: 28,
          padding: 18,
          gap: 16,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            right: -28,
            top: -18,
            width: 132,
            height: 132,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.12)",
          }}
        />
        <View
          style={{
            position: "absolute",
            left: -30,
            bottom: -42,
            width: 148,
            height: 148,
            borderRadius: 40,
            borderWidth: 1,
            borderColor: "rgba(191,219,254,0.18)",
            backgroundColor: "rgba(255,255,255,0.06)",
            transform: [{ rotate: "-12deg" }],
          }}
        />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text selectable style={{ color: "#bfdbfe", fontSize: 10, fontWeight: "800", letterSpacing: 2 }}>
              Customer hub
            </Text>
            <Text selectable style={{ color: "#ffffff", fontSize: 22, fontWeight: "900", lineHeight: 26 }}>
              Semua yang penting buat booking ada di sini.
            </Text>
          </View>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text selectable style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>
              {initials || "CU"}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[
            { label: "Points", value: String(summaryQuery.data?.points || 0) },
            { label: "Aktif", value: String((summaryQuery.data?.active_bookings?.length || 0) + (summaryQuery.data?.active_orders?.length || 0)) },
            { label: "Tier", value: summaryQuery.data?.customer?.tier || "NEW" },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                minWidth: "31%",
                borderRadius: 18,
                backgroundColor: "rgba(255,255,255,0.1)",
                paddingHorizontal: 12,
                paddingVertical: 10,
                gap: 3,
              }}
            >
              <Text selectable style={{ color: "#bfdbfe", fontSize: 9, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>
                {item.label}
              </Text>
              <Text selectable style={{ color: "#ffffff", fontSize: 15, fontWeight: "900" }}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {[
          { href: "/user/me/active" as const, label: "Booking aktif", hint: "Lihat sesi" },
          { href: "/user/me/history" as const, label: "Riwayat", hint: "Track transaksi" },
          { href: "/discovery" as const, label: "Jelajah", hint: "Cari tenant" },
          { href: "/user/me/profile" as const, label: "Profil", hint: "Update akun" },
        ].map((item) => (
          <Link key={item.label} href={item.href} asChild>
            <View
              style={{
                width: "48%",
                borderRadius: 22,
                borderWidth: 1,
                borderColor: "#dbeafe",
                backgroundColor: "#ffffff",
                paddingHorizontal: 14,
                paddingVertical: 14,
                gap: 4,
              }}
            >
              <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                {item.label}
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 17 }}>
                {item.hint}
              </Text>
            </View>
          </Link>
        ))}
      </View>

      {(summaryQuery.data?.active_bookings || []).slice(0, 2).map((item) => (
        <Link key={`booking-${item.id}`} href={`/user/me/bookings/${item.id}` as const} asChild>
          <View>
            <CardBlock>
              <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
                {item.tenant_name || "Booking aktif"}
              </Text>
              <Text selectable style={{ color: "#475569", fontSize: 14 }}>
                {item.status || "status"}
              </Text>
            </CardBlock>
          </View>
        </Link>
      ))}

      {(summaryQuery.data?.active_orders || []).slice(0, 2).map((item) => (
        <Link key={`order-${item.id}`} href={`/user/me/orders/${item.id}` as const} asChild>
          <View>
            <CardBlock>
              <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
                {item.tenant_name || "Order aktif"}
              </Text>
              <Text selectable style={{ color: "#475569", fontSize: 14 }}>
                {item.status || "status"}
              </Text>
            </CardBlock>
          </View>
        </Link>
      ))}

      <View style={{ gap: 6 }}>
        <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1.8, textTransform: "uppercase" }}>
          Untukmu
        </Text>
        <Text selectable style={{ color: "#0f172a", fontSize: 20, fontWeight: "900" }}>
          Tenant yang layak dibuka sekarang
        </Text>
      </View>

      {suggestions.map((item) => (
        <DiscoveryCard key={item.id} item={item} />
      ))}
    </ScreenShell>
  );
}
