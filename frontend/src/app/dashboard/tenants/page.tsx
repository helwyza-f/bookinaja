"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8">
      <section className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">
            <Building2 className="h-4 w-4" />
            Platform data
          </div>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-950">
            Tenants
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Kelola tenant, status langganan, customer, transaksi, dan revenue.
          </p>
        </div>
        <Button asChild className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">
          <Link href="/register">
            <Plus className="mr-2 h-4 w-4" />
            New tenant
          </Link>
        </Button>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="Total tenant" value={tenants.length.toLocaleString("id-ID")} />
        <StatCard label="Tenant aktif" value={activeCount.toLocaleString("id-ID")} />
        <StatCard label="Revenue" value={`Rp ${totalRevenue.toLocaleString("id-ID")}`} />
      </section>

      <Card className="rounded-2xl border-slate-200 p-3 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tenant, slug, email, status..."
              className="h-11 rounded-xl pl-10"
            />
          </div>
          <div className="px-1 text-xs font-semibold text-slate-500">
            {filtered.length} dari {tenants.length} tenant
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border-slate-200 p-2 shadow-sm">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Customers</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="font-black">{tenant.name}</div>
                    <div className="text-xs text-slate-500">
                      {tenant.slug} • {tenant.owner_email || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">{tenant.plan || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-lg uppercase">
                      {tenant.status || "unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{tenant.customers_count || 0}</TableCell>
                  <TableCell className="text-right">{tenant.transactions_count || 0}</TableCell>
                  <TableCell className="text-right font-black">
                    Rp {(tenant.revenue || 0).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm" className="rounded-xl">
                      <Link href={`/dashboard/tenants/${tenant.id}`}>
                        Detail
                        <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Tenant tidak ditemukan.
          </div>
        ) : null}
      </Card>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl border-slate-200 p-4 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
    </Card>
  );
}
