"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  ImageIcon,
  LayoutTemplate,
  Loader2,
  MonitorCog,
  Palette,
  PencilLine,
  Phone,
  Plus,
  Save,
  Trash2,
  Type,
  Wand2,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  PageBuilderPreviewToolbar,
  PageBuilderStudioHeader,
} from "@/components/dashboard/page-builder-studio";
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

type EditorDraftSnapshot = {
  profile: BuilderProfile;
  page: LandingPageConfig;
  theme: LandingThemeConfig;
  bookingForm: BookingFormConfig;
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
  {
    id: "bookinaja-classic",
    label: "Bookinaja",
    description: "Bersih, terang, dan aman untuk mayoritas bisnis.",
  },
  {
    id: "boutique",
    label: "Boutique",
    description:
      "Lebih premium untuk venue, salon, studio, dan brand lifestyle.",
  },
  {
    id: "playful",
    label: "Playful",
    description:
      "Lebih ringan untuk bisnis keluarga, rental, atau bisnis yang santai.",
  },
  {
    id: "dark-pro",
    label: "Dark Pro",
    description: "Kontras tajam untuk gaming, tech, dan creative space.",
  },
  {
    id: "sunset-glow",
    label: "Sunset Glow",
    description:
      "Warm, editorial, dan lebih expressive untuk hospitality atau lifestyle brand.",
  },
  {
    id: "mono-luxe",
    label: "Mono Luxe",
    description:
      "Monokrom rapi dengan rasa premium untuk brand modern dan corporate.",
  },
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
  "sunset-glow": {
    preset: "sunset-glow",
    primary_color: "#ea580c",
    accent_color: "#7c2d12",
    surface_style: "layered",
    font_style: "elegant",
    radius_style: "soft",
  },
  "mono-luxe": {
    preset: "mono-luxe",
    primary_color: "#111827",
    accent_color: "#475569",
    surface_style: "contrast",
    font_style: "minimal",
    radius_style: "square",
  },
};

const FONT_STYLES = [
  "bold",
  "modern",
  "elegant",
  "playful",
  "minimal",
] as const;
const RADIUS_STYLES = ["rounded", "soft", "square"] as const;
const SURFACE_STYLES = ["soft", "bright", "layered", "contrast"] as const;
const PREVIEW_CHANNEL = "bookinaja-page-builder-preview";
const SECTION_VARIANTS: Record<
  string,
  { value: string; label: string; description: string }[]
