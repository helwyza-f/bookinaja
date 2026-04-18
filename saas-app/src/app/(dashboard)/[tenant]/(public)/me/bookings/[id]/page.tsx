"use client";

import { setCookie } from "cookies-next";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  CreditCard,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { format, differenceInSeconds, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { BookingLiveController } from "@/components/customer/booking-live-controller";

export default function CustomerBookingDetail() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(new Date());
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);

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

  const syncSession = async () => {
    try {
      await api.post(`/public/bookings/${params.id}/sync`);
      await fetchDetail();
    } catch {
      // ignore sync errors, UI still loads from booking detail
    }
  };

  const fetchMenuItems = async () => {
    try {
      const [menuRes, contextRes] = await Promise.all([
        api.get("/customer/fnb"),
        api.get(`/customer/bookings/${params.id}/context`),
      ]);
      setMenuItems(menuRes.data || []);
      if (contextRes.data?.booking) {
        setBooking((prev: any) => ({ ...(prev || {}), ...contextRes.data.booking }));
      }
    } catch {
      setMenuItems([]);
    }
  };

  useEffect(() => {
    if (!params.id) return;
    const token = searchParams.get("token");
    if (token) {
      setCookie("customer_auth", token, {
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      const cleanUrl = `${window.location.pathname}${window.location.hash}`;
      router.replace(cleanUrl);
      return;
    }
    fetchDetail();
    fetchMenuItems();
    const interval = setInterval(fetchDetail, 30000);
    const syncInterval = setInterval(syncSession, 60000);
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(syncInterval);
      clearInterval(clock);
    };
  }, [params.id, searchParams]);

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

  const handlePayDeposit = async () => {
    try {
      const res = await api.post(`/public/bookings/${params.id}/checkout`);
      const snap = (window as any).snap;
      if (!snap) {
        toast.error("Midtrans belum siap. Coba refresh halaman.");
        return;
      }
      snap.pay(res.data.snap_token, {
        onSuccess: () => {
          setPaymentNotice("DP sudah dibayar. Sistem sedang memperbarui status booking.");
          toast.success("DP berhasil dibayar");
          fetchDetail();
          setTimeout(fetchDetail, 4000);
        },
        onPending: () => {
          setPaymentNotice("Pembayaran DP masih menunggu konfirmasi Midtrans.");
          toast.message("Pembayaran DP tertunda");
          fetchDetail();
        },
        onError: () => {
          setPaymentNotice("Pembayaran DP gagal atau dibatalkan.");
          toast.error("Pembayaran DP gagal");
        },
        onClose: () => fetchDetail(),
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal membuka pembayaran DP");
    }
  };

  const handleAddFnb = async (cartItems: any[]) => {
    for (const item of cartItems) {
      await api.post(`/customer/bookings/${params.id}/orders`, {
        fnb_item_id: item.id,
        quantity: item.quantity,
      });
    }
    toast.success("Pesanan FnB ditambahkan");
    await fetchDetail();
  };

  const handleAddons = async (cartItems: any[]) => {
    for (const item of cartItems) {
      for (let i = 0; i < item.quantity; i++) {
        await api.post(`/customer/bookings/${params.id}/addons`, {
          item_id: item.id,
        });
      }
    }
    toast.success("Addon ditambahkan");
    await fetchDetail();
  };

  const handleExtend = async (count: number) => {
    await api.post(`/customer/bookings/${params.id}/extend`, {
      additional_duration: count,
    });
    toast.success("Session diperpanjang");
    await fetchDetail();
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

            <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">
                    Customer Live Controller
                  </p>
                  <p className="text-xs font-bold italic opacity-90">
                    Tombol aksi sekarang pindah ke panel mobile di bawah timer.
                  </p>
                </div>
                <Badge className="rounded-full bg-white text-slate-950 border-none px-3 py-1 text-[8px] uppercase font-black">
                  mobile first
                </Badge>
              </div>
            </div>
          </Card>
        )}

        {/* UNIFIED INFO CARD */}
        <Card className="rounded-[2rem] p-0 overflow-hidden border-none shadow-sm ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-[#0c0c0c]">
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between text-left leading-none gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <MapPin size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">
                    Booking Detail
                  </span>
                </div>
                <h3 className="text-2xl font-[1000] uppercase dark:text-white italic tracking-tighter line-clamp-2">
                  {booking.resource_name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 pt-2">
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

              <div className="rounded-2xl bg-blue-500/10 border border-blue-500/10 p-4 text-[10px] font-bold italic text-blue-700 dark:text-blue-100 leading-relaxed">
                {depositAmount > 0
                  ? `DP Rp ${depositAmount.toLocaleString()} sudah dibayar. Due saat ini Rp ${balanceDue.toLocaleString()}.`
                  : "Booking ini tidak memakai DP, jadi due akan dihitung saat sesi selesai."}
              </div>

              {paymentNotice && (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/15 p-4 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 italic">
                  {paymentNotice}
                </div>
              )}

              {paymentStatus === "pending" && depositAmount > 0 && (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-orange-500/10 border border-orange-500/15 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 italic">
                      DP belum dibayar
                    </p>
                    <p className="mt-2 text-xs font-bold italic text-slate-700 dark:text-slate-200 leading-relaxed">
                      Klik tombol di bawah untuk membayar <span className="font-black text-blue-600">DP booking</span>.
                      Setelah DP masuk, sisa tagihan tetap bisa dilunasi setelah sesi selesai.
                    </p>
                  </div>
                  <Button
                    onClick={handlePayDeposit}
                    className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-[1000] uppercase italic tracking-widest text-sm shadow-lg gap-2"
                  >
                    <CreditCard size={16} />
                    Bayar DP Booking Sekarang
                  </Button>
                </div>
              )}
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

          <div className="p-5 bg-slate-950 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="leading-none text-left">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">
                    Rekap Akhir
                  </span>
                  <span className="text-3xl font-[1000] italic leading-none tracking-tighter">
                    Rp {balanceDue.toLocaleString()}
                  </span>
                </div>
                <Badge className={cn("rounded-full border-none px-4 py-1 font-black italic text-[9px] uppercase shadow-lg", paymentStateTone)}>
                  {paymentLabel}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-left">
                <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
                  <p className="text-[8px] uppercase tracking-widest text-slate-400 font-black italic">
                    Grand Total
                  </p>
                  <p className="mt-2 text-sm font-black italic">
                    Rp {Number(booking.grand_total || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
                  <p className="text-[8px] uppercase tracking-widest text-slate-400 font-black italic">
                    DP
                  </p>
                  <p className="mt-2 text-sm font-black italic text-emerald-300">
                    - Rp {depositAmount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
                  <p className="text-[8px] uppercase tracking-widest text-slate-400 font-black italic">
                    Due
                  </p>
                  <p className="mt-2 text-sm font-black italic text-blue-300">
                    Rp {balanceDue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* BOTTOM ACTIONS */}
        <div className="rounded-[2rem] bg-white dark:bg-[#0c0c0c] border dark:border-white/5 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic mb-1">
              Quick Actions
            </span>
            <p className="text-xs font-bold italic text-slate-700 dark:text-slate-200 leading-relaxed">
              PDF tetap tersedia dari halaman ini.
            </p>
          </div>
          <Button
            variant="outline"
            className="h-11 rounded-xl border-slate-200 dark:border-white/10 dark:text-white text-[10px] font-black uppercase italic gap-2 tracking-widest hover:bg-slate-100 transition-all"
            onClick={() => window.print()}
          >
            <Share2 size={16} /> PDF
          </Button>
        </div>
      </main>

      <BookingLiveController
        active={Boolean(countdownData)}
        booking={booking}
        menuItems={menuItems}
        addonItems={booking?.resource_addons || []}
        onExtend={handleExtend}
        onOrderFnb={handleAddFnb}
        onOrderAddon={handleAddons}
      />
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

