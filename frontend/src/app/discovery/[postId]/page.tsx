"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, CalendarClock, PlayCircle } from "lucide-react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscoveryVideoPlayer } from "@/components/media/discovery-video-player";
import {
  type DiscoveryPostDetailResponse,
  formatDiscoveryDuration,
  formatStartingPrice,
  getDiscoveryItemBadges,
  getDiscoveryItemHref,
  getDiscoveryItemImage,
  getDiscoveryItemLabel,
  getDiscoveryItemReason,
  getDiscoveryItemSummary,
  getDiscoveryTenantHrefFromPost,
  getDiscoveryItemTitle,
  isDiscoveryVideoPost,
} from "@/lib/discovery";
import { getTenantUrl } from "@/lib/tenant";
import { trackDiscoveryEvent } from "@/lib/discovery-analytics";

export default function DiscoverPostDetailPage() {
  const params = useParams<{ postId: string }>();
  const [data, setData] = useState<DiscoveryPostDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await api.get(`/public/discover/posts/${params.postId}`);
        if (active) setData(res.data || null);
      } catch {
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [params.postId]);

  useEffect(() => {
    if (!data?.item) return;
    trackDiscoveryEvent({
      tenant_id: data.item.tenant_id || data.item.id,
      tenant_slug: data.item.slug,
      event_type: "detail_view",
      surface: "discover-post-detail",
      section_id: "post-detail",
      card_variant: data.item.post_type || "post",
      position_index: 0,
      promo_label: data.item.feed_label || data.item.promo_label,
      metadata: {
        post_id: data.item.post_id,
        post_type: data.item.post_type,
        tenant_slug: data.item.slug,
      },
    });
  }, [data]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 md:px-6">
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-[520px] rounded-[2rem]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <Card className="rounded-[2rem] border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-2xl font-black tracking-tight text-slate-950">Postingan tidak ditemukan</div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
            Postingan ini mungkin sudah tidak tayang lagi atau belum tersedia untuk publik.
          </p>
          <Button asChild className="mt-6 h-11 rounded-2xl bg-blue-600 hover:bg-blue-500">
            <Link href="/tenants">Kembali ke Jelajahi Bisnis</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const item = data.item;
  const tenant = data.tenant;
  const heroImage = getDiscoveryItemImage(item);
  const isVideo = isDiscoveryVideoPost(item);
  const publishedText = item.post_published_at
    ? new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(item.post_published_at))
    : null;
  const tenantHref = getDiscoveryTenantHrefFromPost(item);

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 md:px-6 md:py-6">
      <Button asChild variant="ghost" className="-ml-3 h-10 rounded-xl px-3 text-slate-500 hover:text-slate-950">
        <Link href="/discovery">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Discovery
        </Link>
      </Button>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
          <CardContent className="p-0">
            <div className="relative">
              {isVideo && (item.post_cover_media_url || item.feed_image_url) ? (
                <DiscoveryVideoPlayer
                  src={item.post_cover_media_url || item.feed_image_url}
                  hlsSrc={item.post_stream_url_hls}
                  poster={item.post_poster_url || item.post_thumbnail_url || tenant.featured_image_url || tenant.banner_url}
                />
              ) : (
                <div
                  className="h-[260px] w-full bg-cover bg-center md:h-[420px]"
                  style={{
                    backgroundImage: heroImage
                      ? `url(${heroImage})`
                      : "linear-gradient(135deg, rgba(15,31,74,0.96), rgba(59,130,246,0.68))",
                  }}
                />
              )}
            </div>

            <div className="space-y-5 p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-blue-50 text-blue-700">
                  {getDiscoveryItemLabel(item)}
                </Badge>
                <Badge className="rounded-full bg-slate-100 text-slate-700">
                  {isVideo ? "Video" : item.post_type === "promo" ? "Promo" : "Post"}
                </Badge>
                <Badge className="rounded-full bg-slate-100 text-slate-700">
                  {formatStartingPrice(item.starting_price)}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
                  <Building2 className="h-4 w-4" />
                  Diposting oleh {tenant.name}
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    {item.post_detail_views_7d || 0} buka detail / 7 hari
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    {item.post_tenant_opens_7d || 0} lanjut ke bisnis
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    {item.post_booking_starts_7d || 0} mulai booking
                  </span>
                </div>
                {publishedText ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <CalendarClock className="h-4 w-4 text-blue-600" />
                    Tayang {publishedText}
                  </div>
                ) : null}
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  {getDiscoveryItemTitle(item)}
                </h1>
                <p className="text-base leading-8 text-slate-600">
                  {getDiscoveryItemSummary(item)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {getDiscoveryItemBadges(item).slice(0, 5).map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                  Kenapa ini muncul
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {getDiscoveryItemReason(item) || "Postingan ini sedang dianggap relevan oleh Feed Bookinaja."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
          <Card className="rounded-[1.75rem] border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
              Tentang bisnis ini
            </div>
            <div className="mt-3 text-xl font-black tracking-tight text-slate-950">
              {tenant.name}
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              {tenant.discovery_subheadline || tenant.tagline || "Lihat bisnis ini lebih lengkap."}
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span>Kategori</span>
                <span className="font-semibold text-slate-950">{tenant.business_category || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Tipe post</span>
                <span className="font-semibold text-slate-950">
                  {isVideo ? "Video" : item.post_type === "promo" ? "Promo" : "Foto / Update"}
                </span>
              </div>
              {isVideo ? (
                <div className="flex items-center justify-between gap-3">
                  <span>Durasi</span>
                  <span className="font-semibold text-slate-950">
                    {formatDiscoveryDuration(item.post_duration_seconds) || "-"}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <span>Format</span>
                <span className="font-semibold text-slate-950">{item.post_mime_type || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Resolusi</span>
                <span className="font-semibold text-slate-950">
                  {item.post_width && item.post_height ? `${item.post_width} x ${item.post_height}` : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Resource</span>
                <span className="font-semibold text-slate-950">{tenant.resource_count || 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Jam buka</span>
                <span className="font-semibold text-slate-950">
                  {tenant.open_time || "09:00"} - {tenant.close_time || "22:00"}
                </span>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <Button asChild className="h-11 rounded-2xl bg-blue-600 hover:bg-blue-500">
                <a
                  href={tenantHref}
                  onClick={() =>
                    trackDiscoveryEvent({
                      tenant_id: item.tenant_id || item.id,
                      tenant_slug: item.slug,
                      event_type: "tenant_open",
                      surface: "discover-post-detail",
                      section_id: "post-detail",
                      card_variant: item.post_type || "post",
                      position_index: 0,
                      promo_label: item.feed_label || item.promo_label,
                      metadata: {
                        post_id: item.post_id,
                        post_type: item.post_type,
                        target_tenant_slug: tenant.slug,
                      },
                    })
                  }
                >
                  Lihat bisnis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </Card>

          {isVideo ? (
            <Card className="rounded-[1.75rem] border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                <PlayCircle className="h-4 w-4" />
                Playback
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Video sekarang siap prefer stream HLS kalau tersedia, lalu fallback ke asset CDN biasa kalau belum. Jalur ini bikin kita bisa rollout transcoding nanti tanpa ubah UX detail post.
              </p>
              {item.post_stream_url_hls ? (
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Stream HLS aktif untuk post ini.
                </p>
              ) : null}
            </Card>
          ) : null}
        </aside>
      </section>

      {data.related.length > 0 ? (
        <section className="space-y-3">
          <div className="space-y-1">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
              Terkait
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              Masih dari jalur yang mirip
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.related.map((related, index) => {
              const href = getDiscoveryItemHref(related) || getTenantUrl(related.slug);
              const relatedTenantHref = getDiscoveryTenantHrefFromPost(related);
              return (
                <Card key={related.id} className="overflow-hidden rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
                  <div
                    className="h-32 w-full bg-cover bg-center"
                    style={{
                      backgroundImage: getDiscoveryItemImage(related)
                        ? `url(${getDiscoveryItemImage(related)})`
                        : "linear-gradient(135deg, rgba(15,31,74,0.96), rgba(59,130,246,0.68))",
                    }}
                  />
                  <div className="space-y-3 p-4">
                    <Badge className="rounded-full bg-blue-50 text-blue-700">
                      {getDiscoveryItemLabel(related)}
                    </Badge>
                    <div className="text-lg font-black tracking-tight text-slate-950">
                      {getDiscoveryItemTitle(related)}
                    </div>
                    <p className="line-clamp-3 text-sm leading-6 text-slate-500">
                      {getDiscoveryItemSummary(related)}
                    </p>
                    <Button asChild variant="outline" className="h-10 w-full rounded-xl">
                      <Link
                        href={href}
                        onClick={() =>
                          trackDiscoveryEvent({
                            tenant_id: related.tenant_id || related.id,
                            tenant_slug: related.slug,
                            event_type: "related_click",
                            surface: "discover-post-detail",
                            section_id: "related-posts",
                            card_variant: related.post_type || related.item_kind || "related",
                            position_index: index,
                            promo_label: related.feed_label || related.promo_label,
                            metadata: {
                              post_id: related.post_id,
                              origin_post_id: item.post_id,
                              relation_kind: related.item_kind,
                            },
                          })
                        }
                      >
                        Buka
                      </Link>
                    </Button>
                    {related.item_kind === "post" ? (
                      <Button asChild variant="ghost" className="h-10 w-full rounded-xl text-slate-600">
                        <a
                          href={relatedTenantHref}
                          onClick={() =>
                            trackDiscoveryEvent({
                              tenant_id: related.tenant_id || related.id,
                              tenant_slug: related.slug,
                              event_type: "tenant_profile_open_from_related",
                              surface: "discover-post-detail",
                              section_id: "related-posts",
                              card_variant: related.post_type || "post",
                              position_index: index,
                              promo_label: related.feed_label || related.promo_label,
                              metadata: {
                                post_id: related.post_id,
                                origin_post_id: item.post_id,
                                target_tenant_slug: related.slug,
                              },
                            })
                          }
                        >
                          Lihat bisnis
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
