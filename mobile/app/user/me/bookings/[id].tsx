import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useRealtime } from "@/hooks/use-realtime";
import { getBookingStatusMeta } from "@/lib/customer-portal";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { customerBookingChannel } from "@/lib/realtime/channels";
import { BOOKING_EVENT_PREFIXES, matchesRealtimePrefix } from "@/lib/realtime/event-types";
import { isRealtimeEnabledForAPI } from "@/lib/realtime/ws-client";

type BookingDetail = {
  id?: string;
  customer_id?: string;
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

type BookingAction = {
  href: `/user/me/bookings/${string}` | `/user/me/bookings/${string}/live` | `/user/me/bookings/${string}/payment?scope=deposit` | `/user/me/bookings/${string}/payment?scope=settlement`;
  label: string;
  tone?: "primary" | "secondary";
};

function getPaymentMeta(status?: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "awaiting_verification") {
    return {
      label: "Menunggu verifikasi",
      tone: "#d97706",
      bg: "#fff7ed",
      hint: "Bukti bayar sedang dicek.",
    };
  }
  if (normalized === "partial_paid") {
    return {
      label: "DP tercatat",
      tone: "#2563eb",
      bg: "#eff6ff",
      hint: "Sisa dibayar setelah sesi selesai.",
    };
  }
  if (normalized === "settled" || normalized === "paid") {
    return {
      label: "Lunas",
      tone: "#059669",
      bg: "#ecfdf5",
      hint: "Semua pembayaran selesai.",
    };
  }
  if (normalized === "expired" || normalized === "failed") {
    return {
      label: "Perlu dibayar ulang",
      tone: "#dc2626",
      bg: "#fef2f2",
      hint: "Pembayaran sebelumnya gagal.",
    };
  }
  return {
    label: "Menunggu pembayaran",
    tone: "#475569",
    bg: "#f8fafc",
    hint: "Selesaikan pembayaran awal.",
  };
}

function formatMoneyOrFallback(value?: number | null, fallback = "-") {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) return fallback;
  return formatCurrency(value);
}

function resolveNextStep(booking: BookingDetail | null) {
  if (!booking) return "Memuat status booking.";
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const status = String(booking.status || "").toLowerCase();
  const depositAmount = Number(booking.deposit_amount || 0);
  const balanceDue = Number(booking.balance_due || 0);

  if (paymentStatus === "awaiting_verification") {
    return "Tunggu verifikasi pembayaran.";
  }
  if (depositAmount > 0 && paymentStatus === "pending") {
    return "Bayar DP untuk lanjut.";
  }
  if (status === "pending" || status === "confirmed") {
    return "Saat waktunya tiba, buka mode live.";
  }
  if (status === "active" || status === "ongoing") {
    return "Sesi sedang berjalan.";
  }
  if (status === "completed" && balanceDue > 0) {
    return "Selesaikan pelunasan.";
  }
  if (status === "completed") {
    return "Booking sudah selesai.";
  }
  return "Pantau status booking di sini.";
}

