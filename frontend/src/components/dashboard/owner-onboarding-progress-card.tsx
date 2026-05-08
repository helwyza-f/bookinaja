"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DashboardPanel } from "@/components/dashboard/analytics-kit";

type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  href: string;
  complete: boolean;
  required?: boolean;
};

type OnboardingProgressResponse = {
  progress_percent: number;
  completed_steps: number;
  total_steps: number;
  required_incomplete: boolean;
  steps: OnboardingStep[];
};

type Props = {
  tenantId: string;
  welcome: boolean;
};

export function OwnerOnboardingProgressCard({ tenantId, welcome }: Props) {
  const [data, setData] = useState<OnboardingProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const dismissKey = tenantId ? `tenant-onboarding-dismissed:${tenantId}` : "";

  useEffect(() => {
    let cancelled = false;

    const fetchProgress = async () => {
      setLoading(true);
      try {
        const res = await api.get<OnboardingProgressResponse>("/admin/onboarding-progress");
        if (!cancelled) {
          setData(res.data);
        }
      } catch {
        if (!cancelled) {
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchProgress();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!dismissKey) return;
    setDismissed(window.localStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  const visible = useMemo(() => {
    if (!data) return false;
    if (!data.required_incomplete && !welcome) return false;
    if (dismissed) return false;
    return true;
  }, [data, dismissed, welcome]);

  const nextStep = useMemo(() => data?.steps.find((step) => !step.complete) || null, [data]);

  if (loading) {
    return (
      <DashboardPanel
        eyebrow="Onboarding owner"
        title="Menyiapkan workspace tenant"
        description="Progress setup sedang dicek dari server."
      >
        <div className="space-y-4 rounded-[1.5rem] border border-slate-200/80 bg-white/85 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-10 w-28 rounded-2xl" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </DashboardPanel>
    );
  }

  if (!visible || !data) return null;

  return (
    <DashboardPanel
      eyebrow={welcome ? "Welcome setup" : "Onboarding owner"}
      title="Progress setup tenant"
      description="Widget ini sengaja ringan dan dicek lewat endpoint terpisah, jadi dashboard utama tidak perlu ikut menghitung onboarding di browser."
      actions={
        <Button
          type="button"
          variant="ghost"
          className="rounded-xl"
          onClick={() => {
            if (dismissKey) {
              window.localStorage.setItem(dismissKey, "1");
            }
            setDismissed(true);
          }}
        >
          <X className="mr-2 h-4 w-4" />
          Sembunyikan
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/85 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Progress
              </div>
              <div className="mt-2 text-3xl font-[950] tracking-tight text-slate-950 dark:text-white">
                {data.progress_percent}%
              </div>
            </div>
            <Badge className="rounded-full border-none bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-100">
              {data.completed_steps}/{data.total_steps} selesai
            </Badge>
          </div>
          <div className="mt-4 h-3 rounded-full bg-slate-200 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 transition-all"
              style={{ width: `${Math.max(data.progress_percent, 6)}%` }}
            />
          </div>
          <div className="mt-4 rounded-[1.25rem] border border-slate-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-950/40">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  {nextStep ? `Fokus berikutnya: ${nextStep.label}` : "Checklist inti sudah aman"}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {nextStep
                    ? nextStep.description
                    : "Owner bisa lanjut polishing landing page, payment flow, atau konten promosi kapan saja."}
                </div>
                {nextStep ? (
                  <div className="mt-3">
                    <Button asChild size="sm" className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100">
                      <Link href={nextStep.href}>
                        Lanjut setup
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {data.steps.map((step) => (
            <Link
              key={step.id}
              href={step.href}
              className={cn(
                "flex items-start gap-3 rounded-[1.25rem] border p-3 transition-colors",
                step.complete
                  ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  : "border-slate-200/80 bg-white/90 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03]",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                  step.complete
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-950 text-white dark:bg-white dark:text-slate-950",
                )}
              >
                {step.complete ? <CheckCircle2 className="h-4 w-4" /> : <Loader2 className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    {step.label}
                  </div>
                  {step.required ? (
                    <Badge className="rounded-full border-none bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                      Prioritas
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {step.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardPanel>
  );
}

export default OwnerOnboardingProgressCard;
