"use client";

import Link from "next/link";
import { ArrowRight, Layers3, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  operationalNavItems,
  settingsNavItems,
  simpleOwnerOperationalNavHrefs,
  simpleOwnerUtilityNavKeys,
  workspaceUtilityNavItems,
} from "@/components/dashboard/admin-nav-config";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { canAccessAdminRoute, getAdminRouteGate } from "@/lib/admin-access";

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
  const isOwner = user?.role === "owner";

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

  const movedOperationalItems = operationalNavItems
    .filter((item) => {
      if (!isOwner) return false;
      if (simpleOwnerOperationalNavHrefs.includes(item.href)) return false;
      return canAccessAdminRoute(item.href, user);
    })
    .map((item) => ({
      label: item.label,
      href: item.href,
      hint: item.hint || "Area operasional lanjutan yang dipindah dari sidebar utama.",
      icon: item.icon,
      group: item.href === "/admin/reports" ? "system" : "ops",
    }));

  const movedUtilityItems = workspaceUtilityNavItems
    .filter((item) => {
      if (!isOwner) return false;
      if (simpleOwnerUtilityNavKeys.includes(item.key)) return false;
      return item.kind === "route" && Boolean(item.href);
    })
    .map((item) => ({
      label: item.label,
      href: item.href as string,
      hint: "Area tambahan yang sengaja dipindah dari sidebar utama.",
      icon: item.icon,
      group:
        item.key === "business"
          ? "core"
          : item.key === "page_builder" || item.key === "refer"
            ? "growth"
            : "system",
    }));

  const allItems = [...visibleItems, ...movedOperationalItems, ...movedUtilityItems];

  const buckets: SettingsBucket[] = [
    {
      title: "Operasional & Tim",
      description: "Atur akun, workspace, staff, dan alat kerja inti owner.",
      items: allItems.filter((item) => item.group === "core" || item.group === "ops"),
    },
    {
      title: "Billing & Sistem",
      description: "Kelola pembayaran, subscription, printer, dan konfigurasi sistem lain.",
      items: allItems.filter((item) => item.group === "system"),
    },
    {
      title: "Growth & Tambahan",
      description: "Semua area sekunder sementara dikumpulkan di sini supaya nav utama tetap bersih.",
      items: allItems.filter((item) => item.group === "growth"),
    },
  ].filter((bucket) => bucket.items.length > 0);

  return (
    <div className="space-y-5">
      <section className="rounded-[1.4rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#eef4ff_100%)] p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,#020617_0%,#08111f_55%,#0b1730_100%)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
              <Layers3 className="h-3.5 w-3.5" />
              Settings Center
            </div>
            <h1 className="mt-4 text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-white">
              Semua area sekunder dikumpulkan di satu tempat
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Navigasi utama dipakai untuk kerja harian. Semua konfigurasi, billing, promo, dan fitur tambahan masuk ke halaman ini supaya owner baru tidak kebingungan.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <QuickInfo
              icon={ShieldCheck}
              label="Nav utama"
              value="Fokus operasional"
            />
            <QuickInfo
              icon={Sparkles}
              label="Settings"
              value="Konfigurasi & fitur sekunder"
            />
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
                        {item.hint || "Buka pengaturan ini."}
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

      <section className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Rule produk yang sekarang dipakai</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Menu utama dipersempit untuk kerja harian. Area lain tetap hidup, tapi sengaja dipindah ke settings sampai threshold exposure berikutnya dibuat.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/admin/dashboard" prefetch={false}>
              Kembali ke dashboard
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function QuickInfo({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {label}
        </div>
        <Icon className="h-4 w-4 text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-200)]" />
      </div>
      <div className="mt-1.5 text-sm font-semibold text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}
