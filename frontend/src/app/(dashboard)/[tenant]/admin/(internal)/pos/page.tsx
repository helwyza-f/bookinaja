"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  MonitorPlay,
  ChevronRight,
  User as UserIcon,
  Search,
  RefreshCw,
  Timer,
  Wallet,
  AlertTriangle,
  PanelRightOpen,
  ChevronLeft,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  POSControlHub,
  type POSSessionDetail,
} from "@/components/pos/pos-control-hub";
import type { FnBMenuItem } from "@/components/pos/fnb-catalog-dialog";
import { format, differenceInMinutes } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

type POSSession = {
  id: string;
  resource_name?: string;
  customer_name?: string;
  start_time: string;
  end_time: string;
  grand_total?: number;
};

function POSControlSkeleton() {
  return (
    <div className="w-full h-full bg-white dark:bg-slate-950 flex flex-col overflow-hidden font-plus-jakarta animate-in fade-in duration-300">
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

function SessionCard({
  session,
  onClick,
  isActiveParam,
}: {
  session: POSSession;
  onClick: () => void;
  isActiveParam: boolean;
}) {
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
    const safeTotal = Math.max(totalDuration, 1);
    const progress = Math.min(100, Math.max(0, (elapsed / safeTotal) * 100));

    return {
      minutesRemaining: remaining,
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
    <button
      onClick={onClick}
      className={cn(
        "group w-full overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md active:translate-y-0 dark:border-white/10 dark:bg-slate-950",
        isActiveParam &&
          "border-blue-500 ring-2 ring-blue-500/20 shadow-blue-500/10",
        timeInfo.isUrgent && "border-amber-300 ring-2 ring-amber-200/70",
        timeInfo.isOver && "border-red-200 bg-red-50/40 dark:border-red-900/60",
      )}
    >
      <div className="h-1 bg-slate-100 dark:bg-white/5">
        <div
          className={cn(
            "h-full transition-all duration-700",
            timeInfo.isOver
              ? "bg-red-500"
              : timeInfo.isUrgent
                ? "bg-amber-500"
                : "bg-blue-600",
          )}
          style={{ width: `${timeInfo.progress}%` }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  timeInfo.isOver
                    ? "bg-red-500"
                    : timeInfo.isUrgent
                      ? "bg-amber-500"
                      : "bg-emerald-500",
                )}
              />
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                {session.resource_name || "Unit"}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <UserIcon className="h-4 w-4 shrink-0" />
              <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                {session.customer_name || "Customer"}
              </h3>
            </div>
          </div>

          <Badge
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              timeInfo.isOver
                ? "border-red-200 bg-red-50 text-red-700"
                : timeInfo.isUrgent
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
            )}
          >
            {timeInfo.isOver
              ? "Overtime"
              : timeInfo.isUrgent
                ? "Segera habis"
                : "Aktif"}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
            <p className="text-[11px] font-medium text-slate-500">Waktu</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              {format(new Date(session.start_time), "HH:mm")} -{" "}
              {format(new Date(session.end_time), "HH:mm")}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
            <p className="text-[11px] font-medium text-slate-500">Sisa</p>
            <p
              className={cn(
                "mt-1 flex items-center gap-1 text-xs font-semibold",
                timeInfo.isOver
                  ? "text-red-600"
                  : timeInfo.isUrgent
                    ? "text-amber-600"
                    : "text-emerald-600",
              )}
            >
              <Timer className="h-3.5 w-3.5" />
              {timeInfo.remaining}
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 px-3 py-2 dark:bg-blue-950/30">
            <p className="text-[11px] font-medium text-blue-500">Bill</p>
            <p className="mt-1 truncate text-xs font-semibold text-blue-700 dark:text-blue-300">
              Rp
              {new Intl.NumberFormat("id-ID").format(session.grand_total || 0)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/10">
          <span className="text-xs font-medium text-slate-500">
            Buka kontrol sesi
          </span>
          <ChevronRight
            size={16}
            className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-600"
          />
        </div>
      </div>
    </button>
  );
}

