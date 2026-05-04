"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  ImageIcon,
  Info,
  LayoutTemplate,
  Loader2,
  Monitor,
  MonitorCog,
  Palette,
  PencilLine,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Smartphone,
  Trash2,
  Type,
  Wand2,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { uploadFileInChunks } from "@/lib/chunk-upload";
import {
  DEFAULT_BOOKING_FORM_CONFIG,
  DEFAULT_PAGE_BUILDER_CONFIG,
  DEFAULT_THEME_CONFIG,
  type BookingFormConfig,
  type BuilderProfile,
  type BuilderResource,
  type BuilderSection,
  type LandingPageConfig,
  type LandingThemeConfig,
  normalizeBookingFormConfig,
  normalizePageBuilderConfig,
  normalizeThemeConfig,
} from "@/lib/page-builder";
type PageBuilderState = {
  profile: BuilderProfile;
  page: LandingPageConfig;
  theme: LandingThemeConfig;
  booking_form: BookingFormConfig;
  preview_url: string;
};

type ContentPanelKey =
  | "identity"
  | "story"
  | "catalog"
  | "about"
  | "media"
  | "testimonials"
  | "faq"
  | "contact"
  | "booking";

const THEME_PRESETS = [
  { id: "bookinaja-classic", label: "Bookinaja", description: "Bersih, terang, dan aman untuk mayoritas bisnis." },
  { id: "boutique", label: "Boutique", description: "Lebih premium untuk venue, salon, studio, dan brand lifestyle." },
  { id: "playful", label: "Playful", description: "Lebih ringan untuk bisnis keluarga, rental, atau bisnis yang santai." },
  { id: "dark-pro", label: "Dark Pro", description: "Kontras tajam untuk gaming, tech, dan creative space." },
];

const THEME_PRESET_VALUES: Record<string, Partial<LandingThemeConfig>> = {
  "bookinaja-classic": {
    preset: "bookinaja-classic",
    primary_color: "#2563eb",
    accent_color: "#0f1f4a",
    surface_style: "soft",
    font_style: "bold",
    radius_style: "rounded",
  },
  boutique: {
    preset: "boutique",
    primary_color: "#0f766e",
    accent_color: "#1f2937",
    surface_style: "layered",
    font_style: "elegant",
    radius_style: "soft",
  },
  playful: {
    preset: "playful",
    primary_color: "#16a34a",
    accent_color: "#14532d",
    surface_style: "bright",
    font_style: "playful",
    radius_style: "rounded",
  },
  "dark-pro": {
    preset: "dark-pro",
    primary_color: "#7c3aed",
    accent_color: "#111827",
    surface_style: "contrast",
    font_style: "modern",
    radius_style: "square",
  },
};

const FONT_STYLES = ["bold", "modern", "elegant", "playful", "minimal"] as const;
const RADIUS_STYLES = ["rounded", "soft", "square"] as const;
const PREVIEW_CHANNEL = "bookinaja-page-builder-preview";
const SECTION_VARIANTS: Record<string, { value: string; label: string; description: string }[]> = {
  hero: [
    { value: "immersive", label: "Immersive", description: "Hero besar, sinematik, dan fokus headline." },
    { value: "split", label: "Split", description: "Teks dan visual dibagi lebih seimbang." },
    { value: "compact", label: "Compact", description: "Lebih rapat untuk landing yang cepat ke katalog." },
  ],
  highlights: [
    { value: "pills", label: "Pills", description: "Keunggulan tampil sebagai chips ringkas." },
    { value: "grid", label: "Grid", description: "Keunggulan tampil sebagai kartu-kartu kecil." },
  ],
  catalog: [
    { value: "cards", label: "Cards", description: "Tampilan katalog dalam kartu visual." },
    { value: "list", label: "List", description: "Tampilan katalog lebih rapat seperti daftar." },
  ],
  gallery: [
    { value: "bento", label: "Bento", description: "Kolase editorial dengan komposisi visual besar." },
    { value: "grid", label: "Grid", description: "Galeri rapi berbasis kisi." },
  ],
  about: [
    { value: "split", label: "Split", description: "Cerita bisnis dengan ruang visual di samping." },
    { value: "centered", label: "Centered", description: "Fokus penuh ke cerita bisnis di tengah." },
  ],
  contact: [
    { value: "panel", label: "Panel", description: "Kontak tampil dalam panel informasi besar." },
    { value: "split", label: "Split", description: "Kontak dan info operasi dibagi dua kolom." },
  ],
  booking_form: [
    { value: "sticky_cta", label: "Sticky CTA", description: "Dorong customer ke aksi booking utama." },
    { value: "inline_cta", label: "Inline CTA", description: "CTA lebih ringan dan menyatu dengan konten." },
  ],
};

function buildPublishedSnapshot(
  profile: BuilderProfile,
  page: LandingPageConfig,
  theme: LandingThemeConfig,
  bookingForm: BookingFormConfig,
) {
  return JSON.stringify({
    profile,
    page,
    theme,
    bookingForm,
  });
}

