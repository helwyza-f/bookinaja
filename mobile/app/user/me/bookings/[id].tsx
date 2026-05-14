import * as WebBrowser from "expo-web-browser";
import { Link, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { getBookingStatusMeta } from "@/lib/customer-portal";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getPortalWebUrl } from "@/lib/urls";

type BookingDetail = {
  id?: string;
  tenant_name?: string;
  tenant_slug?: string;
  customer_id?: string;
  resource_name?: string;
  resource?: string;
  status?: string;
  payment_status?: string;
  deposit_amount?: number;
  balance_due?: number;
  grand_total?: number;
  start_time?: string;
  end_time?: string;
  promo_code?: string;
};

export default function CustomerBookingDetailScreen() {
  const guard = useAuthGuard("customer");
  const { id } = useLocalSearchParams<{ id: string }>();
  const detailQuery = useQuery({
    queryKey: ["customer-booking-detail", id],
    queryFn: () => apiFetch<BookingDetail>(`/user/me/bookings/${id}`, { audience: "customer" }),
    enabled: guard.ready && Boolean(id),
  });

  const booking = detailQuery.data;
  const statusMeta = getBookingStatusMeta(booking?.status);
  const canOpenLive = ["active", "ongoing", "confirmed"].includes(String(booking?.status || "").toLowerCase());

  return (
    <ScreenShell
      eyebrow="Booking"
      title={booking?.resource_name || booking?.resource || "Detail booking"}
      description={booking?.tenant_name || "Status booking, pembayaran, dan langkah lanjutnya ada di sini."}
    >
      <CardBlock>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900", flex: 1 }}>
            Status booking
          </Text>
          <Text selectable style={{ color: statusMeta.tone, fontSize: 14, fontWeight: "800" }}>
            {statusMeta.label}
          </Text>
        </View>
        <Text selectable style={{ color: "#475569", fontSize: 14 }}>
          Mulai {formatDateTime(booking?.start_time)}
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14 }}>
          Selesai {formatDateTime(booking?.end_time)}
        </Text>
      </CardBlock>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Ringkasan pembayaran
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14 }}>
          Total {formatCurrency(booking?.grand_total)}
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14 }}>
          DP {formatCurrency(booking?.deposit_amount)}
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14 }}>
          Sisa {formatCurrency(booking?.balance_due)}
        </Text>
        {booking?.promo_code ? (
          <Text selectable style={{ color: "#1d4ed8", fontSize: 14, fontWeight: "700" }}>
            Promo {booking.promo_code}
          </Text>
        ) : null}
      </CardBlock>

      {canOpenLive ? (
        <Link href={`/user/me/bookings/${id}/live` as const} asChild>
          <View>
            <CtaButton label="Buka mode live" />
          </View>
        </Link>
      ) : null}

      <Link href={`/user/me/bookings/${id}/payment` as const} asChild>
        <View>
          <CtaButton tone="secondary" label="Buka pembayaran" />
        </View>
      </Link>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Perlu flow lengkap?
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
          Untuk aksi yang masih kompleks seperti upload bukti bayar atau kontrol sesi penuh, lanjutkan ke surface web yang sudah matang.
        </Text>
        <CtaButton
          label="Buka detail di web"
          onPress={() => {
            void WebBrowser.openBrowserAsync(getPortalWebUrl(`/user/me/bookings/${id}`));
          }}
        />
      </CardBlock>
    </ScreenShell>
  );
}
