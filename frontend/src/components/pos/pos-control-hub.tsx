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
  item_type?: string;
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
  payment_methods?: Array<{
    code: string;
    display_name: string;
    verification_type: string;
  }>;
  payment_attempts?: Array<{
    id: string;
    method_label: string;
    status: string;
    payment_scope: string;
  }>;
  options?: POSLineItem[];
  orders?: POSOrderItem[];
};

type POSControlHubProps = {
  session: POSSessionDetail;
  menuItems: FnBMenuItem[];
  onRefresh: (id: string) => Promise<void>;
  canWriteBookings: boolean;
  canManageFnb: boolean;
  canUseReceiptActions: boolean;
  onClose?: () => void;
};

export function POSControlHub({
  session,
  menuItems,
  onRefresh,
  canWriteBookings,
  canManageFnb,
  canUseReceiptActions,
  onClose,
}: POSControlHubProps) {
  const [fnbOpen, setFnbOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [addonsOpen, setAddonsOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(true);
  const [addonsSummaryOpen, setAddonsSummaryOpen] = useState(false);
  const [fnbSummaryOpen, setFnbSummaryOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!canUseReceiptActions) return;

    api
      .get("/admin/receipt-settings")
      .then((res) => setReceiptSettings(res.data || null))
      .catch(() => setReceiptSettings(null));
  }, [canUseReceiptActions]);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);
  const sessionStatus = String(session.status || "").toLowerCase();
  const paymentStatus = String(session.payment_status || "").toLowerCase();
  const balanceDue = Number(session.balance_due || 0);
  const isOutstanding =
    sessionStatus === "completed" &&
    (balanceDue > 0 || ["pending", "partial_paid", "unpaid", "failed", "expired"].includes(paymentStatus));
  const isSessionEditable = !isOutstanding && ["active", "ongoing"].includes(sessionStatus);
  const canUseReceipt = canUseReceiptActions && isReceiptProEnabled(receiptSettings);
  const isPaymentSettled =
    paymentStatus === "settled" ||
    (paymentStatus === "paid" && Number(session.balance_due || 0) === 0);
  const paymentMethods = session.payment_methods || [];
  const pendingPaymentAttempts =
    (session.payment_attempts || []).filter(
      (item) => item.status === "submitted" || item.status === "awaiting_verification",
    );

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

  const groupedServices = useMemo(
    () =>
      groupedOptions.filter((item) =>
        ["main_option", "main", "console_option"].includes(String(item.item_type || "")),
      ),
    [groupedOptions],
  );

  const groupedAddons = useMemo(
    () =>
      groupedOptions.filter((item) =>
        ["add_on", "addon"].includes(String(item.item_type || "")),
      ),
    [groupedOptions],
  );

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

  const renderSummarySection = ({
    title,
    caption,
    icon,
    tone,
    count,
    total,
    open,
    setOpen,
    emptyMessage,
    children,
  }: {
    title: string;
    caption: string;
    icon: React.ReactNode;
    tone: "slate" | "emerald" | "orange";
    count: number;
    total: number;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    emptyMessage: string;
    children: React.ReactNode;
  }) => {
    const toneClass =
      tone === "emerald"
        ? "text-emerald-600 dark:text-emerald-300"
        : tone === "orange"
        ? "text-orange-600 dark:text-orange-300"
        : "text-slate-700 dark:text-slate-200";
    const pillClass =
      tone === "emerald"
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
        : tone === "orange"
        ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-200"
        : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200";

    return (
      <section className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:pointer-events-none sm:cursor-default"
        >
          <div className="min-w-0">
            <div className={cn("flex items-center gap-2 text-sm font-semibold", toneClass)}>
              {icon}
              <span>{title}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{caption}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", pillClass)}>
              {count} item
            </span>
            <span className="hidden text-xs font-semibold text-slate-500 dark:text-slate-400 sm:inline">
              Rp{formatIDR(total)}
            </span>
            <span className="sm:hidden">
              {open ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </span>
          </div>
        </button>
        <div
          className={cn(
            "border-t border-slate-100 px-4 py-4 dark:border-white/5",
            !open && "hidden sm:block",
          )}
        >
          {count > 0 ? (
            <div className="space-y-3">{children}</div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
              {emptyMessage}
            </div>
          )}
        </div>
      </section>
    );
  };

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
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <p className="truncate pr-1 font-medium text-blue-600 dark:text-blue-300">
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

      {isSessionEditable && canWriteBookings ? (
        <div className="grid shrink-0 grid-cols-3 gap-2 border-b border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
          <button
            onClick={() => canManageFnb && setFnbOpen(true)}
            disabled={!canManageFnb}
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
          {canWriteBookings
            ? "Sesi sudah selesai. Fokus berikutnya adalah pelunasan tagihan."
            : "Akun ini hanya bisa melihat ringkasan sesi. Aksi POS dibatasi."}
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-white pr-1 scrollbar-hide scroll-smooth dark:bg-slate-950">
        <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Ringkasan billing sesi
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {isOutstanding
                    ? "Sesi sudah selesai. Fokus utama sekarang adalah menutup sisa tagihan."
                    : "Gunakan panel per kategori agar kasir tetap cepat saat menambah layanan, add-on, atau F&B."}
                </p>
              </div>
            </div>
          </div>

          {renderSummarySection({
            title: "Layanan",
            caption: "Paket utama dan item sewa sesi",
            icon: <Package className="h-4 w-4" />,
            tone: "slate",
            count: groupedServices.length,
            total: groupedServices.reduce((sum, item) => sum + Number(item.total_price || 0), 0),
            open: servicesOpen,
            setOpen: setServicesOpen,
            emptyMessage: "Belum ada item layanan di billing sesi ini.",
            children: groupedServices.map((opt) => (
              <div
                key={opt.id || `${opt.item_name}-${opt.item_type}`}
                className="flex items-start justify-between gap-3 rounded-xl bg-slate-50/90 px-3 py-3 dark:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {opt.item_name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {opt.quantity}x • Rp{formatIDR(opt.unitPrice)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">
                  Rp{formatIDR(opt.total_price)}
                </span>
              </div>
            )),
          })}

          {renderSummarySection({
            title: "Add-on",
            caption: "Tambahan manual di luar paket utama",
            icon: <Package className="h-4 w-4" />,
            tone: "emerald",
            count: groupedAddons.length,
            total: groupedAddons.reduce((sum, item) => sum + Number(item.total_price || 0), 0),
            open: addonsSummaryOpen,
            setOpen: setAddonsSummaryOpen,
            emptyMessage: "Belum ada add-on tambahan untuk sesi ini.",
            children: groupedAddons.map((opt) => (
              <div
                key={opt.id || `${opt.item_name}-${opt.item_type}`}
                className="flex items-start justify-between gap-3 rounded-xl bg-emerald-50/60 px-3 py-3 dark:bg-emerald-500/[0.05]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {opt.item_name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {opt.quantity}x • Rp{formatIDR(opt.unitPrice)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Rp{formatIDR(opt.total_price)}
                </span>
              </div>
            )),
          })}

          {renderSummarySection({
            title: "F&B",
            caption: "Pesanan makanan dan minuman customer",
            icon: <ShoppingCart className="h-4 w-4" />,
            tone: "orange",
            count: groupedFnb.length,
            total: groupedFnb.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
            open: fnbSummaryOpen,
            setOpen: setFnbSummaryOpen,
            emptyMessage: "Belum ada pesanan F&B untuk sesi ini.",
            children: groupedFnb.map((order) => (
              <div
                key={order.fnb_item_id}
                className="flex items-start justify-between gap-3 rounded-xl bg-orange-50/60 px-3 py-3 dark:bg-orange-500/[0.05]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {order.item_name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {order.quantity}x • Rp{formatIDR(order.price_at_purchase)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-orange-700 dark:text-orange-300">
                  Rp{formatIDR(order.subtotal)}
                </span>
              </div>
            )),
          })}
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
        {isOutstanding && paymentMethods.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {paymentMethods.map((method) => (
              <span
                key={method.code}
                className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-200"
              >
                {method.display_name}
              </span>
            ))}
          </div>
        ) : null}
        {pendingPaymentAttempts.length > 0 ? (
          <div className="mb-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[11px] font-semibold text-amber-100">
            Ada {pendingPaymentAttempts.length} pembayaran manual yang menunggu verifikasi admin.
          </div>
        ) : null}
        {isPaymentSettled && canUseReceiptActions && (
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
