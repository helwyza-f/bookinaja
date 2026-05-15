import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { getBookingStatusMeta } from "@/lib/customer-portal";
import { formatCurrency, formatDateTime } from "@/lib/format";

type BookingDetail = {
  id?: string;
  tenant_name?: string;
  tenant_slug?: string;
  resource_name?: string;
  resource?: string;
  status?: string;
  payment_status?: string;
  start_time?: string;
  end_time?: string;
  promo_code?: string;
  original_grand_total?: number;
  discount_amount?: number;
  grand_total?: number;
  deposit_amount?: number;
  balance_due?: number;
};

function getPaymentMeta(status?: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "awaiting_verification") {
    return {
      label: "Menunggu verifikasi",
      tone: "#d97706",
      hint: "Pembayaran manual sedang dicek admin tenant.",
    };
  }
  if (normalized === "partial_paid") {
    return {
      label: "DP tercatat",
      tone: "#2563eb",
      hint: "DP sudah masuk. Sisa tagihan bisa dilunasi setelah sesi selesai.",
    };
  }
  if (normalized === "settled" || normalized === "paid") {
    return {
      label: "Lunas",
      tone: "#059669",
      hint: "Pembayaran booking sudah tercatat.",
    };
  }
  if (normalized === "expired" || normalized === "failed") {
    return {
      label: "Perlu dibayar ulang",
      tone: "#dc2626",
      hint: "Pembayaran sebelumnya belum berhasil.",
    };
  }
  return {
    label: "Menunggu pembayaran",
    tone: "#475569",
    hint: "Selesaikan pembayaran agar booking bisa lanjut diproses.",
  };
}

function resolvePrimaryAction(booking: BookingDetail | null) {
  if (!booking?.id) return null;
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const status = String(booking.status || "").toLowerCase();
  const depositAmount = Number(booking.deposit_amount || 0);
  const balanceDue = Number(booking.balance_due || 0);

  if (paymentStatus === "awaiting_verification") {
    return {
      href: `/user/me/bookings/${booking.id}/payment?scope=${status === "completed" ? "settlement" : "deposit"}` as const,
      label: "Lihat status pembayaran",
      tone: "secondary" as const,
    };
  }
  if (depositAmount > 0 && paymentStatus === "pending") {
    return {
      href: `/user/me/bookings/${booking.id}/payment?scope=deposit` as const,
      label: "Bayar DP",
      tone: "primary" as const,
    };
  }
  if (status === "completed" && balanceDue > 0) {
    return {
      href: `/user/me/bookings/${booking.id}/payment?scope=settlement` as const,
      label: "Lanjutkan pelunasan",
      tone: "primary" as const,
    };
  }
  return {
    href: `/user/me/bookings/${booking.id}/live` as const,
    label: "Buka mode live",
    tone: "primary" as const,
  };
}

function resolveSecondaryAction(booking: BookingDetail | null) {
  if (!booking?.id) return null;
  const status = String(booking.status || "").toLowerCase();
  const paymentStatus = String(booking.payment_status || "").toLowerCase();

  if (paymentStatus === "pending" && (status === "active" || status === "ongoing" || status === "confirmed")) {
    return {
      href: `/user/me/bookings/${booking.id}/live` as const,
      label: "Kembali",
    };
  }
  return null;
}

function resolveStepLabel(booking: BookingDetail | null) {
  if (!booking) return "Booking dibuat";
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const status = String(booking.status || "").toLowerCase();
  const balanceDue = Number(booking.balance_due || 0);

  if (status === "active" || status === "ongoing") return "Sesi berjalan";
  if (status === "completed" && balanceDue > 0) return "Pelunasan";
  if (status === "completed") return "Selesai";
  if (paymentStatus === "awaiting_verification") return "Verifikasi admin";
  if (paymentStatus === "partial_paid") return "Siap sesi";
  if (paymentStatus === "pending") return "Bayar DP";
  return "Booking dibuat";
}

export default function CustomerBookingDetailScreen() {
  const guard = useAuthGuard("customer");
  const { id } = useLocalSearchParams<{ id: string }>();
  const detailQuery = useQuery({
    queryKey: ["customer-booking-detail", id],
    queryFn: () => apiFetch<BookingDetail>(`/user/me/bookings/${id}`, { audience: "customer" }),
    enabled: guard.ready && Boolean(id),
  });

  const booking = detailQuery.data;
  const sessionMeta = getBookingStatusMeta(booking?.status);
  const paymentMeta = getPaymentMeta(booking?.payment_status);
  const primaryAction = resolvePrimaryAction(booking || null);
  const secondaryAction = resolveSecondaryAction(booking || null);
  const currentStep = resolveStepLabel(booking || null);
  const hasPromo =
    Number(booking?.discount_amount || 0) > 0 &&
    String(booking?.promo_code || "").trim() !== "";

  return (
    <ScreenShell
      eyebrow="Booking"
      title={booking?.resource_name || booking?.resource || "Detail booking"}
      description={booking?.tenant_name || "Status booking ada di sini."}
    >
      <CardBlock>
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                {[booking?.tenant_name, booking?.tenant_slug].filter(Boolean).join(" / ")}
              </Text>
              <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "800" }}>
                {booking?.resource_name || booking?.resource || "Booking"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <Text selectable style={{ color: sessionMeta.tone, fontSize: 13, fontWeight: "800" }}>
                {sessionMeta.label}
              </Text>
              <Text selectable style={{ color: paymentMeta.tone, fontSize: 13, fontWeight: "800" }}>
                {paymentMeta.label}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View
              style={{
                flex: 1,
                borderRadius: 18,
                backgroundColor: "#f8fafc",
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 4,
              }}
            >
              <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                MULAI
              </Text>
              <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "700" }}>
                {formatDateTime(booking?.start_time)}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                borderRadius: 18,
                backgroundColor: "#f8fafc",
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 4,
              }}
            >
              <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                SELESAI
              </Text>
              <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "700" }}>
                {formatDateTime(booking?.end_time)}
              </Text>
            </View>
          </View>
        </View>
      </CardBlock>

      <CardBlock>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          {[
            ["Total", formatCurrency(booking?.grand_total), "#0f172a"],
            ["DP", formatCurrency(booking?.deposit_amount), "#0f172a"],
            ["Sisa", formatCurrency(booking?.balance_due), "#1d4ed8"],
          ].map(([label, value, color]) => (
            <View key={label} style={{ flex: 1, gap: 4 }}>
              <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                {label}
              </Text>
              <Text selectable style={{ color, fontSize: 15, fontWeight: "800" }}>
                {value}
              </Text>
            </View>
          ))}
        </View>

        {hasPromo ? (
          <Text selectable style={{ color: "#15803d", fontSize: 13, fontWeight: "700" }}>
            Promo {booking?.promo_code} / hemat {formatCurrency(booking?.discount_amount)}
          </Text>
        ) : null}
      </CardBlock>

      <CardBlock>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              backgroundColor: "#eff6ff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="radio-button-checked" size={18} color="#2563eb" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
              {currentStep}
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
              {paymentMeta.hint}
            </Text>
          </View>
        </View>
      </CardBlock>

      {primaryAction ? (
        <CtaButton
          label={primaryAction.label}
          tone={primaryAction.tone}
          onPress={() => router.push(primaryAction.href)}
        />
      ) : null}

      {secondaryAction ? (
        <CtaButton
          label={secondaryAction.label}
          tone="secondary"
          onPress={() => router.push(secondaryAction.href)}
        />
      ) : null}
    </ScreenShell>
  );
}
