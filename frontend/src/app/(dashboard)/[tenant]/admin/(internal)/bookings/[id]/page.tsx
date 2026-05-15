"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
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
  MessageCircle,
  Printer,
  ExternalLink,
  ImageIcon,
  type LucideIcon,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BookingDetailSkeleton } from "@/components/dashboard/booking-detail-skeleton";
import { hasPermission, isOwner } from "@/lib/admin-access";
import { RealtimePill } from "@/components/dashboard/realtime-pill";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import {
  isReceiptProEnabled,
  printReceiptBluetooth,
  type ReceiptSettings,
} from "@/lib/receipt";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { tenantBookingChannel } from "@/lib/realtime/channels";
import {
  BOOKING_EVENT_PREFIXES,
  type RealtimeEvent,
  matchesRealtimePrefix,
} from "@/lib/realtime/event-types";

type BookingOption = {
  id?: string;
  item_name?: string;
  item_type?: string;
  quantity?: number;
  unit_price?: number;
  price_at_booking?: number;
  totalPrice?: number;
  displayUnitPrice?: number;
};

type BookingOrder = {
  fnb_item_id?: string;
  item_name?: string;
  quantity?: number;
  price_at_purchase?: number;
  subtotal?: number;
};

type BookingEvent = {
  id: string;
  actor_user_id?: string;
  actor_type?: string;
  actor_name?: string;
  actor_email?: string;
  actor_role?: string;
  event_type?: string;
  title?: string;
  description?: string;
  created_at?: string;
};

type BookingPaymentMethod = {
  code: string;
  display_name: string;
  verification_type: string;
  instructions?: string;
};

type BookingPaymentAttempt = {
  id: string;
  method_code: string;
  method_label: string;
  payment_scope: string;
  status: string;
  reference_code: string;
  amount?: number;
  proof_url?: string;
  payer_note?: string;
  admin_note?: string;
  submitted_at?: string;
  verified_at?: string;
};

type BookingDetail = {
  id: string;
  status?: string;
  payment_status?: string;
  deposit_override_active?: boolean;
  deposit_override_reason?: string;
  deposit_override_by?: string;
  deposit_override_at?: string;
  customer_name?: string;
  customer_phone?: string;
  resource_name?: string;
  start_time: string;
  end_time: string;
  promo_code?: string;
  original_grand_total?: number;
  discount_amount?: number;
  grand_total?: number;
  deposit_amount?: number;
  paid_amount?: number;
  balance_due?: number;
  total_fnb?: number;
  access_token?: string;
  payment_methods?: BookingPaymentMethod[];
  payment_attempts?: BookingPaymentAttempt[];
  options?: BookingOption[];
  orders?: BookingOrder[];
  events?: BookingEvent[];
};

function patchBookingDetailFromEvent(
  current: BookingDetail | null,
  event: RealtimeEvent,
) {
  const bookingID = String(event.refs?.booking_id || event.entity_id || "");
  if (!current || !bookingID || current.id !== bookingID) return current;

  return {
    ...current,
    status: String(event.summary?.status ?? current.status ?? ""),
    payment_status: String(
      event.summary?.payment_status ?? current.payment_status ?? "",
    ),
    resource_name: String(
      event.summary?.resource_name ?? current.resource_name ?? "",
    ),
    customer_name: String(
      event.summary?.customer_name ?? current.customer_name ?? "",
    ),
    start_time: String(event.summary?.start_time ?? current.start_time),
    end_time: String(event.summary?.end_time ?? current.end_time),
    grand_total:
      typeof event.summary?.grand_total === "number"
        ? Number(event.summary.grand_total)
        : current.grand_total,
    balance_due:
      typeof event.summary?.balance_due === "number"
        ? Number(event.summary.balance_due)
        : current.balance_due,
    deposit_override_active:
      typeof event.summary?.deposit_override_active === "boolean"
        ? Boolean(event.summary.deposit_override_active)
        : current.deposit_override_active,
    deposit_override_reason: String(
      event.summary?.deposit_override_reason ?? current.deposit_override_reason ?? "",
    ),
    deposit_override_by: String(
      event.summary?.deposit_override_by ?? current.deposit_override_by ?? "",
    ),
    deposit_override_at: String(
      event.summary?.deposit_override_at ?? current.deposit_override_at ?? "",
    ),
  };
}

function actorLabel(event: BookingEvent) {
  const name = String(event.actor_name || "").trim();
  const role = String(event.actor_role || "").trim();
  const actorType = String(event.actor_type || "").trim();

  if (name && role) return `${name} | ${role}`;
  if (name) return name;
  if (actorType === "admin") return "Tim admin";
  if (actorType === "customer") return "Customer";
  if (actorType === "payment") return "Payment gateway";
  if (actorType === "system") return "Sistem";
  return actorType || "Sistem";
}

function safeDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatShortDate(value?: string | null) {
  const parsed = safeDate(value);
  if (!parsed) return "-";
  return format(parsed, "dd MMM yyyy", { locale: localeID });
}

