"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { AdminSessionProvider } from "@/components/dashboard/admin-session-context";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCentralAdminAuthUrl } from "@/lib/tenant";
import {
  canAccessAdminRoute,
  getFirstAccessibleAdminPath,
  normalizeAdminPath,
} from "@/lib/admin-access";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminShellAuthError,
  AdminShellLoadError,
} from "@/components/dashboard/admin-shell-state";
import { useAdminBootstrap } from "@/components/dashboard/use-admin-bootstrap";
import {
  operationalNavItems,
  settingsNavItems,
} from "@/components/dashboard/admin-nav-config";

const AdminMainContent = memo(function AdminMainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen w-full">
      <div className="mx-auto mt-16 max-w-400 md:mt-6">{children}</div>
    </main>
  );
});

export default function DashboardInternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const {
    status,
    errorType,
    user,
    tenantName,
    tenantCategory,
    tenantSlug,
    growthVisible,
    reload,
  } = useAdminBootstrap();
  const normalizedPath = normalizeAdminPath(pathname);

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (!canAccessAdminRoute(pathname, user)) {
      router.replace(
        normalizedPath === "/admin/dashboard"
          ? getFirstAccessibleAdminPath(user)
          : "/admin/forbidden",
      );
    }
  }, [normalizedPath, pathname, router, status, user]);

  const sessionValue = useMemo(
    () => ({
      user,
      tenantName,
      tenantCategory,
      growthVisible,
      planFeatures: user?.plan_features || [],
      planFeatureMatrix: user?.plan_feature_matrix || {},
    }),
    [growthVisible, tenantCategory, tenantName, user],
  );

  if (status === "loading") {
    return <DashboardLayoutSkeleton isCollapsed={isCollapsed} />;
  }

  if (errorType === "auth") {
    return (
      <AdminShellAuthError
        onLogin={() => {
          window.location.replace(
            getCentralAdminAuthUrl({
              tenantSlug,
              next: pathname,
              reason: "tenant-mismatch",
            }),
          );
        }}
        onRetry={reload}
      />
    );
  }

  if (errorType === "unknown") {
    return <AdminShellLoadError onRetry={reload} />;
  }

  if (!user || !canAccessAdminRoute(pathname, user)) {
    return <DashboardLayoutSkeleton isCollapsed={isCollapsed} />;
  }

  const pageTitle = resolveAdminPageTitle(normalizedPath);
  const mobileNavMode = normalizedPath.startsWith("/admin/settings")
    ? "settings"
    : "operational";

  return (
    <AdminSessionProvider value={sessionValue}>
      <TooltipProvider delayDuration={0} skipDelayDuration={0}>
        <div className="tenant-admin-shell relative flex min-h-screen overflow-x-hidden bg-slate-50 selection:bg-[var(--bookinaja-200)] dark:bg-slate-950">
          <aside
            className={cn(
              "hidden md:flex fixed inset-y-0 z-50 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 transition-[width] duration-150 ease-out motion-reduce:transition-none will-change-[width]",
              isCollapsed ? "w-20" : "w-72",
            )}
          >
            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
          </aside>

          <div
            className={cn(
              "tenant-admin-content relative flex min-w-0 flex-1 flex-col pb-16 md:pb-0 transition-[padding-left] duration-150 ease-out motion-reduce:transition-none will-change-[padding-left]",
              isCollapsed ? "md:pl-20" : "md:pl-72",
            )}
          >
            <div className="fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:hidden">
              <div className="flex h-16 items-center justify-between gap-3 px-4">
                <div className="min-w-0">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {mobileNavMode === "settings" ? "Settings" : "Admin"}
                  </div>
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {pageTitle}
                  </div>
                </div>
                <MobileNav
                  mode={mobileNavMode}
                  triggerClassName="relative left-auto bottom-auto z-auto h-10 w-10 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                />
              </div>
            </div>

            <AdminMainContent>{children}</AdminMainContent>
          </div>
        </div>
      </TooltipProvider>
    </AdminSessionProvider>
  );
}

function resolveAdminPageTitle(pathname: string) {
  const matched = [...settingsNavItems, ...operationalNavItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (matched) {
    return matched.label;
  }

  if (pathname === "/admin/settings" || pathname.startsWith("/admin/settings/")) {
    return "Settings";
  }

  if (pathname === "/admin" || pathname === "/admin/dashboard") {
    return "Dashboard";
  }

  const cleanPath = pathname.replace(/^\/admin\/?/, "");
  const first = cleanPath.split("/")[0] || "dashboard";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

// --- LOADING SKELETON COMPONENT ---
function DashboardLayoutSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div className="tenant-admin-shell flex min-h-screen overflow-x-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar Shadow Skeleton */}
      <div
        className={cn(
          "hidden md:flex flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 transition-[width] duration-150 motion-reduce:transition-none",
          isCollapsed ? "w-20" : "w-72",
        )}
      >
        <Skeleton className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5" />
        <div className="mt-12 space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-6 w-6 rounded bg-slate-100 dark:bg-white/5" />
              {!isCollapsed && (
                <Skeleton className="h-4 w-32 bg-slate-100 dark:bg-white/5" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 space-y-8 px-4 pt-4 md:p-10">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 bg-slate-100 dark:bg-white/5" />
            <Skeleton className="h-10 w-64 bg-slate-100 dark:bg-white/5" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-3xl bg-slate-100 dark:bg-white/5 shadow-sm" />
          <Skeleton className="h-32 rounded-3xl bg-slate-100 dark:bg-white/5 shadow-sm" />
          <Skeleton className="h-32 rounded-3xl bg-slate-100 dark:bg-white/5 shadow-sm" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-3xl bg-slate-100 dark:bg-white/5" />
      </div>
    </div>
  );
}
