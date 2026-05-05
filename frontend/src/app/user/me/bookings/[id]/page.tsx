"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { getTenantUrl } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  ExternalLink,
  ReceiptText,
  Wallet,
} from "lucide-react";

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
      label: "Pembayaran Tercatat",
      className: "rounded-full bg-emerald-600 text-white",
      hint: "Pembayaran booking sudah masuk di sistem.",
    };
  }
  return {
    label: status || "pending",
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

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await api.get(`/user/me/bookings/${params.id}`);
        if (active) setBooking(res.data);
      } catch (error) {
        if (isTenantAuthError(error)) {
          clearTenantSession({ keepTenantSlug: true });
        }
        router.replace("/user/login");
      } finally {
        if (active) setLoading(false);
      }
    };

    if (params.id) {
      void load();
    }

    return () => {
      active = false;
    };
  }, [params.id, router]);

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

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-4">
        <Skeleton className="h-14 rounded-[1.5rem]" />
        <Skeleton className="h-56 rounded-[1.75rem]" />
        <Skeleton className="h-44 rounded-[1.75rem]" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#10141f]">
          Booking tidak ditemukan.
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          onClick={() => router.push("/user/me/active")}
          className="h-11 rounded-2xl px-3"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Booking Aktif
        </Button>
        {tenantUrl ? (
          <Button asChild variant="outline" className="h-11 rounded-2xl">
            <Link href={tenantUrl} target="_blank" rel="noreferrer">
              Tenant
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>

      <Card className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
        <CardContent className="space-y-5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
                Booking Detail
              </p>
              <h1 className="mt-1 line-clamp-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {booking.resource_name || booking.resource || "Booking"}
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {booking.tenant_name || "Tenant"}
                {booking.tenant_slug ? ` · ${booking.tenant_slug}` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Ref {String(booking.id || "").slice(0, 8).toUpperCase()}
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

          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Langkah berikutnya
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-700 dark:text-slate-200">
              {nextStep}
            </p>
          </div>

          <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
              Status pembayaran
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
                Buka Live Controller
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              onClick={() => router.push(`/user/me/bookings/${booking.id}/payment?scope=deposit`)}
              variant="outline"
              disabled={Number(booking.deposit_amount || 0) <= 0}
              className="h-12 rounded-2xl"
            >
              Cek Halaman Bayar
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
  tenant_name?: string;
  tenant_slug?: string;
  access_token?: string;
  resource_name?: string;
  resource?: string;
  status?: string;
  payment_status?: string;
  start_time?: string;
  end_time?: string;
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
  return {
    label: status || "pending",
    className:
      "rounded-full bg-amber-500 text-white",
  };
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
