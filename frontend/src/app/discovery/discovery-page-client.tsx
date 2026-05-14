"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Compass, Search, Sparkles, TrendingUp } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  DiscoveryCategoryChips,
  DiscoveryCompactCard,
  DiscoverySectionHeading,
  DiscoveryShowcaseCard,
  DiscoverySpotlightCard,
} from "@/components/discovery/discovery-cards";
import { getTenantUrl } from "@/lib/tenant";
import {
  bookinajaDiscoveryTheme,
  type DiscoveryFeedResponse,
  type DiscoverySection,
  type DiscoveryTenant,
  getDiscoveryCategoryLabel,
  getDiscoveryEventMetadata,
  getDiscoveryItemCta,
  getDiscoveryItemHref,
  getDiscoveryItemLabel,
  getDiscoveryItemReason,
  getDiscoveryItemSummary,
  isDiscoveryBusiness,
  isDiscoveryPost,
  isDiscoveryPromoPost,
  scoreDiscoveryTenant,
} from "@/lib/discovery";
import {
  discoveryImpressionKey,
  trackDiscoveryEvent,
} from "@/lib/discovery-analytics";

const FILTER_ALL = "Semua";
let discoveryFeedCache: DiscoveryFeedResponse | null | undefined;
let discoveryFeedPromise: Promise<DiscoveryFeedResponse | null> | null = null;

async function loadDiscoveryFeed() {
  if (discoveryFeedCache !== undefined) return discoveryFeedCache;
  if (!discoveryFeedPromise) {
    discoveryFeedPromise = api
      .get("/public/discover/feed")
      .then<DiscoveryFeedResponse | null>((res) => {
        discoveryFeedCache = res.data || null;
        return discoveryFeedCache ?? null;
      })
      .finally(() => {
        discoveryFeedPromise = null;
      });
  }
  return discoveryFeedPromise;
}

type DiscoveryPageClientProps = {
  initialFeed?: DiscoveryFeedResponse | null;
};

