import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  Layers,
  MousePointerClick,
  Sparkles,
  Globe,
  Rocket,
  ShieldCheck,
  BarChart3,
  Users,
  Activity,
  ArrowUpRight,
  Monitor,
  Camera,
  SportShoe,
  Coffee,
  Briefcase,
  PlayCircle,
  Clock,
  Wallet,
  Smartphone,
  ChevronRight,
  Star,
  QrCode,
} from "lucide-react";
import Link from "next/link";

/**
 * LANDING PAGE COMPONENT - BOOKINAJA.COM
 * High-End B2B SaaS Architecture
 */
export default function LandingPage() {
  return (
    <div className="relative flex flex-col items-center selection:bg-blue-600/30 overflow-x-hidden">
      {/* --- ELITE PRO VISUAL BACKGROUND SYSTEM (IMMERSIVE & FIXED) --- */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
        {/* Animated Layered Mesh Gradients */}
        <div className="absolute -top-[10%] left-[-10%] h-[50rem] md:h-[70rem] w-[50rem] md:w-[70rem] rounded-full bg-blue-600/10 blur-[80px] md:blur-[140px] animate-pulse" />
        <div className="absolute top-[15%] right-[-10%] h-[40rem] md:h-[60rem] w-[40rem] md:w-[60rem] rounded-full bg-indigo-600/10 blur-[80px] md:blur-[140px]" />
        <div className="absolute bottom-[-15%] left-[5%] h-[35rem] md:h-[55rem] w-[35rem] md:w-[55rem] rounded-full bg-blue-400/5 blur-[80px] md:blur-[130px]" />

        {/* Infinite Grid System - Glassmorphism Support */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_90%_90%_at_50%_50%,#000_80%,transparent_100%)] opacity-100" />

        {/* Grain Overlay */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* --- HERO SECTION --- */}
      <section className="container relative z-10 mx-auto px-6 pt-24 pb-20 text-center md:pt-64 md:pb-48">
        <div className="flex justify-center mb-6 md:mb-10">
          <Badge
            variant="outline"
            className="rounded-full border-blue-500/30 bg-blue-500/10 px-4 md:px-6 py-1.5 md:py-2 font-syne text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500 backdrop-blur-md animate-in fade-in zoom-in duration-1000"
          >
            <Sparkles className="mr-2 h-3 w-3 md:h-3.5 md:w-3.5 fill-current" />
            The Operating System for Service-Based Businesses
          </Badge>
        </div>

        <h1 className="max-w-6xl mx-auto text-4xl font-black tracking-tighter sm:text-7xl md:text-9xl text-foreground leading-[0.9] md:leading-[0.85] mb-8 md:mb-12">
          Satu Dashboard. <br />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 bg-clip-text text-transparent italic">
            Tanpa Batas.
          </span>
        </h1>

        <p className="mt-4 md:mt-8 max-w-3xl mx-auto text-base leading-relaxed text-muted-foreground sm:text-2xl font-medium px-2 md:px-4 opacity-90">
          Digitalisasi operasional manual Anda menjadi sistem otomatis cerdas.
          Manajemen resource, billing real-time, dan publisitas instan dalam
          satu platform premium.
        </p>

        <div className="mt-10 md:mt-16 flex flex-col gap-4 sm:flex-row justify-center items-center px-4">
          <Link href="/register" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="group h-16 md:h-20 w-full sm:w-auto px-10 md:px-16 text-lg md:text-xl font-bold rounded-2xl bg-blue-600 shadow-[0_15px_40px_-10px_rgba(59,130,246,0.5)] hover:bg-blue-700 transition-all hover:-translate-y-2 text-white"
            >
              Mulai Bisnis Sekarang
              <ArrowRight className="ml-3 h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:translate-x-2" />
            </Button>
          </Link>
          <Link href="/pricing" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="h-16 md:h-20 w-full sm:w-auto px-10 md:px-16 text-lg md:text-xl font-bold rounded-2xl border-2 border-border bg-background/20 backdrop-blur-2xl hover:bg-secondary transition-all"
            >
              Lihat Paket Harga
            </Button>
          </Link>
        </div>

        {/* --- INTERACTIVE DASHBOARD PREVIEW --- */}
        <div className="mt-24 md:mt-40 relative mx-auto max-w-7xl group">
          <div className="absolute -inset-2 md:-inset-4 rounded-[2rem] md:rounded-[3.5rem] bg-gradient-to-r from-blue-600/30 to-indigo-600/30 opacity-20 blur-2xl md:blur-3xl transition duration-1000 group-hover:opacity-40" />
          <div className="relative rounded-[1.5rem] md:rounded-[3rem] border border-white/10 bg-card/30 p-2 md:p-4 shadow-2xl backdrop-blur-md overflow-hidden">
            <div className="overflow-hidden rounded-[1rem] md:rounded-[2rem] border border-white/5 bg-background/50">
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426"
                alt="Bookinaja Dashboard"
                className="w-full object-cover aspect-[4/3] md:aspect-[16/9] opacity-95 transition-transform duration-1000 group-hover:scale-[1.02]"
              />
            </div>
            {/* Live Widget Overlay - Visible only on Desktop */}
            <div className="absolute bottom-12 left-12 p-6 rounded-2xl bg-background/95 border border-border shadow-2xl animate-bounce-slow hidden lg:block backdrop-blur-md">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-600">
                  <Activity className="h-7 w-7" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                    Live Occupancy
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    84% Capacity
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTOR USE-CASES --- */}
      <section
        id="industries"
        className="container relative z-10 mx-auto px-6 py-20 md:py-32"
      >
        <div className="text-center mb-16 md:mb-24 space-y-4">
          <Badge
            variant="outline"
            className="border-blue-500/20 text-blue-500 font-bold tracking-widest px-4 py-1"
          >
            INDUSTRIES
          </Badge>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter">
            Solusi untuk Semua <span className="text-blue-500">Resource.</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-xl font-medium">
            Platform fleksibel untuk berbagai unit bisnis persewaan dan jasa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <SectorCard
            icon={<Monitor />}
            title="Gaming Hub & PS"
            desc="Manajemen billing per jam otomatis dengan fitur preventif double-booking."
          />
          <SectorCard
            icon={<Camera />}
            title="Photo & Video Studio"
            desc="Booking jadwal pemotretan dan manajemen alat dalam satu kalender terpusat."
          />
          <SectorCard
            icon={<Zap />}
            title="Sport Center & Court"
            desc="Digitalisasi lapangan futsal, badminton, atau tennis dengan sistem DP otomatis."
          />
          <SectorCard
            icon={<Briefcase />}
            title="Co-Working Space"
            desc="Sewa meja harian atau meeting room per jam dengan dashboard pelanggan mandiri."
          />
          <SectorCard
            icon={<Coffee />}
            title="Cafe & Social Space"
            desc="Reservasi meja untuk event atau penggunaan private space secara terukur."
          />
          <SectorCard
            icon={<PlayCircle />}
            title="Podcast Room"
            desc="Penjadwalan ruangan kedap suara dengan sistem add-ons peralatan otomatis."
          />
        </div>
      </section>

      {/* --- TRUST STATS --- */}
      <section className="container relative z-10 mx-auto px-6 py-12 md:py-20 bg-background/5 backdrop-blur-sm border-y border-border/50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 py-8">
          <StatCard label="Active Tenants" value="1,200+" icon={<Users />} />
          <StatCard label="Monthly Vol" value="Rp 42B+" icon={<Wallet />} />
          <StatCard label="Uptime" value="99.9%" icon={<ShieldCheck />} />
          <StatCard label="Rating" value="4.9/5" icon={<Star />} />
        </div>
      </section>

      {/* --- VALUE PROPOSITION: B2B ENGINE --- */}
      <section className="w-full relative z-10 bg-secondary/15 py-24 md:py-40 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row justify-between items-center lg:items-end mb-16 md:mb-24 gap-8 text-center lg:text-left">
            <div className="space-y-4 md:space-y-6 max-w-2xl">
              <h2 className="text-4xl md:text-8xl font-black font-syne uppercase tracking-tighter leading-none">
                Engine <br className="hidden md:block" />{" "}
                <span className="text-blue-500">Pertumbuhan.</span>
              </h2>
              <p className="text-muted-foreground text-lg md:text-2xl font-medium">
                Kami membangun infrastruktur yang mengonversi operasional
                menjadi profit murni.
              </p>
            </div>
            <Link href="#features" scroll={true}>
              <Button
                variant="link"
                className="text-blue-500 font-bold text-base md:text-lg p-0 flex items-center gap-2 group"
              >
                Pelajari Semua Fitur{" "}
                <ArrowUpRight className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 md:gap-12">
            <ValueCard
              icon={<Rocket />}
              title="Revenue Generator"
              points={[
                "Dynamic Pricing Engine (Harga Weekend Otomatis)",
                "No-Show Protection via DP (Midtrans)",
                "Upselling Paket Snack & Extend Jam",
              ]}
            />
            <ValueCard
              icon={<ShieldCheck />}
              title="Cost Efficiency"
              points={[
                "Digital Concierge 24/7 (Tanpa Admin Malam)",
                "Otomasi Reminder WhatsApp Business API",
                "Sistem Self Check-in Mandiri via QR",
              ]}
            />
            <ValueCard
              icon={<BarChart3 />}
              title="Scale & Analytics"
              points={[
                "Multi-Branch Centralized Dashboard",
                "Laporan P&L Real-time Audit",
                "Prediksi Jam Ramai via Analitik Data",
              ]}
            />
          </div>
        </div>
      </section>

      {/* --- FEATURE DEEP DIVE: AI & DOMAIN --- */}
      <section
        id="features"
        className="container relative z-10 mx-auto px-6 py-24 md:py-48 space-y-32 md:space-y-64"
      >
        {/* AI SECTION */}
        <div className="flex flex-col lg:flex-row items-center gap-16 md:gap-32">
          <div className="flex-1 space-y-6 md:space-y-10 text-left">
            <Badge className="bg-blue-600/10 text-blue-500 border-none font-bold px-4 md:px-5 py-1.5 md:py-2">
              AI-POWERED DIGITALIZATION
            </Badge>
            <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-[1.1] text-foreground">
              Konversi Manual <br />
              <span className="text-blue-600">Jadi Digital.</span>
            </h2>
            <p className="text-lg md:text-2xl text-muted-foreground leading-relaxed font-medium">
              Teknologi AI Menu Sync mengenali katalog layanan fisik Anda dan
              mengubahnya menjadi unit digital siap booking dalam hitungan
              detik.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 pt-4 md:pt-6">
              <FeatureItem icon={<Clock />} text="Smart Scheduling" />
              <FeatureItem icon={<Layers />} text="AI Inventory Sync" />
              <FeatureItem icon={<QrCode />} text="QR Billing Tracking" />
              <FeatureItem icon={<Smartphone />} text="Real-time Status" />
            </div>
          </div>
          <div className="flex-1 w-full relative group">
            <div className="absolute -inset-6 md:-inset-10 rounded-[3rem] md:rounded-[5rem] bg-blue-600/10 blur-[60px] md:blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative bg-card/40 backdrop-blur-2xl rounded-[2.5rem] md:rounded-[4rem] p-12 md:p-20 border border-border flex items-center justify-center shadow-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent" />
              <Sparkles className="h-32 w-32 md:h-64 md:w-64 text-blue-600 animate-pulse relative z-10" />
            </div>
          </div>
        </div>

        {/* DOMAIN SECTION */}
        <div className="flex flex-col lg:flex-row-reverse items-center gap-16 md:gap-32">
          <div className="flex-1 space-y-6 md:space-y-10 text-left">
            <Badge className="bg-indigo-600/10 text-indigo-500 border-none font-bold px-4 md:px-5 py-1.5 md:py-2">
              INSTANT PUBLISITAS
            </Badge>
            <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-[1.1] text-foreground">
              Landing Page <br />
              <span className="text-indigo-600">Otomatis.</span>
            </h2>
            <p className="text-lg md:text-2xl text-muted-foreground leading-relaxed font-medium">
              Setiap tenant mendapatkan subdomain eksklusif yang dioptimasi
              untuk SEO. Branding instan untuk memperluas jangkauan bisnis Anda
              secara nasional.
            </p>
            <div className="group relative p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] bg-indigo-600/5 border border-indigo-600/20 font-mono text-lg md:text-3xl text-indigo-500 shadow-3xl overflow-hidden text-center sm:text-left transition-all hover:scale-[1.02]">
              <span className="relative z-10">bisnis-anda.bookinaja.com</span>
              <div className="absolute inset-0 bg-indigo-600/10 translate-x-full group-hover:translate-x-0 transition-transform duration-1000" />
            </div>
          </div>
          <div className="flex-1 w-full relative">
            <div className="absolute -inset-6 md:-inset-8 rounded-[3rem] md:rounded-[4rem] bg-indigo-600/15 blur-[80px] md:blur-[120px]" />
            <div className="relative aspect-video bg-card/50 backdrop-blur-2xl border border-border rounded-[2rem] md:rounded-[3.5rem] shadow-[0_30px_60px_-10px_rgba(0,0,0,0.5)] overflow-hidden group">
              <img
                src="https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?auto=format&fit=crop&q=80&w=2426"
                alt="Subdomain Preview"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="container relative z-10 mx-auto px-6 pb-24 md:pb-48">
        <div className="relative overflow-hidden rounded-[3rem] md:rounded-[5rem] bg-slate-950 px-6 md:px-8 py-24 md:py-40 text-center shadow-3xl border border-white/10">
          <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 h-[40rem] w-[40rem] bg-blue-600 rounded-full blur-[150px] md:blur-[200px] opacity-30 animate-pulse" />

          <div className="relative z-10 mx-auto max-w-5xl space-y-10 md:space-y-16">
            <h2 className="text-4xl font-black text-white sm:text-9xl tracking-tighter leading-[0.9] md:leading-[0.85]">
              Dominasi Pasar <br /> Sekarang Juga.
            </h2>
            <p className="text-lg text-slate-400 font-medium max-w-3xl mx-auto sm:text-3xl leading-relaxed opacity-80">
              Ganti Buku Tulis Anda dengan Ekosistem Digital dalam 60 detik.
            </p>
            <div className="flex justify-center pt-4 md:pt-8">
              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="h-20 md:h-24 w-full sm:w-auto px-12 md:px-28 text-xl md:text-3xl font-black rounded-[2rem] md:rounded-[3rem] bg-white text-slate-950 hover:bg-slate-100 transition-all hover:scale-[1.05] active:scale-95 shadow-[0_0_100px_rgba(255,255,255,0.1)]"
                >
                  Bangun Bisnis Sekarang
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * REUSABLE COMPONENTS
 */

function SectorCard({
  icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-card/20 backdrop-blur-xl border border-border/50 hover:border-blue-500/50 transition-all group">
      <div className="mb-6 md:mb-8 h-12 w-12 md:h-16 md:w-16 flex items-center justify-center rounded-2xl bg-blue-600/10 text-blue-500 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl md:text-2xl font-black mb-3 md:mb-4 tracking-tighter text-foreground">
        {title}
      </h3>
      <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
        {desc}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <div className="flex flex-col items-center justify-center space-y-2 md:space-y-4 group">
      <div className="text-blue-500 mb-1 md:mb-2 group-hover:scale-125 transition-transform duration-500">
        {icon}
      </div>
      <div className="text-2xl md:text-5xl font-black text-foreground tracking-tighter leading-none">
        {value}
      </div>
      <div className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 text-center">
        {label}
      </div>
    </div>
  );
}

function ValueCard({
  icon,
  title,
  points,
}: {
  icon: any;
  title: string;
  points: string[];
}) {
  return (
    <div className="p-10 md:p-14 rounded-[2.5rem] md:rounded-[4rem] bg-card/20 backdrop-blur-2xl border border-border/50 hover:border-blue-500/50 transition-all group relative overflow-hidden">
      <div className="mb-8 md:mb-12 flex h-16 w-16 md:h-24 md:w-24 items-center justify-center rounded-[1.5rem] md:rounded-[2.5rem] bg-blue-600/10 text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all duration-700 shadow-2xl">
        {icon}
      </div>
      <h3 className="text-2xl md:text-4xl font-black mb-6 md:mb-10 tracking-tighter text-foreground leading-[1.0]">
        {title}
      </h3>
      <ul className="space-y-4 md:space-y-6">
        {points.map((p) => (
          <li
            key={p}
            className="flex items-start gap-3 md:gap-5 text-sm md:text-lg text-muted-foreground font-semibold group/item leading-tight"
          >
            <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 group-hover/item:scale-[1.8] transition-all shrink-0" />
            {p}
          </li>
        ))}
      </ul>
      <div className="absolute -bottom-24 -right-24 h-48 w-48 bg-blue-600/5 blur-3xl rounded-full" />
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-4 md:gap-5 font-black text-base md:text-xl text-foreground group">
      <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-secondary flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
        {icon}
      </div>
      <span>{text}</span>
    </div>
  );
}
