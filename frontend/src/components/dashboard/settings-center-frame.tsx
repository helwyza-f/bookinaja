"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isAdminNavItemActive, settingsNavItems } from "@/components/dashboard/admin-nav-config";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { getAdminRouteGate } from "@/lib/admin-access";

export function SettingsCenterFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAdminSession();

  const primaryItems = useMemo(
    () => settingsNavItems.filter((item) => getAdminRouteGate(item.href, user).visible),
    [user],
  );
  const primaryHrefs = useMemo(() => primaryItems.map((item) => item.href), [primaryItems]);
  const activeItem = useMemo(
    () =>
      primaryItems.find((item) => isAdminNavItemActive(pathname, item.href, primaryHrefs)) ||
      primaryItems[0],
    [pathname, primaryHrefs, primaryItems],
  );

  const isIndexPage = pathname === "/admin/settings";

  return (
    <div className="min-h-[calc(100vh-5.5rem)] px-3 pb-20 pt-3 md:px-5 md:pb-6">
      <div className="mx-auto w-full max-w-[1080px]">
        {isIndexPage ? (
          children
        ) : (
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_28px_90px_-40px_rgba(0,0,0,0.55)]">
            <div className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 md:px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href="/admin/settings"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke Settings
                  </Link>
                  <h1 className="mt-3 text-[1.6rem] font-semibold tracking-tight text-slate-950 dark:text-white">
                    {activeItem?.label || "Settings"}
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {activeItem?.hint || "Atur halaman ini dari satu tempat."}
                  </p>
                </div>
              </div>
            </div>

            <main className="bg-[#fbfcfe] px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:bg-[#020617] md:px-5 md:py-5">
              {children}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
