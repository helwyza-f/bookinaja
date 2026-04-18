"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    const q = query.toLowerCase();
    return tenants.filter((tenant) =>
      [tenant.name, tenant.slug, tenant.owner_email, tenant.status, tenant.plan].some((v) =>
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

      <Card className="rounded-[2rem] p-3">
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Customers</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="font-black">{tenant.name}</div>
                    <div className="text-xs text-slate-500">{tenant.slug} • {tenant.owner_email || "-"}</div>
                  </TableCell>
                  <TableCell>{tenant.plan || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-full uppercase">
                      {tenant.status || "unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{tenant.customers_count || 0}</TableCell>
                  <TableCell className="text-right">{tenant.transactions_count || 0}</TableCell>
                  <TableCell className="text-right font-black">
                    Rp {(tenant.revenue || 0).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/tenants/${tenant.id}`} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold">
                      Open detail
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </main>
  );
}
