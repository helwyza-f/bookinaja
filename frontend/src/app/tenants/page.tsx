"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Compass,
  Search,
  Sparkles,
  Store,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getTenantUrl } from "@/lib/tenant";
import {
  type DiscoveryFeedResponse,
  type DiscoverySection,
  type DiscoveryTenant,
  formatStartingPrice,
  getDiscoveryCategoryLabel,
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
      (item) => {
        map.set(item.id, item);
      },
    );
    return Array.from(map.values());
  }, [feed]);

  const categories = useMemo(() => {
    const items = feed?.quick_categories || [];
    return [FILTER_ALL, ...items];
  }, [feed?.quick_categories]);

  const matchesDiscoveryFilters = useCallback((tenant: DiscoveryTenant) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      q.length === 0 ||
      [
        tenant.name,
        tenant.slug,
        tenant.business_category,
        tenant.business_type,
        tenant.discovery_headline,
        tenant.discovery_subheadline,
        ...(tenant.discovery_tags || []),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));

    const categoryLabel = getDiscoveryCategoryLabel(tenant).toLowerCase();
    const matchesCategory =
      activeCategory === FILTER_ALL ||
      categoryLabel === activeCategory.toLowerCase();

    return matchesQuery && matchesCategory;
  }, [activeCategory, query]);

  const filteredFeatured = useMemo(
    () => (feed?.featured || []).filter(matchesDiscoveryFilters),
    [feed?.featured, matchesDiscoveryFilters],
  );

  const filteredSections = useMemo(() => {
    if (!feed) return [];
    return feed.sections
      .map((section) => ({
        ...section,
        items: section.items.filter(matchesDiscoveryFilters),
      }))
      .filter((section) => section.items.length > 0);
  }, [feed, matchesDiscoveryFilters]);

  const fallbackItems = useMemo(
    () => allItems.filter(matchesDiscoveryFilters),
    [allItems, matchesDiscoveryFilters],
  );

  const markImpression = useCallback(
    (tenant: DiscoveryTenant, surface: string, sectionId: string, cardVariant: string, positionIndex: number) => {
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
    <div className="relative min-h-screen overflow-hidden bg-[#f6f2ea] pb-24 text-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[56vh] bg-[radial-gradient(circle_at_top_right,_rgba(215,162,90,0.24),_transparent_34%),radial-gradient(circle_at_top_left,_rgba(28,110,120,0.18),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.55),transparent)]" />
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#102229_0%,#1f4b49_52%,#e7d2ae_100%)] px-5 py-6 text-white shadow-[0_35px_80px_rgba(16,34,41,0.20)] md:px-8 md:py-9">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.24),_transparent_58%)]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-white/90">
                <Sparkles className="h-3.5 w-3.5" />
                {feed?.hero?.eyebrow || "Discovery Marketplace"}
              </div>
              <h1 className="mt-4 max-w-2xl text-3xl font-black uppercase tracking-[-0.04em] md:text-5xl md:leading-[0.95]">
                {feed?.hero?.title || "Temukan sesuatu yang ingin kamu lakukan hari ini."}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 md:text-base">
                {feed?.hero?.description ||
                  "Jelajahi bisnis, aktivitas, dan tempat baru di Bookinaja dengan pengalaman yang terasa lebih hidup dari sekadar daftar bisnis."}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                asChild
                className="h-12 rounded-2xl bg-white px-5 text-sm font-semibold text-slate-950 hover:bg-white/90"
              >
                <Link href="/user/login">Masuk Portal Customer</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-2xl border-white/30 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/15"
              >
                <Link href="/pricing">Lihat Pricing</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="sticky top-4 z-20 mt-6 rounded-[1.7rem] border border-white/80 bg-white/80 p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  feed?.hero?.search_hint ||
                  "Cari tempat, kategori, atau aktivitas yang ingin kamu lakukan"
                }
                className="h-14 rounded-2xl border-slate-200 bg-white pl-12 text-sm font-medium shadow-none"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    "whitespace-nowrap rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] transition-all",
                    activeCategory === category
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="mt-8 space-y-8">
            <Skeleton className="h-72 rounded-[2rem] bg-white/80" />
            <Skeleton className="h-72 rounded-[2rem] bg-white/80" />
            <Skeleton className="h-72 rounded-[2rem] bg-white/80" />
          </div>
        ) : (
          <>
            <section className="mt-8">
              <SectionHeader
                eyebrow="Featured"
                title="Pilihan yang paling layak dijelajahi sekarang"
                description="Highlight utama untuk customer yang ingin menemukan sesuatu yang baru tanpa harus scroll terlalu jauh."
              />
              {filteredFeatured.length > 0 ? (
                <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                  {filteredFeatured.slice(0, 1).map((tenant) => (
                    <FeaturedHeroCard
                      key={tenant.id}
                      tenant={tenant}
                      onVisible={() => markImpression(tenant, "discover", "featured", "hero", 0)}
                    />
                  ))}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    {filteredFeatured.slice(1, 4).map((tenant, index) => (
                      <CompactDiscoveryCard
                        key={tenant.id}
                        tenant={tenant}
                        surface="discover"
                        sectionId="featured"
                        cardVariant="compact"
                        positionIndex={index + 1}
                        onVisible={() =>
                          markImpression(tenant, "discover", "featured", "compact", index + 1)
                        }
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <div className="mt-10 space-y-10">
              {filteredSections.map((section) => (
                <DiscoverySectionBlock key={section.id} section={section} />
              ))}
            </div>

            {!filteredFeatured.length && filteredSections.length === 0 ? (
              <section className="mt-12 rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-14 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                  <Compass className="h-9 w-9 text-slate-400" />
                </div>
                <h3 className="mt-6 text-2xl font-black uppercase tracking-tight">
                  Belum ada yang cocok
                </h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
                  Coba ganti kata kunci atau kategori. Kalau mau melihat semua pilihan yang ada sekarang, kamu bisa mulai dari daftar tenant yang sudah tersedia.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {fallbackItems.slice(0, 3).map((tenant, index) => (
                    <CompactDiscoveryCard
                      key={tenant.id}
                      tenant={tenant}
                      surface="discover"
                      sectionId="fallback"
                      cardVariant="fallback"
                      positionIndex={index}
                      onVisible={() =>
                        markImpression(tenant, "discover", "fallback", "fallback", index)
                      }
                    />
                  ))}
                </div>
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
      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#1f4b49]">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] md:text-3xl">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
    </div>
  );
}

function DiscoverySectionBlock({ section }: { section: DiscoverySection }) {
  return (
    <section>
      <SectionHeader
        eyebrow={section.style}
        title={section.title}
        description={section.description}
      />
      <div className="mt-5 flex gap-4 overflow-x-auto pb-2 scrollbar-none">
        {section.items.map((tenant, index) => (
          <div key={tenant.id} className="min-w-[300px] max-w-[300px] flex-none">
            <CompactDiscoveryCard
              tenant={tenant}
              surface="discover"
              sectionId={section.id}
              cardVariant="section-card"
              positionIndex={index}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedHeroCard({
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
    <Card className="overflow-hidden rounded-[2.3rem] border-0 bg-slate-950 text-white shadow-[0_30px_70px_rgba(15,23,42,0.18)]">
      <CardContent className="relative p-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage: tenant.featured_image_url || tenant.banner_url
              ? `url(${tenant.featured_image_url || tenant.banner_url})`
              : "linear-gradient(135deg, rgba(16,34,41,0.94), rgba(37,99,235,0.65))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/75 via-black/40 to-white/10" />
        <div className="relative z-10 flex min-h-[430px] flex-col justify-between p-6 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <Badge className="rounded-full border-none bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
              {tenant.promo_label || getDiscoveryCategoryLabel(tenant)}
            </Badge>
            <Badge className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold text-white/90">
              {formatStartingPrice(tenant.starting_price)}
            </Badge>
          </div>

          <div>
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/15 text-white shadow-lg"
              style={tenant.primary_color ? { backgroundColor: tenant.primary_color } : undefined}
            >
              {tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logo_url} alt="" className="h-full w-full rounded-2xl object-cover" />
              ) : (
                <Building2 className="h-6 w-6" />
              )}
            </div>
            <h3 className="mt-5 max-w-xl text-3xl font-black uppercase tracking-[-0.04em] md:text-4xl">
              {tenant.name}
            </h3>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/82">
              {tenant.discovery_headline || tenant.tagline || tenant.about_us}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">
              {tenant.highlight_copy || tenant.featured_reason || tenant.discovery_subheadline}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(tenant.discovery_badges || []).map((badge) => (
                <Badge
                  key={badge}
                  className="rounded-full border-none bg-white/12 px-3 py-1 text-[11px] font-semibold text-white/90"
                >
                  {badge}
                </Badge>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button
              asChild
              className="h-12 rounded-2xl bg-white px-5 text-sm font-semibold text-slate-950 hover:bg-white/90"
            >
              <a
                href={getTenantUrl(tenant.slug)}
                onClick={() =>
                  trackDiscoveryEvent({
                    tenant_id: tenant.id,
                    tenant_slug: tenant.slug,
                    event_type: "click",
                    surface: "discover",
                    section_id: "featured",
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
            <div className="text-sm text-white/70">
              {tenant.availability_hint || tenant.discovery_subheadline}
            </div>
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
    <Card className="group h-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_26px_48px_rgba(15,23,42,0.12)]">
      <CardContent className="flex h-full flex-col p-0">
        <div
          className="h-40 w-full bg-cover bg-center"
          style={{
            backgroundImage: tenant.featured_image_url || tenant.banner_url
              ? `url(${tenant.featured_image_url || tenant.banner_url})`
              : "linear-gradient(135deg, rgba(16,34,41,0.92), rgba(215,162,90,0.68))",
          }}
        />
        <div className="flex flex-1 flex-col p-5">
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
              <Badge className="rounded-full border-none bg-[#f0e4cf] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#7b4e16]">
                {tenant.promo_label}
              </Badge>
            ) : null}
          </div>

          <h3 className="mt-4 line-clamp-2 text-xl font-black uppercase tracking-[-0.03em] text-slate-950">
            {tenant.name}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
            {tenant.discovery_headline || tenant.tagline || tenant.about_us}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(tenant.discovery_tags || []).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-5 grid gap-2 rounded-2xl bg-slate-50 p-3 text-[11px] font-medium text-slate-500">
            <div className="flex items-center justify-between">
              <span>Mulai</span>
              <span className="font-semibold text-slate-950">
                {formatStartingPrice(tenant.starting_price)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Resource</span>
              <span className="font-semibold text-slate-950">
                {tenant.resource_count || 0} pilihan
              </span>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-500">
            {tenant.highlight_copy || tenant.availability_hint || tenant.discovery_subheadline}
          </p>

          <Button
            asChild
            className="mt-5 h-11 rounded-2xl bg-slate-950 text-sm font-semibold text-white hover:bg-[#1f4b49]"
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
