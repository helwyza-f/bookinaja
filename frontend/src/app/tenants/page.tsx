"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, Sparkles, Building2, Store } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getTenantUrl } from "@/lib/tenant";

type TenantCard = {
  id: string;
  name: string;
  slug: string;
  business_category?: string;
  business_type?: string;
  tagline?: string;
  slogan?: string;
  about_us?: string;
  primary_color?: string;
  logo_url?: string;
  banner_url?: string;
};

const CATEGORIES = ["Semua", "Olahraga", "Klinik", "Studio", "F&B", "Layanan"];

export default function TenantsDirectoryPage() {
  const [tenants, setTenants] = useState<TenantCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await api.get("/public/tenants");
        if (active) setTenants(res.data?.items || []);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const matchesQuery = [tenant.name, tenant.slug, tenant.business_category, tenant.business_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
        
      const matchesCategory = activeCategory === "Semua" || 
        (tenant.business_category?.toLowerCase() === activeCategory.toLowerCase());
        
      return matchesQuery && matchesCategory;
    });
  }, [query, tenants, activeCategory]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#050505] dark:text-white pb-24 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 inset-x-0 h-[60vh] bg-gradient-to-b from-blue-600/10 via-indigo-500/5 to-transparent dark:from-blue-600/10 dark:via-indigo-500/5 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 md:px-6 lg:px-8">
        
        {/* Header Section */}
        <section className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400 mb-6 backdrop-blur-md shadow-sm">
            <Sparkles className="h-4 w-4" />
            Eksplorasi Tenant
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-tight md:text-6xl md:leading-none mb-6">
            Temukan tempat <br className="hidden md:block"/> favoritmu di Bookinaja.
          </h1>
          <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
            Dari lapangan olahraga hingga klinik kesehatan. Jelajahi berbagai layanan yang tersedia dan lakukan reservasi dengan satu akun global Bookinaja.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 px-8 h-14 font-semibold text-sm">
              <Link href="/user/login">Masuk sebagai Customer</Link>
            </Button>
          </div>
        </section>

        {/* Search & Filter Section */}
        <section className="sticky top-4 z-20 mb-12 flex flex-col md:flex-row gap-4 items-center justify-between p-4 rounded-[2rem] bg-white/70 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="relative w-full md:w-96">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama tempat, kategori..."
              className="h-14 rounded-2xl pl-12 bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 text-base shadow-sm"
            />
          </div>
          
          <div className="flex w-full md:w-auto overflow-x-auto gap-2 pb-2 md:pb-0 scrollbar-none snap-x">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "snap-center whitespace-nowrap rounded-xl px-5 py-3 text-[11px] font-bold uppercase tracking-wider transition-all duration-300",
                  activeCategory === cat 
                    ? "bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900" 
                    : "bg-white text-slate-500 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Tenant Grid */}
        <section className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-[420px] rounded-[2.5rem] bg-white/50 dark:bg-white/5 backdrop-blur-sm"
                />
              ))
            : filtered.map((tenant) => (
                <Card
                  key={tenant.id}
                  className="group relative overflow-hidden rounded-[2.5rem] border-0 bg-white shadow-xl shadow-slate-200/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl dark:bg-[#0A0A0A] dark:shadow-none dark:ring-1 dark:ring-white/10"
                >
                  <div
                    className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-40 dark:opacity-20"
                    style={{
                      backgroundImage: tenant.banner_url
                        ? `url(${tenant.banner_url})`
                        : "linear-gradient(135deg, rgba(59,130,246,0.8), rgba(99,102,241,0.8))",
                    }}
                  />
                  <div className="absolute inset-0 z-0 bg-gradient-to-t from-white via-white/95 to-white/40 dark:from-[#0A0A0A] dark:via-[#0A0A0A]/95 dark:to-[#0A0A0A]/40" />
                  
                  <CardContent className="relative z-10 flex h-full flex-col p-6">
                    <div className="flex justify-between items-start mb-6 pt-32">
                      {tenant.primary_color ? (
                        <div
                          className="h-14 w-14 rounded-2xl border-2 border-white dark:border-[#0A0A0A] shadow-lg flex items-center justify-center text-white font-black text-xl"
                          style={{ backgroundColor: tenant.primary_color }}
                        >
                          {tenant.name.charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <div className="h-14 w-14 rounded-2xl bg-slate-900 border-2 border-white dark:border-[#0A0A0A] shadow-lg flex items-center justify-center text-white">
                          <Building2 className="h-6 w-6" />
                        </div>
                      )}
                      
                      <div className="bg-white/80 dark:bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                         <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
                          {tenant.business_category || "Layanan"}
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white line-clamp-2">
                        {tenant.name}
                      </h2>
                      <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                        <Store className="h-3.5 w-3.5" />
                        bookinaja.com/{tenant.slug}
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3 mb-6 flex-grow">
                      {tenant.tagline ||
                        tenant.slogan ||
                        tenant.about_us ||
                        "Mitra resmi terdaftar di platform Bookinaja."}
                    </p>

                    <Button asChild className="w-full h-12 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 shadow-lg mt-auto group-hover:bg-blue-600 dark:group-hover:bg-blue-500 transition-colors">
                      <a href={getTenantUrl(tenant.slug)}>
                        Kunjungi Cabang
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
        </section>

        {!loading && filtered.length === 0 && (
          <div className="mt-12 rounded-[3rem] border border-dashed border-slate-300 dark:border-white/10 p-16 text-center bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 mb-6">
              <Search className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">
              Tidak Ditemukan
            </h3>
            <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Maaf, tenant dengan kata kunci atau kategori tersebut belum terdaftar di Bookinaja.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
