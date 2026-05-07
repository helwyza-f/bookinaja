import { useLocalSearchParams, router } from "expo-router";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ScreenShell } from "@/components/screen-shell";
import { InfoCard } from "@/components/info-card";
import { useAppTheme } from "@/theme";
import { useTenantLandingQuery } from "@/features/tenant/queries";
import { formatMoney } from "@/features/booking/utils";

export default function TenantDetailScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = String(params.slug || "");
  const [query, setQuery] = useState("");
  const landing = useTenantLandingQuery(slug);
  const profile = landing.data?.profile;

  const resources = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const all = landing.data?.resources || [];
    if (!normalized) return all;
    return all.filter((resource) =>
      [resource.name, resource.category].filter(Boolean).join(" ").toLowerCase().includes(normalized),
    );
  }, [landing.data?.resources, query]);

  return (
    <ScreenShell
      eyebrow="Booking"
      title={profile?.name || "Tenant"}
      subtitle={profile?.tagline || "Pilih resource yang tersedia lalu lanjutkan booking."}
    >
      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <Feather name="arrow-left" size={16} color={theme.colors.foreground} />
        <Text style={[styles.backText, { color: theme.colors.foreground }]}>Kembali</Text>
      </Pressable>

      {landing.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={{ color: theme.colors.foregroundMuted }}>Memuat tenant...</Text>
        </View>
      ) : null}

      {profile ? (
        <View style={[styles.hero, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {profile.banner_url ? (
            <Image source={{ uri: profile.banner_url }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroFallback, { backgroundColor: theme.colors.surfaceAlt }]}>
              <Feather name="image" size={26} color={theme.colors.foregroundMuted} />
            </View>
          )}

          <View style={styles.heroBody}>
            <Text style={[styles.heroEyebrow, { color: theme.colors.accent }]}>Available Units</Text>
            <Text style={[styles.heroTitle, { color: theme.colors.foreground }]}>{profile.name}</Text>
            <Text style={[styles.heroSubtitle, { color: theme.colors.foregroundMuted }]}>
              {profile.business_category || profile.business_type || "Tenant"} · {profile.open_time || "-"} - {profile.close_time || "-"}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.searchBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Feather name="search" size={18} color={theme.colors.foregroundMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Cari unit atau kategori..."
          placeholderTextColor={theme.colors.foregroundMuted}
          style={[styles.input, { color: theme.colors.foreground }]}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionEyebrow, { color: theme.colors.foregroundMuted }]}>Resource</Text>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Pilih unit</Text>
        </View>

        {resources.length ? (
          <View style={styles.stack}>
            {resources.map((resource) => {
              const mainItems = resource.items?.filter(
                (item) => item.item_type === "main_option" || item.item_type === "main",
              );
              const cheapestMain = mainItems?.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))[0];

              return (
                <Pressable
                  key={resource.id}
                  onPress={() =>
                    router.push({
                      pathname: "/(customer)/resource/[id]",
                      params: { id: resource.id, slug },
                    })
                  }
                  style={[styles.resourceCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                >
                  <View style={styles.resourceCopy}>
                    <Text style={[styles.resourceName, { color: theme.colors.foreground }]}>
                      {resource.name}
                    </Text>
                    <Text style={[styles.resourceMeta, { color: theme.colors.foregroundMuted }]}>
                      {resource.category || "Resource"} · {resource.items?.length || 0} opsi
                    </Text>
                    {cheapestMain ? (
                      <Text style={[styles.resourcePrice, { color: theme.colors.foreground }]}>
                        Mulai {formatMoney(Number(cheapestMain.price || 0))}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.resourceAction, { backgroundColor: theme.colors.surfaceAlt }]}>
                    <Feather name="arrow-up-right" size={16} color={theme.colors.foreground} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : !landing.isLoading ? (
          <InfoCard
            label="Resource"
            value="Belum ada unit"
            hint="Saat tenant belum punya resource aktif, halaman ini tetap memberi fallback yang rapi."
          />
        ) : null}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backText: {
    fontSize: 13,
    fontWeight: "800",
  },
  center: {
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  hero: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: 172,
  },
  heroFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroBody: {
    padding: 16,
    gap: 5,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: "800",
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  searchBar: {
    minHeight: 52,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
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
  resourceCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  resourceCopy: {
    flex: 1,
    gap: 4,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: "800",
  },
  resourceMeta: {
    fontSize: 13,
  },
  resourcePrice: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "800",
  },
  resourceAction: {
    width: 34,
    height: 34,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
