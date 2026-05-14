import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Text, TextInput, View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { DiscoveryCard } from "@/components/discovery-card";
import { ScreenShell } from "@/components/screen-shell";
import { DiscoveryFeedResponse } from "@/lib/discovery";

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
    const pool = [...feed.featured, ...feed.sections.flatMap((section) => section.items)];
    const normalized = query.trim().toLowerCase();
    return pool.filter((item) => {
      const matchesQuery =
        !normalized ||
        `${item.name} ${item.business_category || ""} ${item.tagline || ""}`.toLowerCase().includes(normalized);
      const category = String(item.business_category || item.business_type || "").toLowerCase();
      const matchesCategory =
        activeCategory === "Semua" || category === activeCategory.toLowerCase();
      return matchesQuery && matchesCategory;
    });
  }, [activeCategory, feedQuery.data, query]);

  return (
    <ScreenShell
      eyebrow="Discovery"
      title={feedQuery.data?.hero?.title || "Cari tenant yang sudah punya konteks sebelum dibuka."}
      description={feedQuery.data?.hero?.description || "Feed ini dibikin supaya user bisa menilai tenant lebih cepat sebelum lanjut ke booking."}
    >
      <LinearGradient
        colors={["#0f172a", "#1d4ed8", "#3b82f6"]}
        style={{
          borderRadius: 28,
          padding: 18,
          gap: 14,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            right: -24,
            top: -18,
            width: 124,
            height: 124,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.12)",
          }}
        />
        <Text selectable style={{ color: "#bfdbfe", fontSize: 10, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase" }}>
          Discovery feed
        </Text>
        <Text selectable style={{ color: "#ffffff", fontSize: 22, fontWeight: "900", lineHeight: 26 }}>
          Bandingkan tenant tanpa perlu lompat-lompat.
        </Text>
        <Text selectable style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 21 }}>
          Lihat konteks, harga mulai, dan feeling bisnisnya dari satu feed yang ringkas.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[
            `${items.length} item`,
            `${Math.max(categories.length - 1, 0)} kategori`,
            feedQuery.data?.personalized ? "Personalized" : "Editorial",
          ].map((item) => (
            <View
              key={item}
              style={{
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.12)",
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            >
              <Text selectable style={{ color: "#dbeafe", fontSize: 12, fontWeight: "700" }}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <CardBlock>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={feedQuery.data?.hero?.search_hint || "Cari bisnis, kategori, atau suasana"}
          placeholderTextColor="#94a3b8"
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#cbd5e1",
            backgroundColor: "#f8fafc",
            paddingHorizontal: 16,
            paddingVertical: 14,
            color: "#0f172a",
            fontSize: 15,
          }}
        />
      </CardBlock>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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
                paddingVertical: 9,
              }}
            >
              <Text selectable style={{ color: active ? "#ffffff" : "#0f172a", fontSize: 12, fontWeight: "800" }}>
                {category}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {feedQuery.data?.featured?.[0] ? (
        <CardBlock>
          <Text selectable style={{ color: "#1d4ed8", fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" }}>
            Spotlight
          </Text>
          <Text selectable style={{ color: "#0f172a", fontSize: 22, fontWeight: "900" }}>
            {feedQuery.data.featured[0].name}
          </Text>
          <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
            {feedQuery.data.featured[0].tagline || "Tenant ini sedang diangkat di permukaan discovery."}
          </Text>
        </CardBlock>
      ) : null}

      <View style={{ gap: 12 }}>
        {items.map((item) => (
          <DiscoveryCard key={`${item.item_kind || "tenant"}-${item.id}`} item={item} />
        ))}
        {!feedQuery.isLoading && items.length === 0 ? (
          <CardBlock>
            <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
              Belum ada item yang cocok dengan pencarian ini.
            </Text>
          </CardBlock>
        ) : null}
      </View>
    </ScreenShell>
  );
}
