"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Info,
  Layers,
  Ticket,
  Zap,
  MoreVertical,
  Trash2,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
// Import skeleton yang baru dibuat
import { BookingDetailSkeleton } from "@/components/dashboard/booking-detail-skeleton";

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

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
    // Refresh otomatis saat tab difokuskan kembali (berguna setelah admin balik dari tab POS)
    window.addEventListener("focus", fetchDetail);
    return () => window.removeEventListener("focus", fetchDetail);
  }, [params.id]);

  const groupedOptions = useMemo(() => {
    if (!booking?.options) return [];
    return booking.options.map((item: any) => ({
      ...item,
      displayUnitPrice:
        item.unit_price || item.price_at_booking / (item.quantity || 1),
      totalPrice: item.price_at_booking,
    }));
  }, [booking?.options]);

  const groupedOrders = useMemo(() => {
    if (!booking?.orders) return [];
    const groups = booking.orders.reduce((acc: any, item: any) => {
      const id = item.fnb_item_id;
      if (!acc[id]) acc[id] = { ...item };
      else {
        acc[id].quantity += item.quantity;
        acc[id].subtotal += item.subtotal;
      }
      return acc;
    }, {});
    return Object.values(groups);
  }, [booking?.orders]);

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      await api.put(`/bookings/${params.id}/status`, { status: newStatus });
      toast.success(`STATUS DIPERBARUI: ${newStatus.toUpperCase()}`);
      fetchDetail();
    } catch (err) {
      toast.error("Gagal memperbarui status");
    } finally {
      setUpdating(false);
    }
  };

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  // --- MENGGUNAKAN SKELETON SAAT LOADING ---
  if (loading) return <BookingDetailSkeleton />;

  if (!booking)
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 dark:bg-slate-950">
        <h1 className="text-2xl font-black italic uppercase text-slate-900 dark:text-white">
          Booking Tidak Ditemukan
        </h1>
        <Button
          onClick={() => router.push("/admin/bookings")}
          className="rounded-2xl h-14 px-8 font-black uppercase italic tracking-widest"
        >
          Kembali ke Daftar
        </Button>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-10 animate-in fade-in duration-700 font-plus-jakarta pb-24 text-slate-900 dark:text-slate-100">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/bookings")}
            className="h-8 px-0 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-black text-[10px] uppercase tracking-widest italic flex items-center gap-2"
          >
            <ArrowLeft className="w-3 h-3 stroke-[4]" /> KEMBALI KE LIST
          </Button>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-950 dark:text-white pr-2 leading-none">
              Billing <span className="text-blue-600">Details</span>
            </h1>
            <Badge
              className={cn(
                "font-black italic text-[11px] uppercase px-5 py-2 rounded-full border-none shadow-xl pr-2",
                booking.status === "active"
                  ? "bg-emerald-500 text-white animate-pulse"
                  : booking.status === "confirmed"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
              )}
            >
              {booking.status}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* DEEP LINK TO POS CONTROL HUB */}
          {(booking.status === "active" || booking.status === "ongoing") && (
            <Button
              onClick={() => router.push(`/admin/pos?active=${booking.id}`)}
              variant="outline"
              className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-black uppercase italic text-[10px] h-14 px-6 rounded-2xl shadow-sm hover:bg-blue-600 hover:text-white transition-all gap-2 pr-3"
            >
              <Zap className="w-4 h-4 fill-current" />
              Control Hub (POS)
            </Button>
          )}

          {/* STATUS UPDATE BUTTONS */}
          {booking.status === "pending" && (
            <Button
              onClick={() => handleUpdateStatus("confirmed")}
              disabled={updating}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic text-[10px] h-14 px-8 rounded-2xl shadow-xl transition-all"
            >
              Konfirmasi Reservasi
            </Button>
          )}
          {booking.status === "confirmed" && (
            <Button
              onClick={() => handleUpdateStatus("active")}
              disabled={updating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase italic text-[10px] h-14 px-8 rounded-2xl shadow-xl transition-all"
            >
              Mulai Sesi (Check-in)
            </Button>
          )}
          {(booking.status === "active" || booking.status === "ongoing") && (
            <Button
              onClick={() => handleUpdateStatus("completed")}
              disabled={updating}
              className="bg-slate-950 dark:bg-blue-600 dark:hover:bg-blue-700 hover:bg-black text-white font-black uppercase italic text-[10px] h-14 px-8 rounded-2xl shadow-xl transition-all"
            >
              Selesai & Checkout
            </Button>
          )}

          {/* TITIK TIGA: DROPDOWN MENU */}
          {booking.status !== "completed" && booking.status !== "cancelled" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-14 h-14 rounded-2xl border dark:border-white/5 bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 p-0 transition-all"
                >
                  <MoreVertical className="w-5 h-5 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-2xl p-2 border-none shadow-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-white/5 font-plus-jakarta"
              >
                <div className="px-3 py-2 mb-1">
                  <p className="text-[9px] font-black uppercase text-slate-400 italic tracking-widest">
                    More Actions
                  </p>
                </div>
                <DropdownMenuItem
                  onClick={() => handleUpdateStatus("cancelled")}
                  disabled={updating}
                  className="rounded-xl h-12 px-4 focus:bg-red-50 dark:focus:bg-red-950/30 group transition-all"
                >
                  <div className="flex items-center gap-3 text-red-500">
                    <Trash2 className="w-4 h-4" />
                    <span className="text-[11px] font-black uppercase italic">
                      Batalkan Reservasi
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl h-12 px-4 focus:bg-slate-100 dark:focus:bg-slate-800 transition-all">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-[11px] font-black uppercase italic">
                      Laporkan Masalah
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-10">
          {/* INFO CARD */}
          <Card className="rounded-[3rem] border-none shadow-2xl shadow-slate-200/50 dark:shadow-none p-10 bg-white dark:bg-slate-900 relative overflow-hidden ring-1 ring-slate-100 dark:ring-white/5 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
              <User size={200} />
            </div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] italic pr-2">
                    Customer Profile
                  </p>
                  <h2 className="text-4xl font-black italic text-slate-950 dark:text-white uppercase tracking-tighter pr-2 leading-none">
                    {booking.customer_name}
                  </h2>
                  <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold italic text-base mt-3 pr-2">
                    <Phone className="w-4 h-4 text-emerald-500" />{" "}
                    {booking.customer_phone}
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-50 dark:border-white/5">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic mb-4 pr-2">
                    Occupied Resource
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-950 dark:bg-slate-800 flex items-center justify-center text-white shadow-2xl">
                      <Package size={28} />
                    </div>
                    <div>
                      <p className="font-black italic text-slate-950 dark:text-white uppercase text-xl leading-none pr-1">
                        {booking.resource_name}
                      </p>
                      <Badge
                        variant="secondary"
                        className="text-[9px] font-black uppercase mt-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-none pr-2"
                      >
                        ACTIVE SESSION
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] italic pr-2">
                    Timeline Schedule
                  </p>
                  <div className="flex items-center gap-3 text-2xl font-black italic text-slate-950 dark:text-white uppercase tracking-tighter pr-2 leading-none">
                    <Calendar className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                    {format(new Date(booking.start_time), "dd MMMM yyyy", {
                      locale: localeID,
                    })}
                  </div>
                  <div className="flex items-center gap-3 text-3xl font-black italic text-blue-600 dark:text-blue-400 mt-2 uppercase tracking-tighter pr-2">
                    <Clock className="w-6 h-6 opacity-30" />
                    {format(new Date(booking.start_time), "HH:mm")} —{" "}
                    {format(new Date(booking.end_time), "HH:mm")}
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-50 dark:border-white/5">
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-inner">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase italic pr-2">
                        Access Token
                      </p>
                      <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 break-all uppercase tracking-tighter">
                        {booking.access_token.slice(0, 18)}...
                      </p>
                    </div>
                    <ShieldCheck className="w-8 h-8 text-blue-200 dark:text-blue-900/30" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* RENTAL OPTIONS LIST */}
          <Card className="rounded-[3rem] border-none shadow-xl dark:shadow-none p-10 bg-white dark:bg-slate-900 space-y-8 ring-1 ring-slate-100 dark:ring-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-6">
              <div className="flex items-center gap-3">
                <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-950 dark:text-white pr-2 leading-none">
                  Rincian Sewa Unit
                </h3>
              </div>
              <Badge
                variant="outline"
                className="font-black italic text-[9px] border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 pr-2"
              >
                RENTAL BILL
              </Badge>
            </div>

            <div className="space-y-6">
              {groupedOptions.map((opt: any) => (
                <div
                  key={opt.id}
                  className="flex justify-between items-center group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black italic text-blue-600 dark:text-blue-400 text-xs shadow-inner uppercase">
                      {opt.item_type === "main_option" ? "PKG" : "ADD"}
                    </div>
                    <div>
                      <p className="font-black italic text-slate-950 dark:text-white uppercase text-base pr-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-none">
                        {opt.item_name}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase italic pr-2 mt-2 leading-none">
                        @ Rp{formatIDR(opt.displayUnitPrice)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-black italic text-blue-600 dark:text-blue-400 text-sm pr-1">
                      x{opt.quantity}
                    </span>
                    <p className="font-black italic text-slate-950 dark:text-white text-lg pr-1">
                      Rp{formatIDR(opt.totalPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-5 space-y-10">
          {/* F&B CARD */}
          <Card className="rounded-[3rem] border-none shadow-xl dark:shadow-none p-10 bg-white dark:bg-slate-900 flex flex-col min-h-[400px] ring-1 ring-slate-100 dark:ring-white/5 animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-6 mb-8">
              <div className="flex items-center gap-3">
                <Utensils className="w-6 h-6 text-orange-500 dark:text-orange-400" />
                <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-950 dark:text-white pr-2 leading-none">
                  FnB Orders
                </h3>
              </div>
              {(booking.status === "active" ||
                booking.status === "ongoing") && (
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/admin/pos?active=${booking.id}`)}
                  className="h-10 text-[10px] font-black uppercase italic bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-xl px-5 transition-all pr-2"
                >
                  Edit POS
                </Button>
              )}
            </div>

            <div className="flex-1 space-y-6">
              {groupedOrders.length > 0 ? (
                groupedOrders.map((order: any) => (
                  <div
                    key={order.fnb_item_id}
                    className="flex justify-between items-center group"
                  >
                    <div className="flex flex-col leading-none">
                      <span className="font-black text-slate-800 dark:text-slate-200 uppercase italic text-sm pr-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {order.item_name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic pr-2 mt-2 leading-none">
                        @ Rp{formatIDR(order.price_at_purchase)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-blue-600 dark:text-blue-400 italic text-sm pr-1">
                        x{order.quantity}
                      </span>
                      <span className="font-black text-slate-950 dark:text-white italic text-lg pr-1">
                        Rp{formatIDR(order.subtotal)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-10 dark:opacity-20 py-10">
                  <Utensils
                    size={80}
                    className="mb-4 text-slate-900 dark:text-white"
                  />
                  <p className="font-black italic uppercase text-xs tracking-[0.3em] pr-2">
                    Belum Ada Pesanan
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-dashed border-slate-200 dark:border-white/5 flex justify-between items-center">
              <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-widest pr-2 leading-none">
                SUBTOTAL F&B
              </p>
              <p className="font-black text-slate-950 dark:text-white text-xl italic pr-1 leading-none">
                Rp{formatIDR(booking.total_fnb || 0)}
              </p>
            </div>
          </Card>

          {/* TOTAL PAYMENT CARD */}
          <Card className="rounded-[3.5rem] border-none bg-slate-950 p-12 text-white space-y-10 relative overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-700 delay-300">
            <div className="space-y-8 relative z-10">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic pr-2">
                    Total Unit Rental
                  </span>
                  <span className="font-black italic text-lg pr-1 text-slate-300">
                    Rp{formatIDR(booking.total_resource || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic pr-2">
                    Total Food & Bev
                  </span>
                  <span className="font-black italic text-lg pr-1 text-slate-300">
                    Rp{formatIDR(booking.total_fnb || 0)}
                  </span>
                </div>
              </div>

              <Separator className="bg-white/10 h-[2px]" />

              <div className="space-y-2">
                <div className="flex items-center gap-3 text-blue-400">
                  <Ticket className="w-5 h-5" />
                  <span className="text-[12px] font-black uppercase tracking-[0.4em] italic pr-2">
                    Amount Due
                  </span>
                </div>
                <p className="text-6xl md:text-7xl font-black italic tracking-tighter leading-none py-4 pr-4">
                  <span className="text-2xl mr-2 text-blue-500 font-bold not-italic">
                    Rp
                  </span>
                  {formatIDR(booking.grand_total || 0)}
                </p>
              </div>
            </div>

            <Button className="w-full h-20 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic tracking-[0.2em] text-sm shadow-2xl shadow-blue-900/50 transition-all active:scale-95 group relative z-10 gap-4 border-b-8 border-blue-800 active:border-b-0 pr-2">
              <CreditCard className="w-6 h-6 stroke-[3]" /> PROSES PEMBAYARAN
            </Button>

            <Receipt className="w-48 h-48 absolute -right-8 -bottom-8 opacity-[0.03] rotate-12" />
          </Card>

          <div className="flex items-start gap-4 p-8 rounded-[2.5rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
            <Info className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-relaxed italic pr-2">
              BOOKING ID: {booking.id.toUpperCase()}. HARAP KONFIRMASI SEMUA
              RINCIAN SEBELUM MENYELESAIKAN TRANSAKSI FINAL.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
