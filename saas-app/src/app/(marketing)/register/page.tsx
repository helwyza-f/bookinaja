"use client";

import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Globe,
  ShieldCheck,
  Rocket,
  Sparkles,
  Camera,
  Trophy,
  Check,
  User,
  Mail,
  Lock,
  Building2,
  Monitor,
  Briefcase,
  Info,
  Fingerprint,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  {
    id: "gaming_hub",
    name: "Gaming & Rental",
    icon: Monitor,
    desc: "Billing per jam, manajemen unit PS/PC, & sistem durasi otomatis.",
    example: "Contoh: Rental PS5, PC Cafe, Sim-Racing Center.",
  },
  {
    id: "creative_space",
    name: "Studio & Creative",
    icon: Camera,
    desc: "Booking jadwal pemotretan, sewa alat, & kalender ketersediaan.",
    example: "Contoh: Photo Studio, Podcast Room, Self-Photo.",
  },
  {
    id: "sport_center",
    name: "Sport & Courts",
    icon: Trophy,
    desc: "Sewa lapangan, sistem DP otomatis, & manajemen jadwal turnamen.",
    example: "Contoh: Lapangan Futsal, Badminton, Billiard.",
  },
  {
    id: "social_space",
    name: "Social & Office",
    icon: Briefcase,
    desc: "Reservasi meeting room, sewa meja harian, & akses member.",
    example: "Contoh: Co-working Space, Meeting Room, Cafe VIP.",
  },
];

