"use client";
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
  tenantSlug?: string;
  previewMode?: "desktop" | "mobile";
  embedded?: boolean;
};

export function TenantNavbar({
  profile,
  previewMode = "desktop",
  embedded = false,
}: TenantNavbarProps) {
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const isCompactPreview = embedded && previewMode === "mobile";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const primaryColor = profile.primary_color || "#3b82f6";

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
            ? "h-[68px] max-w-none rounded-[1.7rem] px-3"
            : "max-w-5xl h-[72px] md:h-[84px] px-4 md:px-8 rounded-b-[2rem] md:rounded-[2.5rem]",
          scrolled && !isCompactPreview
            ? "bg-white/70 dark:bg-black/50 backdrop-blur-3xl border-b md:border border-slate-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
            : "bg-white/20 dark:bg-white/5 backdrop-blur-xl border-b md:border border-white/30 dark:border-white/10 shadow-lg",
        )}
      >
        {/* Branding Section */}
        <div className={cn("flex items-center group cursor-pointer", isCompactPreview ? "gap-2" : "gap-2 md:gap-6")}>
          <div
            className={cn(
              "flex items-center justify-center text-white shadow-2xl rotate-3 shrink-0 overflow-hidden transition-all group-hover:rotate-0 group-hover:scale-110 duration-500",
              isCompactPreview ? "h-9 w-9 rounded-xl" : "h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl",
            )}
            style={{ backgroundColor: primaryColor }}
          >
            {profile.logo_url ? (
              <img
                src={profile.logo_url}
                className="w-full h-full object-cover bg-white/5"
                alt="Logo"
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
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-all border border-slate-200/50 dark:border-white/5 shadow-sm flex items-center justify-center",
              isCompactPreview
                ? "min-w-[34px] rounded-xl p-2"
                : "p-2 md:p-3.5 rounded-xl md:rounded-2xl min-w-[36px] md:min-w-[40px]",
            )}
            suppressHydrationWarning
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-yellow-500 animate-in zoom-in duration-300" />
            ) : (
              <Moon className="h-5 w-5 text-blue-600 animate-in zoom-in duration-300" />
            )}
          </button>

          <div className={cn("w-px bg-slate-200 dark:bg-white/10", isCompactPreview ? "mx-0.5 h-6" : "h-6 md:h-10 mx-0.5 md:mx-2")} />

          <a href={getRootPortalUrl("/user/login")}>
            <Button
              variant="ghost"
              className={cn(
                "font-black uppercase tracking-[0.16em] gap-2 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all active:scale-95",
                isCompactPreview
                  ? "h-9 rounded-xl px-2"
                  : "rounded-xl md:rounded-2xl text-[10px] md:text-xs px-2 md:px-5 h-10 md:h-12",
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
                  : "rounded-xl md:rounded-2xl text-[10px] md:text-xs h-10 md:h-12 px-2.5 md:px-6",
              )}
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 10px 25px -5px ${primaryColor}66`,
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
