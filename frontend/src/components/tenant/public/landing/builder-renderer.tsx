"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, MapPin, Clock3, ChevronRight } from "lucide-react";
import { TenantNavbar } from "./navbar";
import { TenantHero } from "./hero";
import { GallerySection } from "./gallery-section";
import { TenantFooter } from "./footer";
import { ResourceCard } from "./resource-card";
import { cn } from "@/lib/utils";
import {
  type BookingFormConfig,
  type BuilderProfile,
  type BuilderResource,
  type BuilderResourceItem,
  type BuilderSection,
  type LandingPageConfig,
  type LandingThemeConfig,
  enrichBuilderProfile,
  normalizeBookingFormConfig,
  normalizePageBuilderConfig,
  normalizeThemeConfig,
} from "@/lib/page-builder";

type BuilderRendererProps = {
  profile: BuilderProfile;
  resources: BuilderResource[];
  pageConfig?: LandingPageConfig | null;
  themeConfig?: LandingThemeConfig | null;
  bookingFormConfig?: BookingFormConfig | null;
  previewMode?: "desktop" | "mobile";
  isEditorPreview?: boolean;
  embedded?: boolean;
};

export function LandingBuilderRenderer({
  profile,
  resources,
  pageConfig,
  themeConfig,
  bookingFormConfig,
  previewMode = "desktop",
  isEditorPreview = false,
  embedded = false,
}: BuilderRendererProps) {
  const normalizedProfile = enrichBuilderProfile(profile);
  const page = normalizePageBuilderConfig(pageConfig);
  const theme = normalizeThemeConfig(themeConfig, normalizedProfile.primary_color);
  const bookingForm = normalizeBookingFormConfig(bookingFormConfig);
  const content = {
    banner: normalizedProfile.banner_url || "",
    tagline: normalizedProfile.tagline || "Booking online yang lebih cepat dan jelas.",
    description:
      normalizedProfile.about_us ||
      "Kelola tampilan halaman publik yang lebih sesuai dengan karakter bisnis kamu.",
    features: normalizedProfile.features?.length
      ? normalizedProfile.features
      : ["Fleksibel", "Cepat", "Bisa diubah tenant"],
  };
  const surfaceClass = getPreviewSurfaceClass(theme.surface_style);
  const previewFontStyle = getPreviewFontStyle(theme.font_style);

  const getBestPrice = (resource: BuilderResource) => {
    const mains = resource.items?.filter(
      (item: BuilderResourceItem) => item.item_type === "main_option" || item.item_type === "main",
    );
    if (!mains?.length) return null;
    const lowest = mains.reduce((prev: BuilderResourceItem, curr: BuilderResourceItem) =>
      prev.price < curr.price ? prev : curr,
    );
    return {
      value: Number(lowest.price),
      unit: lowest.price_unit === "hour" ? "Jam" : "Sesi",
    };
  };

  const containerClass = embedded
    ? "w-full overflow-hidden bg-white dark:bg-[#050505]"
    : previewMode === "mobile"
      ? "mx-auto w-[390px] overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-[#050505]"
      : "w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#050505]";

  return (
    <div className={cn(containerClass, previewFontStyle.className)} style={previewFontStyle.style}>
      <div className={cn("relative min-h-full", surfaceClass)}>
        <TenantNavbar profile={normalizedProfile} previewMode={previewMode} embedded={embedded} />
        <main className={previewMode === "mobile" ? (embedded ? "pt-24" : "pt-20") : ""}>
          {page.sections.filter((section) => section.enabled).map((section) =>
            renderSection({
              section,
              profile: normalizedProfile,
              resources,
              theme,
              content,
              bookingForm,
              getBestPrice,
              isEditorPreview,
            }),
          )}
        </main>
        {previewMode === "mobile" && bookingForm.sticky_mobile_cta ? (
          <MobileStickyBookingBar
            primaryColor={theme.primary_color}
            label={bookingForm.cta_button_label}
            isEditorPreview={isEditorPreview}
          />
        ) : null}
        <TenantFooter profile={normalizedProfile} primaryColor={theme.primary_color} />
      </div>
    </div>
  );
}

