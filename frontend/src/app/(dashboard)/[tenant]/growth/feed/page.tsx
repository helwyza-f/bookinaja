"use client";

import { BarChart3, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGrowthWorkspace } from "../_lib/use-growth-workspace";
import {
  GrowthQuickActionCard,
  MarketplaceFeedList,
  PostDraftList,
} from "../_components/marketplace-cards";

export default function GrowthFeedPage() {
  const {
    profile,
    growthHealth,
    drafts,
    feedEntries,
    loading,
    reload,
  } = useGrowthWorkspace();

  if (loading) {
    return <GrowthHomeSkeleton />;
  }

  return (
    <div className="space-y-4 pb-20">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
            Feed Bookinaja
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            Lihat feed seperti yang dilihat customer.
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            Pantau tenant lain yang sedang tampil, lalu rapikan tampilan dan konten bisnis kamu sendiri.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="h-11 rounded-xl bg-blue-600 px-4 hover:bg-blue-500">
            <Link href="/growth/posts">Kelola post</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl px-4">
            <Link href="/growth/profile">Atur profile feed</Link>
          </Button>
          <Button variant="outline" className="h-11 rounded-xl px-4" onClick={() => void reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
                  Semua post terbaru
                </div>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                  Tenant lain yang sedang tampil sekarang
                </h2>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {feedEntries.length} item
              </div>
            </div>
          </div>

          <MarketplaceFeedList entries={feedEntries} />
        </section>

        <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <GrowthQuickActionCard
              title="Skor presence"
              value={`${growthHealth.score}/100`}
              hint="Kesiapan tampilan bisnis kamu"
              icon="presence"
            />
            <GrowthQuickActionCard
              title="Draft aktif"
              value={String(drafts.length)}
              hint="Ide yang bisa langsung diolah"
              icon="draft"
            />
            <GrowthQuickActionCard
              title="Tag aktif"
              value={String(growthHealth.tagCount)}
              hint="Membantu relevansi feed"
              icon="tag"
            />
          </div>

          <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
              <Sparkles className="h-4 w-4" />
              Bisnis kamu
            </div>
            <div className="mt-3 text-xl font-black tracking-tight text-slate-950">
              {profile.name || "Bisnis kamu"}
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              {profile.discovery_headline ||
                "Isi headline singkat supaya positioning bisnis kamu lebih cepat dipahami."}
            </p>
            <div className="mt-4 space-y-3">
              <SimpleChecklistRow
                done={growthHealth.headlineReady}
                label="Headline discovery"
              />
              <SimpleChecklistRow
                done={growthHealth.imageReady}
                label="Gambar utama"
              />
              <SimpleChecklistRow
                done={growthHealth.tagCount >= 2}
                label="Tags dan badges"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button asChild className="h-10 flex-1 rounded-xl bg-blue-600 hover:bg-blue-500">
                <Link href="/growth/profile">Rapikan profile</Link>
              </Button>
              <Button asChild variant="outline" className="h-10 flex-1 rounded-xl">
                <Link href="/growth/insights">Lihat insight</Link>
              </Button>
            </div>
          </Card>

          <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
              <BarChart3 className="h-4 w-4" />
              Queue kamu
            </div>
            <div className="mt-2 text-lg font-black tracking-tight text-slate-950">
              Draft dan ide berikutnya
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Simpan ide, edit caption, lalu jadikan post saat siap dipublikasikan.
            </p>
            <div className="mt-4">
              <PostDraftList drafts={drafts.slice(0, 2)} />
            </div>
            <Button asChild variant="outline" className="mt-4 h-10 w-full rounded-xl">
              <Link href="/growth/posts">Buka semua draft</Link>
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function SimpleChecklistRow({
  done,
  label,
}: {
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          done ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"
        }`}
      >
        {done ? "Siap" : "Perlu"}
      </span>
    </div>
  );
}

function GrowthHomeSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 rounded-[1.25rem] bg-white" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[1200px] rounded-[1.75rem] bg-white" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-[1.75rem] bg-white" />
          <Skeleton className="h-80 rounded-[1.75rem] bg-white" />
          <Skeleton className="h-80 rounded-[1.75rem] bg-white" />
        </div>
      </div>
    </div>
  );
}
