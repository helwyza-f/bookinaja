"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, History, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import {
  formatPlanLabel,
  formatSubscriptionStatusLabel,
  resolvePlanState,
} from "@/lib/plan-access";
import { BILLING_PLANS, getBillingPlan, formatIDR } from "@/lib/pricing";

type SubscriptionInfo = {
  plan?: string;
  status?: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  tenant_id?: string;
  plan_features?: string[];
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

type InvoiceStatusTone = "success" | "warning" | "muted" | "danger";

const STALE_PENDING_HOURS = 24;

const parseSafeDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value?: string | null) => {
  const parsed = parseSafeDate(value);
  return parsed ? format(parsed, "dd MMM yyyy") : "-";
};

const isStalePendingOrder = (order: BillingOrder) => {
  const status = String(order.Status || "").toLowerCase();
  if (status !== "pending" && status !== "created") {
    return false;
  }

  const createdAt = parseSafeDate(order.CreatedAt);
  if (!createdAt) {
    return false;
  }

  const elapsedHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  return elapsedHours >= STALE_PENDING_HOURS;
};

const resolveInvoiceStatus = (
  order: BillingOrder,
): { label: string; tone: InvoiceStatusTone; note?: string } => {
  if (isStalePendingOrder(order)) {
    return {
      label: "Perlu cek",
      tone: "warning",
      note: "Invoice ini masih pending cukup lama. Status gateway belum tersinkron penuh.",
    };
  }

  switch (String(order.Status || "").toLowerCase()) {
    case "paid":
    case "settlement":
    case "capture":
      return { label: "Lunas", tone: "success" };
    case "pending":
    case "created":
      return { label: "Menunggu bayar", tone: "muted" };
    case "expired":
      return { label: "Kedaluwarsa", tone: "danger" };
    case "cancelled":
      return { label: "Dibatalkan", tone: "danger" };
    case "denied":
    case "failed":
      return { label: "Gagal", tone: "danger" };
    default:
      return { label: formatSubscriptionStatusLabel(order.Status), tone: "muted" };
  }
};

