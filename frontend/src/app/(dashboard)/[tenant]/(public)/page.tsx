"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import api from "@/lib/api";
import { TenantNavbar } from "@/components/tenant/public/landing/navbar";
import { TenantHero } from "@/components/tenant/public/landing/hero";
import { ResourceCard } from "@/components/tenant/public/landing/resource-card";
import { TenantFooter } from "@/components/tenant/public/landing/footer";
import { GallerySection } from "@/components/tenant/public/landing/gallery-section";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clearTenantSession } from "@/lib/tenant-session";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const FALLBACK_ASSETS: Record<string, any> = {
  gaming_hub: {
    banner:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070",
    tagline: "Arena Pro Player",
    copy: "Hardware spesifikasi tinggi dengan koneksi ultra stabil.",
    features: [
      "RTX 4090 Ready",
      "Internet 1Gbps",
      "Pro Peripherals",
      "240Hz Monitor",
    ],
  },
  creative_space: {
    banner:
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070",
    tagline: "Unlimited Creativity",
    copy: "Ruang estetik dengan pencahayaan profesional.",
    features: [
      "Pro Lighting",
      "Set Aesthetic",
      "High-End Camera",
      "Private Studio",
    ],
  },
  sport_center: {
    banner:
      "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2070",
    tagline: "World Class Facility",
    copy: "Fasilitas olahraga standar internasional.",
    features: ["Vinyl Court", "Locker Room", "Standard Inter", "Training Gear"],
  },
  social_space: {
    banner:
      "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?q=80&w=2070",
    tagline: "Elite Collaboration",
    copy: "Lingkungan produktif yang homey dan nyaman.",
    features: ["Fast Wi-Fi", "Free Coffee", "Focus Zone", "Meeting Room"],
  },
};

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

  const theme = useMemo(
    () => ({
      primary: freshProfile?.primary_color || "#3b82f6",
    }),
    [freshProfile],
  );

  const content = useMemo(() => {
    const cat = freshProfile?.business_category || "gaming_hub";
    const fb = FALLBACK_ASSETS[cat] || FALLBACK_ASSETS.gaming_hub;
    return {
      banner: freshProfile?.banner_url || fb.banner,
      tagline: freshProfile?.tagline || fb.tagline,
      description: freshProfile?.about_us || fb.copy,
      features:
        freshProfile?.features?.length > 0
          ? freshProfile.features
          : fb.features,
    };
  }, [freshProfile]);

  const getBestPrice = (resource: any) => {
    const mains = resource.items?.filter(
      (i: any) => i.item_type === "main_option" || i.item_type === "main",
    );
    if (!mains || mains.length === 0) return null;
    const lowest = mains.reduce((prev: any, curr: any) =>
      prev.price < curr.price ? prev : curr,
    );
    return {
      value: lowest.price,
      unit: lowest.price_unit === "hour" ? "Jam" : "Sesi",
    };
  };

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
    <div className="min-h-screen bg-white dark:bg-[#050505] font-plus-jakarta transition-colors duration-500 relative overflow-hidden">
      
      {/* --- DECORATIVE ORBS --- */}
      <div className="absolute top-[20%] -left-64 w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 dark:opacity-10 dark:mix-blend-screen pointer-events-none" style={{ backgroundColor: theme.primary }} />
      <div className="absolute bottom-[10%] -right-64 w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 dark:opacity-10 dark:mix-blend-screen pointer-events-none" style={{ backgroundColor: theme.primary }} />

      <TenantNavbar profile={freshProfile} tenantSlug={tenantSlug as string} />
      <TenantHero profile={freshProfile} content={content} theme={theme} />

      <section
        id="catalog"
        className="py-24 md:py-36 relative z-10"
      >
        <div className="container mx-auto max-w-6xl px-6 md:px-8">
          <div className="mb-16 space-y-4 text-center">
            <h2 className="text-4xl md:text-6xl font-[1000] uppercase italic tracking-tighter text-slate-900 dark:text-white">
              Siap <span style={{ color: theme.primary }}>Reservasi.</span>
            </h2>
            <p className="text-sm md:text-base font-medium text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Pilih fasilitas yang kamu butuhkan dan lakukan reservasi secara real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {loadingResources
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-[340px] md:h-[400px] w-full rounded-[2.5rem] bg-slate-100 dark:bg-white/5"
                  />
                ))
              : resources.map((res: any) => (
                  <ResourceCard
                    key={res.id}
                    res={res}
                    primaryColor={theme.primary}
                    getBestPrice={getBestPrice}
                  />
                ))}
          </div>
        </div>
      </section>

      <GallerySection
        images={freshProfile.gallery || []}
        primaryColor={theme.primary}
      />
      <TenantFooter profile={freshProfile} primaryColor={theme.primary} />
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
            Station Offline
          </p>
          <p className="text-slate-500 font-bold italic text-[10px] md:text-xs uppercase tracking-widest px-4 max-w-xs mx-auto">
            Target business hub not found in Batam Engine database or your
            session is out of sync.
          </p>
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <Link href="/">
            <Button
              variant="outline"
              className="rounded-full h-16 px-12 font-black uppercase border-white/10 hover:bg-white hover:text-black transition-all italic tracking-widest"
            >
              Abort Mission
            </Button>
          </Link>
          <button
            onClick={handleForceReconnect}
            className="group flex flex-col items-center gap-2 text-slate-500 hover:text-white transition-colors"
          >
            <span className="text-[10px] font-black uppercase italic tracking-[0.3em]">
              Force Reconnect
            </span>
            <div className="h-0.5 w-8 bg-blue-600 group-hover:w-24 transition-all duration-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
