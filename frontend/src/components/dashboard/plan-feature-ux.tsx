"use client";

import Link from "next/link";
import { CheckCircle2, Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  analyzeTenantFeatureAccess,
  formatPlanLabel,
  getFeatureMeta,
  type TenantFeatureKey,
} from "@/lib/plan-access";
import { cn } from "@/lib/utils";

type FeatureInput = {
  plan?: string | null;
  subscription_status?: string | null;
  plan_features?: string[] | null;
  plan_feature_matrix?: Record<string, string[]> | null;
};

type Requirement = {
  feature?: TenantFeatureKey;
  anyFeatures?: TenantFeatureKey[];
};

export function PlanFeatureBadge({
  input,
  requirement,
  className,
}: {
  input: FeatureInput;
  requirement: Requirement;
  className?: string;
}) {
  const analysis = analyzeTenantFeatureAccess(input, requirement);

  if (analysis.features.length === 0) return null;

  if (analysis.state === "available") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-emerald-200 bg-emerald-50 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
          className,
        )}
      >
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
        Aktif di {formatPlanLabel(input.plan)}
      </Badge>
    );
  }

  if (analysis.state === "inactive_subscription") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-rose-200 bg-rose-50 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
          className,
        )}
      >
        <Lock className="mr-1 h-3.5 w-3.5" />
        Langganan belum aktif
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-amber-200 bg-amber-50 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
        className,
      )}
    >
      <Sparkles className="mr-1 h-3.5 w-3.5" />
      Butuh {analysis.requiredPlanLabel}
    </Badge>
  );
}

export function PlanFeatureCallout({
  input,
  title,
  description,
  requirement,
  href = "/admin/settings/billing/subscribe",
  className,
}: {
  input: FeatureInput;
  title: string;
  description: string;
  requirement: Requirement;
  href?: string;
  className?: string;
}) {
  const analysis = analyzeTenantFeatureAccess(input, requirement);
  const featureNames = analysis.features.map((feature) => getFeatureMeta(feature).shortLabel);

  const tone =
    analysis.state === "available"
      ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10"
      : analysis.state === "inactive_subscription"
        ? "border-rose-200 bg-rose-50/80 dark:border-rose-500/20 dark:bg-rose-500/10"
        : "border-amber-200 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10";

  const copy =
    analysis.state === "available"
      ? `${featureNames.join(", ")} sudah aktif di plan ${formatPlanLabel(input.plan)}.`
      : analysis.state === "inactive_subscription"
        ? `${featureNames.join(", ")} ada di ${analysis.requiredPlanLabel}, tapi status langganan tenant belum aktif.`
        : `${featureNames.join(", ")} belum masuk di plan tenant saat ini. Upgrade ke ${analysis.requiredPlanLabel} supaya fitur ini terbuka penuh.`;

  if (analysis.state === "available") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <span className="text-muted-foreground text-xs font-semibold">{title}</span>
        <PlanFeatureBadge input={input} requirement={requirement} />
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", tone, className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-black tracking-tight text-slate-950 dark:text-white">
              {title}
            </div>
            <PlanFeatureBadge input={input} requirement={requirement} />
          </div>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{copy}</p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href={href}>Lihat opsi upgrade</Link>
        </Button>
      </div>
    </div>
  );
}
