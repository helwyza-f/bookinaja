"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Users, CreditCard, Wallet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdminHeader,
  StatCard,
  StatusPill,
  SectionCard,
  EmptyState,
  formatIDR,
  formatCompactIDR,
  statusToTone,
} from "@/components/platform/admin-kit";
import { formatPlanLabel } from "@/lib/plan-access";
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

export default function OverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<SummaryData | null>(null);
  const loading = data === null;

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

  // Tenants that need attention (not active) surface first — operational focus.
  const sortedTenants = useMemo(() => {
    const list = [...(data?.tenants ?? [])];
    return list
      .sort((a, b) => {
        const aNeedsAttention = statusToTone(a.status) !== "active" ? 1 : 0;
        const bNeedsAttention = statusToTone(b.status) !== "active" ? 1 : 0;
        if (aNeedsAttention !== bNeedsAttention) return bNeedsAttention - aNeedsAttention;
        return Number(b.revenue || 0) - Number(a.revenue || 0);
      })
      .slice(0, 8);
  }, [data?.tenants]);

  const recentTransactions = useMemo(
    () => (data?.transactions ?? []).slice(0, 6),
    [data?.transactions],
  );

  const needAttention = Math.max(totals.tenants - totals.activeTenants, 0);

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-6">
      <AdminHeader
        title="Dashboard"
        subtitle="Ringkasan operasional seluruh tenant platform."
        actions={
          <Button asChild size="sm" variant="outline" className="rounded-lg">
            <Link href="/dashboard/tenants">
              Semua tenant
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {/* KPI row */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total tenant"
          value={totals.tenants.toLocaleString("id-ID")}
          icon={Building2}
          hint={`${needAttention} perlu perhatian`}
          loading={loading}
        />
        <StatCard
          label="Tenant aktif"
          value={totals.activeTenants.toLocaleString("id-ID")}
          icon={Wallet}
          hint={
            totals.tenants > 0
              ? `${Math.round((totals.activeTenants / totals.tenants) * 100)}% dari total`
              : undefined
          }
          loading={loading}
        />
        <StatCard
          label="Customer"
          value={totals.customers.toLocaleString("id-ID")}
          icon={Users}
          hint="lintas tenant"
          loading={loading}
        />
        <StatCard
          label="Revenue"
          value={formatCompactIDR(totals.revenue)}
          icon={CreditCard}
          hint={`${totals.transactions.toLocaleString("id-ID")} transaksi`}
          loading={loading}
        />
      </section>

      {/* Tenants table — operational */}
      <SectionCard
        title="Tenant"
        bodyClassName="p-0"
        action={
          <Link
            href="/dashboard/tenants"
            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Lihat semua
          </Link>
        }
      >
        {loading ? (
          <div className="p-4 text-sm text-slate-400">Memuat…</div>
        ) : sortedTenants.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Building2} title="Belum ada tenant" />
          </div>
        ) : (
          <Table className="rounded-none border-0 bg-transparent shadow-none">
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Customer</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTenants.map((tenant) => (
                <TableRow
                  key={tenant.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/tenants/${tenant.id}`)}
                >
                  <TableCell>
                    <div className="font-medium text-slate-900 dark:text-white">{tenant.name}</div>
                    <div className="text-xs text-slate-400">{tenant.slug}</div>
                  </TableCell>
                  <TableCell>
                    <StatusPill status={tenant.status || tenant.subscription_status} />
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300">
                    {formatPlanLabel(tenant.plan)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {(tenant.customers_count || 0).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-slate-900 dark:text-white">
                    {formatCompactIDR(tenant.revenue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ArrowRight className="ml-auto h-4 w-4 text-slate-300" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* Recent transactions */}
      <SectionCard
        title="Transaksi terbaru"
        bodyClassName="p-0"
        action={
          <Link
            href="/dashboard/transactions"
            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Buka ledger
          </Link>
        }
      >
        {loading ? (
          <div className="p-4 text-sm text-slate-400">Memuat…</div>
        ) : recentTransactions.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={CreditCard} title="Belum ada transaksi" />
          </div>
        ) : (
          <Table className="rounded-none border-0 bg-transparent shadow-none">
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Waktu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((txn) => (
                <TableRow key={`${txn.id}-${txn.created_at}`}>
                  <TableCell className="font-medium text-slate-900 dark:text-white">
                    {txn.code || txn.order_id || txn.id}
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300">
                    {txn.tenant_slug}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      status={String(txn.transaction_status || txn.status || "pending")}
                      label={String(txn.transaction_status || txn.status || "pending")}
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-slate-900 dark:text-white">
                    {formatIDR(txn.amount)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-slate-400">
                    {txn.created_at
                      ? new Date(txn.created_at).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
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
