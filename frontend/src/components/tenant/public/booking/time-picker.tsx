"use client";
import { cn } from "@/lib/utils";
import { Clock, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type BookingTheme = {
  bgPrimary: string;
  glow: string;
};

type TimePickerProps = {
  availableSlots: string[];
  selectedTime: string;
  onSelect: (time: string) => void;
  isTimeBusy: (time: string) => boolean;
  busySlots: unknown[];
  activeTheme: BookingTheme;
};

export function TimePicker({
  availableSlots,
  selectedTime,
  onSelect,
  isTimeBusy,
  busySlots,
  activeTheme,
}: TimePickerProps) {
  return (
    <section className="space-y-5 border-t border-slate-100 pt-8 animate-in fade-in slide-in-from-top-4 duration-500 dark:border-white/5">
      {/* --- HEADER SECTION --- */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg",
              activeTheme.bgPrimary,
            )}
          >
            <Clock className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold uppercase tracking-normal text-slate-900 dark:text-white md:text-xl">
              Jam Mulai
            </h2>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
              Pilih waktu ketersediaan
            </p>
          </div>
        </div>

        {busySlots.length > 0 && (
          <Badge
            variant="outline"
            className="rounded-lg border-red-500/20 bg-red-500/5 px-3 py-1 text-[9px] font-semibold uppercase text-red-500"
          >
            {busySlots.length} Slot Terisi
          </Badge>
        )}
      </div>

      {/* --- TIME GRID --- */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 shadow-inner dark:border-white/5 dark:bg-white/[0.02] sm:grid-cols-4 md:grid-cols-6">
        {availableSlots.map((time: string) => {
          const isBusy = isTimeBusy(time);
          const isSelected = selectedTime === time;

          return (
            <button
              key={time}
              disabled={isBusy}
              onClick={() => onSelect(time)}
              className={cn(
                "relative flex h-12 items-center justify-center overflow-hidden rounded-xl border text-[14px] font-semibold transition-all",
                // State: Selected
                isSelected
                    ? `${activeTheme.bgPrimary} z-10 scale-[1.02] border-current text-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] ${activeTheme.glow}`
                  : // State: Busy/Full
                    isBusy
                    ? "bg-slate-100 dark:bg-white/5 border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed grayscale"
                    : // State: Available
                      "border-white bg-white text-slate-900 shadow-sm active:scale-95 dark:border-white/5 dark:bg-[#111] dark:text-slate-100 dark:hover:border-blue-400",
              )}
            >
              {/* Teks Jam */}
              <span>{time}</span>

              {/* Label Status Busy */}
              {isBusy && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100/40 dark:bg-black/40 backdrop-blur-[1px]">
                    <span className="text-[8px] font-semibold uppercase text-slate-400 dark:text-slate-600">
                    N/A
                  </span>
                </div>
              )}

              {/* Indicator Dot for Selection */}
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* --- FOOTER INFO (Mobile Only) --- */}
      <div className="flex items-center gap-2 rounded-2xl border border-blue-500/10 bg-blue-500/5 px-4 py-3 dark:border-blue-400/10 dark:bg-blue-400/5">
        <Info className="h-3.5 w-3.5 text-blue-500" />
        <p className="text-[10px] font-medium text-blue-600/80 dark:text-blue-400/80">
          Waktu yang tertera adalah zona waktu lokal (WIB).
        </p>
      </div>
    </section>
  );
}
