// src/app/(marketing)/page.client.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap,
  ArrowRight,
  Sparkles,
  Globe,
  Rocket,
  ShieldCheck,
  BarChart3,
  Monitor,
  Camera,
  Coffee,
  Briefcase,
  PlayCircle,
  Clock,
  Smartphone,
  ChevronRight,
  QrCode,
  Command,
  Cpu,
  Workflow,
  TrendingUp,
  UserCheck,
  CreditCard,
  BellRing,
  Map,
  MessageCircle,
  Share2,
  Heart,
  Eye,
  Users2,
  Lock,
  Key,
  Database,
  Cloud,
  Activity,
  BarChart,
  Search,
  Wallet,
} from "lucide-react";
import Link from "next/link";

/**
 * LANDING PAGE COMPONENT - BOOKINAJA.COM
 * Version: 4.0 (No Jargon, Owner-Centric Monitoring, Full Blue Theme)
 */
export default function LandingPage() {
  return (
    <div className="relative flex flex-col items-center selection:bg-blue-600/30 overflow-x-hidden bg-background">
      {/* --- DYNAMIC BACKGROUND SYSTEM --- */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.15)_0%,transparent_70%)]" />
        <div className="sticky top-0 h-screen w-full overflow-hidden opacity-40">
          <div className="absolute top-[-10%] right-[-10%] h-[40rem] w-[40rem] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[10%] left-[-10%] h-[35rem] w-[35rem] rounded-full bg-indigo-600/10 blur-[100px]" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_100%,transparent_100%)]" />
      </div>

      {/* --- HERO SECTION --- */}
      <section className="container relative z-10 mx-auto px-6 pt-24 pb-20 text-center md:pt-56 md:pb-48">
        <div className="flex justify-center mb-6 md:mb-10">
          <Badge
            variant="outline"
            className="rounded-full border-blue-500/30 bg-blue-500/10 px-4 md:px-6 py-1.5 md:py-2 font-syne text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500 backdrop-blur-md"
          >
            <Sparkles className="mr-2 h-3 w-3 md:h-3.5 md:w-3.5 fill-current" />
            Sistem Operasi Bisnis Persewaan No. 1
          </Badge>
        </div>

        <h1 className="max-w-6xl mx-auto text-4xl font-black tracking-tighter sm:text-7xl md:text-9xl text-foreground leading-[0.9] md:leading-[0.85] mb-8 md:mb-12">
          Kelola Bisnis. <br />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 bg-clip-text text-transparent italic">
            Gak Pake Ribet.
          </span>
        </h1>

        <p className="mt-4 md:mt-8 max-w-3xl mx-auto text-base leading-relaxed text-muted-foreground sm:text-2xl font-medium px-2 md:px-4">
          Hentikan pembukuan manual yang berantakan. Pantau ketersediaan slot,
          terima pembayaran digital, dan kontrol penuh akses karyawan dalam satu
          layar.
        </p>

        <div className="mt-10 md:mt-16 flex flex-col gap-4 sm:flex-row justify-center items-center px-4">
          <Link href="/register" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="group h-16 md:h-20 w-full sm:w-auto px-10 md:px-16 text-lg md:text-xl font-bold rounded-2xl bg-blue-600 shadow-[0_15px_40px_-10px_rgba(59,130,246,0.5)] hover:bg-blue-700 transition-all hover:-translate-y-2 text-white"
            >
              Mulai Bisnis
              <ArrowRight className="ml-3 h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <Link href="/demos" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              size="lg"
              className="h-16 md:h-20 w-full sm:w-auto px-10 md:px-16 text-lg md:text-xl font-bold rounded-2xl"
            >
              Lihat Demo Sistem
              <Eye className="ml-3 h-5 w-5 md:h-6 md:w-6" />
            </Button>
          </Link>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 text-xs font-bold text-muted-foreground uppercase tracking-[0.25em]">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/pricing" className="hover:text-blue-600 transition-colors">
              Lihat Pricing
            </Link>
            <span className="opacity-30">•</span>
            <Link href="/documentation" className="hover:text-blue-600 transition-colors">
              Documentation
            </Link>
            <span className="opacity-30">•</span>
            <Link href="/faq" className="hover:text-blue-600 transition-colors">
              FAQ
            </Link>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 opacity-80">
            {["Gaming Rental", "Studio", "Sport Courts", "Coworking"].map((t) => (
              <span
                key={t}
                className="rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1 text-[10px] font-black tracking-widest text-blue-600"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* MAIN PREVIEW CARD */}
        <div className="mt-24 md:mt-40 relative mx-auto max-w-7xl group">
          <div className="absolute -inset-2 md:-inset-4 rounded-[2rem] md:rounded-[3.5rem] bg-gradient-to-r from-blue-600/30 to-indigo-600/30 opacity-20 blur-2xl md:blur-3xl transition duration-1000 group-hover:opacity-40" />
          <div className="relative rounded-[1.5rem] md:rounded-[3rem] border border-white/10 bg-card/30 p-2 md:p-4 shadow-2xl backdrop-blur-md overflow-hidden">
            <div className="overflow-hidden rounded-[1rem] md:rounded-[2rem] border border-white/5 bg-background/50">
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426"
                alt="Dashboard Bookinaja"
                className="w-full object-cover aspect-[4/3] md:aspect-[16/9] opacity-90 transition-transform duration-1000 group-hover:scale-[1.02]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- OWNER MONITORING SECTION (JARGON-FREE) --- */}
      <section className="container relative z-10 mx-auto px-6 py-20 md:py-40">
        <div className="grid lg:grid-cols-2 gap-16 md:gap-32 items-center">
          <div className="space-y-8 text-center md:text-left">
            <div className="space-y-4">
              <Badge
                variant="outline"
                className="text-blue-500 border-blue-500/20 bg-blue-500/5 px-4 py-1 font-bold"
              >
                KHUSUS PEMILIK
              </Badge>
              <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-none">
                Pantau Kondisi Bisnis <br />
                <span className="text-blue-500 italic">Secara Live.</span>
              </h2>
            </div>
            <p className="text-lg md:text-2xl text-muted-foreground font-medium leading-relaxed">
              Gak perlu bolak-balik ke lokasi atau telepon staff cuma buat tanya
              "Lagi ramai gak?". Cukup buka dashboard dari HP Anda, semua data
              tersaji instan.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 pt-4">
              <div className="flex items-center gap-4 group cursor-default">
                <div className="h-12 w-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                  <Search className="h-6 w-6" />
                </div>
                <p className="font-bold text-foreground italic">
                  Cek Unit Terisi
                </p>
              </div>
              <div className="flex items-center gap-4 group cursor-default">
                <div className="h-12 w-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                  <Wallet className="h-6 w-6" />
                </div>
                <p className="font-bold text-foreground italic">
                  Audit Uang Masuk
                </p>
              </div>
            </div>
          </div>

          {/* Visual Hub Decoration */}
          <div className="hidden lg:grid grid-cols-2 gap-6 relative">
            <div className="absolute inset-0 bg-blue-500/5 blur-[120px] -z-10" />
            <div className="space-y-6">
              <div className="p-8 rounded-[2.5rem] bg-card border border-border shadow-2xl hover:-translate-y-2 transition-transform duration-500">
                <div className="h-10 w-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-600 mb-6">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold text-muted-foreground mb-1 uppercase tracking-widest">
                  Uang Masuk Hari Ini
                </p>
                <p className="text-3xl font-black text-foreground tracking-tighter">
                  IDR 12.4M
                </p>
              </div>
              <div className="p-8 rounded-[2.5rem] bg-blue-600 text-white shadow-3xl hover:-translate-y-2 transition-transform duration-500">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white mb-6">
                  <Users2 className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold opacity-70 mb-1 uppercase tracking-widest">
                  Antrean Aktif
                </p>
                <p className="text-3xl font-black tracking-tighter">
                  42 Booking
                </p>
              </div>
            </div>
            <div className="space-y-6 pt-12">
              <div className="p-8 rounded-[2.5rem] bg-card border border-border shadow-2xl hover:-translate-y-2 transition-transform duration-500">
                <div className="h-10 w-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-600 mb-6">
                  <Cloud className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold text-muted-foreground mb-1 uppercase tracking-widest">
                  Koneksi Server
                </p>
                <p className="text-3xl font-black text-foreground tracking-tighter">
                  Online
                </p>
              </div>
              <div className="p-8 rounded-[2.5rem] bg-secondary/50 backdrop-blur-xl border border-border shadow-2xl hover:-translate-y-2 transition-transform duration-500 flex items-center justify-center">
                <QrCode className="h-16 w-16 text-muted-foreground/30" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- WHAT WE DO SECTION --- */}
      <section className="container relative z-10 mx-auto px-6 py-18 md:py-20 border-t border-border/50">
        <div className="grid lg:grid-cols-2 gap-16 md:gap-24 items-center text-center md:text-left">
          <div className="space-y-8 md:space-y-12">
            <div className="space-y-4">
              <Badge
                variant="outline"
                className="text-blue-500 border-blue-500/20 bg-blue-500/5 px-4 py-1"
              >
                SOLUSI DIGITAL
              </Badge>
              <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-none text-pretty">
                Asisten Digital <br />
                <span className="text-blue-500">24 Jam Anda.</span>
              </h2>
            </div>

            <p className="text-lg md:text-2xl text-muted-foreground leading-relaxed font-medium">
              Kami memindahkan bisnis Anda dari buku tulis ke sistem otomatis.
              Satu akun khusus untuk satu bisnis—fokus, simpel, dan cuan tanpa
              ribet.
            </p>

            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-4 group">
                <div className="h-12 w-12 mx-auto md:mx-0 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  <Workflow className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-extrabold tracking-tight italic uppercase text-xs">
                  Otomasi Jadwal
                </h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Sistem cerdas mengunci slot jam secara otomatis saat booking
                  masuk.
                </p>
              </div>
              <div className="space-y-4 group">
                <div className="h-12 w-12 mx-auto md:mx-0 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-extrabold tracking-tight italic uppercase text-xs">
                  Cuan Maksimal
                </h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Tingkatkan profit dengan manajemen harga weekend otomatis.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT FILLER DECORATION */}
          <div className="hidden lg:block relative group">
            <div className="absolute -inset-4 bg-blue-600/20 blur-3xl rounded-full opacity-30" />
            <div className="relative grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="aspect-square rounded-[2.5rem] bg-card border border-border p-8 flex items-center justify-center shadow-xl hover:scale-105 transition-transform duration-500">
                  <Cpu className="h-14 w-14 text-blue-500" />
                </div>
                <div className="aspect-[4/5] rounded-[2.5rem] bg-blue-600 p-8 flex flex-col justify-end text-white shadow-2xl">
                  <p className="text-2xl font-black leading-none italic uppercase">
                    Master <br /> System.
                  </p>
                </div>
              </div>
              <div className="space-y-4 pt-12">
                <div className="aspect-[4/5] rounded-[2.5rem] bg-secondary border border-border p-8 flex flex-col justify-between hover:scale-105 transition-transform duration-500">
                  <ShieldCheck className="h-12 w-12 text-blue-500" />
                  <p className="text-xl font-black leading-tight text-foreground uppercase italic text-xs">
                    Isolated <br /> Database.
                  </p>
                </div>
                <div className="aspect-square rounded-[2.5rem] bg-card border border-border p-8 flex items-center justify-center shadow-xl">
                  <Command className="h-14 w-14 text-slate-400 opacity-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- STAFF & ROLE ACCESS SECTION --- */}
      <section className="container relative z-10 mx-auto px-6 py-18 md:py-24">
        <div className="flex flex-col lg:flex-row-reverse items-center gap-16 md:gap-24">
          <div className="flex-1 space-y-8 text-center md:text-left">
            <div className="space-y-4">
              <Badge
                variant="outline"
                className="text-blue-500 border-blue-500/20 bg-blue-500/5 px-4 py-1"
              >
                KONTROL STAFF
              </Badge>
              <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-none">
                Manajemen Tim <br />
                <span className="text-blue-500">Aman & Terkendali.</span>
              </h2>
            </div>
            <p className="text-lg md:text-2xl text-muted-foreground font-medium">
              Buat akun khusus untuk karyawan (Kasir/Admin). Batasi akses mereka
              sesuai tugasnya agar operasional tetap jujur.
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  icon: <Key />,
                  title: "Akses Terbatas",
                  desc: "Kasir hanya bisa urus booking, tidak bisa melihat laporan cuan total.",
                },
                {
                  icon: <Lock />,
                  title: "Cegah Kecurangan",
                  desc: "Setiap transaksi terekam permanen, audit keuangan bisnis jadi instan.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex gap-4 items-start p-5 rounded-3xl bg-blue-600/5 border border-blue-500/10 hover:border-blue-500/30 transition-colors text-left text-pretty"
                >
                  <div className="text-blue-600 mt-1">{item.icon}</div>
                  <div>
                    <h5 className="font-bold text-foreground italic">
                      {item.title}
                    </h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex flex-1 justify-center relative group">
            <div className="absolute inset-0 bg-blue-600/10 blur-[100px] opacity-50" />
            <div className="relative p-10 rounded-[3rem] bg-card border border-border shadow-3xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-12 w-12 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-600 font-black">
                  OF
                </div>
                <div>
                  <p className="font-black text-foreground leading-none text-lg italic">
                    Owner Profile
                  </p>
                  <Badge className="bg-blue-600/10 text-blue-600 border-none text-[10px] uppercase font-bold tracking-widest mt-1">
                    Master Admin
                  </Badge>
                </div>
              </div>
              <div className="space-y-4 opacity-40">
                <div className="h-10 w-full bg-secondary rounded-xl animate-pulse" />
                <div className="h-10 w-full bg-secondary rounded-xl" />
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/4 translate-y-1/4 p-8 rounded-[2.5rem] bg-background border-2 border-blue-500 shadow-3xl scale-90 transition-transform group-hover:scale-100">
              <div className="flex items-center gap-4">
                <Users2 className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-bold text-foreground leading-none italic uppercase text-xs">
                    Akun Kasir
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-1">
                    Status: Terbatas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- LANDING PAGE SECTION --- */}
      <section className="container relative z-10 mx-auto px-6 py-18 md:py-20 border-y border-border/50 bg-secondary/5 backdrop-blur-sm">
        <div className="flex flex-col items-center text-center space-y-12">
          <div className="max-w-3xl space-y-6 px-4">
            <Badge
              variant="outline"
              className="text-blue-500 border-blue-500/20 bg-blue-500/5 px-4 py-1 font-bold"
            >
              BRANDING INSTAN
            </Badge>
            <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-tight">
              Website Bisnis <br />
              <span className="text-blue-500 italic">Otomatis Jadi.</span>
            </h2>
            <p className="text-lg md:text-2xl text-muted-foreground font-medium text-pretty">
              Gak perlu sewa desainer. Anda langsung dapat link website
              profesional atas nama bisnis Anda sendiri sejak hari pertama.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 w-full max-w-5xl px-4">
            {[
              {
                icon: <Instagram />,
                title: "Pasang di Bio IG",
                desc: "Followers langsung klik, pilih slot, dan bayar. Ubah Like jadi Cuan.",
              },
              {
                icon: <MessageCircle />,
                title: "Share ke WA",
                desc: "Gak perlu capek balas chat 'Ready jam berapa?'. Kirim link, beres.",
              },
              {
                icon: <Share2 />,
                title: "Branding Elite",
                desc: "Website desain premium yang bikin pelanggan makin percaya sama bisnis Anda.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-8 rounded-[2.5rem] bg-card border border-border hover:border-blue-500/50 transition-all duration-500 group text-left"
              >
                <div className="mb-6 h-14 w-14 rounded-2xl bg-blue-600/5 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                  {item.icon}
                </div>
                <h4 className="text-xl font-black mb-3 tracking-tight italic uppercase text-xs">
                  {item.title}
                </h4>
                <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="w-full max-w-2xl p-8 rounded-[2.5rem] bg-blue-600/5 border border-blue-500/20 font-mono text-lg md:text-3xl text-blue-600 shadow-xl flex items-center justify-center gap-4 group transition-all hover:bg-blue-600/10 mx-4 overflow-hidden">
            <span className="truncate opacity-70 group-hover:opacity-100 transition-opacity">
              https://bisnis-anda.bookinaja.com
            </span>
          </div>
        </div>
      </section>

      {/* --- INDUSTRIES SECTION --- */}
      <section
        id="industries"
        className="container relative z-10 mx-auto px-6 py-20 md:py-32"
      >
        <div className="text-center mb-16 md:mb-24 space-y-4 px-4">
          <Badge
            variant="outline"
            className="border-blue-500/20 text-blue-500 font-bold tracking-widest px-4 py-1 uppercase"
          >
            Bidang Usaha
          </Badge>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.0]">
            Satu Aplikasi. <br /> Berbagai{" "}
            <span className="text-blue-500">Macam Bisnis.</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-xl font-medium">
            Sistem kami siap menangani apapun sektor persewaan Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 px-4">
          <SectorCard
            icon={<Monitor />}
            title="Rental PS & Gaming Hub"
            desc="Hitung billing per jam otomatis. Gak perlu stopwatch manual lagi."
          />
          <SectorCard
            icon={<Camera />}
            title="Studio Foto & Kreatif"
            desc="Kelola jadwal sewa studio dan paket alat biar gak bentrok."
          />
          <SectorCard
            icon={<Zap />}
            title="Lapangan Olahraga"
            desc="Futsal, Badminton, atau Tennis. Pelanggan bisa cek slot kosong lewat HP."
          />
          <SectorCard
            icon={<Briefcase />}
            title="Ruang Meeting & Kantor"
            desc="Sewa meja atau ruangan per jam dengan sistem booking mandiri."
          />
          <SectorCard
            icon={<Coffee />}
            title="Cafe & Reservasi Meja"
            desc="Bantu pelanggan pesan tempat untuk acara atau nongkrong dari rumah."
          />
          <SectorCard
            icon={<PlayCircle />}
            title="Ruang Podcast & Musik"
            desc="Kelola jadwal latihan atau rekaman tanpa perlu admin standby 24 jam."
          />
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="container relative z-10 mx-auto px-6 pb-24 md:pb-48">
        <div className="relative overflow-hidden rounded-[3rem] md:rounded-[5rem] bg-slate-950 px-6 md:px-8 py-24 md:py-40 text-center shadow-3xl border border-white/10 mx-2 md:mx-0">
          <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 h-[40rem] w-[40rem] bg-blue-600 rounded-full blur-[150px] md:blur-[200px] opacity-30 animate-pulse" />

          <div className="relative z-10 mx-auto max-w-5xl space-y-12 md:space-y-16 px-4">
            <div className="space-y-6">
              <h2 className="text-4xl font-black text-white sm:text-9xl tracking-tighter leading-[0.9] md:leading-[0.85]">
                Bikin Bisnis <br /> Jadi Autopilot.
              </h2>
              <p className="text-lg text-slate-400 font-medium max-w-3xl mx-auto sm:text-3xl leading-relaxed opacity-80 text-pretty">
                Masuk ke dashboard demo dan rasakan kemudahan mengelola bisnis
                persewaan masa kini.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-6 pt-4">
              <Link
                href="https://bisnis-contoh.bookinaja.com"
                target="_blank"
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  className="h-20 md:h-24 w-full sm:w-auto px-12 md:px-28 text-xl md:text-3xl font-black rounded-[2.5rem] bg-white text-slate-950 hover:bg-slate-100 transition-all hover:scale-[1.05] active:scale-95 shadow-[0_0_100px_rgba(255,255,255,0.1)]"
                >
                  Lihat Demo Live
                </Button>
              </Link>
              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  variant="link"
                  className="text-white font-bold text-xl underline underline-offset-8 decoration-blue-500 hover:text-blue-400 transition-colors uppercase tracking-widest"
                >
                  Daftar Akun
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-8 pt-10 opacity-30 grayscale contrast-125">
              <div className="flex items-center gap-2 text-white font-black uppercase text-[10px] tracking-widest">
                <ShieldCheck className="h-4 w-4" /> Secure Data
              </div>
              <div className="flex items-center gap-2 text-white font-black uppercase text-[10px] tracking-widest">
                <Zap className="h-4 w-4" /> Instant Setup
              </div>
              <div className="flex items-center gap-2 text-white font-black uppercase text-[10px] tracking-widest">
                <Database className="h-4 w-4" /> Cloud Storage
              </div>
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
    <div className="p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] bg-card/20 backdrop-blur-xl border border-border/50 hover:border-blue-500/50 transition-all duration-500 group text-left shadow-sm hover:shadow-2xl hover:shadow-blue-500/5">
      <div className="mb-8 h-12 w-12 md:h-16 md:w-16 flex items-center justify-center rounded-2xl bg-blue-600/10 text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
        {icon}
      </div>
      <h3 className="text-2xl font-black mb-4 tracking-tighter text-foreground leading-tight italic uppercase text-xs">
        {title}
      </h3>
      <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium opacity-80">
        {desc}
      </p>
    </div>
  );
}

