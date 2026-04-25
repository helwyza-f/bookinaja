"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { settingsNavItems } from "./admin-nav-config";

type SettingsMobileNavProps = {
  tenantName?: string;
  role?: string;
};

export function SettingsMobileNav({ tenantName, role }: SettingsMobileNavProps) {
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <details className="group rounded-[1.5rem] border border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-white/5 dark:bg-white/[0.03]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.35em] text-blue-600">
              Settings Navigation
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
              {tenantName || "Tenant"} {role ? `- ${role}` : ""}
            </div>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </div>
        </summary>

        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {settingsNavItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-[1.25rem] border px-3 py-3 transition-all",
                    active
                      ? "border-blue-500/20 bg-blue-500/5 text-blue-600 shadow-sm"
                      : "border-transparent bg-slate-50 text-slate-500 hover:border-slate-200 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-400 dark:hover:border-white/5 dark:hover:bg-white/10",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                      active
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                        : "bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-400",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-black uppercase italic tracking-widest leading-none">
                      {item.label}
                    </div>
                    {item.hint ? (
                      <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        {item.hint}
                      </div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </details>
    </div>
  );
}
