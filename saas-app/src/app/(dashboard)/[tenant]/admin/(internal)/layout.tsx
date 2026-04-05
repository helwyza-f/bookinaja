"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardInternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // DEFAULT: Collapsed (true)
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { theme, setTheme } = useTheme();

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 selection:bg-blue-500/30">
        <div
          className={cn(
            "hidden md:flex flex-col fixed inset-y-0 z-50 transition-all duration-300 ease-in-out",
            isCollapsed ? "w-20" : "w-72",
          )}
        >
          <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        </div>

        <div
          className={cn(
            "flex flex-1 flex-col transition-all duration-300 ease-in-out",
            isCollapsed ? "md:pl-20" : "md:pl-72",
          )}
        >
          <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b bg-white/80 dark:bg-slate-950/80 px-8 backdrop-blur-md border-slate-200 dark:border-slate-800">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic pr-2">
              Admin <span className="text-blue-600">Panel</span> / Dashboard
            </h2>

            <div className="flex items-center gap-6">
              {/* CUSTOM DARK MODE TOGGLE */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl h-10 w-10 border border-slate-200 dark:border-slate-800"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
                <span className="sr-only">Toggle theme</span>
              </Button>

              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black uppercase italic leading-none text-slate-900 dark:text-white pr-1">
                    Helwiza Fahry
                  </p>
                  <p className="text-[8px] font-bold text-blue-600 uppercase tracking-widest mt-1">
                    Super Admin
                  </p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-white shadow-lg shadow-blue-600/20 italic border-b-4 border-blue-800 transition-transform active:scale-95">
                  HF
                </div>
              </div>
            </div>
          </header>

          <main className="p-8">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
