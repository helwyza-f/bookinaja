"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ImagePlus,
  Monitor,
  PanelsTopLeft,
  RefreshCcw,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/admin-access";
import { toast } from "sonner";
import { RealtimePill } from "@/components/dashboard/realtime-pill";
import { useRealtime } from "@/lib/realtime/use-realtime";
import {
  tenantBookingsChannel,
  tenantDashboardChannel,
  tenantDevicesChannel,
} from "@/lib/realtime/channels";
import {
  BOOKING_EVENT_PREFIXES,
  DEVICE_EVENT_PREFIXES,
  matchesRealtimePrefix,
} from "@/lib/realtime/event-types";
import {
  DashboardLeaderboardPanel,
  DashboardLineChartPanel,
  DashboardMetricCard,
  DashboardPanel,
  DashboardStatStrip,
} from "@/components/dashboard/analytics-kit";

type ResourceRow = {
  id: string;
  name: string;
  status?: string;
  items?: {
    id: string;
    name: string;
    item_type: string;
    price: number;
    price_unit?: string;
    unit_duration?: number;
    is_default?: boolean;
  }[];
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

type TenantProfile = {
  id?: string;
  name?: string;
  tagline?: string;
  slogan?: string;
  about_us?: string;
  logo_url?: string;
  banner_url?: string;
  whatsapp_number?: string;
  timezone?: string;
  created_at?: string;
};

type PaymentMethodRow = {
  code: string;
  is_active?: boolean;
  metadata?: {
    account_number?: string;
    qr_image_url?: string;
  };
};

type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  complete: boolean;
  required?: boolean;
};

type AppUser = {
  role?: string;
  name?: string;
  permission_keys?: string[];
  tenant_id?: string;
};

const normalizeBookings = (payload: unknown): BookingRow[] => {
  if (Array.isArray(payload)) return payload as BookingRow[];
  if (payload && typeof payload === "object" && "items" in payload) {
    return (payload as { items?: BookingRow[] }).items || [];
  }
  return [];
};

const WEEKDAY_SHORT = new Intl.DateTimeFormat("id-ID", { weekday: "short" });

const formatIDR = (value?: number) =>
  new Intl.NumberFormat("id-ID").format(Number(value || 0));

const parseSafeDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getBookingTotal = (booking: BookingRow) => {
  const explicitTotal = Number(booking.grand_total || 0);
  if (explicitTotal > 0) return explicitTotal;
  return Number(booking.total_resource || 0) + Number(booking.total_fnb || 0);
};

