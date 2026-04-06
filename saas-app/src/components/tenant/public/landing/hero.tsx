"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function TenantHero({ profile, activeTheme, fallback }: any) {
  const displayFeatures =
    profile.features && profile.features.length > 0
      ? profile.features
      : fallback.features;

  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-white dark:bg-slate-950">
      {/* --- BACKGROUND LAYER --- */}
      <div className="absolute inset-0 z-0">
        <img
          src={profile.banner_url || fallback.banner}
          className="w-full h-full object-cover scale-105 motion-safe:animate-[pulse_15s_ease-in-out_infinite] opacity-100"
          alt="Banner"
        />

        {/* Adaptive Overlay: Putih di Light, Hitam di Dark. 
            Opacity dijaga biar aset gambar tenant tetap 'nyala' */}
        <div className="absolute inset-0 bg-white/40 dark:bg-slate-950/60 backdrop-blur-[1px]" />

        {/* Soft Gradient Overlay agar area teks punya kontras tinggi */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white dark:from-slate-950/80 dark:via-transparent dark:to-slate-950",
          )}
        />

        {/* Theme Accent Glow (Subtle) */}
        <div
          className={cn(
            "absolute inset-0 opacity-10 dark:opacity-20",
            activeTheme.gradient,
          )}
        />
      </div>

      {/* --- CONTENT LAYER --- */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 md:px-6 text-center pt-24 pb-12">
        <div className="flex flex-col items-center gap-6 md:gap-10">
          {/* 1. Tagline Badge - Adaptive Border */}
          <div className="animate-in fade-in slide-in-from-top-4 duration-1000">
            <Badge
              className={cn(
                "px-4 py-1.5 rounded-full font-black text-[10px] md:text-xs uppercase tracking-[0.3em] shadow-xl border border-black/10 dark:border-white/10",
                "bg-white/80 dark:bg-black/40 text-slate-900 dark:text-white/90 backdrop-blur-md",
              )}
            >
              <Sparkles className={cn("h-3 w-3 mr-2", activeTheme.primary)} />
              {profile.tagline_short || fallback.tagline}
            </Badge>
          </div>

          {/* 2. Main Heading - Dynamic Scaling with adaptive shadow */}
          <div className="w-full overflow-visible py-4">
            <h1 className="text-[13vw] md:text-[8.5rem] font-[950] uppercase italic tracking-tighter leading-[0.9] md:leading-[0.8] text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]">
              <span className="inline-block mb-1">
                {profile.name.split(" ")[0]}
              </span>
              <br />
              <span
                className={cn(
                  "text-transparent bg-clip-text bg-gradient-to-b inline-block pb-4 px-5",
                  "from-slate-900 via-slate-800 to-slate-500 dark:from-white dark:via-white/90 dark:to-white/20 px-5",
                )}
              >
                {profile.name.split(" ").slice(1).join(" ") || "Experience"}
              </span>
            </h1>
          </div>

          {/* 3. Slogan - Adaptive Colors */}
          <div className="max-w-xl animate-in fade-in duration-1000 delay-500">
            <p className="flex flex-col md:flex-row items-center justify-center gap-3 text-lg md:text-2xl font-semibold italic text-slate-700 dark:text-slate-100 leading-tight tracking-tight px-4">
              <span
                className={cn(
                  "hidden md:block w-10 h-[2px] shrink-0 opacity-50",
                  activeTheme.bgPrimary,
                )}
              />
              <span className="text-center">
                "{profile.slogan || fallback.copy}"
              </span>
              <span
                className={cn(
                  "hidden md:block w-10 h-[2px] shrink-0 opacity-50",
                  activeTheme.bgPrimary,
                )}
              />
            </p>
          </div>

          {/* 4. Features Grid - Adaptive Backgrounds */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-4 max-w-2xl mx-auto px-2">
            {displayFeatures.map((f: string, i: number) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 border px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 backdrop-blur-lg",
                  "bg-white/40 border-black/5 text-slate-800 dark:bg-white/5 dark:border-white/10 dark:text-white/95 hover:bg-white/60 dark:hover:bg-white/10",
                )}
              >
                <CheckCircle2 className={cn("h-4 w-4", activeTheme.primary)} />
                <span className="text-[9.5px] md:text-xs font-black uppercase tracking-widest">
                  {f}
                </span>
              </div>
            ))}
          </div>

          {/* 5. CTA Button - Categorized Color */}
          <div className="pt-8 md:pt-12 w-full md:w-auto">
            <Link href="#catalog" className="w-full inline-block group">
              <Button
                className={cn(
                  "w-full md:w-auto h-16 md:h-24 px-12 md:px-20 rounded-2xl md:rounded-[3rem] font-[950] uppercase italic text-lg md:text-2xl tracking-[0.2em] text-white border-none transition-all active:scale-90 group-hover:scale-[1.02]",
                  "shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)]",
                  activeTheme.bgPrimary,
                )}
              >
                Book Now
                <Zap className="ml-4 h-6 w-6 md:h-8 md:w-8 fill-current animate-pulse" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
