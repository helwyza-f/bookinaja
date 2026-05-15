"use client";

import type { ReactNode } from "react";
import { AlertCircle, Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AdminSurfaceStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
};

function AdminSurfaceState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: AdminSurfaceStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[320px] flex-col items-center justify-center rounded-xl border p-8 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-slate-950 dark:text-white">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function AdminSurfaceError({
  title = "Gagal memuat data",
  description,
  action,
  className,
}: Omit<AdminSurfaceStateProps, "icon">) {
  return (
    <AdminSurfaceState
      icon={AlertCircle}
      title={title}
      description={description}
      action={action}
      className={cn(
        "border-red-100 bg-red-50/40 dark:border-red-900/20 dark:bg-red-950/10",
        className,
      )}
    />
  );
}

export function AdminSurfaceEmpty({
  title,
  description,
  action,
  className,
}: Omit<AdminSurfaceStateProps, "icon">) {
  return (
    <AdminSurfaceState
      icon={Inbox}
      title={title}
      description={description}
      action={action}
      className={cn(
        "border-dashed border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    />
  );
}
