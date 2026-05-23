"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ExternalLink,
  LayoutTemplate,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/api";
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
        id: "basic-profile",
        label: "Profil Dasar",
        href: "#basic-profile",
        done: Boolean(
          profile.name &&
            profile.slug &&
            profile.business_category &&
            profile.business_type,
        ),
      },
      {
        id: "landing-header",
        label: "Landing & Header",
        href: "#landing-header",
        done: Boolean(
          profile.slogan &&
            profile.tagline &&
            profile.about_us &&
            profile.features?.length,
        ),
      },
      {
        id: "contact-location",
        label: "Kontak & Lokasi",
        href: "#contact-location",
        done: Boolean(
          profile.address &&
            profile.whatsapp_number &&
            (profile.instagram_url || profile.tiktok_url || profile.map_iframe_url),
        ),
      },
      {
        id: "media-gallery",
        label: "Media & Gallery",
        href: "#media-gallery",
        done: Boolean(profile.logo_url && profile.banner_url),
      },
      {
        id: "operations",
        label: "Controller & jam operasional",
        href: "#operations",
        done: Boolean(
          profile.open_time &&
            profile.close_time &&
            profile.timezone &&
            profile.primary_color,
        ),
      },
      {
        id: "seo",
        label: "SEO",
        href: "#seo",
        done: Boolean(profile.meta_title && profile.meta_description),
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
    <div className="mx-auto w-full max-w-6xl space-y-3 pb-16">
      <Card className="rounded-2xl border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <span>Bisnis</span>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span>{onboardingProgress}% siap</span>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span>{completedChecklist}/{checklist.length} area</span>
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Setup bisnis
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Identitas, jam operasional, konten publik, media, dan SEO tenant.
              {nextPendingStep?.label ? ` Fokus berikutnya: ${nextPendingStep.label}.` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => void fetchData("refresh")}
              className="h-9 rounded-xl"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-xl">
              <Link href="/admin/page-builder">
                Page Builder
                <LayoutTemplate className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {publicUrl ? (
              <Button asChild className="h-9 rounded-xl">
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  Publik
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--bookinaja-600)] transition-all"
            style={{ width: `${Math.max(onboardingProgress, 6)}%` }}
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {checklist.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                item.done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-[var(--bookinaja-300)] hover:bg-white dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-300",
              )}
            >
              {item.label}
            </a>
          ))}
        </div>
      </Card>

      <section className="grid gap-3 xl:grid-cols-2">
        <section id="basic-profile" className="scroll-mt-24">
          <BasicProfileSection
            profile={profile}
            saving={savingKey === "basic"}
            onSave={(patch) => void saveSection("basic", patch)}
          />
        </section>
        <section id="operations" className="scroll-mt-24">
          <OperationsSection
            profile={profile}
            saving={savingKey === "operations"}
            onSave={(patch) => void saveSection("operations", patch)}
          />
        </section>
        <section id="landing-header" className="scroll-mt-24">
          <LandingContentSection
            profile={profile}
            saving={savingKey === "content"}
            onSave={(patch) => void saveSection("content", patch)}
          />
        </section>
        <section id="contact-location" className="scroll-mt-24">
          <ContactLocationSection
            profile={profile}
            saving={savingKey === "contact"}
            onSave={(patch) => void saveSection("contact", patch)}
          />
        </section>
        <section id="media-gallery" className="scroll-mt-24">
          <MediaSection
            profile={profile}
            saving={savingKey === "media"}
            onSave={(patch) => void saveSection("media", patch)}
          />
        </section>
        <section id="seo" className="scroll-mt-24">
          <SeoSection
            profile={profile}
            saving={savingKey === "seo"}
            onSave={(patch) => void saveSection("seo", patch)}
          />
        </section>
      </section>
    </div>
  );
}

function BusinessSettingsSkeleton() {
  return (
    <div className="space-y-3 pb-16">
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid gap-3 xl:grid-cols-2">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
