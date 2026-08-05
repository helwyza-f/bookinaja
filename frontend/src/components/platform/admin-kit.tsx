"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  AdminHeader — simple page title, subtitle, and right-aligned actions      */
/* -------------------------------------------------------------------------- */

export function AdminHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  StatCard — one KPI: label, big value, optional icon + trend               */
/* -------------------------------------------------------------------------- */

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  hint,
  loading,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4 shadow-[var(--admin-shadow-soft)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        {Icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        {loading ? <span className="text-slate-300">—</span> : value}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              trend.positive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
            )}
          >
            {trend.positive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {trend.value}
          </span>
        ) : null}
        {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  StatusPill — colored dot + label for tenant/subscription status           */
/* -------------------------------------------------------------------------- */

type StatusTone = "active" | "trial" | "suspended" | "inactive" | "neutral";

const statusToneMap: Record<StatusTone, { dot: string; text: string; bg: string }> = {
  active: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  trial: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-500/10",
  },
  suspended: {
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-500/10",
  },
  inactive: {
    dot: "bg-slate-400",
    text: "text-slate-600 dark:text-slate-300",
    bg: "bg-slate-100 dark:bg-white/5",
  },
  neutral: {
    dot: "bg-slate-400",
    text: "text-slate-600 dark:text-slate-300",
    bg: "bg-slate-100 dark:bg-white/5",
  },
};

export function statusToTone(status?: string): StatusTone {
  const s = (status || "").toLowerCase();
  if (s === "active") return "active";
  if (s === "trial") return "trial";
  if (s === "suspended") return "suspended";
  if (s === "inactive") return "inactive";
  return "neutral";
}

export function StatusPill({ status, label }: { status?: string; label?: string }) {
  const tone = statusToTone(status);
  const styles = statusToneMap[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        styles.bg,
        styles.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
      {label || status || "unknown"}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  SectionCard — clean container with title + optional action                */
/* -------------------------------------------------------------------------- */

export function SectionCard({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-soft)]",
        className,
      )}
    >
      {title || action ? (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-line-soft)] px-4 py-3">
          {title ? (
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  EmptyState — clean placeholder                                            */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--admin-line)] px-6 py-12 text-center">
      {Icon ? (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/5">
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</div>
      {description ? (
        <div className="max-w-sm text-xs text-slate-500 dark:text-slate-400">{description}</div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  formatIDR — shared currency helper                                        */
/* -------------------------------------------------------------------------- */

export function formatIDR(value: number | undefined | null) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

export function formatCompactIDR(value: number | undefined | null) {
  const n = Number(value || 0);
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}
