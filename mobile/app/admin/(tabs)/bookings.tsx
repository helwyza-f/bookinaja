import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useAdminIdentity } from "@/hooks/use-admin-identity";
import { useRealtime } from "@/hooks/use-realtime";
import {
  AdminBookingRow,
  getAdminBookingStatusMeta,
  getAdminBookingTotal,
  isAdminBookingActionable,
  patchAdminBookingList,
} from "@/lib/admin-bookings";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { BOOKING_EVENT_PREFIXES, matchesRealtimePrefix } from "@/lib/realtime/event-types";
import { tenantBookingsChannel, tenantDashboardChannel } from "@/lib/realtime/channels";

function formatAmount(value: number) {
  const formatted = formatCurrency(value);
  return formatted === "Cek harga" ? "Rp 0" : formatted;
}

export default function AdminBookingsScreen() {
  const guard = useAuthGuard("admin");
  const identityQuery = useAdminIdentity();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "action" | "active" | "done">("all");
  const bookingsQuery = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => apiFetch<AdminBookingRow[] | { items?: AdminBookingRow[] }>("/bookings", { audience: "admin" }),
    enabled: guard.ready,
  });

  useRealtime({
    enabled: Boolean(identityQuery.data?.tenant_id && guard.ready),
    channels: identityQuery.data?.tenant_id
      ? [tenantBookingsChannel(identityQuery.data.tenant_id), tenantDashboardChannel(identityQuery.data.tenant_id)]
      : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      queryClient.setQueryData<AdminBookingRow[] | { items?: AdminBookingRow[] }>(["admin-bookings"], (current) => {
        if (!current) return current;
        const nextItems = patchAdminBookingList(Array.isArray(current) ? current : current.items || [], event);
        return Array.isArray(current) ? nextItems : { ...current, items: nextItems };
      });
      void bookingsQuery.refetch();
    },
    onReconnect: () => {
      void bookingsQuery.refetch();
    },
  });

  const bookings = useMemo(() => {
    const payload = bookingsQuery.data;
    return Array.isArray(payload) ? payload : payload?.items || [];
  }, [bookingsQuery.data]);

  const filtered = useMemo(() => {
    return bookings.filter((item) => {
      const haystack = [item.customer_name, item.customer_phone, item.resource_name].join(" ").toLowerCase();
      const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "action"
            ? isAdminBookingActionable(item)
            : filter === "active"
              ? ["active", "ongoing", "confirmed"].includes(String(item.status || "").toLowerCase())
              : String(item.status || "").toLowerCase() === "completed";
      return matchesSearch && matchesFilter;
    });
  }, [bookings, filter, search]);

  return (
    <ScreenShell eyebrow="Admin" title="Bookings" description="Antrian booking, sesi berjalan, dan status pembayaran tenant.">
      <CardBlock>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Cari customer / WA / resource"
          placeholderTextColor="#94a3b8"
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#d6deea",
            backgroundColor: "#fbfdff",
            paddingHorizontal: 14,
            paddingVertical: 14,
            color: "#0f172a",
            fontSize: 15,
          }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[
            { key: "all" as const, label: `Semua ${bookings.length}` },
            { key: "action" as const, label: "Butuh aksi" },
            { key: "active" as const, label: "Aktif" },
            { key: "done" as const, label: "Selesai" },
          ].map((item) => {
            const active = filter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? "#2563eb" : "#e2e8f0",
                  backgroundColor: active ? "#eff6ff" : "#ffffff",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text selectable style={{ color: active ? "#1d4ed8" : "#475569", fontSize: 12, fontWeight: "800" }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </CardBlock>

      <CardBlock>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            {
              label: "Perlu aksi",
              value: String(bookings.filter((item) => isAdminBookingActionable(item)).length),
              tone: "#b45309",
              bg: "#fff7ed",
            },
            {
              label: "Aktif",
              value: String(bookings.filter((item) => ["active", "ongoing"].includes(String(item.status || "").toLowerCase())).length),
              tone: "#059669",
              bg: "#ecfdf5",
            },
          ].map((item) => (
            <View key={item.label} style={{ flex: 1, borderRadius: 18, backgroundColor: item.bg, paddingHorizontal: 14, paddingVertical: 14, gap: 4 }}>
              <Text selectable style={{ color: item.tone, fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                {item.label.toUpperCase()}
              </Text>
              <Text selectable style={{ color: "#0f172a", fontSize: 22, fontWeight: "900" }}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </CardBlock>

      {filtered.map((item) => {
        const meta = getAdminBookingStatusMeta(item);
        return (
          <Pressable key={item.id} onPress={() => router.push(`/admin/bookings/${item.id}`)}>
            <CardBlock>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
                    {item.customer_name || "Customer booking"}
                  </Text>
                  <Text selectable style={{ color: "#475569", fontSize: 13 }}>
                    {item.resource_name || "Resource"} / {item.customer_phone || "-"}
                  </Text>
                </View>
                <View style={{ borderRadius: 999, backgroundColor: meta.bg, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" }}>
                  <Text selectable style={{ color: meta.tone, fontSize: 11, fontWeight: "800" }}>
                    {meta.label}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 12, gap: 3 }}>
                  <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                    MULAI
                  </Text>
                  <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800" }}>
                    {formatDateTime(item.start_time)}
                  </Text>
                </View>
                <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 12, gap: 3 }}>
                  <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                    TOTAL
                  </Text>
                  <Text selectable style={{ color: "#1d4ed8", fontSize: 13, fontWeight: "900" }}>
                    {formatAmount(getAdminBookingTotal(item))}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialIcons name="payments" size={16} color="#94a3b8" />
                <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                  Payment {item.payment_status || "pending"}
                </Text>
              </View>
            </CardBlock>
          </Pressable>
        );
      })}

      {!bookingsQuery.isLoading && !filtered.length ? (
        <CardBlock>
          <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
            Belum ada booking yang cocok dengan filter ini.
          </Text>
        </CardBlock>
      ) : null}
    </ScreenShell>
  );
}
