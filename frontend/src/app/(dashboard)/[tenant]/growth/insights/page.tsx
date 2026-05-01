"use client";

import { BarChart3, Eye, MousePointerClick, RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedIdeaCard, InspirationRail } from "../_components/marketplace-cards";
import { useGrowthWorkspace } from "../_lib/use-growth-workspace";

export default function GrowthInsightsPage() {
  const { marketplaceSamples, growthHealth, profile, loading, reload } = useGrowthWorkspace();

  if (loading) {
    return <InsightsSkeleton />;
  }

  const estimatedReach = Math.max(120, marketplaceSamples.length * 37 + growthHealth.score * 3);
  const estimatedClicks = Math.max(12, Math.round(estimatedReach * 0.08));
  const estimatedCtr = ((estimatedClicks / estimatedReach) * 100).toFixed(1);

  return (
    <div className="space-y-4 pb-20">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
              Performa
            </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            Baca performa presence bisnis kamu.
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            Lihat apakah tampilan bisnis kamu cukup kuat untuk menghasilkan tayangan dan klik.
          </p>
        </div>
        <Button variant="outline" className="h-11 rounded-xl" onClick={() => void reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Reach est."
          value={estimatedReach.toLocaleString("id-ID")}
          hint="Estimasi exposure awal"
          icon={<Eye className="h-4 w-4" />}
        />
        <MetricCard
          label="Klik est."
          value={estimatedClicks.toLocaleString("id-ID")}
          hint="Respons awal feed"
          icon={<MousePointerClick className="h-4 w-4" />}
        />
        <MetricCard
          label="CTR est."
          value={`${estimatedCtr}%`}
          hint="Kekuatan click-through"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          label="Presence score"
          value={`${growthHealth.score}/100`}
          hint="Kesiapan profile saat ini"
          icon={<BarChart3 className="h-4 w-4" />}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-4">
          <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
              Faktor utama
            </div>
            <div className="mt-4 space-y-3">
              <InsightRow
                title="Gambar utama"
                status={growthHealth.imageReady ? "Siap" : "Perlu diperbaiki"}
                description="Visual hampir selalu jadi penentu pertama apakah card dibuka atau dilewati."
              />
              <InsightRow
                title="Headline discovery"
                status={growthHealth.headlineReady ? "Siap" : "Perlu diperjelas"}
                description="Kalimat utama harus cepat menjelaskan manfaat atau suasana yang dijual."
              />
              <InsightRow
                title="Tag & badge"
                status={`${growthHealth.tagCount} tag / ${growthHealth.badgeCount} badge`}
                description="Membantu relevansi dan memperjelas konteks bisnis di feed."
              />
              <InsightRow
                title="Angle promosi"
                status={profile.promo_label || "Belum ditetapkan"}
                description="Label pendek membantu customer menangkap momentum atau vibe bisnis."
              />
            </div>
          </Card>

          <section className="space-y-3">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
                Feed Bookinaja
              </div>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                Bandingkan dengan tenant lain
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                Lihat kualitas visual dan pola copy yang sedang aktif di feed Bookinaja.
              </p>
            </div>
            <InspirationRail items={marketplaceSamples} />
          </section>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
          <FeedIdeaCard
            title="Top angle"
            description="Cari kombinasi headline, visual, dan label yang paling kuat menarik perhatian."
            icon="reach"
          />
          <FeedIdeaCard
            title="Uji format"
            description="Bandingkan foto, video, dan promo copy untuk lihat format yang paling hidup."
            icon="video"
          />
          <FeedIdeaCard
            title="Perbaiki profile"
            description="Profile card tetap jadi fondasi utama visibility, jangan cuma fokus ke post."
            icon="spark"
          />
        </aside>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="rounded-[1.5rem] border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-2xl font-black tracking-tight text-slate-950">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{hint}</div>
    </Card>
  );
}

function InsightRow({
  title,
  status,
  description,
}: {
  title: string;
  status: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-950">{title}</div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-600">
          {status}
        </div>
      </div>
      <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 rounded-[1.25rem] bg-white" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-32 rounded-[1.5rem] bg-white" />
        <Skeleton className="h-32 rounded-[1.5rem] bg-white" />
        <Skeleton className="h-32 rounded-[1.5rem] bg-white" />
        <Skeleton className="h-32 rounded-[1.5rem] bg-white" />
      </div>
      <Skeleton className="h-[760px] rounded-[1.75rem] bg-white" />
    </div>
  );
}
