"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowRight,
  CalendarClock,
  CreditCard,
  History,
  ReceiptText,
  Sparkles,
} from "lucide-react";
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
import { formatIDR } from "@/lib/pricing";

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

  const totalPaid = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.Amount || 0), 0),
    [orders],
  );

  const nextStepTitle = planState.isTrial
    ? "Pilih plan sebelum trial selesai"
    : planState.isStarter
      ? "Upgrade saat tim mulai jalan"
      : "Plan kamu sudah siap dipakai";

  const nextStepCopy = planState.isTrial
    ? "Trial dipakai untuk validasi flow. Kalau tenant sudah terasa cocok, lanjutkan ke Starter atau Pro."
    : planState.isStarter
      ? "Starter sudah cukup untuk mulai jalan. Pindah ke Pro saat kamu butuh staff account, analytics, dan kontrol lebih rapih."
      : "Fokus sekarang pindah ke operasional. Billing cukup dipantau saat masa aktif mendekati habis.";

  const primaryCtaLabel = planState.isPro ? "Kelola langganan" : planState.nextActionLabel;
  const periodEnd = formatDate(sub?.current_period_end);

  return (
    <div className="space-y-4 p-4 pb-20 sm:space-y-6 sm:p-6">
      {loading ? (
        <BillingSkeleton />
      ) : (
        <>
          <section className="space-y-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
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
                    {planState.short}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={loadData}
                  className="rounded-2xl"
                >
                  Refresh
                </Button>
                <Button asChild className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">
                  <Link href="/admin/settings/billing/subscribe">
                    {primaryCtaLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <CompactMetric label="Status" value={formatSubscriptionStatusLabel(sub?.status)} />
              <CompactMetric label="Plan" value={planState.title} />
              <CompactMetric label="Aktif sampai" value={periodEnd} />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-[1.75rem] border-slate-200/80 bg-white/96 p-5 shadow-sm dark:border-white/10 dark:bg-[#0f1117]/96 sm:p-6">
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Next step
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  {nextStepTitle}
                </h2>
                <p className="max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {nextStepCopy}
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <ActionStat
                  icon={<Sparkles className="h-4 w-4" />}
                  label="Plan sekarang"
                  value={planState.title}
                />
                <ActionStat
                  icon={<CalendarClock className="h-4 w-4" />}
                  label="Periode"
                  value={periodEnd}
                />
                <ActionStat
                  icon={<CreditCard className="h-4 w-4" />}
                  label="Total bayar"
                  value={`Rp ${formatIDR(totalPaid)}`}
                />
              </div>
            </Card>

            <Card className="rounded-[1.75rem] border-slate-200/80 bg-white/96 p-5 shadow-sm dark:border-white/10 dark:bg-[#0f1117]/96 sm:p-6">
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Yang kamu dapat
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  {planState.title}
                </h2>
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {planState.outcome}
                </p>
              </div>

              <div className="mt-5 space-y-2">
                {(planState.billingPlan?.adminFeatures || [
                  "Landing tenant",
                  "Dashboard inti",
                  "Booking flow",
                ]).slice(0, 4).map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    {feature}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card
            id="invoice-history"
            className="rounded-[1.75rem] border-slate-200/80 bg-white/96 p-5 shadow-sm dark:border-white/10 dark:bg-[#0f1117]/96 sm:p-6"
          >
            <div className="flex items-center gap-3">
              <History className="h-4 w-4 text-slate-400" />
              <div>
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                  Riwayat invoice
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Singkat dan mudah dicek saat dibutuhkan.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                  Belum ada invoice.
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.ID}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <ReceiptText className="h-4 w-4 text-slate-400" />
                        <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                          {formatPlanLabel(order.Plan)} • {String(order.BillingInterval).toUpperCase()}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {order.OrderID} • {formatDate(order.CreatedAt)}
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">
                        Rp {formatIDR(order.Amount)}
                      </div>
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
                        {order.Status}
                      </div>
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

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function ActionStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <div className="mt-3 text-base font-semibold text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-44 rounded-[1.75rem] bg-slate-100 dark:bg-white/5" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-[1.75rem] bg-slate-100 dark:bg-white/5" />
        <Skeleton className="h-64 rounded-[1.75rem] bg-slate-100 dark:bg-white/5" />
      </div>
      <Skeleton className="h-72 rounded-[1.75rem] bg-slate-100 dark:bg-white/5" />
    </div>
  );
}