const isSameDay = (date: string | undefined, target: Date) => {
  const parsed = parseSafeDate(date);
  return parsed ? format(parsed, "yyyy-MM-dd") === format(target, "yyyy-MM-dd") : false;
};

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [role, setRole] = useState<string>("staff");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string>("");
  const [tenantId, setTenantId] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(true);
  const hasLoadedRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);

  const ownerOnly = role === "owner";
  const canReadBookings =
    ownerOnly || hasPermission({ role, permission_keys: permissions }, "bookings.read");
  const canManageResources =
    ownerOnly || hasPermission({ role, permission_keys: permissions }, "resources.read");
  const canReadCustomers =
    ownerOnly || hasPermission({ role, permission_keys: permissions }, "customers.read");
  const canManageExpenses =
    ownerOnly || hasPermission({ role, permission_keys: permissions }, "expenses.read");
  const canManagePos =
    ownerOnly || hasPermission({ role, permission_keys: permissions }, "pos.read");

  const fetchDashboard = useCallback(async (mode: "initial" | "background" = "initial") => {
    const background = mode === "background" && hasLoadedRef.current;
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const meRes = await api.get<{ user?: AppUser }>("/auth/me");
      const currentRole = String(meRes.data?.user?.role || "staff").toLowerCase();
      const currentPermissions = meRes.data?.user?.permission_keys || [];
      setRole(currentRole);
      setPermissions(currentPermissions);
      setTenantId(meRes.data?.user?.tenant_id || "");

      const scope = { role: currentRole, permission_keys: currentPermissions };
      const allowBookings = hasPermission(scope, "bookings.read");
      const allowResources = hasPermission(scope, "resources.read");
      const allowCustomers = hasPermission(scope, "customers.read");

      const [resourcesRes, sessionsRes, bookingsRes, customersRes] = await Promise.allSettled([
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
        const [ordersRes, subscriptionRes, profileRes, paymentMethodsRes] = await Promise.all([
          api.get("/billing/orders?limit=6"),
          api.get("/billing/subscription"),
          api.get("/admin/profile"),
          api.get("/admin/payment-methods"),
        ]);
        setOrders(ordersRes.data?.orders || []);
        setSubscription(subscriptionRes.data || null);
        setTenantProfile(profileRes.data || null);
        setPaymentMethods(paymentMethodsRes.data?.items || []);
      } else {
        setOrders([]);
        setSubscription(null);
        setTenantProfile(null);
        setPaymentMethods([]);
      }

      setLastSyncAt(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      hasLoadedRef.current = true;
    } catch {
      if (!background) {
        toast.error("Gagal memuat dashboard");
      }
    } finally {
      if (background) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchDashboard("initial");
    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [fetchDashboard]);

  const scheduleDashboardRefresh = useCallback(
    (delay = 500) => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;
        void fetchDashboard("background");
      }, delay);
    },
    [fetchDashboard],
  );

  const { connected: realtimeConnected, status: realtimeStatus } = useRealtime({
    enabled: Boolean(tenantId),
    channels: tenantId
      ? [
          tenantDashboardChannel(tenantId),
          tenantBookingsChannel(tenantId),
          tenantDevicesChannel(tenantId),
        ]
      : [],
    onEvent: (event) => {
      if (
        matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES) ||
        matchesRealtimePrefix(event.type, DEVICE_EVENT_PREFIXES)
      ) {
        scheduleDashboardRefresh();
      }
    },
    onReconnect: () => {
      scheduleDashboardRefresh(150);
    },
  });

  const metrics = useMemo(() => {
    const totalResources = resources.length;
    const activeSessions = sessions.length;
    const occupiedPercent = totalResources > 0 ? Math.round((activeSessions / totalResources) * 100) : 0;
    const availableResources = resources.filter((resource) => resource.status === "available").length;
    const maintenanceResources = resources.filter((resource) => resource.status === "maintenance").length;
    const today = new Date();
    const todayBookings = bookings.filter((booking) =>
      isSameDay(booking.start_time || booking.created_at, today),
    ).length;
    const todayRevenue = bookings
      .filter((booking) => isSameDay(booking.start_time || booking.created_at, today))
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

  const weeklyRevenuePoints = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      const key = format(date, "yyyy-MM-dd");
      const revenue = bookings.reduce((sum, booking) => {
        const rawDate = booking.start_time || booking.created_at;
        const bookingDate = parseSafeDate(rawDate);
        if (!bookingDate || format(bookingDate, "yyyy-MM-dd") !== key) return sum;
        return sum + getBookingTotal(booking);
      }, 0);
      const sessionsCount = sessions.filter((session) => {
        const dateValue = parseSafeDate(session.start_time || session.created_at);
        return dateValue ? format(dateValue, "yyyy-MM-dd") === key : false;
      }).length;

      return {
        label: WEEKDAY_SHORT.format(date),
        primary: revenue,
        secondary: sessionsCount,
        meta: `${sessionsCount} sesi`,
      };
    });
  }, [bookings, sessions]);

  const topBookings = useMemo(
    () =>
      [...bookings]
        .sort(
          (a, b) =>
            (parseSafeDate(b.start_time || b.created_at)?.getTime() || 0) -
            (parseSafeDate(a.start_time || a.created_at)?.getTime() || 0),
        )
        .slice(0, 6),
    [bookings],
  );

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
      const bookingDate = parseSafeDate(booking.start_time || booking.created_at);
      if (!bookingDate || format(bookingDate, "yyyy-MM-dd") !== todayKey) return;

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
      const existingLast = current.lastBookingAt ? new Date(current.lastBookingAt).getTime() : 0;
      if (!current.lastBookingAt || bookingDate.getTime() > existingLast) {
        current.lastBookingAt = bookingDate.toISOString();
      }

      resourceMap.set(key, current);
    });

    return Array.from(resourceMap.values()).sort((a, b) => {
      if (b.revenueToday !== a.revenueToday) return b.revenueToday - a.revenueToday;
      return b.bookingsToday - a.bookingsToday;
    });
  }, [bookings, resources]);

  const topResourceToday = resourceStats[0] || null;

  const onboardingSteps = useMemo<OnboardingStep[]>(() => {
    if (!ownerOnly) return [];

    const hasBusinessIdentity = Boolean(
      tenantProfile?.tagline?.trim() ||
        tenantProfile?.slogan?.trim() ||
        tenantProfile?.about_us?.trim(),
    );
    const hasBusinessContact = Boolean(
      tenantProfile?.whatsapp_number?.trim() && tenantProfile?.timezone?.trim(),
    );
    const hasVisualIdentity = Boolean(
      tenantProfile?.logo_url?.trim() || tenantProfile?.banner_url?.trim(),
    );
    const resourcesCount = resources.length;
    const pricePackagesCount = resources.reduce((sum, resource) => {
      const packageCount =
        resource.items?.filter((item) =>
          ["main_option", "main", "console_option"].includes(item.item_type),
        ).length || 0;
      return sum + packageCount;
    }, 0);
    const paymentReady = paymentMethods.some((method) => {
      if (!method.is_active) return false;
      if (method.code === "bank_transfer") {
        return Boolean(method.metadata?.account_number?.trim());
      }
      if (method.code === "qris_static") {
        return Boolean(method.metadata?.qr_image_url?.trim());
      }
      return true;
    });

    return [
      {
        id: "brand",
        label: "Lengkapi identitas bisnis",
        description: "Isi copy dasar, kontak WhatsApp, timezone, dan visual awal supaya tenant publik tidak terasa kosong.",
        href: "/admin/settings/page-builder?workspace=content",
        icon: Building2,
        complete: hasBusinessIdentity && hasBusinessContact && hasVisualIdentity,
        required: true,
      },
      {
        id: "resources",
        label: "Tambah resource dan harga",
        description: "Pastikan minimal ada resource utama dan paket harga aktif sebelum mulai menerima booking serius.",
        href: "/admin/resources",
        icon: Monitor,
        complete: resourcesCount > 0 && pricePackagesCount > 0,
        required: true,
      },
      {
        id: "payments",
        label: "Review metode bayar dan DP",
        description: "Aktifkan metode yang memang mau dipakai tenant ini, lalu pastikan setting DP-nya sudah cocok.",
        href: "/admin/settings/payment-methods",
        icon: Wallet,
        complete: paymentReady,
      },
      {
        id: "landing",
        label: "Rapikan landing page",
        description: "Atur hero, CTA, dan section awal supaya owner bisa langsung share halaman booking ke customer.",
        href: "/admin/settings/page-builder?workspace=theme",
        icon: ImagePlus,
        complete: hasVisualIdentity && hasBusinessIdentity,
      },
    ];
  }, [ownerOnly, paymentMethods, resources, tenantProfile]);

  const completedOnboardingSteps = onboardingSteps.filter((step) => step.complete).length;
  const requiredOnboardingSteps = onboardingSteps.filter((step) => step.required);
  const requiredOnboardingIncomplete = requiredOnboardingSteps.some((step) => !step.complete);
  const onboardingProgress = onboardingSteps.length
    ? Math.round((completedOnboardingSteps / onboardingSteps.length) * 100)
    : 100;
  const onboardingDismissKey = tenantId ? `tenant-onboarding-dismissed:${tenantId}` : "";
  const onboardingWelcome = searchParams.get("welcome") === "1";

  useEffect(() => {
    if (!ownerOnly || !tenantId || !onboardingSteps.length) return;
    if (requiredOnboardingIncomplete || onboardingWelcome) {
      const dismissed = window.localStorage.getItem(onboardingDismissKey) === "1";
      setShowOnboarding(!dismissed);
      return;
    }
    setShowOnboarding(false);
  }, [
    onboardingDismissKey,
    onboardingSteps,
    onboardingWelcome,
    ownerOnly,
    requiredOnboardingIncomplete,
    tenantId,
  ]);

  const quickActions = ownerOnly
    ? [
        { href: "/admin/bookings", label: "Bookings", icon: CalendarClock },
        { href: "/admin/resources", label: "Resources", icon: Monitor },
        { href: "/admin/settings/analytics", label: "Analytics", icon: PanelsTopLeft },
      ]
    : ([
        canReadBookings
          ? { href: "/admin/bookings", label: "Bookings", icon: CalendarClock }
          : null,
        canManageExpenses
          ? { href: "/admin/expenses", label: "Expenses", icon: Banknote }
          : null,
        canManagePos
          ? { href: "/admin/pos", label: "Quick POS", icon: Sparkles }
          : null,
      ].filter(Boolean) as Array<{ href: string; label: string; icon: LucideIcon }>);

  const resourceRows = useMemo(() => {
    const maxRevenue = Math.max(...resourceStats.map((item) => item.revenueToday), 1);
    return resourceStats.slice(0, 8).map((resource) => ({
      id: resource.id,
      title: resource.name,
      subtitle: `${resource.status || "resource"} • ${resource.bookingsToday} booking`,
      value: ownerOnly ? `Rp ${formatIDR(resource.revenueToday)}` : "Live",
      meta: resource.lastBookingAt
        ? format(parseSafeDate(resource.lastBookingAt) || new Date(), "HH:mm")
        : "-",
      progress: (resource.revenueToday / maxRevenue) * 100,
    }));
  }, [ownerOnly, resourceStats]);

  const bookingRows = useMemo(() => {
    const maxTotal = Math.max(...topBookings.map((item) => getBookingTotal(item)), 1);
    return topBookings.map((booking) => ({
      id: booking.id,
      title: booking.customer_name || "Guest",
      subtitle: `${booking.resource_name || "-"} • ${
        parseSafeDate(booking.start_time || booking.created_at)
          ? format(parseSafeDate(booking.start_time || booking.created_at) || new Date(), "dd MMM HH:mm")
          : "-"
      }`,
      value: ownerOnly ? `Rp ${formatIDR(getBookingTotal(booking))}` : "Live",
      meta: String(booking.status || "active").toUpperCase(),
      progress: (getBookingTotal(booking) / maxTotal) * 100,
    }));
  }, [ownerOnly, topBookings]);

  return (
    <div className="space-y-5 px-3 pb-20 pt-5 font-plus-jakarta md:px-4">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(240,252,250,0.96))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.09)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(10,24,26,0.98),rgba(6,16,18,0.98))] dark:shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(129,216,208,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(30,143,146,0.14),transparent_34%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-none bg-[var(--bookinaja-600)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                {ownerOnly ? "Owner" : "Staff"}
              </Badge>
              <Badge className="rounded-full border-none bg-white/85 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-100">
                {refreshing ? "Refreshing..." : `Sync ${lastSyncAt || "--:--"}`}
              </Badge>
              <RealtimePill connected={realtimeConnected} status={realtimeStatus} />
            </div>
            <div>
              <h1 className="text-3xl font-[950] tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Dashboard
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void fetchDashboard("background")} variant="outline" className="rounded-2xl">
              <RefreshCcw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            {quickActions.map((action) => (
              <Button
                key={action.href}
                asChild
                variant="outline"
                className="rounded-2xl"
              >
                <Link href={action.href}>
                  <action.icon className="mr-2 h-4 w-4" />
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {ownerOnly && showOnboarding && onboardingSteps.length ? (
        <DashboardPanel
          eyebrow={onboardingWelcome ? "Welcome setup" : "Onboarding owner"}
          title="Tenant baru kamu belum selesai disiapkan"
          description="Checklist ini sengaja pendek dan langsung mengarah ke halaman setup yang memang sudah ada, jadi owner baru tidak perlu menebak langkah berikutnya."
          actions={
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => {
                if (onboardingDismissKey) {
                  window.localStorage.setItem(onboardingDismissKey, "1");
                }
                setShowOnboarding(false);
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Sembunyikan
            </Button>
          }
        >
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Progress
                  </div>
                  <div className="mt-2 text-3xl font-[950] tracking-tight text-slate-950 dark:text-white">
                    {onboardingProgress}%
                  </div>
                </div>
                <Badge className="rounded-full border-none bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-100">
                  {completedOnboardingSteps}/{onboardingSteps.length} selesai
                </Badge>
              </div>
              <div className="mt-4 h-3 rounded-full bg-slate-200 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400"
                  style={{ width: `${Math.max(onboardingProgress, 6)}%` }}
                />
              </div>
              <div className="mt-4 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <p>
                  Fokus dulu ke identitas bisnis dan katalog resource. Dua area ini paling berpengaruh ke rasa “siap live”.
                </p>
                <p>
                  Begitu itu rapi, owner biasanya jauh lebih enak lanjut ke metode bayar dan page builder.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {onboardingSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    "rounded-[1.4rem] border p-4 transition-colors",
                    step.complete
                      ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                      : "border-slate-200/80 bg-white/90 dark:border-white/10 dark:bg-white/[0.03]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem]",
                        step.complete
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-950 text-white dark:bg-white dark:text-slate-950",
                      )}
                    >
                      {step.complete ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <step.icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                          Step {index + 1}
                        </div>
                        {step.required ? (
                          <Badge className="rounded-full border-none bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                            Prioritas
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                        {step.label}
                      </div>
                      <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {step.description}
                      </div>
                      <div className="mt-3">
                        <Button
                          asChild
                          size="sm"
                          className={cn(
                            "rounded-xl",
                            step.complete
                              ? "bg-emerald-600 text-white hover:bg-emerald-500"
                              : "bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100",
                          )}
                        >
                          <Link href={step.href}>
                            {step.complete ? "Review lagi" : "Lanjut setup"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DashboardPanel>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ownerOnly ? (
          <DashboardMetricCard
            label="Today Revenue"
            value={`Rp ${formatIDR(metrics.todayRevenue)}`}
            hint="Hari ini"
            icon={TrendingUp}
            tone="indigo"
            loading={loading}
          />
        ) : null}
        {canReadBookings ? (
          <DashboardMetricCard
            label="Today Bookings"
            value={metrics.todayBookings.toString()}
            hint="Hari ini"
            icon={CalendarClock}
            tone="emerald"
            loading={loading}
          />
        ) : null}
        {canReadBookings ? (
          <DashboardMetricCard
            label="Active Sessions"
            value={metrics.activeSessions.toString()}
            hint={`${metrics.occupiedPercent}% okupansi`}
            icon={Clock3}
            tone="cyan"
            loading={loading}
          />
        ) : null}
        {canReadCustomers ? (
          <DashboardMetricCard
            label="Customers"
            value={customersCount.toString()}
            hint="Tersimpan"
            icon={Users}
            tone="slate"
            loading={loading}
          />
        ) : null}
        {canManageResources ? (
          <DashboardMetricCard
            label="Resource Pool"
            value={String(metrics.totalResources)}
            hint={`${metrics.availableResources} available`}
            icon={Monitor}
            tone="amber"
            loading={loading}
          />
        ) : null}
      </div>

      <DashboardStatStrip
        items={[
          { label: "Available", value: String(metrics.availableResources), tone: "emerald" },
          { label: "Maintenance", value: String(metrics.maintenanceResources), tone: "amber" },
          { label: "Top resource", value: topResourceToday?.name || "No activity", tone: "cyan" },
          { label: "Plan", value: String(metrics.plan).toUpperCase(), tone: "slate" },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardLineChartPanel
          eyebrow="Weekly trend"
          title="Revenue dan sesi 7 hari"
          description="Chart utama menggantikan bar kecil lama supaya ritme minggu ini lebih mudah dibaca sekilas, terutama untuk owner."
          points={weeklyRevenuePoints}
          primaryLabel="Revenue"
          secondaryLabel="Sessions"
          formatValue={(value) => `Rp ${formatIDR(value)}`}
        />

        <DashboardPanel
          eyebrow="Business snapshot"
          title="Ringkasan keputusan cepat"
          description="Panel kanan dipakai untuk konteks yang harus langsung terbaca tanpa membuka laporan analytics."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoChip label="Subscription plan" value={String(metrics.plan).toUpperCase()} icon={Wallet} />
            <InfoChip label="Subscription status" value={String(metrics.status || "-").toUpperCase()} icon={Activity} />
            <InfoChip label="Billing orders" value={String(orders.length)} icon={PanelsTopLeft} />
            <InfoChip label="Today occupancy" value={`${metrics.occupiedPercent}%`} icon={TrendingUp} />
          </div>
          <div className="rounded-[1.6rem] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Next step
            </div>
            <div className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Laporan komprehensif tetap tersedia di menu analytics. Dashboard ini fokus untuk operational pulse yang cepat, sementara detail finansial dan komposisi ada di report.
            </div>
            <Button asChild className="mt-4 rounded-2xl bg-slate-950 text-white hover:bg-slate-800">
              <Link href="/admin/settings/analytics">
                Open Analytics
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </DashboardPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DashboardLeaderboardPanel
          eyebrow="Resource pulse"
          title="Resource paling aktif hari ini"
          description="Resource dibuat seperti leaderboard agar operator bisa cepat lihat siapa yang penuh, siapa yang idle, dan mana yang paling menghasilkan."
          rows={resourceRows}
          emptyText={
            canManageResources
              ? "Belum ada resource aktif hari ini."
              : "Akses resource belum diberikan untuk akun ini."
          }
        />

        <DashboardLeaderboardPanel
          eyebrow="Recent activity"
          title="Booking terbaru"
          description="Daftar aktivitas disusun ulang supaya nama customer, resource, dan nilai transaksi terbaca dalam satu ritme visual."
          rows={bookingRows}
          emptyText={
            canReadBookings
              ? "Belum ada booking terbaru."
              : "Akses booking belum diberikan untuk akun ini."
          }
        />
      </section>

      {!ownerOnly ? (
        <DashboardPanel
          eyebrow="Visibility"
          title="Mode staf tetap aman"
          description="Insight sensitif seperti revenue penuh dan finance context tetap dibatasi untuk owner, tetapi ritme dashboard-nya tetap sama supaya pengalaman staf tidak terasa seperti versi kedua yang terabaikan."
        >
          <div className="rounded-[1.6rem] border border-slate-200/80 bg-slate-50/80 p-5 text-sm leading-relaxed text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
            Role staf hanya melihat ringkasan operasional dan aktivitas terbaru.
            Revenue detail, order billing, dan pembacaan finansial yang sensitif tetap disimpan untuk owner.
            {quickActions.length === 0 ? (
              <div className="mt-3 text-xs font-medium text-slate-400 dark:text-slate-500">
                Saat ini akun ini belum memiliki modul operasional yang bisa dibuka.
              </div>
            ) : null}
          </div>
        </DashboardPanel>
      ) : null}
    </div>
  );
}

function InfoChip({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          {label}
        </div>
        <Icon className="h-4 w-4 text-blue-600 dark:text-blue-300" />
      </div>
      {value ? (
        <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
          {value}
        </div>
      ) : (
        <Skeleton className="mt-2 h-5 w-24 rounded-md" />
      )}
    </div>
  );
}
