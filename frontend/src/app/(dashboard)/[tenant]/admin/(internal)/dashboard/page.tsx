"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getTenantUrl } from "@/lib/tenant";
import { hasPermission } from "@/lib/admin-access";
import {
  getSignupIntentPlanLabel,
  readSignupIntentFromParams,
  signupIntentToQuery,
} from "@/lib/signup-intent";
import { toast } from "sonner";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { RealtimePill } from "@/components/dashboard/realtime-pill";
import { SingleImageUpload } from "@/components/upload/single-image-upload";
import {
  AdminSurfaceEmpty,
  AdminSurfaceError,
} from "@/components/dashboard/admin-surface-state";
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

type DecisionPulseItem = {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: LucideIcon;
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
  return parsed
    ? format(parsed, "yyyy-MM-dd") === format(target, "yyyy-MM-dd")
    : false;
};

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user: sessionUser, tenantSlug } = useAdminSession();
  const signupIntent = useMemo(
    () => readSignupIntentFromParams(searchParams),
    [searchParams],
  );
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [actionFeed, setActionFeed] = useState<ActionFeedRow[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(
    null,
  );
  const [onboardingSummary, setOnboardingSummary] =
    useState<OnboardingSummaryResponse | null>(null);
  const [customersCount, setCustomersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string>("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [bannerUrl, setBannerUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [showWelcomeSuccess, setShowWelcomeSuccess] = useState(false);
  const hasLoadedRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);

  const role = String(sessionUser?.role || "staff").toLowerCase();
  const permissions = useMemo(
    () => sessionUser?.permission_keys || [],
    [sessionUser?.permission_keys],
  );
  const tenantId = sessionUser?.tenant_id || "";
  const ownerOnly = role === "owner";
  const canReadBookings =
    ownerOnly ||
    hasPermission({ role, permission_keys: permissions }, "bookings.read");
  const canManageResources =
    ownerOnly ||
    hasPermission({ role, permission_keys: permissions }, "resources.read");
  const canReadCustomers =
    ownerOnly ||
    hasPermission({ role, permission_keys: permissions }, "customers.read");
  const canManageExpenses =
    ownerOnly ||
    hasPermission({ role, permission_keys: permissions }, "expenses.read");
  const canManagePos =
    ownerOnly ||
    hasPermission({ role, permission_keys: permissions }, "pos.read");

  const fetchDashboard = useCallback(
    async (mode: "initial" | "background" = "initial") => {
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

        const [
          resourcesRes,
          sessionsRes,
          bookingsRes,
          customersRes,
          actionFeedRes,
        ] = await Promise.allSettled([
          allowResources
            ? api.get("/admin/resources/summary")
            : Promise.resolve(null),
          allowBookings
            ? api.get("/bookings/pos/active")
            : Promise.resolve(null),
          allowBookings ? api.get("/bookings") : Promise.resolve(null),
          allowCustomers ? api.get("/customers/count") : Promise.resolve(null),
          allowPos
            ? api.get("/pos/action-feed?window_minutes=360&limit=80")
            : Promise.resolve(null),
        ]);

        setResources(
          resourcesRes.status === "fulfilled"
            ? resourcesRes.value?.data?.items || []
            : [],
        );
        setSessions(
          sessionsRes.status === "fulfilled"
            ? sessionsRes.value?.data || []
            : [],
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
        setLoadError(false);

        if (ownerOnly) {
          const [subscriptionRes, onboardingRes] = await Promise.allSettled([
            api.get("/billing/subscription"),
            api.get("/admin/tenant/onboarding-summary"),
          ]);
          setSubscription(
            subscriptionRes.status === "fulfilled"
              ? subscriptionRes.value.data || null
              : null,
          );
          setOnboardingSummary(
            onboardingRes.status === "fulfilled"
              ? onboardingRes.value.data || null
              : null,
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
          setLoadError(true);
        }
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
    },
    [ownerOnly, permissions, role],
  );

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
    const actionRequiredCount = actionFeed.length;
    const verificationCount = actionFeed.filter(
      (item) =>
        String(item.payment_status || "").toLowerCase() ===
        "awaiting_verification",
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
        if (!bookingDate || format(bookingDate, "yyyy-MM-dd") !== key)
          return sum;
        return sum + getBookingTotal(booking);
      }, 0);
      const addonRevenue = bookings.reduce((sum, booking) => {
        const rawDate = booking.start_time || booking.created_at;
        const bookingDate = parseSafeDate(rawDate);
        if (!bookingDate || format(bookingDate, "yyyy-MM-dd") !== key)
          return sum;
        return sum + Number(booking.total_fnb || 0);
      }, 0);
      const resourceRevenue = Math.max(revenue - addonRevenue, 0);
      const sessionsCount = sessions.filter((session) => {
        const dateValue = parseSafeDate(
          session.start_time || session.created_at,
        );
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

  const weeklySummary = useMemo(() => {
    const totalRevenue = weeklyRevenuePoints.reduce(
      (sum, point) => sum + point.primary,
      0,
    );
    const activeDays = weeklyRevenuePoints.filter(
      (point) => point.primary > 0,
    ).length;
    const peakPoint = weeklyRevenuePoints.reduce(
      (best, point) => (point.primary > best.primary ? point : best),
      weeklyRevenuePoints[0] || {
        label: "-",
        primary: 0,
        secondary: 0,
        meta: "",
      },
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
        hint:
          metrics.verificationCount > 0
            ? `${metrics.verificationCount} verifikasi`
            : "Perlu dicek",
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

  const recentTransactionRows = useMemo(
    () =>
      topBookings.slice(0, 4).map((booking) => {
        const bookedAt = parseSafeDate(
          booking.start_time || booking.created_at,
        );
        return {
          id: booking.id,
          customerName: booking.customer_name || "Guest",
          resourceName: booking.resource_name || "Tanpa resource",
          total: `Rp ${formatIDR(getBookingTotal(booking))}`,
          detailTime: bookedAt ? format(bookedAt, "dd MMM • HH:mm") : "-",
          status: String(booking.status || "pending"),
        };
      }),
    [topBookings],
  );

  const decisionPulseItems = useMemo<DecisionPulseItem[]>(() => {
    const items: DecisionPulseItem[] = [];

    if (canManagePos && metrics.verificationCount > 0) {
      items.push({
        label: "Verifikasi pembayaran",
        value: `${metrics.verificationCount} menunggu`,
        detail: "Cek pembayaran manual yang belum disetujui.",
        href: "/admin/pos",
        icon: Sparkles,
      });
    } else if (canManagePos && metrics.actionRequiredCount > 0) {
      items.push({
        label: "Antrian operasional",
        value: `${metrics.actionRequiredCount} aksi`,
        detail: "Ada sesi atau pembayaran yang perlu dituntaskan.",
        href: "/admin/pos",
        icon: Clock3,
      });
    }

    if (canReadBookings) {
      items.push({
        label: "Booking hari ini",
        value: `${metrics.todayBookings} booking`,
        detail:
          metrics.activeSessions > 0
            ? `${metrics.activeSessions} sesi sedang berjalan.`
            : "Belum ada sesi live saat ini.",
        href: "/admin/bookings",
        icon: CalendarClock,
      });
    }

    if (canManageResources) {
      items.push({
        label: "Okupansi live",
        value: `${metrics.occupiedPercent}%`,
        detail: `${metrics.availableResources}/${metrics.totalResources} unit masih siap dipakai.`,
        href: "/admin/resources",
        icon: Monitor,
      });
    }

    if (ownerOnly) {
      items.push({
        label: "Pace 7 hari",
        value: `Rp ${formatIDR(weeklySummary.totalRevenue)}`,
        detail: `Puncak di ${weeklySummary.peakLabel} dengan Rp ${formatIDR(weeklySummary.peakRevenue)}.`,
        href: "/admin/analytics",
        icon: TrendingUp,
      });
    }

    return items.slice(0, 3);
  }, [
    canManagePos,
    canManageResources,
    canReadBookings,
    metrics.actionRequiredCount,
    metrics.activeSessions,
    metrics.availableResources,
    metrics.occupiedPercent,
    metrics.todayBookings,
    metrics.totalResources,
    metrics.verificationCount,
    ownerOnly,
    weeklySummary.peakLabel,
    weeklySummary.peakRevenue,
    weeklySummary.totalRevenue,
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

  const completedOnboardingSteps = onboardingSteps.filter(
    (step) => step.complete,
  ).length;
  const requiredOnboardingSteps = onboardingSteps.filter(
    (step) => step.required,
  );
  const requiredOnboardingIncomplete = requiredOnboardingSteps.some(
    (step) => !step.complete,
  );
  const onboardingProgress =
    onboardingSummary?.progress_percent ??
    (onboardingSteps.length
      ? Math.round((completedOnboardingSteps / onboardingSteps.length) * 100)
      : 100);
  const onboardingDismissKey = tenantId
    ? `tenant-onboarding-dismissed:${tenantId}`
    : "";
  const onboardingWelcome = searchParams.get("welcome") === "1";
  const intendedPlanLabel = getSignupIntentPlanLabel(signupIntent);
  const intendedIntervalLabel =
    signupIntent.interval === "monthly" ? "bulanan" : "tahunan";
  const intendedCheckoutQuery = signupIntentToQuery({
    ...signupIntent,
    interval: signupIntent.interval || "annual",
  }).toString();
  const intendedBillingHref = signupIntent.plan
    ? `/admin/settings/billing/subscribe/checkout?${intendedCheckoutQuery}`
    : "/admin/settings/billing/subscribe";
  const hasOperationalData =
    resources.length > 0 ||
    sessions.length > 0 ||
    bookings.length > 0 ||
    actionFeed.length > 0 ||
    customersCount > 0;
  const firstRunOwnerMode =
    ownerOnly && (onboardingWelcome || !hasOperationalData);

  const dismissWelcomeDialog = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (!nextParams.has("welcome")) return;

    nextParams.delete("welcome");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  const handleWelcomeSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      dismissWelcomeDialog();
      setShowWelcomeSuccess(true);
    },
    [dismissWelcomeDialog],
  );

  const quickActions = ownerOnly
    ? [
        { href: "/admin/bookings", label: "Bookings", icon: CalendarClock },
        { href: "/admin/pos", label: "POS", icon: Sparkles },
        { href: "/admin/resources", label: "Resources", icon: Monitor },
        ...(firstRunOwnerMode
          ? []
          : [
              {
                href: "/admin/analytics",
                label: "Analytics",
                icon: PanelsTopLeft,
              },
            ]),
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
      ].filter(Boolean) as Array<{
        href: string;
        label: string;
        icon: LucideIcon;
      }>);

  const resourceRows = useMemo(() => {
    const maxRevenue = Math.max(
      ...resourceStats.map((item) => item.revenueToday),
      1,
    );
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
    const maxTotal = Math.max(
      ...topBookings.map((item) => getBookingTotal(item)),
      1,
    );
    return topBookings.map((booking) => ({
      id: booking.id,
      title: booking.customer_name || "Guest",
      subtitle: `${booking.resource_name || "-"} • ${
        parseSafeDate(booking.start_time || booking.created_at)
          ? format(
              parseSafeDate(booking.start_time || booking.created_at) ||
                new Date(),
              "dd MMM HH:mm",
            )
          : "-"
      }`,
      value: ownerOnly ? `Rp ${formatIDR(getBookingTotal(booking))}` : "Live",
      meta: String(booking.status || "active").toUpperCase(),
      progress: (getBookingTotal(booking) / maxTotal) * 100,
    }));
  }, [ownerOnly, topBookings]);

  return (
    <div className="space-y-3 px-3 pb-20 pt-3 font-plus-jakarta md:px-5">
      <div className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-3 shadow-[var(--admin-shadow-soft)] sm:p-3.5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-medium uppercase text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {ownerOnly ? "Owner" : "Staff"}
              </Badge>
              <Badge className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-medium uppercase text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {refreshing ? "Refreshing..." : `Sync ${lastSyncAt || "--:--"}`}
              </Badge>
              <RealtimePill
                connected={realtimeConnected}
                status={realtimeStatus}
              />
            </div>
            <div>
              <h1 className="text-[1.65rem] font-semibold leading-none text-slate-950 dark:text-white sm:text-[1.75rem]">
                Dashboard
              </h1>
              <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
                Ringkasan operasional hari ini.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => void fetchDashboard("background")}
              variant="outline"
              className="h-9 rounded-xl px-3 text-sm"
            >
              <RefreshCcw
                className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")}
              />
              Refresh
            </Button>
            {quickActions.map((action) => (
              <Button
                key={action.href}
                asChild
                variant="outline"
                className="h-9 rounded-xl px-3 text-sm"
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

      {ownerOnly && onboardingWelcome ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) {
              dismissWelcomeDialog();
            }
          }}
        >
          <DialogContent className="!w-[min(95vw,48rem)] !max-w-none overflow-hidden border-slate-200 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
            <div className="flex max-h-[calc(100vh-2rem)] min-h-0 flex-col overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-5 sm:px-6 sm:py-6">
                <DialogHeader className="space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Setup pertama
                  </div>
                  <DialogTitle className="text-2xl leading-tight">
                    Isi halaman publik
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-6 text-slate-500">
                    Tambahkan yang pertama kali dilihat customer.
                  </DialogDescription>
                </DialogHeader>
              </div>

            <form
              className="flex-1 min-h-0 overflow-y-auto px-5 py-5 sm:px-6"
              onSubmit={handleWelcomeSubmit}
            >
              <div className="space-y-5">
                <div className="grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-900">
                        Slogan
                      </span>
                      <input
                        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        placeholder="Booking cepat, rapi, langsung jalan"
                      />
                      <span className="text-xs leading-5 text-slate-500">
                        Tampil di hero paling atas.
                      </span>
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        Headline
                      </span>
                      <input
                        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        placeholder="Booking lebih cepat di sini"
                      />
                      <span className="text-xs leading-5 text-slate-500">
                        Judul utama landing page.
                      </span>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        Deskripsi singkat
                      </span>
                      <textarea
                        className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        placeholder="Jelaskan bisnis kamu dalam 1-2 kalimat."
                      />
                      <span className="text-xs leading-5 text-slate-500">
                        Muncul tepat di bawah headline.
                      </span>
                    </label>

                    <div className="space-y-4">
                      <SingleImageUpload
                        value={bannerUrl}
                        onChange={setBannerUrl}
                        endpoint="/admin/upload"
                        label="Banner"
                        emptyTitle="Upload banner"
                        emptyHint="Tampil di hero public"
                        aspect="video"
                        uploadPreset="media"
                      />
                      <SingleImageUpload
                        value={logoUrl}
                        onChange={setLogoUrl}
                        endpoint="/admin/upload"
                        label="Logo"
                        emptyTitle="Upload logo"
                        emptyHint="Tampil di header dan identitas bisnis"
                        aspect="square"
                        className="mx-auto w-[40%]"
                        uploadPreset="media"
                      />
                    </div>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        Selling points
                      </span>
                      <input
                        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        placeholder="Contoh: AC dingin, booking real-time, lokasi strategis"
                      />
                      <span className="text-xs leading-5 text-slate-500">
                        Muncul sebagai poin keunggulan di landing.
                      </span>
                    </label>

                    <div className="grid gap-3 pt-1 sm:grid-cols-[1fr_auto]">
                      <Button type="submit" className="h-12 w-full rounded-2xl">
                        Simpan
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-12 rounded-2xl px-4"
                        onClick={dismissWelcomeDialog}
                      >
                        Nanti
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      <Dialog open={showWelcomeSuccess} onOpenChange={setShowWelcomeSuccess}>
        <DialogContent className="!w-[min(92vw,32rem)] !max-w-none border-slate-200 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
          <div className="space-y-5 px-5 py-6 sm:px-6">
            <DialogHeader className="space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-500">
                Berhasil disimpan
              </div>
              <DialogTitle className="text-2xl leading-tight">
                Website booking kamu siap dipakai
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-500">
                Setting minimum sudah tersimpan. Cek hasilnya di halaman publik tenant.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-950">
              Konten hero, banner, logo, dan selling points sekarang bisa dilihat customer.
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Button asChild className="h-12 w-full rounded-2xl">
                <Link href={tenantSlug ? getTenantUrl(tenantSlug) : "/"} prefetch={false}>
                  Buka halaman publik
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-12 rounded-2xl px-4"
                onClick={() => setShowWelcomeSuccess(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {ownerOnly && showOnboarding && onboardingSteps.length ? (
        <DashboardPanel
          eyebrow="Onboarding owner"
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
                  Fokus dulu ke identitas bisnis dan katalog resource. Dua area
                  ini paling berpengaruh ke rasa “siap live”.
                </p>
                <p>
                  Begitu itu rapi, owner biasanya jauh lebih enak lanjut ke
                  metode bayar dan page builder.
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

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
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

      {loadError && !hasLoadedRef.current ? (
        <AdminSurfaceError
          title="Dashboard gagal dimuat"
          description="Semua panel dashboard bergantung pada data operasional awal. Muat ulang sebelum memakai angka di halaman ini."
          action={
            <Button
              onClick={() => void fetchDashboard("initial")}
              variant="outline"
              className="rounded-xl"
            >
              Coba lagi
            </Button>
          }
        />
      ) : !loading && !hasOperationalData ? (
        <AdminSurfaceEmpty
          title="Belum ada aktivitas operasional"
          description="Dashboard belum perlu dibaca dalam mode analitik. Isi dulu area kerja inti: resource, booking, dan POS."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild className="rounded-xl">
                <Link href="/admin/resources" prefetch={false}>
                  Tambah resource
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/admin/bookings" prefetch={false}>
                  Buka bookings
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/admin/pos" prefetch={false}>
                  Buka POS
                </Link>
              </Button>
            </div>
          }
        />
      ) : firstRunOwnerMode ? (
        <section className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
          <DashboardPanel
            eyebrow="Fokus sekarang"
            title="Satu pintu operasional"
            description="Owner baru tidak perlu baca semua modul dulu. Jalankan alur inti dari sini."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {decisionPulseItems.length ? (
                decisionPulseItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    prefetch={false}
                    className="group rounded-xl border border-[var(--admin-line-soft)] bg-[var(--admin-surface-soft)] p-4 transition hover:border-slate-300 hover:bg-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900/60"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[rgba(74,141,255,0.12)] dark:text-[var(--bookinaja-200)]">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-950 dark:text-white">
                          {item.label}
                        </div>
                        <div className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
                          {item.value}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {item.detail}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400 sm:col-span-2">
                  Belum ada sinyal operasional penting. Artinya setup awal sudah
                  cukup aman untuk mulai terima booking.
                </div>
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel
            eyebrow="Aksi berikutnya"
            title="Lanjutkan tanpa bingung"
            description="Pilih satu aksi yang paling masuk akal untuk owner baru."
          >
            <div className="space-y-2.5">
              <Link
                href="/admin/bookings/new"
                prefetch={false}
                className="flex items-center justify-between rounded-xl border border-[var(--admin-line-soft)] bg-[var(--admin-surface-soft)] px-4 py-3 transition hover:border-slate-300 hover:bg-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900/60"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    Input booking manual
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Kalau owner mau simulasi ringan, lakukan dari flow booking
                    asli.
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                href="/admin/resources"
                prefetch={false}
                className="flex items-center justify-between rounded-xl border border-[var(--admin-line-soft)] bg-[var(--admin-surface-soft)] px-4 py-3 transition hover:border-slate-300 hover:bg-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900/60"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    Rapikan resource & harga
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Pastikan unit dan paket utama sudah benar sebelum live.
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                href={intendedBillingHref}
                prefetch={false}
                className="flex items-center justify-between rounded-xl border border-[var(--admin-line-soft)] bg-[var(--admin-surface-soft)] px-4 py-3 transition hover:border-slate-300 hover:bg-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900/60"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    {signupIntent.plan
                      ? `Lanjut billing ${intendedPlanLabel} ${intendedIntervalLabel}`
                      : "Pilih paket berlangganan"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Masuk ke billing setelah area operasional inti terasa jelas.
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </DashboardPanel>
        </section>
      ) : (
        <>
          <section className="grid gap-3 xl:grid-cols-[1.45fr_0.72fr]">
            <div className="space-y-3">
              <DashboardLineChartPanel
                eyebrow="7 hari"
                title="Pendapatan 7 hari"
                description="Pantau pendapatan harian dan transaksi utama dari satu grafik."
                points={weeklyRevenuePoints}
                primaryLabel="Pendapatan"
                secondaryLabel="Transaksi utama"
                formatValue={(value) => `Rp ${formatIDR(value)}`}
              />
              <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
                <InfoChip
                  label="Total 7 hari"
                  value={`Rp ${formatIDR(weeklySummary.totalRevenue)}`}
                  icon={Wallet}
                />
                <InfoChip
                  label="Hari aktif"
                  value={`${weeklySummary.activeDays}/7`}
                  icon={CalendarClock}
                />
                <InfoChip
                  label="Puncak"
                  value={`${weeklySummary.peakLabel} · Rp ${formatIDR(weeklySummary.peakRevenue)}`}
                  icon={TrendingUp}
                />
              </div>
            </div>

            <div className="space-y-3">
              <DashboardPanel
                eyebrow="Prioritas"
                title="Perlu ditindaklanjuti"
                description="Hal penting yang sebaiknya dicek dulu oleh admin."
              >
                <div className="space-y-2.5">
                  {decisionPulseItems.length ? (
                    decisionPulseItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        prefetch={false}
                        className="group block rounded-xl border border-[var(--admin-line-soft)] bg-[var(--admin-surface-soft)] px-3 py-3 transition hover:border-slate-300 hover:bg-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900/60"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[rgba(74,141,255,0.12)] dark:text-[var(--bookinaja-200)]">
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                                  {item.label}
                                </div>
                                <div className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                  {item.detail}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                                  {item.value}
                                </div>
                                <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                                  Buka
                                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
                      Belum ada sinyal penting yang perlu dibuka sekarang.
                    </div>
                  )}
                </div>
              </DashboardPanel>

              {ownerOnly ? (
                <DashboardPanel
                  eyebrow="Transaksi"
                  title="Transaksi terbaru"
                  description="Buka detail booking terakhir tanpa pindah lewat list panjang."
                >
                  <div className="space-y-2.5">
                    {recentTransactionRows.length ? (
                      recentTransactionRows.map((transaction) => (
                        <Link
                          key={transaction.id}
                          href={`/admin/bookings/${transaction.id}`}
                          prefetch={false}
                          className="group block rounded-xl border border-[var(--admin-line-soft)] bg-[var(--admin-surface-soft)] px-3 py-2.5 transition hover:border-slate-300 hover:bg-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900/60"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                                {transaction.customerName}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                {transaction.resourceName}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-sm font-semibold text-slate-950 dark:text-white">
                                {transaction.total}
                              </div>
                              <div className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                {transaction.status}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-3 border-t border-[var(--admin-line-soft)] pt-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{transaction.detailTime}</span>
                            <span className="inline-flex items-center gap-1 font-medium text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                              Detail
                              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                            </span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
                        Belum ada transaksi terbaru.
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button asChild variant="outline">
                      <Link href="/admin/bookings" prefetch={false}>
                        Lihat semua booking
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </DashboardPanel>
              ) : (
                <DashboardPanel
                  eyebrow="Ringkasan"
                  title="Ringkasan cepat"
                  description="Konteks singkat untuk baca kondisi tenant saat ini."
                >
                  <div className="grid grid-cols-2 gap-3">
                    <InfoChip
                      label="Okupansi"
                      value={`${metrics.occupiedPercent}%`}
                      icon={TrendingUp}
                    />
                    <InfoChip
                      label="Resource siap"
                      value={String(metrics.availableResources)}
                      icon={Monitor}
                    />
                    <InfoChip
                      label="Customer"
                      value={customersCount.toString()}
                      icon={Users}
                    />
                    <InfoChip
                      label="Verifikasi"
                      value={String(metrics.verificationCount)}
                      icon={Sparkles}
                    />
                  </div>
                </DashboardPanel>
              )}
            </div>
          </section>

          <section className="grid gap-3 xl:grid-cols-[1fr_1fr]">
            <DashboardLeaderboardPanel
              eyebrow="Resource"
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
              eyebrow="Booking"
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
                Saat ini akun ini belum memiliki modul operasional tambahan yang
                bisa dibuka.
              </div>
            </DashboardPanel>
          ) : null}
        </>
      )}
    </div>
  );
}

function FirstRunCard({
  label,
  value,
  detail,
  href,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group rounded-xl border border-[var(--admin-line-soft)] bg-[var(--admin-surface-soft)] p-4 transition hover:border-slate-300 hover:bg-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {value}
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[rgba(74,141,255,0.12)] dark:text-[var(--bookinaja-200)]">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {detail}
      </div>
      <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
        Buka
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
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
    <div className="rounded-xl border border-[var(--admin-line-soft)] bg-[var(--admin-surface-soft)] px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
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
    indigo:
      "bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[rgba(74,141,255,0.12)] dark:text-[var(--bookinaja-200)]",
    emerald:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200",
    amber:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-200",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/12 dark:text-cyan-200",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200",
  };

  return (
    <div className="rounded-2xl border border-[var(--admin-line-soft)] bg-[var(--admin-surface)] p-3 shadow-[var(--admin-shadow-soft)] sm:p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white sm:text-2xl">
            {loading ? "..." : value}
          </div>
          {hint ? (
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {hint}
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            toneClass[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
