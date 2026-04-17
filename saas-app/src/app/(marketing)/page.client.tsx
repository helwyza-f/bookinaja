"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap,
  ArrowRight,
  Sparkles,
  Globe,
  Rocket,
  ShieldCheck,
  Monitor,
  Camera,
  Coffee,
  Briefcase,
  PlayCircle,
  Smartphone,
  ChevronRight,
  TrendingUp,
  Users2,
  Lock,
  Search,
  Wallet,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="relative flex flex-col items-center selection:bg-blue-600/30 overflow-x-hidden bg-background font-plus-jakarta transition-colors duration-500">
      {/* --- DYNAMIC BACKGROUND SYSTEM (PRESERVED) --- */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.15)_0%,transparent_70%)]" />
        <div className="sticky top-0 h-screen w-full overflow-hidden opacity-40">
          <div className="absolute top-[-10%] right-[-10%] h-[30rem] w-[30rem] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_100%,transparent_100%)]" />
      </div>

      {/* --- HERO SECTION: COMPACT & POWERFUL --- */}
      <section className="container relative z-10 mx-auto px-6 pt-28 md:pt-44 pb-12 text-center overflow-hidden">
        <div className="flex justify-center mb-6">
          <Badge
            variant="outline"
            className="rounded-full border-blue-500/20 bg-blue-500/5 px-4 py-1.5 font-syne text-[9px] font-black uppercase tracking-[0.3em] text-blue-600 backdrop-blur-md"
          >
            <Sparkles className="mr-2 h-3 w-3 fill-current" />
            OPERATING SYSTEM BISNIS NO. 1
          </Badge>
        </div>

        <h1 className="max-w-5xl mx-auto text-4xl font-[1000] tracking-tighter sm:text-7xl md:text-8xl text-foreground leading-[0.85] mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          Ubah Slot Waktu <br />
          <span className="italic text-blue-600">Jadi Profit.</span>
        </h1>

        <p className="max-w-2xl mx-auto text-sm md:text-lg text-muted-foreground font-semibold leading-relaxed mb-10 opacity-80 uppercase tracking-tight">
          Hentikan catatan manual. Pantau slot, terima bayaran digital, dan
          kontrol penuh staff dalam satu genggaman.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-20">
          <Link href="/register" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="h-14 md:h-16 w-full sm:w-auto px-10 text-xs font-black uppercase tracking-[0.2em] rounded-2xl bg-blue-600 shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all italic"
            >
              Mulai Bisnis <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/documentation" className="w-full sm:w-auto">
            <Button
              variant="ghost"
              size="lg"
              className="h-14 md:h-16 w-full sm:w-auto px-10 text-xs font-black uppercase tracking-[0.2em] rounded-2xl border border-border bg-background/40 backdrop-blur-sm hover:bg-background/80 italic"
            >
              Dokumentasi <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* COMPACT PREVIEW */}
        <div className="relative mx-auto max-w-6xl group px-2">
          <div className="absolute -inset-4 bg-blue-600/10 blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition duration-1000" />
          <div className="relative rounded-[2.5rem] border border-white/10 bg-card/40 p-2 shadow-2xl backdrop-blur-xl">
            <div className="overflow-hidden rounded-[2rem] border border-white/5 shadow-inner">
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426"
                alt="Dashboard Preview"
                className="w-full object-cover aspect-video opacity-95 transition-transform duration-1000 group-hover:scale-[1.01]"
              />
            </div>
            {/* Realtime Badges */}
            <div className="absolute -bottom-6 -right-6 hidden lg:flex bg-emerald-500 text-white p-6 rounded-[2rem] shadow-2xl border-4 border-background flex-col items-start gap-1 rotate-2">
              <TrendingUp size={24} className="mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest leading-none">
                Cuan Hari Ini
              </p>
              <p className="text-2xl font-[1000] italic leading-none tabular-nums">
                +124%
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- QUICK FEATURES --- */}
      <section className="container relative z-10 mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Search className="text-blue-500" />}
            title="Live Monitoring"
            desc="Cek unit mana yang terisi dan durasi sisa tanpa perlu telepon kasir."
            badge="Khusus Owner"
          />
          <FeatureCard
            icon={<Globe className="text-blue-500" />}
            title="Website Otomatis"
            desc="Dapatkan portal boking profesional namabisnis.bookinaja.com instan."
            badge="Branding"
          />
          <FeatureCard
            icon={<ShieldCheck className="text-blue-500" />}
            title="Sistem Terisolasi"
            desc="Setiap bisnis mendapatkan database privat. Aman dan 100% rahasia."
            badge="Security"
          />
        </div>
      </section>

      {/* --- INDUSTRIES SECTION --- */}
      <section
        id="industries"
        className="container relative z-10 mx-auto px-6 py-20"
      >
        <div className="text-center mb-16 space-y-4">
          <Badge
            variant="outline"
            className="border-blue-500/20 text-blue-600 font-black tracking-[0.3em] uppercase text-[9px] py-1"
          >
            Sektor Usaha
          </Badge>
          <h2 className="text-4xl md:text-6xl font-[1000] italic uppercase tracking-tighter leading-none">
            Satu Sistem <br />{" "}
            <span className="text-blue-600">Apapun Bisnisnya.</span>
          </h2>
          <p className="text-muted-foreground text-sm font-bold uppercase italic tracking-widest max-w-xl mx-auto">
            Dirancang fleksibel untuk berbagai model persewaan slot & unit.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <IndustryCard
            icon={<Monitor />}
            title="Gaming Hub"
            desc="Rental PS, PC, & Game Center. Otomasi billing per jam tanpa stopwatch manual."
          />
          <IndustryCard
            icon={<Camera />}
            title="Studio Kreatif"
            desc="Studio Foto, Podcast, & Musik. Atur jadwal sesi dan paket alat dalam satu layar."
          />
          <IndustryCard
            icon={<Zap />}
            title="Arena Olahraga"
            desc="Lapangan Futsal, Badminton, & Gym. Customer cek ketersediaan slot langsung dari HP."
          />
          <IndustryCard
            icon={<Briefcase />}
            title="Office Space"
            desc="Coworking, Meeting Room, & Private Office. Kelola akses harian atau bulanan secara rapi."
          />
        </div>
      </section>

      {/* --- STAFF & ROLE --- */}
      <section className="container relative z-10 mx-auto px-6 py-20">
        <div className="rounded-[3.5rem] border border-border bg-card/30 p-8 md:p-16 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none text-blue-600">
            <Lock size={300} strokeWidth={1} />
          </div>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-left">
              <Badge className="bg-blue-600/10 text-blue-600 border-none font-black italic text-[10px] tracking-widest uppercase py-1 px-4">
                Kontrol Staff
              </Badge>
              <h2 className="text-4xl md:text-6xl font-[1000] italic tracking-tighter leading-none text-foreground">
                Manajemen Tim <br />{" "}
                <span className="text-blue-600 not-italic">Tanpa Was-was.</span>
              </h2>
              <p className="text-muted-foreground font-semibold leading-relaxed">
                Buat akun khusus untuk kasir. Batasi akses mereka agar hanya
                bisa mengelola boking tanpa melihat laporan cuan total Anda.
              </p>
              <div className="flex flex-col gap-3 pt-4">
                {[
                  "Akses Kasir Terbatas",
                  "Cegah Fraud Transaksi",
                  "Log Aktivitas Realtime",
                ].map((t) => (
                  <div key={t} className="flex items-center gap-3">
                    <CheckCircle2 className="text-blue-500 w-5 h-5" />
                    <span className="text-sm font-black uppercase tracking-wide italic text-foreground">
                      {t}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white shadow-2xl border-b-8 border-blue-800 rotate-1 group hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black">
                    HF
                  </div>
                  <div className="text-left">
                    <p className="font-black italic uppercase leading-none">
                      Owner Admin
                    </p>
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">
                      Full Control Access
                    </p>
                  </div>
                </div>
                <div className="space-y-3 opacity-30">
                  <div className="h-3 w-full bg-white/20 rounded-full" />
                  <div className="h-3 w-2/3 bg-white/20 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="container relative z-10 mx-auto px-6 pb-24">
        <div className="relative overflow-hidden rounded-[3rem] bg-slate-950 px-8 py-20 md:py-32 text-center shadow-3xl border border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.3)_0%,transparent_60%)]" />

          <div className="relative z-10 max-w-4xl mx-auto space-y-10">
            <h2 className="text-5xl md:text-8xl font-[1000] text-white italic tracking-tighter leading-[0.85] uppercase">
              Bikin Bisnis <br />{" "}
              <span className="text-blue-600 not-italic">Autopilot.</span>
            </h2>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="h-16 md:h-20 w-full sm:w-auto px-16 text-xs font-black uppercase tracking-[0.2em] rounded-2xl bg-white text-slate-950 hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all italic"
                >
                  Daftar Sekarang <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link
                href="/pricing"
                className="text-white/60 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.4em] italic underline underline-offset-8 decoration-blue-500"
              >
                Lihat Paket Harga
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/** * --- HELPER COMPONENTS ---
 */

function FeatureCard({
  icon,
  title,
  desc,
  badge,
}: {
  icon: any;
  title: string;
  desc: string;
  badge: string;
}) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-white dark:bg-card border border-border shadow-sm hover:shadow-2xl hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden text-left">
      <div className="mb-6 h-12 w-12 rounded-2xl bg-blue-600/5 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
        {icon}
      </div>
      <Badge
        variant="outline"
        className="mb-4 border-none bg-secondary text-muted-foreground text-[8px] font-black tracking-widest uppercase py-0.5"
      >
        {badge}
      </Badge>
      <h3 className="text-xl font-[1000] mb-2 tracking-tighter italic uppercase leading-none text-foreground">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground font-semibold leading-relaxed italic">
        {desc}
      </p>
    </div>
  );
}

function IndustryCard({
  icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-8 rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-sm hover:border-blue-500/50 hover:bg-blue-600/[0.02] group transition-all duration-500 text-left relative overflow-hidden">
      <div className="h-12 w-12 rounded-2xl bg-blue-600/10 text-blue-600 mb-6 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
        {icon}
      </div>
      <h4 className="text-lg font-[1000] uppercase italic tracking-tighter text-foreground leading-none mb-3">
        {title}
      </h4>
      <p className="text-xs font-semibold text-muted-foreground leading-relaxed uppercase tracking-tight group-hover:text-foreground/80 transition-colors">
        {desc}
      </p>
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-10 transition-opacity">
        <ArrowUpRight size={40} className="text-blue-500" />
      </div>
    </div>
  );
}
