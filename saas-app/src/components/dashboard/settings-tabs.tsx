"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  BriefcaseBusiness,
  CreditCard,
  Megaphone,
  UsersRound,
} from "lucide-react";

const tabs = [
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

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur dark:border-white/5 dark:bg-[#050505]/90 md:-mx-6 md:px-6 lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-[0.22em] transition-all",
                active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10 dark:hover:bg-white/10",
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
