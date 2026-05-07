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

  return (
    <ScreenShell eyebrow="Riwayat" title="Booking selesai" subtitle="Semua booking yang sudah selesai ada di sini.">
      {dashboard.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={{ color: theme.colors.foregroundMuted }}>Memuat riwayat booking...</Text>
        </View>
      ) : (
        <View style={[styles.hero, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.heroLabel, { color: theme.colors.foregroundMuted }]}>Riwayat</Text>
          <Text style={[styles.heroValue, { color: theme.colors.foreground }]}>{history.length} item</Text>
        </View>
      )}

      {history.length > 0 ? (
        <View style={styles.stack}>
          {history.map((booking) => (
            <BookingSummaryCard
              key={booking.id}
              booking={booking}
              compact
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

const styles = StyleSheet.create({
  loading: {
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  hero: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 4,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  heroValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  stack: {
    gap: 12,
  },
});
