import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { apiFetch } from "@/lib/api";
import {
  EmptyStateCard,
  ListRow,
  SectionHeader,
  StatusPill,
  SummaryPair,
} from "@/components/admin-primitives";
import { PatternDashboardCard } from "@/components/admin-patterns";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useAdminIdentity } from "@/hooks/use-admin-identity";
import { useRealtime } from "@/hooks/use-realtime";
import { useSession } from "@/providers/session-provider";
import {
  AdminBookingRow,
  getAdminBookingStatusMeta,
  getAdminBookingTotal,
  patchAdminBookingList,
} from "@/lib/admin-bookings";
import { hasAdminPermission } from "@/lib/admin-access";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { BOOKING_EVENT_PREFIXES, matchesRealtimePrefix } from "@/lib/realtime/event-types";
import { tenantBookingsChannel, tenantDashboardChannel } from "@/lib/realtime/channels";

type AdminProfile = {
  id?: string;
  name?: string;
  business_category?: string;
  tagline?: string;
  subdomain?: string;
};

type ResourceSummaryResponse = {
  items?: Array<{ id?: string; name?: string; status?: string }>;
};

type SessionRow = {
  id: string;
  customer_name?: string;
  resource_name?: string;
  end_time?: string;
};

type DashboardPayload = {
  profile: AdminProfile | null;
  resourcesCount: number;
  customersCount: number;
  activeSessions: SessionRow[];
  bookings: AdminBookingRow[];
};

function formatAmount(value: number) {
  const formatted = formatCurrency(value);
  return formatted === "Cek harga" ? "Rp 0" : formatted;
}

