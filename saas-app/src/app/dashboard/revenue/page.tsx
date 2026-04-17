"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  CalendarRange,
  Download,
  DollarSign,
  WalletCards,
  Building2,
  ChartColumn,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function RevenuePage() {
  const params = useSearchParams();
  const initialTenant = params.get("tenant") || "all";
  const initialInterval = (params.get("interval") as "week" | "month") || "month";
  const [tenantFilter, setTenantFilter] = useState(initialTenant);
  const [interval, setInterval] = useState<"week" | "month">(initialInterval);
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

    getPlatformRevenueBreakdown({ from: from || undefined, to: to || undefined }).then(
      (res) => setBreakdown(res as RevenueBreakdown[]),
    );

    getPlatformRevenueTimeseries({
      tenant,
      interval,
      from: from || undefined,
      to: to || undefined,
    }).then((res) => setSeries(res as RevenuePoint[]));
  }, [from, interval, tenantFilter, to]);

  const stats = useMemo(
    () => [
      { label: "Revenue realized", value: revenue.revenue, icon: DollarSign },
      { label: "Pending cashflow", value: revenue.pending_cashflow, icon: WalletCards },
      { label: "Paid transactions", value: revenue.paid_transactions, icon: ArrowUpRight },
      { label: "All transactions", value: revenue.transactions, icon: CalendarRange },
    ],
    [revenue],
  );

  const maxRevenue = Math.max(...series.map((item) => item.revenue), 1);
  const maxCashflow = Math.max(...series.map((item) => item.cashflow), 1);

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
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-600">
            Platform finance
          </div>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">
            Revenue & Cashflow
          </h1>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <Card className="rounded-[2rem] p-5">
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
        </Card>
        <Card className="rounded-[2rem] p-5">
          <Input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            type="date"
            className="h-12 rounded-2xl"
          />
        </Card>
        <Card className="rounded-[2rem] p-5">
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            type="date"
            className="h-12 rounded-2xl"
          />
        </Card>
        <Card className="rounded-[2rem] p-5">
          <Select value={interval} onValueChange={(value) => setInterval(value as "week" | "month")}>
            <SelectTrigger className="h-12 rounded-2xl">
              <SelectValue placeholder="Interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </Card>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((card) => (
          <Card key={card.label} className="rounded-[1.75rem] border-slate-200 p-6 shadow-sm">
            <card.icon className="h-6 w-6 text-blue-600" />
            <div className="mt-6 text-sm font-semibold text-slate-500">{card.label}</div>
            <div className="mt-2 text-3xl font-black">
              Rp {card.value.toLocaleString("id-ID")}
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="rounded-[2rem] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-600">
                Cashflow chart
              </div>
              <h2 className="mt-2 text-xl font-black uppercase tracking-tight">
                {interval === "week" ? "Weekly" : "Monthly"} movement
              </h2>
            </div>
            <ChartColumn className="h-5 w-5 text-slate-400" />
          </div>
          <div className="flex h-64 items-end gap-3 overflow-x-auto">
            {series.length === 0 ? (
              <div className="text-sm text-slate-500">No revenue data for current filter.</div>
            ) : (
              series.map((point) => (
                <div key={point.period} className="flex min-w-[72px] flex-1 flex-col items-center gap-2">
                  <div className="flex h-48 w-full items-end gap-1">
                    <div
                      className="w-1/2 rounded-t-2xl bg-slate-950"
                      style={{ height: `${Math.max((point.revenue / maxRevenue) * 100, 4)}%` }}
                      title={`Revenue Rp ${point.revenue.toLocaleString("id-ID")}`}
                    />
                    <div
                      className="w-1/2 rounded-t-2xl bg-blue-500/70"
                      style={{ height: `${Math.max((point.cashflow / maxCashflow) * 100, 4)}%` }}
                      title={`Cashflow Rp ${point.cashflow.toLocaleString("id-ID")}`}
                    />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    {point.period}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-950" />
              Revenue
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Cashflow
            </span>
          </div>
        </Card>

        <Card className="rounded-[2rem] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-600">
                Breakdown
              </div>
              <h2 className="mt-2 text-xl font-black uppercase tracking-tight">
                Revenue per tenant
              </h2>
            </div>
            <Building2 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-3">
            {breakdown.map((item) => (
              <div
                key={item.tenant_id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-black">{item.tenant_name}</div>
                    <div className="text-sm text-slate-500">
                      {item.tenant_slug} • {item.owner_name} • {item.owner_email}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black">
                      Rp {(item.revenue || 0).toLocaleString("id-ID")}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                      {item.paid_orders || 0} paid
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}

