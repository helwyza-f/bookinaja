"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Calendar,
  User,
  MapPin,
  ReceiptText,
  Gamepad2,
  PlusCircle,
  Zap,
  MessageSquare,
  Share2,
  Loader2,
  Clock,
  UtensilsCrossed,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

export default function BookingStatusPage() {
  const params = useParams();
  if (!params.token) return <div>Invalid Token</div>;
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.token) return;
    api
      .get(`/guest/status/${params.token}`)
      .then((res) => {
        setBooking(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.token]);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black p-6 text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="font-black italic uppercase text-xs tracking-[0.3em] text-slate-400">
          Authenticating Ticket...
        </p>
      </div>
    );

  if (!booking)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Zap className="h-16 w-16 text-red-500 mb-4 opacity-20" />
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">
          Invalid Token
        </h1>
        <p className="text-slate-500 text-sm mt-2">
          Maaf, data reservasi tidak ditemukan.
        </p>
      </div>
    );

  const isPending = booking.status === "pending";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] font-plus-jakarta pb-20 selection:bg-blue-600/30 overflow-x-hidden transition-colors duration-500">
      {/* BRAND HEADER AREA */}
      <div className="h-72 bg-slate-950 w-full absolute top-0 left-0" />

      <main className="relative z-10 max-w-md mx-auto pt-8 px-4 space-y-6">
        {/* TICKET MAIN CARD */}
        <Card className="rounded-[3rem] border-none shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] overflow-hidden bg-white dark:bg-[#0a0a0a] ring-1 ring-black/5 dark:ring-white/5">
          {/* HEADER STATUS: DYNAMIC COLOR */}
          <div
            className={cn(
              "p-10 text-center space-y-4 transition-all duration-700",
              isPending
                ? "bg-blue-600 shadow-[inset_0_-40px_60px_-20px_rgba(0,0,0,0.2)]"
                : "bg-emerald-600 shadow-[inset_0_-40px_60px_-20px_rgba(0,0,0,0.2)]",
            )}
          >
            <div className="h-20 w-20 bg-white/10 rounded-full flex items-center justify-center mx-auto backdrop-blur-xl ring-8 ring-white/5 animate-in zoom-in duration-500">
              <CheckCircle2 className="h-10 w-10 text-white stroke-[3]" />
            </div>
            <div className="space-y-1">
              <h2 className="text-white font-[1000] italic uppercase text-3xl tracking-tighter leading-none">
                {isPending ? "BOOKED!" : "ON SESSION"}
              </h2>
              <Badge className="bg-black/20 text-white/80 border-none font-black text-[8px] uppercase tracking-widest px-3 py-1 italic">
                TOKEN: {params.token.toString().slice(0, 8).toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="p-8 space-y-10">
            {/* SCHEDULE BLOCK */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 px-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest italic leading-none">
                    {new Date(booking.start_time).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-[8px] font-black border-slate-200 dark:border-white/10 opacity-60"
                >
                  WIB
                </Badge>
              </div>

              <div className="bg-slate-50 dark:bg-white/[0.02] rounded-[2rem] p-8 flex items-center justify-between border border-slate-100 dark:border-white/5 shadow-inner">
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">
                    START
                  </p>
                  <p className="text-3xl font-[1000] italic text-slate-900 dark:text-white leading-none">
                    {new Date(booking.start_time).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="flex-1 px-6">
                  <div className="h-[2px] w-full bg-slate-200 dark:bg-white/10 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 dark:bg-blue-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase italic whitespace-nowrap shadow-xl ring-4 ring-white dark:ring-black">
                      SESSION
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">
                    END
                  </p>
                  <p className="text-3xl font-[1000] italic text-slate-900 dark:text-white leading-none">
                    {new Date(booking.end_time).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* IDENTITY GRID */}
            <div className="grid grid-cols-2 gap-8 px-1">
              <div className="space-y-2 border-l-4 border-blue-600 pl-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                  <User className="h-3 w-3" /> CUSTOMER
                </p>
                <p className="font-[900] italic text-slate-900 dark:text-white uppercase text-sm truncate leading-none">
                  {booking.customer_name}
                </p>
              </div>
              <div className="space-y-2 border-l-4 border-slate-200 dark:border-white/10 pl-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                  <MapPin className="h-3 w-3" /> SPOT UNIT
                </p>
                <p className="font-[900] italic text-blue-600 uppercase text-sm leading-none">
                  {booking.resource_name}
                </p>
              </div>
            </div>

            {/* ITEMS DETAIL SECTION */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-1">
                <ReceiptText className="h-4 w-4 text-blue-600" />
                <h3 className="font-black italic uppercase text-xs tracking-widest text-slate-900 dark:text-white">
                  Transaction Details
                </h3>
              </div>

              <div className="space-y-3">
                {/* RENDER RESERVATION ITEMS */}
                {booking.options?.map((opt: any) => (
                  <div
                    key={opt.id}
                    className="flex justify-between items-center bg-slate-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-blue-500 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6",
                          opt.item_type === "main"
                            ? "bg-slate-900 text-white"
                            : "bg-blue-600/10 text-blue-600",
                        )}
                      >
                        {opt.item_type === "main" ? (
                          <Gamepad2 size={18} />
                        ) : (
                          <PlusCircle size={18} />
                        )}
                      </div>
                      <div>
                        <p className="font-black italic text-[11px] text-slate-900 dark:text-white uppercase leading-none">
                          {opt.item_name}
                        </p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1.5 leading-none tracking-widest">
                          {opt.quantity}{" "}
                          {opt.item_type === "main" ? "Hours Session" : "Units"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black italic text-[11px] text-slate-900 dark:text-white">
                        Rp {formatIDR(opt.price_at_booking)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* RENDER POS ORDERS (FnB) IF EXISTS */}
                {booking.orders?.map((ord: any) => (
                  <div
                    key={ord.id}
                    className="flex justify-between items-center bg-orange-50/50 dark:bg-orange-500/5 p-4 rounded-2xl border border-orange-100 dark:border-orange-500/10"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-9 w-9 rounded-xl bg-orange-500 text-white flex items-center justify-center">
                        <UtensilsCrossed size={18} />
                      </div>
                      <div>
                        <p className="font-black italic text-[11px] text-slate-900 dark:text-white uppercase leading-none">
                          {ord.item_name}
                        </p>
                        <p className="text-[8px] font-bold text-orange-500 uppercase mt-1.5 leading-none tracking-widest">
                          Qty: {ord.quantity} (POS Order)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black italic text-[11px] text-slate-900 dark:text-white">
                        Rp {formatIDR(ord.subtotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-slate-100 dark:bg-white/5" />

            {/* BILLING SUMMARY */}
            <div className="flex items-center justify-between bg-slate-950 dark:bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <Zap className="absolute right-0 bottom-0 h-24 w-24 text-white/5 -rotate-12 translate-x-4 translate-y-4 transition-transform group-hover:scale-110" />
              <div className="space-y-1 z-10">
                <p className="text-[9px] font-black text-blue-500 dark:text-white/60 uppercase tracking-[0.4em] italic leading-none">
                  Total Payment
                </p>
                <p className="text-4xl font-[1000] italic text-white tracking-tighter leading-none">
                  Rp {formatIDR(booking.grand_total)}
                </p>
              </div>
              <div className="z-10">
                <Badge
                  className={cn(
                    "border-none text-[9px] font-black uppercase py-1.5 px-4 rounded-full italic shadow-lg ring-2 ring-white/10",
                    isPending
                      ? "bg-orange-500 text-white"
                      : "bg-emerald-500 text-white",
                  )}
                >
                  {booking.status}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* CUSTOMER CTA ACTIONS */}
        <div className="grid grid-cols-2 gap-4">
          <Button className="h-16 rounded-[1.5rem] bg-slate-900 dark:bg-white dark:text-black hover:bg-black font-black uppercase italic tracking-widest text-[10px] gap-3 border-b-4 border-slate-700 active:translate-y-1 active:border-b-0 transition-all shadow-xl">
            <MessageSquare className="h-4 w-4 fill-current" /> Help Center
          </Button>
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="h-16 rounded-[1.5rem] border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-transparent dark:text-white hover:bg-slate-50 font-black uppercase italic tracking-widest text-[10px] gap-3 active:scale-95 transition-all shadow-md"
          >
            <Share2 className="h-4 w-4" /> Save Ticket
          </Button>
        </div>

        <p className="text-center text-[9px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600 italic pt-6 opacity-60">
          AUTHORIZED BY {booking.tenant_id.slice(0, 8).toUpperCase()} ENGINE
        </p>
      </main>
    </div>
  );
}
