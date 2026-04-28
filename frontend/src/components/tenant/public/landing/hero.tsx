"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, MousePointer2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function TenantHero({ profile, content, theme }: any) {
  const nameParts = profile.name.split(" ");
  const firstName = nameParts[0];
  const otherNames = nameParts.slice(1).join(" ");

  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-white dark:bg-[#050505]">
      {/* --- BACKGROUND SYSTEM --- */}
      <div className="absolute inset-0 z-0">
        <img
          src={content.banner}
          className="w-full h-full object-cover scale-110 motion-safe:animate-[pulse_20s_ease-in-out_infinite] opacity-100 transition-opacity duration-1000"
          alt="Business Banner"
        />

        {/* Adaptive Overlays: Tipis di pinggir, fokus kontras di tengah area teks */}
        <div className="absolute inset-0 bg-white/20 dark:bg-black/40 backdrop-blur-[0.5px]" />

        {/* Soft Radial Gradient: Menjaga readability teks tanpa menutupi seluruh gambar */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.6)_0%,transparent_70%)]" />

        {/* Dynamic Color Mesh Glow */}
        <div
          className="absolute inset-0 opacity-20 dark:opacity-30 mix-blend-overlay"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${theme.primary} 0%, transparent 60%)`,
          }}
        />

        {/* Bottom Vignette: Agar transisi ke section katalog mulus */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-[#050505]" />
      </div>

      {/* --- CONTENT LAYER --- */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-6 md:px-12 text-center pt-32 pb-24">
        <div className="flex flex-col items-center gap-6 md:gap-10">
          {/* 1. TAGLINE BADGE */}
          <div className="animate-in fade-in slide-in-from-top-6 duration-1000">
            <Badge className="px-5 py-2.5 rounded-full font-bold text-[10px] md:text-xs uppercase tracking-[0.25em] shadow-2xl border border-white/20 bg-white/20 dark:bg-black/20 text-slate-900 dark:text-white backdrop-blur-xl">
              <Sparkles
                className="h-4 w-4 mr-2.5"
                style={{ color: theme.primary }}
              />
              {profile.slogan || "Pengalaman Premium"}
            </Badge>
          </div>

          {/* 2. MEGA HEADING SYSTEM */}
          <div className="w-full py-4 select-none px-4">
            <h1 className="text-[12vw] md:text-[7rem] font-[1000] uppercase italic tracking-tighter leading-[0.9] text-slate-950 dark:text-white drop-shadow-2xl">
              <span className="block animate-in slide-in-from-bottom-10 duration-700">
                {firstName}
              </span>
              <span
                className="inline-block pb-2 animate-in slide-in-from-bottom-10 duration-1000 delay-150"
                style={{
                  color: theme.primary,
                  textShadow: `0 10px 40px ${theme.primary}66`,
                }}
              >
                {otherNames || "Hub"}
              </span>
            </h1>
          </div>

          {/* 3. DYNAMIC MARKETING COPY */}
          <div className="max-w-3xl animate-in fade-in duration-1000 delay-500 space-y-5 px-6">
            <h2 className="text-xl md:text-3xl font-black italic text-slate-800 dark:text-white leading-snug tracking-tight uppercase">
              {content.tagline}
            </h2>
            <p className="text-sm md:text-base font-medium text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
              {content.description}
            </p>
          </div>

          {/* 4. DYNAMIC FEATURE PILLS */}
          <div
            className={cn(
              "flex flex-wrap justify-center gap-3 md:gap-4 px-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700",
            )}
          >
            {content.features.map((f: string, i: number) => (
              <div
                key={i}
                className="flex items-center gap-2 md:gap-3 border border-white/40 dark:border-white/10 px-4 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl shadow-xl backdrop-blur-2xl bg-white/40 dark:bg-black/20 transition-all hover:-translate-y-1"
              >
                <div
                  className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full"
                  style={{
                    backgroundColor: theme.primary,
                    boxShadow: `0 0 10px ${theme.primary}`,
                  }}
                />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200">
                  {f}
                </span>
              </div>
            ))}
          </div>

          {/* 5. ELITE CTA BUTTON */}
          <div className="pt-10 w-full md:w-auto animate-in zoom-in-95 duration-1000 delay-1000 px-6">
            <Link
              href="#catalog"
              className="w-full inline-block group relative"
            >
              {/* Button Shadow Glow */}
              <div
                className="absolute inset-[-10px] blur-[30px] opacity-20 group-hover:opacity-50 transition-opacity duration-500 rounded-full"
                style={{ backgroundColor: theme.primary }}
              />

              <Button
                className="w-full md:w-auto h-18 md:h-24 px-12 md:px-24 rounded-[1.5rem] md:rounded-[3.5rem] font-[1000] uppercase italic text-xl md:text-3xl tracking-[0.2em] text-white border-none transition-all active:scale-90 group-hover:scale-[1.03] relative z-10 shadow-2xl overflow-hidden"
                style={{
                  backgroundColor: theme.primary,
                  boxShadow: `0 20px 40px -10px ${theme.primary}88`,
                }}
              >
                Lihat Layanan
                <Zap className="ml-5 h-6 w-6 md:h-10 md:w-10 fill-current animate-bounce" />
              </Button>

              <div className="mt-8 flex items-center justify-center gap-3 opacity-40 group-hover:opacity-100 transition-all duration-500">
                <MousePointer2 size={14} className="dark:text-white" />
                <span className="text-[9px] font-black uppercase tracking-[0.4em] dark:text-white italic">
                  Lompat ke Katalog
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* --- SCROLL INDICATOR --- */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-4 opacity-20">
        <div className="w-[1px] h-20 bg-gradient-to-b from-transparent via-slate-500 to-transparent" />
      </div>
    </section>
  );
}
