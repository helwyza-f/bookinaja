"use client";

import { useEffect } from "react";
import { SearchX } from "lucide-react";
import { useParams } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import api from "@/lib/api";
import { LandingBuilderRenderer } from "@/components/tenant/public/landing/builder-renderer";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clearTenantSession } from "@/lib/tenant-session";
import { useTenant } from "@/context/tenant-context";
import { extractBuilderResourcesPayload } from "@/lib/page-builder";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function TenantPublicLanding() {
  const { tenant: tenantSlug } = useParams();
  const { mutate } = useSWRConfig();
  const { profile: initialProfile } = useTenant();

  // 1. FETCH PROFILE (Guard logic)
  const {
    data: freshProfile,
    error: profileError,
    isLoading: loadingProfile,
  } = useSWR(tenantSlug ? "/public/site" : null, fetcher, {
    fallbackData: initialProfile ?? undefined,
    revalidateOnFocus: true,
    revalidateOnMount: !initialProfile,
    dedupingInterval: 1000,
  });

  const resolvedProfile = freshProfile ?? initialProfile ?? null;

  // 2. FETCH RESOURCES
  const { data: resourceData, isLoading: loadingResources } = useSWR(
    resolvedProfile?.id ? "/public/resources" : null,
    fetcher,
    { dedupingInterval: 1000 },
  );

  const resources = extractBuilderResourcesPayload(resourceData);

  // Re-sync saat tab kembali aktif
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        mutate("/public/site");
        mutate("/public/resources");
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      window.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [mutate]);

  // --- RENDERING CONDITIONS ---

  // Loading State: Tampilkan Skeleton agar UX mulus
  if (loadingProfile && !resolvedProfile) {
    return <FullPageSkeleton />;
  }

  // Error State: Data 404 atau Error Koneksi
  if (profileError || !resolvedProfile) {
    return <NotFoundUI />;
  }

  // Success State: Data Siap
  return (
    <div className="min-h-screen bg-white font-plus-jakarta transition-colors duration-500 dark:bg-[#050505]">
      <LandingBuilderRenderer
        profile={resolvedProfile}
        resources={loadingResources ? [] : resources}
        pageConfig={resolvedProfile?.landing_page_config}
        themeConfig={resolvedProfile?.landing_theme_config}
        bookingFormConfig={resolvedProfile?.booking_form_config}
        embedded
      />
    </div>
  );
}

// --- INTERNAL HELPERS ---

function FullPageSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] space-y-0">
      <div className="h-20 w-full px-6 flex items-center justify-between border-b dark:border-white/5">
        <Skeleton className="h-10 w-32 rounded-xl bg-slate-100 dark:bg-white/5" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-24 rounded-full bg-slate-100 dark:bg-white/5" />
          <Skeleton className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/5" />
        </div>
      </div>
      <div className="h-[70vh] w-full p-6 md:p-12 flex flex-col justify-end space-y-6">
        <Skeleton className="h-4 w-40 bg-slate-100 dark:bg-white/5" />
        <Skeleton className="h-24 md:h-48 w-full md:w-3/4 bg-slate-100 dark:bg-white/5" />
        <Skeleton className="h-16 w-64 rounded-full bg-slate-100 dark:bg-white/5" />
      </div>
    </div>
  );
}

function NotFoundUI() {
  const { cache, mutate } = useSWRConfig();

  // Quiet recovery: reset any stale tenant/session state, then reload. Framed to
  // the customer as a plain "try again" — no cache/session internals surfaced.
  const handleRetry = () => {
    clearTenantSession();
    mutate("/public/site", undefined, { revalidate: false });
    mutate("/public/resources", undefined, { revalidate: false });
    if (cache instanceof Map) cache.clear();
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6 text-slate-900 dark:bg-[#050505] dark:text-white">
      <div className="w-full max-w-md space-y-8 text-center animate-in fade-in duration-500">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
          <SearchX className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Halaman ini tidak tersedia
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
            Halaman booking yang kamu tuju mungkin sudah ditutup, dipindahkan, atau tautannya kurang lengkap. Coba periksa kembali tautannya.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Button asChild className="h-12 w-full max-w-xs rounded-xl">
            <Link href="/">Kembali ke beranda</Link>
          </Button>
          <button
            onClick={handleRetry}
            className="text-sm font-medium text-slate-500 underline-offset-4 transition-colors hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-white"
          >
            Muat ulang halaman
          </button>
        </div>
      </div>
    </div>
  );
}
