import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppTheme } from "@/theme";
import type { CustomerBookingSummary } from "@/features/customer/types";
import { getPaymentStatusMeta, getSessionStatusMeta } from "@/features/customer/status";

function formatMoney(value?: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTimeRange(start?: string, end?: string | null) {
  if (!start) return "-";
  const startDate = new Date(start);
  const startLabel = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(startDate);

  if (!end) return startLabel;

  const endDate = new Date(end);
  const endLabel = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(endDate);
  return `${startLabel} - ${endLabel}`;
}

function toneStyles(theme: ReturnType<typeof useAppTheme>, tone: "success" | "warning" | "danger" | "info" | "neutral") {
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

export function BookingSummaryCard({
  booking,
  compact = false,
  onPress,
}: {
  booking: CustomerBookingSummary;
  compact?: boolean;
  onPress?: () => void;
}) {
  const theme = useAppTheme();
  const paymentMeta = getPaymentStatusMeta(booking.payment_status);
  const sessionMeta = getSessionStatusMeta(booking.status);
  const sessionTone = toneStyles(theme, sessionMeta.tone);
  const paymentTone = toneStyles(theme, paymentMeta.tone);
  const progressText =
    booking.balance_due > 0
      ? `${formatMoney(booking.paid_amount)} dibayar`
      : "Pembayaran sudah lengkap";

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.foreground,
          padding: compact ? 14 : 16,
          opacity: onPress ? 1 : 0.98,
        },
      ]}
    >
      <View
        style={[
          styles.topAccent,
          { backgroundColor: theme.colors.tintSoft, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.topAccentText, { color: theme.colors.accent }]}>
          Booking snapshot
        </Text>
        <View style={[styles.topAccentDot, { backgroundColor: theme.colors.highlight }]} />
      </View>

      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={[styles.tenant, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
            {booking.tenant_name || "Tenant"}
          </Text>
          <Text style={[styles.title, { color: theme.colors.foreground }]} numberOfLines={2}>
            {booking.resource || "Booking"}
          </Text>
          <Text style={[styles.ref, { color: theme.colors.foregroundMuted }]}>
            Ref {booking.id.slice(0, 8).toUpperCase()}
          </Text>
        </View>
        {onPress ? (
          <View style={[styles.arrowWrap, { backgroundColor: theme.colors.surfaceAlt }]}>
            <Feather name="arrow-up-right" size={16} color={theme.colors.foreground} />
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.summaryRibbon,
          { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
        ]}
      >
        <View style={styles.summaryCopy}>
          <Text style={[styles.summaryLabel, { color: theme.colors.foregroundMuted }]}>
            Total belanja
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.foreground }]}>
            {formatMoney(booking.grand_total)}
          </Text>
        </View>
        <Text style={[styles.summaryHint, { color: theme.colors.accent }]}>
          {progressText}
        </Text>
      </View>

      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: sessionTone.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: sessionTone.color }]}>{sessionMeta.label}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: paymentTone.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: paymentTone.color }]}>{paymentMeta.label}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <MetricCell label="Tanggal" value={formatDate(booking.date)} theme={theme} />
        <MetricCell label="Jam" value={formatTimeRange(booking.date, booking.end_date)} theme={theme} />
        <MetricCell label="DP" value={formatMoney(booking.deposit_amount)} theme={theme} />
        <MetricCell label="Sisa" value={formatMoney(booking.balance_due)} theme={theme} />
      </View>
    </Pressable>
  );
}

function MetricCell({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={[styles.metric, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
      <Text style={[styles.metricLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  topAccent: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  topAccentText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  topAccentDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  tenant: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
  },
  ref: {
    fontSize: 11,
    fontWeight: "600",
  },
  arrowWrap: {
    width: 38,
    height: 38,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRibbon: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryCopy: {
    flex: 1,
    gap: 3,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  summaryHint: {
    maxWidth: 110,
    textAlign: "right",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  badges: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metric: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "900",
  },
});
