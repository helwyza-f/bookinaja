"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  History,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserCircle2,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { getTenantUrl } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  type DiscoveryFeedResponse,
  type DiscoveryTenant,
  formatDiscoveryDuration,
  formatStartingPrice,
  getDiscoveryByline,
  getDiscoveryCardKind,
  getDiscoveryEventMetadata,
  getDiscoveryItemHref,
  getDiscoveryItemImage,
  getDiscoveryItemSummary,
  getDiscoveryItemTitle,
  getDiscoverySurfaceLabel,
  isDiscoveryBusiness,
  isDiscoveryPost,
  scoreDiscoveryTenant,
} from "@/lib/discovery";
import {
  discoveryImpressionKey,
  trackDiscoveryEvent,
} from "@/lib/discovery-analytics";
import {
  type CustomerPortalItem,
  formatPortalDate,
  getBookingStatusMeta,
  getOrderStatusMeta,
} from "@/lib/customer-portal";
import {
  getCustomerPortalCached,
  peekCustomerPortalCache,
  primeCustomerPortalCache,
} from "@/lib/customer-portal-cache";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { customerOrdersChannel } from "@/lib/realtime/channels";
import { BOOKING_EVENT_PREFIXES, matchesRealtimePrefix } from "@/lib/realtime/event-types";

type CustomerDashboard = {
  customer_id?: string;
  customer?: {
    id?: string;
    name?: string;
    tier?: string;
    phone?: string;
    email?: string;
    avatar_url?: string | null;
  };
  points?: number;
  point_activity?: PointEvent[];
  active_bookings?: CustomerPortalItem[];
  active_orders?: CustomerPortalItem[];
  past_history?: CustomerPortalItem[];
  past_orders?: CustomerPortalItem[];
};

type PointEvent = {
  id: string;
  tenant_name?: string;
  points: number;
  created_at: string;
};

const FILTER_ALL = "Semua";
const DISCOVER_CACHE_KEY = "customer-discover-feed";
const REALTIME_REFRESH_THROTTLE_MS = 1200;

