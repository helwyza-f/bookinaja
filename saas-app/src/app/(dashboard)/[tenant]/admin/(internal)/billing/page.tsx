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

type BillingOrder = {
  id: string;
  tenant_id: string;
  order_id: string;
  plan: string;
  billing_interval: string;
  amount: number;
  currency: string;
  status: string;
  midtrans_transaction_id?: string | null;
  midtrans_payment_type?: string | null;
  created_at: string;
  updated_at: string;
};

function formatIDR(amount: number) {
  return new Intl.NumberFormat("id-ID").format(amount);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function normalizeInterval(value?: string | null) {
  const v = (value || "").toLowerCase();
  if (v === "annual" || v === "yearly" || v === "year") return "annual";
  return "monthly";
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const preselectedPlan = (searchParams.get("plan") || "").toLowerCase();
  const preselectedInterval = (searchParams.get("interval") || "").toLowerCase();

  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [orders, setOrders] = useState<BillingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [isAnnual, setIsAnnual] = useState(preselectedInterval === "annual");

  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  const isProd = (process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || "").toLowerCase() === "true";

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
      setOrders(ordersRes.data?.orders || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal memuat subscription.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      window.snap.pay(token, {
        onSuccess: () => {
          toast.success("Pembayaran sukses. Subscription diaktifkan.");
          setShowPlanSelector(false);
          refresh();
        },
        onPending: () => toast.message("Pembayaran pending. Cek status beberapa saat lagi."),
        onError: () => toast.error("Pembayaran gagal. Coba lagi."),
        onClose: () => toast.message("Checkout ditutup."),
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Checkout gagal.");
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

  const currentPeriodEnd = sub?.current_period_end || null;
  const shouldShowRenew = Boolean(isActive && currentPeriodEnd);
  const normalizedCurrentInterval = useMemo(() => {
    const last = orders.find((o) => o.status === "paid" || o.status === "pending") || orders[0];
    return normalizeInterval(last?.billing_interval);
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
              Lihat status paket aktif, periode, dan riwayat pembayaran. Upgrade atau perpanjang paket
              kapan saja lewat Midtrans Snap.
            </p>

            {!clientKey && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs font-bold text-amber-700">
                Konfigurasi belum lengkap: set <span className="font-black">NEXT_PUBLIC_MIDTRANS_CLIENT_KEY</span>.
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={refresh} disabled={loading || paying}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Current subscription */}
          <div className="rounded-3xl border border-border bg-background/40 p-6 md:p-7 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Badge
                className={cn(
                  "font-black uppercase",
                  loading ? "bg-slate-700" : isActive ? "bg-green-600" : "bg-slate-700",
                )}
              >
                {loading ? "loading" : sub?.status || "unknown"}
              </Badge>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                Current Plan:{" "}
                <span className="text-foreground">{(sub?.plan || "-").toUpperCase()}</span>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                  Period Start
                </div>
                <div className="mt-1 text-sm font-bold text-foreground">
                  {formatDateTime(sub?.current_period_start)}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card/50 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                  Period End
                </div>
                <div className="mt-1 text-sm font-bold text-foreground">
                  {formatDateTime(sub?.current_period_end)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
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
                <DialogContent className="max-w-5xl">
                  <DialogHeader>
                    <DialogTitle className="font-black">Pilih Paket</DialogTitle>
                    <DialogDescription className="font-semibold">
                      Pilih periode dan paket, lalu lanjut pembayaran via Midtrans Snap.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="text-sm font-black tracking-tight">Periode</div>
                      <div className="text-xs font-semibold text-muted-foreground">
                        Disarankan:{" "}
                        <span className="text-foreground font-black">
                          {suggested.plan.toUpperCase()} / {suggested.interval.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-muted-foreground">
                        Interval terakhir:{" "}
                        <span className="text-foreground font-black">
                          {normalizedCurrentInterval.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-1.5 bg-secondary/30 backdrop-blur-md rounded-2xl border border-border">
                      <button
                        onClick={() => setIsAnnual(false)}
                        className={cn(
                          "px-5 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-widest",
                          !isAnnual
                            ? "bg-background shadow-lg text-blue-600"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Bulanan
                      </button>
                      <button
                        onClick={() => setIsAnnual(true)}
                        className={cn(
                          "px-5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 uppercase tracking-widest",
                          isAnnual
                            ? "bg-background shadow-lg text-blue-600"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Tahunan
                        <Badge className="bg-green-500/10 text-green-700 border-none text-[10px] px-2 py-0 font-black">
                          Hemat 20%
                        </Badge>
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-6 md:grid-cols-2">
                    {plans.map((plan) => {
                      const price = isAnnual
                        ? plan.effectiveMonthlyAnnual
                        : plan.originalMonthly;
                      const isThisActive = isActive && activePlan === plan.key;

                      return (
                        <div
                          key={plan.key}
                          className={cn(
                            "relative flex flex-col rounded-[2.5rem] border p-7 md:p-8 transition-all duration-300",
                            plan.popular
                              ? "border-blue-500 bg-card shadow-2xl ring-4 ring-blue-500/5"
                              : "border-border/60 bg-card/40 backdrop-blur-sm hover:border-blue-500/30",
                          )}
                        >
                          {plan.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-blue-600 px-5 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
                              <Sparkles className="h-3.5 w-3.5 fill-white" />
                              Rekomendasi
                            </div>
                          )}

                          {isThisActive && (
                            <div className="absolute -top-4 right-6 rounded-full bg-green-600 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                              Aktif
                            </div>
                          )}

                          <div className="mb-6">
                            <h3 className="text-2xl font-black tracking-tight">
                              {plan.name}
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground font-semibold leading-relaxed">
                              {plan.desc}
                            </p>
                          </div>

                          <div className="mb-6">
                            <div className="text-xs font-black text-muted-foreground/50 line-through italic">
                              IDR {formatIDR(plan.originalMonthly)} / bln
                            </div>

                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-xs font-black text-muted-foreground uppercase">
                                IDR
                              </span>
                              <span className="text-4xl md:text-5xl font-black tracking-tighter">
                                {formatIDR(price)}
                              </span>
                              <span className="text-xs font-black text-muted-foreground">
                                /bln
                              </span>
                            </div>

                            {isAnnual && (
                              <div className="mt-2 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-500/5 px-3 py-1 rounded-full border border-blue-500/10 inline-flex">
                                Tagihan tahunan IDR {formatIDR(plan.annualTotal)}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 space-y-3 mb-7 border-t border-border pt-6">
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600">
                              Fitur Utama
                            </p>
                            <ul className="space-y-3">
                              {plan.features.map((f) => (
                                <li
                                  key={f}
                                  className="flex items-start gap-3 text-sm font-semibold text-muted-foreground"
                                >
                                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                                    <Check className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="leading-tight">{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <Button
                            className={cn(
                              "w-full h-14 text-base font-black rounded-2xl transition-all active:scale-95",
                              plan.popular
                                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-600/20"
                                : "bg-secondary text-foreground hover:bg-blue-600 hover:text-white",
                            )}
                            variant={plan.popular ? "default" : "secondary"}
                            disabled={paying || isThisActive}
                            onClick={() => checkout(plan.key, intervalValue)}
                          >
                            {isThisActive ? "Paket Aktif" : `Bayar ${intervalLabel}`}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>

              {shouldShowRenew && (
                <div className="text-xs font-semibold text-muted-foreground">
                  Berakhir:{" "}
                  <span className="text-foreground font-black">
                    {formatDateTime(currentPeriodEnd)}
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Midtrans Verified
              </div>
              <div className="text-xs font-semibold text-muted-foreground">
                Notifikasi pembayaran diproses oleh webhook dan diverifikasi signature key.
              </div>
            </div>
          </div>

          {/* History */}
          <div className="lg:col-span-2 rounded-3xl border border-border bg-background/40 p-6 md:p-7">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-blue-600" />
                  <div className="text-sm font-black tracking-tight">Riwayat Pembayaran</div>
                </div>
                <div className="text-xs font-semibold text-muted-foreground">
                  Menampilkan {orders.length} transaksi terbaru.
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {orders.length === 0 && !loading ? (
                <div className="rounded-2xl border border-dashed border-border p-6 text-sm font-semibold text-muted-foreground">
                  Belum ada transaksi billing.
                </div>
              ) : (
                orders.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-2xl border border-border bg-card/50 p-4 md:p-5"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={cn(
                              "font-black uppercase",
                              o.status === "paid"
                                ? "bg-green-600"
                                : o.status === "pending"
                                  ? "bg-amber-500 text-black"
                                  : "bg-slate-700",
                            )}
                          >
                            {o.status}
                          </Badge>
                          <div className="text-xs font-black uppercase tracking-[0.25em] text-muted-foreground">
                            {o.plan} • {o.billing_interval}
                          </div>
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground">
                          Order ID:{" "}
                          <span className="font-black text-foreground">{o.order_id}</span>
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground">
                          Dibuat:{" "}
                          <span className="font-black text-foreground">
                            {formatDateTime(o.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="text-lg font-black text-foreground">
                          IDR {formatIDR(o.amount)}
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground">
                          {o.midtrans_payment_type ? `Metode: ${o.midtrans_payment_type}` : ""}
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
