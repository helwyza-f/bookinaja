"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ImagePlus,
  MessageCircle,
  Monitor,
  PanelsTopLeft,
  RefreshCcw,
  Sparkles,
  Timer,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
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
import { copyToClipboard } from "@/lib/clipboard";
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
import {
  defaultTenantProfile,
  type TenantProfile,
} from "../settings/bisnis/sections/types";
import {
  DEFAULT_PAGE_BUILDER_CONFIG,
  normalizePageBuilderConfig,
  type LandingPageConfig,
} from "@/lib/page-builder";

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

type WelcomeExample = {
  label: string;
  slogan: string;
  tagline: string;
  about_us: string;
  features: string[];
};

const WELCOME_EXAMPLES: Record<string, WelcomeExample> = {
  gaming_hub: {
    label: "Contoh gaming",
    slogan: "Booking gaming room tanpa ribet",
    tagline: "Pilih slot, datang, lalu langsung main",
    about_us:
      "Customer bisa cek jadwal, pilih perangkat, dan booking lebih cepat tanpa chat bolak-balik.",
    features: ["Slot real-time", "Perangkat siap pakai", "Cocok untuk mabar"],
  },
  creative_space: {
    label: "Contoh studio",
    slogan: "Booking studio jadi lebih jelas",
    tagline: "Pilih sesi yang pas lalu langsung produksi",
    about_us:
      "Halaman publik membantu customer memahami studio kamu, lihat visual utama, lalu booking tanpa banyak tanya.",
    features: ["Visual studio jelas", "Sesi mudah dipilih", "Cocok untuk konten dan foto"],
  },
  sport_center: {
    label: "Contoh sport",
    slogan: "Booking lapangan lebih cepat",
    tagline: "Cek jam kosong dan amankan slot main kamu",
    about_us:
      "Customer bisa langsung lihat jadwal, pilih durasi, dan booking tanpa proses manual yang panjang.",
    features: ["Jadwal jelas", "Booking lebih singkat", "Cocok untuk main rutin"],
  },
  social_space: {
    label: "Contoh ruang",
    slogan: "Sewa ruang jadi lebih rapi",
    tagline: "Cari ruang yang pas lalu booking dalam beberapa langkah",
    about_us:
      "Dipakai untuk meeting room, coworking, dan event kecil dengan alur booking yang lebih mudah dipahami.",
    features: ["Info ruang singkat", "Durasi mudah dipahami", "Cocok untuk tim kecil"],
  },
  default: {
    label: "Contoh umum",
    slogan: "Booking lebih cepat dan lebih jelas",
    tagline: "Pilih layanan, lihat slot, lalu booking tanpa ribet",
    about_us:
      "Halaman publik membantu customer memahami bisnis kamu lebih cepat sebelum lanjut booking.",
    features: ["Info utama singkat", "Alur booking lebih ringkas", "Tampil lebih meyakinkan"],
  },
};

type WelcomeDraftPayload = {
  profile: TenantProfile;
  featureInput: string;
  heroDescription: string;
};

function syncWelcomeContentIntoLandingConfig(
  input: LandingPageConfig | null | undefined,
  patch: { tagline: string; heroDescription: string },
): LandingPageConfig {
  const pageConfig = normalizePageBuilderConfig(input || DEFAULT_PAGE_BUILDER_CONFIG);

  return {
    ...pageConfig,
    sections: pageConfig.sections.map((section) => {
      if (section.type !== "hero") return section;
      return {
        ...section,
        props: {
          ...(section.props || {}),
          tagline: patch.tagline,
          description: patch.heroDescription,
        },
      };
    }),
  };
}

