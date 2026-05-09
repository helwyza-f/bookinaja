import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DashboardMetricCard } from "@/components/dashboard/analytics-kit";

type PageShellProps = {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
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
  stats,
  children,
  className,
}: PageShellProps) {
  return (
    <main className={cn("mx-auto max-w-7xl space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 lg:px-8", className)}>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="min-w-0 space-y-3">
            {eyebrow ? (
              <Badge variant="outline" className="w-fit rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide dark:border-slate-800 dark:bg-slate-900">
                {eyebrow}
              </Badge>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                {title}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {description}
              </p>
              </div>
              {actions ? <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">{actions}</div> : null}
            </div>
          </div>
        </div>
      </section>

      {stats?.length ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