function formatShortTime(value?: string | null) {
  const parsed = safeDate(value);
  if (!parsed) return "-";
  return format(parsed, "HH:mm");
}

function adminSessionStatusMeta(status?: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active" || normalized === "ongoing") {
    return { label: "Sedang Berjalan", className: "bg-emerald-500 text-white" };
  }
  if (normalized === "completed") {
    return { label: "Selesai", className: "bg-slate-950 text-white dark:bg-white/15" };
  }
  if (normalized === "confirmed") {
    return { label: "Siap Mulai", className: "bg-blue-600 text-white" };
  }
  if (normalized === "cancelled") {
    return { label: "Dibatalkan", className: "bg-red-500 text-white" };
  }
  return { label: "Menunggu", className: "bg-amber-500 text-white" };
}

function adminPaymentStatusMeta(status?: string, balanceDue?: number, hasDepositOverride?: boolean) {
  const normalized = String(status || "").toLowerCase();
  const remaining = Number(balanceDue || 0);
  if (normalized === "settled" || (normalized === "paid" && remaining === 0)) {
    return { label: "Lunas", className: "bg-emerald-500 text-white" };
  }
  if (normalized === "partial_paid" || normalized === "paid") {
    return { label: "DP Masuk", className: "bg-blue-600 text-white" };
  }
  if (normalized === "awaiting_verification") {
    return { label: "Menunggu Verifikasi", className: "bg-amber-500 text-white" };
  }
  if (normalized === "expired") {
    return { label: "Kadaluarsa", className: "bg-red-500 text-white" };
  }
  if (normalized === "failed") {
    return { label: "Gagal", className: "bg-red-500 text-white" };
  }
  if (hasDepositOverride) {
    return { label: "Tanpa DP", className: "bg-amber-500 text-white" };
  }
  return {
    label: "Menunggu Pembayaran",
    className: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200",
  };
}

type AdminControlCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  tone?: "neutral" | "primary" | "success" | "dark";
};