export default function PageBuilderPage() {
  const [profile, setProfile] = useState<BuilderProfile | null>(null);
  const [resources, setResources] = useState<BuilderResource[]>([]);
  const [page, setPage] = useState<LandingPageConfig>(DEFAULT_PAGE_BUILDER_CONFIG);
  const [theme, setTheme] = useState<LandingThemeConfig>(DEFAULT_THEME_CONFIG);
  const [bookingForm, setBookingForm] = useState<BookingFormConfig>(DEFAULT_BOOKING_FORM_CONFIG);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("mobile");
  const [previewSource, setPreviewSource] = useState<"draft" | "live">("draft");
  const [workspaceMode, setWorkspaceMode] = useState<"content" | "structure" | "theme">("content");
  const [previewKey, setPreviewKey] = useState(0);
  const [selectedSectionId, setSelectedSectionId] = useState("hero");
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeContentPanel, setActiveContentPanel] = useState<ContentPanelKey>("identity");
  const [editingContentPanel, setEditingContentPanel] = useState<ContentPanelKey | null>(null);
  const [sectionsPanelOpen, setSectionsPanelOpen] = useState(true);
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSectionKey, setSavingSectionKey] = useState<string | null>(null);
  const [publishedSnapshot, setPublishedSnapshot] = useState("");
  const identityPanelOpen = activeContentPanel === "identity";
  const storyPanelOpen = activeContentPanel === "story";
  const catalogPanelOpen = activeContentPanel === "catalog";
  const aboutPanelOpen = activeContentPanel === "about";
  const mediaPanelOpen = activeContentPanel === "media";
  const testimonialsPanelOpen = activeContentPanel === "testimonials";
  const faqPanelOpen = activeContentPanel === "faq";
  const contactPanelOpen = activeContentPanel === "contact";
  const bookingPanelOpen = activeContentPanel === "booking";

  const fetchBuilder = useCallback(async () => {
    setLoading(true);
    try {
      const [builderRes, resourceRes] = await Promise.all([
        api.get<PageBuilderState>("/admin/page-builder"),
        api.get("/resources-all"),
      ]);
      const data = builderRes.data;
      const normalizedPage = normalizePageBuilderConfig(data.page);
      const normalizedTheme = normalizeThemeConfig(data.theme, data.profile.primary_color);
      const normalizedBookingForm = normalizeBookingFormConfig(data.booking_form);
      setProfile(data.profile);
      setPage(normalizedPage);
      setTheme(normalizedTheme);
      setBookingForm(normalizedBookingForm);
      setPublishedSnapshot(buildPublishedSnapshot(data.profile, normalizedPage, normalizedTheme, normalizedBookingForm));
      setPreviewUrl(data.preview_url);
      setResources(resourceRes.data?.resources || resourceRes.data || []);
      setSelectedSectionId(normalizedPage.sections[0]?.id || "hero");
    } catch {
      toast.error("Gagal memuat page builder");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBuilder();
  }, [fetchBuilder]);

  useEffect(() => {
    if (!profile?.id) return;
    const draft = {
      profile: { ...profile, primary_color: theme.primary_color },
      resources,
      page,
      theme,
      booking_form: bookingForm,
    };
    localStorage.setItem(`bookinaja:page-builder:draft:${profile.id}`, JSON.stringify(draft));
    localStorage.setItem("bookinaja:page-builder:active-draft", profile.id);
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel(PREVIEW_CHANNEL);
      channel.postMessage({ tenantId: profile.id, draft });
      channel.close();
    }
  }, [profile, resources, page, theme, bookingForm]);

  useEffect(() => {
    setPreviewKey((current) => current + 1);
  }, [previewMode]);

  const selectedSection = useMemo(
    () => page.sections.find((section) => section.id === selectedSectionId) || page.sections[0],
    [page.sections, selectedSectionId],
  );
  const heroSection = useMemo(
    () => page.sections.find((section) => section.type === "hero"),
    [page.sections],
  );
  const highlightsSection = useMemo(
    () => page.sections.find((section) => section.type === "highlights"),
    [page.sections],
  );
  const aboutSection = useMemo(
    () => page.sections.find((section) => section.type === "about"),
    [page.sections],
  );
  const catalogSection = useMemo(
    () => page.sections.find((section) => section.type === "catalog"),
    [page.sections],
  );
  const gallerySection = useMemo(
    () => page.sections.find((section) => section.type === "gallery"),
    [page.sections],
  );
  const testimonialsSection = useMemo(
    () => page.sections.find((section) => section.type === "testimonials"),
    [page.sections],
  );
  const faqSection = useMemo(
    () => page.sections.find((section) => section.type === "faq"),
    [page.sections],
  );
  const contactSection = useMemo(
    () => page.sections.find((section) => section.type === "contact"),
    [page.sections],
  );
  const bookingFormSection = useMemo(
    () => page.sections.find((section) => section.type === "booking_form"),
    [page.sections],
  );

  const activeCount = useMemo(
    () => page.sections.filter((section) => section.enabled).length,
    [page.sections],
  );

  const draftSnapshot = useMemo(() => {
    if (!profile) return "";
    return buildPublishedSnapshot(profile, page, theme, bookingForm);
  }, [profile, page, theme, bookingForm]);

  const hasUnpublishedChanges = useMemo(
    () => Boolean(publishedSnapshot) && draftSnapshot !== publishedSnapshot,
    [draftSnapshot, publishedSnapshot],
  );

  const updateSection = (sectionId: string, patch: Partial<BuilderSection>) => {
    setPage((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    }));
  };

  const moveSection = (sectionId: string, direction: "up" | "down") => {
    setPage((current) => {
      const index = current.sections.findIndex((section) => section.id === sectionId);
      if (index === -1) return current;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.sections.length) return current;
      const sections = [...current.sections];
      const [section] = sections.splice(index, 1);
      sections.splice(nextIndex, 0, section);
      return { ...current, sections };
    });
  };

  const updateSectionProp = (sectionId: string, key: string, value: unknown) => {
    setPage((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? { ...section, props: { ...(section.props || {}), [key]: value } }
          : section,
      ),
    }));
  };

  const updateProfilePatch = (patch: Partial<BuilderProfile>) => {
    setProfile((current) => (current ? { ...current, ...patch } : current));
  };

  const toggleContentPanel = (panel: ContentPanelKey) => {
    setActiveContentPanel((current) => {
      if (current === panel) {
        return current;
      }
      setEditingContentPanel(null);
      return panel;
    });
  };

  const toggleContentEditMode = (panel: ContentPanelKey) => {
    setEditingContentPanel((current) => (current === panel ? null : panel));
  };

  const updateProfileArrayItem = (
    key: "features" | "gallery",
    index: number,
    value: string,
  ) => {
    setProfile((current) => {
      if (!current) return current;
      const items = Array.isArray(current[key]) ? [...(current[key] as string[])] : [];
      items[index] = value;
      return { ...current, [key]: items };
    });
  };

  const addProfileArrayItem = (key: "features" | "gallery", value: string) => {
    setProfile((current) => {
      if (!current) return current;
      const items = Array.isArray(current[key]) ? [...(current[key] as string[])] : [];
      items.push(value);
      return { ...current, [key]: items };
    });
  };

  const removeProfileArrayItem = (key: "features" | "gallery", index: number) => {
    setProfile((current) => {
      if (!current) return current;
      const items = Array.isArray(current[key]) ? [...(current[key] as string[])] : [];
      items.splice(index, 1);
      return { ...current, [key]: items };
    });
  };

  const saveContentSection = async ({
    sectionKey,
    successMessage,
    profilePatch,
    bookingFormPatch,
    persistBuilder,
  }: {
    sectionKey: string;
    successMessage: string;
    profilePatch?: Partial<BuilderProfile>;
    bookingFormPatch?: Partial<BookingFormConfig>;
    persistBuilder?: boolean;
  }) => {
    if (!profile) return;

    const nextProfile = profilePatch ? { ...profile, ...profilePatch } : profile;
    const nextBookingForm = bookingFormPatch ? { ...bookingForm, ...bookingFormPatch } : bookingForm;

    setSavingSectionKey(sectionKey);
    try {
      let savedProfile = nextProfile;
      if (profilePatch) {
        const profileRes = await api.put("/admin/profile", nextProfile);
        savedProfile = (profileRes.data?.data || nextProfile) as BuilderProfile;
        setProfile(savedProfile);
      }

      if (bookingFormPatch || persistBuilder) {
        const builderRes = await api.put("/admin/page-builder", {
          page,
          theme,
          booking_form: nextBookingForm,
        });
        const data = builderRes.data?.data as PageBuilderState | undefined;
        if (data?.booking_form) {
          const normalizedBookingForm = normalizeBookingFormConfig(data.booking_form);
          setBookingForm(normalizedBookingForm);
          setPublishedSnapshot(buildPublishedSnapshot(savedProfile, page, theme, normalizedBookingForm));
        } else {
          setBookingForm(nextBookingForm);
          setPublishedSnapshot(buildPublishedSnapshot(savedProfile, page, theme, nextBookingForm));
        }
      } else {
        setPublishedSnapshot(buildPublishedSnapshot(savedProfile, page, theme, bookingForm));
      }

      setPreviewKey((current) => current + 1);
      toast.success(successMessage);
    } catch {
      toast.error("Gagal menyimpan perubahan section");
    } finally {
      setSavingSectionKey(null);
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const profileRes = await api.put("/admin/profile", profile);
      const nextProfile = (profileRes.data?.data || profile) as BuilderProfile;
      const builderRes = await api.put("/admin/page-builder", {
        page,
        theme,
        booking_form: bookingForm,
      });
      const data = builderRes.data?.data as PageBuilderState | undefined;
      if (data?.profile) {
        const mergedProfile = { ...nextProfile, ...data.profile };
        const normalizedPage = normalizePageBuilderConfig(data.page);
        const normalizedTheme = normalizeThemeConfig(data.theme, mergedProfile.primary_color);
        const normalizedBookingForm = normalizeBookingFormConfig(data.booking_form);
        setProfile(mergedProfile);
        setPage(normalizedPage);
        setTheme(normalizedTheme);
        setBookingForm(normalizedBookingForm);
        setPublishedSnapshot(buildPublishedSnapshot(mergedProfile, normalizedPage, normalizedTheme, normalizedBookingForm));
      } else {
        setProfile(nextProfile);
        setPublishedSnapshot(buildPublishedSnapshot(nextProfile, page, theme, bookingForm));
      }
      setPreviewKey((current) => current + 1);
      toast.success("Halaman live berhasil diperbarui");
    } catch {
      toast.error("Gagal menyimpan page builder");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return <PageBuilderSkeleton />;
  }

  return (
    <div className="space-y-4 pb-20">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              Landing Page Studio
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Kelola konten dan tampilan halaman bisnis dalam satu studio
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              Semua konten utama, urutan section, tema, dan preview customer sekarang hidup dalam satu workspace editorial. Kamu tidak perlu lagi pindah antara form bisnis dan builder.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {previewUrl ? (
              <Button asChild variant="outline" className="h-11 rounded-2xl dark:border-white/10 dark:bg-white/[0.03]">
                <a href={previewUrl} target="_blank" rel="noreferrer">
                  Buka Halaman Publik
                </a>
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={fetchBuilder} className="h-11 rounded-2xl dark:border-white/10 dark:bg-white/[0.03]">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button type="button" onClick={onSave} disabled={saving} className="h-11 rounded-2xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Menyimpan..." : "Simpan ke Live"}
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
              hasUnpublishedChanges
                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
            )}
          >
            <span className={cn("h-2.5 w-2.5 rounded-full", hasUnpublishedChanges ? "bg-amber-500" : "bg-emerald-500")} />
            {hasUnpublishedChanges ? "Draft lokal belum tersimpan ke halaman live" : "Draft sudah sinkron dengan halaman live"}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
            Preview saat ini:
            <span className="font-semibold text-slate-700 dark:text-white">
              {previewSource === "draft" ? "Draft editor" : "Versi published"}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="rounded-[1.75rem] border-slate-200 bg-white p-3 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
            <div className="grid grid-cols-3 gap-2">
              <WorkspaceModeButton
                icon={<BriefcaseBusiness className="h-4 w-4" />}
                active={workspaceMode === "content"}
                label="Konten"
                onClick={() => setWorkspaceMode("content")}
              />
              <WorkspaceModeButton
                icon={<LayoutTemplate className="h-4 w-4" />}
                active={workspaceMode === "structure"}
                label="Section"
                onClick={() => setWorkspaceMode("structure")}
              />
              <WorkspaceModeButton
                icon={<Palette className="h-4 w-4" />}
                active={workspaceMode === "theme"}
                label="Tema"
                onClick={() => setWorkspaceMode("theme")}
              />
            </div>
          </Card>

          {workspaceMode === "content" ? (
            <BusinessStudioPanel
              profile={profile}
              heroSection={heroSection}
              highlightsSection={highlightsSection}
              catalogSection={catalogSection}
              aboutSection={aboutSection}
              gallerySection={gallerySection}
              testimonialsSection={testimonialsSection}
              faqSection={faqSection}
              contactSection={contactSection}
              bookingFormSection={bookingFormSection}
              bookingForm={bookingForm}
              savingSectionKey={savingSectionKey}
              identityPanelOpen={identityPanelOpen}
              identityPanelEditing={editingContentPanel === "identity"}
              storyPanelOpen={storyPanelOpen}
              storyPanelEditing={editingContentPanel === "story"}
              catalogPanelOpen={catalogPanelOpen}
              catalogPanelEditing={editingContentPanel === "catalog"}
              aboutPanelOpen={aboutPanelOpen}
              aboutPanelEditing={editingContentPanel === "about"}
              mediaPanelOpen={mediaPanelOpen}
              mediaPanelEditing={editingContentPanel === "media"}
              testimonialsPanelOpen={testimonialsPanelOpen}
              testimonialsPanelEditing={editingContentPanel === "testimonials"}
              faqPanelOpen={faqPanelOpen}
              faqPanelEditing={editingContentPanel === "faq"}
              contactPanelOpen={contactPanelOpen}
              contactPanelEditing={editingContentPanel === "contact"}
              bookingPanelOpen={bookingPanelOpen}
              bookingPanelEditing={editingContentPanel === "booking"}
              onToggleIdentity={() => toggleContentPanel("identity")}
              onToggleIdentityEdit={() => toggleContentEditMode("identity")}
              onToggleStory={() => toggleContentPanel("story")}
              onToggleStoryEdit={() => toggleContentEditMode("story")}
              onToggleCatalog={() => toggleContentPanel("catalog")}
              onToggleCatalogEdit={() => toggleContentEditMode("catalog")}
              onToggleAbout={() => toggleContentPanel("about")}
              onToggleAboutEdit={() => toggleContentEditMode("about")}
              onToggleMedia={() => toggleContentPanel("media")}
              onToggleMediaEdit={() => toggleContentEditMode("media")}
              onToggleTestimonials={() => toggleContentPanel("testimonials")}
              onToggleTestimonialsEdit={() => toggleContentEditMode("testimonials")}
              onToggleFaq={() => toggleContentPanel("faq")}
              onToggleFaqEdit={() => toggleContentEditMode("faq")}
              onToggleContact={() => toggleContentPanel("contact")}
              onToggleContactEdit={() => toggleContentEditMode("contact")}
              onToggleBooking={() => toggleContentPanel("booking")}
              onToggleBookingEdit={() => toggleContentEditMode("booking")}
              onProfilePatch={updateProfilePatch}
              onProfileArrayItemChange={updateProfileArrayItem}
              onAddProfileArrayItem={addProfileArrayItem}
              onRemoveProfileArrayItem={removeProfileArrayItem}
              onBookingFormChange={setBookingForm}
              onSectionChange={updateSection}
              onSectionPropChange={updateSectionProp}
              onSaveSection={saveContentSection}
            />
          ) : null}
          {workspaceMode === "structure" ? (
          <CollapsibleSidebarCard
            icon={<LayoutTemplate className="h-4 w-4" />}
            title="Sections"
            description={`${activeCount} aktif • edit via popup`}
            open={sectionsPanelOpen}
            onToggle={() => setSectionsPanelOpen((current) => !current)}
          >
            <BuilderSectionList
              sections={page.sections}
              selectedSectionId={selectedSectionId}
              onSelect={(sectionId) => {
                setSelectedSectionId(sectionId);
                setEditorOpen(true);
              }}
              onToggle={(section) => updateSection(section.id, { enabled: !section.enabled })}
              onMove={moveSection}
            />
          </CollapsibleSidebarCard>
          ) : null}

          {workspaceMode === "theme" ? (
          <CollapsibleSidebarCard
            icon={<Wand2 className="h-4 w-4" />}
            title="Tema"
            description="Preset visual dan sistem style"
            open={themePanelOpen}
            onToggle={() => setThemePanelOpen((current) => !current)}
          >
            <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Preset tema
                  </Label>
                  <div className="grid gap-2">
                    {THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          setTheme((current) => ({
                            ...current,
                            ...THEME_PRESET_VALUES[preset.id],
                          }))
                        }
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-left transition-colors",
                          theme.preset === preset.id
                            ? "border-[var(--bookinaja-500)] bg-[var(--bookinaja-50)] dark:bg-[rgba(59,130,246,0.12)]"
                            : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]",
                        )}
                      >
                        <div className="text-sm font-semibold text-slate-950 dark:text-white">{preset.label}</div>
                        <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{preset.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <Field label="Warna utama">
                  <div className="flex gap-2">
                    <Input
                      value={theme.primary_color}
                      onChange={(event) => setTheme((current) => ({ ...current, primary_color: event.target.value }))}
                      className="font-mono"
                    />
                    <label className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10">
                      <input
                        type="color"
                        value={theme.primary_color}
                        onChange={(event) => setTheme((current) => ({ ...current, primary_color: event.target.value }))}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                      <span className="h-7 w-7 rounded-xl" style={{ backgroundColor: theme.primary_color }} />
                    </label>
                  </div>
                </Field>

                <div className="grid gap-4">
                  <ChoiceChips
                    label="Font vibe"
                    value={theme.font_style}
                    options={[...FONT_STYLES]}
                    onChange={(value) => setTheme((current) => ({ ...current, font_style: value }))}
                  />
                  <ChoiceChips
                    label="Radius"
                    value={theme.radius_style}
                    options={[...RADIUS_STYLES]}
                    onChange={(value) => setTheme((current) => ({ ...current, radius_style: value }))}
                  />
                </div>

              </div>
            </Card>
          </CollapsibleSidebarCard>
          ) : null}
        </aside>

        <section className="space-y-4 xl:sticky xl:top-6 xl:h-[calc(100vh-2rem)]">
          <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
                  Live Preview
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {activeCount} section aktif • klik section di kiri untuk edit via popup
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {selectedSection ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditorOpen(true)}
                    className="h-11 rounded-2xl dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <PencilLine className="mr-2 h-4 w-4" />
                    Edit Section
                  </Button>
                ) : null}
                <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[0.03]">
                  <button
                    type="button"
                    onClick={() => setPreviewSource("draft")}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                      previewSource === "draft"
                        ? "bg-white text-slate-950 shadow-sm dark:bg-[var(--bookinaja-600)] dark:text-white"
                        : "text-slate-500 dark:text-slate-300",
                    )}
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSource("live")}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                      previewSource === "live"
                        ? "bg-white text-slate-950 shadow-sm dark:bg-[var(--bookinaja-600)] dark:text-white"
                        : "text-slate-500 dark:text-slate-300",
                    )}
                  >
                    Live
                  </button>
                </div>
                <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[0.03]">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("desktop")}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                      previewMode === "desktop"
                        ? "bg-white text-slate-950 shadow-sm dark:bg-[var(--bookinaja-600)] dark:text-white"
                        : "text-slate-500 dark:text-slate-300",
                    )}
                  >
                    <Monitor className="h-4 w-4" />
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("mobile")}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                      previewMode === "mobile"
                        ? "bg-white text-slate-950 shadow-sm dark:bg-[var(--bookinaja-600)] dark:text-white"
                        : "text-slate-500 dark:text-slate-300",
                    )}
                  >
                    <Smartphone className="h-4 w-4" />
                    Mobile
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-[820px] overflow-hidden bg-[linear-gradient(180deg,rgba(241,245,249,0.9),rgba(248,250,252,1))] p-3 dark:bg-[linear-gradient(180deg,rgba(10,15,28,0.98),rgba(5,5,10,1))] md:p-6 xl:h-[calc(100vh-11rem)]">
              {previewMode === "desktop" ? (
                <DesktopPreviewFrame>
                  <PreviewIframe mode="desktop" source={previewSource} previewKey={previewKey} />
                </DesktopPreviewFrame>
              ) : (
                <MobilePreviewFrame>
                  <PreviewIframe mode="mobile" source={previewSource} previewKey={previewKey} />
                </MobilePreviewFrame>
              )}
            </div>
          </Card>
        </section>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="!max-w-[min(96vw,1100px)] max-h-[90vh] overflow-hidden rounded-[2rem] p-0 dark:border-white/10 dark:bg-[#0f0f17]">
          <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
            <DialogTitle className="text-xl font-bold text-slate-950 dark:text-white">
              {selectedSection?.label || "Edit section"}
            </DialogTitle>
            <DialogDescription>
              Atur bagaimana section tampil di landing tanpa mengubah isi kontennya.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(90vh-160px)] overflow-y-auto px-6 py-5">
            {selectedSection ? (
              <SectionEditor
                section={selectedSection}
                onChange={updateSection}
              />
            ) : null}
          </div>

          <DialogFooter className="border-t border-slate-200 px-6 py-4 dark:border-white/10">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditorOpen(false)}>
              Tutup
            </Button>
            <Button type="button" className="rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]" onClick={() => setEditorOpen(false)}>
              Selesai edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BuilderSectionList({
  sections,
  selectedSectionId,
  onSelect,
  onToggle,
  onMove,
}: {
  sections: BuilderSection[];
  selectedSectionId: string;
  onSelect: (sectionId: string) => void;
  onToggle: (section: BuilderSection) => void;
  onMove: (sectionId: string, direction: "up" | "down") => void;
}) {
  return (
    <Card className="rounded-[1.75rem] border-slate-200 bg-white p-3 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
        <LayoutTemplate className="h-4 w-4" />
        Sections
      </div>
      <div className="mt-3 space-y-2">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className={cn(
              "rounded-[1.25rem] border px-3 py-2.5 transition-colors",
              selectedSectionId === section.id
                ? "border-[var(--bookinaja-500)] bg-[var(--bookinaja-50)] dark:bg-[rgba(59,130,246,0.12)]"
                : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]",
            )}
          >
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => onSelect(section.id)} className="min-w-0 flex-1 text-left">
                <div className="text-[15px] font-semibold text-slate-950 dark:text-white">{section.label}</div>
                <div className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-slate-400">{section.type}</div>
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onToggle(section)}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white dark:hover:bg-white/10"
                >
                  {section.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => onMove(section.id, "up")}
                  disabled={index === 0}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white disabled:opacity-30 dark:hover:bg-white/10"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(section.id, "down")}
                  disabled={index === sections.length - 1}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white disabled:opacity-30 dark:hover:bg-white/10"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelect(section.id)}
              className="mt-2.5 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-100 dark:bg-[#050505] dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10"
            >
              <PencilLine className="h-3.5 w-3.5" />
              Atur tampilan
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function WorkspaceModeButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-[1.1rem] border px-2 py-3 text-center transition-colors",
        active
          ? "border-[var(--bookinaja-500)] bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[rgba(59,130,246,0.12)] dark:text-[var(--bookinaja-100)]"
          : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300",
      )}
    >
      {icon}
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}

