"use client";

import { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";
import { deleteCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get("/me");
        setData(res.data);
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [router]);

  const activeTheme = useMemo(() => {
    const cat = data?.customer?.business_category || "social_space";
    return THEMES[cat] || THEMES.social_space;
  }, [data]);

  const handleLogout = () => {
    deleteCookie("auth_token");
    router.push("/login");
  };

  if (loading) return <DashboardSkeleton />;

  const activeBookings = data.active_bookings || [];
  const pastBookings = data.past_history || [];

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] font-plus-jakarta pb-32 lg:pb-10 transition-colors duration-500">
      {/* desktop Sidebar Decor */}
      <div
        className={cn(
          "hidden lg:block fixed left-0 top-0 bottom-0 w-1",
          activeTheme.bgPrimary,
        )}
      />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto">
        {/* Header Section - Modern Glassmorphism */}
        <div
          className={cn(
            "pt-16 pb-24 px-6 lg:px-12 lg:pt-20 lg:pb-32 rounded-b-[3.5rem] lg:rounded-none text-white relative overflow-hidden transition-all",
            activeTheme.bgPrimary,
          )}
        >
          {/* Animated Background Decor */}
          <Zap className="absolute -right-10 -top-10 h-64 w-64 opacity-10 rotate-12 animate-pulse" />
          <div className="absolute top-1/4 left-1/4 h-64 w-64 bg-white/10 rounded-full blur-[100px]" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between relative z-10 gap-8">
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-[2rem] bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/40 shadow-2xl">
                <User className="h-8 w-8 lg:h-10 lg:w-10" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] opacity-80">
                    Verified Member
                  </p>
                  <Sparkles className="h-3 w-3 text-yellow-300" />
                </div>
                <h1 className="text-3xl lg:text-5xl font-black uppercase italic tracking-tighter leading-none">
                  {data.customer.name}
                </h1>
              </div>
            </div>

            {/* Desktop Quick Actions */}
            <div className="hidden lg:flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="px-8 h-14 bg-white text-black rounded-2xl font-black uppercase italic tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                New Booking
              </button>
              <button
                onClick={handleLogout}
                className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center hover:bg-red-500 transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* content wrapper for desktop grid */}
        <div className="px-6 lg:px-12 -mt-12 lg:-mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-20">
          {/* Left Column: stats (3 cols on desktop) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <Card className="border-none rounded-[2.5rem] shadow-2xl dark:bg-[#111] lg:p-4 hover:translate-y-[-5px] transition-transform">
                <CardContent className="p-6 flex items-center lg:items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                    <Wallet size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      Sultan Points
                    </span>
                    <p className="text-2xl lg:text-3xl font-black italic uppercase tracking-tighter mt-1">
                      {data.points.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none rounded-[2.5rem] shadow-2xl dark:bg-[#111] lg:p-4 hover:translate-y-[-5px] transition-transform">
                <CardContent className="p-6 flex items-center lg:items-start gap-4">
                  <div
                    className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center",
                      activeTheme.accent,
                      activeTheme.primary,
                    )}
                  >
                    <Trophy size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      Tier Status
                    </span>
                    <p className="text-2xl lg:text-3xl font-black italic uppercase tracking-tighter mt-1">
                      {data.customer.tier}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Desktop-only Loyalty Card */}
            <Card
              className={cn(
                "hidden lg:block border-none rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl",
                activeTheme.bgPrimary,
              )}
            >
              <div className="relative z-10 space-y-6">
                <h4 className="text-xl font-black uppercase italic tracking-tighter">
                  Your Privileges
                </h4>
                <ul className="space-y-3 text-xs font-bold opacity-90 uppercase tracking-widest">
                  <li className="flex items-center gap-2">
                    <ChevronRight size={14} /> 10% Discount all units
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight size={14} /> Free Extended 30 Mins
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight size={14} /> Priority Booking
                  </li>
                </ul>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] opacity-20">
                <Sparkles size={120} />
              </div>
            </Card>
          </div>

          {/* Right Column: main Lists (8 cols on desktop) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Nav & Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="inline-flex p-1.5 bg-slate-100 dark:bg-white/5 backdrop-blur-md rounded-[1.5rem] w-full md:w-auto">
                <button
                  onClick={() => setActiveTab("active")}
                  className={cn(
                    "flex-1 md:px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                    activeTab === "active"
                      ? "bg-white dark:bg-white/10 shadow-xl scale-[1.02]"
                      : "opacity-40 hover:opacity-70",
                  )}
                >
                  Active ({activeBookings.length})
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={cn(
                    "flex-1 md:px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                    activeTab === "history"
                      ? "bg-white dark:bg-white/10 shadow-xl scale-[1.02]"
                      : "opacity-40 hover:opacity-70",
                  )}
                >
                  History
                </button>
              </div>

              <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-30">
                <Search size={14} /> Filter Activity
              </div>
            </div>

            {/* list grid: 2 columns on desktop! */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12 lg:pb-0">
              {(activeTab === "active" ? activeBookings : pastBookings).map(
                (booking: any) => (
                  <Card
                    key={booking.id}
                    className="border-none rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:bg-[#111] group hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                  >
                    <CardContent className="p-8 space-y-6">
                      <div className="flex justify-between items-start">
                        <div
                          className={cn(
                            "h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner transition-colors",
                            activeTheme.accent,
                            activeTheme.primary,
                          )}
                        >
                          <Gamepad2 className="h-7 w-7" />
                        </div>
                        <Badge
                          className={cn(
                            "rounded-xl px-4 py-1.5 text-[9px] uppercase tracking-widest font-black border-none shadow-sm",
                            booking.status === "completed"
                              ? "bg-emerald-500 text-white"
                              : booking.status === "confirmed"
                                ? "bg-blue-500 text-white"
                                : "bg-slate-500 text-white",
                          )}
                        >
                          {booking.status}
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-xl font-black uppercase italic tracking-tight">
                          {booking.resource}
                        </h4>
                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold opacity-50 uppercase tracking-widest">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} />{" "}
                            {new Date(booking.date).toLocaleDateString(
                              "id-ID",
                              { day: "numeric", month: "long" },
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} /> {booking.time || "14:00"}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 italic">
                          Details
                        </span>
                        <ArrowRight
                          size={18}
                          className={cn(
                            "transition-transform group-hover:translate-x-2",
                            activeTheme.primary,
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ),
              )}

              {(activeTab === "active" ? activeBookings : pastBookings)
                .length === 0 && (
                <div className="col-span-full py-32 text-center space-y-6 bg-slate-50/50 dark:bg-white/5 rounded-[3.5rem] border-4 border-dashed border-slate-200 dark:border-white/5">
                  <div className="flex justify-center opacity-20">
                    <History size={64} strokeWidth={1} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black uppercase italic tracking-widest opacity-40">
                      Silence is Gold
                    </p>
                    <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.3em]">
                      No booking activities found here
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav (hidden on desktop) */}
      <div className="lg:hidden fixed bottom-6 left-6 right-6 h-22 bg-white/80 dark:bg-black/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/20 dark:border-white/5 flex items-center justify-around px-4 z-[100]">
        <button
          className={cn(
            "flex flex-col items-center gap-1.5 transition-all",
            activeTheme.primary,
          )}
        >
          <LayoutDashboard size={22} />
          <span className="text-[8px] font-black uppercase tracking-widest">
            Home
          </span>
        </button>
        <button
          onClick={() => router.push("/")}
          className={cn(
            "h-16 w-16 rounded-2xl text-white flex items-center justify-center shadow-2xl -mt-12 border-4 border-white dark:border-[#050505] active:scale-90 transition-all",
            activeTheme.bgPrimary,
          )}
        >
          <Zap size={28} fill="currentColor" />
        </button>
        <button className="flex flex-col items-center gap-1.5 opacity-30">
          <User size={22} />
          <span className="text-[8px] font-black uppercase tracking-widest">
            Profile
          </span>
        </button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-12 space-y-10">
      <Skeleton className="h-64 w-full rounded-[3.5rem]" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Skeleton className="h-32 w-full rounded-[2.5rem]" />
          <Skeleton className="h-32 w-full rounded-[2.5rem]" />
        </div>
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-[2.5rem]" />
          <Skeleton className="h-64 w-full rounded-[2.5rem]" />
        </div>
      </div>
    </div>
  );
}
