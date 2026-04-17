"use client";

import { useEffect, useState } from "react";
import { Activity, BadgeCheck, Building2, CreditCard, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const tenants = data?.tenants ?? [];
  const customers = data?.customers ?? [];
  const transactions = data?.transactions ?? [];
  const totals = data?.totals ?? { tenants: 0, activeTenants: 0, customers: 0, transactions: 0, revenue: 0 };

  const cards = [
    { label: "Total tenant", value: totals.tenants, icon: Building2 },
    { label: "Tenant aktif", value: totals.activeTenants, icon: BadgeCheck },
    { label: "Customer", value: totals.customers, icon: Users },
    { label: "Transaksi", value: totals.transactions, icon: CreditCard },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
      <section className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Badge className="bg-blue-600/20 text-blue-200 hover:bg-blue-600/20">Live platform overview</Badge>
            <h1 className="text-4xl font-black uppercase tracking-tight md:text-6xl">
              Overview.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-300">
              Pantau tenant terdaftar, status aktivasi, customer lintas tenant, dan transaksi platform dari satu pusat kontrol.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-emerald-400">
            <Activity className="h-4 w-4 animate-pulse" />
            Sync ready
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="rounded-[1.75rem] border-slate-200 p-6 shadow-sm">
            <card.icon className="h-6 w-6 text-blue-600" />
            <div className="mt-6 text-sm font-semibold text-slate-500">{card.label}</div>
            <div className="mt-2 text-4xl font-black">{card.value}</div>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-[2rem] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black uppercase tracking-tight">Tenant list</h2>
            <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Status activasi</span>
          </div>
          <div className="space-y-3">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <div className="font-black">{tenant.name}</div>
                  <div className="text-sm text-slate-500">
                    {tenant.slug} • {tenant.owner_name || "-"} • {tenant.owner_email || "-"}
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                    {tenant.business_category || "-"} • {tenant.business_type || "-"}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    {tenant.subscription_status || "inactive"} • {tenant.plan || "-"}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="rounded-full uppercase">
                    {tenant.subscription_status || "unknown"}
                  </Badge>
                  <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                    Rp {(tenant.revenue || 0).toLocaleString("id-ID")}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link href="/dashboard/tenants" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
            Open tenant directory
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        <Card className="rounded-[2rem] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black uppercase tracking-tight">Recent transactions</h2>
            <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Global flow</span>
          </div>
          <div className="space-y-3">
            {transactions.map((txn) => (
              <div key={`${txn.id}-${txn.created_at}`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <div className="font-black">{txn.code}</div>
                  <div className="text-sm text-slate-500">{txn.tenant_slug} • {txn.created_at}</div>
                </div>
                <div className="text-right">
                  <div className="font-black">Rp {txn.amount.toLocaleString("id-ID")}</div>
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{txn.status}</div>
                </div>
              </div>
            ))}
          </div>
          <Link href="/dashboard/transactions" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
            Open transaction ledger
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </section>

      <Card className="rounded-[2rem] p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black uppercase tracking-tight">Customers</h2>
          <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Per tenant</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {customers.map((customer) => (
            <div key={`${customer.id}-${customer.tenant_slug}`} className="rounded-2xl border border-slate-200 p-4">
              <div className="font-black">{customer.name}</div>
              <div className="text-sm text-slate-500">{customer.tenant_slug} • {customer.phone}</div>
              <div className="mt-3 text-xs uppercase tracking-[0.25em] text-slate-500">
                {customer.visits || 0} visits • Rp {(customer.spend || 0).toLocaleString("id-ID")}
              </div>
            </div>
          ))}
        </div>
        <Link href="/dashboard/customers" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
          Open CRM snapshot
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>
    </main>
  );
}
