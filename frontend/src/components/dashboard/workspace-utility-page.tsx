import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type UtilityAction = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
};

type WorkspaceUtilityPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  actions: UtilityAction[];
  note?: string;
};

export function WorkspaceUtilityPage({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  note,
}: WorkspaceUtilityPageProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 pb-20 pt-4 sm:px-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0f1117]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)]">
              <Icon className="h-4 w-4" />
              {eyebrow}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {description}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {actions.map((action) => {
          const ActionIcon = action.icon;
          const content = (
            <Card
              className={cn(
                "group rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-[var(--bookinaja-200)] hover:bg-[var(--bookinaja-50)] dark:border-white/10 dark:bg-[#0f1117] dark:hover:bg-white/[0.04]",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white">
                    <ActionIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-black text-slate-950 dark:text-white">
                      {action.title}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {action.description}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
            </Card>
          );

          if (action.external) {
            return (
              <a key={action.title} href={action.href} target="_blank" rel="noreferrer">
                {content}
              </a>
            );
          }

          return (
            <Link key={action.title} href={action.href} prefetch={false}>
              {content}
            </Link>
          );
        })}
      </div>

      {note ? (
        <Card className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
          {note}
        </Card>
      ) : null}
    </div>
  );
}
