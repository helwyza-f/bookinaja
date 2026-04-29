"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronUp,
  ChevronDown,
  ShoppingCart,
  Package,
  Info,
  TimerReset,
  X,
  User,
  MessageCircle,
  Printer,
  ReceiptText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FnBCatalogDialog,
  type FnBCartItem,
  type FnBMenuItem,
} from "./fnb-catalog-dialog";
import {
  ExtendSessionDialog,
  type ExtendSession,
} from "./extend-session-dialog";
import {
  AddonsCatalogDialog,
  type AddonCartItem,
  type AddonItem,
} from "./addons-catalog-dialog";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { format, differenceInMinutes } from "date-fns";
import {
  isReceiptProEnabled,
  printReceiptBluetooth,
  type ReceiptSettings,
} from "@/lib/receipt";
import { toast } from "sonner";

type POSLineItem = {
  id?: string;
  item_name: string;
  quantity: number;
  unit_price?: number;
  price_at_booking?: number;
};

type POSOrderItem = {
  fnb_item_id: string;
  item_name: string;
  quantity: number;
  subtotal: number;
  price_at_purchase: number;
};

export type POSSessionDetail = ExtendSession & {
  id: string;
  customer_name?: string;
  customer_phone?: string;
  resource_name?: string;
  resource_addons?: AddonItem[];
  start_time: string;
  end_time: string;
  status?: string;
  payment_status?: string;
  balance_due?: number;
  paid_amount?: number;
  grand_total?: number;
  options?: POSLineItem[];
  orders?: POSOrderItem[];
};

type POSControlHubProps = {
  session: POSSessionDetail;
  menuItems: FnBMenuItem[];
  onRefresh: (id: string) => Promise<void>;
  onClose?: () => void;
};

