"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Save,
  MapPin,
  Clock,
  Camera,
  Loader2,
  X,
  Plus,
  ImageIcon,
  Globe,
  Palette,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  LayoutDashboard,
  Map as MapIcon,
  Zap,
  Search,
  LayoutGrid,
  Smartphone,
  MousePointer2,
} from "lucide-react";
import api from "@/lib/api";
import { SingleImageUpload } from "@/components/upload/single-image-upload";
import { BulkImageUpload } from "@/components/upload/bulk-image-upload";

// --- CUSTOM SVG ICONS ---
const InstagramIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);
const TikTokIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

export default function SettingsPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      name: "",
      slug: "",
      slogan: "",
      tagline: "",
      about_us: "",
      features: [] as string[],
      address: "",
      open_time: "09:00",
      close_time: "21:00",
      primary_color: "#3b82f6",
      logo_url: "",
      banner_url: "",
      instagram_url: "",
      tiktok_url: "",
      whatsapp_number: "",
      map_iframe_url: "",
      meta_title: "",
      meta_description: "",
      gallery: [] as string[],
    },
  });

  const allData = watch();
  const [featureInput, setFeatureInput] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/admin/profile");
      reset(res.data);
    } catch {
      toast.error("Gagal memuat profil");
    }
  }, [reset]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleAddFeature = () => {
    if (!featureInput.trim()) return;
    const currentFeatures = allData.features || [];
    setValue("features", [...currentFeatures, featureInput.trim()]);
    setFeatureInput("");
  };

  const removeFeature = (index: number) => {
    const currentFeatures = allData.features || [];
    setValue(
      "features",
      currentFeatures.filter((_, i) => i !== index),
    );
  };

  const onSubmit = async (data: Record<string, unknown>) => {
    setLoading(true);
    try {
      await api.put("/admin/profile", data);
      toast.success("Branding & SEO berhasil dipublikasikan!");
      setIsEditing(false);
    } catch {
      toast.error("Gagal menyimpan perubahan");
    } finally {
      setLoading(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-3 md:px-4">
        {/* HEADER SUMMARY CARD */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 md:gap-8 bg-slate-950 p-5 md:p-10 rounded-[1.75rem] md:rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-600/20 to-transparent pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 md:gap-8 relative z-10">
            <div className="h-20 w-20 md:h-28 md:w-28 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 overflow-hidden p-2 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105 duration-500 shrink-0">
              {allData.logo_url ? (
                <div
                  className="h-full w-full rounded-2xl bg-center bg-contain bg-no-repeat"
                  style={{ backgroundImage: `url(${allData.logo_url})` }}
                  role="img"
                  aria-label={`${allData.name || "Brand"} logo`}
                />
              ) : (
                <Camera className="opacity-20" size={40} />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-5xl font-[1000] italic uppercase tracking-tighter leading-none">
                  {allData.name || "Brand Name"}
                </h1>
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
              </div>
              <p className="text-blue-400 font-bold uppercase text-xs tracking-[0.4em] italic">
                {allData.slogan || "Your business slogan"}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsEditing(true)}
            className="rounded-2xl h-12 md:h-16 px-5 md:px-10 bg-white text-black hover:bg-slate-200 font-[1000] uppercase italic tracking-wider transition-all active:scale-95 relative z-10 shadow-xl w-full sm:w-auto"
          >
            Edit Brand Identity <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          {/* LEFT: VISUAL & CONTENT PREVIEW (7 COLS) */}
          <div className="lg:col-span-8 space-y-8">
            <Card className="rounded-[1.75rem] md:rounded-[3rem] border-none shadow-sm overflow-hidden bg-white group/banner">
              <div className="h-44 md:h-64 w-full bg-slate-100 relative overflow-hidden">
                {allData.banner_url ? (
                  <div
                    className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover/banner:scale-105"
                    style={{ backgroundImage: `url(${allData.banner_url})` }}
                    role="img"
                    aria-label={`${allData.name || "Brand"} banner`}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-300">
                    <ImageIcon size={64} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-8 flex items-center gap-4">
                  <div className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase italic tracking-widest border border-white/20">
                    Hero Section
                  </div>
                  <div className="px-4 py-2 bg-blue-600 rounded-full text-white text-[10px] font-black uppercase italic tracking-widest shadow-lg shadow-blue-600/40">
                    Active
                  </div>
                </div>
              </div>
              <CardContent className="p-5 md:p-10 space-y-8 md:space-y-10">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] italic">
                    Headline Copy
                  </p>
                    <h2 className="text-2xl md:text-4xl font-black italic uppercase leading-tight tracking-tighter text-slate-900">
                    {allData.tagline || "Main Hero Title"}
                  </h2>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">
                    Key Features
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {allData.features?.length > 0 ? (
                      allData.features.map((f: string, i: number) => (
                        <div
                          key={i}
                          className="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase italic text-slate-600 flex items-center gap-3 shadow-sm transition-all hover:border-blue-200 hover:bg-white"
                        >
                          <div className="h-2 w-2 rounded-full bg-blue-500" />{" "}
                          {f}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        No features added yet
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-6 md:pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic flex items-center gap-2">
                      <MapIcon size={12} /> Location Detail
                    </p>
                    <p className="text-sm font-bold text-slate-600 leading-relaxed">
                      {allData.address || "No address set"}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic flex items-center gap-2">
                      <Clock size={12} /> Shop Hours
                    </p>
                    <p className="text-sm font-black text-slate-900">
                      {allData.open_time} — {allData.close_time}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GALLERY PREVIEW */}
            <Card className="rounded-[1.75rem] md:rounded-[3rem] border-none shadow-sm p-5 md:p-10 bg-white">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] italic flex items-center gap-3">
                  <LayoutGrid className="text-blue-600" size={18} /> Photo
                  Gallery
                </h3>
                <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase">
                  {allData.gallery?.length || 0} Assets
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {allData.gallery?.slice(0, 4).map((url: string, i: number) => (
                  <div
                    key={i}
                    className="aspect-square rounded-[2rem] overflow-hidden border border-slate-100"
                  >
                    <div
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${url})` }}
                      role="img"
                      aria-label={`${allData.name || "Brand"} gallery ${i + 1}`}
                    />
                  </div>
                ))}
                {allData.gallery?.length > 4 && (
                  <div className="aspect-square rounded-[2rem] bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-200">
                    <p className="text-xs font-black text-slate-400">
                      +{allData.gallery.length - 4} More
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT: CONNECT & SEO PREVIEW (4 COLS) */}
          <div className="lg:col-span-4 space-y-8">
            {/* SOCIALS */}
            <Card className="rounded-[1.75rem] md:rounded-[3rem] border-none shadow-sm p-5 md:p-8 bg-white space-y-5 md:space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 italic">
                Social Matrix
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 transition-colors hover:bg-slate-100/50">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <InstagramIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase">
                      Instagram
                    </p>
                    <p className="text-[11px] font-extrabold text-slate-600 truncate">
                      {allData.instagram_url ? "Connected" : "Disconnected"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 transition-colors hover:bg-slate-100/50">
                  <div className="h-10 w-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg shadow-black/20">
                    <TikTokIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase">
                      TikTok
                    </p>
                    <p className="text-[11px] font-extrabold text-slate-600 truncate">
                      {allData.tiktok_url ? "Connected" : "Disconnected"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 transition-colors hover:bg-slate-100/50">
                  <div className="h-10 w-10 rounded-2xl bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/20">
                    <Smartphone size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase">
                      WhatsApp
                    </p>
                    <p className="text-[11px] font-extrabold text-slate-600 truncate">
                      {allData.whatsapp_number || "Not set"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* SEO SIMULATOR */}
            <Card className="rounded-[1.75rem] md:rounded-[3rem] border-none shadow-sm p-5 md:p-8 bg-white space-y-5 md:space-y-6 overflow-hidden relative group">
              <div className="absolute -right-6 -top-6 h-24 w-24 bg-blue-50 rounded-full blur-3xl opacity-50" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 italic flex items-center gap-2">
                <Search size={12} /> Google Preview
              </h3>

              <div className="space-y-4">
                {/* BUNGKUS DENGAN TAG 'A' ATAU 'LINK' */}
                <a
                  href={`https://${allData.slug}.bookinaja.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block space-y-1 group/seo"
                >
                  <p className="text-sm text-[#1a0dab] font-medium group-hover/seo:underline truncate transition-all">
                    {allData.meta_title || allData.name}
                  </p>

                  <div className="flex items-center gap-1 text-[11px] text-[#006621]">
                    <span className="truncate">
                      https://{allData.slug}.bookinaja.com
                    </span>
                    <div className="h-0 w-0 border-x-[3px] border-x-transparent border-t-[4px] border-t-[#006621]" />
                    <ExternalLink
                      size={10}
                      className="ml-1 opacity-0 group-hover/seo:opacity-100 transition-opacity"
                    />
                  </div>

                  <p className="text-xs text-[#545454] line-clamp-2 leading-relaxed">
                    {allData.meta_description ||
                      "Configure your meta description to see how your business appears in search engines like Google."}
                  </p>
                </a>
              </div>
            </Card>

            {/* COLOR MATRIX */}
            <Card className="rounded-[1.75rem] md:rounded-[3rem] border-none shadow-sm p-5 md:p-8 bg-white space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 italic">
                Visual Token
              </h3>
              <div className="flex items-center justify-between p-4 rounded-3xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-4">
                  <div
                    className="h-10 w-10 rounded-2xl shadow-inner border border-white/20"
                    style={{ backgroundColor: allData.primary_color }}
                  />
                  <span className="font-mono font-black text-xs text-slate-500 uppercase">
                    {allData.primary_color}
                  </span>
                </div>
                <Palette size={16} className="text-slate-300" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // --- EDITOR MODE ---
  return (
    <div className="max-w-6xl mx-auto pb-24 animate-in zoom-in-95 duration-500 px-4">
      {/* STICKY ACTION BAR */}
      <div className="sticky top-4 z-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-xl p-3 md:p-4 rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xl mb-8 md:mb-12 animate-in slide-in-from-top-4 duration-700">
        <Button
          variant="ghost"
          onClick={() => setIsEditing(false)}
          className="rounded-2xl gap-2 font-black uppercase italic text-[11px] tracking-widest hover:bg-slate-100 w-full sm:w-auto"
        >
          <ArrowLeft size={16} /> Discard Changes
        </Button>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[9px] font-black uppercase text-slate-400 italic">
              Unpublished Changes
            </span>
            <span className="text-[10px] font-bold text-blue-600 uppercase">
              Studio Engine v2.0
            </span>
          </div>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="rounded-2xl h-12 md:h-14 px-5 md:px-10 bg-blue-600 hover:bg-blue-700 font-[1000] italic uppercase tracking-[0.1em] shadow-xl shadow-blue-600/30 active:scale-95 transition-all w-full sm:w-auto"
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              <Save className="mr-2 h-5 w-5" />
            )}
            Publish Updates
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* LEFT COLUMN: CONTENT & SEO */}
        <div className="space-y-6 md:space-y-8">
          {/* SECTION: HERO COPY */}
          <Card className="rounded-[1.75rem] md:rounded-[3rem] border-none shadow-sm p-5 md:p-10 bg-white space-y-6 md:space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <LayoutDashboard size={20} />
              </div>
              <div>
                <h2 className="font-black uppercase italic tracking-widest text-sm text-slate-900">
                  Branding Content
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                  Hero & About details
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">
                  Main Tagline (Hero Title)
                </Label>
                <Input
                  {...register("tagline")}
                  className="h-16 rounded-[1.5rem] bg-slate-50 border-none font-black italic text-xl px-6 shadow-inner focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Arena Pro Player Terbesar di Batam"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">
                    Brand Display Name
                  </Label>
                  <Input
                    {...register("name")}
                    className="h-14 rounded-2xl bg-slate-50 border-none font-bold px-6 shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">
                    Support Slogan
                  </Label>
                  <Input
                    {...register("slogan")}
                    className="h-14 rounded-2xl bg-slate-50 border-none font-bold px-6 shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">
                  Marketing Copywriting
                </Label>
                <Textarea
                  {...register("about_us")}
                  className="min-h-[160px] rounded-[1.5rem] bg-slate-50 border-none font-medium p-6 shadow-inner focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                  placeholder="Ceritakan keunggulan bisnis Anda di sini..."
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">
                  Physical Address
                </Label>
                <div className="relative">
                  <MapPin
                    className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"
                    size={18}
                  />
                  <Input
                    {...register("address")}
                    className="h-16 pl-16 rounded-[1.5rem] bg-slate-50 border-none font-bold shadow-inner"
                    placeholder="Mangsang Permai Blok J No 95..."
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* SECTION: FEATURE PILLS */}
          <Card className="rounded-[1.75rem] md:rounded-[3rem] border-none shadow-sm p-5 md:p-10 bg-white space-y-6 md:space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Zap size={20} />
              </div>
              <div>
                <h2 className="font-black uppercase italic tracking-widest text-sm text-slate-900">
                  Feature Pillars
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                  Showcase your selling points
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddFeature();
                    }
                  }}
                  placeholder="Contoh: RTX 4090 Ready"
                  className="h-14 rounded-2xl bg-slate-50 border-none font-bold px-6 shadow-inner"
                />
                <Button
                  type="button"
                  onClick={handleAddFeature}
                  className="h-14 w-full sm:w-14 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30"
                >
                  <Plus size={24} strokeWidth={3} />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[40px] p-2 rounded-2xl border border-slate-50">
                {allData.features?.length > 0 ? (
                  allData.features.map((f: string, i: number) => (
                    <div
                      key={i}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase italic flex items-center gap-3 border border-blue-100 group transition-all hover:bg-blue-600 hover:text-white"
                    >
                      {f}
                      <X
                        size={14}
                        className="cursor-pointer opacity-40 group-hover:opacity-100"
                        onClick={() => removeFeature(i)}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] font-bold text-slate-300 uppercase italic m-2">
                    No pillars added. Type and press +
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* SECTION: SEO CONFIG */}
          <Card className="rounded-[1.75rem] md:rounded-[3rem] border-none shadow-sm p-5 md:p-10 bg-white space-y-6 md:space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Search size={20} />
              </div>
              <div>
                <h2 className="font-black uppercase italic tracking-widest text-sm text-slate-900">
                  SEO & Meta Strategy
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                  How Google sees you
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">
                  Meta Page Title
                </Label>
                <Input
                  {...register("meta_title")}
                  className="h-14 rounded-2xl bg-slate-50 border-none font-bold px-6 shadow-inner"
                  placeholder="Miniboss Gaming Batam - Rental PS5 Terbaik"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">
                  Meta Search Description
                </Label>
                <Textarea
                  {...register("meta_description")}
                  className="h-32 rounded-[1.5rem] bg-slate-50 border-none font-medium p-6 shadow-inner leading-relaxed"
                  placeholder="Tuliskan deskripsi singkat untuk pencarian Google..."
                />
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: ASSETS & CONTACT */}
        <div className="space-y-8">
          {/* SECTION: VISUAL ASSETS */}
          <Card className="rounded-[1.75rem] md:rounded-[3rem] border-none shadow-sm p-5 md:p-10 bg-white space-y-6 md:space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Camera size={20} />
              </div>
              <div>
                <h2 className="font-black uppercase italic tracking-widest text-sm text-slate-900">
                  Visual Assets
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                  Brand logos & cover photo
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
              <SingleImageUpload
                label="Business Logo (Square)"
                value={allData.logo_url}
                onChange={(url) => setValue("logo_url", url)}
                className="aspect-square"
              />
              <SingleImageUpload
                label="Hero Cover (Wide)"
                value={allData.banner_url}
                onChange={(url) => setValue("banner_url", url)}
              />
            </div>

            <div className="pt-8 border-t border-slate-50">
              <BulkImageUpload
                values={allData.gallery}
                onChange={(urls) => setValue("gallery", urls)}
              />
            </div>
          </Card>

          {/* SECTION: CONNECTIVITY */}
          <Card className="rounded-[1.75rem] md:rounded-[3rem] border-none shadow-sm p-5 md:p-10 bg-white space-y-6 md:space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Globe size={20} />
              </div>
              <div>
                <h2 className="font-black uppercase italic tracking-widest text-sm text-slate-900">
                  Connections
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                  Socials & Contact point
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic flex items-center gap-2">
                  <InstagramIcon /> Instagram
                </Label>
                <Input
                  {...register("instagram_url")}
                  className="h-14 rounded-2xl bg-slate-50 border-none px-6 shadow-inner"
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic flex items-center gap-2">
                  <TikTokIcon /> TikTok
                </Label>
                <Input
                  {...register("tiktok_url")}
                  className="h-14 rounded-2xl bg-slate-50 border-none px-6 shadow-inner"
                  placeholder="https://tiktok.com/@..."
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic flex items-center gap-2">
                <MapIcon size={14} /> Google Maps Iframe URL
              </Label>
              <Input
                {...register("map_iframe_url")}
                className="h-14 rounded-2xl bg-slate-50 border-none px-6 shadow-inner"
                placeholder="Ambil dari Embed Maps..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic flex items-center gap-2">
                  <Palette size={14} /> Brand Primary Color
                </Label>
                <div className="flex gap-3">
                  {/* Input HEX tetap ada buat yang mau copy-paste */}
                  <Input
                    {...register("primary_color")}
                    className="h-14 rounded-2xl bg-slate-50 border-none font-mono font-bold px-6 shadow-inner uppercase"
                  />

                  {/* Box Color Selector yang Interaktif */}
                  <div className="relative group/color h-14 w-14 shrink-0">
                    <input
                      type="color"
                      value={allData.primary_color || "#3b82f6"}
                      onChange={(e) =>
                        setValue("primary_color", e.target.value)
                      }
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                    />
                    <div
                      className="h-full w-full rounded-2xl border-4 border-slate-100 shadow-lg flex items-center justify-center transition-transform group-hover/color:scale-105 active:scale-95"
                      style={{ backgroundColor: allData.primary_color }}
                    >
                      <MousePointer2
                        size={14}
                        className="text-white drop-shadow-md opacity-0 group-hover/color:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[9px] font-bold text-slate-400 italic ml-1">
                  *Klik kotak warna untuk membuka color picker
                </p>
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic flex items-center gap-2">
                  <Smartphone size={14} /> WhatsApp Business
                </Label>
                <Input
                  {...register("whatsapp_number")}
                  className="h-14 rounded-2xl bg-slate-50 border-none px-6 shadow-inner"
                  placeholder="0822..."
                />
              </div>
            </div>
          </Card>

          {/* SECTION: OPERATING HOURS */}
          <Card className="rounded-[3rem] border-none shadow-sm p-8 bg-white space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Clock size={20} />
              </div>
              <div>
                <h2 className="font-black uppercase italic tracking-widest text-sm text-slate-900">
                  Operating Hours
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                  Business schedule
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">
                  Open Time
                </Label>
                <Input
                  {...register("open_time")}
                  className="h-14 rounded-2xl bg-slate-50 border-none font-bold px-6 shadow-inner"
                  placeholder="09:00"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic">
                  Close Time
                </Label>
                <Input
                  {...register("close_time")}
                  className="h-14 rounded-2xl bg-slate-50 border-none font-bold px-6 shadow-inner"
                  placeholder="21:00"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