export default function DiscoveryPageClient({
  initialFeed = null,
}: DiscoveryPageClientProps) {
  const [feed, setFeed] = useState<DiscoveryFeedResponse | null>(initialFeed);
  const [loading, setLoading] = useState(!initialFeed);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(FILTER_ALL);
  const seenImpressionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (initialFeed !== null) {
      discoveryFeedCache = initialFeed;
      setFeed(initialFeed);
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const nextFeed = await loadDiscoveryFeed();
        if (active) setFeed(nextFeed);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [initialFeed]);

  const allItems = useMemo(() => {
    if (!feed) return [];
    const map = new Map<string, DiscoveryTenant>();
    [...feed.featured, ...feed.sections.flatMap((section) => section.items)].forEach(
      (item) => map.set(item.id, item),
    );
    return Array.from(map.values());
  }, [feed]);

  const categories = useMemo(() => {
    const items = feed?.quick_categories || [];
    return [FILTER_ALL, ...items];
  }, [feed?.quick_categories]);

  const matchesFilters = useCallback(
    (tenant: DiscoveryTenant) => {
      const categoryLabel = getDiscoveryCategoryLabel(tenant).toLowerCase();
      const matchesCategory =
        activeCategory === FILTER_ALL ||
        categoryLabel === activeCategory.toLowerCase();

      return matchesCategory && scoreDiscoveryTenant(tenant, query) > -100;
    },
    [activeCategory, query],
  );

  const rankedItems = useMemo(() => {
    return allItems
      .filter(matchesFilters)
      .sort((a, b) => scoreDiscoveryTenant(b, query) - scoreDiscoveryTenant(a, query));
  }, [allItems, matchesFilters, query]);

  const primaryFeature = rankedItems[0] || feed?.featured?.[0] || null;
  const postHighlights = rankedItems.filter(isDiscoveryPost).slice(0, 4);
  const businessHighlights = rankedItems.filter(isDiscoveryBusiness).slice(0, 4);

  const filteredSections = useMemo(() => {
    if (!feed) return [];
    return feed.sections
      .map((section) => {
        const items = section.items
          .filter(matchesFilters)
          .sort((a, b) => scoreDiscoveryTenant(b, query) - scoreDiscoveryTenant(a, query));
        return { ...section, items };
      })
      .filter((section) => section.items.length > 0);
  }, [feed, matchesFilters, query]);

  const contentRailSection = useMemo(
    () => filteredSections.find((section) => section.items.every((item) => item.item_kind === "post")) || null,
    [filteredSections],
  );

  const businessRailSection = useMemo(
    () => filteredSections.find((section) => section.items.every((item) => item.item_kind !== "post")) || null,
    [filteredSections],
  );

  const markImpression = useCallback(
    (
      tenant: DiscoveryTenant,
      surface: string,
      sectionId: string,
      cardVariant: string,
      positionIndex: number,
    ) => {
      const key = discoveryImpressionKey([surface, sectionId, cardVariant, tenant.id]);
      if (seenImpressionsRef.current.has(key)) return;
      seenImpressionsRef.current.add(key);
      trackDiscoveryEvent({
        tenant_id: tenant.tenant_id || tenant.id,
        tenant_slug: tenant.slug,
        event_type: "impression",
        surface,
        section_id: sectionId,
        card_variant: cardVariant,
        position_index: positionIndex,
        promo_label: tenant.promo_label,
        metadata: getDiscoveryEventMetadata(tenant),
      });
    },
    [],
  );

  return (
    <div
      className={cn(
        "relative min-h-screen overflow-hidden pb-20 text-slate-950",
        bookinajaDiscoveryTheme.pageBg,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[40vh]",
          bookinajaDiscoveryTheme.pageGlow,
        )}
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 md:px-6 md:py-6">
        <section className="rounded-[2rem] border border-blue-100 bg-white/92 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur md:p-6">
          <div className="space-y-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              {feed?.hero?.eyebrow || "Discovery"}
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
              <div className="max-w-3xl space-y-3">
                <h1 className="text-3xl font-black uppercase leading-[0.92] tracking-[-0.05em] text-slate-950 md:text-5xl">
                  Cari tempat yang sudah punya konteks sebelum kamu klik.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
                  Discovery ini memisahkan mana konten yang layak dibuka dulu,
                  mana bisnis yang layak dibandingkan, dan mana tenant yang
                  paling siap dikonversi jadi booking.
                </p>
              </div>

              <div className="grid gap-3 rounded-[1.6rem] border border-blue-100 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Snapshot feed
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Bisnis" value={String(rankedItems.filter(isDiscoveryBusiness).length)} />
                  <MiniStat label="Konten" value={String(rankedItems.filter(isDiscoveryPost).length)} />
                  <MiniStat label="Kategori" value={String(Math.max(categories.length - 1, 0))} />
                </div>
                <p className="text-xs leading-6 text-slate-500">
                  Mulai dari satu spotlight utama, lalu turun ke rail bisnis
                  dan konten yang masih relevan.
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  feed?.hero?.search_hint ||
                  "Cari tempat, kategori, aktivitas, atau suasana yang kamu cari"
                }
                className="h-12 rounded-2xl border-slate-200 bg-white pl-11 text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                className={cn(
                  "h-11 rounded-2xl px-5 text-sm font-semibold shadow-sm",
                  bookinajaDiscoveryTheme.accentStrong,
                )}
              >
                <Link href="/user/login">Masuk portal customer</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-2xl px-5">
                <Link href="/pricing">Lihat pricing</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="sticky top-3 z-20 rounded-[1.4rem] border border-white/80 bg-white/90 p-2.5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] backdrop-blur">
          <DiscoveryCategoryChips
            categories={categories}
            activeCategory={activeCategory}
            onChange={setActiveCategory}
          />
        </section>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-52 rounded-[2rem] bg-white/80" />
            <Skeleton className="h-72 rounded-[2rem] bg-white/80" />
            <Skeleton className="h-72 rounded-[2rem] bg-white/80" />
          </div>
        ) : (
          <>
            {primaryFeature ? (
              <section className="space-y-3">
                <DiscoverySectionHeading
                  eyebrow="Sorotan Utama"
                  title="Mulai dari yang paling siap diklik"
                  description="Satu spotlight utama untuk bantu orientasi, lalu rail yang memisahkan konten dan profil bisnis supaya feed tidak terasa campur aduk."
                />
                <DiscoverySpotlightCard
                  tenant={primaryFeature}
                  href={getDiscoverHref(primaryFeature)}
                  ctaLabel={getDiscoveryItemCta(primaryFeature)}
                  accent={primaryFeature.item_kind === "post" ? "blue" : "emerald"}
                  stats={[
                    getDiscoveryItemReason(primaryFeature) ||
                      "Masuk akal dijadikan titik awal eksplorasi.",
                    primaryFeature.item_kind === "post"
                      ? `${primaryFeature.post_detail_views_7d || 0} buka detail / 7 hari`
                      : `${primaryFeature.discovery_clicks_30d || 0} klik / 30 hari`,
                    primaryFeature.item_kind === "post"
                      ? `${primaryFeature.post_booking_starts_7d || 0} mulai booking`
                      : `${primaryFeature.resource_count || 0} resource aktif`,
                  ]}
                  onVisible={() =>
                    markImpression(primaryFeature, "discover", "public-hero", "hero", 0)
                  }
                  onClick={() =>
                    trackDiscoveryEvent({
                      tenant_id: primaryFeature.tenant_id || primaryFeature.id,
                      tenant_slug: primaryFeature.slug,
                      event_type: "click",
                      surface: "discover",
                      section_id: "public-hero",
                      card_variant: "hero",
                      position_index: 0,
                      promo_label: primaryFeature.feed_label || primaryFeature.promo_label,
                      metadata: getDiscoveryEventMetadata(primaryFeature),
                    })
                  }
                />
              </section>
            ) : null}

            {postHighlights.length > 0 ? (
              <section className="space-y-3">
                <DiscoverySectionHeading
                  eyebrow="Konten"
                  title="Buka konten dulu kalau kamu masih cari vibe"
                  description="Video, foto, dan promo dikelompokkan terpisah supaya user bisa eksplor mood dan momentum tanpa mengacaukan perbandingan antar bisnis."
                />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
                  {postHighlights.map((tenant, index) => (
                    <DiscoveryShowcaseCard
                      key={tenant.id}
                      tenant={tenant}
                      href={getDiscoverHref(tenant)}
                      ctaLabel={getDiscoveryItemCta(tenant)}
                      tone={isDiscoveryPromoPost(tenant) ? "amber" : "blue"}
                      meta={
                        getDiscoveryItemReason(tenant) ||
                        "Konten ini cukup jelas untuk bantu user menilai apakah tenant ini layak dibuka lebih jauh."
                      }
                      stat={
                        isDiscoveryPromoPost(tenant)
                          ? `${tenant.post_booking_starts_7d || 0} booking start`
                          : `${tenant.post_detail_views_7d || 0} buka detail`
                      }
                      onVisible={() =>
                        markImpression(tenant, "discover", "content-highlights", "content", index)
                      }
                      onClick={() =>
                        trackDiscoveryEvent({
                          tenant_id: tenant.tenant_id || tenant.id,
                          tenant_slug: tenant.slug,
                          event_type: "click",
                          surface: "discover",
                          section_id: "content-highlights",
                          card_variant: "content",
                          position_index: index,
                          promo_label: tenant.feed_label || tenant.promo_label,
                          metadata: getDiscoveryEventMetadata(tenant),
                        })
                      }
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {businessHighlights.length > 0 ? (
              <section className="space-y-3">
                <DiscoverySectionHeading
                  eyebrow="Profil Bisnis"
                  title="Bandingkan tenant tanpa perlu lompat-lompat"
                  description="Kartu bisnis menonjolkan harga mulai, alasan relevansi, dan resource aktif supaya user bisa menyaring tenant sebelum masuk halaman masing-masing."
                />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
                  {businessHighlights.map((tenant, index) => (
                    <DiscoveryShowcaseCard
                      key={tenant.id}
                      tenant={tenant}
                      href={getDiscoverHref(tenant)}
                      ctaLabel="Lihat profil bisnis"
                      tone="emerald"
                      meta={
                        getDiscoveryItemReason(tenant) ||
                        "Bisnis ini terlihat cukup siap dari sisi harga, konteks, dan resource yang bisa dibooking."
                      }
                      stat={`${tenant.resource_count || 0} resource aktif`}
                      onVisible={() =>
                        markImpression(tenant, "discover", "business-highlights", "business", index)
                      }
                      onClick={() =>
                        trackDiscoveryEvent({
                          tenant_id: tenant.tenant_id || tenant.id,
                          tenant_slug: tenant.slug,
                          event_type: "click",
                          surface: "discover",
                          section_id: "business-highlights",
                          card_variant: "business",
                          position_index: index,
                          promo_label: tenant.feed_label || tenant.promo_label,
                          metadata: getDiscoveryEventMetadata(tenant),
                        })
                      }
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <div className="space-y-8">
              {contentRailSection ? (
                <PublicRailSection
                  section={{
                    ...contentRailSection,
                    title: "Konten lain yang masih layak dibuka",
                    description:
                      "Rail tambahan ini menjaga feed tetap bergerak tanpa membuat user merasa harus membaca semua tenant sekaligus.",
                  }}
                  markImpression={markImpression}
                />
              ) : null}
              {businessRailSection ? (
                <PublicRailSection
                  section={{
                    ...businessRailSection,
                    title: "Bisnis lain yang bisa dibandingkan cepat",
                    description:
                      "Bukan semua tenant ditampilkan besar-besaran. Rail ini untuk opsi kedua dan ketiga setelah user melihat spotlight utama.",
                  }}
                  markImpression={markImpression}
                />
              ) : null}
            </div>

            {rankedItems.length === 0 ? (
              <section className="rounded-[2rem] border border-dashed border-blue-200 bg-white/75 p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                  <Compass className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="mt-5 text-2xl font-black uppercase tracking-tight">
                  Belum ada yang cocok
                </h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
                  Ganti kata kunci atau pilih kategori lain. Discovery ini
                  dipadatkan supaya eksplor tetap cepat walau opsi tenant cukup
                  banyak.
                </p>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-base font-black tracking-tight text-slate-950">
        {value}
      </div>
    </div>
  );
}

function getDiscoverHref(tenant: DiscoveryTenant) {
  return getDiscoveryItemHref(tenant) || getTenantUrl(tenant.slug);
}

function PublicRailSection({
  section,
  markImpression,
}: {
  section: DiscoverySection;
  markImpression: (
    tenant: DiscoveryTenant,
    surface: string,
    sectionId: string,
    cardVariant: string,
    positionIndex: number,
  ) => void;
}) {
  return (
    <section className="space-y-3">
      <DiscoverySectionHeading
        eyebrow={section.items.every((item) => item.item_kind === "post") ? "Konten" : "Profil Bisnis"}
        title={section.title}
        description={section.description}
      />
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {section.items.map((tenant, index) => (
          <div key={tenant.id} className="w-[280px] min-w-[280px] flex-none">
            <DiscoveryCompactCard
              tenant={tenant}
              href={getDiscoverHref(tenant)}
              ctaLabel={tenant.item_kind === "post" ? "Buka konten" : "Buka bisnis"}
              summary={getDiscoveryItemSummary(tenant)}
              footer={
                tenant.item_kind === "post"
                  ? `${tenant.post_detail_views_7d || 0} buka detail · ${getDiscoveryItemLabel(tenant)}`
                  : `${tenant.resource_count || 0} resource · ${getDiscoveryCategoryLabel(tenant)}`
              }
              onVisible={() =>
                markImpression(
                  tenant,
                  "discover",
                  section.id,
                  tenant.item_kind === "post" ? "rail" : "rail-business",
                  index,
                )
              }
              onClick={() =>
                trackDiscoveryEvent({
                  tenant_id: tenant.tenant_id || tenant.id,
                  tenant_slug: tenant.slug,
                  event_type: "click",
                  surface: "discover",
                  section_id: section.id,
                  card_variant: tenant.item_kind === "post" ? "rail" : "rail-business",
                  position_index: index,
                  promo_label: tenant.feed_label || tenant.promo_label,
                  metadata: getDiscoveryEventMetadata(tenant),
                })
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
}