const toneClassName: Record<InvoiceStatusTone, string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
  muted:
    "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
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
      toast.error("Gagal memuat billing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const planState = resolvePlanState({
    plan: sub?.plan,
    subscription_status: sub?.status,
    current_period_end: sub?.current_period_end,
  });

  const periodEnd = formatDate(sub?.current_period_end);
  const billingPlan = getBillingPlan(planState.rawPlan);
  const featureHighlights = (billingPlan?.adminFeatures || []).slice(0, 4);
  const trialUpgradePlans = BILLING_PLANS.filter((plan) => plan.key === "starter" || plan.key === "pro");
  const staleInvoices = useMemo(
    () => orders.filter((order) => isStalePendingOrder(order)).length,
    [orders],
  );

  const summaryTitle = planState.isTrial
    ? "Trial masih berjalan"
    : planState.isPro
      ? "Langganan aktif dan siap dipakai"
      : "Plan aktif untuk operasional saat ini";

  const summaryCopy = planState.isTrial
    ? "Trial tetap aktif sampai tanggal berakhir. Kalau tenant ini mau lanjut dipakai serius, langkah berikutnya adalah pilih paket."
    : planState.isPro
      ? "Billing cukup dipantau saat masa aktif mendekati habis atau saat ada invoice baru."
      : "Plan sekarang masih cukup untuk operasional inti. Upgrade hanya saat kebutuhan tim dan kontrol mulai naik.";

  const primaryCtaLabel = planState.isPro
    ? "Kelola langganan"
    : planState.isTrial
      ? "Pilih paket sekarang"
      : planState.nextActionLabel;

  const heroCopy = planState.isTrial
    ? `Free Trial aktif sampai ${periodEnd}. Sebelum masa coba habis, pilih paket yang ingin dipakai supaya tenant ini bisa lanjut jalan tanpa jeda.`
    : "Pantau status langganan, masa aktif, dan invoice yang memang masih perlu dicek.";

  return (
    <div className="space-y-5 p-4 pb-20 sm:space-y-6 sm:p-6">
      {loading ? (
        <BillingSkeleton />
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <Badge
                  variant="outline"
                  className="w-fit border-blue-500/15 bg-blue-500/5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600"
                >
                  Billing
                </Badge>
                <div className="space-y-2">
                  <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                    {planState.title}
                  </h1>
                  <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {heroCopy}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={loadData} className="rounded-lg">
                  Refresh
                </Button>
                <Button
                  asChild
                  className="rounded-lg bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                >
                  <Link href="/admin/settings/billing/subscribe">
                    {primaryCtaLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <CompactMetric
                label="Status"
                value={formatSubscriptionStatusLabel(sub?.status)}
              />
              <CompactMetric
                label={planState.isTrial ? "Trial sampai" : "Plan"}
                value={planState.isTrial ? periodEnd : planState.title}
              />
              <CompactMetric
                label={planState.isTrial ? "Langkah berikutnya" : "Aktif sampai"}
                value={planState.isTrial ? "Pilih paket" : periodEnd}
              />
            </div>
          </section>

          <Card className="rounded-xl border-slate-200/80 bg-white/96 p-5 shadow-sm dark:border-white/10 dark:bg-[#0f1117]/96 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {planState.isTrial ? "Masa trial" : "Ringkasan langganan"}
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  {planState.isTrial ? "Pilih paket sebelum trial berakhir" : summaryTitle}
                </h2>
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {summaryCopy}
                </p>
              </div>

              {staleInvoices > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  {staleInvoices} invoice masih pending cukup lama dan perlu dicek.
                </div>
              ) : null}
            </div>

            {planState.isTrial ? (
              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div className="rounded-lg border border-blue-200/70 bg-blue-50 p-4 dark:border-blue-400/15 dark:bg-blue-500/10">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SummaryField label="Plan saat ini" value="Free Trial" />
                    <SummaryField label="Berakhir pada" value={periodEnd} />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Trial dipakai untuk mencoba. Kalau tenant ini memang mau lanjut dipakai, keputusan yang perlu diambil sekarang adalah pilih paket sebelum masa trial habis.
                  </p>
                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <Button
                      asChild
                      className="rounded-lg bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                    >
                      <Link href="/admin/settings/billing/subscribe">
                        Pilih paket sekarang
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="rounded-lg border-blue-200 bg-white text-blue-700 hover:bg-blue-50 dark:border-blue-400/20 dark:bg-transparent dark:text-blue-200"
                    >
                      <Link href="/pricing" target="_blank">
                        Lihat perbandingan paket
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {trialUpgradePlans.map((plan) => (
                    <div
                      key={plan.key}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-slate-950 dark:text-white">
                            {plan.name}
                          </div>
                          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {plan.label}
                          </div>
                        </div>
                        {plan.recommended ? (
                          <span className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                            Paling masuk akal
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                        Rp {formatIDR(plan.monthly)}
                        <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                          /bulan
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {plan.headline}
                      </p>

                      <div className="mt-4 space-y-2">
                        {plan.adminFeatures.slice(0, 3).map((feature) => (
                          <div
                            key={feature}
                            className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            {feature}
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <Button
                          asChild
                          variant={plan.key === "pro" ? "default" : "outline"}
                          className={plan.key === "pro" ? "rounded-lg" : "rounded-lg bg-white"}
                        >
                          <Link href={`/admin/settings/billing/subscribe?plan=${plan.key}&interval=monthly`}>
                            Pilih {plan.name}
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" className="rounded-lg px-0 text-slate-600 hover:bg-transparent hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
                          <Link href={`/pricing/${plan.key}`} target="_blank">
                            Lihat detail
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SummaryField label="Plan aktif" value={planState.title} />
                    <SummaryField label="Periode aktif" value={periodEnd} />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Pantau masa aktif plan dan lanjutkan upgrade saat kamu sudah siap memakai fitur berbayar.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    Akses plan saat ini
                  </div>
                  <div className="mt-3 space-y-2">
                    {featureHighlights.length > 0 ? (
                      featureHighlights.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          {feature}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Fitur plan akan muncul setelah langganan aktif.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card
            id="invoice-history"
            className="rounded-xl border-slate-200/80 bg-white/96 p-5 shadow-sm dark:border-white/10 dark:bg-[#0f1117]/96 sm:p-6"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <History className="h-4 w-4 text-slate-400" />
                <div>
                  <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                    Riwayat invoice
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Fokus ke status invoice yang masih perlu tindakan atau pengecekan.
                  </p>
                </div>
              </div>

              {staleInvoices > 0 ? (
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  Pending lama tidak otomatis saya anggap lunas.
                </div>
              ) : null}
            </div>

            <div className="mt-5 space-y-3">
              {orders.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                  Belum ada invoice.
                </div>
              ) : (
                orders.map((order) => {
                  const status = resolveInvoiceStatus(order);

                  return (
                    <div
                      key={order.ID}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <ReceiptText className="h-4 w-4 text-slate-400" />
                            <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                              {formatPlanLabel(order.Plan)} • {String(order.BillingInterval).toUpperCase()}
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(order.CreatedAt)} • {order.OrderID}
                          </div>
                          {status.note ? (
                            <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                              {status.note}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3 md:justify-end">
                          <div className="text-sm font-semibold text-slate-950 dark:text-white">
                            Rp {formatIDR(order.Amount)}
                          </div>
                          <span
                            className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${toneClassName[status.tone]}`}
                          >
                            {status.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl bg-slate-100 dark:bg-white/5" />
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-16 rounded-lg bg-slate-100 dark:bg-white/5" />
          <Skeleton className="h-16 rounded-lg bg-slate-100 dark:bg-white/5" />
          <Skeleton className="h-16 rounded-lg bg-slate-100 dark:bg-white/5" />
        </div>
      </div>
      <Skeleton className="h-64 rounded-xl bg-slate-100 dark:bg-white/5" />
      <Skeleton className="h-72 rounded-xl bg-slate-100 dark:bg-white/5" />
    </div>
  );
}
