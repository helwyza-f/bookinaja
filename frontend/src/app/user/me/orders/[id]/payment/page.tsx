/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import { ArrowLeft, Landmark, Loader2, QrCode, Upload, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { toast } from "sonner";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { getOrderStatusMeta } from "@/lib/customer-portal";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { customerOrderChannel, customerOrdersChannel } from "@/lib/realtime/channels";
import {
  BOOKING_EVENT_PREFIXES,
  matchesRealtimePrefix,
  type RealtimeEvent,
} from "@/lib/realtime/event-types";

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

type PaymentMethod = {
  code: string;
  display_name: string;
  verification_type?: string;
  is_active?: boolean;
  metadata?: {
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    qr_image_url?: string;
  };
};

type PaymentAttempt = {
  id: string;
  method_code?: string;
  method_label?: string;
  verification_type?: string;
  amount?: number;
  status?: string;
  reference_code?: string;
  payer_note?: string;
  proof_url?: string;
  created_at?: string;
  submitted_at?: string;
};

type CustomerOrderPaymentDetail = {
  id?: string;
  customer_id?: string;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  balance_due?: number;
  grand_total?: number;
  resource_name?: string;
  payment_methods?: PaymentMethod[];
  payment_attempts?: PaymentAttempt[];
};

function patchOrderPaymentFromEvent(current: CustomerOrderPaymentDetail | null, event: RealtimeEvent) {
  const orderID = String(event.refs?.order_id || event.entity_id || "");
  if (!current || !orderID || String(current.id || "") !== orderID) {
    return current;
  }

  return {
    ...current,
    status: String(event.summary?.status ?? current.status ?? ""),
    payment_status: String(event.summary?.payment_status ?? current.payment_status ?? ""),
    balance_due:
      typeof event.summary?.balance_due === "number"
        ? Number(event.summary.balance_due)
        : current.balance_due,
    grand_total:
      typeof event.summary?.grand_total === "number"
        ? Number(event.summary.grand_total)
        : current.grand_total,
  };
}

export default function CustomerOrderPaymentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<CustomerOrderPaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [manualPaymentNote, setManualPaymentNote] = useState("");
  const [manualProofUrl, setManualProofUrl] = useState("");
  const [proofUploading, setProofUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDetail = useCallback(async (mode: "initial" | "background" = "initial") => {
    const background = mode === "background";
    try {
      if (background) setRefreshing(true);
      const res = await api.get(`/user/me/orders/${params.id}`);
      setOrder(res.data);
    } catch (error) {
      if (isTenantAuthError(error)) {
        clearTenantSession({ keepTenantSlug: true });
        router.replace("/user/login");
        return;
      }
      toast.error("Gagal memuat pembayaran order");
      router.replace(`/user/me/orders/${params.id}`);
    } finally {
      if (background) setRefreshing(false);
      else setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    void fetchDetail("initial");
  }, [fetchDetail]);

  const customerID = String(order?.customer_id || "");
  useRealtime({
    enabled: Boolean(customerID && params.id),
    channels:
      customerID && params.id
        ? [customerOrdersChannel(customerID), customerOrderChannel(customerID, String(params.id))]
        : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      setOrder((current) => patchOrderPaymentFromEvent(current, event));
      void fetchDetail("background");
    },
    onReconnect: () => {
      void fetchDetail("background");
    },
  });

  const paymentMethods = useMemo(
    () => (order?.payment_methods || []).filter((item) => item?.is_active !== false),
    [order?.payment_methods],
  );

  useEffect(() => {
    if (paymentMethods.length === 0) return;
    if (!paymentMethods.find((item) => item.code === selectedMethod)) {
      setSelectedMethod(paymentMethods[0].code);
    }
  }, [paymentMethods, selectedMethod]);

  const selectedMethodDetail = paymentMethods.find((item) => item.code === selectedMethod) || paymentMethods[0];
  const amount = Number(order?.balance_due || 0);
  const statusMeta = useMemo(
    () => getOrderStatusMeta(order?.status, order?.payment_status, order?.balance_due),
    [order?.balance_due, order?.payment_status, order?.status],
  );
  const pendingManualAttempt = useMemo(
    () =>
      (order?.payment_attempts || []).find(
        (item) => item?.status === "submitted" || item?.status === "awaiting_verification",
      ),
    [order?.payment_attempts],
  );
  const latestAttempt = useMemo(() => (order?.payment_attempts || [])[0], [order?.payment_attempts]);
  const isPaid = amount <= 0 || statusMeta.label === "Selesai";
  const isUnderReview = statusMeta.label === "Menunggu verifikasi";
  const isProcessing = statusMeta.label === "Pembayaran diproses";
  const canSubmitNewPayment =
    !isPaid && !isUnderReview && !isProcessing && !pendingManualAttempt && amount > 0;

  const uploadManualProof = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Bukti bayar harus berupa gambar");
      return;
    }
    const formData = new FormData();
    formData.append("image", file);
    setProofUploading(true);
    try {
      const res = await api.post(`/user/me/orders/${params.id}/upload-proof`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setManualProofUrl(res.data?.url || "");
      toast.success("Bukti bayar berhasil diupload");
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(apiError.response?.data?.error || "Gagal upload bukti bayar");
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
    if (!order || !selectedMethodDetail) return;
    if (amount <= 0) {
      toast.message("Order ini sudah tidak punya sisa tagihan");
      router.replace(`/user/me/orders/${params.id}`);
      return;
    }
    if (pendingManualAttempt) {
      toast.message("Masih ada pembayaran manual yang menunggu verifikasi admin");
      return;
    }
    if (selectedMethodDetail.verification_type === "manual" && selectedMethodDetail.code !== "cash" && !manualProofUrl.trim()) {
      toast.error("Upload bukti bayar dulu sebelum mengirim pembayaran manual");
      return;
    }
    setProcessing(true);
    try {
      if (selectedMethodDetail.verification_type === "auto") {
        const res = await api.post(`/user/me/orders/${params.id}/payment-checkout`, {
          method: selectedMethodDetail.code,
        });
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
            toast.success("Pembayaran berhasil");
            router.replace(`/user/me/orders/${params.id}`);
          },
          onPending: () => {
            toast.message("Pembayaran menunggu konfirmasi");
            router.replace(`/user/me/orders/${params.id}`);
          },
          onError: () => {
            toast.error("Pembayaran gagal");
            setProcessing(false);
          },
          onClose: () => setProcessing(false),
        });
        return;
      }

      const res = await api.post(`/user/me/orders/${params.id}/manual-payment`, {
        method: selectedMethodDetail.code,
        note: manualPaymentNote,
        proof_url: manualProofUrl,
      });
      toast.success(`Pembayaran manual terkirim (${res.data.reference})`);
      router.replace(`/user/me/orders/${params.id}`);
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(apiError.response?.data?.error || "Gagal memproses pembayaran");
      setProcessing(false);
    }
  };

  const getMeta = (method?: PaymentMethod) => {
    if (!method) return "";
    if (method.code === "bank_transfer") {
      return [method.metadata?.bank_name, method.metadata?.account_number, method.metadata?.account_name]
        .filter(Boolean)
        .join(" · ");
    }
    if (method.code === "qris_static") return "Scan QRIS merchant lalu kirim pembayaran";
    if (method.code === "cash") return "Bayar lalu konfirmasi ke admin tenant";
    return "Verifikasi otomatis via gateway";
  };

  const IconForMethod = (code: string) => {
    if (code === "qris_static") return QrCode;
    if (code === "cash") return Wallet;
    return Landmark;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-20 rounded-[1.5rem]" />
        <Skeleton className="h-96 rounded-[1.5rem]" />
      </div>
    );
  }

  if (!order) return null;

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

      <Button variant="ghost" onClick={() => router.push(`/user/me/orders/${params.id}`)} className="h-10 rounded-2xl px-3">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Order
      </Button>

      <Card className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-none bg-slate-950 text-white">Direct Sale</Badge>
            <Badge className={statusMeta.className}>
              {statusMeta.label}
            </Badge>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {order.resource_name}
              </p>
            <h1 className="mt-2 text-3xl font-black uppercase italic tracking-tighter text-slate-950 dark:text-white">
              Pembayaran order
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {statusMeta.hint || "Selesaikan pembayaran untuk produk yang sudah kamu pilih."}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {refreshing ? "Menyegarkan status pembayaran..." : "Status pembayaran tersinkron otomatis"}
            </p>
          </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Sisa tagihan
              </p>
              <div className="mt-1 text-3xl font-black text-blue-600 dark:text-blue-300">
                Rp{amount.toLocaleString("id-ID")}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Status pembayaran
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
              {isPaid
                ? "Order sudah lunas"
                : isUnderReview
                  ? "Bukti bayar sedang direview"
                  : isProcessing
                    ? "Pembayaran sedang diproses"
                    : "Pilih metode pembayaran"}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {isPaid
                ? "Tidak ada aksi tambahan yang perlu dilakukan customer."
                : isUnderReview
                  ? "Admin tenant akan memverifikasi pembayaran manual yang sudah kamu kirim."
                  : isProcessing
                    ? "Tunggu update otomatis dari gateway atau cek lagi beberapa saat."
                    : "Belum ada pembayaran aktif. Pilih metode yang paling sesuai lalu lanjutkan."}
            </p>
          </div>
          <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
        </div>

        {latestAttempt ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Attempt terakhir
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                  {latestAttempt.method_label || "Pembayaran"}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {latestAttempt.reference_code || "Tanpa referensi"}
                </div>
              </div>
              <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                <div>
                  Rp{Number(latestAttempt.amount || amount || order.grand_total || 0).toLocaleString("id-ID")}
                </div>
                <div className="mt-1">
                  {latestAttempt.created_at
                    ? new Date(latestAttempt.created_at).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </div>
              </div>
            </div>
            {latestAttempt.payer_note ? (
              <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                Catatan: {latestAttempt.payer_note}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-2xl"
            onClick={() => void fetchDetail()}
            disabled={loading || processing}
          >
            <Loader2 className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : "hidden"}`} />
            Refresh status
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-2xl"
            onClick={() => router.push(`/user/me/orders/${params.id}`)}
          >
            Kembali ke detail
          </Button>
        </div>
      </Card>

      {canSubmitNewPayment ? (
        <>
          <div className="grid gap-3">
            {paymentMethods.map((method) => {
              const Icon = IconForMethod(method.code);
              const active = method.code === selectedMethod;
              return (
                <button
                  key={method.code}
                  type="button"
                  onClick={() => setSelectedMethod(method.code)}
                  className={`rounded-[1.5rem] border p-4 text-left transition ${
                    active
                      ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-[#0b0f19] dark:hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-slate-200 p-3 dark:border-white/10">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">{method.display_name}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{getMeta(method)}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedMethodDetail?.code === "qris_static" && selectedMethodDetail?.metadata?.qr_image_url ? (
            <Card className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0b0f19]">
              <img
                src={selectedMethodDetail.metadata.qr_image_url}
                alt="QRIS pembayaran"
                className="mx-auto aspect-square w-full max-w-sm rounded-2xl object-cover"
              />
            </Card>
          ) : null}

          {selectedMethodDetail?.verification_type === "manual" ? (
            <Card className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0b0f19]">
              <div className="space-y-3">
                <Input
                  value={manualPaymentNote}
                  onChange={(event) => setManualPaymentNote(event.target.value)}
                  placeholder="Catatan pembayaran manual"
                  className="h-12 rounded-2xl"
                />
                {selectedMethodDetail?.code !== "cash" ? (
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
                    {proofUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {manualProofUrl ? "Bukti bayar siap dikirim" : "Upload bukti bayar"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void uploadManualProof(file);
                        }
                      }}
                    />
                  </label>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Button
            onClick={handlePay}
            disabled={processing || amount <= 0 || !selectedMethodDetail}
            className="h-12 w-full rounded-2xl bg-blue-600 text-sm font-black uppercase tracking-[0.16em] text-white hover:bg-blue-500"
          >
            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {selectedMethodDetail?.verification_type === "manual" ? "Kirim pembayaran" : "Bayar sekarang"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
