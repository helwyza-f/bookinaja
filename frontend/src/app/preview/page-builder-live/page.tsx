"use client";

import { Suspense } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { LandingBuilderRenderer } from "@/components/tenant/public/landing/builder-renderer";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

function PageBuilderLivePreviewInner() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "desktop" ? "desktop" : "mobile";

  const { data: profile } = useSWR("/public/profile", fetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
    dedupingInterval: 30000,
  });
  const { data: resourceData } = useSWR(profile?.id ? "/public/resources" : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
    dedupingInterval: 30000,
  });

  if (!profile) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505]">
        <Skeleton className="h-[90vh] rounded-[2rem] bg-slate-100 dark:bg-white/5" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505]">
      <LandingBuilderRenderer
        profile={profile}
        resources={resourceData?.resources || []}
        pageConfig={profile?.landing_page_config}
        themeConfig={profile?.landing_theme_config}
        bookingFormConfig={profile?.booking_form_config}
        previewMode={mode}
        isEditorPreview
        embedded
      />
    </div>
  );
}

export default function PageBuilderLivePreviewPage() {
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
      <PageBuilderLivePreviewInner />
    </Suspense>
  );
}