function BusinessStudioPanel({
  profile,
  heroSection,
  highlightsSection,
  catalogSection,
  aboutSection,
  gallerySection,
  testimonialsSection,
  faqSection,
  contactSection,
  bookingFormSection,
  bookingForm,
  savingSectionKey,
  identityPanelOpen,
  identityPanelEditing,
  storyPanelOpen,
  storyPanelEditing,
  catalogPanelOpen,
  catalogPanelEditing,
  aboutPanelOpen,
  aboutPanelEditing,
  mediaPanelOpen,
  mediaPanelEditing,
  testimonialsPanelOpen,
  testimonialsPanelEditing,
  faqPanelOpen,
  faqPanelEditing,
  contactPanelOpen,
  contactPanelEditing,
  bookingPanelOpen,
  bookingPanelEditing,
  onToggleIdentity,
  onToggleIdentityEdit,
  onToggleStory,
  onToggleStoryEdit,
  onToggleCatalog,
  onToggleCatalogEdit,
  onToggleAbout,
  onToggleAboutEdit,
  onToggleMedia,
  onToggleMediaEdit,
  onToggleTestimonials,
  onToggleTestimonialsEdit,
  onToggleFaq,
  onToggleFaqEdit,
  onToggleContact,
  onToggleContactEdit,
  onToggleBooking,
  onToggleBookingEdit,
  onProfilePatch,
  onProfileArrayItemChange,
  onAddProfileArrayItem,
  onRemoveProfileArrayItem,
  onBookingFormChange,
  onSectionChange,
  onSectionPropChange,
  onSaveSection,
}: {
  profile: BuilderProfile;
  heroSection?: BuilderSection;
  highlightsSection?: BuilderSection;
  catalogSection?: BuilderSection;
  aboutSection?: BuilderSection;
  gallerySection?: BuilderSection;
  testimonialsSection?: BuilderSection;
  faqSection?: BuilderSection;
  contactSection?: BuilderSection;
  bookingFormSection?: BuilderSection;
  bookingForm: BookingFormConfig;
  savingSectionKey: string | null;
  identityPanelOpen: boolean;
  identityPanelEditing: boolean;
  storyPanelOpen: boolean;
  storyPanelEditing: boolean;
  catalogPanelOpen: boolean;
  catalogPanelEditing: boolean;
  aboutPanelOpen: boolean;
  aboutPanelEditing: boolean;
  mediaPanelOpen: boolean;
  mediaPanelEditing: boolean;
  testimonialsPanelOpen: boolean;
  testimonialsPanelEditing: boolean;
  faqPanelOpen: boolean;
  faqPanelEditing: boolean;
  contactPanelOpen: boolean;
  contactPanelEditing: boolean;
  bookingPanelOpen: boolean;
  bookingPanelEditing: boolean;
  onToggleIdentity: () => void;
  onToggleIdentityEdit: () => void;
  onToggleStory: () => void;
  onToggleStoryEdit: () => void;
  onToggleCatalog: () => void;
  onToggleCatalogEdit: () => void;
  onToggleAbout: () => void;
  onToggleAboutEdit: () => void;
  onToggleMedia: () => void;
  onToggleMediaEdit: () => void;
  onToggleTestimonials: () => void;
  onToggleTestimonialsEdit: () => void;
  onToggleFaq: () => void;
  onToggleFaqEdit: () => void;
  onToggleContact: () => void;
  onToggleContactEdit: () => void;
  onToggleBooking: () => void;
  onToggleBookingEdit: () => void;
  onProfilePatch: (patch: Partial<BuilderProfile>) => void;
  onProfileArrayItemChange: (key: "features" | "gallery", index: number, value: string) => void;
  onAddProfileArrayItem: (key: "features" | "gallery", value: string) => void;
  onRemoveProfileArrayItem: (key: "features" | "gallery", index: number) => void;
  onBookingFormChange: React.Dispatch<React.SetStateAction<BookingFormConfig>>;
  onSectionChange: (sectionId: string, patch: Partial<BuilderSection>) => void;
  onSectionPropChange: (sectionId: string, key: string, value: unknown) => void;
  onSaveSection: (input: {
    sectionKey: string;
    successMessage: string;
    profilePatch?: Partial<BuilderProfile>;
    bookingFormPatch?: Partial<BookingFormConfig>;
    persistBuilder?: boolean;
  }) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <CollapsibleSidebarCard
        icon={<BriefcaseBusiness className="h-4 w-4" />}
        title="Identitas & Hero"
        description="Nama bisnis, badge, headline hero, deskripsi utama"
        open={identityPanelOpen}
        editing={identityPanelEditing}
        onToggleEdit={onToggleIdentityEdit}
        onToggle={onToggleIdentity}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset disabled={!identityPanelEditing} className="space-y-4 disabled:opacity-100">
            <Field label="Nama bisnis">
              <Input value={profile.name || ""} onChange={(event) => onProfilePatch({ name: event.target.value })} />
            </Field>
            <Field label="Slogan badge">
              <Input value={profile.slogan || ""} onChange={(event) => onProfilePatch({ slogan: event.target.value })} />
            </Field>
            <Field label="Tagline utama">
              <Input value={profile.tagline || ""} onChange={(event) => onProfilePatch({ tagline: event.target.value })} />
            </Field>
            <Field label="Deskripsi hero">
              <Textarea
                value={String(heroSection?.props?.description || "")}
                onChange={(event) => heroSection && onSectionPropChange(heroSection.id, "description", event.target.value)}
                className="min-h-24"
                placeholder="Copy singkat yang tampil di hero"
              />
            </Field>
            {identityPanelEditing ? (
              <SectionSaveButton
                saving={savingSectionKey === "identity"}
                onClick={() =>
                  onSaveSection({
                    sectionKey: "identity",
                    successMessage: "Hero bisnis diperbarui",
                    profilePatch: {
                      name: profile.name,
                      slogan: profile.slogan,
                      tagline: profile.tagline,
                    },
                    persistBuilder: true,
                  })
                }
              />
            ) : null}
          </fieldset>
        </Card>
      </CollapsibleSidebarCard>

      <CollapsibleSidebarCard
        icon={<Type className="h-4 w-4" />}
        title="Keunggulan"
        description="Judul section dan poin jual utama"
        open={storyPanelOpen}
        editing={storyPanelEditing}
        onToggleEdit={onToggleStoryEdit}
        onToggle={onToggleStory}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset disabled={!storyPanelEditing} className="space-y-4 disabled:opacity-100">
            <Field label="Judul section keunggulan">
              <Input
                value={String(highlightsSection?.props?.title || "Keunggulan utama")}
                onChange={(event) => highlightsSection && onSectionPropChange(highlightsSection.id, "title", event.target.value)}
              />
            </Field>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Poin keunggulan
              </Label>
              {(profile.features || []).map((feature, index) => (
                <div
                  key={`feature-${index}`}
                  className="flex items-center gap-3 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <Input
                    value={feature}
                    onChange={(event) => onProfileArrayItemChange("features", index, event.target.value)}
                  />
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => onRemoveProfileArrayItem("features", index)}>
                    Hapus
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => onAddProfileArrayItem("features", "Keunggulan baru")}>
                Tambah poin
              </Button>
            </div>
            {storyPanelEditing ? (
              <SectionSaveButton
                saving={savingSectionKey === "story"}
                onClick={() =>
                  onSaveSection({
                    sectionKey: "story",
                    successMessage: "Section keunggulan diperbarui",
                    profilePatch: {
                      features: profile.features,
                    },
                    persistBuilder: true,
                  })
                }
              />
            ) : null}
          </fieldset>
        </Card>
      </CollapsibleSidebarCard>

      <CollapsibleSidebarCard
        icon={<LayoutTemplate className="h-4 w-4" />}
        title="Katalog"
        description="Heading katalog dan ajakan masuk ke daftar layanan"
        open={catalogPanelOpen}
        editing={catalogPanelEditing}
        onToggleEdit={onToggleCatalogEdit}
        onToggle={onToggleCatalog}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset disabled={!catalogPanelEditing} className="space-y-4 disabled:opacity-100">
            <Field label="Judul section katalog">
              <Input
                value={String(catalogSection?.props?.title || "Pilih layanan")}
                onChange={(event) => catalogSection && onSectionPropChange(catalogSection.id, "title", event.target.value)}
              />
            </Field>
            <Field label="Deskripsi katalog">
              <Textarea
                value={String(catalogSection?.props?.description || "")}
                onChange={(event) => catalogSection && onSectionPropChange(catalogSection.id, "description", event.target.value)}
                className="min-h-24"
                placeholder="Jelaskan apa yang customer akan lihat di katalog."
              />
            </Field>
            <Field label="Label CTA utama">
              <Input
                value={bookingForm.cta_button_label}
                onChange={(event) =>
                  onBookingFormChange((current) => ({ ...current, cta_button_label: event.target.value }))
                }
              />
            </Field>
            {catalogPanelEditing ? (
              <SectionSaveButton
                saving={savingSectionKey === "catalog"}
                onClick={() =>
                  onSaveSection({
                    sectionKey: "catalog",
                    successMessage: "Section katalog diperbarui",
                    bookingFormPatch: {
                      cta_button_label: bookingForm.cta_button_label,
                    },
                    persistBuilder: true,
                  })
                }
              />
            ) : null}
          </fieldset>
        </Card>
      </CollapsibleSidebarCard>

      <CollapsibleSidebarCard
        icon={<Type className="h-4 w-4" />}
        title="Tentang Bisnis"
        description="Judul, narasi, dan foto pendukung section tentang bisnis"
        open={aboutPanelOpen}
        editing={aboutPanelEditing}
        onToggleEdit={onToggleAboutEdit}
        onToggle={onToggleAbout}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset disabled={!aboutPanelEditing} className="space-y-4 disabled:opacity-100">
            <Field label="Judul section tentang bisnis">
              <Input
                value={String(aboutSection?.props?.title || "")}
                onChange={(event) => aboutSection && onSectionPropChange(aboutSection.id, "title", event.target.value)}
                placeholder={`Tentang ${profile.name || "bisnis ini"}`}
              />
            </Field>
            <Field label="Isi cerita bisnis">
              <Textarea
                value={String(aboutSection?.props?.description || "")}
                onChange={(event) => aboutSection && onSectionPropChange(aboutSection.id, "description", event.target.value)}
                className="min-h-32"
                placeholder="Ceritakan bisnis, suasana, dan alasan customer memilih kamu."
              />
            </Field>
            <LandingStudioSingleUpload
              label="Foto tentang bisnis"
              value={String(aboutSection?.props?.image_url || "")}
              onChange={(url) => aboutSection && onSectionPropChange(aboutSection.id, "image_url", url)}
              aspect="video"
            />
            {aboutPanelEditing ? (
              <SectionSaveButton
                saving={savingSectionKey === "about"}
                onClick={() =>
                  onSaveSection({
                    sectionKey: "about",
                    successMessage: "Section tentang bisnis diperbarui",
                    persistBuilder: true,
                  })
                }
              />
            ) : null}
          </fieldset>
        </Card>
      </CollapsibleSidebarCard>

      <CollapsibleSidebarCard
        icon={<ImageIcon className="h-4 w-4" />}
        title="Media Landing"
        description="Logo, banner, foto, dan identitas visual galeri"
        open={mediaPanelOpen}
        editing={mediaPanelEditing}
        onToggleEdit={onToggleMediaEdit}
        onToggle={onToggleMedia}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset disabled={!mediaPanelEditing} className="space-y-4 disabled:opacity-100">
            <Field label="Eyebrow galeri">
              <Input
                value={String(gallerySection?.props?.eyebrow || "Visual Experience")}
                onChange={(event) => gallerySection && onSectionPropChange(gallerySection.id, "eyebrow", event.target.value)}
              />
            </Field>
            <Field label="Judul section galeri">
              <Input
                value={String(gallerySection?.props?.title || "Inside The Hub.")}
                onChange={(event) => gallerySection && onSectionPropChange(gallerySection.id, "title", event.target.value)}
              />
            </Field>
            <Field label="Deskripsi galeri">
              <Textarea
                value={String(gallerySection?.props?.description || "")}
                onChange={(event) => gallerySection && onSectionPropChange(gallerySection.id, "description", event.target.value)}
                className="min-h-24"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <LandingStudioSingleUpload
                label="Logo bisnis"
                value={profile.logo_url || ""}
                onChange={(url) => onProfilePatch({ logo_url: url })}
                aspect="square"
              />
              <LandingStudioSingleUpload
                label="Banner / hero"
                value={profile.banner_url || ""}
                onChange={(url) => onProfilePatch({ banner_url: url })}
                aspect="video"
              />
            </div>
            <LandingStudioGalleryUpload
              values={profile.gallery || []}
              onChange={(gallery) => onProfilePatch({ gallery })}
            />
            {mediaPanelEditing ? (
              <SectionSaveButton
                saving={savingSectionKey === "media"}
                onClick={() =>
                  onSaveSection({
                    sectionKey: "media",
                    successMessage: "Media landing diperbarui",
                    profilePatch: {
                      logo_url: profile.logo_url,
                      banner_url: profile.banner_url,
                      gallery: profile.gallery,
                    },
                    persistBuilder: true,
                  })
                }
              />
            ) : null}
          </fieldset>
        </Card>
      </CollapsibleSidebarCard>

      <CollapsibleSidebarCard
        icon={<Type className="h-4 w-4" />}
        title="Testimoni"
        description="Judul section dan kutipan pelanggan"
        open={testimonialsPanelOpen}
        editing={testimonialsPanelEditing}
        onToggleEdit={onToggleTestimonialsEdit}
        onToggle={onToggleTestimonials}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset disabled={!testimonialsPanelEditing} className="space-y-4 disabled:opacity-100">
            <SectionStateToggle
              enabled={Boolean(testimonialsSection?.enabled)}
              onToggle={() =>
                testimonialsSection &&
                onSectionChange(testimonialsSection.id, { enabled: !testimonialsSection.enabled })
              }
            />
            <Field label="Judul section testimoni">
              <Input
                value={String(testimonialsSection?.props?.title || "Kata pelanggan")}
                onChange={(event) => testimonialsSection && onSectionPropChange(testimonialsSection.id, "title", event.target.value)}
              />
            </Field>
            <ObjectListEditor
              title="Kutipan pelanggan"
              kind="testimonials"
              items={readObjectArray(testimonialsSection?.props?.items)}
              onItemChange={(index, field, value) =>
                testimonialsSection &&
                onSectionPropChange(
                  testimonialsSection.id,
                  "items",
                  readObjectArray(testimonialsSection?.props?.items).map((item, itemIndex) =>
                    itemIndex === index ? { ...item, [field]: value } : item,
                  ),
                )
              }
              onAdd={() =>
                testimonialsSection &&
                onSectionPropChange(testimonialsSection.id, "items", [
                  ...readObjectArray(testimonialsSection?.props?.items),
                  { name: "Customer baru", quote: "Kesan baru" },
                ])
              }
              onRemove={(index) =>
                testimonialsSection &&
                onSectionPropChange(
                  testimonialsSection.id,
                  "items",
                  readObjectArray(testimonialsSection?.props?.items).filter((_, itemIndex) => itemIndex !== index),
                )
              }
            />
            {testimonialsPanelEditing ? (
              <SectionSaveButton
                saving={savingSectionKey === "testimonials"}
                onClick={() =>
                  onSaveSection({
                    sectionKey: "testimonials",
                    successMessage: "Section testimoni diperbarui",
                    persistBuilder: true,
                  })
                }
              />
            ) : null}
          </fieldset>
        </Card>
      </CollapsibleSidebarCard>

      <CollapsibleSidebarCard
        icon={<Type className="h-4 w-4" />}
        title="FAQ"
        description="Pertanyaan penting sebelum customer booking"
        open={faqPanelOpen}
        editing={faqPanelEditing}
        onToggleEdit={onToggleFaqEdit}
        onToggle={onToggleFaq}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset disabled={!faqPanelEditing} className="space-y-4 disabled:opacity-100">
            <SectionStateToggle
              enabled={Boolean(faqSection?.enabled)}
              onToggle={() =>
                faqSection &&
                onSectionChange(faqSection.id, { enabled: !faqSection.enabled })
              }
            />
            <Field label="Judul section FAQ">
              <Input
                value={String(faqSection?.props?.title || "Pertanyaan yang sering muncul")}
                onChange={(event) => faqSection && onSectionPropChange(faqSection.id, "title", event.target.value)}
              />
            </Field>
            <ObjectListEditor
              title="Pertanyaan & jawaban"
              kind="faq"
              items={readObjectArray(faqSection?.props?.items)}
              onItemChange={(index, field, value) =>
                faqSection &&
                onSectionPropChange(
                  faqSection.id,
                  "items",
                  readObjectArray(faqSection?.props?.items).map((item, itemIndex) =>
                    itemIndex === index ? { ...item, [field]: value } : item,
                  ),
                )
              }
              onAdd={() =>
                faqSection &&
                onSectionPropChange(faqSection.id, "items", [
                  ...readObjectArray(faqSection?.props?.items),
                  { question: "Pertanyaan baru", answer: "Jawaban baru" },
                ])
              }
              onRemove={(index) =>
                faqSection &&
                onSectionPropChange(
                  faqSection.id,
                  "items",
                  readObjectArray(faqSection?.props?.items).filter((_, itemIndex) => itemIndex !== index),
                )
              }
            />
            {faqPanelEditing ? (
              <SectionSaveButton
                saving={savingSectionKey === "faq"}
                onClick={() =>
                  onSaveSection({
                    sectionKey: "faq",
                    successMessage: "Section FAQ diperbarui",
                    persistBuilder: true,
                  })
                }
              />
            ) : null}
          </fieldset>
        </Card>
      </CollapsibleSidebarCard>

      <CollapsibleSidebarCard
        icon={<Phone className="h-4 w-4" />}
        title="Kontak & Operasional"
        description="Alamat, jam buka, WhatsApp"
        open={contactPanelOpen}
        editing={contactPanelEditing}
        onToggleEdit={onToggleContactEdit}
        onToggle={onToggleContact}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset disabled={!contactPanelEditing} className="space-y-4 disabled:opacity-100">
            <Field label="Judul section kontak">
              <Input
                value={String(contactSection?.props?.title || "Hubungi bisnis")}
                onChange={(event) => contactSection && onSectionPropChange(contactSection.id, "title", event.target.value)}
              />
            </Field>
            <Field label="Deskripsi section kontak">
              <Textarea
                value={String(contactSection?.props?.description || "")}
                onChange={(event) => contactSection && onSectionPropChange(contactSection.id, "description", event.target.value)}
                className="min-h-24"
              />
            </Field>
            <Field label="Alamat">
              <Textarea
                value={profile.address || ""}
                onChange={(event) => onProfilePatch({ address: event.target.value })}
                className="min-h-24"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Jam buka">
                <Input value={profile.open_time || ""} onChange={(event) => onProfilePatch({ open_time: event.target.value })} />
              </Field>
              <Field label="Jam tutup">
                <Input value={profile.close_time || ""} onChange={(event) => onProfilePatch({ close_time: event.target.value })} />
              </Field>
            </div>
            <Field label="Nomor WhatsApp">
              <Input value={profile.whatsapp_number || ""} onChange={(event) => onProfilePatch({ whatsapp_number: event.target.value })} />
            </Field>
            {contactPanelEditing ? (
              <SectionSaveButton
                saving={savingSectionKey === "contact"}
                onClick={() =>
                  onSaveSection({
                    sectionKey: "contact",
                    successMessage: "Kontak bisnis diperbarui",
                    profilePatch: {
                      address: profile.address,
                      open_time: profile.open_time,
                      close_time: profile.close_time,
                      whatsapp_number: profile.whatsapp_number,
                    },
                    persistBuilder: true,
                  })
                }
              />
            ) : null}
          </fieldset>
        </Card>
      </CollapsibleSidebarCard>

      <CollapsibleSidebarCard
        icon={<Phone className="h-4 w-4" />}
        title="Booking & Bantuan"
        description="Copy section booking, CTA, dan bantuan WhatsApp"
        open={bookingPanelOpen}
        editing={bookingPanelEditing}
        onToggleEdit={onToggleBookingEdit}
        onToggle={onToggleBooking}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset disabled={!bookingPanelEditing} className="space-y-4 disabled:opacity-100">
            <Field label="Judul section booking">
              <Input
                value={String(bookingFormSection?.props?.title || "Arahkan customer ke booking")}
                onChange={(event) => bookingFormSection && onSectionPropChange(bookingFormSection.id, "title", event.target.value)}
              />
            </Field>
            <Field label="Deskripsi section booking">
              <Textarea
                value={String(bookingFormSection?.props?.description || "")}
                onChange={(event) => bookingFormSection && onSectionPropChange(bookingFormSection.id, "description", event.target.value)}
                className="min-h-24"
              />
            </Field>
            <Field label="Label tombol booking">
              <Input
                value={bookingForm.cta_button_label}
                onChange={(event) =>
                  onBookingFormChange((current) => ({ ...current, cta_button_label: event.target.value }))
                }
              />
            </Field>
            <Field label="Label bantuan WhatsApp">
              <Input
                value={bookingForm.whatsapp_label}
                onChange={(event) =>
                  onBookingFormChange((current) => ({ ...current, whatsapp_label: event.target.value }))
                }
              />
            </Field>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  onBookingFormChange((current) => ({
                    ...current,
                    show_whatsapp_help: !current.show_whatsapp_help,
                  }))
                }
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition-colors",
                  bookingForm.show_whatsapp_help
                    ? "border-[var(--bookinaja-500)] bg-[var(--bookinaja-50)] dark:bg-[rgba(59,130,246,0.12)]"
                    : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]",
                )}
              >
                <div className="text-sm font-semibold text-slate-950 dark:text-white">Bantuan WhatsApp</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {bookingForm.show_whatsapp_help ? "Ditampilkan di preview" : "Disembunyikan dari preview"}
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  onBookingFormChange((current) => ({
                    ...current,
                    sticky_mobile_cta: !current.sticky_mobile_cta,
                  }))
                }
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition-colors",
                  bookingForm.sticky_mobile_cta
                    ? "border-[var(--bookinaja-500)] bg-[var(--bookinaja-50)] dark:bg-[rgba(59,130,246,0.12)]"
                    : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]",
                )}
              >
                <div className="text-sm font-semibold text-slate-950 dark:text-white">Sticky mobile CTA</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {bookingForm.sticky_mobile_cta ? "Aktif untuk landing mobile" : "Nonaktif"}
                </div>
              </button>
            </div>
            {bookingPanelEditing ? (
              <SectionSaveButton
                saving={savingSectionKey === "booking"}
                onClick={() =>
                  onSaveSection({
                    sectionKey: "booking",
                    successMessage: "Section booking diperbarui",
                    bookingFormPatch: {
                      cta_button_label: bookingForm.cta_button_label,
                      whatsapp_label: bookingForm.whatsapp_label,
                      show_whatsapp_help: bookingForm.show_whatsapp_help,
                      sticky_mobile_cta: bookingForm.sticky_mobile_cta,
                    },
                    persistBuilder: true,
                  })
                }
              />
            ) : null}
          </fieldset>
        </Card>
      </CollapsibleSidebarCard>
    </div>
  );
}

