"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Phone,
  Utensils,
  Package,
  Receipt,
  CreditCard,
  ShieldCheck,
  Layers,
  Zap,
  MoreVertical,
  Trash2,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BookingDetailSkeleton } from "@/components/dashboard/booking-detail-skeleton";

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [midtransReady, setMidtransReady] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/bookings/${params.id}`);
      setBooking(res.data);
    } catch (err) {
      toast.error("Gagal memuat detail reservasi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    window.addEventListener("focus", fetchDetail);
    return () => window.removeEventListener("focus", fetchDetail);
  }, [params.id]);

  useEffect(() => {
    if (window.snap) setMidtransReady(true);
  }, []);

  const groupedOptions = useMemo(() => {
    if (!booking?.options) return [];
    const groups = booking.options.reduce((acc: any, item: any) => {
      const key = `${String(item.item_name || "").trim().toLowerCase()}::${item.item_type || ""}`;
      if (!acc[key]) {
        acc[key] = {
          ...item,
          quantity: Number(item.quantity || 0),
          totalPrice: Number(item.price_at_booking || 0),
        };
      } else {
        acc[key].quantity += Number(item.quantity || 0);
        acc[key].totalPrice += Number(item.price_at_booking || 0);
      }
      return acc;
    }, {});

    return Object.values(groups).map((item: any) => ({
      ...item,
      displayUnitPrice:
        item.unit_price || item.totalPrice / Math.max(item.quantity || 1, 1),
    }));
  }, [booking?.options]);

  const groupedOrders = useMemo(() => {
    if (!booking?.orders) return [];
    const groups = booking.orders.reduce((acc: any, item: any) => {
      const key = String(item.item_name || "").trim().toLowerCase();
      if (!acc[key]) acc[key] = { ...item };
      else {
        acc[key].quantity += item.quantity;
        acc[key].subtotal += item.subtotal;
      }
      return acc;
    }, {});
    return Object.values(groups);
  }, [booking?.orders]);

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      await api.put(`/bookings/${params.id}/status`, { status: newStatus });
      toast.success(`STATUS UPDATED: ${newStatus.toUpperCase()}`);
      fetchDetail();
    } catch (err) {
      toast.error("Gagal memperbarui status");
    } finally {
      setUpdating(false);
    }
  };

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);
  const isPaymentSettled =
    booking?.payment_status === "settled" ||
    (booking?.payment_status === "paid" && Number(booking?.balance_due || 0) === 0);

  const waitForSnap = async () => {
    if (window.snap) return window.snap;
    const started = Date.now();
    while (Date.now() - started < 5000) {
      if (window.snap) return window.snap;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return null;
  };

  const handlePayment = async (mode: "settlement") => {
    try {
      const snap = await waitForSnap();
      if (!snap) {
        toast.error("Midtrans belum siap");
        return;
      }
      const res = await api.post(
        `/billing/bookings/checkout?mode=${mode}`,
        { booking_id: booking.id },
      );
      snap.pay(res.data.snap_token, {
        onSuccess: () => {
          toast.success("Pelunasan berhasil");
          fetchDetail();
        },
        onPending: () => toast.message("Pembayaran menunggu konfirmasi"),
        onError: () => toast.error("Pembayaran gagal"),
        onClose: () => fetchDetail(),
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal membuka pembayaran");
    }
  };

  const handleCashSettlement = async () => {
    try {
      await api.post(`/bookings/${params.id}/settle-cash`);
      toast.success("Pelunasan cash berhasil");
      setPayOpen(false);
      fetchDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal memproses cash settlement");
    }
  };

  if (loading) return <BookingDetailSkeleton />;

  if (!booking)
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <h1 className="text-xl font-black italic uppercase text-slate-400">
          Not Found
        </h1>
        <Button
          onClick={() => router.push("/admin/bookings")}
          className="rounded-xl h-12 px-6"
        >
          Back to List
        </Button>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-4 lg:p-6 space-y-4 md:space-y-6 animate-in fade-in duration-500 font-plus-jakarta pb-20 mt-3 md:mt-4">
      <Script
        src={
          (
            process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || ""
          ).toLowerCase() === "true"
            ? "https://app.midtrans.com/snap/snap.js"
            : "https://app.sandbox.midtrans.com/snap/snap.js"
        }
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
        onLoad={() => setMidtransReady(true)}
        onError={() => setMidtransReady(false)}
      />
      {/* 1. COMPACT HEADER AREA */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/bookings")}
            className="h-6 px-0 text-slate-400 hover:text-blue-600 font-black text-[8px] uppercase tracking-widest italic flex items-center gap-2 transition-all"
          >
            <ArrowLeft className="w-2.5 h-2.5 stroke-[4]" /> Back to List
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl md:text-4xl lg:text-5xl font-[1000] italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
              Billing <span className="text-blue-600">Details.</span>
            </h1>
            <Badge
              className={cn(
                "font-black italic text-[9px] uppercase px-3 py-1 rounded-lg border-none shadow-lg",
                booking.status === "active"
                  ? "bg-emerald-500 text-white"
                  : booking.status === "confirmed"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-500",
              )}
            >
              {booking.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full md:flex md:flex-wrap md:w-auto">
          {/* VIP ACTIONS */}
          {(booking.balance_due > 0 || booking.payment_status === "partial_paid") && (
            <div className="relative">
              <Button
                onClick={() => setPayOpen((prev) => !prev)}
                disabled={updating}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic text-[8px] h-11 px-3 sm:px-6 rounded-xl shadow-lg border-b-4 border-blue-800 gap-2 w-full sm:w-auto"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Process Payment
              </Button>

              {payOpen && (
                <div className="absolute right-0 mt-3 w-[92vw] sm:w-72 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 shadow-2xl p-3 z-50">
                  <div className="space-y-3">
                    <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic">
                        Ringkasan Pelunasan
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <p className="text-slate-400 uppercase font-black italic">Total</p>
                          <p className="text-slate-900 dark:text-white font-black">Rp{formatIDR(booking.grand_total || 0)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 uppercase font-black italic">Sisa</p>
                          <p className="text-blue-600 font-black">Rp{formatIDR(booking.balance_due || 0)}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setPayOpen(false);
                        handlePayment("settlement");
                      }}
                      disabled={!midtransReady}
                      className="w-full rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black uppercase italic text-[10px] h-11"
                    >
                      {midtransReady ? "Bayar via Midtrans" : "Menyiapkan Midtrans"}
                    </Button>
                    <Button
                      onClick={handleCashSettlement}
                      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase italic text-[10px] h-11"
                    >
                      Bayar Cash
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {(booking.status === "active" || booking.status === "ongoing") && (
            <Button
              onClick={() => router.push(`/admin/pos?active=${booking.id}`)}
              variant="outline"
            className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-600 font-black uppercase italic text-[8px] h-11 px-3 sm:px-5 rounded-xl shadow-sm hover:bg-blue-600 hover:text-white transition-all gap-2 w-full sm:w-auto"
            >
              <Zap className="w-3.5 h-3.5 fill-current" /> POS Hub
            </Button>
          )}

          {(booking.status === "pending" || booking.status === "confirmed") && (
            <Button
              onClick={() => handleUpdateStatus("active")}
              disabled={updating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase italic text-[8px] h-11 px-3 sm:px-6 rounded-xl shadow-lg border-b-4 border-emerald-800 w-full sm:w-auto"
            >
              Activate Session
            </Button>
          )}

          {booking.status === "pending" && (
            <Button
              onClick={() => handleUpdateStatus("confirmed")}
              disabled={updating}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic text-[8px] h-11 px-3 sm:px-6 rounded-xl shadow-lg border-b-4 border-blue-800 w-full sm:w-auto"
            >
              Confirm Booking
            </Button>
          )}

          {(booking.status === "active" || booking.status === "ongoing") && (
            <Button
              onClick={() => {
                if (!isPaymentSettled) {
                  toast.error("Checkout final hanya bisa dilakukan jika pembayaran sudah lunas");
                  return;
                }
                handleUpdateStatus("completed");
              }}
              disabled={updating || !isPaymentSettled}
            className="bg-slate-900 dark:bg-blue-600 text-white font-black uppercase italic text-[8px] h-11 px-3 sm:px-6 rounded-xl shadow-lg border-b-4 border-slate-700 dark:border-blue-800 w-full sm:w-auto"
            >
              {isPaymentSettled ? "Checkout Final" : "Belum Lunas"}
            </Button>
          )}

          {/* MORE ACTIONS */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-11 h-11 md:w-12 md:h-12 rounded-xl border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 p-0 shadow-sm hover:bg-slate-50 transition-all"
              >
                <MoreVertical className="w-4 h-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 rounded-2xl p-2 border-none shadow-2xl dark:bg-slate-900"
            >
              <DropdownMenuItem
                onClick={() => handleUpdateStatus("cancelled")}
                className="rounded-xl h-11 text-red-500 font-black uppercase italic text-[10px] gap-3 px-4"
              >
                <Trash2 size={14} /> Cancel Booking
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl h-11 text-slate-500 font-black uppercase italic text-[10px] gap-3 px-4">
                <AlertCircle size={14} /> Report Issue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 2. MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* LEFT COLUMN: CUSTOMER & SCHEDULE */}
        <div className="lg:col-span-7 space-y-5">
          <Card className="rounded-[1.75rem] md:rounded-[2.5rem] border-none shadow-sm p-4 md:p-8 bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-white/5 overflow-hidden relative">
            <div className="absolute -top-6 -right-6 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
              <User size={180} />
            </div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-5">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic leading-none">
                    Customer Profile
                  </p>
                  <h2 className="text-lg md:text-2xl lg:text-3xl font-[1000] italic text-slate-950 dark:text-white uppercase tracking-tighter truncate">
                    {booking.customer_name}
                  </h2>
                  <div className="flex items-center gap-2 text-slate-400 font-bold italic text-xs md:text-sm mt-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />{" "}
                    {booking.customer_phone}
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-50 dark:border-white/5 space-y-3">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none">
                    Resource Handshake
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-950 dark:bg-slate-800 flex items-center justify-center text-white shadow-lg">
                      <Package size={18} />
                    </div>
                    <div>
                      <p className="font-[1000] italic text-slate-950 dark:text-white uppercase text-sm md:text-base leading-none tracking-tight">
                        {booking.resource_name}
                      </p>
                      <span className="text-[7px] font-black text-blue-500 uppercase mt-1 block tracking-widest">
                        Handshake Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5 md:border-l md:border-slate-50 md:dark:border-white/5 md:pl-8">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest italic leading-none">
                    Timeline
                  </p>
                  <div className="flex items-center gap-2 text-sm md:text-base font-[1000] italic text-slate-900 dark:text-white uppercase tracking-tighter">
                    <Calendar className="w-4 h-4 text-slate-300" />
                    {format(new Date(booking.start_time), "dd MMMM yyyy", {
                      locale: localeID,
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-lg md:text-xl font-[1000] italic text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                    <Clock className="w-4 h-4 opacity-40" />
                    {format(new Date(booking.start_time), "HH:mm")} —{" "}
                    {format(new Date(booking.end_time), "HH:mm")}
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic">
                      Token Handle
                    </p>
                    <p className="text-[9px] font-mono font-bold text-slate-600 dark:text-slate-500 break-all uppercase tracking-tighter">
                      {booking.access_token.slice(0, 15)}...
                    </p>
                  </div>
                  <ShieldCheck className="w-6 h-6 text-blue-200 dark:text-blue-900/30" />
                </div>
              </div>
            </div>
          </Card>

          {/* RENTAL OPTIONS */}
          <Card className="rounded-[1.75rem] md:rounded-[2.5rem] border-none shadow-sm p-4 md:p-8 bg-white dark:bg-slate-900 space-y-5 md:space-y-6 ring-1 ring-slate-100 dark:ring-white/5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-[1000] italic uppercase tracking-widest text-slate-950 dark:text-white">
                  Rental Breakdown
                </h3>
              </div>
            </div>

            <div className="space-y-3.5">
              {groupedOptions.map((opt: any) => (
                <div
                  key={opt.id}
                  className="flex justify-between items-center group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black italic text-blue-600 text-[9px] shadow-inner">
                      {opt.item_type === "main_option" ? "PKG" : "ADD"}
                    </div>
                    <div>
                      <p className="font-black italic text-slate-900 dark:text-slate-100 uppercase text-[11px] md:text-sm leading-none tracking-tight">
                        {opt.item_name}
                      </p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase italic mt-1 leading-none">
                        @Rp{formatIDR(opt.displayUnitPrice)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black italic text-blue-600 text-[10px]">
                      x{opt.quantity}
                    </span>
                    <p className="font-[1000] italic text-slate-950 dark:text-white text-sm md:text-base leading-none">
                      Rp{formatIDR(opt.totalPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: F&B + TOTAL */}
        <div className="lg:col-span-5 space-y-5">
          {/* FnB SECTION */}
          <Card className="rounded-[1.75rem] md:rounded-[2.5rem] border-none shadow-sm p-4 md:p-8 bg-white dark:bg-slate-900 flex flex-col ring-1 ring-slate-100 dark:ring-white/5 min-h-[300px]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-[1000] italic uppercase tracking-widest text-slate-950 dark:text-white">
                  F&B Orders
                </h3>
              </div>
              {(booking.status === "active" ||
                booking.status === "ongoing") && (
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/admin/pos?active=${booking.id}`)}
                className="h-8 text-[8px] font-black uppercase italic bg-orange-50 dark:bg-orange-950/20 text-orange-600 rounded-lg px-3"
                >
                  Edit POS
                </Button>
              )}
            </div>

            <div className="flex-1 space-y-3.5">
              {groupedOrders.length > 0 ? (
                groupedOrders.map((order: any) => (
                  <div
                    key={order.fnb_item_id}
                    className="flex justify-between items-center group"
                  >
                    <div className="flex flex-col leading-none">
                      <span className="font-black text-slate-800 dark:text-slate-200 uppercase italic text-xs tracking-tight">
                        {order.item_name}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 italic mt-1 leading-none">
                        @Rp{formatIDR(order.price_at_purchase)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-blue-600 italic text-[10px]">
                        x{order.quantity}
                      </span>
                      <span className="font-black text-slate-950 dark:text-white italic text-base">
                        Rp{formatIDR(order.subtotal)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-10 py-6">
                  <Utensils size={48} className="mb-2" />
                  <p className="font-black italic uppercase text-[10px] tracking-widest">
                    No Food Orders
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-dashed border-slate-100 dark:border-white/5 flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-400 uppercase italic leading-none">
                F&B Subtotal
              </p>
              <p className="font-black text-slate-950 dark:text-white text-base italic leading-none">
                Rp{formatIDR(booking.total_fnb || 0)}
              </p>
            </div>
          </Card>

          {/* TOTAL BILL CARD - THE GRAND FINALE */}
          <Card className="rounded-[1.75rem] md:rounded-[3rem] border-none bg-slate-950 p-5 md:p-8 text-white space-y-5 relative overflow-hidden shadow-2xl">
            <Receipt
              size={160}
              className="absolute -right-12 -bottom-12 opacity-[0.03] rotate-12"
            />

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest italic text-slate-500">
                    Payment Snapshot
                  </p>
                  <p className="text-sm font-bold text-slate-300 italic">
                    Tombol aksi ada di kanan atas
                  </p>
                </div>
                <Badge className="rounded-full bg-blue-600 text-white border-none px-3 py-1 text-[8px] uppercase font-black">
                  {booking.payment_status || "pending"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
                <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
                  <p className="text-[8px] uppercase tracking-widest text-slate-400 font-black italic">
                    Total
                  </p>
                  <p className="mt-2 text-sm font-black italic">
                    Rp{formatIDR(booking.grand_total || 0)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
                  <p className="text-[8px] uppercase tracking-widest text-slate-400 font-black italic">
                    Dibayar
                  </p>
                  <p className="mt-2 text-sm font-black italic text-emerald-300">
                    Rp{formatIDR(booking.paid_amount || 0)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
                  <p className="text-[8px] uppercase tracking-widest text-slate-400 font-black italic">
                    Sisa
                  </p>
                  <p className="mt-2 text-sm font-black italic text-blue-300">
                    Rp{formatIDR(booking.balance_due || 0)}
                  </p>
                </div>
              </div>

              {!isPaymentSettled && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 md:p-4 text-[10px] font-bold italic text-amber-100 leading-relaxed">
                  Booking belum lunas. Silakan gunakan tombol Process Payment di
                  kanan atas untuk pelunasan via Midtrans atau cash.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