function renderSection({
  section,
  profile,
  resources,
  theme,
  content,
  bookingForm,
  getBestPrice,
  isEditorPreview,
}: {
  section: BuilderSection;
  profile: BuilderProfile;
  resources: BuilderResource[];
  theme: LandingThemeConfig;
  content: { banner: string; tagline: string; description: string; features: string[] };
  bookingForm: BookingFormConfig;
  getBestPrice: (resource: BuilderResource) => { value: number; unit: string } | null;
  isEditorPreview: boolean;
}) {
  const sectionVariant = section.variant || "";
  switch (section.type) {
    case "hero":
      return (
        <TenantHero
          key={section.id}
          profile={profile}
          content={{
            ...content,
            tagline: String(section.props?.tagline || content.tagline),
            description: String(section.props?.description || content.description),
            ctaLabel: bookingForm.cta_button_label,
          }}
          theme={{ primary: theme.primary_color }}
          variant={sectionVariant as "immersive" | "split" | "compact"}
        />
      );
    case "highlights":
      return (
        <section key={section.id} className="relative z-10 px-6 py-14 md:px-8 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex items-center gap-3">
              <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: theme.primary_color }} />
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
                {String(section.props?.title || "Keunggulan utama")}
              </span>
            </div>
            {sectionVariant === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {content.features.map((feature, index) => (
                  <Card
                    key={`${feature}-${index}`}
                    className="rounded-[1.6rem] border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Keunggulan</div>
                    <div className="mt-3 text-base font-semibold text-slate-950 dark:text-white">{feature}</div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {content.features.map((feature, index) => (
                  <Badge
                    key={`${feature}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  >
                    {feature}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </section>
      );
    case "catalog":
      return (
        <section key={section.id} id="catalog" className="py-20 md:py-28">
          <div className="container mx-auto max-w-6xl px-6 md:px-8">
            <div className="mb-12 space-y-4 text-center">
              <h2 className="text-4xl font-[1000] uppercase italic tracking-tighter text-slate-900 dark:text-white md:text-6xl">
                {String(section.props?.title || "Pilih Layanan")}
              </h2>
              <p className="mx-auto max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400 md:text-base">
                {String(
                  section.props?.description ||
                    "Tampilkan resource, paket, atau unit yang paling relevan untuk customer.",
                )}
              </p>
            </div>
            <div className={cn("grid grid-cols-1 gap-6", sectionVariant === "list" ? "max-w-4xl mx-auto" : "sm:grid-cols-2 lg:grid-cols-3")}>
              {resources.length ? (
                resources.map((resource) =>
                  sectionVariant === "list" ? (
                    <Card
                      key={resource.id}
                      className="overflow-hidden rounded-[1.8rem] border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="overflow-hidden rounded-[1.4rem] bg-slate-100 sm:w-44 dark:bg-white/5">
                          {resource.image_url ? (
                            <img src={resource.image_url} alt={resource.name} className="aspect-[4/3] h-full w-full object-cover" />
                          ) : (
                            <div className="aspect-[4/3] h-full w-full" />
                          )}
                        </div>
                        <div className="flex flex-1 flex-col justify-between gap-4">
                          <div>
                            <div className="text-lg font-bold text-slate-950 dark:text-white">{resource.name}</div>
                            <div className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                              {resource.description || "Resource siap ditampilkan untuk booking customer."}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-500 dark:text-slate-300">
                              {getBestPrice(resource) ? (
                                <>
                                  Mulai dari{" "}
                                  <span className="text-slate-950 dark:text-white">
                                    Rp {getBestPrice(resource)?.value.toLocaleString("id-ID")}
                                  </span>
                                  /{getBestPrice(resource)?.unit}
                                </>
                              ) : (
                                "Harga tampil saat item utama tersedia"
                              )}
                            </div>
                            <Button className="rounded-2xl text-white" style={{ backgroundColor: theme.primary_color }}>
                              Pilih
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <ResourceCard
                      key={resource.id}
                      res={resource}
                      primaryColor={theme.primary_color}
                      getBestPrice={getBestPrice}
                    />
                  ),
                )
              ) : (
                <Card className="col-span-full rounded-[2rem] border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                  Resource tenant belum ada. Tambahkan resource agar katalog tampil di landing.
                </Card>
              )}
            </div>
          </div>
        </section>
      );
    case "gallery":
      return sectionVariant === "grid" ? (
        <section key={section.id} className="px-6 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <div className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
                {String(section.props?.eyebrow || "Visual Experience")}
              </div>
              <h3 className="mt-3 text-3xl font-[1000] tracking-tight text-slate-950 dark:text-white md:text-5xl">
                {String(section.props?.title || "Inside The Hub.")}
              </h3>
              {String(section.props?.description || "").trim() ? (
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {String(section.props?.description || "")}
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(profile.gallery || []).map((image, index) => (
                <div key={`${image}-${index}`} className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                  <img src={image} alt={`Galeri ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <GallerySection
          key={section.id}
          images={profile.gallery || []}
          primaryColor={theme.primary_color}
          eyebrow={String(section.props?.eyebrow || "Visual Experience")}
          title={String(section.props?.title || "Inside The Hub.")}
          description={String(section.props?.description || "")}
        />
      );
    case "testimonials":
      return (
        <section key={section.id} className="px-6 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <div className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
                {String(section.props?.eyebrow || section.label)}
              </div>
              <h3 className="mt-3 text-3xl font-[1000] tracking-tight text-slate-950 dark:text-white md:text-5xl">
                {String(section.props?.title || "Kata pelanggan")}
              </h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {readObjectArray(section.props?.items).map((item, index) => (
                <Card
                  key={`${item.name || "testimonial"}-${index}`}
                  className="rounded-[1.75rem] border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5"
                >
                  <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                    &quot;{String(item.quote || "Belum ada kutipan.")}&quot;
                  </p>
                  <div className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    {String(item.name || "Customer")}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      );
    case "faq":
      return (
        <section key={section.id} className="px-6 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <div className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
                {String(section.props?.eyebrow || section.label)}
              </div>
              <h3 className="mt-3 text-3xl font-[1000] tracking-tight text-slate-950 dark:text-white md:text-5xl">
                {String(section.props?.title || "Pertanyaan yang sering muncul")}
              </h3>
            </div>
            <div className="space-y-4">
              {readObjectArray(section.props?.items).map((item, index) => (
                <Card
                  key={`${item.question || "faq"}-${index}`}
                  className="rounded-[1.5rem] border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="text-base font-bold text-slate-950 dark:text-white">
                    {String(item.question || "Pertanyaan")}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {String(item.answer || "Jawaban akan ditampilkan di sini.")}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      );
    case "about":
      const aboutImage = String(section.props?.image_url || "").trim();
      return (
        <section key={section.id} className="px-6 py-16 md:px-8 md:py-24">
          <div
            className={cn(
              "mx-auto gap-8",
              sectionVariant === "centered"
                ? "max-w-4xl text-center"
                : aboutImage
                  ? "grid max-w-6xl lg:grid-cols-[1fr_0.88fr]"
                  : "max-w-4xl",
            )}
          >
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
                {String(section.props?.eyebrow || section.label)}
              </div>
              <h3 className="mt-3 text-3xl font-[1000] tracking-tight text-slate-950 dark:text-white md:text-5xl">
                {String(section.props?.title || `Tentang ${profile.name || "bisnis ini"}`)}
              </h3>
              <p className="mt-5 text-sm leading-8 text-slate-600 dark:text-slate-300 md:text-base">
                {String(
                  section.props?.description ||
                    profile.about_us ||
                    "Ceritakan karakter bisnis, keunggulan utama, dan alasan kenapa customer harus booking di sini.",
                )}
              </p>
            </div>
            {aboutImage ? (
              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={aboutImage} alt={String(section.props?.title || `Tentang ${profile.name || "bisnis ini"}`)} className="h-full w-full object-cover" />
              </div>
            ) : null}
          </div>
        </section>
      );
    case "contact":
      return sectionVariant === "split" ? (
        <section key={section.id} className="px-6 py-16 md:px-8 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="rounded-[2rem] border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5 md:p-8">
              <div className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">{section.label}</div>
              <h3 className="mt-3 text-3xl font-[1000] tracking-tight text-slate-950 dark:text-white">
                {String(section.props?.title || "Hubungi bisnis")}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {String(section.props?.description || "Tampilkan lokasi, jam operasional, dan tombol WhatsApp.")}
              </p>
            </Card>
            <div className="space-y-4">
              <InfoRow icon={MapPin} label="Alamat" value={profile.address || "Alamat belum diisi"} />
              <InfoRow icon={Clock3} label="Jam operasional" value={`${profile.open_time || "-"} - ${profile.close_time || "-"}`} />
              {profile.whatsapp_number ? (
                <div className="pt-2">
                  <a href={`https://wa.me/${profile.whatsapp_number}`} target="_blank" rel="noreferrer">
                    <Button className="rounded-2xl text-white" style={{ backgroundColor: theme.primary_color }}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Chat WhatsApp
                    </Button>
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <section key={section.id} className="px-6 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5 md:p-8">
            <div className="grid gap-6 lg:grid-cols-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
                  {section.label}
                </div>
                <h3 className="mt-3 text-3xl font-[1000] tracking-tight text-slate-950 dark:text-white">
                  {String(section.props?.title || "Hubungi bisnis")}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {String(
                    section.props?.description ||
                      "Tampilkan lokasi, jam operasional, dan tombol WhatsApp.",
                  )}
                </p>
              </div>
              <div className="space-y-4 lg:col-span-2">
                <InfoRow icon={MapPin} label="Alamat" value={profile.address || "Alamat belum diisi"} />
                <InfoRow
                  icon={Clock3}
                  label="Jam operasional"
                  value={`${profile.open_time || "-"} - ${profile.close_time || "-"}`}
                />
                {profile.whatsapp_number ? (
                  <div className="pt-2">
                    <a href={`https://wa.me/${profile.whatsapp_number}`} target="_blank" rel="noreferrer">
                      <Button className="rounded-2xl text-white" style={{ backgroundColor: theme.primary_color }}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Chat WhatsApp
                      </Button>
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      );
    case "booking_form":
      return (
        <section key={section.id} className="px-6 pb-20 pt-8 md:px-8 md:pb-28">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
                  {section.label}
                </div>
                <h3 className="mt-3 text-3xl font-[1000] tracking-tight text-slate-950 dark:text-white">
                  {String(section.props?.title || "Arahkan customer ke booking")}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {String(
                    section.props?.description ||
                      "Gunakan tombol ini untuk membawa customer langsung ke katalog atau kanal bantuan tercepat.",
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/bookings" className={isEditorPreview ? "pointer-events-none" : ""}>
                  <Button className="rounded-2xl text-white" style={{ backgroundColor: theme.primary_color }}>
                    {bookingForm.cta_button_label}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                {sectionVariant !== "inline_cta" && bookingForm.show_whatsapp_help && profile.whatsapp_number ? (
                  <a
                    href={`https://wa.me/${profile.whatsapp_number}`}
                    target="_blank"
                    rel="noreferrer"
                    className={isEditorPreview ? "pointer-events-none" : ""}
                  >
                    <Button variant="outline" className="rounded-2xl">
                      {bookingForm.whatsapp_label}
                    </Button>
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      );
    default:
      return null;
  }
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white px-4 py-4 dark:bg-[#050505]">
      <Icon className="mt-0.5 h-4 w-4 text-slate-400" />
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</div>
        <div className="mt-1 text-sm leading-7 text-slate-700 dark:text-slate-200">{value}</div>
      </div>
    </div>
  );
}

function readObjectArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
}

function MobileStickyBookingBar({
  primaryColor,
  label,
  isEditorPreview,
}: {
  primaryColor: string;
  label: string;
  isEditorPreview: boolean;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex justify-center px-4 pb-4">
      <div className="pointer-events-auto w-full max-w-[360px] rounded-[1.7rem] border border-white/40 bg-white/85 p-3 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/85">
        <Button
          className="h-12 w-full rounded-[1.2rem] text-sm font-black uppercase tracking-[0.18em] text-white"
          style={{ backgroundColor: primaryColor }}
          disabled={isEditorPreview}
        >
          {label}
        </Button>
      </div>
    </div>
  );
}

function getPreviewSurfaceClass(surfaceStyle?: string) {
  switch (surfaceStyle) {
    case "contrast":
      return "bg-[linear-gradient(180deg,#0b1220_0%,#111827_18%,#f8fafc_52%,#ffffff_100%)]";
    case "bright":
      return "bg-[linear-gradient(180deg,#f0fdf4_0%,#eff6ff_36%,#ffffff_100%)]";
    case "layered":
      return "bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_22%,#f8fafc_100%)]";
    default:
      return "bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_28%,#ffffff_100%)]";
  }
}

function getPreviewFontStyle(fontStyle?: string) {
  switch (fontStyle) {
    case "elegant":
      return { className: "font-serif", style: { fontFamily: "var(--font-plus-jakarta)" } };
    case "playful":
    case "bold":
      return { className: "", style: { fontFamily: "var(--font-syne)" } };
    case "minimal":
      return { className: "", style: { fontFamily: "var(--font-sans)" } };
    default:
      return { className: "", style: { fontFamily: "var(--font-plus-jakarta)" } };
  }
}
