"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  Clock,
  Compass,
  LogOut,
  Search,
  Settings,
  Sparkles,
  Ticket,
  User,
  Wallet,
} from "lucide-react";
import api from "@/lib/api";
import { getTenantUrl } from "@/lib/tenant";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  bookinajaDiscoveryTheme,
  type DiscoveryFeedResponse,
  type DiscoveryTenant,
  formatStartingPrice,
  scoreDiscoveryTenant,
} from "@/lib/discovery";
import {
  discoveryImpressionKey,
  trackDiscoveryEvent,
} from "@/lib/discovery-analytics";

type CustomerDashboard = {
  customer?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string | null;
    tier?: string;
    loyalty_points?: number;
  };
  points?: number;
  point_activity?: PointEvent[];
  active_bookings?: BookingItem[];
  past_history?: BookingItem[];
};

type PointEvent = {
  id: string;
  tenant_name?: string;
  points: number;
  description?: string;
  created_at: string;
};

type BookingItem = {
  id: string;
  tenant_name?: string;
  tenant_slug?: string;
  resource?: string;
  date?: string;
  status?: string;
  grand_total?: number;
  total_spent?: number;
  balance_due?: number;
  payment_status?: string;
};

const FILTER_ALL = "Semua";

export default function UserDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<CustomerDashboard | null>(null);
  const [discoverFeed, setDiscoverFeed] = useState<DiscoveryFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(FILTER_ALL);
  const [seenImpressions, setSeenImpressions] = useState<Record<string, true>>({});

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [profileRes, discoverRes] = await Promise.all([
          api.get("/user/me"),
          api.get("/public/discover/feed").catch(() => ({ data: null })),
        ]);

        if (active) {
          setData(profileRes.data);
          setDiscoverFeed(discoverRes.data || null);
        }
      } catch (error) {
        if (isTenantAuthError(error)) {
          clearTenantSession({ keepTenantSlug: true });
        }
        router.replace("/user/login");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [router]);

  const activeBookings = useMemo(() => data?.active_bookings || [], [data?.active_bookings]);
  const pastHistory = useMemo(() => data?.past_history || [], [data?.past_history]);
  const pointActivity = useMemo(() => data?.point_activity || [], [data?.point_activity]);

  const categories = useMemo(() => {
    const items = discoverFeed?.quick_categories || [];
    return [FILTER_ALL, ...items];
  }, [discoverFeed?.quick_categories]);

  const discoverCandidates = useMemo(() => {
    const map = new Map<string, DiscoveryTenant>();
    [ ...(discoverFeed?.featured || []), ...((discoverFeed?.sections || []).flatMap((section) => section.items)) ].forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  }, [discoverFeed]);

  const bookedSlugs = useMemo(
    () =>
      new Set(
        [...activeBookings, ...pastHistory]
          .map((booking) => booking.tenant_slug)
          .filter(Boolean),
      ),
    [activeBookings, pastHistory],
  );

  const personalizedDiscoveries = useMemo(() => {
    return discoverCandidates
      .filter((tenant) => {
        const matchesCategory =
          activeCategory === FILTER_ALL ||
          `${tenant.business_category || tenant.business_type || ""}`.toLowerCase() ===
            activeCategory.toLowerCase();
        const score = scoreDiscoveryTenant(tenant, query);
        return matchesCategory && score > -100;
      })
      .sort((left, right) => {
        const leftScore = scoreDiscoveryTenant(left, query) + (bookedSlugs.has(left.slug) ? 18 : 0);
        const rightScore = scoreDiscoveryTenant(right, query) + (bookedSlugs.has(right.slug) ? 18 : 0);
        return rightScore - leftScore;
      });
  }, [activeCategory, bookedSlugs, discoverCandidates, query]);

  const featuredTenant = personalizedDiscoveries[0] || null;
  const recommendedGrid = personalizedDiscoveries.slice(1, 7);
  const trendingSection = useMemo(
    () => discoverFeed?.sections.find((section) => section.id === "trending-now") || null,
    [discoverFeed?.sections],
  );

  const markImpression = (
    tenant: DiscoveryTenant,
    sectionId: string,
    cardVariant: string,
    positionIndex: number,
  ) => {
    const key = discoveryImpressionKey(["customer-hub", sectionId, cardVariant, tenant.id]);
    if (seenImpressions[key]) return;
    setSeenImpressions((prev) => ({ ...prev, [key]: true }));
    trackDiscoveryEvent({
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      event_type: "impression",
      surface: "customer-hub",
      section_id: sectionId,
      card_variant: cardVariant,
      position_index: positionIndex,
      promo_label: tenant.promo_label,
    });
  };

  const handleLogout = () => {
    clearTenantSession({ keepTenantSlug: true });
    router.push("/user/login");
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const tier = data?.customer?.tier || "Member";
  const points = data?.points || 0;

  return (
    <div className={cn("min-h-screen pb-24", bookinajaDiscoveryTheme.pageBg)}>
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-[42vh]", bookinajaDiscoveryTheme.pageGlow)} />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 md:px-6 md:py-6">
        <header className="flex items-center justify-between">
          <div>
            <p className={cn("text-[10px] font-black uppercase tracking-[0.24em]", bookinajaDiscoveryTheme.accentText)}>
              Customer Hub
            </p>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950">
              Bookinaja Portal
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="icon" className="rounded-2xl border-[#e7d8c3] bg-white/70">
              <Link href="/user/me/settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
            <Button onClick={handleLogout} size="icon" className={cn("rounded-2xl shadow-sm", bookinajaDiscoveryTheme.accentStrong)}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <section className={cn("overflow-hidden rounded-[2rem] border p-4 shadow-[0_24px_70px_rgba(13,31,39,0.18)] md:p-6", bookinajaDiscoveryTheme.heroBg, bookinajaDiscoveryTheme.heroBorder)}>
          <div className="flex flex-col gap-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/90">
                  <Sparkles className="h-3.5 w-3.5" />
                  Discovery-first Customer Portal
                </div>
                <h2 className="mt-4 text-3xl font-black uppercase leading-[0.94] tracking-[-0.05em] md:text-5xl">
                  Temukan tempat berikutnya tanpa berhenti di riwayat booking.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/78 md:text-base">
                  Portal customer Bookinaja sekarang mendorong discovery: cari aktivitas, lihat bisnis yang sedang ramai, lalu lanjut booking dari satu tempat yang terasa lebih hidup.
                </p>
              </div>
              <div className="hidden rounded-[1.6rem] border border-white/15 bg-white/10 p-4 md:block">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <User className="h-6 w-6" />
                </div>
                <div className="mt-3 text-sm font-semibold">{data?.customer?.name || "Customer"}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/70">{tier}</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={discoverFeed?.hero?.search_hint || "Cari tempat, kategori, atau suasana yang kamu cari"}
                  className="h-14 rounded-2xl border-white/15 bg-white/92 pl-12 text-sm font-medium text-slate-950 placeholder:text-slate-500"
                />
              </div>
              <Button asChild className="h-14 rounded-2xl bg-white text-slate-950 hover:bg-white/90">
                <Link href="/tenants">
                  Jelajahi Marketplace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryPill label="Tier" value={tier} icon={<Sparkles className="h-4 w-4" />} />
              <SummaryPill label="Points" value={points.toLocaleString("id-ID")} icon={<Wallet className="h-4 w-4" />} />
              <SummaryPill label="Booking Aktif" value={String(activeBookings.length)} icon={<Ticket className="h-4 w-4" />} />
              <SummaryPill label="Riwayat" value={String(pastHistory.length)} icon={<Calendar className="h-4 w-4" />} />
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
                    : "bg-[#f3ebdf] text-[#7b7368] hover:bg-[#eadcc6]",
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {featuredTenant ? (
          <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <DiscoverHeroCard
              tenant={featuredTenant}
              onVisible={() => markImpression(featuredTenant, "hero-discovery", "hero", 0)}
            />
            <div className="grid gap-4">
              <BookingSnapshotCard bookings={activeBookings} />
              <LoyaltyCard points={points} pointActivity={pointActivity} />
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Recommended"
            title="Paling relevan buat kamu sekarang"
            description="Gabungan antara bisnis yang lagi ramai, listing yang paling siap, dan tenant yang nyambung dengan minat atau jejak booking kamu."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recommendedGrid.map((tenant, index) => (
              <CustomerDiscoveryCard
                key={tenant.id}
                tenant={tenant}
                index={index}
                sectionId="recommended"
                onVisible={() => markImpression(tenant, "recommended", "grid", index)}
              />
            ))}
          </div>
          {recommendedGrid.length === 0 ? (
            <EmptyDiscoveryState />
          ) : null}
        </section>

        {trendingSection ? (
          <section className="space-y-4">
            <SectionHeader
              eyebrow="Trending"
              title={trendingSection.title}
              description={trendingSection.description}
            />
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {trendingSection.items.slice(0, 8).map((tenant, index) => (
                <div key={tenant.id} className="w-[280px] min-w-[280px] flex-none">
                  <CustomerDiscoveryCard
                    tenant={tenant}
                    index={index}
                    sectionId="trending-now"
                    onVisible={() => markImpression(tenant, "trending-now", "rail", index)}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Your Journey"
            title="Booking yang masih berjalan dan histori terakhir"
            description="Customer portal tetap menyimpan fungsi akun, tapi sekarang posisinya mendukung discovery, bukan menjadi satu-satunya alasan orang kembali."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {[...activeBookings.slice(0, 2), ...pastHistory.slice(0, 2)].map((booking) => (
              <BookingJourneyCard key={booking.id} booking={booking} />
            ))}
          </div>
          {activeBookings.length === 0 && pastHistory.length === 0 ? (
            <div className="rounded-[1.8rem] border border-dashed border-[#d7c7b2] bg-white/80 p-8 text-center">
              <Ticket className="mx-auto h-8 w-8 text-[#9a8f82]" />
              <h3 className="mt-4 text-xl font-black uppercase tracking-tight">Belum ada booking</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[#736b61]">
                Mulai dari marketplace discovery untuk menemukan tempat pertama yang ingin kamu coba.
              </p>
              <Button asChild className={cn("mt-5 rounded-2xl", bookinajaDiscoveryTheme.accentStrong)}>
                <Link href="/tenants">Mulai Jelajahi</Link>
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-4 md:px-6 md:py-6">
      <Skeleton className="h-10 rounded-2xl bg-white/80" />
      <Skeleton className="h-80 rounded-[2rem] bg-white/80" />
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Skeleton className="h-[420px] rounded-[2rem] bg-white/80" />
        <div className="grid gap-4">
          <Skeleton className="h-48 rounded-[2rem] bg-white/80" />
          <Skeleton className="h-48 rounded-[2rem] bg-white/80" />
        </div>
      </div>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/72">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-lg font-black text-white">{value}</div>
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
      <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] text-slate-950 md:text-3xl">
        {title}
      </h2>
      <p className={cn("mt-2 text-sm leading-7", bookinajaDiscoveryTheme.mutedText)}>{description}</p>
    </div>
  );
}

function DiscoverHeroCard({
  tenant,
  onVisible,
}: {
  tenant: DiscoveryTenant;
  onVisible: () => void;
}) {
  useEffect(() => {
    onVisible();
  }, [onVisible]);

  return (
    <Card className="overflow-hidden rounded-[2rem] border-0 bg-slate-950 text-white shadow-[0_28px_70px_rgba(15,23,42,0.22)]">
      <CardContent className="relative p-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{
            backgroundImage: tenant.featured_image_url || tenant.banner_url
              ? `url(${tenant.featured_image_url || tenant.banner_url})`
              : "linear-gradient(135deg, rgba(13,31,39,0.95), rgba(31,75,73,0.64))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/75 via-black/45 to-[#d7b17a]/18" />
        <div className="relative z-10 flex min-h-[380px] flex-col justify-between p-5 md:p-7">
          <div className="flex items-center justify-between gap-3">
            <Badge className="rounded-full border-none bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
              {tenant.promo_label || "Pilihan Hari Ini"}
            </Badge>
            <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold text-white/90">
              {formatStartingPrice(tenant.starting_price)}
            </Badge>
          </div>

          <div>
            <h3 className="text-3xl font-black uppercase leading-[0.94] tracking-[-0.04em] md:text-4xl">
              {tenant.name}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/84 md:text-base">
              {tenant.discovery_headline || tenant.tagline || tenant.about_us}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/66">
              {tenant.highlight_copy || tenant.featured_reason || tenant.discovery_subheadline}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(tenant.discovery_badges || tenant.discovery_tags || []).slice(0, 4).map((item) => (
                <span key={item} className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold text-white/92">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-white/74">
              {tenant.availability_hint || "Cocok untuk ide booking berikutnya."}
            </div>
            <Button asChild className="h-12 rounded-2xl bg-white text-slate-950 hover:bg-white/90">
              <a
                href={getTenantUrl(tenant.slug)}
                onClick={() =>
                  trackDiscoveryEvent({
                    tenant_id: tenant.id,
                    tenant_slug: tenant.slug,
                    event_type: "click",
                    surface: "customer-hub",
                    section_id: "hero-discovery",
                    card_variant: "hero",
                    position_index: 0,
                    promo_label: tenant.promo_label,
                  })
                }
              >
                Buka Bisnis
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BookingSnapshotCard({ bookings }: { bookings: BookingItem[] }) {
  return (
    <Card className="rounded-[1.8rem] border-[#eadfce] bg-[#fffaf3] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={cn("text-[10px] font-black uppercase tracking-[0.24em]", bookinajaDiscoveryTheme.accentText)}>
              Active Snapshot
            </p>
            <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-950">
              Booking yang masih berjalan
            </h3>
          </div>
          <Badge className={cn("rounded-full border-none px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]", bookinajaDiscoveryTheme.accentSoft)}>
            {bookings.length} aktif
          </Badge>
        </div>
        <div className="mt-4 space-y-3">
          {bookings.slice(0, 3).map((booking) => (
            <div key={booking.id} className="rounded-2xl bg-white/80 p-3 ring-1 ring-[#efe3d4]">
              <div className="text-sm font-bold text-slate-950">{booking.tenant_name || "Tenant"}</div>
              <div className="mt-1 text-sm text-[#6d6b67]">{booking.resource || "Booking"}</div>
              <div className="mt-2 flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7d6c]">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {booking.date
                    ? new Date(booking.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })
                    : "-"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {booking.date
                    ? new Date(booking.date).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </span>
              </div>
            </div>
          ))}
          {bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d7c7b2] bg-white/70 p-4 text-sm text-[#736b61]">
              Belum ada booking aktif. Discovery feed di samping membantu customer tidak berhenti hanya karena belum punya reservasi berjalan.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function LoyaltyCard({
  points,
  pointActivity,
}: {
  points: number;
  pointActivity: PointEvent[];
}) {
  return (
    <Card className="rounded-[1.8rem] border-[#eadfce] bg-[#fffaf3] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={cn("text-[10px] font-black uppercase tracking-[0.24em]", bookinajaDiscoveryTheme.accentText)}>
              Loyalty
            </p>
            <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-950">
              Points lintas tenant
            </h3>
          </div>
          <div className="rounded-2xl bg-[#1f4b49] px-3 py-2 text-right text-white">
            <div className="text-[10px] font-black uppercase tracking-[0.16em]">Total</div>
            <div className="mt-1 flex items-center gap-2 text-lg font-black">
              <Wallet className="h-4 w-4" />
              {points.toLocaleString("id-ID")}
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {pointActivity.slice(0, 3).map((event) => (
            <div key={event.id} className="flex items-center justify-between rounded-2xl bg-white/80 p-3 ring-1 ring-[#efe3d4]">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-slate-950">
                  {event.tenant_name || event.description || "Bookinaja"}
                </div>
                <div className="mt-1 text-xs text-[#736b61]">
                  {new Date(event.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div className="text-sm font-black text-[#1f4b49]">+{event.points}</div>
            </div>
          ))}
          {pointActivity.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d7c7b2] bg-white/70 p-4 text-sm text-[#736b61]">
              Aktivitas loyalty akan muncul setelah booking dan pembayaran mulai berjalan.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerDiscoveryCard({
  tenant,
  index,
  sectionId,
  onVisible,
}: {
  tenant: DiscoveryTenant;
  index: number;
  sectionId: string;
  onVisible: () => void;
}) {
  useEffect(() => {
    onVisible();
  }, [onVisible]);

  return (
    <Card className="group h-full overflow-hidden rounded-[1.8rem] border-[#eadfce] bg-[#fffaf3] shadow-[0_18px_45px_rgba(15,23,42,0.07)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_52px_rgba(15,23,42,0.10)]">
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
            <div className="rounded-full bg-[#ecdfca] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#6b4e2e]">
              {tenant.promo_label || "Discovery Pick"}
            </div>
            <div className="text-[11px] font-semibold text-[#7b7368]">
              {tenant.discovery_ctr_30d && tenant.discovery_ctr_30d > 0
                ? `${tenant.discovery_ctr_30d}% CTR`
                : formatStartingPrice(tenant.starting_price)}
            </div>
          </div>

          <h3 className="mt-4 line-clamp-2 text-xl font-black uppercase tracking-[-0.03em] text-slate-950">
            {tenant.name}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6d6b67]">
            {tenant.discovery_headline || tenant.tagline || tenant.about_us}
          </p>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#8a8176]">
            {tenant.highlight_copy || tenant.availability_hint || tenant.discovery_subheadline}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(tenant.discovery_badges || tenant.discovery_tags || []).slice(0, 3).map((item) => (
              <span key={item} className="rounded-full bg-[#f1e7d8] px-3 py-1 text-[11px] font-semibold text-[#6c5a43]">
                {item}
              </span>
            ))}
          </div>

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
                  surface: "customer-hub",
                  section_id: sectionId,
                  card_variant: "card",
                  position_index: index,
                  promo_label: tenant.promo_label,
                })
              }
            >
              Lihat Bisnis
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BookingJourneyCard({ booking }: { booking: BookingItem }) {
  return (
    <Card className="rounded-[1.8rem] border-[#eadfce] bg-[#fffaf3] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={cn("text-[10px] font-black uppercase tracking-[0.22em]", bookinajaDiscoveryTheme.accentText)}>
              {booking.tenant_name || "Tenant"}
            </div>
            <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-slate-950">
              {booking.resource || "Booking"}
            </h3>
          </div>
          <Badge className="rounded-full border-none bg-[#ecdfca] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#6b4e2e]">
            {booking.status || "history"}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7d6c]">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {booking.date
              ? new Date(booking.date).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                })
              : "-"}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {booking.date
              ? new Date(booking.date).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"}
          </span>
        </div>
        <div className="mt-4 text-sm text-[#6d6b67]">
          Total: Rp {((booking.total_spent || booking.grand_total || 0)).toLocaleString("id-ID")}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyDiscoveryState() {
  return (
    <div className="rounded-[1.8rem] border border-dashed border-[#d7c7b2] bg-white/80 p-8 text-center">
      <Compass className="mx-auto h-8 w-8 text-[#9a8f82]" />
      <h3 className="mt-4 text-xl font-black uppercase tracking-tight">Belum ada rekomendasi yang cocok</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[#736b61]">
        Coba kata kunci lain atau ganti kategori. Tujuan customer hub ini adalah membantu kamu menemukan sesuatu yang baru, bukan cuma membuka halaman akun.
      </p>
    </div>
  );
}