function CollapsibleSidebarCard({
  icon,
  title,
  description,
  open,
  editing,
  onToggleEdit,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  open: boolean;
  editing?: boolean;
  onToggleEdit?: () => void;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-[1.4rem] border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition-colors hover:bg-slate-50 dark:border-white/15 dark:bg-[#0f0f17] dark:hover:bg-white/[0.04]">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-[1rem] px-1 py-0.5 text-left"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              {icon}
              {title}
            </div>
            <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{description}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-1.5 text-slate-500 dark:border-white/10 dark:text-slate-300">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        </button>
        {open && onToggleEdit ? (
          <button
            type="button"
            onClick={onToggleEdit}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
              editing
                ? "border-[var(--bookinaja-500)] bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[rgba(59,130,246,0.12)] dark:text-[var(--bookinaja-100)]"
                : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300",
            )}
          >
            {editing ? "Edit mode" : "View mode"}
          </button>
        ) : null}
      </div>

      {open ? children : null}
    </div>
  );
}

function SectionEditor({
  section,
  onChange,
}: {
  section: BuilderSection;
  onChange: (sectionId: string, patch: Partial<BuilderSection>) => void;
}) {
  const variantOptions = SECTION_VARIANTS[section.type] || [];
  return (
    <div className="space-y-5">
      <div className="rounded-[1.6rem] border border-[var(--bookinaja-200)] bg-[var(--bookinaja-50)] p-5 text-sm text-slate-700 dark:border-[rgba(96,165,250,0.18)] dark:bg-[rgba(59,130,246,0.12)] dark:text-slate-200">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 text-[var(--bookinaja-600)]" />
          <div>
            <div className="font-semibold">Mode section = tampilan & struktur</div>
            <p className="mt-1 leading-6 text-slate-600 dark:text-slate-300">
              Konten yang dilihat customer sekarang diatur dari tab <span className="font-semibold text-slate-900 dark:text-white">Konten</span>.
              Di popup ini kamu cukup mengatur apakah section aktif di landing dan variant tampilannya agar tidak terjadi mismatch data.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
        <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Status section
          </div>
          <button
            type="button"
            onClick={() => onChange(section.id, { enabled: !section.enabled })}
            className={cn(
              "mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors",
              section.enabled
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-[#050505] dark:text-slate-300",
            )}
          >
            <span className="text-sm font-semibold">
              {section.enabled ? "Tampil di landing" : "Disembunyikan dari landing"}
            </span>
            <span className="rounded-full border border-current/15 px-3 py-1 text-xs font-semibold">
              {section.enabled ? "Aktif" : "Hidden"}
            </span>
          </button>
        </div>

        <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Variant tampilan
          </Label>
          {variantOptions.length ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {variantOptions.map((option) => {
                const active = (section.variant || variantOptions[0]?.value) === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(section.id, { variant: option.value })}
                    className={cn(
                      "rounded-[1rem] border px-4 py-4 text-left transition-colors",
                      active
                        ? "border-[var(--bookinaja-500)] bg-white dark:bg-[#050505]"
                        : "border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/[0.02]",
                    )}
                  >
                    <div className="text-sm font-semibold text-slate-950 dark:text-white">{option.label}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
              Section ini belum punya variant khusus karena tampilannya masih satu mode yang paling stabil.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DesktopPreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1460px]">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-[#0f0f17]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-500 dark:border-white/10 dark:bg-[#050505] dark:text-slate-300">
            <MonitorCog className="h-3.5 w-3.5" />
            Preview Desktop
          </div>
        </div>
        <div className="h-[780px] overflow-auto">{children}</div>
      </div>
    </div>
  );
}

function MobilePreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[760px] items-center justify-center">
      <div className="rounded-[3rem] bg-[#0c1426] p-3 shadow-[0_35px_120px_rgba(15,23,42,0.35)]">
        <div className="relative mx-auto w-[410px] overflow-hidden rounded-[2.65rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-[#050505]">
          <div className="absolute left-1/2 top-3 z-20 h-7 w-32 -translate-x-1/2 rounded-full bg-[#0c1426]" />
          <div className="h-[780px] overflow-auto pt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

function PreviewIframe({
  mode,
  source,
  previewKey,
}: {
  mode: "desktop" | "mobile";
  source: "draft" | "live";
  previewKey: number;
}) {
  return (
    <iframe
      key={`${source}-${mode}-${previewKey}`}
      src={source === "draft" ? `/preview/page-builder?mode=${mode}` : `/preview/page-builder-live?mode=${mode}`}
      title={`Preview ${mode}`}
      className="h-full w-full border-0 bg-white"
    />
  );
}

function SectionSaveButton({
  saving,
  onClick,
}: {
  saving: boolean;
  onClick: () => void | Promise<void>;
}) {
  return (
    <div className="flex justify-end">
      <Button type="button" onClick={() => void onClick()} disabled={saving} className="rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        {saving ? "Menyimpan..." : "Simpan section"}
      </Button>
    </div>
  );
}

function SectionStateToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center justify-between rounded-[1.2rem] border px-4 py-3 text-left transition-colors",
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
          : "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300",
      )}
    >
      <div>
        <div className="text-sm font-semibold">
          {enabled ? "Section tampil di landing" : "Section masih disembunyikan"}
        </div>
        <div className="mt-1 text-xs opacity-80">
          {enabled ? "Customer akan melihat section ini di landing page." : "Aktifkan jika ingin section muncul di landing."}
        </div>
      </div>
      <span className="rounded-full border border-current/15 px-3 py-1 text-xs font-semibold">
        {enabled ? "Aktif" : "Hidden"}
      </span>
    </button>
  );
}

