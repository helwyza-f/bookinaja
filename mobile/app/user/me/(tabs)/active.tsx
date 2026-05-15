import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { ScreenShell } from "@/components/screen-shell";
import { useRealtime } from "@/hooks/use-realtime";
import { BOOKING_EVENT_PREFIXES, matchesRealtimePrefix } from "@/lib/realtime/event-types";
import { getBookingStatusMeta, getOrderStatusMeta } from "@/lib/customer-portal";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { customerBookingsChannel, customerOrdersChannel } from "@/lib/realtime/channels";
import { isRealtimeEnabledForAPI } from "@/lib/realtime/ws-client";

type ActiveResponse = {
  active_bookings?: Array<{ id: string; tenant_name?: string; status?: string }>;
  active_orders?: Array<{ id: string; tenant_name?: string; status?: string }>;
};

type MeResponse = {
  id?: string;
  customer_id?: string;
  customer?: {
    id?: string;
  };
};

export default function CustomerActiveScreen() {
  const guard = useAuthGuard("customer");
  const [activeTab, setActiveTab] = useState<"booking" | "order">("booking");
  const meQuery = useQuery({
    queryKey: ["customer-me"],
    queryFn: () => apiFetch<MeResponse>("/me", { audience: "customer" }),
    enabled: guard.ready && isRealtimeEnabledForAPI(),
    staleTime: 60_000,
  });
  const activeQuery = useQuery({
    queryKey: ["customer-active"],
    queryFn: () => apiFetch<ActiveResponse>("/user/me/active", { audience: "customer" }),
    enabled: guard.ready,
    refetchInterval: isRealtimeEnabledForAPI() ? false : 15_000,
  });
  const customerID = String(meQuery.data?.customer?.id || meQuery.data?.customer_id || meQuery.data?.id || "");

  useRealtime({
    enabled: guard.ready && isRealtimeEnabledForAPI() && Boolean(customerID),
    channels: customerID ? [customerBookingsChannel(customerID), customerOrdersChannel(customerID)] : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      void activeQuery.refetch();
    },
    onReconnect: () => {
      void activeQuery.refetch();
    },
  });

  const bookings = useMemo(
    () => (activeQuery.data?.active_bookings || []).map((item) => ({ ...item, kind: "booking" as const })),
    [activeQuery.data?.active_bookings],
  );
  const orders = useMemo(
    () => (activeQuery.data?.active_orders || []).map((item) => ({ ...item, kind: "order" as const })),
    [activeQuery.data?.active_orders],
  );
  const items = activeTab === "booking" ? bookings : orders;

  return (
    <ScreenShell eyebrow="Customer" title="Aktif" description="Semua sesi dan transaksi yang masih berjalan ada di sini.">
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          padding: 4,
          borderRadius: 16,
          backgroundColor: "#eef2f7",
        }}
      >
        {[
          { key: "booking" as const, label: `Booking${bookings.length ? ` (${bookings.length})` : ""}` },
          { key: "order" as const, label: `Order${orders.length ? ` (${orders.length})` : ""}` },
        ].map((tab) => {
          const selected = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                minHeight: 42,
                borderRadius: 12,
                backgroundColor: selected ? "#ffffff" : "transparent",
                justifyContent: "center",
                alignItems: "center",
                shadowColor: selected ? "#0f172a" : "transparent",
                shadowOpacity: selected ? 0.04 : 0,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: selected ? 1 : 0,
              }}
            >
              <Text selectable style={{ color: selected ? "#0f172a" : "#64748b", fontSize: 13, fontWeight: "800" }}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {items.map((item) => (
        <Link
          key={`${item.kind}-${item.id}`}
          href={
            item.kind === "order"
              ? (`/user/me/orders/${item.id}` as const)
              : (`/user/me/bookings/${item.id}` as const)
          }
          asChild
        >
          <Pressable>
            <CardBlock>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 15,
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
                    <Text selectable style={{ color: "#475569", fontSize: 14 }}>
                      {item.kind === "order" ? "Direct sale" : "Booking"}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  {(() => {
                    const statusMeta =
                      item.kind === "order"
                        ? getOrderStatusMeta(item.status, item.status, 0)
                        : getBookingStatusMeta(item.status);
                    return (
                  <View
                    style={{
                      borderRadius: 999,
                      backgroundColor: `${statusMeta.tone}14`,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text selectable style={{ color: statusMeta.tone, fontSize: 11, fontWeight: "800" }}>
                      {statusMeta.label}
                    </Text>
                  </View>
                    );
                  })()}
                  <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                </View>
              </View>
            </CardBlock>
          </Pressable>
        </Link>
      ))}
      {!activeQuery.isLoading && !items.length ? (
        <CardBlock>
          <View style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                backgroundColor: "#eff6ff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="inventory-2" size={24} color="#2563eb" />
            </View>
            <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
              {activeTab === "booking" ? "Belum ada booking aktif" : "Belum ada order aktif"}
            </Text>
            <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22, textAlign: "center" }}>
              {activeTab === "booking"
                ? "Booking yang masih berjalan atau menunggu sesi akan muncul di sini."
                : "Order direct sale yang masih berjalan akan muncul di sini."}
            </Text>
          </View>
        </CardBlock>
      ) : null}
    </ScreenShell>
  );
}
