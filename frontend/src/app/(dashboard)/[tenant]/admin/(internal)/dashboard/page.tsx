"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import {
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
import { useAdminSession } from "@/components/dashboard/admin-session-context";
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
  DashboardDonutPanel,
  DashboardLeaderboardPanel,
  DashboardLineChartPanel,
  DashboardPanel,
} from "@/components/dashboard/analytics-kit";

type ResourceRow = {
  id: string;
  name: string;
  status?: string;
  category?: string;
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

type SubscriptionRow = {
  plan?: string;
  status?: string;
  current_period_end?: string;
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

type OnboardingSummaryResponse = {
  has_business_identity?: boolean;
  has_business_contact?: boolean;
  has_visual_identity?: boolean;
  resources_count?: number;
  price_packages_count?: number;
  payment_ready?: boolean;
  progress_percent?: number;
  steps?: Array<{
    id: string;
    label: string;
    description: string;
    href: string;
    complete: boolean;
    required?: boolean;
  }>;
};

type MetricTone = "indigo" | "emerald" | "amber" | "cyan" | "slate";

type CompactMetric = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone: MetricTone;
};

type ActionFeedRow = {
  id: string;
  kind?: string;
  status?: string;
  payment_status?: string;
  action_label?: string;
  priority?: number;
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
  const { user: sessionUser } = useAdminSession();
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [actionFeed, setActionFeed] = useState<ActionFeedRow[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [onboardingSummary, setOnboardingSummary] = useState<OnboardingSummaryResponse | null>(null);
  const [customersCount, setCustomersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string>("");
  const [showOnboarding, setShowOnboarding] = useState(true);
  const hasLoadedRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);

  const role = String(sessionUser?.role || "staff").toLowerCase();
  const permissions = useMemo(() => sessionUser?.permission_keys || [], [sessionUser?.permission_keys]);
  const tenantId = sessionUser?.tenant_id || "";
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
      const scope = { role, permission_keys: permissions };
      const allowBookings = hasPermission(scope, "bookings.read");
      const allowResources = hasPermission(scope, "resources.read");
      const allowCustomers = hasPermission(scope, "customers.read");
      const allowPos = ownerOnly || hasPermission(scope, "pos.read");

      const [resourcesRes, sessionsRes, bookingsRes, customersRes, actionFeedRes] = await Promise.allSettled([
        allowResources ? api.get("/admin/resources/summary") : Promise.resolve(null),
        allowBookings ? api.get("/bookings/pos/active") : Promise.resolve(null),
        allowBookings ? api.get("/bookings") : Promise.resolve(null),
        allowCustomers ? api.get("/customers/count") : Promise.resolve(null),
        allowPos ? api.get("/pos/action-feed?window_minutes=360&limit=80") : Promise.resolve(null),
      ]);

      setResources(
        resourcesRes.status === "fulfilled"
          ? resourcesRes.value?.data?.items || []
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
          ? Number(customersRes.value?.data?.count || 0)
          : 0,
      );
      setActionFeed(
        actionFeedRes.status === "fulfilled"
          ? actionFeedRes.value?.data?.items || []
          : [],
      );

      if (ownerOnly) {
        const [subscriptionRes, onboardingRes] = await Promise.allSettled([
          api.get("/billing/subscription"),
          api.get("/admin/tenant/onboarding-summary"),
        ]);
        setSubscription(
          subscriptionRes.status === "fulfilled" ? subscriptionRes.value.data || null : null,
        );
        setOnboardingSummary(
          onboardingRes.status === "fulfilled" ? onboardingRes.value.data || null : null,
        );
      } else {
        setSubscription(null);
        setOnboardingSummary(null);
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
  }, [ownerOnly, permissions, role]);

  useEffect(() => {
    if (!sessionUser) return;
    void fetchDashboard("initial");
    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [fetchDashboard, sessionUser]);

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
    const actionRequiredCount = actionFeed.length;
    const verificationCount = actionFeed.filter(
      (item) => String(item.payment_status || "").toLowerCase() === "awaiting_verification",
    ).length;

    return {
      totalResources,
      activeSessions,
      occupiedPercent,
      availableResources,
      maintenanceResources,
      todayBookings,
      todayRevenue,
      actionRequiredCount,
      verificationCount,
      plan: subscription?.plan || "-",
      status: subscription?.status || "-",
    };
  }, [actionFeed, bookings, resources, sessions, subscription]);

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
      const addonRevenue = bookings.reduce((sum, booking) => {
        const rawDate = booking.start_time || booking.created_at;
        const bookingDate = parseSafeDate(rawDate);
        if (!bookingDate || format(bookingDate, "yyyy-MM-dd") !== key) return sum;
        return sum + Number(booking.total_fnb || 0);
      }, 0);
      const resourceRevenue = Math.max(revenue - addonRevenue, 0);
      const sessionsCount = sessions.filter((session) => {
        const dateValue = parseSafeDate(session.start_time || session.created_at);
        return dateValue ? format(dateValue, "yyyy-MM-dd") === key : false;
      }).length;

      return {
        label: WEEKDAY_SHORT.format(date),
        primary: revenue,
        secondary: resourceRevenue,
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
  const weeklySummary = useMemo(() => {
    const totalRevenue = weeklyRevenuePoints.reduce((sum, point) => sum + point.primary, 0);
    const activeDays = weeklyRevenuePoints.filter((point) => point.primary > 0).length;
    const peakPoint = weeklyRevenuePoints.reduce(
      (best, point) => (point.primary > best.primary ? point : best),
      weeklyRevenuePoints[0] || { label: "-", primary: 0, secondary: 0, meta: "" },
    );

    return {
      totalRevenue,
      activeDays,
      peakLabel: peakPoint?.label || "-",
      peakRevenue: peakPoint?.primary || 0,
    };
  }, [weeklyRevenuePoints]);

  const keyMetrics = useMemo<CompactMetric[]>(() => {
    const items: CompactMetric[] = [];

    if (ownerOnly) {
      items.push({
        label: "Revenue",
        value: `Rp ${formatIDR(metrics.todayRevenue)}`,
        hint: "Hari ini",
        icon: TrendingUp,
        tone: "indigo",
      });
    }

    if (canReadBookings) {
      items.push({
        label: "Booking",
        value: metrics.todayBookings.toString(),
        hint: "Hari ini",
        icon: CalendarClock,
        tone: "emerald",
      });
      items.push({
        label: "Sesi aktif",
        value: metrics.activeSessions.toString(),
        hint: `${metrics.occupiedPercent}% okupansi`,
        icon: Clock3,
        tone: "cyan",
      });
    }

    if (canManagePos) {
      items.push({
        label: "Butuh tindakan",
        value: String(metrics.actionRequiredCount),
        hint: metrics.verificationCount > 0 ? `${metrics.verificationCount} verifikasi` : "POS feed",
        icon: Sparkles,
        tone: "amber",
      });
    } else if (canManageResources) {
      items.push({
        label: "Resource siap",
        value: String(metrics.availableResources),
        hint: `${metrics.totalResources} total`,
        icon: Monitor,
        tone: "amber",
      });
    } else if (canReadCustomers) {
      items.push({
        label: "Customer",
        value: customersCount.toString(),
        hint: "Tersimpan",
        icon: Users,
        tone: "slate",
      });
    }

    return items.slice(0, 4);
  }, [
    canManagePos,
    canManageResources,
    canReadBookings,
    canReadCustomers,
    metrics.actionRequiredCount,
    customersCount,
    metrics.activeSessions,
    metrics.availableResources,
    metrics.occupiedPercent,
    metrics.todayBookings,
    metrics.todayRevenue,
    metrics.totalResources,
    metrics.verificationCount,
    ownerOnly,
  ]);

  const ownerSnapshot = useMemo(
    () =>
      [
        metrics.plan && metrics.plan !== "-"
          ? { label: "Plan", value: String(metrics.plan).toUpperCase(), icon: Wallet }
          : null,
        { label: "Okupansi", value: `${metrics.occupiedPercent}%`, icon: TrendingUp },
        canManageResources
          ? { label: "Top resource", value: topResourceToday?.name || "Belum ada", icon: Monitor }
          : null,
        canManagePos
          ? { label: "Verifikasi", value: String(metrics.verificationCount), icon: Sparkles }
          : canReadCustomers
            ? { label: "Customer", value: customersCount.toString(), icon: Users }
            : null,
        canManageResources
          ? { label: "Resource siap", value: String(metrics.availableResources), icon: Monitor }
          : null,
      ].filter(Boolean) as Array<{ label: string; value: string; icon: LucideIcon }>,
    [
      canManagePos,
      canManageResources,
      canReadCustomers,
      customersCount,
      metrics.availableResources,
      metrics.occupiedPercent,
      metrics.plan,
      metrics.verificationCount,
      topResourceToday?.name,
    ],
  );

  const dashboardDonut = useMemo(() => {
    if (canManagePos) {
      const verification = actionFeed.filter(
        (item) => String(item.payment_status || "").toLowerCase() === "awaiting_verification",
      ).length;
      const payment = actionFeed.filter((item) => item.action_label === "Tuntaskan pembayaran").length;
      const live = actionFeed.filter((item) =>
        ["active", "ongoing"].includes(String(item.status || "").toLowerCase()),
      ).length;
      const prep = actionFeed.filter((item) => item.action_label === "Siapkan booking").length;

      const actionSegments = [
        { label: "Verifikasi", value: verification, colorClass: "--chart-rose" },
        { label: "Pembayaran", value: payment, colorClass: "--chart-amber" },
        { label: "Sesi live", value: live, colorClass: "--chart-indigo" },
        { label: "Siapkan", value: prep, colorClass: "--chart-emerald" },
      ].filter((segment) => segment.value > 0);

      if (actionSegments.length >= 2) {
        return {
          eyebrow: "Action mix",
          title: "Antrian tindakan",
          description: "Sebaran aksi yang sedang menunggu kasir atau admin.",
          totalLabel: "Perlu aksi",
          totalValue: String(actionFeed.length),
          segments: actionSegments,
        };
      }

      const otherResources = Math.max(
        metrics.totalResources - metrics.availableResources - metrics.maintenanceResources,
        0,
      );

      return {
        eyebrow: "Action mix",
        title: "Kondisi unit",
        description: "Action feed sedang tipis, jadi panel kanan menampilkan status resource.",
        totalLabel: "Total unit",
        totalValue: String(metrics.totalResources),
        segments: [
          { label: "Siap", value: metrics.availableResources, colorClass: "--chart-emerald" },
          { label: "Maintenance", value: metrics.maintenanceResources, colorClass: "--chart-amber" },
          { label: "Lainnya", value: otherResources, colorClass: "--chart-indigo" },
        ].filter((segment) => segment.value > 0),
      };
    }

    const otherResources = Math.max(
      metrics.totalResources - metrics.availableResources - metrics.maintenanceResources,
      0,
    );
    return {
      eyebrow: "Status resource",
      title: "Kondisi unit",
      description: "Komposisi singkat resource yang siap dipakai hari ini.",
      totalLabel: "Total unit",
      totalValue: String(metrics.totalResources),
      segments: [
        { label: "Siap", value: metrics.availableResources, colorClass: "--chart-emerald" },
        { label: "Maintenance", value: metrics.maintenanceResources, colorClass: "--chart-amber" },
        { label: "Lainnya", value: otherResources, colorClass: "--chart-indigo" },
      ].filter((segment) => segment.value > 0),
    };
  }, [
    actionFeed,
    canManagePos,
    metrics.availableResources,
    metrics.maintenanceResources,
    metrics.totalResources,
  ]);

  const onboardingSteps = useMemo<OnboardingStep[]>(() => {
    if (!ownerOnly || !onboardingSummary?.steps?.length) return [];

    const iconByStepId: Record<string, LucideIcon> = {
      identity: Building2,
      resources: Monitor,
      payments: Wallet,
      branding: ImagePlus,
    };

    return onboardingSummary.steps.map((step) => ({
      ...step,
      icon: iconByStepId[step.id] || Sparkles,
    }));
  }, [onboardingSummary, ownerOnly]);

  const completedOnboardingSteps = onboardingSteps.filter((step) => step.complete).length;
  const requiredOnboardingSteps = onboardingSteps.filter((step) => step.required);
  const requiredOnboardingIncomplete = requiredOnboardingSteps.some((step) => !step.complete);
  const onboardingProgress = onboardingSummary?.progress_percent ?? (onboardingSteps.length
    ? Math.round((completedOnboardingSteps / onboardingSteps.length) * 100)
    : 100);
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
    <div className="space-y-4 px-3 pb-20 pt-4 font-plus-jakarta md:px-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-medium uppercase text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {ownerOnly ? "Owner" : "Staff"}
              </Badge>
              <Badge className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-medium uppercase text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {refreshing ? "Refreshing..." : `Sync ${lastSyncAt || "--:--"}`}
              </Badge>
              <RealtimePill connected={realtimeConnected} status={realtimeStatus} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-950 dark:text-white sm:text-2xl">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Pulse operasional yang paling penting.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              onClick={() => void fetchDashboard("background")}
              variant="outline"
              className="rounded-lg"
            >
              <RefreshCcw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            {quickActions.map((action) => (
              <Button
                key={action.href}
                asChild
                variant="outline"
                className="rounded-lg"
              >
                <Link href={action.href} prefetch={false}>
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
          description="Checklist pendek untuk menuntaskan setup tenant."
          actions={
            <Button
              type="button"
              variant="ghost"
              className="rounded-lg"
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
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Progress
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                    {onboardingProgress}%
                  </div>
                </div>
                <Badge className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-medium uppercase text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                  {completedOnboardingSteps}/{onboardingSteps.length} selesai
                </Badge>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-[var(--bookinaja-600)]"
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
                    "rounded-lg border p-4 transition-colors",
                    step.complete
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        step.complete
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200",
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
                        <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Step {index + 1}
                        </div>
                        {step.required ? (
                          <Badge className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
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
                            "rounded-lg",
                            step.complete
                              ? "bg-emerald-600 text-white hover:bg-emerald-500"
                              : "bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]",
                          )}
                        >
                          <Link href={step.href} prefetch={false}>
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

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {keyMetrics.map((metric) => (
          <CompactMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            icon={metric.icon}
            tone={metric.tone}
            loading={loading}
          />
        ))}
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.7fr]">
        <div className="space-y-4">
          <DashboardLineChartPanel
            eyebrow="7 hari"
            title="Revenue 7 hari"
            description="Bandingkan total revenue harian dengan porsi revenue utama di rentang yang sama."
            points={weeklyRevenuePoints}
            primaryLabel="Revenue"
            secondaryLabel="Revenue utama"
            formatValue={(value) => `Rp ${formatIDR(value)}`}
          />
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <InfoChip label="Total 7 hari" value={`Rp ${formatIDR(weeklySummary.totalRevenue)}`} icon={Wallet} />
            <InfoChip label="Hari aktif" value={`${weeklySummary.activeDays}/7`} icon={CalendarClock} />
            <InfoChip label="Puncak" value={`${weeklySummary.peakLabel} · Rp ${formatIDR(weeklySummary.peakRevenue)}`} icon={TrendingUp} />
          </div>
        </div>

        <div className="space-y-4">
          <DashboardDonutPanel
            eyebrow={dashboardDonut.eyebrow}
            title={dashboardDonut.title}
            description={dashboardDonut.description}
            totalLabel={dashboardDonut.totalLabel}
            totalValue={dashboardDonut.totalValue}
            segments={dashboardDonut.segments}
          />

          {ownerOnly ? (
            <DashboardPanel
              eyebrow="Owner pulse"
              title="Snapshot singkat"
              description="Konteks cepat untuk cek kondisi tenant."
            >
              <div className="grid grid-cols-2 gap-3">
                {ownerSnapshot.map((item) => (
                  <InfoChip key={item.label} label={item.label} value={item.value} icon={item.icon} />
                ))}
              </div>
              <div className="flex justify-end">
                <Button asChild variant="outline" className="rounded-lg">
                  <Link href="/admin/settings/analytics" prefetch={false}>
                    Open analytics
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </DashboardPanel>
          ) : (
            <DashboardPanel
              eyebrow="Pulse"
              title="Ringkasan cepat"
              description="Konteks singkat untuk baca kondisi tenant saat ini."
            >
              <div className="grid grid-cols-2 gap-3">
                <InfoChip label="Okupansi" value={`${metrics.occupiedPercent}%`} icon={TrendingUp} />
                <InfoChip label="Resource siap" value={String(metrics.availableResources)} icon={Monitor} />
                <InfoChip label="Customer" value={customersCount.toString()} icon={Users} />
                <InfoChip label="Verifikasi" value={String(metrics.verificationCount)} icon={Sparkles} />
              </div>
            </DashboardPanel>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DashboardLeaderboardPanel
          eyebrow="Resource pulse"
          title="Resource paling aktif hari ini"
          description="Siapa yang paling aktif hari ini."
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
          description="Aktivitas booking terbaru."
          rows={bookingRows}
          emptyText={
            canReadBookings
              ? "Belum ada booking terbaru."
              : "Akses booking belum diberikan untuk akun ini."
          }
        />
      </section>

      {!ownerOnly && quickActions.length === 0 ? (
        <DashboardPanel
          eyebrow="Mode staf"
          title="Akses operasional terbatas"
          description="Modul sensitif tetap disimpan untuk owner."
        >
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-300">
            Saat ini akun ini belum memiliki modul operasional tambahan yang bisa dibuka.
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
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </div>
        <Icon className="h-4 w-4 text-blue-600 dark:text-blue-300" />
      </div>
      {value ? (
        <div className="mt-1.5 text-sm font-semibold text-slate-950 dark:text-white">
          {value}
        </div>
      ) : (
        <Skeleton className="mt-2 h-5 w-24 rounded-md" />
      )}
    </div>
  );
}

function CompactMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  loading,
}: CompactMetric & { loading?: boolean }) {
  const toneClass: Record<MetricTone, string> = {
    indigo: "bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[rgba(74,141,255,0.12)] dark:text-[var(--bookinaja-200)]",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-200",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/12 dark:text-cyan-200",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            {loading ? "..." : value}
          </div>
          {hint ? (
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {hint}
            </div>
          ) : null}
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneClass[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
