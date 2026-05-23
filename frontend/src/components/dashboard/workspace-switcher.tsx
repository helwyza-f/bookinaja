"use client";

import { useEffect, useState } from "react";
import { getCookie } from "cookies-next";
import { ChevronDown, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  type TrialInfo,
  type WorkspaceSummary,
} from "@/components/dashboard/admin-session-context";
import { WorkspaceSwitcherMenu } from "@/components/dashboard/workspace-switcher-menu";
import { listWorkspaces } from "@/lib/workspace-client";

type WorkspaceSwitcherProps = {
  currentWorkspace: WorkspaceSummary | null;
  trialInfo?: TrialInfo | null;
  collapsed?: boolean;
  onSwitchWorkspace: (workspace: WorkspaceSummary) => void;
  onCreateWorkspace: () => void;
  onOpenUpgrade: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
};

export function WorkspaceSwitcher({
  currentWorkspace,
  trialInfo,
  collapsed = false,
  onSwitchWorkspace,
  onCreateWorkspace,
  onOpenUpgrade,
  onOpenSettings,
  onSignOut,
}: WorkspaceSwitcherProps) {
  const [items, setItems] = useState<WorkspaceSummary[]>(currentWorkspace ? [currentWorkspace] : []);

  useEffect(() => {
    let alive = true;
    const hasAccountSession = Boolean(getCookie("account_token"));
    if (!hasAccountSession) {
      return () => {
        alive = false;
      };
    }
    void listWorkspaces()
      .then((workspaces) => {
        if (!alive) return;
        const mapped = workspaces.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          role: item.role,
          onboarding_completed: item.onboarding_state?.is_completed,
        }));
        setItems(mapped.length > 0 ? mapped : currentWorkspace ? [currentWorkspace] : []);
      })
      .catch(() => {
        if (!alive || !currentWorkspace) return;
        setItems([currentWorkspace]);
      });
    return () => {
      alive = false;
    };
  }, [currentWorkspace]);

  const fallbackWorkspace = currentWorkspace || items[0] || null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center rounded-xl border border-slate-200 bg-white outline-none transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900",
            collapsed ? "h-10 w-10 justify-center px-0" : "gap-3 px-3 py-2.5",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-xs font-semibold uppercase text-white">
            {fallbackWorkspace?.name?.trim()?.charAt(0) || "W"}
          </div>
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {fallbackWorkspace?.name || "Workspace"}
                </div>
                <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {fallbackWorkspace?.role || "owner"}
                </div>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
            </>
          ) : (
            <ChevronDown className="hidden" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={collapsed ? "right" : "bottom"}
        align="start"
        sideOffset={collapsed ? 12 : 8}
        className="w-72 rounded-2xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-950"
      >
        <WorkspaceSwitcherMenu
          currentWorkspace={currentWorkspace}
          workspaces={items}
          trialInfo={trialInfo}
          onSwitchWorkspace={onSwitchWorkspace}
          onCreateWorkspace={onCreateWorkspace}
          onOpenUpgrade={onOpenUpgrade}
          onOpenSettings={onOpenSettings}
          onSignOut={onSignOut}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
