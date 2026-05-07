import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { InfoCard } from "@/components/info-card";
import { useCustomerDashboardQuery } from "@/features/customer/queries";
import { BookingSummaryCard } from "@/components/booking-summary-card";
import { useAppTheme } from "@/theme";

export default function CustomerHistoryScreen() {
  const theme = useAppTheme();
  const dashboard = useCustomerDashboardQuery();
  const history = dashboard.data?.past_history || [];
  const tenantCount = new Set(history.map((booking) => booking.tenant_slug).filter(Boolean)).size;

  return (
    <ScreenShell headerVariant="minimal" eyebrow="Riwayat" title="Booking selesai">
      {dashboard.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={{ color: theme.colors.foregroundMuted }}>Memuat riwayat booking...</Text>
        </View>
      ) : (
        <View style={styles.metaRow}>
          <StatPill label="Riwayat" value={String(history.length)} theme={theme} />
          <StatPill label="Tenant" value={String(tenantCount)} theme={theme} />
        </View>
      )}

      {history.length > 0 ? (
        <View style={styles.stack}>
          {history.map((booking) => (
            <BookingSummaryCard
              key={booking.id}
              booking={booking}
              compact
              variant="history"
              onPress={() =>
                router.push({
                  pathname: "/(customer)/bookings/[id]",
                  params: { id: booking.id },
                })
              }
            />
          ))}
        </View>
      ) : (
        <InfoCard
          label="Riwayat"
          value="Belum ada booking"
          hint="Setelah booking selesai, riwayatnya akan muncul di halaman ini."
        />
      )}
    </ScreenShell>
  );
}

function StatPill({
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
    <View
      style={[
        styles.statPill,
        {
          backgroundColor,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text style={[styles.statLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.colors.foreground }]}>{value}</Text>
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
  statPill: {
    minWidth: "31%",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "900",
  },
  stack: {
    gap: 12,
  },
});
