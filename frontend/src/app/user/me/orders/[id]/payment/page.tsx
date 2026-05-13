/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import {
  ArrowLeft,
  BadgeCheck,
  CircleDashed,
  Landmark,
  Loader2,
  QrCode,
  ScanSearch,
  Upload,
  Wallet,
} from "lucide-react";
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

const REALTIME_REFRESH_THROTTLE_MS = 1200;

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
  const lastBackgroundRefreshRef = useRef(0);

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
  const isPaid = amount <= 0 || statusMeta.label === "Lunas";
  const isUnderReview = statusMeta.label === "Menunggu verifikasi";
  const isProcessing = statusMeta.label === "Diproses";
  const canSubmitNewPayment =
    !isPaid && !isUnderReview && !isProcessing && !pendingManualAttempt && amount > 0;
  const paymentStep = isPaid ? 3 : isUnderReview || isProcessing ? 2 : 1;

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
    if (method.code === "qris_static") return "Scan QRIS lalu lanjut";
    if (method.code === "cash") return "Bayar langsung ke admin";
    return "Verifikasi otomatis";
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
            <Badge className="border-none bg-slate-950 text-white dark:bg-white dark:text-slate-950">Direct Sale</Badge>
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
                {statusMeta.hint || "Selesaikan pembayaran order ini."}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {refreshing ? "Memuat ulang status..." : "Auto update aktif"}
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

          <div className="grid gap-3 md:grid-cols-3">
            <PaymentStepCard
              title="Order dibuat"
              description="Produk sudah dipilih dan order berhasil dibuat."
              done
              active={paymentStep === 1}
            />
            <PaymentStepCard
              title="Pembayaran"
              description={
                isPaid
                  ? "Tagihan sudah beres."
                  : isUnderReview
                    ? "Bukti bayar sedang dicek."
                    : isProcessing
                      ? "Pembayaran sedang diproses."
                      : "Pilih metode dan selesaikan tagihan."
              }
              done={paymentStep > 2}
              active={paymentStep === 2}
            />
            <PaymentStepCard
              title="Selesai"
              description="Order akan masuk ke riwayat setelah pembayarannya selesai."
              done={paymentStep === 3}
              active={false}
            />
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
                ? "Sudah lunas"
                : isUnderReview
                  ? "Bukti bayar dicek"
                  : isProcessing
                    ? "Pembayaran diproses"
                    : "Pilih metode"}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {isPaid
                ? "Tidak ada tagihan tersisa."
                : isUnderReview
                  ? "Tunggu admin cek bukti bayar."
                  : isProcessing
                    ? "Tunggu update otomatis dari gateway."
                    : "Pilih metode lalu lanjutkan."}
            </p>
          </div>
          <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
        </div>

        {latestAttempt ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Pembayaran terakhir
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
            Refresh
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

      {isPaid ? (
        <Card className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-emerald-600 p-2 text-white">
              <BadgeCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                Pembayaran sudah selesai
              </div>
              <p className="mt-1 text-sm text-emerald-800/80 dark:text-emerald-100/80">
                Tidak ada tagihan tersisa. Kamu bisa kembali ke detail order atau portal customer.
              </p>
            </div>
          </div>
        </Card>
      ) : isUnderReview ? (
        <Card className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-500 p-2 text-white">
              <ScanSearch className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Bukti bayar sedang dicek admin
              </div>
              <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-100/80">
                Tidak perlu kirim ulang pembayaran sekarang. Tunggu verifikasi admin, lalu status order akan ter-update otomatis.
              </p>
            </div>
          </div>
        </Card>
      ) : isProcessing ? (
        <Card className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-5 dark:border-blue-500/20 dark:bg-blue-500/10">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-600 p-2 text-white">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div>
              <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Pembayaran sedang diproses
              </div>
              <p className="mt-1 text-sm text-blue-800/80 dark:text-blue-100/80">
                Tunggu konfirmasi dari gateway atau refresh halaman ini beberapa saat lagi.
              </p>
            </div>
          </div>
        </Card>
      ) : canSubmitNewPayment ? (
        <>
          <Card className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Langkah 2
              </p>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                Pilih metode pembayaran
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Gunakan metode yang paling nyaman. Untuk pembayaran manual, bukti bayar bisa dikirim dari sini juga.
              </p>
            </div>
          </Card>

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
                    {manualProofUrl ? "Bukti siap" : "Upload bukti bayar"}
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

function PaymentStepCard({
  title,
  description,
  done,
  active,
}: {
  title: string;
  description: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={
        done
          ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10"
          : active
            ? "rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10"
            : "rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]"
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            done
              ? "rounded-full bg-emerald-600 p-2 text-white"
              : active
                ? "rounded-full bg-blue-600 p-2 text-white"
                : "rounded-full bg-slate-300 p-2 text-slate-700 dark:bg-white/10 dark:text-slate-200"
          }
        >
          {done ? <BadgeCheck className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-950 dark:text-white">{title}</div>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
    </div>
  );
}
