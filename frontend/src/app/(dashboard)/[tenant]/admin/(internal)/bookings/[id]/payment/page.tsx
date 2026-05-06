"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import {
  ArrowLeft,
  CreditCard,
  ExternalLink,
  ImageIcon,
  Landmark,
  QrCode,
  RefreshCw,
  Wallet,
} from "lucide-react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookingDetailSkeleton } from "@/components/dashboard/booking-detail-skeleton";
import { RealtimePill } from "@/components/dashboard/realtime-pill";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { tenantBookingChannel } from "@/lib/realtime/channels";
import {
  BOOKING_EVENT_PREFIXES,
  matchesRealtimePrefix,
  type RealtimeEvent,
} from "@/lib/realtime/event-types";

type BookingPaymentMethod = {
  code: string;
  display_name: string;
  verification_type: string;
  instructions?: string;
  metadata?: Record<string, string>;
  is_active?: boolean;
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
  submitted_at?: string;
};

type BookingDetail = {
  id: string;
  status?: string;
  payment_status?: string;
  customer_name?: string;
  customer_phone?: string;
  resource_name?: string;
  start_time?: string;
  end_time?: string;
  grand_total?: number;
  paid_amount?: number;
  balance_due?: number;
  payment_methods?: BookingPaymentMethod[];
  payment_attempts?: BookingPaymentAttempt[];
  access_token?: string;
};

function patchBookingDetailFromEvent(current: BookingDetail | null, event: RealtimeEvent) {
  const bookingID = String(event.refs?.booking_id || event.entity_id || "");
  if (!current || !bookingID || current.id !== bookingID) return current;

  return {
    ...current,
    status: String(event.summary?.status ?? current.status ?? ""),
    payment_status: String(event.summary?.payment_status ?? current.payment_status ?? ""),
    grand_total:
      typeof event.summary?.grand_total === "number"
        ? Number(event.summary.grand_total)
        : current.grand_total,
    balance_due:
      typeof event.summary?.balance_due === "number"
        ? Number(event.summary.balance_due)
        : current.balance_due,
    paid_amount:
      typeof event.summary?.paid_amount === "number"
        ? Number(event.summary.paid_amount)
        : current.paid_amount,
  };
}

function formatMoney(value?: number) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return format(parsed, "dd MMM yyyy, HH:mm", { locale: localeID });
}

function paymentMeta(status?: string, balanceDue?: number) {
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
  return {
    label: "Menunggu Pembayaran",
    className: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
  };
}

