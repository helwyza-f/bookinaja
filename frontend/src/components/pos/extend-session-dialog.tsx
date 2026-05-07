"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  format,
  addMinutes,
  isBefore,
  isSameDay,
} from "date-fns";
import {
  X,
  CalendarCheck2,
  LayoutGrid,
  TimerReset,
  CheckCircle2,
  ChevronRight,
  Loader2,
  AlertTriangle,
  History,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

interface ExtendSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ExtendSession;
  onExtend: (count: number) => Promise<void>;
}

type BusySlotResponse = {
  id: string;
  start_time: string;
  end_time: string;
};

type BusySlot = BusySlotResponse & {
  start_date: Date;
  end_date: Date;
  start_local: string;
  end_local: string;
};

export type ExtendSession = {
  id: string;
  resource_id: string;
  resource_name?: string;
  customer_name?: string;
  start_time: string;
  end_time: string;
  timezone?: string;
  unit_duration?: number;
  unit_price?: number;
  price_unit?: string;
};

export function ExtendSessionDialog({
  open,
  onOpenChange,
  session,
  onExtend,
}: ExtendSessionDialogProps) {
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(new Date());
  const [selectedExtension, setSelectedExtension] = useState<{
    count: number;
    time: string;
  } | null>(null);
  const tenantTimezone = session?.timezone || "Asia/Jakarta";
  const tenantNow = useMemo(
    () => getTenantNow(now, tenantTimezone),
    [now, tenantTimezone],
  );
  const sessionStartDate = useMemo(
    () =>
      session
        ? normalizeCalendarDate(
            toTenantWallClock(new Date(session.start_time), tenantTimezone),
          )
        : null,
    [session, tenantTimezone],
  );
  const sessionEndDate = useMemo(
    () =>
      session
        ? toTenantWallClock(new Date(session.end_time), tenantTimezone)
        : null,
    [session, tenantTimezone],
  );

  useEffect(() => {
    if (!open) return undefined;
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [open]);

  // Busy slot API sudah dikirim dalam jam lokal tenant, jadi cukup ditempel ke calendar date tenant.
  const getTenantTimeDate = (timeValue: string, baseDate: Date) => {
    const [hours, minutes] = timeValue.split(":").map(Number);
    const d = new Date(baseDate);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  useEffect(() => {
    if (open && session && sessionStartDate) {
      setLoadingSchedule(true);
      const dateParam = format(sessionStartDate, "yyyy-MM-dd");

      api
        .get(`/guest/availability/${session.resource_id}?date=${dateParam}`)
        .then((res) => {
          const mappedSlots = (res.data.busy_slots || []).map((slot: BusySlotResponse) => {
            const startDate = getTenantTimeDate(slot.start_time, sessionStartDate);
            const endDate = getTenantTimeDate(slot.end_time, sessionStartDate);
            return {
              ...slot,
              start_date: startDate,
              end_date: endDate,
              start_local: format(startDate, "HH:mm"),
              end_local: format(endDate, "HH:mm"),
            };
          });
          setBusySlots(mappedSlots);
        })
        .catch(() => setBusySlots([]))
        .finally(() => setLoadingSchedule(false));

      setSelectedExtension(null);
    }
  }, [open, session, sessionStartDate]);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  // --- LOGIC: TIME TABLE GRID ---
  const timeSlots = useMemo(() => {
    if (!session || !sessionStartDate) return [];
    const slots = [];
    let current = new Date(sessionStartDate);
    current.setHours(9, 0, 0, 0);

    const endLimit = new Date(sessionStartDate);
    endLimit.setHours(23, 30, 0, 0);

    const interval = session.unit_duration || 30;

    while (isBefore(current, addMinutes(endLimit, 1))) {
      const timeStr = format(current, "HH:mm");
      const isPassed = isSameDay(current, tenantNow) && isBefore(current, tenantNow);

      // Cek tabrakan menggunakan perbandingan waktu murni (Date Object)
      const busySlot = busySlots.find(
        (s) => current >= s.start_date && current < s.end_date,
      );

      slots.push({
        time: timeStr,
        isPassed,
        status: busySlot
          ? busySlot.id === session.id
            ? "current"
            : "full"
          : "available",
      });
      current = addMinutes(current, interval);
    }
    return slots;
  }, [busySlots, session, sessionStartDate, tenantNow]);

  // --- LOGIC: DYNAMIC EXTENSION OPTIONS (Fix Collision) ---
  const extensionOptions = useMemo(() => {
    if (!session || !sessionEndDate) return [];
    const options = [];
    const currentEndTimeDate = new Date(sessionEndDate);
    const unitDuration = session.unit_duration || 60;

    // Cari bokingan orang lain yang mulainya SETELAH sesi kita berakhir
    const futureBookings = busySlots
      .filter((s) => s.id !== session.id && s.start_date >= currentEndTimeDate)
      .sort((a, b) => a.start_date.getTime() - b.start_date.getTime());

    // Boundary adalah waktu mulai bokingan berikutnya, atau akhir hari (23:59)
    const limitDate =
      futureBookings.length > 0
        ? futureBookings[0].start_date
        : new Date(
            new Date(sessionEndDate).setHours(23, 59, 59, 999),
          );

    for (let i = 1; i <= 4; i++) {
      const extensionMinutes = unitDuration * i;
      const potentialEndDate = addMinutes(currentEndTimeDate, extensionMinutes);

      // FIX: Bandingkan Date object (getTime), bukan string
      const isBlocked = potentialEndDate.getTime() > limitDate.getTime();

      options.push({
        count: i,
        time: format(potentialEndDate, "HH:mm"),
        busy: isBlocked,
      });
    }
    return options;
  }, [session, busySlots, sessionEndDate]);

  const handleConfirmExtend = async () => {
    if (!selectedExtension) return;
    setIsSubmitting(true);
    try {
      await onExtend(selectedExtension.count);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-w-[96vw] flex-col overflow-hidden rounded-3xl border bg-slate-50 p-0 shadow-2xl lg:h-[94vh] lg:max-w-[94vw] dark:bg-slate-950 font-plus-jakarta">
        <VisuallyHidden.Root>
          <DialogHeader>
            <DialogTitle>Extend Session</DialogTitle>
          </DialogHeader>
        </VisuallyHidden.Root>

        <div className="z-20 flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-950 p-4 text-white lg:p-6">
          <div className="flex min-w-0 items-center gap-3 lg:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600">
              <TimerReset className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate pr-2 text-lg font-semibold leading-tight lg:text-xl">
                Extend Scheduler
              </h2>
              <p className="mt-1 truncate pr-2 text-xs font-medium text-slate-400">
                Unit:{" "}
                <span className="text-blue-400">{session?.resource_name}</span>{" "}
                | {session?.customer_name}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 lg:gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[7px] font-black text-slate-500 uppercase italic mb-0.5 pr-1">
                Current End
              </p>
              <p className="text-xl font-black italic text-emerald-400 leading-none pr-1">
                {sessionEndDate && format(sessionEndDate, "HH:mm")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-slate-500 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b bg-white md:border-b-0 md:border-r dark:border-white/10 dark:bg-slate-900">
            <div className="flex shrink-0 items-center justify-between border-b p-4 md:p-6 dark:border-white/10">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="w-4 h-4 text-blue-600" />
                <h3 className="pr-1 text-xs font-semibold text-slate-950 dark:text-white">
                  Resource Activity Map
                </h3>
              </div>
              <Badge
                variant="secondary"
                className="text-[7px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-400 pr-1"
              >
                Grid Interval: {session?.unit_duration || 30}m
              </Badge>
            </div>

            <ScrollArea className="flex-1 p-4 md:p-6">
              {loadingSchedule ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-300 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <p className="font-black italic uppercase text-[8px] tracking-widest pr-2">
                    Scanning Availability...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 pb-6 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                  {timeSlots.map((slot) => (
                    <div
                      key={slot.time}
                      className={cn(
                        "flex flex-col items-center justify-center gap-0.5 rounded-xl border p-3 text-center transition-all md:rounded-2xl",
                        slot.status === "available" &&
                          "bg-white dark:bg-slate-800 border-slate-50 dark:border-white/5 shadow-sm",
                        slot.status === "full" &&
                          "bg-red-50/30 dark:bg-red-950/10 border-transparent opacity-40",
                        slot.status === "current" &&
                          "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30 shadow-inner",
                        slot.isPassed && "grayscale opacity-30",
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-black italic tracking-tighter pr-0.5",
                          slot.status === "full"
                            ? "text-red-400"
                            : "dark:text-white",
                        )}
                      >
                        {slot.time}
                      </span>
                      {slot.isPassed ? (
                        <History size={10} className="text-slate-400" />
                      ) : slot.status === "full" ? (
                        <Lock size={10} className="text-red-400" />
                      ) : (
                        <span
                          className={cn(
                            "text-[6px] font-black uppercase pr-1",
                            slot.status === "available"
                              ? "text-slate-300 dark:text-slate-600"
                              : "text-blue-600",
                          )}
                        >
                          {slot.status === "available" ? "Free" : "Active"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="relative flex max-h-[44vh] w-full flex-col overflow-hidden bg-slate-100 md:max-h-none md:w-[400px] dark:bg-slate-950">
            <div className="flex-1 space-y-5 overflow-y-auto p-4 scrollbar-hide md:space-y-8 md:p-8">
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-blue-600" />
                  <h3 className="pr-2 text-xs font-semibold text-slate-950 dark:text-white">
                    Extension Options
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {extensionOptions.map((opt) => (
                    <button
                      key={opt.count}
                      disabled={opt.busy}
                      onClick={() =>
                        setSelectedExtension({
                          count: opt.count,
                          time: opt.time,
                        })
                      }
                      className={cn(
                        "group relative flex flex-col items-center justify-center rounded-2xl border p-5 transition-all md:p-6",
                        selectedExtension?.count === opt.count
                          ? "bg-white dark:bg-slate-800 border-blue-600 shadow-xl scale-[1.03] z-10"
                          : opt.busy
                            ? "bg-slate-200/50 dark:bg-slate-900 border-transparent opacity-30 cursor-not-allowed"
                            : "bg-white dark:bg-slate-800 border-transparent hover:border-blue-100 dark:hover:border-blue-900 shadow-sm",
                      )}
                    >
                      <span
                        className={cn(
                          "mb-1 pr-1 text-2xl font-semibold leading-none md:text-3xl",
                          selectedExtension?.count === opt.count
                            ? "text-blue-600"
                            : "dark:text-white",
                        )}
                      >
                        +{opt.count}
                      </span>
                      <span className="text-[8px] font-black uppercase text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-300">
                        {session?.price_unit === "hour" ? "Hour" : "Session"}
                      </span>
                      {opt.busy && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/5 dark:bg-slate-900/5 rounded-[2rem]">
                          <Badge className="bg-red-500 text-[7px] p-0.5 px-2 uppercase font-black border-none">
                            CONFLICT
                          </Badge>
                        </div>
                      )}
                      {selectedExtension?.count === opt.count && (
                        <CheckCircle2 className="absolute -top-2 -right-2 w-5 h-5 text-blue-600 fill-white dark:fill-slate-900 stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {selectedExtension && (
                <div className="p-6 rounded-[2.5rem] bg-slate-900 dark:bg-blue-600 text-white space-y-6 animate-in slide-in-from-bottom-4 shadow-2xl overflow-hidden relative">
                  <div className="relative z-10">
                    <p className="text-[8px] font-black uppercase italic opacity-60 mb-1 pr-1">
                      Planning Update
                    </p>
                    <h4 className="text-xl font-black italic uppercase tracking-tighter leading-none">
                      New Summary
                    </h4>
                  </div>
                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase italic border-b border-white/10 pb-3">
                      <span className="opacity-60">Selesai Baru</span>
                      <span className="text-emerald-300 text-base font-black tracking-tight">
                        {selectedExtension.time} WIB
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase italic opacity-60 pr-1">
                        Total Biaya Tambahan
                      </span>
                      <span className="text-xl font-black italic pr-1">
                        Rp{" "}
                        {formatIDR(
                          (session?.unit_price || 0) * selectedExtension.count,
                        )}
                      </span>
                    </div>
                  </div>
                  <TimerReset className="absolute -right-6 -bottom-6 w-32 h-32 opacity-10 -rotate-12" />
                </div>
              )}

              <div className="flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm md:gap-4 md:p-5 dark:border-white/10 dark:bg-slate-900">
                <AlertTriangle className="text-amber-500 w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase italic leading-relaxed pr-2">
                  Sistem otomatis memblokir opsi perpanjangan jika menabrak
                  jadwal pelanggan berikutnya.
                </p>
              </div>
            </div>

            <div className="z-20 mt-auto shrink-0 border-t bg-white p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] md:p-8 dark:border-white/10 dark:bg-slate-900">
              <Button
                disabled={!selectedExtension || isSubmitting}
                onClick={handleConfirmExtend}
                className="h-12 w-full rounded-xl bg-blue-600 pr-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-500 md:h-16 md:rounded-2xl"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <>
                    Apply Extension{" "}
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform stroke-[4]" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function normalizeCalendarDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function getTimeZoneParts(date: Date, timezone = "Asia/Jakarta") {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || "0");

  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
    second: pick("second"),
  };
}

function getTenantNow(date: Date, timezone = "Asia/Jakarta") {
  const parts = getTimeZoneParts(date, timezone);
  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0,
  );
}

function toTenantWallClock(date: Date, timezone = "Asia/Jakarta") {
  return getTenantNow(date, timezone);
}
