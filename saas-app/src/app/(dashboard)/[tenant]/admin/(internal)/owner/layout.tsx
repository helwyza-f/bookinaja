"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileNav } from "@/components/dashboard/mobile-nav";

type MeResponse = {
  user?: {
    name?: string;
    email?: string;
    role?: string;
  };
};

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MeResponse["user"] | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await api.get("/auth/me");
        const userData = res.data?.user || null;
        if (!active) return;

        if (userData?.role !== "owner") {
          router.replace("/admin/forbidden");
          return;
        }

        setUser(userData);
      } catch (error) {
        if (active && isTenantAuthError(error)) {
          clearTenantSession({ keepTenantSlug: true });
          router.replace("/admin/login");
          return;
        }
        if (active) {
          router.replace("/admin/forbidden");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return <OwnerLayoutSkeleton />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_32%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] dark:bg-[#050505] dark:bg-none">
      <div className="fixed inset-x-0 top-0 z-40 md:hidden border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-white/5 dark:bg-[#050505]/90">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[8px] font-black uppercase tracking-[0.35em] text-blue-600">
              Owner Command Center
            </div>
            <div className="truncate text-sm font-black italic uppercase tracking-tighter text-slate-950 dark:text-white">
              Monitoring from anywhere
            </div>
          </div>
          <MobileNav
            mode="owner"
            role="owner"
            triggerClassName="relative left-auto bottom-auto z-auto h-11 w-11 rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-lg shadow-slate-950/15 hover:bg-slate-900"
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-10 lg:py-8">
        <div className="mb-6 flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-white/5 dark:bg-white/[0.03] md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="text-[9px] font-black uppercase tracking-[0.35em] text-blue-600">
              Owner Command Center
            </div>
            <h1 className="text-lg font-black italic uppercase tracking-tighter text-slate-950 dark:text-white md:text-2xl">
              Monitoring from anywhere
            </h1>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
            {user?.name || "Owner"}
          </div>
        </div>
        <div className="pb-24 pt-20 md:pb-0 md:pt-0">{children}</div>
      </div>
    </div>
  );
}

function OwnerLayoutSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-24 rounded-[2rem] bg-white dark:bg-white/5" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-32 rounded-[1.75rem] bg-white dark:bg-white/5" />
          <Skeleton className="h-32 rounded-[1.75rem] bg-white dark:bg-white/5" />
          <Skeleton className="h-32 rounded-[1.75rem] bg-white dark:bg-white/5" />
          <Skeleton className="h-32 rounded-[1.75rem] bg-white dark:bg-white/5" />
        </div>
        <Skeleton className="h-[560px] rounded-[2rem] bg-white dark:bg-white/5" />
      </div>
    </div>
  );
}
