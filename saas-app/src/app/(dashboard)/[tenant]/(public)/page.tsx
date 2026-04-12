"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import api from "@/lib/api";
import { useTenant } from "@/context/tenant-context";
import { TenantNavbar } from "@/components/tenant/public/landing/navbar";
import { TenantHero } from "@/components/tenant/public/landing/hero";
import { ResourceCard } from "@/components/tenant/public/landing/resource-card";
import { TenantFooter } from "@/components/tenant/public/landing/footer";
import { GallerySection } from "@/components/tenant/public/landing/gallery-section";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Fetcher universal untuk SWR
const fetcher = (url: string) => api.get(url).then((res) => res.data);

const FALLBACK_ASSETS: Record<string, any> = {
  gaming_hub: {
    banner:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070",
    tagline: "Arena Pro Player",
    copy: "Hardware spesifikasi tinggi dengan koneksi ultra stabil untuk pengalaman gaming tanpa kompromi.",
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
    copy: "Ruang estetik dengan pencahayaan profesional untuk mendukung setiap karya kreatif Anda.",
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
    copy: "Fasilitas olahraga standar internasional dengan sistem booking yang mudah dan transparan.",
    features: ["Vinyl Court", "Locker Room", "Standard Inter", "Training Gear"],
  },
  social_space: {
    banner:
      "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?q=80&w=2070",
    tagline: "Elite Collaboration",
    copy: "Lingkungan produktif yang homey, sangat cocok untuk fokus bekerja atau berdiskusi santai.",
    features: ["Fast Wi-Fi", "Free Coffee", "Focus Zone", "Meeting Room"],
  },
};

export default function TenantPublicLanding() {
  const { tenant: tenantSlug } = useParams();

  // 1. Ambil profile dari Context
  const { profile } = useTenant();

  // 2. FETCH PROFILE SECARA MANDIRI (Untuk Invalidation)
  // Ini kunci biar kalau context 'stale', halaman ini tetep nge-hit API pake slug URL
  const { data: freshProfile, mutate: mutateProfile } = useSWR(
    tenantSlug ? `/public/profile?slug=${tenantSlug}` : null,
    fetcher,
    { revalidateOnMount: true },
  );

  // Gunakan data terbaru (prioritaskan API jika context kosong)
  const activeProfile = profile || freshProfile;

  // 3. FETCH RESOURCES
  const { data: resourceData, isLoading: loadingResources } = useSWR(
    activeProfile?.id ? `/public/resources?slug=${tenantSlug}` : null,
    fetcher,
    { dedupingInterval: 2000 },
  );

  const resources = resourceData?.resources || [];

  // --- REFRESH LOGIC ---
  useEffect(() => {
    // Jika di URL ada slug tapi profile masih null, coba paksa refresh data
    if (tenantSlug && !activeProfile) {
      const timer = setTimeout(() => mutateProfile(), 1000);
      return () => clearTimeout(timer);
    }
  }, [tenantSlug, activeProfile, mutateProfile]);

  const theme = useMemo(() => {
    const primary = activeProfile?.primary_color || "#3b82f6";
    return { primary };
  }, [activeProfile]);

  const content = useMemo(() => {
    const cat = activeProfile?.business_category || "gaming_hub";
    const fb = FALLBACK_ASSETS[cat] || FALLBACK_ASSETS.gaming_hub;
    return {
      banner: activeProfile?.banner_url || fb.banner,
      tagline: activeProfile?.tagline || fb.tagline,
      description: activeProfile?.about_us || fb.copy,
      features:
        activeProfile?.features?.length > 0
          ? activeProfile.features
          : fb.features,
    };
  }, [activeProfile]);

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

  if (!activeProfile) return <NotFoundUI />;

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] font-plus-jakarta transition-colors duration-500">
      <TenantNavbar profile={activeProfile} tenantSlug={tenantSlug as string} />
      <TenantHero profile={activeProfile} content={content} theme={theme} />

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
                    className="h-[300px] w-full rounded-[2rem]"
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
        images={activeProfile.gallery || []}
        primaryColor={theme.primary}
      />
      <TenantFooter profile={activeProfile} primaryColor={theme.primary} />
    </div>
  );
}

function NotFoundUI() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white p-6">
      <div className="text-center space-y-10">
        <h1 className="text-[10rem] md:text-[15rem] font-[1000] italic opacity-5 leading-none">
          404
        </h1>
        <div className="space-y-3 relative z-10 -mt-10 md:-mt-20">
          <p className="font-black uppercase tracking-[0.6em] text-red-500 text-sm md:text-base">
            Station Offline
          </p>
          <p className="text-slate-500 font-bold italic text-[10px] md:text-xs uppercase tracking-widest px-4">
            Target business hub not found in our database or activation is in
            progress.
          </p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <Link href="/" className="inline-block relative z-10">
            <Button
              variant="outline"
              className="rounded-full h-16 px-12 font-black italic uppercase border-white/10 hover:bg-white hover:text-black transition-all"
            >
              Abort Mission
            </Button>
          </Link>
          <Button
            onClick={() => window.location.reload()}
            variant="ghost"
            className="text-slate-500 text-[10px] font-black italic uppercase"
          >
            Force Reconnect
          </Button>
        </div>
      </div>
    </div>
  );
}
