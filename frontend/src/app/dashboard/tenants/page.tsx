"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search, ArrowRight } from "lucide-react";
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
  StatusPill,
  SectionCard,
  EmptyState,
  formatCompactIDR,
  statusToTone,
} from "@/components/platform/admin-kit";
import { formatPlanLabel } from "@/lib/plan-access";
import { getPlatformTenants, type PlatformTenant } from "@/lib/platform-admin";

type SortKey = "revenue" | "customers" | "name";

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");

  useEffect(() => {
    getPlatformTenants()
      .then(setTenants)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = tenants.filter((tenant) => {
      const matchQuery =
        !q ||
        [tenant.name, tenant.slug, tenant.owner_email, tenant.plan].some((v) =>
          (v || "").toLowerCase().includes(q),
        );
      const status = (tenant.status || tenant.subscription_status || "").toLowerCase();
      const matchStatus = statusFilter === "all" || statusToTone(status) === statusFilter;
      const matchPlan =
        planFilter === "all" || (tenant.plan || "").toLowerCase() === planFilter;
      return matchQuery && matchStatus && matchPlan;
    });

    list = list.sort((a, b) => {
      if (sortKey === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortKey === "customers")
        return Number(b.customers_count || 0) - Number(a.customers_count || 0);
      return Number(b.revenue || 0) - Number(a.revenue || 0);
    });

    return list;
  }, [query, statusFilter, planFilter, sortKey, tenants]);

  const activeCount = tenants.filter((t) => statusToTone(t.status) === "active").length;
  const totalRevenue = tenants.reduce((sum, t) => sum + (t.revenue || 0), 0);

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-6">
      <AdminHeader title="Tenant" subtitle="Kelola seluruh workspace tenant di platform." />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total tenant"
          value={tenants.length.toLocaleString("id-ID")}
          icon={Building2}
          loading={loading}
        />
        <StatCard
          label="Aktif"
          value={activeCount.toLocaleString("id-ID")}
          hint={
            tenants.length > 0
              ? `${Math.round((activeCount / tenants.length) * 100)}% dari total`
              : undefined
          }
          loading={loading}
        />
        <StatCard label="Revenue total" value={formatCompactIDR(totalRevenue)} loading={loading} />
      </section>

      <SectionCard bodyClassName="p-0">
        {/* Filter bar */}
        <div className="flex flex-col gap-2 border-b border-[var(--admin-line-soft)] p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, slug, email…"
              className="h-10 rounded-lg pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-32 rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="h-10 w-28 rounded-lg">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua plan</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-10 w-32 rounded-lg">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="customers">Customer</SelectItem>
                <SelectItem value="name">Nama</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-slate-400">Memuat tenant…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Building2}
              title="Tenant tidak ditemukan"
              description="Coba ubah kata kunci atau filter."
            />
          </div>
        ) : (
          <Table className="rounded-none border-0 bg-transparent shadow-none">
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Customer</TableHead>
                <TableHead className="text-right">Transaksi</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tenant) => (
                <TableRow
                  key={tenant.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/tenants/${tenant.id}`)}
                >
                  <TableCell>
                    <div className="font-medium text-slate-900 dark:text-white">{tenant.name}</div>
                    <div className="text-xs text-slate-400">
                      {tenant.slug}
                      {tenant.owner_email ? ` · ${tenant.owner_email}` : ""}
                    </div>
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
                  <TableCell className="text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {(tenant.transactions_count || 0).toLocaleString("id-ID")}
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

      <div className="px-1 text-xs text-slate-400">
        {loading ? "" : `${filtered.length} dari ${tenants.length} tenant`}
      </div>
    </main>
  );
}
