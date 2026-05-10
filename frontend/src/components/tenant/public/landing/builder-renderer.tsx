"use client";

import Image from "next/image";
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
  const surfaceClass = getPreviewSurfaceClass(theme);
  const previewFontStyle = getPreviewFontStyle(theme.font_style);
  const themeVisuals = getThemeVisuals(theme);
  const leadingSection = page.sections.find((section) => section.enabled);
  const hasLeadingHero = leadingSection?.type === "hero";

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
        <TenantNavbar
          profile={normalizedProfile}
          previewMode={previewMode}
          embedded={embedded}
          landingTheme={{
            primary: theme.primary_color,
            accent: theme.accent_color,
            preset: theme.preset,
            radiusStyle: theme.radius_style,
          }}
        />
        <main
          className={
            previewMode === "mobile" && !hasLeadingHero
              ? embedded
                ? "pt-24"
                : "pt-20"
              : ""
          }
        >
          {page.sections.filter((section) => section.enabled).map((section) =>
            renderSection({
              section,
              profile: normalizedProfile,
              resources,
              theme,
              themeVisuals,
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
        <TenantFooter
          profile={normalizedProfile}
          primaryColor={theme.primary_color}
          accentColor={theme.accent_color}
          preset={theme.preset}
          radiusStyle={theme.radius_style}
        />
      </div>
    </div>
  );
}

function renderSection({
  section,
  profile,
  resources,
  theme,
  themeVisuals,
  content,
  bookingForm,
  getBestPrice,
  isEditorPreview,
}: {
  section: BuilderSection;
  profile: BuilderProfile;
  resources: BuilderResource[];
  theme: LandingThemeConfig;
  themeVisuals: ReturnType<typeof getThemeVisuals>;
  content: { banner: string; tagline: string; description: string; features: string[] };
  bookingForm: BookingFormConfig;
  getBestPrice: (resource: BuilderResource) => { value: number; unit: string } | null;
  isEditorPreview: boolean;
}) {
  const sectionVariant = section.variant || "";
  const testimonials = readObjectArray(section.props?.items);
  const faqs = readObjectArray(section.props?.items);
  switch (section.type) {
    case "hero":
      return (
        <div key={section.id} id={getSectionAnchorId(section.id)} data-builder-section={section.id}>
          <TenantHero
            profile={profile}
            content={{
              ...content,
              tagline: String(section.props?.tagline || content.tagline),
              description: String(section.props?.description || content.description),
              ctaLabel: bookingForm.cta_button_label,
            }}
            theme={{
              primary: theme.primary_color,
              preset: theme.preset,
              accent: theme.accent_color,
              radiusStyle: theme.radius_style,
            }}
            variant={sectionVariant as "immersive" | "split" | "compact"}
          />
        </div>
      );
    case "highlights":
      return (
        <section key={section.id} id={getSectionAnchorId(section.id)} data-builder-section={section.id} className="relative z-10 px-6 py-14 md:px-8 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex items-center gap-3">
              <div className="h-1.5 w-10 rounded-full" style={themeVisuals.accentBarStyle} />
              <span className={themeVisuals.eyebrowClass}>
                {String(section.props?.title || "Keunggulan utama")}
              </span>
            </div>
            {sectionVariant === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {content.features.map((feature, index) => (
                  <Card key={`${feature}-${index}`} className={cn(themeVisuals.cardClass, "p-5")}>
                    <div className={cn(themeVisuals.eyebrowClass, "tracking-[0.24em]")}>Keunggulan</div>
                    <div className={cn("mt-3 text-base font-semibold", themeVisuals.titleClass)}>{feature}</div>
                  </Card>
                ))}
              </div>
            ) : sectionVariant === "spotlight" ? (
              <div className="grid gap-4 md:grid-cols-2">
                {content.features.map((feature, index) => (
                  <Card
                    key={`${feature}-${index}`}
                    className={cn(themeVisuals.cardClass, "flex items-start gap-4 p-5 md:p-6")}
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center text-sm font-black"
                      style={themeVisuals.numberBadgeStyle}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <div className={cn(themeVisuals.eyebrowClass, "tracking-[0.24em]")}>
                        Highlight
                      </div>
                      <div className={cn("mt-2 text-lg font-bold leading-snug", themeVisuals.titleClass)}>
                        {feature}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {content.features.map((feature, index) => (
                  <Badge key={`${feature}-${index}`} className={themeVisuals.badgeClass}>
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
        <section key={section.id} id={getSectionAnchorId(section.id)} data-builder-section={section.id} className="py-20 md:py-28">
          <div id="catalog" className="container mx-auto max-w-6xl px-6 md:px-8">
            <div className="mb-12 space-y-4 text-center">
              <h2 className={cn("text-4xl font-[1000] uppercase italic tracking-tighter md:text-6xl", themeVisuals.heroTitleClass)}>
                {String(section.props?.title || "Pilih Layanan")}
              </h2>
              <p className={cn("mx-auto max-w-2xl text-sm font-medium md:text-base", themeVisuals.bodyClass)}>
                {String(
                  section.props?.description ||
                    "Tampilkan resource, paket, atau unit yang paling relevan untuk customer.",
                )}
              </p>
            </div>
            <div
              className={cn(
                "grid grid-cols-1 items-stretch gap-6",
                sectionVariant === "list"
                  ? "mx-auto max-w-4xl"
                  : "sm:grid-cols-2 lg:grid-cols-3",
              )}
            >
              {resources.length ? (
                sectionVariant === "list" ? (
                  resources.map((resource) => {
                    const bestPrice = getBestPrice(resource);
                    return (
                      <Link key={resource.id} href={`/bookings/${resource.id}`} className="block h-full">
                        <Card className={cn(themeVisuals.cardClass, "group h-full overflow-hidden p-4 transition-transform duration-300 hover:-translate-y-1")}>
                          <div className="flex h-full flex-col gap-4 sm:flex-row">
                            <div className={cn("overflow-hidden sm:w-44", themeVisuals.mediaClass)}>
                              {resource.image_url ? (
                                <div className="relative aspect-[4/3] h-full w-full">
                                  <Image
                                    src={resource.image_url}
                                    alt={resource.name}
                                    fill
                                    unoptimized
                                    sizes="176px"
                                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                  />
                                </div>
                              ) : (
                                <div className="aspect-[4/3] h-full w-full" />
                              )}
                            </div>
                            <div className="flex flex-1 flex-col justify-between gap-4">
                              <div>
                                <div className={cn("text-lg font-bold", themeVisuals.titleClass)}>{resource.name}</div>
                                <div className={cn("mt-2 text-sm leading-7", themeVisuals.bodyClass)}>
                                  {resource.description || "Resource siap ditampilkan untuk booking customer."}
                                </div>
                              </div>
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className={cn("text-sm font-semibold", themeVisuals.mutedClass)}>
                                  {bestPrice ? (
                                    <>
                                      Mulai dari{" "}
                                      <span className={themeVisuals.titleClass}>
                                        Rp {bestPrice.value.toLocaleString("id-ID")}
                                      </span>
                                      /{bestPrice.unit}
                                    </>
                                  ) : (
                                    "Harga tampil saat item utama tersedia"
                                  )}
                                </div>
                                <Button asChild className={themeVisuals.primaryButtonClass} style={themeVisuals.primaryButtonStyle}>
                                  <span>Pilih</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    );
                  })
                ) : (
                  <CatalogGrid
                    resources={resources}
                    primaryColor={theme.primary_color}
                    accentColor={theme.accent_color}
                    preset={theme.preset}
                    radiusStyle={theme.radius_style}
                    getBestPrice={getBestPrice}
                    themeVisuals={themeVisuals}
                  />
                )
              ) : (
                <Card className={cn(themeVisuals.emptyStateClass, "col-span-full p-8 text-center text-sm")}>
                  Resource tenant belum ada. Tambahkan resource agar katalog tampil di landing.
                </Card>
              )}
            </div>
          </div>
        </section>
      );
    case "gallery":
      const galleryImages = (profile.gallery || []).filter((image) => Boolean(image?.trim()));
      return sectionVariant === "grid" ? (
        <section key={section.id} id={getSectionAnchorId(section.id)} data-builder-section={section.id} className="px-6 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <div className={themeVisuals.eyebrowClass}>
                {String(section.props?.eyebrow || "Visual Experience")}
              </div>
              <h3 className={cn("mt-3 text-3xl font-[1000] tracking-tight md:text-5xl", themeVisuals.heroTitleClass)}>
                {String(section.props?.title || "Inside The Hub.")}
              </h3>
              {String(section.props?.description || "").trim() ? (
                <p className={cn("mx-auto mt-3 max-w-2xl text-sm leading-7", themeVisuals.bodyClass)}>
                  {String(section.props?.description || "")}
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galleryImages.map((image, index) => (
                <div key={`${image}-${index}`} className={cn(themeVisuals.cardClass, "overflow-hidden p-0")}>
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={image}
                      alt={`Galeri ${index + 1}`}
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 30vw, 50vw"
                      className="object-cover object-center"
                    />
                  </div>
                </div>
                ))}
            </div>
          </div>
        </section>
      ) : sectionVariant === "showcase" && galleryImages.length ? (
        <section key={section.id} id={getSectionAnchorId(section.id)} data-builder-section={section.id} className="px-6 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <div className={themeVisuals.eyebrowClass}>
                {String(section.props?.eyebrow || "Visual Experience")}
              </div>
              <h3 className={cn("mt-3 text-3xl font-[1000] tracking-tight md:text-5xl", themeVisuals.heroTitleClass)}>
                {String(section.props?.title || "Inside The Hub.")}
              </h3>
              {String(section.props?.description || "").trim() ? (
                <p className={cn("mx-auto mt-3 max-w-2xl text-sm leading-7", themeVisuals.bodyClass)}>
                  {String(section.props?.description || "")}
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className={cn(themeVisuals.cardClass, "overflow-hidden p-0")}>
                <div className="relative aspect-[16/10] w-full">
                  <Image
                    src={galleryImages[0]}
                    alt="Galeri utama"
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 55vw, 100vw"
                    className="object-cover object-center"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {galleryImages.slice(1, 4).map((image, index) => (
                  <div key={`${image}-${index}`} className={cn(themeVisuals.cardClass, "overflow-hidden p-0")}>
                    <div className="relative aspect-[4/3] w-full">
                      <Image
                        src={image}
                        alt={`Galeri ${index + 2}`}
                        fill
                        unoptimized
                        sizes="(min-width: 1024px) 22vw, 33vw"
                        className="object-cover object-center"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div key={section.id} id={getSectionAnchorId(section.id)} data-builder-section={section.id}>
          <GallerySection
            images={profile.gallery || []}
            primaryColor={theme.primary_color}
            accentColor={theme.accent_color}
            preset={theme.preset}
            radiusStyle={theme.radius_style}
            eyebrow={String(section.props?.eyebrow || "Visual Experience")}
            title={String(section.props?.title || "Inside The Hub.")}
            description={String(section.props?.description || "")}
          />
        </div>
      );
    case "testimonials":
      return (
        <section key={section.id} id={getSectionAnchorId(section.id)} data-builder-section={section.id} className="px-6 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <div className={themeVisuals.eyebrowClass}>
                {String(section.props?.eyebrow || section.label)}
              </div>
              <h3 className={cn("mt-3 text-3xl font-[1000] tracking-tight md:text-5xl", themeVisuals.heroTitleClass)}>
                {String(section.props?.title || "Kata pelanggan")}
              </h3>
            </div>
            {sectionVariant === "spotlight" ? (
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <Card className={cn(themeVisuals.panelClass, "p-6 md:p-8")}>
                  <div className={themeVisuals.eyebrowClass}>Pilihan editor</div>
                  <p className={cn("mt-4 text-lg leading-8 md:text-2xl md:leading-10", themeVisuals.strongBodyClass)}>
                    &quot;{String(testimonials[0]?.quote || "Belum ada kutipan.")}&quot;
                  </p>
                  <div className={cn("mt-6 text-sm font-black uppercase tracking-[0.24em]", themeVisuals.mutedClass)}>
                    {String(testimonials[0]?.name || "Customer")}
                  </div>
                </Card>
                <div className="grid gap-4">
                  {testimonials.slice(1).map((item, index) => (
                    <Card key={`${item.name || "testimonial"}-${index}`} className={cn(themeVisuals.cardClass, "p-5")}>
                      <p className={cn("text-sm leading-7", themeVisuals.bodyClass)}>
                        &quot;{String(item.quote || "Belum ada kutipan.")}&quot;
                      </p>
                      <div className={cn("mt-4 text-xs font-black uppercase tracking-[0.2em]", themeVisuals.eyebrowMutedClass)}>
                        {String(item.name || "Customer")}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : sectionVariant === "ticker" ? (
              <div className="space-y-4">
                {testimonials.map((item, index) => (
                  <Card key={`${item.name || "testimonial"}-${index}`} className={cn(themeVisuals.cardClass, "p-5 md:p-6")}>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className={cn("text-lg font-bold md:text-xl", themeVisuals.titleClass)}>
                          {String(item.name || "Customer")}
                        </div>
                        <p className={cn("mt-2 text-sm leading-7 md:text-base", themeVisuals.bodyClass)}>
                          &quot;{String(item.quote || "Belum ada kutipan.")}&quot;
                        </p>
                      </div>
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center text-sm font-black"
                        style={themeVisuals.numberBadgeStyle}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {testimonials.map((item, index) => (
                  <Card key={`${item.name || "testimonial"}-${index}`} className={cn(themeVisuals.cardClass, "p-5")}>
                    <p className={cn("text-sm leading-7", themeVisuals.bodyClass)}>
                      &quot;{String(item.quote || "Belum ada kutipan.")}&quot;
                    </p>
                    <div className={cn("mt-4 text-xs font-black uppercase tracking-[0.2em]", themeVisuals.eyebrowMutedClass)}>
                      {String(item.name || "Customer")}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      );
    case "faq":
      return (
        <section key={section.id} id={getSectionAnchorId(section.id)} data-builder-section={section.id} className="px-6 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <div className={themeVisuals.eyebrowClass}>
                {String(section.props?.eyebrow || section.label)}
              </div>
              <h3 className={cn("mt-3 text-3xl font-[1000] tracking-tight md:text-5xl", themeVisuals.heroTitleClass)}>
                {String(section.props?.title || "Pertanyaan yang sering muncul")}
              </h3>
            </div>
            {sectionVariant === "cards" ? (
              <div className="grid gap-4 md:grid-cols-2">
                {faqs.map((item, index) => (
                  <Card key={`${item.question || "faq"}-${index}`} className={cn(themeVisuals.cardClass, "p-5")}>
                    <div className={cn("text-base font-bold", themeVisuals.titleClass)}>
                      {String(item.question || "Pertanyaan")}
                    </div>
                    <div className={cn("mt-2 text-sm leading-7", themeVisuals.bodyClass)}>
                      {String(item.answer || "Jawaban akan ditampilkan di sini.")}
                    </div>
                  </Card>
                ))}
              </div>
            ) : sectionVariant === "split" ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {faqs.map((item, index) => (
                  <Card key={`${item.question || "faq"}-${index}`} className={cn(themeVisuals.panelClass, "p-5 md:p-6")}>
                    <div className="flex gap-4">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center border text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-200"
                        style={themeVisuals.numberBadgeStyle}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div>
                        <div className={cn("text-lg font-bold", themeVisuals.titleClass)}>
                          {String(item.question || "Pertanyaan")}
                        </div>
                        <div className={cn("mt-3 text-sm leading-7 md:text-base", themeVisuals.bodyClass)}>
                          {String(item.answer || "Jawaban akan ditampilkan di sini.")}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {faqs.map((item, index) => (
                  <Card key={`${item.question || "faq"}-${index}`} className={cn(themeVisuals.panelClass, "p-5")}>
                    <div className="flex gap-4">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center border text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-200"
                        style={themeVisuals.numberBadgeStyle}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div>
                        <div className={cn("text-base font-bold", themeVisuals.titleClass)}>
                          {String(item.question || "Pertanyaan")}
                        </div>
                        <div className={cn("mt-2 text-sm leading-7", themeVisuals.bodyClass)}>
                          {String(item.answer || "Jawaban akan ditampilkan di sini.")}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      );
    case "about":
      const aboutImage = String(section.props?.image_url || "").trim();
      return (
        <section key={section.id} id={getSectionAnchorId(section.id)} data-builder-section={section.id} className="px-6 py-16 md:px-8 md:py-24">
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
              <div className={themeVisuals.eyebrowClass}>
                {String(section.props?.eyebrow || section.label)}
              </div>
              <h3 className={cn("mt-3 text-3xl font-[1000] tracking-tight md:text-5xl", themeVisuals.heroTitleClass)}>
                {String(section.props?.title || `Tentang ${profile.name || "bisnis ini"}`)}
              </h3>
              <p className={cn("mt-5 text-sm leading-8 md:text-base", themeVisuals.bodyClass)}>
                {String(
                  section.props?.description ||
                    profile.about_us ||
                    "Ceritakan karakter bisnis, keunggulan utama, dan alasan kenapa customer harus booking di sini.",
                )}
              </p>
            </div>
            {aboutImage ? (
              <div className={cn(themeVisuals.panelClass, "overflow-hidden p-0")}>
                <div className="relative min-h-[320px] w-full">
                  <Image
                    src={aboutImage}
                    alt={String(section.props?.title || `Tentang ${profile.name || "bisnis ini"}`)}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover object-center"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </section>
      );
    case "contact":
      return sectionVariant === "split" ? (
        <section key={section.id} id={getSectionAnchorId(section.id)} data-builder-section={section.id} className="px-6 py-16 md:px-8 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className={cn(themeVisuals.panelClass, "p-6 md:p-8")}>
              <div className={themeVisuals.eyebrowClass}>{section.label}</div>
              <h3 className={cn("mt-3 text-3xl font-[1000] tracking-tight", themeVisuals.heroTitleClass)}>
                {String(section.props?.title || "Hubungi bisnis")}
              </h3>
              <p className={cn("mt-3 text-sm leading-7", themeVisuals.bodyClass)}>
                {String(section.props?.description || "Tampilkan lokasi, jam operasional, dan tombol WhatsApp.")}
              </p>
            </Card>
            <div className="space-y-4">
              <InfoRow
                icon={MapPin}
                label="Alamat"
                value={profile.address || "Alamat belum diisi"}
                themeVisuals={themeVisuals}
              />
              <InfoRow
                icon={Clock3}
                label="Jam operasional"
                value={`${profile.open_time || "-"} - ${profile.close_time || "-"}`}
                themeVisuals={themeVisuals}
              />
              {profile.whatsapp_number ? (
                <div className="pt-2">
                  <a href={`https://wa.me/${profile.whatsapp_number}`} target="_blank" rel="noreferrer">
                    <Button className={themeVisuals.primaryButtonClass} style={themeVisuals.primaryButtonStyle}>
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
        <section key={section.id} id={getSectionAnchorId(section.id)} data-builder-section={section.id} className="px-6 py-16 md:px-8 md:py-24">
          <div className={cn("mx-auto max-w-6xl p-6 md:p-8", themeVisuals.panelClass)}>
            <div className="grid gap-6 lg:grid-cols-3">
              <div>
                <div className={themeVisuals.eyebrowClass}>
                  {section.label}
                </div>
                <h3 className={cn("mt-3 text-3xl font-[1000] tracking-tight", themeVisuals.heroTitleClass)}>
                  {String(section.props?.title || "Hubungi bisnis")}
                </h3>
                <p className={cn("mt-2 text-sm leading-7", themeVisuals.bodyClass)}>
                  {String(
                    section.props?.description ||
                      "Tampilkan lokasi, jam operasional, dan tombol WhatsApp.",
                  )}
                </p>
              </div>
              <div className="space-y-4 lg:col-span-2">
                <InfoRow
                  icon={MapPin}
                  label="Alamat"
                  value={profile.address || "Alamat belum diisi"}
                  themeVisuals={themeVisuals}
                />
                <InfoRow
                  icon={Clock3}
                  label="Jam operasional"
                  value={`${profile.open_time || "-"} - ${profile.close_time || "-"}`}
                  themeVisuals={themeVisuals}
                />
                {profile.whatsapp_number ? (
                  <div className="pt-2">
                    <a href={`https://wa.me/${profile.whatsapp_number}`} target="_blank" rel="noreferrer">
                      <Button className={themeVisuals.primaryButtonClass} style={themeVisuals.primaryButtonStyle}>
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
      return sectionVariant === "inline_cta" ? (
        <section key={section.id} id={getSectionAnchorId(section.id)} data-builder-section={section.id} className="px-6 pb-20 pt-8 md:px-8 md:pb-28">
          <div className={cn("mx-auto flex max-w-5xl flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6", themeVisuals.panelClass)}>
            <div className="min-w-0">
              <div className={themeVisuals.eyebrowClass}>{section.label}</div>
              <h3 className={cn("mt-2 text-2xl font-[1000] tracking-tight md:text-3xl", themeVisuals.heroTitleClass)}>
                {String(section.props?.title || "Arahkan customer ke booking")}
              </h3>
            </div>
            <Link href="/bookings" className={cn("shrink-0", isEditorPreview ? "pointer-events-none" : "")}>
              <Button className={themeVisuals.primaryButtonClass} style={themeVisuals.primaryButtonStyle}>
                {bookingForm.cta_button_label}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      ) : (
        <section key={section.id} id={getSectionAnchorId(section.id)} data-builder-section={section.id} className="px-6 pb-20 pt-8 md:px-8 md:pb-28">
          <div className={cn("mx-auto grid max-w-6xl gap-5 p-6 shadow-sm md:grid-cols-[1.1fr_0.9fr] md:p-8", themeVisuals.panelClass)}>
            <div>
              <div className={themeVisuals.eyebrowClass}>{section.label}</div>
              <h3 className={cn("mt-3 text-3xl font-[1000] tracking-tight", themeVisuals.heroTitleClass)}>
                {String(section.props?.title || "Arahkan customer ke booking")}
              </h3>
              <p className={cn("mt-3 max-w-2xl text-sm leading-7", themeVisuals.bodyClass)}>
                {String(
                  section.props?.description ||
                    "Gunakan tombol ini untuk membawa customer langsung ke katalog atau kanal bantuan tercepat.",
                )}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Badge className={themeVisuals.badgeClass}>Booking lebih cepat</Badge>
                <Badge className={themeVisuals.badgeClass}>CTA mobile sticky</Badge>
                {bookingForm.show_whatsapp_help ? <Badge className={themeVisuals.badgeClass}>WhatsApp support</Badge> : null}
              </div>
            </div>
            <div className={cn("flex flex-col justify-between gap-4 p-5", themeVisuals.innerPanelClass)}>
              <div className="space-y-2">
                <div className={themeVisuals.eyebrowClass}>Aksi utama</div>
                <p className={cn("text-sm leading-7", themeVisuals.bodyClass)}>
                  Bawa visitor ke jalur konversi tercepat tanpa memenuhi landing dengan form panjang.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/bookings" className={isEditorPreview ? "pointer-events-none" : ""}>
                  <Button className={themeVisuals.primaryButtonClass} style={themeVisuals.primaryButtonStyle}>
                    {bookingForm.cta_button_label}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                {bookingForm.show_whatsapp_help && profile.whatsapp_number ? (
                  <a
                    href={`https://wa.me/${profile.whatsapp_number}`}
                    target="_blank"
                    rel="noreferrer"
                    className={isEditorPreview ? "pointer-events-none" : ""}
                  >
                    <Button variant="outline" className={themeVisuals.secondaryButtonClass}>
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
  themeVisuals,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  themeVisuals?: ReturnType<typeof getThemeVisuals>;
}) {
  return (
    <div className={cn("flex items-start gap-3 px-4 py-4", themeVisuals?.infoRowClass)}>
      <Icon className={cn("mt-0.5 h-4 w-4", themeVisuals?.eyebrowMutedClass)} />
      <div>
        <div className={cn("text-[11px] font-black uppercase tracking-[0.2em]", themeVisuals?.eyebrowMutedClass)}>
          {label}
        </div>
        <div className={cn("mt-1 text-sm leading-7", themeVisuals?.strongBodyClass)}>{value}</div>
      </div>
    </div>
  );
}

function CatalogGrid({
  resources,
  primaryColor,
  accentColor,
  preset,
  radiusStyle,
  getBestPrice,
  themeVisuals,
}: {
  resources: BuilderResource[];
  primaryColor: string;
  accentColor: string;
  preset: string;
  radiusStyle: string;
  getBestPrice: (resource: BuilderResource) => { value: number; unit: string } | null;
  themeVisuals: ReturnType<typeof getThemeVisuals>;
}) {
  const timedResources = resources.filter(
    (resource) => String(resource.operating_mode || "timed").toLowerCase() === "timed",
  );
  const nonTimedResources = resources.filter(
    (resource) => String(resource.operating_mode || "timed").toLowerCase() !== "timed",
  );
  const showSplit = timedResources.length > 0 && nonTimedResources.length > 0;

  const renderCards = (items: BuilderResource[]) => (
    <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((resource) => (
        <ResourceCard
          key={resource.id}
          res={resource}
          primaryColor={primaryColor}
          accentColor={accentColor}
          preset={preset}
          radiusStyle={radiusStyle}
          getBestPrice={getBestPrice}
        />
      ))}
    </div>
  );

  if (!showSplit) return renderCards(resources);

  return (
    <div className="space-y-8">
      {timedResources.length > 0 ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <div className={themeVisuals.eyebrowClass}>Booking timed</div>
            <p className={cn("text-sm", themeVisuals.bodyClass)}>
              Resource per jam, sesi, atau durasi.
            </p>
          </div>
          {renderCards(timedResources)}
        </div>
      ) : null}

      {nonTimedResources.length > 0 ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <div className={themeVisuals.eyebrowClass}>Produk & non-timed</div>
            <p className={cn("text-sm", themeVisuals.bodyClass)}>
              Resource yang dijual langsung tanpa booking durasi.
            </p>
          </div>
          {renderCards(nonTimedResources)}
        </div>
      ) : null}
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
      <div className="pointer-events-auto w-full max-w-[360px] rounded-[1.4rem] border border-white/50 bg-white/92 p-2.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/88">
        <Button
          className="h-11 w-full rounded-[1rem] text-sm font-black uppercase tracking-[0.14em] text-white"
          style={{ backgroundColor: primaryColor }}
          disabled={isEditorPreview}
        >
          {label}
        </Button>
      </div>
    </div>
  );
}

export function getPreviewSurfaceClass(theme: LandingThemeConfig) {
  const preset = theme.preset || "bookinaja-classic";
  switch (theme.surface_style) {
    case "contrast":
      return preset === "dark-pro"
        ? "bg-[linear-gradient(180deg,#020617_0%,#091225_22%,#0f172a_62%,#020617_100%)]"
        : preset === "bookinaja-classic"
          ? "bg-[linear-gradient(180deg,#0b1220_0%,#111827_18%,#f8fafc_52%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#020617_0%,#0b1220_24%,#050b16_100%)]"
          : "bg-[linear-gradient(180deg,#0b1220_0%,#111827_18%,#f8fafc_52%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#070b13_0%,#111827_24%,#05070d_100%)]";
    case "bright":
      return preset === "playful"
        ? "bg-[linear-gradient(180deg,#f0fdf4_0%,#ecfeff_24%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#04160e_0%,#072116_34%,#03120d_100%)]"
        : preset === "bookinaja-classic"
          ? "bg-[linear-gradient(180deg,#f0fdf4_0%,#eff6ff_36%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#03111f_0%,#0b1730_30%,#050b16_100%)]"
          : "bg-[linear-gradient(180deg,#f0fdf4_0%,#eff6ff_36%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#09111c_0%,#111827_28%,#05070d_100%)]";
    case "layered":
      return preset === "boutique"
        ? "bg-[linear-gradient(180deg,#fffaf2_0%,#f8f4ee_28%,#fefdfb_100%)] dark:bg-[linear-gradient(180deg,#120f0d_0%,#171412_30%,#0f0c0a_100%)]"
        : preset === "sunset-glow"
          ? "bg-[linear-gradient(180deg,#fff7ed_0%,#ffedd5_24%,#fffaf5_100%)] dark:bg-[linear-gradient(180deg,#2a1208_0%,#1f0d06_34%,#120804_100%)]"
        : preset === "bookinaja-classic"
          ? "bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_22%,#f8fafc_100%)] dark:bg-[linear-gradient(180deg,#07111f_0%,#0f172a_28%,#050b16_100%)]"
          : "bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_22%,#f8fafc_100%)] dark:bg-[linear-gradient(180deg,#070b13_0%,#111827_28%,#05070d_100%)]";
    default:
      return preset === "mono-luxe"
        ? "bg-[linear-gradient(180deg,#f8fafc_0%,#e5e7eb_30%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_28%,#020617_100%)]"
        : preset === "bookinaja-classic"
        ? "bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_28%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#030b18_0%,#0b1730_22%,#07111f_58%,#050b16_100%)]"
        : "bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_22%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#070b13_0%,#111827_28%,#05070d_100%)]";
  }
}

function getSectionAnchorId(sectionId: string) {
  return `landing-section-${sectionId}`;
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

export function getThemeVisuals(theme: LandingThemeConfig) {
  const radius = getRadiusSet(theme.radius_style);
  const preset = theme.preset || "bookinaja-classic";
  const surfaceStyle = theme.surface_style || "soft";
  const fontStyle = theme.font_style || "bold";

  const presetClassMap: Record<string, { panel: string; card: string; innerPanel: string; badge: string; secondaryButton: string; infoRow: string; empty: string; eyebrow: string; media: string; title: string; heroTitle: string; body: string; strongBody: string; muted: string; eyebrowMuted: string }> = {
    "bookinaja-classic": {
      panel: "border-slate-200 bg-white/92 shadow-[0_24px_70px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/6",
      card: "border-slate-200 bg-white/88 shadow-[0_16px_50px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5",
      innerPanel: "border-slate-200/80 bg-slate-50/90 dark:border-white/10 dark:bg-[#0b1220]",
      badge: "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100",
      secondaryButton: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10",
      infoRow: "rounded-[1.35rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-[#050505]",
      empty: "rounded-[2rem] border-dashed border-slate-300 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400",
      eyebrow: "text-slate-500 dark:text-slate-300",
      media: "rounded-[1.4rem] bg-slate-100 dark:bg-white/5",
      title: "text-slate-950 dark:text-white",
      heroTitle: "text-slate-900 dark:text-white",
      body: "text-slate-700 dark:text-slate-300",
      strongBody: "text-slate-800 dark:text-slate-100",
      muted: "text-slate-600 dark:text-slate-300",
      eyebrowMuted: "text-slate-500 dark:text-slate-300",
    },
    boutique: {
      panel: "border-stone-200 bg-[linear-gradient(180deg,rgba(255,251,245,0.98),rgba(250,247,242,0.92))] shadow-[0_28px_80px_rgba(41,37,36,0.08)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(25,24,23,0.95),rgba(15,14,13,0.96))]",
      card: "border-stone-200 bg-[#fffdf9] shadow-[0_18px_55px_rgba(41,37,36,0.08)] dark:border-white/10 dark:bg-[#171412]",
      innerPanel: "border-stone-200 bg-[#f8f3ec] dark:border-white/10 dark:bg-[#120f0d]",
      badge: "border-stone-200 bg-[#fffaf2] text-stone-700 dark:border-white/10 dark:bg-[#1b1815] dark:text-stone-100",
      secondaryButton: "border-stone-300 bg-[#fffaf2] text-stone-700 hover:bg-[#f9f2e8] dark:border-white/10 dark:bg-[#1b1815] dark:text-stone-100 dark:hover:bg-[#221d18]",
      infoRow: "rounded-[1.5rem] border border-stone-200 bg-[#fffdf9] dark:border-white/10 dark:bg-[#171412]",
      empty: "rounded-[2rem] border-dashed border-stone-300 bg-[#faf6f0] text-stone-500 dark:border-white/10 dark:bg-[#171412] dark:text-stone-300",
      eyebrow: "text-stone-400 dark:text-stone-300",
      media: "rounded-[1.5rem] bg-[#f3ede3] dark:bg-[#1b1815]",
      title: "text-stone-900 dark:text-stone-50",
      heroTitle: "text-stone-900 dark:text-stone-50",
      body: "text-stone-600 dark:text-stone-300",
      strongBody: "text-stone-700 dark:text-stone-200",
      muted: "text-stone-500 dark:text-stone-300",
      eyebrowMuted: "text-stone-400 dark:text-stone-300",
    },
    "sunset-glow": {
      panel: "border-orange-200 bg-[linear-gradient(180deg,rgba(255,247,237,0.98),rgba(255,237,213,0.9))] shadow-[0_28px_80px_rgba(124,45,18,0.1)] dark:border-orange-500/20 dark:bg-[linear-gradient(180deg,rgba(42,18,8,0.95),rgba(28,12,6,0.96))]",
      card: "border-orange-200 bg-[#fffaf5] shadow-[0_18px_55px_rgba(124,45,18,0.1)] dark:border-orange-500/20 dark:bg-[#1c0e09]",
      innerPanel: "border-orange-200 bg-[#fff1e8] dark:border-orange-500/20 dark:bg-[#160b07]",
      badge: "border-orange-200 bg-[#fff7ed] text-orange-800 dark:border-orange-500/20 dark:bg-[#221009] dark:text-orange-100",
      secondaryButton: "border-orange-300 bg-[#fff7ed] text-orange-800 hover:bg-[#ffedd5] dark:border-orange-500/20 dark:bg-[#221009] dark:text-orange-100 dark:hover:bg-[#2a140b]",
      infoRow: "rounded-[1.5rem] border border-orange-200 bg-[#fffaf5] dark:border-orange-500/20 dark:bg-[#1a0d08]",
      empty: "rounded-[2rem] border-dashed border-orange-300 bg-[#fff1e8] text-orange-700 dark:border-orange-500/20 dark:bg-[#1a0d08] dark:text-orange-200",
      eyebrow: "text-orange-500 dark:text-orange-300",
      media: "rounded-[1.5rem] bg-[#ffedd5] dark:bg-[#241109]",
      title: "text-orange-950 dark:text-orange-50",
      heroTitle: "text-orange-950 dark:text-orange-50",
      body: "text-orange-900/80 dark:text-orange-100/85",
      strongBody: "text-orange-950 dark:text-orange-50",
      muted: "text-orange-700 dark:text-orange-200",
      eyebrowMuted: "text-orange-500 dark:text-orange-300",
    },
    "mono-luxe": {
      panel: "border-slate-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] shadow-[0_28px_80px_rgba(15,23,42,0.1)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]",
      card: "border-slate-300 bg-[#ffffff] shadow-[0_18px_55px_rgba(15,23,42,0.09)] dark:border-white/10 dark:bg-[#0a0f1a]",
      innerPanel: "border-slate-300 bg-slate-100/90 dark:border-white/10 dark:bg-[#08101a]",
      badge: "border-slate-300 bg-white text-slate-800 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100",
      secondaryButton: "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100 dark:hover:bg-slate-800",
      infoRow: "rounded-[1.2rem] border border-slate-300 bg-white dark:border-white/10 dark:bg-[#060d19]",
      empty: "rounded-[2rem] border-dashed border-slate-300 bg-slate-100/80 text-slate-600 dark:border-white/10 dark:bg-[#08101f] dark:text-slate-300",
      eyebrow: "text-slate-500 dark:text-slate-300",
      media: "rounded-[1.3rem] bg-slate-100 dark:bg-slate-900",
      title: "text-slate-950 dark:text-slate-50",
      heroTitle: "text-slate-950 dark:text-slate-50",
      body: "text-slate-700 dark:text-slate-300",
      strongBody: "text-slate-900 dark:text-slate-100",
      muted: "text-slate-600 dark:text-slate-300",
      eyebrowMuted: "text-slate-500 dark:text-slate-300",
    },
    playful: {
      panel: "border-emerald-100 bg-[linear-gradient(180deg,rgba(248,255,250,0.98),rgba(240,253,244,0.94))] shadow-[0_24px_70px_rgba(20,83,45,0.08)] dark:border-emerald-500/20 dark:bg-[linear-gradient(180deg,rgba(5,32,20,0.92),rgba(4,24,17,0.96))]",
      card: "border-emerald-100 bg-white shadow-[0_16px_48px_rgba(20,83,45,0.08)] dark:border-emerald-500/20 dark:bg-[#082114]",
      innerPanel: "border-emerald-100 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-[#071a11]",
      badge: "border-emerald-100 bg-white text-emerald-700 dark:border-emerald-500/20 dark:bg-[#0b2417] dark:text-emerald-100",
      secondaryButton: "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-[#0b2417] dark:text-emerald-100 dark:hover:bg-[#0f2c1c]",
      infoRow: "rounded-[1.35rem] border border-emerald-100 bg-white dark:border-emerald-500/20 dark:bg-[#081a12]",
      empty: "rounded-[2rem] border-dashed border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/20 dark:bg-[#081a12] dark:text-emerald-100",
      eyebrow: "text-emerald-500 dark:text-emerald-300",
      media: "rounded-[1.4rem] bg-emerald-50 dark:bg-[#0a1f15]",
      title: "text-emerald-950 dark:text-emerald-50",
      heroTitle: "text-emerald-950 dark:text-white",
      body: "text-emerald-900/80 dark:text-emerald-100/85",
      strongBody: "text-emerald-950 dark:text-emerald-50",
      muted: "text-emerald-700 dark:text-emerald-200",
      eyebrowMuted: "text-emerald-500 dark:text-emerald-300",
    },
    "dark-pro": {
      panel: "border-slate-300 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(226,232,240,0.95))] shadow-[0_24px_70px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(8,15,30,0.98),rgba(3,7,18,0.96))]",
      card: "border-slate-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(241,245,249,0.95))] shadow-[0_16px_48px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(9,13,24,0.96))]",
      innerPanel: "border-slate-300 bg-white/75 dark:border-white/10 dark:bg-[#08101f]",
      badge: "border-slate-300 bg-white text-slate-700 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100",
      secondaryButton: "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100 dark:hover:bg-slate-800",
      infoRow: "rounded-[1.2rem] border border-slate-300 bg-white/88 dark:border-white/10 dark:bg-[#060d19]",
      empty: "rounded-[2rem] border-dashed border-slate-300 bg-slate-100/80 text-slate-500 dark:border-white/10 dark:bg-[#08101f] dark:text-slate-300",
      eyebrow: "text-slate-500 dark:text-slate-300",
      media: "rounded-[1.3rem] bg-slate-100 dark:bg-slate-900",
      title: "text-slate-900 dark:text-slate-50",
      heroTitle: "text-slate-900 dark:text-white",
      body: "text-slate-600 dark:text-slate-300",
      strongBody: "text-slate-700 dark:text-slate-200",
      muted: "text-slate-500 dark:text-slate-300",
      eyebrowMuted: "text-slate-500 dark:text-slate-300",
    },
  };

  const presetClasses = presetClassMap[preset] || presetClassMap["bookinaja-classic"];
  const surfaceModifiers: Record<string, { panel: string; card: string; innerPanel: string; badge: string; secondaryButton: string; media: string }> = {
    soft: {
      panel: "",
      card: "",
      innerPanel: "",
      badge: "",
      secondaryButton: "",
      media: "",
    },
    bright: {
      panel: "shadow-[0_26px_80px_rgba(255,255,255,0.26)] dark:shadow-[0_24px_70px_rgba(96,165,250,0.08)]",
      card: "bg-white dark:bg-white/[0.06]",
      innerPanel: "bg-white dark:bg-white/[0.05]",
      badge: "bg-white dark:bg-white/[0.08]",
      secondaryButton: "bg-white dark:bg-white/[0.07]",
      media: "ring-1 ring-white/70 dark:ring-white/10",
    },
    layered: {
      panel: "backdrop-blur-md shadow-[0_30px_90px_rgba(15,23,42,0.1)]",
      card: "backdrop-blur-md shadow-[0_18px_60px_rgba(15,23,42,0.08)]",
      innerPanel: "backdrop-blur-md",
      badge: "shadow-sm",
      secondaryButton: "shadow-sm",
      media: "ring-1 ring-slate-200/80 dark:ring-white/10",
    },
    contrast: {
      panel: "border-slate-300/90 dark:border-white/12 shadow-[0_32px_100px_rgba(15,23,42,0.16)]",
      card: "border-slate-300/80 dark:border-white/12 shadow-[0_22px_70px_rgba(15,23,42,0.14)]",
      innerPanel: "border-slate-300/80 dark:border-white/12",
      badge: "border-slate-300/80 dark:border-white/12",
      secondaryButton: "border-slate-300/80 dark:border-white/12",
      media: "ring-1 ring-slate-300/70 dark:ring-white/12",
    },
  };
  const fontModifiers: Record<string, { eyebrow: string; title: string; heroTitle: string; body: string; badge: string }> = {
    bold: {
      eyebrow: "tracking-[0.3em]",
      title: "tracking-tight",
      heroTitle: "uppercase tracking-tighter",
      body: "",
      badge: "tracking-[0.2em]",
    },
    modern: {
      eyebrow: "tracking-[0.34em]",
      title: "tracking-tight",
      heroTitle: "tracking-[-0.04em]",
      body: "tracking-[0.01em]",
      badge: "tracking-[0.18em]",
    },
    elegant: {
      eyebrow: "tracking-[0.38em]",
      title: "tracking-[-0.02em]",
      heroTitle: "tracking-[-0.03em]",
      body: "tracking-[0.012em]",
      badge: "tracking-[0.16em]",
    },
    playful: {
      eyebrow: "tracking-[0.28em]",
      title: "tracking-[-0.015em]",
      heroTitle: "tracking-[-0.03em]",
      body: "tracking-[0.006em]",
      badge: "tracking-[0.16em]",
    },
    minimal: {
      eyebrow: "tracking-[0.26em]",
      title: "tracking-normal",
      heroTitle: "tracking-[-0.02em]",
      body: "tracking-[0.004em]",
      badge: "tracking-[0.14em]",
    },
  };

  const surfaceClass = surfaceModifiers[surfaceStyle] || surfaceModifiers.soft;
  const fontClass = fontModifiers[fontStyle] || fontModifiers.bold;

  return {
    panelClass: cn("border backdrop-blur-sm", radius.panel, presetClasses.panel, surfaceClass.panel),
    innerPanelClass: cn("border backdrop-blur-sm", radius.card, presetClasses.innerPanel, surfaceClass.innerPanel),
    cardClass: cn("border backdrop-blur-sm", radius.card, presetClasses.card, surfaceClass.card),
    badgeClass: cn("border px-4 py-2 text-xs font-bold uppercase", radius.badge, presetClasses.badge, surfaceClass.badge, fontClass.badge),
    secondaryButtonClass: cn("border", radius.badge, presetClasses.secondaryButton, surfaceClass.secondaryButton),
    infoRowClass: cn(presetClasses.infoRow),
    emptyStateClass: cn(presetClasses.empty),
    eyebrowClass: cn("text-[11px] font-black uppercase", presetClasses.eyebrow, fontClass.eyebrow),
    eyebrowMutedClass: cn(presetClasses.eyebrowMuted),
    mediaClass: cn(presetClasses.media, surfaceClass.media),
    titleClass: cn(presetClasses.title, fontClass.title),
    heroTitleClass: cn(presetClasses.heroTitle, fontClass.heroTitle),
    bodyClass: cn(presetClasses.body, fontClass.body),
    strongBodyClass: cn(presetClasses.strongBody),
    mutedClass: cn(presetClasses.muted),
    primaryButtonClass: cn(
      "text-white shadow-[0_18px_45px_rgba(15,23,42,0.14)] transition-transform duration-200 hover:-translate-y-0.5",
      radius.badge,
    ),
    primaryButtonStyle: {
      backgroundColor: theme.primary_color,
      boxShadow: `0 18px 45px ${theme.primary_color}33`,
    },
    accentBarStyle: {
      backgroundColor: theme.primary_color,
      boxShadow: `0 0 0 4px ${theme.accent_color}14`,
    },
    numberBadgeStyle: {
      borderColor: `${theme.primary_color}33`,
      color: theme.primary_color,
      backgroundColor: `${theme.primary_color}12`,
      borderRadius: radius.numericBadgeRadius,
    },
  };
}

function getRadiusSet(radiusStyle?: string) {
  switch (radiusStyle) {
    case "soft":
      return {
        panel: "rounded-[2.25rem]",
        card: "rounded-[1.75rem]",
        badge: "rounded-[1.25rem]",
        numericBadgeRadius: "1rem",
      };
    case "square":
      return {
        panel: "rounded-[1.1rem]",
        card: "rounded-[0.9rem]",
        badge: "rounded-[0.8rem]",
        numericBadgeRadius: "0.8rem",
      };
    default:
      return {
        panel: "rounded-[2rem]",
        card: "rounded-[1.5rem]",
        badge: "rounded-[999px]",
        numericBadgeRadius: "1rem",
      };
  }
}
