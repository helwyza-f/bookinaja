"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  CreditCard,
  History,
  ReceiptText,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DashboardMetricCard,
  DashboardPanel,
} from "@/components/dashboard/analytics-kit";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

type SubscriptionInfo = {
  plan?: string;
  status?: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  tenant_id?: string;
};

type BillingOrder = {
  ID: string;
  OrderID: string;
  Plan: string;
  BillingInterval: string;
  Amount: number;
  Status: string;
  CreatedAt: string;
};

const formatIDR = (value?: number) =>
  new Intl.NumberFormat("id-ID").format(Number(value || 0));

const parseSafeDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value?: string | null) => {
  const parsed = parseSafeDate(value);
  return parsed ? format(parsed, "dd MMM yyyy") : "-";
};

export default function SettingsBillingPage() {
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [orders, setOrders] = useState<BillingOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subRes, ordersRes] = await Promise.all([
        api.get("/billing/subscription"),
        api.get("/billing/orders", { params: { limit: 12 } }),
      ]);
      setSub(subRes.data || null);
      setOrders(ordersRes.data?.orders || []);
    } catch {
      toast.error("Gagal memuat data billing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const status = String(sub?.status || "").toLowerCase();
  const plan = String(sub?.plan || "starter").toLowerCase();
  const isTrial = status === "trial";
  const isActive = status === "active";
  const isPro = plan === "pro";
  const periodEnd = formatDate(sub?.current_period_end || null);

  const statusTone = isTrial
    ? "text-amber-600"
    : isActive
      ? "text-emerald-500"
      : "text-red-500";

  const statusLabel = isTrial
    ? "Trial"
    : isActive
      ? "Active"
      : "Expired / Inactive";

  const totalPaid = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.Amount || 0), 0),
    [orders],
  );

  return (
    <div className="space-y-4 p-4 pb-20 sm:space-y-6 sm:p-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.95)_40%,rgba(236,253,245,0.92))] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(12,31,54,0.94)_45%,rgba(4,47,46,0.88))] dark:shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.18),transparent_58%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_58%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-300" />
              Billing Overview
            </div>
            <div>
              <h1 className="text-3xl font-[950] tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Status paket, invoice, dan upgrade ada dalam satu ritme.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Lihat kondisi subscription dulu, lalu lanjut ke histori pembayaran dan langkah upgrade tanpa pindah konteks visual.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={loadData}
              className="gap-2 rounded-[1.2rem]"
            >
              <Zap className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              asChild
              className="gap-2 rounded-[1.2rem] bg-slate-950 text-white hover:bg-[var(--bookinaja-700)] dark:bg-white dark:text-slate-950"
            >
              <Link href="/admin/settings/billing/subscribe">
                <CreditCard className="h-4 w-4" />
                Upgrade / Ganti Paket
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <BillingSkeleton />
      ) : (
        <>
          <Card className="relative overflow-hidden rounded-[2rem] border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0f1117]/96 dark:shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-7">
            <div className="absolute right-0 top-0 h-40 w-40 translate-x-1/3 -translate-y-1/3 rounded-full bg-[color:rgba(59,130,246,0.12)] blur-3xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-[color:rgba(59,130,246,0.2)] bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-200)]"
                  >
                    Subscription
                  </Badge>
                  <Badge
                    className={cn(
                      "border-none",
                      isTrial
                        ? "bg-amber-500/10 text-amber-600"
                        : isActive
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-red-500/10 text-red-500",
                    )}
                  >
                    {statusLabel}
                  </Badge>
                  {isPro ? (
                    <Badge className="border-none bg-[var(--bookinaja-600)] text-white">
                      Pro
                    </Badge>
                  ) : null}
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  {String(sub?.plan || "starter").toUpperCase()}
                </h2>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
                  {isTrial
                    ? "Masa uji coba masih berjalan. Ini momen terbaik untuk cek alur booking, CRM, billing, dan analytics sebelum upgrade."
                    : isActive
                      ? "Langganan aktif dan siap menopang operasional harian."
                      : "Langganan belum aktif atau sudah habis. Upgrade untuk membuka fitur penuh."}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <BillingMetric
                  label="Status"
                  value={statusLabel}
                  tone={statusTone}
                />
                <BillingMetric
                  label="Plan"
                  value={(sub?.plan || "-").toUpperCase()}
                  tone="text-slate-950 dark:text-white"
                />
                <BillingMetric
                  label="Aktif Sampai"
                  value={periodEnd}
                  tone="text-slate-950 dark:text-white"
                />
              </div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardMetricCard
              label="Invoice"
              value={String(orders.length)}
              hint="dokumen pembayaran"
              icon={History}
              tone="indigo"
            />
            <DashboardMetricCard
              label="Total Bayar"
              value={`Rp ${formatIDR(totalPaid)}`}
              hint="akumulasi invoice"
              icon={ReceiptText}
              tone="emerald"
            />
            <DashboardMetricCard
              label="Siklus"
              value={
                sub?.current_period_start || sub?.current_period_end
                  ? "Berjalan"
                  : "-"
              }
              hint="periode subscription"
              icon={CalendarClock}
              tone="amber"
            />
            <DashboardMetricCard
              label="Plan Sekarang"
              value={(sub?.plan || "-").toUpperCase()}
              hint={isPro ? "fitur penuh aktif" : "mode terbatas"}
              icon={BadgeCheck}
              tone="slate"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <DashboardPanel
              eyebrow="Quick Actions"
              title="Upgrade dan akses riwayat pembayaran"
              description="Aksi yang paling sering dipakai diletakkan terpisah agar tim bisa bergerak tanpa scanning panjang."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <QuickAction
                  title="Upgrade Paket"
                  desc="Buka plan Pro dan aktifkan fitur lanjutan."
                  href="/admin/settings/billing/subscribe"
                />
                <QuickAction
                  title="Lihat Order"
                  desc="Pantau histori invoice dan status pembayaran."
                  href="#invoice-history"
                />
              </div>
            </DashboardPanel>

            <DashboardPanel
              eyebrow="Plan Snapshot"
              title="Apa yang sedang aktif sekarang"
              description="Ringkasan singkat untuk status paket, masa aktif, dan total histori pembayaran."
            >
              <div className="space-y-2 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 px-4 py-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03]">
                <div>- Status: {statusLabel}</div>
                <div>- Plan: {(sub?.plan || "-").toUpperCase()}</div>
                <div>- Periode berakhir: {periodEnd}</div>
                <div>- Total invoice: {orders.length}</div>
                <div>- Total pembayaran: Rp {formatIDR(totalPaid)}</div>
              </div>
            </DashboardPanel>
          </div>

          <DashboardPanel
            eyebrow="Invoice History"
            title="Riwayat invoice"
            description="Semua invoice ditampilkan dalam kartu yang mudah dipindai untuk nominal, tanggal, dan status."
          >
            <Card
              id="invoice-history"
              className="border-slate-200/80 bg-white/95 p-4 shadow-none dark:border-white/10 dark:bg-[#0f1117]/96 sm:p-6"
            >
              <div className="flex items-center gap-3">
                <History className="h-4 w-4 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Riwayat invoice
                </h3>
              </div>

              <div className="mt-4 space-y-2">
                {orders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-500 dark:border-white/10">
                    Belum ada invoice.
                  </div>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.ID}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <ReceiptText className="h-4 w-4 text-slate-400" />
                          <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                            {String(order.Plan).toUpperCase()} -{" "}
                            {String(order.BillingInterval).toUpperCase()}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {order.OrderID} - {formatDate(order.CreatedAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                            Rp {formatIDR(order.Amount)}
                          </div>
                          <div className="text-xs text-slate-400">
                            {order.Status}
                          </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </DashboardPanel>
        </>
      )}
    </div>
  );
}

function BillingMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className={cn("mt-1 text-sm font-semibold", tone)}>{value}</div>
    </div>
  );
}

function QuickAction({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
    >
      <div className="text-sm font-semibold text-slate-950 dark:text-white">
        {title}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</p>
      <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
        Buka
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Link>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-56 rounded-[2.25rem] bg-slate-100 dark:bg-white/5" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28 rounded-[1.75rem] bg-slate-100 dark:bg-white/5" />
        <Skeleton className="h-28 rounded-[1.75rem] bg-slate-100 dark:bg-white/5" />
        <Skeleton className="h-28 rounded-[1.75rem] bg-slate-100 dark:bg-white/5" />
      </div>
      <Skeleton className="h-80 rounded-[1.75rem] bg-slate-100 dark:bg-white/5" />
    </div>
  );
}
