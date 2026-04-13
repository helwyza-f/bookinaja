"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardInternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // DEFAULT: Collapsed (true) biar space maksimal dari awal
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 selection:bg-blue-500/30">
        {/* SIDEBAR: Sekarang jadi satu-satunya pusat kontrol */}
        <aside
          className={cn(
            "hidden md:flex flex-col fixed inset-y-0 z-50 transition-all duration-300 ease-in-out border-r border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a]",
            isCollapsed ? "w-20" : "w-72",
          )}
        >
          <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        </aside>

        {/* MAIN CONTENT: Pepet ke kiri mengikuti sidebar */}
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
