"use client";

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { LandingBuilderRenderer } from "@/components/tenant/public/landing/builder-renderer";
import {
  type BookingFormConfig,
  type BuilderProfile,
  type BuilderResource,
  type LandingPageConfig,
  type LandingThemeConfig,
  normalizeBookingFormConfig,
  normalizePageBuilderConfig,
  normalizeThemeConfig,
} from "@/lib/page-builder";

const PREVIEW_CHANNEL = "bookinaja-page-builder-preview";

type PreviewDraft = {
  profile: BuilderProfile;
  resources: BuilderResource[];
  page: LandingPageConfig;
  theme: LandingThemeConfig;
  booking_form: BookingFormConfig;
};

type DraftMessage = {
  type: "bookinaja-page-builder-draft";
  draft: PreviewDraft;
};

let cachedDraftKey: string | null = null;
let cachedDraftValue: PreviewDraft | null = null;

function readStoredDraft() {
  if (typeof window === "undefined") return null;

  const activeId = localStorage.getItem("bookinaja:page-builder:active-draft");
  if (!activeId) return null;

  const raw = localStorage.getItem(`bookinaja:page-builder:draft:${activeId}`);
  if (!raw) return null;

   const snapshotKey = `${activeId}:${raw}`;
   if (cachedDraftKey === snapshotKey) {
    return cachedDraftValue;
  }

  try {
    const parsed = JSON.parse(raw) as PreviewDraft;
    cachedDraftKey = snapshotKey;
    cachedDraftValue = parsed;
    return parsed;
  } catch {
    cachedDraftKey = null;
    cachedDraftValue = null;
    return null;
  }
}

function subscribeToDraftStore(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  let channel: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel(PREVIEW_CHANNEL);
    channel.onmessage = () => onStoreChange();
  }

  const onStorage = () => onStoreChange();
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.close();
  };
}

function PageBuilderPreviewInner() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "desktop" ? "desktop" : "mobile";
  const draft = useSyncExternalStore(subscribeToDraftStore, readStoredDraft, () => null);
  const [incomingDraft, setIncomingDraft] = useState<PreviewDraft | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as DraftMessage | undefined;
      if (!data || data.type !== "bookinaja-page-builder-draft" || !data.draft) return;
      setIncomingDraft(data.draft);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const activeDraft = incomingDraft || draft;

  const normalizedDraft = useMemo(() => {
    if (!activeDraft) return null;
    return {
      profile: activeDraft.profile,
      resources: activeDraft.resources || [],
      page: normalizePageBuilderConfig(activeDraft.page),
      theme: normalizeThemeConfig(activeDraft.theme, activeDraft.profile.primary_color),
      bookingForm: normalizeBookingFormConfig(activeDraft.booking_form),
    };
  }, [activeDraft]);

  if (!normalizedDraft) {
    return (
      <div className="min-h-screen bg-white p-6 dark:bg-[#050505]">
        <Skeleton className="h-[90vh] rounded-[2rem] bg-slate-100 dark:bg-white/5" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505]">
      <LandingBuilderRenderer
        profile={normalizedDraft.profile}
        resources={normalizedDraft.resources}
        pageConfig={normalizedDraft.page}
        themeConfig={normalizedDraft.theme}
        bookingFormConfig={normalizedDraft.bookingForm}
        previewMode={mode}
        isEditorPreview
        embedded
      />
    </div>
  );
}

export default function PageBuilderPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white p-6 dark:bg-[#050505]">
          <Skeleton className="h-[90vh] rounded-[2rem] bg-slate-100 dark:bg-white/5" />
        </div>
      }
    >
      <style>{`
        html, body {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        html::-webkit-scrollbar, body::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <PageBuilderPreviewInner />
    </Suspense>
  );
}
