"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format, subDays } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  Clock3,
  LineChart,
  RefreshCcw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import api from "@/lib/api";
import { formatPlanLabel, formatSubscriptionStatusLabel } from "@/lib/plan-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RealtimePill } from "@/components/dashboard/realtime-pill";
import { hasPermission } from "@/lib/admin-access";
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
  DashboardLineChartPanel,
  DashboardMetricCard,
  DashboardPanel,
  DashboardStatStrip,
} from "@/components/dashboard/analytics-kit";
import { useAdminSession } from "@/components/dashboard/admin-session-context";

type RangeKey = "7d" | "30d" | "90d";
type SourceKey =
  | "bookingSummary"
  | "expenseSummary"
  | "expenseLedger"
  | "customers"
  | "subscription"
  | "salesOrders"
  | "resources"
  | "actionFeed";

type BookingSummaryPoint = {
  date: string;
  label: string;
  revenue?: number;
  bookings_count?: number;
};

type BookingResourceLeader = {
  id: string;
  name: string;
  bookings_count?: number;
  revenue?: number;
  last_booking_at?: string;
};

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

type BookingSummaryRow = {
  revenue?: number;
  addon_revenue?: number;
  bookings_count?: number;
  average_ticket?: number;
  daily_series?: BookingSummaryPoint[];
  resource_leaders?: BookingResourceLeader[];
  recent_bookings?: BookingRow[];
  addon_bookings?: BookingRow[];
};

type ExpenseRow = {
  id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  vendor?: string;
};

type ExpenseSummaryRow = {
  total?: number;
  entries?: number;
};

type CustomerRow = {
  id: string;
  name?: string;
  total_spent?: number;
  total_visits?: number;
  last_visit?: string;
};

type SubscriptionRow = {
  plan?: string;
  status?: string;
  current_period_end?: string;
};

type SalesOrderRow = {
  id: string;
  resource_name?: string;
  order_number?: string;
  status?: string;
  grand_total?: number;
  paid_amount?: number;
  balance_due?: number;
  payment_status?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
};

type ResourceSummaryRow = {
  id: string;
  name?: string;
  status?: string;
  category?: string;
  operating_mode?: string;
};

type ActionFeedRow = {
  id: string;
  kind?: string;
  status?: string;
  payment_status?: string;
  action_label?: string;
  balance_due?: number;
};

type SourceHealth = {
  key: SourceKey;
  label: string;
  ok: boolean;
};

const SOURCE_LABELS: Record<SourceKey, string> = {
  bookingSummary: "Ringkasan booking",
  expenseSummary: "Ringkasan pengeluaran",
  expenseLedger: "Ledger pengeluaran",
  customers: "Customer",
  subscription: "Subscription",
  salesOrders: "Direct sale",
  resources: "Resource",
  actionFeed: "POS action feed",
};

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

const rangeDays = (range: RangeKey) => (range === "7d" ? 7 : range === "90d" ? 90 : 30);

const formatPeriodEnd = (value?: string) => {
  const parsed = parseSafeDate(value);
  return parsed ? format(parsed, "dd MMM yyyy") : "-";
};

const buildDateSpine = (days: number) =>
  Array.from({ length: days }).map((_, index) => {
    const date = subDays(new Date(), days - index - 1);
    return {
      key: format(date, "yyyy-MM-dd"),
      label: format(date, "dd MMM"),
      shortLabel: format(date, "EEE"),
    };
  });

