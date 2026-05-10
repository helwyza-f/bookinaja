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
import { DashboardPanel } from "@/components/dashboard/analytics-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  Coins,
  Loader2,
  Phone,
  Search,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
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
  NEW: "bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] border-[color:rgba(59,130,246,0.18)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-100)] dark:border-[color:rgba(96,165,250,0.18)]",
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

function CompactMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  loading = false,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: "indigo" | "emerald" | "amber" | "rose";
  loading?: boolean;
}) {
  const toneMap = {
    indigo: {
      shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-100)]",
    },
    emerald: {
      shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    amber: {
      shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    },
    rose: {
      shell: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
    },
  } as const;

  const colors = toneMap[tone];

  return (
    <Card className={cn("rounded-xl border p-3 sm:p-4", colors.shell)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            {loading ? "..." : value}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
            {hint}
          </div>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11",
            colors.icon,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
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
    <div className="mx-auto max-w-350 space-y-4 px-3 pb-20 pt-4 font-plus-jakarta md:px-4 md:pt-5">
      <div className="relative overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(238,252,249,0.95)_40%,rgba(255,248,240,0.9))] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(10,24,26,0.96),rgba(8,30,31,0.94)_45%,rgba(49,25,14,0.82))] dark:shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(129,216,208,0.22),transparent_58%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(129,216,208,0.2),transparent_58%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
              <Users className="h-3.5 w-3.5 text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]" />
              Customers
            </div>
            <div>
              <h1 className="text-2xl font-[950] tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Customers
              </h1>
            </div>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari nama / WA / email"
              className="h-12 rounded-[1.2rem] border-white/70 bg-white/85 pl-10 text-sm shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-2 md:gap-3 xl:grid-cols-4">
        <CompactMetricCard
          label="Customer"
          value={loading ? "..." : formatIDR(stats.customers)}
          hint="Tersimpan"
          icon={Users}
          tone="indigo"
          loading={loading}
        />
        <CompactMetricCard
          label="Visit"
          value={formatIDR(stats.totalVisits)}
          hint="Tenant"
          icon={Phone}
          tone="emerald"
          loading={loading}
        />
        <CompactMetricCard
          label="Spend"
          value={`Rp ${formatIDR(stats.tenantSpend)}`}
          hint="Belanja"
          icon={Wallet}
          tone="amber"
          loading={loading}
        />
        <CompactMetricCard
          label="Points"
          value={formatIDR(stats.globalPoints)}
          hint="Global"
          icon={Coins}
          tone="rose"
          loading={loading}
        />
      </div>

      <DashboardPanel
        eyebrow="List"
        title="Daftar customer"
      >
        <div className="grid gap-2.5 md:hidden">
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
              className="rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition-colors active:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:active:bg-white/5"
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
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <MobileStat
                  label="Visit"
                  value={formatIDR(customer.total_visits)}
                />
                <MobileStat
                  label="Points"
                  value={formatIDR(customer.loyalty_points)}
                />
                <MobileStat
                  label="Spend"
                  value={`Rp ${formatIDR(customer.total_spent)}`}
                />
                <MobileStat
                  label="Last"
                  value={formatShortDate(customer.last_visit)}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>ID {customer.id.slice(0, 8)}</span>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </div>
            </button>
          ))
        )}
        </div>

        <Card className="hidden overflow-hidden rounded-[1.8rem] border-slate-200/80 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0f1117]/96 dark:shadow-[0_24px_70px_rgba(0,0,0,0.24)] md:block">
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
                Terakhir datang
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
                  <TableCell className="text-right text-sm font-semibold text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
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
      </DashboardPanel>

      <Dialog open={!!selectedId} onOpenChange={closeDetail}>
        <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-hidden rounded-none border-slate-200 bg-white p-0 shadow-xl dark:border-white/10 dark:bg-slate-950 sm:h-auto sm:max-h-[92vh] sm:w-[calc(100vw-2rem)] sm:rounded-2xl md:max-w-4xl">
          <VisuallyHidden.Root>
            <DialogHeader>
              <DialogTitle>Detail pelanggan</DialogTitle>
              <DialogDescription>
                Profil pelanggan dan riwayat transaksi di bisnis ini.
              </DialogDescription>
            </DialogHeader>
          </VisuallyHidden.Root>

          {loadingDetail ? (
            <div className="flex h-80 flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--bookinaja-600)]" />
              <p className="text-sm text-slate-500">
                Memuat detail pelanggan...
              </p>
            </div>
          ) : customerDetail ? (
            <div className="flex h-full max-h-[100dvh] flex-col sm:max-h-[92vh]">
              <div className="border-b border-slate-200 p-4 dark:border-white/10 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-bold text-slate-950 dark:text-white md:text-xl">
                        {customerDetail.name || "Customer"}
                      </h2>
                      <TierBadge tier={customerDetail.tier} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                      <span>{customerDetail.phone || "-"}</span>
                      <span>{customerDetail.email || "Email belum ada"}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[color:rgba(59,130,246,0.18)] bg-[var(--bookinaja-50)] px-4 py-3 text-left dark:border-[color:rgba(96,165,250,0.18)] dark:bg-[color:rgba(59,130,246,0.14)] md:min-w-[210px] md:text-right">
                    <p className="text-xs font-medium text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                      Saldo points global
                    </p>
                    <p className="text-xl font-bold text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-100)] md:text-2xl">
                      {formatIDR(
                        pointSummary?.balance ?? customerDetail.loyalty_points,
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto p-3 md:p-5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
                    label="Terakhir datang"
                    value={formatShortDate(customerDetail.last_visit)}
                  />
                </div>

                <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-[0.8fr_1.2fr]">
                  <section className="rounded-xl border border-slate-200 bg-white dark:border-white/15 dark:bg-[#0f0f17]">
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
                                {event.description || "Poin dari booking"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDate(event.created_at)}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                              +{formatIDR(event.points)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white dark:border-white/15 dark:bg-[#0f0f17]">
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
                              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/[0.03]">
                                <div>
                                  <span className="text-[10px] text-slate-500">Total</span>
                                  <div className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                                    Rp {formatIDR(transaction.grand_total || transaction.total_spent)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-500">Status</span>
                                  <div className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    {transaction.status || "-"}
                                  </div>
                                </div>
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
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-slate-950 dark:text-white md:text-base">
        {value}
      </p>
    </div>
  );
}

function MobileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-white/[0.03]">
      <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-[11px] font-bold text-slate-950 dark:text-white">
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
