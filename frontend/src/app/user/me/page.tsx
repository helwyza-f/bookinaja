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
  Settings,
  MapPin,
  ChevronRight,
  User,
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

  const handleLogout = () => {
    clearTenantSession({ keepTenantSlug: true });
    router.push("/user/login");
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const customerTier = data?.customer?.tier || "NEW";
  const tierColor = customerTier === "VIP" 
    ? "from-amber-400 to-orange-500" 
    : customerTier === "GOLD" 
      ? "from-yellow-300 to-yellow-500"
      : "from-blue-400 to-indigo-500";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] pb-24">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-b from-blue-600/10 to-transparent dark:from-blue-600/5 -z-10" />

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 lg:px-8">
        {/* Header Section */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              Bookinaja
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
              Global Customer Portal
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="icon" className="rounded-xl border-slate-200 dark:border-white/10 dark:bg-white/5 bg-white">
              <Link href="/user/me/settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
            <Button onClick={handleLogout} variant="destructive" size="icon" className="rounded-xl">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Global Identity Card */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 shadow-2xl transition-transform hover:scale-[1.01] duration-300">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-gradient-to-tr from-blue-500/20 to-emerald-500/20 blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            <div className="flex items-center gap-6">
              <div className={`h-20 w-20 rounded-3xl bg-gradient-to-br ${tierColor} p-[2px] shadow-lg`}>
                <div className="h-full w-full rounded-[22px] bg-slate-950 flex items-center justify-center">
                  <User className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <Badge variant="secondary" className={`bg-gradient-to-r ${tierColor} text-white border-0 font-black tracking-widest text-[10px] uppercase mb-2 px-3 py-1 shadow-md`}>
                  {customerTier} MEMBER
                </Badge>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                  {data?.customer?.name || "Customer"}
                </h2>
                <p className="text-sm font-medium text-slate-400 mt-1 flex items-center gap-2">
                  <span className="font-mono">{data?.customer?.phone}</span>
                  {data?.customer?.email && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span>{data?.customer?.email}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-row md:flex-col gap-6 md:gap-4 w-full md:w-auto p-5 md:p-0 rounded-2xl bg-white/5 md:bg-transparent border border-white/10 md:border-transparent backdrop-blur-md">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                  Bookinaja Points
                </p>
                <div className="flex items-center gap-2 text-3xl font-black italic text-white">
                  <Wallet className="h-6 w-6 text-emerald-400" />
                  {(data?.points || 0).toLocaleString("id-ID")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-10 flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
          {(["active", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative rounded-2xl px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "bg-white text-slate-500 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10",
              )}
            >
              {tab === "active" ? "Sesi Berjalan & Mendatang" : "Riwayat Selesai"}
            </button>
          ))}
        </div>

        {/* Booking List */}
        <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-2">
          {currentList.map((booking) => (
            <Card
              key={booking.id}
              className="group overflow-hidden rounded-[2rem] border-slate-200/60 bg-white/60 backdrop-blur-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl dark:border-white/5 dark:bg-white/[0.02]"
            >
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{booking.tenant_name || "Tenant"}</span>
                      </div>
                      <h3 className="mt-2 truncate text-xl font-black italic uppercase tracking-tighter dark:text-white">
                        {booking.resource || "Booking"}
                      </h3>
                    </div>
                    <Badge
                      className={cn(
                        "rounded-xl border-none px-3 py-1.5 text-[9px] font-black uppercase shadow-sm",
                        booking.status === "active" || booking.status === "ongoing"
                          ? "bg-emerald-500 text-white"
                          : booking.status === "pending" || booking.status === "confirmed"
                            ? "bg-amber-500 text-white"
                            : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300",
                      )}
                    >
                      {booking.status || "pending"}
                    </Badge>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-4 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-black/20 p-4 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      {booking.date ? new Date(booking.date).toLocaleDateString("id-ID", { weekday: 'short', day: 'numeric', month: 'short' }) : "-"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-500" />
                      {booking.date ? new Date(booking.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-white dark:border-white/5 dark:bg-white/5 p-4 px-6 flex items-center justify-between transition-colors group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Total Biaya</p>
                    <p className="text-sm font-bold dark:text-white">
                      Rp {(booking.total_spent || booking.grand_total || 0).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <Button asChild size="sm" className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 shadow-md">
                    <Link href={`/user/me/bookings/${booking.id}`}>
                      Detail Sesi
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {currentList.length === 0 ? (
            <div className="col-span-full rounded-[2.5rem] border border-dashed border-slate-300 bg-white/50 p-16 text-center backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.01]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5">
                <Ticket className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mt-6 text-lg font-black italic uppercase tracking-tighter dark:text-white">
                Belum ada reservasi
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {activeTab === "active" 
                  ? "Kamu belum memiliki sesi reservasi yang aktif atau mendatang." 
                  : "Riwayat reservasi kamu masih kosong."}
              </p>
              <Button asChild className="mt-6 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/25">
                <Link href="/">Cari Cabang Sekarang</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-6 lg:px-8">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-40 rounded-lg bg-white dark:bg-white/5" />
        <Skeleton className="h-10 w-24 rounded-xl bg-white dark:bg-white/5" />
      </div>
      <Skeleton className="h-48 rounded-[2.5rem] bg-white dark:bg-white/5" />
      <div className="flex gap-2">
        <Skeleton className="h-12 w-48 rounded-2xl bg-white dark:bg-white/5" />
        <Skeleton className="h-12 w-32 rounded-2xl bg-white dark:bg-white/5" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-64 rounded-[2rem] bg-white dark:bg-white/5" />
        <Skeleton className="h-64 rounded-[2rem] bg-white dark:bg-white/5" />
      </div>
    </div>
  );
}
