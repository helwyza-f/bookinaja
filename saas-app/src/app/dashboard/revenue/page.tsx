"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, CalendarRange, DollarSign, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPlatformRevenue, getPlatformTenants, type PlatformTenant } from "@/lib/platform-admin";

type RevenueData = {
  revenue: number;
  pending_cashflow: number;
  transactions: number;
  paid_transactions: number;
  pending_transactions: number;
};

export default function RevenuePage() {
  const params = useSearchParams();
  const initialTenant = params.get("tenant") || "all";
  const [tenantFilter, setTenantFilter] = useState(initialTenant);
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

  useEffect(() => {
    getPlatformTenants().then(setTenants);
  }, []);

  useEffect(() => {
    getPlatformRevenue({
      tenant: tenantFilter === "all" ? "" : tenantFilter,
      from: from || undefined,
      to: to || undefined,
    }).then((res) => setRevenue(res as RevenueData));
  }, [from, tenantFilter, to]);

  const stats = useMemo(
    () => [
      { label: "Revenue realized", value: revenue.revenue, icon: DollarSign },
      { label: "Pending cashflow", value: revenue.pending_cashflow, icon: WalletCards },
      { label: "Paid transactions", value: revenue.paid_transactions, icon: ArrowUpRight },
      { label: "All transactions", value: revenue.transactions, icon: CalendarRange },
    ],
    [revenue],
  );

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-600">
          Platform finance
        </div>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">
          Revenue & Cashflow
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
          <Input value={from} onChange={(e) => setFrom(e.target.value)} type="date" className="h-12 rounded-2xl" />
        </Card>
        <Card className="rounded-[2rem] p-5">
          <Input value={to} onChange={(e) => setTo(e.target.value)} type="date" className="h-12 rounded-2xl" />
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
    </main>
  );
}