export default function POSPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeId = searchParams.get("active");

  const [activeSessions, setActiveSessions] = useState<POSSession[]>([]);
  const [menuItems, setMenuItems] = useState<FnBMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] =
    useState<POSSessionDetail | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDesktop, setIsDesktop] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [sessionsRes, menuRes] = await Promise.all([
        api.get("/bookings/pos/active"),
        api.get("/fnb"),
      ]);
      setActiveSessions(sessionsRes.data || []);
      setMenuItems(menuRes.data || []);
    } catch {
      toast.error("Gagal sinkronisasi terminal");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const syncViewport = () => {
      setIsDesktop(query.matches);
    };

    syncViewport();
    query.addEventListener("change", syncViewport);
    return () => query.removeEventListener("change", syncViewport);
  }, []);

  const openSessionDetail = useCallback(async (id: string) => {
    setSelectedSessionId(id);
    setSelectedSession(null);
    setIsSheetLoading(true);
    try {
      const res = await api.get(`/bookings/${id}`);
      setSelectedSession(res.data);
    } catch {
      toast.error("Detail gagal dimuat");
      setSelectedSessionId(null);
    } finally {
      setIsSheetLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeId && activeSessions.length > 0 && !selectedSessionId) {
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
    selectedSessionId,
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

  const sessionSummary = useMemo(() => {
    const now = new Date();
    return activeSessions.reduce(
      (acc, session) => {
        const remaining = differenceInMinutes(new Date(session.end_time), now);
        acc.revenue += Number(session.grand_total || 0);
        if (remaining <= 0) acc.overtime += 1;
        else if (remaining <= 10) acc.urgent += 1;
        return acc;
      },
      { revenue: 0, urgent: 0, overtime: 0 },
    );
  }, [activeSessions]);

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = [...activeSessions].sort(
      (a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime(),
    );
    if (!query) return sorted;
    return sorted.filter((session) =>
      [session.customer_name, session.resource_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [activeSessions, searchQuery]);

  const closeMobileDetail = () => {
    setSelectedSession(null);
    setSelectedSessionId(null);
  };

  if (!isDesktop && selectedSessionId) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white font-plus-jakarta dark:bg-slate-950">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 dark:border-white/10 dark:bg-slate-950">
          <Button
            variant="ghost"
            size="icon"
            onClick={closeMobileDetail}
            className="h-10 w-10 rounded-xl"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              POS Control
            </p>
            <h1 className="truncate text-sm font-semibold text-slate-950 dark:text-white">
              {selectedSession?.customer_name || "Memuat sesi..."}
            </h1>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {isSheetLoading ? (
            <POSControlSkeleton />
          ) : selectedSession ? (
            <POSControlHub
              session={selectedSession}
              menuItems={menuItems}
              onRefresh={refreshSelectedSession}
            />
          ) : (
            <POSControlSkeleton />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-360 space-y-4 pb-20 pt-5 px-3 font-plus-jakarta animate-in fade-in duration-300">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between md:p-5 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
              <MonitorPlay className="h-4 w-4" />
              POS Admin
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl dark:text-white">
              Sesi Aktif
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Pantau unit yang sedang berjalan, sisa durasi, dan tagihan sebelum
              checkout.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold dark:border-white/10 dark:bg-slate-950"
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 border-b border-slate-100 md:grid-cols-4 dark:border-white/10">
          <div className="border-r border-slate-100 p-4 dark:border-white/10">
            <p className="text-xs font-medium text-slate-500">Sesi berjalan</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
              {activeSessions.length}
            </p>
          </div>
          <div className="border-r border-slate-100 p-4 dark:border-white/10">
            <p className="text-xs font-medium text-slate-500">
              Perlu perhatian
            </p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold text-amber-600">
              {sessionSummary.urgent}
              <AlertTriangle className="h-4 w-4" />
            </p>
          </div>
          <div className="border-r border-slate-100 p-4 dark:border-white/10">
            <p className="text-xs font-medium text-slate-500">Overtime</p>
            <p className="mt-1 text-2xl font-semibold text-red-600">
              {sessionSummary.overtime}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500">Tagihan aktif</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold text-blue-700 dark:text-blue-300">
              <Wallet className="h-4 w-4" />
              Rp{new Intl.NumberFormat("id-ID").format(sessionSummary.revenue)}
            </p>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari customer atau unit..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {[...Array(9)].map((_, i) => (
                <Card
                  key={i}
                  className="h-44 overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950"
                >
                  <Skeleton className="h-1 w-full" />
                  <div className="space-y-4 p-4">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-6 w-1/2" />
                    <div className="grid grid-cols-3 gap-2">
                      <Skeleton className="h-14 rounded-xl" />
                      <Skeleton className="h-14 rounded-xl" />
                      <Skeleton className="h-14 rounded-xl" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white text-center shadow-sm dark:border-white/10 dark:bg-slate-950">
              <MonitorPlay size={38} className="text-slate-300" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
                Belum ada sesi aktif
              </h3>
              <p className="max-w-sm text-sm text-slate-500">
                Sesi yang sudah diaktifkan dari booking akan tampil di monitor POS.
              </p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white text-center shadow-sm dark:border-white/10 dark:bg-slate-950">
              <Search size={34} className="text-slate-300" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
                Sesi tidak ditemukan
              </h3>
              <p className="text-sm text-slate-500">
                Coba cari dengan nama customer atau unit lain.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 animate-in slide-in-from-bottom-2 duration-300 md:grid-cols-2 2xl:grid-cols-3">
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isActiveParam={selectedSessionId === session.id}
                  onClick={() => openSessionDetail(session.id)}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="sticky top-20 hidden h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block dark:border-white/10 dark:bg-slate-950">
          {isSheetLoading ? (
            <POSControlSkeleton />
          ) : selectedSession ? (
            <POSControlHub
              session={selectedSession}
              menuItems={menuItems}
              onRefresh={refreshSelectedSession}
              onClose={() => {
                setSelectedSession(null);
                setSelectedSessionId(null);
              }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30">
                <PanelRightOpen className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Pilih sesi untuk kontrol
              </h2>
              <p className="max-w-xs text-sm text-slate-500">
                Detail billing, F&B, add-ons, extend, dan checkout akan tampil di panel ini.
              </p>
            </div>
          )}
        </aside>
      </div>

    </div>
  );
}
