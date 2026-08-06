"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  ImageIcon,
  Loader2,
  MapPin,
  MessageCircle,
  Package2,
  ShieldCheck,
  X,
} from "lucide-react";
import { addDays, format, isSameDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn, resolveMapEmbedSrc } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/context/tenant-context";
import { TenantFooter } from "@/components/tenant/public/landing/footer";
import {
  getPreviewFontStyle,
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
  about?: string;
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

// Deteksi apakah deskripsi sebenarnya daftar fasilitas gaya "A, B, C"
// (dipisah koma, tanpa kalimat berakhiran titik) — bukan paragraf naratif.
function parseFeatureList(description?: string): string[] {
  const raw = String(description || "").trim();
  if (!raw || raw.includes(".")) return [];
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts : [];
}

// --- Availability peek helpers (selaras dengan perhitungan slot di flow booking) ---
function clockToMinutes(value?: string): number {
  const [h, m] = String(value || "0:0").split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function minutesToClock(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getOperatingWindow(open?: string, close?: string) {
  const openMinutes = clockToMinutes(open || "08:00");
  let closeMinutes = clockToMinutes(close || "22:00");
  if (closeMinutes <= openMinutes) closeMinutes = 24 * 60; // toko lewat tengah malam
  return { openMinutes, closeMinutes };
}

type BusyInterval = { startMin: number; endMin: number };
type PeekSlot = { time: string; available: boolean };

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
  const fontStyle = useMemo(
    () => getPreviewFontStyle(activeTheme.font_style),
    [activeTheme],
  );

  const isDirectSale =
    String(resource?.operating_mode || "timed").toLowerCase() === "direct_sale";

  const features = useMemo(
    () => parseFeatureList(resource?.description),
    [resource?.description],
  );

  const aboutText = String(resource?.about || "").trim();

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

  // --- Availability peek (hanya untuk resource berbasis jadwal) ---
  const [peekDate, setPeekDate] = useState<Date>(() => new Date());
  const [peekBusy, setPeekBusy] = useState<BusyInterval[]>([]);
  const [peekLoading, setPeekLoading] = useState(false);

  const peekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)),
    [],
  );

  useEffect(() => {
    if (isDirectSale || !params.id) return;
    let alive = true;
    const run = async () => {
      setPeekLoading(true);
      try {
        const res = await api.get(
          `/guest/availability/${params.id}?date=${format(peekDate, "yyyy-MM-dd")}`,
        );
        if (!alive) return;
        const busy: BusyInterval[] = (res.data?.busy_slots || []).map(
          (slot: any) => {
            const startMin = clockToMinutes(slot.start_time);
            let endMin = clockToMinutes(slot.end_time);
            if (endMin <= startMin) endMin = 24 * 60;
            return { startMin, endMin };
          },
        );
        setPeekBusy(busy);
      } catch {
        if (alive) setPeekBusy([]);
      } finally {
        if (alive) setPeekLoading(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [peekDate, params.id, isDirectSale]);

  const peekSlots = useMemo<PeekSlot[]>(() => {
    if (isDirectSale) return [];
    const step = bestPrice?.unit_duration && bestPrice.unit_duration > 0
      ? bestPrice.unit_duration
      : 60;
    const { openMinutes, closeMinutes } = getOperatingWindow(
      profile?.open_time,
      profile?.close_time,
    );
    const now = new Date();
    const isToday = isSameDay(peekDate, now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const slots: PeekSlot[] = [];
    for (let start = openMinutes; start + step <= closeMinutes; start += step) {
      const end = start + step;
      const overlapsBusy = peekBusy.some(
        (b) => start < b.endMin && end > b.startMin,
      );
      const inPast = isToday && start < nowMinutes;
      slots.push({ time: minutesToClock(start), available: !overlapsBusy && !inPast });
    }
    return slots;
  }, [isDirectSale, bestPrice, profile?.open_time, profile?.close_time, peekBusy, peekDate]);

  const peekAvailableCount = useMemo(
    () => peekSlots.filter((s) => s.available).length,
    [peekSlots],
  );

  const galleryImages = useMemo(() => {
    const images = [resource?.image_url, ...(resource?.gallery || [])]
      .map((url) => String(url || "").trim())
      .filter(Boolean);
    return Array.from(new Set(images));
  }, [resource?.image_url, resource?.gallery]);

  const peekDateParam = format(peekDate, "yyyy-MM-dd");
  const bookHref = isDirectSale
    ? `/orders/${params.id}`
    : `/bookings/${params.id}?date=${peekDateParam}`;
  const slotHref = (time: string) =>
    `/bookings/${params.id}?date=${peekDateParam}&time=${time}`;
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
        "min-h-screen pb-28 transition-colors duration-500 md:pb-16",
        fontStyle.className,
        surfaceClass,
      )}
      style={fontStyle.style}
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
        <div className="min-w-0 space-y-10">
          {/* GALLERY */}
          {galleryImages.length > 1 ? (
            <section className="space-y-4">
              <SectionLabel themeVisuals={themeVisuals} title="Galeri" />
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

          {/* TENTANG (naratif) */}
          {aboutText ? (
            <section className="space-y-4">
              <SectionLabel themeVisuals={themeVisuals} title="Tentang unit ini" />
              <p className={cn("whitespace-pre-line text-[15px] leading-8", themeVisuals.bodyClass)}>
                {aboutText}
              </p>
            </section>
          ) : null}

          {/* FASILITAS (daftar) */}
          {features.length ? (
            <section className="space-y-4">
              <SectionLabel themeVisuals={themeVisuals} title="Fasilitas" />
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className={cn("flex items-start gap-2.5 text-[15px] leading-6", themeVisuals.bodyClass)}
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${activeTheme.primary_color}1a` }}
                    >
                      <Check className="h-3.5 w-3.5" style={{ color: activeTheme.primary_color }} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Fallback saat belum ada info sama sekali */}
          {!aboutText && !features.length ? (
            <section className="space-y-4">
              <SectionLabel themeVisuals={themeVisuals} title="Tentang unit ini" />
              <p className={cn("text-[15px] leading-8", themeVisuals.bodyClass)}>
                {resource.description ||
                  "Deskripsi lengkap unit ini belum diisi. Hubungi admin untuk info lebih detail sebelum booking."}
              </p>
            </section>
          ) : null}

          {/* PACKAGES */}
          {mainItems.length ? (
            <section className="space-y-4">
              <SectionLabel
                themeVisuals={themeVisuals}
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

          {/* AVAILABILITY PEEK (mobile-first) */}
          {!isDirectSale ? (
            <section className="space-y-4">
              <SectionLabel themeVisuals={themeVisuals} title="Cek ketersediaan" />

              {/* Pilih hari — baris yang bisa di-scroll (mobile-first) */}
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {peekDays.map((day) => {
                  const selected = isSameDay(day, peekDate);
                  const isTodayChip = isSameDay(day, new Date());
                  const topLabel = isTodayChip
                    ? "Hari ini"
                    : isSameDay(day, addDays(new Date(), 1))
                      ? "Besok"
                      : format(day, "EEE", { locale: idLocale });
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setPeekDate(day)}
                      className={cn(
                        "flex min-w-[68px] shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-3 py-2.5 text-center transition",
                        selected ? "text-white" : themeVisuals.infoRowClass,
                      )}
                      style={selected ? { backgroundColor: activeTheme.primary_color, borderColor: activeTheme.primary_color } : undefined}
                    >
                      <span className={cn("text-[11px] font-semibold", selected ? "text-white/90" : themeVisuals.mutedClass)}>
                        {topLabel}
                      </span>
                      <span className={cn("text-base font-bold leading-none", selected ? "text-white" : themeVisuals.titleClass)}>
                        {format(day, "d")}
                      </span>
                      <span className={cn("text-[10px] uppercase", selected ? "text-white/80" : themeVisuals.mutedClass)}>
                        {format(day, "MMM", { locale: idLocale })}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Ringkasan + grid slot */}
              {peekLoading ? (
                <div className={cn("flex items-center gap-2 text-sm", themeVisuals.mutedClass)}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Memuat jadwal...
                </div>
              ) : peekSlots.length === 0 ? (
                <div className={cn("flex items-start gap-2 rounded-2xl border px-3 py-3 text-sm", themeVisuals.infoRowClass)}>
                  <CalendarDays className={cn("mt-0.5 h-4 w-4 shrink-0", themeVisuals.mutedClass)} />
                  <span className={themeVisuals.bodyClass}>Jam operasional belum diatur. Lanjut ke booking untuk cek jadwal.</span>
                </div>
              ) : (
                <>
                  <div className={cn("text-sm font-semibold", themeVisuals.bodyClass)}>
                    {peekAvailableCount > 0 ? (
                      <span>
                        <span style={{ color: activeTheme.primary_color }}>{peekAvailableCount} slot</span> tersedia
                        {" · "}
                        {format(peekDate, "EEEE, d MMM", { locale: idLocale })}
                      </span>
                    ) : (
                      <span className={themeVisuals.mutedClass}>
                        Tidak ada slot untuk {format(peekDate, "EEEE, d MMM", { locale: idLocale })} — coba hari lain
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {peekSlots.map((slot) =>
                      slot.available ? (
                        <Link
                          key={slot.time}
                          href={slotHref(slot.time)}
                          className="flex items-center justify-center rounded-xl border py-2.5 text-sm font-semibold transition hover:opacity-90"
                          style={{
                            borderColor: `${activeTheme.primary_color}55`,
                            backgroundColor: `${activeTheme.primary_color}14`,
                            color: activeTheme.primary_color,
                          }}
                        >
                          {slot.time}
                        </Link>
                      ) : (
                        <span
                          key={slot.time}
                          className={cn(
                            "flex items-center justify-center rounded-xl border py-2.5 text-sm font-medium line-through opacity-40",
                            themeVisuals.infoRowClass,
                            themeVisuals.mutedClass,
                          )}
                        >
                          {slot.time}
                        </span>
                      ),
                    )}
                  </div>
                  <p className={cn("text-xs leading-5", themeVisuals.mutedClass)}>
                    Slot indikatif. Durasi, DP, dan total final dihitung di langkah booking.
                  </p>
                </>
              )}
            </section>
          ) : null}

          {/* INFO */}
          <section className="space-y-4">
            <SectionLabel themeVisuals={themeVisuals} title="Jam & lokasi" />
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
            {resolveMapEmbedSrc(profile?.map_iframe_url) ? (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <iframe
                  src={resolveMapEmbedSrc(profile?.map_iframe_url)}
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
  eyebrow?: string;
  title: string;
}) {
  return (
    <div className="space-y-1">
      {eyebrow ? (
        <div className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", themeVisuals.eyebrowClass)}>
          {eyebrow}
        </div>
      ) : null}
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