function resolvePrimaryAction(booking: BookingDetail | null): BookingAction | null {
  if (!booking?.id) return null;
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const status = String(booking.status || "").toLowerCase();
  const depositAmount = Number(booking.deposit_amount || 0);
  const balanceDue = Number(booking.balance_due || 0);

  if (paymentStatus === "awaiting_verification") {
    return {
      href: `/user/me/bookings/${booking.id}/payment?scope=${status === "completed" ? "settlement" : "deposit"}` as const,
      label: "Lihat pembayaran",
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
  if (status === "completed") {
    return {
      href: `/user/me/bookings/${booking.id}/live` as const,
      label: "Lihat ringkasan sesi",
      tone: "secondary" as const,
    };
  }
  return {
    href: `/user/me/bookings/${booking.id}/live` as const,
    label: "Buka mode live",
    tone: "primary" as const,
  };
}

function resolveSecondaryAction(booking: BookingDetail | null): BookingAction | null {
  if (!booking?.id) return null;
  const depositAmount = Number(booking.deposit_amount || 0);
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const status = String(booking.status || "").toLowerCase();
  const balanceDue = Number(booking.balance_due || 0);

  if (paymentStatus === "awaiting_verification") return null;

  if (depositAmount > 0 && paymentStatus === "pending") {
    return {
      href: `/user/me/bookings/${booking.id}/live` as const,
      label: "Buka mode live",
    };
  }
  if (status === "active" || status === "ongoing") {
    return {
      href: `/user/me/bookings/${booking.id}/payment?scope=settlement` as const,
      label: "Buka pembayaran",
    };
  }
  if (status === "completed" && balanceDue <= 0) {
    return null;
  }
  return null;
}

export default function CustomerBookingDetailScreen() {
  const guard = useAuthGuard("customer");
  const { id } = useLocalSearchParams<{ id: string }>();
  const detailQuery = useQuery({
    queryKey: ["customer-booking-detail", id],
    queryFn: () => apiFetch<BookingDetail>(`/user/me/bookings/${id}`, { audience: "customer" }),
    enabled: guard.ready && Boolean(id),
    refetchInterval: isRealtimeEnabledForAPI() ? false : 15_000,
  });

  const booking = detailQuery.data;
  const sessionMeta = getBookingStatusMeta(booking?.status);
  const paymentMeta = getPaymentMeta(booking?.payment_status);
  const primaryAction = resolvePrimaryAction(booking || null);
  const secondaryAction = resolveSecondaryAction(booking || null);
  const nextStep = resolveNextStep(booking || null);
  const hasPromo =
    Number(booking?.discount_amount || 0) > 0 &&
    String(booking?.promo_code || "").trim() !== "";
  const customerID = String(booking?.customer_id || "");
  const sessionLabel = sessionMeta.label !== "Booking" ? sessionMeta.label : "Status booking";

  useRealtime({
    enabled: guard.ready && isRealtimeEnabledForAPI() && Boolean(customerID && id),
    channels: customerID && id ? [customerBookingChannel(customerID, String(id))] : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      void detailQuery.refetch();
    },
    onReconnect: () => {
      void detailQuery.refetch();
    },
  });

  function goBackHome() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/user/me");
  }

  return (
    <ScreenShell
      eyebrow="Booking"
      title={booking?.resource_name || booking?.resource || booking?.tenant_name || "Detail booking"}
      description={
        booking?.tenant_name
          ? `Status booking di ${booking.tenant_name}.`
          : "Status booking."
      }
    >
      <CardBlock>
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                {[booking?.tenant_name, booking?.tenant_slug].filter(Boolean).join(" / ")}
              </Text>
              <Text selectable style={{ color: "#0f172a", fontSize: 22, fontWeight: "900" }}>
                {booking?.resource_name || booking?.resource || booking?.tenant_name || "Booking"}
              </Text>
              {booking?.id ? (
                <Text selectable style={{ color: "#94a3b8", fontSize: 12 }}>
                  Ref {String(booking.id).slice(0, 8).toUpperCase()}
                </Text>
              ) : null}
            </View>
            <View style={{ alignItems: "flex-end", gap: 8 }}>
              <View style={{ borderRadius: 999, backgroundColor: "#f8fafc", paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text selectable style={{ color: sessionMeta.tone, fontSize: 12, fontWeight: "800" }}>
                  {sessionLabel}
                </Text>
              </View>
              <View style={{ borderRadius: 999, backgroundColor: paymentMeta.bg, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text selectable style={{ color: paymentMeta.tone, fontSize: 12, fontWeight: "800" }}>
                  {paymentMeta.label}
                </Text>
              </View>
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
              <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                MULAI
              </Text>
              <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800" }}>
                {booking?.start_time ? formatDateTime(booking.start_time) : "Menunggu jadwal"}
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
              <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                SELESAI
              </Text>
              <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800" }}>
                {booking?.end_time ? formatDateTime(booking.end_time) : "Mengikuti durasi"}
              </Text>
            </View>
          </View>
        </View>
      </CardBlock>

      <View
        style={{
          borderRadius: 18,
          backgroundColor: paymentMeta.bg,
          paddingHorizontal: 16,
          paddingVertical: 14,
          gap: 6,
        }}
      >
        <Text selectable style={{ color: paymentMeta.tone, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }}>
          STATUS PEMBAYARAN
        </Text>
        <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
          {paymentMeta.label}
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 13, lineHeight: 20 }}>
          {paymentMeta.hint}
        </Text>
      </View>

      <CardBlock>
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              ["Total", formatMoneyOrFallback(booking?.grand_total), "#0f172a"],
              ["DP", formatMoneyOrFallback(booking?.deposit_amount), Number(booking?.deposit_amount || 0) > 0 ? "#0f172a" : "#94a3b8"],
              ["Sisa", formatMoneyOrFallback(booking?.balance_due), Number(booking?.balance_due || 0) > 0 ? "#2563eb" : "#94a3b8"],
            ].map(([label, value, color]) => (
              <View
                key={label}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  backgroundColor: "#f8fafc",
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  gap: 4,
                }}
              >
                <Text selectable style={{ color: "#64748b", fontSize: 11 }}>
                  {label}
                </Text>
                <Text selectable style={{ color, fontSize: 15, fontWeight: "800" }}>
                  {value}
                </Text>
              </View>
            ))}
          </View>

          {hasPromo ? (
            <View
              style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#bbf7d0",
                backgroundColor: "#f0fdf4",
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 4,
              }}
            >
              <Text selectable style={{ color: "#15803d", fontSize: 12, fontWeight: "800" }}>
                Promo {booking?.promo_code}
              </Text>
              <Text selectable style={{ color: "#166534", fontSize: 13 }}>
                Hemat {formatCurrency(booking?.discount_amount)} dari total awal {formatCurrency(booking?.original_grand_total)}
              </Text>
            </View>
          ) : null}
        </View>
      </CardBlock>

      <CardBlock>
        <View style={{ gap: 10 }}>
          <Text selectable style={{ color: "#2563eb", fontSize: 10, fontWeight: "800", letterSpacing: 1.3 }}>
            NEXT
          </Text>
          <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
            {nextStep}
          </Text>
          <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
            {String(booking?.status || "").toLowerCase() === "active" || String(booking?.status || "").toLowerCase() === "ongoing"
              ? "Buka live untuk timer dan aksi sesi."
              : "Aksi di bawah mengikuti status booking."}
          </Text>
        </View>

        {primaryAction ? <CtaButton label={primaryAction.label} tone={primaryAction.tone} onPress={() => router.push(primaryAction.href)} /> : null}

        {secondaryAction ? <CtaButton label={secondaryAction.label} tone="secondary" onPress={() => router.push(secondaryAction.href)} /> : null}
      </CardBlock>

      <Pressable onPress={goBackHome} style={{ alignItems: "center", paddingVertical: 4 }}>
        <Text selectable style={{ color: "#64748b", fontSize: 13, fontWeight: "700" }}>
          Kembali ke daftar
        </Text>
      </Pressable>
    </ScreenShell>
  );
}
