"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  Users,
  Package,
  CalendarCheck2,
  ArrowUpRight,
  ArrowDownRight,
  Monitor,
  Activity,
  DollarSign,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  // Mock Data - Nanti lo sambungin ke SWR/API
  const stats = [
    {
      label: "Total Revenue",
      value: "Rp 12.450.000",
      growth: "+12.5%",
      positive: true,
      icon: DollarSign,
      color: "text-emerald-500",
    },
    {
      label: "Active Bookings",
      value: "42",
      growth: "+8%",
      positive: true,
      icon: CalendarCheck2,
      color: "text-blue-500",
    },
    {
      label: "Active Customers",
      value: "128",
      growth: "-3%",
      positive: false,
      icon: Users,
      color: "text-orange-500",
    },
    {
      label: "Unit Occupancy",
      value: "85%",
      growth: "+5%",
      positive: true,
      icon: Monitor,
      color: "text-indigo-500",
    },
  ];

  return (
    <div className="space-y-6 md:space-y-10 pb-20 px-3 md:px-0 font-plus-jakarta">
      {/* 1. WELCOME SECTION */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-7xl font-[1000] italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
            Dashboard <span className="text-blue-600">Hub.</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold italic text-xs uppercase tracking-[0.3em] flex items-center gap-2">
            <Activity className="h-3 w-3 text-blue-600 animate-pulse" />
            Live system performance overview
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            className="rounded-2xl h-11 md:h-14 px-3 md:px-6 font-black italic uppercase text-[9px] md:text-[10px] tracking-widest border-2 w-full"
          >
            Export Report
          </Button>
          <Button className="rounded-2xl h-11 md:h-14 px-3 md:px-8 bg-blue-600 font-black italic uppercase text-[9px] md:text-[10px] tracking-widest shadow-xl shadow-blue-500/20 border-b-4 border-blue-800 w-full">
            View Live POS
          </Button>
        </div>
      </div>

      {/* 2. STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((item, i) => (
          <Card
            key={i}
          className="rounded-[2rem] md:rounded-[2.5rem] border-none p-5 md:p-8 bg-white dark:bg-slate-900/50 shadow-xl ring-1 ring-slate-100 dark:ring-white/5 group hover:ring-blue-500/30 transition-all"
          >
            <div className="flex justify-between items-start mb-4 md:mb-6">
              <div
                className={cn(
                  "h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center transition-colors group-hover:bg-blue-600/10",
                  item.color,
                )}
              >
                <item.icon size={20} className="md:size-6" strokeWidth={2.5} />
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full border-none px-2.5 py-0.5 font-black italic text-[8px] md:text-[9px] uppercase",
                  item.positive
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-red-500/10 text-red-500",
                )}
              >
                {item.positive ? (
                  <ArrowUpRight className="mr-1 h-3 w-3" />
                ) : (
                  <ArrowDownRight className="mr-1 h-3 w-3" />
                )}
                {item.growth}
              </Badge>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              {item.label}
            </p>
            <h3 className="text-2xl md:text-3xl font-[1000] italic uppercase tracking-tighter text-slate-900 dark:text-white">
              {item.value}
            </h3>
          </Card>
        ))}
      </div>

      {/* 3. BENTO SECTION: LIVE MONITOR & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* LIVE UNIT STATUS (Bento 8 Columns) */}
        <Card className="lg:col-span-8 rounded-[2rem] md:rounded-[3rem] border-none p-4 md:p-10 bg-slate-950 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 md:p-10 opacity-10">
            <Monitor size={120} strokeWidth={1} />
          </div>
          <div className="relative z-10 space-y-5 md:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg md:text-3xl font-black italic uppercase tracking-tight">
                  Resource Status
                </h2>
                <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">
                  Real-time station availability
                </p>
              </div>
              <div className="flex gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  Live Updates
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "aspect-square rounded-2xl md:rounded-3xl p-3 md:p-4 flex flex-col justify-between border-2 transition-all",
                    i < 7
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-500"
                      : "border-slate-800 bg-slate-900/50 text-slate-500",
                  )}
                >
                  <span className="text-[10px] font-black">
                    PC-{String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="space-y-1">
                    <p className="text-[7px] md:text-[8px] font-black uppercase leading-none">
                      {i < 7 ? "Available" : "In Use"}
                    </p>
                    {i >= 7 && (
                      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-2/3" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* RECENT BOOKINGS (Bento 4 Columns) */}
        <Card className="lg:col-span-4 rounded-[2rem] md:rounded-[3rem] border-none p-4 md:p-10 bg-white dark:bg-slate-900 shadow-xl ring-1 ring-slate-100 dark:ring-white/5 space-y-5 md:space-y-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm md:text-xl font-black italic uppercase tracking-tight dark:text-white">
              Recent Activity
            </h2>
            <Clock size={18} className="text-blue-600 md:size-5" />
          </div>

          <div className="space-y-3 md:space-y-6">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 group cursor-pointer"
              >
                <div className="h-9 w-9 md:h-12 md:w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black text-xs italic group-hover:bg-blue-600 group-hover:text-white transition-all">
                  HF
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-[9px] md:text-[11px] font-black uppercase italic leading-none dark:text-white">
                    Customer #{item}24
                  </p>
                  <p className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                    Booked PC-08 â€¢ 2 Hours
                  </p>
                </div>
                <p className="text-[9px] font-black italic text-blue-600">
                  5m ago
                </p>
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            className="w-full rounded-2xl h-12 font-black italic uppercase text-[9px] tracking-widest text-slate-400 hover:text-blue-600"
          >
            View All Activity
          </Button>
        </Card>
      </div>
    </div>
  );
}

