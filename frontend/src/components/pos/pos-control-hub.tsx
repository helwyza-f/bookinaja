"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  Minus,
  Plus,
  ShoppingCart,
  Package,
  Search,
  Info,
  TimerReset,
  X,
  User,
  MessageCircle,
  Printer,
  ReceiptText,
  CreditCard,
  Landmark,
  QrCode,
  Wallet,
  Play,
  Clock3,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { format, differenceInSeconds, parseISO } from "date-fns";
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

export type POSCatalogItem = {
  id: string;
  name: string;
  price: number;
  price_unit?: string;
  unit_duration?: number;
  item_type?: string;
  is_default?: boolean;
  metadata?: Record<string, unknown> | null;
};

export type POSCatalogResource = {
  resource_id: string;
  resource_name: string;
  resource_image_url?: string;
  category?: string;
  status?: string;
  operating_mode?: string;
  available_items?: POSCatalogItem[];
};

type DirectSaleCatalogEntry = POSCatalogItem & {
  resource_id: string;
  resource_name: string;
  resource_image_url?: string;
  resource_status?: string;
};

type ResolvedPOSSalesOrderItem = POSSalesOrderItem & {
  resource_name?: string;
};

type POSPaymentMethod = {
  code: string;
  display_name: string;
  category?: string;
  verification_type: string;
  provider?: string;
  instructions?: string;
  is_active?: boolean;
  sort_order?: number;
  metadata?: Record<string, string> | null;
};

type POSPaymentAttempt = {
  id: string;
  method_code: string;
  method_label: string;
  verification_type?: string;
  payment_scope: string;
  amount?: number;
  status: string;
  reference_code?: string;
  payer_note?: string;
  admin_note?: string;
  proof_url?: string;
  created_at?: string;
  submitted_at?: string;
  verified_at?: string;
  rejected_at?: string;
};

export type POSSessionDetail = ExtendSession & {
  id: string;
  customer_name?: string;
  customer_phone?: string;
  resource_name?: string;
  timezone?: string;
  resource_addons?: AddonItem[];
  start_time: string;
  end_time: string;
  status?: string;
  payment_status?: string;
  deposit_override_active?: boolean;
  deposit_override_reason?: string;
  deposit_override_by?: string;
  deposit_override_at?: string;
  deposit_amount?: number;
  balance_due?: number;
  paid_amount?: number;
  grand_total?: number;
  payment_methods?: POSPaymentMethod[];
  payment_attempts?: POSPaymentAttempt[];
  options?: POSLineItem[];
  orders?: POSOrderItem[];
};

export type POSSalesOrderItem = {
  id: string;
  resource_item_id?: string | null;
  item_name: string;
  item_type?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export type POSSalesOrderDetail = {
  id: string;
  resource_id: string;
  resource_name?: string;
  customer_name?: string;
  customer_phone?: string;
  status?: string;
  payment_status?: string;
  subtotal?: number;
  discount_amount?: number;
  grand_total?: number;
  paid_amount?: number;
  balance_due?: number;
  payment_method?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  payment_methods?: POSPaymentMethod[];
  payment_attempts?: POSPaymentAttempt[];
  items?: POSSalesOrderItem[];
};

export type POSControlAction =
  | { kind: "booking"; data: POSSessionDetail }
  | { kind: "sales_order"; data: POSSalesOrderDetail };

type POSControlHubProps = {
  action: POSControlAction;
  menuItems: FnBMenuItem[];
  posCatalog?: POSCatalogResource[];
  onRefresh: (kind: "booking" | "sales_order", id: string) => Promise<void>;
  canWriteBookings: boolean;
  canConfirmBookings: boolean;
  canStartSessions: boolean;
  canCompleteSessions: boolean;
  canSettleCash: boolean;
  canManageFnb: boolean;
  canUseReceiptActions: boolean;
  onClose?: () => void;
};

function useMidtransSnap() {
  const [midtransReady, setMidtransReady] = useState(
    Boolean(typeof window !== "undefined" && window.snap),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.snap) return;

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-midtrans-snap="bookinaja"]',
    );
    const onLoad = () => setMidtransReady(Boolean(window.snap));
    const onError = () => setMidtransReady(false);

    if (existing) {
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", onError);
      return () => {
        existing.removeEventListener("load", onLoad);
        existing.removeEventListener("error", onError);
      };
    }

    const script = document.createElement("script");
    script.src =
      (process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || "").toLowerCase() === "true"
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "");
    script.setAttribute("data-midtrans-snap", "bookinaja");
    script.async = true;
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
  }, []);

  const waitForSnap = useCallback(async () => {
    if (window.snap) return window.snap;
    const started = Date.now();
    while (Date.now() - started < 5000) {
      if (window.snap) return window.snap;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return null;
  }, []);

  return { midtransReady, waitForSnap };
}

function getPaymentMethodIcon(code?: string) {
  if (code === "cash") return Wallet;
  if (code === "qris_static") return QrCode;
  if (code === "bank_transfer") return Landmark;
  return CreditCard;
}

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function getPaymentMethodHint(method: POSPaymentMethod) {
  if (method.code === "cash") return "Paling cepat untuk bayar langsung di kasir.";
  if (method.code === "midtrans") return "Lanjutkan ke payment gateway otomatis.";
  if (method.code === "bank_transfer") return "Cocok untuk transfer manual dan review bukti bayar.";
  if (method.code === "qris_static") return "Scan QR tenant lalu verifikasi bila perlu.";
  return method.instructions || "Gunakan metode ini sesuai SOP tenant.";
}

