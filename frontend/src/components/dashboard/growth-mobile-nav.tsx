"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { growthNavItems } from "./admin-nav-config";

type GrowthMobileNavProps = {
  tenantName?: string;
  trigger: ReactNode;
};

export function GrowthMobileNav({ tenantName, trigger }: GrowthMobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-[84vw] max-w-[320px] gap-0 overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--card)] p-0 text-slate-950 shadow-xl dark:text-white"
      >
        <div className="flex h-full flex-col overflow-hidden">
          <SheetHeader className="border-b border-[var(--sidebar-border)] px-4 py-3 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="truncate text-base font-semibold text-slate-950 dark:text-white">
                  {tenantName || "Promosi Bisnis"}
                </SheetTitle>
                <SheetDescription className="mt-1 truncate text-xs text-slate-500 dark:text-slate-300">
                  Tampilan, postingan, dan performa di Feed Bookinaja
                </SheetDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-9 w-9 shrink-0 rounded-lg"
                aria-label="Tutup navigasi"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <nav className="space-y-1">
              {growthNavItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-[var(--bookinaja-600)] text-white"
                        : "text-slate-700 hover:bg-[var(--sidebar-accent)] dark:text-slate-300 dark:hover:bg-white/5",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{item.label}</div>
                      {item.hint ? (
                        <div className={cn("mt-0.5 truncate text-xs", active ? "text-[var(--bookinaja-100)]" : "text-slate-400 dark:text-slate-400")}>
                          {item.hint}
                        </div>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-[var(--sidebar-border)] p-3">
            <Link
              href="/admin/dashboard"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-[var(--sidebar-accent)] dark:text-slate-300 dark:hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              Kembali ke admin operasional
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
