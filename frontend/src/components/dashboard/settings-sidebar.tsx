"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  BarChart3,
  CreditCard,
  TicketPercent,
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
    label: "Setup Bisnis",
    href: "/admin/settings/bisnis",
    icon: ShieldCheck,
    hint: "Identitas, kontak, visual utama",
  },
  {
    label: "Landing Page Studio",
    href: "/admin/settings/page-builder",
    icon: Wand2,
    hint: "Layout, tema, preview live",
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
    label: "Promo Customer",
    href: "/admin/settings/promo",
    icon: TicketPercent,
    hint: "Voucher, rule, kuota",
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
    <aside className="h-full overflow-hidden rounded-xl border border-[var(--sidebar-border)] bg-[var(--card)]">
      <div className="border-b border-[var(--sidebar-border)] p-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Settings
            </div>
            <div className="space-y-1">
              <div className="text-base font-semibold tracking-tight leading-none">
                {tenantName || "Tenant"}
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
                {role === "owner" ? "Akses pemilik" : "Akses staf"}
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide dark:border-slate-700 dark:bg-slate-950">
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
                "group flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors",
                active
                  ? "border-[color:rgba(18,146,255,0.18)] bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[color:rgba(18,146,255,0.14)] dark:text-[var(--bookinaja-100)]"
                  : "border-transparent bg-transparent text-slate-500 hover:border-[var(--sidebar-border)] hover:bg-[var(--sidebar-accent)] dark:hover:bg-slate-900 dark:text-slate-300",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  active
                    ? "bg-[var(--bookinaja-600)] text-white"
                    : "bg-slate-100 dark:bg-slate-900 group-hover:bg-slate-200 dark:group-hover:bg-slate-800",
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
