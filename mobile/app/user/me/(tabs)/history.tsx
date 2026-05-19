import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { CustomerPortalItem, getBookingStatusMeta, getOrderStatusMeta } from "@/lib/customer-portal";

type HistoryResponse = {
  past_history?: CustomerPortalItem[];
  past_orders?: CustomerPortalItem[];
};

export default function CustomerHistoryScreen() {
  const guard = useAuthGuard("customer");
  const historyQuery = useQuery({
    queryKey: ["customer-history"],
    queryFn: () => apiFetch<HistoryResponse>("/user/me/history", { audience: "customer" }),
    enabled: guard.ready,
  });

  const items = [
    ...(historyQuery.data?.past_orders || []).map((item) => ({ ...item, kind: item.kind || "Order" })),
    ...(historyQuery.data?.past_history || []).map((item) => ({ ...item, kind: item.kind || "Booking" })),
  ].slice(0, 10);
  const bookingsCount = items.filter((item) => !String(item.kind || "").toLowerCase().includes("order")).length;
  const ordersCount = items.length - bookingsCount;
  const paidCount = items.filter((item) => {
    const payment = String(item.payment_status || "").toLowerCase();
    return payment === "paid" || payment === "settled";
  }).length;

  return (
    <ScreenShell
      eyebrow="Customer"
      title="Riwayat"
      description="Riwayat transaction customer mengikuti endpoint history yang sama dengan web."
      includeBottomSafeArea={false}
    >
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[
          {
            label: "Riwayat",
            value: String(items.length),
            hint: "Transaksi terakhir",
            tone: "#2563eb",
            bg: "#eff6ff",
            icon: "history" as const,
          },
          {
            label: "Booking",
            value: String(bookingsCount),
            hint: "Sesi tersimpan",
            tone: "#0f766e",
            bg: "#ecfeff",
            icon: "event-seat" as const,
          },
          {
            label: "Paid",
            value: String(paidCount),
            hint: "Sudah lunas",
            tone: "#7c3aed",
            bg: "#f5f3ff",
            icon: "payments" as const,
          },
        ].map((item) => (
          <View
            key={item.label}
            style={{
              flex: 1,
              borderRadius: 18,
              backgroundColor: item.bg,
              paddingHorizontal: 12,
              paddingVertical: 12,
              gap: 8,
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

      {items.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[
            { label: `Semua ${items.length}`, tone: "#0f172a", bg: "#ffffff", border: "#dbe4f0" },
            { label: `Booking ${bookingsCount}`, tone: "#2563eb", bg: "#eff6ff", border: "#dbeafe" },
            { label: `Order ${ordersCount}`, tone: "#0f766e", bg: "#ecfeff", border: "#c9f4f1" },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: item.border,
                backgroundColor: item.bg,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text selectable style={{ color: item.tone, fontSize: 12, fontWeight: "800" }}>
                {item.label}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {items.map((item) => {
        const isOrder = String(item.kind || "").toLowerCase().includes("order");
        const statusMeta = isOrder
          ? getOrderStatusMeta(item.status, item.payment_status, item.balance_due)
          : getBookingStatusMeta(item.status);

        return (
          <Link
            key={`${item.kind}-${item.id}`}
            href={isOrder ? (`/user/me/orders/${item.id}` as const) : (`/user/me/bookings/${item.id}` as const)}
            asChild
          >
            <Pressable>
              <CardBlock>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 16,
                        backgroundColor: isOrder ? "#f8fafc" : "#eff6ff",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons
                        name={isOrder ? "receipt-long" : "event-seat"}
                        size={18}
                        color={isOrder ? "#475569" : "#2563eb"}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 8 }}>
                      <View style={{ gap: 3 }}>
                        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
                          {item.tenant_name || "Tenant"}
                        </Text>
                        <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                          {item.resource_name || item.resource || (isOrder ? "Order" : "Booking")}
                        </Text>
                      </View>

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
                        <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                          {formatDateTime(item.date || item.start_time)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                    {isOrder ? "Order selesai" : "Booking tersimpan"}
                  </Text>
                  <Text selectable style={{ color: "#0f172a", fontSize: 12, fontWeight: "800" }}>
                    {formatCurrency(item.grand_total)}
                  </Text>
                </View>
              </CardBlock>
            </Pressable>
          </Link>
        );
      })}
      {!historyQuery.isLoading && !items.length ? (
        <CardBlock>
          <View style={{ alignItems: "center", gap: 12, paddingVertical: 8 }}>
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
              <MaterialIcons name="history" size={24} color="#2563eb" />
            </View>
            <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
              Riwayat masih kosong
            </Text>
            <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22, textAlign: "center" }}>
              Begitu kamu selesai booking atau order, rekam jejaknya akan muncul di sini.
            </Text>
            <Link href="/discovery" asChild>
              <Pressable
                style={{
                  borderRadius: 999,
                  backgroundColor: "#eff6ff",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text selectable style={{ color: "#2563eb", fontSize: 12, fontWeight: "800" }}>
                  Mulai jelajah
                </Text>
              </Pressable>
            </Link>
          </View>
        </CardBlock>
      ) : null}
    </ScreenShell>
  );
}
