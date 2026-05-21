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

function paymentStatusMeta(value?: string) {
  const normalized = (value || "").toLowerCase();

  switch (normalized) {
    case "pending":
      return {
        label: "Menunggu bayar",
        className:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200",
      };
    case "awaiting_verification":
      return {
        label: "Menunggu verifikasi",
        className:
          "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200",
      };
    case "partial_paid":
      return {
        label: "DP masuk",
        className:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200",
      };
    case "paid":
    case "settled":
      return {
        label: "Lunas",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200",
      };
    case "expired":
      return {
        label: "Kedaluwarsa",
        className:
          "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
      };
    case "failed":
      return {
        label: "Gagal",
        className:
          "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200",
      };
    case "refunded":
      return {
        label: "Refund",
        className:
          "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-400/20 dark:bg-fuchsia-400/10 dark:text-fuchsia-200",
      };
    default:
      return {
        label: "Belum diproses",
        className:
          "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
      };
  }
}

function bookingStatusMeta(value?: string) {
  const normalized = (value || "").toLowerCase();

  switch (normalized) {
    case "pending":
      return "Menunggu";
    case "confirmed":
      return "Siap";
    case "active":
      return "Berjalan";
    case "completed":
      return "Selesai";
    case "cancelled":
      return "Batal";
    default:
      return "-";
  }
}

function pointEventLabel(event: CustomerPointEvent) {
  const type = (event.event_type || "").toLowerCase();
  if (event.description && !/earned from booking payment/i.test(event.description)) {
    return event.description;
  }

  switch (type) {
    case "booking_payment":
    case "booking_paid":
      return "Poin dari pembayaran booking";
    case "manual_adjustment":
      return "Penyesuaian poin";
    case "refund":
      return "Pengurangan karena refund";
    default:
      return "Poin dari transaksi";
  }
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
    <div className="mx-auto max-w-350 space-y-3 px-3 pb-20 pt-3 font-plus-jakarta md:px-4 md:pt-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 sm:p-3.5">
        <div className="relative flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <Users className="h-3.5 w-3.5 text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]" />
              Customers
            </div>
            <h1 className="text-[1.65rem] font-semibold leading-none tracking-tight text-slate-950 dark:text-white sm:text-[1.75rem]">
              Customers
            </h1>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari nama / WA / email"
              className="h-10 rounded-lg border-slate-200 bg-slate-50 pl-10 text-sm dark:border-slate-800 dark:bg-slate-900/30"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
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
        compact
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
            <div
              key={customer.id}
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
                <button
                  type="button"
                  onClick={() => fetchDetail(customer.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  Lihat
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          ))
        )}
        </div>

        <div className="hidden gap-3 md:grid">
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <Card
                key={index}
                className="rounded-2xl border-slate-200 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950"
              >
                <Skeleton className="h-20 rounded-lg" />
              </Card>
            ))
          ) : filteredCustomers.length === 0 ? (
            <Card className="rounded-2xl border-slate-200 p-8 text-center text-sm text-slate-500 shadow-sm dark:border-white/10 dark:bg-slate-950">
              Tidak ada customer yang cocok.
            </Card>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:bg-slate-50/70 dark:border-white/10 dark:bg-slate-950 dark:hover:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600 dark:bg-white/5 dark:text-slate-200">
                      {(customer.name || "C").slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-base font-semibold text-slate-950 dark:text-white">
                          {customer.name || "Customer"}
                        </div>
                        <TierBadge tier={customer.tier} />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                        <span>{customer.phone || "-"}</span>
                        <span>{customer.email || "Email belum ada"}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchDetail(customer.id);
                    }}
                    className="h-8 rounded-lg"
                  >
                    Lihat
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  <Metric label="Kunjungan" value={formatIDR(customer.total_visits)} />
                  <Metric label="Belanja" value={`Rp ${formatIDR(customer.total_spent)}`} />
                  <Metric label="Poin" value={formatIDR(customer.loyalty_points)} />
                  <Metric label="Terakhir" value={formatShortDate(customer.last_visit)} />
                </div>
              </div>
            ))
          )}
        </div>
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
                      Poin tersedia
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
                    label="Kunjungan"
                    value={formatIDR(customerDetail.total_visits)}
                  />
                  <Metric
                    label="Belanja"
                    value={`Rp ${formatIDR(customerDetail.total_spent)}`}
                  />
                  <Metric
                    label="Poin tenant ini"
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
                        Ringkasan poin
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
                                {pointEventLabel(event)}
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
                        Booking terbaru
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
                          {customerHistory.map((transaction) => {
                            const paymentMeta = paymentStatusMeta(
                              transaction.payment_status,
                            );
                            return (
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
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "shrink-0 rounded-lg border text-xs font-medium",
                                      paymentMeta.className,
                                    )}
                                  >
                                    {paymentMeta.label}
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
                                    <span className="text-[10px] text-slate-500">Booking</span>
                                    <div className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                      {bookingStatusMeta(transaction.status)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
                              <TableHead className="text-xs">Pembayaran</TableHead>
                              <TableHead className="pr-4 text-right text-xs">
                                Total
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerHistory.map((transaction) => {
                              const paymentMeta = paymentStatusMeta(
                                transaction.payment_status,
                              );
                              return (
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
                                      className={cn(
                                        "rounded-lg border text-xs font-medium",
                                        paymentMeta.className,
                                      )}
                                    >
                                      {paymentMeta.label}
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
                              );
                            })}
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