function readHeroDescriptionFromLandingConfig(
  input: LandingPageConfig | null | undefined,
) {
  const pageConfig = normalizePageBuilderConfig(input || DEFAULT_PAGE_BUILDER_CONFIG);
  const heroSection = pageConfig.sections.find((section) => section.type === "hero");
  return String(heroSection?.props?.description || "");
}

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
  const { user: sessionUser, tenantCategory, tenantSlug } = useAdminSession();
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
  const [welcomeProfile, setWelcomeProfile] =
    useState<TenantProfile>(defaultTenantProfile);
  const [welcomeSaving, setWelcomeSaving] = useState(false);
  const [welcomeLoading, setWelcomeLoading] = useState(false);
  const [welcomeFeatureInput, setWelcomeFeatureInput] = useState("");
  const [welcomeHeroDescription, setWelcomeHeroDescription] = useState("");
  const [showWelcomeSuccess, setShowWelcomeSuccess] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
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

  const greetingName = useMemo(() => {
    const raw = String(sessionUser?.name || "").trim();
    if (!raw) return ownerOnly ? "Owner" : "Tim";
    return raw.split(" ")[0];
  }, [sessionUser?.name, ownerOnly]);

  const greetingTime = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat pagi";
    if (hour < 15) return "Selamat siang";
    if (hour < 19) return "Selamat sore";
    return "Selamat malam";
  }, []);

  const revenueComparison = useMemo(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayRevenue = bookings
      .filter((booking) =>
        isSameDay(booking.start_time || booking.created_at, yesterday),
      )
      .reduce((sum, booking) => sum + getBookingTotal(booking), 0);
    const delta = metrics.todayRevenue - yesterdayRevenue;
    const percent =
      yesterdayRevenue > 0 ? Math.round((delta / yesterdayRevenue) * 100) : null;
    return { yesterdayRevenue, delta, percent };
  }, [bookings, metrics.todayRevenue]);

  const liveSessions = useMemo(() => {
    const now = Date.now();
    return sessions
      .map((session) => {
        const end = parseSafeDate(session.end_time);
        const remainingMin = end
          ? Math.round((end.getTime() - now) / 60000)
          : null;
        return {
          id: session.id,
          resourceName: session.resource_name || "Tanpa unit",
          customerName: session.customer_name || "Guest",
          endLabel: end ? format(end, "HH:mm") : null,
          remainingMin,
        };
      })
      .sort(
        (a, b) =>
          (a.remainingMin ?? Number.POSITIVE_INFINITY) -
          (b.remainingMin ?? Number.POSITIVE_INFINITY),
      );
  }, [sessions]);

  const overtimeSessions = useMemo(
    () =>
      liveSessions.filter(
        (session) => session.remainingMin != null && session.remainingMin < 0,
      ).length,
    [liveSessions],
  );

  type ActionTone = "amber" | "rose" | "sky";
  const actionQueue = useMemo(() => {
    const items: Array<{
      label: string;
      value: string;
      detail: string;
      href: string;
      icon: LucideIcon;
      tone: ActionTone;
    }> = [];

    if (canManagePos && metrics.verificationCount > 0) {
      items.push({
        label: "Verifikasi pembayaran",
        value: String(metrics.verificationCount),
        detail: "Bukti bayar manual menunggu persetujuan.",
        href: "/admin/pos",
        icon: CheckCircle2,
        tone: "amber",
      });
    }

    const otherActions = Math.max(
      0,
      metrics.actionRequiredCount - metrics.verificationCount,
    );
    if (canManagePos && otherActions > 0) {
      items.push({
        label: "Antrian POS",
        value: String(otherActions),
        detail: "Sesi atau pembayaran yang perlu dituntaskan.",
        href: "/admin/pos",
        icon: Clock3,
        tone: "sky",
      });
    }

    if (canReadBookings && overtimeSessions > 0) {
      items.push({
        label: "Sesi lewat waktu",
        value: String(overtimeSessions),
        detail: "Sudah melewati jam selesai, cek untuk closing.",
        href: "/admin/bookings",
        icon: AlertCircle,
        tone: "rose",
      });
    }

    return items;
  }, [
    canManagePos,
    canReadBookings,
    metrics.actionRequiredCount,
    metrics.verificationCount,
    overtimeSessions,
  ]);

  const glanceStats = useMemo<CompactMetric[]>(() => {
    const items: CompactMetric[] = [];

    if (canReadBookings) {
      items.push({
        label: "Booking hari ini",
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
    }

    if (canReadCustomers) {
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
    metrics.totalResources,
    metrics.verificationCount,
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
  const onboardingProgress =
    onboardingSummary?.progress_percent ??
    (onboardingSteps.length
      ? Math.round((completedOnboardingSteps / onboardingSteps.length) * 100)
      : 100);
  const onboardingDismissKey = tenantId
    ? `tenant-onboarding-dismissed:${tenantId}`
    : "";
  const welcomeDraftKey = tenantId
    ? `tenant-welcome-draft:${tenantId}`
    : "";
  const onboardingWelcome = searchParams.get("welcome") === "1";
  const welcomeExample = useMemo(() => {
    const normalized = String(tenantCategory || "").trim().toLowerCase();
    return WELCOME_EXAMPLES[normalized] || WELCOME_EXAMPLES.default;
  }, [tenantCategory]);
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

  const fetchWelcomeProfile = useCallback(async () => {
    setWelcomeLoading(true);
    try {
      const res = await api.get<TenantProfile>("/admin/profile");
      const nextProfile = {
        ...defaultTenantProfile,
        ...(res.data || {}),
      };

      if (typeof window !== "undefined" && welcomeDraftKey) {
        const rawDraft = window.sessionStorage.getItem(welcomeDraftKey);
        if (rawDraft) {
          try {
            const draft = JSON.parse(rawDraft) as Partial<WelcomeDraftPayload>;
            setWelcomeProfile({
              ...nextProfile,
              ...(draft.profile || {}),
            });
            setWelcomeFeatureInput(draft.featureInput || "");
            setWelcomeHeroDescription(
              draft.heroDescription ||
                readHeroDescriptionFromLandingConfig(
                  nextProfile.landing_page_config as
                    | LandingPageConfig
                    | null
                    | undefined,
                ) ||
                "",
            );
            return;
          } catch {}
        }
      }

      setWelcomeProfile(nextProfile);
      setWelcomeHeroDescription(
        readHeroDescriptionFromLandingConfig(
          nextProfile.landing_page_config as
            | LandingPageConfig
            | null
            | undefined,
        ) || "",
      );
    } catch {
      toast.error("Gagal memuat identitas bisnis");
    } finally {
      setWelcomeLoading(false);
    }
  }, [welcomeDraftKey]);

  useEffect(() => {
    if (!ownerOnly || !onboardingWelcome) return;
    void fetchWelcomeProfile();
  }, [fetchWelcomeProfile, onboardingWelcome, ownerOnly]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !ownerOnly ||
      !onboardingWelcome ||
      !welcomeDraftKey
    ) {
      return;
    }

    const payload: WelcomeDraftPayload = {
      profile: welcomeProfile,
      featureInput: welcomeFeatureInput,
      heroDescription: welcomeHeroDescription,
    };
    window.sessionStorage.setItem(welcomeDraftKey, JSON.stringify(payload));
  }, [
    onboardingWelcome,
    ownerOnly,
    welcomeDraftKey,
    welcomeFeatureInput,
    welcomeHeroDescription,
    welcomeProfile,
  ]);

  const applyWelcomeExample = useCallback(() => {
    setWelcomeProfile((current) => ({
      ...current,
      slogan: current.slogan || welcomeExample.slogan,
      tagline: current.tagline || welcomeExample.tagline,
      about_us: current.about_us || welcomeExample.about_us,
      features:
        current.features.length > 0 ? current.features : welcomeExample.features,
    }));
  }, [welcomeExample]);

  const removeWelcomeFeature = useCallback((index: number) => {
    setWelcomeProfile((current) => ({
      ...current,
      features: current.features.filter((_, itemIndex) => itemIndex !== index),
    }));
  }, []);

  const addWelcomeFeature = useCallback(() => {
    const nextFeature = welcomeFeatureInput.trim();
    if (!nextFeature) return;
    setWelcomeProfile((current) => ({
      ...current,
      features: [...current.features, nextFeature],
    }));
    setWelcomeFeatureInput("");
  }, [welcomeFeatureInput]);

  const handleWelcomeSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (
        !welcomeProfile.tagline.trim() ||
        !welcomeHeroDescription.trim() ||
        !welcomeProfile.about_us.trim() ||
        welcomeProfile.features.filter(Boolean).length === 0
      ) {
        toast.error("Isi headline hero, deskripsi hero, penjelasan bisnis, dan minimal 1 keunggulan.");
        return;
      }

      setWelcomeSaving(true);
      try {
        const currentProfileRes = await api.get<TenantProfile>("/admin/profile");
        const currentProfile = {
          ...defaultTenantProfile,
          ...(currentProfileRes.data || {}),
        };
        const nextTagline = welcomeProfile.tagline.trim();
        const nextHeroDescription = welcomeHeroDescription.trim();
        const nextAboutUs = welcomeProfile.about_us.trim();
        const nextFeatures = welcomeProfile.features
          .map((item) => item.trim())
          .filter(Boolean);
        const payload: TenantProfile = {
          ...currentProfile,
          slogan: welcomeProfile.slogan.trim(),
          tagline: nextTagline,
          about_us: nextAboutUs,
          banner_url: welcomeProfile.banner_url,
          logo_url: welcomeProfile.logo_url,
          open_time: welcomeProfile.open_time || currentProfile.open_time,
          close_time: welcomeProfile.close_time || currentProfile.close_time,
          features: nextFeatures,
          landing_page_config: syncWelcomeContentIntoLandingConfig(
            currentProfile.landing_page_config as LandingPageConfig | null | undefined,
            {
              tagline: nextTagline,
              heroDescription: nextHeroDescription,
            },
          ),
        };
        await api.put("/admin/profile", payload);
        if (typeof window !== "undefined" && welcomeDraftKey) {
          window.sessionStorage.removeItem(welcomeDraftKey);
        }
        toast.success("Identitas bisnis berhasil disimpan.");
        dismissWelcomeDialog();
        setShowWelcomeSuccess(true);
      } catch {
        toast.error("Gagal menyimpan identitas bisnis.");
      } finally {
        setWelcomeSaving(false);
      }
    },
    [
      dismissWelcomeDialog,
      welcomeDraftKey,
      welcomeHeroDescription,
      welcomeProfile,
    ],
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
      <section className="overflow-hidden rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-soft)]">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-medium uppercase text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {ownerOnly ? "Owner" : "Staff"}
              </Badge>
              <RealtimePill
                connected={realtimeConnected}
                status={realtimeStatus}
              />
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {refreshing ? "Menyegarkan…" : `Sinkron ${lastSyncAt || "--:--"}`}
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[13px] text-slate-500 dark:text-slate-400">
                {greetingTime}, {greetingName}.
              </p>
              {ownerOnly ? (
                <>
                  <div className="flex flex-wrap items-end gap-3">
                    <h1 className="text-3xl font-semibold leading-none tracking-tight text-slate-950 dark:text-white sm:text-[2.4rem]">
                      Rp {formatIDR(metrics.todayRevenue)}
                    </h1>
                    <DeltaBadge
                      delta={revenueComparison.delta}
                      percent={revenueComparison.percent}
                    />
                  </div>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">
                    Pendapatan hari ini
                    {revenueComparison.yesterdayRevenue > 0
                      ? ` · kemarin Rp ${formatIDR(revenueComparison.yesterdayRevenue)}`
                      : ""}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-end gap-2">
                    <h1 className="text-3xl font-semibold leading-none tracking-tight text-slate-950 dark:text-white sm:text-[2.4rem]">
                      {metrics.activeSessions}
                    </h1>
                    <span className="pb-1 text-base font-medium text-slate-500 dark:text-slate-400">
                      sesi aktif
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">
                    Kondisi lantai hari ini · okupansi {metrics.occupiedPercent}%
                  </p>
                </>
              )}
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

        {glanceStats.length ? (
          <div className="grid grid-cols-2 gap-px border-t border-[var(--admin-line)] bg-[var(--admin-line)] sm:grid-cols-4">
            {glanceStats.map((stat) => (
              <div
                key={stat.label}
                className="bg-[var(--admin-surface)] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    {stat.label}
                  </span>
                  <stat.icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                </div>
                {loading ? (
                  <Skeleton className="mt-2 h-6 w-16 rounded-md" />
                ) : (
                  <>
                    <div className="mt-1.5 text-xl font-semibold text-slate-950 dark:text-white">
                      {stat.value}
                    </div>
                    {stat.hint ? (
                      <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                        {stat.hint}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {ownerOnly && onboardingWelcome ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) dismissWelcomeDialog();
          }}
        >
          <DialogContent className="!w-[min(95vw,48rem)] !max-w-none overflow-hidden border-slate-200 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_30px_80px_rgba(2,6,23,0.55)]">
            <div className="flex max-h-[calc(100vh-2rem)] min-h-0 flex-col overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-5 sm:px-6 sm:py-6 dark:border-slate-800">
                <DialogHeader className="space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Setup cepat
                  </div>
                  <DialogTitle className="text-2xl leading-tight text-slate-950 dark:text-white">
                    Lengkapi identitas bisnis yang dilihat customer
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Ini hanya merapikan permukaan halaman booking kamu. Bukan onboarding kedua.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <form
                className="flex-1 min-h-0 overflow-y-auto px-5 py-5 sm:px-6"
                onSubmit={handleWelcomeSubmit}
              >
                <div className="space-y-5">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm leading-6 text-blue-950 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
                    <div className="font-semibold">Yang kamu isi di sini tampil di halaman publik.</div>
                    <div className="mt-1 text-blue-800 dark:text-blue-200">
                      Visitor akan melihat bagian ini sebelum mereka pilih resource dan lanjut booking.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-950 dark:text-white">
                          {welcomeExample.label}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          Pakai contoh ini kalau kamu belum tahu harus mulai dari copy seperti apa.
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        onClick={applyWelcomeExample}
                      >
                        Pakai contoh
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Kalimat kecil di atas judul
                      </span>
                      <input
                        value={welcomeProfile.slogan}
                        onChange={(event) =>
                          setWelcomeProfile((current) => ({
                            ...current,
                            slogan: event.target.value,
                          }))
                        }
                        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                        placeholder="Contoh: Booking cepat tanpa ribet"
                      />
                      <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Letaknya paling atas di hero. Fungsinya memberi konteks cepat sebelum customer baca judul utama.
                      </span>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Judul utama halaman booking
                      </span>
                      <input
                        value={welcomeProfile.tagline}
                        onChange={(event) =>
                          setWelcomeProfile((current) => ({
                            ...current,
                            tagline: event.target.value,
                          }))
                        }
                        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                        placeholder="Contoh: Pilih slot, booking, lalu langsung datang"
                      />
                      <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Ini teks paling besar yang pertama dilihat visitor. Buat singkat dan langsung menjual alurnya.
                      </span>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Deskripsi hero
                      </span>
                      <textarea
                        value={welcomeHeroDescription}
                        onChange={(event) =>
                          setWelcomeHeroDescription(event.target.value)
                        }
                        className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                        placeholder="Contoh: Customer bisa cek jadwal, pilih perangkat, lalu booking lebih cepat tanpa chat bolak-balik."
                      />
                      <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Muncul tepat di bawah judul hero pada section paling atas halaman publik.
                      </span>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Penjelasan singkat bisnis
                      </span>
                      <textarea
                        value={welcomeProfile.about_us}
                        onChange={(event) =>
                          setWelcomeProfile((current) => ({
                            ...current,
                            about_us: event.target.value,
                          }))
                        }
                        className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                        placeholder="Contoh: Customer bisa cek jadwal, pilih layanan, dan booking langsung dari halaman ini."
                      />
                      <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Ini untuk section “Tentang bisnis ini”, bukan untuk hero. Isi 1-2 kalimat yang menjelaskan bisnis kamu secara umum.
                      </span>
                    </label>

                    <div className="grid gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Jam operasional
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="grid gap-1.5">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Buka</span>
                          <input
                            type="time"
                            value={welcomeProfile.open_time || "09:00"}
                            onChange={(event) =>
                              setWelcomeProfile((current) => ({
                                ...current,
                                open_time: event.target.value,
                              }))
                            }
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                          />
                        </label>
                        <label className="grid gap-1.5">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tutup</span>
                          <input
                            type="time"
                            value={welcomeProfile.close_time || "21:00"}
                            onChange={(event) =>
                              setWelcomeProfile((current) => ({
                                ...current,
                                close_time: event.target.value,
                              }))
                            }
                            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                          />
                        </label>
                      </div>
                      <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Ini menentukan slot jam yang bisa dipilih customer saat booking. Bisa diubah lagi nanti di settings bisnis.
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <SingleImageUpload
                        value={welcomeProfile.banner_url}
                        onChange={(url) =>
                          setWelcomeProfile((current) => ({
                            ...current,
                            banner_url: url,
                          }))
                        }
                        endpoint="/admin/upload"
                        label="Banner utama"
                        emptyTitle="Upload banner"
                        emptyHint="Tampil di hero paling depan"
                        aspect="video"
                        uploadPreset="hero"
                      />
                      <SingleImageUpload
                        value={welcomeProfile.logo_url}
                        onChange={(url) =>
                          setWelcomeProfile((current) => ({
                            ...current,
                            logo_url: url,
                          }))
                        }
                        endpoint="/admin/upload"
                        label="Logo bisnis"
                        emptyTitle="Upload logo"
                        emptyHint="Tampil di header dan identitas bisnis"
                        aspect="square"
                        uploadPreset="logo"
                      />
                    </div>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Keunggulan utama
                      </span>
                      <div className="flex gap-2">
                        <input
                          value={welcomeFeatureInput}
                          onChange={(event) => setWelcomeFeatureInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addWelcomeFeature();
                            }
                          }}
                          className="h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                          placeholder="Contoh: Slot real-time"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 rounded-2xl px-4"
                          onClick={addWelcomeFeature}
                        >
                          Tambah
                        </Button>
                      </div>
                        <div className="flex min-h-12 flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                          {welcomeProfile.features.length === 0 ? (
                            <span className="text-sm text-slate-400 dark:text-slate-500">
                              Belum ada poin keunggulan. Isi 2-3 hal yang paling bikin customer yakin.
                            </span>
                          ) : (
                          welcomeProfile.features.map((feature, index) => (
                            <span
                              key={`${feature}-${index}`}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            >
                              {feature}
                              <button
                                type="button"
                                onClick={() => removeWelcomeFeature(index)}
                                className="rounded-full bg-slate-100 px-1 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                aria-label="Hapus keunggulan"
                              >
                                x
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Poin ini tampil sebagai alasan cepat kenapa visitor harus lanjut booking di tempat kamu.
                      </span>
                    </label>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/70">
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">
                        Nanti masih bisa diedit lagi
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Tidak perlu perfect sekarang. Yang penting halaman publik kamu sudah cukup jelas untuk booking pertama.
                      </div>
                      {tenantSlug ? (
                        <a
                          href={getTenantUrl(tenantSlug)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-xs font-semibold text-slate-700 underline underline-offset-2 dark:text-slate-200"
                        >
                          Lihat halaman publik
                        </a>
                      ) : null}
                    </div>

                    <div className="grid gap-3 pt-1 sm:grid-cols-[1fr_auto]">
                      <Button
                        type="submit"
                        disabled={welcomeSaving || welcomeLoading}
                        className="h-12 w-full rounded-2xl dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400"
                      >
                        {welcomeSaving ? "Menyimpan..." : "Simpan dan lanjut"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-12 rounded-2xl px-4 dark:text-slate-300 dark:hover:bg-slate-900"
                        onClick={dismissWelcomeDialog}
                      >
                        Nanti saja
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
        <DialogContent className="!w-[min(92vw,34rem)] !max-w-none overflow-hidden border-emerald-100 bg-white p-0 shadow-[0_36px_100px_rgba(16,185,129,0.18)] dark:border-emerald-500/20 dark:bg-slate-950 dark:shadow-[0_36px_100px_rgba(2,6,23,0.55)]">
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.24),transparent_65%)]" />
            <div className="absolute -right-8 top-6 h-24 w-24 rounded-full bg-emerald-200/30 blur-2xl" />
            <div className="absolute -left-6 top-14 h-20 w-20 rounded-full bg-blue-200/30 blur-2xl" />

            <div className="relative space-y-5 px-5 py-6 sm:px-6">
              <DialogHeader className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,#ecfdf5_0%,#d1fae5_100%)] shadow-[0_18px_40px_rgba(16,185,129,0.2)] ring-1 ring-emerald-100">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-lg text-white">
                      ✓
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-500 dark:text-emerald-400">
                      Horrey, berhasil
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                      Tampilan awal bisnis kamu sudah naik level
                    </div>
                  </div>
                </div>
                <DialogTitle className="text-[1.9rem] leading-tight tracking-tight text-slate-950 dark:text-white">
                  Sekarang halaman publik kamu sudah jauh lebih siap dilihat customer
                </DialogTitle>
                <DialogDescription className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Hero, visual utama, dan copy penting sudah tersimpan. Orang yang buka halaman booking sekarang akan lebih cepat paham bisnis kamu dan lebih siap lanjut booking.
                </DialogDescription>
              </DialogHeader>

              {tenantSlug ? (
                <div className="rounded-[1.35rem] border border-blue-200 bg-[linear-gradient(135deg,#eff6ff_0%,#f5f3ff_100%)] px-4 py-4 dark:border-blue-500/20 dark:bg-[linear-gradient(135deg,rgba(30,64,175,0.18)_0%,rgba(88,28,135,0.16)_100%)]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">
                    Link booking kamu
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Bagikan link ini ke customer lewat WhatsApp, Instagram bio, atau status. Dari sini mereka langsung bisa booking.
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2.5 dark:border-blue-500/20 dark:bg-slate-950">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {getTenantUrl(tenantSlug)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 rounded-lg px-3 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                      onClick={async () => {
                        const ok = await copyToClipboard(getTenantUrl(tenantSlug));
                        if (ok) {
                          setShareLinkCopied(true);
                          toast.success("Link booking disalin.");
                          setTimeout(() => setShareLinkCopied(false), 2000);
                        } else {
                          toast.error("Gagal menyalin link. Salin manual ya.");
                        }
                      }}
                    >
                      {shareLinkCopied ? (
                        <>
                          <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                          Tersalin
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                          Salin
                        </>
                      )}
                    </Button>
                  </div>
                  <Button
                    asChild
                    type="button"
                    variant="ghost"
                    className="mt-2 h-9 w-full justify-center rounded-xl text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                  >
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Halo! Sekarang kamu bisa booking langsung di sini: ${getTenantUrl(tenantSlug)}`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Bagikan ke WhatsApp
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="rounded-[1.35rem] border border-emerald-200 bg-[linear-gradient(135deg,#f0fdf4_0%,#ecfeff_100%)] px-4 py-4 dark:border-emerald-500/20 dark:bg-[linear-gradient(135deg,rgba(6,95,70,0.2)_0%,rgba(8,145,178,0.15)_100%)]">
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    Milestone pertama beres
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Ini belum harus perfect, tapi sudah cukup proper untuk dipakai sebagai permukaan awal produk. Nanti masih bisa kamu poles lagi dari settings bisnis atau page builder.
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              {tenantSlug ? (
                <Button asChild className="h-12 w-full rounded-2xl shadow-[0_18px_40px_rgba(59,130,246,0.22)] dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400">
                  <a href={getTenantUrl(tenantSlug)} target="_blank" rel="noreferrer">
                    Lihat halaman publik
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-12 w-full rounded-2xl shadow-[0_18px_40px_rgba(59,130,246,0.22)] dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400"
                  onClick={() => setShowWelcomeSuccess(false)}
                >
                  Kembali ke dashboard
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                className="h-12 rounded-2xl px-4 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-900"
                onClick={() => setShowWelcomeSuccess(false)}
              >
                Tutup
              </Button>
              </div>
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
          {canReadBookings ? (
            <section className="grid gap-3 xl:grid-cols-[1.55fr_0.85fr]">
              <DashboardPanel
                eyebrow="Live"
                title="Sedang berjalan"
                description="Sesi yang aktif di lantai sekarang."
              >
                {liveSessions.length ? (
                  <div className="space-y-2">
                    {liveSessions.slice(0, 6).map((session) => (
                      <LiveSessionRow key={session.id} session={session} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
                    Belum ada sesi aktif. Mulai sesi dari POS saat customer datang.
                  </div>
                )}
                {canManagePos && liveSessions.length ? (
                  <div className="flex justify-end">
                    <Button asChild variant="outline">
                      <Link href="/admin/pos" prefetch={false}>
                        Buka POS
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </DashboardPanel>

              <DashboardPanel
                eyebrow="Prioritas"
                title="Perlu tindakan"
                description="Yang sebaiknya dituntaskan lebih dulu."
              >
                {actionQueue.length ? (
                  <div className="space-y-2.5">
                    {actionQueue.map((item) => (
                      <ActionQueueItem key={item.label} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    Tidak ada yang mendesak. Operasional aman terkendali.
                  </div>
                )}
              </DashboardPanel>
            </section>
          ) : null}

          {ownerOnly ? (
            <section className="grid gap-3 xl:grid-cols-[1.5fr_0.85fr]">
              <DashboardLineChartPanel
                eyebrow="7 hari"
                title="Tren pendapatan"
                description={`Pendapatan harian minggu ini · total Rp ${formatIDR(weeklySummary.totalRevenue)} · puncak ${weeklySummary.peakLabel}.`}
                points={weeklyRevenuePoints}
                primaryLabel="Pendapatan"
                secondaryLabel="Transaksi utama"
                formatValue={(value) => `Rp ${formatIDR(value)}`}
              />

              <DashboardPanel
                eyebrow="Transaksi"
                title="Transaksi terbaru"
                description="Booking terakhir yang masuk."
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
            </section>
          ) : null}

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

function DeltaBadge({
  delta,
  percent,
}: {
  delta: number;
  percent: number | null;
}) {
  if (percent === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        Belum ada acuan
      </span>
    );
  }
  const up = delta >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        up
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200"
          : "bg-rose-50 text-rose-700 dark:bg-rose-500/12 dark:text-rose-200",
      )}
    >
      {up ? (
        <ArrowUpRight className="h-3.5 w-3.5" />
      ) : (
        <ArrowDownRight className="h-3.5 w-3.5" />
      )}
      {Math.abs(percent)}% vs kemarin
    </span>
  );
}

function LiveSessionRow({
  session,
}: {
  session: {
    id: string;
    resourceName: string;
    customerName: string;
    endLabel: string | null;
    remainingMin: number | null;
  };
}) {
  const overtime = session.remainingMin != null && session.remainingMin < 0;
  const endingSoon =
    session.remainingMin != null &&
    session.remainingMin >= 0 &&
    session.remainingMin <= 15;

  const remainingLabel =
    session.remainingMin == null
      ? "Tanpa batas waktu"
      : overtime
        ? `Lewat ${Math.abs(session.remainingMin)} mnt`
        : `Sisa ${session.remainingMin} mnt`;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--admin-line-soft)] bg-[var(--admin-surface-soft)] px-3 py-2.5">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          overtime
            ? "bg-rose-50 text-rose-600 dark:bg-rose-500/12 dark:text-rose-300"
            : endingSoon
              ? "bg-amber-50 text-amber-600 dark:bg-amber-500/12 dark:text-amber-300"
              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-300",
        )}
      >
        <Zap className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
          {session.resourceName}
        </div>
        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
          {session.customerName}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div
          className={cn(
            "text-sm font-semibold",
            overtime
              ? "text-rose-600 dark:text-rose-300"
              : endingSoon
                ? "text-amber-600 dark:text-amber-300"
                : "text-slate-950 dark:text-white",
          )}
        >
          {remainingLabel}
        </div>
        {session.endLabel ? (
          <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            <Timer className="h-3 w-3" />
            selesai {session.endLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ActionQueueItem({
  item,
}: {
  item: {
    label: string;
    value: string;
    detail: string;
    href: string;
    icon: LucideIcon;
    tone: "amber" | "rose" | "sky";
  };
}) {
  const toneClass: Record<"amber" | "rose" | "sky", string> = {
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-200",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/12 dark:text-rose-200",
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-500/12 dark:text-sky-200",
  };
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      prefetch={false}
      className="group flex items-center gap-3 rounded-xl border border-[var(--admin-line-soft)] bg-[var(--admin-surface-soft)] px-3 py-3 transition hover:border-slate-300 hover:bg-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900/60"
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          toneClass[item.tone],
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-950 dark:text-white">
            {item.label}
          </span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[11px] font-bold",
              toneClass[item.tone],
            )}
          >
            {item.value}
          </span>
        </div>
        <div className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {item.detail}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
    </Link>
  );
}
