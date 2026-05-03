"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format, subDays } from "date-fns";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  Clock3,
  LineChart,
  ReceiptText,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { RealtimePill } from "@/components/dashboard/realtime-pill";
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

type BookingRow = {
  id: string;
  customer_name?: string;
  resource_name?: string;
  start_time?: string;
  created_at?: string;
  payment_status?: string;
  grand_total?: number;
  total_resource?: number;
  total_fnb?: number;
};

type ExpenseRow = {
  id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
};

type ResourceRow = {
  id: string;
  name: string;
};

type CustomerRow = {
  id: string;
  name?: string;
  total_spent?: number;
  last_booking_at?: string;
};

type SubscriptionRow = {
  plan?: string;
  status?: string;
  current_period_end?: string;
};

type RangeKey = "7d" | "30d" | "90d";

const formatIDR = (value?: number) => new Intl.NumberFormat("id-ID").format(Number(value || 0));
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
const getAddonTotal = (booking: BookingRow) => Number(booking.total_fnb || 0);
const rangeDays = (range: RangeKey) => (range === "7d" ? 7 : range === "90d" ? 90 : 30);
const formatPeriodEnd = (value?: string) => {
  const parsed = parseSafeDate(value);
  return parsed ? format(parsed, "dd MMM yyyy") : "-";
};

