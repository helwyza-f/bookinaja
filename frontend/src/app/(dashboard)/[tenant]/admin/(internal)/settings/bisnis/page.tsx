"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  LayoutTemplate,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BasicProfileSection } from "./sections/basic-profile-section";
import { ContactLocationSection } from "./sections/contact-location-section";
import { LandingContentSection } from "./sections/landing-content-section";
import { MediaSection } from "./sections/media-section";
import { OperationsSection } from "./sections/operations-section";
import { SeoSection } from "./sections/seo-section";
import {
  defaultTenantProfile,
  type TenantProfile,
} from "./sections/types";

type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  href: string;
  complete: boolean;
  required: boolean;
};

type OnboardingSummaryResponse = {
  progress_percent?: number;
  steps?: OnboardingStep[];
};

const sectionOrder = [
  {
    id: "identity",
    title: "Identitas",
    description: "Nama, slug, copy, dan kontak inti.",
    icon: BriefcaseBusiness,
  },
  {
    id: "media",
    title: "Visual",
    description: "Logo, banner, dan gallery utama.",
    icon: ImageIcon,
  },
  {
    id: "launch",
    title: "Launch",
    description: "Jam operasional, SEO, dan final check.",
    icon: Sparkles,
  },
] as const;

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

export default function BusinessSettingsPage() {
  const [profile, setProfile] = useState<TenantProfile>(defaultTenantProfile);
  const [summary, setSummary] = useState<OnboardingSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchData = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [profileRes, summaryRes] = await Promise.all([
        api.get<TenantProfile>("/admin/profile"),
        api.get<OnboardingSummaryResponse>("/admin/tenant/onboarding-summary"),
      ]);
      setProfile({
        ...defaultTenantProfile,
        ...(profileRes.data || {}),
      });
      setSummary(summaryRes.data || null);
    } catch {
      toast.error("Gagal memuat setup bisnis tenant");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const saveSection = useCallback(
    async (sectionKey: string, patch: Partial<TenantProfile>) => {
      setSavingKey(sectionKey);
      try {
        const nextProfile = { ...profile, ...patch };
        const res = await api.put("/admin/profile", nextProfile);
        setProfile({
          ...defaultTenantProfile,
          ...(res.data?.data || nextProfile),
        });
        toast.success("Perubahan bisnis berhasil disimpan");
        const summaryRes = await api.get<OnboardingSummaryResponse>(
          "/admin/tenant/onboarding-summary",
        );
        setSummary(summaryRes.data || null);
      } catch {
        toast.error("Gagal menyimpan perubahan bisnis");
      } finally {
        setSavingKey(null);
      }
    },
    [profile],
  );

  const publicUrl = useMemo(() => {
    if (!profile.slug) return "";
    return `https://${profile.slug}.bookinaja.com`;
  }, [profile.slug]);

  const checklist = useMemo(
    () => [
      {
        id: "identity",
        label: "Identitas dasar",
        done: Boolean(profile.name && profile.slug && profile.tagline),
      },
      {
        id: "contact",
        label: "Kontak tenant",
        done: Boolean(profile.whatsapp_number && profile.address),
      },
      {
        id: "media",
        label: "Visual utama",
        done: Boolean(profile.logo_url || profile.banner_url),
      },
      {
        id: "ops",
        label: "Jam operasional",
        done: Boolean(profile.open_time && profile.close_time),
      },
      {
        id: "seo",
        label: "SEO dasar",
        done: Boolean(profile.meta_title || profile.meta_description),
      },
    ],
    [profile],
  );

  const completedChecklist = checklist.filter((item) => item.done).length;
  const onboardingProgress =
    summary?.progress_percent ??
    Math.round((completedChecklist / checklist.length) * 100);
  const nextPendingStep =
    (summary?.steps || []).find((step) => !step.complete) || null;

  if (loading) {
    return <BusinessSettingsSkeleton />;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-20">
      <Card className="rounded-3xl border-slate-200/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <span>Setup bisnis</span>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span>Onboarding tenant</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Rapikan pondasi tenant dulu
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              Isi identitas, kontak, dan visual utama di sini. Setelah itu baru
              masuk ke studio untuk atur urutan section dan preview publik.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void fetchData("refresh")}
              className="h-10 rounded-2xl"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button asChild variant="outline" className="h-10 rounded-2xl">
              <Link href="/admin/settings/page-builder">
                Buka Studio
                <LayoutTemplate className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {publicUrl ? (
              <Button asChild className="h-10 rounded-2xl">
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  Lihat Publik
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <StatPill label="Progress" value={`${onboardingProgress}%`} />
          <StatPill
            label="Sudah rapi"
            value={`${completedChecklist}/${checklist.length} area`}
          />
          <StatPill
            label="Fokus berikutnya"
            value={nextPendingStep?.label || "Siap masuk studio"}
          />
        </div>

        <div className="mt-5 h-2 rounded-full bg-slate-200 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--bookinaja-600)] transition-all"
            style={{ width: `${Math.max(onboardingProgress, 6)}%` }}
          />
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="rounded-3xl border-slate-200/80 p-4 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
            <div className="grid gap-3 md:grid-cols-3">
              {sectionOrder.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-4 transition-colors hover:border-[var(--bookinaja-300)] hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-[rgba(96,165,250,0.24)] dark:hover:bg-white/[0.05]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-100)]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 text-sm font-semibold text-slate-950 dark:text-white">
                    {item.title}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {item.description}
                  </div>
                </a>
              ))}
            </div>
          </Card>

          <section id="identity" className="space-y-4 scroll-mt-24">
            <BasicProfileSection
              profile={profile}
              saving={savingKey === "basic"}
              onSave={(patch) => void saveSection("basic", patch)}
            />
            <LandingContentSection
              profile={profile}
              saving={savingKey === "content"}
              onSave={(patch) => void saveSection("content", patch)}
            />
            <ContactLocationSection
              profile={profile}
              saving={savingKey === "contact"}
              onSave={(patch) => void saveSection("contact", patch)}
            />
          </section>

          <section id="media" className="space-y-4 scroll-mt-24">
            <MediaSection
              profile={profile}
              saving={savingKey === "media"}
              onSave={(patch) => void saveSection("media", patch)}
            />
          </section>

          <section id="launch" className="space-y-4 scroll-mt-24">
            <OperationsSection
              profile={profile}
              saving={savingKey === "operations"}
              onSave={(patch) => void saveSection("operations", patch)}
            />
            <SeoSection
              profile={profile}
              saving={savingKey === "seo"}
              onSave={(patch) => void saveSection("seo", patch)}
            />
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card className="rounded-3xl border-slate-200/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Readiness
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {onboardingProgress}%
                </div>
              </div>
              <Badge className="rounded-full border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                {completedChecklist}/{checklist.length}
              </Badge>
            </div>

            <div className="mt-4 space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-3 text-sm dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <span className="text-slate-700 dark:text-slate-200">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                      item.done
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200",
                    )}
                  >
                    {item.done ? "Selesai" : "Belum"}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Next step
            </div>
            <div className="mt-3 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
              {nextPendingStep?.label || "Masuk ke page builder"}
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
              {nextPendingStep?.description ||
                "Kalau pondasi tenant sudah rapi, lanjutkan ke studio untuk atur section dan preview live."}
            </p>
            <Button asChild className="mt-4 w-full rounded-2xl">
              <Link href="/admin/settings/page-builder">
                Buka Page Builder
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Card>

          {(summary?.steps || []).length > 0 ? (
            <Card className="rounded-3xl border-slate-200/80 p-5 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Checklist owner
              </div>
              <div className="mt-4 space-y-3">
                {(summary?.steps || []).map((step, index) => (
                  <Link
                    key={step.id}
                    href={step.href}
                    className="block rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 transition-colors hover:border-[var(--bookinaja-300)] hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-[rgba(96,165,250,0.24)] dark:hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                          step.complete
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200",
                        )}
                      >
                        {step.complete ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-semibold">{index + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-medium text-slate-950 dark:text-white">
                            {step.label}
                          </div>
                          {step.required ? (
                            <Badge
                              variant="outline"
                              className="rounded-full text-[10px] uppercase"
                            >
                              Prioritas
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                          {step.description}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}
        </aside>
      </section>
    </div>
  );
}

function BusinessSettingsSkeleton() {
  return (
    <div className="space-y-4 pb-20">
      <Skeleton className="h-52 rounded-3xl" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
