"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { canAccessAdminRoute } from "@/lib/admin-access";
import { cn } from "@/lib/utils";
import { settingsNavItems } from "./admin-nav-config";
import { useAdminSession } from "./admin-session-context";

type SettingsMobileNavProps = {
  tenantName?: string;
  role?: string;
};

export function SettingsMobileNav({ tenantName, role }: SettingsMobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user } = useAdminSession();

  return (
    <div className="sticky top-4 z-30 lg:hidden">
      <details
        open={open}
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
        className="group overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              Settings
            </div>
            <div className="mt-1 truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              {tenantName || "Tenant"}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-300">
              {role === "owner" ? "Akses pemilik" : "Akses staf"}
            </div>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bookinaja-600)] text-white">
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </div>
        </summary>

        <div className="px-4 pb-4 pt-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {settingsNavItems.filter((item) => canAccessAdminRoute(item.href, user)).map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors",
                    active
                      ? "border-[color:rgba(59,130,246,0.18)] bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-100)]"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                      active
                        ? "bg-[var(--bookinaja-600)] text-white"
                        : "bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-400",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold leading-tight">
                      {item.label}
                    </div>
                    {item.hint ? (
                      <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-400">
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
