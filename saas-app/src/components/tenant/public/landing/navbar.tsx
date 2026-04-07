"use client";
import { Button } from "@/components/ui/button";
import { Sun, Moon, UserCircle2, Layout } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function TenantNavbar({ profile }: any) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // 1. Fix Hydration Error: Pastikan komponen sudah di-mount di client sebelum render elemen berbasis tema
  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const primaryColor = profile.primary_color || "#3b82f6";

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-500",
        // Desktop: Floating Island effect | Mobile: Fixed at top
        scrolled ? "pt-0 md:pt-4 px-0 md:px-12" : "pt-0 md:pt-6 px-0 md:px-12",
      )}
    >
      <nav
        className={cn(
          "mx-auto max-w-7xl h-20 flex items-center justify-between transition-all duration-500",
          "px-4 md:px-10",
          scrolled
            ? "bg-white/90 dark:bg-black/80 backdrop-blur-2xl border-b md:border border-slate-200 dark:border-white/10 shadow-lg md:rounded-[2.5rem]"
            : "bg-white/40 dark:bg-black/20 backdrop-blur-md border-b md:border border-white/10 dark:border-white/5 md:rounded-[2.5rem]",
        )}
      >
        {/* Branding Section */}
        <div className="flex items-center gap-3 md:gap-6 group cursor-pointer">
          <div
            className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-2xl rotate-3 shrink-0 overflow-hidden transition-all group-hover:rotate-0 group-hover:scale-110 duration-500"
            style={{ backgroundColor: primaryColor }}
          >
            {profile.logo_url ? (
              <img
                src={profile.logo_url}
                className="w-full h-full object-contain p-1.5 md:p-2 bg-white/5"
                alt="Logo"
              />
            ) : (
              <span className="font-black italic text-lg md:text-xl">
                {profile.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="flex flex-col leading-none">
            <span className="font-[1000] uppercase italic tracking-tighter text-base md:text-2xl text-slate-950 dark:text-white truncate max-w-[120px] md:max-w-none">
              {profile.name}
            </span>
            <div className="flex items-center gap-1.5 md:gap-2 mt-1">
              <div
                className="h-1 w-3 md:w-4 rounded-full animate-pulse"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] opacity-60 text-slate-600 dark:text-slate-400 truncate">
                {profile.business_type || "Premium Hub"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="flex items-center gap-2 md:gap-6">
          {/* Theme Toggle - Dengan check 'mounted' biar gak removeChild error */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2.5 md:p-3.5 rounded-xl md:rounded-2xl bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-all border border-slate-200/50 dark:border-white/5 shadow-sm min-w-[40px] flex items-center justify-center"
          >
            {!mounted ? (
              <div className="h-4 w-4 md:h-5 md:w-5" /> // Placeholder biar ga jumping
            ) : theme === "dark" ? (
              <Sun className="h-4 w-4 md:h-5 md:w-5 text-yellow-500 animate-in zoom-in duration-300" />
            ) : (
              <Moon className="h-4 w-4 md:h-5 md:w-5 text-blue-600 animate-in zoom-in duration-300" />
            )}
          </button>

          <div className="h-8 md:h-10 w-px bg-slate-200 dark:bg-white/10 mx-1 md:mx-2" />

          {/* Member Portal - Sign In */}
          <Link href={`/login`}>
            <Button
              variant="ghost"
              className="rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] gap-2 md:gap-3 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black px-3 md:px-6 h-10 md:h-12 transition-all active:scale-95"
            >
              <UserCircle2 className="h-4 w-4 md:h-5 md:w-5 opacity-60" />
              <span className="hidden sm:inline">Sign In</span>
              <span className="sm:hidden text-[9px]">Login</span>
            </Button>
          </Link>

          {/* Console Login - Hidden on Mobile */}
          <Link href="/admin/login" className="hidden lg:block">
            <Button
              className="rounded-2xl font-black text-xs uppercase tracking-[0.2em] h-12 px-10 transition-all hover:scale-105 active:scale-95 shadow-xl border-none text-white"
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 10px 25px -5px ${primaryColor}66`,
              }}
            >
              <Layout className="mr-2 h-4 w-4" />
              Console
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
