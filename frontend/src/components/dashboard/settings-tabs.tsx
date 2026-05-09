"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { settingsNavItems } from "./admin-nav-config";

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-2 pb-1">
        {settingsNavItems.map((tab) => {
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
                  : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-400 dark:ring-slate-800 dark:hover:bg-slate-900",
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
