"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Calendar as CalendarIcon,
  Search,
  ArrowUpRight,
  LayoutGrid,
  List,
  User,
  Wallet,
  Clock,
  Layers,
  MonitorPlay,
  TrendingUp,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { addDays, endOfDay, format, startOfDay } from "date-fns";
import { id } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/admin-access";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { RealtimePill } from "@/components/dashboard/realtime-pill";
import { DashboardPanel } from "@/components/dashboard/analytics-kit";
import {
  AdminSurfaceEmpty,
  AdminSurfaceError,
} from "@/components/dashboard/admin-surface-state";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import {
  tenantBookingsChannel,
  tenantDashboardChannel,
} from "@/lib/realtime/channels";
import {
  BOOKING_EVENT_PREFIXES,
  type RealtimeEvent,
  matchesRealtimePrefix,
} from "@/lib/realtime/event-types";

type BookingRow = {
  id: string;
  customer_name: string;
  customer_phone: string;
  resource_name: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status?: string;
  deposit_override_active?: boolean;
  deposit_amount?: number;
  balance_due?: number;
  total_resource: number;
  total_fnb: number;
};

type RangePreset = "today" | "7days" | "custom";

type CompactMetricCardProps = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: "indigo" | "emerald" | "amber" | "slate";
};

function CompactMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: CompactMetricCardProps) {
  const toneMap = {
    indigo: {
      shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-100)]",
    },
    emerald: {
      shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    amber: {
      shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    },
    slate: {
      shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300",
    },
  } as const;

  const colors = toneMap[tone];

  return (
    <Card className={cn("rounded-xl border p-3 sm:p-4", colors.shell)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            {value}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
            {hint}
          </div>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11",
            colors.icon,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

const isOperationallyActive = (booking: BookingRow) => {
  const status = String(booking.status || "").toLowerCase();
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const balanceDue = Number(booking.balance_due || 0);
  return (
    status === "active" ||
    status === "ongoing" ||
    (status === "completed" &&
      (balanceDue > 0 || ["pending", "partial_paid", "unpaid", "failed", "expired"].includes(paymentStatus)))
  );
};

const getBookingStatusMeta = (booking: BookingRow) => {
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  if (isOperationallyActive(booking) && booking.status === "completed") {
    return { label: "Perlu Pelunasan", className: "bg-amber-500 text-white" };
  }
  if (paymentStatus === "awaiting_verification") {
    return { label: "Menunggu Verifikasi", className: "bg-amber-500 text-white" };
  }
  if (booking.status === "active" || booking.status === "ongoing") {
    return { label: "Aktif", className: "bg-emerald-500 text-white" };
  }
  if (booking.status === "confirmed") {
    return { label: "Confirmed", className: "bg-blue-600 text-white" };
  }
  return {
    label: booking.status || "pending",
    className: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  };
};

function patchBookingFromEvent(prev: BookingRow[], event: RealtimeEvent) {
  const bookingID = String(event.refs?.booking_id || event.entity_id || "");
  if (!bookingID) return prev;

  let found = false;
  const next = prev.map((booking) => {
    if (booking.id !== bookingID) return booking;
    found = true;
    return {
      ...booking,
      status: String(event.summary?.status ?? booking.status),
      payment_status: String(
        event.summary?.payment_status ?? booking.payment_status ?? "",
      ),
      deposit_override_active:
        typeof event.summary?.deposit_override_active === "boolean"
          ? Boolean(event.summary.deposit_override_active)
          : booking.deposit_override_active,
      resource_name: String(
        event.summary?.resource_name ?? booking.resource_name ?? "",
      ),
      customer_name: String(
        event.summary?.customer_name ?? booking.customer_name ?? "",
      ),
      start_time: String(event.summary?.start_time ?? booking.start_time),
      end_time: String(event.summary?.end_time ?? booking.end_time),
      balance_due:
        typeof event.summary?.balance_due === "number"
          ? Number(event.summary.balance_due)
          : booking.balance_due,
    };
  });

  if (found) return next;
  return prev;
}

export default function BookingsPage() {
  const router = useRouter();
  const { user: adminUser } = useAdminSession();
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("all");
  const [filterResource, setFilterResource] = useState("all");
  const [rangePreset, setRangePreset] = useState<RangePreset>("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.get("/bookings");
      setBookings(res.data || []);
    } catch {
      setLoadError(true);
      toast.error("Gagal mengambil data reservasi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const { connected: realtimeConnected, status: realtimeStatus } = useRealtime({
    enabled: Boolean(adminUser?.tenant_id),
    channels: adminUser?.tenant_id
      ? [
          tenantBookingsChannel(adminUser.tenant_id),
          tenantDashboardChannel(adminUser.tenant_id),
        ]
      : [],
    onEvent: (event) => {
      if (matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) {
        setBookings((current) => patchBookingFromEvent(current, event));
        if (event.type === "booking.created") {
          fetchBookings();
        }
      }
    },
    onReconnect: fetchBookings,
  });

  const canCreateBookings = hasPermission(adminUser, "bookings.create");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const syncViewMode = () => {
      setViewMode(mediaQuery.matches ? "list" : "grid");
    };

    syncViewMode();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncViewMode);
      return () => mediaQuery.removeEventListener("change", syncViewMode);
    }

    mediaQuery.addListener(syncViewMode);
    return () => mediaQuery.removeListener(syncViewMode);
  }, []);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  const getPaymentMeta = (booking: BookingRow) => {
    const status = (booking?.payment_status || "").toLowerCase();
    const depositAmount = Number(booking?.deposit_amount || 0);
    const balanceDue = Number(booking?.balance_due || 0);
    const hasDepositOverride = Boolean(booking?.deposit_override_active);

    if (status === "awaiting_verification") {
      return {
        label: "Menunggu Verifikasi Admin",
        className: "bg-amber-500 text-white",
      };
    }
    if (status === "settled" || (status === "paid" && balanceDue === 0)) {
      return { label: "Lunas", className: "bg-emerald-500 text-white" };
    }
    if (status === "partial_paid" || (status === "paid" && depositAmount > 0)) {
      return { label: "DP Masuk", className: "bg-blue-600 text-white" };
    }
    if (status === "pending") {
      return {
        label: hasDepositOverride ? "Tanpa DP" : depositAmount > 0 ? "Menunggu DP" : "Bayar Nanti",
        className: hasDepositOverride ? "bg-amber-500 text-white" : "bg-orange-500 text-white",
      };
    }
    if (status === "expired") {
      return { label: "DP Kadaluarsa", className: "bg-red-500 text-white" };
    }
    if (status === "failed") {
      return { label: "Gagal Bayar", className: "bg-red-500 text-white" };
    }
    return { label: "Belum Dibayar", className: "bg-slate-500 text-white" };
  };

  const getNormalizedPaymentStatus = (booking: BookingRow) => {
    const status = (booking?.payment_status || "").toLowerCase();
    const depositAmount = Number(booking?.deposit_amount || 0);
    const balanceDue = Number(booking?.balance_due || 0);

    if (status === "awaiting_verification") return "awaiting_verification";
    if (status === "settled" || (status === "paid" && balanceDue === 0)) {
      return "settled";
    }
    if (status === "partial_paid" || (status === "paid" && depositAmount > 0)) {
      return "partial_paid";
    }
    if (status === "pending") return "pending";
    if (status === "expired") return "expired";
    if (status === "failed") return "failed";
    return "unpaid";
  };

  const effectiveDateRange = useMemo(() => {
    const now = new Date();
    if (rangePreset === "today") {
      return {
        from: startOfDay(now),
        to: endOfDay(now),
      };
    }
    if (rangePreset === "7days") {
      return {
        from: startOfDay(now),
        to: endOfDay(addDays(now, 6)),
      };
    }
    if (customRange?.from) {
      return {
        from: startOfDay(customRange.from),
        to: endOfDay(customRange.to ?? customRange.from),
      };
    }
    return undefined;
  }, [customRange, rangePreset]);

  const resetFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterPaymentStatus("all");
    setFilterResource("all");
    setRangePreset("today");
    setCustomRange(undefined);
  };

  const isFilterActive = useMemo(() => {
    return (
      searchQuery !== "" ||
      filterStatus !== "all" ||
      filterPaymentStatus !== "all" ||
      filterResource !== "all" ||
      rangePreset !== "today"
    );
  }, [searchQuery, filterStatus, filterPaymentStatus, filterResource, rangePreset]);

  const uniqueResources = useMemo(() => {
    const resources = Array.from(new Set(bookings.map((b) => b.resource_name)));
    return resources.sort();
  }, [bookings]);

  const timeRangeLabel = useMemo(() => {
    if (rangePreset === "today") return "Hari ini";
    if (rangePreset === "7days") return "7 hari";
    if (customRange?.from && customRange?.to) {
      return `${format(customRange.from, "dd MMM")} - ${format(customRange.to, "dd MMM yyyy")}`;
    }
    if (customRange?.from) {
      return format(customRange.from, "dd MMM yyyy");
    }
    return "Custom";
  }, [customRange, rangePreset]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const bDate = new Date(b.start_time);
      const matchSearch =
        b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customer_phone.includes(searchQuery);

      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" ? isOperationallyActive(b) : b.status === filterStatus);
      const matchPaymentStatus =
        filterPaymentStatus === "all" ||
        getNormalizedPaymentStatus(b) === filterPaymentStatus;
      const matchResource =
        filterResource === "all" || b.resource_name === filterResource;
      const matchDate =
        !effectiveDateRange ||
        (bDate >= effectiveDateRange.from && bDate <= effectiveDateRange.to);

      return (
        matchSearch &&
        matchStatus &&
        matchPaymentStatus &&
        matchDate &&
        matchResource
      );
    });
  }, [
    bookings,
    searchQuery,
    filterStatus,
    filterPaymentStatus,
    filterResource,
    effectiveDateRange,
  ]);

  const groupedData = useMemo(() => {
    const map: Record<string, BookingRow[]> = {};
    filteredBookings.forEach((b) => {
      if (!map[b.resource_name]) map[b.resource_name] = [];
      map[b.resource_name].push(b);
    });
    return map;
  }, [filteredBookings]);

  const stats = useMemo(() => {
    const totalRevenue = filteredBookings.reduce(
      (acc, curr) => acc + (curr.total_resource + curr.total_fnb),
      0,
    );
    const activeSess = filteredBookings.filter(isOperationallyActive).length;
    const needsSettlement = filteredBookings.filter((booking) => {
      return (
        String(booking.status || "").toLowerCase() === "completed" &&
        Number(booking.balance_due || 0) > 0
      );
    }).length;
    return {
      totalRevenue,
      activeSess,
      needsSettlement,
      resourceCount: Object.keys(groupedData).length,
    };
  }, [filteredBookings, groupedData]);

  const bookingCountLabel = `${filteredBookings.length} booking ditampilkan`;

  return (
    <div className="mx-auto w-full space-y-4 px-3 pb-20 pt-4 font-plus-jakarta md:px-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <MonitorPlay className="h-3.5 w-3.5 text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]" />
              Booking
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                Booking
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <RealtimePill connected={realtimeConnected} status={realtimeStatus} />
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                Rentang: {timeRangeLabel}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => canCreateBookings && router.push(`/admin/bookings/new?mode=scheduled`)}
              disabled={!canCreateBookings}
              className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-[var(--bookinaja-700)] dark:bg-white dark:text-slate-950"
            >
              <Plus size={16} strokeWidth={4} className="mr-2" />
              Jadwal
            </Button>
            <Button
              onClick={() => canCreateBookings && router.push(`/admin/bookings/new?mode=walkin`)}
              disabled={!canCreateBookings}
              variant="outline"
              className="h-10 rounded-lg border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              Walk-in
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-2 md:gap-3 xl:grid-cols-4">
        <CompactMetricCard
          label="Revenue Tampil"
          value={`Rp ${formatIDR(stats.totalRevenue)}`}
          hint="Filter aktif"
          icon={Wallet}
          tone="indigo"
        />
        <CompactMetricCard
          label="Sesi Aktif"
          value={String(stats.activeSess)}
          hint="Aktif"
          icon={TrendingUp}
          tone="emerald"
        />
        <CompactMetricCard
          label="Pelunasan"
          value={String(stats.needsSettlement)}
          hint="Saldo sisa"
          icon={Clock}
          tone="amber"
        />
        <CompactMetricCard
          label="Resource"
          value={String(stats.resourceCount)}
          hint="Terlihat"
          icon={Layers}
          tone="slate"
        />
      </div>

      <DashboardPanel
        eyebrow="Filter"
        title="Cari & saring"
        description="Rentang waktu, status booking, dan status pembayaran."
      >
        <div className="space-y-4 lg:hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cari customer / WA"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 rounded-lg border-slate-200 bg-slate-50 pl-11 text-xs font-medium dark:border-slate-800 dark:bg-slate-900/30"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { value: "today" as const, label: "Hari ini" },
              { value: "7days" as const, label: "7 hari" },
              { value: "custom" as const, label: "Custom" },
            ].map((preset) => (
              <Button
                key={preset.value}
                type="button"
                variant="outline"
                onClick={() => setRangePreset(preset.value)}
                className={cn(
                  "h-9 rounded-full px-3 text-[11px] font-semibold",
                  rangePreset === preset.value
                    ? "border-[var(--bookinaja-600)] bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
                    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
                )}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {rangePreset === "custom" ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 w-full justify-start rounded-lg border-slate-200 bg-slate-50 px-3 text-xs font-medium dark:border-slate-800 dark:bg-slate-900/30"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                  {timeRangeLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-950"
                align="start"
              >
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={setCustomRange}
                  numberOfMonths={1}
                  className="[--cell-size:2.55rem]"
                />
              </PopoverContent>
            </Popover>
          ) : null}

          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="min-h-[40px] w-full rounded-lg border-slate-200 bg-slate-50 text-xs font-medium dark:border-slate-800 dark:bg-slate-900/30">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl p-2">
                <SelectItem
                  value="all"
                  className="text-xs font-semibold py-3 rounded-xl"
                >
                  All Status
                </SelectItem>
                {[
                  "pending",
                  "confirmed",
                  "active",
                  "completed",
                  "cancelled",
                ].map((s) => (
                  <SelectItem
                    key={s}
                    value={s}
                    className="text-xs font-semibold py-3 rounded-xl"
                  >
                    {s === "active" ? "active / perlu pelunasan" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
              <SelectTrigger className="min-h-[40px] w-full rounded-lg border-slate-200 bg-slate-50 text-xs font-medium dark:border-slate-800 dark:bg-slate-900/30">
                <SelectValue placeholder="Pembayaran" />
              </SelectTrigger>
              <SelectContent className="rounded-xl p-2">
                <SelectItem value="all" className="text-xs font-semibold py-3 rounded-xl">
                  Semua Pembayaran
                </SelectItem>
                <SelectItem value="pending" className="text-xs font-semibold py-3 rounded-xl">
                  Menunggu Bayar
                </SelectItem>
                <SelectItem value="partial_paid" className="text-xs font-semibold py-3 rounded-xl">
                  DP Masuk
                </SelectItem>
                <SelectItem value="awaiting_verification" className="text-xs font-semibold py-3 rounded-xl">
                  Verifikasi Admin
                </SelectItem>
                <SelectItem value="settled" className="text-xs font-semibold py-3 rounded-xl">
                  Lunas
                </SelectItem>
                <SelectItem value="failed" className="text-xs font-semibold py-3 rounded-xl">
                  Gagal Bayar
                </SelectItem>
                <SelectItem value="expired" className="text-xs font-semibold py-3 rounded-xl">
                  Kadaluarsa
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterResource} onValueChange={setFilterResource}>
              <SelectTrigger className="min-h-[40px] w-full rounded-lg border-slate-200 bg-slate-50 text-xs font-medium dark:border-slate-800 dark:bg-slate-900/30">
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent className="rounded-xl p-2">
                <SelectItem
                  value="all"
                  className="text-xs font-semibold py-3 rounded-xl"
                >
                  All Resources
                </SelectItem>
                {uniqueResources.map((r) => (
                  <SelectItem
                    key={r}
                    value={r}
                    className="text-xs font-semibold py-3 rounded-xl"
                  >
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isFilterActive ? (
              <Button
                onClick={resetFilters}
                variant="ghost"
                className="h-10 w-full rounded-lg px-3 text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
              >
                <XCircle size={16} /> Clear
              </Button>
            ) : (
              <div className="flex h-10 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-900/30">
                {bookingCountLabel}
              </div>
            )}

            <div className="col-span-2 flex w-full gap-1.5 rounded-lg bg-slate-50 p-1 dark:bg-slate-900/30">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={cn(
                  "h-10 flex-1 rounded-lg px-4",
                  viewMode === "list"
                    ? "bg-white font-medium dark:bg-slate-950"
                    : "text-slate-400",
                )}
              >
                <List size={18} />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "h-10 flex-1 rounded-lg px-4",
                  viewMode === "grid"
                    ? "bg-white font-medium dark:bg-slate-950"
                    : "text-slate-400",
                )}
              >
                <LayoutGrid size={18} />
              </Button>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-3">
          <div className="relative flex-1 min-w-[320px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-2xl border-none bg-slate-50 dark:bg-slate-800/50 font-semibold text-xs shadow-inner focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-1.5 dark:bg-slate-800/50">
            {[
              { value: "today" as const, label: "Hari ini" },
              { value: "7days" as const, label: "7 hari" },
              { value: "custom" as const, label: "Custom" },
            ].map((preset) => (
              <Button
                key={preset.value}
                type="button"
                variant={rangePreset === preset.value ? "secondary" : "ghost"}
                onClick={() => setRangePreset(preset.value)}
                className={cn(
                  "h-10 rounded-xl px-4 text-xs font-semibold",
                  rangePreset === preset.value
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
                    : "text-slate-500",
                )}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {rangePreset === "custom" ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 px-5 rounded-xl border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800 font-semibold text-xs gap-3 shadow-sm min-w-[220px]"
                >
                  <CalendarIcon className="h-4 w-4 text-blue-600" />
                  {timeRangeLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto min-w-[640px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-950"
                align="start"
              >
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={setCustomRange}
                  numberOfMonths={2}
                  className="[--cell-size:2.4rem]"
                />
              </PopoverContent>
            </Popover>
          ) : null}

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-12 w-[170px] rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-semibold text-xs focus:ring-0 shadow-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-sm p-2">
              <SelectItem
                value="all"
                className="text-xs font-semibold py-3 rounded-xl"
              >
                All Status
              </SelectItem>
              {["pending", "confirmed", "active", "completed", "cancelled"].map(
                (s) => (
                  <SelectItem
                    key={s}
                    value={s}
                    className="text-xs font-semibold py-3 rounded-xl"
                  >
                    {s === "active" ? "active / perlu pelunasan" : s}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>

          <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
            <SelectTrigger className="h-12 w-[190px] rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-semibold text-xs focus:ring-0 shadow-sm">
              <SelectValue placeholder="Pembayaran" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-sm p-2">
              <SelectItem value="all" className="text-xs font-semibold py-3 rounded-xl">
                Semua Pembayaran
              </SelectItem>
              <SelectItem value="pending" className="text-xs font-semibold py-3 rounded-xl">
                Menunggu Bayar
              </SelectItem>
              <SelectItem value="partial_paid" className="text-xs font-semibold py-3 rounded-xl">
                DP Masuk
              </SelectItem>
              <SelectItem value="awaiting_verification" className="text-xs font-semibold py-3 rounded-xl">
                Verifikasi Admin
              </SelectItem>
              <SelectItem value="settled" className="text-xs font-semibold py-3 rounded-xl">
                Lunas
              </SelectItem>
              <SelectItem value="failed" className="text-xs font-semibold py-3 rounded-xl">
                Gagal Bayar
              </SelectItem>
              <SelectItem value="expired" className="text-xs font-semibold py-3 rounded-xl">
                Kadaluarsa
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterResource} onValueChange={setFilterResource}>
            <SelectTrigger className="h-12 w-[180px] rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-semibold text-xs focus:ring-0 shadow-sm">
              <SelectValue placeholder="Resource" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-sm p-2">
              <SelectItem
                value="all"
                className="text-xs font-semibold py-3 rounded-xl"
              >
                All Resources
              </SelectItem>
              {uniqueResources.map((r) => (
                <SelectItem
                  key={r}
                  value={r}
                  className="text-xs font-semibold py-3 rounded-xl"
                >
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-400">
            {bookingCountLabel}
          </div>

          {isFilterActive ? (
            <Button
              onClick={resetFilters}
              variant="ghost"
              className="h-12 px-4 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold text-xs gap-2 rounded-2xl"
            >
              <XCircle size={16} /> Clear
            </Button>
          ) : null}

          <div className="ml-auto flex gap-1.5 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-xl h-11 px-4 min-w-[78px]",
                viewMode === "list"
                  ? "bg-white dark:bg-slate-700 shadow-sm font-semibold"
                  : "text-slate-400",
              )}
            >
              <List size={18} />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded-xl h-11 px-4 min-w-[78px]",
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-700 shadow-sm font-semibold"
                  : "text-slate-400",
              )}
            >
              <LayoutGrid size={18} />
            </Button>
          </div>
        </div>
      </DashboardPanel>

      {/* 3. DYNAMIC CONTENT AREA */}
      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : loadError ? (
        <AdminSurfaceError
          title="Gagal memuat daftar booking"
          description="List booking tidak berhasil dimuat. Filter dan realtime tidak akan akurat sebelum data awal berhasil diambil."
          action={
            <Button onClick={() => void fetchBookings()} variant="outline" className="rounded-xl">
              Coba lagi
            </Button>
          }
        />
      ) : filteredBookings.length === 0 ? (
        <AdminSurfaceEmpty
          title="Belum ada booking di hasil ini"
          description="Coba ganti rentang atau filter. Kalau memang belum ada transaksi, buat booking manual untuk operasional walk-in atau terjadwal."
          action={
            <Button
              onClick={() => canCreateBookings && router.push("/admin/bookings/new?mode=scheduled")}
              disabled={!canCreateBookings}
              className="rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Booking Terjadwal
            </Button>
          }
        />
      ) : viewMode === "list" ? (
        <div className="space-y-6">
          {Object.entries(groupedData).map(([resourceName, sessions]) => (
            <div
              key={resourceName}
              className="space-y-3"
            >
              <div className="flex items-center gap-3 px-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-[1rem] bg-blue-600/10">
                  <Layers className="w-4 h-4 text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-300)]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Resource lane
                  </div>
                  <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">
                    {resourceName}
                  </h3>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold border-slate-200/70 bg-white/80 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
                >
                  {sessions.length} booking
                </Badge>
              </div>

              <Card className="overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0f1117]/96 dark:shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
                <div className="border-b border-slate-100/80 px-5 py-3 dark:border-white/8">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Antrian dan status pembayaran
                    </div>
                    <div className="text-xs text-slate-400">
                      klik baris untuk buka detail
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table className="min-w-[920px]">
                    <TableBody>
                      {sessions.map((b) => (
                        <TableRow
                          key={b.id}
                          onClick={() => router.push(`/admin/bookings/${b.id}`)}
                          className="group cursor-pointer border-slate-100/80 hover:bg-blue-50/40 dark:border-white/6 dark:hover:bg-white/[0.03]"
                        >
                          <TableCell className="w-[35%] pl-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-slate-50 text-slate-400 shadow-sm transition-all group-hover:bg-blue-600 group-hover:text-white dark:bg-white/[0.04]">
                                <User size={20} />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-base text-slate-900 dark:text-white">
                                  {b.customer_name}
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 leading-none mt-1">
                                  {b.customer_phone}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="w-[28%]">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 text-[12px] font-semibold leading-none text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-300)]">
                                <Clock size={14} />
                                {format(new Date(b.start_time), "HH:mm")} - {format(new Date(b.end_time), "HH:mm")}
                              </div>
                              <span className="mt-1.5 text-[10px] font-bold text-slate-400">
                                {format(new Date(b.start_time), "dd MMMM yyyy", {
                                  locale: id,
                                })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="w-[15%]">
                            <Badge
                              className={cn(
                                "font-semibold text-[9px] px-4 py-1.5 rounded-full border-none shadow-sm",
                                getBookingStatusMeta(b).className,
                              )}
                            >
                              {getBookingStatusMeta(b).label}
                            </Badge>
                          </TableCell>
                          <TableCell className="w-[15%]">
                            <Badge
                              className={cn(
                                "font-semibold text-[9px] px-4 py-1.5 rounded-full border-none shadow-sm",
                                getPaymentMeta(b).className,
                              )}
                            >
                              {getPaymentMeta(b).label}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-8 text-right">
                            <div className="flex flex-col items-end">
                              <span className="mb-1 text-[10px] font-semibold text-slate-400">
                                Billing
                              </span>
                              <span className="text-lg font-semibold text-slate-950 dark:text-white leading-none">
                                Rp {formatIDR(b.total_resource + b.total_fnb)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedData).map(([resourceName, sessions]) => (
            <div key={resourceName} className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Resource lane
                  </div>
                  <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200 md:text-xl">
                    {resourceName}
                  </h3>
                </div>
                <div className="flex-1 h-[1px] bg-slate-100 dark:bg-white/5" />
                <Badge
                  variant="outline"
                  className="rounded-full border-slate-200/70 bg-white/85 text-[10px] font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
                >
                  {sessions.length} booking
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {sessions.map((b) => (
                  <Card
                    key={b.id}
                    onClick={() => router.push(`/admin/bookings/${b.id}`)}
                    className="group relative cursor-pointer overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white/95 p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(15,23,42,0.1)] dark:border-white/10 dark:bg-[#0f1117]/96 dark:shadow-[0_20px_60px_rgba(0,0,0,0.24)] md:rounded-[1.8rem] md:p-6"
                  >
                    {isOperationallyActive(b) && (
                      <div
                        className={cn(
                          "absolute left-0 top-0 h-1.5 w-full",
                          b.status === "completed" ? "bg-amber-500" : "bg-emerald-500",
                        )}
                      />
                    )}

                    <div className="mb-3 flex items-start justify-between gap-3 md:mb-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge
                            className={cn(
                              "border-none px-3 py-1 text-[9px] font-semibold shadow-sm",
                              getBookingStatusMeta(b).className,
                            )}
                          >
                            {getBookingStatusMeta(b).label}
                          </Badge>
                          <Badge
                            className={cn(
                              "border-none px-3 py-1 text-[9px] font-semibold shadow-sm",
                              getPaymentMeta(b).className,
                            )}
                          >
                            {getPaymentMeta(b).label}
                          </Badge>
                        </div>
                      </div>
                      <ArrowUpRight
                        size={18}
                        className="mt-0.5 hidden text-slate-200 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--bookinaja-600)] dark:group-hover:text-[var(--bookinaja-300)] md:block"
                      />
                    </div>

                    <div className="mb-4 flex items-start justify-between gap-3 md:mb-6">
                      <div className="min-w-0 space-y-1">
                        <h4 className="truncate text-sm font-semibold leading-tight text-slate-900 transition-colors group-hover:text-[var(--bookinaja-600)] dark:text-white dark:group-hover:text-[var(--bookinaja-300)] md:text-base lg:text-lg">
                          {b.customer_name}
                        </h4>
                        <p className="text-[10px] font-bold leading-none text-slate-400">
                          {b.customer_phone}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Total
                        </div>
                        <div className="mt-1 text-sm font-semibold leading-none text-slate-950 dark:text-white md:text-base">
                          Rp{formatIDR(b.total_resource + b.total_fnb)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-white/6 md:flex md:items-end md:justify-between md:pt-5">
                      <div className="flex flex-col">
                        <span className="mb-1.5 text-[8px] font-semibold leading-none text-slate-400">
                          Jadwal
                        </span>
                        <span className="text-[12px] font-semibold leading-none text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-300)] md:text-[13px]">
                          {format(new Date(b.start_time), "HH:mm")} -{" "}
                          {format(new Date(b.end_time), "HH:mm")}
                        </span>
                        <span className="mt-1.5 text-[10px] font-medium text-slate-400">
                          {format(new Date(b.start_time), "dd MMM yyyy")}
                        </span>
                      </div>
                      <div className="flex items-end justify-end">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 dark:bg-white/[0.04]">
                          <User size={16} />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
