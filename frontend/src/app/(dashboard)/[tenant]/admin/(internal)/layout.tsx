"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import api from "@/lib/api";
import {
  clearTenantSession,
  isTenantAuthError,
  syncTenantCookies,
} from "@/lib/tenant-session";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardInternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const res = await api.get("/auth/me");

        if (active) {
          // Sinkronkan data tenant ke cookie untuk interoperabilitas header API
          const userData = res.data.user;
          syncTenantCookies(null, userData.tenant_id);

          setCheckingSession(false);
        }
      } catch (error) {
        if (active && isTenantAuthError(error)) {
          clearTenantSession({ keepTenantSlug: true });
          router.replace("/admin/login");
          return;
        }

        if (active) {
          setCheckingSession(false);
        }
      }
    };

    checkSession();
    return () => {
      active = false;
    };
  }, [router]);

  if (checkingSession) {
    return <DashboardLayoutSkeleton isCollapsed={isCollapsed} />;
  }

  const pageTitle = (() => {
    const cleanPath = pathname.replace(/^\/[a-zA-Z0-9-]+\/admin\//, "");
    const first = cleanPath.split("/")[0] || "dashboard";
    switch (first) {
      case "dashboard":
        return "Dashboard";
      case "bookings":
        return "Bookings";
      case "resources":
        return "Resources";
      case "customers":
        return "Customers";
      case "fnb":
        return "F&B";
      case "expenses":
        return "Expenses";
      case "settings":
        return "Settings";
      case "pos":
        return "POS";
      case "":
        return "Dashboard";
      default:
        return first.charAt(0).toUpperCase() + first.slice(1);
    }
  })();

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <div className="tenant-admin-shell flex min-h-screen overflow-x-hidden bg-slate-50 selection:bg-blue-500/30 dark:bg-[#050505]">
        {/* SIDEBAR */}
        <aside
          className={cn(
            "hidden md:flex flex-col fixed inset-y-0 z-50 transition-all duration-200 ease-in-out border-r border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a]",
            isCollapsed ? "w-20" : "w-72",
          )}
        >
          <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        </aside>

        {/* MAIN CONTENT */}
        <div
          className={cn(
            "tenant-admin-content flex min-w-0 flex-1 flex-col transition-all duration-200 ease-in-out pb-16 md:pb-0",
            isCollapsed ? "md:pl-20" : "md:pl-72",
          )}
        >
          <div className="fixed inset-x-0 top-0 z-40 md:hidden border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-white/5 dark:bg-[#080808]/95">
            <div className="flex h-17.5 items-center justify-between gap-3 px-4">
              <div className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                  Admin Tenant
                </div>
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {pageTitle}
                </div>
              </div>
              <MobileNav
                mode="operational"
                triggerClassName="relative left-auto bottom-auto z-auto h-10 w-10 rounded-xl border border-slate-200 bg-slate-950 text-white shadow-sm hover:bg-slate-900"
              />
            </div>
          </div>

          <main className="min-h-screen w-full">
            <div className="mx-auto mt-16 max-w-400 md:mt-6">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

// --- LOADING SKELETON COMPONENT ---
function DashboardLayoutSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div className="tenant-admin-shell flex min-h-screen overflow-x-hidden bg-slate-50 dark:bg-[#050505]">
      {/* Sidebar Shadow Skeleton */}
      <div
        className={cn(
          "hidden md:flex flex-col border-r border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-4 transition-all duration-300",
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
