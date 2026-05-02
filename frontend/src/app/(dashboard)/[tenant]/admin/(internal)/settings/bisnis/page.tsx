"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { BasicProfileSection } from "./sections/basic-profile-section";
import { ContactLocationSection } from "./sections/contact-location-section";
import { LandingContentSection } from "./sections/landing-content-section";
import { MediaSection } from "./sections/media-section";
import { OperationsSection } from "./sections/operations-section";
import { SeoSection } from "./sections/seo-section";
import { defaultTenantProfile, type TenantProfile } from "./sections/types";

export default function BusinessSettingsPage() {
  const [profile, setProfile] = useState<TenantProfile>(defaultTenantProfile);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/profile");
      setProfile({ ...defaultTenantProfile, ...res.data });
    } catch {
      toast.error("Gagal memuat profil bisnis");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const saveSection = async (
    key: string,
    patch: Partial<TenantProfile>,
    successMessage: string,
  ) => {
    const nextProfile = { ...profile, ...patch };
    setSavingKey(key);
    try {
      const res = await api.put("/admin/profile", nextProfile);
      setProfile({ ...nextProfile, ...(res.data?.data || {}) });
      toast.success(successMessage);
    } catch {
      toast.error("Gagal menyimpan perubahan");
    } finally {
      setSavingKey(null);
    }
  };

  const publicUrl = useMemo(() => {
    if (!profile.slug) return "";
    return `https://${profile.slug}.bookinaja.com`;
  }, [profile.slug]);

  if (loading) {
    return <BusinessSettingsSkeleton />;
  }

  return (
    <div className="space-y-4 pb-20">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              Business Setup
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Pengaturan Bisnis
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              Edit profil bisnis per bagian. Setiap section punya tombol simpan
              sendiri supaya perubahan tidak perlu dipublish sekaligus.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {publicUrl ? (
              <Button asChild variant="outline" className="h-10 rounded-xl dark:border-white/10 dark:bg-white/[0.03]">
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  Landing Public
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={fetchProfile}
              className="h-10 rounded-xl dark:border-white/10 dark:bg-white/[0.03]"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <Summary label="Nama" value={profile.name || "-"} />
          <Summary label="Slug" value={profile.slug || "-"} />
          <Summary
            label="Jam"
            value={`${profile.open_time || "-"} - ${profile.close_time || "-"}`}
          />
          <Summary
            label="Gallery"
            value={`${profile.gallery?.length || 0} foto`}
          />
          <Summary label="Warna" value={profile.primary_color || "-"} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <BasicProfileSection
            key={`basic-${profile.name}-${profile.slug}-${profile.business_category}-${profile.business_type}`}
            profile={profile}
            saving={savingKey === "basic"}
            onSave={(patch) =>
              saveSection("basic", patch, "Profil dasar disimpan")
            }
          />
          <LandingContentSection
            key={`landing-${profile.slogan}-${profile.tagline}-${profile.about_us}-${profile.features?.join("|")}`}
            profile={profile}
            saving={savingKey === "landing"}
            onSave={(patch) =>
              saveSection("landing", patch, "Konten landing disimpan")
            }
          />
          <MediaSection
            key={`media-${profile.logo_url}-${profile.banner_url}-${profile.gallery?.join("|")}`}
            profile={profile}
            saving={savingKey === "media"}
            onSave={(patch) =>
              saveSection("media", patch, "Media bisnis disimpan")
            }
          />
          <ContactLocationSection
            key={`contact-${profile.address}-${profile.whatsapp_number}-${profile.instagram_url}-${profile.tiktok_url}-${profile.map_iframe_url}`}
            profile={profile}
            saving={savingKey === "contact"}
            onSave={(patch) =>
              saveSection("contact", patch, "Kontak dan lokasi disimpan")
            }
          />
          <SeoSection
            key={`seo-${profile.meta_title}-${profile.meta_description}`}
            profile={profile}
            saving={savingKey === "seo"}
            onSave={(patch) => saveSection("seo", patch, "SEO disimpan")}
          />
          <OperationsSection
            key={`ops-${profile.open_time}-${profile.close_time}-${profile.primary_color}`}
            profile={profile}
            saving={savingKey === "operations"}
            onSave={(patch) =>
              saveSection("operations", patch, "Jam operasional disimpan")
            }
          />
        </div>

        <aside className="h-fit space-y-4 xl:sticky xl:top-6">
          <PreviewCard profile={profile} publicUrl={publicUrl} />
        </aside>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function PreviewCard({
  profile,
  publicUrl,
}: {
  profile: TenantProfile;
  publicUrl: string;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm dark:border-white/15 dark:bg-[#0f0f17] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="aspect-video bg-slate-100 dark:bg-white/5">
        {profile.featured_image_url || profile.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.featured_image_url || profile.banner_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Hero belum ada
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="mb-4 rounded-2xl border border-[color:rgba(59,130,246,0.18)] bg-[var(--bookinaja-50)] p-4 text-slate-800 dark:border-[color:rgba(96,165,250,0.18)] dark:bg-[color:rgba(59,130,246,0.12)] dark:text-slate-100">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bookinaja-700)] text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--bookinaja-700)] dark:text-[var(--bookinaja-100)]">
                Discovery Module
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                  Pengaturan tampilan bisnis, postingan, dan feed customer sekarang punya modul terpisah agar profil bisnis tetap fokus pada identitas dan operasional inti.
              </p>
              <Button asChild size="sm" className="mt-3 h-9 rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]">
                  <Link href="/admin/settings/discovery">Buka Promosi Bisnis</Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5">
            {profile.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logo_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold text-slate-400">
                {(profile.name || "B").slice(0, 1)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-950 dark:text-white">
              {profile.name || "Nama bisnis"}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
              {profile.discovery_headline ||
                profile.tagline ||
                profile.slogan ||
                "Headline discovery belum diisi"}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <Row
            label="Warna"
            value={profile.primary_color || "-"}
            color={profile.primary_color}
          />
          <Row label="WhatsApp" value={profile.whatsapp_number || "-"} />
          <Row
            label="Instagram"
            value={profile.instagram_url ? "Terhubung" : "-"}
          />
          <Row label="Public URL" value={publicUrl || "-"} />
        </div>
      </div>
    </Card>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="flex min-w-0 items-center gap-2 font-medium text-slate-900 dark:text-white">
        {color ? (
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: color }}
          />
        ) : null}
        <span className="truncate">{value}</span>
      </span>
    </div>
  );
}

function BusinessSettingsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-40 rounded-2xl bg-white dark:bg-white/5" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-64 rounded-2xl bg-white dark:bg-white/5"
            />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl bg-white dark:bg-white/5" />
      </div>
    </div>
  );
}
