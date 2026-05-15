"use client";

import type { ReactNode } from "react";
import { AlertTriangle, RefreshCcw, ShieldAlert, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminShellStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  icon?: LucideIcon;
  className?: string;
};

export function AdminShellState({
  title,
  description,
  action,
  secondaryAction,
  icon: Icon = AlertTriangle,
  className,
}: AdminShellStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950",
        className,
      )}
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
          <Icon className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
        {action || secondaryAction ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {action}
            {secondaryAction}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminShellAuthError({
  onLogin,
  onRetry,
}: {
  onLogin: () => void;
  onRetry?: () => void;
}) {
  return (
    <AdminShellState
      icon={ShieldAlert}
      title="Sesi admin tidak lagi valid"
      description="Login tenant perlu dibuka lagi supaya context bisnis dan izin akses sinkron."
      action={
        <Button type="button" onClick={onLogin} className="rounded-xl">
          Masuk lagi
        </Button>
      }
      secondaryAction={
        onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry} className="rounded-xl">
            Coba lagi
          </Button>
        ) : null
      }
    />
  );
}

export function AdminShellLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <AdminShellState
      title="Admin shell gagal dimuat"
      description="Bootstrap tenant tidak berhasil dimuat. Tanpa itu shell tidak punya session, tenant context, atau gating yang valid."
      action={
        <Button type="button" onClick={onRetry} className="rounded-xl">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Muat ulang
        </Button>
      }
    />
  );
}
