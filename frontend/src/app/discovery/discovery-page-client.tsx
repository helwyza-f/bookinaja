"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  DiscoveryCategoryChips,
  DiscoveryShowcaseCard,
} from "@/components/discovery/discovery-cards";
import {
  bookinajaDiscoveryTheme,
  type DiscoveryFeedResponse,
  type DiscoveryTenant,
  getDiscoveryCategoryLabel,
  getDiscoveryEventMetadata,
  getDiscoveryItemCta,
  getDiscoveryItemHref,
  getDiscoveryItemReason,
  isDiscoveryPromoPost,
  scoreDiscoveryTenant,
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
        "relative min-h-screen overflow-hidden pb-20 text-slate-950",
        bookinajaDiscoveryTheme.pageBg,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[32vh]",
          bookinajaDiscoveryTheme.pageGlow,
        )}
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 md:px-6 md:py-6">
        <section className="rounded-[2rem] border border-blue-100 bg-white/92 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur md:p-6">
          <div className="space-y-5">
            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                Discovery Bookinaja
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
                Cari tenant, promo, dan konten yang paling relevan untuk mulai booking.
              </p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  feed?.hero?.search_hint ||
                  "Cari tempat, kategori, aktivitas, atau suasana"
                }
                className="h-12 rounded-2xl border-slate-200 bg-white pl-11 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="sticky top-3 z-20 rounded-[1.4rem] border border-white/80 bg-white/90 p-2.5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DiscoveryCategoryChips
              categories={categories}
              activeCategory={activeCategory}
              onChange={setActiveCategory}
            />
            <div className="flex gap-2">
              <Button
                asChild
                className={cn(
                  "h-11 rounded-2xl px-5 text-sm font-semibold shadow-sm",
                  bookinajaDiscoveryTheme.accentStrong,
                )}
              >
                <Link href="/user/login">Masuk customer</Link>
              </Button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-80 rounded-[1.7rem] bg-white/80" />
            <Skeleton className="h-80 rounded-[1.7rem] bg-white/80" />
            <Skeleton className="h-80 rounded-[1.7rem] bg-white/80" />
          </div>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  Feed discovery
                </h2>
                <p className="text-sm text-slate-500">
                  {visibleItems.length} hasil yang paling relevan untuk query dan kategori aktif.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleItems.map((tenant, index) => (
                <DiscoveryShowcaseCard
                  key={tenant.id}
                  tenant={tenant}
                  href={getDiscoverHref(tenant)}
                  ctaLabel={getDiscoveryItemCta(tenant)}
                  tone={
                    tenant.item_kind !== "post"
                      ? "emerald"
                      : isDiscoveryPromoPost(tenant)
                        ? "amber"
                        : "blue"
                  }
                  meta={
                    getDiscoveryItemReason(tenant) ||
                    (tenant.item_kind === "post"
                      ? "Konten ini cukup jelas untuk dibuka lebih dulu."
                      : "Tenant ini cukup jelas untuk dibandingkan.")
                  }
                  stat={
                    tenant.item_kind === "post"
                      ? `${tenant.post_detail_views_7d || 0} buka detail`
                      : `${tenant.resource_count || 0} resource`
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
          </section>
        )}
      </div>
    </div>
  );
}

function getDiscoverHref(tenant: DiscoveryTenant) {
  return getDiscoveryItemHref(tenant) || getTenantUrl(tenant.slug);
}
