"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Compass,
  Flame,
  PlayCircle,
  Camera,
  Megaphone,
  Search,
  Sparkles,
  Store,
} from "lucide-react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getTenantUrl } from "@/lib/tenant";
import {
  bookinajaDiscoveryTheme,
  type DiscoveryFeedResponse,
  type DiscoverySection,
  type DiscoveryTenant,
  formatStartingPrice,
  formatDiscoveryDuration,
  getDiscoveryCardKind,
  getDiscoveryCategoryLabel,
  getDiscoveryItemBadges,
  getDiscoveryItemCta,
  getDiscoveryItemImage,
  getDiscoveryItemLabel,
  getDiscoveryItemReason,
  getDiscoveryItemSummary,
  getDiscoveryItemTitle,
  getDiscoveryEventMetadata,
  getDiscoveryItemHref,
  isDiscoveryPromoPost,
  isDiscoveryVideoPost,
  scoreDiscoveryTenant,
} from "@/lib/discovery";
import {
  discoveryImpressionKey,
  trackDiscoveryEvent,
} from "@/lib/discovery-analytics";

const FILTER_ALL = "Semua";

export default function DiscoveryPage() {
  const [feed, setFeed] = useState<DiscoveryFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(FILTER_ALL);
  const [seenImpressions, setSeenImpressions] = useState<Record<string, true>>(
    {},
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await api.get("/public/discover/feed");
        if (active) setFeed(res.data || null);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

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
  const quickPicks = rankedItems.slice(1, 5);

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

  const markImpression = useCallback(
    (
      tenant: DiscoveryTenant,
      surface: string,
      sectionId: string,
      cardVariant: string,
      positionIndex: number,
    ) => {
      const key = discoveryImpressionKey([surface, sectionId, cardVariant, tenant.id]);
      if (seenImpressions[key]) return;
      setSeenImpressions((prev) => ({ ...prev, [key]: true }));
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
    [seenImpressions],
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
        <section className="rounded-[2rem] border border-blue-100 bg-white/90 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur md:p-6">
          <div className="space-y-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              {feed?.hero?.eyebrow || "Discovery"}
            </div>

            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-black uppercase leading-[0.92] tracking-[-0.05em] text-slate-950 md:text-5xl">
                Temukan tempat yang terasa layak dicoba sekarang.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
                Jelajahi bisnis, aktivitas, dan tempat baru lewat feed yang lebih ringan,
                lebih rapi, dan lebih dekat ke cara customer benar-benar mencari sesuatu.
              </p>
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
                <Link href="/user/login">Masuk Portal Customer</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-2xl px-5">
                <Link href="/pricing">Lihat Pricing</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="sticky top-3 z-20 rounded-[1.4rem] border border-white/80 bg-white/90 p-2.5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] transition-all",
                  activeCategory === category
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 text-slate-600 hover:bg-blue-100",
                )}
              >
                {category}
              </button>
            ))}
          </div>
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
                <SectionHeader
                  eyebrow="Sorotan Utama"
                  title="Mulai dari yang paling siap diklik"
                  description="Satu hero utama untuk orientasi cepat, lalu rekomendasi yang lebih padat di bawahnya."
                />
                <FeatureHeroCard
                  tenant={primaryFeature}
                  onVisible={() =>
                    markImpression(primaryFeature, "discover", "public-hero", "hero", 0)
                  }
                />
              </section>
            ) : null}

            <section className="space-y-3">
              <SectionHeader
                eyebrow="Quick Picks"
                title="Paling relevan buat mulai lihat-lihat"
                description="Feed publik yang lebih clean, lebih padat, dan tidak terasa seperti katalog besar."
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
                {quickPicks.map((tenant, index) => (
                  <PublicContentCard
                    key={tenant.id}
                    tenant={tenant}
                    surface="discover"
                    sectionId="quick-picks"
                    cardVariant="content"
                    positionIndex={index}
                    onVisible={() =>
                      markImpression(tenant, "discover", "quick-picks", "content", index)
                    }
                  />
                ))}
              </div>
            </section>

            <div className="space-y-8">
              {filteredSections.map((section) => (
                <PublicRailSection
                  key={section.id}
                  section={section}
                  markImpression={markImpression}
                />
              ))}
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
                  Coba kata kunci lain atau ganti kategori. Feed ini dirancang supaya tetap
                  terasa ringan saat kamu eksplor banyak opsi.
                </p>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function getDiscoverHref(tenant: DiscoveryTenant) {
  return getDiscoveryItemHref(tenant) || getTenantUrl(tenant.slug);
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <div
        className={cn(
          "text-[10px] font-black uppercase tracking-[0.24em]",
          bookinajaDiscoveryTheme.accentText,
        )}
      >
        {eyebrow}
      </div>
      <h2 className="text-2xl font-black uppercase tracking-[-0.03em] md:text-3xl">
        {title}
      </h2>
      <p className={cn("max-w-2xl text-sm leading-7", bookinajaDiscoveryTheme.mutedText)}>
        {description}
      </p>
    </div>
  );
}

