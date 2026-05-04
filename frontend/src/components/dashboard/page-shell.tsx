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
    <main className={cn("mx-auto max-w-7xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 lg:px-8", className)}>
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(241,245,249,0.96))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.09)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,17,23,0.98),rgba(9,12,20,0.98))] dark:shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.1),transparent_30%)]" />
        <div className="relative flex flex-col gap-5">
          <div className="min-w-0 space-y-3">
            {eyebrow ? (
              <Badge variant="outline" className="w-fit rounded-full border-white/70 bg-white/75 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                {eyebrow}
              </Badge>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="space-y-2">
              <h1 className="text-3xl font-[950] tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                {title}
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
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