export default function AdminDashboardScreen() {
  const guard = useAuthGuard("admin");
  const session = useSession();
  const identityQuery = useAdminIdentity();
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({
    queryKey: ["admin-dashboard-mobile"],
    enabled: guard.ready,
    queryFn: async (): Promise<DashboardPayload> => {
      const [profileRes, resourcesRes, sessionsRes, bookingsRes, customersRes] = await Promise.allSettled([
        apiFetch<AdminProfile>("/admin/profile", { audience: "admin" }),
        apiFetch<ResourceSummaryResponse>("/admin/resources/summary", { audience: "admin" }),
        apiFetch<SessionRow[]>("/bookings/pos/active", { audience: "admin" }),
        apiFetch<AdminBookingRow[] | { items?: AdminBookingRow[] }>("/bookings", { audience: "admin" }),
        apiFetch<{ count?: number }>("/customers/count", { audience: "admin" }),
      ]);

      const bookingsPayload = bookingsRes.status === "fulfilled" ? bookingsRes.value : [];
      const bookings = Array.isArray(bookingsPayload) ? bookingsPayload : bookingsPayload?.items || [];

      return {
        profile: profileRes.status === "fulfilled" ? profileRes.value : null,
        resourcesCount:
          resourcesRes.status === "fulfilled" ? Number(resourcesRes.value?.items?.length || 0) : 0,
        customersCount:
          customersRes.status === "fulfilled" ? Number(customersRes.value?.count || 0) : 0,
        activeSessions: sessionsRes.status === "fulfilled" ? sessionsRes.value || [] : [],
        bookings,
      };
    },
  });

  useRealtime({
    enabled: Boolean(identityQuery.data?.tenant_id && guard.ready),
    channels: identityQuery.data?.tenant_id
      ? [tenantBookingsChannel(identityQuery.data.tenant_id), tenantDashboardChannel(identityQuery.data.tenant_id)]
      : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      queryClient.setQueryData<DashboardPayload>(["admin-dashboard-mobile"], (current) =>
        current
          ? {
              ...current,
              bookings: patchAdminBookingList(current.bookings, event),
            }
          : current,
      );
      void dashboardQuery.refetch();
    },
    onReconnect: () => {
      void dashboardQuery.refetch();
    },
  });

  const data = dashboardQuery.data;
  const canCreateBookings = hasAdminPermission(identityQuery.data, "bookings.create");
  const todayKey = new Date().toDateString();
  const todayBookings = (data?.bookings || []).filter((item) => {
    const parsed = item.start_time ? new Date(item.start_time) : null;
    return !!parsed && !Number.isNaN(parsed.getTime()) && parsed.toDateString() === todayKey;
  });
  const todayRevenue = todayBookings.reduce((sum, item) => sum + getAdminBookingTotal(item), 0);
  const topBookings = (data?.bookings || []).slice(0, 4);

  return (
    <ScreenShell
      eyebrow="Admin"
      title={data?.profile?.name || session.tenantSlug || "Workspace tenant"}
      description={data?.profile?.tagline || "Pantau booking, customer, dan sesi aktif tenant dari satu tempat."}
      includeBottomSafeArea={false}
      bottomDockInset={118}
    >
      <PatternDashboardCard
          title="Fokus operasional"
          description="Cek booking hari ini, sesi yang masih berjalan, lalu lanjut ke antrian yang butuh keputusan."
          badge="Hari ini"
      >
        <View style={{ flexDirection: "row", gap: 10 }}>
          <SummaryPair label="Booking hari ini" value={String(todayBookings.length)} />
          <SummaryPair
            label="Sesi aktif"
            value={String(data?.activeSessions?.length || 0)}
            accent={Boolean(data?.activeSessions?.length)}
          />
        </View>
        <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
          Revenue hari ini {formatAmount(todayRevenue)}
        </Text>
      </PatternDashboardCard>

      {canCreateBookings ? (
        <CardBlock>
          <SectionHeader
            title="Mulai cepat"
            description="Buka booking baru tanpa pindah ke desktop."
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <CtaButton
                label="Booking baru"
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

      <CardBlock>
        <SectionHeader title="Booking terbaru" actionLabel="Lihat semua" onAction={() => router.push("/admin/bookings")} />
        {(topBookings.length ? topBookings : [{ id: "empty" } as AdminBookingRow]).map((item) =>
          item.id === "empty" ? (
            <EmptyStateCard
              key="empty"
              title="Belum ada booking"
              description="Booking baru akan muncul di sini begitu transaksi masuk."
            />
          ) : (
            <ListRow
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: "/admin/bookings/[id]",
                  params: { id: item.id },
                })
              }
              title={item.customer_name || "Customer"}
              subtitle={item.resource_name || "Resource"}
              meta={`${formatDateTime(item.start_time)} • ${formatAmount(getAdminBookingTotal(item))}`}
              badge={<StatusPill label={getAdminBookingStatusMeta(item).label} tone={mapStatusTone(getAdminBookingStatusMeta(item).label)} />}
            />
          ),
        )}
      </CardBlock>

      {!!data?.activeSessions?.length ? (
        <CardBlock>
          <SectionHeader title="Sesi aktif" actionLabel="Buka bookings" onAction={() => router.push("/admin/bookings")} />

          {data.activeSessions.slice(0, 3).map((item) => (
            <ListRow
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: "/admin/bookings/[id]",
                  params: { id: item.id },
                })
              }
              title={item.customer_name || "Customer"}
              subtitle={item.resource_name || "Resource"}
              meta={`Berakhir ${formatDateTime(item.end_time)}`}
              badge={<StatusPill label="Sedang berjalan" tone="success" />}
            />
          ))}
        </CardBlock>
      ) : null}
    </ScreenShell>
  );
}

function mapStatusTone(label: string): "blue" | "success" | "amber" | "danger" | "slate" {
  const normalized = label.toLowerCase();
  if (normalized.includes("selesai")) return "slate";
  if (normalized.includes("aktif") || normalized.includes("berjalan")) return "success";
  if (normalized.includes("batal")) return "danger";
  if (normalized.includes("pending")) return "amber";
  return "blue";
}
