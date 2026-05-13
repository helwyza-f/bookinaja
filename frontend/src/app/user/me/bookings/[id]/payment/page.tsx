/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, CreditCard, ImagePlus, Landmark, QrCode, RefreshCw, Upload, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { customerBookingChannel } from "@/lib/realtime/channels";
import { BOOKING_EVENT_PREFIXES, matchesRealtimePrefix } from "@/lib/realtime/event-types";

const REALTIME_REFRESH_THROTTLE_MS = 1200;

export default function BookingPaymentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState("midtrans");
  const [manualPaymentNote, setManualPaymentNote] = useState("");
  const [manualProofUrl, setManualProofUrl] = useState("");
  const [proofUploading, setProofUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastBackgroundRefreshRef = useRef(0);

  const scope = searchParams.get("scope") === "settlement" ? "settlement" : "deposit";

  const supportsMethodForScope = useCallback(
    (method: any) => {
      if (!method || method.is_active === false) return false;
      if (scope === "deposit" && method.code === "cash") return false;
      return true;
    },
    [scope],
  );

  const fetchDetail = useCallback(async (mode: "initial" | "background" = "initial") => {
    try {
      if (mode === "background") setRefreshing(true);
      const res = await api.get(`/user/me/bookings/${params.id}`);
      setBooking(res.data);
    } catch (error) {
      if (isTenantAuthError(error)) {
        clearTenantSession({ keepTenantSlug: true });
        router.replace("/user/login");
        return;
      }
      toast.error("Gagal memuat halaman pembayaran");
      router.replace(`/user/me/bookings/${params.id}/live`);
    } finally {
      if (mode === "background") setRefreshing(false);
      else setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (params.id) {
      void fetchDetail("initial");
    }
  }, [fetchDetail, params.id]);

  const customerID = String(booking?.customer_id || "");
  useRealtime({
    enabled: Boolean(customerID && params.id),
    channels:
      customerID && params.id
        ? [customerBookingChannel(customerID, String(params.id))]
        : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      setBooking((current: any) =>
        current
          ? {
              ...current,
              status: event.summary?.status ?? current.status,
              payment_status: event.summary?.payment_status ?? current.payment_status,
              grand_total:
                typeof event.summary?.grand_total === "number"
                  ? Number(event.summary.grand_total)
                  : current.grand_total,
              balance_due:
                typeof event.summary?.balance_due === "number"
                  ? Number(event.summary.balance_due)
                  : current.balance_due,
            }
          : current,
      );
      const now = Date.now();
      if (now - lastBackgroundRefreshRef.current < REALTIME_REFRESH_THROTTLE_MS) return;
      lastBackgroundRefreshRef.current = now;
      void fetchDetail("background");
    },
    onReconnect: () => {
      void fetchDetail("background");
    },
  });

  const paymentMethods = useMemo(
    () => (booking?.payment_methods || []).filter((item: any) => supportsMethodForScope(item)),
    [booking?.payment_methods, supportsMethodForScope],
  );
  const paymentAttempts = useMemo(
    () => booking?.payment_attempts || [],
    [booking?.payment_attempts],
  );
  const hasPromo = useMemo(
    () =>
      Number(booking?.discount_amount || 0) > 0 &&
      String(booking?.promo_code || "").trim() !== "",
    [booking?.discount_amount, booking?.promo_code],
  );
  const pendingManualAttempt = useMemo(
    () =>
      paymentAttempts.find(
        (item: any) =>
          item?.payment_scope === (scope === "deposit" ? "deposit" : "settlement") &&
          (item?.status === "submitted" || item?.status === "awaiting_verification"),
      ),
    [paymentAttempts, scope],
  );

  useEffect(() => {
    if (paymentMethods.length === 0) return;
    if (!paymentMethods.find((item: any) => item.code === selectedMethod)) {
      setSelectedMethod(paymentMethods[0].code);
    }
  }, [paymentMethods, selectedMethod]);

  const selectedMethodDetail =
    paymentMethods.find((item: any) => item.code === selectedMethod) || paymentMethods[0];

  const amount = useMemo(() => {
    if (!booking) return 0;
    return scope === "deposit"
      ? Number(booking.deposit_amount || 0)
      : Number(booking.balance_due || 0);
  }, [booking, scope]);

  const paymentAccessError = useMemo(() => {
    if (!booking) return "";
    const bookingStatus = String(booking.status || "").toLowerCase();
    const bookingPaymentStatus = String(booking.payment_status || "").toLowerCase();

    if (scope === "settlement") {
      if (bookingStatus !== "completed") {
        return "Pelunasan baru tersedia setelah sesi selesai.";
      }
      if (Number(booking.balance_due || 0) <= 0 || bookingPaymentStatus === "settled") {
        return "Booking ini sudah tidak memiliki sisa tagihan.";
      }
      if (paymentMethods.length === 0) {
        return "Tenant belum menyiapkan metode pembayaran untuk pelunasan.";
      }
      return "";
    }

    if (Number(booking.deposit_amount || 0) <= 0) {
      return "Booking ini tidak membutuhkan DP.";
    }
    if (bookingPaymentStatus !== "pending") {
      return "Halaman DP hanya tersedia sebelum pembayaran DP tercatat.";
    }
    if (paymentMethods.length === 0) {
      return "Tenant belum menyiapkan metode pembayaran untuk DP.";
    }
    return "";
  }, [booking, paymentMethods.length, scope]);

  const paymentAccessNoticeCode = useMemo(() => {
    if (!booking) return "";
    const bookingStatus = String(booking.status || "").toLowerCase();
    const bookingPaymentStatus = String(booking.payment_status || "").toLowerCase();

    if (scope === "settlement") {
      if (bookingStatus !== "completed") return "settlement_locked";
      if (Number(booking.balance_due || 0) <= 0 || bookingPaymentStatus === "settled") {
        return "no_balance_due";
      }
      if (paymentMethods.length === 0) return "settlement_methods_unavailable";
      return "";
    }

    if (Number(booking.deposit_amount || 0) <= 0) return "deposit_not_required";
    if (bookingPaymentStatus !== "pending") return "deposit_unavailable";
    if (paymentMethods.length === 0) return "deposit_methods_unavailable";
    return "";
  }, [booking, paymentMethods.length, scope]);

  const paymentStatus = String(booking?.payment_status || "").toLowerCase();
  const sessionStatus = String(booking?.status || "").toLowerCase();
  const pendingAttemptStatus = String(pendingManualAttempt?.status || "").toLowerCase();

  useEffect(() => {
    if (!booking || !paymentAccessError) return;
    router.replace(
      `/user/me/bookings/${params.id}/live${paymentAccessNoticeCode ? `?notice=${paymentAccessNoticeCode}` : ""}`,
    );
  }, [booking, params.id, paymentAccessError, paymentAccessNoticeCode, router]);

  const paymentStatusLabel =
    paymentStatus === "awaiting_verification"
      ? "Menunggu Verifikasi"
      : paymentStatus === "partial_paid"
        ? "DP Tercatat"
        : paymentStatus === "settled" || paymentStatus === "paid"
          ? "Tercatat"
          : booking?.payment_status || "pending";

  const selectedMethodRequiresProof =
    selectedMethodDetail?.verification_type === "manual" &&
    selectedMethodDetail?.code !== "cash";

  const instructionCta =
    selectedMethodDetail?.verification_type === "auto"
      ? "Lanjut checkout."
      : selectedMethodDetail?.code === "cash"
        ? "Bayar lalu konfirmasi."
        : "Upload lalu kirim.";

  useEffect(() => {
    if (selectedMethodDetail?.code === "cash" && manualProofUrl) {
      setManualProofUrl("");
    }
  }, [manualProofUrl, selectedMethodDetail?.code]);

  const getPaymentMethodIcon = (code: string) => {
    if (code === "qris_static") return QrCode;
    if (code === "cash") return Wallet;
    return Landmark;
  };

  const getPaymentMethodMeta = (method: any) => {
    if (!method) return "";
    if (method.code === "bank_transfer") {
      const parts = [
        method.metadata?.bank_name,
        method.metadata?.account_number,
        method.metadata?.account_name,
      ].filter(Boolean);
      return parts.join(" · ") || "Detail rekening belum lengkap";
    }
    if (method.code === "qris_static") {
      return method.metadata?.qr_image_url
        ? "Scan QRIS merchant lalu konfirmasi pembayaran"
        : "QRIS belum dikonfigurasi";
    }
    if (method.code === "cash") {
      return "Konfirmasi langsung ke kasir atau admin tenant";
    }
    return "Verifikasi otomatis via gateway";
  };

  const renderInstructionPanel = (method: any) => {
    if (!method) return null;

    if (method.code === "bank_transfer") {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Bank</p>
              <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                {method.metadata?.bank_name || "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">No. Rekening</p>
              <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                {method.metadata?.account_number || "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Atas Nama</p>
              <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                {method.metadata?.account_name || "-"}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
            Transfer Rp {amount.toLocaleString("id-ID")}
          </div>
        </div>
      );
    }

    if (method.code === "qris_static") {
      return (
        <div className="space-y-3">
          {method.metadata?.qr_image_url ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <img
                src={method.metadata.qr_image_url}
                alt="QRIS pembayaran"
                className="mx-auto aspect-square w-full max-w-sm rounded-2xl object-cover"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
              QRIS belum tersedia.
            </div>
          )}
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
            Scan QR lalu lanjut kirim.
          </div>
        </div>
      );
    }

    if (method.code === "cash") {
      return (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
          Cash, tanpa upload.
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-xs font-medium text-cyan-900 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-100">
        Checkout di Midtrans.
      </div>
    );
  };

  const uploadManualProof = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Bukti bayar harus berupa gambar");
      return;
    }
    const formData = new FormData();
    formData.append("image", file);
    setProofUploading(true);
    try {
      const res = await api.post(`/user/me/bookings/${params.id}/upload-proof`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setManualProofUrl(res.data?.url || "");
      toast.success("Bukti bayar berhasil diupload");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal upload bukti bayar");
    } finally {
      setProofUploading(false);
    }
  };

  const waitForSnap = async () => {
    if (window.snap) return window.snap;
    const started = Date.now();
    while (Date.now() - started < 5000) {
      if (window.snap) return window.snap;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    toast.error("Midtrans belum siap");
    return null;
  };

  const handlePay = async () => {
    if (!booking || !selectedMethodDetail) return;
    if (paymentAccessError) {
      router.replace(
        `/user/me/bookings/${params.id}/live${paymentAccessNoticeCode ? `?notice=${paymentAccessNoticeCode}` : ""}`,
      );
      return;
    }
    if (pendingManualAttempt) {
      toast.message("Masih ada pembayaran manual yang menunggu verifikasi admin");
      return;
    }
    if (selectedMethodRequiresProof && !manualProofUrl.trim()) {
      toast.error("Upload bukti bayar dulu sebelum mengirim pembayaran manual");
      return;
    }
    setProcessing(true);
    try {
      if (selectedMethodDetail.verification_type === "auto") {
        const res = await api.post(
          `/public/bookings/${params.id}/checkout?mode=${scope === "deposit" ? "dp" : "settlement"}&method=${selectedMethodDetail.code}`,
        );
        if (res.data?.redirect_url) {
          window.location.assign(res.data.redirect_url);
          return;
        }
        const snap = await waitForSnap();
        if (!snap) {
          setProcessing(false);
          return;
        }
        snap.pay(res.data.snap_token, {
          onSuccess: () => {
            toast.success(scope === "deposit" ? "DP berhasil dibayar" : "Pelunasan berhasil dibayar");
            router.replace(`/user/me/bookings/${params.id}/live`);
          },
          onPending: () => {
            toast.message("Pembayaran menunggu konfirmasi");
            router.replace(`/user/me/bookings/${params.id}/live`);
          },
          onError: () => {
            toast.error("Pembayaran gagal");
            setProcessing(false);
          },
          onClose: () => setProcessing(false),
        });
        return;
      }

      const res = await api.post(`/user/me/bookings/${params.id}/manual-payment`, {
        booking_id: params.id,
        scope,
        method: selectedMethodDetail.code,
        note: manualPaymentNote,
        proof_url: manualProofUrl,
      });
      toast.success(`Pembayaran manual terkirim (${res.data.reference})`);
      router.replace(`/user/me/bookings/${params.id}/live`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal memproses pembayaran");
      setProcessing(false);
    }
  };

  if (loading || paymentAccessError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-20 rounded-[1.5rem]" />
        <Skeleton className="h-96 rounded-[1.5rem]" />
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <Script
        src={
          (process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || "").toLowerCase() === "true"
            ? "https://app.midtrans.com/snap/snap.js"
            : "https://app.sandbox.midtrans.com/snap/snap.js"
        }
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
      />
      <Button
        variant="ghost"
        onClick={() => router.push(`/user/me/bookings/${params.id}/live`)}
        className="h-10 rounded-2xl px-3"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Live
      </Button>

      <Card className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-none bg-slate-950 text-white">
              {scope === "deposit" ? "DP" : "Pelunasan"}
            </Badge>
            <Badge className="border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
              {paymentStatusLabel}
            </Badge>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {booking.resource_name}
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Rp {amount.toLocaleString("id-ID")}
              </h1>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                {refreshing ? "Memuat ulang status..." : "Auto update aktif"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Total</p>
              <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                Rp {Number(booking.grand_total || 0).toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Status pembayaran</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                  {pendingManualAttempt
                    ? "Menunggu verifikasi"
                    : paymentStatus === "settled" || paymentStatus === "paid"
                      ? "Pembayaran selesai"
                      : selectedMethodDetail?.verification_type === "auto"
                        ? "Siap checkout"
                        : "Siap kirim bukti bayar"}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {pendingManualAttempt
                    ? "Admin tenant sedang mengecek pembayaran manualmu."
                    : paymentStatus === "settled" || paymentStatus === "paid"
                      ? "Tagihan untuk tahap booking ini sudah tercatat."
                      : scope === "deposit"
                        ? "Selesaikan DP agar booking bisa diproses tepat waktu."
                        : "Selesaikan pelunasan setelah sesi berakhir."}
                </p>
              </div>
              <Badge className="border-none bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                {scope === "deposit" ? "Step DP" : "Step Pelunasan"}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Status</p>
              <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                {paymentStatusLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Sesi</p>
              <p className="mt-1 text-sm font-semibold capitalize text-slate-950 dark:text-white">
                {sessionStatus || "-"}
              </p>
            </div>
          </div>

          {hasPromo ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
                    Promo
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                    {booking.promo_code}
                  </p>
                </div>
                <Badge className="border-none bg-emerald-600 text-white">
                  -Rp {Number(booking.discount_amount || 0).toLocaleString("id-ID")}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl border border-emerald-200/70 bg-white/80 p-3 dark:border-emerald-400/20 dark:bg-black/10">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Sebelum</p>
                  <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                    Rp {Number(booking.original_grand_total || 0).toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200/70 bg-white/80 p-3 dark:border-emerald-400/20 dark:bg-black/10">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Sesudah</p>
                  <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                    Rp {Number(booking.grand_total || 0).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      {pendingManualAttempt ? (
        <Card className="rounded-[1.5rem] border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-500/20 dark:bg-[#0b0f19]">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-slate-950 dark:text-white">
                      Pembayaran sedang direview admin
                    </p>
                    <Badge className="border-none bg-amber-500 text-white">
                      {pendingAttemptStatus === "awaiting_verification" ? "Menunggu Verifikasi" : pendingManualAttempt.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Referensi</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                    {pendingManualAttempt.reference_code || "-"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Metode</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                    {pendingManualAttempt.method_label || selectedMethodDetail?.display_name || "-"}
                  </p>
                </div>
              </div>

              {pendingManualAttempt.proof_url ? (
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="mt-3 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                    <img
                      src={pendingManualAttempt.proof_url}
                      alt={`Bukti bayar ${pendingManualAttempt.reference_code}`}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </div>
                </div>
              ) : null}

              {pendingManualAttempt.payer_note ? (
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                  <p className="mt-2">{pendingManualAttempt.payer_note}</p>
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => void fetchDetail()}
                  className="h-11 flex-1 rounded-2xl"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  onClick={() => router.push(`/user/me/bookings/${params.id}/live`)}
                  className="h-11 flex-1 rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                >
                  Kembali
                </Button>
              </div>
            </div>
        </Card>
      ) : (
        <Card className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Langkah berikutnya
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {selectedMethodDetail?.verification_type === "auto"
                    ? "Pilih metode gateway lalu lanjut ke checkout."
                    : selectedMethodDetail?.code === "cash"
                      ? "Konfirmasi pembayaran cash agar admin bisa memverifikasi."
                      : "Upload bukti bayar lalu kirim untuk diverifikasi admin."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-semibold text-slate-950 dark:text-white">Metode</p>
              </div>

              <div className="grid gap-2">
                {paymentMethods.map((method: any) => {
                  const Icon = getPaymentMethodIcon(method.code);
                  const selected = selectedMethod === method.code;
                  return (
                    <button
                      key={method.code}
                      type="button"
                      onClick={() => setSelectedMethod(method.code)}
                      className={cn(
                        "w-full rounded-[1.5rem] border px-4 py-4 text-left transition-all",
                        selected
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/15 dark:bg-blue-500/10"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03]",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("rounded-2xl p-3", selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200")}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-950 dark:text-white">
                              {method.display_name}
                            </p>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-white/10 dark:text-slate-300">
                              {method.verification_type === "auto" ? "Auto" : "Manual"}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                            {getPaymentMethodMeta(method)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedMethodDetail ? (
                <div className="space-y-3">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                      <ArrowRight className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-semibold">Instruksi</p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {selectedMethodDetail.instructions || getPaymentMethodMeta(selectedMethodDetail)}
                    </p>
                    <div className="mt-4">
                      {renderInstructionPanel(selectedMethodDetail)}
                    </div>
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                      {instructionCta}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                      <ArrowRight className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-semibold">
                        {selectedMethodDetail.verification_type === "auto"
                          ? "Checkout"
                          : selectedMethodDetail.code === "cash"
                          ? "Konfirmasi"
                            : "Kirim"}
                      </p>
                    </div>
                    <div className="mt-3 rounded-2xl bg-white px-3 py-2 text-[11px] font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
                      {selectedMethodDetail.verification_type === "auto"
                        ? "Auto."
                        : selectedMethodDetail.code === "cash"
                          ? "Dicek admin."
                          : "Dicek admin."}
                    </div>
                    {selectedMethodDetail.verification_type !== "auto" ? (
                      <div className="mt-4 space-y-3">
                        {selectedMethodRequiresProof ? (
                          <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                            <div className="space-y-2">
                              <label className="mt-2 block cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={proofUploading}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void uploadManualProof(file);
                                  }}
                                  className="hidden"
                                />
                                <div className="overflow-hidden rounded-[1.5rem] border border-dashed border-blue-300 bg-white/90 transition hover:border-blue-500 hover:bg-white dark:border-blue-400/30 dark:bg-slate-950/40 dark:hover:border-blue-300">
                                  {proofUploading ? (
                                    <div className="space-y-3 p-5 text-center">
                                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
                                        <Upload className="h-6 w-6 animate-pulse" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                          Mengupload...
                                        </p>
                                      </div>
                                    </div>
                                  ) : manualProofUrl ? (
                                    <div>
                                      <div className="relative">
                                        <img
                                          src={manualProofUrl}
                                          alt="Bukti pembayaran"
                                          className="max-h-72 w-full object-cover"
                                        />
                                        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white shadow-lg">
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          Bukti terupload
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between gap-3 p-4">
                                        <div>
                                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                            Bukti bayar
                                          </p>
                                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            Tap untuk ganti
                                          </p>
                                        </div>
                                        <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                                          Ganti
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-3 p-5 text-center">
                                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200">
                                        <ImagePlus className="h-6 w-6" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                          Upload bukti
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                          PNG / JPG
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </label>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
                            Cash, tanpa upload.
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {selectedMethodDetail.code === "cash"
                              ? "Catatan cash"
                              : "Catatan opsional"}
                          </label>
                          <textarea
                            value={manualPaymentNote}
                            onChange={(e) => setManualPaymentNote(e.target.value)}
                            rows={2}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-slate-950/40"
                            placeholder={
                              selectedMethodDetail.code === "bank_transfer"
                                ? "Contoh: transfer BCA 13:20"
                                : selectedMethodDetail.code === "qris_static"
                                  ? "Contoh: QRIS 13:25"
                                  : selectedMethodDetail.code === "cash"
                                    ? "Contoh: bayar ke kasir"
                                  : "Opsional"
                            }
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <Button
                onClick={handlePay}
                disabled={processing}
                className="h-14 w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-500"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {selectedMethodDetail?.verification_type === "auto"
                  ? "Lanjut ke Midtrans"
                  : selectedMethodDetail?.code === "cash"
                    ? "Konfirmasi Cash"
                    : `Kirim ${selectedMethodDetail?.display_name || "Manual"}`}
              </Button>
            </div>
        </Card>
      )}
    </div>
  );
}
