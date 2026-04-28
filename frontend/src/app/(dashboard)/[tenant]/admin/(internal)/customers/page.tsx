"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Loader2, Phone, Search } from "lucide-react";
import { toast } from "sonner";

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tier?: string;
  total_visits: number;
  total_spent: number;
  last_visit?: string;
  updated_at?: string;
  loyalty_points?: number;
};

type CustomerDetail = CustomerRow & {
  loyalty_points?: number;
};

type CustomerHistoryItem = {
  id: string;
  resource: string;
  date: string;
  end_date?: string;
  grand_total?: number;
  deposit_amount?: number;
  paid_amount?: number;
  balance_due?: number;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  total_spent?: number;
};

type CustomerPointEvent = {
  id: string;
  event_type: string;
  points: number;
  description?: string;
  tenant_name?: string;
  created_at: string;
};

type CustomerPointSummary = {
  balance: number;
  earned_at_tenant: number;
  earning_rule_label: string;
  activity: CustomerPointEvent[];
};

const tierStyles: Record<string, string> = {
  VIP: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-400/10 dark:text-violet-200 dark:border-violet-400/20",
  GOLD: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:border-amber-400/20",
  REGULAR:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/5 dark:text-slate-200 dark:border-white/10",
  NEW: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-400/10 dark:text-blue-200 dark:border-blue-400/20",
};

function formatIDR(value?: number) {
  return new Intl.NumberFormat("id-ID").format(value || 0);
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "dd MMM yyyy");
}

function formatShortDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "dd MMM");
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(
    null,
  );
  const [customerHistory, setCustomerHistory] = useState<CustomerHistoryItem[]>(
    [],
  );
  const [pointSummary, setPointSummary] = useState<CustomerPointSummary | null>(
    null,
  );
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data || []);
    } catch {
      toast.error("Gagal memuat data pelanggan");
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const [detailRes, historyRes, pointRes] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/customers/${id}/history?limit=8`),
        api.get(`/customers/${id}/points?limit=8`),
      ]);
      setCustomerDetail(detailRes.data);
      setCustomerHistory(historyRes.data?.items || []);
      setPointSummary(pointRes.data || null);
    } catch {
      toast.error("Gagal memuat detail pelanggan");
      setSelectedId(null);
      setCustomerDetail(null);
      setCustomerHistory([]);
      setPointSummary(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.email, customer.tier]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [customers, searchQuery]);

  const stats = useMemo(() => {
    const totalVisits = customers.reduce(
      (acc, customer) => acc + (customer.total_visits || 0),
      0,
    );
    const tenantSpend = customers.reduce(
      (acc, customer) => acc + (customer.total_spent || 0),
      0,
    );
    const globalPoints = customers.reduce(
      (acc, customer) => acc + (customer.loyalty_points || 0),
      0,
    );
    return {
      customers: customers.length,
      totalVisits,
      tenantSpend,
      globalPoints,
    };
  }, [customers]);

  const closeDetail = () => {
    setSelectedId(null);
    setCustomerDetail(null);
    setCustomerHistory([]);
    setPointSummary(null);
  };

  return (
    <div className="mx-auto max-w-350 space-y-4 px-4 pb-20 pt-5 font-plus-jakarta">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Customers
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Customer global Bookinaja yang pernah booking di tenant ini.
            </p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari nama, WhatsApp, email, tier..."
              className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 text-sm dark:border-white/10 dark:bg-white/5"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Metric
            label="Customer"
            value={loading ? "-" : formatIDR(stats.customers)}
          />
          <Metric
            label="Visit di tenant ini"
            value={formatIDR(stats.totalVisits)}
          />
          <Metric
            label="Spend di tenant ini"
            value={`Rp ${formatIDR(stats.tenantSpend)}`}
          />
          <Metric
            label="Saldo points global"
            value={formatIDR(stats.globalPoints)}
          />
        </div>
      </section>

      <div className="grid gap-2 md:hidden">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Card
              key={index}
              className="rounded-xl border-slate-200 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950"
            >
              <Skeleton className="h-20 rounded-lg" />
            </Card>
          ))
        ) : filteredCustomers.length === 0 ? (
          <EmptyState label="Tidak ada customer yang cocok." />
        ) : (
          filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => fetchDetail(customer.id)}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors active:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:active:bg-white/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-950 dark:text-white">
                    {customer.name || "Customer"}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Phone className="h-3 w-3" />
                    <span className="truncate">{customer.phone || "-"}</span>
                  </div>
                </div>
                <TierBadge tier={customer.tier} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <MobileStat
                  label="Visit"
                  value={formatIDR(customer.total_visits)}
                />
                <MobileStat
                  label="Spend"
                  value={`Rp ${formatIDR(customer.total_spent)}`}
                />
                <MobileStat
                  label="Point"
                  value={formatIDR(customer.loyalty_points)}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Last visit: {formatShortDate(customer.last_visit)}</span>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </div>
            </button>
          ))
        )}
      </div>

      <Card className="hidden overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950 md:block">
        <Table>
          <TableHeader>
            <TableRow className="h-11 bg-slate-50 hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/5">
              <TableHead className="pl-5 text-xs font-semibold text-slate-500">
                Customer
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">
                Kontak
              </TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-500">
                Visit
              </TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-500">
                Spend tenant
              </TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-500">
                Points global
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">
                Last visit
              </TableHead>
              <TableHead className="pr-5 text-right text-xs font-semibold text-slate-500">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 7 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="pl-5 py-4">
                    <Skeleton className="h-8 w-44" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-5 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell className="pr-5">
                    <Skeleton className="ml-auto h-8 w-20" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-44 text-center text-sm text-slate-500"
                >
                  Tidak ada customer yang cocok.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-white/[0.03]"
                >
                  <TableCell className="pl-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600 dark:bg-white/5 dark:text-slate-200">
                        {(customer.name || "C").slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                          {customer.name || "Customer"}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <TierBadge tier={customer.tier} />
                          <span className="text-xs text-slate-400">
                            ID {customer.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-700 dark:text-slate-200">
                      {customer.phone || "-"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {customer.email || "Email belum ada"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold">
                    {formatIDR(customer.total_visits)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold">
                    Rp {formatIDR(customer.total_spent)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-blue-600">
                    {formatIDR(customer.loyalty_points)}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {formatDate(customer.last_visit)}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fetchDetail(customer.id)}
                      className="h-8 rounded-lg"
                    >
                      Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedId} onOpenChange={closeDetail}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-none overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-xl dark:border-white/10 dark:bg-slate-950 md:max-w-4xl">
          <VisuallyHidden.Root>
            <DialogHeader>
              <DialogTitle>Detail customer</DialogTitle>
              <DialogDescription>
                Profil customer dan riwayat booking tenant.
              </DialogDescription>
            </DialogHeader>
          </VisuallyHidden.Root>

          {loadingDetail ? (
            <div className="flex h-80 flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-sm text-slate-500">
                Memuat detail customer...
              </p>
            </div>
          ) : customerDetail ? (
            <div className="flex max-h-[92vh] flex-col">
              <div className="border-b border-slate-200 p-4 dark:border-white/10 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-xl font-bold text-slate-950 dark:text-white">
                        {customerDetail.name || "Customer"}
                      </h2>
                      <TierBadge tier={customerDetail.tier} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                      <span>{customerDetail.phone || "-"}</span>
                      <span>{customerDetail.email || "Email belum ada"}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left dark:border-blue-400/20 dark:bg-blue-400/10 md:text-right">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-200">
                      Saldo points global
                    </p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-100">
                      {formatIDR(
                        pointSummary?.balance ?? customerDetail.loyalty_points,
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto p-3 md:p-5">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric
                    label="Visit tenant"
                    value={formatIDR(customerDetail.total_visits)}
                  />
                  <Metric
                    label="Spend tenant"
                    value={`Rp ${formatIDR(customerDetail.total_spent)}`}
                  />
                  <Metric
                    label="Points dari tenant ini"
                    value={formatIDR(pointSummary?.earned_at_tenant)}
                  />
                  <Metric
                    label="Last visit"
                    value={formatShortDate(customerDetail.last_visit)}
                  />
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                  <section className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
                    <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
                      <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                        Aktivitas points
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {pointSummary?.earning_rule_label ||
                          "1 poin setiap Rp10.000 pembayaran lunas"}
                      </p>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-white/10">
                      {(pointSummary?.activity || []).length === 0 ? (
                        <div className="p-4 text-sm text-slate-500">
                          Belum ada aktivitas points dari tenant ini.
                        </div>
                      ) : (
                        pointSummary?.activity.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center justify-between gap-3 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                                {event.description || "Earn booking"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDate(event.created_at)}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-blue-600">
                              +{formatIDR(event.points)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
                      <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                        Transaksi terakhir
                      </h3>
                      <Badge variant="outline" className="rounded-lg text-xs">
                        {customerHistory.length} data
                      </Badge>
                    </div>
                    <div className="max-h-[360px] overflow-auto">
                      {customerHistory.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500">
                          Belum ada riwayat transaksi.
                        </div>
                      ) : (
                        <>
                        <div className="divide-y divide-slate-100 dark:divide-white/10 md:hidden">
                          {customerHistory.map((transaction) => (
                            <div key={transaction.id} className="space-y-3 px-4 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                                    {transaction.resource || "-"}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {formatShortDate(transaction.date)}
                                  </p>
                                </div>
                                <Badge variant="outline" className="shrink-0 rounded-lg text-xs">
                                  {transaction.payment_status || transaction.status || "-"}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/[0.03]">
                                <span className="text-xs text-slate-500">Total</span>
                                <span className="text-sm font-bold text-slate-950 dark:text-white">
                                  Rp {formatIDR(transaction.grand_total || transaction.total_spent)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Table className="hidden md:table">
                          <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/5">
                              <TableHead className="pl-4 text-xs">
                                Tanggal
                              </TableHead>
                              <TableHead className="text-xs">
                                Resource
                              </TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="pr-4 text-right text-xs">
                                Total
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerHistory.map((transaction) => (
                              <TableRow key={transaction.id}>
                                <TableCell className="pl-4 text-sm">
                                  {formatShortDate(transaction.date)}
                                </TableCell>
                                <TableCell className="max-w-[180px] truncate text-sm">
                                  {transaction.resource || "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className="rounded-lg text-xs"
                                  >
                                    {transaction.payment_status ||
                                      transaction.status ||
                                      "-"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="pr-4 text-right text-sm font-semibold">
                                  Rp{" "}
                                  {formatIDR(
                                    transaction.grand_total ||
                                      transaction.total_spent,
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-base font-bold text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function MobileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-white/[0.03]">
      <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function TierBadge({ tier }: { tier?: string }) {
  const normalized = tier || "NEW";
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-lg border px-2 text-[11px] font-semibold",
        tierStyles[normalized] || tierStyles.NEW,
      )}
    >
      {normalized}
    </Badge>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card className="rounded-xl border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-slate-950">
      {label}
    </Card>
  );
}
