"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Compass,
  Flame,
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
  getDiscoveryCategoryLabel,
  scoreDiscoveryTenant,
} from "@/lib/discovery";
import {
  discoveryImpressionKey,
  trackDiscoveryEvent,
} from "@/lib/discovery-analytics";

const FILTER_ALL = "Semua";

export default function TenantsDirectoryPage() {
  const [feed, setFeed] = useState<DiscoveryFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(FILTER_ALL);
  const [seenImpressions, setSeenImpressions] = useState<Record<string, true>>({});

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

  const featuredItems = useMemo(() => {
    const base = (feed?.featured || []).filter(matchesFilters);
    if (base.length > 0) return base;
    return allItems
      .filter(matchesFilters)
      .sort((a, b) => scoreDiscoveryTenant(b, query) - scoreDiscoveryTenant(a, query))
      .slice(0, 4);
  }, [allItems, feed?.featured, matchesFilters, query]);

  const primaryFeature = featuredItems[0] || null;

  const filteredSections = useMemo(() => {
    if (!feed) return [];
    return feed.sections
      .map((section) => {
        const ranked = section.items
          .filter(matchesFilters)
          .sort((a, b) => scoreDiscoveryTenant(b, query) - scoreDiscoveryTenant(a, query));
        return { ...section, items: ranked };
      })
      .filter((section) => section.items.length > 0);
  }, [feed, matchesFilters, query]);

  const explorerGrid = useMemo(() => {
    return allItems
      .filter(matchesFilters)
      .sort((a, b) => scoreDiscoveryTenant(b, query) - scoreDiscoveryTenant(a, query))
      .slice(0, 9);
  }, [allItems, matchesFilters, query]);

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
        tenant_id: tenant.id,
        tenant_slug: tenant.slug,
        event_type: "impression",
        surface,
        section_id: sectionId,
        card_variant: cardVariant,
        position_index: positionIndex,
        promo_label: tenant.promo_label,
      });
    },
    [seenImpressions],
  );

  return (
    <div className={cn("relative min-h-screen overflow-hidden pb-20 text-slate-950", bookinajaDiscoveryTheme.pageBg)}>
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-[48vh]", bookinajaDiscoveryTheme.pageGlow)} />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
        <section className={cn("relative overflow-hidden rounded-[2rem] border px-4 py-5 text-white shadow-[0_28px_80px_rgba(13,31,39,0.18)] md:px-6 md:py-7", bookinajaDiscoveryTheme.heroBg, bookinajaDiscoveryTheme.heroBorder)}>
          <div className="absolute inset-y-0 right-0 w-2/3 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.22),_transparent_58%)]" />
          <div className="relative z-10 flex flex-col gap-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/90">
              <Sparkles className="h-3.5 w-3.5" />
              {feed?.hero?.eyebrow || "Discovery Marketplace"}
            </div>

            <div className="max-w-3xl">
              <h1 className="text-3xl font-black uppercase leading-[0.92] tracking-[-0.05em] md:text-5xl">
                {feed?.hero?.title || "Temukan sesuatu yang ingin kamu lakukan hari ini."}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/78 md:text-base">
                {feed?.hero?.description ||
                  "Jelajahi bisnis, aktivitas, dan pengalaman baru di Bookinaja dengan tampilan yang terasa lebih hidup dari sekadar direktori."}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={feed?.hero?.search_hint || "Cari tempat, kategori, atau suasana yang kamu cari"}
                  className="h-14 rounded-2xl border-white/20 bg-white/94 pl-12 text-sm font-medium text-slate-950 placeholder:text-slate-500"
                />
              </div>
              <div className="flex gap-3">
                <Button asChild className="h-14 flex-1 rounded-2xl bg-white text-slate-950 hover:bg-white/90 md:flex-none">
                  <Link href="/user/login">Portal Customer</Link>
                </Button>
                <Button asChild variant="outline" className="h-14 flex-1 rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/15 md:flex-none">
                  <Link href="/pricing">Pricing</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="sticky top-3 z-20 rounded-[1.6rem] border border-white/80 bg-white/85 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "whitespace-nowrap rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] transition-all",
                  activeCategory === category
                    ? bookinajaDiscoveryTheme.accentStrong
                    : "bg-blue-50 text-slate-500 hover:bg-blue-100",
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-72 rounded-[2rem] bg-white/80" />
            <Skeleton className="h-52 rounded-[2rem] bg-white/80" />
            <Skeleton className="h-80 rounded-[2rem] bg-white/80" />
          </div>
        ) : (
          <>
            {primaryFeature ? (
              <section className="space-y-4">
                <SectionHeader
                  eyebrow="Hero Pick"
                  title="Pilihan utama buat mulai eksplor"
                  description="Satu hero utama dan beberapa rekomendasi cepat untuk customer yang ingin langsung menemukan sesuatu yang terasa layak diklik."
                />
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <FeatureSpotlightCard
                    tenant={primaryFeature}
                    onVisible={() => markImpression(primaryFeature, "discover", "hero-pick", "hero", 0)}
                  />
                  <div className="grid gap-4">
                    {featuredItems.slice(1, 4).map((tenant, index) => (
                      <CompactDiscoveryCard
                        key={tenant.id}
                        tenant={tenant}
                        surface="discover"
                        sectionId="hero-pick"
                        cardVariant="stacked"
                        positionIndex={index + 1}
                        onVisible={() => markImpression(tenant, "discover", "hero-pick", "stacked", index + 1)}
                      />
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            <section className="space-y-4">
              <SectionHeader
                eyebrow="Quick Explore"
                title="Eksplor cepat yang terasa lebih hidup"
                description="Marketplace Bookinaja sekarang mendorong discovery berdasarkan kualitas listing, minat customer, dan sinyal aktivitas yang sedang terjadi."
              />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {explorerGrid.slice(0, 6).map((tenant, index) => (
                  <CompactDiscoveryCard
                    key={tenant.id}
                    tenant={tenant}
                    surface="discover"
                    sectionId="quick-explore"
                    cardVariant="grid"
                    positionIndex={index}
                    onVisible={() => markImpression(tenant, "discover", "quick-explore", "grid", index)}
                  />
                ))}
              </div>
            </section>

            <div className="space-y-8">
              {filteredSections.map((section) => (
                <DiscoverySectionBlock
                  key={section.id}
                  section={section}
                  markImpression={markImpression}
                />
              ))}
            </div>

            {explorerGrid.length === 0 ? (
              <section className="rounded-[2rem] border border-dashed border-[#d7c7b2] bg-white/75 p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                  <Compass className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="mt-5 text-2xl font-black uppercase tracking-tight">
                  Belum ada yang cocok
                </h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
                  Coba kata kunci lain atau ganti kategori. Discovery marketplace ini dirancang supaya customer tetap bisa menemukan jalur baru, bukan mentok di satu hasil.
                </p>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
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
    <div className="max-w-2xl">
      <div className={cn("text-[10px] font-black uppercase tracking-[0.28em]", bookinajaDiscoveryTheme.accentText)}>
        {eyebrow}
      </div>
      <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] md:text-3xl">
        {title}
      </h2>
      <p className={cn("mt-2 text-sm leading-7", bookinajaDiscoveryTheme.mutedText)}>{description}</p>
    </div>
  );
}

function DiscoverySectionBlock({
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
    <section className="space-y-4">
      <SectionHeader
        eyebrow={section.style}
        title={section.title}
        description={section.description}
      />
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
        {section.items.map((tenant, index) => (
          <div key={tenant.id} className="w-[280px] min-w-[280px] flex-none">
            <CompactDiscoveryCard
              tenant={tenant}
              surface="discover"
              sectionId={section.id}
              cardVariant="rail"
              positionIndex={index}
              onVisible={() => markImpression(tenant, "discover", section.id, "rail", index)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureSpotlightCard({
  tenant,
  onVisible,
}: {
  tenant: DiscoveryTenant;
  onVisible?: () => void;
}) {
  useEffect(() => {
    onVisible?.();
  }, [onVisible]);

  return (
    <Card className="overflow-hidden rounded-[2.2rem] border-0 bg-slate-950 text-white shadow-[0_28px_70px_rgba(15,23,42,0.22)]">
      <CardContent className="relative p-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{
            backgroundImage: tenant.featured_image_url || tenant.banner_url
              ? `url(${tenant.featured_image_url || tenant.banner_url})`
              : "linear-gradient(135deg, rgba(13,31,39,0.94), rgba(31,75,73,0.65))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/75 via-black/45 to-blue-400/20" />
        <div className="relative z-10 flex min-h-[420px] flex-col justify-between p-5 md:p-7">
          <div className="flex items-center justify-between gap-3">
            <Badge className="rounded-full border-none bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
              {tenant.promo_label || getDiscoveryCategoryLabel(tenant)}
            </Badge>
            <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold text-white/90">
              <Flame className="mr-1 h-3.5 w-3.5" />
              {formatStartingPrice(tenant.starting_price)}
            </Badge>
          </div>

          <div>
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/15"
              style={tenant.primary_color ? { backgroundColor: tenant.primary_color } : undefined}
            >
              {tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logo_url} alt="" className="h-full w-full rounded-2xl object-cover" />
              ) : (
                <Building2 className="h-6 w-6" />
              )}
            </div>
            <h3 className="mt-5 text-3xl font-black uppercase leading-[0.95] tracking-[-0.04em] md:text-4xl">
              {tenant.name}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/84 md:text-base">
              {tenant.discovery_headline || tenant.tagline || tenant.about_us}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/66">
              {tenant.highlight_copy || tenant.featured_reason || tenant.discovery_subheadline}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(tenant.discovery_badges || tenant.discovery_tags || []).slice(0, 4).map((badge) => (
                <span
                  key={badge}
                  className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold text-white/92"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-white/74">
              {tenant.availability_hint || "Jelajahi bisnis ini untuk rencana booking berikutnya."}
            </div>
            <Button asChild className="h-12 rounded-2xl bg-white text-slate-950 hover:bg-white/90">
              <a
                href={getTenantUrl(tenant.slug)}
                onClick={() =>
                  trackDiscoveryEvent({
                    tenant_id: tenant.id,
                    tenant_slug: tenant.slug,
                    event_type: "click",
                    surface: "discover",
                    section_id: "hero-pick",
                    card_variant: "hero",
                    position_index: 0,
                    promo_label: tenant.promo_label,
                  })
                }
              >
                Kunjungi Bisnis
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactDiscoveryCard({
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

  return (
    <Card className={cn("group h-full overflow-hidden rounded-[1.8rem] border shadow-[0_18px_45px_rgba(15,23,42,0.07)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_52px_rgba(15,23,42,0.10)]", bookinajaDiscoveryTheme.cardBorder, bookinajaDiscoveryTheme.cardBg)}>
      <CardContent className="flex h-full flex-col p-0">
        <div
          className="h-40 w-full bg-cover bg-center"
          style={{
            backgroundImage: tenant.featured_image_url || tenant.banner_url
              ? `url(${tenant.featured_image_url || tenant.banner_url})`
              : "linear-gradient(135deg, rgba(13,31,39,0.92), rgba(215,177,122,0.72))",
          }}
        />
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white"
              style={tenant.primary_color ? { backgroundColor: tenant.primary_color } : undefined}
            >
              {tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logo_url} alt="" className="h-full w-full rounded-2xl object-cover" />
              ) : (
                <Store className="h-5 w-5" />
              )}
            </div>
            {tenant.promo_label ? (
              <Badge className={cn("rounded-full border-none px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]", bookinajaDiscoveryTheme.accentSoft)}>
                {tenant.promo_label}
              </Badge>
            ) : null}
          </div>

          <h3 className="mt-4 line-clamp-2 text-xl font-black uppercase tracking-[-0.03em] text-slate-950">
            {tenant.name}
          </h3>
          <p className={cn("mt-2 line-clamp-3 text-sm leading-6", bookinajaDiscoveryTheme.mutedText)}>
            {tenant.discovery_headline || tenant.tagline || tenant.about_us}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(tenant.discovery_tags || tenant.discovery_badges || []).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#f1e7d8] px-3 py-1 text-[11px] font-semibold text-[#6c5a43]"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-4 grid gap-2 rounded-2xl bg-white/80 p-3 text-[11px] font-medium text-slate-500 ring-1 ring-blue-100">
            <div className="flex items-center justify-between">
              <span>Mulai</span>
              <span className="font-semibold text-slate-950">
                {formatStartingPrice(tenant.starting_price)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Signal</span>
              <span className="font-semibold text-slate-950">
                {tenant.discovery_clicks_30d && tenant.discovery_clicks_30d > 0
                  ? `${tenant.discovery_clicks_30d} klik / 30 hari`
                  : `${tenant.resource_count || 0} resource`}
              </span>
            </div>
          </div>

          <p className={cn("mt-4 text-sm leading-6", bookinajaDiscoveryTheme.mutedText)}>
            {tenant.highlight_copy || tenant.availability_hint || tenant.discovery_subheadline}
          </p>

          <Button
            asChild
            className={cn("mt-5 h-11 rounded-2xl text-sm font-semibold shadow-sm hover:opacity-95", bookinajaDiscoveryTheme.accentStrong)}
          >
            <a
              href={getTenantUrl(tenant.slug)}
              onClick={() =>
                trackDiscoveryEvent({
                  tenant_id: tenant.id,
                  tenant_slug: tenant.slug,
                  event_type: "click",
                  surface,
                  section_id: sectionId,
                  card_variant: cardVariant,
                  position_index: positionIndex,
                  promo_label: tenant.promo_label,
                })
              }
            >
              Buka Bisnis
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
