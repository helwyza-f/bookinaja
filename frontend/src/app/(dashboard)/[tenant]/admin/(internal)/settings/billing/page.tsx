"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowUpRight, BadgeCheck, CalendarClock, CreditCard, History, ReceiptText, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

const formatIDR = (value?: number) => new Intl.NumberFormat("id-ID").format(Number(value || 0));
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Sparkles className="h-4 w-4" />
            Billing Command Center
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            Status langganan dan invoice
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
            Lihat status paket, histori pembayaran, dan akses cepat untuk upgrade tanpa pindah konteks.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={loadData} className="gap-2">
            <Zap className="h-4 w-4" />
            Refresh
          </Button>
          <Button asChild className="gap-2">
            <Link href="/admin/settings/billing/subscribe">
              <CreditCard className="h-4 w-4" />
              Upgrade / Ganti Paket
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <BillingSkeleton />
      ) : (
        <>
          <Card className="relative overflow-hidden border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-7">
            <div className="absolute right-0 top-0 h-40 w-40 translate-x-1/3 -translate-y-1/3 rounded-full bg-blue-500/5 blur-3xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-blue-500/20 bg-blue-500/5 text-blue-600">
                    Subscription
                  </Badge>
                  <Badge className={cn("border-none", isTrial ? "bg-amber-500/10 text-amber-600" : isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                    {statusLabel}
                  </Badge>
                  {isPro && <Badge className="border-none bg-blue-600 text-white">Pro</Badge>}
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  {String(sub?.plan || "starter").toUpperCase()}
                </h2>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
                  {isTrial
                    ? "Kamu masih dalam masa uji coba. Gunakan waktu ini untuk cek alur booking, CRM, billing, dan analytics sebelum upgrade."
                    : isActive
                      ? "Langganan aktif dan siap dipakai untuk operasional harian."
                      : "Langganan belum aktif atau sudah habis. Upgrade untuk membuka fitur penuh."}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <BillingMetric label="Status" value={statusLabel} tone={statusTone} />
                <BillingMetric label="Plan" value={(sub?.plan || "-").toUpperCase()} tone="text-slate-950 dark:text-white" />
                <BillingMetric label="Aktif Sampai" value={periodEnd} tone="text-slate-950 dark:text-white" />
              </div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Invoice" value={String(orders.length)} hint="dokumen pembayaran" icon={History} />
            <InfoCard label="Total Bayar" value={`Rp ${formatIDR(totalPaid)}`} hint="akumulasi invoice" icon={ReceiptText} />
            <InfoCard label="Siklus" value={(sub?.current_period_start || sub?.current_period_end) ? "Berjalan" : "-"} hint="periode subscription" icon={CalendarClock} />
            <InfoCard label="Plan Sekarang" value={(sub?.plan || "-").toUpperCase()} hint={isPro ? "fitur penuh aktif" : "mode terbatas"} icon={BadgeCheck} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Akses Cepat</div>
                  <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Upgrade dan subscription</h3>
                </div>
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <QuickAction
                  title="Upgrade Paket"
                  desc="Buka plan pro dan aktifkan fitur lanjut."
                  href="/admin/settings/billing/subscribe"
                />
                <QuickAction
                  title="Lihat Order"
                  desc="Pantau histori invoice dan status pembayaran."
                  href="#invoice-history"
                />
              </div>
            </Card>

            <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Ringkasan Plan</div>
                  <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Apa yang sedang aktif</h3>
                </div>
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <div>• Status: {statusLabel}</div>
                <div>• Plan: {(sub?.plan || "-").toUpperCase()}</div>
                <div>• Periode berakhir: {periodEnd}</div>
                <div>• Total invoice: {orders.length}</div>
                <div>• Total pembayaran: Rp {formatIDR(totalPaid)}</div>
              </div>
            </Card>
          </div>

          <Card id="invoice-history" className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] sm:p-6">
            <div className="flex items-center gap-3">
              <History className="h-4 w-4 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Invoice History</h3>
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
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <ReceiptText className="h-4 w-4 text-slate-400" />
                        <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                          {String(order.Plan).toUpperCase()} • {String(order.BillingInterval).toUpperCase()}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {order.OrderID} • {formatDate(order.CreatedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-blue-600">
                          Rp {formatIDR(order.Amount)}
                        </div>
                        <div className="text-xs text-slate-400">{order.Status}</div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function BillingMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/5 dark:bg-white/5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className={cn("mt-1 text-sm font-semibold", tone)}>{value}</div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
          <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{value}</div>
          <div className="mt-1 text-xs text-slate-500">{hint}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
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
    <Link href={href} className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10">
      <div className="text-sm font-semibold text-slate-950 dark:text-white">{title}</div>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</p>
      <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600">
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
