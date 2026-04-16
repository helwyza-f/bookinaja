"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  LogOut,
  Wallet,
  Zap,
  Calendar,
  Clock,
  User,
  LayoutDashboard,
  Gamepad2,
  ArrowRight,
  Sparkles,
  Ticket,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";

const THEMES: Record<string, any> = {
  gaming_hub: {
    primary: "text-blue-500",
    bgPrimary: "bg-blue-600",
    accent: "bg-blue-500/10",
    glow: "shadow-blue-500/20",
  },
  creative_space: {
    primary: "text-rose-500",
    bgPrimary: "bg-rose-600",
    accent: "bg-rose-500/10",
    glow: "shadow-rose-500/20",
  },
  sport_center: {
    primary: "text-emerald-500",
    bgPrimary: "bg-emerald-600",
    accent: "bg-emerald-500/10",
    glow: "shadow-emerald-500/20",
  },
  social_space: {
    primary: "text-indigo-500",
    bgPrimary: "bg-indigo-600",
    accent: "bg-indigo-500/10",
    glow: "shadow-indigo-500/20",
  },
};

export default function CustomerDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get("/me");
        setData(res.data);
      } catch (err) {
        if (isTenantAuthError(err)) {
          clearTenantSession({ keepTenantSlug: true });
        }
        router.push(`/login`);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [router]);

  const activeTheme = useMemo(() => {
    const cat = data?.customer?.business_category || "gaming_hub";
    return THEMES[cat] || THEMES.gaming_hub;
  }, [data]);

  const handleLogout = () => {
    clearTenantSession({ keepTenantSlug: true });
    window.location.href = `/login`;
  };

  const safeFormatDate = (dateStr: string, pattern: string) => {
    if (!dateStr) return "-";
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, pattern) : "-";
  };

  if (loading) return <DashboardSkeleton />;

  const activeBookings = data?.active_bookings || [];
  const pastBookings = data?.past_history || [];
  const currentList = activeTab === "active" ? activeBookings : pastBookings;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] font-plus-jakarta pb-32 lg:pb-10 transition-colors duration-500 overflow-x-hidden">
      {/* Decorative Sidebar for Desktop */}
      <div
        className={cn(
          "hidden lg:block fixed left-0 top-0 bottom-0 w-1.5 z-50",
          activeTheme.bgPrimary,
        )}
      />

      <div className="max-w-5xl mx-auto">
        {/* HEADER SECTION */}
        <div
          className={cn(
            "pt-12 pb-24 px-6 lg:px-12 lg:pt-20 lg:pb-32 lg:rounded-b-[4rem] text-white relative overflow-hidden transition-all duration-700",
            activeTheme.bgPrimary,
          )}
        >
          <Zap className="absolute -right-10 -top-10 h-64 w-64 opacity-10 rotate-12" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 lg:h-20 lg:w-20 rounded-2xl bg-white/10 backdrop-blur-2xl flex items-center justify-center border border-white/20 shadow-2xl font-[1000] text-2xl lg:text-4xl italic">
                {data?.customer?.name?.charAt(0) || "U"}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.3em] opacity-70 italic">
                    Sultan Member
                  </span>
                  <Sparkles className="h-3 w-3 text-yellow-300 fill-yellow-300" />
                </div>
                <h1 className="text-2xl lg:text-5xl font-[1000] uppercase italic tracking-tighter leading-none">
                  {data?.customer?.name || "Customer"}
                </h1>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <Button
                onClick={() => router.push("/bookings")}
                className="bg-white text-black hover:bg-slate-100 rounded-xl font-black uppercase italic text-xs px-8 h-12 shadow-xl"
              >
                Boking Baru
              </Button>
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="h-12 w-12 rounded-xl bg-white/10 hover:bg-red-500"
              >
                <LogOut size={20} />
              </Button>
            </div>
          </div>
        </div>

        {/* STATS OVERLAY */}
        <div className="px-6 lg:px-12 -mt-10 lg:-mt-16 grid grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-8 relative z-20">
          <Card className="border-none rounded-[2rem] shadow-2xl dark:bg-[#0c0c0c] ring-1 ring-black/5 dark:ring-white/5 transition-transform hover:scale-[1.02]">
            <CardContent className="p-5 lg:p-8 flex items-center gap-4">
              <div className="h-10 w-10 lg:h-14 lg:w-14 rounded-xl lg:rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center shadow-inner">
                <Wallet size={20} />
              </div>
              <div className="text-left leading-none">
                <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 lg:mb-2">
                  Loyalty Points
                </span>
                <p className="text-xl lg:text-4xl font-[1000] italic uppercase tracking-tighter dark:text-white">
                  {data?.points?.toLocaleString() || 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none rounded-[2rem] shadow-2xl dark:bg-[#0c0c0c] ring-1 ring-black/5 dark:ring-white/5 transition-transform hover:scale-[1.02]">
            <CardContent className="p-5 lg:p-8 flex items-center gap-4">
              <div
                className={cn(
                  "h-10 w-10 lg:h-14 lg:w-14 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-inner",
                  activeTheme.accent,
                  activeTheme.primary,
                )}
              >
                <Trophy size={20} />
              </div>
              <div className="text-left leading-none">
                <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 lg:mb-2">
                  Tier Level
                </span>
                <p className="text-xl lg:text-4xl font-[1000] italic uppercase tracking-tighter dark:text-white">
                  {data?.customer?.tier || "NEW"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BOOKING LISTS */}
        <div className="px-6 lg:px-12 mt-12 space-y-6">
          <div className="inline-flex p-1.5 bg-white dark:bg-white/5 backdrop-blur-md rounded-2xl w-full md:w-auto shadow-sm ring-1 ring-black/5 dark:ring-white/5">
            <button
              onClick={() => setActiveTab("active")}
              className={cn(
                "flex-1 md:px-12 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                activeTab === "active"
                  ? "bg-slate-950 text-white shadow-xl scale-[1.02]"
                  : "text-slate-400",
              )}
            >
              Sesi Berjalan ({activeBookings.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex-1 md:px-12 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                activeTab === "history"
                  ? "bg-slate-950 text-white shadow-xl scale-[1.02]"
                  : "text-slate-400",
              )}
            >
              Riwayat
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
            {currentList.map((booking: any) => (
              <Card
                key={booking.id}
                onClick={() => router.push(`/me/bookings/${booking.id}`)}
                className="border-none rounded-[2rem] shadow-xl dark:bg-[#0c0c0c] ring-1 ring-black/5 dark:ring-white/5 group hover:ring-blue-500/20 transition-all duration-500 cursor-pointer overflow-hidden"
              >
                <CardContent className="p-6 space-y-5">
                  <div className="flex justify-between items-center">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shadow-lg",
                        activeTheme.accent,
                        activeTheme.primary,
                      )}
                    >
                      <Gamepad2 size={20} />
                    </div>
                    <Badge
                      className={cn(
                        "rounded-lg px-3 py-1 text-[8px] uppercase font-black tracking-widest border-none",
                        booking.status === "active"
                          ? "bg-emerald-500 text-white animate-pulse"
                          : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400",
                      )}
                    >
                      {booking.status}
                    </Badge>
                  </div>

                  <div className="text-left space-y-1">
                    <h4 className="text-lg lg:text-xl font-[1000] uppercase italic tracking-tighter dark:text-white group-hover:text-blue-500 transition-colors pr-4">
                      {booking.resource}
                    </h4>
                    <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="opacity-50" />{" "}
                        {safeFormatDate(booking.date, "dd MMM yyyy")}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="opacity-50" />{" "}
                        {safeFormatDate(booking.date, "HH:mm")}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t dark:border-white/5 flex items-center justify-between">
                    <span className="text-[8px] font-black uppercase text-slate-300 dark:text-slate-600 italic tracking-widest group-hover:text-blue-500 transition-colors">
                      Lihat E-Tiket Digital
                    </span>
                    <ArrowRight
                      size={16}
                      className={cn(
                        "transition-transform group-hover:translate-x-1",
                        activeTheme.primary,
                      )}
                      strokeWidth={3}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            {currentList.length === 0 && (
              <div className="col-span-full py-24 text-center space-y-4 bg-white dark:bg-white/[0.01] rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-white/5 opacity-50">
                <Ticket size={40} className="mx-auto opacity-10" />
                <p className="text-[9px] font-black uppercase italic tracking-[0.3em] text-slate-400">
                  Belum ada aktivitas tercatat
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE NAVIGATION BAR */}
      <div className="lg:hidden fixed bottom-6 left-6 right-6 h-20 bg-white/80 dark:bg-black/80 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-white/5 flex items-center justify-around px-4 z-[100]">
        <button
          onClick={() => router.push("/me")}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTheme.primary,
          )}
        >
          <LayoutDashboard size={22} />
          <span className="text-[7px] font-black uppercase tracking-[0.2em]">
            Dashboard
          </span>
        </button>

        <button
          onClick={() => router.push("/bookings")}
          className={cn(
            "h-14 w-14 rounded-2xl text-white flex items-center justify-center -mt-12 border-4 border-white dark:border-[#050505] active:scale-90 transition-all shadow-2xl",
            activeTheme.bgPrimary,
            activeTheme.glow,
          )}
        >
          <Plus size={24} strokeWidth={3} />
        </button>

        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-slate-300 dark:text-slate-600"
        >
          <LogOut size={22} />
          <span className="text-[7px] font-black uppercase tracking-[0.2em]">
            Logout
          </span>
        </button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-12 space-y-10">
      <Skeleton className="h-60 w-full rounded-[3rem] bg-slate-100 dark:bg-white/5" />
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-28 w-full rounded-[2rem] bg-slate-100 dark:bg-white/5" />
        <Skeleton className="h-28 w-full rounded-[2rem] bg-slate-100 dark:bg-white/5" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-12 w-48 rounded-xl bg-slate-100 dark:bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-56 w-full rounded-[2rem] bg-slate-100 dark:bg-white/5" />
          <Skeleton className="h-56 w-full rounded-[2rem] bg-slate-100 dark:bg-white/5" />
        </div>
      </div>
    </div>
  );
}
