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
import { format, parse, addMinutes, isBefore } from "date-fns";
import {
  Clock,
  X,
  CalendarCheck2,
  LayoutGrid,
  TimerReset,
  CheckCircle2,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

interface ExtendSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any;
  onExtend: (count: number) => Promise<void>;
}

export function ExtendSessionDialog({
  open,
  onOpenChange,
  session,
  onExtend,
}: ExtendSessionDialogProps) {
  const [busySlots, setBusySlots] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState<{
    count: number;
    time: string;
  } | null>(null);

  const utcToLocalTime = (utcTimeStr: string) => {
    if (!utcTimeStr) return "";
    const [hours, minutes] = utcTimeStr.split(":").map(Number);
    const date = new Date();
    date.setUTCHours(hours, minutes, 0, 0);
    return format(date, "HH:mm");
  };

  useEffect(() => {
    if (open && session) {
      setLoadingSchedule(true);
      const dateParam = format(new Date(session.start_time), "yyyy-MM-dd");

      api
        .get(`/guest/availability/${session.resource_id}?date=${dateParam}`)
        .then((res) => {
          const localBusySlots = (res.data.busy_slots || []).map(
            (slot: any) => ({
              ...slot,
              start_local: utcToLocalTime(slot.start_time),
              end_local: utcToLocalTime(slot.end_time),
            }),
          );
          setBusySlots(localBusySlots);
        })
        .catch(() => setBusySlots([]))
        .finally(() => setLoadingSchedule(false));

      setSelectedExtension(null);
    }
  }, [open, session]);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  // --- LOGIC TIME TABLE (Exclusive End Check) ---
  const timeSlots = useMemo(() => {
    if (!session) return [];
    const slots = [];
    const startHour = parse("09:00", "HH:mm", new Date());
    const endHour = parse("23:30", "HH:mm", new Date());
    const interval = session.unit_duration || 30;
    let current = startHour;

    while (isBefore(current, addMinutes(endHour, 1))) {
      const timeStr = format(current, "HH:mm");

      // Logic: Jam BUSY jika (Waktu Grid >= Jam Mulai) DAN (Waktu Grid < Jam Selesai)
      // Contoh: Booking 14:00 - 15:00.
      // Jam 14:00 -> BUSY.
      // Jam 15:00 -> FREE.
      const busySlot = busySlots.find(
        (s) => timeStr >= s.start_local && timeStr < s.end_local,
      );

      slots.push({
        time: timeStr,
        status: busySlot
          ? session && session.id === busySlot.id
            ? "current"
            : "full"
          : "available",
      });
      current = addMinutes(current, interval);
    }
    return slots;
  }, [busySlots, session]);

  // --- LOGIC EXTENSION OPTIONS (Dynamic Boundary) ---
  const extensionOptions = useMemo(() => {
    if (!session) return [];
    const options = [];
    const currentEndTimeDate = new Date(session.end_time);
    const currentEndTimeStr = format(currentEndTimeDate, "HH:mm");
    const unitDuration = session.unit_duration || 60;

    // Cari booking orang lain terdekat yang dimulai SETELAH sesi ini berakhir
    const nextBusyBooking = busySlots
      .filter((s) => s.id !== session.id && s.start_local >= currentEndTimeStr)
      .sort((a, b) => a.start_local.localeCompare(b.start_local))[0];

    const limitTimeStr = nextBusyBooking
      ? nextBusyBooking.start_local
      : "23:59";

    for (let i = 1; i <= 4; i++) {
      const extensionMinutes = unitDuration * i;
      const potentialEndDate = addMinutes(currentEndTimeDate, extensionMinutes);
      const potentialEndTimeStr = format(potentialEndDate, "HH:mm");

      // Perpanjangan BLOCKED jika jam selesai baru MELEWATI jam mulai orang lain
      const isBlocked = potentialEndTimeStr > limitTimeStr;

      options.push({
        count: i,
        time: potentialEndTimeStr,
        busy: isBlocked,
      });
    }
    return options;
  }, [session, busySlots]);

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
      <DialogContent className="max-w-[98vw] lg:max-w-[94vw] h-[94vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-3xl bg-white flex flex-col">
        <VisuallyHidden.Root>
          <DialogHeader>
            <DialogTitle>Extend Session</DialogTitle>
          </DialogHeader>
        </VisuallyHidden.Root>

        {/* --- HEADER --- */}
        <div className="p-5 lg:p-6 bg-slate-950 text-white shrink-0 flex items-center justify-between relative border-b border-white/5">
          <div className="flex items-center gap-5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <TimerReset className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter leading-none">
                Extend <span className="text-blue-500">Scheduler</span>
              </h2>
              <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500 uppercase mt-1">
                <span>
                  User:{" "}
                  <span className="text-white">{session?.customer_name}</span>
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-800" />
                <span>
                  Unit:{" "}
                  <span className="text-blue-400">
                    {session?.resource_name}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[7px] font-black text-slate-500 uppercase italic mb-0.5">
                End Schedule
              </p>
              <p className="text-xl font-black italic text-emerald-400 leading-none">
                {session && format(new Date(session.end_time), "HH:mm")}
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-lg text-slate-500 hover:text-white hover:bg-white/10 h-10 w-10 p-0 transition-all"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* --- BODY --- */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50/50">
          <div className="flex-1 p-6 lg:p-8 overflow-hidden flex flex-col bg-white">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <div className="flex items-center gap-3">
                <CalendarCheck2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-[10px] font-black italic uppercase tracking-widest text-slate-950">
                  Resource Availability
                </h3>
              </div>
              <Badge
                variant="outline"
                className="text-[7px] font-black uppercase border-slate-200 text-slate-400 italic"
              >
                Grid: {session?.unit_duration || 30}m
              </Badge>
            </div>

            <ScrollArea className="flex-1 pr-4">
              {loadingSchedule ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-300 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <p className="font-black italic uppercase text-[8px] tracking-widest text-slate-400">
                    Scanning schedule...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 pb-12">
                  {timeSlots.map((slot) => (
                    <div
                      key={slot.time}
                      className={cn(
                        "p-3 rounded-2xl text-center border-2 transition-all flex flex-col gap-0.5",
                        slot.status === "available" &&
                          "bg-white border-slate-50 shadow-sm",
                        slot.status === "full" &&
                          "bg-red-50/50 border-transparent opacity-40",
                        slot.status === "current" &&
                          "bg-blue-50 border-blue-200 shadow-inner",
                      )}
                    >
                      <p
                        className={cn(
                          "text-xs font-black italic tracking-tighter",
                          slot.status === "full"
                            ? "text-red-400"
                            : "text-slate-900",
                        )}
                      >
                        {slot.time}
                      </p>
                      <p
                        className={cn(
                          "text-[6px] font-black uppercase",
                          slot.status === "available"
                            ? "text-slate-300"
                            : slot.status === "full"
                              ? "text-red-500"
                              : "text-blue-600",
                        )}
                      >
                        {slot.status === "available"
                          ? "Free"
                          : slot.status === "full"
                            ? "Busy"
                            : "Active"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* RIGHT PANEL: Confirmation & Calculation */}
          <div className="w-full md:w-[380px] bg-slate-100/50 border-l border-slate-200 flex flex-col overflow-hidden">
            <div className="p-6 lg:p-8 space-y-8 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-blue-600" />
                  <h3 className="text-[10px] font-black italic uppercase tracking-widest text-slate-950">
                    Add Session
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
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
                        "p-5 rounded-2xl border-4 transition-all flex flex-col items-center justify-center group relative",
                        selectedExtension?.count === opt.count
                          ? "bg-white border-blue-600 shadow-lg scale-[1.03] z-10"
                          : opt.busy
                            ? "bg-slate-200/50 border-transparent opacity-30 cursor-not-allowed"
                            : "bg-white border-white hover:border-blue-100 shadow-sm",
                      )}
                    >
                      <span
                        className={cn(
                          "text-2xl font-black italic tracking-tighter leading-none mb-1",
                          selectedExtension?.count === opt.count
                            ? "text-blue-600"
                            : "text-slate-900",
                        )}
                      >
                        +{opt.count}
                      </span>
                      <span className="text-[7px] font-black uppercase text-slate-400 group-hover:text-slate-900">
                        Session
                      </span>
                      {opt.busy && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/10 rounded-xl">
                          <Badge className="bg-red-500 text-[6px] p-0.5 px-1 uppercase font-black">
                            FULL
                          </Badge>
                        </div>
                      )}
                      {selectedExtension?.count === opt.count && (
                        <CheckCircle2 className="absolute -top-1.5 -right-1.5 w-4 h-4 text-blue-600 fill-white stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {selectedExtension && (
                <div className="p-6 rounded-[2rem] bg-slate-900 text-white space-y-5 animate-in slide-in-from-bottom-4 shadow-2xl">
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-black text-blue-400 uppercase italic">
                      Confirmation
                    </p>
                    <h4 className="text-lg font-black italic uppercase leading-tight">
                      New End Time
                    </h4>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase italic opacity-60">
                      <span>Rencana Selesai</span>
                      <span className="text-emerald-400 text-xs">
                        {selectedExtension.time} WIB
                      </span>
                    </div>
                    <div className="pt-2.5 border-t border-white/10 flex justify-between items-center">
                      <span className="text-[9px] font-black text-blue-400 uppercase italic">
                        Extra Bill
                      </span>
                      <span className="text-lg font-black italic">
                        Rp
                        {formatIDR(
                          (session?.unit_price || 0) * selectedExtension.count,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-white rounded-2xl border border-slate-200 flex gap-3 items-start shadow-sm">
                <AlertTriangle className="text-amber-500 w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[8px] font-bold text-slate-400 uppercase italic leading-relaxed">
                  Durasi dibatasi otomatis oleh jadwal customer berikutnya. Jam
                  selesai sesi dianggap free untuk booking baru.
                </p>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-200 shrink-0">
              <Button
                disabled={!selectedExtension || isSubmitting}
                onClick={handleConfirmExtend}
                className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic text-xs shadow-xl gap-3 border-b-8 border-blue-800 active:border-b-0 active:translate-y-1 transition-all"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    CONFIRM EXTENSION <ChevronRight className="w-4 h-4" />
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
