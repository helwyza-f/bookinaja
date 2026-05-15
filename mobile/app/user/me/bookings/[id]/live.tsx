import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { apiFetch, ApiError } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";

type BookingContext = {
  booking?: {
    id?: string;
    resource_name?: string;
    status?: string;
    payment_status?: string;
    remaining_seconds?: number;
    balance_due?: number;
  };
};

export default function CustomerBookingLiveScreen() {
  const guard = useAuthGuard("customer");
  const { id } = useLocalSearchParams<{ id: string }>();
  const contextQuery = useQuery({
    queryKey: ["customer-booking-live", id],
    queryFn: () => apiFetch<BookingContext>(`/user/me/bookings/${id}/context`, { audience: "customer" }),
    enabled: guard.ready && Boolean(id),
    refetchInterval: 15_000,
  });

  const booking = contextQuery.data?.booking;
  const remainingMinutes = Math.max(Math.round(Number(booking?.remaining_seconds || 0) / 60), 0);
  const normalizedStatus = String(booking?.status || "").toLowerCase();
  const canActivate = normalizedStatus === "confirmed";
  const canComplete = normalizedStatus === "active" || normalizedStatus === "ongoing";

  async function postAction(path: string, body?: Record<string, unknown>) {
    try {
      await apiFetch(path, {
        method: "POST",
        audience: "customer",
        body: body ? JSON.stringify(body) : undefined,
      });
      await contextQuery.refetch();
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error ? error.message : "Aksi belum berhasil diproses.";
      Alert.alert("Aksi gagal", message);
    }
  }

  return (
    <ScreenShell
      eyebrow="Booking live"
      title={booking?.resource_name || "Sesi sedang berjalan"}
      description="Pantau sesi yang berjalan, cek sisa waktu, dan jalankan aksi customer langsung dari app."
    >
      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Status sesi
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14 }}>
          Status {booking?.status || "-"}
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14 }}>
          Payment {booking?.payment_status || "-"}
        </Text>
        <Text selectable style={{ color: "#1d4ed8", fontSize: 24, fontWeight: "900" }}>
          {remainingMinutes} menit tersisa
        </Text>
      </CardBlock>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Sisa tagihan
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14 }}>
          {Number(booking?.balance_due || 0) > 0
            ? `Masih ada sisa Rp ${Number(booking?.balance_due || 0).toLocaleString("id-ID")}`
            : "Tidak ada sisa tagihan."}
        </Text>
      </CardBlock>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Aksi sesi
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {canActivate ? (
            <View style={{ flex: 1 }}>
              <CtaButton label="Mulai sesi" onPress={() => void postAction(`/user/me/bookings/${id}/activate`)} />
            </View>
          ) : null}
          {canComplete ? (
            <View style={{ flex: 1 }}>
              <CtaButton tone="secondary" label="Selesaikan" onPress={() => void postAction(`/user/me/bookings/${id}/complete`)} />
            </View>
          ) : null}
          {!canActivate && !canComplete ? (
            <Text selectable style={{ color: "#64748b", fontSize: 14, lineHeight: 21 }}>
              Belum ada aksi utama untuk status sesi ini.
            </Text>
          ) : null}
        </View>
      </CardBlock>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Extend cepat
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[1, 2].map((step) => (
            <Pressable
              key={step}
              onPress={() => void postAction(`/user/me/bookings/${id}/extend`, { additional_duration: step })}
              style={{
                flex: 1,
                borderRadius: 18,
                backgroundColor: "#f8fafc",
                paddingVertical: 14,
                alignItems: "center",
                gap: 6,
              }}
            >
              <MaterialIcons name="bolt" size={18} color="#2563eb" />
              <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800" }}>
                +{step} sesi
              </Text>
            </Pressable>
          ))}
        </View>
      </CardBlock>
    </ScreenShell>
  );
}
