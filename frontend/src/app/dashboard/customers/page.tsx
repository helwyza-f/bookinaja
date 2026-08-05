"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Users, Phone, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  SectionCard,
  EmptyState,
  formatIDR,
  formatCompactIDR,
} from "@/components/platform/admin-kit";
import {
  getPlatformCustomers,
  getPlatformTenants,
  type PlatformCustomer,
  type PlatformTenant,
} from "@/lib/platform-admin";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<PlatformCustomer[]>([]);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const params = useSearchParams();
  const [tenantFilter, setTenantFilter] = useState(params.get("tenant") || "all");

  useEffect(() => {
    Promise.all([getPlatformCustomers(), getPlatformTenants()])
      .then(([c, t]) => {
        setCustomers(Array.isArray(c) ? c : []);
        setTenants(Array.isArray(t) ? t : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return customers.filter((customer) => {
      const matchesTenant = tenantFilter === "all" || customer.tenant_slug === tenantFilter;
      const matchesQuery = [
        customer.name,
        customer.phone,
        customer.email,
        customer.tenant_slug,
        customer.tier,
      ].some((v) => (v || "").toLowerCase().includes(q));
      return matchesTenant && matchesQuery;
    });
  }, [customers, query, tenantFilter]);

  const totalSpend = customers.reduce((sum, c) => sum + (c.spend || 0), 0);

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-6">
      <AdminHeader title="Customer" subtitle="CRM lintas tenant seluruh platform." />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total customer"
          value={customers.length.toLocaleString("id-ID")}
          icon={Users}
          loading={loading}
        />
        <StatCard label="Ditampilkan" value={filtered.length.toLocaleString("id-ID")} />
        <StatCard label="Total spend" value={formatCompactIDR(totalSpend)} loading={loading} />
      </section>

      <SectionCard bodyClassName="p-0">
        <div className="flex flex-col gap-2 border-b border-[var(--admin-line-soft)] p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, telepon, email…"
              className="h-10 rounded-lg pl-9"
            />
          </div>
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="h-10 w-48 rounded-lg">
              <SelectValue placeholder="Filter tenant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua tenant</SelectItem>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.slug}>
                  {tenant.slug}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-slate-400">Memuat customer…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Users} title="Customer tidak ditemukan" />
          </div>
        ) : (
          <Table className="rounded-none border-0 bg-transparent shadow-none">
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Kunjungan</TableHead>
                <TableHead className="text-right">Spend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => (
                <TableRow key={`${customer.id}-${customer.tenant_slug}`}>
                  <TableCell className="font-medium text-slate-900 dark:text-white">
                    {customer.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {customer.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {customer.phone}
                        </span>
                      ) : null}
                      {customer.email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {customer.email}
                        </span>
                      ) : null}
                      {!customer.phone && !customer.email ? "—" : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300">
                    {customer.tenant_name || customer.tenant_slug}
                  </TableCell>
                  <TableCell className="capitalize text-slate-600 dark:text-slate-300">
                    {customer.tier || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {(customer.visits || 0).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-slate-900 dark:text-white">
                    {formatIDR(customer.spend)}
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