function DiscoveryTypeChip({ tenant }: { tenant: DiscoveryTenant }) {
  const cardKind = getDiscoveryCardKind(tenant);
  if (cardKind === "video") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/75 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
        <PlayCircle className="h-3.5 w-3.5" />
        {formatDiscoveryDuration(tenant.post_duration_seconds) || "Video"}
      </span>
    );
  }
  if (cardKind === "promo") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-950">
        <Megaphone className="h-3.5 w-3.5" />
        Promo
      </span>
    );
  }
  if (cardKind === "photo") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-900">
        <Camera className="h-3.5 w-3.5" />
        Foto
      </span>
    );
  }
  return null;
}

function FeatureHeroCard({
  tenant,
  onVisible,
}: {
  tenant: DiscoveryTenant;
  onVisible?: () => void;
}) {
  useEffect(() => {
    onVisible?.();
  }, [onVisible]);
  const cardKind = getDiscoveryCardKind(tenant);
  const typeTone =
    cardKind === "promo"
      ? "from-amber-500/28 via-amber-300/10 to-transparent"
      : cardKind === "video"
        ? "from-slate-400/18 via-sky-300/8 to-transparent"
        : "from-blue-500/22 via-blue-300/8 to-transparent";

  return (
    <Card className="overflow-hidden rounded-[2rem] border-0 bg-slate-950 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
      <CardContent className="relative p-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{
            backgroundImage: getDiscoveryItemImage(tenant)
              ? `url(${getDiscoveryItemImage(tenant)})`
              : "linear-gradient(135deg, rgba(13,31,39,0.94), rgba(29,78,216,0.65))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/55 to-blue-400/18" />
        <div className={cn("absolute inset-0 bg-gradient-to-r", typeTone)} />
        <div className="relative z-10 flex min-h-[300px] flex-col justify-between p-4 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                {getDiscoveryItemLabel(tenant)}
              </Badge>
              <DiscoveryTypeChip tenant={tenant} />
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-right">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
                Mulai
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white">
                <Flame className="h-3.5 w-3.5" />
                {formatStartingPrice(tenant.starting_price)}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {tenant.item_kind === "post" ? (
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/72">
                Dari {tenant.name}
              </div>
            ) : (
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/72">
                Profil bisnis
              </div>
            )}
            <h3 className="max-w-2xl text-2xl font-black uppercase leading-[0.95] tracking-[-0.04em] md:text-4xl">
              {getDiscoveryItemTitle(tenant)}
            </h3>
            <p className="max-w-2xl text-sm leading-7 text-white/85">
              {getDiscoveryItemSummary(tenant)}
            </p>
            <div className="flex flex-wrap gap-2">
              {getDiscoveryItemBadges(tenant).slice(0, 3).map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold text-white/92"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid gap-2 text-sm text-white/72 md:grid-cols-3">
                <span>{getDiscoveryItemReason(tenant) || "Tempat ini terlihat paling siap untuk jadi titik awal eksplorasi kamu."}</span>
                <span>{tenant.item_kind === "post" ? `${tenant.post_detail_views_7d || 0} buka detail / 7 hari` : `${tenant.discovery_clicks_30d || 0} klik / 30 hari`}</span>
                <span>{tenant.item_kind === "post" ? `${tenant.post_booking_starts_7d || 0} mulai booking` : `${tenant.resource_count || 0} resource aktif`}</span>
              </div>
              <Button asChild className="h-11 rounded-2xl bg-white text-slate-950 hover:bg-white/90">
                <a
                  href={getDiscoverHref(tenant)}
                onClick={() =>
                  trackDiscoveryEvent({
                    tenant_id: tenant.tenant_id || tenant.id,
                    tenant_slug: tenant.slug,
                    event_type: "click",
                    surface: "discover",
                  section_id: "public-hero",
                  card_variant: "hero",
                  position_index: 0,
                  promo_label: tenant.feed_label || tenant.promo_label,
                  metadata: getDiscoveryEventMetadata(tenant),
                })
              }
              >
                {getDiscoveryItemCta(tenant)}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PublicContentCard({
  tenant,
  surface,
  sectionId,
  cardVariant,
  positionIndex,
  onVisible,
}: {
  tenant: DiscoveryTenant;
  surface: string;
  sectionId: string;
  cardVariant: string;
  positionIndex: number;
  onVisible?: () => void;
}) {
  useEffect(() => {
    onVisible?.();
  }, [onVisible]);
  const isVideo = isDiscoveryVideoPost(tenant);
  const isPromo = isDiscoveryPromoPost(tenant);

  return (
    <Card
      className={cn(
        "group overflow-hidden rounded-[1.7rem] border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md",
        isPromo ? "border-amber-200" : "border-blue-100",
      )}
    >
      <CardContent className="p-0">
        <div className="relative h-36 w-full overflow-hidden">
          <div
            className="h-full w-full bg-cover bg-center"
            style={{
              backgroundImage: getDiscoveryItemImage(tenant)
                ? `url(${getDiscoveryItemImage(tenant)})`
                : isPromo
                  ? "linear-gradient(135deg, rgba(120,53,15,0.92), rgba(245,158,11,0.72))"
                  : "linear-gradient(135deg, rgba(13,31,39,0.92), rgba(96,165,250,0.72))",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent" />
          <div className="absolute left-3 top-3">
            <DiscoveryTypeChip tenant={tenant} />
          </div>
          {tenant.item_kind === "post" ? (
            <div className="absolute bottom-3 left-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
              Dari {tenant.name}
            </div>
          ) : null}
        </div>
        <div className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <Badge className={cn("rounded-full", isPromo ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}>
              {getDiscoveryItemLabel(tenant)}
            </Badge>
            <span className="text-[11px] font-semibold text-slate-500">
              {formatStartingPrice(tenant.starting_price)}
            </span>
          </div>

          <div>
            {tenant.item_kind === "post" ? (
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                Dari {tenant.name}
              </div>
            ) : null}
            <h3 className="line-clamp-2 text-lg font-black uppercase tracking-tight text-slate-950">
              {getDiscoveryItemTitle(tenant)}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
              {getDiscoveryItemSummary(tenant)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {getDiscoveryItemBadges(tenant).slice(0, 2).map((item) => (
              <span
                key={item}
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="grid gap-2 rounded-2xl bg-slate-50 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-blue-600" />
              {getDiscoveryItemReason(tenant) || "Cocok untuk dicoba"}
            </span>
            <div className="flex items-center justify-between gap-3">
              <span>{tenant.item_kind === "post" ? `${tenant.post_detail_views_7d || 0} buka detail` : `${tenant.resource_count || 0} resource`}</span>
              <span>{isPromo ? `${tenant.post_booking_starts_7d || 0} booking start` : isVideo ? `${tenant.post_tenant_opens_7d || 0} lanjut bisnis` : formatStartingPrice(tenant.starting_price)}</span>
            </div>
          </div>

          <Button
            asChild
            className="h-11 w-full rounded-2xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <a
              href={getDiscoverHref(tenant)}
              onClick={() =>
                trackDiscoveryEvent({
                  tenant_id: tenant.tenant_id || tenant.id,
                  tenant_slug: tenant.slug,
                  event_type: "click",
                  surface,
                  section_id: sectionId,
                  card_variant: cardVariant,
                  position_index: positionIndex,
                  promo_label: tenant.feed_label || tenant.promo_label,
                  metadata: getDiscoveryEventMetadata(tenant),
                })
              }
            >
              {getDiscoveryItemCta(tenant)}
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
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
      <SectionHeader
        eyebrow={section.style}
        title={section.title}
        description={section.description}
      />
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {section.items.map((tenant, index) => (
          <div key={tenant.id} className="w-[250px] min-w-[250px] flex-none">
            <PublicRailCard
              tenant={tenant}
              sectionId={section.id}
              positionIndex={index}
              onVisible={() => markImpression(tenant, "discover", section.id, "rail", index)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function PublicRailCard({
  tenant,
  sectionId,
  positionIndex,
  onVisible,
}: {
  tenant: DiscoveryTenant;
  sectionId: string;
  positionIndex: number;
  onVisible?: () => void;
}) {
  useEffect(() => {
    onVisible?.();
  }, [onVisible]);
  const isVideo = isDiscoveryVideoPost(tenant);
  const isPromo = isDiscoveryPromoPost(tenant);
  const accentWrap = isPromo
    ? "from-amber-100/80 to-white"
    : isVideo
      ? "from-slate-900/8 to-white"
      : "from-blue-50/80 to-white";

  return (
    <Card className={cn("overflow-hidden rounded-[1.6rem] border bg-white shadow-sm", isPromo ? "border-amber-200" : "border-blue-100")}>
      <CardContent className="p-0">
        <div className="relative h-28 w-full overflow-hidden">
          <div
            className="h-full w-full bg-cover bg-center"
            style={{
              backgroundImage: getDiscoveryItemImage(tenant)
                ? `url(${getDiscoveryItemImage(tenant)})`
                : isPromo
                  ? "linear-gradient(135deg, rgba(120,53,15,0.92), rgba(245,158,11,0.72))"
                  : "linear-gradient(135deg, rgba(13,31,39,0.92), rgba(96,165,250,0.72))",
            }}
          />
          <div className="absolute left-3 top-3">
            <DiscoveryTypeChip tenant={tenant} />
          </div>
        </div>
        <div className={cn("space-y-3 bg-gradient-to-b p-3.5", accentWrap)}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              {tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.logo_url}
                  alt=""
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <Store className="h-4.5 w-4.5" />
              )}
            </div>
            <Badge className={cn("rounded-full", isPromo ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}>
              {getDiscoveryItemLabel(tenant)}
            </Badge>
          </div>

          <div>
            {tenant.item_kind === "post" ? (
              <div className={cn("mb-2 text-[10px] font-black uppercase tracking-[0.18em]", isPromo ? "text-amber-700" : "text-blue-600")}>
                Dari {tenant.name}
              </div>
            ) : null}
            <h3 className="line-clamp-2 text-base font-black uppercase tracking-tight text-slate-950">
              {getDiscoveryItemTitle(tenant)}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
              {getDiscoveryItemSummary(tenant)}
            </p>
            {isPromo ? (
              <div className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-800">
                Momentum cepat
              </div>
            ) : null}
            {isVideo ? (
              <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
                Tonton vibe dulu
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>{isVideo ? "Tonton dulu" : formatStartingPrice(tenant.starting_price)}</span>
            <span>
              {isVideo && tenant.post_duration_seconds
                ? formatDiscoveryDuration(tenant.post_duration_seconds)
                : tenant.discovery_clicks_30d && tenant.discovery_clicks_30d > 0
                ? `${tenant.discovery_clicks_30d} klik`
                : `${tenant.resource_count || 0} resource`}
            </span>
          </div>

          <Button
            asChild
            variant="outline"
            className="h-10 w-full rounded-2xl border-blue-100"
          >
            <a
              href={getDiscoverHref(tenant)}
              onClick={() =>
                trackDiscoveryEvent({
                  tenant_id: tenant.tenant_id || tenant.id,
                  tenant_slug: tenant.slug,
                  event_type: "click",
                  surface: "discover",
                  section_id: sectionId,
                  card_variant: "rail",
                  position_index: positionIndex,
                  promo_label: tenant.feed_label || tenant.promo_label,
                  metadata: getDiscoveryEventMetadata(tenant),
                })
              }
            >
              {getDiscoveryItemCta(tenant)}
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
