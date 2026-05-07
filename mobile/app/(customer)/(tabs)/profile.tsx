import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { ScreenShell } from "@/components/screen-shell";
import { useSessionStore } from "@/stores/session-store";
import { useAppTheme } from "@/theme";
import { useCustomerDashboardQuery } from "@/features/customer/queries";

export default function CustomerProfileScreen() {
  const theme = useAppTheme();
  const signOut = useSessionStore((state) => state.signOut);
  const dashboard = useCustomerDashboardQuery();
  const customer = dashboard.data?.customer;
  const initials = String(customer?.name || "CU")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  const raisedSurface = theme.mode === "dark" ? theme.colors.surface : theme.colors.card;

  return (
    <ScreenShell
      headerVariant="minimal"
      eyebrow="Profil"
      title="Akun customer"
    >
      <View
        style={[
          styles.profileCard,
          { backgroundColor: raisedSurface, borderColor: theme.colors.border },
        ]}
      >
        <View style={styles.profileTop}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
            <Text style={[styles.avatarText, { color: theme.colors.accentContrast }]}>{initials || "CU"}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={[styles.profileTitle, { color: theme.colors.foreground }]}>
              {customer?.name || "Customer"}
            </Text>
            <Text style={[styles.profileHint, { color: theme.colors.foregroundMuted }]}>
              {customer?.email || customer?.phone || "Data akun akan tersinkron di sini."}
            </Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <MetricTile label="Poin" value={String(dashboard.data?.points || 0)} theme={theme} />
          <MetricTile
            label="Tier"
            value={String(customer?.tier || "NEW").toUpperCase()}
            theme={theme}
          />
          <MetricTile
            label="Riwayat"
            value={String(dashboard.data?.past_history?.length || 0)}
            theme={theme}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.foregroundMuted }]}>Akun</Text>
        <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Info akun</Text>
        <InfoRow label="Nama" value={customer?.name || "-"} theme={theme} />
        <InfoRow label="Email" value={customer?.email || "-"} theme={theme} />
        <InfoRow label="WhatsApp" value={customer?.phone || "-"} theme={theme} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionEyebrow, { color: theme.colors.foregroundMuted }]}>Aksi</Text>
        <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Aksi cepat</Text>
        <ActionCard
          label="Riwayat booking"
          hint="Lihat semua booking yang selesai."
          icon="clock"
          theme={theme}
          onPress={() => router.push("/(customer)/(tabs)/history")}
        />
        <ActionCard
          label="Jelajah tenant"
          hint="Cari bisnis lain untuk booking berikutnya."
          icon="compass"
          theme={theme}
          onPress={() => router.push("/(customer)/(tabs)/explore")}
        />
      </View>

      <Pressable
        onPress={() => {
          void signOut();
          router.replace("/(auth)/login");
        }}
        style={[styles.logout, { backgroundColor: raisedSurface, borderColor: theme.colors.border }]}
      >
        <Text style={[styles.logoutText, { color: theme.colors.foreground }]}>Keluar</Text>
      </Pressable>
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
    <View style={[styles.metricTile, { backgroundColor: theme.mode === "dark" ? theme.colors.surface : theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
      <Text style={[styles.metricLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.colors.foreground }]}>{value}</Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={[styles.infoRow, { backgroundColor: theme.mode === "dark" ? theme.colors.surface : theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styles.infoLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.colors.foreground }]}>{value}</Text>
    </View>
  );
}

function ActionCard({
  label,
  hint,
  icon,
  theme,
  onPress,
}: {
  label: string;
  hint: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  theme: ReturnType<typeof useAppTheme>;
  onPress: () => void;
}) {
  const iconSurface = theme.mode === "dark" ? theme.colors.surface : theme.colors.surfaceAlt;
  const cardSurface = theme.mode === "dark" ? theme.colors.surface : theme.colors.card;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.action, { backgroundColor: cardSurface, borderColor: theme.colors.border }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: iconSurface }]}>
        <Feather name={icon} size={16} color={theme.colors.foreground} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={[styles.actionTitle, { color: theme.colors.foreground }]}>{label}</Text>
        <Text style={[styles.actionHint, { color: theme.colors.foregroundMuted }]}>{hint}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={theme.colors.foregroundMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 14,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  profileCopy: {
    flex: 1,
    gap: 4,
  },
  profileTitle: {
    fontSize: 19,
    fontWeight: "800",
  },
  profileHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricTile: {
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
  section: {
    gap: 10,
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
  infoRow: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 3,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  action: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCopy: {
    flex: 1,
    gap: 3,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  actionHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  logout: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
