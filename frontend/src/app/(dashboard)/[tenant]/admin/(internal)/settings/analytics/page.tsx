"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, subDays } from "date-fns";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  Clock3,
  LineChart,
  Package2,
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

type BookingRow = {
  id: string;
  customer_name?: string;
  resource_name?: string;
  start_time?: string;
  created_at?: string;
  status?: string;
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
  receipt_url?: string;
  vendor?: string;
};

type ResourceRow = {
  id: string;
  name: string;
  status?: string;
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
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const getBookingTotal = (booking: BookingRow) => {
  const explicitTotal = Number(booking.grand_total || 0);
  if (explicitTotal > 0) return explicitTotal;
  return Number(booking.total_resource || 0) + Number(booking.total_fnb || 0);
};

const getRangeDays = (range: RangeKey) => {
  switch (range) {
    case "30d":
      return 30;
    case "90d":
      return 90;
    default:
      return 7;
  }
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
  const [lastSync, setLastSync] = useState<string>("");

  const fetchAnalytics = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);

    try {
      const [bookingsRes, expensesRes, resourcesRes, customersRes, subscriptionRes] =
        await Promise.all([
          api.get("/bookings"),
          api.get("/expenses", { params: { limit: 100 } }),
          api.get("/resources-all"),
          api.get("/customers"),
          api.get("/billing/subscription"),
        ]);

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
    } catch {
      toast.error("Gagal memuat analytics");
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnalytics();
    const interval = window.setInterval(() => {
      void fetchAnalytics(true);
    }, 60000);
    return () => window.clearInterval(interval);
  }, [range, fetchAnalytics]);

  const rangeStart = useMemo(() => subDays(new Date(), getRangeDays(range) - 1), [range]);
  const rangeLabel = useMemo(() => {
    switch (range) {
      case "7d":
        return "7 hari terakhir";
      case "90d":
        return "90 hari terakhir";
      default:
        return "30 hari terakhir";
    }
  }, [range]);

  const filteredBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const date = parseSafeDate(booking.start_time || booking.created_at);
        if (!date) return false;
        return date >= rangeStart;
      }),
    [bookings, rangeStart],
  );

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const date = parseSafeDate(expense.expense_date);
        if (!date) return false;
        return date >= rangeStart;
      }),
    [expenses, rangeStart],
  );

  const summary = useMemo(() => {
    const revenue = filteredBookings.reduce((sum, booking) => sum + getBookingTotal(booking), 0);
    const expenseTotal = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const netProfit = revenue - expenseTotal;
    const bookingsCount = filteredBookings.length;
    const expenseCount = filteredExpenses.length;
    const averageTicket = bookingsCount > 0 ? revenue / bookingsCount : 0;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const expenseRatio = revenue > 0 ? (expenseTotal / revenue) * 100 : 0;

    const today = new Date();
    const todayRevenue = filteredBookings
      .filter((booking) => {
        const date = parseSafeDate(booking.start_time || booking.created_at);
        return date ? format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") : false;
      })
      .reduce((sum, booking) => sum + getBookingTotal(booking), 0);

    const todayExpense = filteredExpenses
      .filter((expense) => {
        const date = parseSafeDate(expense.expense_date);
        return date ? format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") : false;
      })
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    return {
      revenue,
      expenseTotal,
      netProfit,
      bookingsCount,
      expenseCount,
      averageTicket,
      profitMargin,
      expenseRatio,
      todayRevenue,
      todayExpense,
    };
  }, [filteredBookings, filteredExpenses]);

  const dailySeries = useMemo(() => {
    const days = getRangeDays(range);
    const points = Array.from({ length: days }).map((_, index) => {
      const date = subDays(new Date(), days - 1 - index);
      const key = format(date, "yyyy-MM-dd");
      const revenue = filteredBookings.reduce((sum, booking) => {
        const bookingDate = parseSafeDate(booking.start_time || booking.created_at);
        if (!bookingDate) return sum;
        return format(bookingDate, "yyyy-MM-dd") === key ? sum + getBookingTotal(booking) : sum;
      }, 0);
      const expenseTotal = filteredExpenses.reduce((sum, expense) => {
        const expenseDate = parseSafeDate(expense.expense_date);
        if (!expenseDate) return sum;
        return format(expenseDate, "yyyy-MM-dd") === key ? sum + Number(expense.amount || 0) : sum;
      }, 0);
      const bookingsCount = filteredBookings.filter((booking) => {
        const bookingDate = parseSafeDate(booking.start_time || booking.created_at);
        return bookingDate ? format(bookingDate, "yyyy-MM-dd") === key : false;
      }).length;

      return {
        key,
        label: format(date, "dd/MM"),
        weekday: format(date, "EEE"),
        revenue,
        expenseTotal,
        bookingsCount,
      };
    });

    const maxValue = Math.max(
      ...points.map((item) => Math.max(item.revenue, item.expenseTotal)),
      1,
    );

    return points.map((item) => ({
      ...item,
      revenueHeight: Math.max((item.revenue / maxValue) * 100, item.revenue > 0 ? 12 : 4),
      expenseHeight: Math.max((item.expenseTotal / maxValue) * 100, item.expenseTotal > 0 ? 12 : 4),
      bookingHeight: Math.max((item.bookingsCount / Math.max(...points.map((x) => x.bookingsCount), 1)) * 100, item.bookingsCount > 0 ? 12 : 4),
    }));
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

    resources.forEach((resource) => {
      map.set(resource.name, {
        id: resource.id,
        name: resource.name,
        bookingsCount: 0,
        revenue: 0,
        lastBookingAt: null,
      });
    });

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

    return Array.from(map.values()).sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.bookingsCount - a.bookingsCount;
    });
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

  const paymentStatusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    filteredBookings.forEach((booking) => {
      const key = (booking.payment_status || "unknown").toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredBookings]);

  const recentBookings = useMemo(
    () =>
      [...filteredBookings]
        .sort((a, b) => {
          const aTime = parseSafeDate(a.start_time || a.created_at)?.getTime() || 0;
          const bTime = parseSafeDate(b.start_time || b.created_at)?.getTime() || 0;
          return bTime - aTime;
        })
        .slice(0, 8),
    [filteredBookings],
  );

  const recentExpenses = useMemo(
    () =>
      [...filteredExpenses]
        .sort((a, b) => {
          const aTime = parseSafeDate(a.expense_date)?.getTime() || 0;
          const bTime = parseSafeDate(b.expense_date)?.getTime() || 0;
          return bTime - aTime;
        })
        .slice(0, 8),
    [filteredExpenses],
  );

  const topCustomers = useMemo(() => {
    return [...customers]
      .sort((a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0))
      .slice(0, 6);
  }, [customers]);

  const summaryCards = [
    {
      label: "Revenue",
      value: `Rp ${formatIDR(summary.revenue)}`,
      hint: `Periode ${rangeLabel}`,
      icon: TrendingUp,
      tone: "bg-slate-950 text-white",
    },
    {
      label: "Expenses",
      value: `Rp ${formatIDR(summary.expenseTotal)}`,
      hint: `${summary.expenseCount} entries`,
      icon: Banknote,
      tone: "bg-white text-slate-950 dark:bg-slate-900 dark:text-white",
    },
    {
      label: "Net Profit",
      value: `Rp ${formatIDR(summary.netProfit)}`,
      hint: `${summary.profitMargin.toFixed(1)}% margin`,
      icon: Wallet,
      tone: summary.netProfit >= 0 ? "bg-emerald-500 text-white" : "bg-red-500 text-white",
    },
    {
      label: "Bookings",
      value: String(summary.bookingsCount),
      hint: `Avg Rp ${formatIDR(summary.averageTicket)}`,
      icon: CalendarClock,
      tone: "bg-blue-600 text-white",
    },
    {
      label: "Customers",
      value: String(customers.length),
      hint: "Database terkini",
      icon: Users,
      tone: "bg-slate-50 text-slate-950 dark:bg-slate-800 dark:text-white",
    },
    {
      label: "Expense Ratio",
      value: `${summary.expenseRatio.toFixed(1)}%`,
      hint: "Biaya / revenue",
      icon: TrendingDown,
      tone: "bg-slate-100 text-slate-950 dark:bg-white/5 dark:text-white",
    },
  ];

  return (
    <div className="space-y-4 pb-20 px-3 font-plus-jakarta animate-in fade-in duration-500 md:space-y-5 md:px-0">
      <Card className="rounded-[1.75rem] border-none bg-slate-950 p-4 text-white shadow-2xl md:rounded-[2rem] md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Badge className="border-none bg-white/10 text-white text-[7px] md:text-[9px] font-black uppercase tracking-widest">
              Owner Analytics
            </Badge>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none md:text-5xl">
              Business <span className="text-blue-400">Analytics.</span>
            </h1>
            <p className="max-w-3xl text-[12px] text-slate-300 md:text-sm">
              Laporan komprehensif untuk membaca performa bisnis, revenue, expenses, profit, resource performance, dan pola transaksi dalam satu tempat.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
            <Button
              onClick={() => void fetchAnalytics()}
              variant="outline"
              className="h-10 rounded-2xl border-white/15 bg-white/5 text-white hover:bg-white/10 font-black uppercase italic text-[8px] md:text-[10px] tracking-widest"
            >
              <RefreshCcw className={cn("mr-1.5 h-3.5 w-3.5", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button
              asChild
              className="h-10 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-black uppercase italic text-[8px] md:text-[10px] tracking-widest"
            >
              <Link href="/admin/dashboard">
                <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                Back Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(["7d", "30d", "90d"] as RangeKey[]).map((item) => (
          <Button
            key={item}
            onClick={() => setRange(item)}
            variant={range === item ? "default" : "outline"}
            className={cn(
              "h-9 rounded-2xl px-3 font-black uppercase italic text-[8px] tracking-widest",
              range === item
                ? "bg-blue-600 text-white border-none"
                : "border-slate-200 bg-white text-slate-500 dark:border-white/5 dark:bg-[#0a0a0a]",
            )}
          >
            {item === "7d" ? "7 Hari" : item === "30d" ? "30 Hari" : "90 Hari"}
          </Button>
        ))}
        <div className="ml-auto hidden items-center gap-2 text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 md:flex">
          <Clock3 className="h-3.5 w-3.5 text-blue-600" />
          Sync {lastSync || "--:--"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((item) => (
          <Card
            key={item.label}
            className="rounded-[1.45rem] border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-[1.75rem] md:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <p className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                  {item.label}
                </p>
                {loading ? (
                  <Skeleton className="h-7 w-16 rounded-xl bg-slate-100 dark:bg-white/5 md:h-10 md:w-28" />
                ) : (
                  <div className="text-xl font-black italic uppercase tracking-tighter text-slate-950 dark:text-white md:text-3xl">
                    {item.value}
                  </div>
                )}
                <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 md:text-xs">
                  {item.hint}
                </p>
              </div>
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-2xl md:h-11 md:w-11", item.tone)}>
                <item.icon className="h-3.5 w-3.5 md:h-5 md:w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-[2rem] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                Daily Trend
              </p>
              <h2 className="mt-1 text-lg font-black italic uppercase tracking-tighter text-slate-950 dark:text-white md:text-2xl">
                Revenue, expense, and bookings
              </h2>
            </div>
            <Badge className="border-none bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest">
              {rangeLabel}
            </Badge>
          </div>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <>
                <Skeleton className="h-44 rounded-[1.35rem] bg-slate-100 dark:bg-white/5" />
                <Skeleton className="h-44 rounded-[1.35rem] bg-slate-100 dark:bg-white/5" />
                <Skeleton className="h-44 rounded-[1.35rem] bg-slate-100 dark:bg-white/5" />
              </>
            ) : dailySeries.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-slate-200 p-5 text-center font-black italic uppercase tracking-widest text-slate-400 dark:border-white/5 sm:col-span-2 lg:col-span-3">
                Tidak ada data pada rentang ini
              </div>
            ) : (
              dailySeries.map((item) => (
                <div
                  key={item.key}
                  className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3.5 dark:border-white/5 dark:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                        {item.weekday}
                      </div>
                      <div className="mt-1 text-sm font-black italic uppercase tracking-tighter text-slate-950 dark:text-white">
                        {item.label}
                      </div>
                    </div>
                    <Badge className="border-none bg-slate-950 text-[8px] font-black uppercase tracking-widest text-white dark:bg-white dark:text-slate-950">
                      {item.bookingsCount} bookings
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <BarMetric
                      label="Revenue"
                      value={`Rp ${formatIDR(item.revenue)}`}
                      height={item.revenueHeight}
                      color="from-blue-600 to-cyan-400"
                    />
                    <BarMetric
                      label="Expense"
                      value={`Rp ${formatIDR(item.expenseTotal)}`}
                      height={item.expenseHeight}
                      color="from-rose-500 to-orange-400"
                    />
                    <BarMetric
                      label="Bookings"
                      value={String(item.bookingsCount)}
                      height={item.bookingHeight}
                      color="from-emerald-500 to-lime-400"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-[2rem] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                Profit Read
              </p>
              <h2 className="mt-1 text-lg font-black italic uppercase tracking-tighter text-slate-950 dark:text-white">
                Quick snapshot
              </h2>
            </div>
            <LineChart className="h-5 w-5 text-blue-600" />
          </div>

          <div className="mt-4 space-y-3">
            <InfoRow
              label="Revenue"
              value={`Rp ${formatIDR(summary.revenue)}`}
              tone="text-blue-600"
            />
            <InfoRow
              label="Expenses"
              value={`Rp ${formatIDR(summary.expenseTotal)}`}
              tone="text-rose-500"
            />
            <InfoRow
              label="Net Profit"
              value={`Rp ${formatIDR(summary.netProfit)}`}
              tone={summary.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"}
            />
            <InfoRow
              label="Avg Ticket"
              value={`Rp ${formatIDR(summary.averageTicket)}`}
              tone="text-slate-950 dark:text-white"
            />
            <InfoRow
              label="Expense Ratio"
              value={`${summary.expenseRatio.toFixed(1)}%`}
              tone="text-slate-500"
            />
          </div>

          <div className="mt-4 rounded-[1.35rem] bg-slate-50 p-3 dark:bg-white/5">
            <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
              Subscription
            </div>
            <div className="mt-1 text-sm font-black italic uppercase tracking-tighter text-slate-950 dark:text-white">
              {(subscription?.plan || "-").toUpperCase()}
            </div>
            <div className="mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Status: {subscription?.status || "-"}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-[2rem] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                Resource Leaderboard
              </p>
              <h2 className="mt-1 text-lg font-black italic uppercase tracking-tighter text-slate-950 dark:text-white md:text-2xl">
                Best performing resources
              </h2>
            </div>
            <Badge className="border-none bg-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-500 dark:bg-white/5 dark:text-slate-300">
              {resourceStats.length} unit
            </Badge>
          </div>

          <div className="mt-4 space-y-2.5">
            {loading ? (
              <>
                <Skeleton className="h-16 rounded-[1.35rem] bg-slate-100 dark:bg-white/5" />
                <Skeleton className="h-16 rounded-[1.35rem] bg-slate-100 dark:bg-white/5" />
                <Skeleton className="h-16 rounded-[1.35rem] bg-slate-100 dark:bg-white/5" />
              </>
            ) : resourceStats.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-slate-200 p-5 text-center font-black italic uppercase tracking-widest text-slate-400 dark:border-white/5">
                Belum ada booking di rentang ini
              </div>
            ) : (
              resourceStats.slice(0, 10).map((resource, index) => (
                <div
                  key={resource.id}
                  className="flex items-center gap-3 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3.5 dark:border-white/5 dark:bg-white/5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-[10px] font-black uppercase italic text-white dark:bg-white dark:text-slate-950">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-black italic uppercase tracking-tight text-slate-950 dark:text-white">
                      {resource.name}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                      <span>{resource.bookingsCount} bookings</span>
                      <span>•</span>
                      <span>
                        {resource.lastBookingAt
                          ? format(parseSafeDate(resource.lastBookingAt) || new Date(), "dd MMM HH:mm")
                          : "-"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">
                      Revenue
                    </div>
                    <div className="mt-1 text-[10px] font-black italic uppercase tracking-tighter text-blue-600">
                      Rp {formatIDR(resource.revenue)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-[2rem] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                Expense Mix
              </p>
              <h2 className="mt-1 text-lg font-black italic uppercase tracking-tighter text-slate-950 dark:text-white">
                Category breakdown
              </h2>
            </div>
            <ReceiptText className="h-5 w-5 text-blue-600" />
          </div>

          <div className="mt-4 space-y-2.5">
            {loading ? (
              <>
                <Skeleton className="h-14 rounded-[1.25rem] bg-slate-100 dark:bg-white/5" />
                <Skeleton className="h-14 rounded-[1.25rem] bg-slate-100 dark:bg-white/5" />
                <Skeleton className="h-14 rounded-[1.25rem] bg-slate-100 dark:bg-white/5" />
              </>
            ) : categoryBreakdown.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-slate-200 p-5 text-center font-black italic uppercase tracking-widest text-slate-400 dark:border-white/5">
                Belum ada expense
              </div>
            ) : (
              categoryBreakdown.slice(0, 8).map((item) => {
                const percent =
                  summary.expenseTotal > 0 ? (item.amount / summary.expenseTotal) * 100 : 0;
                return (
                  <div key={item.category} className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3.5 dark:border-white/5 dark:bg-white/5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-[11px] font-black italic uppercase tracking-tight text-slate-950 dark:text-white">
                          {item.category}
                        </div>
                        <div className="mt-1 text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                          {item.count} entries
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black italic uppercase tracking-tighter text-blue-600">
                          Rp {formatIDR(item.amount)}
                        </div>
                        <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                          {percent.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                        style={{ width: `${Math.max(percent, 8)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-[2rem] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                Recent Bookings
              </p>
              <h2 className="mt-1 text-lg font-black italic uppercase tracking-tighter text-slate-950 dark:text-white md:text-2xl">
                Latest transactions
              </h2>
            </div>
            <CalendarClock className="h-5 w-5 text-blue-600" />
          </div>

          <div className="mt-4 space-y-2.5">
            {loading ? (
              <>
                <Skeleton className="h-16 rounded-[1.25rem] bg-slate-100 dark:bg-white/5" />
                <Skeleton className="h-16 rounded-[1.25rem] bg-slate-100 dark:bg-white/5" />
              </>
            ) : recentBookings.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-slate-200 p-5 text-center font-black italic uppercase tracking-widest text-slate-400 dark:border-white/5">
                Belum ada booking
              </div>
            ) : (
              recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center gap-3 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3.5 dark:border-white/5 dark:bg-white/5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-[10px] font-black uppercase italic text-white dark:bg-white dark:text-slate-950">
                    {(booking.customer_name || "C").slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-black italic uppercase tracking-tight text-slate-950 dark:text-white">
                      {booking.customer_name || "Guest"}
                    </div>
                    <div className="mt-1 truncate text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">
                      {booking.resource_name || "-"} • {parseSafeDate(booking.start_time || booking.created_at) ? format(parseSafeDate(booking.start_time || booking.created_at)!, "dd MMM HH:mm") : "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">
                      {booking.payment_status || "pending"}
                    </div>
                    <div className="mt-1 text-[10px] font-black italic uppercase tracking-tighter text-blue-600">
                      Rp {formatIDR(getBookingTotal(booking))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-[2rem] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                Recent Expenses
              </p>
              <h2 className="mt-1 text-lg font-black italic uppercase tracking-tighter text-slate-950 dark:text-white">
                Latest outflow
              </h2>
            </div>
            <Banknote className="h-5 w-5 text-blue-600" />
          </div>

          <div className="mt-4 space-y-2.5">
            {loading ? (
              <>
                <Skeleton className="h-16 rounded-[1.25rem] bg-slate-100 dark:bg-white/5" />
                <Skeleton className="h-16 rounded-[1.25rem] bg-slate-100 dark:bg-white/5" />
              </>
            ) : recentExpenses.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-slate-200 p-5 text-center font-black italic uppercase tracking-widest text-slate-400 dark:border-white/5">
                Belum ada expense
              </div>
            ) : (
              recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center gap-3 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3.5 dark:border-white/5 dark:bg-white/5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-[10px] font-black uppercase italic text-white dark:bg-white dark:text-slate-950">
                    {expense.category.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-black italic uppercase tracking-tight text-slate-950 dark:text-white">
                      {expense.title}
                    </div>
                    <div className="mt-1 truncate text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">
                      {expense.category} • {(() => {
                        const parsed = parseSafeDate(expense.expense_date);
                        return parsed ? format(parsed, "dd MMM") : "-";
                      })()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">
                      expense
                    </div>
                    <div className="mt-1 text-[10px] font-black italic uppercase tracking-tighter text-blue-600">
                      Rp {formatIDR(expense.amount)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-[2rem] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                Payment Mix
              </p>
              <h2 className="mt-1 text-lg font-black italic uppercase tracking-tighter text-slate-950 dark:text-white">
                Booking payment status
              </h2>
            </div>
            <Package2 className="h-5 w-5 text-blue-600" />
          </div>

          <div className="mt-4 space-y-2.5">
            {paymentStatusBreakdown.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-slate-200 p-5 text-center font-black italic uppercase tracking-widest text-slate-400 dark:border-white/5">
                Tidak ada data pembayaran
              </div>
            ) : (
              paymentStatusBreakdown.map((item) => (
                <div key={item.status} className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3.5 dark:border-white/5 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-black italic uppercase tracking-tight text-slate-950 dark:text-white">
                      {item.status}
                    </div>
                    <div className="text-[10px] font-black italic uppercase tracking-tighter text-blue-600">
                      {item.count}
                    </div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                      style={{
                        width: `${Math.max((item.count / Math.max(...paymentStatusBreakdown.map((x) => x.count), 1)) * 100, 8)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-[2rem] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                Top Customers
              </p>
              <h2 className="mt-1 text-lg font-black italic uppercase tracking-tighter text-slate-950 dark:text-white">
                Highest lifetime value
              </h2>
            </div>
            <Users className="h-5 w-5 text-blue-600" />
          </div>

          <div className="mt-4 space-y-2.5">
            {topCustomers.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-slate-200 p-5 text-center font-black italic uppercase tracking-widest text-slate-400 dark:border-white/5">
                Tidak ada customer
              </div>
            ) : (
              topCustomers.map((customer, index) => (
                <div key={customer.id} className="flex items-center gap-3 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3.5 dark:border-white/5 dark:bg-white/5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-[10px] font-black uppercase italic text-white dark:bg-white dark:text-slate-950">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-black italic uppercase tracking-tight text-slate-950 dark:text-white">
                      {customer.name || "Customer"}
                    </div>
                    <div className="mt-1 text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">
                      {customer.last_booking_at ? format(parseSafeDate(customer.last_booking_at) || new Date(), "dd MMM yyyy") : "no recent activity"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">
                      Spend
                    </div>
                    <div className="mt-1 text-[10px] font-black italic uppercase tracking-tighter text-blue-600">
                      Rp {formatIDR(customer.total_spent)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:rounded-[2rem] md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
              Notes
            </p>
            <h2 className="mt-1 text-lg font-black italic uppercase tracking-tighter text-slate-950 dark:text-white">
              What this report tells you
            </h2>
          </div>
          <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
            Updated {lastSync || "--:--"}
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <NoteBox
            title="Revenue"
            text="Pendapatan dari booking yang tertutup pada periode terpilih."
          />
          <NoteBox
            title="Expenses"
            text="Pengeluaran bisnis dari modul expense yang sudah dicatat."
          />
          <NoteBox
            title="Profit"
            text="Revenue dikurangi expense, cukup untuk membaca kesehatan kas cepat."
          />
        </div>
      </Card>
    </div>
  );
}

function BarMetric({
  label,
  value,
  height,
  color,
}: {
  label: string;
  value: string;
  height: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-28 w-full items-end rounded-[1rem] bg-white p-1 dark:bg-slate-950/40">
        <div
          className={cn("w-full rounded-[0.8rem] bg-gradient-to-t", color)}
          style={{ height: `${height}%` }}
        />
      </div>
      <div className="text-center">
        <div className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">
          {label}
        </div>
        <div className="mt-1 line-clamp-2 text-[9px] font-black italic uppercase tracking-tighter text-slate-950 dark:text-white">
          {value}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-white/5 dark:bg-white/5">
      <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
        {label}
      </div>
      <div className={cn("text-[11px] font-black italic uppercase tracking-tighter", tone)}>
        {value}
      </div>
    </div>
  );
}

function NoteBox({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/5">
      <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
        {title}
      </div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {text}
      </p>
    </div>
  );
}