function ObjectListEditor({
  title,
  kind,
  items,
  onItemChange,
  onAdd,
  onRemove,
}: {
  title: string;
  kind: "faq" | "testimonials";
  items: Record<string, string>[];
  onItemChange: (index: number, field: string, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {title}
      </Label>
      {items.map((item, index) => (
        <div
          key={`${kind}-${index}`}
          className="space-y-3 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]"
        >
          {kind === "faq" ? (
            <>
              <Input
                value={String(item.question || "")}
                onChange={(event) => onItemChange(index, "question", event.target.value)}
                placeholder="Pertanyaan"
              />
              <Textarea
                value={String(item.answer || "")}
                onChange={(event) => onItemChange(index, "answer", event.target.value)}
                placeholder="Jawaban"
                className="min-h-24"
              />
            </>
          ) : (
            <>
              <Input
                value={String(item.name || "")}
                onChange={(event) => onItemChange(index, "name", event.target.value)}
                placeholder="Nama customer"
              />
              <Textarea
                value={String(item.quote || "")}
                onChange={(event) => onItemChange(index, "quote", event.target.value)}
                placeholder="Kutipan"
                className="min-h-24"
              />
            </>
          )}
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onRemove(index)}>
            Hapus item
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" className="rounded-xl" onClick={onAdd}>
        Tambah item
      </Button>
    </div>
  );
}

function readObjectArray(value: unknown): Record<string, string>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, string> => typeof item === "object" && item !== null);
}

async function prepareStudioImageUpload(file: File) {
  const maxBytes = 4.8 * 1024 * 1024;
  if (file.size <= maxBytes) return file;
  return compressImageForStudio(file, maxBytes);
}

async function compressImageForStudio(file: File, targetBytes: number) {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await loadImageElement(imageUrl);
    const maxDimension = 2200;
    let width = image.naturalWidth;
    let height = image.naturalHeight;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak tersedia");
    ctx.drawImage(image, 0, 0, width, height);

    const mimeType = file.type === "image/png" ? "image/webp" : file.type || "image/jpeg";
    const qualities = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5];
    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, mimeType, quality);
      if (!blob) continue;
      if (blob.size <= targetBytes) {
        const extension = mimeType === "image/webp" ? "webp" : mimeType === "image/png" ? "png" : "jpg";
        const fileName = file.name.replace(/\.[^.]+$/, `.${extension}`);
        return new File([blob], fileName, { type: mimeType });
      }
    }

    const fallbackBlob = await canvasToBlob(canvas, mimeType, 0.45);
    if (!fallbackBlob) throw new Error("Kompresi gambar gagal");
    const extension = mimeType === "image/webp" ? "webp" : mimeType === "image/png" ? "png" : "jpg";
    const fileName = file.name.replace(/\.[^.]+$/, `.${extension}`);
    return new File([fallbackBlob], fileName, { type: mimeType });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gagal membaca gambar"));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

