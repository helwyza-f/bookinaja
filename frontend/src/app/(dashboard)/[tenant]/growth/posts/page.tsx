"use client";

import Link from "next/link";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FeedIdeaCard, InspirationRail } from "../_components/marketplace-cards";
import { type GrowthPostRecord } from "../_lib/growth-data";
import { useGrowthWorkspace } from "../_lib/use-growth-workspace";

export default function GrowthPostsPage() {
  const { posts, marketplaceSamples, loading, reload } = useGrowthWorkspace();

  const sortedPosts = [...posts].sort((a, b) => {
    const rank = (status: string) =>
      status === "published" ? 0 : status === "scheduled" ? 1 : 2;
    const rankDiff = rank(a.status) - rank(b.status);
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
  });

  const handleDelete = async (post: GrowthPostRecord) => {
    if (!confirm(`Hapus postingan "${post.title}"?`)) return;
    try {
      await api.delete(`/admin/growth/posts/${post.id}`);
      toast.success("Postingan berhasil dihapus");
      await reload();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menghapus postingan"));
    }
  };

  if (loading) {
    return <PostsSkeleton />;
  }

  return (
    <div className="space-y-4 pb-20">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
            Postingan & Konten
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            Kelola semua postingan bisnis kamu.
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            Buka editor khusus untuk bikin post baru, rapikan draft lama, dan lihat mana yang sudah tampil di Feed Bookinaja.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="h-11 rounded-xl bg-blue-600 hover:bg-blue-500">
            <Link href="/growth/posts/new">
              <Plus className="mr-2 h-4 w-4" />
              Buat post baru
            </Link>
          </Button>
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => void reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
                Semua post
              </div>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                Draft, jadwal, dan post yang sudah tayang
              </h2>
            </div>
            <Badge className="rounded-full bg-slate-100 text-slate-700">
              {sortedPosts.length} item
            </Badge>
          </div>

          {sortedPosts.length === 0 ? (
            <Card className="rounded-[1.5rem] border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Belum ada postingan. Mulai dari satu post foto, promo, atau update singkat.
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedPosts.map((post) => (
                <PostItemCard
                  key={post.id}
                  post={post}
                  onDelete={() => void handleDelete(post)}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
          <FeedIdeaCard
            title="Post promo"
            description="Bagus untuk dorong traffic saat ada momentum yang jelas."
            icon="reach"
          />
          <FeedIdeaCard
            title="Post ambience"
            description="Jual suasana dan pengalaman, bukan cuma daftar fitur."
            icon="video"
          />
          <FeedIdeaCard
            title="Post update"
            description="Umumkan hal baru yang bikin orang punya alasan untuk balik."
            icon="spark"
          />
        </aside>
      </div>

      <section className="space-y-3">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
            Feed Bookinaja
          </div>
          <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
            Lihat tenant lain yang sedang tampil
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
            Pakai ini untuk membaca angle visual, cara menulis hook, dan ritme konten yang sedang aktif.
          </p>
        </div>
        <InspirationRail items={marketplaceSamples} />
      </section>
    </div>
  );
}

function PostItemCard({
  post,
  onDelete,
}: {
  post: GrowthPostRecord;
  onDelete: () => void;
}) {
  return (
    <Card className="rounded-[1.5rem] border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className="h-24 w-full rounded-[1.1rem] bg-cover bg-center sm:h-20 sm:w-28 sm:shrink-0"
          style={{
            backgroundImage: post.thumbnail_url || post.cover_media_url
              ? `url(${post.thumbnail_url || post.cover_media_url})`
              : "linear-gradient(135deg, rgba(15,31,74,0.96), rgba(59,130,246,0.68))",
          }}
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-blue-50 text-blue-700">{labelForType(post.type)}</Badge>
            <Badge className="rounded-full bg-slate-100 text-slate-700">{post.status}</Badge>
            <Badge className="rounded-full bg-slate-100 text-slate-700">{post.visibility}</Badge>
          </div>
          <div>
            <div className="text-base font-black tracking-tight text-slate-950">
              {post.title}
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              {post.caption || "Belum ada caption."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {post.status === "published"
                ? "Sudah tayang"
                : post.status === "scheduled"
                  ? `Tayang ${humanizeDate(post.starts_at)}`
                  : "Masih draft"}
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="h-9 rounded-xl px-3">
                <Link href={`/growth/posts/${post.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button variant="outline" className="h-9 rounded-xl px-3 text-red-600" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function labelForType(type?: string) {
  switch (type) {
    case "video":
      return "Video";
    case "promo":
      return "Promo";
    case "update":
      return "Update";
    default:
      return "Foto";
  }
}

function humanizeDate(value?: string | null) {
  if (!value) return "nanti";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "nanti";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error &&
    "response" in error &&
    typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
  ) {
    return (error as { response?: { data?: { error?: string } } }).response!.data!.error!;
  }
  return fallback;
}

function PostsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 rounded-[1.25rem] bg-white" />
      <Skeleton className="h-[760px] rounded-[1.75rem] bg-white" />
    </div>
  );
}