function AdminControlCard({
  title,
  description,
  icon: Icon,
  onClick,
  disabled,
  className,
  tone = "neutral",
}: AdminControlCardProps) {
  const toneClass =
    tone === "primary"
      ? "border-blue-200 bg-blue-50 text-slate-950 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-white"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-400/20"
        : tone === "dark"
          ? "border-slate-900 bg-slate-950 text-white hover:bg-slate-800 dark:border-white/10"
          : "border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-[#111827] dark:text-white dark:hover:bg-[#172033]";

  const iconToneClass =
    tone === "success"
      ? "bg-white/16 text-white ring-1 ring-white/15"
      : tone === "dark"
        ? "bg-white/10 text-white ring-1 ring-white/10"
        : tone === "primary"
          ? "bg-blue-600 text-white ring-1 ring-blue-500/20"
          : "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-white/10 dark:text-white dark:ring-white/10";

  const descriptionClass =
    tone === "success" || tone === "dark"
      ? "text-white/78"
      : "text-slate-500 dark:text-slate-400";

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group h-auto min-h-[96px] flex-col items-stretch justify-start rounded-xl border px-0 py-0 text-left shadow-sm transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-55",
        toneClass,
        className,
      )}
    >
      <div className="flex h-full flex-col justify-between gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              iconToneClass,
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.16em]",
              tone === "success" || tone === "dark"
                ? "text-white/65"
                : "text-slate-400 dark:text-slate-500",
            )}
          >
            Kontrol
          </span>
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">{title}</div>
          <p className={cn("mt-2 text-xs leading-5", descriptionClass)}>
            {description}
          </p>
        </div>
      </div>
    </Button>
  );
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: adminUser } = useAdminSession();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [attemptNotes, setAttemptNotes] = useState<Record<string, string>>({});
  const [processingAttemptId, setProcessingAttemptId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);
  const lastRealtimeToastRef = useRef("");

  const fetchDetail = useCallback(async (mode: "initial" | "background" = "initial") => {
    const background = mode === "background" && hasLoadedRef.current;
    try {
      if (background) {
        setRefreshing(true);
      }
      const res = await api.get(`/bookings/${params.id}`);
      setBooking(res.data);
      hasLoadedRef.current = true;
    } catch {
      if (!background) {
        toast.error("Gagal memuat detail reservasi");
      }
    } finally {
      if (background) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [params.id]);

  useEffect(() => {
    void fetchDetail("initial");
    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [fetchDetail]);

  const scheduleDetailRefresh = useCallback(
    (delay = 300) => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;
        void fetchDetail("background");
      }, delay);
    },
    [fetchDetail],
  );

  const tenantId = adminUser?.tenant_id || "";

  const { connected: realtimeConnected, status: realtimeStatus } = useRealtime({
    enabled: Boolean(tenantId && params.id),
    channels:
      tenantId && params.id
        ? [tenantBookingChannel(tenantId, String(params.id))]
        : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      setBooking((current) => patchBookingDetailFromEvent(current, event));

      const eventKey = `${event.type}:${event.entity_id || ""}:${event.occurred_at || ""}`;
      if (lastRealtimeToastRef.current !== eventKey) {
        lastRealtimeToastRef.current = eventKey;
        if (event.type === "payment.awaiting_verification") {
          toast.message("Ada pembayaran manual menunggu verifikasi");
        } else if (event.type === "payment.dp.paid") {
          toast.success("DP booking sudah diterima");
        } else if (
          event.type === "payment.settlement.paid" ||
          event.type === "payment.cash.settled"
        ) {
          toast.success("Pelunasan booking berhasil");
        } else if (event.type === "payment.manual.rejected") {
          toast.error("Pembayaran manual ditolak");
        } else if (event.type === "session.activated") {
          toast.success("Sesi berhasil dimulai");
        } else if (event.type === "session.completed") {
          toast.message("Sesi sudah selesai");
        } else if (event.type === "order.fnb.added") {
          toast.message("Pesanan F&B bertambah");
        } else if (event.type === "order.addon.added") {
          toast.message("Add-on berhasil ditambahkan");
        }
      }
      scheduleDetailRefresh(150);
    },
    onReconnect: () => {
      scheduleDetailRefresh(150);
    },
  });

  useEffect(() => {
    if (!isOwner(adminUser)) return;

    api
      .get("/admin/receipt-settings")
      .then((res) => setReceiptSettings(res.data || null))
      .catch(() => setReceiptSettings(null));
  }, [adminUser]);

  const groupedOptions = useMemo(() => {
    if (!booking?.options) return [];
    const groups = booking.options.reduce<Record<string, BookingOption>>((acc, item) => {
      const key = `${String(item.item_name || "").trim().toLowerCase()}::${item.item_type || ""}`;
      if (!acc[key]) {
        acc[key] = {
          ...item,
          quantity: Number(item.quantity || 0),
          totalPrice: Number(item.price_at_booking || 0),
        };
      } else {
        acc[key] = {
          ...acc[key],
          quantity: Number(acc[key].quantity || 0) + Number(item.quantity || 0),
          totalPrice: Number(acc[key].totalPrice || 0) + Number(item.price_at_booking || 0),
        };
      }
      return acc;
    }, {});

    return Object.values(groups).map((item) => ({
      ...item,
      displayUnitPrice:
        item.unit_price || Number(item.totalPrice || 0) / Math.max(item.quantity || 1, 1),
    }));
  }, [booking?.options]);

  const groupedOrders = useMemo(() => {
    if (!booking?.orders) return [];
    const groups = booking.orders.reduce<Record<string, BookingOrder>>((acc, item) => {
      const key = String(item.item_name || "").trim().toLowerCase();
      if (!acc[key]) {
        acc[key] = {
          ...item,
          quantity: Number(item.quantity || 0),
          subtotal: Number(item.subtotal || 0),
        };
      }
      else {
        acc[key] = {
          ...acc[key],
          quantity: Number(acc[key].quantity || 0) + Number(item.quantity || 0),
          subtotal: Number(acc[key].subtotal || 0) + Number(item.subtotal || 0),
        };
      }
      return acc;
    }, {});
    return Object.values(groups);
  }, [booking?.orders]);

  const mainOptions = useMemo(
    () => groupedOptions.filter((item) => item.item_type === "main_option"),
    [groupedOptions],
  );

  const addonOptions = useMemo(
    () => groupedOptions.filter((item) => item.item_type !== "main_option"),
    [groupedOptions],
  );

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      await api.put(`/bookings/${params.id}/status`, { status: newStatus });
      toast.success(`STATUS UPDATED: ${newStatus.toUpperCase()}`);
      fetchDetail();
    } catch {
      toast.error("Gagal memperbarui status");
    } finally {
      setUpdating(false);
    }
  };

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);
  const pendingManualAttempts =
    (booking?.payment_attempts || []).filter(
      (item) => item.status === "submitted" || item.status === "awaiting_verification",
    );
  const [recordDepositDialogOpen, setRecordDepositDialogOpen] = useState(false);
  const [overrideDepositDialogOpen, setOverrideDepositDialogOpen] = useState(false);
  const [recordDepositNotes, setRecordDepositNotes] = useState("DP diterima langsung oleh admin.");
  const [overrideDepositReason, setOverrideDepositReason] = useState(
    "Booking dijalankan tanpa DP.",
  );
  const hasPendingManualVerification = pendingManualAttempts.length > 0;
  const isPaymentSettled =
    booking?.payment_status === "settled" ||
    (booking?.payment_status === "paid" && Number(booking?.balance_due || 0) === 0);
  const status = String(booking?.status || "").toLowerCase();
  const paymentStatus = String(booking?.payment_status || "").toLowerCase();
  const hasDepositOverride = Boolean(booking?.deposit_override_active);
  const sessionStatusMeta = adminSessionStatusMeta(status);
  const paymentStatusMeta = adminPaymentStatusMeta(paymentStatus, booking?.balance_due, hasDepositOverride);
  const hasPaidDp = paymentStatus === "partial_paid" || paymentStatus === "paid" || paymentStatus === "settled" || Number(booking?.deposit_amount || 0) === 0;
  const canConfirm = status === "pending" && paymentStatus !== "awaiting_verification";
  const canStart = (status === "pending" || status === "confirmed") && (hasPaidDp || hasDepositOverride);
  const canComplete = status === "active";
  const canSettle =
    status === "completed" &&
    !isPaymentSettled &&
    !hasPendingManualVerification &&
    paymentStatus !== "awaiting_verification" &&
    Number(booking?.balance_due || 0) > 0;
  const isFinal = status === "completed" || status === "cancelled";
  const canUseReceipt = isReceiptProEnabled(receiptSettings);
  const canConfirmBooking = hasPermission(adminUser, "bookings.confirm");
  const canStartSession = hasPermission(adminUser, "sessions.start");
  const canCompleteSession = hasPermission(adminUser, "sessions.complete");
  const canCancelBooking = hasPermission(adminUser, "bookings.cancel");
  const canSettleCash = hasPermission(adminUser, "pos.cash.settle");
  const canOperatePos = hasPermission(adminUser, "pos.read");
  const canSendReceipt = hasPermission(adminUser, "receipts.send");
  const canPrintReceipt = hasPermission(adminUser, "receipts.print");
  const canRecordDeposit =
    canSettleCash &&
    (status === "pending" || status === "confirmed") &&
    Number(booking?.deposit_amount || 0) > 0 &&
    !hasPaidDp &&
    !hasPendingManualVerification &&
    !hasDepositOverride;
  const canOverrideDeposit =
    canStartSession &&
    (status === "pending" || status === "confirmed") &&
    Number(booking?.deposit_amount || 0) > 0 &&
    !hasPaidDp &&
    !hasPendingManualVerification &&
    !hasDepositOverride;
  const hasPromo =
    Number(booking?.discount_amount || 0) > 0 &&
    String(booking?.promo_code || "").trim() !== "";
  const hasAdminControls =
    canConfirm ||
    canRecordDeposit ||
    canOverrideDeposit ||
    status === "active" ||
    status === "pending" ||
    status === "confirmed" ||
    canComplete ||
    canSettle ||
    (isPaymentSettled && (canSendReceipt || canPrintReceipt)) ||
    (!isFinal && canCancelBooking);

  const timelineSection = (
    <Card className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
            History booking
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
            Timeline aktivitas
          </h2>
        </div>
        <Badge variant="outline" className="w-fit rounded-full">
          {booking?.events?.length || 0} event
        </Badge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(booking?.events || []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10">
            Timeline belum tersedia untuk booking lama.
          </div>
        ) : (
          (booking?.events || []).map((event) => (
            <div key={event.id} className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    {event.title || event.event_type}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {event.description || event.event_type}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span>{actorLabel(event)}</span>
                    {event.actor_email ? (
                      <span className="hidden sm:inline text-slate-300 dark:text-slate-500">
                        {event.actor_email}
                      </span>
                    ) : null}
                  </div>
                </div>
                <Badge className="shrink-0 rounded-full border-none bg-slate-100 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-200">
                  {event.actor_type}
                </Badge>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {event.created_at
                  ? format(new Date(event.created_at), "dd MMM yyyy, HH:mm", { locale: localeID })
                  : "-"}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  const pendingTransactionsSection = pendingManualAttempts.length > 0 ? (
    <Card className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-950/20 xl:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-200">
            Pending Verifikasi
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-100">
            {pendingManualAttempts.length} transaksi butuh keputusan admin.
          </p>
        </div>
        <Badge className="border-none bg-amber-500 text-white">
          {pendingManualAttempts.length}
        </Badge>
      </div>

      <div className="mt-4 space-y-3">
        {pendingManualAttempts.map((attempt) => (
          <div
            key={attempt.id}
            className="rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-500/20 dark:bg-[#0f0f17]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    {attempt.method_label}
                  </p>
                  <Badge
                    className={cn(
                      "border-none",
                      attempt.payment_scope === "settlement"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-950 text-white",
                    )}
                  >
                    {attempt.payment_scope === "settlement" ? "Pelunasan" : "DP"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Rp {formatIDR(Number(attempt.amount || 0))} ·{" "}
                  {attempt.submitted_at
                    ? format(new Date(attempt.submitted_at), "dd MMM, HH:mm", {
                        locale: localeID,
                      })
                    : "-"}
                </p>
              </div>
              <Badge className="border-none bg-amber-500 text-white">
                Review
              </Badge>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <ImageIcon className="h-3.5 w-3.5" />
                {attempt.proof_url ? "Bukti bayar tersedia" : "Tanpa bukti bayar"}
              </div>
              {attempt.proof_url ? (
                <a
                  href={attempt.proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--bookinaja-600)] hover:underline dark:text-[var(--bookinaja-200)]"
                >
                  Buka
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>

            {attempt.payer_note ? (
              <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
                {attempt.payer_note}
              </div>
            ) : null}

            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => handleVerifyManualAttempt(attempt.id, true)}
                disabled={processingAttemptId === attempt.id}
                className="h-9 flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {processingAttemptId === attempt.id ? "Memproses..." : "Verifikasi"}
              </Button>
              <Button
                onClick={() => handleVerifyManualAttempt(attempt.id, false)}
                disabled={processingAttemptId === attempt.id}
                variant="outline"
                className="h-9 flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
              >
                Tolak
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  ) : null;

  const handleVerifyManualAttempt = async (attemptID: string, approve: boolean) => {
    try {
      setProcessingAttemptId(attemptID);
      await api.post(`/bookings/payment-attempts/${attemptID}/${approve ? "verify" : "reject"}`, {
        notes: String(attemptNotes[attemptID] || "").trim(),
      });
      toast.success(approve ? "Pembayaran manual diverifikasi" : "Pembayaran manual ditolak");
      setAttemptNotes((current) => ({ ...current, [attemptID]: "" }));
      fetchDetail();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal memproses verifikasi");
    } finally {
      setProcessingAttemptId(null);
    }
  };

  const handleRecordDeposit = async () => {
    setUpdating(true);
    try {
      await api.post(`/bookings/${params.id}/record-deposit`, {
        notes: String(recordDepositNotes || "").trim(),
      });
      toast.success("DP berhasil dicatat");
      setRecordDepositDialogOpen(false);
      fetchDetail();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal mencatat DP");
    } finally {
      setUpdating(false);
    }
  };

  const handleOverrideDeposit = async () => {
    setUpdating(true);
    try {
      await api.post(`/bookings/${params.id}/override-deposit`, {
        reason: String(overrideDepositReason || "").trim(),
      });
      toast.success("Override DP aktif");
      setOverrideDepositDialogOpen(false);
      fetchDetail();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal mengaktifkan override DP");
    } finally {
      setUpdating(false);
    }
  };

  const handleReceiptAction = async (mode: "whatsapp" | "print" | "both") => {
    if (!booking) return;
    if (!canUseReceipt) {
      toast.message("Fitur nota belum aktif", {
        description: "Aktifkan entitlement nota di plan tenant ini atau ubah plan tenant.",
      });
      router.push("/admin/settings/billing/subscribe");
      return;
    }

    if (mode === "whatsapp" || mode === "both") {
      try {
        await api.post(`/bookings/${booking.id}/receipt/send`);
        toast.success("Nota WhatsApp dikirim via Fonnte");
      } catch (error) {
        const err = error as { response?: { data?: { error?: string } } };
        toast.error(err.response?.data?.error || "Gagal mengirim nota WhatsApp");
        if (mode === "whatsapp") return;
      }
    }

    if (mode === "print" || mode === "both") {
      try {
        await printReceiptBluetooth(receiptSettings, {
          ...booking,
          receipt_kind: "booking",
          cashier_name: adminUser?.name || "Admin",
        });
        toast.success("Nota dikirim ke printer Bluetooth");
      } catch (error) {
        const err = error as Error;
        toast.error(err.message || "Gagal cetak ke printer Bluetooth");
      }
    }
  };

  if (loading) return <BookingDetailSkeleton />;

  if (!booking)
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <h1 className="text-xl font-black italic uppercase text-slate-400">
          Booking tidak ditemukan
        </h1>
        <Button
          onClick={() => router.push("/admin/bookings")}
          className="rounded-xl h-12 px-6"
        >
          Kembali ke daftar
        </Button>
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-3 pb-20 pt-3 font-plus-jakarta md:space-y-5 md:px-4 lg:px-6 animate-in fade-in duration-500">
      <div className="space-y-4 xl:grid xl:grid-cols-12 xl:items-stretch xl:gap-6 xl:space-y-0">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/bookings")}
          className="h-auto justify-start self-start px-0 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 xl:hidden"
        >
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          Kembali ke daftar
        </Button>

        <Card className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] xl:col-span-8 xl:h-full xl:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--bookinaja-600)]">
                Booking Detail
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white xl:text-[1.75rem]">
                {booking.resource_name || "Booking"}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {booking.customer_name || "-"}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Ref {(booking.access_token || "").slice(0, 10) || "-"}
              </p>
            </div>
            <RealtimePill connected={realtimeConnected} status={realtimeStatus} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className={cn("border-none", sessionStatusMeta.className)}>
              Sesi: {sessionStatusMeta.label}
            </Badge>
            <Badge className={cn("border-none", paymentStatusMeta.className)}>
              Bayar: {paymentStatusMeta.label}
            </Badge>
            {hasDepositOverride ? (
              <Badge className="border-none bg-amber-500 text-white">
                Override DP Aktif
              </Badge>
            ) : null}
            {refreshing ? (
              <Badge className="border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                Refresh
              </Badge>
            ) : null}
          </div>

          {hasDepositOverride ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-100">
              <p className="font-semibold">Sesi boleh dimulai tanpa DP.</p>
              <p className="mt-1 text-xs leading-5 text-amber-800/90 dark:text-amber-100/80">
                {booking?.deposit_override_reason || "Override aktif sampai DP benar-benar dicatat."}
                {booking?.deposit_override_by ? ` Disetujui oleh ${booking.deposit_override_by}.` : ""}
              </p>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:mt-5 xl:gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Tanggal</div>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{formatShortDate(booking.start_time)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Jam</div>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{formatShortTime(booking.start_time)} - {formatShortTime(booking.end_time)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total</div>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">Rp {formatIDR(booking.grand_total || 0)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Sisa</div>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">Rp {formatIDR(booking.balance_due || 0)}</p>
            </div>
          </div>
        </Card>

        {(pendingTransactionsSection || hasAdminControls) && (
          <div className="xl:col-span-4 xl:flex xl:h-full xl:flex-col xl:gap-4">
          {pendingTransactionsSection}

          {hasAdminControls && (
            <Card className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] xl:flex-1 xl:p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Kontrol Admin
                  </p>
                </div>
                <Badge
                  className={cn(
                    "w-fit rounded-full border-none px-3 py-1.5 text-sm font-semibold shadow-sm",
                    sessionStatusMeta.className,
                  )}
                >
                  {sessionStatusMeta.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {canConfirm && (
                  <AdminControlCard
                    title="Konfirmasi"
                    description="Siapkan booking untuk dijalankan."
                    icon={ShieldCheck}
                    onClick={() => handleUpdateStatus("confirmed")}
                    disabled={updating || !canConfirmBooking}
                    tone="primary"
                  />
                )}
                {canRecordDeposit && (
                  <AdminControlCard
                    title="Catat DP"
                    description="Tandai DP sudah diterima offline."
                    icon={Receipt}
                    onClick={() => setRecordDepositDialogOpen(true)}
                    disabled={updating || !canSettleCash}
                    tone="primary"
                  />
                )}
                {canOverrideDeposit && (
                  <AdminControlCard
                    title="Tanpa DP"
                    description="Booking jalan tanpa DP."
                    icon={Clock}
                    onClick={() => setOverrideDepositDialogOpen(true)}
                    disabled={updating || !canStartSession}
                    tone="neutral"
                  />
                )}
                {status === "active" && (
                  <AdminControlCard
                    title="POS"
                    description="Buka panel live sesi."
                    icon={Zap}
                    onClick={() => router.push(`/admin/pos?active=${booking.id}`)}
                    disabled={!canOperatePos}
                    tone="primary"
                  />
                )}
                {(status === "pending" || status === "confirmed") && (
                  <AdminControlCard
                    title="Mulai Sesi"
                    description="Aktifkan sesi customer."
                    icon={Zap}
                    onClick={() => handleUpdateStatus("active")}
                    disabled={updating || !canStart || !canStartSession}
                    tone="success"
                  />
                )}
                {canComplete && (
                  <AdminControlCard
                    title="Akhiri Sesi"
                    description="Tutup sesi dan siapkan billing."
                    icon={CheckCircle2}
                    onClick={() => handleUpdateStatus("completed")}
                    disabled={updating || !canCompleteSession}
                    tone="dark"
                  />
                )}
                {canSettle && (
                  <AdminControlCard
                    title="Pelunasan"
                    description="Selesaikan sisa tagihan."
                    icon={CreditCard}
                    onClick={() => router.push(`/admin/bookings/${booking.id}/payment`)}
                    disabled={updating || !canSettleCash}
                  />
                )}
                {isPaymentSettled && (canSendReceipt || canPrintReceipt) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <AdminControlCard
                        title="Nota"
                        description="Kirim atau cetak nota."
                        icon={Receipt}
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 dark:bg-[#0f0f17]">
                      {!canUseReceipt && (
                        <DropdownMenuItem onClick={() => router.push("/admin/settings/billing/subscribe")} className="rounded-xl text-amber-700">
                          Upgrade Pro untuk pakai nota
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleReceiptAction("whatsapp")} className="rounded-xl" disabled={!canUseReceipt || !canSendReceipt}>
                        <MessageCircle size={14} className="mr-2" /> Kirim nota WA
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleReceiptAction("print")} className="rounded-xl" disabled={!canUseReceipt || !canPrintReceipt}>
                        <Printer size={14} className="mr-2" /> Cetak nota fisik
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleReceiptAction("both")} className="rounded-xl" disabled={!canUseReceipt || !canSendReceipt || !canPrintReceipt}>
                        <Receipt size={14} className="mr-2" /> WA + cetak
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {!isFinal && canCancelBooking && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <AdminControlCard
                        title="Lainnya"
                        description="Aksi tambahan booking."
                        icon={MoreVertical}
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-2xl p-2 dark:bg-[#0f0f17]">
                      <DropdownMenuItem onClick={() => handleUpdateStatus("cancelled")} className="rounded-xl text-red-600">
                        <Trash2 size={14} className="mr-2" /> Batalkan booking
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {Number(booking?.deposit_amount || 0) > 0 && !hasPaidDp && (status === "pending" || status === "confirmed") && !hasDepositOverride ? (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">DP Booking</p>
                  <p className="mt-1 font-semibold text-slate-950">Rp{formatIDR(Number(booking?.deposit_amount || 0))}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    DP dipakai sebagai syarat muka sebelum sesi mulai.
                  </p>
                </div>
              ) : null}
              {hasDepositOverride ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Tanpa DP aktif</p>
                  <p className="mt-1 text-xs leading-5">
                    Booking ini jalan tanpa DP. Pelunasan nanti memakai total penuh.
                  </p>
                </div>
              ) : null}
            </Card>
          )}
        </div>
        )}
      </div>

      <Card className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">Timeline booking</h2>
            <p className="text-sm text-slate-500">Event tercatat dari customer, admin, payment, dan sistem.</p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full">
            {booking.events?.length || 0} event
          </Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(booking.events || []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10">
              Timeline belum tersedia untuk booking lama.
            </div>
          ) : (
            (booking.events || []).map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-950 dark:text-white">{event.title || event.event_type}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{event.description || event.event_type}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span>{actorLabel(event)}</span>
                      {event.actor_email ? (
                        <span className="hidden sm:inline text-slate-300 dark:text-slate-500">• {event.actor_email}</span>
                      ) : null}
                    </div>
                  </div>
                  <Badge className="shrink-0 rounded-full border-none bg-slate-100 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-200">
                    {event.actor_type}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  {event.created_at ? format(new Date(event.created_at), "dd MMM yyyy, HH:mm", { locale: localeID }) : "-"}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* 2. MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-12 items-start">
        <Card className="order-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] xl:col-span-4 xl:order-2 xl:p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
              <div className="space-y-5">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] leading-none text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
                    Customer
                  </p>
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white truncate md:text-xl">
                    {booking.customer_name}
                  </h2>
                  <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500 md:text-sm">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />{" "}
                    {booking.customer_phone}
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-5 dark:border-white/5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.18em] leading-none">
                    Resource
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-slate-800">
                      <Package size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-none tracking-tight text-slate-950 dark:text-white md:text-base">
                        {booking.resource_name}
                      </p>
                      <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--bookinaja-500)] dark:text-[var(--bookinaja-200)]">
                        Aktif
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5 md:border-l md:border-slate-100 md:pl-6 md:dark:border-white/5">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] leading-none text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
                    Timeline
                  </p>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white md:text-base">
                    <Calendar className="w-4 h-4 text-slate-300" />
                    {format(new Date(booking.start_time), "dd MMMM yyyy", {
                      locale: localeID,
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-base font-semibold text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)] md:text-lg">
                    <Clock className="w-4 h-4 opacity-40" />
                    {format(new Date(booking.start_time), "HH:mm")} -{" "}
                    {format(new Date(booking.end_time), "HH:mm")}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-5 dark:border-white/5">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Token
                    </p>
                    <p className="break-all font-mono text-[10px] font-medium uppercase tracking-tight text-slate-600 dark:text-slate-500">
                      {(booking.access_token || "").slice(0, 15)}...
                    </p>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-[var(--bookinaja-300)] dark:text-[var(--bookinaja-800)]" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="order-2 space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:space-y-6 md:p-6 dark:border-white/10 dark:bg-[#0f0f17] xl:col-span-8 xl:order-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  Ringkasan Booking
                </p>
              </div>
              <Badge variant="secondary" className="rounded-full px-3">
                {groupedOptions.length + groupedOrders.length} item
              </Badge>
            </div>

            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-950 dark:text-white">
                  <Package className="h-4 w-4 text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]" />
                  <p className="text-sm font-semibold">Layanan utama</p>
                </div>
                {mainOptions.length > 0 ? (
                  <div className="space-y-3">
                    {mainOptions.map((opt) => (
                      <div
                        key={opt.id}
                        className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold leading-tight text-slate-950 dark:text-white">
                              {opt.item_name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {opt.quantity} unit | Rp {formatIDR(opt.displayUnitPrice)}
                            </p>
                          </div>
                          <p className="text-base font-semibold text-slate-950 dark:text-white">
                            Rp {formatIDR(Number(opt.totalPrice || 0))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                    Belum ada layanan utama.
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-5 dark:border-white/10">
                <div className="flex items-center gap-2 text-slate-950 dark:text-white">
                  <Layers className="h-4 w-4 text-emerald-500" />
                  <p className="text-sm font-semibold">Add-on</p>
                </div>
                {addonOptions.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {addonOptions.map((opt) => (
                      <div
                        key={opt.id}
                        className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold leading-tight text-slate-950 dark:text-white">
                              {opt.item_name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {opt.quantity} unit | Rp {formatIDR(opt.displayUnitPrice)}
                            </p>
                          </div>
                          <p className="text-base font-semibold text-slate-950 dark:text-white">
                            Rp {formatIDR(Number(opt.totalPrice || 0))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                    Belum ada add-on.
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-5 dark:border-white/10">
                <div className="flex items-center gap-2 text-slate-950 dark:text-white">
                  <Utensils className="h-4 w-4 text-orange-500" />
                  <p className="text-sm font-semibold">Pesanan F&amp;B</p>
                </div>
                {groupedOrders.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {groupedOrders.map((order) => (
                      <div
                        key={order.fnb_item_id}
                        className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold leading-tight text-slate-950 dark:text-white">
                              {order.item_name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {order.quantity} unit | Rp {formatIDR(Number(order.price_at_purchase || 0))}
                            </p>
                          </div>
                          <p className="text-base font-semibold text-slate-950 dark:text-white">
                            Rp {formatIDR(Number(order.subtotal || 0))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                    Belum ada pesanan F&amp;B.
                  </div>
                )}
              </div>

              {hasPromo ? (
                <div className="border-t border-slate-100 pt-5 dark:border-white/10">
                  <div className="flex items-center gap-2 text-slate-950 dark:text-white">
                    <CreditCard className="h-4 w-4 text-emerald-500" />
                    <p className="text-sm font-semibold">Promo</p>
                  </div>
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
                          {booking.promo_code}
                        </div>
                        <div className="mt-1 text-sm text-emerald-800 dark:text-emerald-100">
                          Potongan ini sudah masuk ke total booking.
                        </div>
                      </div>
                      <Badge className="bg-emerald-600 text-white">
                        -Rp {formatIDR(Number(booking.discount_amount || 0))}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl border border-emerald-200/80 bg-white/80 px-3 py-2 dark:border-emerald-500/20 dark:bg-black/10">
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700/80 dark:text-emerald-200/80">
                          Sebelum promo
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                          Rp {formatIDR(Number(booking.original_grand_total || 0))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-emerald-200/80 bg-white/80 px-3 py-2 dark:border-emerald-500/20 dark:bg-black/10">
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700/80 dark:text-emerald-200/80">
                          Diskon
                        </div>
                        <div className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                          -Rp {formatIDR(Number(booking.discount_amount || 0))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-emerald-200/80 bg-white/80 px-3 py-2 dark:border-emerald-500/20 dark:bg-black/10">
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700/80 dark:text-emerald-200/80">
                          Setelah promo
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                          Rp {formatIDR(Number(booking.grand_total || 0))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="order-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0b1220] dark:text-white xl:col-span-4 xl:order-4 xl:p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Payment Summary
                  </p>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
                    Tombol aksi ada di kanan atas
                  </p>
                </div>
                <Badge className="rounded-full border-none bg-[var(--bookinaja-600)] px-3 py-1 text-[10px] font-semibold uppercase text-white">
                  {booking.payment_status || "pending"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
                {hasPromo ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-400/10 dark:bg-amber-400/10">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200/80">
                      Promo
                    </p>
                    <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-200">
                      -Rp{formatIDR(booking.discount_amount || 0)}
                    </p>
                  </div>
                ) : null}
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Total
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                    Rp{formatIDR(booking.grand_total || 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-400/10 dark:bg-emerald-400/10">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200/80">
                    Dibayar
                  </p>
                  <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Rp{formatIDR(booking.paid_amount || 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--bookinaja-200)]/60 bg-[var(--bookinaja-50)]/90 p-3 dark:border-[var(--bookinaja-400)]/20 dark:bg-[var(--bookinaja-500)]/10">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]/80">
                    Sisa
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                    Rp{formatIDR(booking.balance_due || 0)}
                  </p>
                </div>
              </div>

              {!isPaymentSettled && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] font-medium leading-relaxed text-amber-800 md:p-4 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                  Booking belum lunas. Silakan gunakan tombol Process Payment di
                  kanan atas untuk pelunasan via Midtrans atau cash.
                </div>
              )}
            </div>
          </Card>

          <div className="order-4 xl:order-3 xl:col-span-8">
            {timelineSection}
          </div>
          <Dialog open={recordDepositDialogOpen} onOpenChange={setRecordDepositDialogOpen}>
            <DialogContent className="overflow-hidden rounded-3xl p-0 sm:max-w-lg">
              <DialogHeader className="border-b border-slate-200 px-6 py-5 text-left">
                <DialogTitle>Catat DP masuk</DialogTitle>
                <DialogDescription>
                  Pakai ini jika DP{" "}
                  <span className="font-semibold text-slate-900">Rp{formatIDR(Number(booking?.deposit_amount || 0))}</span>{" "}
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
                <Button type="button" variant="outline" className="rounded-2xl" onClick={() => setRecordDepositDialogOpen(false)} disabled={updating}>
                  Batal
                </Button>
                <Button type="button" className="rounded-2xl bg-blue-600 text-white hover:bg-blue-700" onClick={() => void handleRecordDeposit()} disabled={updating}>
                  {updating ? "Memproses..." : "Catat DP"}
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
                  <span className="font-semibold text-slate-900">Rp{formatIDR(Number(booking?.deposit_amount || 0))}</span>{" "}
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
                <Button type="button" variant="outline" className="rounded-2xl" onClick={() => setOverrideDepositDialogOpen(false)} disabled={updating}>
                  Batal
                </Button>
                <Button type="button" className="rounded-2xl bg-amber-500 text-white hover:bg-amber-600" onClick={() => void handleOverrideDeposit()} disabled={updating || !String(overrideDepositReason || "").trim()}>
                  {updating ? "Memproses..." : "Aktifkan tanpa DP"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
      </div>
    </div>
  );
}
