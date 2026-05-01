"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscoverySection } from "../bisnis/sections/discovery-section";
import {
  defaultTenantProfile,
  type TenantProfile,
} from "../bisnis/sections/types";

export default function DiscoverySettingsPage() {
  const [profile, setProfile] = useState<TenantProfile>(defaultTenantProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/profile");
      setProfile({ ...defaultTenantProfile, ...res.data });
    } catch {
      toast.error("Gagal memuat konfigurasi discovery");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const saveDiscovery = async (patch: Partial<TenantProfile>) => {
    setSaving(true);
    const nextProfile = { ...profile, ...patch };
    try {
      const res = await api.put("/admin/profile", nextProfile);
      setProfile({ ...nextProfile, ...(res.data?.data || {}) });
      toast.success("Konfigurasi discovery disimpan");
    } catch {
      toast.error("Gagal menyimpan konfigurasi discovery");
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = useMemo(() => {
    if (!profile.slug) return "";
    return `https://${profile.slug}.bookinaja.com`;
  }, [profile.slug]);

  if (loading) {
    return <DiscoverySettingsSkeleton />;
  }

  return (
    <div className="space-y-4 pb-20">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#1f4b49]">
              <Sparkles className="h-3.5 w-3.5" />
              Discovery & Marketplace
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Kurasi tampilan bisnis di feed customer
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              Atur headline discovery, promo, featured image, ranking, dan sinyal editorial untuk marketplace Bookinaja tanpa mengganggu pengaturan inti bisnis.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {publicUrl ? (
              <Button asChild variant="outline" className="h-10 rounded-xl">
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
              className="h-10 rounded-xl"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <Metric label="Tenant" value={profile.name || "-"} />
          <Metric
            label="Promo"
            value={profile.discovery_promoted ? "Aktif" : "Normal"}
          />
          <Metric
            label="Featured"
            value={profile.discovery_featured ? "Ya" : "Tidak"}
          />
          <Metric
            label="Priority"
            value={String(profile.discovery_priority || 0)}
          />
          <Metric
            label="Tags"
            value={`${profile.discovery_tags?.length || 0} item`}
          />
          <Metric
            label="Badges"
            value={`${profile.discovery_badges?.length || 0} item`}
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <DiscoverySection
            key={`discovery-${profile.discovery_headline}-${profile.discovery_subheadline}-${profile.promo_label}-${profile.featured_image_url}-${profile.highlight_copy}-${profile.discovery_tags?.join("|")}-${profile.discovery_badges?.join("|")}-${profile.discovery_priority}-${profile.discovery_featured}-${profile.discovery_promoted}`}
            profile={profile}
            saving={saving}
            onSave={saveDiscovery}
          />
        </div>

        <aside className="h-fit space-y-4 xl:sticky xl:top-6">
          <MarketplacePreview profile={profile} />
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function MarketplacePreview({ profile }: { profile: TenantProfile }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
      <div
        className="h-40 w-full bg-cover bg-center"
        style={{
          backgroundImage: profile.featured_image_url || profile.banner_url
            ? `url(${profile.featured_image_url || profile.banner_url})`
            : "linear-gradient(135deg, rgba(16,34,41,0.92), rgba(215,162,90,0.68))",
        }}
      />
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1f4b49]">
              Preview Feed Card
            </p>
            <h2 className="mt-2 text-lg font-black uppercase tracking-[-0.03em] text-slate-950 dark:text-white">
              {profile.name || "Nama bisnis"}
            </h2>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700 dark:bg-white/10 dark:text-white">
            {profile.promo_label || "Normal"}
          </div>
        </div>

        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {profile.discovery_headline ||
            profile.tagline ||
            "Headline discovery belum diisi"}
        </p>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          {profile.highlight_copy ||
            profile.discovery_subheadline ||
            "Highlight copy akan tampil sebagai alasan kenapa bisnis ini layak dijelajahi."}
        </p>

        <div className="flex flex-wrap gap-2">
          {(profile.discovery_tags || []).slice(0, 3).map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-200"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Featured</span>
            <span className="font-semibold text-slate-950 dark:text-white">
              {profile.discovery_featured ? "Aktif" : "Tidak"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Promoted</span>
            <span className="font-semibold text-slate-950 dark:text-white">
              {profile.discovery_promoted ? "Aktif" : "Tidak"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Priority</span>
            <span className="font-semibold text-slate-950 dark:text-white">
              {profile.discovery_priority || 0}
            </span>
          </div>
        </div>

        <Button asChild variant="outline" className="w-full rounded-xl">
          <Link href="/admin/settings/bisnis">Kembali ke Pengaturan Bisnis</Link>
        </Button>
      </div>
    </Card>
  );
}

function DiscoverySettingsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-40 rounded-2xl bg-white dark:bg-white/5" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[640px] rounded-2xl bg-white dark:bg-white/5" />
        <Skeleton className="h-[520px] rounded-2xl bg-white dark:bg-white/5" />
      </div>
    </div>
  );
}
