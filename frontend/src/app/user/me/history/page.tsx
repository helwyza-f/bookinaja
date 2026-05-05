"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, ReceiptText } from "lucide-react";
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
        <Skeleton className="h-20 rounded-[1.5rem]" />
        <Skeleton className="h-24 rounded-[1.35rem]" />
        <Skeleton className="h-24 rounded-[1.35rem]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
          Riwayat
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
            Booking selesai
          </h1>
          <Badge className="rounded-full border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
            {history.length} item
          </Badge>
        </div>
      </section>

      <div className="space-y-2">
        {history.length ? (
          history.map((booking) => (
            <Card
              key={booking.id}
              className="rounded-[1.35rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#10141f]"
            >
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                      {booking.status || "done"}
                    </Badge>
                    <span className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      {booking.tenant_name || "Tenant"}
                    </span>
                  </div>
                  <div className="mt-2 truncate text-sm font-semibold text-slate-950 dark:text-white">
                    {booking.resource || "Booking"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
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

                <Button asChild variant="outline" className="h-10 w-10 shrink-0 rounded-2xl p-0">
                  <Link href={`/user/me/bookings/${booking.id}`}>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-[1.5rem] border-dashed border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
            <CardContent className="p-5 text-sm text-slate-500 dark:text-slate-400">
              Belum ada riwayat booking.
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
