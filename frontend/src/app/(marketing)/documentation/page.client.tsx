"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Zap,
  Globe,
  Layers,
  MonitorPlay,
  Check,
  ShieldCheck,
  CreditCard,
  ChevronRight,
  Smartphone,
  ArrowRight,
  TrendingUp,
  Fingerprint,
  Sparkles,
  BarChart3,
  HelpCircle,
  Clock,
  ExternalLink,
  Target,
  Rocket,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

/**
 * --- SUB-KOMPONEN DESIGN SYSTEM ---
 */

function Section({ id, title, subtitle, children }: any) {
  return (
    <section id={id} className="scroll-mt-40 md:scroll-mt-32">
      <div className="space-y-2 px-1">
        <h2 className="text-2xl md:text-4xl font-[1000] italic uppercase tracking-tighter leading-none text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[10px] md:text-xs font-black text-blue-500 uppercase tracking-[0.3em] italic">
            {subtitle}
          </p>
        )}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="group relative rounded-[2rem] border border-border bg-card/40 backdrop-blur-sm p-6 md:p-8 transition-all hover:border-blue-500/50">
      <div className="relative z-10 space-y-4">
        <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-[1000] uppercase italic tracking-tighter text-foreground leading-none">
            {title}
          </h3>
          <p className="text-xs md:text-sm font-semibold text-muted-foreground leading-relaxed">
            {desc}
          </p>
        </div>
      </div>
    </div>
  );
}

function StepItem({ number, title, desc }: any) {
  return (
    <div className="flex gap-4 md:gap-6 group">
      <div className="flex flex-col items-center">
        <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black flex items-center justify-center text-lg md:text-xl font-[1000] italic shadow-xl transition-colors">
          {number}
        </div>
        <div className="flex-1 w-px bg-border my-2 group-last:hidden" />
      </div>
      <div className="pb-8 space-y-2">
        <h4 className="text-lg md:text-xl font-[1000] uppercase italic tracking-tight text-foreground leading-none">
          {title}
        </h4>
        <p className="text-xs md:text-sm font-semibold text-muted-foreground leading-relaxed max-w-xl">
          {desc}
        </p>
      </div>
    </div>
  );
}

/**
 * --- MAIN PAGE COMPONENT ---
 */

