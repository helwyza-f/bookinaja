"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO, startOfMonth, startOfYear, subDays } from "date-fns";
import {
  ArrowUpRight,
  Building2,
  CalendarRange,
  Download,
  DollarSign,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/dashboard/page-shell";
import {
  DashboardDonutPanel,
  DashboardLeaderboardPanel,
  DashboardLineChartPanel,
  DashboardPanel,
  DashboardStatStrip,
} from "@/components/dashboard/analytics-kit";
import {
  getPlatformRevenue,
  getPlatformRevenueBreakdown,
  getPlatformRevenueCSVUrl,
  getPlatformRevenueTimeseries,
  getPlatformTenants,
  type PlatformTenant,
} from "@/lib/platform-admin";

type RevenueData = {
  revenue: number;
  pending_cashflow: number;
  transactions: number;
  paid_transactions: number;
  pending_transactions: number;
};

type RevenuePoint = {
  period: string;
  revenue: number;
  cashflow: number;
  orders: number;
};

type RevenueBreakdown = {
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  owner_name: string;
  owner_email: string;
  revenue: number;
  paid_orders: number;
  pending_orders: number;
};

const formatIDR = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

export default function RevenuePage() {
  const params = useSearchParams();
  const [tenantFilter, setTenantFilter] = useState(params.get("tenant") || "all");
  const [interval, setInterval] = useState<"week" | "month">(params.get("interval") === "week" ? "week" : "month");
  const [from, setFrom] = useState(params.get("from") || "");
  const [to, setTo] = useState(params.get("to") || "");
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [revenue, setRevenue] = useState<RevenueData>({
    revenue: 0,
    pending_cashflow: 0,
    transactions: 0,
    paid_transactions: 0,
    pending_transactions: 0,
  });
  const [breakdown, setBreakdown] = useState<RevenueBreakdown[]>([]);
  const [series, setSeries] = useState<RevenuePoint[]>([]);

  useEffect(() => {
    getPlatformTenants().then(setTenants);
  }, []);

  useEffect(() => {
    const tenant = tenantFilter === "all" ? "" : tenantFilter;
    getPlatformRevenue({
      tenant,
      from: from || undefined,
      to: to || undefined,
    }).then((res) => setRevenue(res as RevenueData));
    getPlatformRevenueBreakdown({
      from: from || undefined,
      to: to || undefined,
    }).then((res) => setBreakdown(res as RevenueBreakdown[]));
    getPlatformRevenueTimeseries({
      tenant,
      interval,
      from: from || undefined,
      to: to || undefined,
    }).then((res) => setSeries(res as RevenuePoint[]));
  }, [tenantFilter, from, to, interval]);

  const stats = useMemo(
    () => [
      {
        label: "Revenue realized",
        value: formatIDR(revenue.revenue),
        hint: "kas yang sudah masuk",
      },
      {
        label: "Pending cashflow",
        value: formatIDR(revenue.pending_cashflow),
        hint: `${revenue.pending_transactions.toLocaleString("id-ID")} menunggu settlement`,
      },
      {
        label: "Paid transactions",
        value: revenue.paid_transactions.toLocaleString("id-ID"),
        hint: "transaksi settled",
      },
      {
        label: "All transactions",
        value: revenue.transactions.toLocaleString("id-ID"),
        hint: "seluruh transaksi dalam rentang ini",
      },
    ],
    [revenue],
  );

  const paymentSegments = useMemo(
    () => [
      {
        label: "Paid",
        value: revenue.paid_transactions,
        colorClass: "--chart-emerald",
      },
      {
        label: "Pending",
        value: revenue.pending_transactions,
        colorClass: "--chart-amber",
      },
      {
        label: "Other",
        value: Math.max(revenue.transactions - revenue.paid_transactions - revenue.pending_transactions, 0),
        colorClass: "--chart-rose",
      },
    ],
    [revenue],
  );

  const chartPoints = useMemo(
    () =>
      series.map((point) => ({
        label: point.period,
        primary: point.revenue,
        secondary: point.cashflow,
        tertiary: point.orders,
        meta: `${point.orders} orders`,
      })),
    [series],
  );

  const breakdownRows = useMemo(() => {
    const maxRevenue = Math.max(...breakdown.map((item) => Number(item.revenue || 0)), 1);
    return breakdown.map((item) => ({
      id: item.tenant_id,
      title: item.tenant_name,
      subtitle: `${item.tenant_slug} • ${item.owner_name || item.owner_email || "owner"}`,
      value: formatIDR(Number(item.revenue || 0)),
      meta: `${item.paid_orders || 0} paid • ${item.pending_orders || 0} pending`,
      progress: (Number(item.revenue || 0) / maxRevenue) * 100,
    }));
  }, [breakdown]);

  const applyPreset = (preset: "7d" | "30d" | "month" | "year") => {
    const now = new Date();
    if (preset === "7d") {
      setFrom(format(subDays(now, 6), "yyyy-MM-dd"));
      setTo(format(now, "yyyy-MM-dd"));
    }
    if (preset === "30d") {
      setFrom(format(subDays(now, 29), "yyyy-MM-dd"));
      setTo(format(now, "yyyy-MM-dd"));
    }
    if (preset === "month") {
      setFrom(format(startOfMonth(now), "yyyy-MM-dd"));
      setTo(format(now, "yyyy-MM-dd"));
    }
    if (preset === "year") {
      setFrom(format(startOfYear(now), "yyyy-MM-dd"));
      setTo(format(now, "yyyy-MM-dd"));
    }
  };

  const exportCsv = () => {
    const url = getPlatformRevenueCSVUrl({
      tenant: tenantFilter === "all" ? "" : tenantFilter,
      from: from || undefined,
      to: to || undefined,
    });
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("CSV export dibuka.");
  };

  return (
    <PageShell
      eyebrow="Platform finance"
      title="Revenue & cashflow"
      description="Halaman laporan ini sekarang ditata seperti dashboard finance: filter ringkas di atas, chart utama di kiri, komposisi pembayaran di kanan, lalu leaderboard tenant di bawah."
      actions={
        <Button onClick={exportCsv} className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      }
      stats={stats}
    >
      <DashboardPanel
        eyebrow="Filters"
        title="Kontrol laporan"
        description="Filter dibuat satu baris supaya analyst bisa ganti tenant, tanggal, dan granularitas tanpa kehilangan konteks chart utama."
      >
        <div className="flex flex-wrap gap-2">
          {(["7d", "30d", "month", "year"] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600 transition-colors hover:border-slate-950 hover:bg-slate-950 hover:text-white dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white dark:hover:text-slate-950"
            >
              {preset === "7d"
                ? "7d"
                : preset === "30d"
                  ? "30d"
                  : preset === "month"
                    ? "This month"
                    : "This year"}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FilterCard title="Tenant">
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger className="h-12 rounded-2xl">
                <SelectValue placeholder="Filter tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Platform total</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.slug}>
                    {tenant.slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterCard>
          <FilterCard title="From">
            <DatePicker value={from} onChange={setFrom} label="From" />
          </FilterCard>
          <FilterCard title="To">
            <DatePicker value={to} onChange={setTo} label="To" />
          </FilterCard>
          <FilterCard title="Granularity">
            <Select
              value={interval}
              onValueChange={(value) => setInterval(value as "week" | "month")}
            >
              <SelectTrigger className="h-12 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </FilterCard>
        </div>
      </DashboardPanel>

      <DashboardStatStrip
        items={[
          {
            label: "Finance mode",
            value: tenantFilter === "all" ? "Platform total" : tenantFilter,
            tone: "slate",
          },
          {
            label: "Chart grain",
            value: interval === "week" ? "Weekly buckets" : "Monthly buckets",
            tone: "indigo",
          },
          {
            label: "Settlement focus",
            value: `${revenue.pending_transactions.toLocaleString("id-ID")} pending`,
            tone: "amber",
          },
          {
            label: "Best signal",
            value:
              breakdown[0]?.tenant_name
                ? `${breakdown[0].tenant_name} leading`
                : "Waiting data",
            tone: "emerald",
          },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardLineChartPanel
          eyebrow="Cashflow chart"
          title={interval === "week" ? "Weekly movement" : "Monthly movement"}
          description="Revenue menjadi seri utama, cashflow pending jadi pembanding kedua. Ini memberi hierarchy yang lebih jelas daripada progress bar bertumpuk."
          points={chartPoints}
          primaryLabel="Revenue"
          secondaryLabel="Cashflow"
          tertiaryLabel="Orders"
          formatValue={(value) => formatIDR(value)}
        />

        <DashboardDonutPanel
          eyebrow="Payment mix"
          title="Distribusi status pembayaran"
          description="Komposisi paid vs pending ditaruh di panel sendiri supaya bottleneck cashflow cepat terlihat."
          totalLabel="Transactions"
          totalValue={revenue.transactions.toLocaleString("id-ID")}
          segments={paymentSegments}
          footer={
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.3rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Revenue realized
                </div>
                <div className="mt-2 text-lg font-[950] text-slate-950 dark:text-white">
                  {formatIDR(revenue.revenue)}
                </div>
              </div>
              <div className="rounded-[1.3rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Pending cashflow
                </div>
                <div className="mt-2 text-lg font-[950] text-amber-600 dark:text-amber-300">
                  {formatIDR(revenue.pending_cashflow)}
                </div>
              </div>
            </div>
          }
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DashboardLeaderboardPanel
          eyebrow="Revenue breakdown"
          title="Tenant dengan kontribusi terbesar"
          description="Leaderboard menggantikan tabel panjang dan menambah progress bar untuk melihat share revenue per tenant."
          rows={breakdownRows}
          emptyText="Belum ada breakdown tenant untuk filter ini."
        />

        <DashboardPanel
          eyebrow="Collection watch"
          title="Snapshot operasional finance"
          description="Panel kanan dipakai untuk insight cepat: total transaksi, paid throughput, pending orders, dan tenant tertinggi."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FinanceCallout
              label="Realized revenue"
              value={formatIDR(revenue.revenue)}
              icon={DollarSign}
            />
            <FinanceCallout
              label="Pending cashflow"
              value={formatIDR(revenue.pending_cashflow)}
              icon={WalletCards}
            />
            <FinanceCallout
              label="Paid transactions"
              value={revenue.paid_transactions.toLocaleString("id-ID")}
              icon={ArrowUpRight}
            />
            <FinanceCallout
              label="All transactions"
              value={revenue.transactions.toLocaleString("id-ID")}
              icon={CalendarRange}
            />
          </div>
          <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Leading tenant
                </div>
                <div className="mt-2 text-lg font-[950] text-slate-950 dark:text-white">
                  {breakdown[0]?.tenant_name || "Belum ada data"}
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {breakdown[0]?.tenant_slug || "Tunggu transaksi pertama"}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
          </div>
        </DashboardPanel>
      </section>
    </PageShell>
  );
}

function FilterCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.45rem] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {title}
      </div>
      {children}
    </div>
  );
}

function FinanceCallout({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
}) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          {label}
        </div>
        <Icon className="h-4 w-4 text-blue-600 dark:text-blue-300" />
      </div>
      <div className="mt-3 text-lg font-[950] text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function DatePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const selected = value ? parseISO(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-12 w-full justify-between rounded-2xl">
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">
            {label}
          </span>
          <span className="text-sm">{value || "Select date"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
        />
      </PopoverContent>
    </Popover>
  );
}
