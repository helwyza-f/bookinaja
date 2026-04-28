"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO, startOfMonth, startOfYear, subDays } from "date-fns";
import { Calendar as CalendarIcon, Download, DollarSign, WalletCards, ArrowUpRight, CalendarRange, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/dashboard/page-shell";
import {
  getPlatformRevenue,
  getPlatformRevenueBreakdown,
  getPlatformRevenueCSVUrl,
  getPlatformRevenueTimeseries,
  getPlatformTenants,
  type PlatformTenant,
} from "@/lib/platform-admin";

type RevenueData = { revenue: number; pending_cashflow: number; transactions: number; paid_transactions: number; pending_transactions: number };
type RevenuePoint = { period: string; revenue: number; cashflow: number; orders: number };
type RevenueBreakdown = { tenant_id: string; tenant_slug: string; tenant_name: string; owner_name: string; owner_email: string; revenue: number; paid_orders: number; pending_orders: number };

export default function RevenuePage() {
  const params = useSearchParams();
  const [tenantFilter, setTenantFilter] = useState(params.get("tenant") || "all");
  const [interval, setInterval] = useState<"week" | "month">(params.get("interval") === "week" ? "week" : "month");
  const [from, setFrom] = useState(params.get("from") || "");
  const [to, setTo] = useState(params.get("to") || "");
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [revenue, setRevenue] = useState<RevenueData>({ revenue: 0, pending_cashflow: 0, transactions: 0, paid_transactions: 0, pending_transactions: 0 });
  const [breakdown, setBreakdown] = useState<RevenueBreakdown[]>([]);
  const [series, setSeries] = useState<RevenuePoint[]>([]);

  useEffect(() => { getPlatformTenants().then(setTenants); }, []);
  useEffect(() => {
    const tenant = tenantFilter === "all" ? "" : tenantFilter;
    getPlatformRevenue({ tenant, from: from || undefined, to: to || undefined }).then((res) => setRevenue(res as RevenueData));
    getPlatformRevenueBreakdown({ from: from || undefined, to: to || undefined }).then((res) => setBreakdown(res as RevenueBreakdown[]));
    getPlatformRevenueTimeseries({ tenant, interval, from: from || undefined, to: to || undefined }).then((res) => setSeries(res as RevenuePoint[]));
  }, [tenantFilter, from, to, interval]);

  const stats = useMemo(() => [
    { label: "Revenue realized", value: revenue.revenue, icon: DollarSign },
    { label: "Pending cashflow", value: revenue.pending_cashflow, icon: WalletCards },
    { label: "Paid transactions", value: revenue.paid_transactions, icon: ArrowUpRight },
    { label: "All transactions", value: revenue.transactions, icon: CalendarRange },
  ], [revenue]);

  const maxRevenue = Math.max(...series.map((item) => item.revenue), 1);
  const maxCashflow = Math.max(...series.map((item) => item.cashflow), 1);

  const applyPreset = (preset: "7d" | "30d" | "month" | "year") => {
    const now = new Date();
    if (preset === "7d") { setFrom(format(subDays(now, 6), "yyyy-MM-dd")); setTo(format(now, "yyyy-MM-dd")); }
    if (preset === "30d") { setFrom(format(subDays(now, 29), "yyyy-MM-dd")); setTo(format(now, "yyyy-MM-dd")); }
    if (preset === "month") { setFrom(format(startOfMonth(now), "yyyy-MM-dd")); setTo(format(now, "yyyy-MM-dd")); }
    if (preset === "year") { setFrom(format(startOfYear(now), "yyyy-MM-dd")); setTo(format(now, "yyyy-MM-dd")); }
  };

  const exportCsv = () => {
    const url = getPlatformRevenueCSVUrl({ tenant: tenantFilter === "all" ? "" : tenantFilter, from: from || undefined, to: to || undefined });
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("CSV export dibuka.");
  };

  return (
    <PageShell
      eyebrow="Platform finance"
      title="Revenue & cashflow"
      description="Pantau revenue platform, cashflow pending, dan breakdown tenant dengan filter tanggal yang jelas."
      actions={
        <Button onClick={exportCsv} className="w-full rounded-2xl bg-slate-950 text-white sm:w-auto">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      }
      stats={stats.map((card) => ({
        label: card.label,
        value: `Rp ${card.value.toLocaleString("id-ID")}`,
      }))}
    >
      <div className="flex flex-wrap gap-2">
        {(["7d", "30d", "month", "year"] as const).map((p) => (
          <button key={p} onClick={() => applyPreset(p)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-950 hover:text-white">
            {p === "7d" ? "7d" : p === "30d" ? "30d" : p === "month" ? "This month" : "This year"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl p-4 sm:p-5"><Select value={tenantFilter} onValueChange={setTenantFilter}><SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Filter tenant" /></SelectTrigger><SelectContent><SelectItem value="all">Platform total</SelectItem>{tenants.map((t) => <SelectItem key={t.id} value={t.slug}>{t.slug}</SelectItem>)}</SelectContent></Select></Card>
        <Card className="rounded-3xl p-4 sm:p-5"><DatePicker value={from} onChange={setFrom} label="From" /></Card>
        <Card className="rounded-3xl p-4 sm:p-5"><DatePicker value={to} onChange={setTo} label="To" /></Card>
        <Card className="rounded-3xl p-4 sm:p-5"><Select value={interval} onValueChange={(v) => setInterval(v as "week" | "month")}><SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="month">Monthly</SelectItem><SelectItem value="week">Weekly</SelectItem></SelectContent></Select></Card>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="rounded-3xl border-slate-200 p-5 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
              <Icon className="h-5 w-5 text-blue-600" />
              <div className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-slate-500">{card.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Rp {card.value.toLocaleString("id-ID")}</div>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-600">Cashflow chart</div>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{interval === "week" ? "Weekly" : "Monthly"} movement</h2>
            </div>
            <CalendarIcon className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            {series.map((point) => (
              <div key={point.period} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-semibold text-slate-950 dark:text-white">{point.period}</div>
                  <div className="text-xs font-semibold text-slate-500">{point.orders} orders</div>
                </div>
                <div className="grid grid-cols-[72px_1fr_72px_1fr] items-center gap-3">
                  <div className="text-xs font-semibold text-slate-500">Revenue</div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-slate-950" style={{ width: `${Math.max((point.revenue / maxRevenue) * 100, 4)}%` }} /></div>
                  <div className="text-xs font-semibold text-slate-500">Cashflow</div>
                  <div className="h-2 rounded-full bg-blue-100 dark:bg-blue-950/40"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.max((point.cashflow / maxCashflow) * 100, 4)}%` }} /></div>
                </div>
              </div>
            ))}
            {series.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-sm text-slate-500 dark:border-white/10">No revenue data for current filter.</div> : null}
          </div>
        </Card>
        <Card className="rounded-3xl p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-600">Breakdown</div>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Revenue per tenant</h2>
            </div>
            <Building2 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Tenant</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Pending</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.map((item) => <TableRow key={item.tenant_id}><TableCell><div className="font-semibold text-slate-950 dark:text-white">{item.tenant_name}</div><div className="text-xs text-slate-500">{item.tenant_slug}</div></TableCell><TableCell className="text-right font-semibold">Rp {(item.revenue || 0).toLocaleString("id-ID")}</TableCell><TableCell className="text-right">{item.paid_orders || 0}</TableCell><TableCell className="text-right">{item.pending_orders || 0}</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>
    </PageShell>
  );
}

function DatePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const selected = value ? parseISO(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-12 w-full justify-between rounded-2xl">
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
          <span className="text-sm">{value || "Select date"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={selected} onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")} />
      </PopoverContent>
    </Popover>
  );
}
