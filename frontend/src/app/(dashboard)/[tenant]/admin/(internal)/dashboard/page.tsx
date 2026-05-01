"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Activity,
  ArrowRight,
  Banknote,
  CalendarClock,
  Clock3,
  Monitor,
  PanelsTopLeft,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/admin-access";
import { toast } from "sonner";

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
  status?: string;
};

type BookingRow = {
  id: string;
  customer_name?: string;
  resource_name?: string;
  start_time?: string;
  created_at?: string;
  status?: string;
  grand_total?: number;
  total_resource?: number;
  total_fnb?: number;
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

type AppUser = {
  role?: string;
  name?: string;
  permission_keys?: string[];
};

const normalizeBookings = (payload: unknown): BookingRow[] => {
  if (Array.isArray(payload)) return payload as BookingRow[];
  if (payload && typeof payload === "object" && "items" in payload) {
    const items = (payload as { items?: BookingRow[] }).items;
    return items || [];
  }
  return [];
};

const WEEKDAY_SHORT = new Intl.DateTimeFormat("id-ID", { weekday: "short" });

const formatIDR = (value?: number) =>
  new Intl.NumberFormat("id-ID").format(Number(value || 0));

const parseSafeDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const getBookingTotal = (booking: BookingRow) => {
  const explicitTotal = Number(booking.grand_total || 0);
  if (explicitTotal > 0) return explicitTotal;
  return Number(booking.total_resource || 0) + Number(booking.total_fnb || 0);
};

const isSameDay = (date: string | undefined, target: Date) => {
  const parsed = parseSafeDate(date);
  if (!parsed) return false;
  return format(parsed, "yyyy-MM-dd") === format(target, "yyyy-MM-dd");
};

export default function DashboardPage() {
  const [role, setRole] = useState<string>("staff");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(
    null,
  );
  const [customersCount, setCustomersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<string>("");

  const ownerOnly = role === "owner";
  const canReadBookings =
    ownerOnly || hasPermission({ role, permission_keys: permissions }, "bookings.read");
  const canManageResources =
    ownerOnly ||
    hasPermission(
      { role, permission_keys: permissions },
      ["resources.read", "resources.manage"],
    );
  const canReadCustomers =
    ownerOnly || hasPermission({ role, permission_keys: permissions }, "customers.read");
  const canManageExpenses =
    ownerOnly ||
    hasPermission(
      { role, permission_keys: permissions },
      ["expenses.read", "expenses.manage"],
    );
  const canManagePos =
    ownerOnly || hasPermission({ role, permission_keys: permissions }, "pos.manage");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const meRes = await api.get<{ user?: AppUser }>("/auth/me");
      const currentRole = String(
        meRes.data?.user?.role || "staff",
      ).toLowerCase();
      const currentPermissions = meRes.data?.user?.permission_keys || [];
      setRole(currentRole);
      setPermissions(currentPermissions);

      const scope = { role: currentRole, permission_keys: currentPermissions };
      const allowBookings = hasPermission(scope, "bookings.read");
      const allowResources = hasPermission(scope, [
        "resources.read",
        "resources.manage",
      ]);
      const allowCustomers = hasPermission(scope, "customers.read");

      const [resourcesRes, sessionsRes, bookingsRes, customersRes] =
        await Promise.allSettled([
          allowResources ? api.get("/resources-all") : Promise.resolve(null),
          allowBookings ? api.get("/bookings/pos/active") : Promise.resolve(null),
          allowBookings ? api.get("/bookings") : Promise.resolve(null),
          allowCustomers ? api.get("/customers") : Promise.resolve(null),
        ]);

      setResources(
        resourcesRes.status === "fulfilled"
          ? resourcesRes.value?.data?.resources || []
          : [],
      );
      setSessions(
        sessionsRes.status === "fulfilled" ? sessionsRes.value?.data || [] : [],
      );
      setBookings(
        bookingsRes.status === "fulfilled"
          ? normalizeBookings(bookingsRes.value?.data)
          : [],
      );
      setCustomersCount(
        customersRes.status === "fulfilled"
          ? (customersRes.value?.data || []).length
          : 0,
      );

      if (currentRole === "owner") {
        const [ordersRes, subscriptionRes] = await Promise.all([
          api.get("/billing/orders?limit=6"),
          api.get("/billing/subscription"),
        ]);
        setOrders(ordersRes.data?.orders || []);
        setSubscription(subscriptionRes.data || null);
      } else {
        setOrders([]);
        setSubscription(null);
      }

      setLastSyncAt(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch {
      toast.error("Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();

    const interval = window.setInterval(() => {
      void fetchDashboard();
    }, 45000);

    const onFocus = () => {
      void fetchDashboard();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [fetchDashboard]);

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
    const today = new Date();
    const todayBookings = bookings.filter((booking) =>
      isSameDay(booking.start_time || booking.created_at, today),
    ).length;

    const todayRevenue = bookings
      .filter((booking) =>
        isSameDay(booking.start_time || booking.created_at, today),
      )
      .reduce((sum, booking) => sum + getBookingTotal(booking), 0);

    return {
      totalResources,
      activeSessions,
      occupiedPercent,
      availableResources,
      maintenanceResources,
      todayBookings,
      todayRevenue,
      plan: subscription?.plan || "-",
      status: subscription?.status || "-",
    };
  }, [bookings, resources, sessions, subscription]);

  const weeklyRevenue = useMemo(() => {
    const now = new Date();
    const points = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      const key = format(date, "yyyy-MM-dd");
      const revenue = bookings.reduce((sum, booking) => {
        const rawDate = booking.start_time || booking.created_at;
        const bookingDate = parseSafeDate(rawDate);
        if (!bookingDate) return sum;
        const bookingKey = format(bookingDate, "yyyy-MM-dd");
        if (bookingKey !== key) return sum;
        return sum + getBookingTotal(booking);
      }, 0);

      return {
        key,
        label: WEEKDAY_SHORT.format(date),
        revenue,
      };
    });

    const maxRevenue = Math.max(...points.map((item) => item.revenue), 1);
    return points.map((item) => ({
      ...item,
      height: Math.max(
        (item.revenue / maxRevenue) * 100,
        item.revenue > 0 ? 12 : 4,
      ),
    }));
  }, [bookings]);

  const topBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => {
        const aTime =
          parseSafeDate(a.start_time || a.created_at)?.getTime() || 0;
        const bTime =
          parseSafeDate(b.start_time || b.created_at)?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [bookings]);

  const resourceStats = useMemo(() => {
    const todayKey = format(new Date(), "yyyy-MM-dd");
    const resourceMap = new Map<
      string,
      {
        id: string;
        name: string;
        bookingsToday: number;
        revenueToday: number;
        lastBookingAt: string | null;
        status?: string;
      }
    >();

    resources.forEach((resource) => {
      resourceMap.set(resource.name, {
        id: resource.id,
        name: resource.name,
        bookingsToday: 0,
        revenueToday: 0,
        lastBookingAt: null,
        status: resource.status,
      });
    });

    bookings.forEach((booking) => {
      const bookingDate = parseSafeDate(
        booking.start_time || booking.created_at,
      );
      if (!bookingDate || format(bookingDate, "yyyy-MM-dd") !== todayKey)
        return;

      const key = booking.resource_name || "Unknown";
      const current = resourceMap.get(key) || {
        id: key,
        name: key,
        bookingsToday: 0,
        revenueToday: 0,
        lastBookingAt: null,
      };

      current.bookingsToday += 1;
      current.revenueToday += getBookingTotal(booking);
      const existingLast = current.lastBookingAt
        ? new Date(current.lastBookingAt).getTime()
        : 0;
      if (!current.lastBookingAt || bookingDate.getTime() > existingLast) {
        current.lastBookingAt = bookingDate.toISOString();
      }

      resourceMap.set(key, current);
    });

    return Array.from(resourceMap.values()).sort((a, b) => {
      if (b.revenueToday !== a.revenueToday)
        return b.revenueToday - a.revenueToday;
      return b.bookingsToday - a.bookingsToday;
    });
  }, [bookings, resources]);

  const topResourceToday = resourceStats[0] || null;
  const quickActions = ownerOnly
    ? [
        {
          href: "/admin/bookings",
          label: "Bookings",
          icon: CalendarClock,
        },
        {
          href: "/admin/resources",
          label: "Resources",
          icon: Monitor,
        },
        {
          href: "/admin/settings/analytics",
          label: "Analytics",
          icon: PanelsTopLeft,
        },
      ]
    : [
        canReadBookings
          ? {
              href: "/admin/bookings",
              label: "Bookings",
              icon: CalendarClock,
            }
          : null,
        canManageExpenses
          ? {
              href: "/admin/expenses",
              label: "Expenses",
              icon: Banknote,
            }
          : null,
        canManagePos
          ? {
              href: "/admin/pos",
              label: "Quick POS",
              icon: Sparkles,
            }
          : null,
      ].filter(Boolean) as {
        href: string;
        label: string;
        icon: LucideIcon;
      }[];

  const cardSpecs = useMemo(() => {
    const base = [
      canReadBookings
        ? {
            label: "Today Bookings",
            value: metrics.todayBookings.toString(),
            hint: "Booking masuk hari ini",
            icon: CalendarClock,
            tone: "bg-emerald-500 text-white",
          }
        : null,
      canReadBookings
        ? {
            label: "Active Sessions",
            value: metrics.activeSessions.toString(),
            hint: "Live now",
            icon: Clock3,
            tone: "bg-blue-600 text-white",
          }
        : null,
      canReadCustomers
        ? {
            label: "Customers",
            value: customersCount.toString(),
            hint: "Database terkini",
            icon: Users,
            tone: "bg-white text-slate-950 dark:bg-slate-900 dark:text-white",
          }
        : null,
      canManageResources
        ? {
            label: "Resource Pool",
            value: String(metrics.totalResources),
            hint: "Total resource terdaftar",
            icon: Monitor,
            tone: "bg-slate-50 text-slate-950 dark:bg-slate-800 dark:text-white",
          }
        : null,
    ].filter(Boolean) as {
      label: string;
      value: string;
      hint: string;
      icon: LucideIcon;
      tone: string;
    }[];

    if (ownerOnly) {
      base.unshift({
        label: "Today Revenue",
        value: `Rp ${formatIDR(metrics.todayRevenue)}`,
        hint: "Revenue harian",
        icon: TrendingUp,
        tone: "bg-slate-950 text-white",
      });
    }

    return base;
  }, [
    canManageResources,
    canReadBookings,
    canReadCustomers,
    customersCount,
    metrics,
    ownerOnly,
  ]);

  return (
    <div className="space-y-4 pt-5 pb-20 px-3 font-plus-jakarta  md:space-y-5 md:px-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:flex-row md:items-center md:justify-between md:rounded-2xl md:p-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="border-none bg-blue-600 text-[8px] font-semibold tracking-widest text-white">
              {ownerOnly ? "Owner View" : "Staff View"}
            </Badge>
            <Badge className="border-none bg-slate-100 text-[8px] font-semibold tracking-widest text-slate-500 dark:bg-white/5 dark:text-slate-300">
              Sync {lastSyncAt || "--:--"}
            </Badge>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-950 dark:text-white md:text-3xl">
              Dashboard Operasional
            </h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 md:text-sm">
              Ringkasan cepat untuk booking, resource, pelanggan, dan performa hari ini.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap">
          {quickActions.map((action) => (
            <Button
              key={action.href}
              asChild
              variant="outline"
              className="h-11 rounded-2xl border-slate-200 bg-slate-50 px-3 text-[8px] font-semibold tracking-[0.15em] text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 md:px-4 md:text-[10px]"
            >
              <Link href={action.href}>
                <action.icon className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {cardSpecs.map((item) => (
          <Card
            key={item.label}
            className="rounded-2xl border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-2xl md:p-5"
          >
            <div className="flex items-start justify-between gap-3 md:gap-4">
              <div className="space-y-1.5">
                <p className="text-[7px] md:text-[9px] font-semibold tracking-[0.3em] text-slate-400">
                  {item.label}
                </p>
                {loading ? (
                  <Skeleton className="h-7 w-16 rounded-xl bg-slate-100 dark:bg-white/5 md:h-10 md:w-28" />
                ) : (
                  <div className="text-xl font-semibold text-slate-950 dark:text-white md:text-3xl">
                    {item.value}
                  </div>
                )}
                <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 md:text-xs">
                  {item.hint}
                </p>
              </div>
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-2xl md:h-11 md:w-11",
                  item.tone,
                )}
              >
                <item.icon className="h-3.5 w-3.5 md:h-5 md:w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-2xl md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[8px] font-semibold tracking-[0.3em] text-slate-400">
                Resource Today
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white md:text-2xl">
                Booking dan revenue per unit
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="border-none bg-emerald-500 text-[8px] font-semibold tracking-widest text-white">
                {resourceStats.filter((item) => item.bookingsToday > 0).length}{" "}
                active
              </Badge>
              <Badge className="border-none bg-slate-100 text-[8px] font-semibold tracking-widest text-slate-500 dark:bg-white/5 dark:text-slate-300">
                {topResourceToday?.name || "No activity"}
              </Badge>
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <>
                <Skeleton className="h-24 rounded-xl bg-slate-100 dark:bg-white/5" />
                <Skeleton className="h-24 rounded-xl bg-slate-100 dark:bg-white/5" />
                <Skeleton className="h-24 rounded-xl bg-slate-100 dark:bg-white/5" />
              </>
            ) : !canManageResources ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm font-semibold text-slate-400 dark:border-white/5 sm:col-span-2 lg:col-span-3">
                Akses resource belum diberikan untuk akun ini.
              </div>
            ) : resourceStats.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center font-semibold tracking-widest text-slate-400 dark:border-white/5 sm:col-span-2 lg:col-span-3">
                Belum ada resource
              </div>
            ) : (
              resourceStats.slice(0, 9).map((resource) => (
                <div
                  key={resource.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/5 dark:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-semibold text-slate-950 dark:text-white md:text-sm">
                        {resource.name}
                      </div>
                      <div className="mt-1 text-[8px] font-semibold tracking-[0.3em] text-slate-400">
                        {resource.status || "resource"}
                      </div>
                    </div>
                    <Badge className="border-none bg-blue-600/10 text-[8px] font-semibold tracking-widest text-blue-600">
                      {resource.bookingsToday} bookings
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950/40">
                      <div className="text-[8px] font-semibold tracking-[0.3em] text-slate-400">
                        Revenue Today
                      </div>
                      <div className="mt-1 text-sm font-semibold text-blue-600">
                        {ownerOnly
                          ? `Rp ${formatIDR(resource.revenueToday)}`
                          : "Owner only"}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950/40">
                      <div className="text-[8px] font-semibold tracking-[0.3em] text-slate-400">
                        Last Booking
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {resource.lastBookingAt
                          ? format(
                              parseSafeDate(resource.lastBookingAt) ||
                                new Date(),
                              "HH:mm",
                            )
                          : "-"}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-2xl md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-semibold tracking-[0.3em] text-slate-400">
                Recent Activity
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                Booking terbaru
              </h2>
            </div>
            <Clock3 className="h-5 w-5 text-blue-600" />
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-16 rounded-xl bg-slate-100 dark:bg-white/5" />
                <Skeleton className="h-16 rounded-xl bg-slate-100 dark:bg-white/5" />
                <Skeleton className="h-16 rounded-xl bg-slate-100 dark:bg-white/5" />
              </>
            ) : !canReadBookings ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-400 dark:border-white/5">
                Akses booking belum diberikan untuk akun ini.
              </div>
            ) : topBookings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold tracking-widest text-slate-400 dark:border-white/5">
                Belum ada booking
              </div>
            ) : (
              topBookings.map((booking) => {
                const total = getBookingTotal(booking);
                return (
                  <div
                    key={booking.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/5 dark:bg-white/5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-[10px] font-semibold text-white dark:bg-white dark:text-slate-950">
                      {(booking.customer_name || "B").slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-semibold text-slate-950 dark:text-white">
                        {booking.customer_name || "Guest"}
                      </div>
                      <div className="mt-1 truncate text-[9px] font-bold tracking-[0.2em] text-slate-400">
                        {booking.resource_name || "-"} •{" "}
                        {(() => {
                          const parsedDate = parseSafeDate(
                            booking.start_time || booking.created_at,
                          );
                          return parsedDate
                            ? format(parsedDate, "dd MMM HH:mm")
                            : "-";
                        })()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] font-semibold tracking-[0.25em] text-slate-400">
                        {booking.status || "active"}
                      </div>
                      <div
                        className={cn(
                          "mt-1 text-[10px] font-semibold",
                          ownerOnly
                            ? "text-blue-600"
                            : "text-slate-950 dark:text-white",
                        )}
                      >
                        {ownerOnly ? `Rp ${formatIDR(total)}` : "Live"}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {ownerOnly ? (
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-2xl md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[8px] font-semibold tracking-[0.3em] text-slate-400">
                  Weekly Revenue
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white md:text-2xl">
                  Trend 7 hari
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-semibold tracking-[0.3em] text-slate-400">
                  Today
                </p>
                <p className="mt-1 text-sm font-semibold text-blue-600 md:text-base">
                  Rp {formatIDR(metrics.todayRevenue)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-2 items-end">
              {weeklyRevenue.map((item) => (
                <div
                  key={item.key}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="flex h-36 w-full items-end rounded-xl bg-slate-50 p-1 dark:bg-white/5">
                    <div
                      className="w-full rounded-lg bg-gradient-to-t from-blue-600 to-cyan-400 transition-all"
                      style={{ height: `${item.height}%` }}
                    />
                  </div>
                  <div className="text-[8px] font-semibold tracking-widest text-slate-400">
                    {item.label}
                  </div>
                  <div className="truncate text-[8px] font-semibold text-blue-600">
                    Rp {formatIDR(item.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-2xl md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[8px] font-semibold tracking-[0.3em] text-slate-400">
                  Business Snapshot
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                  Owner summary
                </h2>
              </div>
              <Badge className="border-none bg-emerald-500 text-[8px] font-semibold tracking-widest text-white">
                {metrics.status}
              </Badge>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoTile
                label="Subscription Plan"
                value={metrics.plan.toUpperCase()}
                icon={Wallet}
              />
              <InfoTile
                label="Customer Count"
                value={String(customersCount)}
                icon={Users}
              />
              <InfoTile
                label="Available Resources"
                value={String(metrics.availableResources)}
                icon={Monitor}
              />
              <InfoTile
                label="Maintenance"
                value={String(metrics.maintenanceResources)}
                icon={Activity}
              />
              <InfoTile
                label="Billing Orders"
                value={String(orders.length)}
                icon={PanelsTopLeft}
              />
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-white/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[8px] font-semibold tracking-[0.3em] text-slate-400">
                    Sync
                  </p>
                  <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                    {lastSyncAt || "--:--"}
                  </div>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-2xl border-none bg-blue-600 px-3 font-semibold text-[9px] tracking-widest text-white hover:bg-blue-500"
                >
                  <Link href="/admin/settings/analytics">
                    Open Analytics
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="mt-2 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Laporan komprehensif tetap tersedia di menu analytics. Dashboard
                ini fokus untuk pemantauan cepat dan mobile.
              </p>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-2xl md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[8px] font-semibold tracking-[0.3em] text-slate-400">
                Visibility
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                Revenue analytics hidden for staff
              </h2>
            </div>
            <Badge className="border-none bg-slate-100 text-[8px] font-semibold tracking-widest text-slate-500 dark:bg-white/5 dark:text-slate-300">
              Daily summary only
            </Badge>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Role staff hanya melihat ringkasan harian dan operasional. Insight
            yang bersifat sensitif seperti revenue trend dan snapshot finansial
            khusus owner tetap disembunyikan.
          </p>
          {quickActions.length === 0 && (
            <p className="mt-2 max-w-2xl text-xs font-medium text-slate-400 dark:text-slate-500">
              Saat ini akun ini belum memiliki modul operasional yang bisa dibuka.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

function InfoTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm dark:bg-slate-950">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[8px] font-semibold tracking-[0.3em] text-slate-400">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}
