"use client";

import Link from "next/link";
import {
  Badge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  Building2,
  Check,
  CreditCard,
  Globe,
  Key,
  Layers,
  Lock,
  MonitorPlay,
  Receipt,
  ShieldCheck,
  Zap,
} from "lucide-react";

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32">
      <div className="space-y-2">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm md:text-base font-semibold text-muted-foreground max-w-3xl">
            {subtitle}
          </p>
        )}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

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
    <div className="rounded-[2rem] border border-border bg-card/50 backdrop-blur-sm p-6 md:p-7 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
          {icon}
        </div>
        <div className="space-y-1">
          <div className="text-sm font-black uppercase tracking-widest text-foreground">
            {title}
          </div>
          <div className="text-sm font-semibold text-muted-foreground leading-relaxed">
            {desc}
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeLine({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 font-mono text-xs md:text-[13px] text-foreground overflow-x-auto">
      {children}
    </div>
  );
}

export default function DocumentationPage() {
  const toc = [
    { name: "Overview", href: "#overview" },
    { name: "Target Market", href: "#target" },
    { name: "Konsep Tenant", href: "#tenant" },
    { name: "Fitur Utama", href: "#features" },
    { name: "Getting Started", href: "#get-started" },
    { name: "Billing & Midtrans", href: "#billing" },
    { name: "POS / Kasir", href: "#pos" },
    { name: "API Ringkas", href: "#api" },
    { name: "FAQ", href: "#faq" },
  ];

  return (
    <div className="relative flex flex-col selection:bg-blue-600/30 overflow-x-hidden bg-background">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[900px] bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.14)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_85%_80%_at_50%_40%,#000_100%,transparent_100%)]" />
      </div>

      <section className="container relative z-10 mx-auto max-w-7xl px-6 pt-24 md:pt-32 pb-10">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="space-y-5 max-w-3xl">
            <Badge
              variant="outline"
              className="rounded-full border-blue-500/20 bg-blue-500/5 px-5 py-1.5 font-syne text-[10px] font-black uppercase tracking-[0.25em] text-blue-600"
            >
              <BookOpen className="mr-2 h-3.5 w-3.5" />
              Documentation
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.95]">
              Panduan Platform{" "}
              <span className="text-blue-600 italic">Bookinaja</span>
            </h1>
            <p className="text-base md:text-xl font-semibold text-muted-foreground leading-relaxed">
              Dokumentasi ini menjelaskan apa itu Bookinaja, siapa yang cocok
              memakainya, cara mulai, fitur inti (booking, POS, staff), serta
              billing subscription via Midtrans.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/register">
                <Button className="h-12 rounded-2xl bg-blue-600 px-6 font-black uppercase tracking-widest text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                  Mulai Bisnis
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  variant="secondary"
                  className="h-12 rounded-2xl px-6 font-black uppercase tracking-widest"
                >
                  Lihat Pricing
                </Button>
              </Link>
            </div>
          </div>

          <div className="w-full lg:w-auto">
            <div className="rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-sm p-6 md:p-7 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <Zap className="h-6 w-6 fill-white" />
                </div>
                <div>
                  <div className="text-sm font-black uppercase tracking-widest">
                    Quick Links
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground">
                    Navigasi cepat ke topik penting
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {toc.slice(0, 6).map((i) => (
                  <a
                    key={i.href}
                    href={i.href}
                    className="rounded-2xl border border-border bg-background/30 px-4 py-3 text-xs font-black uppercase tracking-widest text-foreground hover:border-blue-500/30 hover:bg-blue-500/5 transition-all"
                  >
                    {i.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-10 lg:grid-cols-[280px_1fr] items-start">
          {/* TOC Desktop */}
          <aside className="hidden lg:block sticky top-28">
            <div className="rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-sm p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600">
                On this page
              </div>
              <div className="mt-4 space-y-2">
                {toc.map((i) => (
                  <a
                    key={i.href}
                    href={i.href}
                    className="block rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all"
                  >
                    {i.name}
                  </a>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-border bg-background/30 p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Production tip
                </div>
                <div className="mt-2 text-xs font-semibold text-muted-foreground leading-relaxed">
                  Pastikan <span className="text-foreground font-black">NEXT_PUBLIC_ROOT_DOMAIN</span>{" "}
                  diset ke <span className="text-foreground font-black">bookinaja.com</span>{" "}
                  agar isolasi subdomain tenant berjalan.
                </div>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="space-y-16">
            <Section
              id="overview"
              title="Overview"
              subtitle="Bookinaja adalah platform SaaS untuk bisnis persewaan & booking yang butuh dashboard admin, website booking publik, POS/kasir, dan kontrol akses staff — semua berbasis tenant (subdomain)."
            >
              <div className="grid gap-6 md:grid-cols-3">
                <StatCard
                  icon={<Globe className="h-6 w-6" />}
                  title="Public Booking"
                  desc="Website booking otomatis per tenant: https://bisnis-anda.bookinaja.com"
                />
                <StatCard
                  icon={<Layers className="h-6 w-6" />}
                  title="Dashboard Admin"
                  desc="Kelola unit/resource, booking, pelanggan, laporan, dan konfigurasi bisnis."
                />
                <StatCard
                  icon={<MonitorPlay className="h-6 w-6" />}
                  title="POS / Kasir"
                  desc="Kelola sesi aktif, order add-on, extend durasi, dan monitoring realtime."
                />
              </div>
            </Section>

            <Section
              id="target"
              title="Target Market"
              subtitle="Cocok untuk bisnis yang mengelola slot, durasi, resource, dan transaksi harian."
            >
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-[2rem] border border-border bg-card/40 p-6 md:p-7">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-black uppercase tracking-widest">
                      Bisnis Persewaan
                    </div>
                  </div>
                  <ul className="mt-4 space-y-3 text-sm font-semibold text-muted-foreground">
                    {[
                      "Rental PS/PC, Sim Racing, Game Center",
                      "Studio foto/podcast, creative space",
                      "Lapangan olahraga, court booking",
                      "Meeting room, coworking, ruang event",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[2rem] border border-border bg-card/40 p-6 md:p-7">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-black uppercase tracking-widest">
                      Problem yang Disolve
                    </div>
                  </div>
                  <ul className="mt-4 space-y-3 text-sm font-semibold text-muted-foreground">
                    {[
                      "Catatan manual dan data booking tercecer",
                      "Konflik jadwal / double-booking",
                      "Kasir dan staff tidak punya role yang jelas",
                      "Sulit memonitor pendapatan & sesi aktif",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Section>

            <Section
              id="tenant"
              title="Konsep Tenant & Subdomain"
              subtitle="Setiap bisnis punya tenant terisolasi: data, landing publik, dashboard, dan billing."
            >
              <div className="rounded-[2rem] border border-border bg-card/40 p-6 md:p-7 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                    <Key className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-black uppercase tracking-widest">
                      Pola URL
                    </div>
                    <div className="text-sm font-semibold text-muted-foreground leading-relaxed">
                      Tenant landing & booking publik:
                    </div>
                    <CodeLine>{"https://{tenant}.bookinaja.com/"}</CodeLine>
                    <div className="text-sm font-semibold text-muted-foreground leading-relaxed">
                      Admin dashboard:
                    </div>
                    <CodeLine>{"https://{tenant}.bookinaja.com/admin/login"}</CodeLine>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background/30 p-5">
                    <div className="text-xs font-black uppercase tracking-widest text-blue-600">
                      Catatan penting
                    </div>
                    <p className="mt-2 text-sm font-semibold text-muted-foreground leading-relaxed">
                      Isolasi tenant ditentukan dari hostname/subdomain. Pastikan
                      konfigurasi root domain konsisten di environment production.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/30 p-5">
                    <div className="text-xs font-black uppercase tracking-widest text-blue-600">
                      Cookie tenant
                    </div>
                    <p className="mt-2 text-sm font-semibold text-muted-foreground leading-relaxed">
                      Aplikasi akan menyimpan{" "}
                      <span className="font-black text-foreground">
                        current_tenant_slug
                      </span>{" "}
                      dan menyinkronkan{" "}
                      <span className="font-black text-foreground">
                        current_tenant_id
                      </span>{" "}
                      agar request API selalu tepat tenant.
                    </p>
                  </div>
                </div>
              </div>
            </Section>

            <Section
              id="features"
              title="Fitur Utama (Ringkas)"
              subtitle="Komponen utama yang biasanya dipakai tiap bisnis."
            >
              <div className="grid gap-6 md:grid-cols-2">
                {[
                  {
                    icon: <Layers className="h-6 w-6" />,
                    title: "Resources & Pricing",
                    desc: "Kelola unit/resource dan rate/package (durasi, harga, default option).",
                  },
                  {
                    icon: <Globe className="h-6 w-6" />,
                    title: "Public Booking",
                    desc: "Customer bisa booking, validasi, dan melihat detail booking publik.",
                  },
                  {
                    icon: <MonitorPlay className="h-6 w-6" />,
                    title: "POS / Kasir",
                    desc: "Kelola sesi aktif, extend, add-on, dan monitoring transaksi.",
                  },
                  {
                    icon: <Lock className="h-6 w-6" />,
                    title: "Role-based Access",
                    desc: "Akun owner/staff, pembatasan akses, dan area admin terproteksi token.",
                  },
                ].map((c) => (
                  <StatCard key={c.title} icon={c.icon} title={c.title} desc={c.desc} />
                ))}
              </div>
            </Section>

            <Section
              id="get-started"
              title="Getting Started"
              subtitle="Langkah paling cepat untuk memulai tenant baru hingga bisa menerima booking."
            >
              <div className="rounded-[2rem] border border-border bg-card/40 p-6 md:p-7">
                <ol className="grid gap-4 text-sm font-semibold text-muted-foreground">
                  {[
                    {
                      title: "Daftar tenant",
                      desc: "Buat subdomain tenant di halaman register (nama bisnis, slug, email admin, password).",
                    },
                    {
                      title: "Login dashboard",
                      desc: "Masuk ke https://{tenant}.bookinaja.com/admin/login lalu konfigurasi profil bisnis.",
                    },
                    {
                      title: "Buat resources & rate",
                      desc: "Tambahkan unit/resource dan item pricing (main option / add-on).",
                    },
                    {
                      title: "Publish landing",
                      desc: "Tenant landing otomatis aktif di https://{tenant}.bookinaja.com/",
                    },
                    {
                      title: "Aktifkan paket",
                      desc: "Buka menu Subscription untuk aktivasi/upgrade paket via Midtrans Snap.",
                    },
                  ].map((s, idx) => (
                    <li
                      key={s.title}
                      className="rounded-2xl border border-border bg-background/30 p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
                          {idx + 1}
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-black text-foreground uppercase tracking-widest">
                            {s.title}
                          </div>
                          <div className="text-sm font-semibold text-muted-foreground leading-relaxed">
                            {s.desc}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </Section>

            <Section
              id="billing"
              title="Billing & Midtrans"
              subtitle="Subscription diaktifkan otomatis lewat webhook Midtrans setelah payment settlement/capture."
            >
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-[2rem] border border-border bg-card/40 p-6 md:p-7 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-black uppercase tracking-widest">
                      Checkout Flow
                    </div>
                  </div>
                  <div className="space-y-3 text-sm font-semibold text-muted-foreground leading-relaxed">
                    <p>
                      Dari dashboard, user pilih paket & periode, lalu sistem membuat
                      <span className="font-black text-foreground"> billing order</span>{" "}
                      dan meminta{" "}
                      <span className="font-black text-foreground">
                        Snap token
                      </span>{" "}
                      dari Midtrans.
                    </p>
                    <p>
                      Setelah pembayaran settle, Midtrans mengirim notifikasi ke webhook
                      dan sistem mengaktifkan periode subscription tenant.
                    </p>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-border bg-card/40 p-6 md:p-7 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-black uppercase tracking-widest">
                      Webhook Endpoint
                    </div>
                  </div>
                  <div className="space-y-3">
                    <CodeLine>{"POST https://bookinaja.com/api/webhooks/midtrans"}</CodeLine>
                    <div className="text-sm font-semibold text-muted-foreground leading-relaxed">
                      Pastikan Nginx meneruskan path <span className="font-black text-foreground">/api/webhooks/</span>{" "}
                      ke backend Go. Signature Midtrans diverifikasi menggunakan{" "}
                      <span className="font-black text-foreground">MIDTRANS_SERVER_KEY</span>.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[2rem] border border-border bg-card/40 p-6 md:p-7">
                <div className="text-sm font-black uppercase tracking-widest text-foreground">
                  Environment Variables
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      Backend
                    </div>
                    <CodeLine>{"MIDTRANS_SERVER_KEY=***"}</CodeLine>
                    <CodeLine>{"MIDTRANS_IS_PRODUCTION=false|true"}</CodeLine>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      Frontend
                    </div>
                    <CodeLine>{"NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=***"}</CodeLine>
                    <CodeLine>{"NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false|true"}</CodeLine>
                  </div>
                </div>
              </div>
            </Section>

            <Section
              id="pos"
              title="POS / Kasir"
              subtitle="Fitur POS memudahkan staff menjalankan operasional: sesi aktif, add-on, extend, dan order."
            >
              <div className="rounded-[2rem] border border-border bg-card/40 p-6 md:p-7 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                    <MonitorPlay className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-black uppercase tracking-widest">
                      POS flow (umum)
                    </div>
                    <ul className="space-y-2 text-sm font-semibold text-muted-foreground">
                      {[
                        "Buat booking manual atau dari customer booking publik",
                        "Mulai sesi aktif, pantau status unit secara realtime",
                        "Tambah order F&B / add-on, extend durasi bila perlu",
                        "Tutup sesi dan rekap pendapatan",
                      ].map((t) => (
                        <li key={t} className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Section>

            <Section
              id="api"
              title="API Ringkas (Internal)"
              subtitle="Ringkasan endpoint utama yang dipakai frontend. Ini bukan public API—untuk kebutuhan integrasi khusus bisa dibuatkan."
            >
              <div className="rounded-[2rem] border border-border bg-card/40 p-6 md:p-7 space-y-4">
                <div className="text-xs font-black uppercase tracking-[0.25em] text-muted-foreground">
                  Base URL
                </div>
                <CodeLine>{"https://api.bookinaja.com/api/v1"}</CodeLine>

                <Accordion type="multiple" className="mt-4">
                  <AccordionItem value="tenant">
                    <AccordionTrigger>Tenant & Public</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      <CodeLine>{"GET /public/landing?slug={tenant}"}</CodeLine>
                      <CodeLine>{"GET /public/resources?slug={tenant}"}</CodeLine>
                      <CodeLine>{"POST /public/bookings"}</CodeLine>
                      <CodeLine>{"GET /public/tenant-id?slug={tenant}"}</CodeLine>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="auth">
                    <AccordionTrigger>Auth Admin</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      <CodeLine>{"POST /register"}</CodeLine>
                      <CodeLine>{"POST /login"}</CodeLine>
                      <CodeLine>{"GET /auth/me"}</CodeLine>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="billing">
                    <AccordionTrigger>Billing</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      <CodeLine>{"GET /billing/subscription"}</CodeLine>
                      <CodeLine>{"GET /billing/orders?limit=25"}</CodeLine>
                      <CodeLine>{"POST /billing/checkout"}</CodeLine>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </Section>

            <Section
              id="faq"
              title="FAQ"
              subtitle="Pertanyaan yang paling sering muncul saat evaluasi platform."
            >
              <div className="rounded-[2rem] border border-border bg-card/40 p-6 md:p-7">
                <Accordion type="multiple">
                  <AccordionItem value="tenant-iso">
                    <AccordionTrigger>Apakah data tenant benar-benar terisolasi?</AccordionTrigger>
                    <AccordionContent>
                      Ya. Identitas tenant ditentukan dari subdomain (hostname) dan
                      dipropagasi melalui header/cookie tenant. Backend memvalidasi
                      tenant saat request masuk.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="midtrans">
                    <AccordionTrigger>Kenapa subscription saya belum aktif setelah bayar?</AccordionTrigger>
                    <AccordionContent>
                      Subscription aktif setelah notifikasi webhook diterima (status settlement/capture).
                      Pastikan endpoint webhook dapat diakses publik dan Nginx sudah meneruskan path-nya.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="custom">
                    <AccordionTrigger>Apakah bisa custom domain (bisnisanda.com)?</AccordionTrigger>
                    <AccordionContent>
                      Bisa untuk paket Enterprise. Tim kami akan bantu setup DNS, SSL, dan mapping tenant.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <div className="mt-6 rounded-[2rem] border border-border bg-blue-600/5 p-6 md:p-7">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-black uppercase tracking-widest">
                      Butuh bantuan implementasi?
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground leading-relaxed">
                      Hubungi tim support untuk setup tenant, Midtrans, atau migrasi data.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link href="/register">
                        <Button className="rounded-2xl bg-blue-600 font-black uppercase tracking-widest text-white hover:bg-blue-700">
                          Create Tenant
                        </Button>
                      </Link>
                      <Link href="/pricing">
                        <Button variant="secondary" className="rounded-2xl font-black uppercase tracking-widest">
                          Bandingkan Paket
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </section>
    </div>
  );
}
