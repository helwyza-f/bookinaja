"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Clock,
  Star,
  Loader2,
  ArrowRight,
  Image as ImageIcon,
  Gamepad2,
  Zap,
  Camera,
  Trophy,
  Briefcase,
  ChevronRight,
  Phone,
  Info,
  Moon,
  Sun,
  Share2,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  Monitor,
  AtSign,
  Sparkles,
  Layers,
  ArrowDown,
  Navigation,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * --- ASSETS & THEME ENGINE ---
 * Mendefinisikan vibe visual berdasarkan kategori bisnis tenant.
 */

const FALLBACK_ASSETS: Record<string, any> = {
  gaming_hub: {
    banner:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070",
    icon: Gamepad2,
    tagline: "Arena Gaming Standar Pro",
    features: ["Internet 1Gbps", "RTX 4090 Ready", "Comfort Chair"],
    copy: "Tempat di mana para jawara berkumpul. Spesifikasi hardware rata kanan untuk performa kompetitif maksimal.",
  },
  creative_space: {
    banner:
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070",
    icon: Camera,
    tagline: "Ruang Karya Tanpa Batas",
    features: ["Lighting Godox", "Acoustic Room", "Private Set"],
    copy: "Setiap sudut dirancang untuk estetika visual. Abadikan momen atau ciptakan konten profesional di sini.",
  },
  sport_center: {
    banner:
      "https://images.unsplash.com/photo-1541252260730-0412e3e2104e?q=80&w=2070",
    icon: Trophy,
    tagline: "Pusat Olahraga & Komunitas",
    features: ["Vinyl Court", "Shower Room", "Spacious Area"],
    copy: "Kualitas lapangan standar internasional untuk kesehatan dan hobi Anda. Main lebih nyaman, menang lebih bangga.",
  },
  social_space: {
    banner:
      "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?q=80&w=2070",
    icon: Briefcase,
    tagline: "Kolaborasi & Produktivitas",
    features: ["Fast Wi-Fi", "Focus Zone", "Free Coffee"],
    copy: "Bekerja jadi lebih dari sekadar rutinitas. Nikmati suasana kantor yang homey dengan komunitas yang inklusif.",
  },
};

const THEMES: Record<string, any> = {
  gaming_hub: {
    name: "Cyber Blue",
    primary: "text-blue-500",
    bgPrimary: "bg-blue-600",
    gradient: "from-blue-600/30 via-transparent to-transparent",
    accent: "border-blue-500/20",
    glow: "shadow-blue-500/20",
  },
  creative_space: {
    name: "Rose Aesthetic",
    primary: "text-rose-500",
    bgPrimary: "bg-rose-600",
    gradient: "from-rose-600/30 via-transparent to-transparent",
    accent: "border-rose-500/20",
    glow: "shadow-rose-500/20",
  },
  sport_center: {
    name: "Emerald Sport",
    primary: "text-emerald-500",
    bgPrimary: "bg-emerald-600",
    gradient: "from-emerald-600/30 via-transparent to-transparent",
    accent: "border-emerald-500/20",
    glow: "shadow-emerald-500/20",
  },
  social_space: {
    name: "Indigo Class",
    primary: "text-indigo-500",
    bgPrimary: "bg-indigo-600",
    gradient: "from-indigo-600/30 via-transparent to-transparent",
    accent: "border-indigo-500/20",
    glow: "shadow-indigo-500/20",
  },
};

