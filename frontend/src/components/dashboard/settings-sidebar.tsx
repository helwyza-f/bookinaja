"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  BarChart3,
  CreditCard,
  Megaphone,
  ShieldCheck,
  UsersRound,
  Wand2,
} from "lucide-react";

type SettingsSidebarProps = {
  tenantName?: string;
  role?: string;
  pathname: string;
};

const items = [
  {
    label: "Landing Page Studio",
    href: "/admin/settings/page-builder",
    icon: Wand2,
    hint: "Konten, layout, tema, preview",
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
    label: "Smart Point",
    href: "/admin/devices",
    icon: BadgeCheck,
    hint: "Perangkat & status",
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
    <aside className="h-full overflow-hidden rounded-[2rem] border border-[var(--sidebar-border)] bg-[var(--card)]/95 shadow-sm backdrop-blur">
      <div className="border-b border-[var(--sidebar-border)] p-4">
        <div className="relative overflow-hidden rounded-[1.5rem] bg-[var(--bookinaja-900)] p-4 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(18,146,255,0.28),transparent_40%)]" />
          <div className="relative space-y-2">
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.35em] text-[var(--bookinaja-100)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Bookinaja Settings
            </div>
            <div className="space-y-1">
              <div className="text-lg font-[1000] tracking-tight leading-none">
                {tenantName || "Tenant"}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-300">
                {role === "owner" ? "Akses pemilik" : "Akses staf"}
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest">
              <BadgeCheck className="h-3 w-3" />
              Kontrol bisnis
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
                  ? "border-[color:rgba(18,146,255,0.18)] bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] shadow-sm dark:bg-[color:rgba(18,146,255,0.14)] dark:text-[var(--bookinaja-100)]"
                  : "border-transparent bg-transparent text-slate-500 hover:border-[var(--sidebar-border)] hover:bg-[var(--sidebar-accent)] dark:hover:bg-white/5 dark:text-slate-300",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                  active
                    ? "bg-[var(--bookinaja-600)] text-white shadow-lg shadow-sky-500/20"
                    : "bg-slate-100 dark:bg-white/5 group-hover:bg-slate-200 dark:group-hover:bg-white/10",
                )}
              >
                <item.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold leading-none">
                  {item.label}
                </div>
                <div className="mt-1 text-[10px] opacity-70">
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
