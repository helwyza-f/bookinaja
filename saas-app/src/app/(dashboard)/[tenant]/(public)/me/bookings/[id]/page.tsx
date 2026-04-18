"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  MapPin,
  Gamepad2,
  Zap,
  ReceiptText,
  CalendarDays,
  UtensilsCrossed,
  PlusCircle,
  MessageSquare,
  Copy,
  CheckCircle2,
  Share2,
  Timer,
  Coffee,
  ArrowUpRight,
  Clock,
  Wallet,
  BadgeCheck,
  Hourglass,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { format, differenceInSeconds, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";

export default function CustomerBookingDetail() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(new Date());

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/me/bookings/${params.id}`);
      setBooking(res.data);
    } catch (err) {
      if (isTenantAuthError(err)) {
        clearTenantSession({ keepTenantSlug: true });
        router.replace("/login");
        return;
      }
      toast.error("Gagal memuat tiket booking");
      router.replace("/me");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!params.id) return;
    fetchDetail();
    const interval = setInterval(fetchDetail, 30000);
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
  }, [params.id]);

  const isActiveStatus = useMemo(
    () => booking?.status === "active" || booking?.status === "ongoing",
    [booking],
  );

  const depositAmount = Number(booking?.deposit_amount || 0);
  const balanceDue = Number(booking?.balance_due || 0);
  const paidAmount = Number(booking?.paid_amount || 0);
  const paymentStatus = (booking?.payment_status || "").toLowerCase();
  const sessionStatus = (booking?.status || "").toLowerCase();
  const paymentLabel = useMemo(() => {
    if (paymentStatus === "settled") return "Lunas";
    if (paymentStatus === "partial_paid") return "DP Masuk";
    if (paymentStatus === "paid") return balanceDue > 0 ? "DP Masuk" : "Lunas";
    if (paymentStatus === "pending") return "Menunggu DP";
    if (paymentStatus === "expired") return "DP Kadaluarsa";
    if (paymentStatus === "failed") return "Gagal Bayar";
    return "Belum Dibayar";
  }, [paymentStatus, balanceDue]);
  const paymentStateTone =
    paymentStatus === "settled" || (paymentStatus === "paid" && balanceDue === 0)
      ? "bg-emerald-500 text-white"
      : paymentStatus === "partial_paid" || paymentStatus === "paid"
        ? "bg-blue-600 text-white"
        : paymentStatus === "expired" || paymentStatus === "failed"
          ? "bg-red-500 text-white"
          : "bg-orange-500 text-white";

  const countdownData = useMemo(() => {
    if (!booking) return null;
    const start = parseISO(booking.start_time);
    const end = parseISO(booking.end_time);

    if (
      isActiveStatus ||
      (now >= start &&
        now < end &&
        !["completed", "cancelled"].includes(booking.status))
    ) {
      const diff = differenceInSeconds(end, now);
      return {
        type: "LIVE",
        label: "Sisa Waktu Sesi",
        h: String(Math.max(0, Math.floor(diff / 3600))).padStart(2, "0"),
        m: String(Math.max(0, Math.floor((diff % 3600) / 60))).padStart(2, "0"),
        s: String(Math.max(0, diff % 60)).padStart(2, "0"),
        isCritical: diff < 300,
      };
    }

    if (
      now < start &&
      !["completed", "cancelled", "active", "ongoing"].includes(booking.status)
    ) {
      const diff = differenceInSeconds(start, now);
      return {
        type: "WAITING",
        label: "Sesi Dimulai Dalam",
        h: String(Math.floor(diff / 3600)).padStart(2, "0"),
        m: String(Math.floor((diff % 3600) / 60)).padStart(2, "0"),
        s: String(diff % 60).padStart(2, "0"),
      };
    }
    return null;
  }, [booking, now, isActiveStatus]);

  const copyMagicLink = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Tautan Berhasil Disalin", {
        description: "Simpan tautan ini untuk akses instan ke e-tiket Anda.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper untuk menentukan label unit (Jam vs Sesi)
  const getUnitLabel = (duration: number) => {
    if (duration === 60) return "Jam";
    return "Sesi";
  };

  if (loading) return <TicketSkeleton />;

  const isPending = sessionStatus === "pending";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] font-plus-jakarta pb-24 transition-colors overflow-x-hidden">
      <nav className="h-16 flex items-center justify-between px-4 sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b dark:border-white/5">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => router.push("/me")}
        >
          <ChevronLeft size={20} />
        </Button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 italic leading-none">
            E-Tiket Digital
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 leading-none">
            REF: {booking.id.slice(0, 8)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={copyMagicLink}
        >
          {copied ? (
            <CheckCircle2 size={18} className="text-emerald-500" />
          ) : (
            <Copy size={18} className="text-slate-400" />
          )}
        </Button>
      </nav>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* TIMER CONTROLLER */}
        {countdownData && (
          <Card
            className={cn(
              "border-none rounded-[2rem] overflow-hidden shadow-2xl p-6 text-white transition-all duration-500",
              countdownData.type === "LIVE" ? "bg-slate-950" : "bg-blue-600",
            )}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  {countdownData.label}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={cn(
                      "text-4xl font-[1000] italic tabular-nums tracking-tighter leading-none",
                      countdownData.type === "LIVE" &&
                        countdownData.isCritical &&
                        "text-red-500 animate-pulse",
                    )}
                  >
                    {countdownData.h}:{countdownData.m}:{countdownData.s}
                  </span>
                </div>
              </div>
              <Badge
                className={cn(
                  "text-[8px] font-black uppercase italic border-none px-3 py-1",
                  countdownData.type === "LIVE"
                    ? "bg-blue-600 animate-pulse"
                    : "bg-white text-blue-600 shadow-xl",
                )}
              >
                {countdownData.type === "LIVE"
                  ? "Sesi Berjalan"
                  : "Masa Tunggu"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                disabled={countdownData.type === "WAITING"}
                className={cn(
                  "h-12 rounded-xl font-black uppercase italic text-[10px] gap-2 transition-all shadow-lg",
                  countdownData.type === "LIVE"
                    ? "bg-white text-black hover:bg-slate-100"
                    : "bg-white/10 text-white/40",
                )}
              >
                <Timer
                  size={14}
                  className={
                    countdownData.type === "LIVE"
                      ? "text-blue-600"
                      : "text-white/20"
                  }
                />{" "}
                Tambah Jam
              </Button>
              <Button
                disabled={countdownData.type === "WAITING"}
                className={cn(
                  "h-12 rounded-xl font-black uppercase italic text-[10px] gap-2 transition-all shadow-lg",
                  countdownData.type === "LIVE"
                    ? "bg-white/10 text-white hover:bg-white/20"
                    : "bg-white/10 text-white/40",
                )}
              >
                <Coffee
                  size={14}
                  className={
                    countdownData.type === "LIVE"
                      ? "text-orange-400"
                      : "text-white/20"
                  }
                />{" "}
                Pesan Makan
              </Button>
            </div>
          </Card>
        )}

        {/* UNIFIED INFO CARD */}
        <Card className="rounded-[2rem] p-0 overflow-hidden border-none shadow-sm ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-[#0c0c0c]">
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between text-left leading-none">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <MapPin size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">
                    Detail Unit
                  </span>
                </div>
                <h3 className="text-2xl font-[1000] uppercase dark:text-white italic tracking-tighter">
                  {booking.resource_name}
                </h3>
                <div className="flex items-center gap-2 pt-2">
                  <Badge
                    className={cn(
                      "rounded-lg border-none font-black italic text-[9px] px-3 py-1 uppercase shadow-sm",
                      isPending
                        ? "bg-blue-600 text-white"
                        : sessionStatus === "completed"
                          ? "bg-slate-800 text-slate-400"
                          : "bg-emerald-600 text-white",
                    )}
                  >
                    sesi: {booking.status}
                  </Badge>
                  <Badge
                    className={cn(
                      "rounded-lg border-none font-black italic text-[9px] px-3 py-1 uppercase shadow-sm",
                      paymentStateTone,
                    )}
                  >
                    bayar: {paymentLabel}
                  </Badge>
                </div>
              </div>
              <div className="bg-emerald-500/10 px-4 py-2 rounded-2xl text-right border border-emerald-500/20">
                <span className="block text-[8px] font-black text-emerald-600 uppercase italic leading-none mb-1">
                  Poin Sultan
                </span>
                <span className="text-lg font-[1000] italic text-emerald-500">
                  +{Math.floor(booking.grand_total / 1000)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t dark:border-white/5">
              <div className="space-y-1 text-left leading-none">
                <div className="flex items-center gap-1.5 opacity-40 mb-1">
                  <CalendarDays size={12} />
                  <span className="text-[9px] font-black uppercase italic tracking-widest">
                    Tanggal
                  </span>
                </div>
                <p className="text-xs font-black dark:text-white uppercase italic">
                  {format(parseISO(booking.start_time), "dd MMMM yyyy", {
                    locale: idLocale,
                  })}
                </p>
              </div>
              <div className="space-y-1 border-l dark:border-white/5 pl-4 text-left leading-none">
                <div className="flex items-center gap-1.5 opacity-40 mb-1">
                  <Clock size={12} />
                  <span className="text-[9px] font-black uppercase italic tracking-widest">
                    Waktu Sesi
                  </span>
                </div>
                <p className="text-xs font-black dark:text-white uppercase italic">
                  {format(parseISO(booking.start_time), "HH:mm")} —{" "}
                  {format(parseISO(booking.end_time), "HH:mm")}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* RINCIAN PEMBAYARAN */}
        <Card className="rounded-[2rem] p-0 overflow-hidden border-none shadow-xl ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-[#0c0c0c]">
          <div className="p-5 border-b dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ReceiptText size={16} className="text-blue-600" />
              <span className="text-[10px] font-[1000] uppercase tracking-[0.2em] dark:text-white italic">
                Rincian Pembayaran
              </span>
            </div>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
              IDR Currency
            </span>
          </div>

          <div className="p-4 space-y-4">
            <div className="rounded-[1.5rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white dark:bg-black/40 border border-slate-100 dark:border-white/5 p-4">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic">
                    Total Booking
                  </p>
                  <p className="mt-2 text-xl font-[1000] italic text-slate-950 dark:text-white leading-none">
                    Rp {Number(booking.grand_total || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl bg-white dark:bg-black/40 border border-slate-100 dark:border-white/5 p-4">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic">
                    DP Dibayar
                  </p>
                  <p className="mt-2 text-xl font-[1000] italic text-emerald-600 leading-none">
                    Rp {depositAmount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl bg-white dark:bg-black/40 border border-slate-100 dark:border-white/5 p-4">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic">
                    Total Setelah DP
                  </p>
                  <p className="mt-2 text-xl font-[1000] italic text-blue-600 leading-none">
                    Rp {balanceDue.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-blue-600">
                <BadgeCheck size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest italic">
                  Alur Pembayaran
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white dark:bg-black/40 px-4 py-3 border border-slate-100 dark:border-white/5">
                  <p className="text-[8px] uppercase tracking-widest text-slate-400 font-black italic">
                    1. Awal
                  </p>
                  <p className="text-xs font-black italic text-slate-900 dark:text-white mt-1">
                    {depositAmount > 0 ? "Bayar DP via Midtrans" : "Tanpa DP"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white dark:bg-black/40 px-4 py-3 border border-slate-100 dark:border-white/5">
                  <p className="text-[8px] uppercase tracking-widest text-slate-400 font-black italic">
                    2. Saat Sesi
                  </p>
                  <p className="text-xs font-black italic text-slate-900 dark:text-white mt-1">
                    FnB / addon / extend menambah tagihan
                  </p>
                </div>
                <div className="rounded-2xl bg-white dark:bg-black/40 px-4 py-3 border border-slate-100 dark:border-white/5">
                  <p className="text-[8px] uppercase tracking-widest text-slate-400 font-black italic">
                    3. Akhir
                  </p>
                  <p className="text-xs font-black italic text-slate-900 dark:text-white mt-1">
                    {balanceDue > 0 ? "Lunasi sisa tagihan" : "Sudah lunas"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-blue-500/10 border border-blue-500/10 p-4 text-[10px] font-bold italic text-blue-700 dark:text-blue-100 leading-relaxed">
                {depositAmount > 0
                  ? `Customer sudah membayar DP Rp ${depositAmount.toLocaleString()} dari total booking. Sisa Rp ${balanceDue.toLocaleString()} akan diselesaikan setelah sesi selesai.`
                  : "Booking ini tidak memakai DP, jadi pembayaran diselesaikan saat sesi berakhir."}
              </div>
            </div>

            {booking.options?.map((opt: any) => (
              <div
                key={opt.id}
                className="flex justify-between items-start group"
              >
                <div className="flex items-start gap-3 text-left leading-none">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 mt-0.5">
                    {opt.item_type.includes("main") ? (
                      <Gamepad2 size={14} />
                    ) : (
                      <PlusCircle size={14} />
                    )}
                  </div>
                  <div>
                    <p className="font-black text-[11px] dark:text-white uppercase leading-none italic tracking-tight">
                      {opt.item_name}
                    </p>
                    <div className="flex flex-col gap-1 mt-2">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">
                          {opt.quantity}{" "}
                          {opt.item_type.includes("main")
                            ? getUnitLabel(booking.unit_duration)
                            : "Unit"}
                        </p>
                        <span className="text-[8px] text-slate-300">×</span>
                        <p className="text-[9px] font-bold text-blue-600/70">
                          Rp {opt.unit_price?.toLocaleString()}
                        </p>
                      </div>
                      {opt.item_type.includes("main") &&
                        booking.unit_duration !== 60 && (
                          <span className="text-[7px] font-bold text-slate-400/60 uppercase italic tracking-widest leading-none">
                            * 1 {getUnitLabel(booking.unit_duration)} ={" "}
                            {booking.unit_duration} Menit
                          </span>
                        )}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-[1000] dark:text-white italic pt-1">
                  Rp {opt.price_at_booking.toLocaleString()}
                </span>
              </div>
            ))}

            {booking.orders?.map((order: any) => (
              <div
                key={order.id}
                className="flex justify-between items-start p-3 rounded-xl bg-orange-50/20 dark:bg-orange-500/[0.03] border border-orange-500/10"
              >
                <div className="flex items-start gap-3 text-left leading-none">
                  <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 mt-0.5">
                    <UtensilsCrossed size={14} />
                  </div>
                  <div>
                    <p className="font-black text-[11px] dark:text-white uppercase leading-none italic tracking-tight">
                      {order.item_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <p className="text-[9px] font-bold text-orange-600/60 uppercase">
                        {order.quantity} Porsi
                      </p>
                      <span className="text-[8px] text-orange-300">×</span>
                      <p className="text-[9px] font-bold text-orange-600/60">
                        Rp {order.price_at_purchase?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-[1000] text-orange-600 italic pt-1">
                  Rp {order.subtotal.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="p-6 bg-slate-950 text-white flex justify-between items-center relative overflow-hidden">
            <Zap className="absolute right-0 bottom-0 size-24 opacity-5 -rotate-12 translate-x-4 translate-y-4" />
            <div className="leading-none text-left z-10">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">
                Total Setelah DP
              </span>
              <span className="text-3xl font-[1000] italic leading-none tracking-tighter">
                Rp {balanceDue.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col items-end gap-2 z-10">
              <Badge className={cn("rounded-full border-none px-4 py-1 font-black italic text-[9px] uppercase shadow-lg", paymentStateTone)}>
                {paymentLabel}
              </Badge>
              <p className="text-[8px] font-black text-slate-400 uppercase italic text-right">
                Paid Rp {paidAmount.toLocaleString()} • Due Rp {balanceDue.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        {/* BOTTOM ACTIONS */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 rounded-xl border-slate-200 dark:border-white/10 dark:text-white text-[10px] font-black uppercase italic gap-2 tracking-widest hover:bg-slate-100 transition-all"
          >
            <MessageSquare size={16} fill="currentColor" /> Bantuan
          </Button>
          <Button
            variant="outline"
            className="h-12 rounded-xl border-slate-200 dark:border-white/10 dark:text-white text-[10px] font-black uppercase italic gap-2 tracking-widest hover:bg-slate-100 transition-all"
            onClick={() => window.print()}
          >
            <Share2 size={16} /> Simpan PDF
          </Button>
        </div>

        <button
          onClick={() => router.push("/me")}
          className="w-full flex items-center justify-between p-5 bg-white dark:bg-[#0c0c0c] border dark:border-white/5 rounded-[2rem] group transition-all active:scale-[0.98] shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 group-hover:scale-110 transition-transform">
              <LayoutDashboard size={20} />
            </div>
            <div className="text-left leading-none">
              <span className="text-[10px] font-black uppercase dark:text-white italic tracking-widest block mb-1.5">
                Portal Sultan
              </span>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                Kelola Bokingan Lainnya
              </p>
            </div>
          </div>
          <ArrowUpRight
            size={18}
            className="text-slate-300 group-hover:text-blue-500 transition-all"
          />
        </button>
      </main>
    </div>
  );
}

function TicketSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] p-4 space-y-6">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-8 rounded-full bg-slate-200 dark:bg-white/5" />
          <Skeleton className="h-6 w-32 rounded-lg bg-slate-200 dark:bg-white/5" />
          <Skeleton className="h-8 w-8 rounded-full bg-slate-200 dark:bg-white/5" />
        </div>
        <Skeleton className="h-64 w-full rounded-[2rem] bg-slate-200 dark:bg-white/5" />
        <Skeleton className="h-64 w-full rounded-[2rem] bg-slate-200 dark:bg-white/5" />
        <Skeleton className="h-48 w-full rounded-[2rem] bg-slate-200 dark:bg-white/5" />
      </div>
    </div>
  );
}

function LayoutDashboard({
  className,
  size,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="15" rx="1" />
    </svg>
  );
}
