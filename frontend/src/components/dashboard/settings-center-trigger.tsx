"use client";

import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsCenterTriggerProps = {
  onClick: () => void;
  className?: string;
  label?: string;
  iconOnly?: boolean;
};

export function SettingsCenterTrigger({
  onClick,
  className,
  label = "Settings",
  iconOnly = false,
}: SettingsCenterTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900",
        iconOnly ? "h-10 w-10 justify-center gap-0 px-0" : "",
        className,
      )}
      aria-label={label}
    >
      <Settings className="h-4 w-4" />
      {iconOnly ? null : label}
    </button>
  );
}
