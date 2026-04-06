"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { setCookie } from "cookies-next";
import { TenantNavbar } from "@/components/tenant/public/landing/navbar";
import { TenantHero } from "@/components/tenant/public/landing/hero";
import { ResourceCard } from "@/components/tenant/public/landing/resource-card";
import { TenantFooter } from "@/components/tenant/public/landing/footer";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * --- DYNAMIC FALLBACK SYSTEM (TEXT ONLY) ---
 * Tenant cukup input teks saja, visual tetap mewah.
 */
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
  creative_space: {
    banner:
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070",
    tagline: "Studio Creative",
    copy: "Ruang estetik dengan pencahayaan profesional untuk mendukung kreativitas tanpa batas.",
    features: [
      "Pro Lighting",
      "Set Aesthetic",
      "High-End Camera",
      "Private Studio",
    ],
  },
  sport_center: {
    banner:
      "https://images.unsplash.com/photo-1541252260730-0412e3e2104e?q=80&w=2070",
    tagline: "Center of Sports",
    copy: "Fasilitas olahraga standar internasional dengan kebersihan dan kenyamanan yang diprioritaskan.",
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

const THEMES: Record<string, any> = {
  gaming_hub: {
    primary: "text-blue-500",
    bgPrimary: "bg-blue-600",
    gradient: "from-blue-600/30",
    accent: "border-blue-500/20",
  },
  creative_space: {
    primary: "text-rose-500",
    bgPrimary: "bg-rose-600",
    gradient: "from-rose-600/30",
    accent: "border-rose-500/20",
  },
  sport_center: {
    primary: "text-emerald-500",
    bgPrimary: "bg-emerald-600",
    gradient: "from-emerald-600/30",
    accent: "border-emerald-500/20",
  },
  social_space: {
    primary: "text-indigo-500",
    bgPrimary: "bg-indigo-600",
    gradient: "from-indigo-600/30",
    accent: "border-indigo-500/20",
  },
};

export default function TenantPublicLanding() {
  const { tenant } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/public/landing?slug=${tenant}`)
      .then((res) => {
        setData(res.data);
        if (res.data?.profile?.id) {
          setCookie("current_tenant_id", res.data.profile.id, {
            maxAge: 60 * 60 * 24,
            path: "/", // Pastikan path root agar terbaca di semua route
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Critical error loading tenant data:", err);
        setLoading(false);
      });
  }, [tenant]);

  const activeTheme = useMemo(
    () =>
      THEMES[data?.profile?.business_category || "social_space"] ||
      THEMES.social_space,
    [data],
  );

  const fallback = useMemo(
    () =>
      FALLBACK_ASSETS[data?.profile?.business_category || "social_space"] ||
      FALLBACK_ASSETS.social_space,
    [data],
  );

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

  if (loading)
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 border-t-2 border-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
            Connecting to Hub...
          </p>
        </div>
      </div>
    );

  if (!data?.profile)
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white p-6">
        <div className="text-center space-y-6">
          <h1 className="text-8xl font-black italic opacity-20 italic">404</h1>
          <p className="font-bold uppercase tracking-widest text-red-500">
            Business Not Found
          </p>
          <Link href="https://bookinaja.com">
            <Button variant="outline" className="rounded-full">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] font-plus-jakarta transition-colors duration-500">
      <TenantNavbar
        profile={data.profile}
        activeTheme={activeTheme}
        tenantSlug={tenant}
      />

      <TenantHero
        profile={data.profile}
        activeTheme={activeTheme}
        fallback={fallback}
      />

      <section
        id="catalog"
        className="py-24 md:py-40 bg-slate-50 dark:bg-white/[0.02] px-6"
      >
        <div className="container mx-auto">
          <div className="mb-20 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-1 w-10 rounded-full ${activeTheme.bgPrimary}`}
              />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">
                Select your experience
              </span>
            </div>
            <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none">
              Ready to <span className={activeTheme.primary}>Book.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {data.resources.map((res: any) => (
              <ResourceCard
                key={res.id}
                res={res}
                activeTheme={activeTheme}
                getBestPrice={getBestPrice}
              />
            ))}
          </div>
        </div>
      </section>

      <TenantFooter profile={data.profile} activeTheme={activeTheme} />
    </div>
  );
}
