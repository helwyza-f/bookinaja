import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme";
import { formatMoney, getDiscoveryImage, getDiscoveryLabel, getDiscoverySummary, getDiscoveryTitle } from "@/features/discovery/utils";
import type { DiscoveryTenant, TenantDirectoryItem } from "@/features/discovery/types";

export function DiscoveryTenantCard({
  item,
  onPress,
}: {
  item: DiscoveryTenant | TenantDirectoryItem;
  onPress?: () => void;
}) {
  const theme = useAppTheme();
  const image = getDiscoveryImage(item);
  const category = getDiscoveryLabel(item);
  const highlight = "promo_label" in item && item.promo_label ? item.promo_label : item.top_resource_name;
  const initials = String(getDiscoveryTitle(item) || "BK")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.foreground,
        },
      ]}
    >
      <View style={styles.mediaWrap}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View
            style={[
              styles.imageFallback,
              { backgroundColor: theme.colors.inkSoft },
            ]}
          >
            <View
              style={[
                styles.imageFallbackBadge,
                { backgroundColor: theme.colors.accent },
              ]}
            >
              <Text style={styles.imageFallbackBadgeText}>{initials || "BK"}</Text>
            </View>
          </View>
        )}
        <View style={[styles.imageOverlay, { backgroundColor: theme.colors.overlay }]} />
        <View style={styles.imageMeta}>
          <View style={[styles.kicker, { backgroundColor: theme.colors.accentSoft }]}>
            <Text style={[styles.kickerText, { color: theme.colors.accent }]}>{category}</Text>
          </View>
          {highlight ? (
            <View style={[styles.tag, { backgroundColor: theme.colors.highlightSoft }]}>
              <Text style={[styles.tagText, { color: theme.colors.highlight }]} numberOfLines={1}>
                {highlight}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>{getDiscoveryTitle(item)}</Text>
        <Text style={[styles.summary, { color: theme.colors.foregroundMuted }]} numberOfLines={2}>
          {getDiscoverySummary(item)}
        </Text>
        <View style={styles.footer}>
          {"starting_price" in item && item.starting_price ? (
            <View style={styles.priceWrap}>
              <Text style={[styles.priceLabel, { color: theme.colors.foregroundMuted }]}>Mulai dari</Text>
              <Text style={[styles.price, { color: theme.colors.foreground }]}>
                {formatMoney(item.starting_price)}
              </Text>
            </View>
          ) : (
            <View style={styles.priceWrap}>
              <Text style={[styles.priceLabel, { color: theme.colors.foregroundMuted }]}>Siap dijelajahi</Text>
              <Text style={[styles.price, { color: theme.colors.foreground }]}>Lihat detail</Text>
            </View>
          )}
          <View style={[styles.ctaPill, { backgroundColor: theme.colors.tintSoft, borderColor: theme.colors.border }]}>
            <Text style={[styles.ctaText, { color: theme.colors.accent }]}>Buka</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: 28,
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  mediaWrap: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 164,
  },
  imageFallback: {
    width: "100%",
    height: 164,
    alignItems: "center",
    justifyContent: "center",
  },
  imageFallbackBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  imageFallbackBadgeText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  imageMeta: {
    position: "absolute",
    right: 14,
    bottom: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  kicker: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: "55%",
  },
  kickerText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "800",
  },
  body: {
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  summary: {
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  priceWrap: {
    flex: 1,
    gap: 2,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  price: {
    fontSize: 15,
    fontWeight: "900",
  },
  ctaPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
});
