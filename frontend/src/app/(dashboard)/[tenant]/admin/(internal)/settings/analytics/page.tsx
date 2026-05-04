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
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RealtimePill } from "@/components/dashboard/realtime-pill";
import { toast } from "sonner";
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
  DashboardMetricCard,
  DashboardPanel,
  DashboardStatStrip,
  EmptyPanel,
} from "@/components/dashboard/analytics-kit";

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
      const [
        meRes,
        bookingsRes,
        expensesRes,
        resourcesRes,
        customersRes,
        subscriptionRes,
      ] = await Promise.all([
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
      setLastSync(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
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
  const periodEnd = parseSafeDate(subscription?.current_period_end);
  const alive = !subscription?.current_period_end || periodEnd === null || periodEnd > new Date();
  const isProActive = plan === "pro" && status === "active" && alive;
  const isStarterTrial =
    plan === "starter" && alive && (status === "trial" || status === "active");

  const rangeStart = useMemo(
    () => subDays(new Date(), rangeDays(range) - 1),
    [range],
  );
  const rangeLabel =
    range === "7d" ? "7 hari terakhir" : range === "90d" ? "90 hari terakhir" : "30 hari terakhir";

  const filteredBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const date = parseSafeDate(booking.start_time || booking.created_at);
        return !!date && date >= rangeStart;
      }),
    [bookings, rangeStart],
  );

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const date = parseSafeDate(expense.expense_date);
        return !!date && date >= rangeStart;
      }),
    [expenses, rangeStart],
  );

  const summary = useMemo(() => {
    const revenue = filteredBookings.reduce(
      (sum, booking) => sum + getBookingTotal(booking),
      0,
    );
    const addonRevenue = filteredBookings.reduce(
      (sum, booking) => sum + getAddonTotal(booking),
      0,
    );
    const expenseTotal = filteredExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0,
    );
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
        return dateValue && format(dateValue, "yyyy-MM-dd") === key
          ? sum + getBookingTotal(booking)
          : sum;
      }, 0);
      const expenseTotal = filteredExpenses.reduce((sum, expense) => {
        const dateValue = parseSafeDate(expense.expense_date);
        return dateValue && format(dateValue, "yyyy-MM-dd") === key
          ? sum + Number(expense.amount || 0)
          : sum;
      }, 0);
      const bookingsCount = filteredBookings.filter((booking) => {
        const dateValue = parseSafeDate(booking.start_time || booking.created_at);
        return dateValue ? format(dateValue, "yyyy-MM-dd") === key : false;
      }).length;
      return {
        label: format(date, "dd/MM"),
        primary: revenue,
        secondary: expenseTotal,
        tertiary: bookingsCount,
        meta: `${bookingsCount} booking`,
      };
    });
  }, [filteredBookings, filteredExpenses, range]);

  const resourceStats = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        bookingsCount: number;
        revenue: number;
        lastBookingAt: string | null;
      }
    >();

    resources.forEach((resource) =>
      map.set(resource.name, {
        id: resource.id,
        name: resource.name,
        bookingsCount: 0,
        revenue: 0,
        lastBookingAt: null,
      }),
    );

    filteredBookings.forEach((booking) => {
      const name = booking.resource_name || "Unknown";
      const date = parseSafeDate(booking.start_time || booking.created_at);
      const current = map.get(name) || {
        id: name,
        name,
        bookingsCount: 0,
        revenue: 0,
        lastBookingAt: null,
      };
      current.bookingsCount += 1;
      current.revenue += getBookingTotal(booking);
      if (date && (!current.lastBookingAt || date > new Date(current.lastBookingAt))) {
        current.lastBookingAt = date.toISOString();
      }
      map.set(name, current);
    });

    return Array.from(map.values()).sort(
      (a, b) => b.revenue - a.revenue || b.bookingsCount - a.bookingsCount,
    );
  }, [filteredBookings, resources]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    filteredExpenses.forEach((expense) => {
      const current = map.get(expense.category) || { amount: 0, count: 0 };
      current.amount += Number(expense.amount || 0);
      current.count += 1;
      map.set(expense.category, current);
    });
    return Array.from(map.entries())
      .map(([category, value]) => ({ category, ...value }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  const recentBookings = useMemo(
    () =>
      [...filteredBookings]
        .sort(
          (a, b) =>
            (parseSafeDate(b.start_time || b.created_at)?.getTime() || 0) -
            (parseSafeDate(a.start_time || a.created_at)?.getTime() || 0),
        )
        .slice(0, 8),
    [filteredBookings],
  );

  const topCustomers = useMemo(
    () =>
      [...customers]
        .sort(
          (a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0),
        )
        .slice(0, 6),
    [customers],
  );

  const addonBookings = useMemo(
    () =>
      [...filteredBookings]
        .filter((booking) => getAddonTotal(booking) > 0)
        .sort((a, b) => getAddonTotal(b) - getAddonTotal(a))
        .slice(0, 6),
    [filteredBookings],
  );

  const expenseSegments = useMemo(
    () =>
      categoryBreakdown.slice(0, 4).map((item, index) => ({
        label: item.category,
        value: item.amount,
        colorClass:
          index === 0
            ? "--chart-indigo"
            : index === 1
              ? "--chart-emerald"
              : index === 2
                ? "--chart-amber"
                : "--chart-rose",
      })),
    [categoryBreakdown],
  );

  const resourceRows = useMemo(() => {
    const maxRevenue = Math.max(...resourceStats.map((item) => item.revenue), 1);
    return resourceStats.slice(0, 8).map((resource) => ({
      id: resource.id,
      title: resource.name,
      subtitle: resource.lastBookingAt
        ? `last ${format(parseSafeDate(resource.lastBookingAt) || new Date(), "dd MMM HH:mm")}`
        : "belum ada booking",
      value: `Rp ${formatIDR(resource.revenue)}`,
      meta: `${resource.bookingsCount} booking`,
      progress: (resource.revenue / maxRevenue) * 100,
    }));
  }, [resourceStats]);

  const customerRows = useMemo(() => {
    const maxSpend = Math.max(...topCustomers.map((item) => Number(item.total_spent || 0)), 1);
    return topCustomers.map((customer) => ({
      id: customer.id,
      title: customer.name || "Customer",
      subtitle: customer.last_booking_at
        ? format(parseSafeDate(customer.last_booking_at) || new Date(), "dd MMM yyyy")
        : "no recent activity",
      value: `Rp ${formatIDR(customer.total_spent)}`,
      progress: (Number(customer.total_spent || 0) / maxSpend) * 100,
    }));
  }, [topCustomers]);

  const bookingRows = useMemo(() => {
    const maxTotal = Math.max(...recentBookings.map((item) => getBookingTotal(item)), 1);
    return recentBookings.map((booking) => ({
      id: booking.id,
      title: booking.customer_name || "Guest",
      subtitle: `${booking.resource_name || "-"} • ${
        parseSafeDate(booking.start_time || booking.created_at)
          ? format(parseSafeDate(booking.start_time || booking.created_at) || new Date(), "dd MMM HH:mm")
          : "-"
      }`,
      value: `Rp ${formatIDR(getBookingTotal(booking))}`,
      meta: String(booking.payment_status || "pending").toUpperCase(),
      progress: (getBookingTotal(booking) / maxTotal) * 100,
    }));
  }, [recentBookings]);

  if (!isProActive && !isStarterTrial) {
    return (
      <div className="space-y-5 p-4 pb-20 sm:p-6">
        <AnalyticsHero
          onRefresh={() => void fetchAnalytics("background")}
          refreshing={refreshing}
          realtimeConnected={realtimeConnected}
          realtimeStatus={realtimeStatus}
        />
        <DashboardPanel
          eyebrow="Mode laporan"
          title="Analytics belum aktif penuh"
          description="Akun ini belum berada pada plan yang membuka laporan detail. Saya tetap tampilkan shell layout supaya struktur dashboard konsisten walau konten finansialnya masih tertutup."
          actions={<Badge variant="secondary">{String(subscription?.plan || "starter").toUpperCase()}</Badge>}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardMetricCard label="Revenue" value="Locked" hint="aktif di Starter trial / Pro" tone="slate" />
            <DashboardMetricCard label="Expenses" value="Locked" hint="perlu plan analytics" tone="slate" />
            <DashboardMetricCard label="Profit" value="Locked" hint="butuh revenue dan expense" tone="slate" />
            <DashboardMetricCard label="Bookings" value="Visible later" hint="summary akan muncul saat plan aktif" tone="slate" />
          </div>
          <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm leading-relaxed text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
            Paket saat ini: <span className="font-semibold text-slate-950 dark:text-white">{subscription?.plan || "-"}</span>
            <br />
            Status langganan: <span className="font-semibold text-slate-950 dark:text-white">{subscription?.status || "-"}</span>
            <br />
            Aktif sampai: <span className="font-semibold text-slate-950 dark:text-white">{formatPeriodEnd(subscription?.current_period_end)}</span>
          </div>
        </DashboardPanel>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 pb-20 sm:p-6">
      <AnalyticsHero
        onRefresh={() => void fetchAnalytics("background")}
        refreshing={refreshing}
        realtimeConnected={realtimeConnected}
        realtimeStatus={realtimeStatus}
      />

      <div className="flex flex-wrap gap-2">
        {(["7d", "30d", "90d"] as RangeKey[]).map((item) => (
          <Button
            key={item}
            onClick={() => setRange(item)}
            variant={range === item ? "default" : "outline"}
            className={range === item ? "rounded-2xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]" : "rounded-2xl"}
          >
            {item === "7d" ? "7 Hari" : item === "30d" ? "30 Hari" : "90 Hari"}
          </Button>
        ))}
        <div className="ml-auto hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 md:flex">
          <Clock3 className="h-4 w-4 text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]" />
          Sinkron {lastSync || "--:--"}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <DashboardMetricCard label="Revenue" value={`Rp ${formatIDR(summary.revenue)}`} hint={rangeLabel} icon={TrendingUp} tone="indigo" loading={loading} />
        <DashboardMetricCard label="Expenses" value={`Rp ${formatIDR(summary.expenseTotal)}`} hint={`${summary.expenseCount} entri`} icon={Banknote} tone="rose" loading={loading} />
        <DashboardMetricCard label="Net Profit" value={`Rp ${formatIDR(summary.netProfit)}`} hint={`${summary.profitMargin.toFixed(1)}% margin`} icon={Wallet} tone={summary.netProfit >= 0 ? "emerald" : "amber"} loading={loading} />
        <DashboardMetricCard label="Bookings" value={String(summary.bookingsCount)} hint={`Avg Rp ${formatIDR(summary.averageTicket)}`} icon={CalendarClock} tone="cyan" loading={loading} />
        <DashboardMetricCard label="Customers" value={String(customers.length)} hint="database terkini" icon={Users} tone="slate" loading={loading} />
        <DashboardMetricCard label="Expense Ratio" value={`${summary.expenseRatio.toFixed(1)}%`} hint="biaya / revenue" icon={TrendingDown} tone="amber" loading={loading} />
      </div>

      <DashboardStatStrip
        items={[
          { label: "Plan", value: String(subscription?.plan || "-").toUpperCase(), tone: "slate" },
          { label: "Range", value: rangeLabel, tone: "indigo" },
          { label: "Addon Share", value: `${summary.addonRatio.toFixed(1)}%`, tone: "emerald" },
          { label: "Expense Count", value: `${summary.expenseCount} item`, tone: "rose" },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardLineChartPanel
          eyebrow="Core trend"
          title="Revenue vs expense harian"
          description="Satu chart utama diposisikan di kiri supaya pembacaan kesehatan bisnis langsung fokus ke sinyal primer, bukan tersebar ke banyak kartu kecil."
          points={dailySeries}
          primaryLabel="Revenue"
          secondaryLabel="Expense"
          tertiaryLabel="Bookings"
          formatValue={(value) => `Rp ${formatIDR(value)}`}
        />

        <DashboardDonutPanel
          eyebrow="Expense mix"
          title="Komposisi pengeluaran"
          description="Distribusi kategori expense dibuat donut supaya struktur biaya lebih cepat dibaca daripada daftar linear biasa."
          totalLabel="Total expense"
          totalValue={`Rp ${formatIDR(summary.expenseTotal)}`}
          segments={expenseSegments}
          footer={
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoChip label="Average ticket" value={`Rp ${formatIDR(summary.averageTicket)}`} />
              <InfoChip label="Profit margin" value={`${summary.profitMargin.toFixed(1)}%`} />
            </div>
          }
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DashboardLeaderboardPanel
          eyebrow="Resource leaderboard"
          title="Resource paling menghasilkan"
          description="Leaderboard menggabungkan frequency dan revenue supaya operator tahu unit mana yang paling layak diprioritaskan."
          rows={resourceRows}
          emptyText="Belum ada booking pada rentang ini."
        />

        <DashboardLeaderboardPanel
          eyebrow="Customer value"
          title="Customer dengan lifetime value tertinggi"
          description="Panel ini menjaga fokus CRM: siapa yang paling bernilai dan kapan terakhir mereka aktif."
          rows={customerRows}
          emptyText="Belum ada customer untuk dirangking."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DashboardLeaderboardPanel
          eyebrow="Latest bookings"
          title="Transaksi terbaru"
          description="List aktivitas dibuat konsisten dengan leaderboard agar ritme visual tetap rapi di seluruh dashboard."
          rows={bookingRows}
          emptyText="Belum ada booking untuk rentang ini."
        />

        <DashboardPanel
          eyebrow="Operational reading"
          title="Bacaan cepat untuk owner"
          description="Ringkasan kanan dipakai untuk interpretasi, bukan hanya angka mentah. Ini membantu dashboard terasa seperti alat keputusan, bukan kumpulan widget."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoChip label="Subscription" value={`${String(subscription?.plan || "-").toUpperCase()} • ${String(subscription?.status || "-")}`} />
            <InfoChip label="Period end" value={formatPeriodEnd(subscription?.current_period_end)} />
            <InfoChip label="Net profit" value={`Rp ${formatIDR(summary.netProfit)}`} />
            <InfoChip label="Addon revenue" value={`Rp ${formatIDR(summary.addonRevenue)}`} />
          </div>
          {isProActive ? (
            <div className="rounded-[1.6rem] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Pro unlock
              </div>
              <div className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div>Revenue tambahan dari F&amp;B / add-on: <span className="font-semibold text-slate-950 dark:text-white">{summary.addonRatio.toFixed(1)}%</span></div>
                <div>Top booking tambahan: <span className="font-semibold text-slate-950 dark:text-white">{addonBookings[0]?.customer_name || "belum ada"}</span></div>
              </div>
            </div>
          ) : null}
        </DashboardPanel>
      </section>

      {isProActive ? (
        <DashboardPanel
          eyebrow="Addon watch"
          title="Pendapatan tambahan dari F&B dan add-on"
          description="Section ini dipisah khusus agar owner bisa cepat melihat kontribusi non-core booking tanpa mengganggu chart utama."
          actions={
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href="/admin/dashboard">
                <ArrowRight className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          }
        >
          {addonBookings.length ? (
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {addonBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-[1.45rem] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    {booking.customer_name || "Guest"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {booking.resource_name || "-"} •{" "}
                    {parseSafeDate(booking.start_time || booking.created_at)
                      ? format(parseSafeDate(booking.start_time || booking.created_at) || new Date(), "dd MMM HH:mm")
                      : "-"}
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        F&amp;B / add-on
                      </div>
                      <div className="mt-1 text-lg font-[950] text-blue-600 dark:text-blue-300">
                        Rp {formatIDR(getAddonTotal(booking))}
                      </div>
                    </div>
                    <Badge className="rounded-full border-none bg-white/90 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-100">
                      active
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel text="Belum ada booking dengan F&B atau add-on pada rentang ini." />
          )}
        </DashboardPanel>
      ) : null}
    </div>
  );
}

function AnalyticsHero({
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
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(241,245,249,0.96))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.09)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,17,23,0.98),rgba(9,12,20,0.98))] dark:shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_32%)]" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border-none bg-[var(--bookinaja-600)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
              Analytics overview
            </Badge>
            <RealtimePill connected={realtimeConnected} status={realtimeStatus} />
          </div>
          <div>
            <h1 className="text-3xl font-[950] tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Laporan bisnis yang lebih terstruktur
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
              Layout analytics dirombak dengan prinsip dashboard yang lebih kuat:
              KPI penting di atas, chart utama sebagai fokus visual, lalu komposisi
              dan leaderboard di bawah untuk keputusan yang lebih cepat.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onRefresh} variant="outline" className="rounded-2xl">
            <RefreshCcw className={refreshing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
            Refresh
          </Button>
          <Button asChild className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800">
            <Link href="/admin/dashboard">
              <LineChart className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}
