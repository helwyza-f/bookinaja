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
    <ScreenShell
      headerVariant="minimal"
      eyebrow="Home"
      title={`Halo, ${customer?.name?.split(" ")[0] || "Customer"}`}
    >
      {dashboard.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={{ color: theme.colors.foregroundMuted }}>Memuat dashboard customer...</Text>
        </View>
      ) : (
        <View
          style={[
            styles.overviewCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.foreground,
            },
          ]}
        >
          <View style={styles.overviewTop}>
            <View style={styles.overviewCopy}>
              <Text style={[styles.overviewEyebrow, { color: theme.colors.accent }]}>
                Customer hub
              </Text>
              <Text style={[styles.overviewTitle, { color: theme.colors.foreground }]}>
                Lanjutkan booking atau cari tenant baru.
              </Text>
            </View>
            <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.avatarText}>{initials || "CU"}</Text>
            </View>
          </View>

          <View style={styles.overviewMeta}>
            <MetricPill
              label="Points"
              value={String(dashboard.data?.points || 0)}
              tone="accent"
              theme={theme}
            />
            <MetricPill
              label="Tier"
              value={customer?.tier || "NEW"}
              tone="highlight"
              theme={theme}
            />
            <MetricPill
              label="Aktif"
              value={String(dashboard.data?.active_bookings?.length || 0)}
              tone="ink"
              theme={theme}
            />
          </View>

          <View style={styles.quickLinks}>
            <QuickLink
              label="Booking aktif"
              hint="Lihat sesi"
              icon="play-circle"
              tone="accent"
              onPress={() => router.push("/(customer)/(tabs)/active")}
              theme={theme}
            />
            <QuickLink
              label="Riwayat"
              hint="Track transaksi"
              icon="clock"
              tone="highlight"
              onPress={() => router.push("/(customer)/(tabs)/history")}
              theme={theme}
            />
            <QuickLink
              label="Profil"
              hint="Update akun"
              icon="user"
              tone="ink"
              onPress={() => router.push("/(customer)/(tabs)/profile")}
              theme={theme}
            />
            <QuickLink
              label="Jelajah"
              hint="Cari tenant"
              icon="compass"
              tone="accent"
              onPress={() => router.push("/(customer)/(tabs)/explore")}
              theme={theme}
            />
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
                pathname: "/(customer)/bookings/[id]/live",
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

function MetricPill({
  label,
  value,
  tone,
  theme,
}: {
  label: string;
  value: string;
  tone: "accent" | "highlight" | "ink";
  theme: ReturnType<typeof useAppTheme>;
}) {
  const palette =
    tone === "highlight"
      ? { background: theme.colors.highlightSoft, value: theme.colors.highlight }
      : tone === "ink"
        ? { background: theme.colors.inkSoft, value: theme.mode === "dark" ? theme.colors.foreground : theme.colors.primary }
        : { background: theme.colors.accentSoft, value: theme.colors.accent };
  const borderColor = theme.mode === "dark" ? "transparent" : theme.colors.border;

  return (
    <View style={[styles.metricPill, { backgroundColor: palette.background, borderColor }]}>
      <Text style={[styles.metricLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: palette.value }]}>{value}</Text>
    </View>
  );
}

function QuickLink({
  label,
  hint,
  icon,
  tone,
  onPress,
  theme,
}: {
  label: string;
  hint: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  tone: "accent" | "highlight" | "ink";
  onPress: () => void;
  theme: ReturnType<typeof useAppTheme>;
}) {
  const palette =
    tone === "highlight"
      ? { background: theme.colors.highlightSoft, icon: theme.colors.highlight }
      : tone === "ink"
        ? { background: theme.colors.inkSoft, icon: theme.colors.primary }
        : { background: theme.colors.accentSoft, icon: theme.colors.accent };
  const softSurface = theme.mode === "dark" ? theme.colors.surfaceAlt : theme.colors.surface;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.quickLink,
        { backgroundColor: softSurface, borderColor: theme.colors.border },
      ]}
    >
      <View style={[styles.quickLinkIcon, { backgroundColor: palette.background }]}>
        <Feather name={icon} size={15} color={palette.icon} />
      </View>
      <View style={styles.quickLinkCopy}>
        <Text style={[styles.quickLinkText, { color: theme.colors.foreground }]}>{label}</Text>
        <Text style={[styles.quickLinkHint, { color: theme.colors.foregroundMuted }]}>{hint}</Text>
      </View>
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
  overviewCard: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
    gap: 14,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  overviewTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  overviewCopy: {
    flex: 1,
    gap: 4,
  },
  overviewEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  overviewTitle: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 24,
  },
  overviewMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  metricPill: {
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
  quickLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickLink: {
    width: "48%",
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  quickLinkIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLinkCopy: {
    flex: 1,
    gap: 3,
  },
  quickLinkText: {
    fontSize: 13,
    fontWeight: "800",
  },
  quickLinkHint: {
    fontSize: 11,
    lineHeight: 16,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  stack: {
    gap: 12,
  },
});
