"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  const [role, setRole] = useState<string>("staff");

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const res = await api.get("/auth/me");

        if (active) {
          // Sinkronkan data tenant ke cookie untuk interoperabilitas header API
          const userData = res.data.user;
          setRole(userData?.role || "staff");
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

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <div className="tenant-admin-shell flex min-h-screen overflow-x-hidden bg-slate-50 selection:bg-blue-500/30 dark:bg-[#050505]">
        {/* SIDEBAR */}
        <aside
          className={cn(
            "hidden md:flex flex-col fixed inset-y-0 z-50 transition-all duration-300 ease-in-out border-r border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a]",
            isCollapsed ? "w-20" : "w-72",
          )}
        >
          <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        </aside>

        {/* MAIN CONTENT */}
        <div
          className={cn(
            "tenant-admin-content flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out pb-24 md:pb-0",
            isCollapsed ? "md:pl-20" : "md:pl-72",
          )}
        >
          <main className="min-h-screen w-full p-4 md:p-10">
            <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
              {children}
            </div>
          </main>
        </div>
        <MobileNav mode="operational" role={role} />
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
      <div className="flex-1 p-6 md:p-10 space-y-8">
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
