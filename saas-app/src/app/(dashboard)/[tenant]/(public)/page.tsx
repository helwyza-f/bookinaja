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

  // 1. FETCH PROFILE (Pembeda antara Loading, Error, dan Data)
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

  // --- LOGIC RENDER CONDITION ---

  // 1. Jika masih loading awal (freshProfile belum ada & belum error)
  if (loadingProfile && !freshProfile) return <FullPageSkeleton />;

  // 2. Jika benar-benar error 404 (Atau error dari backend)
  if (profileError || !freshProfile) return <NotFoundUI />;

  // 3. Render Normal
  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] font-plus-jakarta transition-colors duration-500">
      <TenantNavbar profile={freshProfile} tenantSlug={tenantSlug as string} />
      <TenantHero profile={freshProfile} content={content} theme={theme} />

      <section
        id="catalog"
        className="py-24 md:py-48 bg-slate-50 dark:bg-white/[0.01] px-6 relative overflow-hidden"
      >
        <div className="container mx-auto max-w-7xl">
          <div className="mb-24 space-y-6 text-center md:text-left px-4">
            <h2 className="text-6xl md:text-9xl font-[1000] uppercase italic tracking-tighter leading-[0.8]">
              Ready to <span style={{ color: theme.primary }}>Book.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12 px-4">
            {loadingResources
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-[400px] w-full rounded-[2.5rem] bg-slate-200 dark:bg-white/5"
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

// Komponen Skeleton Full Page biar transisi halus
function FullPageSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] space-y-0">
      {/* Navbar Skeleton */}
      <div className="h-20 w-full px-6 flex items-center justify-between border-b dark:border-white/5">
        <Skeleton className="h-10 w-32 rounded-xl bg-slate-100 dark:bg-white/5" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-24 rounded-full bg-slate-100 dark:bg-white/5" />
          <Skeleton className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/5" />
        </div>
      </div>
      {/* Hero Skeleton */}
      <div className="h-[70vh] w-full p-6 md:p-12 flex flex-col justify-end space-y-6">
        <Skeleton className="h-4 w-40 bg-slate-100 dark:bg-white/5" />
        <Skeleton className="h-24 md:h-48 w-full md:w-3/4 bg-slate-100 dark:bg-white/5" />
        <Skeleton className="h-16 w-64 rounded-full bg-slate-100 dark:bg-white/5" />
      </div>
      {/* Catalog Skeleton */}
      <div className="p-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            className="h-[400px] rounded-[2.5rem] bg-slate-100 dark:bg-white/5"
          />
        ))}
      </div>
    </div>
  );
}

function NotFoundUI() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white p-6">
      <div className="text-center space-y-10 animate-in fade-in zoom-in duration-500">
        <h1 className="text-[10rem] md:text-[15rem] font-[1000] italic opacity-5 leading-none tracking-tighter">
          404
        </h1>
        <div className="space-y-3 relative z-10 -mt-10 md:-mt-20">
          <p className="font-black uppercase tracking-[0.6em] text-blue-600 text-sm md:text-base italic">
            Station Offline
          </p>
          <p className="text-slate-500 font-bold italic text-[10px] md:text-xs uppercase tracking-widest px-4 max-w-xs mx-auto">
            Target business hub not found in Batam Engine database.
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
            onClick={() => window.location.reload()}
            className="text-slate-500 text-[10px] font-black uppercase italic tracking-[0.3em] hover:text-white transition-colors"
          >
            Force Reconnect
          </button>
        </div>
      </div>
    </div>
  );
}
