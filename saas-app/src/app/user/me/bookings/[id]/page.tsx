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
import { ArrowLeft, Calendar, Clock, ExternalLink } from "lucide-react";

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
      load();
    }

    return () => {
      active = false;
    };
  }, [params.id, router]);

  const tenantUrl = useMemo(() => {
    if (!booking?.tenant_slug) return null;
    return getTenantUrl(booking.tenant_slug);
  }, [booking?.tenant_slug]);

  const tenantLiveUrl = useMemo(() => {
    if (!booking?.tenant_slug || !booking?.id || !booking?.access_token) return null;
    return getTenantUrl(booking.tenant_slug, `/me/bookings/${booking.id}/live`, {
      token: booking.access_token,
    });
  }, [booking?.tenant_slug, booking?.id, booking?.access_token]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Skeleton className="h-16 rounded-[2rem]" />
        <Skeleton className="h-72 rounded-[2rem]" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="rounded-[2rem] p-8">Booking tidak ditemukan.</Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-[#050505]">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push("/user/me")}
            className="rounded-2xl"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {tenantUrl ? (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" className="rounded-2xl">
                <Link href={tenantLiveUrl || tenantUrl}>
                  Live Controller
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl">
                <Link href={tenantUrl} target="_blank" rel="noreferrer">
                  Open Tenant
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : null}
        </div>

        <Card className="overflow-hidden rounded-[2.5rem] border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.03]">
          <div className="bg-slate-950 p-6 text-white">
            <div className="text-[9px] font-black uppercase tracking-[0.35em] text-blue-300">
              Booking Detail
            </div>
            <h1 className="mt-3 text-3xl font-black italic uppercase tracking-tighter">
              {booking.resource_name || booking.resource || "Booking"}
            </h1>
            <p className="mt-3 text-sm text-slate-300">
              {booking.tenant_name || "Tenant"}{" "}
              {booking.tenant_slug ? `- ${booking.tenant_slug}` : ""}
            </p>
            <p className="mt-3 max-w-xl text-xs leading-6 text-slate-400">
              Halaman ini hanya ringkasan booking. Live controller untuk
              tracking session, order, dan pembayaran tetap berjalan di area
              tenant.
            </p>
          </div>

          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-full bg-blue-600 text-white uppercase">
                {booking.status || "pending"}
              </Badge>
              <Badge className="rounded-full bg-slate-100 text-slate-700 uppercase dark:bg-white/10 dark:text-slate-200">
                {booking.payment_status || "unpaid"}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoBox
                label="Tanggal"
                value={formatDate(booking.start_time)}
                icon={Calendar}
              />
              <InfoBox
                label="Waktu"
                value={formatTimeRange(booking.start_time, booking.end_time)}
                icon={Clock}
              />
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.05]">
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                Total Pembayaran
              </div>
              <div className="mt-2 text-2xl font-black italic uppercase tracking-tighter dark:text-white">
                Rp {(booking.grand_total || 0).toLocaleString("id-ID")}
              </div>
              <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                DP: Rp {(booking.deposit_amount || 0).toLocaleString("id-ID")} -
                Sisa: Rp {(booking.balance_due || 0).toLocaleString("id-ID")}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.05]">
      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
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
