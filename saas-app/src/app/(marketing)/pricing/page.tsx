"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  Zap,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * PRICING PAGE - BOOKINAJA.COM
 * Dioptimasi untuk Review Midtrans & Konversi B2B SaaS Profesional
 */
export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);

  // Definisi Paket (Data Detail untuk Transparansi Bank/Midtrans)
  const plans = [
    {
      name: "Starter",
      price: "0",
      rawPrice: 0,
      desc: "Ideal untuk UMKM yang baru memulai digitalisasi operasional.",
      features: [
        "1 Resource (Meja/Ruangan/Unit)",
        "Maks. 50 Reservasi per bulan",
        "Subdomain bookinaja.com",
        "Laporan Pendapatan Dasar",
        "Email Support (Jam Kerja)",
      ],
      cta: "Mulai Gratis",
      popular: false,
    },
    {
      name: "Professional",
      price: isAnnual ? "119.000" : "149.000",
      rawPrice: isAnnual ? 119000 : 149000,
      desc: "Fitur lengkap untuk bisnis persewaan dengan mobilitas tinggi.",
      features: [
        "Unlimited Resource & Spot",
        "Reservasi & Booking Tanpa Batas",
        "Dashboard Analytics Real-time",
        "WhatsApp Business Notification",
        "Dynamic Pricing Engine",
        "Prioritas Support 24/7",
      ],
      cta: "Coba Pro 14 Hari",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      rawPrice: null,
      desc: "Solusi kustom untuk jaringan bisnis nasional dan franchise.",
      features: [
        "Custom Domain (brandanda.com)",
        "White-label Dashboard Branding",
        "Multi-user & Role Permission",
        "Dedicated Database Instance",
        "SLA & Dedicated Account Manager",
        "Integrasi API Kustom",
      ],
      cta: "Hubungi Sales",
      popular: false,
    },
  ];

  return (
    <section className="relative flex-1 flex flex-col items-center py-24 md:py-32 overflow-hidden">
      {/* --- BACKGROUND SYSTEM (Elite Glassmorphism) --- */}
      <div className="fixed inset-0 -z-10 bg-background">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] translate-x-1/2 rounded-full bg-indigo-600/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 px-6">
        {/* --- HEADER SECTION --- */}
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-6 text-center mb-20">
          <Badge
            variant="outline"
            className="border-blue-500/20 bg-blue-500/5 text-blue-500 px-5 py-1.5 font-syne text-[10px] font-bold uppercase tracking-widest"
          >
            Subscription Plans
          </Badge>
          <h1 className="text-5xl font-black tracking-tighter sm:text-7xl text-foreground">
            Investasi Cerdas untuk <br />
            <span className="text-blue-500 italic">Pertumbuhan Bisnis.</span>
          </h1>
          <p className="max-w-[32rem] text-lg md:text-xl text-muted-foreground font-medium">
            Harga transparan dalam Rupiah (IDR). Tanpa biaya tersembunyi.
            Batalkan langganan kapan saja.
          </p>

          {/* Billing Switcher (PBI Compliance: Clear IDR Info) */}
          <div className="flex items-center gap-5 mt-8 p-1.5 bg-secondary/30 backdrop-blur-md rounded-2xl border border-border">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                "px-6 py-2.5 text-sm font-bold rounded-xl transition-all",
                !isAnnual
                  ? "bg-background shadow-lg text-blue-500"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Bulanan
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={cn(
                "px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2",
                isAnnual
                  ? "bg-background shadow-lg text-blue-500"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Tahunan
              <Badge className="bg-green-500/10 text-green-600 border-none text-[10px] px-2 py-0">
                {" "}
                Hemat 20%{" "}
              </Badge>
            </button>
          </div>
        </div>

        {/* --- PRICING CARDS GRID --- */}
        <div className="grid w-full gap-8 lg:grid-cols-3 items-stretch max-w-7xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-[3rem] border p-10 transition-all duration-500 hover:shadow-[0_40px_80px_-15px_rgba(59,130,246,0.15)]",
                plan.popular
                  ? "border-blue-500 bg-card shadow-2xl ring-4 ring-blue-500/5 z-20 scale-105"
                  : "border-border/60 bg-card/40 backdrop-blur-sm shadow-sm hover:border-blue-500/30",
              )}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-blue-500 px-6 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
                  <Sparkles className="h-3.5 w-3.5 fill-white" />
                  Most Popular
                </div>
              )}

              <div className="mb-10">
                <h3 className="text-2xl font-black tracking-tight">
                  {plan.name}
                </h3>
                <p className="mt-3 text-sm text-muted-foreground font-medium leading-relaxed">
                  {plan.desc}
                </p>
              </div>

              <div className="mb-10 flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-black text-muted-foreground uppercase">
                    IDR
                  </span>
                  <span className="text-5xl md:text-6xl font-black tracking-tighter text-foreground">
                    {plan.price}
                  </span>
                </div>
                <div className="text-xs font-bold text-muted-foreground mt-2 uppercase tracking-widest">
                  Per {isAnnual ? "Tahun" : "Bulan"} per Tenant
                </div>
              </div>

              <div className="flex-1 space-y-6 mb-10 border-t border-border pt-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
                  Fitur Utama & Layanan:
                </p>
                <ul className="space-y-4">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-4 text-sm font-semibold text-muted-foreground group"
                    >
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span className="leading-tight group-hover:text-foreground transition-colors">
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link href="/register" className="w-full group">
                <Button
                  className={cn(
                    "w-full h-16 text-lg font-black rounded-2xl transition-all active:scale-95",
                    plan.popular
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20"
                      : "bg-secondary text-foreground hover:bg-blue-500 hover:text-white",
                  )}
                  variant={plan.popular ? "default" : "secondary"}
                >
                  {plan.cta}
                  <ChevronRight className="ml-2 h-5 w-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* --- MIDTRANS TRUST FOOTER --- */}
        <div className="mt-24 max-w-4xl mx-auto grid md:grid-cols-3 gap-8 py-12 border-t border-border/50">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/5 flex items-center justify-center text-blue-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-sm">Secure Payment</h4>
            <p className="text-xs text-muted-foreground">
              Diproteksi oleh standar keamanan AES-256 dan 3D Secure.
            </p>
          </div>
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/5 flex items-center justify-center text-blue-500">
              <Zap className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-sm">Instant Activation</h4>
            <p className="text-xs text-muted-foreground">
              Sistem aktif dalam 60 detik setelah konfirmasi pembayaran.
            </p>
          </div>
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/5 flex items-center justify-center text-blue-500">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-sm">Refund Guarantee</h4>
            <p className="text-xs text-muted-foreground">
              Kebijakan refund transparan untuk kepuasan pelanggan Anda.
            </p>
          </div>
        </div>

        {/* Final Help Text */}
        <p className="mt-16 text-center text-sm text-muted-foreground font-medium">
          Ada pertanyaan khusus atau butuh demo?{" "}
          <Link
            href="mailto:support@bookinaja.com"
            className="text-blue-500 font-bold hover:underline underline-offset-4"
          >
            Hubungi Tim Support
          </Link>
        </p>
      </div>
    </section>
  );
}
