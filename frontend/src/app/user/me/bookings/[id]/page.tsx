"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { getTenantUrl } from "@/lib/tenant";
import { useRealtime } from "@/lib/realtime/use-realtime";
import { customerBookingChannel } from "@/lib/realtime/channels";
import { BOOKING_EVENT_PREFIXES, matchesRealtimePrefix } from "@/lib/realtime/event-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CircleDashed,
  Clock3,
  ExternalLink,
  ReceiptText,
  Wallet,
} from "lucide-react";

const REALTIME_REFRESH_THROTTLE_MS = 1200;

function paymentStatusMeta(status?: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "awaiting_verification") {
    return {
      label: "Menunggu Verifikasi",
      className: "rounded-full bg-amber-500 text-white",
      hint: "Pembayaran manualmu sudah dikirim dan sedang direview admin tenant.",
    };
  }
  if (normalized === "partial_paid") {
    return {
      label: "DP Sudah Masuk",
      className: "rounded-full bg-blue-600 text-white",
      hint: "DP sudah tercatat. Sisa tagihan bisa dilunasi setelah sesi selesai.",
    };
  }
  if (normalized === "settled" || normalized === "paid") {
    return {
      label: "Lunas",
      className: "rounded-full bg-emerald-600 text-white",
      hint: "Pembayaran booking sudah masuk di sistem.",
    };
  }
  if (normalized === "pending") {
    return {
      label: "Menunggu Pembayaran",
      className:
        "rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
      hint: "Selesaikan pembayaran sesuai metode yang dipilih agar booking bisa lanjut diproses.",
    };
  }
  if (normalized === "expired") {
    return {
      label: "Kadaluarsa",
      className: "rounded-full bg-red-500 text-white",
      hint: "Pembayaran sebelumnya sudah lewat batas waktu. Silakan mulai lagi dari halaman pembayaran.",
    };
  }
  if (normalized === "failed") {
    return {
      label: "Gagal",
      className: "rounded-full bg-red-500 text-white",
      hint: "Pembayaran belum berhasil diproses. Coba ulangi dengan metode yang sama atau pilih metode lain.",
    };
  }
  return {
    label: "Menunggu Pembayaran",
    className:
      "rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
    hint: "Status pembayaran akan berubah otomatis setelah customer membayar atau admin memverifikasi pembayaran manual.",
  };
}

