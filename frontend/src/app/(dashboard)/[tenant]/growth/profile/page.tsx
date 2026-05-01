"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscoverySection } from "../../admin/(internal)/settings/bisnis/sections/discovery-section";
import { WorkspaceEmptyLink } from "../_components/marketplace-cards";
import { useGrowthWorkspace } from "../_lib/use-growth-workspace";

export default function GrowthProfilePage() {
  const { profile, growthHealth, loading, reload } = useGrowthWorkspace();
  const [saving, setSaving] = useState(false);

  const publicUrl = useMemo(() => {
    if (!profile.slug) return "";
    return `https://${profile.slug}.bookinaja.com`;
  }, [profile.slug]);

  const saveDiscovery = useCallback(
    async (patch: Partial<typeof profile>) => {
      setSaving(true);
      const nextProfile = { ...profile, ...patch };
      try {
        const res = await api.put("/admin/profile", nextProfile);
        Object.assign(nextProfile, res.data?.data || {});
        toast.success("Discovery profile berhasil disimpan");
        await reload();
      } catch {
        toast.error("Gagal menyimpan discovery profile");
      } finally {
        setSaving(false);
      }
    },
    [profile, reload],
  );

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="space-y-4 pb-20">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-700">
            <Sparkles className="h-3.5 w-3.5" />
            Discovery Profile
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            Atur tampilan bisnis di feed
          </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Kamu hanya mengatur apa yang customer lihat. Urutan tampil dan distribusi diurus sistem Bookinaja.
            </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {publicUrl ? (
            <Button asChild variant="outline" className="h-10 rounded-xl">
              <a href={publicUrl} target="_blank" rel="noreferrer">
                Lihat Halaman Publik
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => void reload()} className="h-10 rounded-xl">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className="rounded-2xl border-blue-100 bg-blue-50/60 p-4 text-sm leading-7 text-slate-600 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
              Yang perlu kamu isi
            </div>
            <div className="mt-2 space-y-2">
              <p>Judul singkat yang gampang dimengerti.</p>
              <p>Alasan kenapa orang harus tertarik.</p>
              <p>Gambar utama yang enak dilihat di mobile.</p>
              <p>Tags dan badge pendek untuk konteks.</p>
            </div>
          </Card>

          <DiscoverySection profile={profile} saving={saving} onSave={saveDiscovery} />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6">
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
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
                Preview di Feed
              </div>
              <div className="text-lg font-black tracking-tight text-slate-950">
                {profile.name || "Nama bisnis"}
              </div>
              <p className="text-sm leading-7 text-slate-700">
                {profile.discovery_headline || profile.tagline || "Isi headline singkat di sini."}
              </p>
              <p className="text-sm leading-7 text-slate-500">
                {profile.highlight_copy || profile.discovery_subheadline || "Alasan singkat akan muncul di sini."}
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Skor presence</span>
                  <span className="font-semibold text-slate-950">{growthHealth.score}/100</span>
                </div>
              </div>
              <WorkspaceEmptyLink />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 rounded-[1.25rem] bg-white" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[640px] rounded-2xl bg-white" />
        <Skeleton className="h-[520px] rounded-2xl bg-white" />
      </div>
    </div>
  );
}
