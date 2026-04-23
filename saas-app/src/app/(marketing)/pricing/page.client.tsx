"use client";

import { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * PRICING PAGE - BOOKINAJA.COM
 * Logic: Annual price displayed as "effective monthly" to lower barrier.
 * Features: Starter (Single Owner) vs Pro (Multi-Role Staff).
 */
export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const plans = [
    {
      name: "Starter",
      effectiveMonthly: isAnnual ? "149.000" : "149.000",
      originalMonthly: "189.000",
      originalAnnualTotal: "2.268.000",
      annualTotal: "1.788.000",
      desc: "Cocok buat tenant yang baru mulai dan ingin fokus validasi pelanggan.",
      features: [
        "Free trial 30 hari",
        "1 Akun Utama (Owner Only)",
        "Akses Full Dashboard Admin",
        "Website Booking (Subdomain)",
        "Sampai 10 pelanggan aktif",
        "Laporan Pendapatan Bulanan",
        "Email & Chat Support",
      ],
      cta: "Pilih Starter",
      popular: false,
    },
    {
      name: "Pro",
      effectiveMonthly: isAnnual ? "299.000" : "299.000",
      originalMonthly: "399.000",
      originalAnnualTotal: "4.788.000",
      annualTotal: "3.588.000",
      desc: "Untuk tenant yang ingin scale, repeat order, dan database pelanggan lebih besar.",
      features: [
        "Akses Akun Staff/Karyawan",
        "Role-Based Access (Admin/Kasir)",
        "Unlimited pelanggan",
        "Blast WhatsApp ke semua pelanggan",
        "Dashboard Status Live Real-time",
        "Sistem Harga Khusus Weekend",
        "WhatsApp Reminder Otomatis",
        "Prioritas Support 24/7",
      ],
      cta: "Pilih Pro",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      desc: "Dukungan eksklusif untuk jaringan bisnis skala nasional.",
      features: [
        "Custom Domain (bisnisanda.com)",
        "Hapus Logo & Branding Bookinaja",
        "Unlimited Multi-User Roles",
        "Analitik Data Konsumen Lanjutan",
        "SLA & Akun Manajer Khusus",
        "Setup Dibantu Tim Ahli",
      ],
      cta: "Hubungi Sales",
      popular: false,
    },
  ];

  return (
    <section className="relative flex-1 flex flex-col items-center py-24 md:py-32 overflow-hidden selection:bg-blue-600/30">
      {/* --- DYNAMIC BACKGROUND SYSTEM --- */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.15)_0%,transparent_70%)]" />
        <div className="sticky top-0 h-screen w-full overflow-hidden opacity-40">
          <div className="absolute top-[-10%] right-[-10%] h-[40rem] w-[40rem] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[10%] left-[-10%] h-[35rem] w-[35rem] rounded-full bg-indigo-600/10 blur-[100px]" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_100%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* --- HEADER SECTION --- */}
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-6 text-center mb-20">
          <Badge
            variant="outline"
            className="border-blue-500/20 bg-blue-500/5 text-blue-500 px-5 py-1.5 font-syne text-[10px] font-bold uppercase tracking-widest"
          >
            30 Hari Free Trial
          </Badge>
          <h1 className="text-5xl font-black tracking-tighter sm:text-7xl text-foreground leading-[0.9]">
            Fokus ke <br />
            <span className="text-blue-500 italic">Pelanggan yang Balik Lagi.</span>
          </h1>
          <p className="max-w-[32rem] text-lg md:text-xl text-muted-foreground font-medium">
            Free trial 30 hari, lalu lanjut ke paket yang paling sesuai dengan
            jumlah pelanggan dan kebutuhan operasional tenant Anda.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span className="rounded-full border border-blue-500/15 bg-blue-500/5 px-3 py-1 text-blue-600">
              Starter: 10 pelanggan
            </span>
            <span className="rounded-full border border-emerald-500/15 bg-emerald-500/5 px-3 py-1 text-emerald-600">
              Pro: unlimited pelanggan
            </span>
            <span className="rounded-full border border-slate-200 bg-white/60 px-3 py-1">
              Blast WhatsApp tersedia
            </span>
          </div>

          {/* Billing Switcher */}
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
                  Rekomendasi
                </div>
              )}

              <div className="mb-8 text-center lg:text-left">
                <h3 className="text-2xl font-black tracking-tight">
                  {plan.name}
                </h3>
                <p className="mt-3 text-sm text-muted-foreground font-medium leading-relaxed">
                  {plan.desc}
                </p>
              </div>

              <div className="mb-10 flex flex-col items-center lg:items-start">
                {plan.name !== "Enterprise" && (
                  <div className="text-sm font-bold text-muted-foreground/40 line-through mb-1 italic">
                    IDR {plan.originalMonthly}
                  </div>
                )}

                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-black text-muted-foreground uppercase">
                    IDR
                  </span>
                  <span className="text-5xl md:text-6xl font-black tracking-tighter text-foreground">
                    {plan.name === "Enterprise"
                      ? "Custom"
                      : plan.effectiveMonthly}
                  </span>
                  {plan.name !== "Enterprise" && (
                    <span className="text-sm font-bold text-muted-foreground">
                      /bln
                    </span>
                  )}
                </div>

                {plan.name !== "Enterprise" && isAnnual && (
                  <div className="mt-2 space-y-1.5">
                    <div className="text-[11px] font-bold text-muted-foreground/40 line-through uppercase tracking-widest">
                      IDR {plan.originalAnnualTotal}
                    </div>
                    <div className="text-[11px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/5 px-3 py-1 rounded-full border border-blue-500/10 inline-flex">
                      Tagihan tahunan IDR {plan.annualTotal}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-6 mb-10 border-t border-border pt-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
                  Layanan Tersedia:
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

              <Link
                href={
                  plan.name === "Enterprise"
                    ? "/register"
                    : `/register?plan=${plan.name === "Starter" ? "starter" : "pro"}&interval=${isAnnual ? "annual" : "monthly"}`
                }
                className="w-full group"
              >
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

        {/* --- COMPARISON TABLE --- */}
        <div className="mt-20 max-w-6xl mx-auto rounded-[2.5rem] border border-border/60 bg-card/40 backdrop-blur-sm p-6 md:p-10 shadow-sm">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                Bandingkan Paket Secara Cepat
              </h2>
              <p className="text-sm font-semibold text-muted-foreground max-w-3xl">
                Kalau kamu masih ragu, tabel ini merangkum fitur pembeda paling penting.
              </p>
            </div>
            <Link href="/documentation">
              <Button variant="secondary" className="rounded-2xl font-black uppercase tracking-widest">
                Baca Documentation
              </Button>
            </Link>
          </div>

          <div className="mt-6">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[45%]">Fitur</TableHead>
                  <TableHead>Starter</TableHead>
                  <TableHead>Pro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { label: "Website Booking Tenant", starter: true, pro: true },
                  { label: "Dashboard Admin", starter: true, pro: true },
                  { label: "Staff / Role-based Access", starter: false, pro: true },
                  { label: "Unit & Resource Tanpa Batas", starter: false, pro: true },
                  { label: "Weekend Pricing / Special Rules", starter: false, pro: true },
                  { label: "Prioritas Support", starter: false, pro: true },
                ].map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="font-semibold text-muted-foreground whitespace-normal">
                      {row.label}
                    </TableCell>
                    <TableCell>
                      {row.starter ? (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 font-black">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.pro ? (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 font-black">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* --- TRUST FOOTER (Midtrans Compliance) --- */}
        <div className="mt-24 max-w-4xl mx-auto grid md:grid-cols-3 gap-8 py-12 border-t border-border/50">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/5 flex items-center justify-center text-blue-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-sm text-foreground">
              Aman & Terenkripsi
            </h4>
            <p className="text-xs text-muted-foreground text-pretty">
              Pembayaran diproteksi oleh standar AES-256 dan 3D Secure Midtrans.
            </p>
          </div>
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/5 flex items-center justify-center text-blue-500">
              <Zap className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-sm text-foreground">
              Aktif Seketika
            </h4>
            <p className="text-xs text-muted-foreground text-pretty">
              Layanan otomatis aktif sesaat setelah pembayaran berhasil.
            </p>
          </div>
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/5 flex items-center justify-center text-blue-500">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-sm text-foreground">
              Bantuan Teknis
            </h4>
            <p className="text-xs text-muted-foreground text-pretty">
              Tim support kami siap membantu setiap kendala bisnis Anda.
            </p>
          </div>
        </div>

        <p className="mt-16 text-center text-sm text-muted-foreground font-medium">
          Ragu memilih paket? Cek dulu{" "}
          <Link href="/demos" className="text-blue-500 font-bold hover:underline underline-offset-4">
            Live Demo Sistem
          </Link>{" "}
          atau{" "}
          <Link
            href="mailto:support@bookinaja.com"
            className="text-blue-500 font-bold hover:underline underline-offset-4"
          >
            Konsultasi Gratis
          </Link>
        </p>
      </div>
    </section>
  );
}
