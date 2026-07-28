"use client";

import Link from "next/link";
import { ArrowRight, Layers3, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { settingsNavItems } from "@/components/dashboard/admin-nav-config";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { getAdminRouteGate } from "@/lib/admin-access";

type SettingsBucket = {
  title: string;
  description: string;
  items: Array<{
    label: string;
    href: string;
    hint?: string;
    icon: LucideIcon;
    locked?: boolean;
    requiredPlanLabel?: string;
  }>;
};

export default function SettingsIndexPage() {
  const { user } = useAdminSession();

  const visibleItems = settingsNavItems
    .map((item) => {
      const gate = getAdminRouteGate(item.href, user);
      if (!gate.visible) return null;
      return {
        label: item.label,
        href: item.href,
        hint: item.hint,
        icon: item.icon,
        locked: gate.lockedByPlan,
        requiredPlanLabel: gate.requiredPlanLabel,
        group: item.group || "core",
      };
    })
    .filter(Boolean) as Array<{
      label: string;
      href: string;
      hint?: string;
      icon: LucideIcon;
      locked?: boolean;
      requiredPlanLabel?: string;
      group: string;
    }>;

  const buckets: SettingsBucket[] = [
    {
      title: "Operasional & Tim",
      description: "Atur akun, workspace, staff, dan alat kerja inti owner.",
      items: visibleItems.filter((item) => item.group === "core" || item.group === "ops"),
    },
    {
      title: "Billing & Sistem",
      description: "Kelola pembayaran, subscription, printer, dan konfigurasi sistem lain.",
      items: visibleItems.filter((item) => item.group === "system"),
    },
    {
      title: "Growth & Tambahan",
      description: "Semua area sekunder sementara dikumpulkan di sini supaya nav utama tetap bersih.",
      items: visibleItems.filter((item) => item.group === "growth"),
    },
  ].filter((bucket) => bucket.items.length > 0);

  return (
    <div className="space-y-4">
      <section className="rounded-[1.4rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_58%,#eef4ff_100%)] p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,#020617_0%,#08111f_55%,#0b1730_100%)]">
        <div className="flex flex-col gap-4">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
              <Layers3 className="h-3.5 w-3.5" />
              Settings
            </div>
            <h1 className="mt-4 text-[1.9rem] font-semibold tracking-tight text-slate-950 dark:text-white">
              Atur bisnis kamu dari sini
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Semua pengaturan penting dikumpulkan di satu halaman supaya lebih gampang dicari.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {buckets.map((bucket) => (
          <div
            key={bucket.title}
            className="rounded-[1.3rem] border border-slate-200 bg-white p-4 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.25)] dark:border-slate-800 dark:bg-slate-950"
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{bucket.title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{bucket.description}</p>
            </div>

            <div className="mt-4 space-y-2.5">
              {bucket.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[rgba(74,141,255,0.12)] dark:text-[var(--bookinaja-200)]">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-slate-950 dark:text-white">{item.label}</div>
                        {item.locked ? (
                          <Badge className="rounded-full border-0 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
                            {item.requiredPlanLabel || "Upgrade"}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {item.hint || "Buka pengaturan ini"}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
