"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  ChevronsUpDown,
  Settings,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearTenantSession } from "@/lib/tenant-session";
import { canAccessAdminRoute, getAdminRouteGate } from "@/lib/admin-access";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { Badge } from "../ui/badge";
import { getCentralAdminAuthUrl, getTenantSlugFromBrowser } from "@/lib/tenant";
import {
  growthHubNavItem,
  operationalNavItems,
  settingsNavItems,
} from "./admin-nav-config";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
}

const FALLBACK_LOGO = "/bookinaja-logo.png";

type SidebarUser = {
  name?: string;
  email?: string;
  role?: string;
  logo_url?: string;
  initials?: string;
  permission_keys?: string[];
};

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, tenantName, growthVisible } = useAdminSession();
  const userData = (user as SidebarUser | null) ?? null;

  // Logic Fallback Logo
  const tenantLogo =
    userData?.logo_url && userData.logo_url !== ""
      ? userData.logo_url
      : FALLBACK_LOGO;

  const handleLogout = () => {
    clearTenantSession({ keepTenantSlug: true });
    window.location.href = getCentralAdminAuthUrl({
      tenantSlug: getTenantSlugFromBrowser(),
      next: "/admin/dashboard",
    });
  };

  const hasAccess = (href: string) => canAccessAdminRoute(href, userData);

  const itemBase = isCollapsed
    ? "mx-auto flex h-10 w-10 items-center justify-center rounded-lg"
    : "flex w-full items-center gap-3 rounded-lg px-3 py-2.5";

  const itemActive =
    "border border-[var(--bookinaja-200)] bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:border-[rgba(74,141,255,0.25)] dark:bg-[rgba(74,141,255,0.12)] dark:text-[var(--bookinaja-200)]";

  const itemIdle =
    "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white";

  return (
    <div className="relative flex h-full flex-col bg-white font-sans text-slate-900 dark:bg-slate-950 dark:text-white">
      {/* COLLAPSE TOGGLE BUTTON */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-5 z-[60] flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:border-[var(--bookinaja-300)] hover:text-[var(--bookinaja-600)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-[rgba(74,141,255,0.35)] dark:hover:text-[var(--bookinaja-200)]"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* LOGO AREA - DYNAMIC TENANT LOGO */}
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-slate-200 px-4 dark:border-slate-800",
          isCollapsed ? "h-16 justify-center" : "h-16 justify-start",
        )}
      >
        <Link href="/admin/dashboard" prefetch={false} className="flex items-center gap-3">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <div
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${tenantLogo})` }}
              role="img"
              aria-label="Tenant logo"
            />
          </div>
          {!isCollapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="w-36 truncate text-sm font-semibold leading-none text-slate-950 dark:text-white">
                {tenantName}
              </span>
              <span className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Admin
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* MAIN NAVIGATION */}
      <nav
        className={cn(
          "flex flex-1 flex-col overflow-y-auto scrollbar-hide",
          isCollapsed ? "gap-2 p-2 pt-3" : "gap-1 p-3",
        )}
      >
        <div className="flex flex-col gap-1">
          {operationalNavItems.filter((route) => hasAccess(route.href)).map((route) => {
            const isActive =
              pathname === route.href || pathname.startsWith(`${route.href}/`);
            return (
              <Tooltip key={route.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={route.href}
                    prefetch={false}
                    className={cn(
                      itemBase,
                      "transition-colors",
                      isActive ? itemActive : itemIdle,
                    )}
                  >
                    <route.icon
                      className={cn(
                        "shrink-0",
                        isCollapsed ? "h-4.5 w-4.5" : "h-4 w-4",
                      )}
                    />
                    {!isCollapsed && (
                      <span className="truncate text-sm font-semibold">
                        {route.label}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent
                    side="right"
                    className="ml-2 border-none bg-[var(--bookinaja-900)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
                  >
                    {route.label}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>

        {userData?.role === "owner" && growthVisible && (
          <div
            className={cn(
              "border-slate-100 dark:border-white/5",
              isCollapsed ? "mt-2 border-t border-slate-200 pt-2 dark:border-slate-800" : "mt-4 border-t border-slate-200 pt-4 dark:border-slate-800",
            )}
          >
            {!isCollapsed && (
              <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Promosi
              </div>
            )}
            <div className="flex flex-col gap-1">
              {hasAccess(growthHubNavItem.href) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={growthHubNavItem.href}
                      prefetch={false}
                        className={cn(
                          itemBase,
                          "transition-colors",
                        pathname === growthHubNavItem.href || pathname.startsWith(`${growthHubNavItem.href}/`)
                          ? itemActive
                          : itemIdle,
                      )}
                    >
                      <growthHubNavItem.icon
                        className={cn(
                          "shrink-0",
                          isCollapsed ? "h-4.5 w-4.5" : "h-4 w-4",
                        )}
                      />
                      {!isCollapsed && (
                        <span className="truncate text-sm font-semibold">
                          {growthHubNavItem.label}
                        </span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent
                      side="right"
                      className="ml-2 border-none bg-[var(--bookinaja-900)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
                    >
                      {growthHubNavItem.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
            </div>
          </div>
        )}

        {userData?.role === "owner" && (
          <div
            className={cn(
              "border-slate-100 dark:border-white/5",
              isCollapsed ? "mt-2 border-t border-slate-200 pt-2 dark:border-slate-800" : "mt-4 border-t border-slate-200 pt-4 dark:border-slate-800",
            )}
          >
            {!isCollapsed && (
              <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Settings
              </div>
            )}
            <div className="flex flex-col gap-1">
              {settingsNavItems.filter((route) => getAdminRouteGate(route.href, userData).visible).map((route) => {
                const gate = getAdminRouteGate(route.href, userData);
                const isActive =
                  pathname === route.href || pathname.startsWith(`${route.href}/`);
                return (
                  <Tooltip key={route.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={route.href}
                        prefetch={false}
                        className={cn(
                          itemBase,
                          "transition-colors",
                          isActive
                            ? itemActive
                            : gate.lockedByPlan
                              ? "text-amber-700 hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-500/10"
                              : itemIdle,
                        )}
                      >
                        <route.icon
                          className={cn(
                            "shrink-0",
                            isCollapsed ? "h-4.5 w-4.5" : "h-4 w-4",
                          )}
                        />
                        {!isCollapsed && (
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-semibold">
                              {route.label}
                            </span>
                            {gate.lockedByPlan ? (
                              <Badge className="border-0 bg-amber-600/10 px-1.5 py-0 text-[9px] font-bold uppercase tracking-[0.16em] text-current">
                                {gate.requiredPlanLabel}
                              </Badge>
                            ) : null}
                          </div>
                        )}
                      </Link>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent
                        side="right"
                        className="ml-2 border-none bg-[var(--bookinaja-900)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
                      >
                        {route.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* FOOTER: NAV USER POPOVER */}
      <div
        className={cn(
          "mt-auto border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
          isCollapsed ? "p-2" : "p-3",
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center w-full rounded-lg outline-none transition-colors hover:bg-slate-100 dark:hover:bg-slate-900 min-w-0",
                isCollapsed ? "h-10 w-10 justify-center mx-auto" : "p-2 gap-3",
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--bookinaja-600)] font-semibold uppercase text-white">
                {userData?.logo_url && userData.logo_url !== "" ? (
                  <div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${userData.logo_url})` }}
                    role="img"
                    aria-label="User avatar"
                  />
                ) : (
                  userData?.initials || "U"
                )}
              </div>

              {!isCollapsed && (
                <>
                  <div className="flex flex-col flex-1 text-left min-w-0">
                    <span className="truncate text-sm font-semibold leading-none dark:text-white">
                      {userData?.name || "Admin"}
                    </span>
                    <span className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {userData?.email || "syncing..."}
                    </span>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 text-slate-400 shrink-0 group-hover:text-[var(--bookinaja-600)] transition-colors" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-950"
            side="right"
            align="end"
            sideOffset={12}
          >
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {tenantName}
                  </div>
                  <div className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {userData?.email || "syncing..."}
                  </div>
                </div>
                <Badge className="border border-slate-200 bg-slate-50 px-2 py-0 text-[10px] font-medium uppercase text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  {String(userData?.role || "staff").toUpperCase()}
                </Badge>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="mx-2 bg-slate-100 dark:bg-slate-800" />

            <DropdownMenuGroup className="p-1 space-y-0.5">
              {userData?.role === "owner" && (
                <DropdownMenuItem
                  onClick={() => router.push("/admin/settings/bisnis")}
                  className="cursor-pointer rounded-lg px-3 py-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white dark:focus:bg-slate-900"
                >
                  <Settings className="mr-3 h-4 w-4" />
                  <span className="text-xs font-semibold">
                    Konfigurasi Bisnis
                  </span>
                </DropdownMenuItem>
              )}

                <DropdownMenuItem
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="cursor-pointer rounded-lg px-3 py-2.5 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900 dark:focus:bg-slate-900"
                >
                {resolvedTheme === "dark" ? (
                  <Sun className="mr-3 h-4 w-4 text-amber-500" />
                ) : (
                  <Moon className="mr-3 h-4 w-4 text-[var(--bookinaja-600)]" />
                )}
                <span className="text-xs font-semibold">
                  Tampilan {resolvedTheme === "dark" ? "Terang" : "Gelap"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="mx-2 bg-slate-100 dark:bg-slate-800" />

            <div className="p-1">
              <DropdownMenuItem
                onClick={handleLogout}
                className="group cursor-pointer rounded-lg px-3 py-2.5 text-red-600 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10 dark:focus:bg-red-500/10"
              >
                <LogOut className="mr-3 h-4 w-4" />
                <span className="text-xs font-semibold">
                  Putuskan Sesi
                </span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
