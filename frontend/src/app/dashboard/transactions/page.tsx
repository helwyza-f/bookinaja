"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/dashboard/page-shell";
import { getPlatformTenants, getPlatformTransactionsPage, type PlatformTenant, type PlatformTransaction } from "@/lib/platform-admin";

export default function TransactionsPage() {
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const params = useSearchParams();
  const [tenantFilter, setTenantFilter] = useState(params.get("tenant") || "all");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [data, setData] = useState<{ items: PlatformTransaction[]; total: number; page: number; page_size: number }>({ items: [], total: 0, page: 1, page_size: 25 });

  useEffect(() => { getPlatformTenants().then(setTenants); }, []);
  useEffect(() => { getPlatformTransactionsPage(page, pageSize).then(setData); }, [page, pageSize]);

  const filtered = useMemo(
    () => data.items.filter((tx) => {
      const tenantOk = tenantFilter === "all" || tx.tenant_slug === tenantFilter;
      const sourceOk = sourceFilter === "all" || (tx.source_type || "unknown") === sourceFilter;
      const statusOk = statusFilter === "all" || (tx.transaction_status || tx.status || "").toLowerCase() === statusFilter;
      const queryOk = [tx.code, tx.order_id, tx.plan, tx.billing_interval, tx.tenant_name, tx.tenant_slug].some((v) => String(v || "").toLowerCase().includes(query.toLowerCase()));
      return tenantOk && sourceOk && statusOk && queryOk;
    }),
    [data.items, query, sourceFilter, statusFilter, tenantFilter],
  );

  const totalPages = Math.max(Math.ceil((data.total || 0) / pageSize), 1);

  return (
    <PageShell
      eyebrow="Billing trail"
      title="Transactions"
      description="Audit transaksi platform dengan filter yang cepat, ringkas, dan bisa dipakai tim operasional sehari-hari."
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" className="rounded-2xl" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1}>Prev</Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page >= totalPages}>Next</Button>
        </div>
      }
      stats={[
        { label: "Page", value: `${page} / ${totalPages}` },
        { label: "Displayed", value: `${filtered.length}` },
        { label: "Total", value: `${data.total || 0}` },
      ]}
    >
      <Card className="rounded-3xl border-slate-200 p-4 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
        <div className="grid gap-3 xl:grid-cols-5">
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Filter tenant" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tenants</SelectItem>
              {tenants.map((tenant) => <SelectItem key={tenant.id} value={tenant.slug}>{tenant.slug}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All source</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="booking">Booking</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="settlement">Settlement</SelectItem>
              <SelectItem value="capture">Capture</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search order, plan, tenant..." className="h-12 rounded-2xl xl:col-span-2" />
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 rows</SelectItem>
              <SelectItem value="25">25 rows</SelectItem>
              <SelectItem value="50">50 rows</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="grid gap-3">
        {filtered.map((tx) => (
          <Card key={`${tx.id}-${tx.created_at}`} className="rounded-3xl border-slate-200 p-4 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="text-base font-semibold text-slate-950 dark:text-white">{tx.code || tx.order_id || tx.id}</div>
                <div className="text-sm text-slate-500">
                  {tx.tenant_name || tx.tenant_slug || "-"} - {tx.order_id || "-"}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full uppercase">{tx.source_type || "unknown"}</Badge>
                  <Badge variant="outline" className="rounded-full uppercase">{tx.transaction_status || tx.status}</Badge>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Amount</div>
                <div className="text-lg font-semibold text-slate-950 dark:text-white">Rp {tx.amount.toLocaleString("id-ID")}</div>
                <div className="text-xs text-slate-500">{tx.created_at}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
          Transaction tidak ditemukan.
        </div>
      ) : null}
    </PageShell>
  );
}
