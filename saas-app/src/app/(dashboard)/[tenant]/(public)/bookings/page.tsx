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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

// --- THEME ENGINE ---
const THEMES: Record<string, any> = {
  gaming_hub: {
    primary: "text-blue-500",
    bgPrimary: "bg-blue-600",
    accent: "bg-blue-600/10",
  },
  creative_space: {
    primary: "text-rose-500",
    bgPrimary: "bg-rose-600",
    accent: "bg-rose-600/10",
  },
  sport_center: {
    primary: "text-emerald-500",
    bgPrimary: "bg-emerald-600",
    accent: "bg-emerald-600/10",
  },
  social_space: {
    primary: "text-indigo-500",
    bgPrimary: "bg-indigo-600",
    accent: "bg-indigo-600/10",
  },
};

export default function PublicResourceCatalog() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const tenantSlug = params.tenant as string;

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        // Mengambil data landing yang berisi profile & resources
        const res = await api.get(`/public/landing?slug=${tenantSlug}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Gagal memuat katalog unit");
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, [tenantSlug]);

  const activeTheme = useMemo(() => {
    const cat = data?.profile?.business_category || "gaming_hub";
    return THEMES[cat] || THEMES.gaming_hub;
  }, [data]);

  const filteredResources = useMemo(() => {
    if (!data?.resources) return [];
    return data.resources.filter(
      (res: any) =>
        res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.category.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [data, searchQuery]);

  // Logic: Ambil harga paling rendah dari item tipe main_option atau main
  const getCheapestPrice = (resource: any) => {
    if (!resource.items || resource.items.length === 0) return 0;
    const mains = resource.items.filter(
      (i: any) => i.item_type === "main_option" || i.item_type === "main",
    );
    const targetList = mains.length > 0 ? mains : resource.items;
    return Math.min(...targetList.map((i: any) => i.price || 0));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] font-plus-jakarta pb-20 selection:bg-blue-600/30">
      {/* --- DYNAMIC HEADER --- */}
      <div
        className={cn(
          "pt-20 pb-32 px-6 rounded-b-[3.5rem] md:rounded-b-[5rem] text-white relative overflow-hidden shadow-2xl transition-all duration-700",
          activeTheme.bgPrimary,
        )}
      >
        <Zap className="absolute -right-20 -top-20 h-96 w-96 opacity-10 rotate-12" />
        <div className="max-w-6xl mx-auto relative z-10 text-center space-y-6">
          <Badge className="bg-white/20 backdrop-blur-md text-white border-white/20 px-6 py-1.5 rounded-full font-black italic uppercase text-[10px] tracking-[0.3em]">
            Booking Catalog
          </Badge>
          <h1 className="text-5xl md:text-8xl font-[950] italic uppercase tracking-tighter leading-none drop-shadow-xl">
            PILIH <span className="opacity-50 text-white">UNIT</span> <br />
            ANDALANMU
          </h1>
        </div>
      </div>

      {/* --- SEARCH BAR --- */}
      <div className="max-w-4xl mx-auto px-6 -translate-y-10 relative z-30">
        <div className="bg-white dark:bg-[#111] p-2 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-white/5 flex items-center gap-2">
          <div className="pl-6 text-slate-400">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Cari unit..."
            className="flex-1 bg-transparent border-none focus:ring-0 font-bold uppercase italic text-sm tracking-tight h-14 outline-none text-slate-900 dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button
            className={cn(
              "rounded-2xl h-12 w-12 p-0 shadow-lg shrink-0 text-white border-none",
              activeTheme.bgPrimary,
            )}
          >
            <Filter size={20} />
          </Button>
        </div>
      </div>

      {/* --- GRID KATALOG --- */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {filteredResources.map((res: any) => {
              const mainItems =
                res.items?.filter(
                  (i: any) =>
                    i.item_type === "main_option" || i.item_type === "main",
                ) || [];
              const addonItems =
                res.items?.filter((i: any) => i.item_type === "add_on") || [];

              return (
                /* FIX: URL mengarah ke /booking/[id] karena proxy sudah menghandle tenant slug */
                <Link
                  key={res.id}
                  href={`/bookings/${res.id}`}
                  className="group block h-full"
                >
                  <Card className="h-full rounded-[3rem] border-none bg-white dark:bg-[#111] shadow-xl hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 hover:-translate-y-3 overflow-hidden flex flex-col ring-1 ring-slate-100 dark:ring-white/5">
                    {/* Visual Preview */}
                    <div className="h-44 bg-slate-100 dark:bg-white/5 relative overflow-hidden flex items-center justify-center">
                      {res.image_url ? (
                        <img
                          src={res.image_url}
                          alt={res.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <Gamepad2 className="h-16 w-16 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#111] via-transparent to-transparent opacity-60" />
                      <Badge
                        className={cn(
                          "absolute top-6 left-6 font-[900] italic text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-xl border-none shadow-lg text-white",
                          activeTheme.bgPrimary,
                        )}
                      >
                        {res.category}
                      </Badge>
                    </div>

                    {/* Content Section */}
                    <div className="p-8 flex-1 flex flex-col space-y-6">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-[950] italic uppercase tracking-tighter leading-none text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {res.name}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed line-clamp-2">
                          {res.description ||
                            "High-performance setup for your best experience."}
                        </p>
                      </div>

                      {/* Hardware / Main Specs */}
                      <div className="flex flex-wrap gap-2">
                        {mainItems.slice(0, 2).map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-white/5"
                          >
                            <div
                              className={cn(
                                "h-1.5 w-1.5 rounded-full animate-pulse",
                                activeTheme.bgPrimary,
                              )}
                            />
                            <span className="text-[9px] font-black uppercase italic tracking-tighter">
                              {item.name}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Addon Preview */}
                      <div className="space-y-3 flex-1 pt-2 border-t border-slate-50 dark:border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2 italic">
                          <PlusCircle size={10} /> Add-ons available
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {addonItems.length > 0 ? (
                            addonItems.slice(0, 3).map((item: any) => (
                              <span
                                key={item.id}
                                className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase italic"
                              >
                                • {item.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] font-bold text-slate-300 uppercase italic opacity-50">
                              Standard Pack
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer Info */}
                      <div className="pt-6 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1 italic">
                            Best Price
                          </p>
                          <p
                            className={cn(
                              "text-2xl font-[950] italic tracking-tighter leading-none",
                              activeTheme.primary,
                            )}
                          >
                            Rp {getCheapestPrice(res).toLocaleString()}
                            <span className="text-[10px] font-bold text-slate-400 lowercase italic opacity-50">
                              {" "}
                              /hr
                            </span>
                          </p>
                        </div>
                        <div
                          className={cn(
                            "h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all duration-300 group-hover:rotate-12 group-hover:scale-110",
                            activeTheme.bgPrimary,
                          )}
                        >
                          <ChevronRight className="h-6 w-6 stroke-[3]" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState activeTheme={activeTheme} />
        )}
      </main>
    </div>
  );
}

// --- LOADING SPINNER ---
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#050505]">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-t-4 border-blue-600 animate-spin" />
          <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 h-8 w-8 animate-pulse" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 italic animate-pulse">
          Establishing Connection...
        </p>
      </div>
    </div>
  );
}

// --- EMPTY STATE ---
function EmptyState({ activeTheme }: any) {
  return (
    <div className="py-40 text-center space-y-6 bg-white dark:bg-white/5 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-white/5 animate-in fade-in zoom-in duration-700">
      <div className="flex justify-center opacity-10">
        <LayoutGrid size={100} strokeWidth={1} />
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-[950] uppercase italic tracking-tighter">
          No Spot Available
        </h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
          Coba cari dengan kata kunci lain atau cek kategori berbeda.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => window.location.reload()}
        className="rounded-full font-black uppercase italic tracking-widest text-[10px] px-8 py-6 h-auto"
      >
        Refresh Catalog
      </Button>
    </div>
  );
}
