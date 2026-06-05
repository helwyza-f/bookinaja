"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { resolvePlanState } from "@/lib/plan-access";
import {
  annualMonthlyEquivalent,
  annualSavingsPercent,
  BILLING_PLANS,
  formatIDR,
  getBillingPlan,
} from "@/lib/pricing";

export type BillingPlanBoardSubscription = {
  plan?: string;
  status?: string;
  current_period_end?: string | null;
  plan_features?: string[];
};

const PLAN_EMOJI: Record<string, string> = {
  trial: "🛹",
  starter: "🏍️",
  pro: "🏎️",
  scale: "🚚",
};

const PLAN_LABEL: Record<string, string> = {
  trial: "Trial",
  starter: "Starter",
  pro: "Pro",
  scale: "Scale",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

type BillingPlanBoardProps = {
  sub: BillingPlanBoardSubscription | null;
  showHeader?: boolean;
  backHref?: string;
  compact?: boolean;
};

export function BillingPlanBoard({
  sub,
  showHeader = false,
  backHref,
  compact = false,
}: BillingPlanBoardProps) {
  const [isAnnual, setIsAnnual] = useState(false);
  const planState = resolvePlanState({
    plan: sub?.plan,
    subscription_status: sub?.status,
    current_period_end: sub?.current_period_end,
  });
  const activeUntil = formatDate(sub?.current_period_end);
  const currentPlan = getBillingPlan(planState.rawPlan);
  const starterPlan = getBillingPlan("starter");
  const annualDiscount = starterPlan
    ? annualSavingsPercent(starterPlan.monthly, starterPlan.annualTotal)
    : 0;
  const selectablePlans = BILLING_PLANS.filter(
    (plan) => !plan.comingSoon && (plan.key === "starter" || plan.key === "pro"),
  );
  const enterprisePlan = getBillingPlan("scale");
  const currentFeatures = (currentPlan?.adminFeatures || []).slice(0, 6);
  const trialBadge = planState.isTrial
    ? `Trial (${activeUntil === "-" ? "aktif" : `sampai ${activeUntil}`})`
    : "Paket aktif";

  const boardClasses =
    "rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f1117]/96";

  return (
    <div className={cn("space-y-5", compact ? "pb-2" : "")}>
      {showHeader ? (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Pilih paket setelah flow terasa cocok
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Lanjutkan trial ke paket berbayar saat booking, admin, dan operasionalnya sudah terasa membantu.
            </p>
          </div>
          {backHref ? (
            <Button asChild variant="ghost" className="rounded-xl">
              <Link href={backHref}>Back</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      <Card className={cn(boardClasses, compact ? "rounded-2xl p-3 sm:p-5" : "p-5 sm:p-6")}>
        <div className={cn(compact ? "space-y-3 sm:space-y-5" : "space-y-5")}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-full items-center gap-1 rounded-2xl bg-slate-100 p-1 sm:w-fit dark:bg-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={cn(
                  "flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors sm:flex-none sm:px-5",
                  !isAnnual
                    ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white"
                    : "text-slate-500 dark:text-slate-400",
                )}
              >
                Bulanan
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={cn(
                  "flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors sm:flex-none sm:px-5",
                  isAnnual
                    ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white"
                    : "text-slate-500 dark:text-slate-400",
                )}
              >
                Tahunan
              </button>
              <span className="shrink-0 px-2 text-xs font-semibold text-emerald-600 sm:text-sm">
                Hemat {annualDiscount}%
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-none bg-orange-500/10 px-3 py-1 text-sm text-orange-700 dark:text-orange-300">
                {trialBadge}
              </Badge>
            </div>
          </div>

          <div className={cn("rounded-[1.5rem] border border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]", compact ? "p-3" : "p-5")}>
            <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,260px)_minmax(0,1fr)] lg:items-center">
              <div className={cn("flex items-center justify-center rounded-2xl bg-white text-[0px] shadow-sm dark:bg-slate-950", compact ? "h-14 sm:h-24" : "h-24")}>
                <span className={cn("font-semibold tracking-tight text-slate-500 dark:text-slate-300", compact ? "text-lg sm:text-2xl" : "text-2xl")}>
                  {PLAN_LABEL[planState.rawPlan] || "Trial"}
                </span>
                {PLAN_EMOJI[planState.rawPlan] || "🛹"}
              </div>
              <div>
                <div className={cn("font-semibold tracking-tight text-slate-950 dark:text-white", compact ? "text-xl sm:text-3xl" : "text-3xl")}>
                  {currentPlan?.name || planState.title}
                </div>
                <div className={cn("mt-2 font-black tracking-tight text-slate-950 dark:text-white", compact ? "text-3xl sm:text-4xl" : "text-4xl")}>
                  Rp {formatIDR(isAnnual ? annualMonthlyEquivalent(currentPlan?.annualTotal || 0) : currentPlan?.monthly || 0)}
                  <span className="ml-1 text-sm font-medium text-slate-400 sm:ml-2 sm:text-lg">/bulan</span>
                </div>
                <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {currentPlan?.headline || "Paket workspace aktif"}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {currentFeatures.length > 0 ? (
                  currentFeatures.slice(0, compact ? 4 : 6).map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{feature}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Fitur paket aktif akan muncul setelah subscription berjalan.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={cn("grid gap-4 xl:grid-cols-[repeat(2,minmax(0,1fr))]", compact && "gap-3")}>
            {selectablePlans.map((plan) => {
              const monthlyEquivalent = isAnnual
                ? annualMonthlyEquivalent(plan.annualTotal)
                : plan.monthly;
              const billingLine = isAnnual
                ? `Rp ${formatIDR(plan.annualTotal)} / tahun`
                : `Rp ${formatIDR(plan.monthly)} / bulan`;
              const active = plan.recommended;

              return (
                <div
                  key={plan.key}
                  className={cn(
                    "flex h-full flex-col rounded-[1.5rem] border bg-white shadow-sm dark:bg-[#0f1117]",
                    compact ? "p-4" : "p-5",
                    active
                      ? "border-orange-500 ring-1 ring-orange-500/40"
                      : "border-slate-200 dark:border-white/10",
                  )}
                >
                  <div className={cn("flex items-center justify-center rounded-2xl bg-slate-50 text-[0px] dark:bg-white/[0.03]", compact ? "h-16" : "h-28")}>
                    <span className={cn("font-semibold tracking-tight text-slate-500 dark:text-slate-300", compact ? "text-xl" : "text-2xl")}>
                      {PLAN_LABEL[plan.key] || plan.name}
                    </span>
                    {PLAN_EMOJI[plan.key]}
                  </div>

                  <div className={cn(compact ? "mt-4" : "mt-5")}>
                    <div className={cn("font-semibold tracking-tight text-slate-950 dark:text-white", compact ? "text-xl" : "text-2xl")}>
                      {plan.name}
                    </div>
                    <div className={cn("mt-2 font-black tracking-tight text-slate-950 dark:text-white", compact ? "text-3xl" : "text-4xl")}>
                      Rp {formatIDR(monthlyEquivalent)}
                      <span className="ml-1 text-sm font-medium text-slate-400 sm:ml-2 sm:text-lg">/bulan</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {billingLine}
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {plan.headline}
                    </p>
                  </div>

                  <div className={cn("space-y-3 text-sm text-slate-600 dark:text-slate-300", compact ? "mt-4" : "mt-5")}>
                    {plan.publicFeatures.map((feature) => (
                      <div key={feature} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className={cn(compact ? "mt-5" : "mt-6")}>
                    <Button
                      asChild
                      className="h-12 w-full rounded-xl bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
                    >
                      <Link
                        href={`/admin/settings/billing/subscribe/checkout?plan=${plan.key}&interval=${isAnnual ? "annual" : "monthly"}`}
                      >
                        Pilih {plan.name}
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {!compact ? (
          <div className="flex justify-center">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/[0.04]"
            >
              Lihat detail fitur
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          ) : null}

          {enterprisePlan && !compact ? (
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="grid gap-5 lg:grid-cols-[160px_minmax(0,220px)_minmax(0,1fr)_180px] lg:items-center">
                <div className="flex h-24 items-center justify-center rounded-2xl bg-white text-[0px] shadow-sm dark:bg-slate-950">
                  <span className="text-2xl font-semibold tracking-tight text-slate-500 dark:text-slate-300">
                    {PLAN_LABEL.scale}
                  </span>
                  {PLAN_EMOJI.scale}
                </div>
                <div>
                  <div className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                    Enterprise
                  </div>
                  <div className="mt-1 text-4xl font-black tracking-tight text-slate-950 dark:text-white">
                    Custom
                  </div>
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    For larger organizations
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {enterprisePlan.publicFeatures.slice(0, 4).map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="flex lg:justify-end">
                  <Button asChild variant="outline" className="rounded-xl bg-white dark:bg-transparent">
                    <Link href="/pricing/scale" target="_blank">
                      Konsultasi
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {!compact ? (
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="rounded-xl bg-white dark:bg-transparent">
                <Link href="/admin/settings/billing">Kelola billing</Link>
              </Button>
              {!showHeader ? (
                <Button asChild variant="ghost" className="rounded-xl text-slate-600 dark:text-slate-300">
                  <Link href="/pricing" target="_blank">
                    Bandingkan pricing publik
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