export default function SettingsAnalyticsPage() {
  const { user } = useAdminSession();
  const role = String(user?.role || "staff").toLowerCase();
  const permissions = user?.permission_keys || [];
  const tenantId = user?.tenant_id || "";
  const ownerOnly = role === "owner";
  const canReadAnalytics =
    ownerOnly || hasPermission({ role, permission_keys: permissions }, "analytics.read");
  const canReadExpenses =
    ownerOnly || hasPermission({ role, permission_keys: permissions }, "expenses.read");
  const canReadCustomers =
    ownerOnly || hasPermission({ role, permission_keys: permissions }, "customers.read");
  const canReadResources =
    ownerOnly || hasPermission({ role, permission_keys: permissions }, "resources.read");
  const canReadPos =
    ownerOnly || hasPermission({ role, permission_keys: permissions }, "pos.read");

  const [range, setRange] = useState<RangeKey>("30d");
  const [bookingSummary, setBookingSummary] = useState<BookingSummaryRow | null>(null);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummaryRow | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrderRow[]>([]);
  const [resources, setResources] = useState<ResourceSummaryRow[]>([]);
  const [actionFeed, setActionFeed] = useState<ActionFeedRow[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [sourceHealth, setSourceHealth] = useState<SourceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState("");
  const hasLoadedRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);

  const rangeStart = useMemo(
    () => format(subDays(new Date(), rangeDays(range) - 1), "yyyy-MM-dd"),
    [range],
  );
  const rangeEnd = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const fetchAnalytics = useCallback(
    async (mode: "initial" | "background" = "initial") => {
      const background = mode === "background" && hasLoadedRef.current;
      if (!background) setLoading(true);
      setRefreshing(true);

      const tasks = [
        {
          key: "bookingSummary" as const,
          label: SOURCE_LABELS.bookingSummary,
          enabled: canReadAnalytics,
          run: () => api.get("/bookings/analytics-summary", { params: { days: rangeDays(range) } }),
        },
        {
          key: "expenseSummary" as const,
          label: SOURCE_LABELS.expenseSummary,
          enabled: canReadExpenses,
          run: () => api.get("/expenses/summary", { params: { from: rangeStart, to: rangeEnd } }),
        },
        {
          key: "expenseLedger" as const,
          label: SOURCE_LABELS.expenseLedger,
          enabled: canReadExpenses,
          run: () => api.get("/expenses", { params: { limit: 200, from: rangeStart, to: rangeEnd } }),
        },
        {
          key: "customers" as const,
          label: SOURCE_LABELS.customers,
          enabled: canReadCustomers,
          run: () => api.get("/customers"),
        },
        {
          key: "subscription" as const,
          label: SOURCE_LABELS.subscription,
          enabled: ownerOnly,
          run: () => api.get("/billing/subscription"),
        },
        {
          key: "salesOrders" as const,
          label: SOURCE_LABELS.salesOrders,
          enabled: canReadPos,
          run: () => api.get("/sales-orders", { params: { limit: 200, status: "all" } }),
        },
        {
          key: "resources" as const,
          label: SOURCE_LABELS.resources,
          enabled: canReadResources,
          run: () => api.get("/admin/resources/summary"),
        },
        {
          key: "actionFeed" as const,
          label: SOURCE_LABELS.actionFeed,
          enabled: canReadPos,
          run: () =>
            api.get("/pos/action-feed", { params: { limit: 120, window_minutes: 10080 } }),
        },
      ].filter((task) => task.enabled);

      try {
        const results = await Promise.allSettled(tasks.map((task) => task.run()));
        const nextHealth: SourceHealth[] = [];
        let successCount = 0;

        tasks.forEach((task, index) => {
          const result = results[index];
          const ok = result.status === "fulfilled";
          nextHealth.push({ key: task.key, label: task.label, ok });
          if (!ok) return;

          successCount += 1;
          const data = result.value?.data;
          switch (task.key) {
            case "bookingSummary":
              setBookingSummary(data || null);
              break;
            case "expenseSummary":
              setExpenseSummary(data || null);
              break;
            case "expenseLedger":
              setExpenses(Array.isArray(data) ? data : []);
              break;
            case "customers":
              setCustomers(Array.isArray(data) ? data : []);
              break;
            case "subscription":
              setSubscription(data || null);
              break;
            case "salesOrders":
              setSalesOrders(data?.items || []);
              break;
            case "resources":
              setResources(data?.items || []);
              break;
            case "actionFeed":
              setActionFeed(data?.items || []);
              break;
          }
        });

        setSourceHealth(nextHealth);
        setLastSync(
          new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
        hasLoadedRef.current = true;

        if (!background && successCount === 0) {
          toast.error("Gagal memuat analytics");
        }
      } finally {
        if (!background) setLoading(false);
        setRefreshing(false);
      }
    },
    [
      canReadAnalytics,
      canReadCustomers,
      canReadExpenses,
      canReadPos,
      canReadResources,
      ownerOnly,
      range,
      rangeEnd,
      rangeStart,
    ],
  );

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

  const dateSpine = useMemo(() => buildDateSpine(rangeDays(range)), [range]);
  const rangeLabel =
    range === "7d" ? "7 hari terakhir" : range === "90d" ? "90 hari terakhir" : "30 hari terakhir";
  const currentPlanLabel = formatPlanLabel(subscription?.plan || user?.plan);

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const date = parseSafeDate(expense.expense_date);
        return date ? format(date, "yyyy-MM-dd") >= rangeStart : false;
      }),
    [expenses, rangeStart],
  );

  const filteredSalesOrders = useMemo(
    () =>
      salesOrders.filter((order) => {
        const date = parseSafeDate(order.completed_at || order.updated_at || order.created_at);
        return date ? format(date, "yyyy-MM-dd") >= rangeStart : false;
      }),
    [rangeStart, salesOrders],
  );

  const salesSummary = useMemo(() => {
    const settledOrders = filteredSalesOrders.filter((order) => {
      const paymentStatus = String(order.payment_status || "").toLowerCase();
      const status = String(order.status || "").toLowerCase();
      return (
        ["settled", "paid"].includes(paymentStatus) ||
        (status === "paid" && Number(order.balance_due || 0) <= 0) ||
        Number(order.paid_amount || 0) > 0
      );
    });

    const revenue = settledOrders.reduce((sum, order) => {
      const fullyPaid =
        ["settled", "paid"].includes(String(order.payment_status || "").toLowerCase()) ||
        Number(order.balance_due || 0) <= 0;
      return sum + (fullyPaid ? Number(order.grand_total || 0) : Number(order.paid_amount || 0));
    }, 0);

    return {
      revenue,
      ordersCount: filteredSalesOrders.length,
      settledCount: settledOrders.length,
      pendingBalance: filteredSalesOrders.reduce(
        (sum, order) => sum + Number(order.balance_due || 0),
        0,
      ),
    };
  }, [filteredSalesOrders]);

  const summary = useMemo(() => {
    const bookingRevenue = Number(bookingSummary?.revenue || 0);
    const posRevenue = Number(salesSummary.revenue || 0);
    const totalRevenue = bookingRevenue + posRevenue;
    const addonRevenue = Number(bookingSummary?.addon_revenue || 0);
    const expenseTotal = Number(expenseSummary?.total || 0);
    const transactionCount =
      Number(bookingSummary?.bookings_count || 0) + Number(salesSummary.ordersCount || 0);
    const netProfit = totalRevenue - expenseTotal;
    const averageTicket = transactionCount > 0 ? totalRevenue / transactionCount : 0;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const expenseRatio = totalRevenue > 0 ? (expenseTotal / totalRevenue) * 100 : 0;
    const addonRatio = totalRevenue > 0 ? (addonRevenue / totalRevenue) * 100 : 0;
    const verificationCount = actionFeed.filter(
      (item) => String(item.payment_status || "").toLowerCase() === "awaiting_verification",
    ).length;

    return {
      totalRevenue,
      bookingRevenue,
      posRevenue,
      addonRevenue,
      expenseTotal,
      expenseCount: Number(expenseSummary?.entries || filteredExpenses.length || 0),
      transactionCount,
      netProfit,
      averageTicket,
      profitMargin,
      expenseRatio,
      addonRatio,
      verificationCount,
      pendingBalance:
        actionFeed.reduce((sum, item) => sum + Number(item.balance_due || 0), 0) ||
        salesSummary.pendingBalance,
    };
  }, [actionFeed, bookingSummary, expenseSummary, filteredExpenses.length, salesSummary]);

  const trendPoints = useMemo(() => {
    const bookingRevenueByDay = new Map<string, number>();
    const bookingCountByDay = new Map<string, number>();
    const salesRevenueByDay = new Map<string, number>();
    const salesCountByDay = new Map<string, number>();
    const expenseByDay = new Map<string, number>();

    (bookingSummary?.daily_series || []).forEach((point) => {
      bookingRevenueByDay.set(point.date, Number(point.revenue || 0));
      bookingCountByDay.set(point.date, Number(point.bookings_count || 0));
    });

    filteredSalesOrders.forEach((order) => {
      const date = parseSafeDate(order.completed_at || order.updated_at || order.created_at);
      if (!date) return;
      const key = format(date, "yyyy-MM-dd");
      const fullyPaid =
        ["settled", "paid"].includes(String(order.payment_status || "").toLowerCase()) ||
        Number(order.balance_due || 0) <= 0;
      const value = fullyPaid ? Number(order.grand_total || 0) : Number(order.paid_amount || 0);
      salesRevenueByDay.set(key, (salesRevenueByDay.get(key) || 0) + value);
      salesCountByDay.set(key, (salesCountByDay.get(key) || 0) + 1);
    });

    filteredExpenses.forEach((expense) => {
      const date = parseSafeDate(expense.expense_date);
      if (!date) return;
      const key = format(date, "yyyy-MM-dd");
      expenseByDay.set(key, (expenseByDay.get(key) || 0) + Number(expense.amount || 0));
    });

    return dateSpine.map((point) => {
      const bookingRevenue = bookingRevenueByDay.get(point.key) || 0;
      const salesRevenue = salesRevenueByDay.get(point.key) || 0;
      const expensesValue = expenseByDay.get(point.key) || 0;
      const bookingCount = bookingCountByDay.get(point.key) || 0;
      const salesCount = salesCountByDay.get(point.key) || 0;
      const totalCount = bookingCount + salesCount;
      return {
        label: point.shortLabel.toUpperCase(),
        primary: bookingRevenue + salesRevenue,
        secondary: expensesValue,
        meta:
          totalCount > 0
            ? `${totalCount} transaksi`
            : expensesValue > 0
              ? "ada expense"
              : "tidak ada aktivitas",
      };
    });
  }, [bookingSummary, dateSpine, filteredExpenses, filteredSalesOrders]);

  const trendSummary = useMemo(() => {
    const totalRevenue = trendPoints.reduce((sum, point) => sum + point.primary, 0);
    const totalExpense = trendPoints.reduce((sum, point) => sum + point.secondary, 0);
    const peakPoint = trendPoints.reduce(
      (best, point) => (point.primary > best.primary ? point : best),
      trendPoints[0] || { label: "-", primary: 0, secondary: 0, meta: "" },
    );
    const activeDays = trendPoints.filter((point) => point.primary > 0 || point.secondary > 0).length;
    return {
      totalRevenue,
      totalExpense,
      peakLabel: peakPoint.label,
      peakRevenue: peakPoint.primary,
      activeDays,
    };
  }, [trendPoints]);

  const bookingRows = useMemo(() => {
    const rows = bookingSummary?.recent_bookings || [];
    const maxTotal = Math.max(...rows.map((item) => getBookingTotal(item)), 1);
    return rows.map((booking) => ({
      id: booking.id,
      title: booking.customer_name || "Guest",
      subtitle: `${booking.resource_name || "-"} - ${
        parseSafeDate(booking.start_time || booking.created_at)
          ? format(parseSafeDate(booking.start_time || booking.created_at) || new Date(), "dd MMM HH:mm")
          : "-"
      }`,
      value: `Rp ${formatIDR(getBookingTotal(booking))}`,
      meta: String(booking.payment_status || "pending").toUpperCase(),
      progress: (getBookingTotal(booking) / maxTotal) * 100,
    }));
  }, [bookingSummary]);

  const salesRows = useMemo(() => {
    const maxTotal = Math.max(...filteredSalesOrders.map((item) => Number(item.grand_total || 0)), 1);
    return filteredSalesOrders.slice(0, 8).map((order) => ({
      id: order.id,
      title: order.resource_name || order.order_number || "Direct sale",
      subtitle: parseSafeDate(order.completed_at || order.updated_at || order.created_at)
        ? format(parseSafeDate(order.completed_at || order.updated_at || order.created_at) || new Date(), "dd MMM HH:mm")
        : "-",
      value: `Rp ${formatIDR(order.grand_total)}`,
      meta: String(order.payment_status || order.status || "open").toUpperCase(),
      progress: (Number(order.grand_total || 0) / maxTotal) * 100,
    }));
  }, [filteredSalesOrders]);

  const expenseRows = useMemo(() => {
    const maxTotal = Math.max(...filteredExpenses.map((item) => Number(item.amount || 0)), 1);
    return filteredExpenses.slice(0, 8).map((expense) => ({
      id: expense.id,
      title: expense.title,
      subtitle: `${expense.category || "-"} - ${
        parseSafeDate(expense.expense_date)
          ? format(parseSafeDate(expense.expense_date) || new Date(), "dd MMM yyyy")
          : "-"
      }`,
      value: `Rp ${formatIDR(expense.amount)}`,
      meta: expense.vendor || "-",
      progress: (Number(expense.amount || 0) / maxTotal) * 100,
    }));
  }, [filteredExpenses]);

  const softFailures = sourceHealth.filter((item) => !item.ok);

  return (
    <div className="space-y-3 p-4 pb-20 sm:p-4">
      <AnalyticsHero
        onRefresh={() => void fetchAnalytics("background")}
        refreshing={refreshing}
        realtimeConnected={realtimeConnected}
        realtimeStatus={realtimeStatus}
        currentPlanLabel={currentPlanLabel}
        rangeLabel={rangeLabel}
        lastSync={lastSync}
        totalRevenue={summary.totalRevenue}
      />

      <div className="flex flex-wrap gap-2">
        {(["7d", "30d", "90d"] as RangeKey[]).map((item) => (
          <Button
            key={item}
            onClick={() => setRange(item)}
            variant={range === item ? "default" : "outline"}
            className={
              range === item
                ? "rounded-2xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
                : "rounded-2xl"
            }
          >
            {item === "7d" ? "7 Hari" : item === "30d" ? "30 Hari" : "90 Hari"}
          </Button>
        ))}
        <div className="bg-card text-muted-foreground ml-auto hidden items-center gap-2 rounded-full border border-border px-3 py-2 text-xs shadow-sm md:flex">
          <Clock3 className="h-4 w-4 text-[var(--bookinaja-600)]" />
          Sinkron {lastSync || "--:--"}
        </div>
      </div>

          {softFailures.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-semibold">Sebagian sumber data belum masuk</div>
                  <div className="mt-1 text-amber-800">
                    Halaman tetap menampilkan data yang tersedia. Sumber yang gagal:{" "}
                    {softFailures.map((item) => item.label).join(", ")}.
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardMetricCard
              label="Revenue total"
              value={`Rp ${formatIDR(summary.totalRevenue)}`}
              hint={rangeLabel}
              icon={TrendingUp}
              tone="indigo"
              loading={loading}
            />
            <DashboardMetricCard
              label="Revenue booking"
              value={`Rp ${formatIDR(summary.bookingRevenue)}`}
              hint={`${Number(bookingSummary?.bookings_count || 0)} booking`}
              icon={CalendarClock}
              tone="cyan"
              loading={loading}
            />
            <DashboardMetricCard
              label="Revenue direct sale"
              value={`Rp ${formatIDR(summary.posRevenue)}`}
              hint={`${salesSummary.ordersCount} order`}
              icon={Wallet}
              tone="emerald"
              loading={loading}
            />
            <DashboardMetricCard
              label="Pengeluaran"
              value={`Rp ${formatIDR(summary.expenseTotal)}`}
              hint={`${summary.expenseCount} entri`}
              icon={Banknote}
              tone="rose"
              loading={loading}
            />
          </div>

          <DashboardStatStrip
            items={[
              { label: "Plan", value: formatPlanLabel(subscription?.plan), tone: "slate" },
              { label: "Range", value: rangeLabel, tone: "indigo" },
              { label: "Addon share", value: `${summary.addonRatio.toFixed(1)}%`, tone: "emerald" },
              { label: "Expense ratio", value: `${summary.expenseRatio.toFixed(1)}%`, tone: "rose" },
            ]}
          />

          <section className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
            <DashboardLineChartPanel
              eyebrow="Trend inti"
              title="Revenue vs expense"
              description="Ringkasan ringan untuk membaca arah operasional, bukan audit detail."
              points={trendPoints}
              primaryLabel="Revenue"
              secondaryLabel="Expense"
              formatValue={(value) => `Rp ${formatIDR(value)}`}
            />

            <DashboardPanel
              eyebrow="Ringkasan"
              title="Angka yang perlu dicek"
              description="Fokus pada metrik operasional yang biasanya dipakai shift lead."
            >
              <div className="grid grid-cols-2 gap-3">
                <InfoChip label="Net" value={`Rp ${formatIDR(summary.netProfit)}`} />
                <InfoChip label="Avg ticket" value={`Rp ${formatIDR(summary.averageTicket)}`} />
                <InfoChip label="Outstanding" value={`Rp ${formatIDR(summary.pendingBalance)}`} />
                <InfoChip label="Verifikasi" value={`${summary.verificationCount} payment`} />
                <InfoChip label="Hari aktif" value={`${trendSummary.activeDays}/${rangeDays(range)}`} />
                <InfoChip label="Puncak" value={trendSummary.peakLabel} />
              </div>
            </DashboardPanel>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <DashboardPanel
              eyebrow="Operasional"
              title="Snapshot tenant"
              actions={<Badge variant="secondary">{formatPlanLabel(subscription?.plan)}</Badge>}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoChip
                  label="Subscription"
                  value={`${formatPlanLabel(subscription?.plan)} - ${formatSubscriptionStatusLabel(subscription?.status)}`}
                />
                <InfoChip label="Period end" value={formatPeriodEnd(subscription?.current_period_end)} />
                <InfoChip label="Need action" value={`${actionFeed.length} antrean`} />
                <InfoChip label="Customers" value={`${customers.length} customer`} />
                <InfoChip label="POS settled" value={`${salesSummary.settledCount} order`} />
                <InfoChip label="Resource" value={`${resources.length} unit`} />
              </div>
            </DashboardPanel>

            <DashboardPanel
              eyebrow="Aktivitas"
              title="Transaksi terbaru"
              actions={
                <Button asChild variant="outline" className="rounded-2xl">
                  <Link href="/admin/reports">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Laporan
                  </Link>
                </Button>
              }
            >
              <SimpleRows rows={[...bookingRows.slice(0, 4), ...salesRows.slice(0, 4)]} />
            </DashboardPanel>
          </section>

          <DashboardPanel eyebrow="Expense ledger" title="Pengeluaran terbaru">
            <SimpleRows rows={expenseRows.slice(0, 6)} emptyText="Belum ada pengeluaran pada rentang ini." />
          </DashboardPanel>
    </div>
  );
}

