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
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

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
    if (diff <= 0) return "Waktu Habis";
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;
  }, [session, now]);

  const isLowTime = useMemo(() => {
    const diff = differenceInMinutes(new Date(session.end_time), now);
    return diff > 0 && diff <= 15;
  }, [session, now]);

  // --- LOGIKA GROUPING REFACTORED (Data Direct from Backend) ---
  const groupedOptions = useMemo(() => {
    if (!session?.options) return [];

    // Backend sekarang sudah mengirim quantity & unit_price per baris.
    // Kita tetap melakukan grouping hanya jika ada ID item yang sama (biasanya untuk Add-ons).
    const groups = session.options.reduce((acc: any, item: any) => {
      const key = item.item_name;
      if (!acc[key]) {
        acc[key] = {
          ...item,
          unitPrice: item.unit_price, // Diambil langsung dari backend
          total_price: item.price_at_booking,
        };
      } else {
        // Jika ada item sama (misal Stik Tambahan diinput 2x manual), kita akumulasi
        acc[key].quantity += item.quantity;
        acc[key].total_price += item.price_at_booking;
      }
      return acc;
    }, {});
    return Object.values(groups);
  }, [session?.options]);

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
  }, [session?.orders]);

  return (
    <div className="w-full h-full bg-white dark:bg-slate-950 flex flex-col overflow-hidden shadow-none border-l dark:border-white/5 font-plus-jakarta">
      <VisuallyHidden.Root>
        <SheetHeader>
          <SheetTitle>Sesi Kontrol: {session.customer_name}</SheetTitle>
          <SheetDescription>
            Manajemen billing dan durasi sesi aktif
          </SheetDescription>
        </SheetHeader>
      </VisuallyHidden.Root>

      {/* 1. COMPACT HEADER SECTION */}
      <div className="px-6 py-5 bg-slate-900 text-white shrink-0 shadow-md">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black italic uppercase tracking-tighter leading-none pr-2 truncate">
                {session.customer_name}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 opacity-60">
                <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest italic pr-1 truncate">
                  {session.resource_name}
                </p>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[8px] font-bold font-mono">
                  {format(new Date(session.start_time), "HH:mm")}—
                  {format(new Date(session.end_time), "HH:mm")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              className={cn(
                "flex flex-col items-end px-3 py-1.5 rounded-xl border transition-all",
                isLowTime
                  ? "bg-red-500/20 border-red-500/50 scale-105"
                  : "bg-emerald-500/10 border-emerald-500/30",
              )}
            >
              <span
                className={cn(
                  "text-[7px] font-black uppercase",
                  isLowTime ? "text-red-400" : "text-emerald-500",
                )}
              >
                Sisa
              </span>
              <span
                className={cn(
                  "text-[10px] font-black italic",
                  isLowTime ? "text-red-400 animate-pulse" : "text-emerald-400",
                )}
              >
                {timeRemaining}
              </span>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="rounded-xl text-slate-500 hover:text-white hover:bg-white/10 h-9 w-9 p-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 2. ACTIONS BAR */}
      <div className="p-3 grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/50 border-b dark:border-white/5 shrink-0">
        <Button
          onClick={() => setFnbOpen(true)}
          className="h-14 flex-col rounded-xl bg-white dark:bg-slate-800 border dark:border-white/5 text-slate-900 dark:text-white hover:bg-blue-600 hover:text-white transition-all shadow-sm"
        >
          <ShoppingCart className="w-4 h-4 mb-1" />
          <span className="text-[8px] font-black uppercase italic pr-1">
            F&B Menu
          </span>
        </Button>
        <Button
          onClick={() => setAddonsOpen(true)}
          className="h-14 flex-col rounded-xl bg-white dark:bg-slate-800 border dark:border-white/5 text-slate-900 dark:text-white hover:bg-orange-500 hover:text-white transition-all shadow-sm"
        >
          <Package className="w-4 h-4 mb-1" />
          <span className="text-[8px] font-black uppercase italic pr-1">
            Add-ons
          </span>
        </Button>
        <Button
          onClick={() => setExtendOpen(true)}
          className="h-14 flex-col rounded-xl bg-white dark:bg-slate-800 border dark:border-white/5 text-slate-900 dark:text-white hover:bg-slate-950 hover:text-white transition-all shadow-sm"
        >
          <TimerReset className="w-4 h-4 mb-1" />
          <span className="text-[8px] font-black uppercase italic pr-1">
            Extend
          </span>
        </Button>
      </div>

      {/* 3. MAIN BILLING AREA */}
      <div className="flex-1 bg-white dark:bg-slate-950 overflow-y-auto pr-1 scrollbar-hide scroll-smooth">
        <div className="p-6 space-y-8">
          {/* RENTAL SECTION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic pr-1">
                Rental & Equipment
              </span>
            </div>
            <div className="space-y-4">
              {groupedOptions.map((opt: any) => (
                <div
                  key={opt.id}
                  className="group animate-in fade-in slide-in-from-right-2"
                >
                  <div className="flex justify-between items-end gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase italic truncate max-w-[180px] pr-2">
                      {opt.item_name}
                    </span>
                    <div className="flex-1 mb-1 border-b border-dotted border-slate-200 dark:border-white/5" />
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 italic min-w-[30px] text-right pr-2">
                      x{opt.quantity}
                    </span>
                    <span className="text-xs font-black text-slate-950 dark:text-white min-w-[80px] text-right pr-1">
                      Rp{formatIDR(opt.total_price)}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase italic mt-1 block pr-1">
                    @ Rp{formatIDR(opt.unitPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* F&B SECTION */}
          {groupedFnb.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                <ShoppingCart className="w-3.5 h-3.5 text-blue-600/40" />
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600/40 italic pr-1">
                  Konsumsi F&B
                </span>
              </div>
              <div className="space-y-4">
                {groupedFnb.map((order: any) => (
                  <div
                    key={order.fnb_item_id}
                    className="group animate-in fade-in slide-in-from-right-2"
                  >
                    <div className="flex justify-between items-end gap-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase italic truncate max-w-[180px] pr-2">
                        {order.item_name}
                      </span>
                      <div className="flex-1 mb-1 border-b border-dotted border-slate-200 dark:border-white/5" />
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400 italic min-w-[30px] text-right pr-2">
                        x{order.quantity}
                      </span>
                      <span className="text-xs font-black text-slate-950 dark:text-white min-w-[80px] text-right pr-1">
                        Rp{formatIDR(order.subtotal)}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase italic mt-1 block pr-1">
                      @ Rp{formatIDR(order.price_at_purchase)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-white/5 flex gap-3 items-start mb-6">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[9px] font-bold text-slate-400 uppercase italic leading-relaxed tracking-tight pr-2">
              Lakukan finalisasi pembayaran di menu checkout untuk melepaskan
              unit.
            </p>
          </div>
        </div>
      </div>

      {/* 4. STICKY FOOTER SECTION */}
      <div className="p-6 bg-slate-900 text-white shrink-0 shadow-[0_-15px_30px_rgba(0,0,0,0.3)] border-t border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic leading-none pr-1">
              Total Billing
            </p>
            <p className="text-3xl font-black italic tracking-tighter leading-none flex items-baseline pr-2">
              <span className="text-blue-500 text-lg mr-1.5 font-black not-italic">
                Rp
              </span>
              {formatIDR(session.grand_total)}
            </p>
          </div>
          <Button
            onClick={() =>
              (window.location.href = `/admin/bookings/${session.id}`)
            }
            className="h-14 px-7 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase italic text-[11px] shadow-2xl shadow-blue-900/40 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all gap-2 group pr-3"
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