// Sub-component untuk menangani form logic agar Suspense bekerja dengan baik
function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  // Inisialisasi category dari URL jika ada, jika tidak default ke gaming_hub
  const [selectedCategory, setSelectedCategory] = useState(
    categoryParam || "gaming_hub",
  );

  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      businessName: "",
      subdomain: "",
      fullName: "",
      email: "",
      password: "",
    },
  });

  const slugValue = watch("subdomain", "");

  const onSubmit = async (data: any) => {
    setLoading(true);
    const payload = {
      tenant_name: data.businessName,
      tenant_slug: data.subdomain.toLowerCase().trim(),
      business_category: selectedCategory,
      business_type:
        CATEGORIES.find((c) => c.id === selectedCategory)?.name ||
        "Universal Booking",
      admin_name: data.fullName,
      admin_email: data.email,
      admin_password: data.password,
    };

    const promise = api.post("/register", payload);

    toast.promise(promise, {
      loading: "Membangun infrastruktur cloud bisnis Anda...",
      success: (res) => {
        setTimeout(() => (window.location.href = res.data.login_url), 1500);
        return `Registrasi Berhasil! Mengalihkan...`;
      },
      error: (err) => err.response?.data?.error || "Gagal mendaftar.",
    });

    try {
      await promise;
    } catch (e) {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
      {/* 1. IDENTITY SECTION */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 group">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
            1
          </span>
          <Label className="font-syne text-[11px] font-bold uppercase tracking-[0.3em] text-blue-500">
            Identitas Bisnis
          </Label>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        <div className="grid gap-6">
          <div className="space-y-3">
            <Label className="font-bold text-muted-foreground uppercase text-[10px] tracking-[0.2em] ml-2">
              Nama Entitas Bisnis
            </Label>
            <div className="relative">
              <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40" />
              <Input
                placeholder="Contoh: Nexus Gaming Hub"
                className="h-16 rounded-2xl border-border/60 bg-secondary/20 font-bold focus:ring-4 focus:ring-blue-600/5 pl-14 transition-all"
                {...register("businessName")}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="font-bold text-muted-foreground uppercase text-[10px] tracking-[0.2em] ml-2">
              Eksklusif Subdomain
            </Label>
            <div className="relative flex items-center group">
              <Input
                placeholder="nama-bisnis"
                className="h-16 rounded-2xl border-border/60 bg-secondary/20 font-bold focus:ring-4 focus:ring-blue-600/5 px-6 pr-44 lowercase transition-all"
                {...register("subdomain")}
                required
                pattern="[a-z0-9-]+"
              />
              <span className="absolute right-6 text-sm font-black text-muted-foreground/40 group-focus-within:text-blue-500 transition-colors">
                .bookinaja.com
              </span>
            </div>
            {slugValue && (
              <p className="text-[10px] font-black text-blue-500 tracking-[0.2em] px-4 italic uppercase animate-in fade-in slide-in-from-left-4">
                LIVE URL: {slugValue.toLowerCase()}.bookinaja.com
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. SECTOR SELECTION WITH EXAMPLES */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 group">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
            2
          </span>
          <Label className="font-syne text-[11px] font-bold uppercase tracking-[0.3em] text-blue-500">
            Sektor Bisnis
          </Label>
          <div className="h-px flex-1 bg-border/60" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "relative cursor-pointer p-6 rounded-[2rem] border-2 transition-all duration-500 flex flex-col items-start gap-4 group overflow-hidden",
                selectedCategory === cat.id
                  ? "border-blue-600 bg-blue-600/5 ring-8 ring-blue-600/5 shadow-2xl"
                  : "border-border/40 bg-secondary/10 hover:border-blue-500/30",
              )}
            >
              {selectedCategory === cat.id && (
                <div className="absolute top-0 right-0 p-4 bg-blue-600 rounded-bl-[1.5rem] shadow-xl animate-in fade-in zoom-in">
                  <Check className="h-4 w-4 text-white stroke-[4]" />
                </div>
              )}
              <div
                className={cn(
                  "p-3 rounded-xl bg-background border border-border shadow-sm transition-transform duration-500 group-hover:scale-110",
                  selectedCategory === cat.id
                    ? "text-blue-600"
                    : "text-muted-foreground",
                )}
              >
                <cat.icon className="h-6 w-6" />
              </div>
              <div className="text-left space-y-2">
                <div>
                  <p
                    className={cn(
                      "text-sm font-black uppercase tracking-tighter",
                      selectedCategory === cat.id
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {cat.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-bold leading-relaxed mt-1 opacity-70">
                    {cat.desc}
                  </p>
                </div>

                <div
                  className={cn(
                    "flex items-start gap-2 pt-2 border-t border-border/40 transition-colors",
                    selectedCategory === cat.id
                      ? "border-blue-500/20"
                      : "border-border/20",
                  )}
                >
                  <Info
                    className={cn(
                      "h-3 w-3 mt-0.5 shrink-0",
                      selectedCategory === cat.id
                        ? "text-blue-500"
                        : "text-muted-foreground/40",
                    )}
                  />
                  <p
                    className={cn(
                      "text-[9px] font-bold leading-tight",
                      selectedCategory === cat.id
                        ? "text-blue-600/80"
                        : "text-muted-foreground/50",
                    )}
                  >
                    {cat.example}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. ACCESS SECTION */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 group">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
            3
          </span>
          <Label className="font-syne text-[11px] font-bold uppercase tracking-[0.3em] text-blue-500">
            Akses Kredensial
          </Label>
          <div className="h-px flex-1 bg-border/60" />
        </div>
        <div className="grid gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="font-bold text-muted-foreground uppercase text-[10px] tracking-[0.2em] ml-2">
                Nama Pemilik
              </Label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40" />
                <Input
                  placeholder="Helwiza Fahry"
                  className="h-16 rounded-2xl border-border/60 bg-secondary/20 font-bold pl-14 focus:ring-4 focus:ring-blue-600/5"
                  {...register("fullName")}
                  required
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="font-bold text-muted-foreground uppercase text-[10px] tracking-[0.2em] ml-2">
                Email Utama
              </Label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40" />
                <Input
                  type="email"
                  placeholder="admin@bisnis.com"
                  className="h-16 rounded-2xl border-border/60 bg-secondary/20 font-bold pl-14 focus:ring-4 focus:ring-blue-600/5"
                  {...register("email")}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="font-bold text-muted-foreground uppercase text-[10px] tracking-[0.2em] ml-2">
              Secure Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40" />
              <Input
                type="password"
                placeholder="••••••••"
                className="h-16 rounded-2xl border-border/60 bg-secondary/20 font-bold pl-14 focus:ring-4 focus:ring-blue-600/5"
                {...register("password")}
                required
              />
            </div>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-24 rounded-[2.5rem] bg-blue-600 text-2xl font-black italic uppercase tracking-[0.2em] text-white shadow-[0_30px_60px_-15px_rgba(37,99,235,0.5)] hover:bg-blue-700 transition-all hover:-translate-y-2 active:scale-95 border-b-[12px] border-blue-900 group"
      >
        {loading ? (
          <span className="flex items-center gap-4 animate-pulse">
            Menyiapkan Sistem...
          </span>
        ) : (
          <span className="flex items-center gap-4">Daftar Sekarang</span>
        )}
      </Button>
    </form>
  );
}

export default function RegisterPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center py-12 md:py-24 px-4 md:px-6 overflow-hidden selection:bg-blue-600/30 font-plus-jakarta bg-background">
      {/* --- PERSISTENT BACKGROUND SYSTEM --- */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[10%] left-[-10%] h-[40rem] w-[40rem] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-[-10%] h-[40rem] w-[40rem] rounded-full bg-indigo-600/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col lg:flex-row rounded-[2.5rem] md:rounded-[3.5rem] border border-border/50 bg-card/40 shadow-3xl backdrop-blur-3xl overflow-hidden transition-all duration-700">
          {/* --- LEFT: B2B AUTHORITY PITCH --- */}
          <div className="relative hidden lg:flex w-full flex-col justify-between p-16 text-white lg:max-w-md bg-[#0f1f4a] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-transparent to-transparent" />

            <div className="relative z-10 space-y-12">
              <div className="space-y-6">
                <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-5 py-2 rounded-full font-syne text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-md">
                  <Sparkles className="mr-2 h-3.5 w-3.5 fill-current" />
                  Enterprise Architecture
                </Badge>
                <h2 className="text-6xl font-black leading-[0.9] tracking-tighter italic">
                  Digitalisasi <br />
                  <span className="text-blue-500">Nasional.</span>
                </h2>
                <p className="text-slate-400 font-medium text-lg leading-relaxed">
                  Gabung bersama ratusan pemilik usaha yang telah
                  mengotomatisasi bisnis mereka hari ini.
                </p>
              </div>

              <div className="space-y-8">
                {[
                  { icon: Globe, text: "Subdomain Profesional" },
                  { icon: ShieldCheck, text: "Isolasi Data High-Security" },
                  { icon: Rocket, text: "Otomasi Billing Instan" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-5 group">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/5 border border-white/10 group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-500">
                      <item.icon className="h-7 w-7 text-blue-400 group-hover:text-white" />
                    </div>
                    <p className="font-extrabold text-slate-200 text-lg uppercase italic tracking-tight">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-loose">
                ISO 27001 Certified · Cloud Infrastructure · 24/7 Monitoring
              </p>
            </div>
          </div>

          {/* --- RIGHT: ENCHANCED FORM --- */}
          <div className="flex flex-1 items-center justify-center p-6 py-12 md:p-16 lg:p-20">
            <div className="w-full max-w-[540px] space-y-12">
              <div className="space-y-4 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500">
                  <Fingerprint className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                    Business Registration
                  </span>
                </div>
                <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-foreground italic uppercase leading-none">
                  Mulai Bisnis
                </h1>
                <p className="text-muted-foreground font-medium text-lg leading-snug">
                  Konfigurasi infrastruktur digital Anda hanya dalam 60 detik.
                </p>
              </div>

              {/* Suspense diperlukan karena useSearchParams() mengakses state client-side yang dinamis */}
              <Suspense
                fallback={
                  <div className="h-96 flex items-center justify-center animate-pulse text-blue-600 font-bold uppercase tracking-widest text-xs">
                    Menyiapkan Form...
                  </div>
                }
              >
                <RegisterForm />
              </Suspense>

              <div className="text-center space-y-6">
                <p className="text-sm text-muted-foreground font-bold italic uppercase tracking-[0.1em]">
                  Sudah memiliki lisensi?{" "}
                  <Link
                    href="/login"
                    className="text-blue-500 hover:text-blue-600 hover:underline underline-offset-8 decoration-2 transition-all"
                  >
                    Akses Dashboard
                  </Link>
                </p>
                <div className="flex flex-wrap justify-center gap-6 opacity-40 grayscale pointer-events-none">
                  <div className="text-[9px] font-black uppercase tracking-widest border border-foreground/20 px-3 py-1 rounded-md">
                    AWS Infrastructure
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-widest border border-foreground/20 px-3 py-1 rounded-md">
                    AES-256 Encrypted
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-widest border border-foreground/20 px-3 py-1 rounded-md">
                    SLA 99.9%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
