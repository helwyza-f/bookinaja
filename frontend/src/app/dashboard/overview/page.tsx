"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, CreditCard, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageShell } from "@/components/dashboard/page-shell";
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
  const recentTransactions = useMemo(() => (data?.transactions ?? []).slice(0, 8), [data?.transactions]);
  const recentCustomers = useMemo(() => (data?.customers ?? []).slice(0, 8), [data?.customers]);

  return (
    <PageShell
      eyebrow="Live platform overview"
      title="Dashboard operasional"
      description="Pantau tenant aktif, customer, transaksi, dan revenue dari satu pusat kontrol yang ringkas dan siap dipakai."
      actions={
        <Badge variant="outline" className="w-fit rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
          Sync ready
        </Badge>
      }
      stats={[
        { label: "Total tenant", value: totals.tenants.toLocaleString("id-ID"), hint: "Semua tenant terdaftar" },
        { label: "Tenant aktif", value: totals.activeTenants.toLocaleString("id-ID"), hint: "Subscription aktif" },
        { label: "Customer", value: totals.customers.toLocaleString("id-ID"), hint: "Customer seluruh tenant" },
        { label: "Transaksi", value: totals.transactions.toLocaleString("id-ID"), hint: `Revenue Rp ${totals.revenue.toLocaleString("id-ID")}` },
      ]}
    >
      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-3xl border-slate-200 p-4 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a] sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Tenant priority</div>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Tenant aktif</h2>
            </div>
            <Building2 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topTenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-950 dark:text-white">{tenant.name}</div>
                      <div className="text-xs text-slate-500">{tenant.slug}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full uppercase">
                        {tenant.subscription_status || "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">Rp {(tenant.revenue || 0).toLocaleString("id-ID")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Link href="/dashboard/tenants" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
            Open tenant directory
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        <Card className="rounded-3xl border-slate-200 p-4 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a] sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Billing trail</div>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Transaksi terbaru</h2>
            </div>
            <CreditCard className="h-5 w-5 text-slate-400" />
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((txn) => (
                  <TableRow key={`${txn.id}-${txn.created_at}`}>
                    <TableCell className="font-semibold text-slate-950 dark:text-white">{txn.code || txn.order_id || txn.id}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-950 dark:text-white">{txn.tenant_slug}</div>
                      <div className="text-xs text-slate-500">{txn.source_type || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full uppercase">
                        {txn.transaction_status || txn.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">Rp {txn.amount.toLocaleString("id-ID")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Link href="/dashboard/transactions" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
            Open transaction ledger
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </section>

      <Card className="rounded-3xl border-slate-200 p-4 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a] sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">CRM snapshot</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Customer terbaru</h2>
          </div>
          <Users className="h-5 w-5 text-slate-400" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Visits</TableHead>
                <TableHead className="text-right">Spend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentCustomers.map((customer) => (
                <TableRow key={`${customer.id}-${customer.tenant_slug}`}>
                  <TableCell>
                    <div className="font-semibold text-slate-950 dark:text-white">{customer.name}</div>
                    <div className="text-xs text-slate-500">{customer.phone || customer.email || "-"}</div>
                  </TableCell>
                  <TableCell>{customer.tenant_slug}</TableCell>
                  <TableCell>{customer.visits || 0}</TableCell>
                  <TableCell className="text-right font-semibold">Rp {(customer.spend || 0).toLocaleString("id-ID")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Link href="/dashboard/customers" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
          Open CRM snapshot
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>
    </PageShell>
  );
}
