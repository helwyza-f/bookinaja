"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import api from "@/lib/api";
import { resolvePlanState } from "@/lib/plan-access";
import {
  annualMonthlyEquivalent,
  annualSavingsPercent,
  BILLING_PLANS,
  formatIDR,
  getBillingPlan,
} from "@/lib/pricing";

type SubscriptionInfo = {
  plan?: string;
  status?: string;
  current_period_end?: string | null;
  plan_features?: string[];
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return format(parsed, "dd MMM yyyy");
};

export default function SettingsBillingSubscribePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedIntervalParam = (searchParams.get("interval") || "").toLowerCase();
  const initialAnnual = selectedIntervalParam === "monthly" ? false : true;
  const [isAnnual, setIsAnnual] = useState(initialAnnual);
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    api
      .get("/billing/subscription")
      .then((res) => setSub(res.data || null))
      .catch(() => {});
  }, []);

  const planState = resolvePlanState({
    plan: sub?.plan,
    subscription_status: sub?.status,
    current_period_end: sub?.current_period_end,
  });

  const starterPlan = getBillingPlan("starter");
  const annualDiscount = starterPlan
    ? annualSavingsPercent(starterPlan.monthly, starterPlan.annualTotal)
    : 0;

  const activeUntil = formatDate(sub?.current_period_end);
  const selectablePlans = BILLING_PLANS.filter(
    (plan) => !plan.comingSoon && plan.key !== "trial" && plan.key !== "scale",
  );

  return (
    <div className="space-y-5 p-4 pb-20 sm:space-y-6 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/settings/billing")}
          className="rounded-lg"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Kembali
        </Button>
        <Badge className="border-none bg-blue-500/10 text-blue-600 dark:text-blue-300">
          Pilih langganan
        </Badge>
      </div>

      <section className="space-y-4">
        <div className="space-y-3">
          <Badge
            variant="outline"
            className="w-fit border-blue-500/15 bg-blue-500/5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600"
          >
            Pilih paket
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Pilih paket yang ingin kamu pakai
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Lihat perbedaan tiap paket, pilih yang paling pas untuk keadaan bisnis hari ini, lalu lanjut ke checkout setelah kamu yakin.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Status sekarang
            </div>
            <div className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
              {planState.title}
            </div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {planState.isTrial
                ? `Free Trial aktif sampai ${activeUntil}.`
                : `Plan aktif sampai ${activeUntil}.`}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Pilih periode
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white p-1 shadow-sm dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] ${!isAnnual ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-400"}`}
              >
                Bulanan
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] ${isAnnual ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-400"}`}
              >
                Tahunan
              </button>
            </div>
            {isAnnual ? (
              <div className="mt-2 text-sm text-emerald-600 dark:text-emerald-300">
                Hemat sampai {annualDiscount}% dibanding bayar bulanan.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="space-y-4">
        <Card className="rounded-xl border-blue-200/70 bg-blue-50/60 p-4 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10 sm:p-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
                Sebelum checkout
              </div>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {planState.isTrial
                  ? `Free Trial aktif sampai ${activeUntil}. Pilih paket yang ingin dipakai sebelum masa coba berakhir.`
                  : `Plan kamu aktif sampai ${activeUntil}. Pilih paket baru kalau memang sudah waktunya naik level.`}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="rounded-lg bg-white dark:bg-transparent">
                <Link href="/pricing" target="_blank">
                  Buka halaman pricing
                </Link>
              </Button>
              <Button asChild variant="ghost" className="rounded-lg justify-start px-0 text-slate-600 hover:bg-transparent hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
                <Link href="/admin/settings/billing">
                  Kembali ke billing
                </Link>
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          {selectablePlans.map((plan) => {
            const isCurrentPlan = planState.rawPlan === plan.key;
            const monthlyEquivalent = isAnnual
              ? annualMonthlyEquivalent(plan.annualTotal)
              : plan.monthly;
            const billingLine = isAnnual
              ? `Rp ${formatIDR(plan.annualTotal)}/tahun`
              : `Rp ${formatIDR(plan.monthly)}/bulan`;

            return (
              <Card
                key={plan.key}
                className={`flex h-full flex-col rounded-xl border p-5 shadow-sm sm:p-6 ${
                  plan.recommended
                    ? "border-blue-500/70 bg-blue-50/50 dark:border-blue-400/40 dark:bg-blue-500/10"
                    : "border-slate-200/80 bg-white/96 dark:border-white/10 dark:bg-[#0f1117]/96"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    {plan.name}
                  </span>
                  {plan.recommended ? (
                    <Badge className="border-none bg-blue-600 text-white">
                      Rekomendasi
                    </Badge>
                  ) : null}
                  {isCurrentPlan ? (
                    <Badge variant="outline" className="border-slate-300 text-slate-600">
                      Plan sekarang
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  {plan.label}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {plan.headline}
                </p>

                <div className="mt-5 rounded-lg border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Mulai dari
                  </div>
                  <div className="mt-1 text-4xl font-black tracking-[-0.06em] text-slate-950 dark:text-white">
                    {formatIDR(monthlyEquivalent)}
                    <span className="ml-1 text-lg font-semibold text-slate-400">/bulan</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {billingLine}
                  </div>
                </div>

                <div className="mt-5 grid flex-1 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Cocok kalau
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {plan.note}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Yang kamu dapat
                    </div>
                    <div className="mt-3 grid gap-2">
                      {plan.adminFeatures.slice(0, 4).map((feature) => (
                        <div
                          key={feature}
                          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
                        >
                          <Check className="h-4 w-4 text-blue-600" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button
                    asChild
                    className="rounded-lg bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                  >
                    <Link href={`/admin/settings/billing/subscribe/checkout?plan=${plan.key}&interval=${isAnnual ? "annual" : "monthly"}`}>
                      Lanjut dengan {plan.name}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-lg bg-white dark:bg-transparent">
                    <Link href={`/pricing/${plan.key}`} target="_blank">
                      Lihat detail
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
