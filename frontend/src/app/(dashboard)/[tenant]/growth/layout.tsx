"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { GrowthHeader } from "@/components/dashboard/growth-header";
import { GrowthSidebar } from "@/components/dashboard/growth-sidebar";
import {
  AdminShellAuthError,
  AdminShellLoadError,
} from "@/components/dashboard/admin-shell-state";
import { useAdminBootstrap } from "@/components/dashboard/use-admin-bootstrap";
import { getCentralAdminAuthUrl } from "@/lib/tenant";

export default function GrowthWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const {
    status,
    errorType,
    user,
    tenantName,
    tenantSlug,
    growthVisible,
    reload,
  } = useAdminBootstrap();

  useEffect(() => {
    if (status !== "ready") return;
    if (user?.role !== "owner") {
      router.replace("/admin/forbidden");
      return;
    }
    if (!growthVisible) {
      router.replace("/admin/dashboard");
    }
  }, [growthVisible, router, status, user?.role]);

  if (status === "loading") {
    return <GrowthLayoutSkeleton />;
  }

  if (errorType === "auth") {
    return (
      <AdminShellAuthError
        onLogin={() => {
          window.location.replace(
            getCentralAdminAuthUrl({
              tenantSlug,
              next: "/growth/feed",
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

  if (!user || user.role !== "owner" || !growthVisible) {
    return <GrowthLayoutSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-plus-jakarta">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
        <GrowthSidebar tenantName={tenantName || user?.name} />
      </aside>

      <div className="pb-20 lg:pl-72">
        <div className="mx-auto max-w-7xl px-3 pt-4 md:px-5 md:pt-5">
          <GrowthHeader tenantName={tenantName || user?.name} />
          <main className="mt-4 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

function GrowthLayoutSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden lg:block">
        <div className="fixed inset-y-0 left-0 w-72 border-r border-slate-200 bg-white p-4">
          <Skeleton className="h-full rounded-[1.75rem] bg-slate-100" />
        </div>
      </div>
      <div className="pb-20 lg:pl-72">
        <div className="mx-auto max-w-7xl space-y-4 px-3 pt-4 md:px-5 md:pt-5">
          <Skeleton className="h-16 rounded-[1.25rem] bg-white lg:hidden" />
          <Skeleton className="h-[720px] rounded-[1.75rem] bg-white" />
        </div>
      </div>
    </div>
  );
}
