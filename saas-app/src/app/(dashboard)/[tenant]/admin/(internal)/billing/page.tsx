"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  CreditCard,
  Receipt,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        opts?: {
          onSuccess?: (result: any) => void;
          onPending?: (result: any) => void;
          onError?: (result: any) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

type SubscriptionInfo = {
  tenant_id: string;
  plan: string;
  status: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
};

// Sesuaikan dengan response GOLANG (PascalCase)
type BillingOrder = {
  ID: string;
  TenantID: string;
  OrderID: string;
  Plan: string;
  BillingInterval: string;
  Amount: number;
  Currency: string;
  Status: string;
  MidtransTransactionID?: string | null;
  MidtransPaymentType?: string | null;
  CreatedAt: string;
  UpdatedAt: string;
};

function formatIDR(amount: number) {
  if (!amount) return "0";
  return new Intl.NumberFormat("id-ID").format(amount);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizeInterval(value?: string | null) {
  const v = (value || "").toLowerCase();
  if (v === "annual" || v === "yearly" || v === "year") return "annual";
  return "monthly";
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const preselectedPlan = (searchParams.get("plan") || "").toLowerCase();
  const preselectedInterval = (
    searchParams.get("interval") || ""
  ).toLowerCase();

  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [orders, setOrders] = useState<BillingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [isAnnual, setIsAnnual] = useState(preselectedInterval === "annual");

  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  const isProd =
    (process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || "").toLowerCase() ===
    "true";

  const suggested = useMemo(() => {
    const plan =
      preselectedPlan === "pro" || preselectedPlan === "starter"
        ? preselectedPlan
        : "pro";
    const interval =
      preselectedInterval === "annual" || preselectedInterval === "monthly"
        ? preselectedInterval
        : "monthly";
    return { plan, interval };
  }, [preselectedInterval, preselectedPlan]);

  useEffect(() => {
    if (preselectedInterval === "annual") setIsAnnual(true);
    if (preselectedInterval === "monthly") setIsAnnual(false);
  }, [preselectedInterval]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [subRes, ordersRes] = await Promise.all([
        api.get("/billing/subscription"),
        api.get("/billing/orders", { params: { limit: 25 } }),
      ]);
      setSub(subRes.data);
      // Backend return { orders: [...] }
      setOrders(ordersRes.data?.orders || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal memuat subscription.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const checkout = async (
    plan: "starter" | "pro",
    interval: "monthly" | "annual",
  ) => {
    if (!clientKey) {
      toast.error("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY belum di-set.");
      return;
    }
    if (!window.snap?.pay) {
      toast.error("Midtrans Snap belum siap. Coba refresh halaman.");
      return;
    }

    setPaying(true);
    try {
      const res = await api.post("/billing/checkout", { plan, interval });
      const token = res.data?.snap_token as string;
      if (!token) throw new Error("Snap token kosong");

      setShowPlanSelector(false);
      await new Promise((resolve) => window.requestAnimationFrame(resolve));

      window.snap.pay(token, {
        onSuccess: () => {
          toast.success("Pembayaran sukses. Subscription diaktifkan.");
          refresh();
        },
        onPending: () =>
          toast.message("Pembayaran pending. Cek status beberapa saat lagi."),
        onError: () => toast.error("Pembayaran gagal. Coba lagi."),
        onClose: () => toast.message("Checkout ditutup."),
      });
    } catch (err: any) {
      toast.error(
        err.response?.data?.error || err.message || "Checkout gagal.",
      );
    } finally {
      setPaying(false);
    }
  };

  const activePlan = (sub?.plan || "").toLowerCase();
  const isActive = sub?.status === "active";

  const plans = [
    {
      key: "starter" as const,
      name: "Starter",
      originalMonthly: 150_000,
      effectiveMonthlyAnnual: 120_000,
      annualTotal: 1_440_000,
      desc: "Digitalisasi dasar untuk operasional bisnis persewaan tunggal.",
      features: [
        "1 Akun Utama (Owner Only)",
        "Akses Full Dashboard Admin",
        "Website Booking (Subdomain)",
        "Manajemen 1-5 Unit/Resource",
        "Laporan Pendapatan Bulanan",
        "Email & Chat Support",
      ],
      popular: false,
    },
    {
      key: "pro" as const,
      name: "Pro",
      originalMonthly: 300_000,
      effectiveMonthlyAnnual: 240_000,
      annualTotal: 2_880_000,
      desc: "Fitur lengkap untuk bisnis dengan tim dan trafik tinggi.",
      features: [
        "Akses Akun Staff/Karyawan",
        "Role-Based Access (Admin/Kasir)",
        "Unit & Resource Tanpa Batas",
        "Dashboard Status Live Real-time",
        "Sistem Harga Khusus Weekend",
        "Prioritas Support 24/7",
      ],
      popular: true,
    },
  ];

  const intervalLabel = isAnnual ? "Tahunan" : "Bulanan";
  const intervalValue = isAnnual ? ("annual" as const) : ("monthly" as const);

  const normalizedCurrentInterval = useMemo(() => {
    const last =
      orders.find((o) => o.Status === "paid" || o.Status === "pending") ||
      orders[0];
    return normalizeInterval(last?.BillingInterval);
  }, [orders]);

  return (
    <div className="space-y-10">
      {clientKey && (
        <Script
          src={
            isProd
              ? "https://app.midtrans.com/snap/snap.js"
              : "https://app.sandbox.midtrans.com/snap/snap.js"
          }
          data-client-key={clientKey}
          strategy="afterInteractive"
        />
      )}

      <div className="rounded-[2.5rem] border border-border bg-card/60 backdrop-blur-sm p-6 md:p-10">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <Zap className="h-5 w-5 fill-white" />
              </div>
              <Badge
                variant="outline"
                className="border-blue-500/20 bg-blue-500/5 text-blue-600 font-black uppercase tracking-widest text-[10px]"
              >
                Billing Center
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Billing & Subscription
            </h1>
            <p className="text-sm md:text-base font-semibold text-muted-foreground max-w-2xl">
              Lihat status paket aktif, periode, dan riwayat pembayaran. Upgrade
              atau perpanjang paket kapan saja.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={refresh}
            disabled={loading || paying}
          >
            Refresh
          </Button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Active Card */}
          <div className="rounded-3xl border border-border bg-background/40 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <Badge
                className={cn(
                  "font-black uppercase",
                  isActive ? "bg-green-600" : "bg-slate-700",
                )}
              >
                {loading ? "loading" : sub?.status || "inactive"}
              </Badge>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Plan:{" "}
                <span className="text-foreground">
                  {(sub?.plan || "-").toUpperCase()}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <div className="text-[10px] font-black uppercase text-muted-foreground">
                  Period Start
                </div>
                <div className="font-bold">
                  {formatDateTime(sub?.current_period_start)}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <div className="text-[10px] font-black uppercase text-muted-foreground">
                  Period End
                </div>
                <div className="font-bold text-blue-600">
                  {formatDateTime(sub?.current_period_end)}
                </div>
              </div>
            </div>

            <Dialog open={showPlanSelector} onOpenChange={setShowPlanSelector}>
              <DialogTrigger asChild>
                <Button
                  className="w-full h-12 font-black rounded-2xl"
                  disabled={paying || loading}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {isActive ? "Ubah / Upgrade Paket" : "Aktifkan Paket"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </DialogTrigger>
              {/* MODAL FULL SCREEN FIX */}
              <DialogContent className="max-w-[95vw] md:max-w-[1200px] w-full max-h-[90vh] overflow-y-auto rounded-[2rem]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">
                    Pilih Paket Berlangganan
                  </DialogTitle>
                  <DialogDescription className="font-semibold">
                    Upgrade ke Pro untuk fitur multi-user dan resource tanpa
                    batas.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-8 mt-4">
                  <div className="flex items-center justify-center p-1.5 bg-secondary/30 self-center rounded-2xl border border-border">
                    <button
                      onClick={() => setIsAnnual(false)}
                      className={cn(
                        "px-6 py-2 text-xs font-black rounded-xl transition-all",
                        !isAnnual
                          ? "bg-background shadow text-blue-600"
                          : "text-muted-foreground",
                      )}
                    >
                      BULANAN
                    </button>
                    <button
                      onClick={() => setIsAnnual(true)}
                      className={cn(
                        "px-6 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2",
                        isAnnual
                          ? "bg-background shadow text-blue-600"
                          : "text-muted-foreground",
                      )}
                    >
                      TAHUNAN{" "}
                      <Badge className="bg-green-500/10 text-green-700 text-[10px]">
                        HEMAT 20%
                      </Badge>
                    </button>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 pb-10">
                    {plans.map((plan) => {
                      const price = isAnnual
                        ? plan.effectiveMonthlyAnnual
                        : plan.originalMonthly;
                      const isThisActive = isActive && activePlan === plan.key;
                      return (
                        <div
                          key={plan.key}
                          className={cn(
                            "relative flex flex-col rounded-[2.5rem] border p-8 transition-all",
                            plan.popular
                              ? "border-blue-500 bg-card shadow-xl ring-4 ring-blue-500/5"
                              : "border-border/60 bg-card/40",
                          )}
                        >
                          {plan.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 px-5 py-1.5 text-[10px] font-black uppercase text-white rounded-full">
                              REKOMENDASI
                            </div>
                          )}
                          <h3 className="text-2xl font-black">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground font-semibold mt-2">
                            {plan.desc}
                          </p>
                          <div className="my-6">
                            <div className="text-4xl font-black tracking-tighter">
                              IDR {formatIDR(price)}
                              <span className="text-xs text-muted-foreground ml-1">
                                /bln
                              </span>
                            </div>
                            {isAnnual && (
                              <div className="text-[10px] font-black text-blue-600 mt-2 uppercase tracking-widest">
                                Tagihan Tahunan: IDR{" "}
                                {formatIDR(plan.annualTotal)}
                              </div>
                            )}
                          </div>
                          <ul className="flex-1 space-y-3 mb-8 pt-6 border-t border-border">
                            {plan.features.map((f) => (
                              <li
                                key={f}
                                className="flex items-center gap-3 text-sm font-semibold text-muted-foreground"
                              >
                                <Check className="h-4 w-4 text-blue-600" /> {f}
                              </li>
                            ))}
                          </ul>
                          <Button
                            className="w-full h-14 font-black rounded-2xl"
                            variant={plan.popular ? "default" : "secondary"}
                            disabled={paying || isThisActive}
                            onClick={() => checkout(plan.key, intervalValue)}
                          >
                            {isThisActive
                              ? "Paket Aktif"
                              : `Pilih ${plan.name}`}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* History Card - FIXED DATA MAPPING */}
          <div className="lg:col-span-2 rounded-3xl border border-border bg-background/40 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Receipt className="h-4 w-4 text-blue-600" />
              <div className="text-sm font-black uppercase tracking-widest">
                Riwayat Pembayaran
              </div>
            </div>

            <div className="space-y-3">
              {orders.length === 0 && !loading ? (
                <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground font-bold">
                  Belum ada transaksi.
                </div>
              ) : (
                orders.map((o) => (
                  <div
                    key={o.ID}
                    className="rounded-2xl border border-border bg-card/50 p-5 hover:bg-card/80 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              "font-black uppercase",
                              o.Status === "paid" || o.Status === "settlement"
                                ? "bg-green-600"
                                : "bg-amber-500",
                            )}
                          >
                            {o.Status}
                          </Badge>
                          <span className="text-xs font-black text-muted-foreground uppercase">
                            {o.Plan} • {o.BillingInterval}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground">
                          ID:{" "}
                          <span className="text-foreground">{o.OrderID}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatDateTime(o.CreatedAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black tracking-tight text-blue-600">
                          IDR {formatIDR(o.Amount)}
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          {o.MidtransPaymentType || "snap"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
