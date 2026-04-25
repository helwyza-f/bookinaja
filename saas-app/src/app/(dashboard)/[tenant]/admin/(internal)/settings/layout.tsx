"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsHeader } from "@/components/dashboard/settings-header";

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
      <div className="mx-auto min-h-screen max-w-[1800px] pb-6 md:pb-0">
        <SettingsHeader tenantName={tenantName || user?.name} role={user?.role} />

        <main className="space-y-4 px-4 py-4 md:space-y-6 md:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SettingsLayoutSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] p-4 md:p-6">
      <div className="mx-auto max-w-[1800px] space-y-6">
        <Skeleton className="h-28 rounded-[2rem] bg-white dark:bg-white/5" />
        <Skeleton className="h-44 rounded-[2rem] bg-white dark:bg-white/5" />
        <Skeleton className="h-[560px] rounded-[2rem] bg-white dark:bg-white/5" />
      </div>
    </div>
  );
}
