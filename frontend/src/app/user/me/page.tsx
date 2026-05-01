"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, Compass, Search, Ticket, Wallet } from "lucide-react";
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
    tier?: string;
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
  created_at: string;
};

type BookingItem = {
  id: string;
  tenant_name?: string;
  tenant_slug?: string;
  resource?: string;
  date?: string;
  status?: string;
  total_spent?: number;
  grand_total?: number;
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
          api.get("/user/me/discover/feed").catch(() => ({ data: null })),
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
  const pointActivity = useMemo(() => data?.point_activity || [], [data?.point_activity]);
  const categories = useMemo(() => [FILTER_ALL, ...(discoverFeed?.quick_categories || [])], [discoverFeed?.quick_categories]);

  const discoverCandidates = useMemo(() => {
    const map = new Map<string, DiscoveryTenant>();
    [ ...(discoverFeed?.featured || []), ...((discoverFeed?.sections || []).flatMap((section) => section.items)) ].forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  }, [discoverFeed]);

  const personalizedDiscoveries = useMemo(() => {
    return discoverCandidates
      .filter((tenant) => {
        const matchesCategory =
          activeCategory === FILTER_ALL ||
          `${tenant.business_category || tenant.business_type || ""}`.toLowerCase() === activeCategory.toLowerCase();
        return matchesCategory && scoreDiscoveryTenant(tenant, query) > -100;
      })
      .sort((left, right) => scoreDiscoveryTenant(right, query) - scoreDiscoveryTenant(left, query));
  }, [activeCategory, discoverCandidates, query]);

  const featuredTenant = personalizedDiscoveries[0] || null;
  const recommendedGrid = personalizedDiscoveries.slice(1, 5);
  const trendingSection = discoverFeed?.sections.find((section) => section.id === "trending-now") || null;

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

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
            Home Feed
          </p>
          <h1 className="text-2xl font-black uppercase tracking-[-0.04em] md:text-3xl">
            Temukan tempat berikutnya lebih cepat.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-500">
            Fokus utamanya sekarang ada di feed discovery. Booking aktif, riwayat, dan pengaturan akun tetap ada, tapi tidak lagi memenuhi layar utama.
          </p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={discoverFeed?.hero?.search_hint || "Cari tempat, kategori, atau aktivitas"}
            className="h-12 rounded-2xl border-slate-200 bg-white pl-11 text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition-all",
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

      {featuredTenant ? (
        <FeatureHero
          tenant={featuredTenant}
          onVisible={() => markImpression(featuredTenant, "home-hero", "hero", 0)}
        />
      ) : null}

      <section className="space-y-3">
        <SectionHeader
          eyebrow="Lanjutkan"
          title="Yang masih aktif buat kamu"
          description="Ringkasan kecil supaya kamu bisa lanjut booking tanpa mengalahkan feed utama."
        />
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {activeBookings.length ? (
            activeBookings.slice(0, 5).map((booking) => (
              <Link
                key={booking.id}
                href={`/user/me/bookings/${booking.id}`}
                className="min-w-[240px] flex-none rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge className="rounded-full bg-blue-50 text-blue-700">
                    {booking.status || "active"}
                  </Badge>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {booking.tenant_name || "Tenant"}
                  </span>
                </div>
                <div className="mt-3 text-base font-black uppercase tracking-tight">
                  {booking.resource || "Booking"}
                </div>
                <div className="mt-2 flex gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {booking.date
                      ? new Date(booking.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })
                      : "-"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {booking.date
                      ? new Date(booking.date).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="w-full rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
              Belum ada booking aktif. Fokus utama kamu sekarang bisa langsung ke feed discovery di bawah.
            </div>
          )}
        </div>
        {activeBookings.length ? (
          <Button asChild variant="outline" className="h-11 rounded-2xl">
            <Link href="/user/me/active">Lihat semua booking aktif</Link>
          </Button>
        ) : null}
      </section>

      <section className="space-y-3">
        <SectionHeader
          eyebrow="Untuk Kamu"
          title="Feed yang lebih content-centric"
          description="Konten bisnis yang layak diklik duluan, bukan blok metrik besar yang memenuhi layar."
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {recommendedGrid.map((tenant, index) => (
            <ContentCard
              key={tenant.id}
              tenant={tenant}
              sectionId="recommended"
              index={index}
              onVisible={() => markImpression(tenant, "recommended", "compact", index)}
            />
          ))}
        </div>
      </section>

      {trendingSection ? (
        <section className="space-y-3">
          <SectionHeader
            eyebrow="Sedang Ramai"
            title={trendingSection.title}
            description={trendingSection.description}
          />
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {trendingSection.items.slice(0, 8).map((tenant, index) => (
              <div key={tenant.id} className="w-[250px] min-w-[250px] flex-none">
                <ContentCard
                  tenant={tenant}
                  sectionId="trending"
                  index={index}
                  onVisible={() => markImpression(tenant, "trending", "rail", index)}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[1.8rem] border-blue-100 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
                  Loyalty
                </p>
                <h3 className="mt-1 text-lg font-black uppercase tracking-tight">
                  Points & activity
                </h3>
              </div>
              <div className="rounded-2xl bg-blue-600 px-3 py-2 text-right text-white">
                <div className="text-[10px] font-black uppercase tracking-[0.12em]">Total</div>
                <div className="mt-1 flex items-center gap-2 text-base font-black">
                  <Wallet className="h-4 w-4" />
                  {(data?.points || 0).toLocaleString("id-ID")}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {pointActivity.length ? (
                pointActivity.slice(0, 4).map((event) => (
                  <div key={event.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-950">
                        {event.tenant_name || "Bookinaja"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(event.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="text-sm font-black text-blue-600">+{event.points}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Aktivitas loyalty akan muncul setelah booking dan pembayaran mulai berjalan.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.8rem] border-blue-100 bg-white shadow-sm">
          <CardContent className="space-y-3 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
              Akun
            </p>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-base font-black uppercase tracking-tight">
                {data?.customer?.name || "Customer"}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Tier {data?.customer?.tier || "Member"}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <QuickStat label="Aktif" value={String(activeBookings.length)} icon={<Ticket className="h-4 w-4" />} />
              <QuickStat label="History" value={String(data?.past_history?.length || 0)} icon={<Compass className="h-4 w-4" />} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild variant="outline" className="h-11 rounded-2xl">
                <Link href="/user/me/history">Lihat Riwayat</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-2xl">
                <Link href="/user/me/settings">Pengaturan Akun</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-[2rem] bg-white" />
      <Skeleton className="h-72 rounded-[2rem] bg-white" />
      <Skeleton className="h-32 rounded-[2rem] bg-white" />
      <Skeleton className="h-80 rounded-[2rem] bg-white" />
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
    <div className="space-y-1">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
        {eyebrow}
      </div>
      <h2 className="text-xl font-black uppercase tracking-[-0.03em] md:text-2xl">
        {title}
      </h2>
      <p className="max-w-2xl text-sm leading-7 text-slate-500">{description}</p>
    </div>
  );
}

function FeatureHero({
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
    <Card className="overflow-hidden rounded-[2rem] border-0 bg-slate-950 text-white shadow-[0_22px_60px_rgba(15,23,42,0.22)]">
      <CardContent className="relative p-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{
            backgroundImage: tenant.featured_image_url || tenant.banner_url
              ? `url(${tenant.featured_image_url || tenant.banner_url})`
              : "linear-gradient(135deg, rgba(13,31,39,0.94), rgba(29,78,216,0.65))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/78 via-black/50 to-blue-400/18" />
        <div className="relative z-10 flex min-h-[280px] flex-col justify-between p-4 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <Badge className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
              {tenant.promo_label || "Highlighted"}
            </Badge>
            <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold text-white/90">
              {formatStartingPrice(tenant.starting_price)}
            </Badge>
          </div>

          <div className="space-y-3">
            <h3 className="max-w-2xl text-2xl font-black uppercase leading-[0.95] tracking-[-0.04em] md:text-4xl">
              {tenant.name}
            </h3>
            <p className="max-w-2xl text-sm leading-7 text-white/85">
              {tenant.discovery_headline || tenant.tagline || tenant.about_us}
            </p>
            <div className="flex flex-wrap gap-2">
              {(tenant.discovery_badges || tenant.discovery_tags || []).slice(0, 3).map((item) => (
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
            <div className="text-sm text-white/72">
              {tenant.recommendation_reason ||
                tenant.highlight_copy ||
                tenant.availability_hint ||
                "Lihat mengapa tempat ini cocok buat dicoba sekarang."}
            </div>
            <Button asChild className="h-11 rounded-2xl bg-white text-slate-950 hover:bg-white/90">
              <a
                href={getTenantUrl(tenant.slug)}
                onClick={() =>
                  trackDiscoveryEvent({
                    tenant_id: tenant.id,
                    tenant_slug: tenant.slug,
                    event_type: "click",
                    surface: "customer-hub",
                    section_id: "home-hero",
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

function ContentCard({
  tenant,
  sectionId,
  index,
  onVisible,
}: {
  tenant: DiscoveryTenant;
  sectionId: string;
  index: number;
  onVisible: () => void;
}) {
  useEffect(() => {
    onVisible();
  }, [onVisible]);

  return (
    <Card className="group overflow-hidden rounded-[1.7rem] border border-blue-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <CardContent className="p-0">
        <div
          className="h-32 w-full bg-cover bg-center"
          style={{
            backgroundImage: tenant.featured_image_url || tenant.banner_url
              ? `url(${tenant.featured_image_url || tenant.banner_url})`
              : "linear-gradient(135deg, rgba(13,31,39,0.92), rgba(96,165,250,0.72))",
          }}
        />
        <div className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <Badge className="rounded-full bg-blue-50 text-blue-700">
              {tenant.promo_label || "Discovery"}
            </Badge>
            <span className="text-[11px] font-semibold text-slate-500">
              {formatStartingPrice(tenant.starting_price)}
            </span>
          </div>

          <div>
            <h3 className="line-clamp-2 text-lg font-black uppercase tracking-tight">
              {tenant.name}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
              {tenant.recommendation_reason ||
                tenant.discovery_headline ||
                tenant.tagline ||
                tenant.about_us}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(tenant.discovery_badges || tenant.discovery_tags || []).slice(0, 2).map((item) => (
              <span
                key={item}
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600"
              >
                {item}
              </span>
            ))}
          </div>

          <Button
            asChild
            className="h-11 w-full rounded-2xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500"
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
                  card_variant: "content",
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

function QuickStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-lg font-black text-slate-950">{value}</div>
    </div>
  );
}
