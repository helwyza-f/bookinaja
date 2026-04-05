"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Zap,
  Ticket,
  ChevronUp,
  X,
  ShoppingCart,
  Package,
  Info,
  Clock,
  TimerReset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FnBCatalogDialog } from "./fnb-catalog-dialog";
import { ExtendSessionDialog } from "./extend-session-dialog";
import { AddonsCatalogDialog } from "./addons-catalog-dialog";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { format, differenceInMinutes } from "date-fns";

export function POSControlHub({ session, menuItems, onRefresh, onClose }: any) {
  const [fnbOpen, setFnbOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [addonsOpen, setAddonsOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  const timeRemaining = useMemo(() => {
    if (!session?.end_time) return null;
    const diff = differenceInMinutes(new Date(session.end_time), now);
    if (diff <= 0) return "Sesi Berakhir";
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return hours > 0 ? `${hours}j ${mins}m lagi` : `${mins}m lagi`;
  }, [session, now]);

  const isLowTime = useMemo(() => {
    const diff = differenceInMinutes(new Date(session.end_time), now);
    return diff > 0 && diff <= 15;
  }, [session, now]);

  const groupedOptions = useMemo(() => {
    if (!session?.options) return [];
    const groups = session.options.reduce((acc: any, item: any) => {
      const key = item.item_name;
      const unitPrice = item.price_at_booking;
      if (!acc[key]) {
        acc[key] = { ...item, quantity: 1, unitPrice, total_price: unitPrice };
      } else {
        acc[key].quantity += 1;
        acc[key].total_price += unitPrice;
      }
      return acc;
    }, {});
    return Object.values(groups);
  }, [session]);

  const groupedFnb = useMemo(() => {
    if (!session?.orders) return [];
    const groups = session.orders.reduce((acc: any, item: any) => {
      const id = item.fnb_item_id;
      if (!acc[id]) acc[id] = { ...item };
      else {
        acc[id].quantity += item.quantity;
        acc[id].subtotal += item.subtotal;
      }
      return acc;
    }, {});
    return Object.values(groups);
  }, [session]);

  return (
    // Menggunakan h-full agar memenuhi tinggi layar Sheet
    <div className="w-full h-full bg-white dark:bg-slate-950 flex flex-col overflow-hidden shadow-none border-l dark:border-white/5">
      {/* 1. HEADER SECTION */}
      <div className="p-8 bg-slate-900 text-white shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="w-7 h-7 fill-current" />
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none pr-2">
                {session.customer_name}
              </h2>
              <p className="text-[11px] font-bold text-blue-400 uppercase tracking-[0.2em] mt-2 italic opacity-80 pr-2">
                {session.resource_name} • Aktif
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-xl text-slate-500 hover:text-white hover:bg-white/10 h-10 w-10 p-0 transition-all"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex items-center justify-between bg-white/5 rounded-3xl p-5 border border-white/10">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-slate-500" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-slate-500 italic pr-1">
                Jadwal Sesi
              </span>
              <span className="text-sm font-bold font-mono tracking-tight text-white">
                {format(new Date(session.start_time), "HH:mm")} —{" "}
                {format(new Date(session.end_time), "HH:mm")}
              </span>
            </div>
          </div>
          <div
            className={cn(
              "flex flex-col items-end px-5 py-2 rounded-2xl border",
              isLowTime
                ? "bg-red-500/20 border-red-500/50"
                : "bg-emerald-500/10 border-emerald-500/30",
            )}
          >
            <span
              className={cn(
                "text-[9px] font-black uppercase pr-1",
                isLowTime ? "text-red-400" : "text-emerald-500",
              )}
            >
              Sisa Waktu
            </span>
            <span
              className={cn(
                "text-sm font-black italic pr-1",
                isLowTime ? "text-red-400 animate-pulse" : "text-emerald-400",
              )}
            >
              {timeRemaining}
            </span>
          </div>
        </div>
      </div>

      {/* 2. QUICK ACTIONS */}
      <div className="p-4 grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900 border-b dark:border-white/5 shrink-0">
        <Button
          onClick={() => setFnbOpen(true)}
          className="h-20 flex-col rounded-[1.5rem] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/5 text-slate-900 dark:text-white hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all group shadow-sm"
        >
          <ShoppingCart className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black uppercase italic pr-1">
            Menu F&B
          </span>
        </Button>
        <Button
          onClick={() => setAddonsOpen(true)}
          className="h-20 flex-col rounded-[1.5rem] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/5 text-slate-900 dark:text-white hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all group shadow-sm"
        >
          <Package className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black uppercase italic pr-1">
            Add-ons
          </span>
        </Button>
        <Button
          onClick={() => setExtendOpen(true)}
          className="h-20 flex-col rounded-[1.5rem] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/5 text-slate-900 dark:text-white hover:bg-slate-900 dark:hover:bg-white dark:hover:text-black hover:text-white hover:border-slate-900 transition-all group shadow-sm"
        >
          <TimerReset className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black uppercase italic pr-1">
            Extend
          </span>
        </Button>
      </div>

      {/* 3. MAIN CONTENT (BILLING) */}
      <div className="flex-1 bg-white dark:bg-slate-950 overflow-y-auto pr-1 scrollbar-hide">
        <div className="p-8 space-y-10">
          {/* RENTAL SECTION */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
              <Package className="w-4 h-4 text-slate-400" />
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic pr-1">
                Sewa & Peralatan
              </span>
            </div>
            <div className="space-y-6">
              {groupedOptions.map((opt: any) => (
                <div key={opt.id} className="group">
                  <div className="flex justify-between items-end gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase italic truncate max-w-[200px] pr-2">
                      {opt.item_name}
                    </span>
                    <div className="flex-1 mb-1 border-b-2 border-dotted border-slate-100 dark:border-white/5" />
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 italic min-w-[30px] text-right pr-2">
                      x{opt.quantity}
                    </span>
                    <span className="text-xs font-black text-slate-950 dark:text-white min-w-[85px] text-right pr-1">
                      Rp{formatIDR(opt.total_price)}
                    </span>
                  </div>
                  {opt.quantity > 1 && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase italic mt-1 block pr-1">
                      @ Rp{formatIDR(opt.unitPrice)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* F&B SECTION */}
          {groupedFnb.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
                <ShoppingCart className="w-4 h-4 text-blue-600/40" />
                <span className="text-[11px] font-black uppercase tracking-widest text-blue-600/40 italic pr-1">
                  Konsumsi F&B
                </span>
              </div>
              <div className="space-y-6">
                {groupedFnb.map((order: any) => (
                  <div key={order.fnb_item_id} className="group">
                    <div className="flex justify-between items-end gap-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase italic truncate max-w-[200px] pr-2">
                        {order.item_name}
                      </span>
                      <div className="flex-1 mb-1 border-b-2 border-dotted border-slate-100 dark:border-white/5" />
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400 italic min-w-[30px] text-right pr-2">
                        x{order.quantity}
                      </span>
                      <span className="text-xs font-black text-slate-950 dark:text-white min-w-[85px] text-right pr-1">
                        Rp{formatIDR(order.subtotal)}
                      </span>
                    </div>
                    {order.quantity > 1 && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase italic mt-1 block pr-1">
                        @ Rp{formatIDR(order.price_at_purchase)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 flex gap-4 items-start mb-10">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-slate-400 uppercase italic leading-relaxed tracking-tight pr-2">
              Tagihan final akan dikalkulasi otomatis saat proses checkout
              dilakukan oleh kasir.
            </p>
          </div>
        </div>
      </div>

      {/* 4. FOOTER SECTION */}
      <div className="p-8 bg-slate-900 text-white shrink-0 shadow-[0_-20px_40px_rgba(0,0,0,0.3)] border-t border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div className="space-y-1">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] italic leading-none pr-1">
              Ringkasan Tagihan
            </p>
            <p className="text-4xl font-black italic tracking-tighter leading-none flex items-baseline pr-2">
              <span className="text-blue-500 text-xl mr-2 font-black not-italic">
                Rp
              </span>
              {formatIDR(session.grand_total)}
            </p>
          </div>
          <Button
            onClick={() =>
              (window.location.href = `/admin/bookings/${session.id}`)
            }
            className="h-16 px-8 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase italic text-xs shadow-2xl shadow-blue-900/40 border-b-[6px] border-blue-800 active:border-b-0 active:translate-y-1 transition-all gap-3 group"
          >
            Checkout{" "}
            <ChevronUp className="w-4 h-4 animate-bounce group-hover:scale-125 transition-transform" />
          </Button>
        </div>
      </div>

      {/* DIALOGS */}
      <FnBCatalogDialog
        open={fnbOpen}
        onOpenChange={setFnbOpen}
        menuItems={menuItems}
        onConfirmOrder={async (cartItems: any) => {
          for (const item of cartItems) {
            await api.post(`/bookings/pos/order/${session.id}`, {
              fnb_item_id: item.id,
              quantity: item.quantity,
            });
          }
          await onRefresh(session.id);
        }}
      />
      <AddonsCatalogDialog
        open={addonsOpen}
        onOpenChange={setAddonsOpen}
        availableAddons={session.resource_addons}
        onConfirmAddons={async (cartItems: any) => {
          for (const item of cartItems) {
            for (let i = 0; i < item.quantity; i++) {
              await api.post(`/bookings/${session.id}/addons`, {
                item_id: item.id,
              });
            }
          }
          await onRefresh(session.id);
        }}
      />
      <ExtendSessionDialog
        open={extendOpen}
        onOpenChange={setExtendOpen}
        session={session}
        onExtend={async (count: number) => {
          await api.post(`/bookings/${session.id}/extend`, {
            additional_duration: count,
          });
          await onRefresh(session.id);
          setExtendOpen(false);
        }}
      />
    </div>
  );
}
