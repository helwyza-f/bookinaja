"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { useTenant } from "@/context/tenant-context"; // Custom Hook Context
import { TenantNavbar } from "@/components/tenant/public/landing/navbar";
import { TenantHero } from "@/components/tenant/public/landing/hero";
import { ResourceCard } from "@/components/tenant/public/landing/resource-card";
import { TenantFooter } from "@/components/tenant/public/landing/footer";
import { GallerySection } from "@/components/tenant/public/landing/gallery-section";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

  // 1. AMBIL DATA DARI CONTEXT (Instan dari Layout Server)
  const { profile } = useTenant();

  // 2. STATE GRANULAR UNTUK DATA BERAT
  const [resources, setResources] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);

  useEffect(() => {
    // Force smooth scroll behavior
    document.documentElement.style.scrollBehavior = "smooth";

    // 3. FETCH GRANULAR (Hanya Resources)
    // Interceptor api.ts akan otomatis kirim X-Tenant-ID (VIP Path)
    // karena request profile di layout sudah memicu silent lookup ID.
    if (profile?.id) {
      api
        .get("/public/resources")
        .then((res) => {
          // Response handler backend baru lo mengembalikan { resources: [...] }
          setResources(res.data.resources || []);
        })
        .catch((err) => console.error("Failed to load resources:", err))
        .finally(() => setLoadingResources(false));
    }
  }, [profile]);

  // 4. THEME LOGIC (Instant - No Loading)
  const theme = useMemo(() => {
    const primary = profile?.primary_color || "#3b82f6";
    return {
      primary: primary,
      bgPrimary: `bg-[${primary}]`,
      textPrimary: `text-[${primary}]`,
    };
  }, [profile]);

  // 5. CONTENT LOGIC (Instant)
  const content = useMemo(() => {
    const cat = profile?.business_category || "gaming_hub";
    const fb = FALLBACK_ASSETS[cat] || FALLBACK_ASSETS.gaming_hub;

    return {
      banner: profile?.banner_url || fb.banner,
      tagline: profile?.tagline || fb.tagline,
      description: profile?.about_us || fb.copy,
      features: profile?.features?.length > 0 ? profile.features : fb.features,
    };
  }, [profile]);

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

  // Jika profile benar-benar gagal dapet (404 dari Server)
  if (!profile) return <NotFoundUI />;

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] font-plus-jakarta transition-colors duration-500 selection:bg-blue-500/30">
      <TenantNavbar profile={profile} tenantSlug={tenantSlug as string} />
      <TenantHero profile={profile} content={content} theme={theme} />

      {/* CATALOG SECTION */}
      <section
        id="catalog"
        className="py-24 md:py-48 bg-slate-50 dark:bg-white/[0.01] px-6 relative overflow-hidden"
      >
        <div
          className="absolute -left-20 top-40 h-[400px] w-[400px] opacity-[0.02] blur-[100px] pointer-events-none rounded-full"
          style={{ backgroundColor: theme.primary }}
        />

        <div className="container mx-auto max-w-7xl">
          <div className="mb-24 space-y-6 text-center md:text-left px-4">
            <div className="flex items-center justify-center md:justify-start gap-4">
              <div
                className="h-1.5 w-12 rounded-full"
                style={{ backgroundColor: theme.primary }}
              />
              <span className="text-[11px] font-[1000] uppercase tracking-[0.5em] text-slate-400 italic">
                Experience Hub
              </span>
            </div>
            <h2 className="text-6xl md:text-9xl font-[1000] uppercase italic tracking-tighter leading-[0.8] text-slate-950 dark:text-white">
              Ready to <span style={{ color: theme.primary }}>Book.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12 px-4">
            {loadingResources
              ? // SKELETON UI: Menjaga layout tetap rapi saat loading resources
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-[300px] w-full rounded-[2rem]" />
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
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
        images={profile.gallery || []}
        primaryColor={theme.primary}
      />
      <TenantFooter profile={profile} primaryColor={theme.primary} />
    </div>
  );
}

// --- SUB-COMPONENTS ---

function NotFoundUI() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white p-6">
      <div className="text-center space-y-10">
        <h1 className="text-[15rem] font-[1000] italic opacity-5 leading-none select-none">
          404
        </h1>
        <div className="space-y-3 relative z-10 -mt-20">
          <p className="font-black uppercase tracking-[0.6em] text-red-500 text-sm">
            Station Offline
          </p>
          <p className="text-slate-500 font-bold italic text-xs uppercase tracking-widest">
            Target business hub not found in our database.
          </p>
        </div>
        <Link href="/" className="inline-block relative z-10">
          <Button
            variant="outline"
            className="rounded-full h-16 px-12 font-black italic uppercase tracking-widest border-white/10 hover:bg-white hover:text-black transition-all shadow-2xl"
          >
            Abort Mission
          </Button>
        </Link>
      </div>
    </div>
  );
}
