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
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { canAccessAdminRoute } from "@/lib/admin-access";
import {
  type WorkspaceSummary,
  useAdminSession,
} from "@/components/dashboard/admin-session-context";
import {
  isAdminNavItemActive,
  operationalNavItems,
  workspaceUtilityNavItems,
  type AdminNavItem,
} from "@/components/dashboard/admin-nav-config";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";

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
  "border border-[var(--bookinaja-200)] bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] shadow-sm dark:border-[rgba(74,141,255,0.25)] dark:bg-[rgba(74,141,255,0.12)] dark:text-[var(--bookinaja-200)]";

const idleItemClass =
  "text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-900";

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
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className={cn(
            "z-50 h-10 w-10 rounded-xl border border-[var(--bookinaja-600)] bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)] md:hidden",
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
        className="w-[88vw] max-w-[340px] gap-0 overflow-hidden border-r border-[var(--admin-line)] bg-[var(--admin-surface)] p-0 text-slate-950 shadow-[0_24px_60px_rgba(15,23,42,0.16)] dark:text-white"
      >
        <div className="flex h-full flex-col overflow-hidden">
          <SheetHeader className="border-b border-[var(--admin-line)] px-4 py-3 text-left">
            <SheetTitle className="sr-only">Admin navigation</SheetTitle>
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
                className="h-9 w-9 shrink-0 rounded-xl"
                aria-label="Tutup navigasi"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3">
            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto scrollbar-hide">
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
                    "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      active ? activeItemClass : idleItemClass,
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1 truncate font-medium">{item.label}</div>
                  </Link>
                );
              })}
            </nav>

            {userData?.role === "owner" ? (
              <div className="mt-auto shrink-0 border-t border-[var(--admin-line)] pt-3">
                <div className="space-y-1">
                  {workspaceUtilityNavItems.map((item) => {
                    const active =
                      item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`));
                    const Icon = item.icon;
                    const className = cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      active ? activeItemClass : idleItemClass,
                      item.key === "upgrade" &&
                        "border border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/15",
                    );

                    const content = (
                      <>
                        <Icon className="h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1 truncate font-medium">{item.label}</div>
                      </>
                    );

                    if (item.kind === "upgrade") {
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className={className}
                          onClick={() => {
                            setOpen(false);
                            onOpenUpgrade();
                          }}
                        >
                          {content}
                        </button>
                      );
                    }

                    if (item.kind === "settings") {
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className={className}
                          onClick={() => {
                            setOpen(false);
                            onOpenSettings();
                          }}
                        >
                          {content}
                        </button>
                      );
                    }

                    if (item.kind === "external" && item.href) {
                      return (
                        <a
                          key={item.key}
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className={className}
                          onClick={() => setOpen(false)}
                        >
                          {content}
                        </a>
                      );
                    }

                    if (!item.href) return null;

                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        prefetch={false}
                        onClick={() => setOpen(false)}
                        className={className}
                      >
                        {content}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
