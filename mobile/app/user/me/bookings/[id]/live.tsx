import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { getPortalWebUrl } from "@/lib/urls";

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

  return (
    <ScreenShell
      eyebrow="Booking live"
      title={booking?.resource_name || "Sesi sedang berjalan"}
      description="Mode live mobile ini memberi snapshot cepat. Untuk kontrol sesi, order, atau extension yang lebih dalam, lanjutkan ke web."
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

      <CtaButton
        label="Buka live controller di web"
        onPress={() => {
          void WebBrowser.openBrowserAsync(getPortalWebUrl(`/user/me/bookings/${id}/live`));
        }}
      />
    </ScreenShell>
  );
}
