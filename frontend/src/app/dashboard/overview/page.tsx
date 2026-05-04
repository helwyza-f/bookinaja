"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, CreditCard, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/dashboard/page-shell";
import {
  DashboardDonutPanel,
  DashboardLeaderboardPanel,
  DashboardLineChartPanel,
  DashboardPanel,
  DashboardStatStrip,
} from "@/components/dashboard/analytics-kit";
import {
  getPlatformSummary,
  type PlatformCustomer,
  type PlatformTenant,
  type PlatformTransaction,
} from "@/lib/platform-admin";

type SummaryData = {
  tenants: PlatformTenant[];
  customers: PlatformCustomer[];
  transactions: PlatformTransaction[];
  totals: {
    tenants: number;
    activeTenants: number;
    customers: number;
    transactions: number;
    revenue: number;
  };
};

const formatIDR = (value: number) =>
  `Rp ${value.toLocaleString("id-ID")}`;

export default function OverviewPage() {
  const [data, setData] = useState<SummaryData | null>(null);

  useEffect(() => {
    getPlatformSummary().then(setData);
  }, []);

  const totals = data?.totals ?? {
    tenants: 0,
    activeTenants: 0,
    customers: 0,
    transactions: 0,
    revenue: 0,
  };

  const topTenants = useMemo(() => (data?.tenants ?? []).slice(0, 6), [data?.tenants]);
  const recentTransactions = useMemo(() => (data?.transactions ?? []).slice(0, 10), [data?.transactions]);
  const recentCustomers = useMemo(() => (data?.customers ?? []).slice(0, 6), [data?.customers]);

  const transactionSeries = useMemo(() => {
    const grouped = new Map<string, { amount: number; orders: number }>();
    recentTransactions
      .slice()
      .reverse()
      .forEach((txn, index) => {
        const label = txn.created_at
          ? new Date(txn.created_at).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
            })
          : `T${index + 1}`;
        const current = grouped.get(label) || { amount: 0, orders: 0 };
        current.amount += Number(txn.amount || 0);
        current.orders += 1;
        grouped.set(label, current);
      });

    return Array.from(grouped.entries()).map(([label, value]) => ({
      label,
      primary: value.amount,
      secondary: value.orders,
      meta: `${value.orders} trx`,
    }));
  }, [recentTransactions]);

  const statusSegments = useMemo(() => {
    const active = totals.activeTenants;
    const inactive = Math.max(totals.tenants - active, 0);
    const withRevenue = data?.tenants?.filter((tenant) => Number(tenant.revenue || 0) > 0).length || 0;
    return [
      { label: "Active", value: active, colorClass: "--chart-emerald" },
      { label: "Need follow-up", value: inactive, colorClass: "--chart-rose" },
      { label: "Paying", value: withRevenue, colorClass: "--chart-indigo" },
    ];
  }, [data?.tenants, totals.activeTenants, totals.tenants]);

  const healthRows = useMemo(
    () =>
      topTenants.map((tenant) => ({
        id: tenant.id,
        title: tenant.name,
        subtitle: tenant.slug,
        value: formatIDR(Number(tenant.revenue || 0)),
        meta: String(tenant.subscription_status || "unknown").toUpperCase(),
        progress:
          totals.revenue > 0
            ? (Number(tenant.revenue || 0) / totals.revenue) * 100
            : 0,
      })),
    [topTenants, totals.revenue],
  );

  const customerRows = useMemo(
    () =>
      recentCustomers.map((customer) => ({
        id: `${customer.id}-${customer.tenant_slug}`,
        title: customer.name || "Customer",
        subtitle: customer.phone || customer.email || customer.tenant_slug,
        value: formatIDR(Number(customer.spend || 0)),
        meta: `${customer.visits || 0} visits`,
        progress:
          recentCustomers.length && recentCustomers[0]?.spend
            ? (Number(customer.spend || 0) / Number(recentCustomers[0].spend || 1)) * 100
            : 0,
      })),
    [recentCustomers],
  );

  return (
    <PageShell
      eyebrow="Live platform overview"
      title="Dashboard operasional"
      description="Struktur ulang pusat kontrol platform: headline metrik di atas, pulse transaksi di tengah, dan daftar prioritas yang mudah dibaca dalam satu grid yang konsisten."
      actions={
        <>
          <Badge
            variant="outline"
            className="w-fit rounded-full border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
          >
            Sync ready
          </Badge>
          <Button asChild className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800">
            <Link href="/dashboard/transactions">
              Open ledger
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </>
      }
      stats={[
        { label: "Total tenant", value: totals.tenants.toLocaleString("id-ID"), hint: "semua workspace" },
        { label: "Tenant aktif", value: totals.activeTenants.toLocaleString("id-ID"), hint: "subscription sehat" },
        { label: "Customer", value: totals.customers.toLocaleString("id-ID"), hint: "cross-tenant CRM" },
        { label: "Revenue", value: formatIDR(totals.revenue), hint: `${totals.transactions.toLocaleString("id-ID")} transaksi` },
      ]}
    >
      <DashboardStatStrip
        items={[
          { label: "Live transaction pulse", value: `${recentTransactions.length} transaksi terbaru`, tone: "indigo" },
          { label: "Directory health", value: `${topTenants.length} tenant prioritas`, tone: "emerald" },
          { label: "CRM visibility", value: `${recentCustomers.length} customer terbaru`, tone: "cyan" },
          { label: "Ops mode", value: "Platform wide", tone: "slate" },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardLineChartPanel
          eyebrow="Transaction pulse"
          title="Arus revenue terbaru"
          description="Chart utama ditempatkan di atas supaya pembacaan tren finansial lebih cepat sebelum turun ke tabel detail."
          points={transactionSeries}
          primaryLabel="Revenue"
          secondaryLabel="Orders"
          formatValue={(value) => formatIDR(value)}
        />

        <DashboardDonutPanel
          eyebrow="Tenant mix"
          title="Status tenant platform"
          description="Distribusi aktif, tenant yang perlu follow-up, dan workspace yang sudah menghasilkan revenue."
          totalLabel="Total tenant"
          totalValue={totals.tenants.toLocaleString("id-ID")}
          segments={statusSegments}
          footer={
            <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
              Focus utama hari ini: <span className="font-semibold text-slate-950 dark:text-white">{Math.max(totals.tenants - totals.activeTenants, 0)}</span> tenant belum aktif penuh.
            </div>
          }
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DashboardLeaderboardPanel
          eyebrow="Tenant priority"
          title="Tenant dengan kontribusi tertinggi"
          description="Leaderboard menggantikan tabel padat supaya scanning revenue dan status lebih cepat."
          rows={healthRows}
          emptyText="Belum ada tenant untuk ditampilkan."
        />

        <DashboardLeaderboardPanel
          eyebrow="CRM snapshot"
          title="Customer dengan spend tertinggi"
          description="Prioritaskan relasi yang sudah punya nilai lifetime tertinggi lintas tenant."
          rows={customerRows}
          emptyText="Belum ada customer untuk ditampilkan."
        />
      </section>

      <DashboardPanel
        eyebrow="Recent motion"
        title="Transaksi terbaru dan tindakan cepat"
        description="Tabel besar diganti jadi kartu aktivitas yang tetap informatif tapi lebih ringan dibaca di dashboard."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href="/dashboard/tenants">
                <Building2 className="mr-2 h-4 w-4" />
                Tenants
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href="/dashboard/customers">
                <Users className="mr-2 h-4 w-4" />
                Customers
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href="/dashboard/transactions">
                <CreditCard className="mr-2 h-4 w-4" />
                Transactions
              </Link>
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {recentTransactions.map((txn) => (
            <div
              key={`${txn.id}-${txn.created_at}`}
              className="rounded-[1.45rem] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                    {txn.code || txn.order_id || txn.id}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {txn.tenant_slug} • {txn.source_type || "transaction"}
                  </div>
                </div>
                <Badge className="rounded-full border-none bg-white/90 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-100">
                  {String(txn.transaction_status || txn.status || "pending")}
                </Badge>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div className="text-lg font-[950] tracking-tight text-blue-600 dark:text-blue-300">
                  {formatIDR(Number(txn.amount || 0))}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="h-4 w-4" />
                  {txn.created_at
                    ? new Date(txn.created_at).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "baru"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DashboardPanel>
    </PageShell>
  );
}
