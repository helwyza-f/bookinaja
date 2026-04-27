"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import api from "@/lib/api";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsHeader } from "@/components/dashboard/settings-header";
import { SettingsSidebar } from "@/components/dashboard/settings-sidebar";
import { SettingsTabs } from "@/components/dashboard/settings-tabs";

type MeResponse = {
  user?: {
    name?: string;
    email?: string;
    role?: string;
    tenant_id?: string;
    logo_url?: string;
  };
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [tenantName, setTenantName] = useState<string>("");

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
        try {
          const profileRes = await api.get("/admin/profile");
          if (active) {
            setTenantName(profileRes.data?.name || "");
          }
        } catch {
          if (active) setTenantName(userData?.name || "");
        } finally {
          if (active) setLoading(false);
        }
      } catch (error) {
        if (active && isTenantAuthError(error)) {
          clearTenantSession({ keepTenantSlug: true });
          router.replace("/admin/login");
          return;
        }
        if (active) {
          router.replace("/admin/forbidden");
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return <SettingsLayoutSkeleton />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 dark:bg-[#050505]">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col">
        <SettingsHeader
          tenantName={tenantName || user?.name}
          role={user?.role}
        />

        <div className="border-b border-slate-200/80 bg-slate-50/95 px-4 py-3 backdrop-blur dark:border-white/5 dark:bg-[#050505]/90 lg:hidden">
          <SettingsTabs />
        </div>

        <div className="flex flex-1 flex-col pt-2 lg:flex-row ">
          <aside className="hidden h-fit w-[300px] shrink-0 lg:sticky lg:top-6 lg:block">
            <SettingsSidebar
              tenantName={tenantName || user?.name}
              role={user?.role}
              pathname={pathname}
            />
          </aside>

          <main className="min-w-0 flex-1">
            <div className="mx-auto max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

function SettingsLayoutSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-[#050505] md:p-6">
      <div className="mx-auto max-w-[1800px] space-y-4 md:space-y-6">
        <Skeleton className="h-24 rounded-[2rem] bg-white dark:bg-white/5" />
        <Skeleton className="h-12 rounded-[1.5rem] bg-white dark:bg-white/5 lg:hidden" />
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Skeleton className="hidden h-[560px] rounded-[2rem] bg-white dark:bg-white/5 lg:block" />
          <Skeleton className="h-[560px] rounded-[2rem] bg-white dark:bg-white/5" />
        </div>
      </div>
    </div>
  );
}
