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
    <aside className="h-full bg-white dark:bg-[#0a0a0a] border-r border-slate-200 dark:border-white/5">
      <div className="p-5 border-b border-slate-100 dark:border-white/5">
        <div className="rounded-[1.75rem] bg-slate-950 text-white p-5 shadow-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.25),transparent_40%)]" />
          <div className="relative space-y-3">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.35em] text-blue-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Command Center
            </div>
            <div className="space-y-1">
              <div className="text-xl font-[1000] italic uppercase tracking-tighter leading-none">
                {tenantName || "Tenant"}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-300">
                {role === "owner" ? "Owner Access" : "Staff Access"}
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest">
              <BadgeCheck className="h-3 w-3" />
              Executive Layer
            </div>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-start gap-3 rounded-[1.35rem] border p-4 transition-all duration-200",
                active
                  ? "border-blue-500/20 bg-blue-500/5 text-blue-600 shadow-sm"
                  : "border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 dark:text-slate-400",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl transition-all",
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "bg-slate-100 dark:bg-white/5 group-hover:bg-slate-200 dark:group-hover:bg-white/10",
                )}
              >
                <item.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase italic tracking-widest leading-none">
                  {item.label}
                </div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] opacity-70">
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
