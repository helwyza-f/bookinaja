// src/app/(dashboard)/[tenant]/(public)/me/bookings/[id]/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Clock,
  MapPin,
  Gamepad2,
  Zap,
  ArrowRight,
  ReceiptText,
  CalendarDays,
  UtensilsCrossed,
  PlusCircle,
  MessageSquare,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { format, differenceInMinutes, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function CustomerBookingDetail() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    // Menggunakan endpoint public agar user yang baru booking bisa langsung akses
    // meskipun cookies JWT sedang dalam proses sinkronisasi oleh browser
    api
      .get(`/public/bookings/${params.id}`)
      .then((res) => {
        setBooking(res.data);
      })
      .catch((err) => {
        console.error("Gagal memuat detail reservasi", err);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  // Logika kalkulasi durasi berdasarkan jam local (setelah konversi dari ISO/UTC)
  const sessionStats = useMemo(() => {
    if (!booking) return { minutes: 0, hours: 0 };
    const start = parseISO(booking.start_time);
    const end = parseISO(booking.end_time);
    const diff = differenceInMinutes(end, start);
    return {
      minutes: diff,
      hours: (diff / 60).toFixed(1).replace(".0", ""),
    };
  }, [booking]);

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#050505] p-6 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className="font-black italic uppercase text-[10px] tracking-[0.3em] text-slate-400">
          Syncing Ticket Data...
        </p>
      </div>
    );

  if (!booking)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-[#050505]">
        <Zap className="h-16 w-16 text-slate-200 dark:text-slate-800 mb-4" />
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
          TIKET GHAIB
        </h1>
        <p className="text-slate-500 text-sm mt-2">
          Maaf, data reservasi ini tidak ditemukan atau sudah dihapus.
        </p>
        <Button
          onClick={() => router.push("/")}
          className="mt-8 rounded-2xl px-8 h-14 bg-blue-600 font-black italic uppercase tracking-widest"
        >
          Balik ke Beranda
        </Button>
      </div>
    );

  const isPending = booking.status === "pending";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] font-plus-jakarta pb-24 transition-colors duration-500">
      {/* HEADER NAVBAR */}
      <nav className="p-4 flex items-center justify-between bg-white/80 dark:bg-black/50 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"
            onClick={() => router.push("/me")}
          >
            <ChevronLeft size={22} className="dark:text-white" />
          </Button>
          <h1 className="text-[11px] font-[1000] uppercase italic tracking-[0.2em] dark:text-white">
            E-Ticket Details
          </h1>
        </div>
        <Badge
          variant="outline"
          className="border-blue-500/30 text-blue-600 font-black italic text-[9px] px-3"
        >
          #{booking.id.slice(0, 8).toUpperCase()}
        </Badge>
      </nav>

      <main className="max-w-xl mx-auto p-4 space-y-6 mt-4">
        {/* STATUS CARD */}
        <div
          className={cn(
            "p-10 rounded-[2.5rem] text-white flex justify-between items-center overflow-hidden relative shadow-2xl transition-all duration-700",
            isPending
              ? "bg-blue-600 shadow-blue-500/20"
              : booking.status === "completed"
                ? "bg-slate-900 shadow-xl"
                : "bg-emerald-600 shadow-emerald-500/20",
          )}
        >
          <Zap className="absolute -right-4 -top-4 h-32 w-32 opacity-10 rotate-12" />
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-black uppercase opacity-70 tracking-[0.2em]">
              Live Session Status
            </p>
            <h2 className="text-4xl font-[1000] italic uppercase leading-none tracking-tighter">
              {booking.status}
            </h2>
          </div>
          <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md ring-8 ring-white/5 z-10">
            {isPending ? (
              <Clock size={32} strokeWidth={3} className="animate-pulse" />
            ) : (
              <Zap
                size={32}
                strokeWidth={3}
                fill="white"
                className="animate-bounce"
              />
            )}
          </div>
        </div>

        {/* INFO UNIT CARD */}
        <Card className="rounded-[3rem] p-8 border-none bg-white dark:bg-[#0a0a0a] shadow-xl ring-1 ring-black/5 dark:ring-white/5 space-y-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4 text-left">
              <div className="h-14 w-14 rounded-2xl bg-blue-600/10 dark:bg-blue-600/20 flex items-center justify-center text-blue-600 shadow-inner">
                <MapPin size={28} />
              </div>
              <div>
                <p className="text-[10px] font-[900] text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Spot / Unit
                </p>
                <h3 className="font-[1000] text-2xl italic uppercase dark:text-white leading-none tracking-tighter">
                  {booking.resource_name}
                </h3>
              </div>
            </div>
            <div className="bg-emerald-500/10 p-3 rounded-2xl text-right flex flex-col items-end">
              <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">
                Points Earned
              </p>
              <span className="text-lg font-[1000] italic text-emerald-500 leading-none">
                +{Math.floor(booking.grand_total / 1000)}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 px-1">
              <CalendarDays size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">
                {format(parseISO(booking.start_time), "EEEE, dd MMMM yyyy", {
                  locale: idLocale,
                })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 py-8 px-8 bg-slate-50 dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-inner">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">
                  START
                </p>
                <p className="text-3xl font-[1000] italic dark:text-white leading-none">
                  {format(parseISO(booking.start_time), "HH:mm")}
                </p>
              </div>
              <div className="space-y-2 text-right border-l border-slate-200 dark:border-white/10 pl-8">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">
                  FINISH
                </p>
                <p className="text-3xl font-[1000] italic text-blue-600 leading-none">
                  {format(parseISO(booking.end_time), "HH:mm")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-white/5 p-5 rounded-2xl border border-dashed border-slate-300 dark:border-white/10">
            <Clock size={20} className="text-blue-500" />
            <p className="text-[11px] font-bold uppercase italic tracking-tight leading-tight">
              Total durasi boking adalah{" "}
              <span className="text-slate-900 dark:text-white font-[1000]">
                {sessionStats.hours} Jam
              </span>{" "}
              ({sessionStats.minutes} Menit).
            </p>
          </div>
        </Card>

        {/* ORDER DETAILS SECTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-blue-600" />
              <h4 className="text-[11px] font-[1000] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 italic">
                Bill Summaries
              </h4>
            </div>
            <Badge className="bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400 border-none font-black text-[8px] tracking-widest">
              VERIFIED
            </Badge>
          </div>

          <div className="space-y-2.5">
            {/* RESERVATION OPTIONS */}
            {booking.options?.map((opt: any) => (
              <div
                key={opt.id}
                className="flex justify-between items-center bg-white dark:bg-white/[0.03] p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg",
                      opt.item_type === "main" ||
                        opt.item_type === "main_option"
                        ? "bg-slate-900"
                        : "bg-blue-600",
                    )}
                  >
                    {opt.item_type === "main" ||
                    opt.item_type === "main_option" ? (
                      <Gamepad2 size={20} />
                    ) : (
                      <PlusCircle size={20} />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-[900] italic text-[12px] text-slate-900 dark:text-white uppercase leading-none">
                      {opt.item_name}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 tracking-widest">
                      QTY: {opt.quantity}{" "}
                      {opt.item_type === "main" ||
                      opt.item_type === "main_option"
                        ? "SESSIONS"
                        : "UNITS"}
                    </p>
                  </div>
                </div>
                <span className="font-black italic text-sm dark:text-white">
                  Rp {opt.price_at_booking.toLocaleString()}
                </span>
              </div>
            ))}

            {/* F&B ORDERS FROM POS */}
            {booking.orders?.map((order: any) => (
              <div
                key={order.id}
                className="flex justify-between items-center bg-orange-50/30 dark:bg-orange-500/5 p-5 rounded-3xl border border-orange-100/50 dark:border-orange-500/10"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="h-10 w-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <UtensilsCrossed size={20} />
                  </div>
                  <div>
                    <p className="font-[900] italic text-[12px] text-slate-900 dark:text-white uppercase leading-none">
                      {order.item_name}
                    </p>
                    <p className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase mt-1.5 tracking-widest">
                      POS ORDER • QTY: {order.quantity}
                    </p>
                  </div>
                </div>
                <span className="font-black italic text-sm dark:text-white text-orange-600">
                  Rp {order.subtotal.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* TOTAL BILL AREA */}
          <div className="bg-slate-950 dark:bg-blue-600 p-8 rounded-[2.8rem] flex justify-between items-center text-white shadow-2xl relative overflow-hidden group">
            <Zap className="absolute right-0 bottom-0 h-32 w-32 bg-white/5 -rotate-12 translate-x-4 translate-y-4 transition-transform group-hover:scale-110 duration-1000" />
            <div className="z-10 text-left">
              <span className="text-[10px] font-black uppercase italic opacity-60 tracking-[0.3em] mb-2 block leading-none">
                GRAND TOTAL BILL
              </span>
              <span className="text-4xl font-[1000] italic tracking-tighter leading-none uppercase">
                Rp {booking.grand_total.toLocaleString()}
              </span>
            </div>
            <div className="z-10 flex flex-col items-end gap-2">
              <Badge className="bg-white/20 backdrop-blur-md text-white border-none py-1.5 px-4 rounded-full font-[900] italic text-[10px] uppercase shadow-lg">
                {booking.status === "completed" ? "PAID" : "DUE"}
              </Badge>
              {isPending && (
                <p className="text-[8px] font-bold text-blue-300 dark:text-white/60 uppercase italic tracking-tighter">
                  Please pay at counter
                </p>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-4 pt-4">
          <Button className="h-16 rounded-[1.8rem] bg-slate-900 dark:bg-white dark:text-black hover:bg-black font-[1000] uppercase italic tracking-[0.2em] text-[10px] gap-3 border-b-4 border-slate-700 dark:border-slate-300 active:translate-y-1 active:border-b-0 transition-all shadow-xl">
            <MessageSquare className="h-4 w-4 fill-current" /> HELP DESK
          </Button>
          <Button
            variant="outline"
            className="h-16 rounded-[1.8rem] border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-transparent dark:text-white hover:bg-slate-50 font-[1000] uppercase italic tracking-[0.2em] text-[10px] gap-3 active:scale-95 transition-all shadow-sm"
            onClick={() => typeof window !== "undefined" && window.print()}
          >
            <Share2 size={16} /> SAVE TICKET
          </Button>
        </div>

        {/* DASHBOARD LINK BOX */}
        <button
          className="w-full bg-white dark:bg-[#111] p-6 rounded-[2.8rem] border border-blue-500/20 shadow-lg group active:scale-[0.98] transition-all flex items-center justify-between mt-4"
          onClick={() => router.push("/me")}
        >
          <div className="flex items-center gap-4 text-left">
            <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-blue-500/30 shadow-lg group-hover:rotate-6 transition-transform">
              <User size={28} />
            </div>
            <div>
              <h5 className="font-[1000] italic uppercase leading-none dark:text-white text-sm">
                Customer Portal
              </h5>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5 italic font-bold">
                Manage Points & Bookings
              </p>
            </div>
          </div>
          <ArrowRight
            className="text-blue-600 group-hover:translate-x-2 transition-transform"
            strokeWidth={3}
          />
        </button>

        <p className="text-center text-[9px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600 italic pt-10 opacity-50">
          {booking.tenant_id.slice(0, 8).toUpperCase()} PORTAL INFRASTRUCTURE
        </p>
      </main>
    </div>
  );
}

// --- ICON COMPONENTS ---
function Loader2({ className, ...props }: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("animate-spin", className)}
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function Share2({ ...props }: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  );
}

function User({ ...props }: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
