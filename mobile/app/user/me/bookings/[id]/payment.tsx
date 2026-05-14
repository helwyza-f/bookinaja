import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { formatCurrency } from "@/lib/format";
import { getPortalWebUrl } from "@/lib/urls";

type BookingPayment = {
  id?: string;
  payment_status?: string;
  grand_total?: number;
  balance_due?: number;
  deposit_amount?: number;
  resource_name?: string;
};

export default function CustomerBookingPaymentScreen() {
  const guard = useAuthGuard("customer");
  const { id } = useLocalSearchParams<{ id: string }>();
  const paymentQuery = useQuery({
    queryKey: ["customer-booking-payment", id],
    queryFn: () => apiFetch<BookingPayment>(`/user/me/bookings/${id}`, { audience: "customer" }),
    enabled: guard.ready && Boolean(id),
  });

  const booking = paymentQuery.data;

  return (
    <ScreenShell
      eyebrow="Pembayaran booking"
      title={booking?.resource_name || "Pembayaran booking"}
      description="Summary pembayaran tersedia di mobile. Flow pembayaran lengkap sementara diteruskan ke web."
    >
      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Payment status
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14 }}>
          {booking?.payment_status || "-"}
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14 }}>
          Total {formatCurrency(booking?.grand_total)}
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14 }}>
          DP {formatCurrency(booking?.deposit_amount)}
        </Text>
        <Text selectable style={{ color: "#1d4ed8", fontSize: 18, fontWeight: "800" }}>
          Sisa {formatCurrency(booking?.balance_due)}
        </Text>
      </CardBlock>
      <CtaButton
        label="Lanjut bayar di web"
        onPress={() => {
          void WebBrowser.openBrowserAsync(getPortalWebUrl(`/user/me/bookings/${id}/payment`));
        }}
      />
    </ScreenShell>
  );
}
