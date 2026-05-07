import { useLocalSearchParams, router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScreenShell } from "@/components/screen-shell";
import { InfoCard } from "@/components/info-card";
import { useAppTheme } from "@/theme";
import { useCustomerBookingDetailQuery } from "@/features/customer/queries";
import { useCustomerBookingRealtime } from "@/features/customer/realtime";
import {
  getPaymentStatusMeta,
  getSessionStatusMeta,
  resolvePaymentStatusCode,
} from "@/features/customer/status";

function formatMoney(value?: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTimeRange(start?: string, end?: string | null) {
  if (!start) return "-";
  const formatter = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const startLabel = formatter.format(new Date(start));
  if (!end) return startLabel;
  return `${startLabel} - ${formatter.format(new Date(end))}`;
}

function resolveNextStepLabel(status?: string, paymentStatus?: string, balanceDue?: number) {
  const session = String(status || "").toLowerCase();
  const payment = resolvePaymentStatusCode({
    status: paymentStatus,
    balanceDue,
  });

  if (payment === "awaiting_verification") {
    return "Pembayaran menunggu verifikasi.";
  }
  if (payment === "pending") {
    return "Selesaikan pembayaran DP.";
  }
  if (session === "confirmed") {
    return "Booking siap dimulai.";
  }
  if (session === "active" || session === "ongoing") {
    return "Sesi sedang berjalan.";
  }
  if ((payment === "paid" || payment === "settled") && Number(balanceDue || 0) <= 0) {
    return "Booking selesai.";
  }
  if (session === "completed") {
    return "Sesi selesai.";
  }
  return "Cek status booking di sini.";
}

function resolvePaymentHint(paymentStatus?: string, balanceDue?: number, paidAmount?: number, grandTotal?: number) {
  const payment = resolvePaymentStatusCode({
    status: paymentStatus,
    balanceDue,
    paidAmount,
    grandTotal,
  });
  if (payment === "awaiting_verification") {
    return "Menunggu review admin.";
  }
  if (payment === "partial_paid") {
    return "DP sudah masuk.";
  }
  if (payment === "settled" || payment === "paid") {
    return "Pembayaran lunas.";
  }
  if (payment === "expired" || payment === "failed") {
    return "Coba bayar lagi dari Live.";
  }
  return "Lanjutkan pembayaran dari Live.";
}

function resolvePaymentAction(status?: string, paymentStatus?: string, depositAmount?: number, balanceDue?: number) {
  const session = String(status || "").toLowerCase();
  const payment = resolvePaymentStatusCode({
    status: paymentStatus,
    balanceDue,
  });

  if (payment === "awaiting_verification") {
    return {
      label: "Menunggu verifikasi",
      hint: "Tunggu review admin.",
      disabled: true,
      scope: null as "deposit" | "settlement" | null,
    };
  }

  if (Number(depositAmount || 0) > 0 && payment === "pending") {
    return {
      label: "Bayar DP",
      hint: "Selesaikan DP.",
      disabled: false,
      scope: "deposit" as const,
    };
  }

  if (session === "completed" && Number(balanceDue || 0) > 0) {
    return {
      label: "Pelunasan",
      hint: "Selesaikan sisa tagihan.",
      disabled: false,
      scope: "settlement" as const,
    };
  }

  return {
    label: "Pembayaran siap",
    hint: "Belum ada aksi pembayaran.",
    disabled: true,
    scope: null as "deposit" | "settlement" | null,
  };
}

function toneStyles(
  theme: ReturnType<typeof useAppTheme>,
  tone: "success" | "warning" | "danger" | "info" | "neutral",
) {
  switch (tone) {
    case "success":
      return { backgroundColor: theme.colors.success, color: "#FFFFFF" };
    case "warning":
      return { backgroundColor: theme.colors.warning, color: "#FFFFFF" };
    case "danger":
      return { backgroundColor: theme.colors.danger, color: "#FFFFFF" };
    case "info":
      return { backgroundColor: theme.colors.accent, color: "#FFFFFF" };
    default:
      return { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.foreground };
  }
}

export default function CustomerBookingDetailScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const bookingId = String(params.id || "");
  const detail = useCustomerBookingDetailQuery(bookingId);
  const booking = detail.data;
  const realtime = useCustomerBookingRealtime({
    bookingId,
    enabled: Boolean(bookingId),
  });
  const sessionMeta = getSessionStatusMeta(booking?.status);
  const paymentMeta = getPaymentStatusMeta({
    status: booking?.payment_status,
    balanceDue: booking?.balance_due,
    paidAmount: booking?.paid_amount,
    grandTotal: booking?.grand_total,
    depositAmount: booking?.deposit_amount,
  });
  const sessionTone = toneStyles(theme, sessionMeta.tone);
  const paymentTone = toneStyles(theme, paymentMeta.tone);
  const paymentAction = resolvePaymentAction(
    booking?.status,
    booking?.payment_status,
    booking?.deposit_amount,
    booking?.balance_due,
  );
  const hasPromo =
    Number(booking?.discount_amount || 0) > 0 && String(booking?.promo_code || "").trim() !== "";

  return (
    <ScreenShell
      eyebrow="Booking"
      title={booking?.resource_name || booking?.resource || "Detail booking"}
      subtitle={booking?.tenant_name || "Tiket dan status singkat booking."}
    >
      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <Feather name="arrow-left" size={16} color={theme.colors.foreground} />
        <Text style={[styles.backText, { color: theme.colors.foreground }]}>Kembali</Text>
      </Pressable>

      {detail.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={{ color: theme.colors.foregroundMuted }}>Memuat detail booking...</Text>
        </View>
      ) : booking ? (
        <>
          <View style={[styles.hero, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.heroTop}>
              <View style={styles.heroCopy}>
                <Text style={[styles.heroEyebrow, { color: theme.colors.accent }]}>Booking</Text>
                <Text style={[styles.heroTitle, { color: theme.colors.foreground }]}>
                  {booking.resource_name || booking.resource || "Booking"}
                </Text>
                <Text style={[styles.heroHint, { color: theme.colors.foregroundMuted }]}>
                  {[booking.tenant_name, booking.tenant_slug].filter(Boolean).join(" · ")}
                </Text>
                <Text style={[styles.heroRef, { color: theme.colors.foregroundMuted }]}>
                  Ref {booking.id.slice(0, 8).toUpperCase()}
                </Text>
              </View>
              <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: sessionTone.backgroundColor }]}>
                  <Text style={[styles.badgeText, { color: sessionTone.color }]}>{sessionMeta.label}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: paymentTone.backgroundColor }]}>
                  <Text style={[styles.badgeText, { color: paymentTone.color }]}>{paymentMeta.label}</Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: realtime.connected
                        ? theme.colors.successSoft
                        : theme.colors.surfaceAlt,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color: realtime.connected
                          ? theme.colors.success
                          : theme.colors.foregroundMuted,
                      },
                    ]}
                  >
                    {realtime.connected ? "Realtime" : "Sync"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.metricGrid}>
              <MetricBox label="Tanggal" value={formatDate(booking.start_time || booking.date)} theme={theme} />
              <MetricBox label="Jam" value={formatTimeRange(booking.start_time || booking.date, booking.end_time || booking.end_date)} theme={theme} />
              <MetricBox label="DP" value={formatMoney(booking.deposit_amount)} theme={theme} />
              <MetricBox label="Sisa" value={formatMoney(booking.balance_due)} theme={theme} />
            </View>
          </View>

          {hasPromo ? (
            <View
              style={[
                styles.promoCard,
                {
                  backgroundColor: theme.colors.successSoft,
                  borderColor: theme.colors.success,
                },
              ]}
            >
              <View style={styles.promoHeader}>
                <View>
                  <Text style={[styles.promoEyebrow, { color: theme.colors.success }]}>Promo</Text>
                  <Text style={[styles.promoCode, { color: theme.colors.foreground }]}>{booking.promo_code}</Text>
                </View>
                <View style={[styles.promoBadge, { backgroundColor: theme.colors.success }]}>
                  <Text style={styles.promoBadgeText}>-{formatMoney(booking.discount_amount)}</Text>
                </View>
              </View>
            </View>
          ) : null}

          <InfoCard
            label="Langkah"
            value={resolveNextStepLabel(booking.status, booking.payment_status, booking.balance_due)}
            hint={resolvePaymentHint(
              booking.payment_status,
              booking.balance_due,
              booking.paid_amount,
              booking.grand_total,
            )}
          />

          <View style={[styles.ctaCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.ctaHeader}>
              <View>
                <Text style={[styles.ctaEyebrow, { color: theme.colors.foregroundMuted }]}>Aksi utama</Text>
                <Text style={[styles.ctaTitle, { color: theme.colors.foreground }]}>Gunakan Live untuk aksi booking</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Text style={[styles.badgeText, { color: theme.colors.foreground }]}>Summary</Text>
              </View>
            </View>
            <Text style={[styles.ctaHint, { color: theme.colors.foregroundMuted }]}>
              Live jadi pusat aksi dan ringkasan lengkap.
            </Text>
            <View style={styles.actionRow}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(customer)/bookings/[id]/live",
                    params: { id: booking.id },
                  })
                }
                style={[styles.actionButton, { backgroundColor: theme.colors.accent }]}
              >
                <Text style={styles.actionButtonText}>Buka Live</Text>
              </Pressable>
              <Pressable
                disabled={paymentAction.disabled || !paymentAction.scope}
                onPress={() => {
                  if (!paymentAction.scope) return;
                  router.push({
                    pathname: "/(customer)/bookings/[id]/payment",
                    params: { id: booking.id, scope: paymentAction.scope },
                  });
                }}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor:
                      paymentAction.disabled || !paymentAction.scope
                        ? theme.colors.foregroundMuted
                        : theme.colors.primary,
                  },
                ]}
              >
                <Text style={styles.actionButtonText}>{paymentAction.label}</Text>
              </Pressable>
            </View>
            <Text style={[styles.ctaSubhint, { color: theme.colors.foregroundMuted }]}>
              {paymentAction.hint}
            </Text>
          </View>

          <InfoCard
            label="Ringkasan lengkap"
            value="Total, item booking, pesanan, promo, dan aktivitas ada di Live."
            hint="Detail ini sengaja dibuat ringkas."
          />
        </>
      ) : (
        <InfoCard
          label="Booking"
          value="Detail tidak ditemukan"
          hint="Coba kembali dari halaman aktif atau riwayat."
        />
      )}
    </ScreenShell>
  );
}

function MetricBox({
  label,
  value,
  theme,
  soft = false,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>;
  soft?: boolean;
}) {
  return (
    <View
      style={[
        styles.metricBox,
        {
          backgroundColor: soft ? theme.colors.surface : theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text style={[styles.metricLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: "800",
  },
  loading: {
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  hero: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    gap: 16,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
  },
  heroHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroRef: {
    fontSize: 12,
    fontWeight: "600",
  },
  badges: {
    alignItems: "flex-end",
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricBox: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  promoCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 14,
    gap: 12,
  },
  promoHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  promoEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  promoCode: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "900",
  },
  promoBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  promoBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  promoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  ctaCard: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
    gap: 12,
  },
  ctaHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  ctaEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  ctaTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "900",
  },
  ctaHint: {
    fontSize: 13,
    lineHeight: 19,
  },
  ctaSubhint: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