function readUploadErrorMessage(error: unknown, label: string) {
  const apiMessage = getApiErrorMessage(error).toLowerCase();
  if (apiMessage.includes("5mb") || apiMessage.includes("melebihi")) {
    return `Ukuran ${label} terlalu besar. Coba pakai gambar lebih kecil atau kompres dulu.`;
  }
  return `Gagal mengupload ${label}`;
}

function getApiErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: { data?: unknown } }).response?.data &&
    typeof (error as { response?: { data?: { error?: unknown } } }).response?.data === "object"
  ) {
    const data = (error as { response?: { data?: { error?: unknown } } }).response?.data;
    return String(data?.error || "");
  }
  if (error instanceof Error) return error.message;
  return "";
}

function LandingStudioSingleUpload({
  label,
  value,
  onChange,
  aspect = "square",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: "square" | "video";
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const preparedFile = await prepareStudioImageUpload(file);
      const res = await uploadFileInChunks("/admin/upload", preparedFile, setProgress);
      onChange(res.url);
      toast.success(`${label} berhasil diupload`);
    } catch (error: unknown) {
      toast.error(readUploadErrorMessage(error, label.toLowerCase()));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </Label>
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]",
          aspect === "square" ? "aspect-square" : "aspect-video",
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-slate-950/70 via-transparent to-transparent p-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm">
                <ImageIcon className="h-4 w-4" />
                Ganti
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handleUpload(event.target.files?.[0] || null)}
                  disabled={uploading}
                />
              </label>
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl bg-white/95 text-slate-900 hover:bg-white"
                onClick={() => onChange("")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-3 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[var(--bookinaja-600)] shadow-sm dark:bg-[#050505]">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-6 w-6" />}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {uploading ? `Uploading ${progress}%` : `Upload ${label}`}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Klik atau drop gambar untuk mengubah preview.
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void handleUpload(event.target.files?.[0] || null)}
              disabled={uploading}
            />
          </label>
        )}
      </div>
    </div>
  );
}

