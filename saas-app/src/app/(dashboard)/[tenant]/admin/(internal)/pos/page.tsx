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
import { format, differenceInMinutes, isBefore } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

// --- KOMPONEN SKELETON UNTUK SHEET ---
function POSControlSkeleton() {
  return (
    <div className="w-full h-full bg-white dark:bg-slate-950 flex flex-col overflow-hidden font-plus-jakarta animate-in fade-in duration-300">
      <VisuallyHidden.Root>
        <SheetHeader>
          <SheetTitle>Memuat Detail Sesi</SheetTitle>
          <SheetDescription>Menyiapkan data kontrol sesi...</SheetDescription>
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
      <div className="p-3 grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/50 border-b dark:border-white/5">
        <Skeleton className="h-14 rounded-xl dark:bg-slate-800" />
        <Skeleton className="h-14 rounded-xl dark:bg-slate-800" />
        <Skeleton className="h-14 rounded-xl dark:bg-slate-800" />
      </div>
      <div className="flex-1 p-6 space-y-8">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-3 w-24 bg-slate-200 dark:bg-slate-800" />
            <Skeleton className="h-16 w-full rounded-2xl bg-slate-100 dark:bg-slate-900" />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- KOMPONEN CARD SESI (KASIR GRID) ---
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
          ? "Waktu Habis"
          : remaining < 60
            ? `${remaining}m`
            : `${Math.floor(remaining / 60)}j ${remaining % 60}m`,
      isUrgent: remaining > 0 && remaining <= 10,
      isOver: remaining <= 0,
      progress,
    };
  }, [session, now]);

  return (
    <Card
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-[2rem] border-none transition-all duration-500 overflow-hidden relative bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-white/5 hover:ring-blue-500/50 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]",
        isActiveParam && "ring-2 ring-blue-500 shadow-blue-500/20",
      )}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Top Section: Resource & Urgent Badge */}
        <div className="p-5 pb-4 flex justify-between items-start">
          <div
            className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center transition-colors duration-500",
              timeInfo.isUrgent
                ? "bg-red-50 dark:bg-red-950 text-red-500"
                : timeInfo.isOver
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  : "bg-blue-50 dark:bg-blue-900/30 text-blue-600",
            )}
          >
            <Zap
              className={cn("w-5 h-5", !timeInfo.isOver && "fill-current")}
            />
          </div>
          <Badge
            variant="outline"
            className="text-[8px] font-black border-slate-100 dark:border-white/5 uppercase italic px-2.5 py-1 text-slate-400 pr-2"
          >
            {session.resource_name}
          </Badge>
        </div>

        {/* Middle Section: Customer Info */}
        <div className="px-5 pb-5 space-y-3">
          <div className="space-y-1">
            <h3 className="text-base font-black uppercase italic truncate text-slate-900 dark:text-white pr-2 leading-none">
              {session.customer_name}
            </h3>
            <div className="flex items-center gap-2 text-slate-400 font-bold italic text-[9px]">
              <UserIcon className="w-3 h-3" />
              <span className="truncate pr-1">{session.customer_phone}</span>
            </div>
          </div>

          {/* Time Remaining Indicator */}
          <div
            className={cn(
              "flex items-center gap-2 py-2 px-3 rounded-xl border transition-all",
              timeInfo.isUrgent
                ? "bg-red-500/10 border-red-500/20 text-red-500 animate-pulse"
                : timeInfo.isOver
                  ? "bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400"
                  : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500/20 text-emerald-600",
            )}
          >
            <Timer className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase italic tracking-tighter pr-1">
              {timeInfo.remaining}
            </span>
          </div>
        </div>

        {/* Bottom Section: Billing */}
        <div className="mt-auto p-5 pt-4 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center border-t border-slate-50 dark:border-white/5">
          <div className="space-y-0.5">
            <p className="text-[7px] font-black text-slate-400 uppercase leading-none pr-1">
              Live Bill
            </p>
            <p className="text-base font-black text-slate-900 dark:text-blue-400 italic tracking-tighter pr-1">
              Rp{new Intl.NumberFormat("id-ID").format(session.grand_total)}
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center group-hover:bg-blue-600 transition-colors">
            <ChevronRight
              size={14}
              className="text-slate-300 group-hover:text-white"
            />
          </div>
        </div>

        {/* Progress Indikator */}
        <div className="h-1 w-full bg-slate-100 dark:bg-white/5">
          <div
            className={cn(
              "h-full transition-all duration-1000",
              timeInfo.isUrgent ? "bg-red-500" : "bg-blue-500",
            )}
            style={{ width: `${timeInfo.progress}%` }}
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
      toast.error("Gagal sinkronisasi data POS");
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
      toast.error("Gagal memuat detail sesi");
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
    <div className="space-y-8 animate-in fade-in duration-500 font-plus-jakarta pb-20 mt-10">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-slate-100 dark:border-white/5 pb-8 gap-6 px-4">
        <div className="space-y-1">
          <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none dark:text-white pr-4">
            Terminal <span className="text-blue-600">POS</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] italic mt-2 pr-2">
            Monitoring Sesi Aktif & Layanan F&B
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-slate-400 uppercase italic pr-1">
              Total Unit Terpakai
            </span>
            <Badge className="bg-emerald-500 text-white border-none font-black px-6 py-2.5 rounded-2xl italic shadow-xl shadow-emerald-500/20 text-lg pr-3">
              {activeSessions.length}{" "}
              <span className="text-[10px] ml-1.5 opacity-80">AKTIF</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="px-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card
                key={i}
                className="rounded-[2rem] border-none bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-white/5 p-6 space-y-6"
              >
                <div className="flex justify-between">
                  <Skeleton className="h-11 w-11 rounded-2xl dark:bg-slate-800" />
                  <Skeleton className="h-6 w-16 rounded-full dark:bg-slate-800" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4 dark:bg-slate-800" />
                  <Skeleton className="h-3 w-1/2 dark:bg-slate-800" />
                </div>
                <Skeleton className="h-10 w-full rounded-xl dark:bg-slate-800" />
                <Skeleton className="h-12 w-full rounded-2xl dark:bg-slate-800" />
              </Card>
            ))}
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="h-[50vh] flex flex-col items-center justify-center text-center gap-4 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-white/5">
            <div className="w-20 h-20 rounded-[2rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-2">
              <MonitorPlay
                size={40}
                className="text-slate-200 dark:text-slate-700"
              />
            </div>
            <h3 className="text-xl font-black italic uppercase text-slate-400 pr-2">
              Terminal Sedang Kosong
            </h3>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic pr-1">
              Mulai reservasi baru untuk melihat data kasir
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
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
      </div>

      {/* DETAIL SESSION SHEET */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="p-0 border-none bg-transparent sm:max-w-[480px] w-full">
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
