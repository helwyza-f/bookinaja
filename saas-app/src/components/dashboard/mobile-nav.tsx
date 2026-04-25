"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import api from "@/lib/api";
import { clearTenantSession } from "@/lib/tenant-session";
import {
  operationalNavItems,
  type AdminNavItem,
} from "./admin-nav-config";

type MobileNavMode = "operational" | "settings";

type MobileNavProps = {
  mode: MobileNavMode;
  triggerClassName?: string;
};

type MobileUser = {
  name?: string;
  email?: string;
  role?: string;
  logo_url?: string;
  initials?: string;
};

const FALLBACK_LOGO = "https://cdn.bookinaja.com/tenants/logo_frameless.png";

export function MobileNav({ mode, triggerClassName }: MobileNavProps) {
  const pathname = usePathname();
  const params = useParams();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [userData, setUserData] = useState<MobileUser | null>(null);
  const [tenantName, setTenantName] = useState<string>(
    String(params.tenant || "HUB"),
  );

  useEffect(() => {
    let active = true;

    api
      .get("/auth/me")
      .then(async (res) => {
        if (!active) return;
        setUserData(res.data.user);

        try {
          const profileRes = await api.get("/admin/profile");
          if (active) {
            setTenantName(profileRes.data?.name || String(params.tenant || "HUB"));
          }
        } catch {
          if (active) {
            setTenantName(String(params.tenant || "HUB"));
          }
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [params.tenant]);

  const items = useMemo<AdminNavItem[]>(() => {
    return operationalNavItems;
  }, []);

  const tenantLogo =
    userData?.logo_url && userData.logo_url !== ""
      ? userData.logo_url
      : FALLBACK_LOGO;

  const handleLogout = () => {
    clearTenantSession({ keepTenantSlug: true });
    window.location.href = "/admin/login";
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className={cn(
            "z-50 h-12 w-12 rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-2xl shadow-slate-950/20 hover:bg-slate-900 md:hidden",
            triggerClassName || "fixed left-4 bottom-4",
          )}
          aria-label="Open admin navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-[88vw] max-w-[340px] gap-0 overflow-hidden border-r border-slate-200 bg-white p-0 text-slate-950 shadow-[24px_0_80px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-[#0a0a0a] dark:text-white scrollbar-hide"
      >
        <div className="flex h-full flex-col overflow-hidden">
          <SheetHeader className="border-b border-slate-100 p-5 dark:border-white/5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <SheetTitle className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-600">
                  Bookinaja Admin
                </SheetTitle>
                <SheetDescription className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {mode === "settings"
                    ? "Settings navigation"
                    : "Operational navigation"}
                </SheetDescription>
              </div>
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${tenantLogo})` }}
                  aria-label="Tenant logo"
                  role="img"
                />
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] bg-slate-950 p-4 text-white shadow-xl shadow-slate-950/10">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.35em] text-blue-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                {tenantName}
              </div>
              <div className="mt-2 text-xl font-[1000] italic uppercase tracking-tighter leading-none">
                {userData?.name || "Admin"}
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">
                  {userData?.email || "syncing..."}
                </div>
                <Badge className="border-none bg-white/10 text-[7px] font-black uppercase italic tracking-[0.25em] text-white">
                  {String(userData?.role || "staff").toUpperCase()}
                </Badge>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            <nav className="space-y-2">
              {items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-[1.35rem] border px-4 py-3.5 transition-all",
                      active
                        ? "border-blue-500/20 bg-blue-500/5 text-blue-600 shadow-sm"
                        : "border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-400 dark:hover:border-white/5 dark:hover:bg-white/5",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all",
                        active
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                          : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-black uppercase italic tracking-widest leading-none">
                        {item.label}
                      </div>
                      {item.hint ? (
                        <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                          {item.hint}
                        </div>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-white/5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex h-auto w-full items-center justify-between rounded-[1.35rem] border-slate-200 px-4 py-4 text-left hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                <span className="flex items-center gap-3">
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Moon className="h-4 w-4 text-blue-500" />
                  )}
                  <span className="text-[10px] font-black uppercase italic tracking-widest">
                    Tampilan {theme === "dark" ? "Terang" : "Gelap"}
                  </span>
                </span>
              </Button>

              <Button
                type="button"
                onClick={handleLogout}
                className="flex h-auto w-full items-center justify-between rounded-[1.35rem] border border-red-200 bg-red-50 px-4 py-4 text-left text-red-600 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
              >
                <span className="flex items-center gap-3">
                  <LogOut className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase italic tracking-widest">
                    Putuskan Sesi
                  </span>
                </span>
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
