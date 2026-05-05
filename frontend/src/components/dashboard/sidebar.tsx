"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  ChevronsUpDown,
  ShieldCheck,
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
import api from "@/lib/api";
import { canAccessAdminRoute, hasPermission } from "@/lib/admin-access";
import { getTenantGrowthSettings } from "@/lib/platform-admin";
import { Badge } from "../ui/badge";
import {
  growthHubNavItem,
  operationalNavItems,
  settingsNavItems,
} from "./admin-nav-config";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
}

const FALLBACK_LOGO = "https://cdn.bookinaja.com/tenants/logo_frameless.png";

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
  const params = useParams();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const [userData, setUserData] = useState<SidebarUser | null>(null);
  const [tenantName, setTenantName] = useState<string>(String(params.tenant || "HUB"));
  const [growthVisible, setGrowthVisible] = useState(false);

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
            setGrowthVisible(false);
          }
          return;
        }

        try {
          const [profileRes, growthRes] = await Promise.all([
            api.get("/admin/profile"),
            getTenantGrowthSettings(),
          ]);
          if (active) {
            setTenantName(profileRes.data?.name || String(params.tenant || "HUB"));
            setGrowthVisible(Boolean(growthRes.enable_discovery_posts));
          }
        } catch {
          if (active) {
            setTenantName(String(params.tenant || "HUB"));
            setGrowthVisible(false);
          }
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [params.tenant]);

  // Logic Fallback Logo
  const tenantLogo =
    userData?.logo_url && userData.logo_url !== ""
      ? userData.logo_url
      : FALLBACK_LOGO;

  const handleLogout = () => {
    clearTenantSession({ keepTenantSlug: true });
    window.location.href = "/admin/login";
  };

  const hasAccess = (href: string) => canAccessAdminRoute(href, userData);

  return (
    <div className="relative flex h-full flex-col border-r border-[var(--sidebar-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(243,252,251,0.94))] font-sans text-[var(--sidebar-foreground)] transition-colors duration-200 dark:bg-[linear-gradient(180deg,rgba(9,27,32,0.9),rgba(5,17,21,0.97))]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(129,216,208,0.18),transparent_58%)]" />
      {/* COLLAPSE TOGGLE BUTTON */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-7 z-[60] flex h-6 w-6 items-center justify-center rounded-full border border-[var(--sidebar-border)] bg-[var(--card)] text-slate-500 shadow-sm transition-colors hover:bg-[var(--sidebar-primary)] hover:text-[var(--sidebar-primary-foreground)] dark:text-slate-300"
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
          "relative flex items-center transition-all shrink-0 px-4",
          isCollapsed ? "h-18 justify-center" : "h-20 justify-start px-6",
        )}
      >
        <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5 shadow-[0_12px_28px_rgba(15,23,42,0.12)] ring-1 ring-black/5 dark:ring-white/10">
            <div
              className="h-full w-full bg-cover bg-center transition-transform group-hover:scale-110 duration-500"
              style={{ backgroundImage: `url(${tenantLogo})` }}
              role="img"
              aria-label="Tenant logo"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300 min-w-0">
              <span className="w-36 truncate text-sm font-semibold leading-none text-slate-950 dark:text-white">
                {tenantName}
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-100)]">
                Bookinaja Admin
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* MAIN NAVIGATION */}
      <nav
        className={cn(
          "flex flex-col flex-1 overflow-y-auto scrollbar-hide",
          isCollapsed ? "gap-2 p-2 pt-3" : "gap-1 p-3 pt-4",
        )}
      >
        <div
          className={cn(
          "flex flex-col relative",
          isCollapsed
              ? "gap-1 rounded-[1.4rem] border border-slate-100 bg-white/80 p-1.5 shadow-sm dark:border-white/8 dark:bg-white/[0.04]"
              : "gap-1",
          )}
        >
          {operationalNavItems.filter((route) => hasAccess(route.href)).map((route) => {
            const isActive =
              pathname === route.href || pathname.startsWith(`${route.href}/`);
            return (
              <Tooltip key={route.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={route.href}
                    className={cn(
                      "group flex items-center transition-all duration-200",
                      isCollapsed
                        ? "h-9 w-9 justify-center mx-auto rounded-xl"
                        : "px-3 py-2.5 w-full gap-3 rounded-xl",
                      isActive
                        ? "bg-[linear-gradient(135deg,#0d2b2f_0%,#1e8f92_58%,#81d8d0_100%)] text-[var(--sidebar-primary-foreground)] shadow-[0_18px_40px_rgba(30,143,146,0.24)]"
                        : "text-slate-500 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-white/5 hover:text-[var(--bookinaja-600)] dark:hover:text-white",
                    )}
                  >
                    <route.icon
                      className={cn(
                        "shrink-0",
                        isCollapsed ? "h-4.5 w-4.5" : "h-4 w-4",
                        isActive && "scale-110",
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
              isCollapsed ? "mt-1 border-t pt-2" : "mt-3 border-t pt-3",
            )}
          >
            {!isCollapsed && (
              <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Promosi
              </div>
            )}
            <div className="flex flex-col gap-1">
              {hasAccess(growthHubNavItem.href) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={growthHubNavItem.href}
                      className={cn(
                        "group flex items-center transition-colors",
                        isCollapsed
                          ? "mx-auto h-9 w-9 justify-center rounded-xl"
                          : "w-full gap-3 rounded-xl px-3 py-2.5",
                        pathname === growthHubNavItem.href ||
                          pathname.startsWith(`${growthHubNavItem.href}/`)
                          ? "bg-[linear-gradient(135deg,#0d2b2f_0%,#1e8f92_58%,#81d8d0_100%)] text-[var(--sidebar-primary-foreground)] shadow-[0_18px_40px_rgba(30,143,146,0.24)]"
                          : "text-slate-500 hover:bg-white/80 hover:text-[var(--bookinaja-600)] dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
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
              isCollapsed ? "mt-1 border-t pt-2" : "mt-3 border-t pt-3",
            )}
          >
            {!isCollapsed && (
              <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Settings
              </div>
            )}
            <div className="flex flex-col gap-1">
              {settingsNavItems.filter((route) => hasAccess(route.href)).map((route) => {
                const isActive =
                  pathname === route.href || pathname.startsWith(`${route.href}/`);
                return (
                  <Tooltip key={route.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={route.href}
                        className={cn(
                          "group flex items-center transition-colors",
                          isCollapsed
                            ? "mx-auto h-9 w-9 justify-center rounded-xl"
                            : "w-full gap-3 rounded-xl px-3 py-2.5",
                          isActive
                            ? "bg-[linear-gradient(135deg,#0d2b2f_0%,#1e8f92_58%,#81d8d0_100%)] text-[var(--sidebar-primary-foreground)] shadow-[0_18px_40px_rgba(30,143,146,0.24)]"
                            : "text-slate-500 hover:bg-white/80 hover:text-[var(--bookinaja-600)] dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
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
          </div>
        )}
      </nav>

      {/* FOOTER: NAV USER POPOVER */}
      <div
        className={cn(
          "mt-auto border-t border-[var(--sidebar-border)] bg-white/60 dark:bg-white/[0.03]",
          isCollapsed ? "p-2" : "p-3",
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center w-full transition-all duration-200 outline-none group rounded-xl hover:bg-[var(--sidebar-accent)] dark:hover:bg-white/5 min-w-0",
                isCollapsed ? "h-10 w-10 justify-center mx-auto" : "p-2 gap-3",
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--sidebar-primary)] font-semibold uppercase text-[var(--sidebar-primary-foreground)] shadow-sm">
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
                      {userData?.name || "Admin Sultan"}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight truncate mt-1.5">
                      {userData?.email || "syncing..."}
                    </span>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 text-slate-400 shrink-0 group-hover:text-[var(--bookinaja-600)] transition-colors" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-64 rounded-2xl border-[var(--sidebar-border)] bg-[var(--card)] p-2 shadow-xl"
            side="right"
            align="end"
            sideOffset={12}
          >
            <DropdownMenuLabel className="p-4">
              <div className="space-y-3 rounded-xl bg-[var(--bookinaja-900)] p-4 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-semibold leading-none">
                      {tenantName}
                    </div>
                    <div className="text-[8px] font-bold uppercase tracking-[0.3em] text-slate-300">
                      Command Center
                    </div>
                  </div>
                  <Badge className="border-none bg-white/10 px-2 py-0 text-[10px] font-semibold uppercase text-white">
                    {String(userData?.role || "staff").toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em] text-[var(--bookinaja-100)]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {userData?.role === "owner" ? "Owner Access" : "Staff Access"}
                </div>
                {userData?.role !== "owner" && (
                  <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-300">
                    {hasPermission(userData, "bookings.read")
                      ? "Akses operasional aktif"
                      : "Akses operasional terbatas"}
                  </div>
                )}
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 mx-2" />

            <DropdownMenuGroup className="p-1 space-y-0.5">
              {userData?.role === "owner" && (
                <DropdownMenuItem
                  onClick={() => router.push("/admin/settings/bisnis")}
                  className="rounded-xl px-3 py-3 cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-[var(--sidebar-accent)] dark:hover:bg-white/5 focus:bg-[var(--sidebar-accent)] dark:focus:bg-white/5 focus:text-[var(--bookinaja-600)] dark:focus:text-white transition-all"
                >
                  <Settings className="mr-3 h-4 w-4" />
                  <span className="text-xs font-semibold">
                    Konfigurasi Bisnis
                  </span>
                </DropdownMenuItem>
              )}

                <DropdownMenuItem
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="rounded-xl px-3 py-3 cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-[var(--sidebar-accent)] dark:hover:bg-white/5 focus:bg-[var(--sidebar-accent)] dark:focus:bg-white/5 transition-all"
                >
                {resolvedTheme === "dark" ? (
                  <Sun className="mr-3 h-4 w-4 text-amber-500 fill-amber-500/20" />
                ) : (
                  <Moon className="mr-3 h-4 w-4 text-[var(--bookinaja-600)] fill-[color:rgba(129,216,208,0.22)]" />
                )}
                <span className="text-xs font-semibold">
                  Tampilan {resolvedTheme === "dark" ? "Terang" : "Gelap"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 mx-2" />

            <div className="p-1">
              <DropdownMenuItem
                onClick={handleLogout}
                className="rounded-xl px-3 py-3 cursor-pointer text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 focus:bg-red-50 dark:focus:bg-red-500/10 transition-all group"
              >
                <LogOut className="mr-3 h-4 w-4 transition-transform group-hover:-translate-x-1" />
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
