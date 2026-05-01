"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type BookingItem = {
  id: string;
  tenant_name?: string;
  resource?: string;
  date?: string;
  status?: string;
  grand_total?: number;
};

export default function UserHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<BookingItem[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await api.get("/user/me");
        if (active) setHistory(res.data?.past_history || []);
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
        <Skeleton className="h-28 rounded-[2rem] bg-white" />
        <Skeleton className="h-28 rounded-[2rem] bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
          Riwayat
        </p>
        <h1 className="text-2xl font-black uppercase tracking-[-0.04em] md:text-3xl">
          Booking yang sudah selesai
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-500">
          Lihat kembali tempat yang pernah kamu booking dan gunakan itu sebagai pintu cepat untuk repeat order berikutnya.
        </p>
      </section>

      <div className="space-y-3">
        {history.length ? (
          history.map((booking) => (
            <Card
              key={booking.id}
              className="rounded-[1.6rem] border-blue-100 bg-white shadow-sm"
            >
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                    {booking.tenant_name || "Tenant"}
                  </div>
                  <div className="mt-2 truncate text-base font-black uppercase tracking-tight">
                    {booking.resource || "Booking"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(booking.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ReceiptText className="h-3.5 w-3.5" />
                      Rp {(booking.grand_total || 0).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="rounded-full bg-slate-100 text-slate-700">
                    {booking.status || "done"}
                  </Badge>
                  <Button asChild variant="outline" className="h-10 rounded-2xl">
                    <Link href={`/user/me/bookings/${booking.id}`}>Detail</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-[1.8rem] border-dashed border-slate-200 bg-white shadow-sm">
            <CardContent className="p-6 text-sm leading-7 text-slate-500">
              Riwayat booking belum ada. Setelah mulai booking, daftar ini akan jadi tempat paling cepat untuk mengingat bisnis yang pernah kamu pakai.
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