export default function SettingsAnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState("");
  const [tenantId, setTenantId] = useState("");
  const hasLoadedRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);

  const fetchAnalytics = useCallback(async (mode: "initial" | "background" = "initial") => {
    const background = mode === "background" && hasLoadedRef.current;
    if (!background) setLoading(true);
    setRefreshing(true);
    try {
      const [meRes, bookingsRes, expensesRes, resourcesRes, customersRes, subscriptionRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/bookings"),
        api.get("/expenses", { params: { limit: 100 } }),
        api.get("/resources-all"),
        api.get("/customers"),
        api.get("/billing/subscription"),
      ]);

      setTenantId(meRes.data?.user?.tenant_id || "");
      setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
      setExpenses(Array.isArray(expensesRes.data) ? expensesRes.data : []);
      setResources(resourcesRes.data?.resources || []);
      setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
      setSubscription(subscriptionRes.data || null);
      setLastSync(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
      hasLoadedRef.current = true;
    } catch {
      if (!background) {
        toast.error("Gagal memuat analytics");
      }
    } finally {
      if (!background) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnalytics("initial");
    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [fetchAnalytics]);

  const scheduleAnalyticsRefresh = useCallback(
    (delay = 500) => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;
        void fetchAnalytics("background");
      }, delay);
    },
    [fetchAnalytics],
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
        scheduleAnalyticsRefresh();
      }
    },
    onReconnect: () => {
      scheduleAnalyticsRefresh(150);
    },
  });

  const plan = String(subscription?.plan || "").toLowerCase().trim();
  const status = String(subscription?.status || "").toLowerCase().trim();
  const alive = !subscription?.current_period_end || parseSafeDate(subscription.current_period_end) === null || parseSafeDate(subscription.current_period_end)! > new Date();
  const isProActive = plan === "pro" && status === "active" && alive;
  const isStarterTrial = plan === "starter" && alive && (status === "trial" || status === "active");

  const rangeStart = useMemo(() => subDays(new Date(), rangeDays(range) - 1), [range]);
  const rangeLabel = range === "7d" ? "7 hari terakhir" : range === "90d" ? "90 hari terakhir" : "30 hari terakhir";

  const filteredBookings = useMemo(
    () => bookings.filter((booking) => {
      const date = parseSafeDate(booking.start_time || booking.created_at);
      return !!date && date >= rangeStart;
    }),
    [bookings, rangeStart],
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => {
      const date = parseSafeDate(expense.expense_date);
      return !!date && date >= rangeStart;
    }),
    [expenses, rangeStart],
  );

  const summary = useMemo(() => {
    const revenue = filteredBookings.reduce((sum, booking) => sum + getBookingTotal(booking), 0);
    const addonRevenue = filteredBookings.reduce((sum, booking) => sum + getAddonTotal(booking), 0);
    const expenseTotal = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const netProfit = revenue - expenseTotal;
    const bookingsCount = filteredBookings.length;
    const expenseCount = filteredExpenses.length;
    const averageTicket = bookingsCount > 0 ? revenue / bookingsCount : 0;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const expenseRatio = revenue > 0 ? (expenseTotal / revenue) * 100 : 0;
    const addonRatio = revenue > 0 ? (addonRevenue / revenue) * 100 : 0;

    return {
      revenue,
      addonRevenue,
      expenseTotal,
      netProfit,
      bookingsCount,
      expenseCount,
      averageTicket,
      profitMargin,
      expenseRatio,
      addonRatio,
    };
  }, [filteredBookings, filteredExpenses]);

  const dailySeries = useMemo(() => {
    const days = rangeDays(range);
    return Array.from({ length: days }).map((_, index) => {
      const date = subDays(new Date(), days - 1 - index);
      const key = format(date, "yyyy-MM-dd");
      const revenue = filteredBookings.reduce((sum, booking) => {
        const dateValue = parseSafeDate(booking.start_time || booking.created_at);
        return dateValue && format(dateValue, "yyyy-MM-dd") === key ? sum + getBookingTotal(booking) : sum;
      }, 0);
      const expenseTotal = filteredExpenses.reduce((sum, expense) => {
        const dateValue = parseSafeDate(expense.expense_date);
        return dateValue && format(dateValue, "yyyy-MM-dd") === key ? sum + Number(expense.amount || 0) : sum;
      }, 0);
      const bookingsCount = filteredBookings.filter((booking) => {
        const dateValue = parseSafeDate(booking.start_time || booking.created_at);
        return dateValue ? format(dateValue, "yyyy-MM-dd") === key : false;
      }).length;
      return { key, label: format(date, "dd/MM"), weekday: format(date, "EEE"), revenue, expenseTotal, bookingsCount };
    });
  }, [filteredBookings, filteredExpenses, range]);

  const resourceStats = useMemo(() => {
    const map = new Map<string, { id: string; name: string; bookingsCount: number; revenue: number; lastBookingAt: string | null }>();
    resources.forEach((resource) => map.set(resource.name, { id: resource.id, name: resource.name, bookingsCount: 0, revenue: 0, lastBookingAt: null }));
    filteredBookings.forEach((booking) => {
      const name = booking.resource_name || "Unknown";
      const date = parseSafeDate(booking.start_time || booking.created_at);
      const current = map.get(name) || { id: name, name, bookingsCount: 0, revenue: 0, lastBookingAt: null };
      current.bookingsCount += 1;
      current.revenue += getBookingTotal(booking);
      if (date && (!current.lastBookingAt || date > new Date(current.lastBookingAt))) current.lastBookingAt = date.toISOString();
      map.set(name, current);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue || b.bookingsCount - a.bookingsCount);
  }, [filteredBookings, resources]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    filteredExpenses.forEach((expense) => {
      const current = map.get(expense.category) || { amount: 0, count: 0 };
      current.amount += Number(expense.amount || 0);
      current.count += 1;
      map.set(expense.category, current);
    });
    return Array.from(map.entries()).map(([category, value]) => ({ category, ...value })).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  const recentBookings = useMemo(
    () => [...filteredBookings].sort((a, b) => (parseSafeDate(b.start_time || b.created_at)?.getTime() || 0) - (parseSafeDate(a.start_time || a.created_at)?.getTime() || 0)).slice(0, 8),
    [filteredBookings],
  );

  const topCustomers = useMemo(
    () => [...customers].sort((a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0)).slice(0, 6),
    [customers],
  );

  const addonBookings = useMemo(
    () => [...filteredBookings].filter((booking) => getAddonTotal(booking) > 0).sort((a, b) => getAddonTotal(b) - getAddonTotal(a)).slice(0, 6),
    [filteredBookings],
  );

  if (!isProActive && !isStarterTrial) {
    return (
      <div className="space-y-4 p-4 pb-20 sm:space-y-6 sm:p-6">
        <HeroHeader
          onRefresh={() => void fetchAnalytics("background")}
          refreshing={refreshing}
          realtimeConnected={realtimeConnected}
          realtimeStatus={realtimeStatus}
        />
        <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Mode Laporan</div>
              <div className="text-lg font-semibold text-slate-950 dark:text-white">Shell Starter</div>
            </div>
            <Badge variant="secondary">{String(subscription?.plan || "starter").toUpperCase()}</Badge>
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10">
            Paket saat ini: <span className="font-medium text-slate-700 dark:text-slate-200">{subscription?.plan || "-"}</span>
            <br />
            Status langganan: <span className="font-medium text-slate-700 dark:text-slate-200">{subscription?.status || "-"}</span>
            <br />
            Aktif sampai: <span className="font-medium text-slate-700 dark:text-slate-200">{formatPeriodEnd(subscription?.current_period_end)}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StarterPanel label="Revenue" />
            <StarterPanel label="Expenses" />
            <StarterPanel label="Profit" />
            <StarterPanel label="Bookings" />
          </div>
        </Card>
        <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17] sm:p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Preview</div>
          <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">Section analytics yang tersedia di Pro</div>
          <div className="mt-3 space-y-2 text-sm text-slate-500">
            <div>• Tren harian revenue dan expense</div>
            <div>• Leaderboard resource</div>
            <div>• Breakdown kategori expense</div>
            <div>• Riwayat booking terbaru dan top customers</div>
            <div>• Report F&B dan addon</div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-20 sm:space-y-6 sm:p-6">
      <HeroHeader
        onRefresh={() => void fetchAnalytics("background")}
        refreshing={refreshing}
        realtimeConnected={realtimeConnected}
        realtimeStatus={realtimeStatus}
      />

      <div className="flex flex-wrap gap-2">
        {(["7d", "30d", "90d"] as RangeKey[]).map((item) => (
          <Button key={item} onClick={() => setRange(item)} variant={range === item ? "default" : "outline"} className={cn("h-9 px-3 text-xs font-semibold", range === item ? "bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]" : "")}>
            {item === "7d" ? "7 Hari" : item === "30d" ? "30 Hari" : "90 Hari"}
          </Button>
        ))}
        <div className="ml-auto hidden items-center gap-2 text-xs text-slate-400 md:flex">
          <Clock3 className="h-4 w-4 text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]" />
          Sinkron {lastSync || "--:--"}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Revenue" value={`Rp ${formatIDR(summary.revenue)}`} hint={rangeLabel} icon={TrendingUp} loading={loading} />
        <SummaryCard label="Expenses" value={`Rp ${formatIDR(summary.expenseTotal)}`} hint={`${summary.expenseCount} entri`} icon={Banknote} loading={loading} />
        <SummaryCard label="Net Profit" value={`Rp ${formatIDR(summary.netProfit)}`} hint={`${summary.profitMargin.toFixed(1)}% margin`} icon={Wallet} loading={loading} />
        <SummaryCard label="Booking" value={String(summary.bookingsCount)} hint={`Avg Rp ${formatIDR(summary.averageTicket)}`} icon={CalendarClock} loading={loading} />
        <SummaryCard label="Customer" value={String(customers.length)} hint="database terkini" icon={Users} loading={loading} />
        <SummaryCard label="Expense Ratio" value={`${summary.expenseRatio.toFixed(1)}%`} hint="biaya / revenue" icon={TrendingDown} loading={loading} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tren Harian</div>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Revenue, expense, booking</h2>
            </div>
            <Badge variant="secondary">{rangeLabel}</Badge>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <>
                <Skeleton className="h-36 rounded-xl" />
                <Skeleton className="h-36 rounded-xl" />
                <Skeleton className="h-36 rounded-xl" />
              </>
            ) : dailySeries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 dark:border-white/10">Tidak ada data pada rentang ini.</div>
            ) : (
              dailySeries.map((item) => (
                <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.weekday}</div>
                      <div className="text-sm font-medium text-slate-950 dark:text-white">{item.label}</div>
                    </div>
                    <Badge variant="secondary">{item.bookingsCount} booking</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <MetricMini label="Rev" value={formatIDR(item.revenue)} />
                    <MetricMini label="Exp" value={formatIDR(item.expenseTotal)} />
                    <MetricMini label="Bk" value={String(item.bookingsCount)} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Ringkasan Cepat</div>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Bacaan operasional</h2>
            </div>
            <LineChart className="h-5 w-5 text-blue-600" />
          </div>
          <div className="mt-4 space-y-3">
            <InfoRow label="Revenue" value={`Rp ${formatIDR(summary.revenue)}`} tone="text-blue-600" />
            <InfoRow label="Expenses" value={`Rp ${formatIDR(summary.expenseTotal)}`} tone="text-rose-500" />
            <InfoRow label="Net Profit" value={`Rp ${formatIDR(summary.netProfit)}`} tone={summary.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"} />
            <InfoRow label="Avg Ticket" value={`Rp ${formatIDR(summary.averageTicket)}`} tone="text-slate-950 dark:text-white" />
            <InfoRow label="Expense Ratio" value={`${summary.expenseRatio.toFixed(1)}%`} tone="text-slate-500" />
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-white/5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Subscription</div>
            <div className="mt-1 text-sm font-medium text-slate-950 dark:text-white">{(subscription?.plan || "-").toUpperCase()}</div>
            <div className="mt-1 text-sm text-slate-500">Status: {subscription?.status || "-"}</div>
          </div>
        </Card>
      </div>

      {isProActive && (
        <div className="grid gap-4 xl:grid-cols-4">
          <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Sinyal Konversi</div>
            <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">Pelanggan bernilai tinggi</div>
            <div className="mt-3 space-y-2 text-sm text-slate-500">
              <div>• Top 6 customer berdasarkan spend</div>
              <div>• Frekuensi booking ulang</div>
              <div>• Sesi aktif vs selesai</div>
            </div>
          </Card>
          <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Utilisasi</div>
            <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">Pola penggunaan resource</div>
            <div className="mt-3 space-y-2 text-sm text-slate-500">
              <div>• Resource paling sering dipakai</div>
              <div>• Aktivitas booking terakhir</div>
              <div>• Revenue per resource</div>
            </div>
          </Card>
          <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Struktur Biaya</div>
            <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">Komposisi expense</div>
            <div className="mt-3 space-y-2 text-sm text-slate-500">
              <div>• Breakdown kategori</div>
              <div>• Rasio expense</div>
              <div>• Tren revenue vs cost</div>
            </div>
          </Card>
          <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">F&B dan Add-on</div>
            <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">Pendapatan tambahan</div>
            <div className="mt-3 space-y-2 text-sm text-slate-500">
              <div>• Total F&B / add-on booking</div>
              <div>• Share pendapatan tambahan</div>
              <div>• Booking paling banyak add-on</div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Leaderboard Resource</div>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Resource paling perform</h2>
            </div>
            <Badge variant="secondary">{resourceStats.length}</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {loading ? (
              <>
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
              </>
            ) : resourceStats.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 dark:border-white/10">Belum ada booking pada rentang ini.</div>
            ) : (
              resourceStats.slice(0, 8).map((resource, index) => (
                <div key={resource.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-white/5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">{index + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-950 dark:text-white">{resource.name}</div>
                    <div className="text-xs text-slate-500">{resource.bookingsCount} booking • {resource.lastBookingAt ? format(parseSafeDate(resource.lastBookingAt) || new Date(), "dd MMM HH:mm") : "-"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Revenue</div>
                    <div className="text-sm font-semibold text-blue-600">Rp {formatIDR(resource.revenue)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Komposisi Expense</div>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Kategori pengeluaran</h2>
            </div>
            <ReceiptText className="h-5 w-5 text-blue-600" />
          </div>
          <div className="mt-4 space-y-2">
            {loading ? (
              <>
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </>
            ) : categoryBreakdown.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 dark:border-white/10">Belum ada expense.</div>
            ) : (
              categoryBreakdown.slice(0, 8).map((item) => {
                const maxAmount = Math.max(...categoryBreakdown.map((x) => x.amount), 1);
                const percent = summary.expenseTotal > 0 ? (item.amount / summary.expenseTotal) * 100 : 0;
                return (
                  <div key={item.category} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-950 dark:text-white">{item.category}</div>
                        <div className="text-xs text-slate-500">{item.count} entri</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-blue-600">Rp {formatIDR(item.amount)}</div>
                        <div className="text-xs text-slate-400">{percent.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-white/10">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max((item.amount / maxAmount) * 100, 10)}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {isProActive && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">F&B dan Add-on</div>
                <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Pendapatan tambahan</h2>
              </div>
              <Badge variant="secondary">Pro</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoRow label="Revenue F&B/Add-on" value={`Rp ${formatIDR(summary.addonRevenue)}`} tone="text-blue-600" />
              <InfoRow label="Share terhadap revenue" value={`${summary.addonRatio.toFixed(1)}%`} tone="text-slate-950 dark:text-white" />
            </div>
            <div className="mt-4 space-y-2">
              {addonBookings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10">Belum ada booking dengan F&B / add-on.</div>
              ) : (
                addonBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-white/5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-950 dark:text-white">{booking.customer_name || "Guest"}</div>
                      <div className="text-xs text-slate-500">{booking.resource_name || "-"} • {parseSafeDate(booking.start_time || booking.created_at) ? format(parseSafeDate(booking.start_time || booking.created_at)!, "dd MMM HH:mm") : "-"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">F&B/Add-on</div>
                      <div className="text-sm font-semibold text-blue-600">Rp {formatIDR(getAddonTotal(booking))}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Catatan Operasional</div>
            <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">Yang ditambah di Pro</div>
            <div className="mt-4 space-y-2 text-sm text-slate-500">
              <div>• Tren revenue harian</div>
              <div>• Kategori expense dan rasio</div>
              <div>• Distribusi status pembayaran</div>
              <div>• Leaderboard resource</div>
              <div>• Top customers</div>
              <div>• Report F&B dan add-on</div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Booking Terbaru</div>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Transaksi terakhir</h2>
            </div>
            <CalendarClock className="h-5 w-5 text-blue-600" />
          </div>
          <div className="mt-4 space-y-2">
            {loading ? (
              <>
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
              </>
            ) : recentBookings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 dark:border-white/10">Belum ada booking.</div>
            ) : (
              recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-white/5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">{(booking.customer_name || "C").slice(0, 2)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-950 dark:text-white">{booking.customer_name || "Guest"}</div>
                    <div className="text-xs text-slate-500">{booking.resource_name || "-"} • {parseSafeDate(booking.start_time || booking.created_at) ? format(parseSafeDate(booking.start_time || booking.created_at)!, "dd MMM HH:mm") : "-"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">{booking.payment_status || "pending"}</div>
                    <div className="text-sm font-semibold text-blue-600">Rp {formatIDR(getBookingTotal(booking))}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Top Customers</div>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Nilai lifetime tertinggi</h2>
            </div>
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div className="mt-4 space-y-2">
            {loading ? (
              <>
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
              </>
            ) : topCustomers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 dark:border-white/10">Tidak ada customer.</div>
            ) : (
              topCustomers.map((customer, index) => (
                <div key={customer.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-white/5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">{index + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-950 dark:text-white">{customer.name || "Customer"}</div>
                    <div className="text-xs text-slate-500">{customer.last_booking_at ? format(parseSafeDate(customer.last_booking_at) || new Date(), "dd MMM yyyy") : "no recent activity"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Spend</div>
                    <div className="text-sm font-semibold text-blue-600">Rp {formatIDR(customer.total_spent)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Catatan</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Apa yang dibaca dari report ini</h2>
          </div>
          <div className="text-xs text-slate-400">Diperbarui {lastSync || "--:--"}</div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <NoteBox title="Revenue" text="Pendapatan booking pada periode terpilih." />
          <NoteBox title="Expenses" text="Pengeluaran yang tercatat di modul expense." />
          <NoteBox title="Profit" text="Revenue dikurangi expense untuk membaca kesehatan kas cepat." />
        </div>
      </Card>
    </div>
  );
}

function HeroHeader({
  onRefresh,
  refreshing,
  realtimeConnected,
  realtimeStatus,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  realtimeConnected: boolean;
  realtimeStatus: "idle" | "connecting" | "connected" | "reconnecting";
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
          <LineChart className="h-4 w-4" />
          Analytics Overview
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">Ringkasan bisnis</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
          Starter trial bisa melihat ringkasan report, sementara Pro aktif mendapat angka detail, F&B, add-on, dan insight operasional yang lebih lengkap.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <div className="flex items-center gap-2">
          <RealtimePill connected={realtimeConnected} status={realtimeStatus} />
          <Button onClick={onRefresh} variant="outline" className="w-full gap-2 sm:w-auto">
            <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
        <Button asChild className="w-full gap-2 bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)] sm:w-auto">
          <Link href="/admin/dashboard">
            <ArrowRight className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  return (
    <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
          {loading ? <Skeleton className="h-8 w-24 rounded-lg" /> : <div className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</div>}
          <div className="text-xs text-slate-500">{hint}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-2 py-1 text-center dark:bg-slate-950/40">
      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="text-[11px] font-medium text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}

function InfoRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className={cn("text-sm font-semibold", tone)}>{value}</div>
    </div>
  );
}

function NoteBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

function StarterPanel({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-3 h-6 w-24 rounded-lg bg-slate-200 dark:bg-white/10" />
      <div className="mt-2 h-3 w-32 rounded-full bg-slate-200 dark:bg-white/10" />
    </div>
  );
}
