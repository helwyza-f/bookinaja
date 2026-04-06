"use client";
import { cn } from "@/lib/utils";
import { Clock, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function TimePicker({
  availableSlots,
  selectedTime,
  onSelect,
  isTimeBusy,
  busySlots,
  activeTheme,
}: any) {
  return (
    <section className="space-y-6 pt-10 border-t border-slate-100 dark:border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* --- HEADER SECTION --- */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "h-10 w-10 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform hover:rotate-6",
              activeTheme.bgPrimary,
            )}
          >
            <Clock className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
              Jam Mulai
            </h2>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 italic">
              Pilih waktu ketersediaan
            </p>
          </div>
        </div>

        {busySlots.length > 0 && (
          <Badge
            variant="outline"
            className="font-black italic text-[9px] border-red-500/20 bg-red-500/5 text-red-500 uppercase px-3 py-1 rounded-lg"
          >
            {busySlots.length} Slot Terisi
          </Badge>
        )}
      </div>

      {/* --- TIME GRID --- */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 p-4 bg-slate-50/50 dark:bg-white/[0.02] rounded-[2.5rem] shadow-inner border border-slate-100 dark:border-white/5">
        {availableSlots.map((time: string) => {
          const isBusy = isTimeBusy(time);
          const isSelected = selectedTime === time;

          return (
            <button
              key={time}
              disabled={isBusy}
              onClick={() => onSelect(time)}
              className={cn(
                "h-14 rounded-2xl border-4 font-black transition-all text-[14px] uppercase italic relative flex items-center justify-center overflow-hidden",
                // State: Selected
                isSelected
                  ? `${activeTheme.bgPrimary} border-current text-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] scale-105 z-10 ${activeTheme.glow}`
                  : // State: Busy/Full
                    isBusy
                    ? "bg-slate-100 dark:bg-white/5 border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed grayscale"
                    : // State: Available
                      "bg-white dark:bg-[#111] border-white dark:border-white/5 text-slate-900 dark:text-slate-100 hover:border-blue-500 dark:hover:border-blue-400 shadow-sm active:scale-95",
              )}
            >
              {/* Teks Jam */}
              <span className={cn(isSelected ? "animate-pulse" : "")}>
                {time}
              </span>

              {/* Label Status Busy */}
              {isBusy && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100/40 dark:bg-black/40 backdrop-blur-[1px]">
                  <span className="text-[7px] font-[900] uppercase tracking-tighter text-slate-400 dark:text-slate-600">
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
      <div className="flex items-center gap-2 px-4 py-3 bg-blue-500/5 dark:bg-blue-400/5 border border-blue-500/10 dark:border-blue-400/10 rounded-2xl">
        <Info className="h-3.5 w-3.5 text-blue-500" />
        <p className="text-[9px] font-bold uppercase tracking-wider text-blue-600/80 dark:text-blue-400/80">
          Waktu yang tertera adalah zona waktu lokal (WIB).
        </p>
      </div>
    </section>
  );
}
