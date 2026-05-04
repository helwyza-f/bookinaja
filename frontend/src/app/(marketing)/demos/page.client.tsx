"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  Camera,
  Trophy,
  Briefcase,
  Sparkles,
  Clock,
  QrCode,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const DEMOS = [
  {
    id: "gaming",
    title: "Gaming & Rental",
    category: "gaming_hub",
    icon: Monitor,
    color: "from-blue-600 to-indigo-600",
    description:
      "Cocok untuk rental gaming yang butuh billing per jam, DP, dan pelunasan otomatis.",
    features: [
      "Otomasi Durasi Main",
      "Manajemen Paket Member",
      "Inventory Kantin/Snack",
    ],
    demoUrl: "https://gaming-demo.bookinaja.com",
    credential: {
      email: "gamingdemo@gmail.com",
      password: "gamingdemo",
    },
  },
  {
    id: "creative",
    title: "Studio & Creative",
    category: "creative_space",
    icon: Camera,
    color: "from-purple-600 to-pink-600",
    description:
      "Untuk studio foto, podcast, dan creative space dengan jadwal booking yang rapi.",
    features: [
      "Kalender Booking Live",
      "Add-on Sewa Alat",
      "DP Online Otomatis",
    ],
    demoUrl: "https://studio-demo.bookinaja.com",
    credential: {
      email: "studiodemo@gmail.com",
      password: "studiodemo",
    },
  },
  {
    id: "sport",
    title: "Sport & Courts",
    category: "sport_center",
    icon: Trophy,
    color: "from-emerald-600 to-teal-600",
    description:
      "Pas untuk lapangan futsal, badminton, billiard, atau venue olahraga lain.",
    features: [
      "Manajemen Slot Lapangan",
      "Sistem Member Bulanan",
      "Cek Ketersediaan HP",
    ],
    demoUrl: "https://sport-demo.bookinaja.com",
    credential: {
      email: "sportdemo@gmail.com",
      password: "sportdemo",
    },
  },
  {
    id: "social",
    title: "Social & Office",
    category: "social_space",
    icon: Briefcase,
    color: "from-orange-600 to-amber-600",
    description:
      "Untuk meeting room, coworking space, atau office booking yang self-service.",
    features: ["Sewa Meja Harian", "Fasilitas Ruang Rapat", "Check-in QR Code"],
    demoUrl: "https://office-demo.bookinaja.com",
    credential: {
      email: "officedemo@gmail.com",
      password: "officedemo",
    },
  },
];

export default function DemosPage() {
  return (
    <div className="relative min-h-screen pt-24 pb-20 overflow-hidden bg-background">
      {/* --- DYNAMIC BACKGROUND SYSTEM (PRESERVED) --- */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.15)_0%,transparent_70%)]" />
        <div className="sticky top-0 h-screen w-full overflow-hidden opacity-40">
          <div className="absolute top-[-10%] right-[-10%] h-[30rem] w-[30rem] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_100%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-12 space-y-4">
          <Badge
            variant="outline"
            className="rounded-full border-blue-500/30 bg-blue-500/10 px-4 py-1.5 font-syne text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500"
          >
            <Sparkles className="mr-2 h-3.5 w-3.5 fill-current" />
            Eksplorasi Ekosistem
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground leading-[0.95] italic uppercase">
            Pilih <span className="text-blue-600">Model Bisnis</span> Anda.
          </h1>
          <p className="text-base md:text-lg text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            Demo ini menampilkan pengalaman Bookinaja yang sudah disesuaikan
            untuk tiap jenis bisnis. Buka di desktop untuk lihat credential
            login admin console.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {DEMOS.map((demo) => (
            <div
              key={demo.id}
              className="group relative rounded-[2.25rem] border border-border bg-card/50 backdrop-blur-xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl hover:shadow-blue-500/10"
            >
              {/* Card Accent Color */}
              <div
                className={cn(
                  "absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r",
                  demo.color,
                )}
              />

              <div className="p-7 md:p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div
                    className={cn(
                      "h-14 w-14 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl bg-gradient-to-br",
                      demo.color,
                    )}
                  >
                    <demo.icon className="h-7 w-7" />
                  </div>
                  <Badge
                    variant="secondary"
                    className="font-bold text-[10px] uppercase tracking-widest opacity-60 italic"
                  >
                    Demo v1.0
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl md:text-[2rem] font-black tracking-tighter uppercase italic leading-tight">
                    {demo.title}
                  </h3>
                  <p className="text-sm md:text-[15px] text-muted-foreground font-medium leading-relaxed">
                    {demo.description}
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
                    Fitur utama
                  </p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {demo.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                        <span className="text-xs md:text-sm font-bold text-foreground/80 italic uppercase tracking-tight">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hidden md:block rounded-2xl border border-border/70 bg-secondary/40 p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Login admin console demo
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Pakai credential ini untuk masuk ke dashboard admin bisnis
                    contoh. Bukan login customer.
                  </p>
                  <div className="grid gap-1.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Email</span>
                      <code className="font-mono text-foreground text-right break-all">
                        {demo.credential.email}
                      </code>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Password</span>
                      <code className="font-mono text-foreground text-right break-all">
                        {demo.credential.password}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="md:hidden rounded-2xl border border-dashed border-border/70 bg-secondary/30 px-4 py-3">
                  <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                    Demo admin console login ditampilkan penuh di desktop. Di
                    mobile kamu hanya melihat dari pov customer, tanpa akses ke
                    dashboard admin. Buka demo ini di desktop untuk lihat
                    credential login admin console.
                  </p>
                </div>

                <div className="pt-1 flex flex-col sm:flex-row gap-3">
                  <Link href={demo.demoUrl} target="_blank" className="flex-1">
                    <Button className="w-full h-12 rounded-2xl bg-foreground text-background font-black uppercase italic tracking-widest text-[11px] hover:bg-blue-600 transition-colors group/btn">
                      Lihat Demo Live
                      <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  </Link>
                  <Link
                    href={`/register?category=${demo.category}`}
                    className="flex-1"
                  >
                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-2xl font-black uppercase italic tracking-widest text-[11px] border-2"
                    >
                      Gunakan Template
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Notice */}
        <div className="mt-14 p-6 md:p-8 rounded-[2rem] bg-secondary/50 border border-border text-center max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 opacity-50 grayscale">
            <div className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest">
              <Clock className="h-4 w-4" /> Real-time Sync
            </div>
            <div className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest">
              <QrCode className="h-4 w-4" /> QR check-in
            </div>
            <div className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest">
              <ShieldCheck className="h-4 w-4" /> Data Isolated
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
