import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScreenShell } from "@/components/screen-shell";
import { InfoCard } from "@/components/info-card";
import { useAppTheme } from "@/theme";
import { useDiscoveryFeedQuery, usePublicTenantsQuery } from "@/features/discovery/queries";
import { DiscoveryTenantCard } from "@/components/discovery-tenant-card";
import type { DiscoveryTenant, TenantDirectoryItem } from "@/features/discovery/types";

const FILTER_ALL = "Semua";

function toSearchableText(item: DiscoveryTenant | TenantDirectoryItem) {
  return [item.name, item.business_category, item.business_type, item.tagline]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function CustomerExploreScreen() {
  const theme = useAppTheme();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(FILTER_ALL);
  const feed = useDiscoveryFeedQuery();
  const tenants = usePublicTenantsQuery();

  const quickCategories = useMemo(
    () => [FILTER_ALL, ...(feed.data?.quick_categories || [])],
    [feed.data?.quick_categories],
  );

  const items = useMemo(() => {
    const bySlug = new Map<string, DiscoveryTenant | TenantDirectoryItem>();
    (tenants.data || []).forEach((item) => {
      bySlug.set(item.slug, item);
    });
    (feed.data?.featured || []).forEach((item) => {
      if (item.slug) bySlug.set(item.slug, item);
    });
    return Array.from(bySlug.values());
  }, [feed.data?.featured, tenants.data]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return items.filter((item) => {
      const category = String(item.business_category || item.business_type || "").toLowerCase();
      const matchesCategory =
        activeCategory === FILTER_ALL || category === activeCategory.toLowerCase();
      const matchesQuery = !normalized || toSearchableText(item).includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, items, query]);

  const hero = feed.data?.hero;

  return (
    <ScreenShell
      eyebrow={hero?.eyebrow || "Jelajah"}
      title={hero?.title || "Temukan tenant"}
      subtitle={hero?.description || "Cari tempat dan kategori untuk booking berikutnya."}
    >
      <View style={[styles.searchBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Feather name="search" size={18} color={theme.colors.foregroundMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={hero?.search_hint || "Cari tenant, kategori, atau aktivitas"}
          placeholderTextColor={theme.colors.foregroundMuted}
          style={[styles.input, { color: theme.colors.foreground }]}
        />
      </View>

      <View style={styles.categoryRow}>
        {quickCategories.map((category) => {
          const active = activeCategory === category;
          return (
            <Pressable
              key={category}
              onPress={() => setActiveCategory(category)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: active ? theme.colors.accent : theme.colors.card,
                  borderColor: active ? theme.colors.accent : theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.categoryText, { color: active ? "#FFFFFF" : theme.colors.foreground }]}>
                {category}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {feed.data?.featured?.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionEyebrow, { color: theme.colors.foregroundMuted }]}>Sorotan</Text>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Pilihan untukmu</Text>
          </View>
          <View style={styles.stack}>
            {feed.data.featured.slice(0, 2).map((item) => (
              <DiscoveryTenantCard
                key={item.id}
                item={item}
                onPress={() =>
                  router.push({
                    pathname: "/(customer)/tenant/[slug]",
                    params: { slug: item.slug },
                  })
                }
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionEyebrow, { color: theme.colors.foregroundMuted }]}>Tenant</Text>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Semua bisnis</Text>
        </View>

        {filteredItems.length > 0 ? (
          <View style={styles.stack}>
            {filteredItems.map((item) => (
              <DiscoveryTenantCard
                key={item.slug}
                item={item}
                onPress={() =>
                  router.push({
                    pathname: "/(customer)/tenant/[slug]",
                    params: { slug: item.slug },
                  })
                }
              />
            ))}
          </View>
        ) : (
          <InfoCard
            label="Jelajah"
            value="Belum ada hasil"
            hint="Coba kategori lain atau ubah kata kuncinya."
          />
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
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
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  categoryChip: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "800",
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
