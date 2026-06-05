import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DashboardMetricCard } from "@/components/dashboard/analytics-kit";

type PageShellProps = {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
  compact?: boolean;
  stats?: Array<{
    label: string;
    value: string;
    hint?: string;
  }>;
  children: ReactNode;
  className?: string;
};

export function PageShell({
  title,
  description,
  eyebrow,
  actions,
  compact = false,
  stats,
  children,
  className,
}: PageShellProps) {
  return (
    <main className={cn("mx-auto max-w-7xl space-y-3 px-3 py-3 sm:space-y-4 sm:px-5 lg:px-6", className)}>
      <section
        className={cn(
          "overflow-hidden rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-soft)]",
          compact ? "p-3 sm:p-3.5" : "p-4 sm:p-4",
        )}
      >
        <div className={cn("flex flex-col", compact ? "gap-2.5" : "gap-4")}>
          <div className={cn("min-w-0", compact ? "space-y-1.5" : "space-y-3")}>
            {eyebrow ? (
              compact ? (
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {eyebrow}
                </div>
              ) : (
                <Badge variant="outline" className="w-fit rounded-full border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                  {eyebrow}
                </Badge>
              )
            ) : null}
            <div className={cn("grid lg:grid-cols-[minmax(0,1fr)_auto]", compact ? "gap-2.5 lg:items-center" : "gap-4 lg:items-end")}>
              <div className={cn(compact ? "space-y-0.5" : "space-y-2")}>
                <h1
                  className={cn(
                    "font-semibold tracking-tight text-slate-950 dark:text-white",
                    compact ? "text-[1.55rem] leading-none sm:text-[1.7rem]" : "text-xl sm:text-[1.45rem]",
                  )}
                >
                  {title}
                </h1>
                <p
                  className={cn(
                    "text-slate-600 dark:text-slate-300",
                    compact ? "max-w-2xl text-[13px] leading-5" : "max-w-3xl text-sm leading-5",
                  )}
                >
                  {description}
                </p>
              </div>
              {actions ? (
                <div
                  className={cn(
                    "flex gap-2 sm:flex-row sm:flex-wrap",
                    compact ? "flex-wrap lg:justify-end [&_button]:h-9 [&_a]:h-9" : "flex-wrap lg:justify-end",
                  )}
                >
                  {actions}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {stats?.length ? (
        <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <DashboardMetricCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
              tone={index === 0 ? "indigo" : index === 1 ? "emerald" : index === 2 ? "cyan" : "slate"}
            />
          ))}
        </section>
      ) : null}

      {children}
    </main>
  );
}
