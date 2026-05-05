"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DashboardMetricCard,
  DashboardPanel,
} from "@/components/dashboard/analytics-kit";
import api from "@/lib/api";
import { ArrowLeft, Check, Sparkles, Wand2, ShieldCheck } from "lucide-react";

const PLANS = [
  {
    key: "starter" as const,
    name: "Starter",
    description: "Untuk tenant yang baru jalan dan mau coba alur operasional dulu.",
    priceMonthly: 149000,
    priceAnnualPerMonth: 119000,
    features: ["Free trial 30 hari", "Dashboard operasional inti", "Booking & CRM dasar", "Batasan fitur Pro"],
    accent: "from-slate-950 to-slate-700",
    highlight: false,
  },
  {
    key: "pro" as const,
    name: "Pro",
    description: "Untuk owner yang butuh kontrol penuh, report detail, dan operasional yang lebih dalam.",
    priceMonthly: 299000,
    priceAnnualPerMonth: 239000,
    features: ["Unlimited pelanggan", "Blast WhatsApp", "Analytics lengkap", "Report F&B/add-on", "Akses staff & role", "Prioritas support"],
    accent: "from-blue-600 to-cyan-400",
    highlight: true,
  },
] as const;

type SnapWindow = Window & {
  snap?: {
    pay: (token: string, options?: Record<string, unknown>) => void;
  };
  __midtransSnapPromise?: Promise<SnapWindow["snap"] | null>;
};

type SubscriptionInfo = {
  plan?: string;
  status?: string;
};

