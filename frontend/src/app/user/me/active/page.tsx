"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, ExternalLink, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { getTenantUrl } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-[2rem] bg-white" />
        <Skeleton className="h-40 rounded-[2rem] bg-white" />
        <Skeleton className="h-40 rounded-[2rem] bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#0c0c0c]">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(37,99,235,0.88))] px-5 py-6 text-white md:px-6 md:py-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-100/80">
            Booking Aktif
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Semua sesi yang masih berjalan
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50/80">
            Pantau sesi yang sedang aktif, buka detail live, dan lompat ke tenant tanpa mengganggu ritme operasional.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[11px] font-medium text-blue-100/70">Sesi aktif</p>
              <p className="mt-1 text-2xl font-semibold">{bookings.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[11px] font-medium text-blue-100/70">Tenant terhubung</p>
              <p className="mt-1 text-2xl font-semibold">
                {new Set(bookings.map((booking) => booking.tenant_slug).filter(Boolean)).size}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[11px] font-medium text-blue-100/70">Status utama</p>
              <p className="mt-1 text-base font-semibold">
                {bookings.length ? "Live & siap dilanjutkan" : "Belum ada sesi berjalan"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
          Booking Aktif
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-2xl">
          Lanjutkan sesi tanpa kehilangan konteks
        </h2>
        <p className="max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
          Setiap kartu menonjolkan tenant, waktu sesi, dan total transaksi supaya cepat dipindai dari mobile maupun desktop.
        </p>
      </section>

      <div className="space-y-3">
        {bookings.length ? (
          bookings.map((booking) => {
            const tenantUrl = booking.tenant_slug
              ? getTenantUrl(booking.tenant_slug)
              : null;

            return (
              <Card
                key={booking.id}
                className="overflow-hidden rounded-[1.8rem] border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#0c0c0c]"
              >
                <CardContent className="space-y-4 p-4 md:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">
                        {booking.tenant_name || "Tenant"}
                      </div>
                      <h2 className="mt-2 truncate text-lg font-semibold tracking-tight text-slate-950 dark:text-white md:text-xl">
                        {booking.resource || "Booking"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Ref {booking.id.slice(0, 8)} • siap dibuka lagi kapan saja
                      </p>
                    </div>
                    <Badge className="rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                      {booking.status || "active"}
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-white/[0.04]">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Tanggal</p>
                      <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-white">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(booking.date)}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-white/[0.04]">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Waktu</p>
                      <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-white">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(booking.date)}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-[var(--bookinaja-50)] px-3 py-3 dark:bg-[color:rgba(59,130,246,0.14)]">
                      <p className="text-[11px] font-medium text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">Total</p>
                      <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-100)]">
                      <Ticket className="h-3.5 w-3.5" />
                      Rp {(booking.grand_total || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild className="h-11 rounded-2xl bg-blue-600 text-white hover:bg-blue-500">
                      <Link href={`/user/me/bookings/${booking.id}`}>Lihat Detail</Link>
                    </Button>
                    {tenantUrl ? (
                      <Button asChild variant="outline" className="h-11 rounded-2xl dark:border-white/10 dark:bg-transparent dark:text-white">
                        <a href={tenantUrl} target="_blank" rel="noreferrer">
                          Buka Tenant
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="rounded-[1.8rem] border-dashed border-slate-200 bg-white shadow-sm">
            <CardContent className="p-6 text-sm leading-7 text-slate-500">
              Belum ada booking aktif. Kalau mau cari tempat baru, balik ke feed utama dan jelajahi bisnis yang sedang ramai.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
