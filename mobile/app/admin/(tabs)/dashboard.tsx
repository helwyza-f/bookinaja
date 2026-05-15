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
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {[
            {
              label: "Booking hari ini",
              value: String(todayBookings.length),
              hint: formatCurrency(todayRevenue),
              icon: "event" as const,
              tone: "#1d4ed8",
              bg: "#eff6ff",
            },
            {
              label: "Sesi aktif",
              value: String(data?.activeSessions?.length || 0),
              hint: "Perlu dipantau",
              icon: "play-circle-outline" as const,
              tone: "#059669",
              bg: "#ecfdf5",
            },
            {
              label: "Customer",
              value: String(data?.customersCount || 0),
              hint: "Basis CRM tenant",
              icon: "groups-2" as const,
              tone: "#7c3aed",
              bg: "#f5f3ff",
            },
            {
              label: "Resource",
              value: String(data?.resourcesCount || 0),
              hint: data?.profile?.business_category || "Siap jual",
              icon: "inventory-2" as const,
              tone: "#b45309",
              bg: "#fff7ed",
            },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                width: "47%",
                borderRadius: 22,
                backgroundColor: item.bg,
                paddingHorizontal: 14,
                paddingVertical: 14,
                gap: 8,
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
              <View style={{ gap: 2 }}>
                <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                  {item.label.toUpperCase()}
                </Text>
                <Text selectable style={{ color: "#0f172a", fontSize: 22, fontWeight: "900" }}>
                  {item.value}
                </Text>
                <Text selectable style={{ color: "#475569", fontSize: 12 }}>
                  {item.hint}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </CardBlock>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
          Shortcut cepat
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {[
            { label: "Bookings", hint: "Cek antrian", icon: "calendar-month", route: "/admin/bookings" as const },
            { label: "Customers", hint: "Lihat pelanggan", icon: "groups-2", route: "/admin/customers" as const },
            { label: "Settings", hint: "Lanjut web", icon: "tune", route: "/admin/more" as const },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.route)}
              style={{
                flex: 1,
                minWidth: 96,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                backgroundColor: "#ffffff",
                paddingHorizontal: 14,
                paddingVertical: 14,
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  backgroundColor: "#eff6ff",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name={item.icon as never} size={20} color="#2563eb" />
              </View>
              <View style={{ gap: 2 }}>
                <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                  {item.label}
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                  {item.hint}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </CardBlock>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
          Booking terbaru
        </Text>
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
    </ScreenShell>
  );
}
