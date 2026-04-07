"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { setCookie } from "cookies-next";
import { TenantNavbar } from "@/components/tenant/public/landing/navbar";
import { TenantHero } from "@/components/tenant/public/landing/hero";
import { ResourceCard } from "@/components/tenant/public/landing/resource-card";
import { TenantFooter } from "@/components/tenant/public/landing/footer";
import { GallerySection } from "@/components/tenant/public/landing/gallery-section";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FALLBACK_ASSETS: Record<string, any> = {
  gaming_hub: {
    banner:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070",
    tagline: "Arena Pro Player",
    copy: "Hardware spesifikasi tinggi dengan koneksi ultra stabil untuk pengalaman gaming tanpa kompromi.",
    features: [
      "Internet 1Gbps",
      "RTX 4090 Ready",
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
  const { tenant } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Force smooth scroll behavior
    document.documentElement.style.scrollBehavior = "smooth";

    api
      .get(`/public/landing?slug=${tenant}`)
      .then((res) => {
        setData(res.data);
        if (res.data?.profile?.id) {
          setCookie("current_tenant_id", res.data.profile.id, {
            maxAge: 60 * 60 * 24,
            path: "/",
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Critical error loading tenant data:", err);
        setLoading(false);
      });
  }, [tenant]);

  // 1. Dynamic Theme Logic
  const theme = useMemo(() => {
    const primary = data?.profile?.primary_color || "#3b82f6";
    return {
      primary: primary,
      bgPrimary: `bg-[${primary}]`,
      textPrimary: `text-[${primary}]`,
    };
  }, [data]);

  // 2. Adaptive Content Merging
  const content = useMemo(() => {
    const profile = data?.profile;
    const cat = profile?.business_category || "gaming_hub";
    const fb = FALLBACK_ASSETS[cat] || FALLBACK_ASSETS.gaming_hub;

    return {
      banner: profile?.banner_url || fb.banner,
      tagline: profile?.tagline || fb.tagline,
      description: profile?.about_us || fb.copy,
      features:
        profile?.features && profile.features.length > 0
          ? profile.features
          : fb.features,
    };
  }, [data]);

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

  if (loading) return <LoadingUI />;
  if (!data?.profile) return <NotFoundUI />;

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] font-plus-jakarta transition-colors duration-500 selection:bg-blue-500/30">
      {/* NAVIGATION */}
      <TenantNavbar profile={data.profile} tenantSlug={tenant as string} />

      {/* HERO SECTION */}
      <TenantHero profile={data.profile} content={content} theme={theme} />

      {/* CATALOG SECTION - Optimized spacing and grid */}
      <section
        id="catalog"
        className="py-24 md:py-48 bg-slate-50 dark:bg-white/[0.01] px-6 relative overflow-hidden"
      >
        {/* Background Decorative Element */}
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
            {data.resources.map((res: any) => (
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

      {/* GALLERY SECTION - New Bento Grid System */}
      <GallerySection
        images={data.profile.gallery}
        primaryColor={theme.primary}
      />

      {/* FOOTER */}
      <TenantFooter profile={data.profile} primaryColor={theme.primary} />
    </div>
  );
}

// --- SUB-COMPONENTS FOR CLEANER CODE ---

function LoadingUI() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-14 w-14 border-t-2 border-white rounded-full animate-spin mx-auto opacity-20" />
        <p className="text-white font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">
          Establishing Uplink...
        </p>
      </div>
    </div>
  );
}

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
        <Link
          href="https://bookinaja.com"
          className="inline-block relative z-10"
        >
          <Button
            variant="outline"
            className="rounded-full h-16 px-12 font-black italic uppercase tracking-widest border-white/10 hover:bg-white hover:text-black transition-all shadow-2xl"
          >
            Abord Mission
          </Button>
        </Link>
      </div>
    </div>
  );
}
