"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DiscoveryCompactCard } from "@/components/discovery/discovery-cards";
import {
  type DiscoveryFeedResponse,
  type DiscoveryTenant,
  getDiscoveryCategoryLabel,
  getDiscoveryEventMetadata,
  getDiscoveryItemHref,
  scoreDiscoveryTenant,
  getDiscoveryItemSummary,
  getDiscoveryItemTitle,
} from "@/lib/discovery";
import {
  discoveryImpressionKey,
  trackDiscoveryEvent,
} from "@/lib/discovery-analytics";
import { getTenantUrl } from "@/lib/tenant";

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

  const visibleItems = useMemo(() => {
    return allItems
      .filter((tenant) => {
        const matchesCategory =
          activeCategory === FILTER_ALL ||
          getDiscoveryCategoryLabel(tenant).toLowerCase() ===
            activeCategory.toLowerCase();
        return matchesCategory && scoreDiscoveryTenant(tenant, query) > -100;
      })
      .sort((a, b) => scoreDiscoveryTenant(b, query) - scoreDiscoveryTenant(a, query))
      .slice(0, 12);
  }, [activeCategory, allItems, query]);

  const markImpression = useCallback(
    (tenant: DiscoveryTenant, positionIndex: number) => {
      const key = discoveryImpressionKey(["discover", "public-feed", "grid", tenant.id]);
      if (seenImpressionsRef.current.has(key)) return;
      seenImpressionsRef.current.add(key);
      trackDiscoveryEvent({
        tenant_id: tenant.tenant_id || tenant.id,
        tenant_slug: tenant.slug,
        event_type: "impression",
        surface: "discover",
        section_id: "public-feed",
        card_variant: "grid",
        position_index: positionIndex,
        promo_label: tenant.feed_label || tenant.promo_label,
        metadata: getDiscoveryEventMetadata(tenant),
      });
    },
    [],
  );

  return (
    <div
      className={cn(
        "relative min-h-screen bg-slate-50 pb-16 pt-6 text-slate-950 md:pt-8",
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 md:px-6">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              Jelajah
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
              Lihat tenant yang sudah terdaftar.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Cari bisnis, buka halamannya, lalu lanjut booking atau lihat detail
              layanan.
            </p>
          </div>
        </section>

        <section
          id="daftar-bisnis"
          className="rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari bisnis atau kategori"
                className="h-11 rounded-2xl border-slate-200 bg-white pl-11 text-sm shadow-none"
              />
            </div>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-2xl px-5 text-sm font-semibold"
            >
              <Link href="/user/login">Masuk customer</Link>
            </Button>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition-all",
                  activeCategory === category
                    ? "bg-blue-600 text-white shadow-[0_10px_22px_rgba(37,99,235,0.2)]"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {formatCategoryLabel(category)}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-64 rounded-[1.35rem] bg-white" />
            <Skeleton className="h-64 rounded-[1.35rem] bg-white" />
            <Skeleton className="h-64 rounded-[1.35rem] bg-white" />
          </div>
        ) : (
          <section className="space-y-4 pt-1">
            <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                  Hasil
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-slate-950 md:text-3xl">
                  Pilih tenant yang kamu cari.
                </h2>
              </div>
              <p className="text-sm font-medium text-slate-500">
                {visibleItems.length} hasil
              </p>
            </div>

            {visibleItems.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleItems.map((tenant, index) => (
                  <DiscoveryCompactCard
                    key={tenant.id}
                    tenant={tenant}
                    href={getDiscoverHref(tenant)}
                    ctaLabel={tenant.item_kind === "post" ? "Buka postingan" : "Buka tenant"}
                    summary={getDiscoveryItemSummary(tenant)}
                    footer={
                      tenant.item_kind === "post"
                        ? `${getDiscoveryItemTitle(tenant)} • ${tenant.post_detail_views_7d || 0} dilihat`
                        : `${tenant.resource_count || 0} layanan tersedia`
                    }
                    onVisible={() => markImpression(tenant, index)}
                    onClick={() =>
                      trackDiscoveryEvent({
                        tenant_id: tenant.tenant_id || tenant.id,
                        tenant_slug: tenant.slug,
                        event_type: "click",
                        surface: "discover",
                        section_id: "public-feed",
                        card_variant: "grid",
                        position_index: index,
                        promo_label: tenant.feed_label || tenant.promo_label,
                        metadata: getDiscoveryEventMetadata(tenant),
                      })
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-white p-7 text-center">
                <h3 className="text-lg font-semibold text-slate-950">
                  Tidak ada hasil.
                </h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                  Coba kata yang lebih umum atau ganti kategori.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function getDiscoverHref(tenant: DiscoveryTenant) {
  return getDiscoveryItemHref(tenant) || getTenantUrl(tenant.slug);
}

function formatCategoryLabel(category: string) {
  if (category === FILTER_ALL) return category;
  return category
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