function LandingStudioGalleryUpload({
  values,
  onChange,
}: {
  values: string[];
  onChange: (gallery: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const preparedFile = await prepareStudioImageUpload(file);
        const res = await uploadFileInChunks("/admin/upload", preparedFile);
        uploaded.push(res.url);
      }
      onChange([...(values || []), ...uploaded]);
      toast.success(`${uploaded.length} foto galeri ditambahkan`);
    } catch (error: unknown) {
      toast.error(readUploadErrorMessage(error, "foto galeri"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Foto galeri
        </Label>
        <span className="text-xs text-slate-400 dark:text-slate-500">{values.length} foto</span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {values.map((image, index) => (
          <div key={`${image}-${index}`} className="group relative aspect-square overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/95 text-slate-900 shadow-sm opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 text-center transition-colors hover:border-[var(--bookinaja-500)] hover:bg-[var(--bookinaja-50)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin text-[var(--bookinaja-600)]" /> : <Plus className="h-6 w-6 text-[var(--bookinaja-600)]" />}
          <div className="px-3 text-xs text-slate-500 dark:text-slate-400">
            {uploading ? "Mengupload..." : "Tambah foto"}
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => void handleUpload(event.target.files)}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}

function ChoiceChips({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
              value === option
                ? "border-[var(--bookinaja-500)] bg-[var(--bookinaja-50)] text-[var(--bookinaja-700)] dark:bg-[rgba(59,130,246,0.12)] dark:text-[var(--bookinaja-100)]"
                : "border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-300",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </Label>
      {children}
    </div>
  );
}

function PageBuilderSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 rounded-[2rem] bg-white dark:bg-white/5" />
      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Skeleton className="h-[760px] rounded-[2rem] bg-white dark:bg-white/5" />
        <Skeleton className="h-[920px] rounded-[2rem] bg-white dark:bg-white/5" />
      </div>
    </div>
  );
}