export default function UserDashboardPage() {
  const router = useRouter();
  const cachedSummary = peekCustomerPortalCache<CustomerDashboard>("customer-summary");
  const cachedDiscoverFeed = peekCustomerPortalCache<DiscoveryFeedResponse>(DISCOVER_CACHE_KEY);
  const [data, setData] = useState<CustomerDashboard | null>(cachedSummary);
  const [discoverFeed, setDiscoverFeed] = useState<DiscoveryFeedResponse | null>(cachedDiscoverFeed);
  const [loading, setLoading] = useState(!cachedSummary);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(FILTER_ALL);
  const seenImpressionsRef = useRef<Set<string>>(new Set());
  const lastBackgroundRefreshRef = useRef(0);

  const loadDiscoverFeed = useCallback(async (mode: "initial" | "background" = "initial") => {
    try {
      const feed =
        mode === "background"
          ? (await api.get("/user/me/discover/feed")).data
          : await getCustomerPortalCached(DISCOVER_CACHE_KEY, async () => {
              const res = await api.get("/user/me/discover/feed");
              return res.data;
            });
      setDiscoverFeed(feed || null);
      if (feed) primeCustomerPortalCache(DISCOVER_CACHE_KEY, feed);
    } catch {
      if (mode === "initial") setDiscoverFeed(null);
    }
  }, []);

  const load = useCallback(async (mode: "initial" | "background" = "initial") => {
      try {
        const profileRes =
          mode === "background"
            ? (await api.get("/user/me/summary")).data
            : await getCustomerPortalCached("customer-summary", async () => {
                const res = await api.get("/user/me/summary");
                return res.data;
              });
        setData(profileRes);
        primeCustomerPortalCache("customer-summary", profileRes);
      } catch (error) {
        if (isTenantAuthError(error)) {
          clearTenantSession({ keepTenantSlug: true });
        }
        router.replace("/user/login");
      } finally {
        if (mode === "initial") setLoading(false);
      }
  }, [router]);

  useEffect(() => {
    void load("initial");
    if (!cachedDiscoverFeed) {
      void loadDiscoverFeed("initial");
    }
  }, [cachedDiscoverFeed, load, loadDiscoverFeed]);

  useRealtime({
    enabled: Boolean(data?.customer_id || data?.customer?.id),
    channels:
      data?.customer_id || data?.customer?.id
        ? [customerOrdersChannel(String(data?.customer_id || data?.customer?.id || ""))]
        : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      const now = Date.now();
      if (now - lastBackgroundRefreshRef.current < REALTIME_REFRESH_THROTTLE_MS) return;
      lastBackgroundRefreshRef.current = now;
      void load("background");
    },
    onReconnect: () => {
      void load("background");
    },
  });

  const customer = data?.customer;
  const customerInitials = useMemo(() => {
    return String(customer?.name || "CU")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }, [customer?.name]);
  const activeBookings = useMemo(() => data?.active_bookings || [], [data?.active_bookings]);
  const activeOrders = useMemo(() => data?.active_orders || [], [data?.active_orders]);
  const pointActivity = useMemo(() => data?.point_activity || [], [data?.point_activity]);
  const history = useMemo(() => data?.past_history || [], [data?.past_history]);
  const categories = useMemo(
    () => [FILTER_ALL, ...(discoverFeed?.quick_categories || [])],
    [discoverFeed?.quick_categories],
  );

  const discoverCandidates = useMemo(() => {
    const map = new Map<string, DiscoveryTenant>();
    [
      ...(discoverFeed?.featured || []),
      ...((discoverFeed?.sections || []).flatMap((section) => section.items)),
    ].forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  }, [discoverFeed]);

  const personalizedDiscoveries = useMemo(() => {
    return discoverCandidates
      .filter((tenant) => {
        const matchesCategory =
          activeCategory === FILTER_ALL ||
          `${tenant.business_category || tenant.business_type || ""}`.toLowerCase() ===
            activeCategory.toLowerCase();
        return matchesCategory && scoreDiscoveryTenant(tenant, query) > -100;
      })
      .sort((left, right) => scoreDiscoveryTenant(right, query) - scoreDiscoveryTenant(left, query));
  }, [activeCategory, discoverCandidates, query]);

  const featuredTenant = personalizedDiscoveries[0] || null;
  const discoveryGrid = personalizedDiscoveries.slice(0, 6);

  const markImpression = useCallback(
    (
      tenant: DiscoveryTenant,
      sectionId: string,
      cardVariant: string,
      positionIndex: number,
    ) => {
      const key = discoveryImpressionKey([sectionId, cardVariant, tenant.id]);
      if (seenImpressionsRef.current.has(key)) return;
      seenImpressionsRef.current.add(key);
      trackDiscoveryEvent({
        tenant_id: tenant.tenant_id || tenant.id,
        tenant_slug: tenant.slug,
        event_type: "impression",
        surface: "customer-hub",
        section_id: sectionId,
        card_variant: cardVariant,
        position_index: positionIndex,
        promo_label: tenant.promo_label,
        metadata: getDiscoveryEventMetadata(tenant),
      });
    },
    [],
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">
              Home
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Halo, {customer?.name?.split(" ")[0] || "Customer"}
            </h1>
          </div>
          <Link
            href="/user/me/settings"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white"
          >
            {customer?.avatar_url ? (
              <span
                className="h-full w-full rounded-2xl bg-cover bg-center"
                style={{ backgroundImage: `url(${customer.avatar_url})` }}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(37,99,235,0.88))] text-sm font-semibold text-white">
                {customerInitials || "CU"}
              </span>
            )}
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <MetricCard
            label="Points"
            value={String(data?.points || 0)}
            icon={Wallet}
            tone="blue"
          />
          <MetricCard
            label="Tier"
            value={customer?.tier || "NEW"}
            icon={Sparkles}
            tone="emerald"
          />
          <MetricCard
            label="Aktif"
            value={String(activeBookings.length + activeOrders.length)}
            icon={Ticket}
            tone="slate"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <QuickLink href="/user/me/active" label="Booking Aktif" icon={PlayCircle} />
          <QuickLink href="/user/me/history" label="Riwayat" icon={History} />
          <QuickLink href="/user/me/settings" label="Profil" icon={UserCircle2} />
          <QuickLink href="/user/me/settings?sheet=password" label="Keamanan" icon={ShieldCheck} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
              Lanjutkan
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
              Booking aktif kamu
            </h2>
          </div>
          {activeBookings.length ? (
            <Button asChild variant="ghost" className="h-10 rounded-2xl px-3">
              <Link href="/user/me/active">Lihat semua</Link>
            </Button>
          ) : null}
        </div>

        {activeBookings.length ? (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {activeBookings.slice(0, 5).map((booking) => (
              <Link
                key={booking.id}
                href={`/user/me/bookings/${booking.id}/live`}
                className="min-w-[240px] flex-none rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#10141f]"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {getBookingStatusMeta(booking.status).label}
                  </Badge>
                  <span className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    {booking.tenant_name || "Tenant"}
                  </span>
                </div>
                <div className="mt-3 line-clamp-2 text-base font-semibold tracking-tight text-slate-950 dark:text-white">
                  {booking.resource || "Booking"}
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {booking.date
                      ? formatPortalDate(booking.date)
                      : "-"}
                  </span>
                  <span>Rp {Number(booking.grand_total || 0).toLocaleString("id-ID")}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="rounded-[1.5rem] border-dashed border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
            <CardContent className="p-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Belum ada booking aktif. Bagian discovery di bawah jadi pintu tercepat untuk mulai cari tempat baru.
            </CardContent>
          </Card>
        )}
      </section>

      {activeOrders.length ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">
                Order
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
                Order aktif
              </h2>
            </div>
          </div>

          <div className="grid gap-3">
            {activeOrders.slice(0, 3).map((order) => (
              <Link
                key={order.id}
                href={`/user/me/orders/${order.id}`}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 dark:border-white/10 dark:bg-[#0b0f19] dark:hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className={getOrderStatusMeta(order.status, order.payment_status, order.balance_due).className}>
                        {getOrderStatusMeta(order.status, order.payment_status, order.balance_due).label}
                      </Badge>
                      <span className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        {order.tenant_name || "Tenant"}
                      </span>
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-950 dark:text-white">
                      {order.resource || "Order"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {getOrderStatusMeta(order.status, order.payment_status, order.balance_due).hint || "Lanjutkan order ini."}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-950 dark:text-white">
                      Rp{Number(order.grand_total || 0).toLocaleString("id-ID")}
                    </div>
                    <div className="mt-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
            Discovery
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
            Cari tempat berikutnya
          </h2>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={discoverFeed?.hero?.search_hint || "Cari tempat, kategori, atau aktivitas"}
            className="h-12 rounded-2xl border-slate-200 bg-white pl-11 text-sm dark:border-white/10 dark:bg-[#10141f]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all",
                activeCategory === category
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200",
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {featuredTenant ? (
        <FeatureHero
          tenant={featuredTenant}
          onVisible={() => markImpression(featuredTenant, "home-hero", "hero", 0)}
        />
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {discoveryGrid.map((tenant, index) => (
          <DiscoveryCard
            key={tenant.id}
            tenant={tenant}
            index={index}
            onVisible={() => markImpression(tenant, "home-grid", "compact", index)}
          />
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Card className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  Loyalty
                </p>
                <p className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                  Aktivitas points terakhir
                </p>
              </div>
              <Badge className="rounded-full border-none bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                {(data?.points || 0).toLocaleString("id-ID")}
              </Badge>
            </div>
            {pointActivity.length ? (
              pointActivity.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-950 dark:text-white">
                      {event.tenant_name || "Bookinaja"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(event.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-300">
                    +{event.points}
                  </p>
                </div>
              ))
            ) : (
              <EmptyCard label="Aktivitas loyalty akan muncul setelah booking dan pembayaran mulai berjalan." />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  Riwayat cepat
                </p>
                <p className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                  Booking terakhir kamu
                </p>
              </div>
              <Button asChild variant="ghost" className="h-10 rounded-2xl px-3">
                <Link href="/user/me/history">Buka riwayat</Link>
              </Button>
            </div>
            {history.length ? (
              history.slice(0, 3).map((booking) => (
                <Link
                  key={booking.id}
                  href={`/user/me/bookings/${booking.id}`}
                  className="block rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"
                >
                  <p className="text-sm font-medium text-slate-950 dark:text-white">
                    {booking.resource || "Booking"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {booking.tenant_name || "Tenant"} · Rp {Number(booking.grand_total || 0).toLocaleString("id-ID")}
                  </p>
                </Link>
              ))
            ) : (
              <EmptyCard label="Riwayat booking belum ada. Setelah mulai booking, daftar ini akan membantu repeat order lebih cepat." />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 rounded-[1.75rem]" />
      <Skeleton className="h-32 rounded-[1.75rem]" />
      <Skeleton className="h-64 rounded-[1.75rem]" />
      <Skeleton className="h-60 rounded-[1.75rem]" />
    </div>
  );
}

function getDiscoverHref(tenant: DiscoveryTenant) {
  return getDiscoveryItemHref(tenant) || getTenantUrl(tenant.slug);
}

function FeatureHero({
  tenant,
  onVisible,
}: {
  tenant: DiscoveryTenant;
  onVisible: () => void;
}) {
  const hasTrackedVisibilityRef = useRef(false);

  useEffect(() => {
    if (hasTrackedVisibilityRef.current) return;
    hasTrackedVisibilityRef.current = true;
    onVisible();
  }, [onVisible]);

  return (
    <Card className="overflow-hidden rounded-[1.75rem] border-0 bg-slate-950 text-white shadow-[0_22px_60px_rgba(15,23,42,0.22)] dark:bg-[#0b1222]">
      <CardContent className="relative p-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{
            backgroundImage: getDiscoveryItemImage(tenant)
              ? `url(${getDiscoveryItemImage(tenant)})`
              : "linear-gradient(135deg, rgba(13,31,39,0.94), rgba(29,78,216,0.65))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/78 via-black/45 to-blue-400/15" />
        <div className="relative z-10 flex min-h-[250px] flex-col justify-between p-4">
          <div className="flex items-center justify-between gap-3">
            <Badge className="rounded-full bg-white/10 text-white">
              {getDiscoverySurfaceLabel(tenant)}
            </Badge>
            <Badge className="rounded-full border border-white/15 bg-white/10 text-white/90">
              {formatStartingPrice(tenant.starting_price)}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
              {getDiscoveryByline(tenant)}
            </div>
            <h3 className="max-w-2xl text-2xl font-semibold tracking-tight">
              {getDiscoveryItemTitle(tenant)}
            </h3>
            <p className="max-w-2xl text-sm leading-6 text-white/85">
              {getDiscoveryItemSummary(tenant)}
            </p>
          </div>

          <Button asChild className="h-11 rounded-2xl bg-white text-slate-950 hover:bg-white/90">
            <a
              href={getDiscoverHref(tenant)}
              onClick={() =>
                trackDiscoveryEvent({
                  tenant_id: tenant.tenant_id || tenant.id,
                  tenant_slug: tenant.slug,
                  event_type: "click",
                  surface: "customer-hub",
                  section_id: "home-hero",
                  card_variant: "hero",
                  position_index: 0,
                  promo_label: tenant.feed_label || tenant.promo_label,
                  metadata: getDiscoveryEventMetadata(tenant),
                })
              }
            >
              Lihat sekarang
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscoveryCard({
  tenant,
  index,
  onVisible,
}: {
  tenant: DiscoveryTenant;
  index: number;
  onVisible: () => void;
}) {
  const hasTrackedVisibilityRef = useRef(false);

  useEffect(() => {
    if (hasTrackedVisibilityRef.current) return;
    hasTrackedVisibilityRef.current = true;
    onVisible();
  }, [onVisible]);

  const isBusiness = isDiscoveryBusiness(tenant);
  const cardKind = getDiscoveryCardKind(tenant);
  const isVideo = cardKind === "video";

  return (
    <Card className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#10141f]">
      <CardContent className="space-y-4 p-0">
        <div
          className="h-32 bg-cover bg-center"
          style={{
            backgroundImage: getDiscoveryItemImage(tenant)
              ? `url(${getDiscoveryItemImage(tenant)})`
              : isBusiness
                ? "linear-gradient(135deg, rgba(5,46,43,0.92), rgba(15,118,110,0.72))"
                : "linear-gradient(135deg, rgba(13,31,39,0.92), rgba(59,130,246,0.72))",
          }}
        />

        <div className="space-y-3 px-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge className="rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                {getDiscoverySurfaceLabel(tenant)}
              </Badge>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                {getDiscoveryByline(tenant)}
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {formatStartingPrice(tenant.starting_price)}
            </span>
          </div>

          <div>
            <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
              {getDiscoveryItemTitle(tenant)}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {getDiscoveryItemSummary(tenant)}
            </p>
          </div>

          <div className="rounded-[1.25rem] bg-slate-50 px-3 py-2 text-[11px] text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">
            {isBusiness
              ? `${tenant.resource_count || 0} resource siap dibooking`
              : isVideo
                ? `Video ${formatDiscoveryDuration(tenant.post_duration_seconds) || "singkat"}`
                : isDiscoveryPost(tenant)
                  ? "Postingan tenant yang layak dicek"
                  : "Tempat ini sedang relevan buat kamu"}
          </div>

          <Button
            asChild
            className="h-11 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <a
              href={getDiscoverHref(tenant)}
              onClick={() =>
                trackDiscoveryEvent({
                  tenant_id: tenant.tenant_id || tenant.id,
                  tenant_slug: tenant.slug,
                  event_type: "click",
                  surface: "customer-hub",
                  section_id: "home-grid",
                  card_variant: "compact",
                  position_index: index,
                  promo_label: tenant.feed_label || tenant.promo_label,
                  metadata: getDiscoveryEventMetadata(tenant),
                })
              }
            >
              Buka
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "blue" | "emerald" | "slate";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-3",
        tone === "blue" && "border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10",
        tone === "emerald" && "border-emerald-100 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10",
        tone === "slate" && "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]",
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
    >
      <Icon className="h-4 w-4 text-blue-600 dark:text-blue-300" />
      {label}
    </Link>
  );
}

function EmptyCard({ label }: { label: string }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-slate-200 px-4 py-5 text-sm leading-6 text-slate-500 dark:border-white/10 dark:text-slate-400">
      {label}
    </div>
  );
}
