"use client";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getLandingPresetTone } from "./theme-preset";
import {
  LANDING_COPY_BUDGET,
  normalizeLandingCopy,
  truncateLandingCopy,
} from "./copy-budget";

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
  const tone = getLandingPresetTone(themePreset);
  const sloganText =
    normalizeLandingCopy(profile.slogan) || "Pengalaman Premium";
  const mobileSlogan = truncateLandingCopy(
    sloganText,
    LANDING_COPY_BUDGET.mobileHeroSlogan,
  );
  const heroTagline = normalizeLandingCopy(content.tagline);
  const mobileTagline = truncateLandingCopy(
    heroTagline,
    LANDING_COPY_BUDGET.mobileHeroTagline,
  );
  const heroDescription = normalizeLandingCopy(content.description);
  const mobileDescription = truncateLandingCopy(
    heroDescription,
    LANDING_COPY_BUDGET.mobileHeroDescription,
  );

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
  const heroFeatures = content.features.slice(0, 3);
  const mobileFeatures = content.features.slice(0, 2).map((feature) =>
    truncateLandingCopy(feature, LANDING_COPY_BUDGET.mobileHeroFeature),
  );
  const floatingPanelClass = cn("border", cardRadiusClass, tone.card);
  const heroBadgeClass = cn(
    "border bg-white/88 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-md dark:bg-[#0b1120]/82 dark:text-white dark:shadow-[0_18px_40px_rgba(2,6,23,0.34)]",
    pillRadiusClass,
    tone.panel,
    tone.title,
  );
  const splitShowcaseClass = cn(
    "overflow-hidden border p-4 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl",
    radiusStyle === "square" ? "rounded-[1.4rem]" : radiusStyle === "soft" ? "rounded-[2rem]" : "rounded-[2.5rem]",
    tone.panel,
  );

  return (
    <section
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-white dark:bg-[#050505]",
        isCompact ? "min-h-[60dvh] md:min-h-[64dvh]" : isSplit ? "min-h-[72dvh] md:min-h-[78dvh]" : "min-h-[80dvh] md:min-h-[100dvh]",
      )}
    >
      <div className="absolute inset-0 z-0">
        {hasBanner ? (
          <>
            <Image
              src={content.banner || ""}
              alt="Business Banner"
              fill
              priority
              loading="eager"
              unoptimized
              sizes="100vw"
              className="object-cover object-center opacity-42 scale-[1.06] md:opacity-70 md:scale-100"
            />
          </>
        ) : (
          <div className={cn("h-full w-full", heroBackgroundClass)} />
        )}
        <div className={cn("absolute inset-0", overlayClass, "backdrop-blur-[1px]")} />
        <div className={cn("absolute inset-0", centerGlowClass)} />
        <div
          className="absolute inset-0 opacity-8 dark:opacity-16 mix-blend-overlay"
          style={{
            background: `radial-gradient(circle at 50% 38%, ${theme.primary} 0%, transparent 58%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/8 via-white/6 to-white dark:from-black/12 dark:via-black/10 dark:to-[#050505]" />
      </div>

      <div
        className={cn(
          "relative z-20 mx-auto w-full max-w-6xl px-4 pb-12 pt-28 md:px-12 md:pb-24 md:pt-32",
          isSplit ? "text-left" : "text-center",
        )}
      >
        <div className={cn("gap-6 md:gap-10", isSplit ? "grid items-center lg:grid-cols-[1.05fr_0.95fr]" : "flex flex-col items-center")}>
          <div className={cn("flex flex-col gap-4 md:gap-7", isSplit ? "items-start" : "items-center")}>
          <div>
            <Badge
              className={cn(
                "max-w-full px-3 py-1.5 font-bold text-[9px] md:px-4 md:py-2 md:text-xs uppercase tracking-[0.18em] md:tracking-[0.22em]",
                heroBadgeClass,
              )}
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" style={{ color: theme.primary }} />
              <span className="truncate md:hidden">{mobileSlogan}</span>
              <span className="hidden truncate md:inline">{sloganText}</span>
            </Badge>
          </div>

          <div className={cn("w-full select-none", isSplit ? "px-0 py-1" : "px-0 py-1")}>
            <h1
              className={cn(
                "font-[1000] uppercase italic tracking-[-0.06em] leading-[0.92]",
                tone.title,
                isCompact
                  ? "text-[10vw] md:text-[5.4rem]"
                  : isSplit
                    ? "text-[10.5vw] md:text-[5.8rem]"
                    : "text-[13vw] md:text-[6.5rem]",
              )}
            >
              <span className="block">{firstName}</span>
              {!singleWordName ? (
                <span
                  className="inline-block pb-1"
                  style={{
                    color: theme.primary,
                    textShadow: `0 8px 28px ${theme.primary}33`,
                  }}
                >
                  {otherNames}
                </span>
              ) : null}
            </h1>
          </div>

          <div className={cn("space-y-3", isSplit ? "max-w-xl px-0" : "max-w-3xl px-1")}>
            <h2 className={cn("line-clamp-2 text-base font-black italic leading-snug tracking-tight md:text-3xl", tone.title)}>
              <span className="md:hidden">{mobileTagline}</span>
              <span className="hidden md:inline">{heroTagline}</span>
            </h2>
            <p className={cn("line-clamp-2 text-[13px] font-medium leading-5 md:text-base md:leading-7 md:line-clamp-none", tone.body, isSplit ? "max-w-xl" : "mx-auto max-w-2xl")}>
              <span className="md:hidden">{mobileDescription}</span>
              <span className="hidden md:inline">{heroDescription}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 md:hidden">
            {mobileFeatures.map((f: string, i: number) => (
              <div
                key={i}
                className={cn(
                  "flex min-w-0 max-w-full items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em]",
                  floatingPanelClass,
                )}
              >
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.primary }} />
                <span className={cn("max-w-[140px] truncate", tone.title)}>{f}</span>
              </div>
            ))}
          </div>

          <div
            className={cn(
              "hidden w-full md:flex md:flex-wrap md:gap-3",
              isSplit ? "md:justify-start px-0" : "md:justify-center",
            )}
          >
            {heroFeatures.map((f: string, i: number) => (
              <div
                key={i}
                className={cn(
                  "flex min-w-0 items-center justify-center gap-2 px-4 py-2.5 text-center",
                  floatingPanelClass,
                )}
              >
                <div
                  className="h-1.5 w-1.5 rounded-full md:h-2 md:w-2"
                  style={{
                    backgroundColor: theme.primary,
                  }}
                />
                <span className={cn("line-clamp-1 text-xs font-bold uppercase tracking-[0.14em]", tone.title)}>
                  {f}
                </span>
              </div>
            ))}
          </div>

          <div className={cn(isSplit ? "w-full pt-1 px-0 md:w-auto" : "w-full px-0 pt-2 md:w-auto")}>
            <Link
              href="#catalog"
              className={cn("inline-block group relative", isSplit ? "w-full md:w-auto" : "w-full md:w-auto")}
            >
              <Button
                className={cn(
                  "relative z-10 h-12 w-full overflow-hidden border-none px-5 text-sm font-[1000] uppercase italic tracking-[0.1em] text-white shadow-xl md:h-20 md:w-auto md:px-16 md:text-2xl md:tracking-[0.16em]",
                  ctaRadiusClass,
                  !isSplit && "mx-auto max-w-[300px] md:max-w-none",
                )}
                style={{
                  backgroundColor: theme.primary,
                  boxShadow: accentShadow.replace("24px 48px -16px", "18px 30px -14px"),
                }}
              >
                {content.ctaLabel || "Lihat Layanan"}
                <Zap className="ml-2 h-4 w-4 fill-current md:ml-4 md:h-7 md:w-7" />
              </Button>
            </Link>
          </div>
          </div>
          {isSplit ? (
            <div className="hidden lg:block">
              <div
                className={splitShowcaseClass}
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

    </section>
  );
}
