"use client";

import { CreditCard } from "lucide-react";
import type { TrialInfo } from "@/components/dashboard/admin-session-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UpgradeEntryProps = {
  onClick: () => void;
  trialInfo?: TrialInfo | null;
  variant?: "sidebar" | "menu" | "mobile";
  className?: string;
  iconOnly?: boolean;
};

export function UpgradeEntry({
  onClick,
  trialInfo,
  variant = "sidebar",
  className,
  iconOnly = false,
}: UpgradeEntryProps) {
  const activeTrial = String(trialInfo?.status || "").toLowerCase() === "trialing";
  const label = activeTrial ? "Free trial" : "Upgrade";

  if (variant === "menu") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white",
          className,
        )}
      >
        <CreditCard className="h-4 w-4" />
        {label}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={cn(
        "justify-start gap-2 rounded-xl border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/15",
        variant === "mobile" ? "h-11 w-full px-3" : "h-10 w-full px-3",
        iconOnly ? "h-10 w-10 justify-center gap-0 px-0" : "",
        className,
      )}
      aria-label={label}
    >
      <CreditCard className="h-4 w-4" />
      {iconOnly ? null : label}
    </Button>
  );
}