function PaymentMethodSelector({
  methods,
  selectedCode,
  onSelect,
}: {
  methods: POSPaymentMethod[];
  selectedCode?: string;
  onSelect: (code: string) => void;
}) {
  if (methods.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
        Belum ada metode pembayaran aktif untuk tenant ini.
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {methods.map((method) => {
        const Icon = getPaymentMethodIcon(method.code);
        const selected = method.code === selectedCode;
        return (
          <button
            key={method.code}
            type="button"
            onClick={() => onSelect(method.code)}
            className={cn(
              "rounded-xl border px-3 py-3 text-left transition-colors",
              selected
                ? "border-[var(--bookinaja-400)] bg-blue-50/70 ring-2 ring-[color:rgba(59,130,246,0.14)] dark:border-[var(--bookinaja-400)] dark:bg-blue-500/10"
                : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    selected
                      ? "bg-[var(--bookinaja-600)] text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                    {method.display_name}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {getPaymentMethodHint(method)}
                  </p>
                </div>
              </div>
              <Badge
                className={cn(
                  "shrink-0 rounded-full border-none",
                  method.verification_type === "auto"
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                    : "bg-amber-500 text-white",
                )}
              >
                {method.verification_type === "auto" ? "Otomatis" : "Manual"}
              </Badge>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PaymentMethodDetails({ method }: { method?: POSPaymentMethod }) {
  if (!method) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">{method.display_name}</p>
        <Badge
          className={cn(
            "rounded-full border-none",
            method.verification_type === "auto"
              ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
              : "bg-amber-500 text-white",
          )}
        >
          {method.verification_type === "auto" ? "Otomatis" : "Manual"}
        </Badge>
      </div>

      {method.code === "bank_transfer" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Bank</p>
            <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
              {method.metadata?.bank_name || "-"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">No. Rekening</p>
            <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
              {method.metadata?.account_number || "-"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Atas Nama</p>
            <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
              {method.metadata?.account_name || "-"}
            </p>
          </div>
        </div>
      ) : null}

      {method.code === "qris_static" && method.metadata?.qr_image_url ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={method.metadata?.qr_image_url || ""}
            alt="QRIS static"
            className="aspect-square w-full object-contain"
          />
        </div>
      ) : null}

      <div className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
        {method.instructions || "Gunakan metode ini sesuai operasional tenant."}
      </div>
    </div>
  );
}

function PendingPaymentAttemptCard({
  attempt,
  processing,
  onDecision,
}: {
  attempt: POSPaymentAttempt;
  processing: boolean;
  onDecision: (approve: boolean) => void;
}) {
  const scopeLabel = attempt.payment_scope === "deposit" ? "DP" : "Pelunasan";

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-500/20 dark:bg-amber-950/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">
            Menunggu Verifikasi
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
            {attempt.method_label}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {scopeLabel} · Ref {attempt.reference_code || "-"}
          </p>
        </div>
        <Badge className="rounded-full border-none bg-amber-500 text-white">{scopeLabel}</Badge>
      </div>

      <div className="mt-3 rounded-lg border border-amber-200 bg-white px-3 py-3 dark:border-amber-500/20 dark:bg-[#0f0f17]">
        <div className="text-sm font-semibold text-slate-950 dark:text-white">
          Rp{formatIDR(Number(attempt.amount || 0))}
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {attempt.submitted_at
            ? format(new Date(attempt.submitted_at), "dd MMM yyyy, HH:mm")
            : "Menunggu review admin"}
        </div>
        {attempt.payer_note ? (
          <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{attempt.payer_note}</p>
        ) : null}
        {attempt.proof_url ? (
          <a
            href={attempt.proof_url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--bookinaja-600)] hover:underline dark:text-[var(--bookinaja-200)]"
          >
            Buka bukti bayar
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          onClick={() => onDecision(true)}
          disabled={processing}
          className="h-10 flex-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Verifikasi
        </Button>
        <Button
          variant="outline"
          onClick={() => onDecision(false)}
          disabled={processing}
          className="h-10 flex-1 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
        >
          Tolak
        </Button>
      </div>
    </div>
  );
}

function TimedBookingControlHub({
  session,
  menuItems,
  onRefresh,
  canWriteBookings,
  canConfirmBookings,
  canStartSessions,
  canCompleteSessions,
  canSettleCash,
  canManageFnb,
  canUseReceiptActions,
  onClose,
}: {
  session: POSSessionDetail;
  menuItems: FnBMenuItem[];
  onRefresh: (kind: "booking" | "sales_order", id: string) => Promise<void>;
  canWriteBookings: boolean;
  canConfirmBookings: boolean;
  canStartSessions: boolean;
  canCompleteSessions: boolean;
  canSettleCash: boolean;
  canManageFnb: boolean;
  canUseReceiptActions: boolean;
  onClose?: () => void;
}) {
  const refreshBooking = (id: string) => onRefresh("booking", id);
  return (
    <TimedBookingControlHubInner
      session={session}
      menuItems={menuItems}
      onRefresh={refreshBooking}
      canWriteBookings={canWriteBookings}
      canConfirmBookings={canConfirmBookings}
      canStartSessions={canStartSessions}
      canCompleteSessions={canCompleteSessions}
      canSettleCash={canSettleCash}
      canManageFnb={canManageFnb}
      canUseReceiptActions={canUseReceiptActions}
      onClose={onClose}
    />
  );
}

function TimedBookingControlHubInner({
  session,
  menuItems,
  onRefresh,
  canWriteBookings,
  canConfirmBookings,
  canStartSessions,
  canCompleteSessions,
  canSettleCash,
  canManageFnb,
  canUseReceiptActions,
  onClose,
}: {
  session: POSSessionDetail;
  menuItems: FnBMenuItem[];
  onRefresh: (id: string) => Promise<void>;
  canWriteBookings: boolean;
  canConfirmBookings: boolean;
  canStartSessions: boolean;
  canCompleteSessions: boolean;
  canSettleCash: boolean;
  canManageFnb: boolean;
  canUseReceiptActions: boolean;
  onClose?: () => void;
}) {
  const [fnbOpen, setFnbOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [addonsOpen, setAddonsOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(true);
  const [addonsSummaryOpen, setAddonsSummaryOpen] = useState(false);
  const [fnbSummaryOpen, setFnbSummaryOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("midtrans");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [processingAttemptId, setProcessingAttemptId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<"summary" | "payment">("summary");
  const [recordDepositDialogOpen, setRecordDepositDialogOpen] = useState(false);
  const [overrideDepositDialogOpen, setOverrideDepositDialogOpen] = useState(false);
  const [recordDepositNotes, setRecordDepositNotes] = useState("DP diterima langsung oleh admin.");
  const [overrideDepositReason, setOverrideDepositReason] = useState(
    "Booking dijalankan tanpa DP.",
  );
  const { midtransReady, waitForSnap } = useMidtransSnap();

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
  const sessionTimezone = session.timezone || "Asia/Jakarta";
  const sessionStartLabel = formatTenantTime(session.start_time, sessionTimezone, "HH:mm");
  const sessionEndLabel = formatTenantTime(session.end_time, sessionTimezone, "HH:mm");
  const sessionStatus = String(session.status || "").toLowerCase();
  const paymentStatus = String(session.payment_status || "").toLowerCase();
  const balanceDue = Number(session.balance_due || 0);
  const isOutstanding =
    sessionStatus === "completed" &&
    (balanceDue > 0 || ["pending", "partial_paid", "unpaid", "failed", "expired"].includes(paymentStatus));
  const isSessionEditable = !isOutstanding && ["active", "ongoing"].includes(sessionStatus);
  const isPreSession = ["pending", "confirmed"].includes(sessionStatus);
  const canUseReceipt = canUseReceiptActions && isReceiptProEnabled(receiptSettings);
  const isPaymentSettled =
    paymentStatus === "settled" ||
    (paymentStatus === "paid" && Number(session.balance_due || 0) === 0);
  const paymentMethods = (session.payment_methods || []).filter((item) => item.is_active !== false);
  const pendingPaymentAttempts =
    (session.payment_attempts || []).filter(
      (item) => item.status === "submitted" || item.status === "awaiting_verification",
    );
  const hasPendingPaymentReview = pendingPaymentAttempts.length > 0;
  const depositAmount = Number(session.deposit_amount || 0);
  const hasDepositOverride = Boolean(session.deposit_override_active);
  const hasPaidDp =
    paymentStatus === "partial_paid" ||
    paymentStatus === "paid" ||
    paymentStatus === "settled" ||
    depositAmount === 0;
  const canConfirm = canConfirmBookings && sessionStatus === "pending" && paymentStatus !== "awaiting_verification";
  const canStart = canStartSessions && ["pending", "confirmed"].includes(sessionStatus) && (hasPaidDp || hasDepositOverride);
  const canComplete = canCompleteSessions && ["active", "ongoing"].includes(sessionStatus);
  const canRecordDeposit =
    canSettleCash &&
    ["pending", "confirmed"].includes(sessionStatus) &&
    depositAmount > 0 &&
    !hasPaidDp &&
    !hasPendingPaymentReview &&
    !hasDepositOverride;
  const canOverrideDeposit =
    canStartSessions &&
    ["pending", "confirmed"].includes(sessionStatus) &&
    depositAmount > 0 &&
    !hasPaidDp &&
    !hasPendingPaymentReview &&
    !hasDepositOverride;
  const canPayDeposit =
    ["pending", "confirmed"].includes(sessionStatus) &&
    depositAmount > 0 &&
    !hasPaidDp &&
    !hasDepositOverride &&
    !pendingPaymentAttempts.some((item) => item.payment_scope === "deposit");
  const canSettle =
    canSettleCash &&
    sessionStatus === "completed" &&
    balanceDue > 0 &&
    !pendingPaymentAttempts.some((item) => item.payment_scope === "settlement");
  const activePaymentScope = canSettle ? "settlement" : canPayDeposit ? "deposit" : "";
  const activePaymentLabel = activePaymentScope === "settlement" ? "Pelunasan" : "DP";
  const activePaymentAmount = activePaymentScope === "deposit" ? depositAmount : balanceDue;
  const scopePendingAttempt = pendingPaymentAttempts.find(
    (item) => item.payment_scope === activePaymentScope,
  );
  const selectablePaymentMethods = useMemo(
    () =>
      paymentMethods.filter((item) => {
        if (activePaymentScope === "deposit" && item.code === "cash") return false;
        return true;
      }),
    [paymentMethods, activePaymentScope],
  );

  useEffect(() => {
    if (selectablePaymentMethods.length === 0) return;
    if (!selectablePaymentMethods.find((item) => item.code === selectedPaymentMethod)) {
      setSelectedPaymentMethod(selectablePaymentMethods[0].code);
    }
  }, [selectablePaymentMethods, selectedPaymentMethod]);

  useEffect(() => {
    if (hasPendingPaymentReview && activeStep !== "payment") {
      setActiveStep("payment");
    }
  }, [activeStep, hasPendingPaymentReview]);

  const selectedPaymentMethodDetail =
    selectablePaymentMethods.find((item) => item.code === selectedPaymentMethod) ||
    selectablePaymentMethods[0];
  const paymentDisabledReason = scopePendingAttempt
    ? `${activePaymentLabel} sedang menunggu verifikasi admin.`
    : !activePaymentScope
      ? "Belum ada aksi pembayaran yang perlu diproses dari drawer ini."
      : selectablePaymentMethods.length === 0
        ? "Belum ada metode pembayaran yang cocok untuk tahap ini."
        : selectedPaymentMethodDetail?.verification_type === "auto" && !midtransReady
          ? "Gateway pembayaran belum siap dimuat."
          : "";

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

  const handleStatusUpdate = async (nextStatus: "confirmed" | "active" | "completed") => {
    try {
      setPaymentProcessing(true);
      await api.put(`/bookings/${session.id}/status`, { status: nextStatus });
      toast.success(
        nextStatus === "confirmed"
          ? "Booking dikonfirmasi"
          : nextStatus === "active"
            ? "Sesi dimulai"
            : "Sesi diakhiri",
      );
      await onRefresh(session.id);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal memperbarui status sesi");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleRecordDeposit = async () => {
    try {
      setPaymentProcessing(true);
      await api.post(`/bookings/${session.id}/record-deposit`, {
        notes: String(recordDepositNotes || "").trim(),
      });
      toast.success("DP berhasil dicatat");
      setRecordDepositDialogOpen(false);
      await onRefresh(session.id);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal mencatat DP");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleOverrideDeposit = async () => {
    try {
      setPaymentProcessing(true);
      await api.post(`/bookings/${session.id}/override-deposit`, {
        reason: String(overrideDepositReason || "").trim(),
      });
      toast.success("Mode tanpa DP aktif");
      setOverrideDepositDialogOpen(false);
      await onRefresh(session.id);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal mengaktifkan override DP");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleProceedPayment = async () => {
    if (!selectedPaymentMethodDetail || !activePaymentScope) return;
    try {
      setPaymentProcessing(true);
      if (selectedPaymentMethodDetail.code === "cash") {
        if (activePaymentScope !== "settlement") {
          toast.error("Cash tidak tersedia untuk pembayaran DP");
          return;
        }
        await api.post(`/bookings/${session.id}/settle-cash`);
        toast.success(`${activePaymentLabel} cash berhasil dicatat`);
        await onRefresh(session.id);
        return;
      }

      if (selectedPaymentMethodDetail.verification_type === "auto") {
        const snap = await waitForSnap();
        if (!snap) {
          toast.error("Gateway belum siap");
          return;
        }
        const res = await api.post(
          `/billing/bookings/checkout?mode=${activePaymentScope}&method=${selectedPaymentMethodDetail.code}`,
          { booking_id: session.id },
        );
        snap.pay(res.data.snap_token, {
          onSuccess: () => {
            toast.success(`${activePaymentLabel} berhasil dibayar`);
            void onRefresh(session.id);
          },
          onPending: () => toast.message("Pembayaran menunggu konfirmasi"),
          onError: () => toast.error("Pembayaran gagal"),
          onClose: () => void onRefresh(session.id),
        });
        return;
      }

      const res = await api.post(`/bookings/${session.id}/manual-payment`, {
        booking_id: session.id,
        scope: activePaymentScope,
        method: selectedPaymentMethodDetail.code,
      });
      toast.success(`Transaksi manual dibuat (${res.data.reference})`);
      await onRefresh(session.id);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || `Gagal memproses ${activePaymentLabel.toLowerCase()}`);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleVerifyAttempt = async (attemptID: string, approve: boolean) => {
    try {
      setProcessingAttemptId(attemptID);
      await api.post(`/bookings/payment-attempts/${attemptID}/${approve ? "verify" : "reject"}`, {
        notes: "",
      });
      toast.success(approve ? "Pembayaran manual diverifikasi" : "Pembayaran manual ditolak");
      await onRefresh(session.id);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal memproses verifikasi");
    } finally {
      setProcessingAttemptId(null);
    }
  };

  const countdownMeta = useMemo(() => {
    const formatCountdown = (seconds: number) => {
      if (seconds <= 0) return "0m";
      const totalMinutes = Math.ceil(seconds / 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (hours <= 0) return `${minutes}m`;
      return minutes === 0 ? `${hours}j` : `${hours}j ${minutes}m`;
    };

    if (isOutstanding) {
      return {
        label: "Tagihan",
        value: `Rp${formatIDR(balanceDue)}`,
        hint: "Perlu pelunasan",
        tone: "amber" as const,
      };
    }

    if (["active", "ongoing"].includes(sessionStatus) && session.end_time) {
      const diff = differenceInSeconds(parseISO(session.end_time), now);
      return {
        label: "Sisa sesi",
        value: diff <= 0 ? "Habis" : formatCountdown(diff),
        hint: diff <= 0 ? "Overtime" : "Sesi berjalan",
        tone: diff <= 0 ? ("red" as const) : diff <= 900 ? ("amber" as const) : ("emerald" as const),
      };
    }

    if (isPreSession && session.start_time) {
      const diff = differenceInSeconds(parseISO(session.start_time), now);
      return {
        label: "Mulai",
        value: diff <= 0 ? "Siap" : formatCountdown(diff),
        hint: diff <= 0 ? "Jadwal tiba" : "Waktu tunggu",
        tone: diff <= 900 ? ("amber" as const) : ("blue" as const),
      };
    }

    if (session.end_time) {
      const diff = differenceInSeconds(parseISO(session.end_time), now);
      return {
        label: "Sesi",
        value: diff <= 0 ? "Selesai" : formatCountdown(diff),
        hint: "Ringkasan booking",
        tone: "slate" as const,
      };
    }

    return null;
  }, [balanceDue, isOutstanding, isPreSession, now, session.end_time, session.start_time, sessionStatus]);

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

  const canOpenPaymentStep = Boolean(activePaymentScope || pendingPaymentAttempts.length > 0);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white font-plus-jakarta dark:bg-slate-950">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30">
              <User className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate pr-2 text-[15px] font-semibold leading-tight text-slate-950 dark:text-white">
                {session.customer_name || "Customer"}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <p className="truncate pr-1 font-medium text-blue-600 dark:text-blue-300">
                  {session.resource_name || "Unit"}
                </p>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="font-mono">{sessionStartLabel} - {sessionEndLabel}</span>
                {isOutstanding ? (
                  <>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span className="font-semibold text-amber-600">Perlu pelunasan</span>
                  </>
                ) : null}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  {activeStep === "payment" ? "Pembayaran" : "Ringkasan"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {countdownMeta ? (
              <div
                className={cn(
                  "flex min-w-[86px] flex-col items-end rounded-2xl border px-3 py-1.5 text-right transition-all",
                  countdownMeta.tone === "red"
                    ? "border-red-200 bg-red-50"
                    : countdownMeta.tone === "amber"
                    ? "border-amber-200 bg-amber-50"
                    : countdownMeta.tone === "blue"
                    ? "border-blue-200 bg-blue-50"
                    : countdownMeta.tone === "emerald"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.14em]",
                    countdownMeta.tone === "red"
                      ? "text-red-700"
                      : countdownMeta.tone === "amber"
                      ? "text-amber-700"
                      : countdownMeta.tone === "blue"
                      ? "text-blue-700"
                      : countdownMeta.tone === "emerald"
                      ? "text-emerald-700"
                      : "text-slate-500",
                  )}
                >
                  {countdownMeta.label}
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-base font-semibold leading-none sm:text-[1.05rem]",
                    countdownMeta.tone === "red"
                      ? "text-red-700"
                      : countdownMeta.tone === "amber"
                      ? "text-amber-700"
                      : countdownMeta.tone === "blue"
                      ? "text-blue-700"
                      : countdownMeta.tone === "emerald"
                      ? "text-emerald-700"
                      : "text-slate-900 dark:text-white",
                  )}
                >
                  {countdownMeta.value}
                </span>
                <span className="mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {countdownMeta.hint}
                </span>
              </div>
            ) : null}
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

      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-950">
        {(canConfirm || canRecordDeposit || canOverrideDeposit || canStart || canComplete) ? (
          <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-3">
            {canConfirm ? (
              <Button
                onClick={() => void handleStatusUpdate("confirmed")}
                disabled={paymentProcessing}
                className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Konfirmasi
              </Button>
            ) : null}
            {canStart ? (
              <Button
                onClick={() => void handleStatusUpdate("active")}
                disabled={paymentProcessing}
                className="h-11 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Play className="mr-2 h-4 w-4" />
                Mulai sesi
              </Button>
            ) : null}
            {canRecordDeposit ? (
              <Button
                onClick={() => setRecordDepositDialogOpen(true)}
                disabled={paymentProcessing}
                className="h-11 rounded-2xl bg-blue-600 text-white hover:bg-blue-700"
              >
                <ReceiptText className="mr-2 h-4 w-4" />
                Catat DP
              </Button>
            ) : null}
            {canOverrideDeposit ? (
              <Button
                onClick={() => setOverrideDepositDialogOpen(true)}
                disabled={paymentProcessing}
                variant="outline"
                className="h-11 rounded-2xl border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"
              >
                <Clock3 className="mr-2 h-4 w-4" />
                Tanpa DP
              </Button>
            ) : null}
            {canComplete ? (
              <Button
                onClick={() => void handleStatusUpdate("completed")}
                disabled={paymentProcessing}
                className="h-11 rounded-2xl bg-amber-600 text-white hover:bg-amber-700"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Akhiri sesi
              </Button>
            ) : null}
          </div>
        ) : null}

        {depositAmount > 0 && !hasPaidDp && isPreSession && !hasDepositOverride ? (
          <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/[0.08]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
                  DP Booking
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  Rp{formatIDR(depositAmount)}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  DP dipakai sebagai syarat muka sebelum sesi mulai.
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700 shadow-sm dark:bg-white/10 dark:text-blue-200">
                Menunggu DP
              </span>
            </div>
          </div>
        ) : null}

        {hasDepositOverride ? (
          <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
            <span className="font-semibold">Tanpa DP aktif.</span>{" "}
            {session.deposit_override_reason || "Booking jalan tanpa DP dan pelunasan nanti memakai total penuh."}
            {session.deposit_override_by ? ` Disetujui oleh ${session.deposit_override_by}.` : ""}
          </div>
        ) : null}

        {isSessionEditable && canWriteBookings ? (
          <div className="grid grid-cols-3 gap-2">
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
        ) : !hasDepositOverride ? (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
            {canWriteBookings
              ? isOutstanding
                ? "Sesi sudah selesai. Fokus berikutnya adalah pelunasan tagihan."
                : isPreSession
                  ? hasDepositOverride
                    ? "Booking ini jalan tanpa DP."
                    : "Booking belum mulai. Catat DP atau pilih tanpa DP."
                  : "Sesi ini tidak sedang aktif untuk aksi POS langsung."
              : "Akun ini hanya bisa melihat ringkasan sesi. Aksi POS dibatasi."}
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto bg-white pr-1 scrollbar-hide scroll-smooth dark:bg-slate-950">
        <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
          {activeStep === "payment" ? (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-4 dark:border-blue-500/20 dark:bg-blue-500/[0.08]">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Ringkasan pembayaran
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Review total lalu pilih metode bayar.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Billing</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                        Rp{formatIDR(Number(session.grand_total || 0))}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {activePaymentScope === "deposit" ? "DP" : "Sisa tagihan"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                        Rp{formatIDR(activePaymentAmount)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Layanan</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{groupedServices.length} item</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Tambahan</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                        {groupedAddons.length + groupedFnb.length} item
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
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
          )}

          {activeStep === "payment" && (activePaymentScope || pendingPaymentAttempts.length > 0) && (
            <section className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
              <div className="border-b border-slate-100 px-4 py-3 dark:border-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">
                      {activePaymentScope === "deposit" ? "Pembayaran DP" : "Kontrol pembayaran"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {activePaymentScope
                        ? `Pilih metode untuk memproses ${activePaymentLabel.toLowerCase()} langsung dari drawer POS.`
                        : "Review pembayaran manual yang masih antre di panel ini."}
                    </p>
                  </div>
                  {activePaymentScope ? (
                    <Badge className="rounded-full border-none bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                      Rp{formatIDR(activePaymentAmount)}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4 p-4">
                {pendingPaymentAttempts.length > 0 ? (
                  <div className="space-y-3">
                    {pendingPaymentAttempts.map((attempt) => (
                      <PendingPaymentAttemptCard
                        key={attempt.id}
                        attempt={attempt}
                        processing={processingAttemptId === attempt.id}
                        onDecision={(approve) => void handleVerifyAttempt(attempt.id, approve)}
                      />
                    ))}
                  </div>
                ) : null}

                {(canRecordDeposit || canOverrideDeposit) && !hasPendingPaymentReview ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Aksi admin cepat
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Catat DP kalau uang sudah benar-benar diterima, atau pakai override operasional tanpa mengubah pembukuan.
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {canRecordDeposit ? (
                        <Button
                          onClick={() => void handleRecordDeposit()}
                          disabled={paymentProcessing}
                          className="h-11 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <ReceiptText className="mr-2 h-4 w-4" />
                          Catat DP masuk
                        </Button>
                      ) : null}
                      {canOverrideDeposit ? (
                        <Button
                          onClick={() => void handleOverrideDeposit()}
                          disabled={paymentProcessing}
                          variant="outline"
                          className="h-11 rounded-xl border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"
                        >
                          <Clock3 className="mr-2 h-4 w-4" />
                          Mulai tanpa DP
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {hasPendingPaymentReview ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                    Selesaikan review pembayaran manual yang sedang antre dulu. Opsi metode pembayaran lain akan muncul lagi setelah verifikasi selesai atau ditolak.
                  </div>
                ) : null}

                {activePaymentScope && !hasPendingPaymentReview ? (
                  <div className="space-y-4">
                    <PaymentMethodSelector
                      methods={selectablePaymentMethods}
                      selectedCode={selectedPaymentMethodDetail?.code}
                      onSelect={setSelectedPaymentMethod}
                    />
                    <PaymentMethodDetails method={selectedPaymentMethodDetail} />
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Aksi berikutnya
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                            {selectedPaymentMethodDetail?.code === "cash"
                              ? `Terima ${activePaymentLabel} cash`
                              : selectedPaymentMethodDetail?.verification_type === "auto"
                                ? `Lanjutkan ${activePaymentLabel.toLowerCase()} ke gateway`
                                : `Buat transaksi manual ${activePaymentLabel.toLowerCase()}`}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {paymentDisabledReason || "Setelah sukses, status booking akan ikut diperbarui otomatis."}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:w-[280px]">
                          <Button
                            onClick={() => void handleProceedPayment()}
                            disabled={Boolean(paymentDisabledReason || paymentProcessing || !selectedPaymentMethodDetail)}
                            className="h-11 rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
                          >
                            {paymentProcessing
                              ? "Memproses..."
                              : selectedPaymentMethodDetail?.code === "cash"
                                ? `Terima ${activePaymentLabel} cash`
                                : selectedPaymentMethodDetail?.verification_type === "auto"
                                  ? "Lanjut ke gateway"
                                  : "Buat transaksi manual"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => (window.location.href = `/admin/bookings/${session.id}`)}
                            className="h-11 rounded-xl"
                          >
                            Detail booking lengkap
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {activeStep === "summary" ? (
            <>
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
                        {opt.quantity}x @ Rp{formatIDR(opt.unitPrice)}
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
                        {opt.quantity}x @ Rp{formatIDR(opt.unitPrice)}
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
                        {order.quantity}x @ Rp{formatIDR(order.price_at_purchase)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-orange-700 dark:text-orange-300">
                      Rp{formatIDR(order.subtotal)}
                    </span>
                  </div>
                )),
              })}
            </>
          ) : null}
        </div>
      </div>

      {/* 4. STICKY FOOTER SECTION */}
      {(activeStep === "payment" || canOpenPaymentStep || isOutstanding || hasPendingPaymentReview || (isPaymentSettled && canUseReceiptActions)) ? (
      <div className="shrink-0 border-t border-white/5 bg-slate-900 px-4 py-3 text-white shadow-[0_-12px_24px_rgba(0,0,0,0.24)] sm:px-5 sm:py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic leading-none pr-1">
              {isOutstanding ? "Sisa Tagihan" : "Total Billing"}
            </p>
            <p className="flex items-baseline whitespace-nowrap pr-2 text-2xl font-black leading-none tracking-tight sm:text-[2rem]">
              <span className="text-blue-500 text-lg mr-1.5 font-black not-italic">
                Rp
              </span>
              {formatIDR(isOutstanding ? balanceDue : session.grand_total || 0)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeStep === "payment" && !hasPendingPaymentReview ? (
              <Button
                variant="outline"
                onClick={() => setActiveStep("summary")}
                className="h-11 rounded-xl border-white/10 bg-white/10 px-3 text-white hover:bg-white/15 hover:text-white"
              >
                Kembali
              </Button>
            ) : null}
            <Button
              onClick={() => {
                if (activeStep === "summary" && canOpenPaymentStep) {
                  setActiveStep("payment");
                  return;
                }
                if (activePaymentScope && !paymentDisabledReason && selectedPaymentMethodDetail) {
                  void handleProceedPayment();
                  return;
                }
                window.location.href = `/admin/bookings/${session.id}`;
              }}
              disabled={Boolean(activeStep === "payment" && scopePendingAttempt)}
              className="group h-11 gap-2 rounded-xl bg-blue-600 px-4 pr-3 text-xs font-semibold text-white shadow-lg hover:bg-blue-500 sm:h-12 sm:px-6"
            >
              {activeStep === "summary" && canOpenPaymentStep
                ? hasPendingPaymentReview
                  ? "Review pembayaran"
                  : "Lanjutkan ke pembayaran"
                : scopePendingAttempt
                  ? "Menunggu verifikasi"
                  : activePaymentScope && selectedPaymentMethodDetail
                    ? selectedPaymentMethodDetail.code === "cash"
                      ? `Terima ${activePaymentLabel} cash`
                      : selectedPaymentMethodDetail.verification_type === "auto"
                        ? "Lanjut ke gateway"
                        : "Buat transaksi manual"
                    : isOutstanding
                      ? "Buka pelunasan"
                    : isPreSession
                        ? "Buka detail booking"
                        : "Checkout"}
              <ChevronUp className={cn("w-4 h-4 transition-transform", activeStep === "summary" ? "group-hover:-translate-y-0.5" : "group-hover:scale-125")} />
            </Button>
          </div>
        </div>
        {isPaymentSettled && canUseReceiptActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="mt-2 h-10 w-full rounded-xl border-white/10 bg-white/10 text-white hover:bg-white/15 hover:text-white"
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
      ) : null}

      {/* DIALOGS */}
      <Dialog open={recordDepositDialogOpen} onOpenChange={setRecordDepositDialogOpen}>
        <DialogContent className="overflow-hidden rounded-3xl p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-slate-200 px-6 py-5 text-left">
            <DialogTitle>Catat DP masuk</DialogTitle>
            <DialogDescription>
              Pakai ini jika DP{" "}
              <span className="font-semibold text-slate-900">Rp{formatIDR(depositAmount)}</span>{" "}
              sudah benar-benar diterima.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Setelah dicatat, booking tidak lagi menunggu DP.
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900">Catatan admin</label>
              <textarea
                value={recordDepositNotes}
                onChange={(event) => setRecordDepositNotes(event.target.value)}
                className="min-h-[96px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Contoh: DP diterima tunai oleh admin shift pagi."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => setRecordDepositDialogOpen(false)}
              disabled={paymentProcessing}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="rounded-2xl bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => void handleRecordDeposit()}
              disabled={paymentProcessing}
            >
              {paymentProcessing ? "Memproses..." : "Catat DP"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={overrideDepositDialogOpen} onOpenChange={setOverrideDepositDialogOpen}>
        <DialogContent className="overflow-hidden rounded-3xl p-0 sm:max-w-xl">
          <DialogHeader className="border-b border-slate-200 px-6 py-5 text-left">
            <DialogTitle>Jalankan tanpa DP</DialogTitle>
            <DialogDescription>
              Booking ini jalan tanpa DP.{" "}
              <span className="font-semibold text-slate-900">Rp{formatIDR(depositAmount)}</span>{" "}
              tidak dibayar di depan dan pelunasan nanti memakai total penuh.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Tidak ada transaksi DP terpisah setelah ini.
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900">Catatan admin</label>
              <textarea
                value={overrideDepositReason}
                onChange={(event) => setOverrideDepositReason(event.target.value)}
                className="min-h-[96px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Contoh: Booking dijalankan tanpa DP."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => setOverrideDepositDialogOpen(false)}
              disabled={paymentProcessing}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="rounded-2xl bg-amber-500 text-white hover:bg-amber-600"
              onClick={() => void handleOverrideDeposit()}
              disabled={paymentProcessing || !String(overrideDepositReason || "").trim()}
            >
              {paymentProcessing ? "Memproses..." : "Aktifkan tanpa DP"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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

function DirectSaleCatalogDialog({
  open,
  onOpenChange,
  resources,
  currentItems,
  currentTotal,
  onAddItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resources: POSCatalogResource[];
  currentItems: ResolvedPOSSalesOrderItem[];
  currentTotal: number;
  onAddItems: (items: Array<{ item: DirectSaleCatalogEntry; quantity: number }>) => Promise<void>;
}) {
  const [submittingResourceId, setSubmittingResourceId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pickerResourceId, setPickerResourceId] = useState("");
  const [pickerQuantities, setPickerQuantities] = useState<Record<string, number>>({});
  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);
  const filteredResources = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return resources;
    return resources.filter((resource) => {
      const haystacks = [
        resource.resource_name,
        resource.category,
        ...(resource.available_items || []).flatMap((item) => [item.name, item.item_type]),
      ];
      return haystacks
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [resources, search]);
  const pickerResource = useMemo(
    () => resources.find((resource) => resource.resource_id === pickerResourceId) || null,
    [resources, pickerResourceId],
  );
  const pickerItems = useMemo<DirectSaleCatalogEntry[]>(
    () =>
      pickerResource
        ? (pickerResource.available_items || []).map((item) => ({
            ...item,
            resource_id: pickerResource.resource_id,
            resource_name: pickerResource.resource_name,
            resource_image_url: pickerResource.resource_image_url,
            resource_status: pickerResource.status,
          }))
        : [],
    [pickerResource],
  );
  const pickerSelectedCount = useMemo(
    () => Object.values(pickerQuantities).reduce((sum, qty) => sum + Number(qty || 0), 0),
    [pickerQuantities],
  );
  const previewCurrentItems = currentItems.slice(0, 6);
  const currentResourceNames = useMemo(
    () =>
      Array.from(
        new Set(
          currentItems
            .map((item) => item.resource_name)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [currentItems],
  );
  const hasMixedCurrentResources = currentResourceNames.length > 1;
  const updatePickerQuantity = useCallback((itemId: string, delta: number) => {
    setPickerQuantities((prev) => {
      const next = Math.max(0, Number(prev[itemId] || 0) + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return {
        ...prev,
        [itemId]: next,
      };
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setPickerResourceId("");
      setPickerQuantities({});
      setSearch("");
    }
  }, [open]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] w-screen max-w-none rounded-none border-0 p-0 dark:bg-[#0f0f17] sm:h-auto sm:w-[min(1220px,calc(100vw-1rem))] sm:max-w-[1220px] sm:rounded-2xl sm:border sm:border-slate-200 sm:dark:border-white/10">
        <DialogHeader className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4 text-left dark:border-white/10 dark:bg-[#0f0f17]">
          <div className="flex items-center gap-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari katalog atau item..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium outline-none transition focus:border-[var(--bookinaja-500)] focus:ring-4 focus:ring-[color:rgba(59,130,246,0.14)] dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 shrink-0 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <DialogTitle className="sr-only">Tambah item direct sale</DialogTitle>
        </DialogHeader>
        <div className="grid h-[calc(100dvh-81px)] overflow-y-auto sm:max-h-[85vh] sm:h-auto lg:max-h-[82vh] lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.02] lg:min-h-0 lg:overflow-y-auto lg:border-b-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Katalog item
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Browse semua katalog dulu. Tap kartu item untuk pilih varian dan quantity.
                </p>
              </div>
              <Badge className="rounded-full border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                {filteredResources.length} katalog
              </Badge>
            </div>

            {filteredResources.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredResources.map((resource) => {
                  const itemCount = Number(resource.available_items?.length || 0);
                  const lowestPrice = Math.min(
                    ...((resource.available_items || []).map((item) => Number(item.price || 0)).length
                      ? (resource.available_items || []).map((item) => Number(item.price || 0))
                      : [0]),
                  );
                  return (
                  <button
                    key={resource.resource_id}
                    type="button"
                    onClick={() => {
                      setPickerResourceId(resource.resource_id);
                      setPickerQuantities({});
                    }}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-colors hover:border-[var(--bookinaja-300)] hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-white/[0.04]">
                      {resource.resource_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resource.resource_image_url}
                          alt={resource.resource_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[var(--bookinaja-600)]">
                          <Package className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {resource.resource_name}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{itemCount} varian</span>
                        <span>mulai Rp{formatIDR(lowestPrice)}</span>
                      </div>
                    </div>
                  </button>
                )})}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                Tidak ada item yang cocok dengan pencarian ini.
              </div>
            )}
          </div>

          <aside className="border-t border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f17] lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Cart
                </p>
                <div className="flex items-center gap-2">
                  {hasMixedCurrentResources ? (
                    <Badge className="rounded-full bg-blue-50 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                      {currentResourceNames.length} resource
                    </Badge>
                  ) : null}
                  {currentItems.length > previewCurrentItems.length ? (
                    <Badge className="rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {currentItems.length} baris
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {previewCurrentItems.length > 0 ? (
                  previewCurrentItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {hasMixedCurrentResources ? (
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                              {item.resource_name}
                            </p>
                          ) : null}
                          <p className="line-clamp-1 text-sm font-semibold text-slate-950 dark:text-white">
                            {item.item_name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {item.quantity}x @ Rp{formatIDR(Number(item.unit_price || 0))}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Rp{formatIDR(Number(item.subtotal || 0))}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                    Cart masih kosong.
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 mt-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-white/10 dark:bg-[#0f0f17]/95">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Total transaksi
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white sm:text-3xl">
                    Rp{formatIDR(currentTotal)}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="h-11 shrink-0 rounded-xl bg-[var(--bookinaja-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--bookinaja-700)]"
                >
                  Selesai
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={open && Boolean(pickerResource)} onOpenChange={(nextOpen) => {
      if (!nextOpen) {
        setPickerResourceId("");
        setPickerQuantities({});
      }
    }}>
      <DialogContent className="w-[min(720px,calc(100vw-1rem))] max-w-none rounded-2xl border-slate-200 p-0 dark:border-white/10 dark:bg-[#0f0f17]">
        <DialogHeader className="border-b border-slate-200 px-5 py-4 text-left dark:border-white/10">
          <DialogTitle className="text-base font-semibold text-slate-950 dark:text-white">
            {pickerResource?.resource_name || "Pilih item"}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Pilih varian utama dan atur quantity dengan stepper.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[75vh] overflow-y-auto p-4 sm:p-5">
          {pickerItems.length > 0 ? (
            <div className="space-y-2">
              {pickerItems.map((item) => {
                const quantity = Number(pickerQuantities[item.id] || 0);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]",
                      quantity > 0 &&
                        "border-[var(--bookinaja-400)] ring-2 ring-[color:rgba(59,130,246,0.12)]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                          {item.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Rp{formatIDR(Number(item.price || 0))} / {item.price_unit || "pcs"}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1 py-1 dark:border-white/10 dark:bg-white/[0.03]">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => updatePickerQuantity(item.id, -1)}
                          disabled={quantity === 0}
                          className="h-8 w-8 rounded-full"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="w-8 text-center text-sm font-semibold text-slate-950 dark:text-white">
                          {quantity}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => updatePickerQuantity(item.id, 1)}
                          className="h-8 w-8 rounded-full"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
              Katalog ini belum punya item direct sale yang bisa dijual.
            </div>
          )}
        </div>
        <div className="border-t border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#0f0f17]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Item dipilih
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                {pickerSelectedCount} item
              </div>
            </div>
            <Button
              type="button"
              onClick={async () => {
                const selected = pickerItems
                  .map((item) => ({ item, quantity: Number(pickerQuantities[item.id] || 0) }))
                  .filter((entry) => entry.quantity > 0);
                if (selected.length === 0) {
                  setPickerResourceId("");
                  return;
                }
                try {
                  setSubmittingResourceId(pickerResourceId || "picker");
                  await onAddItems(selected);
                  setPickerResourceId("");
                  setPickerQuantities({});
                } finally {
                  setSubmittingResourceId(null);
                }
              }}
              disabled={Boolean(submittingResourceId)}
              className="h-11 rounded-xl bg-[var(--bookinaja-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--bookinaja-700)]"
            >
              {submittingResourceId ? "Menyimpan..." : "Simpan pilihan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

function DirectSaleControlHub({
  order,
  posCatalog,
  onRefresh,
  canWriteBookings,
  canSettleCash,
  onClose,
}: {
  order: POSSalesOrderDetail;
  posCatalog?: POSCatalogResource[];
  onRefresh: (kind: "booking" | "sales_order", id: string) => Promise<void>;
  canWriteBookings: boolean;
  canSettleCash: boolean;
  onClose?: () => void;
}) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("midtrans");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [processingAttemptId, setProcessingAttemptId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<"summary" | "payment">("summary");
  const { midtransReady, waitForSnap } = useMidtransSnap();
  const directSaleResources = useMemo(
    () =>
      (posCatalog || []).filter((entry) =>
        ["direct_sale", "hybrid"].includes(String(entry.operating_mode || "").toLowerCase()),
      ),
    [posCatalog],
  );
  const catalogItems = useMemo<DirectSaleCatalogEntry[]>(
    () =>
      directSaleResources
        .flatMap((entry) =>
          (entry.available_items || []).map((item) => ({
            ...item,
            resource_id: entry.resource_id,
            resource_name: entry.resource_name,
            resource_image_url: entry.resource_image_url,
            resource_status: entry.status,
          })),
        ),
    [directSaleResources],
  );
  const resourceItemLookup = useMemo(
    () =>
      new Map(
        catalogItems.map((item) => [
          item.id,
          {
            resource_id: item.resource_id,
            resource_name: item.resource_name,
          },
        ]),
      ),
    [catalogItems],
  );
  const status = String(order.status || "").toLowerCase();
  const paymentStatus = String(order.payment_status || "").toLowerCase();
  const balanceDue = Number(order.balance_due || 0);
  const resolvedOrderItems = useMemo(
    () =>
      (order.items || []).map((item) => {
        const resolved = item.resource_item_id
          ? resourceItemLookup.get(item.resource_item_id)
          : undefined;
        return {
          ...item,
          resource_name:
            resolved?.resource_name ||
            order.resource_name ||
            "Resource direct sale",
        };
      }),
    [order.items, order.resource_name, resourceItemLookup],
  );
  const resourceNames = useMemo(
    () =>
      Array.from(
        new Set(
          resolvedOrderItems
            .map((item) => item.resource_name)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [resolvedOrderItems],
  );
  const hasMixedResources = resourceNames.length > 1;
  const itemCount = resolvedOrderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const previewOrderItems = resolvedOrderItems.slice(0, 3);
  const paymentMethods = (order.payment_methods || []).filter((item) => item.is_active !== false);
  const selectablePaymentMethods = useMemo(
    () => paymentMethods.filter((item) => canSettleCash || item.code !== "cash"),
    [paymentMethods, canSettleCash],
  );
  const pendingPaymentAttempts = (order.payment_attempts || []).filter(
    (item) => item.status === "submitted" || item.status === "awaiting_verification",
  );
  const hasPendingPaymentReview = pendingPaymentAttempts.length > 0;
  const canEdit = canWriteBookings && !["completed", "cancelled", "paid"].includes(status);
  const canClose = canWriteBookings && !["completed", "cancelled"].includes(status) && balanceDue <= 0;
  const canMarkPending = canWriteBookings && status === "open" && itemCount > 0;
  const canProcessPayment = canWriteBookings && !["completed", "cancelled"].includes(status) && balanceDue > 0;
  const canOpenPaymentStep = Boolean(canProcessPayment || pendingPaymentAttempts.length > 0);

  useEffect(() => {
    if (selectablePaymentMethods.length === 0) return;
    if (!selectablePaymentMethods.find((item) => item.code === selectedPaymentMethod)) {
      setSelectedPaymentMethod(selectablePaymentMethods[0].code);
    }
  }, [selectablePaymentMethods, selectedPaymentMethod]);

  useEffect(() => {
    if (hasPendingPaymentReview && activeStep !== "payment") {
      setActiveStep("payment");
    }
  }, [activeStep, hasPendingPaymentReview]);

  const selectedPaymentMethodDetail =
    selectablePaymentMethods.find((item) => item.code === selectedPaymentMethod) ||
    selectablePaymentMethods[0];
  const paymentDisabledReason = pendingPaymentAttempts.length > 0
    ? "Selesaikan review pembayaran manual yang sedang antre terlebih dulu."
    : !canProcessPayment
      ? "Transaksi ini belum butuh aksi pembayaran."
      : selectablePaymentMethods.length === 0
        ? "Belum ada metode pembayaran aktif untuk tenant ini."
        : selectedPaymentMethodDetail?.verification_type === "auto" && !midtransReady
          ? "Gateway pembayaran belum siap dimuat."
          : "";

  const handleMarkPending = async () => {
    try {
      setBusy(true);
      await api.post(`/sales-orders/${order.id}/checkout`, {
        payment_method: order.payment_method || "",
        notes: order.notes || "",
      });
      await onRefresh("sales_order", order.id);
      toast.success("Transaksi dipindahkan ke status menunggu pembayaran");
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Checkout transaksi gagal");
    } finally {
      setBusy(false);
    }
  };

  const handleProceedPayment = async () => {
    if (!selectedPaymentMethodDetail || !canProcessPayment) return;
    try {
      setPaymentProcessing(true);
      if (selectedPaymentMethodDetail.code === "cash") {
        await api.post(`/sales-orders/${order.id}/settle-cash`, {
          payment_method: "cash",
          notes: order.notes || "",
        });
        toast.success("Pembayaran cash berhasil dicatat");
        await onRefresh("sales_order", order.id);
        return;
      }

      if (selectedPaymentMethodDetail.verification_type === "auto") {
        const snap = await waitForSnap();
        if (!snap) {
          toast.error("Gateway belum siap");
          return;
        }
        const res = await api.post(`/sales-orders/${order.id}/payment-checkout`, {
          method: selectedPaymentMethodDetail.code,
        });
        snap.pay(res.data.snap_token, {
          onSuccess: () => {
            toast.success("Pelunasan berhasil");
            void onRefresh("sales_order", order.id);
          },
          onPending: () => toast.message("Pembayaran menunggu konfirmasi"),
          onError: () => toast.error("Pembayaran gagal"),
          onClose: () => void onRefresh("sales_order", order.id),
        });
        return;
      }

      const res = await api.post(`/sales-orders/${order.id}/manual-payment`, {
        method: selectedPaymentMethodDetail.code,
        note: "",
        proof_url: "",
      });
      toast.success(`Transaksi manual dibuat (${res.data.reference})`);
      await onRefresh("sales_order", order.id);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal memproses pembayaran");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleVerifyAttempt = async (attemptID: string, approve: boolean) => {
    try {
      setProcessingAttemptId(attemptID);
      await api.post(`/sales-orders/payment-attempts/${attemptID}/${approve ? "verify" : "reject"}`, {
        notes: "",
      });
      toast.success(approve ? "Pembayaran manual diverifikasi" : "Pembayaran manual ditolak");
      await onRefresh("sales_order", order.id);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal memproses verifikasi");
    } finally {
      setProcessingAttemptId(null);
    }
  };

  const handleCloseOrder = async () => {
    try {
      setBusy(true);
      await api.post(`/sales-orders/${order.id}/close`);
      await onRefresh("sales_order", order.id);
      toast.success("Transaksi direct sale ditutup");
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal menutup transaksi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white font-plus-jakarta dark:bg-slate-950">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge className="rounded-full border-none bg-[var(--bookinaja-600)] text-white">
                Direct sale
              </Badge>
              <Badge className="rounded-full border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                {order.status || "open"}
              </Badge>
              {hasMixedResources ? (
                <Badge className="rounded-full border-none bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                  {resourceNames.length} resource
                </Badge>
              ) : null}
            </div>
            <h2 className="mt-3 truncate text-base font-semibold text-slate-950 dark:text-white">
              {hasMixedResources
                ? "Direct sale multi-resource"
                : order.resource_name || "Resource direct sale"}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {order.customer_name || "Walk-in order"} · {paymentStatus || "unpaid"} ·{" "}
              {activeStep === "payment" ? "Tahap 2: Pembayaran" : "Tahap 1: Ringkasan"}
            </p>
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

      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {activeStep === "payment" ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-500/[0.08]">
            <div className="flex items-start gap-3">
              <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">Ringkasan transaksi</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Review item dan nominal akhir, lalu lanjutkan ke metode pembayaran.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Total item</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{itemCount}</p>
                  </div>
                  <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Resource</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{resourceNames.length}</p>
                  </div>
                  <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Total transaksi</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                      Rp{formatIDR(Number(order.grand_total || 0))}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Sisa tagihan</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                      Rp{formatIDR(balanceDue)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-white/70 bg-white/80 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Preview item</p>
                    {resolvedOrderItems.length > previewOrderItems.length ? (
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        +{resolvedOrderItems.length - previewOrderItems.length} item lagi
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 space-y-2">
                    {previewOrderItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-white/[0.03]"
                      >
                        <div className="min-w-0">
                          {hasMixedResources ? (
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                              {item.resource_name}
                            </p>
                          ) : null}
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.item_name}</p>
                        </div>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Rp{formatIDR(Number(item.subtotal || 0))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total item</div>
                <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{itemCount}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Sisa tagihan</div>
                <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                  Rp{formatIDR(balanceDue)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/5">
                <div>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">Line items</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {hasMixedResources
                      ? "Setiap item menampilkan resource asalnya."
                      : "Item jual yang masuk ke transaksi direct sale ini."}
                  </div>
                </div>
                {canEdit ? (
                  <Button
                    onClick={() => setCatalogOpen(true)}
                    className="h-9 rounded-lg bg-[var(--bookinaja-600)] px-3 text-xs font-semibold text-white hover:bg-[var(--bookinaja-700)]"
                  >
                    Tambah item
                  </Button>
                ) : null}
              </div>
              <div className="space-y-2 p-4">
                {resolvedOrderItems.length > 0 ? (
                  resolvedOrderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3 dark:bg-white/[0.03]"
                    >
                      <div className="min-w-0">
                        {hasMixedResources ? (
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                            {item.resource_name}
                          </p>
                        ) : null}
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {item.item_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {item.quantity}x @ Rp{formatIDR(Number(item.unit_price || 0))}
                        </p>
                      </div>
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">
                        Rp{formatIDR(Number(item.subtotal || 0))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                    Belum ada item. Tambahkan item direct sale ke transaksi ini.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeStep === "payment" ? (
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
            <div className="border-b border-slate-100 px-4 py-3 dark:border-white/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">Kontrol pembayaran</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Direct sale memakai flow yang sama: cash, gateway, atau manual review.
                  </div>
                </div>
                <Badge className="rounded-full border-none bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                  Rp{formatIDR(balanceDue)}
                </Badge>
              </div>
            </div>

            <div className="space-y-4 p-4">
              {pendingPaymentAttempts.length > 0 ? (
                <div className="space-y-3">
                  {pendingPaymentAttempts.map((attempt) => (
                    <PendingPaymentAttemptCard
                      key={attempt.id}
                      attempt={attempt}
                      processing={processingAttemptId === attempt.id}
                      onDecision={(approve) => void handleVerifyAttempt(attempt.id, approve)}
                    />
                  ))}
                </div>
              ) : null}

              {hasPendingPaymentReview ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                  Ada pembayaran manual yang sedang menunggu review admin. Selesaikan verifikasi atau penolakan dulu sebelum membuka metode pembayaran lain.
                </div>
              ) : canProcessPayment ? (
                <div className="space-y-4">
                  <PaymentMethodSelector
                    methods={selectablePaymentMethods}
                    selectedCode={selectedPaymentMethodDetail?.code}
                    onSelect={setSelectedPaymentMethod}
                  />
                  <PaymentMethodDetails method={selectedPaymentMethodDetail} />
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Aksi berikutnya
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                          {selectedPaymentMethodDetail?.code === "cash"
                            ? "Terima pembayaran cash"
                            : selectedPaymentMethodDetail?.verification_type === "auto"
                              ? "Lanjutkan ke gateway"
                              : "Buat transaksi manual"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {paymentDisabledReason || "Setelah lunas, transaksi bisa langsung ditutup dari drawer ini."}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:w-[280px]">
                        <Button
                          onClick={() => void handleProceedPayment()}
                          disabled={Boolean(paymentDisabledReason || paymentProcessing || !selectedPaymentMethodDetail)}
                          className="h-11 rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
                        >
                          {paymentProcessing
                            ? "Memproses..."
                            : selectedPaymentMethodDetail?.code === "cash"
                              ? "Terima cash"
                              : selectedPaymentMethodDetail?.verification_type === "auto"
                                ? "Lanjut ke gateway"
                                : "Buat transaksi manual"}
                        </Button>
                        {canMarkPending ? (
                          <Button
                            variant="outline"
                            onClick={() => void handleMarkPending()}
                            disabled={busy}
                            className="h-11 rounded-xl"
                          >
                            Tandai pending
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : canClose ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-4 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                  Tagihan sudah lunas. Tutup transaksi untuk mengeluarkannya dari action desk.
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                  Tambah item atau review status transaksi dari panel ini.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-white/5 bg-slate-900 p-4 text-white sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Total transaksi
            </p>
            <p className="mt-1 text-2xl font-semibold">
              <span className="mr-1 text-base text-blue-400">Rp</span>
              {formatIDR(Number(order.grand_total || 0))}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeStep === "payment" && !hasPendingPaymentReview ? (
              <Button
                variant="outline"
                onClick={() => setActiveStep("summary")}
                className="h-11 rounded-xl border-white/10 bg-white/10 px-3 text-white hover:bg-white/15 hover:text-white"
              >
                Kembali
              </Button>
            ) : null}
            {canMarkPending ? (
              <Button
                variant="outline"
                onClick={() => void handleMarkPending()}
                className="h-11 rounded-xl border-white/10 bg-white/10 px-3 text-white hover:bg-white/15 hover:text-white"
                disabled={busy}
              >
                Tandai pending
              </Button>
            ) : null}
            <Button
              onClick={() => {
                if (activeStep === "summary" && canOpenPaymentStep) {
                  setActiveStep("payment");
                  return;
                }
                if (canClose) {
                  void handleCloseOrder();
                  return;
                }
                if (canProcessPayment && !paymentDisabledReason && selectedPaymentMethodDetail) {
                  void handleProceedPayment();
                }
              }}
              disabled={Boolean(
                busy ||
                  paymentProcessing ||
                  (activeStep === "summary"
                    ? !canOpenPaymentStep && !canClose
                    : !canClose && (!canProcessPayment || (!!paymentDisabledReason && !hasPendingPaymentReview) || !selectedPaymentMethodDetail)),
              )}
              className="h-11 rounded-xl bg-[var(--bookinaja-600)] px-4 text-sm font-semibold text-white hover:bg-[var(--bookinaja-700)]"
            >
              {busy || paymentProcessing
                ? "Memproses..."
                : activeStep === "summary" && canOpenPaymentStep
                  ? hasPendingPaymentReview
                    ? "Review pembayaran"
                    : "Lanjutkan ke pembayaran"
                  : canClose
                    ? "Tutup transaksi"
                    : selectedPaymentMethodDetail?.code === "cash"
                      ? "Terima cash"
                      : selectedPaymentMethodDetail?.verification_type === "auto"
                        ? "Lanjut ke gateway"
                        : "Buat transaksi manual"}
            </Button>
          </div>
        </div>
      </div>

      <DirectSaleCatalogDialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        resources={directSaleResources}
        currentItems={resolvedOrderItems}
        currentTotal={Number(order.grand_total || 0)}
        onAddItems={async (items) => {
          try {
            for (const entry of items) {
              await api.post(`/sales-orders/${order.id}/items`, {
                resource_item_id: entry.item.id,
                quantity: entry.quantity,
              });
            }
            await onRefresh("sales_order", order.id);
            toast.success(`${items.length} pilihan ditambahkan ke transaksi`);
          } catch (error) {
            const err = error as { response?: { data?: { error?: string } } };
            toast.error(err.response?.data?.error || "Gagal menambahkan item");
          }
        }}
      />
    </div>
  );
}

export function POSControlHub({
  action,
  menuItems,
  posCatalog,
  onRefresh,
  canWriteBookings,
  canConfirmBookings,
  canStartSessions,
  canCompleteSessions,
  canSettleCash,
  canManageFnb,
  canUseReceiptActions,
  onClose,
}: POSControlHubProps) {
  if (action.kind === "sales_order") {
    return (
      <DirectSaleControlHub
        order={action.data}
        posCatalog={posCatalog}
        onRefresh={onRefresh}
        canWriteBookings={canWriteBookings}
        canSettleCash={canSettleCash}
        onClose={onClose}
      />
    );
  }

  return (
    <TimedBookingControlHub
      session={action.data}
      menuItems={menuItems}
      onRefresh={onRefresh}
      canWriteBookings={canWriteBookings}
      canConfirmBookings={canConfirmBookings}
      canStartSessions={canStartSessions}
      canCompleteSessions={canCompleteSessions}
      canSettleCash={canSettleCash}
      canManageFnb={canManageFnb}
      canUseReceiptActions={canUseReceiptActions}
      onClose={onClose}
    />
  );
}

function getTimeZoneParts(date: Date, timezone = "Asia/Jakarta") {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || "0");

  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
    second: pick("second"),
  };
}

function toTenantWallClock(dateValue: string, timezone = "Asia/Jakarta") {
  const parts = getTimeZoneParts(new Date(dateValue), timezone);
  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0,
  );
}

function formatTenantTime(
  dateValue: string,
  timezone = "Asia/Jakarta",
  pattern = "HH:mm",
) {
  return format(toTenantWallClock(dateValue, timezone), pattern);
}
