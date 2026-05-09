"use client";

import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsHeader } from "@/components/dashboard/settings-header";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, tenantName } = useAdminSession();

  if (!user) {
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
