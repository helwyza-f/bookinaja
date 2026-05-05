/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

export default function BookingPaymentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [midtransReady, setMidtransReady] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("midtrans");
  const [manualPaymentNote, setManualPaymentNote] = useState("");
  const [manualProofUrl, setManualProofUrl] = useState("");
  const [proofUploading, setProofUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const scope = searchParams.get("scope") === "settlement" ? "settlement" : "deposit";

  const fetchDetail = useCallback(async () => {
    try {
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
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (params.id) {
      void fetchDetail();
    }
  }, [fetchDetail, params.id]);

  useEffect(() => {
    if (window.snap) {
      setMidtransReady(true);
    }
  }, []);

  const paymentMethods = useMemo(
    () => (booking?.payment_methods || []).filter((item: any) => item?.is_active !== false),
    [booking?.payment_methods],
  );
  const paymentAttempts = useMemo(
    () => booking?.payment_attempts || [],
    [booking?.payment_attempts],
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

  const paymentStatus = String(booking?.payment_status || "").toLowerCase();
  const sessionStatus = String(booking?.status || "").toLowerCase();
  const pendingAttemptStatus = String(pendingManualAttempt?.status || "").toLowerCase();

  const paymentStatusLabel =
    paymentStatus === "awaiting_verification"
      ? "Menunggu Verifikasi"
      : paymentStatus === "partial_paid"
        ? "DP Tercatat"
        : paymentStatus === "settled" || paymentStatus === "paid"
          ? "Tercatat"
          : booking?.payment_status || "pending";

  const pendingAttemptHint =
    scope === "deposit"
      ? "DP manual kamu sudah masuk antrean review admin. Booking baru bisa lanjut ke tahap berikutnya setelah admin memverifikasi pembayaran ini."
      : "Pelunasan manual kamu sudah masuk antrean review admin. Status booking akan diperbarui setelah admin memverifikasi pembayaran ini.";

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
      return parts.join(" • ") || "Detail rekening belum lengkap";
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

  const instructionCta =
    selectedMethodDetail?.code === "bank_transfer"
      ? "Sudah transfer? lanjut upload bukti di langkah berikutnya."
      : selectedMethodDetail?.code === "qris_static"
        ? "Sudah scan dan bayar QRIS? lanjut kirim bukti sekarang."
        : selectedMethodDetail?.code === "cash"
          ? "Sudah bayar ke kasir? lanjut konfirmasi pembayaran."
          : "Kalau sudah siap, lanjutkan ke gateway pembayaran.";

  const confirmationHint =
    selectedMethodDetail?.code === "bank_transfer"
      ? "Pastikan bukti transfer terlihat jelas agar admin bisa verifikasi lebih cepat."
      : selectedMethodDetail?.code === "qris_static"
        ? "Upload screenshot atau bukti transaksi QRIS agar verifikasi admin lebih cepat."
        : selectedMethodDetail?.code === "cash"
          ? "Tambahkan catatan singkat jika pembayaran dilakukan langsung di lokasi."
          : "Kamu akan diarahkan ke gateway aman untuk menyelesaikan pembayaran.";

  const renderInstructionPanel = (method: any) => {
    if (!method) return null;

    if (method.code === "bank_transfer") {
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
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
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
            Transfer tepat sebesar <span className="font-semibold">Rp {amount.toLocaleString("id-ID")}</span> ke rekening di atas, lalu lanjutkan ke langkah upload bukti pembayaran.
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
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
              QRIS belum tersedia. Hubungi tenant untuk instruksi pembayaran lain.
            </div>
          )}
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
            Scan QRIS di atas dari aplikasi e-wallet atau mobile banking kamu, selesaikan pembayaran, lalu lanjutkan ke langkah upload bukti pembayaran.
          </div>
        </div>
      );
    }

    if (method.code === "cash") {
      return (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
          Datang ke lokasi tenant dan lakukan pembayaran langsung ke kasir atau admin, lalu lanjutkan ke langkah konfirmasi pembayaran.
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
        Pembayaran akan diproses otomatis oleh gateway setelah kamu lanjutkan ke langkah berikutnya.
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
    if (pendingManualAttempt) {
      toast.message("Masih ada pembayaran manual yang menunggu verifikasi admin");
      return;
    }
    setProcessing(true);
    try {
      if (selectedMethodDetail.verification_type === "auto") {
        const res = await api.post(
          `/public/bookings/${params.id}/checkout?mode=${scope === "deposit" ? "dp" : "settlement"}&method=${selectedMethodDetail.code}&slug=${booking.tenant_slug}`,
        );
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

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Skeleton className="h-20 rounded-[2rem]" />
        <Skeleton className="h-96 rounded-[2rem]" />
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-[#050505]">
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
      <div className="mx-auto max-w-3xl space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/user/me/bookings/${params.id}/live`)}
          className="rounded-2xl"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Live Controller
        </Button>

        <Card className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0c0c0c]">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-none bg-slate-950 text-white">
                {scope === "deposit" ? "Pembayaran DP" : "Pelunasan Booking"}
              </Badge>
              <Badge className="border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                {paymentStatusLabel}
              </Badge>
              {sessionStatus ? (
                <Badge className="border-none bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                  sesi {sessionStatus}
                </Badge>
              ) : null}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
              {booking.resource_name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pilih metode pembayaran yang paling nyaman. Halaman ini khusus untuk proses bayar agar alurnya lebih fokus dan minim distraksi.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Total</p>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                Rp {Number(booking.grand_total || 0).toLocaleString("id-ID")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                {scope === "deposit" ? "DP" : "Sisa Bayar"}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                Rp {amount.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Status</p>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                {paymentStatusLabel}
              </p>
            </div>
          </div>
        </Card>

        {pendingManualAttempt ? (
          <Card className="rounded-[2rem] border border-amber-200 bg-white p-5 shadow-sm dark:border-amber-500/20 dark:bg-[#0c0c0c]">
            <div className="space-y-4">
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
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {pendingAttemptHint}
                  </p>
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
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                    Bukti bayar terkirim
                  </p>
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
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                    Catatan yang kamu kirim
                  </p>
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
                  Refresh Status
                </Button>
                <Button
                  onClick={() => router.push(`/user/me/bookings/${params.id}/live`)}
                  className="h-11 flex-1 rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                >
                  Kembali ke Live Controller
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0c0c0c]">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                  Pilih metode
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Metode aktif ini diatur oleh tenant dan akan dipakai untuk {scope === "deposit" ? "DP" : "pelunasan"} booking kamu.
                </p>
              </div>

              <div className="grid gap-3">
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
                              {method.verification_type === "auto" ? "Otomatis" : "Manual"}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {getPaymentMethodMeta(method)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedMethodDetail ? (
                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                      <ArrowRight className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-semibold">Langkah 2 · Instruksi Pembayaran</p>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
                      {selectedMethodDetail.instructions}
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
                          ? "Langkah 3 · Lanjutkan Pembayaran"
                          : "Langkah 3 · Upload Bukti dan Konfirmasi"}
                      </p>
                    </div>
                    <div className="mt-3 rounded-2xl bg-white px-3 py-2 text-[11px] font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
                      {selectedMethodDetail.verification_type === "auto"
                        ? "Kamu akan diarahkan ke gateway, lalu status booking diperbarui otomatis setelah pembayaran berhasil."
                        : "Setelah bukti dikirim, admin tenant akan memverifikasi sebelum status booking diperbarui."}
                    </div>
                    <p className="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">
                      {confirmationHint}
                    </p>

                    {selectedMethodDetail.verification_type !== "auto" ? (
                      <div className="mt-4 space-y-4">
                        <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-900 dark:text-white">
                              Upload bukti bayar
                            </label>
                            <p className="text-xs leading-6 text-slate-600 dark:text-slate-300">
                              Ini yang paling penting agar admin bisa memverifikasi pembayaran kamu dengan cepat.
                            </p>
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
                              <div className="rounded-[1.5rem] border border-dashed border-blue-300 bg-white/90 p-5 text-center transition hover:border-blue-500 hover:bg-white dark:border-blue-400/30 dark:bg-slate-950/40 dark:hover:border-blue-300">
                                {proofUploading ? (
                                  <div className="space-y-3">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
                                      <Upload className="h-6 w-6 animate-pulse" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                        Mengupload bukti bayar...
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        Tunggu sebentar, kami sedang menyimpan gambar kamu
                                      </p>
                                    </div>
                                  </div>
                                ) : manualProofUrl ? (
                                  <div className="space-y-3">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                                      <CheckCircle2 className="h-6 w-6" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                        Bukti bayar berhasil diupload
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        Tekan area ini kalau kamu ingin mengganti gambar
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200">
                                      <ImagePlus className="h-6 w-6" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                        Upload screenshot atau foto bukti bayar
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        PNG atau JPG paling jelas untuk verifikasi admin
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </label>
                            {manualProofUrl ? (
                              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
                                <img
                                  src={manualProofUrl}
                                  alt="Bukti pembayaran"
                                  className="max-h-64 w-full rounded-xl object-cover"
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Catatan pembayaran opsional
                          </label>
                          <textarea
                            value={manualPaymentNote}
                            onChange={(e) => setManualPaymentNote(e.target.value)}
                            rows={2}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-slate-950/40"
                            placeholder={
                              selectedMethodDetail.code === "bank_transfer"
                                ? "Misal: transfer dari BCA pukul 13:20"
                                : selectedMethodDetail.code === "qris_static"
                                  ? "Misal: bayar via GoPay pukul 13:25"
                                  : "Tambahkan catatan bila perlu"
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
                disabled={
                  processing ||
                  (selectedMethodDetail?.verification_type === "auto" && !midtransReady)
                }
                className="h-14 w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-500"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {selectedMethodDetail?.verification_type === "auto"
                  ? midtransReady
                    ? `Bayar ${scope === "deposit" ? "DP" : "Pelunasan"} via ${selectedMethodDetail?.display_name || "Gateway"}`
                    : "Menyiapkan gateway..."
                  : `Saya Sudah Bayar ${scope === "deposit" ? "DP" : "Pelunasan"} via ${selectedMethodDetail?.display_name || "Manual"}`}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
