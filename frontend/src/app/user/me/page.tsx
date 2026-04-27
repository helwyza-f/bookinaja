"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Calendar,
  Clock,
  LogOut,
  ShieldCheck,
  Sparkles,
  Ticket,
  Wallet,
} from "lucide-react";

type CustomerDashboard = {
  customer?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string | null;
    tier?: string;
    loyalty_points?: number;
  };
  points?: number;
  active_bookings?: BookingItem[];
  past_history?: BookingItem[];
};

type BookingItem = {
  id: string;
  tenant_id?: string;
  tenant_name?: string;
  tenant_slug?: string;
  resource?: string;
  date?: string;
  end_date?: string;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  grand_total?: number;
  deposit_amount?: number;
  paid_amount?: number;
  balance_due?: number;
  total_spent?: number;
};

export default function UserDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<CustomerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await api.get("/user/me");
        if (active) setData(res.data);
      } catch (error) {
        if (isTenantAuthError(error)) {
          clearTenantSession({ keepTenantSlug: true });
        }
        router.replace("/user/login");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [router]);

  const activeBookings = data?.active_bookings || [];
  const pastHistory = data?.past_history || [];
  const currentList = activeTab === "active" ? activeBookings : pastHistory;

  const stats = useMemo(
    () => [
      { label: "Points", value: data?.points || 0, icon: Wallet },
      { label: "Tier", value: data?.customer?.tier || "NEW", icon: Sparkles },
    ],
    [data],
  );

  const handleLogout = () => {
    clearTenantSession({ keepTenantSlug: true });
    router.push("/tenants");
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505]">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-10">
        <section className="overflow-hidden rounded-[2.5rem] bg-slate-950 text-white shadow-2xl">
          <div className="p-6 md:p-10 lg:p-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.35em] text-blue-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  User Dashboard
                </div>
                <h1 className="text-4xl font-black italic uppercase tracking-tighter md:text-6xl">
                  {data?.customer?.name || "Customer"}
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300">
                  Portal customer global untuk Bookinaja. Lihat booking aktif, riwayat
                  lintas tenant, dan atur profil email/password di satu tempat.
                </p>
              </div>

              <div className="flex gap-2">
                <Button asChild className="rounded-2xl bg-white px-5 text-slate-950 hover:bg-slate-100">
                  <Link href="/user/me/settings">Profile Settings</Link>
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 text-white hover:bg-white/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {stats.map((item) => (
            <Card
              key={item.label}
              className="rounded-[2rem] border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.03]"
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                    {item.label}
                  </div>
                  <div className="mt-1 text-2xl font-black italic uppercase tracking-tighter dark:text-white">
                    {item.value}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-6 space-y-5">
          <div className="inline-flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5 dark:bg-white/5 dark:text-white dark:ring-white/5">
            {(["active", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "rounded-xl px-5 py-3 text-[9px] font-black uppercase tracking-widest transition-all",
                  activeTab === tab ? "bg-slate-950 text-white" : "text-slate-400",
                )}
              >
                {tab === "active" ? "Sesi Berjalan" : "Riwayat"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {currentList.map((booking) => (
              <Card
                key={booking.id}
                className="group rounded-[2rem] border-slate-200 bg-white shadow-sm transition-transform hover:-translate-y-1 dark:border-white/5 dark:bg-white/[0.03]"
              >
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-600">
                        {booking.tenant_name || "Tenant"}
                      </div>
                      <h2 className="mt-2 truncate text-xl font-black italic uppercase tracking-tighter dark:text-white">
                        {booking.resource || "Booking"}
                      </h2>
                    </div>
                    <Badge
                      className={cn(
                        "rounded-full border-none px-3 py-1 text-[8px] font-black uppercase",
                        booking.status === "active" || booking.status === "ongoing"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
                      )}
                    >
                      {booking.status || "pending"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {booking.date ? new Date(booking.date).toLocaleDateString("id-ID") : "-"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {booking.date ? new Date(booking.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/5">
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                      Rp {(booking.total_spent || booking.grand_total || 0).toLocaleString("id-ID")}
                    </div>
                    <Link
                      href={`/user/me/bookings/${booking.id}`}
                      className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em] text-slate-950 dark:text-white"
                    >
                      Detail
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}

            {currentList.length === 0 ? (
              <div className="col-span-full rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400 dark:border-white/5 dark:bg-white/[0.02]">
                <Ticket className="mx-auto h-10 w-10 opacity-20" />
                <p className="mt-4 text-[9px] font-black uppercase tracking-[0.3em]">
                  Belum ada data booking
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 lg:px-10">
      <Skeleton className="h-56 rounded-[2.5rem] bg-white dark:bg-white/5" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-28 rounded-[2rem] bg-white dark:bg-white/5" />
        <Skeleton className="h-28 rounded-[2rem] bg-white dark:bg-white/5" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-[2rem] bg-white dark:bg-white/5" />
        <Skeleton className="h-64 rounded-[2rem] bg-white dark:bg-white/5" />
      </div>
    </div>
  );
}
