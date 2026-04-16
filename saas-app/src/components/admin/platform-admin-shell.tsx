"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";

export function PlatformAdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      try {
        await api.get("/platform/me");
        if (active) setCheckingSession(false);
      } catch (error) {
        if (active && isTenantAuthError(error)) {
          clearTenantSession({ keepTenantSlug: true });
          router.replace("/login");
          return;
        }
        if (active) setCheckingSession(false);
      }
    };
    checkSession();
    return () => {
      active = false;
    };
  }, [router]);

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          Checking Session
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 selection:bg-blue-500/30">
        <aside
          className={cn(
            "hidden md:flex flex-col fixed inset-y-0 z-50 transition-all duration-300 ease-in-out border-r border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a]",
            isCollapsed ? "w-20" : "w-72",
          )}
        >
          <Sidebar
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
            basePath="/dashboard"
          />
        </aside>
        <div
          className={cn(
            "flex flex-1 flex-col transition-all duration-300 ease-in-out",
            isCollapsed ? "md:pl-20" : "md:pl-72",
          )}
        >
          <main className="p-4 md:p-10 min-h-screen">
            <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
