"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    getPlatformTenants().then(setTenants);
  }, []);

  useEffect(() => {
    getPlatformTransactionsPage(page, pageSize).then(setData);
  }, [page, pageSize]);

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
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-600">Billing trail</div>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">Transactions</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-2xl" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1}>Prev</Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page >= totalPages}>Next</Button>
        </div>
      </div>

      <Card className="rounded-[2rem] p-5">
        <div className="grid gap-3 lg:grid-cols-5">
          <Select value={tenantFilter} onValueChange={setTenantFilter}><SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Filter tenant" /></SelectTrigger><SelectContent><SelectItem value="all">All tenants</SelectItem>{tenants.map((tenant) => <SelectItem key={tenant.id} value={tenant.slug}>{tenant.slug}</SelectItem>)}</SelectContent></Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}><SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All source</SelectItem><SelectItem value="subscription">Subscription</SelectItem><SelectItem value="booking">Booking</SelectItem></SelectContent></Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="settlement">Settlement</SelectItem><SelectItem value="capture">Capture</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search order, plan, tenant..." className="h-12 rounded-2xl lg:col-span-2" />
        </div>
      </Card>

      <Card className="rounded-[2rem] p-3">
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order / Code</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tx) => (
                <TableRow key={`${tx.id}-${tx.created_at}`}>
                  <TableCell><div className="font-black">{tx.code || tx.order_id || tx.id}</div><div className="text-xs text-slate-500">{tx.order_id || "-"}</div></TableCell>
                  <TableCell><div className="font-semibold">{tx.tenant_name || tx.tenant_slug}</div><div className="text-xs text-slate-500">{tx.tenant_slug}</div></TableCell>
                  <TableCell><Badge variant="outline" className="rounded-full uppercase">{tx.source_type || "unknown"}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="rounded-full uppercase">{tx.transaction_status || tx.status}</Badge></TableCell>
                  <TableCell className="text-right font-black">Rp {tx.amount.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right text-slate-500">{tx.created_at}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </main>
  );
}
