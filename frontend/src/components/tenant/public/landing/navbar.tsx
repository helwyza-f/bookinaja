"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Sun, Moon, UserCircle2, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getRootPortalUrl } from "@/lib/tenant";

type TenantNavbarProfile = {
  name: string;
  business_type?: string;
  primary_color?: string;
  logo_url?: string;
};

type TenantNavbarProps = {
  profile: TenantNavbarProfile;
  landingTheme?: {
    primary: string;
    accent?: string;
    preset?: string;
    radiusStyle?: string;
  };
  tenantSlug?: string;
  previewMode?: "desktop" | "mobile";
  embedded?: boolean;
};

export function TenantNavbar({
  profile,
  landingTheme,
  previewMode = "desktop",
  embedded = false,
}: TenantNavbarProps) {
  const { theme: mode, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const isCompactPreview = embedded && previewMode === "mobile";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const primaryColor = landingTheme?.primary || profile.primary_color || "#3b82f6";
  const accentColor = landingTheme?.accent || primaryColor;
  const preset = landingTheme?.preset || "bookinaja-classic";
  const radiusStyle = landingTheme?.radiusStyle || "rounded";
  const navRadiusClass =
    radiusStyle === "square"
      ? isCompactPreview
        ? "rounded-[1rem]"
        : "rounded-b-[1.4rem] md:rounded-[1.7rem]"
      : radiusStyle === "soft"
        ? isCompactPreview
          ? "rounded-[1.5rem]"
          : "rounded-b-[2.2rem] md:rounded-[2.5rem]"
        : isCompactPreview
          ? "rounded-[1.7rem]"
          : "rounded-b-[2rem] md:rounded-[2.5rem]";
  const controlRadiusClass =
    radiusStyle === "square"
      ? "rounded-[0.9rem] md:rounded-[1rem]"
      : radiusStyle === "soft"
        ? "rounded-[1.2rem] md:rounded-[1.4rem]"
        : "rounded-xl md:rounded-2xl";
  const surfaceClass =
    preset === "boutique"
      ? scrolled && !isCompactPreview
        ? "bg-[#fffaf2]/88 dark:bg-[#171412]/86 backdrop-blur-3xl border-b md:border border-stone-200/80 dark:border-white/10 shadow-[0_8px_30px_rgb(41,37,36,0.12)]"
        : "bg-[#fff8f1]/55 dark:bg-[#171412]/55 backdrop-blur-xl border-b md:border border-stone-200/70 dark:border-white/10 shadow-lg"
      : preset === "sunset-glow"
        ? scrolled && !isCompactPreview
          ? "bg-[#fff7ed]/88 dark:bg-[#1f0d06]/86 backdrop-blur-3xl border-b md:border border-orange-200/80 dark:border-orange-500/20 shadow-[0_8px_30px_rgb(124,45,18,0.14)]"
          : "bg-[#fff7ed]/56 dark:bg-[#1f0d06]/56 backdrop-blur-xl border-b md:border border-orange-200/70 dark:border-orange-500/20 shadow-lg"
      : preset === "playful"
        ? scrolled && !isCompactPreview
          ? "bg-white/86 dark:bg-[#082114]/82 backdrop-blur-3xl border-b md:border border-emerald-100/80 dark:border-emerald-500/20 shadow-[0_8px_30px_rgb(20,83,45,0.12)]"
          : "bg-white/55 dark:bg-[#082114]/55 backdrop-blur-xl border-b md:border border-emerald-100/80 dark:border-emerald-500/20 shadow-lg"
        : preset === "mono-luxe"
          ? scrolled && !isCompactPreview
            ? "bg-white/88 dark:bg-[#060d19]/86 backdrop-blur-3xl border-b md:border border-slate-300/80 dark:border-white/10 shadow-[0_8px_30px_rgb(15,23,42,0.12)]"
            : "bg-white/60 dark:bg-[#0b1120]/56 backdrop-blur-xl border-b md:border border-slate-300/70 dark:border-white/10 shadow-lg"
        : preset === "dark-pro"
          ? scrolled && !isCompactPreview
            ? "bg-slate-50/88 dark:bg-[#060d19]/86 backdrop-blur-3xl border-b md:border border-slate-300/80 dark:border-white/10 shadow-[0_8px_30px_rgb(15,23,42,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
            : "bg-white/50 dark:bg-[#0b1120]/55 backdrop-blur-xl border-b md:border border-slate-300/70 dark:border-white/10 shadow-lg"
          : scrolled && !isCompactPreview
            ? "bg-white/70 dark:bg-black/50 backdrop-blur-3xl border-b md:border border-slate-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
            : "bg-white/20 dark:bg-white/5 backdrop-blur-xl border-b md:border border-white/30 dark:border-white/10 shadow-lg";
  const compactSurfaceClass = "bg-white/92 dark:bg-[#111827]/92 border border-slate-200/80 dark:border-white/10 shadow-sm";

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-500",
        isCompactPreview
          ? "px-3 pt-3"
          : scrolled
            ? "pt-0 md:pt-6 md:px-4"
            : "pt-0 md:pt-8 md:px-4",
      )}
    >
      <nav
        className={cn(
          "mx-auto flex items-center justify-between transition-all duration-500",
          isCompactPreview
            ? "h-[68px] max-w-none px-3"
            : "max-w-5xl h-[72px] md:h-[84px] px-4 md:px-8",
          navRadiusClass,
          isCompactPreview ? compactSurfaceClass : surfaceClass,
        )}
      >
        {/* Branding Section */}
        <div className={cn("flex items-center group cursor-pointer", isCompactPreview ? "gap-2" : "gap-2 md:gap-6")}>
          <div
            className={cn(
              "flex items-center justify-center text-white shrink-0 overflow-hidden transition-all",
              isCompactPreview ? "h-9 w-9 rounded-xl" : cn("h-10 w-10 md:h-12 md:w-12", controlRadiusClass),
            )}
            style={{ backgroundColor: primaryColor, boxShadow: isCompactPreview ? "none" : `0 14px 30px ${accentColor}33` }}
          >
            {profile.logo_url ? (
              <Image
                src={profile.logo_url}
                alt="Logo"
                fill
                unoptimized
                sizes="48px"
                className="object-cover object-center bg-white/5"
              />
            ) : (
              <span className="font-black italic text-lg md:text-xl ">
                {profile.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="flex flex-col leading-none">
            <span
              className={cn(
                "font-[1000] uppercase italic tracking-tighter text-slate-950 dark:text-white truncate",
                isCompactPreview
                  ? "max-w-[110px] text-[13px]"
                  : "text-sm md:text-2xl max-w-[100px] sm:max-w-[140px] md:max-w-none md:pr-3",
              )}
            >
              {profile.name}
            </span>
            <div className={cn("flex items-center mt-1", isCompactPreview ? "gap-1" : "gap-1.5 md:gap-2")}>
              <div
                className={cn("rounded-full animate-pulse", isCompactPreview ? "h-1 w-2.5" : "h-1 w-3 md:w-4")}
                style={{ backgroundColor: primaryColor }}
              />
              <span
                className={cn(
                  "font-black uppercase opacity-60 text-slate-600 dark:text-slate-400 truncate",
                  isCompactPreview
                    ? "max-w-[88px] text-[7px] tracking-[0.16em]"
                    : "text-[8px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] max-w-[80px] md:max-w-none",
                )}
              >
                {profile.business_type || "Premium Hub"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className={cn("flex items-center", isCompactPreview ? "gap-1.5" : "gap-2 md:gap-4")}>
          <button
            onClick={() => setTheme(mode === "dark" ? "light" : "dark")}
            className={cn(
              "transition-all border shadow-sm flex items-center justify-center",
              preset === "boutique"
                ? "bg-[#fffaf2]/90 dark:bg-[#201a17] hover:bg-white dark:hover:bg-[#2a221d] border-stone-200/80 dark:border-white/10"
                : preset === "sunset-glow"
                  ? "bg-[#fff7ed]/90 dark:bg-[#241109] hover:bg-[#fffaf5] dark:hover:bg-[#2a140b] border-orange-200/80 dark:border-orange-500/20"
                : preset === "playful"
                  ? "bg-white/90 dark:bg-[#0b2417] hover:bg-emerald-50 dark:hover:bg-[#123321] border-emerald-100/80 dark:border-emerald-500/20"
                  : preset === "mono-luxe"
                    ? "bg-white/92 dark:bg-[#0b1120] hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300/80 dark:border-white/10"
                  : preset === "dark-pro"
                    ? "bg-slate-100 dark:bg-[#0b1120] hover:bg-slate-200 dark:hover:bg-slate-800 border-slate-300 dark:border-white/10"
                    : "bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border-slate-200/50 dark:border-white/5",
              isCompactPreview
                ? "min-w-[34px] rounded-xl p-2"
                : cn("p-2 md:p-3.5 min-w-[36px] md:min-w-[40px]", controlRadiusClass),
            )}
            suppressHydrationWarning
          >
            {mode === "dark" ? (
              <Sun className="h-5 w-5 text-yellow-500 animate-in zoom-in duration-300" />
            ) : (
              <Moon className="h-5 w-5 text-blue-600 animate-in zoom-in duration-300" />
            )}
          </button>

          <div className={cn("w-px bg-slate-200 dark:bg-white/10", isCompactPreview ? "mx-0.5 h-5" : "h-6 md:h-10 mx-0.5 md:mx-2")} />

          <a href={getRootPortalUrl("/user/login")}>
            <Button
              variant="ghost"
              className={cn(
                "font-black uppercase tracking-[0.16em] gap-2 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all active:scale-95",
                isCompactPreview
                  ? "h-9 rounded-xl px-2"
                  : cn("text-[10px] md:text-xs px-2 md:px-5 h-10 md:h-12", controlRadiusClass),
              )}
            >
              <UserCircle2 className="h-5 w-5 opacity-80" />
              <span className={cn(isCompactPreview ? "hidden" : "hidden md:inline")}>Customer</span>
            </Button>
          </a>

          <Link href="/admin/login">
            <Button
              className={cn(
                "font-black uppercase tracking-[0.16em] transition-all active:scale-95 shadow-lg border-none text-white",
                isCompactPreview
                  ? "h-9 rounded-xl px-2.5"
                  : cn("text-[10px] md:text-xs h-10 md:h-12 px-2.5 md:px-6", controlRadiusClass),
              )}
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 10px 25px -5px ${accentColor}66`,
              }}
            >
              <LayoutDashboard className={cn("h-5 w-5", isCompactPreview ? "" : "md:mr-2")} />
              <span className={cn(isCompactPreview ? "hidden" : "hidden md:inline")}>Admin</span>
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
