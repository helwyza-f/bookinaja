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

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          padding: compact ? 14 : 16,
          opacity: onPress ? 1 : 0.98,
        },
      ]}
    >
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
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  tenant: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
  },
  ref: {
    fontSize: 11,
    fontWeight: "600",
  },
  arrowWrap: {
    width: 34,
    height: 34,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badges: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
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
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    gap: 3,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "800",
  },
});
