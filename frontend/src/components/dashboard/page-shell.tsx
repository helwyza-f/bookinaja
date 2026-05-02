import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/15 dark:bg-[#0f0f17] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="min-w-0 space-y-2">
            {eyebrow ? (
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em]">
                {eyebrow}
              </Badge>
            ) : null}
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                {title}
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                {description}
              </p>
            </div>
          </div>
          {actions ? <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">{actions}</div> : null}
        </div>
      </section>

      {stats?.length ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                {stat.label}
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white break-words">
                {stat.value}
              </div>
              {stat.hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">{stat.hint}</div> : null}
            </div>
          ))}
        </section>
      ) : null}

      {children}
    </main>
  );
}
