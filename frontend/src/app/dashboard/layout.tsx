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
      <div className="min-h-screen bg-slate-50 text-slate-950 lg:flex">
        <div className="hidden lg:block lg:w-72 lg:shrink-0">
          <PlatformSidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">
                  Bookinaja Admin Center
                </div>
                <div className="truncate text-sm font-semibold text-slate-500">
                  bookinaja.com/dashboard
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-full">
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
