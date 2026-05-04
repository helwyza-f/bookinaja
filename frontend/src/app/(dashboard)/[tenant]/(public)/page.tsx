"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import api from "@/lib/api";
import { LandingBuilderRenderer } from "@/components/tenant/public/landing/builder-renderer";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clearTenantSession } from "@/lib/tenant-session";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function TenantPublicLanding() {
  const { tenant: tenantSlug } = useParams();
  const { mutate } = useSWRConfig();

  // 1. FETCH PROFILE (Guard logic)
  const {
    data: freshProfile,
    error: profileError,
    isLoading: loadingProfile,
  } = useSWR(tenantSlug ? "/public/profile" : null, fetcher, {
    revalidateOnFocus: true,
    revalidateOnMount: true,
    dedupingInterval: 1000,
  });

  // 2. FETCH RESOURCES
  const { data: resourceData, isLoading: loadingResources } = useSWR(
    freshProfile?.id ? "/public/resources" : null,
    fetcher,
    { dedupingInterval: 1000 },
  );

  const resources = resourceData?.resources || [];

  // Re-sync saat tab kembali aktif
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        mutate("/public/profile");
        mutate("/public/resources");
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      window.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [mutate]);

  // --- RENDERING CONDITIONS ---

  // Loading State: Tampilkan Skeleton agar UX mulus
  if (loadingProfile && !freshProfile) {
    return <FullPageSkeleton />;
  }

  // Error State: Data 404 atau Error Koneksi
  if (profileError || !freshProfile) {
    return <NotFoundUI />;
  }

  // Success State: Data Siap
  return (
    <div className="min-h-screen bg-white font-plus-jakarta transition-colors duration-500 dark:bg-[#050505]">
      <LandingBuilderRenderer
        profile={freshProfile}
        resources={loadingResources ? [] : resources}
        pageConfig={freshProfile?.landing_page_config}
        themeConfig={freshProfile?.landing_theme_config}
        bookingFormConfig={freshProfile?.booking_form_config}
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

  const handleForceReconnect = async () => {
    // 1. Bersihkan Cookies (Auth, Tenant ID, Tenant Slug)
    clearTenantSession();

    // 2. Bersihkan Cache SWR secara brutal
    // Kita panggil mutate dengan undefined untuk semua key yang kita pakai
    mutate("/public/profile", undefined, { revalidate: false });
    mutate("/public/resources", undefined, { revalidate: false });

    // 3. Optional: Bersihkan semua cache SWR yang tersimpan di memori
    // (Bisa dilakukan jika ingin bener-bener nuklir semua state)
    if (cache instanceof Map) cache.clear();

    // 4. Paksa Browser reload ke root untuk inisialisasi ulang interceptor API
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white p-6">
      <div className="text-center space-y-10 animate-in fade-in zoom-in duration-500">
        <h1 className="text-[10rem] md:text-[15rem] font-[1000] italic opacity-5 leading-none tracking-tighter select-none">
          404
        </h1>
        <div className="space-y-3 relative z-10 -mt-10 md:-mt-20">
          <p className="font-black uppercase tracking-[0.6em] text-blue-600 text-sm md:text-base italic">
            Halaman Tidak Ditemukan
          </p>
          <p className="text-slate-500 font-bold italic text-[10px] md:text-xs uppercase tracking-widest px-4 max-w-xs mx-auto">
            Bisnis yang kamu cari belum tersedia atau sesi browser sedang tidak sinkron.
          </p>
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <Link href="/">
            <Button
              variant="outline"
              className="rounded-full h-16 px-12 font-black uppercase border-white/10 hover:bg-white hover:text-black transition-all italic tracking-widest"
            >
              Kembali ke Beranda
            </Button>
          </Link>
          <button
            onClick={handleForceReconnect}
            className="group flex flex-col items-center gap-2 text-slate-500 hover:text-white transition-colors"
          >
            <span className="text-[10px] font-black uppercase italic tracking-[0.3em]">
              Coba Muat Ulang
            </span>
            <div className="h-0.5 w-8 bg-blue-600 group-hover:w-24 transition-all duration-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
