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
  Coins,
  LineChart,
  ReceiptText,
  RefreshCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import api from "@/lib/api";
import { formatPlanLabel, formatSubscriptionStatusLabel } from "@/lib/plan-access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DashboardDonutPanel,
  DashboardLeaderboardPanel,
  DashboardLineChartPanel,
  DashboardMetricCard,
  DashboardPanel,
  DashboardStatStrip,
  EmptyPanel,
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

  const revenueSegments = useMemo(
    () =>
      [
        { label: "Booking", value: summary.bookingRevenue, colorClass: "--chart-indigo" },
        { label: "Direct sale", value: summary.posRevenue, colorClass: "--chart-emerald" },
        { label: "Add-on", value: summary.addonRevenue, colorClass: "--chart-amber" },
      ].filter((segment) => segment.value > 0),
    [summary.addonRevenue, summary.bookingRevenue, summary.posRevenue],
  );

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    filteredExpenses.forEach((expense) => {
      const current = map.get(expense.category || "Lainnya") || { amount: 0, count: 0 };
      current.amount += Number(expense.amount || 0);
      current.count += 1;
      map.set(expense.category || "Lainnya", current);
    });
    return Array.from(map.entries())
      .map(([category, value]) => ({ category, ...value }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  const expenseSegments = useMemo(
    () =>
      categoryBreakdown.slice(0, 4).map((item, index) => ({
        label: item.category,
        value: item.amount,
        colorClass:
          index === 0
            ? "--chart-rose"
            : index === 1
              ? "--chart-amber"
              : index === 2
                ? "--chart-indigo"
                : "--chart-emerald",
      })),
    [categoryBreakdown],
  );

  const resourceStatusSegments = useMemo(() => {
    const available = resources.filter((item) => item.status === "available").length;
    const maintenance = resources.filter((item) => item.status === "maintenance").length;
    const other = Math.max(resources.length - available - maintenance, 0);
    return [
      { label: "Siap", value: available, colorClass: "--chart-emerald" },
      { label: "Maintenance", value: maintenance, colorClass: "--chart-amber" },
      { label: "Lainnya", value: other, colorClass: "--chart-indigo" },
    ].filter((segment) => segment.value > 0);
  }, [resources]);

  const resourceRows = useMemo(() => {
    const leaders = bookingSummary?.resource_leaders || [];
    const maxRevenue = Math.max(...leaders.map((item) => Number(item.revenue || 0)), 1);
    return leaders.slice(0, 8).map((resource) => ({
      id: resource.id,
      title: resource.name,
      subtitle: resource.last_booking_at
        ? `last ${format(parseSafeDate(resource.last_booking_at) || new Date(), "dd MMM HH:mm")}`
        : "belum ada booking",
      value: `Rp ${formatIDR(resource.revenue)}`,
      meta: `${resource.bookings_count || 0} booking`,
      progress: (Number(resource.revenue || 0) / maxRevenue) * 100,
    }));
  }, [bookingSummary]);

  const topCustomers = useMemo(
    () =>
      [...customers]
        .sort((a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0))
        .slice(0, 6),
    [customers],
  );

  const customerRows = useMemo(() => {
    const maxSpend = Math.max(...topCustomers.map((item) => Number(item.total_spent || 0)), 1);
    return topCustomers.map((customer) => ({
      id: customer.id,
      title: customer.name || "Customer",
      subtitle: customer.last_visit
        ? `terakhir ${format(parseSafeDate(customer.last_visit) || new Date(), "dd MMM yyyy")}`
        : "belum ada kunjungan",
      value: `Rp ${formatIDR(customer.total_spent)}`,
      meta: `${customer.total_visits || 0} visit`,
      progress: (Number(customer.total_spent || 0) / maxSpend) * 100,
    }));
  }, [topCustomers]);

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
  const addonBookings = bookingSummary?.addon_bookings || [];

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
            className={
              range === item
                ? "rounded-2xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
                : "rounded-2xl"
            }
          >
            {item === "7d" ? "7 Hari" : item === "30d" ? "30 Hari" : "90 Hari"}
          </Button>
        ))}
        <div className="ml-auto hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm md:flex">
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
        <DashboardMetricCard
          label="Laba bersih"
          value={`Rp ${formatIDR(summary.netProfit)}`}
          hint={`${summary.profitMargin.toFixed(1)}% margin`}
          icon={Coins}
          tone={summary.netProfit >= 0 ? "emerald" : "amber"}
          loading={loading}
        />
        <DashboardMetricCard
          label="Rata-rata tiket"
          value={`Rp ${formatIDR(summary.averageTicket)}`}
          hint={`${summary.transactionCount} transaksi`}
          icon={ReceiptText}
          tone="slate"
          loading={loading}
        />
        <DashboardMetricCard
          label="Perlu verifikasi"
          value={String(summary.verificationCount)}
          hint="manual payment"
          icon={Sparkles}
          tone="amber"
          loading={loading}
        />
        <DashboardMetricCard
          label="Saldo tertagih"
          value={`Rp ${formatIDR(summary.pendingBalance)}`}
          hint="booking + POS"
          icon={TrendingDown}
          tone="slate"
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
          title="Revenue total vs expense harian"
          description="Revenue menggabungkan booking dan direct sale, lalu dibandingkan dengan expense harian di rentang yang sama."
          points={trendPoints}
          primaryLabel="Revenue"
          secondaryLabel="Expense"
          formatValue={(value) => `Rp ${formatIDR(value)}`}
        />

        <div className="space-y-4">
          <DashboardDonutPanel
            eyebrow="Revenue mix"
            title="Komposisi pemasukan"
            totalLabel="Total revenue"
            totalValue={`Rp ${formatIDR(summary.totalRevenue)}`}
            segments={revenueSegments}
            footer={
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoChip label="Average ticket" value={`Rp ${formatIDR(summary.averageTicket)}`} />
                <InfoChip label="Saldo tertagih" value={`Rp ${formatIDR(summary.pendingBalance)}`} />
              </div>
            }
          />

          <DashboardPanel
            eyebrow="Trend reading"
            title="Bacaan cepat rentang ini"
            description="Ringkasan singkat supaya owner bisa baca pola tanpa pindah ke tabel."
          >
            <div className="grid grid-cols-2 gap-3">
              <InfoChip label="Total revenue" value={`Rp ${formatIDR(trendSummary.totalRevenue)}`} />
              <InfoChip label="Total expense" value={`Rp ${formatIDR(trendSummary.totalExpense)}`} />
              <InfoChip label="Hari aktif" value={`${trendSummary.activeDays}/${rangeDays(range)}`} />
              <InfoChip label="Puncak" value={`${trendSummary.peakLabel} - Rp ${formatIDR(trendSummary.peakRevenue)}`} />
            </div>
          </DashboardPanel>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DashboardLeaderboardPanel
          eyebrow="Resource leaderboard"
          title="Resource paling menghasilkan"
          rows={resourceRows}
          emptyText="Belum ada booking pada rentang ini."
        />

        <DashboardLeaderboardPanel
          eyebrow="Customer value"
          title="Customer dengan lifetime value tertinggi"
          rows={customerRows}
          emptyText="Belum ada customer untuk dirangking."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DashboardLeaderboardPanel
          eyebrow="Latest bookings"
          title="Transaksi booking terbaru"
          rows={bookingRows}
          emptyText="Belum ada booking pada rentang ini."
        />

        <DashboardLeaderboardPanel
          eyebrow="Latest direct sale"
          title="Order POS terbaru"
          rows={salesRows}
          emptyText="Belum ada direct sale pada rentang ini."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardDonutPanel
          eyebrow="Expense mix"
          title="Komposisi pengeluaran"
          totalLabel="Total expense"
          totalValue={`Rp ${formatIDR(summary.expenseTotal)}`}
          segments={expenseSegments}
          footer={
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoChip label="Kategori aktif" value={`${categoryBreakdown.length} kategori`} />
              <InfoChip label="Entries" value={`${summary.expenseCount} catatan`} />
            </div>
          }
        />

        <DashboardPanel
          eyebrow="Owner reading"
          title="Snapshot operasional"
          actions={<Badge variant="secondary">{formatPlanLabel(subscription?.plan)}</Badge>}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoChip
              label="Subscription"
              value={`${formatPlanLabel(subscription?.plan)} - ${formatSubscriptionStatusLabel(subscription?.status)}`}
            />
            <InfoChip label="Period end" value={formatPeriodEnd(subscription?.current_period_end)} />
            <InfoChip label="Add-on revenue" value={`Rp ${formatIDR(summary.addonRevenue)}`} />
            <InfoChip label="Need action" value={`${actionFeed.length} antrean`} />
            <InfoChip label="Customers aktif" value={`${customers.length} customer`} />
            <InfoChip label="POS settled" value={`${salesSummary.settledCount} order`} />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Resource status
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-slate-500">Siap</div>
                  <div className="mt-1 font-semibold text-slate-950">
                    {resourceStatusSegments.find((item) => item.label === "Siap")?.value || 0}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Maintenance</div>
                  <div className="mt-1 font-semibold text-slate-950">
                    {resourceStatusSegments.find((item) => item.label === "Maintenance")?.value || 0}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Lainnya</div>
                  <div className="mt-1 font-semibold text-slate-950">
                    {resourceStatusSegments.find((item) => item.label === "Lainnya")?.value || 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Add-on watch
              </div>
              <div className="mt-2 space-y-2 text-sm text-slate-600">
                <div>
                  Top booking tambahan:{" "}
                  <span className="font-semibold text-slate-950">
                    {addonBookings[0]?.customer_name || "belum ada"}
                  </span>
                </div>
                <div>
                  Add-on share:{" "}
                  <span className="font-semibold text-slate-950">
                    {summary.addonRatio.toFixed(1)}%
                  </span>
                </div>
                <div>
                  Balance outstanding:{" "}
                  <span className="font-semibold text-slate-950">
                    Rp {formatIDR(summary.pendingBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DashboardPanel>
      </section>

      <DashboardPanel
        eyebrow="Expense ledger"
        title="Pengeluaran terbaru"
        actions={
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href="/admin/dashboard">
              <ArrowRight className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        }
      >
        {expenseRows.length ? (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {expenseRows.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 p-4"
              >
                <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                <div className="mt-1 text-xs text-slate-500">{item.subtitle}</div>
                <div className="mt-4 text-lg font-[950] text-rose-600">{item.value}</div>
                <div className="mt-1 text-xs text-slate-400">{item.meta}</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel text="Belum ada pengeluaran pada rentang ini." />
        )}
      </DashboardPanel>
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
    <div className="relative overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(240,252,250,0.96))] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)] sm:rounded-[2rem] sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(129,216,208,0.2),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(30,143,146,0.12),transparent_32%)]" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border-none bg-[var(--bookinaja-600)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
              Analytics
            </Badge>
            <RealtimePill connected={realtimeConnected} status={realtimeStatus} />
          </div>
          <div>
            <h1 className="text-3xl font-[950] tracking-tight text-slate-950 sm:text-4xl">
              Analytics
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Laporan owner yang lebih lengkap untuk booking, direct sale, pengeluaran, dan pulse operasional.
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
    <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}
