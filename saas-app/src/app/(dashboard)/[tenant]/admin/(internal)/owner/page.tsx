"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  Clock3,
  LayoutDashboard,
  Monitor,
  Sparkles,
  Users,
  Wallet,
  Wifi,
  TrendingUp,
} from "lucide-react";

type ResourceRow = {
  id: string;
  name: string;
  status?: string;
};

type SessionRow = {
  id: string;
  resource_name?: string;
  customer_name?: string;
  start_time?: string;
  end_time?: string;
  grand_total?: number;
  total_resource?: number;
  total_fnb?: number;
  created_at?: string;
};

type OrderRow = {
  id: string;
  order_id?: string;
  plan?: string;
  billing_interval?: string;
  amount?: number;
  status?: string;
  created_at?: string;
};

type SubscriptionRow = {
  plan?: string;
  status?: string;
  current_period_end?: string;
};

type BookingRevenueRow = {
  id: string;
  start_time?: string;
  created_at?: string;
  total_resource?: number;
  total_fnb?: number;
  grand_total?: number;
};

export default function OwnerCommandCenterPage() {
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [bookings, setBookings] = useState<BookingRevenueRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [customersCount, setCustomersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<string>("");

  const fetchOwnerData = useCallback(async () => {
    try {
      const [resourcesRes, sessionsRes, bookingsRes, ordersRes, subscriptionRes, customersRes] =
        await Promise.all([
          api.get("/resources-all"),
          api.get("/bookings/pos/active"),
          api.get("/bookings"),
          api.get("/billing/orders?limit=6"),
          api.get("/billing/subscription"),
          api.get("/customers"),
        ]);

      setResources(resourcesRes.data?.resources || []);
      setSessions(sessionsRes.data || []);
      setBookings(bookingsResFromApi(bookingsRes.data));
      setOrders(ordersRes.data?.orders || []);
      setSubscription(subscriptionRes.data || null);
      setCustomersCount((customersRes.data || []).length);
      setLastSyncAt(new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }));
    } catch {
      toast.error("Gagal memuat owner command center");
    } finally {
      setLoading(false);
    }
  }, []);

  function bookingsResFromApi(payload: unknown): BookingRevenueRow[] {
    if (Array.isArray(payload)) {
      return payload as BookingRevenueRow[];
    }
    if (payload && typeof payload === "object" && "items" in payload) {
      const items = (payload as { items?: BookingRevenueRow[] }).items;
      return items || [];
    }
    return [];
  }

  useEffect(() => {
    void fetchOwnerData();

    const interval = window.setInterval(() => {
      void fetchOwnerData();
    }, 30000);

    const onFocus = () => {
      void fetchOwnerData();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [fetchOwnerData]);

  const metrics = useMemo(() => {
    const totalResources = resources.length;
    const activeSessions = sessions.length;
    const occupiedPercent =
      totalResources > 0
        ? Math.round((activeSessions / totalResources) * 100)
        : 0;
    const availableResources = resources.filter(
      (resource) => resource.status === "available",
    ).length;
    const maintenanceResources = resources.filter(
      (resource) => resource.status === "maintenance",
    ).length;
    const today = new Date().toISOString().slice(0, 10);
    const todayRevenue = bookings.reduce((sum, booking) => {
      const sourceDate = (booking.start_time || booking.created_at || "").slice(0, 10);
      if (sourceDate !== today) return sum;
      const explicitTotal = Number(booking.grand_total || 0);
      const fallbackTotal =
        Number(booking.total_resource || 0) + Number(booking.total_fnb || 0);
      return sum + (explicitTotal > 0 ? explicitTotal : fallbackTotal);
    }, 0);

    return {
      totalResources,
      activeSessions,
      occupiedPercent,
      availableResources,
      maintenanceResources,
      todayRevenue,
      plan: subscription?.plan || "-",
      status: subscription?.status || "-",
    };
  }, [bookings, resources, sessions, subscription]);

  const revenueSeries = useMemo(() => {
    const dayMap = new Map<string, number>();
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dayMap.set(d.toISOString().slice(0, 10), 0);
    }

    bookings.forEach((booking) => {
      const key = (booking.start_time || booking.created_at || "").slice(0, 10);
      if (!dayMap.has(key)) return;
      dayMap.set(
        key,
        (dayMap.get(key) || 0) +
          (Number(booking.grand_total || 0) > 0
            ? Number(booking.grand_total || 0)
            : Number(booking.total_resource || 0) + Number(booking.total_fnb || 0)),
      );
    });

    return Array.from(dayMap.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  }, [bookings]);

  const formatIDR = (val?: number) =>
    new Intl.NumberFormat("id-ID").format(val || 0);

  return (
    <div className="space-y-4 md:space-y-6 pb-20 px-3 md:px-0">
      <Card className="rounded-[1.75rem] md:rounded-[2rem] border-none bg-slate-950 p-4 md:p-6 text-white shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Badge className="border-none bg-white/10 text-white text-[7px] md:text-[9px] font-black uppercase tracking-widest">
              Mobile First Monitoring
            </Badge>
            <h2 className="text-2xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
              Business <span className="text-blue-400">Command.</span>
            </h2>
            <p className="max-w-xl text-[12px] md:text-sm text-slate-300">
              Ringkasan live untuk owner: occupancy, booking aktif, database
              customer, dan status paket SaaS. Cocok dibuka dari HP saat tidak
              sedang di PC.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-3">
            <Button asChild className="h-10 md:h-auto rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-black uppercase italic tracking-[0.15em] text-[8px] md:text-[10px]">
              <Link href="/admin/bookings">
                <CalendarClock className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
                Bookings
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-10 md:h-auto rounded-2xl border-white/15 bg-white/5 text-white hover:bg-white/10 font-black uppercase italic tracking-[0.15em] text-[8px] md:text-[10px]">
              <Link href="/admin/pos">
                <Monitor className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
                POS
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Occupancy",
            value: `${metrics.occupiedPercent}%`,
            hint: `${metrics.activeSessions}/${metrics.totalResources} occupied`,
            icon: Wifi,
            tone: "bg-blue-600 text-white",
          },
          {
            label: "Active Sessions",
            value: metrics.activeSessions.toString(),
            hint: "Live now",
            icon: Clock3,
            tone: "bg-slate-950 text-white",
          },
          {
            label: "Customers",
            value: customersCount.toString(),
            hint: "Database terkini",
            icon: Users,
            tone: "bg-white text-slate-950 dark:bg-white dark:text-slate-950",
          },
          {
            label: "Subscription",
            value: metrics.plan.toUpperCase(),
            hint: `${metrics.status} plan`,
            icon: Wallet,
            tone: "bg-emerald-500 text-white",
          },
          {
            label: "Today Revenue",
            value: `Rp ${formatIDR(metrics.todayRevenue)}`,
            hint: "Realtime based on bookings",
            icon: TrendingUp,
            tone: "bg-slate-950 text-white",
          },
        ].map((item) => (
          <Card
            key={item.label}
            className="rounded-[1.5rem] md:rounded-[1.75rem] border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-3.5 md:p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 md:gap-4">
              <div className="space-y-1.5">
                <div className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                  {item.label}
                </div>
                {loading ? (
                  <Skeleton className="h-7 w-16 md:h-10 md:w-24 rounded-xl bg-slate-100 dark:bg-white/5" />
                ) : (
                  <div className="text-xl md:text-3xl font-black italic uppercase tracking-tighter dark:text-white">
                    {item.value}
                  </div>
                )}
                <div className="text-[9px] md:text-xs font-medium text-slate-500 dark:text-slate-400">
                  {item.hint}
                </div>
              </div>
              <div className={`flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-2xl ${item.tone}`}>
                <item.icon className="h-3.5 w-3.5 md:h-5 md:w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[2rem] border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-4 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                Live Floor
              </div>
              <h3 className="mt-1 text-lg md:text-2xl font-black italic uppercase tracking-tighter dark:text-white">
                Occupancy dan status unit
              </h3>
            </div>
            <Badge className="bg-blue-600 text-white border-none text-[8px] font-black uppercase tracking-widest">
              {metrics.availableResources} ready
            </Badge>
          </div>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <>
                <Skeleton className="h-20 rounded-[1.35rem] bg-slate-100 dark:bg-white/5" />
                <Skeleton className="h-20 rounded-[1.35rem] bg-slate-100 dark:bg-white/5" />
                <Skeleton className="h-20 rounded-[1.35rem] bg-slate-100 dark:bg-white/5" />
              </>
            ) : resources.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-slate-200 dark:border-white/5 p-5 text-center text-slate-400 font-black uppercase italic tracking-widest sm:col-span-2 lg:col-span-3">
                Belum ada unit
              </div>
            ) : (
              resources.slice(0, 9).map((resource) => {
                const statusTone =
                  resource.status === "available"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-500/20"
                    : resource.status === "maintenance"
                      ? "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-500/20"
                      : "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-500/20";

                return (
                  <div
                    key={resource.id}
                    className="rounded-[1.35rem] border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] md:text-sm font-black italic uppercase tracking-tight dark:text-white truncate">
                        {resource.name}
                      </div>
                      <Badge className={`border text-[8px] font-black uppercase tracking-widest ${statusTone}`}>
                        {resource.status || "unknown"}
                      </Badge>
                    </div>
                    <div className="mt-2.5 text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400">
                      {resource.status === "available"
                        ? "Ready to book"
                        : resource.status === "maintenance"
                          ? "On hold for maintenance"
                          : "Requires attention"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-[2rem] border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-4 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                  Revenue Timeseries
                </div>
                <h3 className="mt-1 text-lg md:text-xl font-black italic uppercase tracking-tighter dark:text-white">
                  7 hari terakhir
                </h3>
              </div>
              <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
            </div>
            <div className="mt-4 flex h-36 items-end gap-2">
              {revenueSeries.map((point) => {
                const max = Math.max(...revenueSeries.map((item) => item.revenue), 1);
                const height = Math.max(12, Math.round((point.revenue / max) * 100));
                return (
                  <div key={point.date} className="flex-1 space-y-2">
                    <div className="flex h-32 items-end">
                      <div
                        className="w-full rounded-t-[1rem] bg-gradient-to-t from-blue-600 to-cyan-400"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {new Date(`${point.date}T00:00:00`).toLocaleDateString("id-ID", {
                          weekday: "short",
                        })}
                      </div>
                      <div className="text-[8px] font-black text-slate-900 dark:text-white">
                        Rp{formatIDR(point.revenue)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400">
              Sync terakhir: {lastSyncAt || "memuat..."}
            </div>
          </Card>

          <Card className="rounded-[2rem] border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-4 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                  Real-time Report
                </div>
                <h3 className="mt-1 text-lg md:text-xl font-black italic uppercase tracking-tighter dark:text-white">
                  Quick insights
                </h3>
              </div>
              <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-[1.25rem] bg-slate-50 dark:bg-white/5 px-3 py-2.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Occupied
                </span>
                <span className="text-[11px] md:text-sm font-black uppercase tracking-tight dark:text-white">
                  {metrics.activeSessions} / {metrics.totalResources}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-[1.25rem] bg-slate-50 dark:bg-white/5 px-3 py-2.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Maintenance
                </span>
                <span className="text-[11px] md:text-sm font-black uppercase tracking-tight dark:text-white">
                  {metrics.maintenanceResources}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-[1.25rem] bg-slate-50 dark:bg-white/5 px-3 py-2.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Occupancy
                </span>
                <span className="text-[11px] md:text-sm font-black uppercase tracking-tight dark:text-white">
                  {metrics.occupiedPercent}%
                </span>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-4 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                  Latest Orders
                </div>
                <h3 className="mt-1 text-lg md:text-xl font-black italic uppercase tracking-tighter dark:text-white">
                  Billing activity
                </h3>
              </div>
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-emerald-500" />
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <>
                  <Skeleton className="h-14 rounded-[1.25rem] bg-slate-100 dark:bg-white/5" />
                  <Skeleton className="h-14 rounded-[1.25rem] bg-slate-100 dark:bg-white/5" />
                  <Skeleton className="h-14 rounded-[1.25rem] bg-slate-100 dark:bg-white/5" />
                </>
              ) : orders.length === 0 ? (
                <div className="rounded-[1.35rem] border border-dashed border-slate-200 dark:border-white/5 p-5 text-center text-slate-400 font-black uppercase italic tracking-widest">
                  Belum ada order
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-[1.25rem] border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] md:text-sm font-black italic uppercase tracking-tight dark:text-white truncate">
                          {order.plan || "billing"}
                        </div>
                        <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400 truncate">
                          {order.order_id || order.id}
                        </div>
                      </div>
                      <Badge className="bg-slate-950 text-white border-none text-[8px] font-black uppercase tracking-widest">
                        {order.status || "unknown"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">
                      <span>
                        {order.billing_interval || "-"} •{" "}
                        {order.created_at || "-"}
                      </span>
                      <span>Rp {formatIDR(order.amount)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            <Button asChild className="h-11 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase italic tracking-[0.16em] text-[8px] md:text-[9px]">
              <Link href="/admin/settings">
                Settings
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white text-slate-950 hover:bg-slate-50 font-black uppercase italic tracking-[0.16em] text-[8px] md:text-[9px] dark:border-white/10 dark:bg-white/5 dark:text-white">
              <Link href="/admin/settings/analytics">
                Laporan
                <LayoutDashboard className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
