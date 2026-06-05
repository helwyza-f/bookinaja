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
    ? "mx-auto flex h-10 w-10 items-center justify-center rounded-xl"
    : "flex w-full items-center gap-3 rounded-xl px-3 py-2.5";

  const itemActive =
    "border border-[var(--bookinaja-200)] bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] shadow-sm dark:border-[rgba(74,141,255,0.25)] dark:bg-[rgba(74,141,255,0.12)] dark:text-[var(--bookinaja-200)]";

  const itemIdle =
    "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white";

  const fallbackWorkspace =
    currentWorkspace || {
      name: tenantName,
      slug: "",
      role: userData?.role || "owner",
    };

  return (
    <div className="relative flex h-full flex-col bg-[var(--admin-surface)] font-sans text-slate-900 dark:text-white">
      <div className={cn("px-3 py-3", isCollapsed ? "px-2 pb-2" : "pb-3")}>
        {isCollapsed ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="group relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-white outline-none ring-1 ring-[var(--admin-line)] transition duration-200 hover:ring-slate-300 dark:bg-slate-950 dark:hover:ring-slate-700"
              aria-label="Expand sidebar"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-xs font-semibold uppercase text-white transition duration-200 group-hover:scale-[0.96] group-hover:opacity-15">
                {fallbackWorkspace.name?.trim()?.charAt(0) || "W"}
              </div>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-white/92 opacity-0 transition duration-200 group-hover:opacity-100 dark:bg-slate-950/92">
                <ChevronRight className="h-4 w-4 text-slate-500 dark:text-slate-300" />
              </div>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <WorkspaceSwitcher
                currentWorkspace={fallbackWorkspace}
                trialInfo={trialInfo}
                onSwitchWorkspace={onSwitchWorkspace}
                onCreateWorkspace={onCreateWorkspace}
                onOpenUpgrade={onOpenUpgrade}
                onOpenSettings={onOpenSettings}
                onSignOut={onSignOut}
              />
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--admin-line)] bg-white text-slate-500 transition duration-200 hover:border-[var(--bookinaja-300)] hover:text-[var(--bookinaja-600)] dark:bg-slate-950 dark:text-slate-300 dark:hover:border-[rgba(74,141,255,0.35)] dark:hover:text-[var(--bookinaja-200)]"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <nav
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          isCollapsed ? "gap-2 p-2 pt-3" : "gap-1 px-3 pb-3 pt-1",
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
              isCollapsed ? "border-t border-[var(--admin-line)] pt-2" : "border-t border-[var(--admin-line)] pt-3",
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
