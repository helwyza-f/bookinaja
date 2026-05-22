"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type WorkspaceSummary,
  useAdminSession,
} from "@/components/dashboard/admin-session-context";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";
import { UpgradeEntry } from "@/components/dashboard/upgrade-entry";
import { SettingsCenterTrigger } from "@/components/dashboard/settings-center-trigger";
import {
  growthHubNavItem,
  isAdminNavItemActive,
  operationalNavItems,
} from "@/components/dashboard/admin-nav-config";
import { canAccessAdminRoute } from "@/lib/admin-access";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  onOpenSettings: () => void;
  onOpenUpgrade: () => void;
  onCreateWorkspace: () => void;
  onSwitchWorkspace: (workspace: WorkspaceSummary) => void;
  onSignOut: () => void;
}

type SidebarUser = {
  name?: string;
  email?: string;
  role?: string;
  permission_keys?: string[];
};

export function Sidebar({
  isCollapsed,
  setIsCollapsed,
  onOpenSettings,
  onOpenUpgrade,
  onCreateWorkspace,
  onSwitchWorkspace,
  onSignOut,
}: SidebarProps) {
  const pathname = usePathname();
  const {
    user,
    tenantName,
    growthVisible,
    currentWorkspace,
    trialInfo,
  } = useAdminSession();
  const userData = (user as SidebarUser | null) ?? null;

  const hasAccess = (href: string) => canAccessAdminRoute(href, userData);
  const operationalHrefs = operationalNavItems.map((item) => item.href);

  const itemBase = isCollapsed
    ? "mx-auto flex h-10 w-10 items-center justify-center rounded-lg"
    : "flex w-full items-center gap-3 rounded-lg px-3 py-2.5";

  const itemActive =
    "border border-[var(--bookinaja-200)] bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:border-[rgba(74,141,255,0.25)] dark:bg-[rgba(74,141,255,0.12)] dark:text-[var(--bookinaja-200)]";

  const itemIdle =
    "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white";

  return (
    <div className="relative flex h-full flex-col bg-white font-sans text-slate-900 dark:bg-slate-950 dark:text-white">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-5 z-[60] flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:border-[var(--bookinaja-300)] hover:text-[var(--bookinaja-600)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-[rgba(74,141,255,0.35)] dark:hover:text-[var(--bookinaja-200)]"
      >
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      <div className={cn("border-b border-slate-200 px-3 py-3 dark:border-slate-800", isCollapsed ? "flex justify-center" : "")}>
        <WorkspaceSwitcher
          collapsed={isCollapsed}
          currentWorkspace={
            currentWorkspace || {
              name: tenantName,
              slug: "",
              role: userData?.role || "owner",
            }
          }
          trialInfo={trialInfo}
          onSwitchWorkspace={onSwitchWorkspace}
          onCreateWorkspace={onCreateWorkspace}
          onOpenUpgrade={onOpenUpgrade}
          onOpenSettings={onOpenSettings}
          onSignOut={onSignOut}
        />
      </div>

      <nav
        className={cn(
          "flex flex-1 flex-col overflow-y-auto scrollbar-hide",
          isCollapsed ? "gap-2 p-2 pt-3" : "gap-1 p-3",
        )}
      >
        <div className="flex flex-col gap-1">
          {operationalNavItems.filter((route) => hasAccess(route.href)).map((route) => {
            const isActive = isAdminNavItemActive(pathname, route.href, operationalHrefs);
            return (
              <Tooltip key={route.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={route.href}
                    prefetch={false}
                    className={cn(itemBase, "transition-colors", isActive ? itemActive : itemIdle)}
                  >
                    <route.icon className={cn("shrink-0", isCollapsed ? "h-4.5 w-4.5" : "h-4 w-4")} />
                    {!isCollapsed ? (
                      <span className="truncate text-sm font-semibold">{route.label}</span>
                    ) : null}
                  </Link>
                </TooltipTrigger>
                {isCollapsed ? (
                  <TooltipContent side="right" className="ml-2 border-none bg-[var(--bookinaja-900)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                    {route.label}
                  </TooltipContent>
                ) : null}
              </Tooltip>
            );
          })}
        </div>

        {userData?.role === "owner" && growthVisible && hasAccess(growthHubNavItem.href) ? (
          <div
            className={cn(
              isCollapsed ? "mt-2 border-t border-slate-200 pt-2 dark:border-slate-800" : "mt-4 border-t border-slate-200 pt-4 dark:border-slate-800",
            )}
          >
            {!isCollapsed ? (
              <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Promosi
              </div>
            ) : null}
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
                  <growthHubNavItem.icon className={cn("shrink-0", isCollapsed ? "h-4.5 w-4.5" : "h-4 w-4")} />
                  {!isCollapsed ? (
                    <span className="truncate text-sm font-semibold">{growthHubNavItem.label}</span>
                  ) : null}
                </Link>
              </TooltipTrigger>
              {isCollapsed ? (
                <TooltipContent side="right" className="ml-2 border-none bg-[var(--bookinaja-900)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                  {growthHubNavItem.label}
                </TooltipContent>
              ) : null}
            </Tooltip>
          </div>
        ) : null}

        {userData?.role === "owner" ? (
          <div
            className={cn(
              isCollapsed ? "mt-2 border-t border-slate-200 pt-2 dark:border-slate-800" : "mt-4 border-t border-slate-200 pt-4 dark:border-slate-800",
            )}
          >
            {!isCollapsed ? (
              <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Workspace
              </div>
            ) : null}
            <div className={cn("flex flex-col gap-2", isCollapsed ? "items-center" : "px-1")}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <UpgradeEntry
                      onClick={onOpenUpgrade}
                      trialInfo={trialInfo}
                      iconOnly={isCollapsed}
                    />
                  </div>
                </TooltipTrigger>
                {isCollapsed ? (
                  <TooltipContent side="right" className="ml-2 border-none bg-[var(--bookinaja-900)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                    Upgrade
                  </TooltipContent>
                ) : null}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <SettingsCenterTrigger
                      onClick={onOpenSettings}
                      iconOnly={isCollapsed}
                    />
                  </div>
                </TooltipTrigger>
                {isCollapsed ? (
                  <TooltipContent side="right" className="ml-2 border-none bg-[var(--bookinaja-900)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                    Settings
                  </TooltipContent>
                ) : null}
              </Tooltip>
            </div>
          </div>
        ) : null}
      </nav>
    </div>
  );
}
