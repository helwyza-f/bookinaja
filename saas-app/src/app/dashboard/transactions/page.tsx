"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPlatformTenants, getPlatformTransactions, type PlatformTransaction, type PlatformTenant } from "@/lib/platform-admin";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<PlatformTransaction[]>([]);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const params = useSearchParams();
  const initialTenant = params.get("tenant") || "all";
  const [tenantFilter, setTenantFilter] = useState(initialTenant);

  useEffect(() => {
    getPlatformTransactions().then(setTransactions);
    getPlatformTenants().then(setTenants);
  }, []);

  const filtered = useMemo(
    () =>
      transactions.filter((tx) => tenantFilter === "all" || tx.tenant_slug === tenantFilter),
    [tenantFilter, transactions],
  );

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-600">
          Billing trail
        </div>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">Transactions</h1>
      </div>

      <Card className="rounded-[2rem] p-5 md:max-w-xs">
        <Select value={tenantFilter} onValueChange={setTenantFilter}>
          <SelectTrigger className="h-12 rounded-2xl">
            <SelectValue placeholder="Filter tenant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tenants</SelectItem>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.slug}>
                {tenant.slug}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <div className="space-y-3">
        {filtered.map((tx) => (
          <Card key={`${tx.id}-${tx.created_at}`} className="rounded-[2rem] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-black">{tx.code}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {tx.tenant_name || tx.tenant_slug} • {tx.created_at}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                  Plan: {tx.plan || "-"} • Interval: {tx.billing_interval || "-"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="rounded-full uppercase">
                  {tx.status}
                </Badge>
                <div className="font-black">
                  {tx.currency || "IDR"} {tx.amount.toLocaleString("id-ID")}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}

