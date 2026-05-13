"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { settingsNavItems } from "./admin-nav-config";
import { useAdminSession } from "./admin-session-context";
import { getAdminRouteGate } from "@/lib/admin-access";

type SettingsSidebarProps = {
  tenantName?: string;
  role?: string;
  pathname: string;
};

export function SettingsSidebar({
  tenantName,
  role,
  pathname,
}: SettingsSidebarProps) {
  const { user } = useAdminSession();

  return (
    <aside className="h-full overflow-hidden rounded-xl border border-[var(--sidebar-border)] bg-[var(--card)]">
      <div className="border-b border-[var(--sidebar-border)] p-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Settings
            </div>
            <div className="space-y-1">
              <div className="text-base font-semibold tracking-tight leading-none">
                {tenantName || "Tenant"}
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
                {role === "owner" ? "Akses pemilik" : "Akses staf"}
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide dark:border-slate-700 dark:bg-slate-950">
              <BadgeCheck className="h-3 w-3" />
              Kontrol bisnis
            </div>
          </div>
        </div>
      </div>

      <nav className="space-y-1 p-2.5">
        {settingsNavItems.filter((item) => getAdminRouteGate(item.href, user).visible).map((item) => {
          const gate = getAdminRouteGate(item.href, user);
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors",
                active
                  ? "border-[color:rgba(18,146,255,0.18)] bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[color:rgba(18,146,255,0.14)] dark:text-[var(--bookinaja-100)]"
                  : gate.lockedByPlan
                    ? "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:border-amber-500/30 dark:hover:bg-amber-500/15"
                    : "border-transparent bg-transparent text-slate-500 hover:border-[var(--sidebar-border)] hover:bg-[var(--sidebar-accent)] dark:hover:bg-slate-900 dark:text-slate-300",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  active
                    ? "bg-[var(--bookinaja-600)] text-white"
                    : "bg-slate-100 dark:bg-slate-900 group-hover:bg-slate-200 dark:group-hover:bg-slate-800",
                )}
              >
                <item.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] font-semibold leading-none">
                  {item.label}
                  {gate.lockedByPlan ? (
                    <Badge className="border-0 bg-amber-600/10 px-1.5 py-0 text-[9px] font-bold uppercase tracking-[0.16em] text-current">
                      {gate.requiredPlanLabel}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-1 text-[10px] opacity-70">
                  {item.hint}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
