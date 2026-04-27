"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import api from "@/lib/api";
import { Check, ChevronLeft, Sparkles } from "lucide-react";

const PLANS = [
  {
    key: "starter" as const,
    name: "Starter",
    priceMonthly: 149000,
    priceAnnualPerMonth: 119000,
    features: ["Free trial 30 hari", "Sampai 10 pelanggan aktif", "Dashboard operasional", "Booking & CRM dasar"],
  },
  {
    key: "pro" as const,
    name: "Pro",
    priceMonthly: 299000,
    priceAnnualPerMonth: 239000,
    features: ["Unlimited pelanggan", "Blast WhatsApp", "Akses staff", "Prioritas support"],
  },
] as const;

type SnapWindow = Window & {
  snap?: {
    pay: (token: string, options?: Record<string, unknown>) => void;
  };
  __midtransSnapPromise?: Promise<SnapWindow["snap"] | null>;
};

export default function SettingsBillingSubscribePage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [midtransReady, setMidtransReady] = useState(false);
  const [checkingMidtrans, setCheckingMidtrans] = useState(false);

  useEffect(() => {
    api.get("/billing/subscription").then((res) => {
      setCurrentPlan((res.data?.plan || "").toLowerCase() || null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as SnapWindow).snap) {
      setMidtransReady(true);
    }
  }, []);

  const activeLabel = useMemo(() => currentPlan?.toUpperCase() || "Belum aktif", [currentPlan]);

  const loadMidtransSnap = async () => {
    if (typeof window === "undefined") return null;

    const snapWindow = window as SnapWindow;
    if (snapWindow.snap) {
      setMidtransReady(true);
      return snapWindow.snap;
    }

    if (snapWindow.__midtransSnapPromise) {
      return snapWindow.__midtransSnapPromise;
    }

    snapWindow.__midtransSnapPromise = new Promise((resolve) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-midtrans-snap="bookinaja"]',
      );

      const finish = () => {
        const resolvedSnap = (window as SnapWindow).snap || null;
        setMidtransReady(Boolean(resolvedSnap));
        resolve(resolvedSnap);
      };

      if (existingScript) {
        existingScript.addEventListener("load", finish, { once: true });
        existingScript.addEventListener("error", () => {
          setMidtransReady(false);
          resolve(null);
        }, { once: true });
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
      script.onerror = () => {
        setMidtransReady(false);
        resolve(null);
      };
      document.head.appendChild(script);
    });

    return snapWindow.__midtransSnapPromise;
  };

  const waitForSnap = async () => {
    if (typeof window === "undefined") return null;

    const existingSnap = (window as SnapWindow).snap;
    if (existingSnap) {
      setMidtransReady(true);
      return existingSnap;
    }

    setCheckingMidtrans(true);
    try {
      const started = Date.now();
      while (Date.now() - started < 3000) {
        const currentSnap = (window as SnapWindow).snap;
        if (currentSnap) {
          setMidtransReady(true);
          return currentSnap;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 200));
      }

      const loadedSnap = await loadMidtransSnap();
      if (loadedSnap) {
        setMidtransReady(true);
        return loadedSnap;
      }

      toast.error("Midtrans belum siap dibuka. Coba refresh halaman atau nonaktifkan ad blocker untuk domain ini.");
      return null;
    } finally {
      setCheckingMidtrans(false);
    }
  };

  const checkout = async (plan: string) => {
    const snap = await waitForSnap();
    if (!snap) return;

    try {
      const res = await api.post("/billing/checkout", {
        plan,
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
    <div className="space-y-6 pb-20">
      <Script
        src={(process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || "").toLowerCase() === "true"
          ? "https://app.midtrans.com/snap/snap.js"
          : "https://app.sandbox.midtrans.com/snap/snap.js"}
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
          <ChevronLeft className="mr-1 h-4 w-4" />
          Kembali
        </Button>
        <div className="rounded-full border border-blue-500/15 bg-blue-500/5 px-4 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-blue-600">
          Subscription Checkout
        </div>
      </div>

      <div className="rounded-[2.25rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-7 md:p-10 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600 text-white border-none font-black uppercase tracking-widest text-[9px]">
                {activeLabel}
              </Badge>
              <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black uppercase tracking-widest text-[9px]">
                Free trial 30 hari
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none dark:text-white">
              Upgrade Paket
            </h1>
            <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400 font-medium">
              Pilih paket berdasarkan impact yang tenant butuhkan: kontrol pelanggan, blast WA, dan operasional yang cepat.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-white/5 p-1">
            <button
              onClick={() => setIsAnnual(false)}
              className={`rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest ${!isAnnual ? "bg-white dark:bg-slate-900 text-blue-600 shadow" : "text-slate-400"}`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest ${isAnnual ? "bg-white dark:bg-slate-900 text-blue-600 shadow" : "text-slate-400"}`}
            >
              Tahunan
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {PLANS.map((plan) => {
          const price = isAnnual ? plan.priceAnnualPerMonth : plan.priceMonthly;
          return (
            <Card
              key={plan.key}
              className="rounded-[2rem] border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-7 md:p-8"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Plan
                  </div>
                  <h2 className="mt-2 text-3xl font-black italic uppercase tracking-tighter dark:text-white">
                    {plan.name}
                  </h2>
                </div>
                {plan.key === "pro" && (
                  <div className="rounded-full bg-blue-600 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white">
                    Rekomendasi
                  </div>
                )}
              </div>

              <div className="mt-8 flex items-end gap-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">IDR</div>
                <div className="text-5xl font-black tracking-tighter dark:text-white">
                  {new Intl.NumberFormat("id-ID").format(price)}
                </div>
                <div className="pb-1 text-sm font-bold text-slate-400">/bln</div>
              </div>

              <div className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => checkout(plan.key)}
                disabled={checkingMidtrans}
                className="mt-8 h-14 w-full rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase italic tracking-[0.2em] shadow-xl shadow-blue-600/20"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {checkingMidtrans
                  ? "Menyiapkan Midtrans..."
                  : midtransReady
                    ? `Pilih ${plan.name}`
                    : `Pilih ${plan.name}`}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
