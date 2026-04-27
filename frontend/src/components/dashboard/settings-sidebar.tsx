"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  CreditCard,
  Megaphone,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

type SettingsSidebarProps = {
  tenantName?: string;
  role?: string;
  pathname: string;
};

const items = [
  {
    label: "Konfigurasi Bisnis",
    href: "/admin/settings/bisnis",
    icon: BriefcaseBusiness,
    hint: "Brand, SEO, landing",
  },
  {
    label: "Manajemen Pegawai",
    href: "/admin/settings/staff",
    icon: UsersRound,
    hint: "Staff, RBAC, aktivitas",
  },
  {
    label: "CRM & Marketing",
    href: "/admin/settings/crm",
    icon: Megaphone,
    hint: "Migrasi & blast WA",
  },
  {
    label: "Laporan & Analitik",
    href: "/admin/settings/analytics",
    icon: BarChart3,
    hint: "Grafik & export",
  },
  {
    label: "Subscription & Billing",
    href: "/admin/settings/billing",
    icon: CreditCard,
    hint: "Paket SaaS & Midtrans",
  },
];

export function SettingsSidebar({
  tenantName,
  role,
  pathname,
}: SettingsSidebarProps) {
  return (
    <aside className="h-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-white/5 dark:bg-white/[0.03]">
      <div className="border-b border-slate-100 p-4 dark:border-white/5">
        <div className="relative overflow-hidden rounded-[1.5rem] bg-slate-950 p-4 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.25),transparent_40%)]" />
          <div className="relative space-y-2">
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.35em] text-blue-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Command Center
            </div>
            <div className="space-y-1">
              <div className="text-lg font-[1000] italic uppercase tracking-tighter leading-none">
                {tenantName || "Tenant"}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-300">
                {role === "owner" ? "Owner Access" : "Staff Access"}
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest">
              <BadgeCheck className="h-3 w-3" />
              Executive Layer
            </div>
          </div>
        </div>
      </div>

      <nav className="space-y-1 p-2.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-[1.1rem] border px-3 py-3 transition-all duration-200",
                active
                  ? "border-blue-500/20 bg-blue-500/5 text-blue-600 shadow-sm"
                  : "border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 dark:text-slate-400",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "bg-slate-100 dark:bg-white/5 group-hover:bg-slate-200 dark:group-hover:bg-white/10",
                )}
              >
                <item.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-black uppercase italic tracking-widest leading-none">
                  {item.label}
                </div>
                <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.18em] opacity-70">
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
