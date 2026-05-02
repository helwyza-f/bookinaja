"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, LogOut, X } from "lucide-react";
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
import api from "@/lib/api";
import { clearTenantSession } from "@/lib/tenant-session";
import { canAccessAdminRoute } from "@/lib/admin-access";
import {
  growthHubNavItem,
  operationalNavItems,
  settingsNavItems,
  showGrowthWorkspaceInOperationalNav,
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
        const currentUser = res.data.user;
        setUserData(currentUser);

        if (currentUser?.role !== "owner") {
          if (active) {
            setTenantName(String(params.tenant || "HUB"));
          }
          return;
        }

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
    const source = mode === "settings" ? settingsNavItems : operationalNavItems;
    return source.filter((item) => canAccessAdminRoute(item.href, userData));
  }, [mode, userData]);

  const settingsItems = useMemo(
    () =>
      settingsNavItems.filter((item) => canAccessAdminRoute(item.href, userData)),
    [userData],
  );

  const marketplaceItems = useMemo(
    () =>
      showGrowthWorkspaceInOperationalNav && canAccessAdminRoute(growthHubNavItem.href, userData)
        ? [growthHubNavItem]
        : [],
    [userData],
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
            "z-50 h-10 w-10 rounded-xl border border-slate-200 bg-slate-950 text-white shadow-sm hover:bg-slate-900 md:hidden",
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
        className="w-[84vw] max-w-[320px] gap-0 overflow-hidden border-r border-slate-200 bg-white p-0 text-slate-950 shadow-xl dark:border-white/10 dark:bg-[#0a0a0a] dark:text-white"
      >
        <div className="flex h-full flex-col overflow-hidden">
          <SheetHeader className="border-b border-slate-200 px-4 py-3 text-left dark:border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="truncate text-base font-semibold text-slate-950 dark:text-white">
                  {tenantName}
                </SheetTitle>
                <SheetDescription className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                  {userData?.name || "Admin"} ·{" "}
                  {String(userData?.role || "staff").toUpperCase()}
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
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-blue-600 text-white"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{item.label}</div>
                      {item.hint ? (
                        <div
                          className={cn(
                            "mt-0.5 truncate text-xs",
                            active ? "text-blue-100" : "text-slate-400",
                          )}
                        >
                          {item.hint}
                        </div>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </nav>

            {mode === "operational" &&
            userData?.role === "owner" &&
            (marketplaceItems.length > 0 || settingsItems.length > 0) ? (
              <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
                {marketplaceItems.length > 0 ? (
                  <>
                    <div className="mb-1 px-3 text-xs font-semibold text-slate-400">
                      Promosi
                    </div>
                    <div className="space-y-1">
                      {marketplaceItems.map((item) => {
                        const active =
                          pathname === item.href || pathname.startsWith(`${item.href}/`);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                              active
                                ? "bg-blue-600 text-white"
                                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5",
                            )}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{item.label}</div>
                              {item.hint ? (
                                <div
                                  className={cn(
                                    "mt-0.5 truncate text-xs",
                                    active ? "text-blue-100" : "text-slate-400",
                                  )}
                                >
                                  {item.hint}
                                </div>
                              ) : null}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                ) : null}

                {settingsItems.length > 0 ? (
                  <>
                    <div className="mb-1 mt-3 px-3 text-xs font-semibold text-slate-400">
                      Settings
                    </div>
                    <div className="space-y-1">
                  {settingsItems.map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                          active
                            ? "bg-blue-600 text-white"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5",
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{item.label}</div>
                          {item.hint ? (
                            <div
                              className={cn(
                                "mt-0.5 truncate text-xs",
                                active ? "text-blue-100" : "text-slate-400",
                              )}
                            >
                              {item.hint}
                            </div>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 p-3 dark:border-white/10">
            <div className="mb-3 min-w-0 px-1">
              <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
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
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
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
