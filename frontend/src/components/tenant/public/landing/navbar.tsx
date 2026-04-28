"use client";
import { Button } from "@/components/ui/button";
import { Sun, Moon, UserCircle2, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type TenantNavbarProfile = {
  name: string;
  business_type?: string;
  primary_color?: string;
  logo_url?: string;
};

type TenantNavbarProps = {
  profile: TenantNavbarProfile;
  tenantSlug?: string;
};

function getRootPortalUrl(path: string) {
  if (typeof window === "undefined") return path;

  const url = new URL(window.location.href);
  const hostParts = url.hostname.split(".").filter(Boolean);

  if (url.hostname !== "localhost" && hostParts.length > 2) {
    url.hostname = hostParts.slice(-2).join(".");
  }

  url.pathname = path;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function TenantNavbar({ profile }: TenantNavbarProps) {
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

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
        scrolled ? "pt-2 md:pt-6 px-4" : "pt-4 md:pt-8 px-4",
      )}
    >
      <nav
        className={cn(
          "mx-auto max-w-5xl h-[72px] md:h-[84px] flex items-center justify-between transition-all duration-500 px-4 md:px-8",
          "rounded-[2rem] md:rounded-[2.5rem]",
          scrolled
            ? "bg-white/70 dark:bg-black/50 backdrop-blur-3xl border border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
            : "bg-white/20 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-lg",
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
            <span className="font-[1000] uppercase italic tracking-tighter text-base md:text-2xl text-slate-950 dark:text-white truncate max-w-[120px] md:max-w-none md:pr-3">
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
        <div className="flex items-center gap-1.5 md:gap-4">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2.5 md:p-3.5 rounded-xl md:rounded-2xl bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-all border border-slate-200/50 dark:border-white/5 shadow-sm min-w-[40px] flex items-center justify-center"
            suppressHydrationWarning
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 md:h-5 md:w-5 text-yellow-500 animate-in zoom-in duration-300" />
            ) : (
              <Moon className="h-4 w-4 md:h-5 md:w-5 text-blue-600 animate-in zoom-in duration-300" />
            )}
          </button>

          <div className="h-8 md:h-10 w-px bg-slate-200 dark:bg-white/10 mx-1 md:mx-2" />

          <Link
            href="/user/login"
            onClick={(event) => {
              event.preventDefault();
              window.location.href = getRootPortalUrl("/user/login");
            }}
          >
            <Button
              variant="ghost"
              className="rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.16em] gap-2 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black px-3 md:px-5 h-10 md:h-12 transition-all active:scale-95"
            >
              <UserCircle2 className="h-4 w-4 md:h-5 md:w-5 opacity-60" />
              <span className="hidden md:inline">Customer</span>
            </Button>
          </Link>

          <Link href="/admin/login">
            <Button
              className="rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.16em] h-10 md:h-12 px-3 md:px-6 transition-all active:scale-95 shadow-lg border-none text-white"
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 10px 25px -5px ${primaryColor}66`,
              }}
            >
              <LayoutDashboard className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Admin</span>
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
