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
      toast.error("Gagal memuat pengaturan marketplace");
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
      toast.success("Tampilan marketplace berhasil disimpan");
    } catch {
      toast.error("Gagal menyimpan pengaturan marketplace");
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
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              Discovery & Marketplace
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              Atur bagaimana bisnis kamu terlihat
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Halaman ini dipakai untuk menentukan apa yang dilihat customer saat menemukan bisnis kamu di feed dan marketplace Bookinaja.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {publicUrl ? (
              <Button asChild variant="outline" className="h-10 rounded-xl">
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  Lihat Halaman Publik
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
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className="rounded-2xl border-blue-100 bg-blue-50/60 p-4 text-sm leading-7 text-slate-600 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
              Cara pakainya
            </div>
            <div className="mt-2 space-y-2">
              <p>1. Isi judul singkat yang menjelaskan kenapa bisnis kamu menarik.</p>
              <p>2. Isi alasan singkat supaya customer paham apa yang membuat tempat ini layak dicoba.</p>
              <p>3. Tambahkan label pendek seperti promo atau suasana tempat.</p>
              <p>4. Upload gambar utama agar card di marketplace terlihat lebih kuat di mobile.</p>
              <p>5. Ranking, momentum promo, dan penempatan unggulan diatur otomatis oleh sistem Bookinaja.</p>
            </div>
          </Card>

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

function MarketplacePreview({ profile }: { profile: TenantProfile }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-blue-100 bg-white shadow-sm">
      <div
        className="h-40 w-full bg-cover bg-center"
        style={{
          backgroundImage: profile.featured_image_url || profile.banner_url
            ? `url(${profile.featured_image_url || profile.banner_url})`
            : "linear-gradient(135deg, rgba(13,31,39,0.92), rgba(96,165,250,0.68))",
        }}
      />
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
              Preview Customer
            </p>
            <h2 className="mt-2 text-lg font-black uppercase tracking-[-0.03em] text-slate-950">
              {profile.name || "Nama bisnis"}
            </h2>
          </div>
          <div className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
            {profile.promo_label || "Normal"}
          </div>
        </div>

        <p className="text-sm leading-6 text-slate-700">
          {profile.discovery_headline ||
            profile.tagline ||
            "Judul singkat bisnis kamu akan tampil di sini."}
        </p>
        <p className="text-sm leading-6 text-slate-500">
          {profile.highlight_copy ||
            profile.discovery_subheadline ||
            "Alasan singkat kenapa customer harus tertarik akan muncul di bagian ini."}
        </p>

        <div className="flex flex-wrap gap-2">
          {(profile.discovery_tags || []).slice(0, 3).map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Ranking feed</span>
            <span className="font-semibold text-slate-950">
              Otomatis
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-slate-500">Momentum promo</span>
            <span className="font-semibold text-slate-950">
              Otomatis
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
      <Skeleton className="h-40 rounded-2xl bg-white" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[640px] rounded-2xl bg-white" />
        <Skeleton className="h-[520px] rounded-2xl bg-white" />
      </div>
    </div>
  );
}
