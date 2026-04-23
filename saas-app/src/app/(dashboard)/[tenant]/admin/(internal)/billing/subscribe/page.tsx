"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  Sparkles,
  Zap,
  Loader2,
  ArrowDown,
  Info,
  Crown,
  ShieldCheck,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    key: "starter" as const,
    name: "Starter",
    priceMonthlyNormal: 199000, // Harga coret bulanan
    priceMonthlyPromo: 149000, // Harga jual bulanan
    priceAnnualPerMonth: 119000, // Harga per bulan jika tahunan
    totalAnnual: 1428000,
    desc: "Cocok buat tenant baru yang fokus validasi pelanggan.",
    features: [
      "Free trial 30 hari",
      "Akses Full Dashboard Admin",
      "Website Booking (Subdomain)",
      "Sampai 10 pelanggan aktif",
      "Laporan Pendapatan Bulanan",
      "Email & Chat Support",
    ],
    popular: false,
  },
  {
    key: "pro" as const,
    name: "Pro",
    priceMonthlyNormal: 399000, // Harga coret bulanan
    priceMonthlyPromo: 299000, // Harga jual bulanan
    priceAnnualPerMonth: 239000, // Harga per bulan jika tahunan
    totalAnnual: 2868000,
    desc: "Untuk tenant yang butuh unlimited pelanggan dan blast WA.",
    features: [
      "Akses Akun Staff/Kasir",
      "Unlimited pelanggan",
      "Blast WhatsApp ke semua pelanggan",
      "Dashboard Live Real-time",
      "Sistem Harga Khusus (Weekend)",
      "Prioritas Support 24/7",
    ],
    popular: true,
  },
];

type SnapWindow = Window & {
  snap?: {
    pay: (token: string, options?: Record<string, unknown>) => void;
  };
};

