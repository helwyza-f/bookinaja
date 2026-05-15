import { Link, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { formatDateTime } from "@/lib/format";
import { CustomerPortalItem } from "@/lib/customer-portal";
import { useSession } from "@/providers/session-provider";

type PointActivity = {
  id: string;
  points?: number;
  description?: string | null;
  created_at?: string;
};

type SettingsResponse = {
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    tier?: string;
    total_visits?: number;
  };
  points?: number;
  point_activity?: PointActivity[];
  past_history?: CustomerPortalItem[];
  identity_methods?: string[];
  has_password?: boolean;
};

function getInitials(name?: string) {
  return String(name || "CU")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getIdentityChips(data?: SettingsResponse) {
  const methods = new Set<string>(data?.identity_methods || []);
  if (data?.customer?.phone) methods.add("WhatsApp");
  if (data?.customer?.email) methods.add("Email");
  if (data?.has_password) methods.add("Password");
  return Array.from(methods).slice(0, 4);
}

export default function CustomerProfileScreen() {
  const guard = useAuthGuard("customer");
  const session = useSession();
  const settingsQuery = useQuery({
    queryKey: ["customer-settings"],
    queryFn: () => apiFetch<SettingsResponse>("/user/me/settings", { audience: "customer" }),
    enabled: guard.ready,
  });

  const customer = settingsQuery.data?.customer;
  const chips = getIdentityChips(settingsQuery.data);
  const initials = getInitials(customer?.name);
  const recentMoments = settingsQuery.data?.point_activity || [];
  const recentHistory = settingsQuery.data?.past_history || [];

  async function handleLogout() {
    await session.signOutCustomer();
    router.replace("/user/login");
  }

  return (
    <ScreenShell
      eyebrow="Account"
      title="Profil"
      description="Satu tempat untuk identitas akun, loyalty, dan jejak booking yang paling relevan."
    >
      <Animated.View entering={FadeInUp.duration(320)}>
        <View
          style={{
            borderRadius: 32,
            backgroundColor: "#0f172a",
            padding: 20,
            overflow: "hidden",
            gap: 18,
          }}
        >
          <View
            style={{
              position: "absolute",
              right: -28,
              top: -18,
              width: 136,
              height: 136,
              borderRadius: 999,
              backgroundColor: "rgba(59,130,246,0.24)",
            }}
          />
          <View
            style={{
              position: "absolute",
              left: -32,
              bottom: -48,
              width: 148,
              height: 148,
              borderRadius: 42,
              backgroundColor: "rgba(255,255,255,0.06)",
              transform: [{ rotate: "-14deg" }],
            }}
          />

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text selectable style={{ color: "#93c5fd", fontSize: 11, fontWeight: "800", letterSpacing: 1.8 }}>
                CUSTOMER PROFILE
              </Text>
              <Text selectable style={{ color: "#ffffff", fontSize: 28, fontWeight: "900", lineHeight: 30 }}>
                {customer?.name || "Customer"}
              </Text>
              <Text selectable style={{ color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 21 }}>
                {customer?.email || customer?.phone || "Kontak belum tersedia"}
              </Text>
            </View>
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 24,
                backgroundColor: "rgba(255,255,255,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text selectable style={{ color: "#ffffff", fontSize: 22, fontWeight: "900" }}>
                {initials}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              { label: "Points", value: String(settingsQuery.data?.points || 0) },
              { label: "Tier", value: customer?.tier || "REGULAR" },
              { label: "Visit", value: String(customer?.total_visits || 0) },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                  gap: 4,
                }}
              >
                <Text selectable style={{ color: "#93c5fd", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                  {item.label}
                </Text>
                <Text selectable style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(320)} style={{ gap: 14 }}>
        <CardBlock>
          <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
            Identitas akun
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {chips.length ? (
              chips.map((item) => (
                <View
                  key={item}
                  style={{
                    borderRadius: 999,
                    backgroundColor: "#eef4ff",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text selectable style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "800" }}>
                    {item}
                  </Text>
                </View>
              ))
            ) : (
              <Text selectable style={{ color: "#64748b", fontSize: 14 }}>
                Metode identitas belum terbaca.
              </Text>
            )}
          </View>
          <View style={{ gap: 10 }}>
            <View
              style={{
                borderRadius: 20,
                backgroundColor: "#f8fafc",
                paddingHorizontal: 14,
                paddingVertical: 13,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1.1 }}>
                  EMAIL
                </Text>
                <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "700" }}>
                  {customer?.email || "Belum diisi"}
                </Text>
              </View>
              <MaterialIcons name="mail-outline" size={18} color="#64748b" />
            </View>
            <View
              style={{
                borderRadius: 20,
                backgroundColor: "#f8fafc",
                paddingHorizontal: 14,
                paddingVertical: 13,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1.1 }}>
                  WHATSAPP
                </Text>
                <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "700" }}>
                  {customer?.phone || "Belum diisi"}
                </Text>
              </View>
              <MaterialIcons name="call" size={18} color="#64748b" />
            </View>
          </View>
        </CardBlock>

        <CardBlock>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
              Aktivitas terbaru
            </Text>
            <Link href="/user/me/history" asChild>
              <Pressable>
                <Text selectable style={{ color: "#2563eb", fontSize: 13, fontWeight: "800" }}>
                  Lihat semua
                </Text>
              </Pressable>
            </Link>
          </View>

          {recentMoments.length ? (
            recentMoments.map((item) => (
              <View
                key={item.id}
                style={{
                  borderRadius: 20,
                  backgroundColor: "#f8fafc",
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 14,
                    backgroundColor: "#dbeafe",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name="auto-awesome" size={18} color="#1d4ed8" />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                    {item.description || "Aktivitas loyalty tercatat"}
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                    {item.created_at ? formatDateTime(item.created_at) : "Baru saja"}
                  </Text>
                </View>
                <Text selectable style={{ color: "#059669", fontSize: 14, fontWeight: "900" }}>
                  +{item.points || 0}
                </Text>
              </View>
            ))
          ) : (
            <Text selectable style={{ color: "#64748b", fontSize: 14, lineHeight: 21 }}>
              Belum ada aktivitas loyalty yang perlu ditonjolkan.
            </Text>
          )}
        </CardBlock>

        <CardBlock>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
              Riwayat cepat
            </Text>
            <Link href="/user/me/active" asChild>
              <Pressable>
                <Text selectable style={{ color: "#2563eb", fontSize: 13, fontWeight: "800" }}>
                  Sesi aktif
                </Text>
              </Pressable>
            </Link>
          </View>

          {recentHistory.length ? (
            recentHistory.slice(0, 2).map((item) => (
              <View
                key={item.id}
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  gap: 4,
                }}
              >
                <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                  {item.tenant_name || "Tenant"}
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
                  {item.resource || item.resource_name || "Booking"} • {formatDateTime(item.date || item.start_time)}
                </Text>
              </View>
            ))
          ) : (
            <Text selectable style={{ color: "#64748b", fontSize: 14, lineHeight: 21 }}>
              Riwayat ringkas belum tersedia di akun ini.
            </Text>
          )}
        </CardBlock>

        <CardBlock>
          <Pressable
            onPress={() => void handleLogout()}
            style={{
              borderRadius: 22,
              backgroundColor: "#eef2f7",
              paddingHorizontal: 16,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <MaterialIcons name="logout" size={18} color="#0f172a" />
            <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
              Logout
            </Text>
          </Pressable>
        </CardBlock>
      </Animated.View>
    </ScreenShell>
  );
}
