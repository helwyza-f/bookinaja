"use client";
import { Button } from "@/components/ui/button";
import { Sun, Moon, UserCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function TenantNavbar({ profile, activeTheme, tenantSlug }: any) {
  const { theme, setTheme } = useTheme();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-black/40 backdrop-blur-2xl border-b border-slate-200 dark:border-white/5 h-20 flex items-center justify-between px-4 md:px-12 transition-all">
      {/* Branding Section */}
      <div className="flex items-center gap-3 md:gap-4">
        <div
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-2xl rotate-3 shrink-0 overflow-hidden",
            activeTheme.bgPrimary,
          )}
        >
          {profile.logo_url ? (
            <img
              src={profile.logo_url}
              className="w-full h-full object-cover"
              alt="Logo"
            />
          ) : (
            <span className="font-black italic">B</span>
          )}
        </div>
        <div className="flex flex-col leading-none max-w-[150px] md:max-w-none">
          <span className="font-black uppercase italic tracking-tighter text-base md:text-lg truncate px-2">
            {profile.name}
          </span>
          <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest opacity-40 px-2">
            {profile.business_type}
          </span>
        </div>
      </div>

      {/* Actions Section */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Theme Toggle - Selalu muncul */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-yellow-500" />
          ) : (
            <Moon className="h-4 w-4 text-blue-600" />
          )}
        </button>

        {/* Member Portal - Login Utama Customer (Muncul di Mobile & Desktop) */}
        <Link href={`/login`}>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full font-black text-[10px] uppercase tracking-widest gap-2 hover:bg-slate-100 dark:hover:bg-white/5 px-4 md:px-5"
          >
            <UserCircle2 className="h-4 w-4 opacity-70" />
            <span className="inline md:inline">Login</span>
          </Button>
        </Link>

        {/* Admin Login - Hidden di Mobile, Muncul di Desktop */}
        <Link href="/admin/login" className="hidden md:block">
          <Button
            size="sm"
            className="rounded-full font-black text-[10px] uppercase tracking-widest bg-slate-900 dark:bg-white text-white dark:text-black px-6 shadow-xl hover:scale-105 transition-transform"
          >
            Admin
          </Button>
        </Link>
      </div>
    </nav>
  );
}
