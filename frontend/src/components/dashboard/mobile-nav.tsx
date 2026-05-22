"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";
import { canAccessAdminRoute } from "@/lib/admin-access";
import {
  type WorkspaceSummary,
  useAdminSession,
} from "@/components/dashboard/admin-session-context";
import {
  growthHubNavItem,
  isAdminNavItemActive,
  operationalNavItems,
  type AdminNavItem,
} from "@/components/dashboard/admin-nav-config";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";
import { UpgradeEntry } from "@/components/dashboard/upgrade-entry";
import { SettingsCenterTrigger } from "@/components/dashboard/settings-center-trigger";

type MobileNavMode = "operational" | "settings";

type MobileNavProps = {
  mode: MobileNavMode;
  triggerClassName?: string;
  onOpenSettings: () => void;
  onOpenUpgrade: () => void;
  onCreateWorkspace: () => void;
  onSwitchWorkspace: (workspace: WorkspaceSummary) => void;
  onSignOut: () => void;
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

export function MobileNav({
  mode,
  triggerClassName,
  onOpenSettings,
  onOpenUpgrade,
  onCreateWorkspace,
  onSwitchWorkspace,
  onSignOut,
}: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const {
    user,
    tenantName,
    growthVisible,
    currentWorkspace,
    trialInfo,
  } = useAdminSession();
  const userData = (user as MobileUser | null) ?? null;

  const items = useMemo<AdminNavItem[]>(() => {
    const source = mode === "settings" ? [] : operationalNavItems;
    return source.filter((item) => canAccessAdminRoute(item.href, userData));
  }, [mode, userData]);
  const operationalHrefs = useMemo(
    () => operationalNavItems.map((item) => item.href),
    [],
  );
  const marketplaceItems = useMemo(
    () =>
      growthVisible && canAccessAdminRoute(growthHubNavItem.href, userData)
        ? [growthHubNavItem]
        : [],
    [growthVisible, userData],
  );

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
              <div className="min-w-0 flex-1">
                <WorkspaceSwitcher
                  currentWorkspace={
                    currentWorkspace || {
                      name: tenantName,
                      slug: "",
                      role: userData?.role || "owner",
                    }
                  }
                  trialInfo={trialInfo}
                  onSwitchWorkspace={(workspace) => {
                    setOpen(false);
                    onSwitchWorkspace(workspace);
                  }}
                  onCreateWorkspace={() => {
                    setOpen(false);
                    onCreateWorkspace();
                  }}
                  onOpenUpgrade={() => {
                    setOpen(false);
                    onOpenUpgrade();
                  }}
                  onOpenSettings={() => {
                    setOpen(false);
                    onOpenSettings();
                  }}
                  onSignOut={() => {
                    setOpen(false);
                    onSignOut();
                  }}
                />
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
                  mode === "operational"
                    ? isAdminNavItemActive(pathname, item.href, operationalHrefs)
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

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

            {mode === "operational" && userData?.role === "owner" && marketplaceItems.length > 0 ? (
              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
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
              </div>
            ) : null}

            {userData?.role === "owner" ? (
              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Workspace
                </div>
                <div className="space-y-2 px-3">
                  <UpgradeEntry
                    variant="mobile"
                    trialInfo={trialInfo}
                    onClick={() => {
                      setOpen(false);
                      onOpenUpgrade();
                    }}
                  />
                  <SettingsCenterTrigger
                    onClick={() => {
                      setOpen(false);
                      onOpenSettings();
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
