"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  Camera,
  Trophy,
  Briefcase,
  ArrowRight,
  Sparkles,
  Zap,
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
      "Sistem billing per jam otomatis dengan manajemen unit PS5/PC yang presisi.",
    features: [
      "Otomasi Durasi Main",
      "Manajemen Paket Member",
      "Inventory Kantin/Snack",
    ],
    demoUrl: "https://gaming-demo.bookinaja.com",
  },
  {
    id: "creative",
    title: "Studio & Creative",
    category: "creative_space",
    icon: Camera,
    color: "from-purple-600 to-pink-600",
    description:
      "Kelola jadwal booking studio foto, alat, hingga sesi podcast tanpa bentrok.",
    features: [
      "Kalender Booking Live",
      "Add-on Sewa Alat",
      "DP Online Otomatis",
    ],
    demoUrl: "https://studio-demo.bookinaja.com",
  },
  {
    id: "sport",
    title: "Sport & Courts",
    category: "sport_center",
    icon: Trophy,
    color: "from-emerald-600 to-teal-600",
    description:
      "Sistem reservasi lapangan futsal, badminton, atau billiard dengan jadwal tetap.",
    features: [
      "Manajemen Slot Lapangan",
      "Sistem Member Bulanan",
      "Cek Ketersediaan HP",
    ],
    demoUrl: "https://sport-demo.bookinaja.com",
  },
  {
    id: "social",
    title: "Social & Office",
    category: "social_space",
    icon: Briefcase,
    color: "from-orange-600 to-amber-600",
    description:
      "Booking meeting room atau hot-desk coworking space secara mandiri.",
    features: ["Sewa Meja Harian", "Fasilitas Ruang Rapat", "Check-in QR Code"],
    demoUrl: "https://office-demo.bookinaja.com",
  },
];

export default function DemosPage() {
  return (
    <div className="relative min-h-screen pt-32 pb-24 overflow-hidden bg-background">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-20 space-y-6">
          <Badge
            variant="outline"
            className="rounded-full border-blue-500/30 bg-blue-500/10 px-4 py-1.5 font-syne text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500"
          >
            <Sparkles className="mr-2 h-3.5 w-3.5 fill-current" />
            Eksplorasi Ekosistem
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground leading-[0.9] italic uppercase">
            Pilih <span className="text-blue-600">Model Bisnis</span> Anda.
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
            Lihat bagaimana Bookinaja bekerja secara spesifik untuk industri
            Anda melalui akun demo live kami.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {DEMOS.map((demo) => (
            <div
              key={demo.id}
              className="group relative rounded-[3rem] border border-border bg-card/50 backdrop-blur-xl overflow-hidden hover:border-blue-500/50 transition-all duration-500 hover:-translate-y-2 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10"
            >
              {/* Card Accent Color */}
              <div
                className={cn(
                  "absolute top-0 left-0 w-full h-2 bg-gradient-to-r",
                  demo.color,
                )}
              />

              <div className="p-10 md:p-12 space-y-8">
                <div className="flex justify-between items-start">
                  <div
                    className={cn(
                      "h-16 w-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl bg-gradient-to-br",
                      demo.color,
                    )}
                  >
                    <demo.icon className="h-8 w-8" />
                  </div>
                  <Badge
                    variant="secondary"
                    className="font-bold text-[10px] uppercase tracking-widest opacity-60 italic"
                  >
                    Demo v1.0
                  </Badge>
                </div>

                <div className="space-y-4">
                  <h3 className="text-3xl font-black tracking-tighter uppercase italic">
                    {demo.title}
                  </h3>
                  <p className="text-muted-foreground font-medium leading-relaxed">
                    {demo.description}
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
                    Fitur Unggulan:
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {demo.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                        <span className="text-sm font-bold text-foreground/80 italic uppercase tracking-tight">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-4">
                  <Link href={demo.demoUrl} target="_blank" className="flex-1">
                    <Button className="w-full h-16 rounded-2xl bg-foreground text-background font-black uppercase italic tracking-widest text-xs hover:bg-blue-600 transition-colors group/btn">
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
                      className="w-full h-16 rounded-2xl font-black uppercase italic tracking-widest text-xs border-2"
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
        <div className="mt-20 p-10 rounded-[3rem] bg-secondary/50 border border-border text-center max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-40 grayscale">
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
