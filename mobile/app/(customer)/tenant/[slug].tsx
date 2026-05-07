import { useLocalSearchParams, router } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
  const insetSurface = theme.mode === "dark" ? theme.colors.surface : theme.colors.surfaceAlt;
  const raisedSurface = theme.mode === "dark" ? theme.colors.surface : theme.colors.card;
  const softSurface = theme.mode === "dark" ? theme.colors.surfaceAlt : theme.colors.surface;
  const allResources = useMemo(() => landing.data?.resources || [], [landing.data?.resources]);

  const resources = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return allResources;
    return allResources.filter((resource) =>
      [resource.name, resource.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [allResources, query]);

  const startingPrice = useMemo(() => {
    const prices = allResources.flatMap((resource) =>
      (resource.items || [])
        .filter((item) => item.item_type === "main_option" || item.item_type === "main")
        .map((item) => Number(item.price || 0))
        .filter((price) => price > 0),
    );
    if (!prices.length) return 0;
    return Math.min(...prices);
  }, [allResources]);

  const aboutSummary = useMemo(() => {
    const source = (profile?.about_us || profile?.tagline || "").trim();
    if (!source) return "";
    return source.length > 220 ? `${source.slice(0, 217).trim()}...` : source;
  }, [profile?.about_us, profile?.tagline]);

  const galleryImages = useMemo(() => {
    const pool = [
      profile?.banner_url,
      ...allResources.flatMap((resource) => [resource.image_url, ...(resource.gallery || [])]),
    ]
      .filter((image): image is string => Boolean(image))
      .filter((image, index, array) => array.indexOf(image) === index);

    return pool.slice(0, 4);
  }, [allResources, profile?.banner_url]);

  const featuredResources = useMemo(() => {
    return [...allResources]
      .map((resource) => {
        const mainItems = (resource.items || []).filter(
          (item) => item.item_type === "main_option" || item.item_type === "main",
        );
        const cheapestMain = [...mainItems].sort(
          (a, b) => Number(a.price || 0) - Number(b.price || 0),
        )[0];
        return {
          ...resource,
          cheapestMain,
        };
      })
      .sort((left, right) => {
        const leftImageScore = left.image_url ? 1 : 0;
        const rightImageScore = right.image_url ? 1 : 0;
        if (leftImageScore !== rightImageScore) return rightImageScore - leftImageScore;
        return Number(left.cheapestMain?.price || 0) - Number(right.cheapestMain?.price || 0);
      })
      .slice(0, 2);
  }, [allResources]);

  return (
    <ScreenShell
      headerVariant="none"
      eyebrow="Booking"
      title={profile?.name || "Tenant"}
      subtitle={profile?.tagline || "Pilih resource yang tersedia lalu lanjutkan booking."}
    >
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backButton,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Feather name="arrow-left" size={16} color={theme.colors.foreground} />
          <Text style={[styles.backText, { color: theme.colors.foreground }]}>Kembali</Text>
        </Pressable>
      </View>

      {landing.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={{ color: theme.colors.foregroundMuted }}>Memuat tenant...</Text>
        </View>
      ) : null}

      {profile ? (
        <View
          style={[
            styles.hero,
            { backgroundColor: raisedSurface, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.heroMediaWrap}>
            {profile.banner_url ? (
              <Image source={{ uri: profile.banner_url }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View
                style={[
                  styles.heroImage,
                  styles.heroFallback,
                  { backgroundColor: insetSurface },
                ]}
              >
                <Feather name="image" size={26} color={theme.colors.foregroundMuted} />
              </View>
            )}
            <View style={[styles.heroOverlay, { backgroundColor: theme.colors.overlay }]} />
            <View style={styles.heroMeta}>
              <View
                style={[
                  styles.heroPill,
                  { backgroundColor: theme.colors.accentSoft },
                ]}
              >
                <Text style={[styles.heroPillText, { color: theme.colors.accent }]}>
                  {profile.business_category || profile.business_type || "Tenant"}
                </Text>
              </View>
              <View
                style={[
                  styles.heroPill,
                  { backgroundColor: startingPrice ? theme.colors.highlightSoft : theme.colors.highlightSoft },
                ]}
              >
                <Text style={[styles.heroPillText, { color: theme.colors.highlight }]}>
                  {startingPrice ? `Mulai ${formatMoney(startingPrice)}` : "Lihat unit tersedia"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.heroBody}>
            <Text style={[styles.heroTitle, { color: theme.colors.foreground }]}>
              {profile.name}
            </Text>
            {profile.tagline ? (
              <Text style={[styles.heroTagline, { color: theme.colors.foregroundMuted }]}>
                {profile.tagline}
              </Text>
            ) : null}
            <View style={styles.heroInfoRow}>
              <View
                style={[
                  styles.infoPill,
                  {
                    backgroundColor: softSurface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Feather name="clock" size={14} color={theme.colors.foregroundMuted} />
                <Text style={[styles.infoPillText, { color: theme.colors.foreground }]}>
                  {profile.open_time || "-"} - {profile.close_time || "-"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {aboutSummary ? (
        <View
          style={[
            styles.storyCard,
            { backgroundColor: raisedSurface, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.sectionEyebrow, { color: theme.colors.foregroundMuted }]}>
            Tentang bisnis
          </Text>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
            Cocok buat sesi seperti apa?
          </Text>
          <Text style={[styles.storyBody, { color: theme.colors.foregroundMuted }]}>
            {aboutSummary}
          </Text>
        </View>
      ) : null}

      {galleryImages.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionEyebrow, { color: theme.colors.foregroundMuted }]}>
              Suasana
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
              Lihat tempatnya dulu
            </Text>
          </View>
          <View style={styles.galleryGrid}>
            {galleryImages.map((image, index) => (
              <Image
                key={`${image}-${index}`}
                source={{ uri: image }}
                style={[
                  styles.galleryImage,
                  index === 0 ? styles.galleryLead : styles.galleryThumb,
                ]}
                resizeMode="cover"
              />
            ))}
          </View>
        </View>
      ) : null}

      {featuredResources.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionEyebrow, { color: theme.colors.foregroundMuted }]}>
              Pilihan cepat
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
              Unit yang paling menarik
            </Text>
          </View>
          <View style={styles.stack}>
            {featuredResources.map((resource) => (
              <Pressable
                key={`featured-${resource.id}`}
                onPress={() =>
                  router.push({
                    pathname: "/(customer)/resource/[id]",
                    params: { id: resource.id, slug },
                  })
                }
                style={[
                  styles.featuredCard,
                  { backgroundColor: raisedSurface, borderColor: theme.colors.border },
                ]}
              >
                {resource.image_url ? (
                  <Image source={{ uri: resource.image_url }} style={styles.featuredImage} resizeMode="cover" />
                ) : (
                  <View
                    style={[
                      styles.featuredImage,
                      styles.featuredFallback,
                      { backgroundColor: insetSurface },
                    ]}
                  >
                    <Feather name="image" size={22} color={theme.colors.foregroundMuted} />
                  </View>
                )}
                <View style={styles.featuredBody}>
                  <View style={styles.featuredHeader}>
                    <Text style={[styles.featuredName, { color: theme.colors.foreground }]}>
                      {resource.name}
                    </Text>
                    <View
                      style={[
                        styles.featuredTag,
                        { backgroundColor: theme.colors.accentSoft },
                      ]}
                    >
                      <Text style={[styles.featuredTagText, { color: theme.colors.accent }]}>
                        {resource.category || "Resource"}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.featuredMeta, { color: theme.colors.foregroundMuted }]} numberOfLines={2}>
                    {resource.description?.trim()
                      ? resource.description
                      : `${resource.items?.length || 0} opsi layanan siap dipilih untuk booking ini.`}
                  </Text>
                  <View style={styles.featuredFooter}>
                    <Text style={[styles.featuredPrice, { color: theme.colors.foreground }]}>
                      {resource.cheapestMain ? `Mulai ${formatMoney(Number(resource.cheapestMain.price || 0))}` : "Lihat detail unit"}
                    </Text>
                    <View
                      style={[
                        styles.featuredCta,
                        { backgroundColor: insetSurface, borderColor: theme.colors.border },
                      ]}
                    >
                      <Text style={[styles.featuredCtaText, { color: theme.colors.foreground }]}>
                        Pilih
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.searchBar,
          { backgroundColor: raisedSurface, borderColor: theme.colors.border },
        ]}
      >
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
          <Text style={[styles.sectionEyebrow, { color: theme.colors.foregroundMuted }]}>
            Resource
          </Text>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
              Pilih unit
            </Text>
            <View
              style={[
                styles.sectionCount,
                {
                  backgroundColor: softSurface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.sectionCountText, { color: theme.colors.foregroundMuted }]}>
                {resources.length}
              </Text>
            </View>
          </View>
        </View>

        {resources.length ? (
          <View style={styles.stack}>
            {resources.map((resource) => {
              const mainItems = resource.items?.filter(
                (item) => item.item_type === "main_option" || item.item_type === "main",
              );
              const cheapestMain = mainItems?.sort(
                (a, b) => Number(a.price || 0) - Number(b.price || 0),
              )[0];

              return (
                <Pressable
                  key={resource.id}
                  onPress={() =>
                    router.push({
                      pathname: "/(customer)/resource/[id]",
                      params: { id: resource.id, slug },
                    })
                  }
                  style={[
                    styles.resourceCard,
                    { backgroundColor: raisedSurface, borderColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.resourceCopy}>
                    <Text style={[styles.resourceName, { color: theme.colors.foreground }]}>
                      {resource.name}
                    </Text>
                    <Text style={[styles.resourceMeta, { color: theme.colors.foregroundMuted }]}>
                      {(resource.category || "Resource") +
                        " | " +
                        String(resource.items?.length || 0) +
                        " opsi"}
                    </Text>
                    {cheapestMain ? (
                      <Text style={[styles.resourcePrice, { color: theme.colors.foreground }]}>
                        Mulai {formatMoney(Number(cheapestMain.price || 0))}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.resourceAction,
                      { backgroundColor: insetSurface },
                    ]}
                  >
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
  topRow: {
    marginTop: 10,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
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
    borderRadius: 28,
    overflow: "hidden",
  },
  heroMediaWrap: {
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: 196,
  },
  heroFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroMeta: {
    position: "absolute",
    right: 14,
    bottom: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: "58%",
  },
  heroPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroBody: {
    padding: 18,
    gap: 10,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  heroTagline: {
    fontSize: 13,
    lineHeight: 20,
  },
  heroInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  storyCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  storyBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  infoPill: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoPillText: {
    fontSize: 12,
    fontWeight: "700",
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
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
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
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  galleryImage: {
    borderRadius: 20,
  },
  galleryLead: {
    width: "100%",
    height: 176,
  },
  galleryThumb: {
    width: "31%",
    height: 94,
  },
  sectionCount: {
    minWidth: 34,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: "800",
  },
  stack: {
    gap: 12,
  },
  featuredCard: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
  },
  featuredImage: {
    width: "100%",
    height: 148,
  },
  featuredFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  featuredBody: {
    padding: 14,
    gap: 10,
  },
  featuredHeader: {
    gap: 8,
  },
  featuredName: {
    fontSize: 17,
    fontWeight: "900",
  },
  featuredTag: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  featuredTagText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  featuredMeta: {
    fontSize: 13,
    lineHeight: 19,
  },
  featuredFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  featuredPrice: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  featuredCta: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  featuredCtaText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
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
