"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  ImageIcon,
  MapPin,
  MessageCircle,
  Package2,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/context/tenant-context";
import { TenantFooter } from "@/components/tenant/public/landing/footer";
import {
  getPreviewSurfaceClass,
  getThemeVisuals,
} from "@/components/tenant/public/landing/builder-renderer";
import { normalizeThemeConfig } from "@/lib/page-builder";

type ResourceItem = {
  id: string;
  name: string;
  price: number;
  price_unit?: string;
  item_type?: string;
  unit_duration?: number;
  description?: string;
};

type ResourceDetail = {
  id: string;
  tenant_id?: string;
  name: string;
  category?: string;
  description?: string;
  image_url?: string;
  gallery?: string[];
  operating_mode?: string;
  items?: ResourceItem[];
};

function priceUnitLabel(value?: string) {
  switch (String(value || "").toLowerCase()) {
    case "hour":
      return "jam";
    case "session":
      return "sesi";
    case "day":
      return "hari";
    case "week":
      return "minggu";
    case "month":
      return "bulan";
    case "year":
      return "tahun";
    default:
      return "sesi";
  }
}

function humanizeDuration(minutesValue?: number) {
  const total = Number(minutesValue || 0);
  if (total <= 0) return "";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} menit`;
  if (minutes === 0) return `${hours} jam`;
  return `${hours} jam ${minutes} menit`;
}

function isMainItem(item: ResourceItem) {
  return ["main_option", "main", "console_option", "package", "pricing"].includes(
    String(item.item_type || "").toLowerCase(),
  );
}

function isAddonItem(item: ResourceItem) {
  return ["add_on", "addon"].includes(String(item.item_type || "").toLowerCase());
}

export default function ResourceDetailPage() {
  const params = useParams<{ tenant: string; id: string }>();
  const router = useRouter();
  const { profile } = useTenant();

  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get(`/public/resources/${params.id}`);
        setResource(res.data as ResourceDetail);
      } catch {
        toast.error("Gagal memuat detail unit");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [params.id]);

  const activeTheme = useMemo(
    () =>
      normalizeThemeConfig(profile?.landing_theme_config, profile?.primary_color),
    [profile],
  );
  const themeVisuals = useMemo(() => getThemeVisuals(activeTheme), [activeTheme]);
  const surfaceClass = useMemo(
    () => getPreviewSurfaceClass(activeTheme),
    [activeTheme],
  );

  const isDirectSale =
    String(resource?.operating_mode || "timed").toLowerCase() === "direct_sale";

  const mainItems = useMemo(
    () => (resource?.items || []).filter(isMainItem),
    [resource?.items],
  );
  const addonItems = useMemo(
    () => (resource?.items || []).filter(isAddonItem),
    [resource?.items],
  );

  const bestPrice = useMemo(() => {
    if (!mainItems.length) return null;
    return mainItems.reduce((lowest, item) =>
      item.price < lowest.price ? item : lowest,
    );
  }, [mainItems]);

  const galleryImages = useMemo(() => {
    const images = [resource?.image_url, ...(resource?.gallery || [])]
      .map((url) => String(url || "").trim())
      .filter(Boolean);
    return Array.from(new Set(images));
  }, [resource?.image_url, resource?.gallery]);

  const bookHref = isDirectSale
    ? `/orders/${params.id}`
    : `/bookings/${params.id}`;
  const ctaLabel = isDirectSale ? "Pesan sekarang" : "Cek jadwal & booking";

  const whatsappHref = profile?.whatsapp_number
    ? `https://wa.me/${String(profile.whatsapp_number).replace(/\D/g, "")}?text=${encodeURIComponent(
        `Halo, saya mau tanya soal ${resource?.name || "unit ini"}.`,
      )}`
    : null;

  if (loading) return <DetailSkeleton />;
  if (!resource) return null;

  return (
    <div
      className={cn(
        "min-h-screen pb-28 font-plus-jakarta transition-colors duration-500 md:pb-16",
        surfaceClass,
      )}
    >
      {/* HERO */}
      <header className="relative h-[46vh] min-h-[320px] w-full overflow-hidden">
        {resource.image_url ? (
          <Image
            src={resource.image_url}
            alt={resource.name}
            fill
            unoptimized
            sizes="100vw"
            className="object-cover object-center"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-900">
            <ImageIcon className="h-10 w-10 text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

        <div className="absolute left-4 top-5 z-10 md:left-8">
          <Button
            onClick={() => router.back()}
            size="sm"
            className="h-9 rounded-full border border-white/15 bg-black/40 px-4 text-xs font-semibold text-white backdrop-blur hover:bg-black/60"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Kembali
          </Button>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-6xl px-4 pb-8 md:px-8">
          {resource.category ? (
            <Badge
              className="mb-3 rounded-full border-none px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white"
              style={{ backgroundColor: activeTheme.primary_color }}
            >
              {resource.category}
            </Badge>
          ) : null}
          <h1 className="max-w-3xl text-4xl font-semibold uppercase leading-[0.95] tracking-tight text-white md:text-6xl">
            {resource.name}
          </h1>
          {resource.description ? (
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
              {resource.description}
            </p>
          ) : null}
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:px-8 lg:grid-cols-[1.6fr_0.9fr] lg:items-start">
        {/* LEFT: content */}
        <div className="space-y-10">
          {/* GALLERY */}
          {galleryImages.length > 1 ? (
            <section className="space-y-4">
              <SectionLabel themeVisuals={themeVisuals} eyebrow="Galeri" title="Lihat lebih dekat" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setLightbox(image)}
                    className={cn(
                      "group relative aspect-[4/3] overflow-hidden rounded-2xl border",
                      themeVisuals.mediaClass,
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt={`${resource.name} ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {/* ABOUT */}
          <section className="space-y-4">
            <SectionLabel themeVisuals={themeVisuals} eyebrow="Tentang" title="Tentang unit ini" />
            <p className={cn("text-[15px] leading-8", themeVisuals.bodyClass)}>
              {resource.description ||
                "Deskripsi lengkap unit ini belum diisi. Hubungi admin untuk info lebih detail sebelum booking."}
            </p>
          </section>

          {/* PACKAGES */}
          {mainItems.length ? (
            <section className="space-y-4">
              <SectionLabel
                themeVisuals={themeVisuals}
                eyebrow="Paket"
                title={isDirectSale ? "Pilihan produk" : "Pilihan paket"}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {mainItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-2xl border p-4",
                      themeVisuals.innerPanelClass,
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className={cn("text-base font-semibold", themeVisuals.titleClass)}>
                          {item.name}
                        </div>
                        {!isDirectSale && item.unit_duration ? (
                          <div className={cn("mt-1 flex items-center gap-1 text-xs", themeVisuals.mutedClass)}>
                            <Clock className="h-3.5 w-3.5" />
                            {priceUnitLabel(item.price_unit) === "sesi"
                              ? `1 sesi = ${humanizeDuration(item.unit_duration)}`
                              : humanizeDuration(item.unit_duration)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 flex items-end gap-1">
                      <span
                        className="text-xl font-semibold"
                        style={{ color: activeTheme.primary_color }}
                      >
                        Rp{Number(item.price || 0).toLocaleString("id-ID")}
                      </span>
                      <span className={cn("pb-0.5 text-xs font-semibold", themeVisuals.mutedClass)}>
                        /{priceUnitLabel(item.price_unit)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {addonItems.length ? (
                <div className="pt-2">
                  <div className={cn("mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]", themeVisuals.eyebrowMutedClass)}>
                    Tambahan opsional
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {addonItems.map((item) => (
                      <span
                        key={item.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                          themeVisuals.infoRowClass,
                        )}
                      >
                        <Package2 className="h-3.5 w-3.5" />
                        {item.name} · +Rp{Number(item.price || 0).toLocaleString("id-ID")}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* INFO */}
          <section className="space-y-4">
            <SectionLabel themeVisuals={themeVisuals} eyebrow="Info" title="Jam & lokasi" />
            <div className="grid gap-3 sm:grid-cols-2">
              {!isDirectSale && (profile?.open_time || profile?.close_time) ? (
                <InfoRow
                  themeVisuals={themeVisuals}
                  icon={Clock}
                  label="Jam operasional"
                  value={`${profile?.open_time || "08:00"} - ${profile?.close_time || "22:00"}`}
                />
              ) : null}
              {profile?.address ? (
                <InfoRow
                  themeVisuals={themeVisuals}
                  icon={MapPin}
                  label="Lokasi"
                  value={profile.address}
                />
              ) : null}
            </div>
            {profile?.map_iframe_url ? (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <iframe
                  src={profile.map_iframe_url}
                  className="h-56 w-full"
                  loading="lazy"
                  title="Lokasi"
                />
              </div>
            ) : null}
          </section>
        </div>

        {/* RIGHT: sticky booking summary (desktop) */}
        <aside className="hidden lg:block lg:sticky lg:top-6">
          <div className={cn("space-y-4 rounded-3xl border p-5", themeVisuals.panelClass)}>
            <div>
              <div className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", themeVisuals.eyebrowMutedClass)}>
                {isDirectSale ? "Harga produk" : "Mulai dari"}
              </div>
              {bestPrice ? (
                <div className="mt-1 flex items-end gap-1.5">
                  <span
                    className="text-3xl font-semibold"
                    style={{ color: activeTheme.primary_color }}
                  >
                    Rp{Number(bestPrice.price || 0).toLocaleString("id-ID")}
                  </span>
                  <span className={cn("pb-1 text-sm font-semibold", themeVisuals.mutedClass)}>
                    /{priceUnitLabel(bestPrice.price_unit)}
                  </span>
                </div>
              ) : (
                <div className={cn("mt-1 text-sm font-semibold", themeVisuals.bodyClass)}>
                  Harga tersedia saat checkout
                </div>
              )}
            </div>

            <Button
              asChild
              className="h-12 w-full rounded-2xl text-sm font-semibold uppercase tracking-[0.08em] text-white"
              style={{ backgroundColor: activeTheme.primary_color }}
            >
              <Link href={bookHref}>
                {ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            {whatsappHref ? (
              <Button
                asChild
                variant="outline"
                className="h-11 w-full rounded-2xl text-sm font-semibold"
              >
                <a href={whatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Tanya admin dulu
                </a>
              </Button>
            ) : null}

            <div className={cn("flex items-start gap-2 rounded-2xl border px-3 py-3 text-xs leading-5", themeVisuals.infoRowClass)}>
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {isDirectSale
                ? "Pilih produk lalu langsung checkout, tanpa memilih slot waktu."
                : "Cek jadwal kosong dulu. DP dan total dihitung otomatis sebelum bayar."}
            </div>
          </div>
        </aside>
      </main>

      {/* STICKY CTA (mobile) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/92 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-black/85 lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <div className={cn("text-[10px] font-semibold uppercase tracking-[0.14em]", themeVisuals.mutedClass)}>
              {isDirectSale ? "Harga produk" : "Mulai dari"}
            </div>
            <div
              className="truncate text-xl font-semibold"
              style={{ color: activeTheme.primary_color }}
            >
              {bestPrice
                ? `Rp${Number(bestPrice.price || 0).toLocaleString("id-ID")}`
                : "-"}
            </div>
          </div>
          <Button
            asChild
            className="h-12 shrink-0 rounded-2xl px-5 text-sm font-semibold uppercase tracking-[0.06em] text-white"
            style={{ backgroundColor: activeTheme.primary_color }}
          >
            <Link href={bookHref}>
              {ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightbox ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Tutup"
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Preview"
            className="max-h-[85vh] max-w-[92vw] rounded-2xl object-contain"
          />
        </div>
      ) : null}

      <TenantFooter
        profile={{
          name: profile?.name || "Tenant",
          slug: params.tenant,
          business_type: profile?.business_type,
          primary_color: activeTheme.primary_color,
          logo_url: profile?.logo_url,
          about_us: profile?.about_us,
          whatsapp_number: profile?.whatsapp_number,
          address: profile?.address,
          instagram_url: profile?.instagram_url,
          tiktok_url: profile?.tiktok_url,
        }}
        primaryColor={activeTheme.primary_color}
        accentColor={activeTheme.accent_color}
        preset={activeTheme.preset}
        radiusStyle={activeTheme.radius_style}
      />
    </div>
  );
}

function SectionLabel({
  themeVisuals,
  eyebrow,
  title,
}: {
  themeVisuals: any;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="space-y-1">
      <div className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", themeVisuals.eyebrowClass)}>
        {eyebrow}
      </div>
      <h2 className={cn("text-2xl font-semibold uppercase tracking-tight", themeVisuals.titleClass)}>
        {title}
      </h2>
    </div>
  );
}

function InfoRow({
  themeVisuals,
  icon: Icon,
  label,
  value,
}: {
  themeVisuals: any;
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3", themeVisuals.infoRowClass)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <div className={cn("text-[10px] font-semibold uppercase tracking-[0.14em]", themeVisuals.eyebrowMutedClass)}>
          {label}
        </div>
        <div className={cn("mt-0.5 text-sm font-medium", themeVisuals.titleClass)}>
          {value}
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#050505]">
      <Skeleton className="h-[46vh] min-h-[320px] w-full rounded-none" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:px-8 lg:grid-cols-[1.6fr_0.9fr]">
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    </div>
  );
}
