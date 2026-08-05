"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  formatIDR,
} from "@/components/platform/admin-kit";
import {
  getPlatformTenants,
  getPlatformTransactionsPage,
  type PlatformTenant,
  type PlatformTransaction,
} from "@/lib/platform-admin";

export default function TransactionsPage() {
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const params = useSearchParams();
  const [tenantFilter, setTenantFilter] = useState(params.get("tenant") || "all");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    items: PlatformTransaction[];
    total: number;
    page: number;
    page_size: number;
  }>({ items: [], total: 0, page: 1, page_size: 25 });

  useEffect(() => {
    getPlatformTenants().then((t) => setTenants(Array.isArray(t) ? t : []));
  }, []);

  useEffect(() => {
    const load = () => {
      setLoading(true);
      getPlatformTransactionsPage(page, pageSize)
        .then((res) =>
          setData({
            items: Array.isArray(res?.items) ? res.items : [],
            total: Number(res?.total || 0),
            page: Number(res?.page || 1),
            page_size: Number(res?.page_size || pageSize),
          }),
        )
        .finally(() => setLoading(false));
    };
    void load();
  }, [page, pageSize]);

  const filtered = useMemo(() => {
    const items = Array.isArray(data.items) ? data.items : [];
    return items.filter((tx) => {
      const tenantOk = tenantFilter === "all" || tx.tenant_slug === tenantFilter;
      const sourceOk = sourceFilter === "all" || (tx.source_type || "unknown") === sourceFilter;
      const statusOk =
        statusFilter === "all" ||
        (tx.transaction_status || tx.status || "").toLowerCase() === statusFilter;
      const queryOk = [tx.code, tx.order_id, tx.plan, tx.tenant_name, tx.tenant_slug].some((v) =>
        String(v || "").toLowerCase().includes(query.toLowerCase()),
      );
      return tenantOk && sourceOk && statusOk && queryOk;
    });
  }, [data.items, query, sourceFilter, statusFilter, tenantFilter]);

  const totalPages = Math.max(Math.ceil((data.total || 0) / pageSize), 1);

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-6">
      <AdminHeader title="Transaksi" subtitle="Audit seluruh transaksi platform." />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total" value={(data.total || 0).toLocaleString("id-ID")} icon={CreditCard} loading={loading} />
        <StatCard label="Ditampilkan" value={filtered.length.toLocaleString("id-ID")} />
        <StatCard label="Halaman" value={`${page} / ${totalPages}`} />
      </section>

      <SectionCard bodyClassName="p-0">
        <div className="grid gap-2 border-b border-[var(--admin-line-soft)] p-3 sm:grid-cols-2 xl:grid-cols-4">
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="h-10 rounded-lg">
              <SelectValue placeholder="Tenant" />
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
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-10 rounded-lg">
              <SelectValue placeholder="Sumber" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua sumber</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="booking">Booking</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 rounded-lg">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="settlement">Settlement</SelectItem>
              <SelectItem value="capture">Capture</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari order, plan…"
              className="h-10 rounded-lg pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-slate-400">Memuat transaksi…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={CreditCard} title="Transaksi tidak ditemukan" />
          </div>
        ) : (
          <Table className="rounded-none border-0 bg-transparent shadow-none">
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Waktu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tx) => (
                <TableRow key={`${tx.id}-${tx.created_at}`}>
                  <TableCell className="font-medium text-slate-900 dark:text-white">
                    {tx.code || tx.order_id || tx.id}
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300">
                    {tx.tenant_name || tx.tenant_slug || "—"}
                  </TableCell>
                  <TableCell className="capitalize text-slate-600 dark:text-slate-300">
                    {tx.source_type || "—"}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      status={String(tx.transaction_status || tx.status || "pending")}
                      label={String(tx.transaction_status || tx.status || "pending")}
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-slate-900 dark:text-white">
                    {formatIDR(tx.amount)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-slate-400">
                    {tx.created_at
                      ? new Date(tx.created_at).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="flex items-center justify-between border-t border-[var(--admin-line-soft)] p-3">
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="h-9 w-28 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 baris</SelectItem>
              <SelectItem value="25">25 baris</SelectItem>
              <SelectItem value="50">50 baris</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
            >
              Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </SectionCard>
    </main>
  );
}
