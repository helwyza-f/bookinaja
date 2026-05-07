import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { ScreenShell } from "@/components/screen-shell";
import { InfoCard } from "@/components/info-card";
import { useAppTheme } from "@/theme";
import { useCustomerDashboardQuery } from "@/features/customer/queries";
import { useDiscoveryFeedQuery } from "@/features/discovery/queries";
import { BookingSummaryCard } from "@/components/booking-summary-card";
import { DiscoveryTenantCard } from "@/components/discovery-tenant-card";

export default function CustomerHomeScreen() {
  const theme = useAppTheme();
  const dashboard = useCustomerDashboardQuery();
  const feed = useDiscoveryFeedQuery();
  const customer = dashboard.data?.customer;
  const activeBooking = dashboard.data?.active_bookings?.[0];
  const featured = feed.data?.featured?.slice(0, 3) || [];
  const initials = String(customer?.name || "CU")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return (
    <ScreenShell eyebrow="Home" title={`Halo, ${customer?.name?.split(" ")[0] || "Customer"}`} subtitle="Lanjutkan booking aktifmu atau cari tenant berikutnya.">
      {dashboard.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={{ color: theme.colors.foregroundMuted }}>Memuat dashboard customer...</Text>
        </View>
      ) : (
        <View style={[styles.hero, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={[styles.heroEyebrow, { color: theme.colors.accent }]}>Customer Hub</Text>
              <Text style={[styles.heroTitle, { color: theme.colors.foreground }]}>Akses Bookinaja kamu</Text>
              <Text style={[styles.heroHint, { color: theme.colors.foregroundMuted }]}>Akses cepat untuk booking dan jelajah.</Text>
            </View>
            <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.avatarText}>{initials || "CU"}</Text>
            </View>
          </View>

          <View style={styles.metrics}>
            <MetricTile label="Points" value={String(dashboard.data?.points || 0)} theme={theme} />
            <MetricTile label="Tier" value={customer?.tier || "NEW"} theme={theme} />
            <MetricTile label="Aktif" value={String(dashboard.data?.active_bookings?.length || 0)} theme={theme} />
          </View>

          <View style={styles.quickLinks}>
            <QuickLink label="Booking Aktif" icon="play-circle" onPress={() => router.push("/(customer)/(tabs)/active")} theme={theme} />
            <QuickLink label="Riwayat" icon="clock" onPress={() => router.push("/(customer)/(tabs)/history")} theme={theme} />
            <QuickLink label="Profil" icon="user" onPress={() => router.push("/(customer)/(tabs)/profile")} theme={theme} />
            <QuickLink label="Jelajah" icon="compass" onPress={() => router.push("/(customer)/(tabs)/explore")} theme={theme} />
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionEyebrow, { color: theme.colors.foregroundMuted }]}>Lanjutkan</Text>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Booking aktif kamu</Text>
        </View>
        {activeBooking ? (
          <BookingSummaryCard
            booking={activeBooking}
            onPress={() =>
              router.push({
                pathname: "/(customer)/bookings/[id]",
                params: { id: activeBooking.id },
              })
            }
          />
        ) : (
          <InfoCard
            label="Booking aktif"
            value="Belum ada booking aktif"
            hint="Kalau belum ada sesi aktif, mulai dari jelajah tenant."
          />
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionEyebrow, { color: theme.colors.foregroundMuted }]}>Jelajahi</Text>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Sorotan tenant</Text>
        </View>
        <View style={styles.stack}>
          {feed.isLoading ? (
            <InfoCard label="Discovery" value="Memuat feed" hint="Tenant pilihan akan muncul di sini." />
          ) : featured.length > 0 ? (
            featured.map((item) => (
              <DiscoveryTenantCard
                key={item.id}
                item={item}
                onPress={() => {
                  if (!item.slug) return;
                  router.push({
                    pathname: "/(customer)/tenant/[slug]",
                    params: { slug: item.slug },
                  });
                }}
              />
            ))
          ) : (
            <InfoCard
              label="Discovery"
              value="Belum ramai"
              hint="Tenant pilihan akan muncul di sini saat discovery mulai ramai."
            />
          )}
        </View>
      </View>
    </ScreenShell>
  );
}

function MetricTile({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={[styles.metricTile, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
      <Text style={[styles.metricLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.colors.foreground }]}>{value}</Text>
    </View>
  );
}

function QuickLink({
  label,
  icon,
  onPress,
  theme,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.quickLink, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
      <Feather name={icon} size={16} color={theme.colors.foreground} />
      <Text style={[styles.quickLinkText, { color: theme.colors.foreground }]}>{label}</Text>
    </Pressable>
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
    borderRadius: 24,
    padding: 16,
    gap: 14,
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
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  heroHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  metrics: {
    flexDirection: "row",
    gap: 8,
  },
  metricTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 10,
    gap: 3,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  quickLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickLink: {
    width: "48%",
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickLinkText: {
    fontSize: 13,
    fontWeight: "700",
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  stack: {
    gap: 12,
  },
});
