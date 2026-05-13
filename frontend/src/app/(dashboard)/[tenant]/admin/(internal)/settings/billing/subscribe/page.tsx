"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
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

type SnapWindow = Window & {
  snap?: {
    pay: (token: string, options?: Record<string, unknown>) => void;
  };
  __midtransSnapPromise?: Promise<SnapWindow["snap"] | null>;
};

type SubscriptionInfo = {
  plan?: string;
  status?: string;
  current_period_end?: string | null;
  plan_features?: string[];
};

export default function SettingsBillingSubscribePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlanParam = (searchParams.get("plan") || "").toLowerCase();
  const selectedIntervalParam = (searchParams.get("interval") || "").toLowerCase();
  const [selectedPlan, setSelectedPlan] = useState(selectedPlanParam === "pro" ? "pro" : "starter");
  const [isAnnual, setIsAnnual] = useState(selectedIntervalParam !== "monthly");
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [checkingMidtrans, setCheckingMidtrans] = useState(false);
  const [midtransReady, setMidtransReady] = useState(false);

  useEffect(() => {
    api.get("/billing/subscription")
      .then((res) => setSub(res.data || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMidtransReady(Boolean(typeof window !== "undefined" && (window as SnapWindow).snap));
  }, []);

  useEffect(() => {
    if (selectedIntervalParam === "monthly") {
      setIsAnnual(false);
      return;
    }
    if (selectedIntervalParam === "annual") {
      setIsAnnual(true);
    }
  }, [selectedIntervalParam]);

  const planState = resolvePlanState({
    plan: sub?.plan,
    subscription_status: sub?.status,
    current_period_end: sub?.current_period_end,
  });
  const annualDiscount = useMemo(() => {
    const starterPlan = getBillingPlan("starter");
    return starterPlan
      ? annualSavingsPercent(starterPlan.monthly, starterPlan.annualTotal)
      : 0;
  }, []);
  const selectedPlanLabel = selectedPlan === "pro" ? "Pro" : "Starter";

  const loadMidtransSnap = async () => {
    if (typeof window === "undefined") return null;

    const snapWindow = window as SnapWindow;
    if (snapWindow.snap) return snapWindow.snap;
    if (snapWindow.__midtransSnapPromise) return snapWindow.__midtransSnapPromise;

    snapWindow.__midtransSnapPromise = new Promise((resolve) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-midtrans-snap="bookinaja"]',
      );

      const finish = () => resolve((window as SnapWindow).snap || null);

      if (existingScript) {
        existingScript.addEventListener("load", finish, { once: true });
        existingScript.addEventListener("error", () => resolve(null), { once: true });
        window.setTimeout(finish, 1500);
        return;
      }

      const script = document.createElement("script");
      script.src =
        (process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || "").toLowerCase() === "true"
          ? "https://app.midtrans.com/snap/snap.js"
          : "https://app.sandbox.midtrans.com/snap/snap.js";
      script.setAttribute("data-client-key", process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "");
      script.setAttribute("data-midtrans-snap", "bookinaja");
      script.async = true;
      script.onload = finish;
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });

    return snapWindow.__midtransSnapPromise;
  };

  const waitForSnap = async () => {
    if (typeof window === "undefined") return null;
    const existingSnap = (window as SnapWindow).snap;
    if (existingSnap) return existingSnap;

    setCheckingMidtrans(true);
    try {
      const loadedSnap = await loadMidtransSnap();
      if (loadedSnap) return loadedSnap;
      toast.error("Checkout belum siap. Coba refresh sekali lagi.");
      return null;
    } finally {
      setCheckingMidtrans(false);
    }
  };

  const checkout = async () => {
    const snap = await waitForSnap();
    if (!snap) return;

    try {
      const res = await api.post("/billing/checkout", {
        plan: selectedPlan,
        interval: isAnnual ? "annual" : "monthly",
      });

      snap.pay(res.data.snap_token, {
        onSuccess: () => {
          toast.success("Pembayaran berhasil");
          router.push("/admin/settings/billing");
        },
        onPending: () => toast.message("Pembayaran tertunda"),
        onError: () => toast.error("Pembayaran gagal"),
      });
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : "Gagal checkout";
      toast.error(message);
    }
  };

  const chosenPlan = getBillingPlan(selectedPlan);
  const chosenMonthlyEquivalent = chosenPlan
    ? isAnnual
      ? annualMonthlyEquivalent(chosenPlan.annualTotal)
      : chosenPlan.monthly
    : 0;
  const chosenBillingLine = chosenPlan
    ? isAnnual
      ? `Ditagih ${formatIDR(chosenPlan.annualTotal)}/tahun`
      : `Ditagih ${formatIDR(chosenPlan.monthly)}/bulan`
    : "-";

  return (
    <div className="space-y-4 p-4 pb-20 sm:space-y-6 sm:p-6">
      <Script
        src={
          (process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || "").toLowerCase() === "true"
            ? "https://app.midtrans.com/snap/snap.js"
            : "https://app.sandbox.midtrans.com/snap/snap.js"
        }
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        data-midtrans-snap="bookinaja"
        strategy="afterInteractive"
        onLoad={() => setMidtransReady(Boolean((window as SnapWindow).snap))}
        onError={() => setMidtransReady(false)}
      />

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/settings/billing")}
          className="rounded-2xl"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Kembali
        </Button>
        <Badge className="border-none bg-blue-500/10 text-blue-600 dark:text-blue-300">
          Step 2: pilih plan
        </Badge>
      </div>

      {!midtransReady ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Checkout sedang disiapkan.
        </div>
      ) : null}

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/96 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0f1117]/96 sm:p-7">
        <div className="space-y-3">
          <Badge
            variant="outline"
            className="w-fit border-blue-500/15 bg-blue-500/5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600"
          >
            Langkah berikutnya
          </Badge>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            Pilih plan yang mau kamu jalankan
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {planState.isTrial
              ? "Trial dipakai untuk mencoba flow. Sekarang tinggal pilih plan yang paling pas agar tenant tetap jalan."
              : "Kamu bisa tetap di Starter atau naik ke Pro saat operasional mulai butuh tim dan kontrol lebih kuat."}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
            <button
              onClick={() => setIsAnnual(false)}
              className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] ${!isAnnual ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900" : "text-slate-400"}`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] ${isAnnual ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900" : "text-slate-400"}`}
            >
              Tahunan
            </button>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
            Hemat {annualDiscount}% saat tahunan
          </span>
          {selectedPlanParam ? (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
              Dari pricing: {selectedPlanParam.toUpperCase()}
            </span>
          ) : null}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          {BILLING_PLANS.filter((plan) => !plan.comingSoon && plan.key !== "scale").map((plan) => {
            const isSelected = selectedPlan === plan.key;
            const monthlyEquivalent = isAnnual
              ? annualMonthlyEquivalent(plan.annualTotal)
              : plan.monthly;

            return (
              <button
                key={plan.key}
                type="button"
                onClick={() => setSelectedPlan(plan.key)}
                className={`rounded-[1.75rem] border px-5 py-5 text-left transition-all ${isSelected ? "border-blue-500 bg-blue-50/70 shadow-sm dark:border-blue-400 dark:bg-blue-500/10" : "border-slate-200 bg-white dark:border-white/10 dark:bg-[#0f1117]/96"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                        {plan.name}
                      </span>
                      {plan.recommended ? (
                        <Badge className="border-none bg-blue-600 text-white">
                          Rekomendasi
                        </Badge>
                      ) : null}
                      {isSelected ? (
                        <Badge className="border-none bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                          Dipilih
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {plan.headline}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                      IDR
                    </div>
                    <div className="text-4xl font-black tracking-[-0.06em] text-slate-950 dark:text-white">
                      {formatIDR(monthlyEquivalent)}
                    </div>
                    <div className="text-sm text-slate-400">/bln</div>
                  </div>
                </div>

                <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  {isAnnual
                    ? `Ditagih ${formatIDR(plan.annualTotal)}/tahun`
                    : `Ditagih ${formatIDR(plan.monthly)}/bulan`}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {plan.adminFeatures.slice(0, 4).map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                    >
                      <Check className="h-4 w-4 text-blue-600" />
                      {feature}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <Card className="rounded-[1.75rem] border-slate-200/80 bg-white/96 p-5 shadow-sm dark:border-white/10 dark:bg-[#0f1117]/96 sm:p-6">
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Ringkasan checkout
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              {selectedPlanLabel}
            </h2>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              {chosenBillingLine}
            </p>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Kamu akan lanjut ke
            </div>
            <div className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950 dark:text-white">
              {formatIDR(chosenMonthlyEquivalent)}
            </div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              /bln {isAnnual ? "setara" : ""}
            </div>
          </div>

          <div className="mt-5 space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
            <div className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
              Plan aktif sekarang: {planState.title}
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
              Mode billing: {isAnnual ? "Tahunan" : "Bulanan"}
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
              Setelah klik lanjut, kamu masuk ke checkout Midtrans.
            </div>
          </div>

          <Button
            onClick={checkout}
            disabled={checkingMidtrans}
            className="mt-6 h-12 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            {checkingMidtrans ? "Menyiapkan checkout..." : "Lanjut ke checkout"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Card>
      </div>
    </div>
  );
}
