import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollView, TextInput, View } from "react-native";
import { apiFetch } from "@/lib/api";
import {
  EmptyStateCard,
  FilterChip,
  ListRow,
  SectionHeader,
  StatusPill,
  SummaryPair,
} from "@/components/admin-primitives";
import { PatternDashboardCard } from "@/components/admin-patterns";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { adminUi } from "@/theme/admin-ui";
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
import { hasAdminPermission } from "@/lib/admin-access";
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
  const canCreateBookings = hasAdminPermission(identityQuery.data, "bookings.create");
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
    <ScreenShell
      eyebrow="Admin"
      title="Bookings"
      description="Queue booking, sesi aktif, dan pembayaran dalam satu alur."
      includeBottomSafeArea={false}
      bottomDockInset={118}
    >
      {canCreateBookings ? (
        <CardBlock>
          <SectionHeader title="Buat booking" description="Masuk ke flow scheduled atau walk-in tanpa buka web." />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <CtaButton
                label="Scheduled"
                onPress={() => router.push({ pathname: "/admin/bookings/new", params: { mode: "scheduled" } })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <CtaButton
                tone="secondary"
                label="Walk-in"
                onPress={() => router.push({ pathname: "/admin/bookings/new", params: { mode: "walkin" } })}
              />
            </View>
          </View>
        </CardBlock>
      ) : null}

      <PatternDashboardCard
          title="Kontrol booking"
          description="Filter yang butuh aksi, cek sesi aktif, lalu masuk ke detail booking untuk eksekusi."
          badge="Queue"
      >
        <View style={{ flexDirection: "row", gap: 10 }}>
          <SummaryPair
            label="Perlu aksi"
            value={String(bookings.filter((item) => isAdminBookingActionable(item)).length)}
            accent
          />
          <SummaryPair
            label="Aktif"
            value={String(bookings.filter((item) => ["active", "ongoing"].includes(String(item.status || "").toLowerCase())).length)}
          />
        </View>
      </PatternDashboardCard>

      <CardBlock>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Cari customer / WA / resource"
          placeholderTextColor="#94a3b8"
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: adminUi.colors.line,
            backgroundColor: adminUi.colors.surfaceMuted,
            paddingHorizontal: 14,
            paddingVertical: 14,
            color: adminUi.colors.textStrong,
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
            return <FilterChip key={item.key} label={item.label} active={active} onPress={() => setFilter(item.key)} />;
          })}
        </ScrollView>
      </CardBlock>

      <CardBlock>
        <SectionHeader title="Daftar booking" description={`${filtered.length} booking cocok dengan filter aktif.`} />
        {filtered.map((item) => {
        const meta = getAdminBookingStatusMeta(item);
        return (
          <ListRow
            key={item.id}
            onPress={() =>
              router.push({
                pathname: "/admin/bookings/[id]",
                params: { id: item.id },
              })
            }
            title={item.customer_name || "Customer booking"}
            subtitle={`${item.resource_name || "Resource"} • ${item.customer_phone || "-"}`}
            meta={`${formatDateTime(item.start_time)} • ${formatAmount(getAdminBookingTotal(item))} • ${String(item.payment_status || "pending")}`}
            badge={<StatusPill label={meta.label} tone={mapMetaTone(meta.label)} />}
          />
        );
      })}
      </CardBlock>

      {!bookingsQuery.isLoading && !filtered.length ? (
        <EmptyStateCard title="Tidak ada hasil" description="Coba ubah filter atau kata kunci pencarian." />
      ) : null}
    </ScreenShell>
  );
}

function mapMetaTone(label: string): "blue" | "success" | "amber" | "danger" | "slate" {
  const normalized = label.toLowerCase();
  if (normalized.includes("selesai")) return "slate";
  if (normalized.includes("aktif") || normalized.includes("berjalan")) return "success";
  if (normalized.includes("batal")) return "danger";
  if (normalized.includes("pending")) return "amber";
  return "blue";
}
