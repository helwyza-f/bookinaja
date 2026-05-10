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
    title: "Identitas bisnis",
    description: "Nama, kategori, copy, dan kontak utama tenant.",
    icon: BriefcaseBusiness,
  },
  {
    id: "media",
    title: "Visual utama",
    description: "Logo, banner, dan gallery supaya halaman publik tidak kosong.",
    icon: ImageIcon,
  },
  {
    id: "launch",
    title: "Finishing launch",
    description: "Jam operasional, SEO, lalu polish layout di studio.",
    icon: Sparkles,
  },
] as const;

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

  const saveSection = useCallback(async (sectionKey: string, patch: Partial<TenantProfile>) => {
    setSavingKey(sectionKey);
    try {
      const nextProfile = { ...profile, ...patch };
      const res = await api.put("/admin/profile", nextProfile);
      setProfile({
        ...defaultTenantProfile,
        ...(res.data?.data || nextProfile),
      });
      toast.success("Perubahan bisnis berhasil disimpan");
      const summaryRes = await api.get<OnboardingSummaryResponse>("/admin/tenant/onboarding-summary");
      setSummary(summaryRes.data || null);
    } catch {
      toast.error("Gagal menyimpan perubahan bisnis");
    } finally {
      setSavingKey(null);
    }
  }, [profile]);

  const publicUrl = useMemo(() => {
    if (!profile.slug) return "";
    return `https://${profile.slug}.bookinaja.com`;
  }, [profile.slug]);

  const launchReadiness = useMemo(() => {
    const checks = [
      Boolean(profile.name && profile.slug && profile.tagline),
      Boolean(profile.whatsapp_number && profile.address),
      Boolean(profile.logo_url || profile.banner_url),
      Boolean(profile.open_time && profile.close_time),
      Boolean(profile.meta_title || profile.meta_description),
    ];
    return checks.filter(Boolean).length;
  }, [profile]);

  const checklist = useMemo(
    () => [
      {
        id: "identity",
        label: "Isi identitas dasar",
        done: Boolean(profile.name && profile.slug && profile.tagline),
      },
      {
        id: "contact",
        label: "Lengkapi kontak tenant",
        done: Boolean(profile.whatsapp_number && profile.address),
      },
      {
        id: "media",
        label: "Pasang visual utama",
        done: Boolean(profile.logo_url || profile.banner_url),
      },
      {
        id: "ops",
        label: "Review jam operasional",
        done: Boolean(profile.open_time && profile.close_time),
      },
    ],
    [profile],
  );

  const completedChecklist = checklist.filter((item) => item.done).length;
  const onboardingProgress = summary?.progress_percent ?? Math.round((completedChecklist / checklist.length) * 100);

  if (loading) {
    return <BusinessSettingsSkeleton />;
  }

  return (
    <div className="space-y-4 pb-20">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Card className="overflow-hidden rounded-[1.75rem] border-slate-200/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94))] p-5 shadow-sm dark:border-white/12 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(8,47,73,0.94))]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--bookinaja-200)] bg-[var(--bookinaja-50)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--bookinaja-700)] dark:border-[rgba(96,165,250,0.24)] dark:bg-[rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-100)]">
                <BriefcaseBusiness className="h-3.5 w-3.5" />
                Setup Bisnis
              </div>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Flow onboarding tenant yang lebih simple
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                Isi pondasi bisnis di sini dulu. Kalau identitas, kontak, dan visual utama sudah rapi,
                baru lanjut ke page builder untuk atur urutan section dan preview live.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void fetchData("refresh")}
                className="h-10 rounded-xl"
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
                Refresh
              </Button>
              <Button asChild variant="outline" className="h-10 rounded-xl">
                <Link href="/admin/settings/page-builder">
                  Buka Studio
                  <LayoutTemplate className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {publicUrl ? (
                <Button asChild className="h-10 rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]">
                  <a href={publicUrl} target="_blank" rel="noreferrer">
                    Lihat Publik
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200/90 bg-white p-5 shadow-sm dark:border-white/12 dark:bg-[#0f172a]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
                Readiness
              </div>
              <div className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                {onboardingProgress}%
              </div>
            </div>
            <Badge className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white dark:bg-white dark:text-slate-950">
              {launchReadiness}/5 core
            </Badge>
          </div>
          <div className="mt-4 h-2 rounded-full bg-slate-200 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--bookinaja-600)] transition-all"
              style={{ width: `${Math.max(onboardingProgress, 8)}%` }}
            />
          </div>
          <div className="mt-4 space-y-2">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/[0.03]"
              >
                <span className="text-slate-700 dark:text-slate-200">{item.label}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]",
                    item.done
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200",
                  )}
                >
                  {item.done ? "Selesai" : "Perlu isi"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {sectionOrder.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-[var(--bookinaja-300)] hover:bg-[var(--bookinaja-50)] dark:border-white/12 dark:bg-[#0f172a] dark:hover:border-[rgba(96,165,250,0.24)] dark:hover:bg-[rgba(59,130,246,0.08)]"
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
          <Card className="rounded-[1.75rem] border-slate-200/90 bg-white p-5 shadow-sm dark:border-white/12 dark:bg-[#0f172a]">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              Checklist owner
            </div>
            <div className="mt-4 space-y-3">
              {(summary?.steps || []).map((step, index) => (
                <Link
                  key={step.id}
                  href={step.href}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-[var(--bookinaja-300)] hover:bg-[var(--bookinaja-50)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-[rgba(96,165,250,0.24)] dark:hover:bg-[rgba(59,130,246,0.08)]"
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
                        <span className="text-xs font-bold">{index + 1}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-slate-950 dark:text-white">
                          {step.label}
                        </div>
                        {step.required ? (
                          <Badge variant="outline" className="rounded-full text-[10px] uppercase">
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

          <Card className="rounded-[1.75rem] border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-5 shadow-sm dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(8,12,24,0.98))]">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              Next step
            </div>
            <div className="mt-3 text-lg font-bold tracking-tight text-slate-950 dark:text-white">
              Lanjut ke Page Builder kalau pondasinya sudah beres
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Studio ini sekarang lebih enak dipakai kalau copy, kontak, dan visual utamanya sudah jadi.
              Di sana kamu tinggal atur section, variant, warna, dan preview live.
            </p>
            <Button asChild className="mt-4 h-11 w-full rounded-2xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]">
              <Link href="/admin/settings/page-builder">
                Buka Page Builder
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Card>
        </aside>
      </section>
    </div>
  );
}

function BusinessSettingsSkeleton() {
  return (
    <div className="space-y-4 pb-20">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Skeleton className="h-64 rounded-[1.75rem]" />
        <Skeleton className="h-64 rounded-[1.75rem]" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-36 rounded-[1.4rem]" />
            <Skeleton className="h-36 rounded-[1.4rem]" />
            <Skeleton className="h-36 rounded-[1.4rem]" />
          </div>
          <Skeleton className="h-64 rounded-[1.75rem]" />
          <Skeleton className="h-72 rounded-[1.75rem]" />
          <Skeleton className="h-72 rounded-[1.75rem]" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-80 rounded-[1.75rem]" />
          <Skeleton className="h-56 rounded-[1.75rem]" />
        </div>
      </div>
    </div>
  );
}
