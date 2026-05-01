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
    <div className="space-y-4">
      <section className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
          Booking Aktif
        </p>
        <h1 className="text-2xl font-black uppercase tracking-[-0.04em] md:text-3xl">
          Semua sesi yang masih berjalan
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-500">
          Tempat terbaik untuk melanjutkan booking, cek detail, atau lompat ke tenant yang sedang kamu pakai.
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
                className="overflow-hidden rounded-[1.8rem] border-blue-100 bg-white shadow-sm"
              >
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                        {booking.tenant_name || "Tenant"}
                      </div>
                      <h2 className="mt-2 truncate text-lg font-black uppercase tracking-tight">
                        {booking.resource || "Booking"}
                      </h2>
                    </div>
                    <Badge className="rounded-full bg-blue-50 text-blue-700">
                      {booking.status || "active"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(booking.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(booking.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Ticket className="h-3.5 w-3.5" />
                      Rp {(booking.grand_total || 0).toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild className="h-11 rounded-2xl bg-blue-600 text-white hover:bg-blue-500">
                      <Link href={`/user/me/bookings/${booking.id}`}>Lihat Detail</Link>
                    </Button>
                    {tenantUrl ? (
                      <Button asChild variant="outline" className="h-11 rounded-2xl">
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
