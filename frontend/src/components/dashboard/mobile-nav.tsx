"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { clearTenantSession } from "@/lib/tenant-session";
import { canAccessAdminRoute } from "@/lib/admin-access";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import {
  growthHubNavItem,
  operationalNavItems,
  settingsNavItems,
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
  permission_keys?: string[];
};

const activeItemClass =
  "border border-[var(--bookinaja-200)] bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:border-[rgba(74,141,255,0.25)] dark:bg-[rgba(74,141,255,0.12)] dark:text-[var(--bookinaja-200)]";

const idleItemClass =
  "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900";

export function MobileNav({ mode, triggerClassName }: MobileNavProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const { user, tenantName, growthVisible } = useAdminSession();
  const userData = (user as MobileUser | null) ?? null;

  const items = useMemo<AdminNavItem[]>(() => {
    const source = mode === "settings" ? settingsNavItems : operationalNavItems;
    return source.filter((item) => canAccessAdminRoute(item.href, userData));
  }, [mode, userData]);

  const settingsItems = useMemo(
    () => settingsNavItems.filter((item) => canAccessAdminRoute(item.href, userData)),
    [userData],
  );

  const marketplaceItems = useMemo(
    () => (growthVisible && canAccessAdminRoute(growthHubNavItem.href, userData) ? [growthHubNavItem] : []),
    [growthVisible, userData],
  );

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
            "z-50 h-10 w-10 rounded-lg border border-[var(--bookinaja-600)] bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)] md:hidden",
            triggerClassName || "fixed bottom-4 left-4",
          )}
          aria-label="Open admin navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-[84vw] max-w-[320px] gap-0 overflow-hidden border-r border-slate-200 bg-white p-0 text-slate-950 shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:text-white"
      >
        <div className="flex h-full flex-col overflow-hidden">
          <SheetHeader className="border-b border-slate-200 px-4 py-3 text-left dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="truncate text-base font-semibold text-slate-950 dark:text-white">
                  {tenantName}
                </SheetTitle>
                <SheetDescription className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                  {userData?.name || "Admin"} · {String(userData?.role || "staff").toUpperCase()}
                </SheetDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-9 w-9 shrink-0 rounded-lg"
                aria-label="Tutup navigasi"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <nav className="space-y-1">
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      active ? activeItemClass : idleItemClass,
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1 truncate font-medium">{item.label}</div>
                  </Link>
                );
              })}
            </nav>

            {mode === "operational" &&
            userData?.role === "owner" &&
            (marketplaceItems.length > 0 || settingsItems.length > 0) ? (
              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                {marketplaceItems.length > 0 ? (
                  <>
                    <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Promosi
                    </div>
                    <div className="space-y-1">
                      {marketplaceItems.map((item) => {
                        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            prefetch={false}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                              active ? activeItemClass : idleItemClass,
                            )}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <div className="min-w-0 flex-1 truncate font-medium">{item.label}</div>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                ) : null}

                {settingsItems.length > 0 ? (
                  <>
                    <div className="mb-2 mt-4 px-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Settings
                    </div>
                    <div className="space-y-1">
                      {settingsItems.map((item) => {
                        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            prefetch={false}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                              active ? activeItemClass : idleItemClass,
                            )}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <div className="min-w-0 flex-1 truncate font-medium">{item.label}</div>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 p-3 dark:border-slate-800">
            <div className="mb-3 min-w-0 px-1">
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {userData?.email || "syncing..."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-10 justify-start gap-2 rounded-lg px-3 text-sm"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                Tema
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleLogout}
                className="h-10 justify-start gap-2 rounded-lg border-red-200 px-3 text-sm text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
