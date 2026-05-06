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
  MessageCircle,
  Printer,
  ExternalLink,
  ImageIcon,
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
import { hasPermission, isOwner, type AdminSessionUser } from "@/lib/admin-access";
import { RealtimePill } from "@/components/dashboard/realtime-pill";
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
  };
}

function actorLabel(event: BookingEvent) {
  const name = String(event.actor_name || "").trim();
  const role = String(event.actor_role || "").trim();
  const actorType = String(event.actor_type || "").trim();

  if (name && role) return `${name} • ${role}`;
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

function adminPaymentStatusMeta(status?: string, balanceDue?: number) {
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
  return {
    label: "Menunggu Pembayaran",
    className: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200",
  };
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings | null>(null);
  const [adminUser, setAdminUser] = useState<AdminSessionUser | null>(null);
  const [tenantId, setTenantId] = useState("");
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

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => {
        setAdminUser(res.data?.user || null);
        setTenantId(res.data?.user?.tenant_id || "");
      })
      .catch(() => setAdminUser(null));
  }, []);

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
  const isPaymentSettled =
    booking?.payment_status === "settled" ||
    (booking?.payment_status === "paid" && Number(booking?.balance_due || 0) === 0);
  const status = String(booking?.status || "").toLowerCase();
  const paymentStatus = String(booking?.payment_status || "").toLowerCase();
  const sessionStatusMeta = adminSessionStatusMeta(status);
  const paymentStatusMeta = adminPaymentStatusMeta(paymentStatus, booking?.balance_due);
  const hasPaidDp = paymentStatus === "partial_paid" || paymentStatus === "paid" || paymentStatus === "settled" || Number(booking?.deposit_amount || 0) === 0;
  const canConfirm = status === "pending" && paymentStatus !== "awaiting_verification";
  const canStart = (status === "pending" || status === "confirmed") && hasPaidDp;
  const canComplete = status === "active";
  const canSettle = status === "completed" && !isPaymentSettled && Number(booking?.balance_due || 0) > 0;
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
  const hasPromo =
    Number(booking?.discount_amount || 0) > 0 &&
    String(booking?.promo_code || "").trim() !== "";

  const timelineSection = (
    <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
            <div key={event.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
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
    <Card className="rounded-[1.75rem] border border-amber-200 bg-amber-50/80 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-950/20 xl:col-span-4 xl:p-5">
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
            className="rounded-[1.5rem] border border-amber-200 bg-white p-3 dark:border-amber-500/20 dark:bg-[#0f0f17]"
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

  const handleReceiptAction = async (mode: "whatsapp" | "print" | "both") => {
    if (!booking) return;
    if (!canUseReceipt) {
      toast.message("Fitur nota aktif di paket Pro", {
        description: "Starter dan trial bisa melihat pengaturan, tapi kirim/cetak nota terkunci.",
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
        await printReceiptBluetooth(receiptSettings, booking);
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
      <div className="space-y-4 xl:grid xl:grid-cols-12 xl:items-start xl:gap-6 xl:space-y-0">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/bookings")}
          className="h-auto px-0 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 xl:col-span-12"
        >
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          Kembali ke daftar
        </Button>

        <Card className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] xl:col-span-8 xl:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--bookinaja-600)]">
                Admin Live
              </p>
              <h1 className="mt-2 text-2xl font-[950] tracking-tight text-slate-950 dark:text-white xl:text-[2rem]">
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
            {refreshing ? (
              <Badge className="border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                Refresh
              </Badge>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:mt-5 xl:gap-3">
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Tanggal</div>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{formatShortDate(booking.start_time)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Jam</div>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{formatShortTime(booking.start_time)} - {formatShortTime(booking.end_time)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total</div>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">Rp {formatIDR(booking.grand_total || 0)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Sisa</div>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">Rp {formatIDR(booking.balance_due || 0)}</p>
            </div>
          </div>
        </Card>

        {pendingTransactionsSection}

        <Card className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] xl:col-span-4 xl:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Kontrol Admin
              </p>
            </div>
            <Badge className={cn("border-none", sessionStatusMeta.className)}>
              {sessionStatusMeta.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 xl:grid-cols-2">
            {canConfirm && (
              <Button onClick={() => handleUpdateStatus("confirmed")} disabled={updating || !canConfirmBooking} variant="outline" className="h-auto min-h-[88px] flex-col items-start justify-between rounded-2xl px-4 py-3 text-left xl:min-h-[72px] xl:px-3 xl:py-2.5">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm font-semibold">Konfirmasi</span>
              </Button>
            )}
            {status === "active" && (
              <Button onClick={() => router.push(`/admin/pos?active=${booking.id}`)} disabled={!canOperatePos} variant="outline" className="h-auto min-h-[88px] flex-col items-start justify-between rounded-2xl px-4 py-3 text-left xl:min-h-[72px] xl:px-3 xl:py-2.5">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-semibold">POS</span>
              </Button>
            )}
            {(status === "pending" || status === "confirmed") && (
              <Button onClick={() => handleUpdateStatus("active")} disabled={updating || !canStart || !canStartSession} className="h-auto min-h-[88px] flex-col items-start justify-between rounded-2xl bg-emerald-600 px-4 py-3 text-left text-white hover:bg-emerald-700 xl:min-h-[72px] xl:px-3 xl:py-2.5">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-semibold">Mulai Sesi</span>
              </Button>
            )}
            {canComplete && (
              <Button onClick={() => handleUpdateStatus("completed")} disabled={updating || !canCompleteSession} className="h-auto min-h-[88px] flex-col items-start justify-between rounded-2xl bg-slate-900 px-4 py-3 text-left text-white hover:bg-slate-800 xl:min-h-[72px] xl:px-3 xl:py-2.5">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-semibold">Akhiri Sesi</span>
              </Button>
            )}
            {canSettle && (
              <Button onClick={() => router.push(`/admin/bookings/${booking.id}/payment`)} disabled={updating || !canSettleCash} variant="outline" className="h-auto min-h-[88px] flex-col items-start justify-between rounded-2xl px-4 py-3 text-left xl:min-h-[72px] xl:px-3 xl:py-2.5">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm font-semibold">Pelunasan</span>
              </Button>
            )}
            {isPaymentSettled && (canSendReceipt || canPrintReceipt) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-auto min-h-[88px] flex-col items-start justify-between rounded-2xl px-4 py-3 text-left xl:min-h-[72px] xl:px-3 xl:py-2.5">
                    <Receipt className="h-4 w-4" />
                    <span className="text-sm font-semibold">Nota</span>
                  </Button>
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
                  <Button variant="outline" className="h-auto min-h-[88px] flex-col items-start justify-between rounded-2xl px-4 py-3 text-left xl:min-h-[72px] xl:px-3 xl:py-2.5">
                    <MoreVertical className="h-4 w-4" />
                    <span className="text-sm font-semibold">Lainnya</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-2xl p-2 dark:bg-[#0f0f17]">
                  <DropdownMenuItem onClick={() => handleUpdateStatus("cancelled")} className="rounded-xl text-red-600">
                    <Trash2 size={14} className="mr-2" /> Batalkan booking
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </Card>
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
        <Card className="relative order-1 overflow-hidden rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-100 md:rounded-[2.5rem] md:p-8 dark:bg-[#0f0f17] dark:ring-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:col-span-4 xl:order-2 xl:p-6">
            <div className="absolute -top-6 -right-6 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
              <User size={180} />
            </div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-5">
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest italic leading-none text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
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
                      <span className="mt-1 block text-[7px] font-black uppercase tracking-widest text-[var(--bookinaja-500)] dark:text-[var(--bookinaja-200)]">
                        Resource Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5 md:border-l md:border-slate-50 md:dark:border-white/5 md:pl-8">
                <div className="space-y-1">
                  <p className="text-[8px] font-black uppercase tracking-widest italic leading-none text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
                    Timeline
                  </p>
                  <div className="flex items-center gap-2 text-sm md:text-base font-[1000] italic text-slate-900 dark:text-white uppercase tracking-tighter">
                    <Calendar className="w-4 h-4 text-slate-300" />
                    {format(new Date(booking.start_time), "dd MMMM yyyy", {
                      locale: localeID,
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-lg font-[1000] italic uppercase tracking-tighter text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)] md:text-xl">
                    <Clock className="w-4 h-4 opacity-40" />
                    {format(new Date(booking.start_time), "HH:mm")} -{" "}
                    {format(new Date(booking.end_time), "HH:mm")}
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic">
                      Token Handle
                    </p>
                    <p className="text-[9px] font-mono font-bold text-slate-600 dark:text-slate-500 break-all uppercase tracking-tighter">
                      {(booking.access_token || "").slice(0, 15)}...
                    </p>
                  </div>
                  <ShieldCheck className="w-6 h-6 text-[var(--bookinaja-200)] dark:text-[var(--bookinaja-800)]" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="order-2 space-y-5 rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-100 md:space-y-6 md:rounded-[2.5rem] md:p-8 dark:bg-[#0f0f17] dark:ring-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:col-span-8 xl:order-1">
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
                        className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold leading-tight text-slate-950 dark:text-white">
                              {opt.item_name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {opt.quantity} unit · Rp {formatIDR(opt.displayUnitPrice)}
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
                  <div className="rounded-[1.5rem] border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
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
                        className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold leading-tight text-slate-950 dark:text-white">
                              {opt.item_name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {opt.quantity} unit · Rp {formatIDR(opt.displayUnitPrice)}
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
                  <div className="mt-3 rounded-[1.5rem] border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
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
                        className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold leading-tight text-slate-950 dark:text-white">
                              {order.item_name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {order.quantity} unit · Rp {formatIDR(Number(order.price_at_purchase || 0))}
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
                  <div className="mt-3 rounded-[1.5rem] border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
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
                  <div className="mt-3 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
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

          <Card className="order-3 relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.25)] md:rounded-[3rem] md:p-8 dark:border-white/10 dark:bg-[#0b1220] dark:text-white dark:shadow-[0_24px_80px_-36px_rgba(15,23,42,0.75)] xl:col-span-4 xl:order-4 xl:p-6">
            <Receipt
              size={160}
              className="absolute -right-12 -bottom-12 rotate-12 text-slate-950/[0.04] dark:text-white/[0.03]"
            />

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest italic text-slate-500 dark:text-slate-400">
                    Payment Snapshot
                  </p>
                  <p className="text-sm font-bold italic text-slate-500 dark:text-slate-300">
                    Tombol aksi ada di kanan atas
                  </p>
                </div>
                <Badge className="rounded-full border-none bg-[var(--bookinaja-600)] px-3 py-1 text-[8px] font-black uppercase text-white">
                  {booking.payment_status || "pending"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
                {hasPromo ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-400/10 dark:bg-amber-400/10">
                    <p className="text-[8px] font-black italic uppercase tracking-widest text-amber-700 dark:text-amber-200/80">
                      Promo
                    </p>
                    <p className="mt-2 text-sm font-black italic text-amber-700 dark:text-amber-200">
                      -Rp{formatIDR(booking.discount_amount || 0)}
                    </p>
                  </div>
                ) : null}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[8px] font-black italic uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Total
                  </p>
                  <p className="mt-2 text-sm font-black italic text-slate-950 dark:text-white">
                    Rp{formatIDR(booking.grand_total || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-400/10 dark:bg-emerald-400/10">
                  <p className="text-[8px] font-black italic uppercase tracking-widest text-emerald-700 dark:text-emerald-200/80">
                    Dibayar
                  </p>
                  <p className="mt-2 text-sm font-black italic text-emerald-700 dark:text-emerald-300">
                    Rp{formatIDR(booking.paid_amount || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--bookinaja-200)]/60 bg-[var(--bookinaja-50)]/90 p-3 dark:border-[var(--bookinaja-400)]/20 dark:bg-[var(--bookinaja-500)]/10">
                  <p className="text-[8px] font-black italic uppercase tracking-widest text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]/80">
                    Sisa
                  </p>
                  <p className="mt-2 text-sm font-black italic text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                    Rp{formatIDR(booking.balance_due || 0)}
                  </p>
                </div>
              </div>

              {!isPaymentSettled && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-bold italic leading-relaxed text-amber-800 md:p-4 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                  Booking belum lunas. Silakan gunakan tombol Process Payment di
                  kanan atas untuk pelunasan via Midtrans atau cash.
                </div>
              )}
            </div>
          </Card>

          <div className="order-4 xl:order-3 xl:col-span-8">
            {timelineSection}
          </div>
      </div>
    </div>
  );
}
