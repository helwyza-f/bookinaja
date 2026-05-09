"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { Skeleton } from "@/components/ui/skeleton";
import { GrowthHeader } from "@/components/dashboard/growth-header";
import { GrowthSidebar } from "@/components/dashboard/growth-sidebar";

type AdminBootstrapResponse = {
  user?: {
    name?: string;
    role?: string;
  };
  tenant?: {
    name?: string;
  };
  features?: {
    enable_discovery_posts?: boolean;
  };
};

export default function GrowthWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AdminBootstrapResponse["user"] | null>(null);
  const [tenantName, setTenantName] = useState<string>("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await api.get<AdminBootstrapResponse>("/admin/me/bootstrap");
        const bootstrap = res.data || {};
        const userData = bootstrap.user || null;
        if (!active) return;

        if (userData?.role !== "owner") {
          router.replace("/admin/forbidden");
          return;
        }

        if (!bootstrap.features?.enable_discovery_posts) {
          router.replace("/admin/dashboard");
          return;
        }

        setUser(userData);
        setTenantName(bootstrap.tenant?.name || userData?.name || "");
        setLoading(false);
      } catch (error) {
        if (active && isTenantAuthError(error)) {
          clearTenantSession({ keepTenantSlug: true });
          router.replace("/admin/login");
          return;
        }
        if (active) router.replace("/admin/forbidden");
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
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