export default function SettingsBillingSubscribePage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [checkingMidtrans, setCheckingMidtrans] = useState(false);
  const [midtransReady, setMidtransReady] = useState(false);

  useEffect(() => {
    api.get("/billing/subscription").then((res) => {
        const info = res.data as SubscriptionInfo;
        setCurrentPlan((info?.plan || "").toLowerCase() || null);
        setCurrentStatus((info?.status || "").toLowerCase() || null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMidtransReady(Boolean(typeof window !== "undefined" && (window as SnapWindow).snap));
  }, []);

  const activeLabel = useMemo(() => currentPlan?.toUpperCase() || "BELUM AKTIF", [currentPlan]);
  const statusLabel = useMemo(() => currentStatus?.toUpperCase() || "UNKNOWN", [currentStatus]);

  const loadMidtransSnap = async () => {
    if (typeof window === "undefined") return null;

    const snapWindow = window as SnapWindow;
    if (snapWindow.snap) {
      return snapWindow.snap;
    }

    if (snapWindow.__midtransSnapPromise) {
      return snapWindow.__midtransSnapPromise;
    }

    snapWindow.__midtransSnapPromise = new Promise((resolve) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-midtrans-snap="bookinaja"]');

      const finish = () => {
        const resolvedSnap = (window as SnapWindow).snap || null;
        resolve(resolvedSnap);
      };

      if (existingScript) {
        existingScript.addEventListener("load", finish, { once: true });
        existingScript.addEventListener(
          "error",
          () => {
            resolve(null);
          },
          { once: true },
        );
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
      return existingSnap;
    }

    setCheckingMidtrans(true);
    try {
      const started = Date.now();
      while (Date.now() - started < 3000) {
        const currentSnap = (window as SnapWindow).snap;
        if (currentSnap) {
          return currentSnap;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 200));
      }

      const loadedSnap = await loadMidtransSnap();
      if (loadedSnap) {
        return loadedSnap;
      }

      toast.error("Midtrans belum siap. Coba refresh halaman atau cek ad blocker.");
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
        <Button variant="ghost" onClick={() => router.push("/admin/settings/billing")} className="rounded-2xl">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Kembali
        </Button>
        <Badge className="border-none bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-200)]">
          Checkout Paket
        </Badge>
      </div>

      {!midtransReady && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Midtrans Snap belum siap. Tombol checkout tetap bisa dipakai setelah script selesai termuat.
        </div>
      )}

      <div className="relative overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(238,252,249,0.95)_40%,rgba(236,253,245,0.92))] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(10,24,26,0.96),rgba(8,30,31,0.94)_45%,rgba(4,47,46,0.88))] dark:shadow-[0_18px_42px_rgba(0,0,0,0.24)] sm:rounded-[2rem] sm:p-8 sm:shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:sm:shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(129,216,208,0.2),transparent_58%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(129,216,208,0.16),transparent_58%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-none bg-slate-950 text-white">{activeLabel}</Badge>
              <Badge className="border-none bg-emerald-500/10 text-emerald-600">{statusLabel}</Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              Upgrade Paket
            </h1>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
            <button
              onClick={() => setIsAnnual(false)}
              className={`rounded-xl px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] ${!isAnnual ? "bg-white text-[var(--bookinaja-700)] shadow dark:bg-slate-900 dark:text-[var(--bookinaja-200)]" : "text-slate-400"}`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`rounded-xl px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] ${isAnnual ? "bg-white text-[var(--bookinaja-700)] shadow dark:bg-slate-900 dark:text-[var(--bookinaja-200)]" : "text-slate-400"}`}
            >
              Tahunan
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          label="Plan Aktif"
          value={activeLabel}
          hint="Aktif"
          icon={Sparkles}
          tone="indigo"
        />
        <DashboardMetricCard
          label="Status"
          value={statusLabel}
          hint="Langganan"
          icon={ShieldCheck}
          tone="emerald"
        />
        <DashboardMetricCard
          label="Billing Mode"
          value={isAnnual ? "Tahunan" : "Bulanan"}
          hint="Harga"
          icon={Wand2}
          tone="amber"
        />
        <DashboardMetricCard
          label="Midtrans"
          value={midtransReady ? "Siap" : "Memuat"}
          hint="Checkout"
          icon={Check}
          tone="slate"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {PLANS.map((plan) => {
          const price = isAnnual ? plan.priceAnnualPerMonth : plan.priceMonthly;
          const isCurrent = currentPlan === plan.key;
          return (
            <Card
              key={plan.key}
              className={`border-slate-200 bg-white p-5 shadow-sm dark:border-white/15 dark:bg-[#0f0f17] sm:p-7 ${plan.highlight ? "ring-1 ring-[color:rgba(59,130,246,0.2)]" : ""}`}
            >
              <div className={`rounded-3xl bg-gradient-to-r ${plan.accent} p-5 text-white`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Plan</div>
                    <h2 className="mt-2 text-2xl font-semibold">{plan.name}</h2>
                  </div>
                  {plan.highlight && (
                    <Badge className="border-none bg-white/15 text-white">Rekomendasi</Badge>
                  )}
                </div>
                <p className="mt-3 hidden max-w-md text-sm leading-relaxed text-white/80 md:block">{plan.description}</p>
              </div>

              <div className="mt-6 flex items-end gap-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">IDR</div>
                <div className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {new Intl.NumberFormat("id-ID").format(price)}
                </div>
                <div className="pb-1 text-sm text-slate-400">/bln</div>
              </div>

              <div className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-200)]">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => checkout(plan.key)}
                disabled={checkingMidtrans}
                variant={plan.highlight ? "default" : "outline"}
                className={`mt-6 h-12 w-full rounded-2xl ${plan.highlight ? "bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]" : ""}`}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {checkingMidtrans ? "Menyiapkan..." : isCurrent ? "Aktif" : `Pilih ${plan.name}`}
              </Button>
            </Card>
          );
        })}
      </div>

      <DashboardPanel
        eyebrow="Compare"
        title="Starter vs Pro"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <MiniCompare title="Starter" items={["Cocok untuk uji alur", "Report ringkas", "Batasan fitur lanjutan", "Masih aman dipakai trial"]} />
          <MiniCompare title="Pro" items={["Analytics penuh", "F&B dan add-on report", "Blast WhatsApp", "Akses staff dan role"]} />
        </div>
      </DashboardPanel>
    </div>
  );
}

function MiniCompare({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</div>
      <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