function ValueCard({
  icon,
  title,
  desc,
  points,
}: {
  icon: any;
  title: string;
  desc: string;
  points: string[];
}) {
  return (
    <div className="p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] bg-card/10 backdrop-blur-md border border-border/50 hover:bg-card/20 transition-all duration-700 group relative overflow-hidden text-left">
      <div className="mb-8 h-12 w-12 flex items-center justify-center rounded-2xl bg-secondary text-foreground group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm">
        {icon}
      </div>
      <h3 className="text-2xl md:text-4xl font-black mb-3 tracking-tighter text-foreground italic uppercase text-sm">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mb-10 leading-relaxed font-medium">
        {desc}
      </p>
      <ul className="space-y-5">
        {points.map((p) => (
          <li
            key={p}
            className="flex items-start gap-4 text-sm md:text-lg text-foreground font-black group/item italic uppercase tracking-tight"
          >
            <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 group-hover/item:scale-[1.5] transition-all shrink-0 shadow-[0_0_100px_rgba(59,130,246,1)]" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-5 font-black text-base md:text-xl text-foreground group cursor-default">
      <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-secondary flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 border border-border shadow-sm">
        {icon}
      </div>
      <span className="tracking-tight italic uppercase text-[10px]">
        {text}
      </span>
    </div>
  );
}

function Instagram(props: any) {
  return (
    <svg
      {...props}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
