"use client";

import { Check, LogOut, Plus, Settings, ArrowLeftRight } from "lucide-react";
import { getRootPortalUrl } from "@/lib/tenant";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UpgradeEntry } from "@/components/dashboard/upgrade-entry";
import type {
  TrialInfo,
  WorkspaceSummary,
} from "@/components/dashboard/admin-session-context";

type WorkspaceSwitcherMenuProps = {
  currentWorkspace: WorkspaceSummary | null;
  workspaces: WorkspaceSummary[];
  trialInfo?: TrialInfo | null;
  onSwitchWorkspace: (workspace: WorkspaceSummary) => void;
  onCreateWorkspace: () => void;
  onOpenUpgrade: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
};

export function WorkspaceSwitcherMenu({
  currentWorkspace,
  workspaces,
  trialInfo,
  onSwitchWorkspace,
  onCreateWorkspace,
  onOpenUpgrade,
  onOpenSettings,
  onSignOut,
}: WorkspaceSwitcherMenuProps) {
  return (
    <>
      <DropdownMenuLabel className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Workspace
      </DropdownMenuLabel>
      <DropdownMenuGroup className="p-1">
        {workspaces.map((workspace) => {
          const active = workspace.slug === currentWorkspace?.slug;
          return (
            <DropdownMenuItem
              key={workspace.slug}
              onClick={() => onSwitchWorkspace(workspace)}
              className="cursor-pointer rounded-lg px-3 py-2.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-xs font-semibold uppercase text-white">
                  {workspace.name?.trim()?.charAt(0) || "W"}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {workspace.name}
                  </div>
                  <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {workspace.slug}
                  </div>
                </div>
              </div>
              {active ? <Check className="h-4 w-4 text-slate-900 dark:text-white" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuGroup>

      <DropdownMenuSeparator className="mx-2 bg-slate-100 dark:bg-slate-800" />

      <DropdownMenuGroup className="p-1">
        <DropdownMenuItem
          onClick={() => { window.location.href = getRootPortalUrl("/app/workspaces"); }}
          className="cursor-pointer rounded-lg px-3 py-2.5 text-slate-600 dark:text-slate-300"
        >
          <ArrowLeftRight className="mr-3 h-4 w-4" />
          <span className="text-sm font-semibold">Switch Workspace</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onCreateWorkspace}
          className="cursor-pointer rounded-lg px-3 py-2.5 text-slate-600 dark:text-slate-300"
        >
          <Plus className="mr-3 h-4 w-4" />
          <span className="text-sm font-semibold">Create New Workspace</span>
        </DropdownMenuItem>
        <UpgradeEntry variant="menu" trialInfo={trialInfo} onClick={onOpenUpgrade} />
        <DropdownMenuItem
          onClick={onOpenSettings}
          className="cursor-pointer rounded-lg px-3 py-2.5 text-slate-600 dark:text-slate-300"
        >
          <Settings className="mr-3 h-4 w-4" />
          <span className="text-sm font-semibold">Settings</span>
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator className="mx-2 bg-slate-100 dark:bg-slate-800" />

      <div className="p-1">
        <DropdownMenuItem
          onClick={onSignOut}
          className="cursor-pointer rounded-lg px-3 py-2.5 text-red-600 dark:text-red-300"
        >
          <LogOut className="mr-3 h-4 w-4" />
          <span className="text-sm font-semibold">Sign out</span>
        </DropdownMenuItem>
      </div>
    </>
  );
}
