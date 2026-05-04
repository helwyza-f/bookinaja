"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCookie, getCookie } from "cookies-next";
import { TooltipProvider } from "@/components/ui/tooltip";
import api from "@/lib/api";
import { PlatformSidebar } from "@/components/platform/platform-sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlatformDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getCookie("auth_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    api
      .get("/platform/me")
      .then((res) => {
        if (res.data?.role !== "platform_admin") {
          deleteCookie("auth_token");
          router.replace("/login");
          return;
        }
        setReady(true);
      })
      .catch(() => {
        deleteCookie("auth_token");
        router.replace("/login");
      });
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">
          Loading Admin
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_22%,#f8fafc_55%,#ffffff_100%)] text-slate-950 lg:flex dark:bg-[linear-gradient(180deg,#060b16_0%,#0b1220_26%,#0f172a_60%,#05070d_100%)]">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_24%)]" />
        <div className="hidden lg:block lg:w-72 lg:shrink-0">
          <PlatformSidebar />
        </div>
        <div className="relative flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl lg:hidden dark:border-white/10 dark:bg-[#0b1220]/90">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">
                  Bookinaja Admin Center
                </div>
                <div className="truncate text-sm font-semibold text-slate-500">
                  bookinaja.com/dashboard
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-full shadow-sm">
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </header>
          {children}
        </div>
      </div>
    </TooltipProvider>
  );
}
