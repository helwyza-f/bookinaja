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
  Monitor,
  Camera,
  Coffee,
  Briefcase,
  PlayCircle,
  Clock,
  Wallet,
  Smartphone,
  ChevronRight,
  QrCode,
  Layout,
  Command,
  Cpu,
  Workflow,
  Target,
  History,
  TrendingUp,
  UserCheck,
  CreditCard,
  BellRing,
  Map,
  MessageCircle,
  Share2,
  Heart,
} from "lucide-react";
import Link from "next/link";

/**
 * LANDING PAGE COMPONENT - BOOKINAJA.COM
 * Elite B2B SaaS Branding - Jargon-free Copywriting
 * Single Account focus for Maximum Profitability
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
      <section className="container relative z-10 mx-auto px-6 pt-24 pb-20 text-center md:pt-64 md:pb-48">
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
          terima pembayaran digital, dan automasi jadwal bisnis Anda dalam satu
          layar.
        </p>

        <div className="mt-10 md:mt-16 flex flex-col gap-4 sm:flex-row justify-center items-center px-4">
          <Link href="/register" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="group h-16 md:h-20 w-full sm:w-auto px-10 md:px-16 text-lg md:text-xl font-bold rounded-2xl bg-blue-600 shadow-[0_15px_40px_-10px_rgba(59,130,246,0.5)] hover:bg-blue-700 transition-all hover:-translate-y-2 text-white"
            >
              Daftarkan Bisnis Saya
              <ArrowRight className="ml-3 h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:translate-x-2" />
            </Button>
          </Link>
          <Link href="/pricing" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="h-16 md:h-20 w-full sm:w-auto px-10 md:px-16 text-lg md:text-xl font-bold rounded-2xl border-2 border-border bg-background/20 backdrop-blur-2xl hover:bg-secondary transition-all"
            >
              Cek Paket Harga
            </Button>
          </Link>
        </div>

        {/* INTERACTIVE PREVIEW - MOBILE CLEANED */}
        <div className="mt-24 md:mt-40 relative mx-auto max-w-7xl group">
          <div className="absolute -inset-2 md:-inset-4 rounded-[2rem] md:rounded-[3.5rem] bg-gradient-to-r from-blue-600/30 to-indigo-600/30 opacity-20 blur-2xl md:blur-3xl" />
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

      {/* --- WHAT WE DO SECTION --- */}
      <section className="container relative z-10 mx-auto px-6 py-24 md:py-40">
        <div className="grid lg:grid-cols-2 gap-16 md:gap-24 items-center text-center md:text-left">
          <div className="space-y-8 md:space-y-12">
            <div className="space-y-4">
              <Badge
                variant="outline"
                className="text-blue-500 border-blue-500/20 bg-blue-500/5 px-4 py-1"
              >
                APA ITU BOOKINAJA?
              </Badge>
              <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-none">
                Asisten Digital <br />
                <span className="text-blue-500">24 Jam Anda.</span>
              </h2>
            </div>

            <p className="text-lg md:text-2xl text-muted-foreground leading-relaxed font-medium">
              Kami memindahkan bisnis Anda dari buku tulis ke sistem digital.
              Pelanggan bisa cek ketersediaan jam sendiri, bayar langsung, dan
              Anda tinggal terima laporan beres di akhir bulan tanpa pusing
              catat sana-sini.
            </p>

            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="h-10 w-10 mx-auto md:mx-0 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                  <Workflow className="h-5 w-5" />
                </div>
                <h4 className="text-xl font-bold">Otomasi Jadwal</h4>
                <p className="text-muted-foreground text-sm">
                  Gak ada lagi jadwal bentrok. Sistem kunci slot otomatis saat
                  ada pesanan masuk.
                </p>
              </div>
              <div className="space-y-3">
                <div className="h-10 w-10 mx-auto md:mx-0 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h4 className="text-xl font-bold">Simpel & Fokus</h4>
                <p className="text-muted-foreground text-sm">
                  Satu akun untuk satu bisnis. Langsung bisa dipakai cari cuan
                  tanpa ribet.
                </p>
              </div>
            </div>
          </div>

          {/* HIDDEN ON MOBILE FOR CLEANER FLOW */}
          <div className="hidden lg:block relative">
            <div className="absolute -inset-4 bg-blue-600/20 blur-3xl rounded-full opacity-50" />
            <div className="relative grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="aspect-square rounded-[2rem] bg-card border border-border p-8 flex items-center justify-center shadow-xl">
                  <Cpu className="h-12 w-12 text-blue-500" />
                </div>
                <div className="aspect-[4/5] rounded-[2rem] bg-blue-600 p-8 flex flex-col justify-end text-white">
                  <p className="text-2xl font-black leading-none">
                    Sistem <br /> Cerdas.
                  </p>
                </div>
              </div>
              <div className="space-y-4 pt-12">
                <div className="aspect-[4/5] rounded-[2rem] bg-secondary border border-border p-8 flex flex-col justify-between">
                  <ShieldCheck className="h-10 w-10 text-indigo-500" />
                  <p className="text-xl font-bold leading-tight">
                    Data <br /> Aman.
                  </p>
                </div>
                <div className="aspect-square rounded-[2rem] bg-card border border-border p-8 flex items-center justify-center">
                  <Command className="h-12 w-12 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- AUTOMATIC LANDING PAGE SECTION (NEW) --- */}
      <section className="container relative z-10 mx-auto px-6 py-24 md:py-40 border-y border-border/50 bg-secondary/5 backdrop-blur-sm">
        <div className="flex flex-col items-center text-center space-y-12">
          <div className="max-w-3xl space-y-6">
            <Badge
              variant="outline"
              className="text-indigo-500 border-indigo-500/20 bg-indigo-500/5 px-4 py-1"
            >
              PROMOSI TANPA MODAL
            </Badge>
            <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-tight">
              Dapat Website <span className="text-indigo-500">Siap Pakai.</span>
            </h2>
            <p className="text-lg md:text-2xl text-muted-foreground font-medium">
              Gak perlu bayar desainer. Setiap daftar, Anda langsung dapat link
              website profesional atas nama bisnis Anda sendiri.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 w-full max-w-5xl">
            {[
              {
                icon: <Heart className="text-pink-500" />,
                title: "Pasang di Bio IG",
                desc: "Ubah followers jadi pembeli. Pelanggan klik link di bio, langsung pilih jadwal.",
              },
              {
                icon: <MessageCircle className="text-emerald-500" />,
                title: "Share ke WhatsApp",
                desc: "Gak perlu capek balas chat ketersediaan. Kirim link, biarkan pelanggan pesan sendiri.",
              },
              {
                icon: <Share2 className="text-blue-500" />,
                title: "Promosi Dimana Saja",
                desc: "Link website Anda kompatibel dengan semua media sosial dan Google Maps.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-8 rounded-3xl bg-card border border-border hover:border-indigo-500/30 transition-all group"
              >
                <div className="mb-6 h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h4 className="text-xl font-bold mb-3">{item.title}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="w-full max-w-2xl p-6 md:p-8 rounded-[2rem] bg-indigo-600/5 border border-indigo-500/20 font-mono text-lg md:text-2xl text-indigo-500 shadow-xl flex items-center justify-center gap-4">
            <Globe className="h-6 w-6 opacity-50" />
            <span className="truncate">nama-bisnis.bookinaja.com</span>
          </div>
        </div>
      </section>

      {/* --- INDUSTRIES SECTION --- */}
      <section
        id="industries"
        className="container relative z-10 mx-auto px-6 py-20 md:py-32"
      >
        <div className="text-center mb-16 md:mb-24 space-y-4">
          <Badge
            variant="outline"
            className="border-blue-500/20 text-blue-500 font-bold tracking-widest px-4 py-1"
          >
            BIDANG USAHA
          </Badge>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter">
            Satu Aplikasi. <br /> Berbagai{" "}
            <span className="text-blue-500">Macam Bisnis.</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-xl font-medium">
            Apapun yang Anda sewakan, sistem kami siap menanganinya.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 text-left">
          <SectorCard
            icon={<Monitor />}
            title="Rental PS & Gaming Hub"
            desc="Hitung billing per jam otomatis. Gak perlu jagain stopwatch manual lagi."
          />
          <SectorCard
            icon={<Camera />}
            title="Studio Foto & Kreatif"
            desc="Kelola jadwal sewa studio dan paket alat biar gak berantakan."
          />
          <SectorCard
            icon={<Zap />}
            title="Lapangan Olahraga"
            desc="Futsal, Badminton, atau Tennis. Pelanggan bisa cek jam kosong lewat HP."
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

      {/* --- VALUE PROPOSITION --- */}
      <section id="features" className="w-full relative z-10 py-24 md:py-40">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center text-center mb-16 md:mb-32 space-y-6 px-4">
            <Badge className="bg-blue-600/10 text-blue-500 border-none font-bold">
              SOLUSI BISNIS
            </Badge>
            <h2 className="text-4xl md:text-8xl font-black font-syne uppercase tracking-tighter leading-tight">
              Bikin Cuan <span className="text-blue-500">Lancar.</span>
            </h2>
            <p className="text-muted-foreground text-lg md:text-2xl font-medium max-w-3xl leading-snug">
              Dirancang untuk memaksimalkan setiap slot waktu yang Anda miliki.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 md:gap-10">
            <ValueCard
              icon={<Rocket className="text-blue-500" />}
              title="Tambah Pemasukan"
              desc="Optimalkan harga di jam sibuk dan tawarkan paket tambahan saat booking."
              points={[
                "Harga Naik Otomatis di Jam Ramai",
                "Cegah Pelanggan PHP Pakai DP",
                "Tawarkan Paket Snack/Minum",
              ]}
            />
            <ValueCard
              icon={<ShieldCheck className="text-indigo-500" />}
              title="Hemat Waktu"
              desc="Biarkan sistem yang kerja. Anda gak perlu lagi jawab chat ketersediaan satu-satu."
              points={[
                "Pelanggan Pesan Sendiri 24 Jam",
                "Kirim Pengingat Jadwal via WA",
                "Pelanggan Masuk via Scan QR",
              ]}
            />
            <ValueCard
              icon={<BarChart3 className="text-emerald-500" />}
              title="Laporan Jelas"
              desc="Semua data uang masuk dan keluar tercatat otomatis secara real-time."
              points={[
                "Pantau Bisnis dari Mana Saja",
                "Rekap Untung Rugi Otomatis",
                "Tahu Jam Paling Ramai",
              ]}
            />
          </div>
        </div>
      </section>

      {/* --- FEATURE DEEP DIVE --- */}
      <section className="container relative z-10 mx-auto px-6 py-24 md:py-48 space-y-32 md:space-y-64">
        {/* FEATURE 1: LAYOUT & VISUAL */}
        <div className="flex flex-col lg:flex-row items-center gap-16 md:gap-32">
          <div className="flex-1 space-y-6 md:space-y-10 text-center md:text-left">
            <Badge className="bg-blue-600/10 text-blue-500 border-none font-bold px-4 md:px-5 py-1.5 md:py-2">
              UBAH KE DIGITAL
            </Badge>
            <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-[1.1] text-foreground">
              Atur Unit Bisnis <br />
              <span className="text-blue-600">Jadi Lebih Mudah.</span>
            </h2>
            <p className="text-lg md:text-2xl text-muted-foreground leading-relaxed font-medium">
              Gak perlu tebak-tebakan meja atau ruangan mana yang kosong. Lihat
              denah bisnis Anda secara langsung di layar dashboard.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 pt-4 md:pt-6 text-left">
              <FeatureItem icon={<History />} text="Jadwal Antrean Rapi" />
              <FeatureItem icon={<Map />} text="Denah Bisnis Visual" />
              <FeatureItem icon={<QrCode />} text="Scan Cek Total Billing" />
              <FeatureItem icon={<UserCheck />} text="Data Pelanggan Setia" />
            </div>
          </div>

          <div className="hidden lg:block flex-1 w-full relative">
            <div className="aspect-square rounded-[3rem] bg-gradient-to-br from-blue-600/20 to-transparent border border-border p-1 flex items-center justify-center">
              <div className="w-full h-full rounded-[2.8rem] bg-card border border-border flex items-center justify-center shadow-inner">
                <Sparkles className="h-32 w-32 md:h-48 md:w-48 text-blue-500 animate-pulse" />
              </div>
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
              Bikin Bisnis <br /> Jadi Autopilot.
            </h2>
            <p className="text-lg text-slate-400 font-medium max-w-3xl mx-auto sm:text-3xl leading-relaxed opacity-80">
              Buang buku tulis manual Anda. Mulai cari cuan dengan sistem
              digital dalam 60 detik.
            </p>
            <div className="flex justify-center pt-4 md:pt-8">
              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="h-20 md:h-24 w-full sm:w-auto px-12 md:px-28 text-xl md:text-3xl font-black rounded-[2rem] md:rounded-[3rem] bg-white text-slate-950 hover:bg-slate-100 transition-all active:scale-95 shadow-[0_0_100px_rgba(255,255,255,0.1)]"
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
    <div className="p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-card/20 backdrop-blur-xl border border-border/50 hover:border-blue-500/50 transition-all group text-left">
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
    <div className="p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] bg-card/10 backdrop-blur-md border border-border/50 hover:bg-card/20 transition-all group relative overflow-hidden text-left">
      <div className="mb-6 h-12 w-12 flex items-center justify-center rounded-2xl bg-secondary text-foreground group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm">
        {icon}
      </div>
      <h3 className="text-2xl md:text-3xl font-black mb-2 tracking-tighter text-foreground">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
        {desc}
      </p>
      <ul className="space-y-4">
        {points.map((p) => (
          <li
            key={p}
            className="flex items-start gap-4 text-sm md:text-base text-foreground font-semibold group/item"
          >
            <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-600 group-hover/item:scale-[1.8] transition-all shrink-0" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-4 md:gap-5 font-black text-base md:text-xl text-foreground group">
      <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-secondary flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors border border-border">
        {icon}
      </div>
      <span>{text}</span>
    </div>
  );
}
