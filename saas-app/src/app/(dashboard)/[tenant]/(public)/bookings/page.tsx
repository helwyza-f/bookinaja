"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Gamepad2,
  Zap,
  ChevronRight,
  LayoutGrid,
  PlusCircle,
  Search,
  Filter,
  ArrowRight,
  Star,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

const THEMES: Record<string, any> = {
  gaming_hub: { primary: "#3b82f6", bg: "bg-blue-600" },
  creative_space: { primary: "#f43f5e", bg: "bg-rose-600" },
  sport_center: { primary: "#10b981", bg: "bg-emerald-600" },
  social_space: { primary: "#6366f1", bg: "bg-indigo-600" },
};

export default function PublicResourceCatalog() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await api.get(`/public/landing?slug=${tenantSlug}`);
        setData(res.data);
      } catch (err) {
        toast.error("Gagal memuat katalog unit");
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, [tenantSlug]);

  const activeTheme = useMemo(() => {
    const cat = data?.profile?.business_category || "social_space";
    return THEMES[cat] || THEMES.social_space;
  }, [data]);

  const filteredResources = useMemo(() => {
    if (!data?.resources) return [];
    return data.resources.filter(
      (res: any) =>
        res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.category.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [data, searchQuery]);

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

  if (loading) return <CatalogSkeleton />;

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] font-plus-jakarta pb-24 transition-colors duration-500">
      {/* COMPACT MINIMALIST HEADER */}
      <header className="relative pt-12 pb-20 px-6 overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 opacity-10 dark:opacity-20",
            activeTheme.bg,
          )}
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 85%, 0% 100%)" }}
        />

        <div className="max-w-7xl mx-auto relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className={cn("h-1 w-8 rounded-full", activeTheme.bg)} />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">
              Available Units
            </span>
          </div>
          <h1 className="text-4xl md:text-7xl font-[1000] uppercase italic tracking-tighter leading-[0.85] dark:text-white">
            READY TO <br />
            <span style={{ color: activeTheme.primary }}>EXPLORE.</span>
          </h1>
        </div>
      </header>

      {/* STICKY SEARCH & FILTER BAR */}
      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-30">
        <div className="bg-white dark:bg-[#0c0c0c] p-2 rounded-2xl md:rounded-3xl shadow-2xl border border-slate-100 dark:border-white/5 flex items-center gap-2">
          <div className="pl-4 text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Cari unit atau kategori..."
            className="flex-1 bg-transparent border-none focus:ring-0 font-bold uppercase italic text-xs tracking-tight h-12 outline-none dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl h-10 w-10 text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
          >
            <Filter size={18} />
          </Button>
        </div>
      </div>

      {/* GRID CATALOG */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
            {filteredResources.map((res: any) => (
              <ResourceCard
                key={res.id}
                res={res}
                primaryColor={activeTheme.primary}
                getBestPrice={getBestPrice}
              />
            ))}
          </div>
        ) : (
          <div className="py-40 text-center space-y-6">
            <LayoutGrid size={64} className="mx-auto opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 italic">
              No units found for your search
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// REFACTORED RESOURCE CARD (From your concept)
function ResourceCard({ res, primaryColor, getBestPrice }: any) {
  const bestRate = getBestPrice(res);

  return (
    <Link
      href={`/bookings/${res.id}`}
      className="group block w-full outline-none focus:ring-0"
    >
      <Card className="relative h-[360px] md:h-[440px] rounded-[2.5rem] border-none bg-white dark:bg-[#0a0a0a] overflow-hidden transition-all duration-500 hover:-translate-y-2 group-active:scale-[0.98] shadow-lg hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] ring-1 ring-black/5 dark:ring-white/5">
        {/* Visual Preview (55%) */}
        <div className="relative h-[55%] w-full overflow-hidden bg-slate-100 dark:bg-white/5">
          {res.image_url ? (
            <img
              src={res.image_url}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              alt={res.name}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <Zap size={40} />
            </div>
          )}

          <div className="absolute top-5 left-5 z-20">
            <Badge className="bg-black/60 backdrop-blur-xl text-white border border-white/10 text-[8px] font-black uppercase italic tracking-[0.2em] px-3 py-1.5 rounded-lg">
              {res.category}
            </Badge>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0 z-30">
            <div className="bg-white text-black px-6 py-2.5 rounded-full font-black italic uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-2xl">
              Select Unit <ArrowRight size={14} strokeWidth={3} />
            </div>
          </div>
        </div>

        {/* Info Section (45%) */}
        <div className="p-6 md:p-8 flex flex-col justify-between h-[45%] relative">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl md:text-2xl font-[1000] uppercase italic tracking-tighter leading-none text-slate-900 dark:text-white truncate pr-2">
                {res.name}
              </h3>
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-lg">
                <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                <span className="text-[9px] font-black text-slate-400">
                  4.9
                </span>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 line-clamp-2 italic uppercase tracking-tight leading-relaxed">
              {res.description ||
                "Premium asset configured for high-performance use cases."}
            </p>
          </div>

          <div className="flex items-end justify-between border-t border-slate-50 dark:border-white/5 pt-5">
            <div className="space-y-1">
              <p className="text-[8px] font-[1000] uppercase tracking-[0.3em] text-slate-400 italic leading-none">
                Starting from
              </p>
              {bestRate ? (
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-2xl font-[1000] italic leading-none tracking-tighter"
                    style={{ color: primaryColor }}
                  >
                    Rp{bestRate.value.toLocaleString()}
                  </span>
                  <span className="text-[9px] opacity-30 font-black uppercase italic">
                    /{bestRate.unit}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] font-black opacity-30 italic uppercase">
                  Contact Staff
                </span>
              )}
            </div>

            <div
              className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all duration-500 group-hover:rotate-12"
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 12px 24px -8px ${primaryColor}88`,
              }}
            >
              <Zap size={20} fill="currentColor" strokeWidth={0} />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function CatalogSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-black p-6 md:p-12 space-y-12">
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full max-w-lg" />
      </div>
      <Skeleton className="h-14 w-full max-w-4xl rounded-3xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[400px] rounded-[2.5rem]" />
        ))}
      </div>
    </div>
  );
}