export default function AdminBookingPaymentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [midtransReady, setMidtransReady] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("midtrans");
  const [processing, setProcessing] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const hasLoadedRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);
  const lastRealtimeToastRef = useRef("");

  const fetchDetail = useCallback(async (mode: "initial" | "background" = "initial") => {
    const background = mode === "background" && hasLoadedRef.current;
    try {
      if (background) setRefreshing(true);
      const res = await api.get(`/bookings/${params.id}`);
      setBooking(res.data);
      hasLoadedRef.current = true;
    } catch {
      toast.error("Gagal memuat halaman payment admin");
      if (!background) router.replace(`/admin/bookings/${params.id}`);
    } finally {
      if (background) setRefreshing(false);
      else setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    void fetchDetail("initial");
    api
      .get("/auth/me")
      .then((res) => setTenantId(res.data?.user?.tenant_id || ""))
      .catch(() => setTenantId(""));

    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, [fetchDetail]);

  const scheduleDetailRefresh = useCallback((delay = 250) => {
    if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      void fetchDetail("background");
    }, delay);
  }, [fetchDetail]);

  const { connected: realtimeConnected, status: realtimeStatus } = useRealtime({
    enabled: Boolean(tenantId && params.id),
    channels: tenantId && params.id ? [tenantBookingChannel(tenantId, String(params.id))] : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      setBooking((current) => patchBookingDetailFromEvent(current, event));
      const key = `${event.type}:${event.entity_id || ""}:${event.occurred_at || ""}`;
      if (lastRealtimeToastRef.current !== key) {
        lastRealtimeToastRef.current = key;
        if (event.type === "payment.awaiting_verification") toast.message("Transaksi manual masuk antrean review");
        if (event.type === "payment.settlement.paid" || event.type === "payment.cash.settled") {
          toast.success("Pelunasan booking berhasil");
        }
      }
      scheduleDetailRefresh();
    },
    onReconnect: () => scheduleDetailRefresh(150),
  });

  useEffect(() => {
    if (window.snap) setMidtransReady(true);
  }, []);

  const paymentMethods = useMemo(
    () => (booking?.payment_methods || []).filter((item) => item.is_active !== false),
    [booking?.payment_methods],
  );

  useEffect(() => {
    if (paymentMethods.length === 0) return;
    if (!paymentMethods.find((item) => item.code === selectedMethod)) {
      setSelectedMethod(paymentMethods[0].code);
    }
  }, [paymentMethods, selectedMethod]);

  const selectedMethodDetail =
    paymentMethods.find((item) => item.code === selectedMethod) || paymentMethods[0];

  const frequentMethods = useMemo(
    () =>
      paymentMethods.filter((item) =>
        ["midtrans", "cash", "bank_transfer", "qris_static"].includes(item.code),
      ),
    [paymentMethods],
  );
  const rareMethods = useMemo(
    () =>
      paymentMethods.filter(
        (item) => !["midtrans", "cash", "bank_transfer", "qris_static"].includes(item.code),
      ),
    [paymentMethods],
  );

  const settlementAttempts = useMemo(
    () => (booking?.payment_attempts || []).filter((item) => item.payment_scope === "settlement"),
    [booking?.payment_attempts],
  );
  const pendingAttempt = useMemo(
    () =>
      settlementAttempts.find(
        (item) => item.status === "submitted" || item.status === "awaiting_verification",
      ),
    [settlementAttempts],
  );

  const balanceDue = Number(booking?.balance_due || 0);
  const paymentStatusValue = String(booking?.payment_status || "").toLowerCase();
  const bookingStatus = String(booking?.status || "").toLowerCase();
  const paymentStatusBadge = paymentMeta(paymentStatusValue, balanceDue);

  const disabledReason = useMemo(() => {
    if (!booking) return "";
    if (bookingStatus !== "completed") return "Pelunasan admin baru aktif setelah sesi selesai.";
    if (balanceDue <= 0 || paymentStatusValue === "settled") return "Booking ini sudah tidak punya sisa tagihan.";
    if (paymentMethods.length === 0) return "Belum ada metode pembayaran aktif untuk tenant ini.";
    return "";
  }, [booking, bookingStatus, balanceDue, paymentStatusValue, paymentMethods.length]);

  const nextAction = useMemo(() => {
    if (pendingAttempt) {
      return {
        title: "Menunggu Verifikasi",
        description: "Ada transaksi manual yang perlu diputuskan terlebih dulu.",
      };
    }
    if (disabledReason) {
      return {
        title: "Tidak Ada Aksi",
        description: disabledReason,
      };
    }
    return {
      title: "Proses Pelunasan",
      description: "Pilih metode yang paling sesuai untuk menyelesaikan sisa tagihan booking.",
    };
  }, [pendingAttempt, disabledReason]);

  const waitForSnap = async () => {
    if (window.snap) return window.snap;
    const started = Date.now();
    while (Date.now() - started < 5000) {
      if (window.snap) return window.snap;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return null;
  };

  const handleProceed = async () => {
    if (!booking || !selectedMethodDetail) return;
    try {
      setProcessing(true);
      if (selectedMethodDetail.code === "cash") {
        await api.post(`/bookings/${booking.id}/settle-cash`);
        toast.success("Pelunasan cash berhasil");
        void fetchDetail("background");
        return;
      }

      if (selectedMethodDetail.verification_type === "auto") {
        const snap = await waitForSnap();
        if (!snap) {
          toast.error("Gateway belum siap");
          return;
        }
        const res = await api.post(
          `/billing/bookings/checkout?mode=settlement&method=${selectedMethodDetail.code}`,
          { booking_id: booking.id },
        );
        snap.pay(res.data.snap_token, {
          onSuccess: () => {
            toast.success("Pelunasan berhasil");
            void fetchDetail("background");
          },
          onPending: () => toast.message("Pembayaran menunggu konfirmasi"),
          onError: () => toast.error("Pembayaran gagal"),
          onClose: () => void fetchDetail("background"),
        });
        return;
      }

      const res = await api.post(`/bookings/${booking.id}/manual-payment`, {
        booking_id: booking.id,
        scope: "settlement",
        method: selectedMethodDetail.code,
      });
      toast.success(`Transaksi manual dibuat (${res.data.reference})`);
      void fetchDetail("background");
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal memproses pelunasan");
    } finally {
      setProcessing(false);
    }
  };

  const handleVerify = async (attemptID: string, approve: boolean) => {
    try {
      setProcessing(true);
      await api.post(`/bookings/payment-attempts/${attemptID}/${approve ? "verify" : "reject"}`, {
        notes: "",
      });
      toast.success(approve ? "Pembayaran manual diverifikasi" : "Pembayaran manual ditolak");
      void fetchDetail("background");
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Gagal memproses review");
    } finally {
      setProcessing(false);
    }
  };

  const getMethodIcon = (code?: string) => {
    if (code === "cash") return Wallet;
    if (code === "qris_static") return QrCode;
    if (code === "bank_transfer") return Landmark;
    return CreditCard;
  };

  if (loading) return <BookingDetailSkeleton />;
  if (!booking) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 pb-20 pt-3 md:px-4 lg:px-6">
      <Script
        src={
          (process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || "").toLowerCase() === "true"
            ? "https://app.midtrans.com/snap/snap.js"
            : "https://app.sandbox.midtrans.com/snap/snap.js"
        }
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
        onLoad={() => setMidtransReady(true)}
        onError={() => setMidtransReady(false)}
      />

      <Button
        variant="ghost"
        onClick={() => router.push(`/admin/bookings/${booking.id}`)}
        className="h-auto px-0 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"
      >
        <ArrowLeft className="mr-2 h-3.5 w-3.5" />
        Kembali ke booking
      </Button>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] xl:col-span-8 xl:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--bookinaja-600)]">
                Payment Admin
              </p>
              <h1 className="mt-2 text-2xl font-[950] tracking-tight text-slate-950 dark:text-white">
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
            <Badge className="border-none bg-slate-950 text-white">
              Sesi: {bookingStatus === "completed" ? "Selesai" : booking.status || "Menunggu"}
            </Badge>
            <Badge className={cn("border-none", paymentStatusBadge.className)}>
              Bayar: {paymentStatusBadge.label}
            </Badge>
            {refreshing ? (
              <Badge className="border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                Refresh
              </Badge>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Tanggal</div>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                {booking.start_time ? format(new Date(booking.start_time), "dd MMM yyyy", { locale: localeID }) : "-"}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Jam</div>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                {booking.start_time ? format(new Date(booking.start_time), "HH:mm") : "-"} - {booking.end_time ? format(new Date(booking.end_time), "HH:mm") : "-"}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Sudah Dibayar</div>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">Rp {formatMoney(booking.paid_amount)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-blue-200 bg-blue-50 px-3 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
              <div className="text-[11px] font-medium text-blue-600 dark:text-blue-200">Sisa Pelunasan</div>
              <p className="mt-2 text-sm font-semibold text-blue-900 dark:text-blue-100">Rp {formatMoney(balanceDue)}</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] xl:col-span-4 xl:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Next Action
          </p>
          <h2 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
            {nextAction.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {nextAction.description}
          </p>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
            Yang sering dipakai: gateway, cash, transfer bank, QRIS static.
          </div>
        </Card>

        {pendingAttempt ? (
          <Card className="rounded-[1.75rem] border border-amber-200 bg-amber-50/80 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-950/20 xl:col-span-4 xl:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-200">
                  Pending Verifikasi
                </p>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-100">
                  {pendingAttempt.method_label} menunggu keputusan admin.
                </p>
              </div>
              <Badge className="border-none bg-amber-500 text-white">Review</Badge>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm dark:border-amber-500/20 dark:bg-[#0f0f17]">
                <div className="font-medium text-slate-950 dark:text-white">
                  Rp {formatMoney(pendingAttempt.amount)}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {formatDateTime(pendingAttempt.submitted_at)}
                </div>
                {pendingAttempt.proof_url ? (
                  <a
                    href={pendingAttempt.proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--bookinaja-600)] hover:underline dark:text-[var(--bookinaja-200)]"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Buka bukti bayar
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleVerify(pendingAttempt.id, true)}
                  disabled={processing}
                  className="h-10 flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Verifikasi
                </Button>
                <Button
                  onClick={() => handleVerify(pendingAttempt.id, false)}
                  disabled={processing}
                  variant="outline"
                  className="h-10 flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                >
                  Tolak
                </Button>
              </div>
            </div>
          </Card>
        ) : null}

        <Card className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] xl:col-span-8 xl:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Metode Pelunasan
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                Pilih jalur yang paling sesuai
              </h2>
            </div>
            <Badge variant="secondary" className="rounded-full px-3">
              {paymentMethods.length} aktif
            </Badge>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Sering dipakai
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {frequentMethods.map((method) => {
                  const Icon = getMethodIcon(method.code);
                  const selected = selectedMethod === method.code;
                  return (
                    <button
                      key={method.code}
                      type="button"
                      onClick={() => setSelectedMethod(method.code)}
                      className={cn(
                        "rounded-[1.5rem] border px-4 py-4 text-left transition-all",
                        selected
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/15 dark:border-blue-400 dark:bg-blue-500/10"
                          : "border-slate-200 bg-slate-50/70 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03]",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-white p-2 shadow-sm dark:bg-white/10">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-950 dark:text-white">
                              {method.display_name}
                            </p>
                            <Badge className={cn("border-none", method.verification_type === "auto" ? "bg-slate-950 text-white" : "bg-amber-500 text-white")}>
                              {method.verification_type === "auto" ? "Otomatis" : "Manual"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {method.code === "cash"
                              ? "Paling cepat untuk bayar langsung di tempat"
                              : method.code === "midtrans"
                                ? "Paling cocok untuk pembayaran gateway"
                                : method.code === "bank_transfer"
                                  ? "Sering dipakai saat customer transfer manual"
                                  : "Cocok saat tenant pakai QRIS statis"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {rareMethods.length > 0 ? (
              <div className="border-t border-slate-100 pt-4 dark:border-white/10">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  Lebih jarang dipakai
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {rareMethods.map((method) => (
                    <button
                      key={method.code}
                      type="button"
                      onClick={() => setSelectedMethod(method.code)}
                      className={cn(
                        "rounded-[1.5rem] border px-4 py-4 text-left transition-all",
                        selectedMethod === method.code
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/15 dark:border-blue-400 dark:bg-blue-500/10"
                          : "border-slate-200 bg-slate-50/70 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03]",
                      )}
                    >
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">
                        {method.display_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Gunakan bila dibutuhkan oleh operasional khusus.
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedMethodDetail ? (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    {selectedMethodDetail.display_name}
                  </p>
                  <Badge className={cn("border-none", selectedMethodDetail.verification_type === "auto" ? "bg-slate-950 text-white" : "bg-amber-500 text-white")}>
                    {selectedMethodDetail.verification_type === "auto" ? "Otomatis" : "Manual"}
                  </Badge>
                </div>

                {selectedMethodDetail.code === "bank_transfer" ? (
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Bank</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                        {selectedMethodDetail.metadata?.bank_name || "-"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">No. Rekening</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                        {selectedMethodDetail.metadata?.account_number || "-"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Atas Nama</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                        {selectedMethodDetail.metadata?.account_name || "-"}
                      </p>
                    </div>
                  </div>
                ) : null}

                {selectedMethodDetail.code === "qris_static" && selectedMethodDetail.metadata?.qr_image_url ? (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedMethodDetail.metadata.qr_image_url}
                      alt="QRIS static"
                      className="aspect-square w-full object-contain"
                    />
                  </div>
                ) : null}

                <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  {selectedMethodDetail.instructions || "Gunakan metode ini sesuai alur operasional tenant."}
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={handleProceed}
                    disabled={Boolean(disabledReason || pendingAttempt || processing || (selectedMethodDetail.verification_type === "auto" && !midtransReady))}
                    className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                  >
                    {selectedMethodDetail.code === "cash"
                      ? "Tandai Cash Diterima"
                      : selectedMethodDetail.verification_type === "auto"
                        ? "Lanjut ke Gateway"
                        : "Buat Transaksi Manual"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/admin/bookings/${booking.id}`)}
                    className="h-11 rounded-2xl"
                  >
                    Kembali ke Detail
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0f0f17] xl:col-span-12">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Riwayat Pelunasan
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full px-3">
              {settlementAttempts.length} transaksi
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {settlementAttempts.length > 0 ? (
              settlementAttempts.map((attempt) => (
                <div key={attempt.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">
                        {attempt.method_label}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Ref {attempt.reference_code}
                      </p>
                    </div>
                    <Badge className="border-none bg-slate-950 text-white">
                      {attempt.status}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">
                    Rp {formatMoney(attempt.amount)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {formatDateTime(attempt.submitted_at)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                Belum ada riwayat pelunasan.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
