import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
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
    >
      <CardBlock>
        <View style={{ gap: 4 }}>
          <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
            Perlu perhatian sekarang
          </Text>
          <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
            Fokus ke booking hari ini, sesi berjalan, dan customer yang butuh tindak lanjut.
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View
            style={{
              flex: 1,
              borderRadius: 18,
              backgroundColor: "#f8fafc",
              paddingHorizontal: 14,
              paddingVertical: 14,
              gap: 4,
            }}
          >
            <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
              BOOKING HARI INI
            </Text>
            <Text selectable style={{ color: "#0f172a", fontSize: 22, fontWeight: "900" }}>
              {todayBookings.length}
            </Text>
            <Text selectable style={{ color: "#475569", fontSize: 12 }}>
              {formatAmount(todayRevenue)}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              borderRadius: 18,
              backgroundColor: "#f8fafc",
              paddingHorizontal: 14,
              paddingVertical: 14,
              gap: 4,
            }}
          >
            <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
              SESI AKTIF
            </Text>
            <Text selectable style={{ color: "#0f172a", fontSize: 22, fontWeight: "900" }}>
              {data?.activeSessions?.length || 0}
            </Text>
            <Text selectable style={{ color: "#475569", fontSize: 12 }}>
              {data?.activeSessions?.length ? "Sedang berjalan" : "Belum ada sesi"}
            </Text>
          </View>
        </View>
      </CardBlock>

      <CardBlock>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
            Booking terbaru
          </Text>
          <Pressable onPress={() => router.push("/admin/bookings")}>
            <Text selectable style={{ color: "#2563eb", fontSize: 13, fontWeight: "800" }}>
              Lihat semua
            </Text>
          </Pressable>
        </View>
        {(topBookings.length ? topBookings : [{ id: "empty" } as AdminBookingRow]).map((item) =>
          item.id === "empty" ? (
            <View
              key="empty"
              style={{
                borderRadius: 20,
                backgroundColor: "#f8fafc",
                paddingHorizontal: 14,
                paddingVertical: 14,
              }}
            >
              <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                Belum ada booking yang tampil di tenant ini.
              </Text>
            </View>
          ) : (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/admin/bookings/${item.id}`)}
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#edf2f7",
                backgroundColor: "#fbfdff",
                paddingHorizontal: 14,
                paddingVertical: 14,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                    {item.customer_name || "Customer"}
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                    {item.resource_name || "Resource"}
                  </Text>
                </View>
                {(() => {
                  const meta = getAdminBookingStatusMeta(item);
                  return (
                    <View style={{ borderRadius: 999, backgroundColor: meta.bg, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text selectable style={{ color: meta.tone, fontSize: 11, fontWeight: "800" }}>
                        {meta.label}
                      </Text>
                    </View>
                  );
                })()}
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                  {formatDateTime(item.start_time)}
                </Text>
                <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800" }}>
                  {formatAmount(getAdminBookingTotal(item))}
                </Text>
              </View>
            </Pressable>
          ),
        )}
      </CardBlock>

      {!!data?.activeSessions?.length ? (
        <CardBlock>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
              Sesi yang sedang jalan
            </Text>
            <Pressable onPress={() => router.push("/admin/bookings")}>
              <Text selectable style={{ color: "#2563eb", fontSize: 13, fontWeight: "800" }}>
                Buka bookings
              </Text>
            </Pressable>
          </View>

          {data.activeSessions.slice(0, 3).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/admin/bookings/${item.id}`)}
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#edf2f7",
                backgroundColor: "#fbfdff",
                paddingHorizontal: 14,
                paddingVertical: 14,
                gap: 4,
              }}
            >
              <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                {item.customer_name || "Customer"}
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                {item.resource_name || "Resource"}
              </Text>
              <Text selectable style={{ color: "#475569", fontSize: 12 }}>
                Berakhir {formatDateTime(item.end_time)}
              </Text>
            </Pressable>
          ))}
        </CardBlock>
      ) : null}
    </ScreenShell>
  );
}
