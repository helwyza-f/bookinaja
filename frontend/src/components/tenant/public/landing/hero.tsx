"use client";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, MousePointer2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type TenantHeroProps = {
  profile: { name: string; slogan?: string };
  content: {
    banner?: string;
    tagline: string;
    description: string;
    features: string[];
    ctaLabel?: string;
  };
  theme: { primary: string; preset?: string; accent?: string; radiusStyle?: string };
  variant?: "immersive" | "split" | "compact";
};

export function TenantHero({ profile, content, theme, variant = "immersive" }: TenantHeroProps) {
  const nameParts = profile.name.split(" ");
  const firstName = nameParts[0];
  const otherNames = nameParts.slice(1).join(" ");
  const hasBanner = Boolean(content.banner?.trim());
  const isCompact = variant === "compact";
  const isSplit = variant === "split";
  const singleWordName = !otherNames.trim();
  const themePreset = theme.preset || "bookinaja-classic";
  const radiusStyle = theme.radiusStyle || "rounded";

  const heroBackgroundClass =
    themePreset === "boutique"
      ? "bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.12),transparent_38%),linear-gradient(180deg,#fffaf2_0%,#f6efe8_58%,#fffdf9_100%)] dark:bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.18),transparent_35%),linear-gradient(180deg,#120f0d_0%,#171412_58%,#0f0c0a_100%)]"
      : themePreset === "sunset-glow"
        ? "bg-[radial-gradient(circle_at_top,rgba(234,88,12,0.18),transparent_36%),linear-gradient(180deg,#fff7ed_0%,#ffedd5_54%,#fffaf5_100%)] dark:bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.2),transparent_35%),linear-gradient(180deg,#2a1208_0%,#1f0d06_56%,#120804_100%)]"
      : themePreset === "playful"
        ? "bg-[radial-gradient(circle_at_top,rgba(22,163,74,0.18),transparent_36%),linear-gradient(180deg,#f0fdf4_0%,#ecfeff_58%,#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top,rgba(22,163,74,0.22),transparent_35%),linear-gradient(180deg,#04160e_0%,#072116_58%,#03120d_100%)]"
        : themePreset === "mono-luxe"
          ? "bg-[radial-gradient(circle_at_top,rgba(71,85,105,0.14),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#e5e7eb_52%,#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.12),transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_55%,#020617_100%)]"
        : themePreset === "dark-pro"
          ? "bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.16),transparent_34%),linear-gradient(180deg,#f8fafc_0%,#dbeafe_48%,#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.24),transparent_34%),linear-gradient(180deg,#020617_0%,#0b1120_52%,#020617_100%)]"
          : "bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_40%),linear-gradient(180deg,#ffffff_0%,#eff6ff_55%,#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_55%,#020617_100%)]";

  const overlayClass =
    themePreset === "dark-pro"
      ? "bg-slate-950/10 dark:bg-black/54 backdrop-blur-[0.5px]"
      : themePreset === "mono-luxe"
        ? "bg-slate-900/8 dark:bg-black/46 backdrop-blur-[0.5px]"
      : themePreset === "boutique"
        ? "bg-[#fffaf0]/18 dark:bg-black/38 backdrop-blur-[0.5px]"
        : themePreset === "sunset-glow"
          ? "bg-[#fff7ed]/18 dark:bg-black/34 backdrop-blur-[0.5px]"
        : "bg-white/20 dark:bg-black/40 backdrop-blur-[0.5px]";

  const centerGlowClass =
    themePreset === "boutique"
      ? "bg-[radial-gradient(circle_at_center,rgba(255,248,240,0.45)_0%,transparent_72%)] dark:bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.48)_0%,transparent_70%)]"
      : themePreset === "sunset-glow"
        ? "bg-[radial-gradient(circle_at_center,rgba(255,237,213,0.42)_0%,transparent_72%)] dark:bg-[radial-gradient(circle_at_center,rgba(124,45,18,0.18)_0%,transparent_70%)]"
      : themePreset === "dark-pro"
        ? "bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.14)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(2,6,23,0.7)_0%,transparent_70%)]"
        : themePreset === "mono-luxe"
          ? "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.32)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.56)_0%,transparent_70%)]"
        : "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.6)_0%,transparent_70%)]";

  const pillRadiusClass =
    radiusStyle === "square" ? "rounded-[0.9rem]" : radiusStyle === "soft" ? "rounded-[1.2rem]" : "rounded-full";

  const cardRadiusClass =
    radiusStyle === "square" ? "rounded-[1rem] md:rounded-[1.2rem]" : radiusStyle === "soft" ? "rounded-[1.4rem] md:rounded-[1.8rem]" : "rounded-xl md:rounded-2xl";

  const ctaRadiusClass =
    radiusStyle === "square" ? "rounded-[1rem] md:rounded-[1.5rem]" : radiusStyle === "soft" ? "rounded-[1.8rem] md:rounded-[2.4rem]" : "rounded-[1.5rem] md:rounded-[3.5rem]";

  const accentShadow =
    theme.accent ? `0 24px 48px -16px ${theme.accent}26` : `0 20px 40px -10px ${theme.primary}88`;

  return (
    <section
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-white dark:bg-[#050505]",
        isCompact ? "min-h-[80dvh]" : "min-h-[100dvh]",
      )}
    >
      {/* --- BACKGROUND SYSTEM --- */}
      <div className="absolute inset-0 z-0">
        {hasBanner ? (
          <>
            <Image
              src={content.banner || ""}
              alt="Business Banner Backdrop"
              fill
              priority
              loading="eager"
              unoptimized
              sizes="100vw"
              className="object-cover object-center scale-110 opacity-45 blur-2xl transition-opacity duration-1000"
            />
            <Image
              src={content.banner || ""}
              alt="Business Banner"
              fill
              priority
              loading="eager"
              unoptimized
              sizes="100vw"
              className="object-cover object-center opacity-100 transition-opacity duration-1000"
            />
          </>
        ) : (
          <div
            className={cn("h-full w-full", heroBackgroundClass)}
          />
        )}

        {/* Adaptive Overlays: Tipis di pinggir, fokus kontras di tengah area teks */}
        <div className={cn("absolute inset-0", overlayClass)} />

        {/* Soft Radial Gradient: Menjaga readability teks tanpa menutupi seluruh gambar */}
        <div className={cn("absolute inset-0", centerGlowClass)} />

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
      <div
        className={cn(
          "relative z-20 mx-auto w-full max-w-6xl px-6 pb-24 pt-32 md:px-12",
          isSplit ? "text-left" : "text-center",
        )}
      >
        <div className={cn("gap-6 md:gap-10", isSplit ? "grid items-center lg:grid-cols-[1.05fr_0.95fr]" : "flex flex-col items-center")}>
          <div className={cn("flex flex-col gap-6 md:gap-10", isSplit ? "items-start" : "items-center")}>
          {/* 1. TAGLINE BADGE */}
          <div className="animate-in fade-in slide-in-from-top-6 duration-1000">
            <Badge
              className={cn(
                "px-5 py-2.5 font-bold text-[10px] md:text-xs uppercase tracking-[0.25em] shadow-2xl border text-slate-900 dark:text-white backdrop-blur-xl",
                pillRadiusClass,
                themePreset === "boutique"
                  ? "border-stone-200/70 bg-[#fff8f1]/70 dark:border-white/10 dark:bg-[#181412]/65"
                  : themePreset === "sunset-glow"
                    ? "border-orange-200/70 bg-[#fff7ed]/75 dark:border-orange-500/20 dark:bg-[#241109]/65"
                  : themePreset === "playful"
                    ? "border-emerald-100/70 bg-white/70 dark:border-emerald-500/20 dark:bg-[#092014]/65"
                    : themePreset === "mono-luxe"
                      ? "border-slate-300/70 bg-white/76 dark:border-white/10 dark:bg-[#0b1120]/62"
                    : themePreset === "dark-pro"
                      ? "border-slate-300/70 bg-white/72 dark:border-white/10 dark:bg-slate-950/55 text-slate-900 dark:text-white"
                      : "border-white/20 bg-white/20 dark:bg-black/20",
              )}
            >
              <Sparkles
                className="h-4 w-4 mr-2.5"
                style={{ color: theme.primary }}
              />
              {profile.slogan || "Pengalaman Premium"}
            </Badge>
          </div>

          {/* 2. MEGA HEADING SYSTEM */}
          <div className={cn("w-full select-none", isSplit ? "px-0 py-2" : "px-4 py-4")}>
            <h1
              className={cn(
                "font-[1000] uppercase italic tracking-tighter leading-[0.9] text-slate-950 dark:text-white drop-shadow-2xl",
                isCompact
                  ? "text-[11vw] md:text-[5.75rem]"
                  : isSplit
                    ? "text-[11vw] md:text-[6rem]"
                    : "text-[12vw] md:text-[7rem]",
              )}
            >
              <span className="block animate-in slide-in-from-bottom-10 duration-700">
                {firstName}
              </span>
              {!singleWordName ? (
                <span
                  className="inline-block pb-2 animate-in slide-in-from-bottom-10 duration-1000 delay-150"
                  style={{
                    color: theme.primary,
                    textShadow: `0 10px 40px ${theme.primary}66`,
                  }}
                >
                  {otherNames}
                </span>
              ) : null}
            </h1>
          </div>

          {/* 3. DYNAMIC MARKETING COPY */}
          <div className={cn("animate-in fade-in duration-1000 delay-500 space-y-5", isSplit ? "max-w-xl px-0" : "max-w-3xl px-6")}>
            <h2 className="text-xl md:text-3xl font-black italic text-slate-800 dark:text-white leading-snug tracking-tight uppercase">
              {content.tagline}
            </h2>
            <p className={cn("text-sm md:text-base font-medium text-slate-600 dark:text-slate-300 leading-relaxed drop-shadow-sm", isSplit ? "max-w-xl" : "mx-auto max-w-2xl")}>
              {content.description}
            </p>
          </div>

          {/* 4. DYNAMIC FEATURE PILLS */}
          <div className={cn("flex flex-wrap gap-3 px-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700 md:gap-4", isSplit ? "justify-start px-0" : "justify-center")}>
            {content.features.map((f: string, i: number) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 md:gap-3 border px-4 md:px-5 py-2.5 md:py-3 shadow-xl backdrop-blur-2xl transition-all hover:-translate-y-1",
                  cardRadiusClass,
                  themePreset === "boutique"
                    ? "border-stone-200/80 bg-[#fffaf2]/70 dark:border-white/10 dark:bg-[#181412]/65"
                    : themePreset === "sunset-glow"
                      ? "border-orange-200/80 bg-[#fff7ed]/72 dark:border-orange-500/20 dark:bg-[#221009]/64"
                    : themePreset === "playful"
                      ? "border-emerald-100/80 bg-white/75 dark:border-emerald-500/20 dark:bg-[#082114]/65"
                      : themePreset === "mono-luxe"
                        ? "border-slate-300/80 bg-white/78 dark:border-white/10 dark:bg-[#0b1120]/62"
                      : themePreset === "dark-pro"
                        ? "border-slate-300/70 bg-white/74 dark:border-white/10 dark:bg-slate-950/55"
                        : "border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/20",
                )}
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
          <div className={cn("animate-in zoom-in-95 duration-1000 delay-1000", isSplit ? "w-full pt-6 px-0 md:w-auto" : "w-full px-6 pt-10 md:w-auto")}>
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
                className={cn(
                  "w-full md:w-auto h-18 md:h-24 px-12 md:px-24 font-[1000] uppercase italic text-xl md:text-3xl tracking-[0.2em] text-white border-none transition-all active:scale-90 group-hover:scale-[1.03] relative z-10 shadow-2xl overflow-hidden",
                  ctaRadiusClass,
                )}
                style={{
                  backgroundColor: theme.primary,
                  boxShadow: accentShadow,
                }}
              >
                {content.ctaLabel || "Lihat Layanan"}
                <Zap className="ml-5 h-6 w-6 md:h-10 md:w-10 fill-current animate-bounce" />
              </Button>

              <div className={cn("mt-8 flex items-center gap-3 opacity-50 transition-all duration-500 group-hover:opacity-100", isSplit ? "justify-start" : "justify-center")}>
                <MousePointer2 size={14} className="text-slate-700 dark:text-white" />
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-700 dark:text-white italic">
                  Lompat ke Katalog
                </span>
              </div>
            </Link>
          </div>
          </div>
          {isSplit ? (
            <div className="hidden lg:block">
              <div
                className={cn(
                  "overflow-hidden border p-4 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl",
                  radiusStyle === "square" ? "rounded-[1.4rem]" : radiusStyle === "soft" ? "rounded-[2rem]" : "rounded-[2.5rem]",
                  themePreset === "boutique"
                    ? "border-stone-200/70 bg-[#fffaf2]/72 dark:border-white/10 dark:bg-[#181412]/68"
                    : themePreset === "sunset-glow"
                      ? "border-orange-200/70 bg-[#fff7ed]/74 dark:border-orange-500/20 dark:bg-[#221009]/68"
                    : themePreset === "playful"
                      ? "border-emerald-100/70 bg-white/70 dark:border-emerald-500/20 dark:bg-[#082114]/68"
                      : themePreset === "mono-luxe"
                        ? "border-slate-300/70 bg-white/76 dark:border-white/10 dark:bg-[#0b1120]/66"
                      : themePreset === "dark-pro"
                        ? "border-slate-300/70 bg-white/74 dark:border-white/10 dark:bg-slate-950/58"
                        : "border-white/30 bg-white/35 dark:border-white/10 dark:bg-black/20",
                )}
              >
                {hasBanner ? (
                  <div
                    className={cn(
                      "relative aspect-[4/5] w-full overflow-hidden",
                      radiusStyle === "square" ? "rounded-[1rem]" : radiusStyle === "soft" ? "rounded-[1.6rem]" : "rounded-[2rem]",
                    )}
                  >
                    <>
                      <Image
                        src={content.banner || ""}
                        alt="Business Banner Backdrop"
                        fill
                        loading="eager"
                        unoptimized
                        sizes="(min-width: 1024px) 40vw, 100vw"
                        className="object-cover object-center scale-110 opacity-45 blur-xl"
                      />
                      <Image
                        src={content.banner || ""}
                        alt="Business Banner"
                        fill
                        loading="eager"
                        unoptimized
                        sizes="(min-width: 1024px) 40vw, 100vw"
                        className="object-cover object-center"
                      />
                    </>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "aspect-[4/5] w-full",
                      heroBackgroundClass,
                      radiusStyle === "square" ? "rounded-[1rem]" : radiusStyle === "soft" ? "rounded-[1.6rem]" : "rounded-[2rem]",
                    )}
                  />
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* --- SCROLL INDICATOR --- */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-4 opacity-20">
        <div className="w-[1px] h-20 bg-gradient-to-b from-transparent via-slate-500 to-transparent" />
      </div>
    </section>
  );
}
