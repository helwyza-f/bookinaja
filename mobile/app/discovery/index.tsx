import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Text, TextInput, View, Pressable, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { DiscoveryCard } from "@/components/discovery-card";
import { DiscoveryFeedResponse, DiscoveryTenant } from "@/lib/discovery";

function dedupeItems(items: DiscoveryTenant[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const itemKey = `${item.item_kind || "tenant"}:${item.id}:${item.slug}`;
    if (seen.has(itemKey)) return false;
    seen.add(itemKey);
    return true;
  });
}

export default function DiscoveryScreen() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const feedQuery = useQuery({
    queryKey: ["discovery-feed"],
    queryFn: () => apiFetch<DiscoveryFeedResponse>("/public/discover/feed"),
  });

  const categories = useMemo(
    () => ["Semua", ...(feedQuery.data?.quick_categories || [])],
    [feedQuery.data?.quick_categories],
  );

  const items = useMemo(() => {
    const feed = feedQuery.data;
    if (!feed) return [];
    const pool = dedupeItems([...feed.featured, ...feed.sections.flatMap((section) => section.items)]);
    const normalized = query.trim().toLowerCase();
    return pool.filter((item) => {
      const matchesQuery =
        !normalized ||
        `${item.name} ${item.business_category || ""} ${item.tagline || ""} ${item.feed_summary || ""}`
          .toLowerCase()
          .includes(normalized);
      const category = String(item.business_category || item.business_type || "").toLowerCase();
      const matchesCategory =
        activeCategory === "Semua" || category === activeCategory.toLowerCase();
      return matchesQuery && matchesCategory;
    });
  }, [activeCategory, feedQuery.data, query]);

  const spotlightItems = useMemo(() => dedupeItems(feedQuery.data?.featured || []).slice(0, 6), [feedQuery.data?.featured]);
  const filteredMode = Boolean(query.trim()) || activeCategory !== "Semua";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f6fb" }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 42, gap: 12 }}>
        <View style={{ gap: 6 }}>
          <Text selectable style={{ color: "#0f172a", fontSize: 24, fontWeight: "900", lineHeight: 28 }}>
            Jelajahi tenant
          </Text>
        </View>

        <View
          style={{
            gap: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              minHeight: 48,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#d9e2ec",
              backgroundColor: "#f8fafc",
              paddingHorizontal: 14,
            }}
          >
            <MaterialIcons name="search" size={18} color="#64748b" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={feedQuery.data?.hero?.search_hint || "Cari tempat, kategori, aktivitas, atau suasana"}
              placeholderTextColor="#94a3b8"
              style={{
                flex: 1,
                color: "#0f172a",
                fontSize: 14,
                paddingVertical: 0,
              }}
            />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {categories.map((category) => {
            const active = activeCategory === category;
            return (
              <Pressable
                key={category}
                onPress={() => setActiveCategory(category)}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? "#1d4ed8" : "#dbeafe",
                  backgroundColor: active ? "#1d4ed8" : "#ffffff",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Text selectable style={{ color: active ? "#ffffff" : "#0f172a", fontSize: 12, fontWeight: "800" }}>
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {!filteredMode && spotlightItems.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            {spotlightItems.map((item, index) => (
              <View key={`${item.id}-${index}`} style={{ width: 308 }}>
                <DiscoveryCard item={item} />
              </View>
            ))}
          </ScrollView>
        ) : null}

        {filteredMode ? (
          <View style={{ gap: 12 }}>
            {items.map((item, index) => (
              <DiscoveryCard key={`${item.item_kind || "tenant"}-${item.id}-${item.slug}-${index}`} item={item} />
            ))}
            {!feedQuery.isLoading && items.length === 0 ? (
              <CardBlock>
                <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
                  Belum ada item yang cocok dengan pencarian ini.
                </Text>
              </CardBlock>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {(feedQuery.data?.sections || []).map((section) => (
              <View key={section.id} style={{ gap: 12 }}>
                <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
                  {section.title}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                  {dedupeItems(section.items).slice(0, 6).map((item, index) => (
                    <View key={`${section.id}-${item.id}-${index}`} style={{ width: 308 }}>
                      <DiscoveryCard item={item} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