export default function DocumentationPage() {
  const [activeTab, setActiveTab] = useState("overview");

  const toc = [
    { name: "Overview", id: "overview" },
    { name: "Identity", id: "identity" },
    { name: "Fitur", id: "features" },
    { name: "Mulai", id: "onboarding" },
    { name: "POS", id: "pos" },
    { name: "Billing", id: "billing" },
    { name: "FAQ", id: "faq" },
  ];

  return (
    <div className="relative min-h-screen bg-background font-plus-jakarta transition-colors duration-500">
      {/* Visual Background Elements */}
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
      <header className="container relative z-10 mx-auto max-w-7xl px-6 pt-24 md:pt-32 pb-10">
        <div className="space-y-4 max-w-4xl">
          <Badge
            variant="outline"
            className="rounded-full border-blue-500/20 bg-blue-500/5 px-4 py-1 font-syne text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 shadow-sm leading-none"
          >
            <BookOpen size={12} className="mr-2" />
            Pusat Bantuan Resmi
          </Badge>
          <h1 className="text-4xl md:text-7xl font-[1000] italic tracking-tighter leading-[0.9] uppercase text-foreground">
            Satu Sistem Untuk <br />
            <span className="text-blue-600 not-italic">Semua Bisnis.</span>
          </h1>
          <p className="text-sm md:text-lg font-bold text-muted-foreground leading-relaxed max-w-xl italic uppercase tracking-tighter opacity-70">
            Panduan lengkap mengoptimalkan operasional bisnis persewaan dan
            boking online Anda dengan platform Bookinaja.
          </p>
        </div>
      </header>

      {/* --- MOBILE STICKY NAV --- */}
      <div className="lg:hidden sticky top-23 z-50 w-full bg-background/80 backdrop-blur-xl border-y border-border px-4 py-3 overflow-x-auto no-scrollbar shadow-lg">
        <div className="flex gap-2 min-w-max">
          {toc.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-[9px] font-black uppercase italic tracking-[0.2em] transition-all",
                activeTab === item.id
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-card text-muted-foreground border border-border",
              )}
            >
              {item.name}
            </a>
          ))}
        </div>
      </div>

      <main className="container relative z-10 mx-auto max-w-7xl px-6 pb-32 mt-8 md:mt-12">
        <div className="grid gap-12 lg:grid-cols-[260px_1fr] items-start">
          {/* SIDEBAR NAV - DESKTOP ONLY */}
          <aside className="hidden lg:block sticky top-40 h-fit">
            <div className="rounded-[2rem] border border-border bg-card/40 backdrop-blur-md p-3 shadow-sm">
              <div className="flex flex-col gap-1">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center justify-between rounded-2xl px-5 py-4 text-[10px] font-black uppercase italic tracking-widest transition-all",
                      activeTab === item.id
                        ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20"
                        : "text-muted-foreground hover:bg-card hover:text-foreground",
                    )}
                  >
                    {item.name}
                    {activeTab === item.id && (
                      <Zap size={10} className="fill-current" />
                    )}
                  </a>
                ))}
              </div>
            </div>
          </aside>

          {/* DOCUMENTATION BODY */}
          <div className="space-y-24 md:space-y-40">
            {/* 1. Overview: Menjawab Bookinaja itu apa */}
            <Section
              id="overview"
              title="Konsep Dasar"
              subtitle="Apa itu platform Bookinaja?"
            >
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-sm md:text-base font-semibold text-muted-foreground leading-relaxed">
                  Bookinaja adalah platform{" "}
                  <b>SaaS (Software as a Service) All-in-One</b> yang dirancang
                  khusus untuk bisnis persewaan resource atau slot waktu. Kami
                  menyediakan infrastruktur digital lengkap yang memisahkan
                  antara <b>Layar Publik (Portal Customer)</b> dan{" "}
                  <b>Layar Internal (Dashboard Admin & POS)</b>.
                </p>
                <div className="grid gap-4 md:grid-cols-2 mt-8">
                  <FeatureCard
                    icon={<Layers size={22} />}
                    title="Multi-Tenant Isolation"
                    desc="Setiap bisnis mendapatkan ruang digital privat. Data pelanggan, inventaris unit, dan laporan keuangan Anda terisolasi aman dalam satu sistem terintegrasi."
                  />
                  <FeatureCard
                    icon={<MonitorPlay size={22} />}
                    title="Automated Scheduling"
                    desc="Sistem mengatur ketersediaan slot secara otomatis. Jika unit telah terisi, sistem akan menutup akses boking pada jam tersebut secara realtime."
                  />
                </div>
              </div>
            </Section>

            {/* 2. Identity */}
            <Section
              id="identity"
              title="Identitas Digital"
              subtitle="Website boking profesional dengan brand Anda."
            >
              <div className="space-y-8">
                <div className="grid gap-6 md:grid-cols-3">
                  <StatCard
                    icon={<Globe size={18} />}
                    title="Subdomain Unik"
                    desc="Dapatkan URL khusus: namabisnis.bookinaja.com"
                  />
                  <StatCard
                    icon={<Fingerprint size={18} />}
                    title="Custom Branding"
                    desc="Atur logo, banner, dan warna identitas bisnis"
                  />
                  <StatCard
                    icon={<ExternalLink size={18} />}
                    title="Mudah Dibagikan"
                    desc="Siap dipasang di bio Instagram & WhatsApp"
                  />
                </div>
                <div className="rounded-[2.5rem] overflow-hidden border border-border bg-slate-950 aspect-[16/9] md:aspect-[21/9] relative group shadow-2xl">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2070')] bg-cover opacity-20 transition-transform duration-1000 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 space-y-2 text-left">
                    <p className="text-blue-500 font-black italic uppercase text-[10px] tracking-[0.3em]">
                      Business Portal
                    </p>
                    <h4 className="text-2xl md:text-4xl font-[1000] italic text-white uppercase tracking-tighter">
                      Portal Reservasi Mandiri.
                    </h4>
                  </div>
                </div>
              </div>
            </Section>

            {/* 3. FITUR SULTAN (CONTENT FILLED) */}
            <Section
              id="features"
              title="Fitur Utama"
              subtitle="Senjata lengkap untuk pengusaha modern."
            >
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-4 p-6 rounded-[2rem] border border-border bg-card/40">
                  <ShieldCheck className="text-blue-500 h-8 w-8" />
                  <h4 className="font-[1000] italic uppercase tracking-tighter">
                    Conflict Guard
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Algoritma cerdas yang mencegah tabrakan jadwal. Sistem
                    otomatis memblokir slot waktu jika unit sedang digunakan
                    atau sudah dibooking orang lain.
                  </p>
                </div>
                <div className="space-y-4 p-6 rounded-[2rem] border border-border bg-card/40">
                  <Users className="text-blue-500 h-8 w-8" />
                  <h4 className="font-[1000] italic uppercase tracking-tighter">
                    Silent CRM
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Setiap pelanggan yang boking otomatis tersimpan dalam
                    database. Anda bisa melihat riwayat kunjungan dan total
                    kontribusi mereka terhadap revenue Anda.
                  </p>
                </div>
                <div className="space-y-4 p-6 rounded-[2rem] border border-border bg-card/40">
                  <Smartphone className="text-blue-500 h-8 w-8" />
                  <h4 className="font-[1000] italic uppercase tracking-tighter">
                    E-Ticket WhatsApp
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Konfirmasi boking dikirim langsung ke WhatsApp pelanggan
                    beserta link detail pesanan. Tidak perlu lagi konfirmasi
                    manual satu per satu.
                  </p>
                </div>
                <div className="space-y-4 p-6 rounded-[2rem] border border-border bg-card/40">
                  <BarChart3 className="text-blue-500 h-8 w-8" />
                  <h4 className="font-[1000] italic uppercase tracking-tighter">
                    Financial Analytics
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pantau grafik pendapatan harian, mingguan, hingga bulanan.
                    Lihat resource mana yang paling laku dan jam berapa bisnis
                    Anda paling ramai.
                  </p>
                </div>
                <div className="space-y-4 p-6 rounded-[2rem] border border-border bg-card/40">
                  <Zap className="text-blue-500 h-8 w-8" />
                  <h4 className="font-[1000] italic uppercase tracking-tighter">
                    Smart Seeding
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Daftar hari ini, jualan hari ini. Pilih kategori bisnis Anda
                    saat mendaftar, dan kami siapkan template unit serta harga
                    awal secara otomatis.
                  </p>
                </div>
                <div className="space-y-4 p-6 rounded-[2rem] border border-border bg-card/40">
                  <Target className="text-blue-500 h-8 w-8" />
                  <h4 className="font-[1000] italic uppercase tracking-tighter">
                    Granular Role
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pisahkan akses antara Owner dan Staff Kasir. Staff hanya
                    bisa mengoperasikan terminal, sementara data keuangan tetap
                    rahasia bagi Anda.
                  </p>
                </div>
              </div>
            </Section>

            {/* 4. Onboarding */}
            <Section
              id="onboarding"
              title="Langkah Persiapan"
              subtitle="Mulai operasional digital dalam 3 tahap mudah."
            >
              <div className="grid lg:grid-cols-2 gap-12 text-left">
                <div className="space-y-2">
                  <StepItem
                    number="01"
                    title="Registrasi Bisnis"
                    desc="Daftarkan akun pengelola, verifikasi email, dan amankan nama subdomain bisnis Anda agar tidak diambil orang lain."
                  />
                  <StepItem
                    number="02"
                    title="Konfigurasi Resource"
                    desc="Input daftar unit (PC, Lapangan, Ruangan), atur durasi minimum boking, dan tetapkan harga per jam atau per sesi."
                  />
                  <StepItem
                    number="03"
                    title="Aktivasi Terminal"
                    desc="Buka dashboard admin untuk memantau status unit secara realtime. Website boking Anda kini siap menerima order pertama."
                  />
                </div>
                <div className="rounded-[2rem] bg-blue-600 p-8 text-white flex flex-col justify-between shadow-2xl shadow-blue-600/20 border-b-8 border-blue-800">
                  <div className="space-y-4">
                    <Rocket size={48} className="fill-white" />
                    <h5 className="text-2xl font-[1000] uppercase italic tracking-tighter leading-none">
                      Instant Activation.
                    </h5>
                    <p className="text-xs font-bold uppercase tracking-widest leading-relaxed opacity-80 italic">
                      Dapatkan website boking profesional kurang dari 60 detik.
                      Kami menangani seluruh infrastruktur cloud, server, dan
                      database untuk Anda.
                    </p>
                  </div>
                  <Link href="/register" className="mt-8">
                    <Button className="w-full h-12 rounded-xl bg-white text-blue-600 font-black uppercase italic tracking-widest hover:bg-slate-100 transition-all">
                      Daftar Sekarang
                    </Button>
                  </Link>
                </div>
              </div>
            </Section>

            {/* 5. POS Terminal */}
            <Section
              id="pos"
              title="Layar Kasir (POS)"
              subtitle="Kendali operasional harian yang cepat & responsif."
            >
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6 text-left">
                  <FeatureCard
                    icon={<MonitorPlay size={20} />}
                    title="Fast Walk-in"
                    desc="Handle pelanggan yang datang langsung dengan input boking manual hanya dalam hitungan detik."
                  />
                  <div className="p-6 rounded-[2rem] border border-border bg-emerald-500/[0.02] space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 italic leading-none">
                      Kemampuan Utama
                    </p>
                    <ul className="space-y-3">
                      {[
                        "Perpanjang durasi instan",
                        "Order menu F&B tambahan",
                        "Integrasi QRIS pembayaran",
                        "Pantau sisa waktu sesi",
                      ].map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-3 text-[10px] font-black text-foreground uppercase tracking-widest leading-none"
                        >
                          <Check size={12} className="text-emerald-500" /> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="md:col-span-2 rounded-[2rem] border border-border bg-slate-900 overflow-hidden relative group p-1 shadow-2xl">
                  <div className="absolute inset-0 bg-blue-600/10 group-hover:opacity-0 transition-opacity" />
                  <div className="bg-background rounded-[1.8rem] h-full p-8 border border-white/5 space-y-6">
                    <div className="flex justify-between items-center border-b border-border pb-4">
                      <Badge className="bg-emerald-500 italic uppercase text-[8px] font-black">
                        Monitoring Aktif
                      </Badge>
                      <Clock
                        size={16}
                        className="text-muted-foreground animate-spin-slow"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-left">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl border border-border bg-card/40 space-y-1"
                        >
                          <p className="text-[9px] font-black text-muted-foreground uppercase leading-none">
                            RESOURCE-0{i}
                          </p>
                          <p className="text-lg font-[1000] italic tabular-nums text-foreground leading-none tracking-tighter">
                            00:45:10
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase text-center italic tracking-widest">
                      Dashboard Kasir Dirancang Untuk Kecepatan Input Tinggi
                    </p>
                  </div>
                </div>
              </div>
            </Section>

            {/* 6. Subscription */}
            <Section
              id="billing"
              title="Subscription"
              subtitle="Berlangganan paket untuk akses fitur penuh."
            >
              <div className="grid md:grid-cols-2 gap-8 items-center text-left">
                <div className="rounded-[2.5rem] bg-slate-950 p-10 text-white relative overflow-hidden border-t border-white/10 shadow-2xl">
                  <CreditCard
                    size={180}
                    className="absolute -right-16 -top-16 opacity-[0.03] rotate-12"
                  />
                  <div className="relative z-10 space-y-8">
                    <h5 className="text-3xl font-[1000] italic uppercase tracking-tighter leading-none">
                      Pembayaran <br />
                      <span className="text-blue-500">Otomatis.</span>
                    </h5>
                    <div className="space-y-3">
                      {[
                        "Virtual Account Perbankan",
                        "E-Wallet (GoPay, QRIS)",
                        "Kartu Kredit & Debit",
                        "Verifikasi Instan 24 Jam",
                      ].map((p) => (
                        <div
                          key={p}
                          className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest opacity-80 leading-none"
                        >
                          <Check size={14} className="text-blue-500" /> {p}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2 text-left">
                    <h4 className="text-xl font-[1000] uppercase italic tracking-tighter text-foreground leading-none">
                      Aman & Terpercaya.
                    </h4>
                    <p className="text-xs md:text-sm font-semibold text-muted-foreground leading-relaxed uppercase tracking-widest italic opacity-80">
                      Sistem pembayaran kami terintegrasi langsung dengan
                      payment gateway berstandar internasional. Paket langganan
                      Anda akan aktif secara otomatis sesaat setelah pembayaran
                      berhasil dikonfirmasi.
                    </p>
                  </div>
                  <StatCard
                    icon={<BarChart3 size={18} />}
                    title="Laporan Revenue"
                    desc="Pantau grafik pendapatan harian"
                  />
                </div>
              </div>
            </Section>

            {/* 7. FAQ */}
            <Section
              id="faq"
              title="Pertanyaan Umum"
              subtitle="Jawaban singkat untuk keraguan Anda."
            >
              <div className="rounded-[2rem] border border-border bg-card/30 p-4 md:p-8">
                <Accordion type="multiple" className="w-full space-y-2">
                  {[
                    {
                      q: "Bagaimana sistem mencegah boking bentrok?",
                      a: "Bookinaja menggunakan mesin Conflict-Guard yang akan mengunci slot waktu secara realtime. Jika sebuah unit sudah dibayar atau dipesan, sistem otomatis menutup akses boking untuk pelanggan lain di jam yang sama.",
                    },
                    {
                      q: "Apakah saya bisa menambah banyak akun staff?",
                      a: "Ya. Pada paket PRO ke atas, Anda dapat menambahkan akun staff kasir dengan hak akses terbatas yang hanya bisa mengelola operasional harian tanpa melihat pengaturan sensitif bisnis.",
                    },
                    {
                      q: "Apakah data pelanggan saya aman?",
                      a: "Keamanan data adalah prioritas kami. Database setiap tenant dipisahkan secara logika dan dienkripsi untuk memastikan kerahasiaan data pelanggan dan transaksi Anda.",
                    },
                    {
                      q: "Bagaimana jika saya ingin berhenti berlangganan?",
                      a: "Anda dapat berhenti berlangganan kapan saja. Akun Anda akan tetap aktif hingga periode langganan saat ini berakhir, tanpa ada denda atau biaya pembatalan.",
                    },
                  ].map((item, idx) => (
                    <AccordionItem
                      key={idx}
                      value={`item-${idx}`}
                      className="border-none bg-background/50 rounded-xl px-5 text-left"
                    >
                      <AccordionTrigger className="text-xs md:text-sm font-black uppercase italic tracking-tight hover:no-underline text-foreground py-5 text-left">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-[11px] md:text-xs font-bold text-muted-foreground uppercase leading-relaxed tracking-wider pb-5 italic">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </Section>

            {/* FINAL CALL TO ACTION */}
            <div className="rounded-[3rem] bg-slate-950 p-12 text-center space-y-6 relative overflow-hidden border border-white/5 shadow-2xl">
              <Zap
                size={300}
                className="absolute -bottom-20 -right-20 opacity-[0.02] text-white rotate-12"
              />
              <h3 className="text-3xl md:text-6xl font-[1000] italic uppercase tracking-tighter text-white leading-none">
                Siap Online <br />
                <span className="text-blue-600">Sekarang?</span>
              </h3>
              <p className="text-slate-500 font-bold uppercase italic tracking-widest text-[10px] md:text-xs max-w-lg mx-auto leading-relaxed text-center">
                Daftarkan bisnis Anda dan nikmati kemudahan manajemen reservasi
                dalam satu ekosistem yang gahar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Link href="/register">
                  <Button className="h-14 px-10 rounded-xl bg-blue-600 text-white font-black uppercase italic text-[11px] tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all">
                    Daftar Bisnis
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button
                    variant="outline"
                    className="h-14 px-10 rounded-xl border-white/10 text-black dark:text-white font-black uppercase italic text-[11px] tracking-[0.2em] hover:bg-white hover:text-black"
                  >
                    Bandingkan Paket
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="container mx-auto max-w-7xl px-6 pb-20 border-t border-border pt-10 text-center">
        <p className="text-[9px] font-black uppercase text-muted-foreground/40 tracking-[0.4em] italic leading-none">
          Pusat Informasi Pengguna Bookinaja · Hak Cipta Dilindungi © 2026
        </p>
      </footer>
    </div>
  );
}

/**
 * --- INTERNAL HELPER COMPONENTS ---
 */

function StatCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-5 transition-all hover:border-blue-500/20 text-left">
      <div className="flex items-center gap-3 text-left">
        <div className="h-8 w-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="space-y-2">
          <div className="text-[12px] font-black uppercase tracking-widest text-foreground leading-none">
            {title}
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase leading italic opacity-60">
            {desc}
          </div>
        </div>
      </div>
    </div>
  );
}
