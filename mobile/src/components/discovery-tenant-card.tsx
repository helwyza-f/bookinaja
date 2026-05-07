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

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {image ? <Image source={{ uri: image }} style={styles.image} resizeMode="cover" /> : null}
      <View style={styles.body}>
        <Text style={[styles.label, { color: theme.colors.accent }]}>{getDiscoveryLabel(item)}</Text>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>{getDiscoveryTitle(item)}</Text>
        <Text style={[styles.summary, { color: theme.colors.foregroundMuted }]} numberOfLines={2}>
          {getDiscoverySummary(item)}
        </Text>
        {"starting_price" in item && item.starting_price ? (
          <Text style={[styles.price, { color: theme.colors.foreground }]}>
            Mulai {formatMoney(item.starting_price)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: 22,
    borderWidth: 1,
  },
  image: {
    width: "100%",
    height: 138,
  },
  body: {
    padding: 14,
    gap: 5,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
  },
  price: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
});
