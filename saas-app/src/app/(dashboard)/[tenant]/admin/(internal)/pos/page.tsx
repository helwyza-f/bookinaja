"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Clock,
  Loader2,
  MonitorPlay,
  ChevronRight,
  Timer,
  User as UserIcon,
  CreditCard,
  Hash,
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

// --- KOMPONEN SKELETON (Lebih Compact) ---
function POSControlSkeleton() {
  return (
    <div className="w-full h-full bg-white dark:bg-slate-950 flex flex-col overflow-hidden font-plus-jakarta animate-in fade-in duration-300">
      <VisuallyHidden.Root>
        <SheetHeader>
          <SheetTitle>Loading Session</SheetTitle>
          <SheetDescription>Preparing data...</SheetDescription>
        </SheetHeader>
      </VisuallyHidden.Root>
      <div className="px-6 py-8 bg-slate-900 shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl bg-slate-800" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-slate-800" />
              <Skeleton className="h-2 w-20 bg-slate-800" />
            </div>
          </div>
          <Skeleton className="h-9 w-9 rounded-xl bg-slate-800" />
        </div>
      </div>
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-12 rounded-xl dark:bg-slate-900" />
          <Skeleton className="h-12 rounded-xl dark:bg-slate-900" />
          <Skeleton className="h-12 rounded-xl dark:bg-slate-900" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl dark:bg-slate-900" />
        <Skeleton className="h-32 w-full rounded-2xl dark:bg-slate-900" />
      </div>
    </div>
  );
}

// --- KOMPONEN CARD SESI (Compact & Padat Info) ---
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
        "group cursor-pointer rounded-[1.5rem] border-none transition-all duration-300 relative bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-white/5 hover:ring-blue-500/50 hover:shadow-xl active:scale-[0.98]",
        isActiveParam && "ring-2 ring-blue-500 shadow-blue-500/10",
        timeInfo.isUrgent && "ring-red-500/30",
      )}
    >
      <CardContent className="p-0 flex flex-col">
        {/* Progress Bar Atas (Subtle) */}
        <div className="h-1.5 w-full bg-slate-50 dark:bg-white/5 overflow-hidden">
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
          {/* Header Row: Unit & Badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                  timeInfo.isUrgent
                    ? "bg-red-100 dark:bg-red-900/40 text-red-600"
                    : "bg-blue-50 dark:bg-blue-900/30 text-blue-600",
                )}
              >
                <Hash className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span className="text-[11px] font-black uppercase italic tracking-tight text-slate-900 dark:text-white pr-1">
                {session.resource_name}
              </span>
            </div>
            {timeInfo.isUrgent && (
              <Badge className="bg-red-500 text-white text-[7px] font-black px-1.5 py-0 rounded-md animate-pulse border-none pr-1">
                URGENT
              </Badge>
            )}
          </div>

          {/* Customer Row */}
          <div className="space-y-0.5">
            <h3 className="text-sm font-black uppercase italic truncate text-slate-800 dark:text-slate-200 pr-2">
              {session.customer_name}
            </h3>
            <p className="text-[9px] font-bold text-slate-400 italic flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              Starts {format(new Date(session.start_time), "HH:mm")}
            </p>
          </div>

          {/* Compact Bento Info Row */}
          <div className="grid grid-cols-2 gap-2">
            {/* Time Left */}
            <div
              className={cn(
                "p-2 rounded-xl flex flex-col gap-0.5 border",
                timeInfo.isUrgent
                  ? "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30"
                  : "bg-slate-50 dark:bg-white/5 border-transparent",
              )}
            >
              <span className="text-[7px] font-black uppercase text-slate-400">
                Sisa Waktu
              </span>
              <span
                className={cn(
                  "text-[11px] font-black italic tracking-tighter pr-1",
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
            {/* Live Bill */}
            <div className="p-2 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 flex flex-col gap-0.5 border border-transparent">
              <span className="text-[7px] font-black uppercase text-blue-400">
                Tagihan
              </span>
              <span className="text-[11px] font-black italic text-blue-600 dark:text-blue-400 tracking-tighter pr-1">
                Rp{new Intl.NumberFormat("id-ID").format(session.grand_total)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer: Action Hint */}
        <div className="px-4 py-2 border-t border-slate-50 dark:border-white/5 flex justify-end group-hover:bg-blue-600 transition-colors duration-300">
          <ChevronRight
            size={14}
            className="text-slate-300 group-hover:text-white transition-all"
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
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700 font-plus-jakarta pb-20 mt-10 px-4 md:px-8">
      {/* HEADER SECTION (CLEAN) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-slate-100 dark:border-white/5 pb-8 gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none dark:text-white pr-4">
              POS <span className="text-blue-600">Terminal</span>
            </h1>
          </div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em] italic mt-2 pr-2">
            Real-time management for active sessions
          </p>
        </div>

        <Badge className="bg-emerald-500 text-white border-none font-black px-5 py-2 rounded-2xl italic shadow-xl shadow-emerald-500/20 text-base pr-3 h-12 flex items-center gap-2">
          {activeSessions.length}{" "}
          <span className="text-[10px] opacity-80 not-italic tracking-widest font-black uppercase">
            Units Active
          </span>
        </Badge>
      </div>

      {/* GRID CONTENT */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <Card
              key={i}
              className="rounded-[1.5rem] border-none bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-white/5 overflow-hidden"
            >
              <Skeleton className="h-1.5 w-full" />
              <div className="p-4 space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-7 w-20 rounded-lg dark:bg-slate-800" />
                  <Skeleton className="h-5 w-5 rounded-md dark:bg-slate-800" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4 dark:bg-slate-800" />
                  <Skeleton className="h-3 w-1/2 dark:bg-slate-800" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-10 rounded-xl dark:bg-slate-800" />
                  <Skeleton className="h-10 rounded-xl dark:bg-slate-800" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : activeSessions.length === 0 ? (
        <div className="h-[40vh] flex flex-col items-center justify-center text-center gap-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/5">
          <MonitorPlay
            size={48}
            className="text-slate-200 dark:text-slate-800"
          />
          <h3 className="text-lg font-black italic uppercase text-slate-400 pr-2">
            No Active Sessions
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 animate-in slide-in-from-bottom-2 duration-500">
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

      {/* DETAIL SESSION SHEET */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="p-0 border-none bg-transparent sm:max-w-[460px] w-full">
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