export function POSControlHub({
  session,
  menuItems,
  onRefresh,
  onClose,
}: POSControlHubProps) {
  const [fnbOpen, setFnbOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [addonsOpen, setAddonsOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    api
      .get("/admin/receipt-settings")
      .then((res) => setReceiptSettings(res.data || null))
      .catch(() => setReceiptSettings(null));
  }, []);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);
  const sessionStatus = String(session.status || "").toLowerCase();
  const paymentStatus = String(session.payment_status || "").toLowerCase();
  const balanceDue = Number(session.balance_due || 0);
  const isOutstanding =
    sessionStatus === "completed" &&
    (balanceDue > 0 || ["pending", "partial_paid", "unpaid", "failed", "expired"].includes(paymentStatus));
  const isSessionEditable = !isOutstanding && ["active", "ongoing"].includes(sessionStatus);
  const canUseReceipt = isReceiptProEnabled(receiptSettings);
  const isPaymentSettled =
    paymentStatus === "settled" ||
    (paymentStatus === "paid" && Number(session.balance_due || 0) === 0);

  const handleReceiptAction = async (mode: "whatsapp" | "print" | "both") => {
    if (!canUseReceipt) {
      toast.message("Fitur nota aktif di paket Pro", {
        description: "Pengaturan bisa dilihat di Starter/Trial, penggunaan nota terkunci.",
      });
      window.location.href = "/admin/settings/billing/subscribe";
      return;
    }

    if (mode === "whatsapp" || mode === "both") {
      try {
        await api.post(`/bookings/${session.id}/receipt/send`);
        toast.success("Nota WhatsApp dikirim via Fonnte");
      } catch (error) {
        const err = error as { response?: { data?: { error?: string } } };
        toast.error(err.response?.data?.error || "Gagal mengirim nota WhatsApp");
        if (mode === "whatsapp") return;
      }
    }

    if (mode === "print" || mode === "both") {
      try {
        await printReceiptBluetooth(receiptSettings, session);
        toast.success("Nota dikirim ke printer Bluetooth");
      } catch (error) {
        const err = error as Error;
        toast.error(err.message || "Gagal cetak ke printer Bluetooth");
      }
    }
  };

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
    if (!session.options) return [];
    const groups = session.options.reduce<Record<string, POSLineItem & {
      unitPrice: number;
      total_price: number;
    }>>((acc, item) => {
      const key = item.item_name;
      if (!acc[key]) {
        acc[key] = {
          ...item,
          unitPrice: item.unit_price || 0,
          total_price: item.price_at_booking || 0,
        };
      } else {
        acc[key].quantity += item.quantity;
        acc[key].total_price += item.price_at_booking || 0;
      }
      return acc;
    }, {});
    return Object.values(groups);
  }, [session.options]);

  const groupedFnb = useMemo(() => {
    if (!session.orders) return [];
    const groups = session.orders.reduce<Record<string, POSOrderItem>>((acc, item) => {
      const id = item.fnb_item_id;
      if (!acc[id]) acc[id] = { ...item };
      else {
        acc[id].quantity += item.quantity;
        acc[id].subtotal += item.subtotal;
      }
      return acc;
    }, {});
    return Object.values(groups);
  }, [session.orders]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white font-plus-jakarta dark:bg-slate-950">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate pr-2 text-base font-semibold leading-tight text-slate-950 dark:text-white">
                {session.customer_name || "Customer"}
              </h2>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <p className="truncate pr-1 font-medium text-blue-600">
                  {session.resource_name || "Unit"}
                </p>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="font-mono">
                  {format(new Date(session.start_time), "HH:mm")}—
                  {format(new Date(session.end_time), "HH:mm")}
                </span>
                {isOutstanding ? (
                  <>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span className="font-semibold text-amber-600">Perlu pelunasan</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div
              className={cn(
                "flex flex-col items-end rounded-xl border px-3 py-1.5 transition-all",
                isOutstanding
                  ? "border-amber-200 bg-amber-50"
                  : isLowTime
                  ? "border-amber-200 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50",
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isOutstanding || isLowTime ? "text-amber-700" : "text-emerald-700",
                )}
              >
                {isOutstanding ? "Tagihan" : "Sisa"}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  isOutstanding || isLowTime ? "text-amber-700" : "text-emerald-700",
                )}
              >
                {isOutstanding ? `Rp${formatIDR(balanceDue)}` : timeRemaining}
              </span>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {isSessionEditable ? (
        <div className="grid shrink-0 grid-cols-3 gap-2 border-b border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
          <button
            onClick={() => setFnbOpen(true)}
            className="group flex h-14 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm transition-all hover:border-blue-300 hover:text-blue-600 dark:border-white/10 dark:bg-slate-950 dark:text-white"
          >
            <ShoppingCart className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform" />
            <span className="pr-1 text-[11px] font-semibold">F&B Menu</span>
          </button>
          <button
            onClick={() => setAddonsOpen(true)}
            className="group flex h-14 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm transition-all hover:border-orange-300 hover:text-orange-600 dark:border-white/10 dark:bg-slate-950 dark:text-white"
          >
            <Package className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform" />
            <span className="pr-1 text-[11px] font-semibold">Add-ons</span>
          </button>
          <button
            onClick={() => setExtendOpen(true)}
            className="group flex h-14 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm transition-all hover:border-slate-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
          >
            <TimerReset className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform" />
            <span className="pr-1 text-[11px] font-semibold">Extend</span>
          </button>
        </div>
      ) : (
        <div className="border-b border-slate-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-white/10 dark:bg-amber-950/20 dark:text-amber-200">
          Sesi sudah selesai. Fokus berikutnya adalah pelunasan tagihan.
        </div>
      )}

      {/* 3. MAIN BILLING AREA */}
      <div className="flex-1 bg-white dark:bg-slate-950 overflow-y-auto pr-1 scrollbar-hide scroll-smooth">
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-8">
          <button
            type="button"
            onClick={() => setItemsOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left dark:border-white/10 dark:bg-white/[0.03] sm:hidden"
          >
            <div>
              <div className="text-sm font-semibold text-slate-950 dark:text-white">Detail item</div>
              <div className="text-xs text-slate-500">{groupedOptions.length + groupedFnb.length} item dalam billing</div>
            </div>
            {itemsOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
          </button>
          <div className={cn("space-y-8", !itemsOpen && "hidden sm:block")}>
          {/* RENTAL SECTION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic pr-1">
                Rental & Equipment
              </span>
            </div>
            <div className="space-y-4">
              {groupedOptions.map((opt) => (
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
                {groupedFnb.map((order) => (
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
              {isOutstanding
                ? "Selesaikan pelunasan untuk menutup transaksi ini."
                : "Lakukan finalisasi pembayaran di menu checkout untuk melepaskan unit."}
            </p>
          </div>
          </div>
        </div>
      </div>

      {/* 4. STICKY FOOTER SECTION */}
      <div className="p-4 sm:p-6 bg-slate-900 text-white shrink-0 shadow-[0_-15px_30px_rgba(0,0,0,0.3)] border-t border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic leading-none pr-1">
              {isOutstanding ? "Sisa Tagihan" : "Total Billing"}
            </p>
            <p className="text-2xl sm:text-3xl font-black tracking-tight leading-none flex items-baseline pr-2 whitespace-nowrap">
              <span className="text-blue-500 text-lg mr-1.5 font-black not-italic">
                Rp
              </span>
              {formatIDR(isOutstanding ? balanceDue : session.grand_total || 0)}
            </p>
          </div>
          <Button
            onClick={() =>
              (window.location.href = `/admin/bookings/${session.id}`)
            }
            className="h-12 sm:h-14 px-4 sm:px-7 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg gap-2 group pr-3"
          >
            Checkout
            <ChevronUp className="w-4 h-4 animate-bounce group-hover:scale-125 transition-transform" />
          </Button>
        </div>
        {isPaymentSettled && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="mt-3 h-10 w-full rounded-xl border-white/10 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              >
                <ReceiptText className="mr-2 h-4 w-4" />
                Nota pelanggan
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 dark:bg-slate-900">
              {!canUseReceipt && (
                <DropdownMenuItem onClick={() => (window.location.href = "/admin/settings/billing/subscribe")} className="rounded-xl text-amber-700">
                  Upgrade Pro untuk pakai nota
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleReceiptAction("whatsapp")} className="rounded-xl" disabled={!canUseReceipt}>
                <MessageCircle size={14} className="mr-2" /> Kirim nota WA
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleReceiptAction("print")} className="rounded-xl" disabled={!canUseReceipt}>
                <Printer size={14} className="mr-2" /> Cetak nota fisik
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleReceiptAction("both")} className="rounded-xl" disabled={!canUseReceipt}>
                <ReceiptText size={14} className="mr-2" /> WA + cetak
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* DIALOGS */}
      <FnBCatalogDialog
        open={fnbOpen}
        onOpenChange={setFnbOpen}
        menuItems={menuItems}
        onConfirmOrder={async (cartItems: FnBCartItem[]) => {
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
        availableAddons={session.resource_addons || []}
        onConfirmAddons={async (cartItems: AddonCartItem[]) => {
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
