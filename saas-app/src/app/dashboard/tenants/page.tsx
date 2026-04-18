"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, CircleDot } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getPlatformTenants, type PlatformTenant } from "@/lib/platform-admin";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getPlatformTenants().then(setTenants);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return tenants.filter((tenant) =>
      [tenant.name, tenant.slug, tenant.owner_email, tenant.status].some((v) =>
        (v || "").toLowerCase().includes(q),
      ),
    );
  }, [query, tenants]);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-600">
            Platform data
          </div>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-950">
            Tenants
          </h1>
        </div>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          New tenant
        </Link>
      </div>

      <Card className="rounded-[2rem] p-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tenant, slug, email, status..."
            className="h-12 rounded-2xl pl-11"
          />
        </div>
      </Card>

      <div className="grid gap-4">
        {filtered.map((tenant) => (
          <Card key={tenant.id} className="rounded-[2rem] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black">{tenant.name}</h2>
                  <Badge variant="outline" className="rounded-full uppercase">
                    {tenant.status || "unknown"}
                  </Badge>
                </div>
                <div className="text-sm text-slate-500">
                  {tenant.slug} • {tenant.owner_email}
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <CircleDot className="h-3 w-3 text-emerald-500" />
                    {tenant.customers_count || 0} customers
                  </span>
                  <span>{tenant.transactions_count || 0} transactions</span>
                  <span>Rp {(tenant.revenue || 0).toLocaleString("id-ID")}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/tenants/${tenant.id}`} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold">
                  Open detail
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}

