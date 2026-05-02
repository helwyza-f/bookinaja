"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { settingsNavItems } from "./admin-nav-config";

type SettingsMobileNavProps = {
  tenantName?: string;
  role?: string;
};

export function SettingsMobileNav({ tenantName, role }: SettingsMobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-4 z-30 lg:hidden">
      <details
        open={open}
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
        className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-white/15 dark:bg-[#0f0f17]"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-white/15">
          <div className="min-w-0">
            <div className="text-[8px] font-black uppercase tracking-[0.35em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              Bookinaja Settings
            </div>
            <div className="mt-1 truncate text-sm font-black tracking-tight text-slate-900 dark:text-white">
              {tenantName || "Tenant"} {role ? `- ${role}` : ""}
            </div>
            <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-300">
              Pilih section konfigurasi
            </div>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--bookinaja-600)] text-white shadow-lg shadow-sky-500/20">
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </div>
        </summary>

        <div className="px-4 pb-4 pt-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {settingsNavItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-[1.25rem] border px-3 py-3.5 transition-all",
                    active
                      ? "border-[color:rgba(59,130,246,0.18)] bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] shadow-sm dark:bg-[color:rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-100)]"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/10",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all",
                      active
                        ? "bg-[var(--bookinaja-600)] text-white shadow-lg shadow-sky-500/20"
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
