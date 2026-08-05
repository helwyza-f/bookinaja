"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, startOfMonth, startOfYear, subDays } from "date-fns";
import { Download, DollarSign, WalletCards, ArrowUpRight, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardLineChartPanel } from "@/components/dashboard/analytics-kit";
import {
  AdminHeader,
  StatCard,
  SectionCard,
  EmptyState,
  formatIDR,
  formatCompactIDR,
} from "@/components/platform/admin-kit";
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

type RevenuePoint = { period: string; revenue: number; cashflow: number; orders: number };

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

export default function RevenuePage() {
  const params = useSearchParams();
  const [tenantFilter, setTenantFilter] = useState(params.get("tenant") || "all");
  const [interval, setInterval] = useState<"week" | "month">(
    params.get("interval") === "week" ? "week" : "month",
  );
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
    getPlatformTenants().then((t) => setTenants(Array.isArray(t) ? t : []));
  }, []);

  useEffect(() => {
    const tenant = tenantFilter === "all" ? "" : tenantFilter;
    getPlatformRevenue({ tenant, from: from || undefined, to: to || undefined }).then((res) =>
      setRevenue(res as RevenueData),
    );
    getPlatformRevenueBreakdown({ from: from || undefined, to: to || undefined }).then((res) =>
      setBreakdown(Array.isArray(res) ? (res as RevenueBreakdown[]) : []),
    );
    getPlatformRevenueTimeseries({
      tenant,
      interval,
      from: from || undefined,
      to: to || undefined,
    }).then((res) => setSeries(Array.isArray(res) ? (res as RevenuePoint[]) : []));
  }, [tenantFilter, from, to, interval]);

  const chartPoints = useMemo(
    () =>
      series.map((point) => ({
        label: point.period,
        primary: point.revenue,
        secondary: point.cashflow,
        meta: `${point.orders} order`,
      })),
    [series],
  );

  const sortedBreakdown = useMemo(
    () => [...breakdown].sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0)),
    [breakdown],
  );

  const applyPreset = (preset: "7d" | "30d" | "month" | "year") => {
    const now = new Date();
    const map = {
      "7d": [subDays(now, 6), now],
      "30d": [subDays(now, 29), now],
      month: [startOfMonth(now), now],
      year: [startOfYear(now), now],
    } as const;
    const [f, t] = map[preset];
    setFrom(format(f, "yyyy-MM-dd"));
    setTo(format(t, "yyyy-MM-dd"));
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
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-6">
      <AdminHeader
        title="Revenue"
        subtitle="Laporan pendapatan dan cashflow platform."
        actions={
          <Button size="sm" className="rounded-lg" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue realized" value={formatCompactIDR(revenue.revenue)} icon={DollarSign} />
        <StatCard
          label="Pending cashflow"
          value={formatCompactIDR(revenue.pending_cashflow)}
          icon={WalletCards}
          hint={`${revenue.pending_transactions.toLocaleString("id-ID")} menunggu`}
        />
        <StatCard
          label="Paid transactions"
          value={revenue.paid_transactions.toLocaleString("id-ID")}
          icon={ArrowUpRight}
        />
        <StatCard
          label="Total transaksi"
          value={revenue.transactions.toLocaleString("id-ID")}
          icon={CalendarRange}
        />
      </section>

      {/* Filter bar */}
      <SectionCard>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {(["7d", "30d", "month", "year"] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className="rounded-lg border border-[var(--admin-line)] px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
              >
                {preset === "7d"
                  ? "7 hari"
                  : preset === "30d"
                    ? "30 hari"
                    : preset === "month"
                      ? "Bulan ini"
                      : "Tahun ini"}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger className="h-10 rounded-lg">
                <SelectValue placeholder="Tenant" />
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
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 rounded-lg"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 rounded-lg"
            />
            <Select value={interval} onValueChange={(v) => setInterval(v as "week" | "month")}>
              <SelectTrigger className="h-10 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Bulanan</SelectItem>
                <SelectItem value="week">Mingguan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* Chart */}
      <DashboardLineChartPanel
        title={interval === "week" ? "Pergerakan mingguan" : "Pergerakan bulanan"}
        points={chartPoints}
        primaryLabel="Revenue"
        secondaryLabel="Cashflow"
        formatValue={(value) => formatIDR(value)}
      />

      {/* Breakdown table */}
      <SectionCard title="Revenue per tenant" bodyClassName="p-0">
        {sortedBreakdown.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={DollarSign} title="Belum ada data revenue" />
          </div>
        ) : (
          <Table className="rounded-none border-0 bg-transparent shadow-none">
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBreakdown.map((item) => (
                <TableRow key={item.tenant_id}>
                  <TableCell>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {item.tenant_name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {item.tenant_slug}
                      {item.owner_email ? ` · ${item.owner_email}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {(item.paid_orders || 0).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-amber-600 dark:text-amber-400">
                    {(item.pending_orders || 0).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-slate-900 dark:text-white">
                    {formatIDR(item.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </main>
  );
}
