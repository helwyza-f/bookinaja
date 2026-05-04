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
  Box,
  MonitorPlay,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/admin-access";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { RealtimePill } from "@/components/dashboard/realtime-pill";
import {
  DashboardMetricCard,
  DashboardPanel,
} from "@/components/dashboard/analytics-kit";
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
  deposit_amount?: number;
  balance_due?: number;
  total_resource: number;
  total_fnb: number;
};

type AdminUser = {
  role?: string;
  permission_keys?: string[];
  tenant_id?: string;
};

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
  if (isOperationallyActive(booking) && booking.status === "completed") {
    return { label: "Perlu Pelunasan", className: "bg-amber-500 text-white" };
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
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterResource, setFilterResource] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, res] = await Promise.all([
        api.get("/auth/me"),
        api.get(`/bookings`),
      ]);
      setAdminUser(meRes.data?.user || null);
      setBookings(res.data || []);
    } catch {
      toast.error("Gagal mengambil data reservasi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
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

    if (status === "settled" || (status === "paid" && balanceDue === 0)) {
      return { label: "Lunas", className: "bg-emerald-500 text-white" };
    }
    if (status === "partial_paid" || (status === "paid" && depositAmount > 0)) {
      return { label: "DP Masuk", className: "bg-blue-600 text-white" };
    }
    if (status === "pending") {
      return {
        label: depositAmount > 0 ? "Menunggu DP" : "Bayar Nanti",
        className: "bg-orange-500 text-white",
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

  const resetFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterResource("all");
    setSelectedDate(new Date());
  };

  const isFilterActive = useMemo(() => {
    return (
      searchQuery !== "" || filterStatus !== "all" || filterResource !== "all"
    );
  }, [searchQuery, filterStatus, filterResource]);

  const uniqueResources = useMemo(() => {
    const resources = Array.from(new Set(bookings.map((b) => b.resource_name)));
    return resources.sort();
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const bDate = new Date(b.start_time);
      const matchSearch =
        b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customer_phone.includes(searchQuery);

      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" ? isOperationallyActive(b) : b.status === filterStatus);
      const matchResource =
        filterResource === "all" || b.resource_name === filterResource;
      const matchDate =
        !selectedDate ||
        format(bDate, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");

      return matchSearch && matchStatus && matchDate && matchResource;
    });
  }, [bookings, searchQuery, filterStatus, filterResource, selectedDate]);

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

  const bookingCountLabel = `${filteredBookings.length} booking aktif di tampilan`;
  const selectedDateLabel = selectedDate
    ? format(selectedDate, "dd MMM yyyy")
    : "Semua tanggal";

  return (
    <div className="mx-auto w-full space-y-4 px-3 pb-20 pt-5 font-plus-jakarta md:px-4">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.95)_42%,rgba(236,253,245,0.92))] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(12,31,54,0.94)_42%,rgba(4,47,46,0.88))] dark:shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.18),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.22),transparent_60%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
              <MonitorPlay className="h-3.5 w-3.5 text-blue-600 dark:text-blue-300" />
              Booking Operations
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-[950] tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Kelola booking dengan ritme yang lebih cepat dan rapi.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Pantau jadwal, pembayaran, dan status sesi per resource dalam satu alur kerja yang lebih mudah dipindai.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <RealtimePill connected={realtimeConnected} status={realtimeStatus} />
              <div className="rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
                Fokus tanggal: {selectedDateLabel}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => canCreateBookings && router.push(`/admin/bookings/new`)}
              disabled={!canCreateBookings}
              className="h-12 rounded-[1.2rem] bg-slate-950 px-5 text-sm font-bold text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] hover:bg-[var(--bookinaja-700)] dark:bg-white dark:text-slate-950"
            >
              <Plus size={16} strokeWidth={4} className="mr-2" />
              New Booking
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          label="Revenue Tampil"
          value={`Rp ${formatIDR(stats.totalRevenue)}`}
          hint="akumulasi booking pada filter aktif"
          icon={Wallet}
          tone="indigo"
        />
        <DashboardMetricCard
          label="Sesi Operasional"
          value={`${stats.activeSess} unit`}
          hint="aktif atau perlu pelunasan"
          icon={TrendingUp}
          tone="emerald"
        />
        <DashboardMetricCard
          label="Perlu Pelunasan"
          value={String(stats.needsSettlement)}
          hint="booking selesai dengan saldo tersisa"
          icon={Clock}
          tone="amber"
        />
        <DashboardMetricCard
          label="Resource Terdampak"
          value={String(stats.resourceCount)}
          hint="resource yang muncul di tampilan"
          icon={Layers}
          tone="slate"
        />
      </div>

      <DashboardPanel
        eyebrow="Filter Workspace"
        title="Cari, saring, lalu pilih mode kerja"
        description="Kontrol ini dipisah dari area data supaya scanning lebih cepat saat operasional lagi padat."
      >
        <div className="space-y-4 lg:hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 md:h-14 rounded-2xl border-none bg-slate-50 dark:bg-slate-800/50 font-semibold text-[10px] md:text-xs shadow-inner focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 md:h-12 px-3 md:px-5 rounded-xl border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800 font-semibold text-[9px] md:text-xs gap-2 md:gap-3 shadow-sm w-full"
                >
                  <CalendarIcon className="h-4 w-4 text-blue-600" />
                  {selectedDate
                    ? format(selectedDate, "dd MMM yyyy")
                    : "Pick Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[92vw] sm:w-80 p-0 border-none rounded-2xl overflow-hidden shadow-sm"
                align="end"
              >
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="w-full"
                />
              </PopoverContent>
            </Popover>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full min-h-[44px] rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-semibold text-[9px] focus:ring-0 shadow-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-sm p-2">
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

            <Select value={filterResource} onValueChange={setFilterResource}>
              <SelectTrigger className="w-full min-h-[44px] rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-semibold text-[9px] focus:ring-0 shadow-sm">
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

            {isFilterActive ? (
              <Button
                onClick={resetFilters}
                variant="ghost"
                className="h-11 px-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold text-[9px] gap-2 rounded-2xl w-full"
              >
                <XCircle size={16} /> Clear
              </Button>
            ) : (
              <div className="flex h-11 items-center justify-center rounded-2xl border border-dashed border-slate-100 bg-slate-50/60 text-[10px] font-semibold text-slate-400 dark:border-white/5 dark:bg-slate-800/30">
                {bookingCountLabel}
              </div>
            )}

            <div className="col-span-2 flex gap-1.5 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl w-full">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-xl h-11 px-4 flex-1",
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
                  "rounded-xl h-11 px-4 flex-1",
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-700 shadow-sm font-semibold"
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

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-12 px-5 rounded-xl border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800 font-semibold text-xs gap-3 shadow-sm min-w-[170px]"
              >
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                {selectedDate
                  ? format(selectedDate, "dd MMM yyyy")
                  : "Pick Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-0 border-none rounded-2xl overflow-hidden shadow-sm"
              align="start"
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="w-full"
              />
            </PopoverContent>
          </Popover>

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
      ) : filteredBookings.length === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-white/15 dark:bg-[#0f0f17]">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bookinaja-50)] text-[var(--bookinaja-600)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-300)]">
            <Box size={30} />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              Belum ada reservasi di filter ini
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Coba ganti tanggal/filter, atau buat booking manual untuk walk-in.
            </p>
          </div>
          <Button
            onClick={() => canCreateBookings && router.push("/admin/bookings/new")}
            disabled={!canCreateBookings}
            className="rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </div>
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
        <div className="space-y-10">
          {Object.entries(groupedData).map(([resourceName, sessions]) => (
            <div key={resourceName} className="space-y-5">
              <div className="flex items-center gap-3 px-1">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Resource lane
                  </div>
                  <h3 className="font-semibold text-xl text-slate-800 dark:text-slate-200">
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
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {sessions.map((b) => (
                  <Card
                    key={b.id}
                    onClick={() => router.push(`/admin/bookings/${b.id}`)}
                    className="group relative cursor-pointer overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white/95 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(15,23,42,0.1)] dark:border-white/10 dark:bg-[#0f1117]/96 dark:shadow-[0_20px_60px_rgba(0,0,0,0.24)] md:p-6"
                  >
                    {isOperationallyActive(b) && (
                      <div
                        className={cn(
                          "absolute left-0 top-0 h-1.5 w-full",
                          b.status === "completed" ? "bg-amber-500" : "bg-emerald-500",
                        )}
                      />
                    )}

                    <div className="mb-5 flex items-start justify-between">
                      <div className="space-y-2">
                        <Badge
                          className={cn(
                            "font-semibold text-[9px] px-3 py-1 rounded-full shadow-sm",
                            getBookingStatusMeta(b).className,
                          )}
                        >
                          {getBookingStatusMeta(b).label}
                        </Badge>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Payment
                          </div>
                          <Badge
                            className={cn(
                              "mt-2 font-semibold text-[9px] px-3 py-1 rounded-full border-none shadow-sm",
                              getPaymentMeta(b).className,
                            )}
                          >
                            {getPaymentMeta(b).label}
                          </Badge>
                        </div>
                      </div>
                      <ArrowUpRight
                        size={18}
                        className="text-slate-200 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--bookinaja-600)] dark:group-hover:text-[var(--bookinaja-300)]"
                      />
                    </div>

                    <div className="mb-6 space-y-1">
                      <h4 className="text-base font-semibold leading-tight text-slate-900 transition-colors group-hover:text-[var(--bookinaja-600)] dark:text-white dark:group-hover:text-[var(--bookinaja-300)] lg:text-lg">
                        {b.customer_name}
                      </h4>
                      <p className="text-[11px] font-bold text-slate-400 leading-none">
                        {b.customer_phone}
                      </p>
                    </div>

                    <div className="flex items-end justify-between border-t border-slate-100 pt-5 dark:border-white/6">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-semibold text-slate-400 leading-none mb-1.5">
                          TIME SLOT
                        </span>
                        <span className="text-[13px] font-semibold leading-none text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-300)]">
                          {format(new Date(b.start_time), "HH:mm")} -{" "}
                          {format(new Date(b.end_time), "HH:mm")}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-semibold text-slate-400 mb-1.5 leading-none">
                          TOTAL
                        </span>
                        <span className="text-base font-semibold text-slate-950 dark:text-white leading-none block">
                          Rp{formatIDR(b.total_resource + b.total_fnb)}
                        </span>
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
