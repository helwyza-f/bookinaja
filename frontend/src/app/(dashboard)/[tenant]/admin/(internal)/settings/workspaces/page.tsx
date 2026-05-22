"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { WorkspaceSummary } from "@/components/dashboard/admin-session-context";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { getRootPortalUrl } from "@/lib/tenant";
import { listWorkspaces } from "@/lib/workspace-client";
import { resolveWorkspaceSwitchUrl } from "@/lib/workspace-routing";
import { cn } from "@/lib/utils";

const WORKSPACE_LIMIT = 3;

export default function WorkspacesSettingsPage() {
  const { currentWorkspace, workspaces, tenantName } = useAdminSession();
  const [globalWorkspaces, setGlobalWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const sessionItems = useMemo(
    () =>
      workspaces && workspaces.length > 0
        ? workspaces
        : currentWorkspace
          ? [currentWorkspace]
          : [],
    [currentWorkspace, workspaces],
  );

  useEffect(() => {
    let alive = true;

    async function loadGlobalWorkspaces() {
      setLoading(true);
      try {
        const items = await listWorkspaces();
        if (!alive) return;
        setGlobalWorkspaces(
          items.map((item) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
            role: item.role,
            onboarding_completed: item.onboarding_state?.is_completed,
          })),
        );
      } catch {
        if (alive) setGlobalWorkspaces([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadGlobalWorkspaces();

    return () => {
      alive = false;
    };
  }, []);

  const items = globalWorkspaces.length > 0 ? globalWorkspaces : sessionItems;

  const handleSwitch = (slug?: string) => {
    if (!slug || slug === currentWorkspace?.slug) return;
    window.location.assign(
      resolveWorkspaceSwitchUrl(
        slug,
        "/admin/settings/workspaces",
        window.location.search,
      ),
    );
  };

  const handleCreateWorkspace = () => {
    window.location.assign(getRootPortalUrl("/app/workspaces/new"));
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 pb-20">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Workspaces
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your workspaces and switch between them.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((workspace) => {
          const active = workspace.slug === currentWorkspace?.slug;
          return (
            <button
              key={workspace.slug || workspace.id || workspace.name}
              type="button"
              onClick={() => handleSwitch(workspace.slug)}
              className={cn(
                "flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-colors",
                active
                  ? "border-[var(--bookinaja-200)] bg-[var(--bookinaja-50)] text-slate-950 dark:border-[rgba(74,141,255,0.25)] dark:bg-[rgba(74,141,255,0.12)] dark:text-white"
                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:hover:bg-white/[0.04]",
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-sm font-bold uppercase text-white">
                {workspace.name?.trim()?.charAt(0) || tenantName?.charAt(0) || "W"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                  {workspace.name || tenantName || "Workspace"}
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {active ? "Current workspace" : workspace.slug}
                </div>
              </div>
              {active ? <Check className="h-4 w-4 shrink-0 text-slate-950 dark:text-white" /> : null}
            </button>
          );
        })}

        {items.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-400">
            {loading ? "Memuat workspace..." : "Belum ada workspace aktif di sesi ini."}
          </Card>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleCreateWorkspace}
          className="h-11 rounded-xl bg-white px-5 dark:bg-transparent"
          disabled={items.length >= WORKSPACE_LIMIT}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Workspace
        </Button>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {items.length}/{WORKSPACE_LIMIT}
        </span>
      </div>
    </div>
  );
}
