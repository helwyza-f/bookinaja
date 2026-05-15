"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import api from "@/lib/api";
import { formatPlanLabel, resolvePlanState } from "@/lib/plan-access";
import {
  annualMonthlyEquivalent,
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

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return format(parsed, "dd MMM yyyy");
};

export default function SettingsBillingCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlanParam = (searchParams.get("plan") || "").toLowerCase();
  const selectedIntervalParam = (searchParams.get("interval") || "").toLowerCase();
  const selectedPlan = selectedPlanParam === "pro" ? "pro" : "starter";
  const isAnnual = selectedIntervalParam !== "monthly";
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [checkingMidtrans, setCheckingMidtrans] = useState(false);
  const [midtransReady, setMidtransReady] = useState(false);

  useEffect(() => {
    api
      .get("/billing/subscription")
      .then((res) => setSub(res.data || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMidtransReady(Boolean(typeof window !== "undefined" && (window as SnapWindow).snap));
  }, []);

  const planState = resolvePlanState({
    plan: sub?.plan,
    subscription_status: sub?.status,
    current_period_end: sub?.current_period_end,
  });

  const selectedPlanDef = getBillingPlan(selectedPlan);
  const selectedPlanLabel = selectedPlanDef?.name || "Starter";
  const currentPlanKey = planState.rawPlan;
  const chosenMonthlyEquivalent = selectedPlanDef
    ? isAnnual
      ? annualMonthlyEquivalent(selectedPlanDef.annualTotal)
      : selectedPlanDef.monthly
    : 0;
  const chargeToday = selectedPlanDef
    ? isAnnual
      ? selectedPlanDef.annualTotal
      : selectedPlanDef.monthly
    : 0;
  const chosenBillingLine = selectedPlanDef
    ? isAnnual
      ? `Ditagih Rp ${formatIDR(selectedPlanDef.annualTotal)}/tahun`
      : `Ditagih Rp ${formatIDR(selectedPlanDef.monthly)}/bulan`
    : "-";

  const comparisonFeatures = useMemo(() => {
    const current = getBillingPlan(currentPlanKey)?.adminFeatures || [];
    const selected = selectedPlanDef?.adminFeatures || [];
    return selected.filter((feature) => !current.includes(feature));
  }, [currentPlanKey, selectedPlanDef]);

  const checkoutHighlights = planState.isTrial
    ? [
        "Langganan aktif mengikuti paket yang kamu pilih.",
        `Paket yang dipilih: ${selectedPlanLabel}.`,
        "Pembayaran diproses lewat checkout Midtrans.",
      ]
    : [
        `Plan sekarang: ${formatPlanLabel(currentPlanKey)}.`,
        `Kamu memilih upgrade ke ${selectedPlanLabel}.`,
        "Pembayaran diproses lewat checkout Midtrans.",
      ];

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

  return (
    <div className="space-y-5 p-4 pb-20 sm:space-y-6 sm:p-6">
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
          onClick={() => router.push("/admin/settings/billing/subscribe")}
          className="rounded-lg"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Kembali pilih paket
        </Button>
        <Badge className="border-none bg-blue-500/10 text-blue-600 dark:text-blue-300">
          Checkout
        </Badge>
      </div>

      {!midtransReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Checkout sedang disiapkan.
        </div>
      ) : null}

      <section className="space-y-3">
        <Badge
          variant="outline"
          className="w-fit border-blue-500/15 bg-blue-500/5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600"
        >
          Checkout paket
        </Badge>
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            Satu langkah lagi untuk aktif
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Kamu memilih {selectedPlanLabel}. Periksa tagihan dan ringkasan singkatnya di sini, lalu lanjutkan ke pembayaran saat sudah siap.
          </p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-xl border-slate-200/80 bg-white/96 p-5 shadow-sm dark:border-white/10 dark:bg-[#0f1117]/96 sm:p-6">
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

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Tagihan sekarang
                </div>
                <div className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                  Rp {formatIDR(chargeToday)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Setara
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                  Rp {formatIDR(chosenMonthlyEquivalent)}/bln
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SummaryCell label="Plan sekarang" value={formatPlanLabel(currentPlanKey)} />
              <SummaryCell label="Paket dipilih" value={selectedPlanLabel} />
              <SummaryCell label="Periode" value={isAnnual ? "Tahunan" : "Bulanan"} />
              <SummaryCell label="Aktif sampai" value={formatDate(sub?.current_period_end)} />
            </div>
          </div>

          <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
            {checkoutHighlights.map((line) => (
              <div key={line} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                {line}
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4 xl:sticky xl:top-6">
          <Card className="rounded-xl border-slate-200/80 bg-white/96 p-5 shadow-sm dark:border-white/10 dark:bg-[#0f1117]/96 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Yang kamu dapat
            </div>
            <div className="mt-3 grid gap-2">
              {(comparisonFeatures.length > 0
                ? comparisonFeatures
                : selectedPlanDef?.adminFeatures.slice(0, 3) || []
              ).slice(0, 4).map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
                >
                  <Check className="h-4 w-4 text-blue-600" />
                  {feature}
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-xl border-slate-200/80 bg-white/96 p-5 shadow-sm dark:border-white/10 dark:bg-[#0f1117]/96 sm:p-6">
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Lanjutkan pembayaran
              </div>
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                Kalau paket dan tagihannya sudah sesuai, lanjutkan ke Midtrans untuk menyelesaikan pembayaran.
              </p>
            </div>

            <Button
              onClick={checkout}
              disabled={checkingMidtrans}
              className="mt-5 h-12 w-full rounded-lg bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
            >
              {checkingMidtrans ? "Menyiapkan checkout..." : "Lanjut ke pembayaran"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              Pembayaran diproses lewat Midtrans Snap.
            </div>

            <div className="mt-4 grid gap-2">
              <Button asChild variant="outline" className="w-full rounded-lg bg-white dark:bg-transparent">
                <Link href={`/pricing/${selectedPlan}`} target="_blank">
                  Baca detail paket lagi
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.04] dark:hover:text-white">
                <Link href={`/admin/settings/billing/subscribe?interval=${isAnnual ? "annual" : "monthly"}`}>
                  Ganti pilihan paket
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}
