"use client";

import { ShieldCheck } from "lucide-react";

type SettingsHeaderProps = {
  tenantName?: string;
  role?: string;
};

export function SettingsHeader({ tenantName, role }: SettingsHeaderProps) {
  return (
    <header className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Settings
          </div>
          <h1 className="truncate text-lg font-semibold tracking-tight leading-none text-slate-950 dark:text-white md:text-xl">
            {tenantName || "Tenant"}
          </h1>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-300">
            {role === "owner" ? "Akses pemilik" : "Akses staf"}
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:inline-flex">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-300)]" />
          {role === "owner" ? "Owner" : "Staff"}
        </div>
      </div>
    </header>
  );
}
