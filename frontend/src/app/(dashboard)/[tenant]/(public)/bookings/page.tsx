"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { LayoutGrid, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/context/tenant-context";
import { ResourceCard } from "@/components/tenant/public/landing/resource-card";
import { TenantNavbar } from "@/components/tenant/public/landing/navbar";
import { TenantFooter } from "@/components/tenant/public/landing/footer";
import {
  getPreviewSurfaceClass,
  getThemeVisuals,
} from "@/components/tenant/public/landing/builder-renderer";
import { extractBuilderResourcesPayload, normalizeThemeConfig } from "@/lib/page-builder";
import type { BuilderProfile } from "@/lib/page-builder";

export default function PublicResourceCatalog() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const { profile } = useTenant();

  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await api.get("/public/resources");
        setResources(extractBuilderResourcesPayload(res.data));
      } catch {
        toast.error("Gagal memuat katalog unit");
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, [tenantSlug]);

  const activeTheme = useMemo(
    () =>
      normalizeThemeConfig(
        profile?.landing_theme_config,
        profile?.primary_color,
      ),
    [profile],
  );
  const themeVisuals = useMemo(() => getThemeVisuals(activeTheme), [activeTheme]);
  const surfaceClass = useMemo(
    () => getPreviewSurfaceClass(activeTheme),
    [activeTheme],
  );
  const resolvedProfile = useMemo<BuilderProfile>(
    () => ({
      name: profile?.name || "Tenant",
      slug: tenantSlug,
      business_type: profile?.business_type,
      primary_color: profile?.primary_color,
      logo_url: profile?.logo_url,
      about_us: profile?.about_us,
      description: profile?.description,
      whatsapp_number: profile?.whatsapp_number,
      address: profile?.address,
      map_iframe_url: profile?.map_iframe_url,
      open_time: profile?.open_time,
      close_time: profile?.close_time,
      instagram_url: profile?.instagram_url,
      tiktok_url: profile?.tiktok_url,
    }),
    [profile, tenantSlug],
  );

  const filteredResources = useMemo(() => {
    if (!resources) return [];
    return resources.filter(
      (res: any) =>
        res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (res.category || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
    );
  }, [resources, searchQuery]);

  const getBestPrice = (resource: any) => {
    if (
      typeof resource?.starting_price === "number" &&
      Number(resource.starting_price) > 0
    ) {
      return {
        value: Number(resource.starting_price),
        unit:
          resource.starting_price_unit === "hour" ? "Jam" : "Sesi",
      };
    }
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

  if (loading) return <CatalogSkeleton />;

  return (
    <div
      className={cn(
        "min-h-screen pb-24 font-plus-jakarta transition-colors duration-500",
        surfaceClass,
      )}
    >
      <TenantNavbar
        profile={{
          name: resolvedProfile.name,
          business_type: resolvedProfile.business_type,
          primary_color: resolvedProfile.primary_color,
          logo_url: resolvedProfile.logo_url,
        }}
        landingTheme={{
          primary: activeTheme.primary_color,
          accent: activeTheme.accent_color,
          preset: activeTheme.preset,
          radiusStyle: activeTheme.radius_style,
        }}
      />

      <header className="relative overflow-hidden px-6 pb-16 pt-36 md:pb-20 md:pt-44">
        <div className="max-w-7xl mx-auto relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="h-1 w-8 rounded-full"
              style={{ backgroundColor: activeTheme.primary_color }}
            />
            <span className={themeVisuals.eyebrowClass}>Available Units</span>
          </div>
          <h1
            className={cn(
              "text-4xl font-[1000] uppercase italic tracking-tighter leading-[0.85] md:text-7xl",
              themeVisuals.heroTitleClass,
            )}
          >
            READY TO <br />
            <span style={{ color: activeTheme.primary_color }}>EXPLORE.</span>
          </h1>
        </div>
      </header>

      <div className="relative z-30 mx-auto -mt-8 max-w-7xl px-6">
        <div
          className={cn(
            themeVisuals.panelClass,
            "flex items-center gap-2 rounded-2xl p-2 shadow-2xl md:rounded-3xl",
          )}
        >
          <div className={cn("pl-4", themeVisuals.mutedClass)}>
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Cari unit atau kategori..."
            className={cn(
              "h-12 flex-1 border-none bg-transparent text-xs font-bold uppercase italic tracking-tight outline-none focus:ring-0",
              themeVisuals.titleClass,
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-xl",
              themeVisuals.secondaryButtonClass,
            )}
          >
            <Filter size={18} />
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-12">
        {filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((res: any) => (
              <ResourceCard
                key={res.id}
                res={res}
                primaryColor={activeTheme.primary_color}
                accentColor={activeTheme.accent_color}
                preset={activeTheme.preset}
                radiusStyle={activeTheme.radius_style}
                viewport="desktop"
                getBestPrice={getBestPrice}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6 py-40 text-center">
            <LayoutGrid size={64} className="mx-auto opacity-10" />
            <p
              className={cn(
                "text-[10px] font-black uppercase tracking-[0.4em] opacity-30 italic",
                themeVisuals.mutedClass,
              )}
            >
              No units found for your search
            </p>
          </div>
        )}
      </main>

      <TenantFooter
        profile={resolvedProfile}
        primaryColor={activeTheme.primary_color}
        accentColor={activeTheme.accent_color}
        preset={activeTheme.preset}
        radiusStyle={activeTheme.radius_style}
      />
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="min-h-screen bg-white px-6 pb-24 pt-36 dark:bg-[#050505]">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-24 w-full max-w-2xl" />
        </div>
        <Skeleton className="h-16 w-full rounded-3xl" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[440px] rounded-[2rem]" />
          ))}
        </div>
      </div>
    </div>
  );
}
