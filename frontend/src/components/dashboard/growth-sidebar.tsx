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
    <div className="relative flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="flex h-20 items-center border-b border-slate-200 px-6">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
            Promosi Bisnis
          </div>
          <div className="mt-1 truncate text-lg font-bold text-slate-950">
            {tenantName || "Tenant"}
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-500">
            Feed, postingan, dan performa
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
                "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-blue-600",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{item.label}</div>
                {item.hint ? (
                  <div
                    className={cn(
                      "mt-0.5 truncate text-[11px]",
                      active ? "text-blue-100" : "text-slate-400",
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

      <div className="border-t border-slate-200 px-3 py-3">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke admin operasional
        </Link>
      </div>
    </div>
  );
}