function AnalyticsHero({
  onRefresh,
  refreshing,
  realtimeConnected,
  realtimeStatus,
  currentPlanLabel,
  rangeLabel,
  lastSync,
  totalRevenue,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  realtimeConnected: boolean;
  realtimeStatus: "idle" | "connecting" | "connected" | "reconnecting";
  currentPlanLabel: string;
  rangeLabel: string;
  lastSync: string;
  totalRevenue: number;
}) {
  return (
    <Card className="rounded-xl border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-white/10 dark:bg-[#0f1117]/96">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border-none bg-[var(--bookinaja-600)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
              Analytics
            </Badge>
            <RealtimePill connected={realtimeConnected} status={realtimeStatus} />
          </div>
          <h1 className="mt-3 text-[1.75rem] font-semibold tracking-tight text-slate-950 dark:text-white">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pantau booking, direct sale, pengeluaran, dan performa tenant.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={onRefresh} variant="outline" className="h-9 rounded-xl px-3">
              <RefreshCcw className={refreshing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              Refresh
            </Button>
            <Button asChild className="h-9 rounded-xl bg-slate-950 px-3 text-white hover:bg-slate-800">
              <Link href="/admin/dashboard">
                <LineChart className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:w-[360px]">
          <AnalyticsStat label="Plan" value={currentPlanLabel || "-"} />
          <AnalyticsStat label="Range" value={rangeLabel} />
          <AnalyticsStat label="Sinkron" value={lastSync || "--:--"} />
          <AnalyticsStat label="Revenue" value={`Rp ${formatIDR(totalRevenue)}`} />
        </div>
      </div>
    </Card>
  );
}

function AnalyticsStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-slate-950/70">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function SimpleRows({
  rows,
  emptyText = "Belum ada aktivitas.",
}: {
  rows: Array<{ id: string; title: string; subtitle: string; value: string; meta: string }>;
  emptyText?: string;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-xl border border-border">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{row.title}</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{row.subtitle}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-semibold text-foreground">{row.value}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {row.meta}
            </div>
          </div>
        </div>
      ))}
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
    <div className="bg-muted/40 rounded-[1.35rem] border border-border px-4 py-3">
      <div className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.18em]">
        {label}
      </div>
      <div className="text-foreground mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}
