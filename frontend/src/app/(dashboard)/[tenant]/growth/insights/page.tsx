"use client";

import { BarChart3, Eye, MousePointerClick, RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedIdeaCard, InspirationRail } from "../_components/marketplace-cards";
import { useGrowthWorkspace } from "../_lib/use-growth-workspace";

export default function GrowthInsightsPage() {
  const { marketplaceSamples, growthHealth, posts, loading, reload } = useGrowthWorkspace();

  if (loading) {
    return <InsightsSkeleton />;
  }

  const totalReach = posts.reduce((sum, post) => sum + (post.impressions_7d || 0), 0);
  const totalClicks = posts.reduce((sum, post) => sum + (post.clicks_7d || 0), 0);
  const totalDetailViews = posts.reduce((sum, post) => sum + (post.detail_views_7d || 0), 0);
  const totalTenantOpens = posts.reduce((sum, post) => sum + (post.tenant_opens_7d || 0), 0);
  const totalBookingStarts = posts.reduce((sum, post) => sum + (post.booking_starts_7d || 0), 0);
  const totalRelatedClicks = posts.reduce((sum, post) => sum + (post.related_clicks_7d || 0), 0);
  const totalRelatedTenantOpens = posts.reduce((sum, post) => sum + (post.related_tenant_opens_7d || 0), 0);
  const publishedPosts = posts.filter((post) => post.status === "published");
  const avgCtr =
    totalReach > 0 ? ((totalClicks / totalReach) * 100).toFixed(1) : "0.0";
  const openRate =
    totalDetailViews > 0 ? ((totalTenantOpens / totalDetailViews) * 100).toFixed(1) : "0.0";
  const bookingRate =
    totalTenantOpens > 0 ? ((totalBookingStarts / totalTenantOpens) * 100).toFixed(1) : "0.0";
  const topPerformer =
    [...posts]
      .sort(
        (a, b) =>
          (b.booking_starts_7d || 0) - (a.booking_starts_7d || 0) ||
          (b.tenant_opens_7d || 0) - (a.tenant_opens_7d || 0) ||
          (b.clicks_7d || 0) - (a.clicks_7d || 0),
      )[0] || null;

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
          label="Tayang 7 hari"
          value={totalReach.toLocaleString("id-ID")}
          hint="Impression post di feed"
          icon={<Eye className="h-4 w-4" />}
        />
        <MetricCard
          label="Klik 7 hari"
          value={totalClicks.toLocaleString("id-ID")}
          hint="Klik dari card ke detail"
          icon={<MousePointerClick className="h-4 w-4" />}
        />
        <MetricCard
          label="CTR 7 hari"
          value={`${avgCtr}%`}
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
                title="Detail dibuka"
                status={totalDetailViews.toLocaleString("id-ID")}
                description="Jumlah orang yang lanjut membuka post detail setelah melihat atau mengklik card."
              />
              <InsightRow
                title="Masuk ke bisnis"
                status={`${openRate}%`}
                description="Persentase pengunjung detail post yang lanjut membuka profil bisnis."
              />
              <InsightRow
                title="Mulai booking"
                status={`${bookingRate}%`}
                description="Rasio dari kunjungan ke bisnis yang benar-benar lanjut ke booking start."
              />
              <InsightRow
                title="Klik related"
                status={totalRelatedClicks.toLocaleString("id-ID")}
                description="Interaksi dengan konten terkait dari detail post yang sama."
              />
            </div>
          </Card>

          <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
              Funnel nyata
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <FunnelStep
                label="Post published"
                value={publishedPosts.length.toLocaleString("id-ID")}
                hint="Konten aktif yang benar-benar ikut tampil"
              />
              <FunnelStep
                label="Detail view"
                value={totalDetailViews.toLocaleString("id-ID")}
                hint="Masuk lebih dalam dari card"
              />
              <FunnelStep
                label="Tenant open"
                value={totalTenantOpens.toLocaleString("id-ID")}
                hint="Lanjut lihat bisnisnya"
              />
              <FunnelStep
                label="Booking start"
                value={totalBookingStarts.toLocaleString("id-ID")}
                hint="Mulai intent transaksi"
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
            description={topPerformer ? `"${topPerformer.title}" sekarang paling kuat mendorong langkah berikutnya.` : "Cari kombinasi headline, visual, dan label yang paling kuat menarik perhatian."}
            icon="reach"
          />
          <FeedIdeaCard
            title="Uji format"
            description={`Foto, video, dan promo sekarang bisa dibaca lewat funnel yang sama. Related open: ${totalRelatedTenantOpens.toLocaleString("id-ID")}.`}
            icon="video"
          />
          <FeedIdeaCard
            title="Perbaiki profile"
            description={growthHealth.imageReady && growthHealth.headlineReady ? "Fondasi profile sudah cukup sehat. Sekarang kualitas post jadi pembeda berikutnya." : "Profile card tetap jadi fondasi utama visibility, jangan cuma fokus ke post."}
            icon="spark"
          />
        </aside>
      </div>
    </div>
  );
}

function FunnelStep({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{hint}</div>
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
