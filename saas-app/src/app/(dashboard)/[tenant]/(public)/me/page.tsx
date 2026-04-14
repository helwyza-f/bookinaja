"use client";

import { useEffect, useState, useMemo } from "react";
import { getCookie, deleteCookie } from "cookies-next";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  History,
  LogOut,
  Wallet,
  Zap,
  Calendar,
  Clock,
  ChevronRight,
  User,
  LayoutDashboard,
  Gamepad2,
  ArrowRight,
  Sparkles,
  Search,
  Loader2,
  Ticket,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const THEMES: Record<string, any> = {
  gaming_hub: {
    primary: "text-blue-500",
    bgPrimary: "bg-blue-600",
    accent: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  creative_space: {
    primary: "text-rose-500",
    bgPrimary: "bg-rose-600",
    accent: "bg-rose-500/10",
    border: "border-rose-500/20",
  },
  sport_center: {
    primary: "text-emerald-500",
    bgPrimary: "bg-emerald-600",
    accent: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  social_space: {
    primary: "text-indigo-500",
    bgPrimary: "bg-indigo-600",
    accent: "bg-indigo-500/10",
    border: "border-indigo-500/20",
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
        console.error("Auth failed:", err);
        // Jika token tidak valid, arahkan ke login publik tenant
        router.push(`/login`);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [router, params.tenant]);

  const activeTheme = useMemo(() => {
    // Ambil kategori dari profil tenant (via context atau data me)
    const cat = data?.business_category || "gaming_hub";
    return THEMES[cat] || THEMES.gaming_hub;
  }, [data]);

  const handleLogout = () => {
    deleteCookie("customer_auth");
    deleteCookie("auth_token");
    window.location.href = `/${params.tenant}/login`;
  };

  if (loading) return <DashboardSkeleton />;

  const activeBookings = data?.active_bookings || [];
  const pastBookings = data?.past_history || [];

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] font-plus-jakarta pb-32 lg:pb-10 transition-colors duration-500">
      <div
        className={cn(
          "hidden lg:block fixed left-0 top-0 bottom-0 w-1.5 z-50",
          activeTheme.bgPrimary,
        )}
      />

      <div className="max-w-7xl mx-auto">
        {/* HEADER SECTION */}
        <div
          className={cn(
            "pt-16 pb-24 px-6 lg:px-12 lg:pt-20 lg:pb-32 rounded-b-[3.5rem] lg:rounded-none text-white relative overflow-hidden transition-all",
            activeTheme.bgPrimary,
          )}
        >
          <Zap className="absolute -right-10 -top-10 h-64 w-64 opacity-10 rotate-12 animate-pulse" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between relative z-10 gap-8">
            <div className="flex items-center gap-6 text-left">
              <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-[2rem] bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/40 shadow-2xl">
                <User className="h-8 w-8 lg:h-10 lg:w-10" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] opacity-80">
                    Verified Sultan Member
                  </p>
                  <Sparkles className="h-3 w-3 text-yellow-300 fill-yellow-300" />
                </div>
                <h1 className="text-3xl lg:text-6xl font-[1000] uppercase italic tracking-tighter leading-none">
                  {data?.customer?.name}
                </h1>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="px-8 h-14 bg-white text-black rounded-2xl font-[1000] uppercase italic tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                Book Unit
              </button>
              <button
                onClick={handleLogout}
                className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center hover:bg-red-500 transition-all group"
              >
                <LogOut
                  size={20}
                  className="group-hover:scale-110 transition-transform"
                />
              </button>
            </div>
          </div>
        </div>

        {/* STATS OVERLAY */}
        <div className="px-6 lg:px-12 -mt-12 lg:-mt-16 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-20">
          <div className="lg:col-span-4 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <Card className="border-none rounded-[2.5rem] shadow-2xl dark:bg-[#0c0c0c] ring-1 ring-white/5 hover:translate-y-[-5px] transition-all duration-500">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center shadow-inner">
                    <Wallet size={24} />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      Loyalty Points
                    </span>
                    <p className="text-2xl lg:text-3xl font-[1000] italic uppercase tracking-tighter mt-1">
                      {data?.points?.toLocaleString() || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none rounded-[2.5rem] shadow-2xl dark:bg-[#0c0c0c] ring-1 ring-white/5 hover:translate-y-[-5px] transition-all duration-500">
                <CardContent className="p-6 flex items-center gap-4">
                  <div
                    className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner",
                      activeTheme.accent,
                      activeTheme.primary,
                    )}
                  >
                    <Trophy size={24} />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      Membership
                    </span>
                    <p className="text-2xl lg:text-3xl font-[1000] italic uppercase tracking-tighter mt-1">
                      {data?.customer?.tier || "BRONZE"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* BOOKING LISTS */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="inline-flex p-1.5 bg-slate-100 dark:bg-white/5 backdrop-blur-md rounded-[1.8rem] w-full md:w-auto shadow-inner">
                <button
                  onClick={() => setActiveTab("active")}
                  className={cn(
                    "flex-1 md:px-10 py-3.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === "active"
                      ? "bg-white dark:bg-white/10 shadow-xl scale-[1.02] text-blue-600 dark:text-white"
                      : "opacity-40",
                  )}
                >
                  Live Session ({activeBookings.length})
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={cn(
                    "flex-1 md:px-10 py-3.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === "history"
                      ? "bg-white dark:bg-white/10 shadow-xl scale-[1.02] text-blue-600 dark:text-white"
                      : "opacity-40",
                  )}
                >
                  History
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-12">
              {(activeTab === "active" ? activeBookings : pastBookings).map(
                (booking: any) => (
                  <Card
                    key={booking.id}
                    onClick={() => router.push(`/me/bookings/${booking.id}`)}
                    className="border-none rounded-[2.5rem] shadow-xl dark:bg-[#0c0c0c] ring-1 ring-white/5 group hover:ring-blue-500/30 transition-all duration-500 cursor-pointer overflow-hidden"
                  >
                    <CardContent className="p-7 space-y-6">
                      <div className="flex justify-between items-start">
                        <div
                          className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg",
                            activeTheme.accent,
                            activeTheme.primary,
                          )}
                        >
                          <Gamepad2 className="h-6 w-6" />
                        </div>
                        <Badge
                          className={cn(
                            "rounded-lg px-3 py-1 text-[8px] uppercase font-black tracking-widest border-none shadow-sm",
                            booking.status === "active"
                              ? "bg-emerald-500 animate-pulse"
                              : "bg-slate-700",
                          )}
                        >
                          {booking.status}
                        </Badge>
                      </div>

                      <div className="text-left space-y-1">
                        <h4 className="text-xl font-[1000] uppercase italic tracking-tighter group-hover:text-blue-500 transition-colors">
                          {booking.resource_name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-[9px] font-bold opacity-50 uppercase tracking-widest">
                          <div className="flex items-center gap-1">
                            <Calendar size={10} />{" "}
                            {format(
                              parseISO(booking.start_time),
                              "dd MMM yyyy",
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={10} />{" "}
                            {format(parseISO(booking.start_time), "HH:mm")}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase opacity-30 italic">
                          Click for details
                        </span>
                        <div
                          className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1",
                            activeTheme.accent,
                            activeTheme.primary,
                          )}
                        >
                          <ArrowRight size={14} strokeWidth={3} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ),
              )}

              {(activeTab === "active" ? activeBookings : pastBookings)
                .length === 0 && (
                <div className="col-span-full py-24 text-center space-y-4 bg-slate-50/50 dark:bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/5">
                  <Ticket size={48} className="mx-auto opacity-10" />
                  <p className="text-[10px] font-black uppercase italic tracking-[0.3em] opacity-30">
                    No activities recorded
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE NAV */}
      <div className="lg:hidden fixed bottom-6 left-6 right-6 h-20 bg-white/80 dark:bg-black/80 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-white/5 flex items-center justify-around px-4 z-[100]">
        <button
          onClick={() => router.push("/me")}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTheme.primary,
          )}
        >
          <LayoutDashboard size={20} />
          <span className="text-[7px] font-black uppercase tracking-widest">
            Home
          </span>
        </button>
        <button
          onClick={() => router.push("/")}
          className={cn(
            "h-14 w-14 rounded-2xl text-white flex items-center justify-center shadow-2xl -mt-12 border-4 border-white dark:border-[#050505] active:scale-90 transition-all",
            activeTheme.bgPrimary,
          )}
        >
          <Plus size={24} strokeWidth={3} />
        </button>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 opacity-30"
        >
          <LogOut size={20} />
          <span className="text-[7px] font-black uppercase tracking-widest">
            Logout
          </span>
        </button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-12 space-y-10">
      <Skeleton className="h-64 w-full rounded-[3.5rem] bg-slate-100 dark:bg-white/5" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-4">
          <Skeleton className="h-32 w-full rounded-[2.5rem] bg-slate-100 dark:bg-white/5" />
          <Skeleton className="h-32 w-full rounded-[2.5rem] bg-slate-100 dark:bg-white/5" />
        </div>
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-56 w-full rounded-[2.5rem] bg-slate-100 dark:bg-white/5" />
          <Skeleton className="h-56 w-full rounded-[2.5rem] bg-slate-100 dark:bg-white/5" />
        </div>
      </div>
    </div>
  );
}
