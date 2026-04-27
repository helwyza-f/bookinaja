"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Clock,
  MonitorPlay,
  ChevronRight,
  User as UserIcon,
  Hash,
  Lock,
  History,
  Activity,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { POSControlHub } from "@/components/pos/pos-control-hub";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { format, differenceInMinutes } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

// --- KOMPONEN SKELETON COMPACT ---
function POSControlSkeleton() {
  return (
    <div className="w-full h-full bg-white dark:bg-slate-950 flex flex-col overflow-hidden font-plus-jakarta animate-in fade-in duration-300">
      <VisuallyHidden.Root>
        <SheetHeader>
          <SheetTitle>Loading</SheetTitle>
          <SheetDescription>Data sync...</SheetDescription>
        </SheetHeader>
      </VisuallyHidden.Root>
      <div className="px-6 py-6 bg-slate-900 shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl bg-slate-800" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-slate-800" />
              <Skeleton className="h-2 w-20 bg-slate-800" />
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl dark:bg-slate-900" />
        <Skeleton className="h-40 w-full rounded-2xl dark:bg-slate-900" />
      </div>
    </div>
  );
}

// --- SESSION CARD PREMIUM ---
function SessionCard({ session, onClick, isActiveParam }: any) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  const timeInfo = useMemo(() => {
    const end = new Date(session.end_time);
    const start = new Date(session.start_time);
    const totalDuration = differenceInMinutes(end, start);
    const elapsed = differenceInMinutes(now, start);
    const remaining = differenceInMinutes(end, now);
    const progress = Math.min(
      100,
      Math.max(0, (elapsed / totalDuration) * 100),
    );

    return {
      remaining:
        remaining <= 0
          ? "Habis"
          : remaining < 60
            ? `${remaining}m`
            : `${Math.floor(remaining / 60)}h ${remaining % 60}m`,
      isUrgent: remaining > 0 && remaining <= 10,
      isOver: remaining <= 0,
      progress,
    };
  }, [session, now]);

  return (
    <Card
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-[1.2rem] border-[0.5px] border-slate-200 dark:border-white/5 transition-all duration-300 bg-white dark:bg-slate-900 hover:border-blue-500/50 hover:shadow-xl active:scale-[0.97]",
        isActiveParam &&
          "ring-2 ring-blue-500 border-transparent shadow-lg shadow-blue-500/10",
        timeInfo.isUrgent &&
          "ring-1 ring-red-500/50 border-transparent shadow-red-500/5",
      )}
    >
      <CardContent className="p-0 flex flex-col">
        {/* Subtle Mini Progress */}
        <div className="h-1 w-full bg-slate-50 dark:bg-white/5 overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-1000",
              timeInfo.isUrgent
                ? "bg-red-500"
                : timeInfo.isOver
                  ? "bg-slate-400"
                  : "bg-blue-600",
            )}
            style={{ width: `${timeInfo.progress}%` }}
          />
        </div>

        <div className="p-4 space-y-4">
          {/* Top Row: Unit ID & Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center",
                  timeInfo.isUrgent
                    ? "bg-red-100 dark:bg-red-900/40 text-red-600"
                    : "bg-blue-50 dark:bg-blue-900/30 text-blue-600",
                )}
              >
                <Hash className="w-3 h-3 stroke-[3]" />
              </div>
              <span className="text-xs font-[1000] uppercase italic tracking-tighter text-slate-950 dark:text-white">
                {session.resource_name}
              </span>
            </div>
            {timeInfo.isUrgent ? (
              <div className="flex items-center gap-1 text-[8px] font-black text-red-500 uppercase italic animate-pulse">
                <History size={10} strokeWidth={3} /> Expiring
              </div>
            ) : (
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </div>

          {/* Center: Customer */}
          <div className="space-y-0.5">
            <h3 className="text-sm font-[1000] uppercase italic truncate text-slate-900 dark:text-slate-100 pr-2 leading-tight group-hover:text-blue-600 transition-colors">
              {session.customer_name}
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic flex items-center gap-1 opacity-70">
              <Clock size={10} />{" "}
              {format(new Date(session.start_time), "HH:mm")} -{" "}
              {format(new Date(session.end_time), "HH:mm")}
            </p>
          </div>

          {/* Bottom Grid: Info Bento */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className={cn(
                "px-2.5 py-1.5 rounded-xl flex flex-col border-[0.5px]",
                timeInfo.isUrgent
                  ? "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30"
                  : "bg-slate-50 dark:bg-slate-800/30 border-transparent",
              )}
            >
              <span className="text-[7px] font-black uppercase text-slate-400">
                Remaining
              </span>
              <span
                className={cn(
                  "text-[11px] font-[1000] italic leading-tight",
                  timeInfo.isUrgent
                    ? "text-red-600"
                    : timeInfo.isOver
                      ? "text-slate-500"
                      : "text-emerald-500",
                )}
              >
                {timeInfo.remaining}
              </span>
            </div>
            <div className="px-2.5 py-1.5 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 flex flex-col border-[0.5px] border-transparent">
              <span className="text-[7px] font-black uppercase text-blue-400">
                Total Bill
              </span>
              <span className="text-[11px] font-[1000] italic text-blue-600 dark:text-blue-400 leading-tight">
                Rp{new Intl.NumberFormat("id-ID").format(session.grand_total)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-4 py-2 border-t-[0.5px] border-slate-50 dark:border-white/5 flex justify-between items-center group-hover:bg-blue-600 transition-all duration-300">
          <span className="text-[8px] font-black uppercase text-slate-300 group-hover:text-blue-100 italic transition-all tracking-widest">
            Open Hub
          </span>
          <ChevronRight
            size={12}
            className="text-slate-200 group-hover:text-white transition-all translate-x-[-4px] group-hover:translate-x-0"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function POSPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeId = searchParams.get("active");

  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSheetLoading, setIsSheetLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [sessionsRes, menuRes] = await Promise.all([
        api.get("/bookings/pos/active"),
        api.get("/fnb"),
      ]);
      setActiveSessions(sessionsRes.data || []);
      setMenuItems(menuRes.data || []);
    } catch (err) {
      toast.error("Gagal sinkronisasi terminal");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openSessionDetail = useCallback(async (id: string) => {
    setSelectedSession(null);
    setIsSheetOpen(true);
    setIsSheetLoading(true);
    try {
      const res = await api.get(`/bookings/${id}`);
      setSelectedSession(res.data);
    } catch (err) {
      toast.error("Detail gagal dimuat");
      setIsSheetOpen(false);
    } finally {
      setIsSheetLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeId && activeSessions.length > 0 && !isSheetOpen) {
      const exists = activeSessions.find((s) => s.id === activeId);
      if (exists) {
        openSessionDetail(activeId);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("active");
        router.replace(`/admin/pos?${params.toString()}`, { scroll: false });
      }
    }
  }, [
    activeId,
    activeSessions,
    openSessionDetail,
    isSheetOpen,
    router,
    searchParams,
  ]);

  const refreshSelectedSession = async (id: string) => {
    const res = await api.get(`/bookings/${id}`);
    setSelectedSession(res.data);
    setActiveSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, grand_total: res.data.grand_total } : s,
      ),
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 md:space-y-6 animate-in fade-in duration-500 font-plus-jakarta pb-20 px-3 md:px-4">
      {/* 1. ULTRA COMPACT HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-[0.5px] border-slate-200 dark:border-white/5 pb-5 md:pb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <Zap size={20} fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-3xl font-[1000] italic uppercase tracking-tighter text-slate-950 dark:text-white leading-none">
              POS <span className="text-blue-600">Terminal.</span>
            </h1>
            <p className="hidden sm:block text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] italic mt-1.5">
              Active Session Monitor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end leading-none mr-2 hidden md:flex">
            <span className="text-[8px] font-black text-slate-400 uppercase italic mb-1">
              Live Status
            </span>
            <div className="flex items-center gap-1.5 text-emerald-500 font-black text-[10px] uppercase italic">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
              Connected
            </div>
          </div>
          <Badge className="h-12 px-5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-2xl font-[1000] italic border-none shadow-lg gap-2 text-base">
            {activeSessions.length}{" "}
            <span className="text-[10px] opacity-60 uppercase not-italic tracking-tighter">
              Units
            </span>
          </Badge>
        </div>
      </div>

      {/* 2. GRID CONTENT - HIGH DENSITY */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <Card
              key={i}
              className="rounded-[1.2rem] border-none bg-white dark:bg-slate-900 ring-1 ring-slate-100 overflow-hidden h-44"
            >
              <Skeleton className="h-1 w-full" />
              <div className="p-4 space-y-4">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-12 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : activeSessions.length === 0 ? (
        <div className="h-72 md:h-96 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-[1.75rem] md:rounded-[3rem] border border-dashed border-slate-200 dark:border-white/5 gap-3">
          <MonitorPlay
            size={40}
            className="text-slate-200 dark:text-slate-800"
          />
          <h3 className="text-sm font-black italic uppercase text-slate-400 tracking-widest">
            No Active Terminal
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 animate-in slide-in-from-bottom-2 duration-500">
          {activeSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isActiveParam={activeId === session.id}
              onClick={() => openSessionDetail(session.id)}
            />
          ))}
        </div>
      )}

      {/* 3. DETAIL SESSION SHEET */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="p-0 border-none bg-transparent sm:max-w-[460px] w-full shadow-none">
          <VisuallyHidden.Root>
            <SheetHeader>
              <SheetTitle>Session Management</SheetTitle>
              <SheetDescription>
                Control unit session and orders
              </SheetDescription>
            </SheetHeader>
          </VisuallyHidden.Root>

          {isSheetLoading ? (
            <POSControlSkeleton />
          ) : selectedSession ? (
            <POSControlHub
              session={selectedSession}
              menuItems={menuItems}
              onRefresh={refreshSelectedSession}
              onClose={() => setIsSheetOpen(false)}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
