"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GrowthMobileNav } from "./growth-mobile-nav";

type GrowthHeaderProps = {
  tenantName?: string;
};

export function GrowthHeader({ tenantName }: GrowthHeaderProps) {
  return (
    <header className="flex items-center justify-between rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/15 dark:bg-[#0f0f17] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] lg:hidden">
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
          Promosi Bisnis
        </div>
        <div className="mt-1 truncate text-base font-bold text-slate-950 dark:text-white">
          {tenantName || "Tenant"}
        </div>
      </div>
      <GrowthMobileNav
        tenantName={tenantName}
        trigger={
          <Button
            type="button"
            size="icon"
            className="h-10 w-10 rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
            aria-label="Buka navigasi growth"
          >
            <Menu className="h-5 w-5" />
          </Button>
        }
      />
    </header>
  );
}
