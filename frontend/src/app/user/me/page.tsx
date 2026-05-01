"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Calendar,
  ChevronRight,
  Compass,
  Clock,
  LogOut,
  MapPin,
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
  type DiscoveryFeedResponse,
  type DiscoveryTenant,
  formatStartingPrice,
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
  tenant_id?: string;
  tenant_name?: string;
  tenant_slug?: string;
  resource?: string;
  date?: string;
  end_date?: string;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  grand_total?: number;
  deposit_amount?: number;
  paid_amount?: number;
  balance_due?: number;
  total_spent?: number;
};

type TenantCard = {
  id: string;
  name: string;
  slug: string;
  business_category?: string;
  business_type?: string;
  tagline?: string;
  slogan?: string;
  primary_color?: string;
  logo_url?: string;
};
const bookingNeedsPayment = (booking: BookingItem) => {
  const status = String(booking.status || "").toLowerCase();
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  return (
    status === "completed" &&
    (Number(booking.balance_due || 0) > 0 ||
      ["pending", "partial_paid", "unpaid", "failed", "expired"].includes(paymentStatus))
  );
};

export default function UserDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<CustomerDashboard | null>(null);
  const [tenants, setTenants] = useState<TenantCard[]>([]);
  const [discoverFeed, setDiscoverFeed] = useState<DiscoveryFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [seenDiscoveryImpressions, setSeenDiscoveryImpressions] = useState<Record<string, true>>({});

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [profileRes, tenantsRes, discoverRes] = await Promise.all([
          api.get("/user/me"),
          api.get("/public/tenants").catch(() => ({ data: { items: [] } })),
          api.get("/public/discover/feed").catch(() => ({ data: null })),
        ]);

        if (active) {
          setData(profileRes.data);
          setTenants(tenantsRes.data?.items || []);
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

    load();
    return () => {
      active = false;
    };
  }, [router]);

  const activeBookings = useMemo(() => data?.active_bookings || [], [data?.active_bookings]);
  const pastHistory = useMemo(() => data?.past_history || [], [data?.past_history]);
  const pointActivity = useMemo(() => data?.point_activity || [], [data?.point_activity]);
  const currentList = activeTab === "active" ? activeBookings : pastHistory;

  const recentlyBookedTenantSlugs = useMemo(() => {
    const allBookings = [...activeBookings, ...pastHistory];
    const slugs = new Set<string>();
    allBookings.forEach((b) => {
      if (b.tenant_slug) slugs.add(b.tenant_slug);
    });
    return Array.from(slugs).slice(0, 3);
  }, [activeBookings, pastHistory]);

  const recentTenants = useMemo(() => {
    if (recentlyBookedTenantSlugs.length === 0) {
      return tenants.slice(0, 3);
    }
    return tenants
      .filter((t) => recentlyBookedTenantSlugs.includes(t.slug))
      .slice(0, 3);
  }, [recentlyBookedTenantSlugs, tenants]);

  const discoverCandidates = useMemo(() => {
    const allItems = [
      ...(discoverFeed?.featured || []),
      ...((discoverFeed?.sections || []).flatMap((section) => section.items)),
    ];
    const unique = new Map<string, DiscoveryTenant>();
    allItems.forEach((item) => unique.set(item.id, item));
    return Array.from(unique.values());
  }, [discoverFeed]);

  const personalizedDiscoveries = useMemo(() => {
    const query = discoverQuery.trim().toLowerCase();
    const bookedSlugs = new Set(
      [...activeBookings, ...pastHistory]
        .map((booking) => booking.tenant_slug)
        .filter(Boolean),
    );

    return discoverCandidates
      .filter((item) => {
        const matchesQuery =
          query.length === 0 ||
          [
            item.name,
            item.discovery_headline,
            item.business_category,
            item.business_type,
            ...(item.discovery_tags || []),
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));

        return matchesQuery;
      })
      .sort((left, right) => {
        const leftScore =
          (left.is_featured ? 4 : 0) +
          (left.is_new ? 2 : 0) +
          (bookedSlugs.has(left.slug) ? 1 : 0);
        const rightScore =
          (right.is_featured ? 4 : 0) +
          (right.is_new ? 2 : 0) +
          (bookedSlugs.has(right.slug) ? 1 : 0);
        return rightScore - leftScore;
      })
      .slice(0, 6);
  }, [activeBookings, pastHistory, discoverCandidates, discoverQuery]);

  const handleLogout = () => {
    clearTenantSession({ keepTenantSlug: true });
    router.push("/user/login");
  };

  const markDiscoveryImpression = (tenant: DiscoveryTenant, positionIndex: number) => {
    const key = discoveryImpressionKey(["customer-hub", "recommended", tenant.id]);
    if (seenDiscoveryImpressions[key]) return;
    setSeenDiscoveryImpressions((prev) => ({ ...prev, [key]: true }));
    trackDiscoveryEvent({
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      event_type: "impression",
      surface: "customer-hub",
      section_id: "recommended",
      card_variant: "personalized",
      position_index: positionIndex,
      promo_label: tenant.promo_label,
    });
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const customerTier = data?.customer?.tier || "NEW";
  const tierColor =
    customerTier === "VIP"
      ? "from-amber-400 to-orange-500"
      : customerTier === "GOLD"
        ? "from-yellow-300 to-yellow-500"
        : "from-blue-400 to-indigo-500";

  return (
    <div className="min-h-screen bg-slate-50 pb-24 dark:bg-[#050505]">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight dark:text-white">
              <Sparkles className="h-5 w-5 text-blue-500" />
              Bookinaja
            </h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Global Customer Portal
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="icon" className="rounded-xl border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <Link href="/user/me/settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
            <Button onClick={handleLogout} variant="destructive" size="icon" className="rounded-xl">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${tierColor} p-[2px]`}>
                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-950">
                  <User className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <Badge variant="secondary" className={`mb-2 border-0 bg-gradient-to-r ${tierColor} px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white`}>
                  {customerTier} MEMBER
                </Badge>
                <h2 className="truncate text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
                  {data?.customer?.name || "Customer"}
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  <span className="font-mono">{data?.customer?.phone}</span>
                  {data?.customer?.email ? (
                    <>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span>{data.customer.email}</span>
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 md:w-auto md:min-w-48 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Bookinaja Points
              </p>
              <div className="flex items-center gap-2 text-2xl font-black text-slate-950 dark:text-white">
                <Wallet className="h-6 w-6 text-emerald-400" />
                {(data?.points || 0).toLocaleString("id-ID")}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-slate-950 dark:text-white">
                Aktivitas Points
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Points kamu berlaku lintas tenant Bookinaja.
              </p>
            </div>
            <Badge variant="secondary" className="rounded-lg">
              1 poin / Rp10.000
            </Badge>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {pointActivity.slice(0, 4).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                    {event.tenant_name || event.description || "Bookinaja"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(event.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="font-black text-blue-600">+{event.points.toLocaleString("id-ID")}</span>
              </div>
            ))}
            {pointActivity.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                Points akan muncul setelah pembayaran booking lunas.
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-slate-950 dark:text-white">
                {recentlyBookedTenantSlugs.length > 0 ? "Tenant Terakhir Dikunjungi" : "Rekomendasi Tenant"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {recentlyBookedTenantSlugs.length > 0
                  ? "Akses cepat ke tenant yang sering kamu kunjungi."
                  : "Temukan semua tenant Bookinaja dan langsung masuk ke halaman booking mereka."}
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/tenants">
                Semua Tenant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {recentTenants.map((tenant) => (
              <a
                key={tenant.id}
                href={getTenantUrl(tenant.slug)}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-blue-400/30 dark:hover:bg-blue-400/10"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"
                  style={tenant.primary_color ? { backgroundColor: tenant.primary_color } : undefined}
                >
                  {tenant.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tenant.logo_url} alt="" className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black text-slate-950 dark:text-white">
                    {tenant.name}
                  </div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {tenant.business_category || tenant.business_type || tenant.slug}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </a>
            ))}
          </div>

          {recentTenants.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
              Belum ada tenant yang tersedia.
            </div>
          ) : null}
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#143f4b_55%,#d8bf97_100%)] p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] dark:border-white/10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.26em] text-white/85">
                <Compass className="h-3.5 w-3.5" />
                Discovery Hub
              </div>
              <h2 className="mt-4 text-3xl font-black uppercase tracking-[-0.04em] md:text-4xl">
                Portal customer sekarang bukan cuma buat cek booking.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/76 md:text-base">
                Cari tempat baru, lihat bisnis yang baru bergabung, dan temukan sesuatu yang menarik untuk dilakukan berikutnya langsung dari satu portal.
              </p>
            </div>

            <Button
              asChild
              className="h-12 rounded-2xl bg-white px-5 text-sm font-semibold text-slate-950 hover:bg-white/90"
            >
              <Link href="/tenants">
                Jelajahi Semua Bisnis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                value={discoverQuery}
                onChange={(e) => setDiscoverQuery(e.target.value)}
                placeholder={
                  discoverFeed?.hero?.search_hint ||
                  "Cari tempat, kategori, atau ide aktivitas berikutnya"
                }
                className="h-14 rounded-2xl border-white/15 bg-white/92 pl-12 text-sm font-medium text-slate-950 shadow-none placeholder:text-slate-500"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(discoverFeed?.quick_categories || []).slice(0, 5).map((category) => (
                <Button
                  key={category}
                  variant="outline"
                  onClick={() => setDiscoverQuery(category)}
                  className="h-14 rounded-2xl border-white/15 bg-white/10 px-4 text-[11px] font-black uppercase tracking-[0.16em] text-white hover:bg-white/15"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-slate-950 dark:text-white">
                Rekomendasi Untuk Kamu
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Discovery layer untuk membantu customer menemukan bisnis baru, bukan hanya kembali ke booking lama.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/tenants">
                Buka Marketplace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {personalizedDiscoveries.map((tenant, index) => (
              <CustomerDiscoveryCard
                key={tenant.id}
                tenant={tenant}
                index={index}
                onVisible={() => markDiscoveryImpression(tenant, index)}
              />
            ))}

            {personalizedDiscoveries.length === 0 ? (
              <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/10 dark:bg-white/[0.04]">
                <Compass className="mx-auto h-8 w-8 text-slate-300" />
                <h3 className="mt-4 text-lg font-black uppercase tracking-tight text-slate-950 dark:text-white">
                  Belum ada rekomendasi yang cocok
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  Coba kata kunci lain atau buka marketplace discovery untuk melihat bisnis yang sedang ramai dan baru bergabung.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
          {(["active", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative whitespace-nowrap rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all",
                activeTab === tab
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-500 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10",
              )}
            >
              {tab === "active" ? "Aktif & Tagihan" : "Riwayat"}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {currentList.map((booking) => (
            <Card
              key={booking.id}
              className="group overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition-colors hover:border-blue-200 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{booking.tenant_name || "Tenant"}</span>
                      </div>
                      <h3 className="mt-2 truncate text-lg font-black uppercase tracking-tight dark:text-white">
                        {booking.resource || "Booking"}
                      </h3>
                    </div>
                    <Badge
                      className={cn(
                        "rounded-lg border-none px-2.5 py-1 text-[9px] font-black uppercase shadow-sm",
                        bookingNeedsPayment(booking)
                          ? "bg-amber-500 text-white"
                          : booking.status === "active" || booking.status === "ongoing"
                            ? "bg-emerald-500 text-white"
                            : booking.status === "pending" || booking.status === "confirmed"
                            ? "bg-amber-500 text-white"
                            : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300",
                      )}
                    >
                      {bookingNeedsPayment(booking) ? "perlu pelunasan" : booking.status || "pending"}
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 rounded-xl bg-slate-50 p-3 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:bg-black/20 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      {booking.date
                        ? new Date(booking.date).toLocaleDateString("id-ID", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })
                        : "-"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-violet-500" />
                      {booking.date
                        ? new Date(booking.date).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 bg-white p-4 transition-colors group-hover:bg-blue-50 dark:border-white/5 dark:bg-white/5 dark:group-hover:bg-blue-900/10">
                  <div>
                    <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Total Biaya
                    </p>
                    <p className="text-sm font-bold dark:text-white">
                      Rp {(booking.total_spent || booking.grand_total || 0).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <Button asChild size="sm" className="rounded-xl bg-slate-900 text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900">
                    <Link href={`/user/me/bookings/${booking.id}`}>
                      {bookingNeedsPayment(booking) ? "Bayar" : "Detail"}
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {currentList.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-white/10 dark:bg-white/[0.04]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
                <Ticket className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="mt-5 text-lg font-black uppercase tracking-tight dark:text-white">
                Belum ada reservasi
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                {activeTab === "active"
                  ? "Kamu belum memiliki reservasi aktif atau mendatang."
                  : "Riwayat reservasi kamu masih kosong."}
              </p>
              <Button asChild className="mt-6 rounded-xl bg-blue-600 shadow-sm hover:bg-blue-500">
                <Link href="/tenants">Cari Tenant Sekarang</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40 rounded-lg bg-white dark:bg-white/5" />
        <Skeleton className="h-10 w-24 rounded-xl bg-white dark:bg-white/5" />
      </div>
      <Skeleton className="h-32 rounded-2xl bg-white dark:bg-white/5" />
      <Skeleton className="h-56 rounded-2xl bg-white dark:bg-white/5" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-44 rounded-2xl bg-white dark:bg-white/5" />
        <Skeleton className="h-44 rounded-2xl bg-white dark:bg-white/5" />
      </div>
    </div>
  );
}

function CustomerDiscoveryCard({
  tenant,
  index,
  onVisible,
}: {
  tenant: DiscoveryTenant;
  index: number;
  onVisible: () => void;
}) {
  useEffect(() => {
    onVisible();
  }, [onVisible]);

  return (
    <Card className="group overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 dark:border-white/10 dark:bg-white/[0.04]">
      <CardContent className="p-0">
        <div
          className="h-36 w-full bg-cover bg-center"
          style={{
            backgroundImage: tenant.featured_image_url || tenant.banner_url
              ? `url(${tenant.featured_image_url || tenant.banner_url})`
              : "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(37,99,235,0.65))",
          }}
        />
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white"
              style={tenant.primary_color ? { backgroundColor: tenant.primary_color } : undefined}
            >
              {tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logo_url} alt="" className="h-full w-full rounded-2xl object-cover" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </div>
            {tenant.promo_label ? (
              <Badge className="rounded-full border-none bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                {tenant.promo_label}
              </Badge>
            ) : null}
          </div>

          <h3 className="mt-4 line-clamp-2 text-xl font-black uppercase tracking-[-0.03em] text-slate-950 dark:text-white">
            {tenant.name}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {tenant.discovery_headline || tenant.tagline || tenant.about_us}
          </p>
          <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-400 dark:text-slate-500">
            {tenant.highlight_copy || tenant.featured_reason || tenant.discovery_subheadline}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(tenant.discovery_badges || tenant.discovery_tags || [])
              .slice(0, 3)
              .map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300"
                >
                  {item}
                </span>
              ))}
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs font-medium text-slate-500 dark:bg-black/20 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span>Mulai</span>
              <span className="font-semibold text-slate-950 dark:text-white">
                {formatStartingPrice(tenant.starting_price)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span>Hint</span>
              <span className="text-right font-semibold text-slate-950 dark:text-white">
                {tenant.availability_hint || `${tenant.resource_count || 0} resource`}
              </span>
            </div>
          </div>

          <Button
            asChild
            className="mt-4 h-11 w-full rounded-2xl bg-slate-900 text-sm font-semibold text-white hover:bg-blue-600 dark:bg-white dark:text-slate-900 dark:hover:bg-blue-500 dark:hover:text-white"
          >
            <a
              href={getTenantUrl(tenant.slug)}
              onClick={() =>
                trackDiscoveryEvent({
                  tenant_id: tenant.id,
                  tenant_slug: tenant.slug,
                  event_type: "click",
                  surface: "customer-hub",
                  section_id: "recommended",
                  card_variant: "personalized",
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
