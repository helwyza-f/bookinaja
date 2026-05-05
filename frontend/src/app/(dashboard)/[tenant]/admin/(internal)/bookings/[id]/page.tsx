"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Script from "next/script";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [midtransReady, setMidtransReady] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedSettlementMethod, setSelectedSettlementMethod] = useState("midtrans");
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings | null>(null);
  const [adminUser, setAdminUser] = useState<AdminSessionUser | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [attemptNotes, setAttemptNotes] = useState<Record<string, string>>({});
  const [processingAttemptId, setProcessingAttemptId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);

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
      if (matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) {
        setBooking((current) => patchBookingDetailFromEvent(current, event));
        scheduleDetailRefresh();
      }
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

  useEffect(() => {
    if (window.snap) setMidtransReady(true);
  }, []);

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
  const paymentMethods = booking?.payment_methods || [];
  const selectedSettlementMethodDetail =
    paymentMethods.find((item) => item.code === selectedSettlementMethod) || paymentMethods[0];
  const pendingManualAttempts =
    (booking?.payment_attempts || []).filter(
      (item) => item.status === "submitted" || item.status === "awaiting_verification",
    );
  const pendingManualDpAttempt = pendingManualAttempts.find(
    (item) => item.payment_scope === "deposit",
  );
  const pendingManualSettlementAttempt = pendingManualAttempts.find(
    (item) => item.payment_scope === "settlement",
  );
  const isPaymentSettled =
    booking?.payment_status === "settled" ||
    (booking?.payment_status === "paid" && Number(booking?.balance_due || 0) === 0);
  const status = String(booking?.status || "").toLowerCase();
  const paymentStatus = String(booking?.payment_status || "").toLowerCase();
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
  const nextActionHint = paymentStatus === "awaiting_verification" && pendingManualDpAttempt
    ? "DP manual sudah dikirim customer dan sedang menunggu verifikasi admin."
    : paymentStatus === "awaiting_verification" && pendingManualSettlementAttempt
    ? "Pelunasan manual sudah dikirim customer dan sedang menunggu verifikasi admin."
    : !hasPaidDp
    ? "DP belum tercatat. Sesi belum bisa dimulai."
    : status === "pending"
      ? "DP masuk. Konfirmasi booking atau mulaikan sesi saat customer hadir."
      : status === "confirmed"
        ? "Booking siap dimulai saat customer hadir."
        : status === "active"
          ? "Sesi berjalan. Kelola add-on/F&B di POS, lalu akhiri sesi."
          : status === "completed" && !isPaymentSettled
            ? "Sesi selesai. Lanjutkan pelunasan sisa tagihan."
            : status === "completed"
              ? "Booking selesai dan lunas."
              : "Booking sudah dibatalkan.";

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
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Riwayat tetap tersedia, tapi sekarang diletakkan di bawah agar fokus operasional tetap di aksi dan billing.
          </p>
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

  const waitForSnap = async () => {
    if (window.snap) return window.snap;
    const started = Date.now();
    while (Date.now() - started < 5000) {
      if (window.snap) return window.snap;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return null;
  };

  const handlePayment = async (
    mode: "settlement",
    methodCode: string,
    verificationType: string,
  ) => {
    if (!booking) return;
    try {
      if (verificationType === "auto") {
        const snap = await waitForSnap();
        if (!snap) {
          toast.error("Midtrans belum siap");
          return;
        }
        const res = await api.post(
          `/billing/bookings/checkout?mode=${mode}&method=${methodCode}`,
          { booking_id: booking.id },
        );
        snap.pay(res.data.snap_token, {
          onSuccess: () => {
            toast.success("Pelunasan berhasil");
            fetchDetail();
          },
          onPending: () => toast.message("Pembayaran menunggu konfirmasi"),
          onError: () => toast.error("Pembayaran gagal"),
          onClose: () => fetchDetail(),
        });
        return;
      }

      const res = await api.post(`/bookings/${booking.id}/manual-payment`, {
        booking_id: booking.id,
        scope: "settlement",
        method: methodCode,
      });
      toast.success(`Pelunasan manual masuk antrean verifikasi (${res.data.reference})`);
      fetchDetail();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal membuka pembayaran");
    }
  };

  const handleCashSettlement = async () => {
    try {
      await api.post(`/bookings/${params.id}/settle-cash`);
      toast.success("Pelunasan cash berhasil");
      setPayOpen(false);
      fetchDetail();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal memproses cash settlement");
    }
  };

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
    <div className="max-w-7xl mx-auto p-3 md:p-4 lg:p-6 space-y-4 md:space-y-6 animate-in fade-in duration-500 font-plus-jakarta pb-20">
      <Script
        src={
          (
            process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || ""
          ).toLowerCase() === "true"
            ? "https://app.midtrans.com/snap/snap.js"
            : "https://app.sandbox.midtrans.com/snap/snap.js"
        }
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
        onLoad={() => setMidtransReady(true)}
        onError={() => setMidtransReady(false)}
      />
      {/* 1. COMPACT HEADER AREA */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-0.5">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/bookings")}
            className="flex h-6 items-center gap-2 px-0 text-[8px] font-black uppercase italic tracking-widest text-slate-400 transition-all hover:text-[var(--bookinaja-600)] dark:hover:text-[var(--bookinaja-200)]"
          >
            <ArrowLeft className="w-2.5 h-2.5 stroke-[4]" /> Kembali ke daftar
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl md:text-4xl lg:text-5xl font-[1000] italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
              Booking <span className="text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">Detail.</span>
            </h1>
            <RealtimePill connected={realtimeConnected} status={realtimeStatus} />
            {refreshing ? (
              <Badge className="border-none bg-slate-100 text-[8px] font-semibold tracking-widest text-slate-500 dark:bg-white/5 dark:text-slate-300">
                Refreshing...
              </Badge>
            ) : null}
            <Badge
              className={cn(
                "font-black italic text-[9px] uppercase px-3 py-1 rounded-lg border-none shadow-lg",
                booking.status === "active"
                  ? "bg-emerald-500 text-white"
                  : booking.status === "confirmed"
                    ? "bg-[var(--bookinaja-600)] text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-500",
              )}
            >
              {booking.status}
            </Badge>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/15 dark:bg-[#0f0f17] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:max-w-2xl">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next action</div>
                <div className="mt-1 text-sm font-medium leading-5 text-slate-700 dark:text-slate-200">{nextActionHint}</div>
              </div>
              <Badge className="shrink-0 rounded-full border-none bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                {status}
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {canConfirm && (
                <Button onClick={() => handleUpdateStatus("confirmed")} disabled={updating || !canConfirmBooking} variant="outline" className="h-10 rounded-xl">
                  Konfirmasi
                </Button>
              )}
              {(status === "active") && (
                <Button onClick={() => router.push(`/admin/pos?active=${booking.id}`)} disabled={!canOperatePos} variant="outline" className="h-10 rounded-xl">
                  <Zap className="mr-2 h-4 w-4" /> POS
                </Button>
              )}
              {(status === "pending" || status === "confirmed") && (
                <Button onClick={() => handleUpdateStatus("active")} disabled={updating || !canStart || !canStartSession} className="h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
                  Mulai Sesi
                </Button>
              )}
              {canComplete && (
                <Button onClick={() => handleUpdateStatus("completed")} disabled={updating || !canCompleteSession} className="h-10 rounded-xl bg-slate-950 text-white hover:bg-slate-800">
                  Akhiri Sesi
                </Button>
              )}
              {canSettle && (
                <Button onClick={() => setPayOpen(true)} disabled={updating || !canSettleCash} className="h-10 rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]">
                  <CreditCard className="mr-2 h-4 w-4" /> Pelunasan
                </Button>
              )}
              {isPaymentSettled && (canSendReceipt || canPrintReceipt) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-10 rounded-xl">
                      <Receipt className="mr-2 h-4 w-4" />
                      Nota
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
                    <Button variant="outline" className="h-10 rounded-xl">
                      <MoreVertical className="mr-2 h-4 w-4" /> Lainnya
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
          </div>

        </div>
      </header>

      <Dialog open={canSettle && payOpen && canSettleCash} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-[1.75rem] border border-slate-200 bg-white p-0 shadow-[0_30px_120px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-[#0f0f17] sm:max-w-2xl">
          <DialogHeader className="border-b border-slate-200 px-5 py-5 dark:border-white/10">
            <DialogTitle className="text-left text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Pilih Metode Pelunasan
            </DialogTitle>
            <DialogDescription className="text-left text-sm leading-6 text-slate-500 dark:text-slate-400">
              Pilih jalur pembayaran yang paling sesuai untuk menyelesaikan sisa tagihan booking ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-5 py-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Total Booking</p>
                <p className="mt-2 text-base font-semibold text-slate-950 dark:text-white">
                  Rp {formatIDR(booking?.grand_total || 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Sudah Dibayar</p>
                <p className="mt-2 text-base font-semibold text-slate-950 dark:text-white">
                  Rp {formatIDR(booking?.paid_amount || 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                <p className="text-[10px] uppercase tracking-[0.18em] text-blue-500 dark:text-blue-200">Sisa Dilunasi</p>
                <p className="mt-2 text-base font-semibold text-blue-900 dark:text-blue-100">
                  Rp {formatIDR(booking?.balance_due || 0)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                  Opsi Pembayaran
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Setiap metode punya alur yang berbeda. Pilih satu opsi untuk melihat instruksi dan tindakan berikutnya.
                </p>
              </div>

              <div className="grid gap-3">
                {paymentMethods.map((method) => {
                  const selected = selectedSettlementMethod === method.code;
                  return (
                    <button
                      key={method.code}
                      type="button"
                      onClick={() => setSelectedSettlementMethod(method.code)}
                      className={cn(
                        "w-full rounded-[1.5rem] border px-4 py-4 text-left transition-all",
                        selected
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/15 dark:border-blue-400 dark:bg-blue-500/10"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-950 dark:text-white">
                              {method.display_name}
                            </p>
                            <Badge
                              className={cn(
                                "border-none",
                                method.verification_type === "auto"
                                  ? "bg-slate-950 text-white"
                                  : "bg-amber-500 text-white",
                              )}
                            >
                              {method.verification_type === "auto" ? "Otomatis" : "Manual"}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {method.verification_type === "auto"
                              ? "Pembayaran diverifikasi otomatis setelah gateway mengonfirmasi transaksi."
                              : "Pembayaran akan masuk antrean review admin setelah bukti atau konfirmasi dikirim."}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "mt-0.5 h-5 w-5 rounded-full border-2 transition-all",
                            selected
                              ? "border-blue-600 bg-blue-600 shadow-[inset_0_0_0_4px_white]"
                              : "border-slate-300 bg-white dark:border-white/20 dark:bg-transparent",
                          )}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedSettlementMethodDetail ? (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    {selectedSettlementMethodDetail.display_name}
                  </p>
                  <Badge
                    className={cn(
                      "border-none",
                      selectedSettlementMethodDetail.verification_type === "auto"
                        ? "bg-slate-950 text-white"
                        : "bg-amber-500 text-white",
                    )}
                  >
                    {selectedSettlementMethodDetail.verification_type === "auto" ? "Auto Verify" : "Manual Review"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {selectedSettlementMethodDetail.instructions || "Instruksi pembayaran akan mengikuti metode yang dipilih."}
                </p>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs leading-6 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  {selectedSettlementMethodDetail.verification_type === "auto"
                    ? "Customer akan diarahkan ke gateway, dan status pelunasan akan diperbarui otomatis setelah pembayaran berhasil."
                    : selectedSettlementMethodDetail.code === "cash"
                      ? "Pakai opsi ini jika pembayaran dilakukan langsung di tempat. Admin bisa langsung menandai lunas tanpa menunggu review tambahan."
                      : "Pakai opsi ini jika customer membayar manual. Sistem akan membuat antrean verifikasi agar tim bisa review bukti pembayaran."}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 dark:border-white/10 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setPayOpen(false)} className="h-11 rounded-2xl">
              Batal
            </Button>
            {selectedSettlementMethod === "cash" ? (
              <Button
                onClick={() => {
                  setPayOpen(false);
                  handleCashSettlement();
                }}
                className="h-11 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Tandai Cash Lunas
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setPayOpen(false);
                  handlePayment(
                    "settlement",
                    selectedSettlementMethodDetail?.code || "midtrans",
                    selectedSettlementMethodDetail?.verification_type || "auto",
                  );
                }}
                disabled={
                  selectedSettlementMethodDetail?.verification_type === "auto" &&
                  !midtransReady
                }
                className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
              >
                {selectedSettlementMethodDetail?.verification_type === "auto"
                  ? midtransReady
                    ? `Lanjut via ${selectedSettlementMethodDetail?.display_name || "Gateway"}`
                    : "Menyiapkan Gateway"
                  : `Buat Transaksi ${selectedSettlementMethodDetail?.display_name || "Manual"}`}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {pendingManualAttempts.length > 0 ? (
        <Card className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-950/20">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-200">
                Pending Transactions
              </p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-100">
                Ada pembayaran manual yang menunggu persetujuan admin. Review bukti bayar, nominal, dan catatan customer sebelum mengambil keputusan.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-amber-200 bg-white p-4 dark:border-amber-500/20 dark:bg-[#0f0f17]">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Total Pending</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {pendingManualAttempts.length}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  transaksi manual perlu review
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white p-4 dark:border-amber-500/20 dark:bg-[#0f0f17]">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">DP Pending</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {pendingManualAttempts.filter((item) => item.payment_scope === "deposit").length}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  memblokir mulai sesi sampai diverifikasi
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white p-4 dark:border-amber-500/20 dark:bg-[#0f0f17]">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Pelunasan Pending</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  {pendingManualAttempts.filter((item) => item.payment_scope === "settlement").length}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  booking selesai menunggu approval
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {pendingManualAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="rounded-2xl border border-amber-200 bg-white p-4 dark:border-amber-500/20 dark:bg-[#0f0f17]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-slate-950 dark:text-white">
                          {attempt.method_label}
                        </div>
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
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Ref {attempt.reference_code}
                      </div>
                    </div>
                    <Badge className="border-none bg-amber-500 text-white">
                      {attempt.status === "awaiting_verification" ? "Perlu Review" : attempt.status}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Nominal</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                        Rp {formatIDR(Number(attempt.amount || 0))}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Dikirim</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                        {attempt.submitted_at
                          ? format(new Date(attempt.submitted_at), "dd MMM yyyy, HH:mm", { locale: localeID })
                          : "-"}
                      </p>
                    </div>
                  </div>
                  {attempt.proof_url ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-white/10">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          <ImageIcon className="h-3.5 w-3.5" />
                          Bukti bayar customer
                        </div>
                        <a
                          href={attempt.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--bookinaja-600)] hover:underline dark:text-[var(--bookinaja-200)]"
                        >
                          Buka penuh
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      <a href={attempt.proof_url} target="_blank" rel="noreferrer">
                        <Image
                          src={attempt.proof_url}
                          alt={`Bukti bayar ${attempt.reference_code}`}
                          width={1200}
                          height={900}
                          unoptimized
                          className="aspect-[4/3] w-full object-cover"
                        />
                      </a>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                      Customer belum melampirkan bukti bayar.
                    </div>
                  )}
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Catatan customer</p>
                      <p className="mt-1 text-xs leading-5 text-slate-700 dark:text-slate-300">
                        {attempt.payer_note || "Tidak ada catatan dari customer."}
                      </p>
                    </div>
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Catatan admin
                      </p>
                      <Textarea
                        value={attemptNotes[attempt.id] || ""}
                        onChange={(event) =>
                          setAttemptNotes((current) => ({
                            ...current,
                            [attempt.id]: event.target.value,
                          }))
                        }
                        placeholder={
                          attempt.payment_scope === "settlement"
                            ? "Opsional: mis. nominal cocok, siap dilunasi."
                            : "Opsional: mis. bukti sesuai, DP siap dikonfirmasi."
                        }
                        className="min-h-[84px] rounded-xl border-slate-200 bg-white text-sm dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
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
          </div>
        </Card>
      ) : null}

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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* LEFT COLUMN: CUSTOMER & SCHEDULE */}
        <div className="lg:col-span-7 space-y-5">
          <Card className="relative overflow-hidden rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-100 md:rounded-[2.5rem] md:p-8 dark:bg-[#0f0f17] dark:ring-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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

          {/* RENTAL OPTIONS */}
          <Card className="space-y-5 rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-100 md:space-y-6 md:rounded-[2.5rem] md:p-8 dark:bg-[#0f0f17] dark:ring-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]" />
                <h3 className="text-sm font-[1000] italic uppercase tracking-widest text-slate-950 dark:text-white">
                  Ringkasan Sewa
                </h3>
              </div>
            </div>

            <div className="space-y-3.5">
              {groupedOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="flex justify-between items-center group"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-[9px] font-black italic text-[var(--bookinaja-700)] shadow-inner dark:bg-white/[0.04] dark:text-[var(--bookinaja-200)]">
                      {opt.item_type === "main_option" ? "PKG" : "ADD"}
                    </div>
                    <div>
                      <p className="font-black italic text-slate-900 dark:text-slate-100 uppercase text-[11px] md:text-sm leading-none tracking-tight">
                        {opt.item_name}
                      </p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase italic mt-1 leading-none">
                        @Rp{formatIDR(opt.displayUnitPrice)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black italic text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                      x{opt.quantity}
                    </span>
                    <p className="font-[1000] italic text-slate-950 dark:text-white text-sm md:text-base leading-none">
                      Rp{formatIDR(Number(opt.totalPrice || 0))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: F&B + TOTAL */}
        <div className="lg:col-span-5 space-y-5">
          {/* FnB SECTION */}
          <Card className="flex min-h-[300px] flex-col rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-100 md:rounded-[2.5rem] md:p-8 dark:bg-[#0f0f17] dark:ring-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-[1000] italic uppercase tracking-widest text-slate-950 dark:text-white">
                  F&B Orders
                </h3>
              </div>
              {(booking.status === "active" ||
                booking.status === "ongoing") && (
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/admin/pos?active=${booking.id}`)}
                className="h-8 text-[8px] font-black uppercase italic bg-orange-50 dark:bg-orange-950/20 text-orange-600 rounded-lg px-3"
                >
                  Edit POS
                </Button>
              )}
            </div>

            <div className="flex-1 space-y-3.5">
              {groupedOrders.length > 0 ? (
                groupedOrders.map((order) => (
                  <div
                    key={order.fnb_item_id}
                    className="flex justify-between items-center group"
                  >
                    <div className="flex flex-col leading-none">
                      <span className="font-black text-slate-800 dark:text-slate-200 uppercase italic text-xs tracking-tight">
                        {order.item_name}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 italic mt-1 leading-none">
                        @Rp{formatIDR(Number(order.price_at_purchase || 0))}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black italic text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]">
                        x{order.quantity}
                      </span>
                      <span className="font-black text-slate-950 dark:text-white italic text-base">
                        Rp{formatIDR(Number(order.subtotal || 0))}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-10 py-6">
                  <Utensils size={48} className="mb-2" />
                  <p className="font-black italic uppercase text-[10px] tracking-widest">
                    No Food Orders
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-dashed border-slate-100 dark:border-white/5 flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-400 uppercase italic leading-none">
                F&B Subtotal
              </p>
              <p className="font-black text-slate-950 dark:text-white text-base italic leading-none">
                Rp{formatIDR(booking.total_fnb || 0)}
              </p>
            </div>
          </Card>

          {/* TOTAL BILL CARD - THE GRAND FINALE */}
          <Card className="rounded-[1.75rem] md:rounded-[3rem] border-none bg-slate-950 p-5 md:p-8 text-white space-y-5 relative overflow-hidden shadow-2xl">
            <Receipt
              size={160}
              className="absolute -right-12 -bottom-12 opacity-[0.03] rotate-12"
            />

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest italic text-slate-500">
                    Payment Snapshot
                  </p>
                  <p className="text-sm font-bold text-slate-300 italic">
                    Tombol aksi ada di kanan atas
                  </p>
                </div>
                <Badge className="rounded-full border-none bg-[var(--bookinaja-600)] px-3 py-1 text-[8px] font-black uppercase text-white">
                  {booking.payment_status || "pending"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
                <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
                  <p className="text-[8px] uppercase tracking-widest text-slate-400 font-black italic">
                    Total
                  </p>
                  <p className="mt-2 text-sm font-black italic">
                    Rp{formatIDR(booking.grand_total || 0)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
                  <p className="text-[8px] uppercase tracking-widest text-slate-400 font-black italic">
                    Dibayar
                  </p>
                  <p className="mt-2 text-sm font-black italic text-emerald-300">
                    Rp{formatIDR(booking.paid_amount || 0)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
                  <p className="text-[8px] uppercase tracking-widest text-slate-400 font-black italic">
                    Sisa
                  </p>
                    <p className="mt-2 text-sm font-black italic text-[var(--bookinaja-200)]">
                      Rp{formatIDR(booking.balance_due || 0)}
                  </p>
                </div>
              </div>

              {!isPaymentSettled && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 md:p-4 text-[10px] font-bold italic text-amber-100 leading-relaxed">
                  Booking belum lunas. Silakan gunakan tombol Process Payment di
                  kanan atas untuk pelunasan via Midtrans atau cash.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
      {timelineSection}
    </div>
  );
}
