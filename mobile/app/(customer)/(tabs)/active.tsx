import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenShell } from "@/components/screen-shell";
import { InfoCard } from "@/components/info-card";
import { useCustomerDashboardQuery } from "@/features/customer/queries";
import { BookingSummaryCard } from "@/components/booking-summary-card";
import { useAppTheme } from "@/theme";

export default function CustomerActiveScreen() {
  const theme = useAppTheme();
  const dashboard = useCustomerDashboardQuery();
  const activeBookings = dashboard.data?.active_bookings || [];
  const tenantCount = new Set(activeBookings.map((booking) => booking.tenant_slug).filter(Boolean)).size;

  return (
    <ScreenShell headerVariant="minimal" eyebrow="Aktif" title="Booking aktif">
      {dashboard.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={{ color: theme.colors.foregroundMuted }}>Memuat booking aktif...</Text>
        </View>
      ) : (
        <View style={styles.metaRow}>
          <Metric label="Live" value={String(activeBookings.length)} theme={theme} />
          <Metric label="Tenant" value={String(tenantCount)} theme={theme} />
          <Metric label="Status" value={activeBookings.length ? "Live" : "Idle"} theme={theme} />
        </View>
      )}

      {activeBookings.length > 0 ? (
        <View style={styles.stack}>
          {activeBookings.map((booking) => (
            <BookingSummaryCard
              key={booking.id}
              booking={booking}
              onPress={() =>
                router.push({
                  pathname: "/(customer)/bookings/[id]/live",
                  params: { id: booking.id },
                })
              }
            />
          ))}
        </View>
      ) : (
        <InfoCard
          label="Booking aktif"
          value="Belum ada booking aktif"
          hint="Kalau belum ada sesi berjalan, kembali ke home untuk mulai booking baru."
        />
      )}
    </ScreenShell>
  );
}

function Metric({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  const backgroundColor = theme.mode === "dark" ? theme.colors.surface : theme.colors.surfaceAlt;
  return (
    <View style={[styles.metric, { backgroundColor, borderColor: theme.colors.border }]}>
      <Text style={[styles.metricLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metric: {
    minWidth: "31%",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "900",
  },
  stack: {
    gap: 12,
  },
});
