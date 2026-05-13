"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAdminRouteGate } from "@/lib/admin-access";
import { cn } from "@/lib/utils";
import { settingsNavItems } from "./admin-nav-config";
import { useAdminSession } from "./admin-session-context";
import { Badge } from "@/components/ui/badge";

export function SettingsTabs() {
  const pathname = usePathname();
  const { user } = useAdminSession();

  return (
    <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-2 pb-1">
        {settingsNavItems.filter((tab) => getAdminRouteGate(tab.href, user).visible).map((tab) => {
          const gate = getAdminRouteGate(tab.href, user);
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide transition-colors",
                active
                  ? "bg-[var(--bookinaja-600)] text-white"
                  : gate.lockedByPlan
                    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20 dark:hover:bg-amber-500/15"
                    : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-400 dark:ring-slate-800 dark:hover:bg-slate-900",
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {gate.lockedByPlan ? (
                <Badge className="border-0 bg-amber-600/10 px-1.5 py-0 text-[9px] font-bold uppercase tracking-[0.16em] text-current">
                  {gate.requiredPlanLabel}
                </Badge>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
