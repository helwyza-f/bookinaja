"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/dashboard/page-shell";
import { getPlatformTenants, type PlatformTenant } from "@/lib/platform-admin";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getPlatformTenants().then(setTenants);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((tenant) =>
      [tenant.name, tenant.slug, tenant.owner_email, tenant.status, tenant.plan].some((v) =>
        (v || "").toLowerCase().includes(q),
      ),
    );
  }, [query, tenants]);

  const activeCount = tenants.filter((tenant) => tenant.status === "active").length;
  const totalRevenue = tenants.reduce((sum, tenant) => sum + (tenant.revenue || 0), 0);

  return (
    <PageShell
      eyebrow="Platform data"
      title="Tenants"
      description="Kelola tenant, status langganan, customer, transaksi, dan revenue dalam satu directory operasional."
      actions={
        <Button asChild className="w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800 sm:w-auto">
          <Link href="/register">
            <Plus className="mr-2 h-4 w-4" />
            New tenant
          </Link>
        </Button>
      }
      stats={[
        { label: "Total tenant", value: tenants.length.toLocaleString("id-ID") },
        { label: "Tenant aktif", value: activeCount.toLocaleString("id-ID") },
        { label: "Revenue", value: `Rp ${totalRevenue.toLocaleString("id-ID")}` },
      ]}
    >
      <Card className="rounded-3xl border-slate-200 p-4 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tenant, slug, email, status..."
              className="h-12 rounded-2xl pl-10"
            />
          </div>
          <div className="text-xs font-semibold text-slate-500">
            {filtered.length} dari {tenants.length} tenant
          </div>
        </div>
      </Card>

      <section className="grid gap-3">
        {filtered.map((tenant) => (
          <Card
            key={tenant.id}
            className="rounded-3xl border-slate-200 p-4 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-slate-950 dark:text-white">{tenant.name}</div>
                    <div className="truncate text-xs text-slate-500">
                      {tenant.slug} - {tenant.owner_email || "-"}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full uppercase">{tenant.plan || "-"}</Badge>
                  <Badge variant="outline" className="rounded-full uppercase">{tenant.status || "unknown"}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
                <MiniStat label="Customers" value={String(tenant.customers_count || 0)} />
                <MiniStat label="Tx" value={String(tenant.transactions_count || 0)} />
                <MiniStat label="Revenue" value={`Rp ${(tenant.revenue || 0).toLocaleString("id-ID")}`} />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button asChild variant="outline" size="sm" className="w-full rounded-2xl sm:w-auto">
                <Link href={`/dashboard/tenants/${tenant.id}`}>
                  Detail
                  <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </Card>
        ))}

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
            Tenant tidak ditemukan.
          </div>
        ) : null}
      </section>
    </PageShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white break-words">{value}</div>
    </div>
  );
}