> = {
  hero: [
    {
      value: "immersive",
      label: "Immersive",
      description: "Hero besar, sinematik, dan fokus headline.",
    },
    {
      value: "split",
      label: "Split",
      description: "Teks dan visual dibagi lebih seimbang.",
    },
    {
      value: "compact",
      label: "Compact",
      description: "Lebih rapat untuk landing yang cepat ke katalog.",
    },
  ],
  highlights: [
    {
      value: "pills",
      label: "Pills",
      description: "Keunggulan tampil sebagai chips ringkas.",
    },
    {
      value: "grid",
      label: "Grid",
      description: "Keunggulan tampil sebagai kartu-kartu kecil.",
    },
    {
      value: "spotlight",
      label: "Spotlight",
      description: "Keunggulan tampil sebagai daftar besar dengan nomor urut.",
    },
  ],
  catalog: [
    {
      value: "cards",
      label: "Cards",
      description: "Tampilan katalog dalam kartu visual.",
    },
    {
      value: "list",
      label: "List",
      description: "Tampilan katalog lebih rapat seperti daftar.",
    },
  ],
  gallery: [
    {
      value: "bento",
      label: "Bento",
      description: "Kolase editorial dengan komposisi visual besar.",
    },
    { value: "grid", label: "Grid", description: "Galeri rapi berbasis kisi." },
    {
      value: "showcase",
      label: "Showcase",
      description: "Satu visual utama besar dengan deretan thumbnail pendukung.",
    },
  ],
  testimonials: [
    {
      value: "cards",
      label: "Cards",
      description: "Testimoni tampil seimbang dalam grid dua kolom.",
    },
    {
      value: "spotlight",
      label: "Spotlight",
      description: "Satu testimoni utama ditonjolkan, sisanya jadi pendukung.",
    },
    {
      value: "ticker",
      label: "Ticker",
      description: "Testimoni tampil memanjang seperti quote strip editorial.",
    },
  ],
  faq: [
    {
      value: "accordion",
      label: "Accordion",
      description:
        "FAQ tampil bertingkat dengan ritme baca yang lebih editorial.",
    },
    {
      value: "cards",
      label: "Cards",
      description: "FAQ tampil sebagai kartu-kartu jawaban yang lebih ringkas.",
    },
    {
      value: "split",
      label: "Split",
      description: "FAQ dibagi dua kolom: daftar tanya dan jawaban yang lebih lapang.",
    },
  ],
  about: [
    {
      value: "split",
      label: "Split",
      description: "Cerita bisnis dengan ruang visual di samping.",
    },
    {
      value: "centered",
      label: "Centered",
      description: "Fokus penuh ke cerita bisnis di tengah.",
    },
  ],
  contact: [
    {
      value: "panel",
      label: "Panel",
      description: "Kontak tampil dalam panel informasi besar.",
    },
    {
      value: "split",
      label: "Split",
      description: "Kontak dan info operasi dibagi dua kolom.",
    },
  ],
  booking_form: [
    {
      value: "sticky_cta",
      label: "Sticky CTA",
      description: "Dorong customer ke aksi booking utama.",
    },
    {
      value: "inline_cta",
      label: "Inline CTA",
      description: "CTA lebih ringan dan menyatu dengan konten.",
    },
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
  const [page, setPage] = useState<LandingPageConfig>(
    DEFAULT_PAGE_BUILDER_CONFIG,
  );
  const [theme, setTheme] = useState<LandingThemeConfig>(DEFAULT_THEME_CONFIG);
  const [bookingForm, setBookingForm] = useState<BookingFormConfig>(
    DEFAULT_BOOKING_FORM_CONFIG,
  );
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [previewSource, setPreviewSource] = useState<"draft" | "live">("draft");
  const [workspaceMode, setWorkspaceMode] = useState<
    "content" | "structure" | "theme"
  >("content");
  const [previewKey, setPreviewKey] = useState(0);
  const [selectedSectionId, setSelectedSectionId] = useState("hero");
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(
    null,
  );
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const editDraftSnapshotRef = useRef<{
    panel: ContentPanelKey;
    snapshot: EditorDraftSnapshot;
  } | null>(null);
  const [activeContentPanel, setActiveContentPanel] =
    useState<ContentPanelKey>("identity");
  const [editingContentPanel, setEditingContentPanel] =
    useState<ContentPanelKey | null>(null);
  const [sectionsPanelOpen, setSectionsPanelOpen] = useState(true);
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSectionKey, setSavingSectionKey] = useState<string | null>(null);
  const [publishedSnapshot, setPublishedSnapshot] = useState("");
  const [lastPublishedAt, setLastPublishedAt] = useState<Date | null>(null);
  const isMobileStudio = useIsMobileStudio();
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
      const normalizedTheme = normalizeThemeConfig(
        data.theme,
        data.profile.primary_color,
      );
      const normalizedBookingForm = normalizeBookingFormConfig(
        data.booking_form,
      );
      setProfile(data.profile);
      setPage(normalizedPage);
      setTheme(normalizedTheme);
      setBookingForm(normalizedBookingForm);
      setPublishedSnapshot(
        buildPublishedSnapshot(
          data.profile,
          normalizedPage,
          normalizedTheme,
          normalizedBookingForm,
        ),
      );
      setLastPublishedAt(new Date());
      setPreviewUrl(data.preview_url);
      setResources(resourceRes.data?.resources || resourceRes.data || []);
      setSelectedSectionId(normalizedPage.sections[0]?.id || "hero");
      setExpandedSectionId(null);
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
    localStorage.setItem(
      `bookinaja:page-builder:draft:${profile.id}`,
      JSON.stringify(draft),
    );
    localStorage.setItem("bookinaja:page-builder:active-draft", profile.id);
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel(PREVIEW_CHANNEL);
      channel.postMessage({ tenantId: profile.id, draft });
      channel.close();
    }

    previewIframeRef.current?.contentWindow?.postMessage(
      {
        type: "bookinaja-page-builder-draft",
        draft,
      },
      window.location.origin,
    );
  }, [profile, resources, page, theme, bookingForm]);

  useEffect(() => {
    setPreviewKey((current) => current + 1);
  }, [previewMode]);

  const scrollPreviewToSelectedSection = useCallback(() => {
    const iframe = previewIframeRef.current;
    if (!iframe) return;
    const selected = page.sections.find(
      (section) => section.id === selectedSectionId,
    );
    if (!selected?.enabled) return;

    let attempts = 0;
    const maxAttempts = 10;
    const anchorId = getPreviewSectionAnchorId(selectedSectionId);

    const run = () => {
      attempts += 1;
      try {
        const target = iframe.contentWindow?.document.getElementById(anchorId);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      } catch {
        return;
      }

      if (attempts < maxAttempts) {
        window.setTimeout(run, 120);
      }
    };

    run();
  }, [page.sections, selectedSectionId]);

  useEffect(() => {
    scrollPreviewToSelectedSection();
  }, [selectedSectionId, scrollPreviewToSelectedSection]);

  const selectedSection = useMemo(
    () =>
      page.sections.find((section) => section.id === selectedSectionId) ||
      page.sections[0],
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
      const index = current.sections.findIndex(
        (section) => section.id === sectionId,
      );
      if (index === -1) return current;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.sections.length) return current;
      const sections = [...current.sections];
      const [section] = sections.splice(index, 1);
      sections.splice(nextIndex, 0, section);
      return { ...current, sections };
    });
  };

  const updateSectionProp = (
    sectionId: string,
    key: string,
    value: unknown,
  ) => {
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
    if (!profile) return;
    setEditingContentPanel((current) => {
      if (current === panel) {
        editDraftSnapshotRef.current = null;
        return null;
      }

      editDraftSnapshotRef.current = {
        panel,
        snapshot: createEditorDraftSnapshot(profile, page, theme, bookingForm),
      };
      return panel;
    });
  };

  const cancelContentEditMode = (panel: ContentPanelKey) => {
    const currentSnapshot = editDraftSnapshotRef.current;
    if (currentSnapshot?.panel === panel) {
      restoreEditorDraftSnapshot(currentSnapshot.snapshot, {
        setProfile,
        setPage,
        setTheme,
        setBookingForm,
      });
    }
    editDraftSnapshotRef.current = null;
    setEditingContentPanel((current) => (current === panel ? null : current));
    setPreviewKey((current) => current + 1);
  };

  const updateProfileArrayItem = (
    key: "features" | "gallery",
    index: number,
    value: string,
  ) => {
    setProfile((current) => {
      if (!current) return current;
      const items = Array.isArray(current[key])
        ? [...(current[key] as string[])]
        : [];
      items[index] = value;
      return { ...current, [key]: items };
    });
  };

  const addProfileArrayItem = (key: "features" | "gallery", value: string) => {
    setProfile((current) => {
      if (!current) return current;
      const items = Array.isArray(current[key])
        ? [...(current[key] as string[])]
        : [];
      items.push(value);
      return { ...current, [key]: items };
    });
  };

  const removeProfileArrayItem = (
    key: "features" | "gallery",
    index: number,
  ) => {
    setProfile((current) => {
      if (!current) return current;
      const items = Array.isArray(current[key])
        ? [...(current[key] as string[])]
        : [];
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
    sectionKey: ContentPanelKey;
    successMessage: string;
    profilePatch?: Partial<BuilderProfile>;
    bookingFormPatch?: Partial<BookingFormConfig>;
    persistBuilder?: boolean;
  }) => {
    if (!profile) return;

    const nextProfile = profilePatch
      ? { ...profile, ...profilePatch }
      : profile;
    const nextBookingForm = bookingFormPatch
      ? { ...bookingForm, ...bookingFormPatch }
      : bookingForm;

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
          const normalizedBookingForm = normalizeBookingFormConfig(
            data.booking_form,
          );
          setBookingForm(normalizedBookingForm);
        } else {
          setBookingForm(nextBookingForm);
        }
      }

      editDraftSnapshotRef.current = null;
      setEditingContentPanel((current) =>
        current === sectionKey ? null : current,
      );
      setPreviewSource("draft");
      setPreviewKey((current) => current + 1);
      toast.success(
        `${successMessage} Draft tersimpan dan belum dipublish ke live.`,
      );
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
        const normalizedTheme = normalizeThemeConfig(
          data.theme,
          mergedProfile.primary_color,
        );
        const normalizedBookingForm = normalizeBookingFormConfig(
          data.booking_form,
        );
        setProfile(mergedProfile);
        setPage(normalizedPage);
        setTheme(normalizedTheme);
        setBookingForm(normalizedBookingForm);
        setPublishedSnapshot(
          buildPublishedSnapshot(
            mergedProfile,
            normalizedPage,
            normalizedTheme,
            normalizedBookingForm,
          ),
        );
        setLastPublishedAt(new Date());
      } else {
        setProfile(nextProfile);
        setPublishedSnapshot(
          buildPublishedSnapshot(nextProfile, page, theme, bookingForm),
        );
        setLastPublishedAt(new Date());
      }
      setPreviewKey((current) => current + 1);
      toast.success("Halaman live berhasil diperbarui");
    } catch {
      toast.error("Gagal menyimpan page builder");
    } finally {
      setSaving(false);
    }
  };

  const resetDraftToPublished = () => {
    void fetchBuilder();
    editDraftSnapshotRef.current = null;
    setEditingContentPanel(null);
    setPreviewSource("live");
    toast.success("Draft editor dikembalikan ke versi live terbaru");
  };

  const lastPublishedLabel = useMemo(() => {
    if (!lastPublishedAt) return "";
    return lastPublishedAt.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [lastPublishedAt]);

  if (loading || !profile) {
    return <PageBuilderSkeleton />;
  }

  if (isMobileStudio) {
    return (
      <MobilePageBuilderExperience
        previewSource={previewSource}
        previewUrl={previewUrl}
        saving={saving}
        hasUnpublishedChanges={hasUnpublishedChanges}
        activeCount={activeCount}
        selectedSectionLabel={selectedSection?.label}
        themeLabel={
          THEME_PRESETS.find((preset) => preset.id === theme.preset)?.label ||
          "Bookinaja"
        }
        lastPublishedLabel={lastPublishedLabel}
        previewKey={previewKey}
        iframeRef={previewIframeRef}
        onPreviewSourceChange={setPreviewSource}
        onRefresh={() => void fetchBuilder()}
        onPublish={() => void onSave()}
        onResetDraft={resetDraftToPublished}
      />
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <PageBuilderStudioHeader
        hasUnpublishedChanges={hasUnpublishedChanges}
        previewSource={previewSource}
        previewUrl={previewUrl}
        saving={saving}
        lastPublishedLabel={lastPublishedLabel}
        onRefresh={() => void fetchBuilder()}
        onPublish={() => void onSave()}
        onResetDraft={resetDraftToPublished}
      />

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="rounded-[1.75rem] border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-3 shadow-sm dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(10,15,28,0.96))]">
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
              onToggleTestimonialsEdit={() =>
                toggleContentEditMode("testimonials")
              }
              onToggleFaq={() => toggleContentPanel("faq")}
              onToggleFaqEdit={() => toggleContentEditMode("faq")}
              onToggleContact={() => toggleContentPanel("contact")}
              onToggleContactEdit={() => toggleContentEditMode("contact")}
              onToggleBooking={() => toggleContentPanel("booking")}
              onToggleBookingEdit={() => toggleContentEditMode("booking")}
              onCancelEdit={cancelContentEditMode}
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
              description={`${activeCount} aktif • variant langsung di card`}
              open={sectionsPanelOpen}
              onToggle={() => setSectionsPanelOpen((current) => !current)}
            >
              <BuilderSectionList
                sections={page.sections}
                expandedSectionId={expandedSectionId}
                onSelect={setSelectedSectionId}
                onExpand={setExpandedSectionId}
                onToggle={(section) =>
                  updateSection(section.id, { enabled: !section.enabled })
                }
                onMove={moveSection}
                onVariantChange={(sectionId, variant) =>
                  updateSection(sectionId, { variant })
                }
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
              <Card className="rounded-[1.75rem] border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 shadow-sm dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(8,12,24,0.98))]">
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
                          <div className="text-sm font-semibold text-slate-950 dark:text-white">
                            {preset.label}
                          </div>
                          <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                            {preset.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Field label="Warna utama">
                    <div className="flex gap-2">
                      <Input
                        value={theme.primary_color}
                        onChange={(event) =>
                          setTheme((current) => ({
                            ...current,
                            primary_color: event.target.value,
                          }))
                        }
                        className="font-mono"
                      />
                      <label className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10">
                        <input
                          type="color"
                          value={theme.primary_color}
                          onChange={(event) =>
                            setTheme((current) => ({
                              ...current,
                              primary_color: event.target.value,
                            }))
                          }
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                        <span
                          className="h-7 w-7 rounded-xl"
                          style={{ backgroundColor: theme.primary_color }}
                        />
                      </label>
                    </div>
                  </Field>

                  <Field label="Warna aksen">
                    <div className="flex gap-2">
                      <Input
                        value={theme.accent_color}
                        onChange={(event) =>
                          setTheme((current) => ({
                            ...current,
                            accent_color: event.target.value,
                          }))
                        }
                        className="font-mono"
                      />
                      <label className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10">
                        <input
                          type="color"
                          value={theme.accent_color}
                          onChange={(event) =>
                            setTheme((current) => ({
                              ...current,
                              accent_color: event.target.value,
                            }))
                          }
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                        <span
                          className="h-7 w-7 rounded-xl"
                          style={{ backgroundColor: theme.accent_color }}
                        />
                      </label>
                    </div>
                  </Field>

                  <div className="grid gap-4">
                    <ChoiceChips
                      label="Surface"
                      value={theme.surface_style}
                      options={[...SURFACE_STYLES]}
                      onChange={(value) =>
                        setTheme((current) => ({
                          ...current,
                          surface_style: value,
                        }))
                      }
                    />
                    <ChoiceChips
                      label="Font vibe"
                      value={theme.font_style}
                      options={[...FONT_STYLES]}
                      onChange={(value) =>
                        setTheme((current) => ({
                          ...current,
                          font_style: value,
                        }))
                      }
                    />
                    <ChoiceChips
                      label="Radius"
                      value={theme.radius_style}
                      options={[...RADIUS_STYLES]}
                      onChange={(value) =>
                        setTheme((current) => ({
                          ...current,
                          radius_style: value,
                        }))
                      }
                    />
                  </div>
                </div>
              </Card>
            </CollapsibleSidebarCard>
          ) : null}
        </aside>

        <section className="space-y-4 xl:sticky xl:top-6 xl:h-[calc(100vh-2rem)]">
          <Card className="overflow-hidden rounded-[2rem] border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(8,12,24,0.98))] dark:shadow-[0_24px_60px_rgba(2,6,23,0.42)]">
            <PageBuilderPreviewToolbar
              activeCount={activeCount}
              previewMode={previewMode}
              previewSource={previewSource}
              selectedSectionLabel={selectedSection?.label}
              hasUnpublishedChanges={hasUnpublishedChanges}
              onPreviewSourceChange={setPreviewSource}
              onPreviewModeChange={setPreviewMode}
            />

            <div className="min-h-[820px] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_32%),linear-gradient(180deg,rgba(241,245,249,0.92),rgba(248,250,252,1))] p-3 dark:bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.12),transparent_25%),linear-gradient(180deg,rgba(10,15,28,0.98),rgba(5,5,10,1))] md:p-6 xl:h-[calc(100vh-11rem)]">
              {previewMode === "desktop" ? (
                <DesktopPreviewFrame>
                  <PreviewIframe
                    mode="desktop"
                    source={previewSource}
                    previewKey={previewKey}
                    iframeRef={previewIframeRef}
                    onLoad={scrollPreviewToSelectedSection}
                  />
                </DesktopPreviewFrame>
              ) : (
                <MobilePreviewFrame>
                  <PreviewIframe
                    mode="mobile"
                    source={previewSource}
                    previewKey={previewKey}
                    iframeRef={previewIframeRef}
                    onLoad={scrollPreviewToSelectedSection}
                  />
                </MobilePreviewFrame>
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}

function BuilderSectionList({
  sections,
  expandedSectionId,
  onSelect,
  onExpand,
  onToggle,
  onMove,
  onVariantChange,
}: {
  sections: BuilderSection[];
  expandedSectionId: string | null;
  onSelect: (sectionId: string) => void;
  onExpand: React.Dispatch<React.SetStateAction<string | null>>;
  onToggle: (section: BuilderSection) => void;
  onMove: (sectionId: string, direction: "up" | "down") => void;
  onVariantChange: (sectionId: string, variant: string) => void;
}) {
  return (
    <Card className="rounded-[1.75rem] border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-3 shadow-sm dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(8,12,24,0.98))]">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
        <LayoutTemplate className="h-4 w-4" />
        Sections
      </div>
      <div className="mt-3 space-y-2">
        {sections.map((section, index) => {
          const variantOptions = SECTION_VARIANTS[section.type] || [];
          const activeVariant =
            section.variant || variantOptions[0]?.value || "";
          const expanded = expandedSectionId === section.id;
          return (
            <div
              key={section.id}
              className={cn(
                "rounded-[1.25rem] border px-3 py-2.5 transition-[background-color,border-color,box-shadow,color] duration-200",
                expanded
                  ? "border-[var(--bookinaja-500)] bg-[linear-gradient(180deg,var(--bookinaja-50),rgba(219,234,254,0.55))] shadow-sm dark:border-[rgba(96,165,250,0.34)] dark:bg-[linear-gradient(180deg,rgba(29,78,216,0.34),rgba(15,23,42,0.9))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  : "border-slate-200 bg-white/85 dark:border-white/10 dark:bg-white/[0.04]",
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onSelect(section.id);
                    onExpand((current) =>
                      current === section.id ? null : section.id,
                    );
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="text-[15px] font-semibold text-slate-950 dark:text-white">
                    {section.label}
                  </div>
                  <div className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    {section.type}
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onToggle(section)}
                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    {section.enabled ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(section.id, "up")}
                    disabled={index === 0}
                    className="rounded-lg border border-transparent p-1.5 text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:border-white/10 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label={`Naikkan urutan ${section.label}`}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(section.id, "down")}
                    disabled={index === sections.length - 1}
                    className="rounded-lg border border-transparent p-1.5 text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:border-white/10 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label={`Turunkan urutan ${section.label}`}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(section.id);
                      onExpand((current) =>
                        current === section.id ? null : section.id,
                      );
                    }}
                    className={cn(
                      "rounded-xl border px-2 py-1.5 text-slate-500 transition-colors dark:text-slate-300",
                      expanded
                        ? "border-[var(--bookinaja-500)] bg-white text-[var(--bookinaja-700)] shadow-sm dark:border-[rgba(96,165,250,0.34)] dark:bg-[#050505] dark:text-white"
                        : "border-slate-200 bg-white/80 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/10 dark:hover:text-white",
                    )}
                    aria-label={
                      expanded
                        ? `Tutup opsi tampilan ${section.label}`
                        : `Buka opsi tampilan ${section.label}`
                    }
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {expanded && variantOptions.length ? (
                <div className="mt-3 grid gap-2">
                  {variantOptions.map((option) => {
                    const active = activeVariant === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onSelect(section.id);
                          onExpand(section.id);
                          onVariantChange(section.id, option.value);
                        }}
                        className={cn(
                          "rounded-[1rem] border px-3 py-2.5 text-left transition-colors",
                          active
                            ? "border-[var(--bookinaja-500)] bg-white shadow-sm dark:border-[rgba(96,165,250,0.34)] dark:bg-[#050505]"
                            : "border-slate-200/90 bg-white/70 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]",
                        )}
                      >
                        <div className="text-[13px] font-semibold text-slate-950 dark:text-white">
                          {option.label}
                        </div>
                        <div className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                          {option.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {expanded && !variantOptions.length ? (
                <div className="mt-3 rounded-[1rem] border border-dashed border-slate-200 bg-white/65 px-3 py-2.5 text-[11px] leading-5 text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                  Section ini belum punya variant khusus. Mode tampilannya masih
                  satu yang paling stabil.
                </div>
              ) : null}
            </div>
          );
        })}
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
          ? "border-[var(--bookinaja-500)] bg-[linear-gradient(180deg,var(--bookinaja-50),rgba(219,234,254,0.65))] text-[var(--bookinaja-700)] shadow-sm dark:border-[rgba(96,165,250,0.34)] dark:bg-[linear-gradient(180deg,rgba(29,78,216,0.38),rgba(15,23,42,0.92))] dark:text-white"
          : "border-slate-200 bg-white/85 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.06]",
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
  onCancelEdit,
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
  onProfileArrayItemChange: (
    key: "features" | "gallery",
    index: number,
    value: string,
  ) => void;
  onAddProfileArrayItem: (key: "features" | "gallery", value: string) => void;
  onRemoveProfileArrayItem: (
    key: "features" | "gallery",
    index: number,
  ) => void;
  onBookingFormChange: React.Dispatch<React.SetStateAction<BookingFormConfig>>;
  onSectionChange: (sectionId: string, patch: Partial<BuilderSection>) => void;
  onSectionPropChange: (sectionId: string, key: string, value: unknown) => void;
  onSaveSection: (input: {
    sectionKey: ContentPanelKey;
    successMessage: string;
    profilePatch?: Partial<BuilderProfile>;
    bookingFormPatch?: Partial<BookingFormConfig>;
    persistBuilder?: boolean;
  }) => Promise<void>;
  onCancelEdit: (panel: ContentPanelKey) => void;
}) {
  return (
    <div className="space-y-4">
      <CollapsibleSidebarCard
        icon={<BriefcaseBusiness className="h-4 w-4" />}
        title="Identitas & Hero"
        description="Nama bisnis, badge, headline hero, deskripsi utama"
        open={identityPanelOpen}
        onToggle={onToggleIdentity}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset
            disabled={!identityPanelEditing}
            className="space-y-4 disabled:opacity-100"
          >
            <Field label="Nama bisnis">
              <Input
                value={profile.name || ""}
                onChange={(event) =>
                  onProfilePatch({ name: event.target.value })
                }
              />
            </Field>
            <Field label="Slogan badge">
              <Input
                value={profile.slogan || ""}
                onChange={(event) =>
                  onProfilePatch({ slogan: event.target.value })
                }
              />
            </Field>
            <Field label="Tagline utama">
              <Input
                value={profile.tagline || ""}
                onChange={(event) =>
                  onProfilePatch({ tagline: event.target.value })
                }
              />
            </Field>
            <Field label="Deskripsi hero">
              <Textarea
                value={String(heroSection?.props?.description || "")}
                onChange={(event) =>
                  heroSection &&
                  onSectionPropChange(
                    heroSection.id,
                    "description",
                    event.target.value,
                  )
                }
                className="min-h-24"
                placeholder="Copy singkat yang tampil di hero"
              />
            </Field>
          </fieldset>
          <SectionActionButton
            editing={identityPanelEditing}
            saving={savingSectionKey === "identity"}
            onEdit={onToggleIdentityEdit}
            onCancel={() => onCancelEdit("identity")}
            onSave={() =>
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
        </Card>
      </CollapsibleSidebarCard>

      <CollapsibleSidebarCard
        icon={<Type className="h-4 w-4" />}
        title="Keunggulan"
        description="Judul section dan poin jual utama"
        open={storyPanelOpen}
        onToggle={onToggleStory}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset
            disabled={!storyPanelEditing}
            className="space-y-4 disabled:opacity-100"
          >
            <Field label="Judul section keunggulan">
              <Input
                value={String(
                  highlightsSection?.props?.title || "Keunggulan utama",
                )}
                onChange={(event) =>
                  highlightsSection &&
                  onSectionPropChange(
                    highlightsSection.id,
                    "title",
                    event.target.value,
                  )
                }
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
                    onChange={(event) =>
                      onProfileArrayItemChange(
                        "features",
                        index,
                        event.target.value,
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => onRemoveProfileArrayItem("features", index)}
                  >
                    Hapus
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  onAddProfileArrayItem("features", "Keunggulan baru")
                }
              >
                Tambah poin
              </Button>
            </div>
          </fieldset>
          <SectionActionButton
            editing={storyPanelEditing}
            saving={savingSectionKey === "story"}
            onEdit={onToggleStoryEdit}
            onCancel={() => onCancelEdit("story")}
            onSave={() =>
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
        </Card>
      </CollapsibleSidebarCard>

      <CollapsibleSidebarCard
        icon={<LayoutTemplate className="h-4 w-4" />}
        title="Katalog"
        description="Heading katalog dan ajakan masuk ke daftar layanan"
        open={catalogPanelOpen}
        onToggle={onToggleCatalog}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset
            disabled={!catalogPanelEditing}
            className="space-y-4 disabled:opacity-100"
          >
            <Field label="Judul section katalog">
              <Input
                value={String(catalogSection?.props?.title || "Pilih layanan")}
                onChange={(event) =>
                  catalogSection &&
                  onSectionPropChange(
                    catalogSection.id,
                    "title",
                    event.target.value,
                  )
                }
              />
            </Field>
            <Field label="Deskripsi katalog">
              <Textarea
                value={String(catalogSection?.props?.description || "")}
                onChange={(event) =>
                  catalogSection &&
                  onSectionPropChange(
                    catalogSection.id,
                    "description",
                    event.target.value,
                  )
                }
                className="min-h-24"
                placeholder="Jelaskan apa yang customer akan lihat di katalog."
              />
            </Field>
            <Field label="Label CTA utama">
              <Input
                value={bookingForm.cta_button_label}
                onChange={(event) =>
                  onBookingFormChange((current) => ({
                    ...current,
                    cta_button_label: event.target.value,
                  }))
                }
              />
            </Field>
          </fieldset>
          <SectionActionButton
            editing={catalogPanelEditing}
            saving={savingSectionKey === "catalog"}
            onEdit={onToggleCatalogEdit}
            onCancel={() => onCancelEdit("catalog")}
            onSave={() =>
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
        </Card>
      </CollapsibleSidebarCard>

      <CollapsibleSidebarCard
        icon={<Type className="h-4 w-4" />}
        title="Tentang Bisnis"
        description="Judul, narasi, dan foto pendukung section tentang bisnis"
        open={aboutPanelOpen}
        onToggle={onToggleAbout}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset
            disabled={!aboutPanelEditing}
            className="space-y-4 disabled:opacity-100"
          >
            <Field label="Judul section tentang bisnis">
              <Input
                value={String(aboutSection?.props?.title || "")}
                onChange={(event) =>
                  aboutSection &&
                  onSectionPropChange(
                    aboutSection.id,
                    "title",
                    event.target.value,
                  )
                }
                placeholder={`Tentang ${profile.name || "bisnis ini"}`}
              />
            </Field>
            <Field label="Isi cerita bisnis">
              <Textarea
                value={String(aboutSection?.props?.description || "")}
                onChange={(event) =>
                  aboutSection &&
                  onSectionPropChange(
                    aboutSection.id,
                    "description",
                    event.target.value,
                  )
                }
                className="min-h-32"
                placeholder="Ceritakan bisnis, suasana, dan alasan customer memilih kamu."
              />
            </Field>
            <LandingStudioSingleUpload
              label="Foto tentang bisnis"
              value={String(aboutSection?.props?.image_url || "")}
              onChange={(url) =>
                aboutSection &&
                onSectionPropChange(aboutSection.id, "image_url", url)
              }
              aspect="video"
            />
          </fieldset>
          <SectionActionButton
            editing={aboutPanelEditing}
            saving={savingSectionKey === "about"}
            onEdit={onToggleAboutEdit}
            onCancel={() => onCancelEdit("about")}
            onSave={() =>
              onSaveSection({
                sectionKey: "about",
                successMessage: "Section tentang bisnis diperbarui",
                persistBuilder: true,
              })
            }
          />
        </Card>
      </CollapsibleSidebarCard>

      <CollapsibleSidebarCard
        icon={<ImageIcon className="h-4 w-4" />}
        title="Media Landing"
        description="Logo, banner, foto, dan identitas visual galeri"
        open={mediaPanelOpen}
        onToggle={onToggleMedia}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset
            disabled={!mediaPanelEditing}
            className="space-y-4 disabled:opacity-100"
          >
            <Field label="Eyebrow galeri">
              <Input
                value={String(
                  gallerySection?.props?.eyebrow || "Visual Experience",
                )}
                onChange={(event) =>
                  gallerySection &&
                  onSectionPropChange(
                    gallerySection.id,
                    "eyebrow",
                    event.target.value,
                  )
                }
              />
            </Field>
            <Field label="Judul section galeri">
              <Input
                value={String(
                  gallerySection?.props?.title || "Inside The Hub.",
                )}
                onChange={(event) =>
                  gallerySection &&
                  onSectionPropChange(
                    gallerySection.id,
                    "title",
                    event.target.value,
                  )
                }
              />
            </Field>
            <Field label="Deskripsi galeri">
              <Textarea
                value={String(gallerySection?.props?.description || "")}
                onChange={(event) =>
                  gallerySection &&
                  onSectionPropChange(
                    gallerySection.id,
                    "description",
                    event.target.value,
                  )
                }
                className="min-h-24"
              />
            </Field>
            <div className="grid gap-3">
              <LandingStudioSingleUpload
                label="Logo bisnis"
                value={profile.logo_url || ""}
                onChange={(url) => onProfilePatch({ logo_url: url })}
                aspect="square"
                uploadTitle="Upload logo"
                helperText="Klik atau drop logo"
              />
              <LandingStudioSingleUpload
                label="Banner / hero"
                value={profile.banner_url || ""}
                onChange={(url) => onProfilePatch({ banner_url: url })}
                aspect="video"
                uploadTitle="Upload banner"
                helperText="Klik atau drop banner"
              />
            </div>
            <LandingStudioGalleryUpload
              values={profile.gallery || []}
              onChange={(gallery) => onProfilePatch({ gallery })}
            />
          </fieldset>
          <SectionActionButton
            editing={mediaPanelEditing}
            saving={savingSectionKey === "media"}
            onEdit={onToggleMediaEdit}
            onCancel={() => onCancelEdit("media")}
            onSave={() =>
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
        </Card>
      </CollapsibleSidebarCard>

      <CollapsibleSidebarCard
        icon={<Type className="h-4 w-4" />}
        title="Testimoni"
        description="Judul section dan kutipan pelanggan"
        open={testimonialsPanelOpen}
        onToggle={onToggleTestimonials}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset
            disabled={!testimonialsPanelEditing}
            className="space-y-4 disabled:opacity-100"
          >
            <SectionStateToggle
              enabled={Boolean(testimonialsSection?.enabled)}
              onToggle={() =>
                testimonialsSection &&
                onSectionChange(testimonialsSection.id, {
                  enabled: !testimonialsSection.enabled,
                })
              }
            />
            <Field label="Judul section testimoni">
              <Input
                value={String(
                  testimonialsSection?.props?.title || "Kata pelanggan",
                )}
                onChange={(event) =>
                  testimonialsSection &&
                  onSectionPropChange(
                    testimonialsSection.id,
                    "title",
                    event.target.value,
                  )
                }
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
                  readObjectArray(testimonialsSection?.props?.items).map(
                    (item, itemIndex) =>
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
                  readObjectArray(testimonialsSection?.props?.items).filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                )
              }
            />
          </fieldset>
          <SectionActionButton
            editing={testimonialsPanelEditing}
            saving={savingSectionKey === "testimonials"}
            onEdit={onToggleTestimonialsEdit}
            onCancel={() => onCancelEdit("testimonials")}
            onSave={() =>
              onSaveSection({
                sectionKey: "testimonials",
                successMessage: "Section testimoni diperbarui",
                persistBuilder: true,
              })
            }
          />
        </Card>
      </CollapsibleSidebarCard>

      <CollapsibleSidebarCard
        icon={<Type className="h-4 w-4" />}
        title="FAQ"
        description="Pertanyaan penting sebelum customer booking"
        open={faqPanelOpen}
        onToggle={onToggleFaq}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset
            disabled={!faqPanelEditing}
            className="space-y-4 disabled:opacity-100"
          >
            <SectionStateToggle
              enabled={Boolean(faqSection?.enabled)}
              onToggle={() =>
                faqSection &&
                onSectionChange(faqSection.id, { enabled: !faqSection.enabled })
              }
            />
            <Field label="Judul section FAQ">
              <Input
                value={String(
                  faqSection?.props?.title || "Pertanyaan yang sering muncul",
                )}
                onChange={(event) =>
                  faqSection &&
                  onSectionPropChange(
                    faqSection.id,
                    "title",
                    event.target.value,
                  )
                }
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
                  readObjectArray(faqSection?.props?.items).map(
                    (item, itemIndex) =>
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
                  readObjectArray(faqSection?.props?.items).filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                )
              }
            />
          </fieldset>
          <SectionActionButton
            editing={faqPanelEditing}
            saving={savingSectionKey === "faq"}
            onEdit={onToggleFaqEdit}
            onCancel={() => onCancelEdit("faq")}
            onSave={() =>
              onSaveSection({
                sectionKey: "faq",
                successMessage: "Section FAQ diperbarui",
                persistBuilder: true,
              })
            }
          />
        </Card>
      </CollapsibleSidebarCard>

      <CollapsibleSidebarCard
        icon={<Phone className="h-4 w-4" />}
        title="Kontak & Operasional"
        description="Alamat, jam buka, WhatsApp"
        open={contactPanelOpen}
        onToggle={onToggleContact}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset
            disabled={!contactPanelEditing}
            className="space-y-4 disabled:opacity-100"
          >
            <Field label="Judul section kontak">
              <Input
                value={String(contactSection?.props?.title || "Hubungi bisnis")}
                onChange={(event) =>
                  contactSection &&
                  onSectionPropChange(
                    contactSection.id,
                    "title",
                    event.target.value,
                  )
                }
              />
            </Field>
            <Field label="Deskripsi section kontak">
              <Textarea
                value={String(contactSection?.props?.description || "")}
                onChange={(event) =>
                  contactSection &&
                  onSectionPropChange(
                    contactSection.id,
                    "description",
                    event.target.value,
                  )
                }
                className="min-h-24"
              />
            </Field>
            <Field label="Alamat">
              <Textarea
                value={profile.address || ""}
                onChange={(event) =>
                  onProfilePatch({ address: event.target.value })
                }
                className="min-h-24"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Jam buka">
                <Input
                  value={profile.open_time || ""}
                  onChange={(event) =>
                    onProfilePatch({ open_time: event.target.value })
                  }
                />
              </Field>
              <Field label="Jam tutup">
                <Input
                  value={profile.close_time || ""}
                  onChange={(event) =>
                    onProfilePatch({ close_time: event.target.value })
                  }
                />
              </Field>
              <Field label="Timezone">
                <Input
                  value={profile.timezone || "Asia/Jakarta"}
                  onChange={(event) =>
                    onProfilePatch({ timezone: event.target.value })
                  }
                  placeholder="Asia/Jakarta"
                />
              </Field>
            </div>
            <Field label="Nomor WhatsApp">
              <Input
                value={profile.whatsapp_number || ""}
                onChange={(event) =>
                  onProfilePatch({ whatsapp_number: event.target.value })
                }
              />
            </Field>
          </fieldset>
          <SectionActionButton
            editing={contactPanelEditing}
            saving={savingSectionKey === "contact"}
            onEdit={onToggleContactEdit}
            onCancel={() => onCancelEdit("contact")}
            onSave={() =>
              onSaveSection({
                sectionKey: "contact",
                successMessage: "Kontak bisnis diperbarui",
                profilePatch: {
                  address: profile.address,
                  open_time: profile.open_time,
                  close_time: profile.close_time,
                  timezone: profile.timezone,
                  whatsapp_number: profile.whatsapp_number,
                },
                persistBuilder: true,
              })
            }
          />
        </Card>
      </CollapsibleSidebarCard>

      <CollapsibleSidebarCard
        icon={<Phone className="h-4 w-4" />}
        title="Booking & Bantuan"
        description="Copy section booking, CTA, dan bantuan WhatsApp"
        open={bookingPanelOpen}
        onToggle={onToggleBooking}
      >
        <Card className="rounded-[1.75rem] border-slate-200 bg-white p-4 shadow-sm dark:border-white/15 dark:bg-[#0f0f17]">
          <fieldset
            disabled={!bookingPanelEditing}
            className="space-y-4 disabled:opacity-100"
          >
            <Field label="Judul section booking">
              <Input
                value={String(
                  bookingFormSection?.props?.title ||
                    "Arahkan customer ke booking",
                )}
                onChange={(event) =>
                  bookingFormSection &&
                  onSectionPropChange(
                    bookingFormSection.id,
                    "title",
                    event.target.value,
                  )
                }
              />
            </Field>
            <Field label="Deskripsi section booking">
              <Textarea
                value={String(bookingFormSection?.props?.description || "")}
                onChange={(event) =>
                  bookingFormSection &&
                  onSectionPropChange(
                    bookingFormSection.id,
                    "description",
                    event.target.value,
                  )
                }
                className="min-h-24"
              />
            </Field>
            <Field label="Label tombol booking">
              <Input
                value={bookingForm.cta_button_label}
                onChange={(event) =>
                  onBookingFormChange((current) => ({
                    ...current,
                    cta_button_label: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Label bantuan WhatsApp">
              <Input
                value={bookingForm.whatsapp_label}
                onChange={(event) =>
                  onBookingFormChange((current) => ({
                    ...current,
                    whatsapp_label: event.target.value,
                  }))
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
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  Bantuan WhatsApp
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {bookingForm.show_whatsapp_help
                    ? "Ditampilkan di preview"
                    : "Disembunyikan dari preview"}
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
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  Sticky mobile CTA
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {bookingForm.sticky_mobile_cta
                    ? "Aktif untuk landing mobile"
                    : "Nonaktif"}
                </div>
              </button>
            </div>
          </fieldset>
          <SectionActionButton
            editing={bookingPanelEditing}
            saving={savingSectionKey === "booking"}
            onEdit={onToggleBookingEdit}
            onCancel={() => onCancelEdit("booking")}
            onSave={() =>
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
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition-colors hover:bg-slate-50 dark:border-white/15 dark:bg-[#0f0f17] dark:hover:bg-white/[0.04] sm:rounded-[1.4rem]">
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
              <div className="mt-1 hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">
                {description}
              </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-1.5 text-slate-500 dark:border-white/10 dark:text-slate-300">
            {open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        </button>
      </div>

      {open ? children : null}
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
        <div className="h-[min(980px,calc(100vh-14rem))] min-h-[820px] overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function MobilePreviewFrame({
  children,
  scaleMode = "native",
}: {
  children: React.ReactNode;
  scaleMode?: "native" | "fit";
}) {
  const basePhoneWidth = 400;
  const basePhoneHeight = 720;
  const fitScale = 0.7;
  const mobileFitScale = 0.83;

  const phoneShell = (
    <div
      className="relative mx-auto overflow-hidden rounded-[2.35rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-[#050505]"
      style={{ width: `${basePhoneWidth}px` }}
    >
      <div className="absolute left-1/2 top-2.5 z-20 h-6 w-28 -translate-x-1/2 rounded-full bg-[#0c1426]" />
      <div
        className="overflow-auto"
        style={{ height: `${basePhoneHeight}px` }}
      >
        {children}
      </div>
    </div>
  );

  if (scaleMode === "fit") {
    return (
      <div className="flex min-h-[720px] items-center justify-center px-2 sm:px-4">
        <div className="rounded-[2.75rem] bg-[#0c1426] p-2.5 shadow-[0_30px_100px_rgba(15,23,42,0.32)]">
          <div
            className="overflow-hidden sm:h-[820px] sm:w-[470px]"
            style={{
              width: `${Math.round(basePhoneWidth * mobileFitScale)}px`,
              height: `${Math.round(basePhoneHeight * mobileFitScale)}px`,
            }}
          >
            <div
              className="origin-top-left sm:hidden"
              style={{
                width: `${basePhoneWidth}px`,
                transform: `scale(${mobileFitScale})`,
              }}
            >
              {phoneShell}
            </div>
            <div
              className="hidden origin-top-left sm:block"
              style={{
                width: `${basePhoneWidth}px`,
                transform: `scale(${fitScale})`,
              }}
            >
              {phoneShell}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[720px] items-center justify-center px-2 sm:px-4">
      <div className="rounded-[2.75rem] bg-[#0c1426] p-2.5 shadow-[0_30px_100px_rgba(15,23,42,0.32)]">
        {phoneShell}
      </div>
    </div>
  );
}

function PreviewIframe({
  mode,
  source,
  previewKey,
  iframeRef,
  onLoad,
}: {
  mode: "desktop" | "mobile";
  source: "draft" | "live";
  previewKey: number;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  onLoad?: () => void;
}) {
  return (
    <iframe
      key={`${source}-${mode}-${previewKey}`}
      ref={iframeRef}
      src={
        source === "draft"
          ? `/preview/page-builder?mode=${mode}`
          : `/preview/page-builder-live?mode=${mode}`
      }
      title={`Preview ${mode}`}
      onLoad={onLoad}
      className="h-full w-full border-0 bg-white"
    />
  );
}

function getPreviewSectionAnchorId(sectionId: string) {
  return `landing-section-${sectionId}`;
}

function useIsMobileStudio() {
  const [isMobileStudio, setIsMobileStudio] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const handleChange = () => setIsMobileStudio(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMobileStudio;
}

function MobilePageBuilderExperience({
  previewSource,
  previewUrl,
  saving,
  hasUnpublishedChanges,
  activeCount,
  selectedSectionLabel,
  themeLabel,
  lastPublishedLabel,
  previewKey,
  iframeRef,
  onPreviewSourceChange,
  onRefresh,
  onPublish,
  onResetDraft,
}: {
  previewSource: "draft" | "live";
  previewUrl?: string;
  saving: boolean;
  hasUnpublishedChanges: boolean;
  activeCount: number;
  selectedSectionLabel?: string;
  themeLabel: string;
  lastPublishedLabel?: string;
  previewKey: number;
  iframeRef: { current: HTMLIFrameElement | null };
  onPreviewSourceChange: (value: "draft" | "live") => void;
  onRefresh: () => void;
  onPublish: () => void;
  onResetDraft: () => void;
}) {
  return (
    <div className="space-y-4 pb-16">
      <Card className="overflow-hidden rounded-[1.35rem] border-slate-200/90 bg-[linear-gradient(180deg,#ffffff,rgba(241,252,250,0.96))] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)] dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(10,24,26,0.96),rgba(8,12,24,0.98))] dark:shadow-[0_18px_42px_rgba(2,6,23,0.34)] sm:rounded-[2rem] sm:p-5 sm:shadow-[0_22px_60px_rgba(15,23,42,0.08)] dark:sm:shadow-[0_22px_60px_rgba(2,6,23,0.42)]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--bookinaja-200)] bg-[var(--bookinaja-50)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--bookinaja-700)] shadow-sm dark:border-[rgba(96,165,250,0.24)] dark:bg-[rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-100)]">
            <Wand2 className="h-3.5 w-3.5" />
            Mobile
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Review mobile
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <MobileStatusPill
              tone={hasUnpublishedChanges ? "warning" : "success"}
              label={
                hasUnpublishedChanges ? "Draft berubah" : "Sinkron"
              }
            />
            <MobileStatusPill tone="neutral" label={`Theme: ${themeLabel}`} />
            <MobileStatusPill
              tone="neutral"
              label={`${activeCount} section aktif`}
            />
            {lastPublishedLabel ? (
              <MobileStatusPill
                tone="neutral"
                label={`Published ${lastPublishedLabel}`}
                compact
              />
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="rounded-[1.35rem] border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 shadow-sm dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(8,12,24,0.98))] sm:rounded-[1.75rem]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
              Preview Source
            </div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {selectedSectionLabel ? `Section: ${selectedSectionLabel}` : "Draft / live"}
            </div>
          </div>
          <MobileSegmentedControl
            items={[
              { value: "draft", label: "Draft" },
              { value: "live", label: "Live" },
            ]}
            value={previewSource}
            onChange={(value) =>
              onPreviewSourceChange(value as "draft" | "live")
            }
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            onClick={onPublish}
            disabled={saving}
            className="h-11 rounded-2xl bg-[var(--bookinaja-600)] text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] hover:bg-[var(--bookinaja-700)] disabled:border disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:opacity-100 dark:disabled:border-white/10 dark:disabled:bg-white/[0.08] dark:disabled:text-slate-500"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Publishing..." : "Publish"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            className="h-11 rounded-2xl"
          >
            <MonitorCog className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onResetDraft}
            className="h-11 rounded-2xl"
          >
            <ArrowDown className="mr-2 h-4 w-4 rotate-45" />
            Reset
          </Button>
          {previewUrl ? (
            <Button asChild variant="outline" className="h-11 rounded-2xl">
              <a href={previewUrl} target="_blank" rel="noreferrer">
                <ChevronRight className="mr-2 h-4 w-4" />
                Publik
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled
              className="h-11 rounded-2xl"
            >
              <ChevronRight className="mr-2 h-4 w-4" />
              Publik
            </Button>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden rounded-[1.35rem] border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] shadow-[0_18px_42px_rgba(15,23,42,0.06)] dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(8,12,24,0.98))] dark:shadow-[0_18px_42px_rgba(2,6,23,0.34)] sm:rounded-[2rem] sm:shadow-[0_24px_60px_rgba(2,6,23,0.42)]">
        <div className="border-b border-slate-200/90 px-4 py-3 dark:border-white/10">
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-200)]">
            Preview
          </div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Layar kecil.</div>
        </div>
        <div className="bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_32%),linear-gradient(180deg,rgba(241,245,249,0.92),rgba(248,250,252,1))] p-3 dark:bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.12),transparent_25%),linear-gradient(180deg,rgba(10,15,28,0.98),rgba(5,5,10,1))]">
          <MobilePreviewFrame scaleMode="fit">
            <PreviewIframe
              mode="mobile"
              source={previewSource}
              previewKey={previewKey}
              iframeRef={iframeRef}
            />
          </MobilePreviewFrame>
        </div>
      </Card>
    </div>
  );
}

function MobileStatusPill({
  tone,
  label,
  compact = false,
}: {
  tone: "success" | "warning" | "neutral";
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm",
        compact && "px-2.5 py-1 text-[11px]",
        tone === "success" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
        tone === "warning" &&
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
        tone === "neutral" &&
          "border-slate-200 bg-white/90 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
      )}
    >
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          compact && "h-2 w-2",
          tone === "success" && "bg-emerald-500",
          tone === "warning" && "bg-amber-500",
          tone === "neutral" && "bg-slate-400",
        )}
      />
      {label}
    </div>
  );
}

function MobileSegmentedControl({
  items,
  value,
  onChange,
}: {
  items: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "rounded-[0.9rem] px-4 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                : "text-slate-500 dark:text-slate-300",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function createEditorDraftSnapshot(
  profile: BuilderProfile,
  page: LandingPageConfig,
  theme: LandingThemeConfig,
  bookingForm: BookingFormConfig,
): EditorDraftSnapshot {
  return {
    profile: cloneDraftValue(profile),
    page: cloneDraftValue(page),
    theme: cloneDraftValue(theme),
    bookingForm: cloneDraftValue(bookingForm),
  };
}

function restoreEditorDraftSnapshot(
  snapshot: EditorDraftSnapshot,
  setters: {
    setProfile: React.Dispatch<React.SetStateAction<BuilderProfile | null>>;
    setPage: React.Dispatch<React.SetStateAction<LandingPageConfig>>;
    setTheme: React.Dispatch<React.SetStateAction<LandingThemeConfig>>;
    setBookingForm: React.Dispatch<React.SetStateAction<BookingFormConfig>>;
  },
) {
  setters.setProfile(cloneDraftValue(snapshot.profile));
  setters.setPage(cloneDraftValue(snapshot.page));
  setters.setTheme(cloneDraftValue(snapshot.theme));
  setters.setBookingForm(cloneDraftValue(snapshot.bookingForm));
}

function cloneDraftValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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
      <Button
        type="button"
        onClick={() => void onClick()}
        disabled={saving}
        className="rounded-xl bg-[var(--bookinaja-600)] text-white hover:bg-[var(--bookinaja-700)]"
      >
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {saving ? "Menyimpan..." : "Simpan section"}
      </Button>
    </div>
  );
}

function SectionActionButton({
  editing,
  saving,
  onEdit,
  onCancel,
  onSave,
}: {
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
}) {
  if (editing) {
    return (
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.09]"
        >
          Batal
        </Button>
        <SectionSaveButton saving={saving} onClick={onSave} />
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={onEdit}
        className="rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.09]"
      >
        <PencilLine className="mr-2 h-4 w-4" />
        Edit
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
          {enabled
            ? "Section tampil di landing"
            : "Section masih disembunyikan"}
        </div>
        <div className="mt-1 text-xs opacity-80">
          {enabled
            ? "Customer akan melihat section ini di landing page."
            : "Aktifkan jika ingin section muncul di landing."}
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
                onChange={(event) =>
                  onItemChange(index, "question", event.target.value)
                }
                placeholder="Pertanyaan"
              />
              <Textarea
                value={String(item.answer || "")}
                onChange={(event) =>
                  onItemChange(index, "answer", event.target.value)
                }
                placeholder="Jawaban"
                className="min-h-24"
              />
            </>
          ) : (
            <>
              <Input
                value={String(item.name || "")}
                onChange={(event) =>
                  onItemChange(index, "name", event.target.value)
                }
                placeholder="Nama customer"
              />
              <Textarea
                value={String(item.quote || "")}
                onChange={(event) =>
                  onItemChange(index, "quote", event.target.value)
                }
                placeholder="Kutipan"
                className="min-h-24"
              />
            </>
          )}
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onRemove(index)}
          >
            Hapus item
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        onClick={onAdd}
      >
        Tambah item
      </Button>
    </div>
  );
}

function readObjectArray(value: unknown): Record<string, string>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, string> =>
      typeof item === "object" && item !== null,
  );
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

    const mimeType =
      file.type === "image/png" ? "image/webp" : file.type || "image/jpeg";
    const qualities = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5];
    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, mimeType, quality);
      if (!blob) continue;
      if (blob.size <= targetBytes) {
        const extension =
          mimeType === "image/webp"
            ? "webp"
            : mimeType === "image/png"
              ? "png"
              : "jpg";
        const fileName = file.name.replace(/\.[^.]+$/, `.${extension}`);
        return new File([blob], fileName, { type: mimeType });
      }
    }

    const fallbackBlob = await canvasToBlob(canvas, mimeType, 0.45);
    if (!fallbackBlob) throw new Error("Kompresi gambar gagal");
    const extension =
      mimeType === "image/webp"
        ? "webp"
        : mimeType === "image/png"
          ? "png"
          : "jpg";
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

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
) {
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
    typeof (error as { response?: { data?: { error?: unknown } } }).response
      ?.data === "object"
  ) {
    const data = (error as { response?: { data?: { error?: unknown } } })
      .response?.data;
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
  uploadTitle,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: "square" | "video";
  uploadTitle?: string;
  helperText?: string;
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
      const res = await uploadFileInChunks(
        "/admin/upload",
        preparedFile,
        setProgress,
      );
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
            <img
              src={value}
              alt={label}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-slate-950/70 via-transparent to-transparent p-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm">
                <ImageIcon className="h-4 w-4" />
                Ganti
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) =>
                    void handleUpload(event.target.files?.[0] || null)
                  }
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
          <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 px-3 py-4 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[var(--bookinaja-600)] shadow-sm dark:bg-[#050505]">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <ImageIcon className="h-6 w-6" />
              )}
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">
                {uploading
                  ? `Uploading ${progress}%`
                  : uploadTitle || `Upload ${label}`}
              </div>
              <div className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                {helperText || "Klik atau drop gambar"}
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) =>
                void handleUpload(event.target.files?.[0] || null)
              }
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
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {values.length} foto
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {values.map((image, index) => (
          <div
            key={`${image}-${index}`}
            className="group relative aspect-square overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() =>
                onChange(values.filter((_, itemIndex) => itemIndex !== index))
              }
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/95 text-slate-900 shadow-sm opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 text-center transition-colors hover:border-[var(--bookinaja-500)] hover:bg-[var(--bookinaja-50)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-[var(--bookinaja-600)]" />
          ) : (
            <Plus className="h-6 w-6 text-[var(--bookinaja-600)]" />
          )}
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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
