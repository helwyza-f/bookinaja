"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { growthNavItems } from "./admin-nav-config";

type GrowthSidebarProps = {
  tenantName?: string;
};

export function GrowthSidebar({ tenantName }: GrowthSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="relative flex h-full flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]">
      <div className="flex h-20 items-center border-b border-[var(--sidebar-border)] px-5">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
            Growth
          </div>
          <div className="mt-1 truncate text-base font-semibold text-slate-950 dark:text-white">
            {tenantName || "Tenant"}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
            Feed, konten, dan performa
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {growthNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 transition-colors",
                active
                  ? "bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]"
                  : "text-slate-600 hover:bg-[var(--sidebar-accent)] hover:text-[var(--bookinaja-600)] dark:text-slate-300 dark:hover:text-white",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{item.label}</div>
                {item.hint ? (
                  <div
                    className={cn(
                      "mt-0.5 truncate text-[11px]",
                      active ? "text-[var(--bookinaja-100)]" : "text-slate-400 dark:text-slate-400",
                    )}
                  >
                    {item.hint}
                  </div>
                ) : null}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--sidebar-border)] px-3 py-3">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-[var(--sidebar-accent)] hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke admin operasional
        </Link>
      </div>
    </div>
  );
}
