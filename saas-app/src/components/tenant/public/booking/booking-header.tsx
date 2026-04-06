"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ImageIcon, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function BookingHeader({ resource, activeTheme }: any) {
  const router = useRouter();

  return (
    <section className="relative h-[40vh] md:h-[50vh] w-full overflow-hidden bg-slate-200 dark:bg-slate-900 transition-colors duration-500">
      {/* --- BACKGROUND IMAGE LAYER --- */}
      <div className="absolute inset-0 z-0">
        {resource?.image_url ? (
          <img
            src={resource.image_url}
            className="w-full h-full object-cover opacity-100 transition-opacity duration-700"
            alt={resource?.name}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-700">
            <ImageIcon className="h-20 w-20" />
          </div>
        )}

        {/* Adaptive Overlays */}
        {/* 1. Glassmorphism Blur (Sangat halus agar detail unit tetap terlihat) */}
        <div className="absolute inset-0 backdrop-blur-[1px]" />

        {/* 2. Linear Gradient: Terang di bawah untuk Light Mode, Gelap di bawah untuk Dark Mode */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-black/10 dark:from-[#F8FAFC] dark:via-transparent dark:to-black/30 opacity-100 dark:hidden" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-black/20 hidden dark:block" />

        {/* 3. Theme Tint Glow */}
        <div
          className={cn(
            "absolute inset-0 opacity-10 dark:opacity-20",
            activeTheme.gradient,
          )}
        />
      </div>

      {/* --- BACK BUTTON (FLOATING) --- */}
      <div className="absolute top-6 left-6 z-30">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className={cn(
            "rounded-full font-black uppercase text-[10px] tracking-widest px-6 h-10 italic shadow-2xl transition-all border",
            "bg-white/40 dark:bg-black/20 backdrop-blur-xl border-black/5 dark:border-white/10 text-slate-900 dark:text-white hover:bg-white/60 dark:hover:bg-white/10",
          )}
        >
          <ArrowLeft className="mr-2 h-4 w-4 stroke-[3]" /> Kembali
        </Button>
      </div>

      {/* --- BOTTOM CONTENT INFO --- */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-6 md:p-12 space-y-3">
        <div className="flex flex-col items-start gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Category Badge */}
          <Badge
            className={cn(
              "text-white border-none rounded-lg px-4 py-1.5 font-black text-[10px] tracking-[0.2em] uppercase italic shadow-xl",
              activeTheme.bgPrimary,
            )}
          >
            <Sparkles className="h-3 w-3 mr-2 inline fill-current" />
            {resource?.category || "PREMIUM"}
          </Badge>

          {/* Unit Name - High Contrast on both modes */}
          <div className="space-y-2">
            <h1 className="text-4xl md:text-8xl font-[950] italic uppercase tracking-tighter text-slate-900 dark:text-white leading-[0.85] drop-shadow-sm dark:drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
              {resource?.name}
            </h1>

            {/* Description - Adaptive Color */}
            <p className="text-slate-700 dark:text-slate-400 font-bold italic text-sm md:text-xl max-w-2xl leading-relaxed tracking-tight">
              "
              {resource?.description ||
                "High-performance facility for your ultimate experience."}
              "
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
