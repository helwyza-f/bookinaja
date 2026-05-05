"use client";

import { ShieldCheck } from "lucide-react";

type SettingsHeaderProps = {
  tenantName?: string;
  role?: string;
};

export function SettingsHeader({ tenantName, role }: SettingsHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-[1.35rem] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(238,252,249,0.94))] p-4 shadow-sm dark:border-white/15 dark:bg-[linear-gradient(135deg,rgba(10,24,26,0.98),rgba(15,15,23,0.96))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:rounded-[2rem] md:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(129,216,208,0.18),transparent_35%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(129,216,208,0.2),transparent_35%)]" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.35em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Settings
          </div>
          <h1 className="truncate text-xl font-black tracking-tight leading-none text-slate-950 dark:text-white md:text-3xl">
            {tenantName || "Tenant"}
          </h1>
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-300">
            {role === "owner" ? "Akses pemilik" : "Akses staf"}
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300 sm:inline-flex">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-300)]" />
          {role === "owner" ? "Owner" : "Staff"}
        </div>
      </div>
    </header>
  );
}