export default function SubscribePage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(true);
  const [paying, setPaying] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);

  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  const isProd =
    (process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || "").toLowerCase() ===
    "true";

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/billing/subscription");
        setCurrentPlan((res.data?.plan || "").toLowerCase() || null);
        setCurrentStatus((res.data?.status || "").toLowerCase() || null);
      } catch {
        setCurrentPlan(null);
        setCurrentStatus(null);
      }
    })();
  }, []);

  const activePlanLabel = useMemo(() => {
    if (!currentPlan) return "Belum ada paket aktif";
    const statusLabel =
      currentStatus === "trial"
        ? "FREE TRIAL 30 HARI"
        : currentStatus
          ? currentStatus.toUpperCase()
          : "";
    return `${currentPlan.toUpperCase()}${statusLabel ? ` • ${statusLabel}` : ""}`;
  }, [currentPlan, currentStatus]);

  const handleCheckout = async (plan: string) => {
    const snap = (window as SnapWindow).snap;
    if (!snap) return toast.error("Midtrans belum siap. Coba refresh halaman.");

    setPaying(true);
    try {
      const res = await api.post("/billing/checkout", {
        plan,
        interval: isAnnual ? "annual" : "monthly",
      });

      snap.pay(res.data.snap_token, {
        onSuccess: () => {
          toast.success("Pembayaran Berhasil!");
          router.push("/admin/billing");
        },
        onPending: () => toast.message("Pembayaran Tertunda"),
        onError: () => toast.error("Pembayaran Gagal"),
        onClose: () => toast.info("Checkout dibatalkan"),
      });
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : "Gagal melakukan checkout.";
      toast.error(message);
    } finally {
      setPaying(false);
    }
  };

  const formatPrice = (val: number) =>
    new Intl.NumberFormat("id-ID").format(val);

  const getPlanRank = (plan: string) => {
    if (plan === "starter") return 1;
    if (plan === "pro") return 2;
    return 0;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20 px-4 animate-in fade-in duration-700">
      <Script
        src={
          isProd
            ? "https://app.midtrans.com/snap/snap.js"
            : "https://app.sandbox.midtrans.com/snap/snap.js"
        }
        data-client-key={clientKey}
        strategy="afterInteractive"
      />

      {/* Header */}
      <div className="flex flex-col items-center text-center space-y-3">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="self-start rounded-xl text-slate-500 hover:text-slate-900 transition-all"
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Kembali
        </Button>
        <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-1 rounded-full text-blue-600 font-black text-[9px] uppercase tracking-[0.2em] italic shadow-sm border border-blue-500/10">
          <Zap className="h-3 w-3 fill-current" /> Sultan Subscription
        </div>
        <h1 className="text-3xl md:text-5xl font-[1000] italic uppercase tracking-tighter dark:text-white leading-none">
          Investasi <span className="text-blue-600">Bisnis.</span>
        </h1>
        <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest max-w-lg">
          Pilih paket yang sesuai dengan skala operasional Anda.
        </p>
      </div>

      <div className="rounded-[2rem] border border-blue-500/15 bg-blue-500/5 p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600">
              Paket aktif saat ini
            </p>
            <p className="text-sm font-bold text-foreground">
              {activePlanLabel}
            </p>
              <p className="text-[11px] text-muted-foreground">
              Free trial akan otomatis aktif selama 30 hari setelah registrasi.
              </p>
            </div>
          </div>
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-600" />
          <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            Starter = 10 pelanggan, Pro = unlimited pelanggan
          </span>
        </div>
      </div>

      {/* Toggle Interval */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-center p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit shadow-inner ring-1 ring-black/5">
          <button
            onClick={() => setIsAnnual(false)}
            className={cn(
              "px-8 py-2.5 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest",
              !isAnnual
                ? "bg-white dark:bg-slate-900 shadow-xl text-blue-600"
                : "text-slate-400",
            )}
          >
            Bulanan
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={cn(
              "px-8 py-2.5 text-[10px] font-black rounded-xl transition-all flex items-center gap-2 uppercase tracking-widest",
              isAnnual
                ? "bg-white dark:bg-slate-900 shadow-xl text-blue-600"
                : "text-slate-400",
            )}
          >
            Tahunan{" "}
            <Badge className="bg-emerald-500 text-white text-[8px] border-none font-black px-1.5">
              -20%
            </Badge>
          </button>
        </div>
        <p className="text-[10px] font-black text-emerald-500 uppercase italic animate-bounce flex items-center gap-2">
          <ArrowDown size={12} />{" "}
          {isAnnual ? "Hemat Rp 720.000 / tahun" : "Promo Berlaku Bulan Ini"}
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:px-6">
        {PLANS.map((plan) => {
          // Logic Penentuan Harga
          const displayPrice = isAnnual
            ? plan.priceAnnualPerMonth
            : plan.priceMonthlyPromo;
          const strikePrice = isAnnual
            ? plan.priceMonthlyPromo
            : plan.priceMonthlyNormal;
          const savingsAmount = isAnnual
            ? (plan.priceMonthlyPromo - plan.priceAnnualPerMonth) * 12
            : plan.priceMonthlyNormal - plan.priceMonthlyPromo;
          const isCurrentPlan = currentPlan === plan.key;
          const isDowngrade = Boolean(
            currentPlan && getPlanRank(plan.key) < getPlanRank(currentPlan),
          );
          const isUpgrade = Boolean(
            currentPlan && getPlanRank(plan.key) > getPlanRank(currentPlan),
          );
          const actionLabel = isCurrentPlan
            ? "Paket Aktif"
            : isUpgrade
              ? `Upgrade ke ${plan.name}`
              : `Pilih ${plan.name}`;

          return (
            <div
              key={plan.key}
              className={cn(
                "relative flex flex-col rounded-[2.5rem] border p-8 md:p-10 transition-all duration-500",
                isCurrentPlan
                  ? "border-emerald-500 bg-emerald-500/5 shadow-2xl ring-1 ring-emerald-500/20 scale-[1.02] z-10"
                  : plan.popular
                    ? "border-blue-600 bg-white dark:bg-[#080808] shadow-2xl ring-1 ring-blue-600/20 scale-[1.02] z-10"
                    : "border-slate-200 dark:border-white/5 bg-white/50 dark:bg-white/[0.02]",
              )}
            >
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {isCurrentPlan ? (
                  <div className="bg-emerald-600 px-5 py-1.5 text-[9px] font-black uppercase italic text-white rounded-full flex items-center gap-2 shadow-lg tracking-widest leading-none border-b-2 border-emerald-800">
                    <Crown className="h-3 w-3 fill-white" /> Paket Aktif
                  </div>
                ) : plan.popular ? (
                  <div className="bg-blue-600 px-5 py-1.5 text-[9px] font-black uppercase italic text-white rounded-full flex items-center gap-2 shadow-lg tracking-widest leading-none border-b-2 border-blue-800">
                    <Sparkles className="h-3 w-3 fill-white" /> Rekomendasi
                  </div>
                ) : null}
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-[1000] uppercase italic tracking-tighter dark:text-white leading-none">
                  {plan.name}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">
                  {plan.desc}
                </p>
              </div>

              <div className="my-8 space-y-3">
                {/* Marketing: Harga Coret Dinamis */}
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-xs font-black text-slate-400 line-through italic">
                    IDR {formatPrice(strikePrice)}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[8px] font-[1000] text-emerald-500 border-emerald-500/30 uppercase italic"
                  >
                    {isCurrentPlan
                      ? "SEDANG DIPAKAI"
                      : isUpgrade
                        ? "UPGRADE"
                        : isAnnual
                          ? "HEMAT 20%"
                          : "DISKON KHUSUS"}
                  </Badge>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-black text-blue-600 italic leading-none">
                    IDR
                  </span>
                  <span className="text-5xl font-[1000] tracking-tighter italic dark:text-white leading-none">
                    {formatPrice(displayPrice)}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase italic">
                    / bln
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                  <p className="text-[9px] font-black text-emerald-600 uppercase italic tracking-tighter">
                    {isAnnual
                      ? `Total Billing Setahun: IDR ${formatPrice(plan.totalAnnual)}`
                      : "Tagihan Bulanan"}
                  </p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                    Keuntungan Anda:{" "}
                    <span className="text-emerald-500 font-black">
                      Hemat Rp {formatPrice(savingsAmount)}
                    </span>
                  </p>
                </div>
              </div>

              <ul className="flex-1 space-y-4 mb-10 pt-8 border-t border-slate-100 dark:border-white/5">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-none"
                  >
                    <Check className="h-3.5 w-3.5 text-blue-600 stroke-[4px] shrink-0" />{" "}
                    {f.toUpperCase()}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleCheckout(plan.key)}
                disabled={paying || isCurrentPlan || isDowngrade}
                className={cn(
                  "w-full h-14 font-black uppercase italic rounded-2xl text-xs shadow-xl transition-all active:scale-95 border-b-4",
                  isCurrentPlan
                    ? "bg-emerald-600 hover:bg-emerald-600 border-emerald-800 text-white cursor-default"
                    : plan.popular
                      ? "bg-blue-600 hover:bg-blue-500 border-blue-800 text-white"
                      : "bg-slate-900 hover:bg-black border-slate-700 text-white",
                )}
              >
                {paying ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Sedang
                    Memproses...
                  </div>
                ) : isCurrentPlan ? (
                  "Paket Ini Sedang Aktif"
                ) : isDowngrade ? (
                  "Downgrade Tidak Tersedia"
                ) : (
                  actionLabel
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[8px] font-black uppercase tracking-[0.4em] text-slate-400 italic opacity-40 leading-none">
        Enkripsi Keamanan Midtrans • Aman & Terpercaya
      </p>
    </div>
  );
}
