"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  ExternalLink,
  Eye,
  Radio,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { getTenantUrl } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type BookingItem = {
  id: string;
  tenant_name?: string;
  tenant_slug?: string;
  resource?: string;
  date?: string;
  status?: string;
  grand_total?: number;
};

export default function UserActiveBookingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingItem[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await api.get("/user/me");
        if (active) setBookings(res.data?.active_bookings || []);
      } catch (error) {
        if (isTenantAuthError(error)) {
          clearTenantSession({ keepTenantSlug: true });
        }
        router.replace("/user/login");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [router]);

  const tenantCount = useMemo(
    () => new Set(bookings.map((booking) => booking.tenant_slug).filter(Boolean)).size,
    [bookings],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-4">
        <Skeleton className="h-24 rounded-[1.75rem]" />
        <Skeleton className="h-36 rounded-[1.75rem]" />
        <Skeleton className="h-36 rounded-[1.75rem]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-4">
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
              Aktif
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
              Booking aktif
            </h1>
          </div>
          <Badge className="rounded-full border-none bg-blue-50 px-3 py-1 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
            {bookings.length} sesi
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
            <MetricTile
              label="Live"
              value={String(bookings.length)}
              icon={Radio}
              tone="blue"
          />
            <MetricTile
              label="Tenant"
              value={String(tenantCount)}
              icon={ReceiptText}
              tone="slate"
            />
            <MetricTile
              label="Status"
              value={bookings.length ? "Live" : "Idle"}
              icon={Wallet}
              tone="emerald"
          />
        </div>
      </section>

      {bookings.length ? (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <ActiveBookingRow key={booking.id} booking={booking} />
          ))}
        </div>
      ) : (
        <Card className="rounded-[1.75rem] border-dashed border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Belum ada booking aktif.
            </p>
            <Button
              onClick={() => router.push("/user/me")}
              className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
            >
              Kembali ke Home
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ActiveBookingRow({ booking }: { booking: BookingItem }) {
  const tenantUrl = booking.tenant_slug ? getTenantUrl(booking.tenant_slug) : null;

  return (
    <Card className="rounded-[1.35rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#10141f]">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge className={statusTone(booking.status)}>
                {booking.status || "active"}
              </Badge>
              <span className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {booking.tenant_name || "Tenant"}
              </span>
            </div>
            <h2 className="mt-2 line-clamp-2 text-base font-semibold tracking-tight text-slate-950 dark:text-white">
              {booking.resource || "Booking"}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Ref {booking.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <Link
            href={`/user/me/bookings/${booking.id}/live`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-500"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <InfoPill
            icon={CalendarDays}
            label="Tanggal"
            value={formatDate(booking.date)}
          />
          <InfoPill
            icon={Clock3}
            label="Jam"
            value={formatTime(booking.date)}
          />
          <InfoPill
            icon={Wallet}
            label="Total"
            value={`Rp ${Number(booking.grand_total || 0).toLocaleString("id-ID")}`}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            asChild
            className="h-10 rounded-2xl bg-slate-950 px-3 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <Link href={`/user/me/bookings/${booking.id}/live`}>
              <Radio className="mr-2 h-4 w-4" />
              Live
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 rounded-2xl px-3">
            <Link href={`/user/me/bookings/${booking.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              Detail
            </Link>
          </Button>
          {tenantUrl ? (
            <Button asChild variant="outline" className="h-10 rounded-2xl px-3">
              <a href={tenantUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Tenant
              </a>
            </Button>
          ) : <div />}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "blue" | "slate" | "emerald";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-3",
        tone === "blue" && "border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10",
        tone === "slate" && "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]",
        tone === "emerald" && "border-emerald-100 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10",
      )}
    >
      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function InfoPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function statusTone(status?: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active" || normalized === "ongoing") {
    return "rounded-full border-none bg-emerald-500 text-white";
  }
  if (normalized === "completed") {
    return "rounded-full border-none bg-slate-900 text-white dark:bg-white/15";
  }
  if (normalized === "confirmed") {
    return "rounded-full border-none bg-blue-600 text-white";
  }
  return "rounded-full border-none bg-amber-500 text-white";
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function formatTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