export default function TenantPublicLanding() {
  const params = useParams();
  const { theme, setTheme } = useTheme();

  // Handling dynamic slug (minibos.bookinaja.com)
  const tenantSlug = (params.tenant as string).split(".")[0];

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // --- LOGIC: FETCHING & SCROLL ---

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);

    api
      .get(`/public/landing?slug=${tenantSlug}`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => window.removeEventListener("scroll", handleScroll);
  }, [tenantSlug]);

  // --- LOGIC: PRICE ENGINE (Best Rate Calculation) ---
  const getBestPrice = (resource: any) => {
    if (!resource.items || resource.items.length === 0) return null;

    // Cari item dengan tipe 'console_option' atau 'main' yang harganya terendah
    const mainItems = resource.items.filter(
      (i: any) => i.item_type === "console_option" || i.item_type === "main",
    );
    if (mainItems.length === 0) return null;

    const lowest = mainItems.reduce((prev: any, curr: any) =>
      prev.price < curr.price ? prev : curr,
    );

    return {
      value: lowest.price,
      unit:
        lowest.price_unit === "hour"
          ? "Jam"
          : lowest.price_unit === "day"
            ? "Hari"
            : "Sesi",
    };
  };

  const activeTheme = useMemo(() => {
    const cat = data?.profile?.business_category || "social_space";
    return THEMES[cat] || THEMES.social_space;
  }, [data]);

  const fallback = useMemo(() => {
    const cat = data?.profile?.business_category || "social_space";
    return FALLBACK_ASSETS[cat] || FALLBACK_ASSETS.social_space;
  }, [data]);

  if (!mounted) return null;

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
        <div className="relative flex flex-col items-center">
          <div className="h-32 w-32 rounded-full border-t-2 border-blue-500 animate-spin" />
          <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-blue-500 animate-pulse" />
          <p className="mt-10 font-black uppercase tracking-[0.5em] text-[10px] text-slate-500 animate-pulse">
            Establishing Connection...
          </p>
        </div>
      </div>
    );

  if (!data?.profile) return <NotFoundState />;

  const { profile, resources } = data;
  const CategoryIcon = fallback.icon;

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-slate-900 dark:text-white font-plus-jakarta selection:bg-blue-600/30">
      {/* --- SCROLL PROGRESS BAR --- */}
      <div
        className={cn(
          "fixed top-0 left-0 h-1 z-[100] transition-all duration-300",
          activeTheme.bgPrimary,
        )}
        style={{ width: `${scrollProgress}%` }}
      />

      {/* --- PREMIUM NAVIGATION --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-black/40 backdrop-blur-2xl border-b border-slate-200 dark:border-white/5 h-20 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-2xl rotate-3",
              activeTheme.bgPrimary,
            )}
          >
            {profile.logo_url ? (
              <img
                src={profile.logo_url}
                className="w-full h-full object-cover rounded-xl"
                alt="Logo"
              />
            ) : (
              <CategoryIcon className="h-5 w-5" />
            )}
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-black uppercase italic tracking-tighter text-lg">
              {profile.name}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
              {profile.business_type || "Exclusive Partner"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full h-10 w-10 border border-slate-200 dark:border-white/10"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-yellow-500" />
            ) : (
              <Moon className="h-4 w-4 text-blue-600" />
            )}
          </Button>
          <Link href="/admin/login">
            <Button
              size="sm"
              className="hidden md:flex rounded-full font-black text-[10px] uppercase tracking-widest bg-slate-900 dark:bg-white text-white dark:text-black hover:scale-105 transition-all px-6"
            >
              Owner Access
            </Button>
          </Link>
        </div>
      </nav>

      {/* --- HERO: THE MASTERPIECE --- */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Dynamic Canvas */}
        <div className="absolute inset-0">
          <img
            src={profile.banner_url || fallback.banner}
            className="w-full h-full object-cover opacity-60 dark:opacity-40 scale-110 motion-safe:animate-[pulse_8s_ease-in-out_infinite]"
            alt="Main Visual"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 dark:via-black/80 to-white dark:to-[#050505]" />
          <div
            className={cn("absolute inset-0 opacity-20", activeTheme.gradient)}
          />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-20">
          <div className="flex flex-col items-center text-center space-y-10">
            <Badge
              className={cn(
                "px-6 py-2 rounded-full font-black text-[11px] uppercase tracking-[0.4em] italic shadow-2xl text-white border-none",
                activeTheme.bgPrimary,
              )}
            >
              <Sparkles className="h-3 w-3 mr-2 fill-current" />{" "}
              {fallback.tagline}
            </Badge>

            <h1 className="text-[14vw] md:text-[12rem] font-black uppercase italic tracking-tighter leading-[0.75] drop-shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
              {profile.name.split(" ")[0]}
              <br />
              <span
                className={cn("opacity-20 stroke-text", activeTheme.primary)}
              >
                {profile.name.split(" ").slice(1).join(" ") || "Experience"}
              </span>
            </h1>

            <div className="max-w-2xl space-y-8">
              <p className="text-xl md:text-3xl font-bold italic opacity-70 leading-relaxed tracking-tight">
                "{profile.slogan || fallback.copy}"
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {fallback.features.map((f: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-xl backdrop-blur-md"
                  >
                    <CheckCircle2
                      className={cn("h-4 w-4", activeTheme.primary)}
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {f}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-10">
              <Link href="#catalog" className="w-full sm:w-auto">
                <Button
                  className={cn(
                    "w-full h-20 md:h-24 px-12 md:px-20 rounded-[2.5rem] font-black uppercase italic text-lg tracking-widest shadow-2xl border-none text-white transition-all hover:scale-105 active:scale-95",
                    activeTheme.bgPrimary,
                  )}
                >
                  Book Now <ArrowUpRight className="ml-3 h-8 w-8 stroke-[3]" />
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full sm:w-auto h-20 md:h-24 px-10 rounded-[2.5rem] border-4 font-black uppercase italic text-sm tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
              >
                Location Info <Navigation className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll Hint */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-30">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] italic">
            Scroll Down
          </span>
          <div className="h-10 w-[2px] bg-foreground animate-bounce" />
        </div>
      </section>

      {/* --- BUSINESS FLOW SECTION --- */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div
              className={cn("h-1 w-12 rounded-full", activeTheme.bgPrimary)}
            />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
              Operating Hours
            </p>
            <h4 className="text-2xl font-black italic uppercase tracking-tighter">
              {profile.open_time} <span className="opacity-30">TO</span>{" "}
              {profile.close_time}
            </h4>
          </div>
          <div className="space-y-4">
            <div className="h-1 w-12 rounded-full bg-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
              Verified Business
            </p>
            <h4 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2 text-emerald-500">
              Trusted <ShieldCheck className="h-6 w-6" />
            </h4>
          </div>
          <div className="space-y-4">
            <div className="h-1 w-12 rounded-full bg-yellow-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
              Global Rating
            </p>
            <h4 className="text-2xl font-black italic uppercase tracking-tighter">
              4.98{" "}
              <Star className="h-5 w-5 inline-block fill-yellow-500 text-yellow-500 -mt-1 ml-1" />
            </h4>
          </div>
          <div className="space-y-4">
            <div className="h-1 w-12 rounded-full bg-slate-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
              Base Location
            </p>
            <h4 className="text-lg font-black italic uppercase tracking-tighter truncate">
              {profile.address || "Batam City, Indonesia"}
            </h4>
          </div>
        </div>
      </section>

      {/* --- CATALOG: THE SELECTION --- */}
      <section id="catalog" className="py-40 bg-slate-50 dark:bg-white/[0.02]">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-24">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div
                  className={cn("h-4 w-4 rounded-full", activeTheme.bgPrimary)}
                />
                <span className="text-xs font-black uppercase tracking-[0.5em] opacity-40">
                  Choose your unit
                </span>
              </div>
              <h2 className="text-6xl md:text-9xl font-black uppercase italic tracking-tighter leading-none">
                Reservasi <br />{" "}
                <span className={activeTheme.primary}>Instan.</span>
              </h2>
            </div>

            <div className="flex items-center gap-4 bg-white dark:bg-black p-4 rounded-3xl shadow-xl border border-slate-200 dark:border-white/5">
              <div className="text-right">
                <p className="text-[9px] font-black uppercase opacity-40 italic">
                  Available today
                </p>
                <p className="text-lg font-black italic leading-none">
                  {resources.length} Units Ready
                </p>
              </div>
              <div
                className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center text-white",
                  activeTheme.bgPrimary,
                )}
              >
                <Layers className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {resources.map((res: any, idx: number) => {
              const bestRate = getBestPrice(res);

              return (
                <Link
                  key={res.id}
                  href={`/booking/${res.id}`}
                  className="group relative"
                >
                  <Card className="h-full rounded-[3.5rem] border-none bg-white dark:bg-[#111] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] dark:shadow-none hover:shadow-2xl transition-all duration-700 hover:-translate-y-4 overflow-hidden group/card ring-1 ring-slate-100 dark:ring-white/5">
                    {/* Unit Image Preview */}
                    <div className="relative h-72 overflow-hidden">
                      {res.image_url ? (
                        <img
                          src={res.image_url}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                          alt={res.name}
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                          <CategoryIcon className="h-20 w-20 opacity-10" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#111] via-transparent to-transparent" />
                      <Badge className="absolute top-6 left-6 bg-white/90 dark:bg-black/90 backdrop-blur text-slate-900 dark:text-white font-black italic text-[9px] px-4 py-1.5 rounded-lg border-none shadow-xl uppercase tracking-widest">
                        {res.category || "Standard"}
                      </Badge>
                      <div
                        className={cn(
                          "absolute bottom-6 right-6 h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-xl opacity-0 group-hover/card:opacity-100 translate-y-4 group-hover/card:translate-y-0 transition-all duration-500",
                          activeTheme.bgPrimary,
                        )}
                      >
                        <ArrowRight className="h-6 w-6 stroke-[3]" />
                      </div>
                    </div>

                    <CardContent className="p-10 pt-4 space-y-8 flex flex-col h-[320px]">
                      <div className="flex-1 space-y-4">
                        <h3 className="text-4xl font-black uppercase italic tracking-tighter leading-[0.9] pr-10">
                          {res.name}
                        </h3>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 italic line-clamp-3">
                          {res.description ||
                            "Dilengkapi dengan fasilitas kenyamanan tinggi dan privasi terjaga untuk performa terbaik Anda."}
                        </p>
                      </div>

                      <div className="pt-8 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                            Mulai Dari
                          </p>
                          {bestRate ? (
                            <h4 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                              Rp {bestRate.value.toLocaleString()}{" "}
                              <span className="text-xs opacity-30 italic">
                                / {bestRate.unit}
                              </span>
                            </h4>
                          ) : (
                            <Badge variant="destructive">Coming Soon</Badge>
                          )}
                        </div>
                        <div
                          className={cn(
                            "h-14 w-14 rounded-full flex items-center justify-center border-4 group-hover/card:bg-slate-900 group-hover/card:text-white dark:group-hover/card:bg-white dark:group-hover/card:text-black transition-all",
                            activeTheme.accent,
                          )}
                        >
                          <ChevronRight className="h-6 w-6 stroke-[3]" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* --- ATMOSPHERE: THE GALLERY --- */}
      {profile.gallery && profile.gallery.length > 0 && (
        <section className="py-40 bg-white dark:bg-[#050505]">
          <div className="container mx-auto px-6">
            <div className="text-center mb-24 space-y-6">
              <div className="inline-flex items-center gap-3 bg-slate-100 dark:bg-white/5 px-6 py-2 rounded-full mb-4">
                <ImageIcon className="h-4 w-4 text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] italic">
                  Visual Identity
                </span>
              </div>
              <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter">
                Ruang <span className={activeTheme.primary}>Inspirasi.</span>
              </h2>
              <p className="text-sm md:text-lg font-bold opacity-40 uppercase tracking-[0.2em] italic max-w-xl mx-auto">
                Rasakan atmosfer premium dari dokumentasi asli fasilitas kami.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-12 gap-4 md:gap-8">
              {profile.gallery.map((img: string, i: number) => {
                // Mewah: Layout Masonry Berdasarkan Index
                const isLarge = i % 3 === 0;
                const colSpan = isLarge ? "md:col-span-8" : "md:col-span-4";

                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-[3rem] overflow-hidden group relative cursor-pointer aspect-square md:aspect-auto md:h-[500px] border-4 border-slate-100 dark:border-white/5 shadow-2xl",
                      colSpan,
                    )}
                  >
                    <img
                      src={img}
                      className="w-full h-full object-cover transition-all duration-[1s] group-hover:scale-110 group-hover:rotate-2"
                      alt="Gallery"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center p-12 text-center">
                      <div
                        className={cn(
                          "h-16 w-16 rounded-2xl flex items-center justify-center text-white mb-6 scale-50 group-hover:scale-100 transition-all duration-700 delay-100 shadow-3xl",
                          activeTheme.bgPrimary,
                        )}
                      >
                        <Zap className="h-8 w-8 fill-current" />
                      </div>
                      <p className="text-white font-black uppercase italic tracking-[0.3em] text-sm">
                        Experience {profile.name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* --- CTA: FINAL CONVERSION --- */}
      <section className="container mx-auto px-6 py-40">
        <Card
          className={cn(
            "rounded-[4rem] md:rounded-[6rem] p-12 md:p-32 text-center relative overflow-hidden border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] text-white group",
            activeTheme.bgPrimary,
          )}
        >
          {/* Background Decorative Icons */}
          <Zap className="absolute -left-20 -top-20 h-[500px] w-[500px] opacity-10 rotate-12 transition-transform group-hover:scale-110 duration-[5s]" />
          <CategoryIcon className="absolute -right-20 -bottom-20 h-[400px] w-[400px] opacity-10 -rotate-12 transition-transform group-hover:rotate-0 duration-[5s]" />

          <div className="relative z-10 space-y-12 max-w-4xl mx-auto">
            <h2 className="text-6xl md:text-[10rem] font-black italic uppercase tracking-tighter leading-[0.8] drop-shadow-2xl">
              Pesan <br /> Slotmu <br /> Sekarang.
            </h2>
            <p className="text-xl md:text-3xl font-bold italic opacity-80 max-w-2xl mx-auto leading-relaxed">
              Jangan tunda produktivitas Anda. Amankan jadwal terbaik sekarang
              sebelum slot penuh oleh pelanggan lain.
            </p>

            <div className="flex flex-col md:flex-row justify-center gap-6 pt-12">
              <Link href="#catalog" className="w-full md:w-auto">
                <Button className="w-full md:w-auto h-24 px-16 rounded-[2.5rem] bg-white text-slate-950 hover:bg-slate-100 font-black uppercase italic tracking-[0.2em] text-xl shadow-4xl hover:scale-105 transition-all active:scale-95">
                  Daftar Unit{" "}
                  <ArrowDown className="ml-3 h-6 w-6 animate-bounce" />
                </Button>
              </Link>
              <Button
                variant="outline"
                className="h-24 px-12 rounded-[2.5rem] border-2 border-white/30 bg-transparent text-white font-black uppercase italic tracking-widest text-sm hover:bg-white hover:text-black transition-all"
              >
                <Phone className="mr-3 h-5 w-5" /> WhatsApp Admin
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* --- PREMIUM FOOTER --- */}
      <footer className="bg-slate-50 dark:bg-black/80 py-32 border-t border-slate-200 dark:border-white/5">
        <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div className="space-y-10">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center text-white",
                  activeTheme.bgPrimary,
                )}
              >
                <CategoryIcon className="h-6 w-6" />
              </div>
              <h3 className="text-4xl font-black italic uppercase tracking-tighter">
                {profile.name}
              </h3>
            </div>
            <p className="text-slate-500 max-w-md font-medium italic leading-loose">
              "
              {profile.description ||
                "Kami berkomitmen memberikan fasilitas reservasi terbaik untuk efisiensi waktu dan kenyamanan hobi Anda."}
              "
            </p>
            <div className="flex gap-4">
              {[AtSign, Share2].map((Icon, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 rounded-2xl border-2 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  <Icon className="h-6 w-6" />
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-6">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">
                Our Menu
              </p>
              <ul className="space-y-4 font-black uppercase italic text-sm tracking-widest">
                <li className="hover:text-blue-500 cursor-pointer transition-colors">
                  Booking Unit
                </li>
                <li className="hover:text-blue-500 cursor-pointer transition-colors">
                  F&B Catalog
                </li>
                <li className="hover:text-blue-500 cursor-pointer transition-colors">
                  Special Offers
                </li>
                <li className="hover:text-blue-500 cursor-pointer transition-colors">
                  Member Access
                </li>
              </ul>
            </div>
            <div className="space-y-6 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">
                Legal Center
              </p>
              <ul className="space-y-4 font-black uppercase italic text-sm tracking-widest opacity-40">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Booking Refund</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 mt-32 pt-12 border-t border-slate-200 dark:border-white/5 text-center space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[1em] opacity-20 leading-none">
            Powered by bookinaja.com — Standardized Booking Engine
          </p>
          <p className="text-[9px] font-bold opacity-10 uppercase tracking-widest">
            All contents protected by digital rights 2026
          </p>
        </div>
      </footer>

      {/* --- MOBILE STICKY ACTION BAR --- */}
      <div className="fixed bottom-8 left-6 right-6 z-[60] md:hidden">
        <Link href="/booking">
          <Button
            className={cn(
              "w-full h-20 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] font-black uppercase italic tracking-widest text-white border-none flex items-center justify-between px-10 group",
              activeTheme.bgPrimary,
            )}
          >
            <span>Pesan Sekarang</span>
            <ArrowRight className="h-6 w-6 animate-pulse group-hover:translate-x-2 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function NotFoundState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-12 text-center bg-slate-950 text-white">
      <div className="h-40 w-40 bg-white/5 rounded-[4rem] flex items-center justify-center mb-12 shadow-inner rotate-12 animate-in zoom-in duration-1000">
        <Monitor className="h-20 w-20 text-slate-700" />
      </div>
      <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none mb-6">
        404 <br /> <span className="text-red-600">Off-Grid.</span>
      </h1>
      <p className="text-slate-400 mb-12 font-bold max-w-sm uppercase text-[11px] tracking-[0.4em] leading-loose italic">
        Bisnis yang Anda cari tidak terdeteksi di radar kami atau sedang dalam
        masa maintenance.
      </p>
      <Link href="/">
        <Button className="rounded-[2.5rem] h-24 px-16 font-black uppercase italic tracking-widest bg-blue-600 text-white shadow-3xl hover:scale-110 active:scale-95 transition-all text-xl">
          Back to Base
        </Button>
      </Link>
    </div>
  );
}
