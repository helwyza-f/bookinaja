"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  BriefcaseBusiness,
  CreditCard,
  Megaphone,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const items = [
  {
    label: "Bisnis",
    href: "/admin/settings/bisnis",
    icon: BriefcaseBusiness,
  },
  {
    label: "Pegawai",
    href: "/admin/settings/staff",
    icon: UsersRound,
  },
  {
    label: "CRM",
    href: "/admin/settings/crm",
    icon: Megaphone,
  },
  {
    label: "Analitik",
    href: "/admin/settings/analytics",
    icon: BarChart3,
  },
  {
    label: "Billing",
    href: "/admin/settings/billing",
    icon: CreditCard,
  },
];

type SettingsHeaderProps = {
  tenantName?: string;
  role?: string;
};

export function SettingsHeader({ tenantName, role }: SettingsHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur dark:border-white/5 dark:bg-[#050505]/90 md:-mx-6 md:px-6 lg:-mx-10 lg:px-10">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.35em] text-blue-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              Settings Hub
            </div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none text-slate-950 dark:text-white md:text-3xl">
              {tenantName || "Tenant"} <span className="text-blue-600">Settings.</span>
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400">
              {role === "owner" ? "Owner access" : "Staff access"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-white dark:bg-white dark:text-slate-950">
              <ShieldCheck className="h-3.5 w-3.5" />
              Executive layer
            </span>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-[0.22em] transition-all",
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10 dark:hover:bg-white/10",
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
