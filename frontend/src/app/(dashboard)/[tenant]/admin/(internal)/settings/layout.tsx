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
    <div className="space-y-4 pb-20 font-plus-jakarta md:px-4 pt-5 px-2">
      <div className="mx-auto flex max-w-350 flex-col gap-4">
        <SettingsHeader
          tenantName={tenantName || user?.name}
          role={user?.role}
        />

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function SettingsLayoutSkeleton() {
  return (
    <div className="px-3 pb-20 md:px-4">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <Skeleton className="h-32 rounded-[2rem] bg-white dark:bg-white/5" />
        <Skeleton className="h-[560px] rounded-[2rem] bg-white dark:bg-white/5" />
      </div>
    </div>
  );
}
