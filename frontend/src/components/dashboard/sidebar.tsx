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
import {
  isAdminNavItemActive,
  operationalNavItems,
  workspaceUtilityNavItems,
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
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          isCollapsed ? "gap-2 p-2 pt-3" : "gap-1 p-3",
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
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
        </div>

        {userData?.role === "owner" ? (
          <div
            className={cn(
              "mt-auto shrink-0",
              isCollapsed ? "border-t border-slate-200 pt-2 dark:border-slate-800" : "border-t border-slate-200 pt-3 dark:border-slate-800",
            )}
          >
            <div className={cn("flex flex-col gap-1", isCollapsed ? "items-center" : "")}>
              {workspaceUtilityNavItems.map((item) => {
                const active =
                  item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;
                const commonClass = cn(
                  itemBase,
                  "transition-colors",
                  active ? itemActive : itemIdle,
                  item.key === "upgrade" &&
                    "border border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/15",
                );
                const content = (
                  <>
                    <Icon className={cn("shrink-0", isCollapsed ? "h-4.5 w-4.5" : "h-4 w-4")} />
                    {!isCollapsed ? (
                      <span className="truncate text-sm font-semibold">{item.label}</span>
                    ) : null}
                  </>
                );

                const node =
                  item.kind === "upgrade" ? (
                    <button type="button" onClick={onOpenUpgrade} className={commonClass}>
                      {content}
                    </button>
                  ) : item.kind === "settings" ? (
                    <button type="button" onClick={onOpenSettings} className={commonClass}>
                      {content}
                    </button>
                  ) : item.kind === "external" && item.href ? (
                    <a href={item.href} target="_blank" rel="noreferrer" className={commonClass}>
                      {content}
                    </a>
                  ) : item.href ? (
                    <Link href={item.href} prefetch={false} className={commonClass}>
                      {content}
                    </Link>
                  ) : null;

                if (!node) return null;

                return (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>{node}</TooltipTrigger>
                    {isCollapsed ? (
                      <TooltipContent side="right" className="ml-2 border-none bg-[var(--bookinaja-900)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                        {item.label}
                      </TooltipContent>
                    ) : null}
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ) : null}
      </nav>
    </div>
  );
}