export default function UserBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const lastBackgroundRefreshRef = useRef(0);

  const fetchDetail = useCallback(async (mode: "initial" | "background" = "initial") => {
    let active = true;
    try {
      if (mode === "background") setRefreshing(true);
      const res = await api.get(`/user/me/bookings/${params.id}`);
      if (active) setBooking(res.data);
    } catch (error) {
      if (isTenantAuthError(error)) {
        clearTenantSession({ keepTenantSlug: true });
      }
      router.replace("/user/login");
    } finally {
      if (active) {
        if (mode === "background") setRefreshing(false);
        else setLoading(false);
      }
    }
    return () => {
      active = false;
    };
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
      setBooking((current) =>
        current
          ? {
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

  const tenantUrl = useMemo(() => {
    if (!booking?.tenant_slug) return null;
    return getTenantUrl(booking.tenant_slug);
  }, [booking?.tenant_slug]);

  const liveUrl = useMemo(() => {
    if (!booking?.id) return null;
    return `/user/me/bookings/${booking.id}/live`;
  }, [booking?.id]);

  const paymentMeta = paymentStatusMeta(booking?.payment_status);
  const sessionLabel = sessionMeta(booking?.status);
  const nextStep = resolveNextStep(booking);
  const bookingStep = resolveBookingStep(booking);
  const hasPromo =
    Number(booking?.discount_amount || 0) > 0 &&
    String(booking?.promo_code || "").trim() !== "";

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-14 rounded-[1.5rem]" />
        <Skeleton className="h-56 rounded-[1.5rem]" />
        <Skeleton className="h-44 rounded-[1.5rem]" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <Card className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
          Booking tidak ditemukan.
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          onClick={() => router.push("/user/me/active")}
          className="h-10 rounded-2xl px-3"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Aktif
        </Button>
        {tenantUrl ? (
          <Button asChild variant="outline" className="h-10 rounded-2xl px-3">
            <Link href={tenantUrl} target="_blank" rel="noreferrer">
              Tenant
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>

      <Card className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
                Booking
              </p>
              <h1 className="mt-1 line-clamp-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {booking.resource_name || booking.resource || "Booking"}
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {[booking.tenant_name || "Tenant", booking.tenant_slug]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Ref {String(booking.id || "").slice(0, 8).toUpperCase()}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {refreshing ? "Memuat ulang status..." : "Auto update aktif"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={sessionLabel.className}>{sessionLabel.label}</Badge>
              <Badge className={paymentMeta.className}>{paymentMeta.label}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InfoBox
              label="Tanggal"
              value={formatDate(booking.start_time)}
              icon={CalendarDays}
            />
            <InfoBox
              label="Jam"
              value={formatTimeRange(booking.start_time, booking.end_time)}
              icon={Clock3}
            />
            <InfoBox
              label="DP"
              value={`Rp ${Number(booking.deposit_amount || 0).toLocaleString("id-ID")}`}
              icon={Wallet}
            />
            <InfoBox
              label="Sisa"
              value={`Rp ${Number(booking.balance_due || 0).toLocaleString("id-ID")}`}
              icon={ReceiptText}
            />
          </div>

          {hasPromo ? (
            <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
                    Promo
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                    {booking.promo_code}
                  </p>
                </div>
                <Badge className="bg-emerald-600 text-white">
                  -Rp {Number(booking.discount_amount || 0).toLocaleString("id-ID")}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl border border-emerald-200/80 bg-white/80 p-2 dark:border-emerald-500/20 dark:bg-black/10">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700/80 dark:text-emerald-200/80">
                    Sebelum
                  </div>
                  <div className="mt-1 font-semibold text-slate-950 dark:text-white">
                    Rp {Number(booking.original_grand_total || 0).toLocaleString("id-ID")}
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200/80 bg-white/80 p-2 dark:border-emerald-500/20 dark:bg-black/10">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700/80 dark:text-emerald-200/80">
                    Diskon
                  </div>
                  <div className="mt-1 font-semibold text-emerald-700 dark:text-emerald-200">
                    -Rp {Number(booking.discount_amount || 0).toLocaleString("id-ID")}
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200/80 bg-white/80 p-2 dark:border-emerald-500/20 dark:bg-black/10">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700/80 dark:text-emerald-200/80">
                    Total
                  </div>
                  <div className="mt-1 font-semibold text-slate-950 dark:text-white">
                    Rp {Number(booking.grand_total || 0).toLocaleString("id-ID")}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Langkah
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-700 dark:text-slate-200">
              {nextStep}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <BookingStepCard
              title="Booking dibuat"
              description="Jadwal dan resource sudah tercatat."
              done
              active={bookingStep === 1}
            />
            <BookingStepCard
              title="Pembayaran"
              description={
                paymentMeta.label === "Lunas" || paymentMeta.label === "DP Sudah Masuk"
                  ? "Pembayaran awal sudah tercatat."
                  : paymentMeta.label === "Menunggu Verifikasi"
                    ? "Bukti bayar sedang dicek."
                    : "Selesaikan pembayaran sesuai tahap booking."
              }
              done={bookingStep > 2}
              active={bookingStep === 2}
            />
            <BookingStepCard
              title="Sesi"
              description={
                sessionLabel.label === "Sesi Berjalan"
                  ? "Booking sedang dipakai."
                  : sessionLabel.label === "Sesi Selesai"
                    ? "Booking sudah selesai."
                    : "Masuk ke live page saat waktunya tiba."
              }
              done={bookingStep === 3 && sessionLabel.label === "Sesi Selesai"}
              active={bookingStep === 3}
            />
          </div>

          <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50 p-3.5 dark:border-blue-500/20 dark:bg-blue-500/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
              Bayar
            </p>
            <p className="mt-2 text-sm leading-6 text-blue-900 dark:text-blue-100">
              {paymentMeta.hint}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              asChild
              className="h-12 rounded-2xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
            >
              <Link href={liveUrl || "#"}>
                Live
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              onClick={() => router.push(`/user/me/bookings/${booking.id}/payment?scope=deposit`)}
              variant="outline"
              disabled={Number(booking.deposit_amount || 0) <= 0}
              className="h-12 rounded-2xl"
            >
              Bayar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoBox({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

type BookingDetail = {
  id?: string;
  customer_id?: string;
  tenant_name?: string;
  tenant_slug?: string;
  access_token?: string;
  resource_name?: string;
  resource?: string;
  status?: string;
  payment_status?: string;
  start_time?: string;
  end_time?: string;
  promo_code?: string;
  original_grand_total?: number;
  discount_amount?: number;
  grand_total?: number;
  deposit_amount?: number;
  balance_due?: number;
};

function sessionMeta(status?: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active" || normalized === "ongoing") {
    return {
      label: "Sesi Berjalan",
      className: "rounded-full bg-emerald-500 text-white",
    };
  }
  if (normalized === "completed") {
    return {
      label: "Sesi Selesai",
      className: "rounded-full bg-slate-900 text-white dark:bg-white/15",
    };
  }
  if (normalized === "confirmed") {
    return {
      label: "Siap Dimulai",
      className: "rounded-full bg-blue-600 text-white",
    };
  }
  if (normalized === "cancelled") {
    return {
      label: "Dibatalkan",
      className: "rounded-full bg-red-500 text-white",
    };
  }
  return {
    label: "Menunggu",
    className: "rounded-full bg-amber-500 text-white",
  };
}

function resolveBookingStep(booking: BookingDetail | null) {
  if (!booking) return 1;
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const status = String(booking.status || "").toLowerCase();
  const depositAmount = Number(booking.deposit_amount || 0);
  const balanceDue = Number(booking.balance_due || 0);

  if (status === "active" || status === "ongoing" || status === "completed") {
    return 3;
  }
  if (
    paymentStatus === "awaiting_verification" ||
    paymentStatus === "partial_paid" ||
    paymentStatus === "settled" ||
    paymentStatus === "paid" ||
    (depositAmount > 0 && paymentStatus !== "pending") ||
    balanceDue <= 0
  ) {
    return 2;
  }
  return 1;
}

function BookingStepCard({
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

function resolveNextStep(booking: BookingDetail | null) {
  if (!booking) return "-";
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const status = String(booking.status || "").toLowerCase();
  const depositAmount = Number(booking.deposit_amount || 0);
  const balanceDue = Number(booking.balance_due || 0);

  if (paymentStatus === "awaiting_verification") {
    return "Tunggu admin tenant menyelesaikan verifikasi pembayaran manualmu.";
  }
  if (depositAmount > 0 && paymentStatus === "pending") {
    return "Selesaikan DP dulu dari halaman pembayaran agar sesi bisa diaktifkan tepat waktu.";
  }
  if (status === "pending" || status === "confirmed") {
    return "Saat sudah tiba di jadwal booking, buka live controller untuk mengaktifkan sesi.";
  }
  if (status === "active" || status === "ongoing") {
    return "Gunakan live controller untuk tambah durasi, pesan F&B, add-on, atau mengakhiri sesi.";
  }
  if (status === "completed" && balanceDue > 0) {
    return "Sesi sudah selesai. Lanjutkan pelunasan dari halaman pembayaran khusus.";
  }
  if (status === "completed") {
    return "Booking sudah selesai dan tidak ada langkah operasional yang tertinggal.";
  }
  return "Pantau status terbaru booking dari live controller.";
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTimeRange(start?: string, end?: string) {
  if (!start) return "-";
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const startLabel = s.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endLabel = e
    ? e.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : "-";
  return `${startLabel} - ${endLabel}`;
}
