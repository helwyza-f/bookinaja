import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useSession } from "@/providers/session-provider";
import { formatCurrency, formatDateTime } from "@/lib/format";

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

type BookingRow = {
  id: string;
  customer_name?: string;
  resource_name?: string;
  status?: string;
  payment_status?: string;
  start_time?: string;
  grand_total?: number;
  total_resource?: number;
  total_fnb?: number;
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
  bookings: BookingRow[];
};

function getBookingTotal(item: BookingRow) {
  const explicit = Number(item.grand_total || 0);
  if (explicit > 0) return explicit;
  return Number(item.total_resource || 0) + Number(item.total_fnb || 0);
}

function getBookingStatusMeta(status?: string, paymentStatus?: string) {
  const booking = String(status || "").toLowerCase();
  const payment = String(paymentStatus || "").toLowerCase();
  if (payment === "awaiting_verification") return { label: "Verifikasi", tone: "#d97706", bg: "#fef3c7" };
  if (booking === "active" || booking === "ongoing") return { label: "Aktif", tone: "#059669", bg: "#d1fae5" };
  if (booking === "confirmed") return { label: "Terjadwal", tone: "#2563eb", bg: "#dbeafe" };
  if (booking === "completed") return { label: "Selesai", tone: "#475569", bg: "#e2e8f0" };
  return { label: "Pending", tone: "#b45309", bg: "#fef3c7" };
}

export default function AdminDashboardScreen() {
  const guard = useAuthGuard("admin");
  const session = useSession();
  const dashboardQuery = useQuery({
    queryKey: ["admin-dashboard-mobile"],
    enabled: guard.ready,
    queryFn: async (): Promise<DashboardPayload> => {
      const [profileRes, resourcesRes, sessionsRes, bookingsRes, customersRes] = await Promise.allSettled([
        apiFetch<AdminProfile>("/admin/profile", { audience: "admin" }),
        apiFetch<ResourceSummaryResponse>("/admin/resources/summary", { audience: "admin" }),
        apiFetch<SessionRow[]>("/bookings/pos/active", { audience: "admin" }),
        apiFetch<BookingRow[] | { items?: BookingRow[] }>("/bookings", { audience: "admin" }),
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

  const data = dashboardQuery.data;
  const todayKey = new Date().toDateString();
  const todayBookings = (data?.bookings || []).filter((item) => {
    const parsed = item.start_time ? new Date(item.start_time) : null;
    return parsed && !Number.isNaN(parsed.getTime()) && parsed.toDateString() === todayKey;
  });
  const todayRevenue = todayBookings.reduce((sum, item) => sum + getBookingTotal(item), 0);
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
            Hanya angka yang langsung terkait operasi hari ini.
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
              {formatCurrency(todayRevenue)}
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
        {(topBookings.length ? topBookings : [{ id: "empty" } as BookingRow]).map((item) =>
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
            <View
              key={item.id}
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
                  const meta = getBookingStatusMeta(item.status, item.payment_status);
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
                  {formatCurrency(getBookingTotal(item))}
                </Text>
              </View>
            </View>
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
            <View
              key={item.id}
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
            </View>
          ))}
        </CardBlock>
      ) : null}
    </ScreenShell>
  );
}
