"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, ShieldCheck, Zap } from "lucide-react";

const FAQ = [
  {
    q: "Bookinaja itu untuk bisnis apa?",
    a: "Bookinaja dibuat untuk bisnis persewaan/booking berbasis slot & durasi: rental PS/PC, studio, lapangan, coworking/meeting room, dan model serupa.",
  },
  {
    q: "Apa bedanya halaman bookinaja.com dengan tenant subdomain?",
    a: "bookinaja.com adalah marketing & onboarding. Tenant subdomain adalah bisnis kamu (terisolasi) dengan landing publik + dashboard admin: https://{tenant}.bookinaja.com.",
  },
  {
    q: "Gimana cara mulai paling cepat?",
    a: "Daftar tenant → login admin → isi profil bisnis → buat resources + pricing items → publish landing tenant → aktifkan paket subscription.",
  },
  {
    q: "Billing subscription aktif kapan setelah bayar?",
    a: "Setelah Midtrans mengirim notifikasi webhook (status settlement/capture) dan signature tervalidasi, tenant akan otomatis aktif untuk periode paket yang dipilih.",
  },
  {
    q: "Apakah bisa bayar tahunan?",
    a: "Bisa. Di Billing Center kamu bisa pilih Bulanan atau Tahunan sebelum checkout.",
  },
  {
    q: "Apakah data tenant aman dan tidak ketukar?",
    a: "Identitas tenant ditentukan dari subdomain dan disinkronkan ke cookie/header saat request API. Backend juga memvalidasi tenant context untuk mencegah salah alamat data.",
  },
  {
    q: "Apakah bisa pakai custom domain (bisnisanda.com)?",
    a: "Bisa (umumnya untuk paket Enterprise). Tim kami bantu mapping domain dan setup SSL.",
  },
];

export default function FAQPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background selection:bg-blue-600/30">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[900px] bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.14)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_85%_80%_at_50%_40%,#000_100%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 mx-auto max-w-5xl px-6 pt-24 md:pt-32 pb-24">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className="rounded-full border-blue-500/20 bg-blue-500/5 px-5 py-1.5 font-syne text-[10px] font-black uppercase tracking-[0.25em] text-blue-600"
            >
              <HelpCircle className="mr-2 h-3.5 w-3.5" />
              FAQ
            </Badge>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.95]">
            Pertanyaan yang{" "}
            <span className="text-blue-600 italic">Sering Ditanya</span>
          </h1>
          <p className="text-base md:text-xl font-semibold text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Kalau kamu lagi menilai platform Bookinaja, mulai dari sini. Kalau
            butuh detail teknis, cek Documentation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/documentation">
              <Button className="h-12 rounded-2xl bg-blue-600 px-6 font-black uppercase tracking-widest text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                Buka Documentation
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

        <div className="mt-12 rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-sm p-6 md:p-10 shadow-sm">
          <Accordion type="multiple">
            {FAQ.map((item) => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="mt-10 rounded-[2.5rem] border border-border bg-blue-600/5 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-black uppercase tracking-widest">
                Siap mulai tenant?
              </div>
              <p className="text-sm font-semibold text-muted-foreground leading-relaxed">
                Buat subdomain bisnis kamu dan mulai konfigurasi resources + booking.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/register">
                  <Button className="rounded-2xl bg-blue-600 font-black uppercase tracking-widest text-white hover:bg-blue-700">
                    <Zap className="mr-2 h-4 w-4 fill-white" />
                    Mulai Bisnis
                  </Button>
                </Link>
                <Link href="/demos">
                  <Button
                    variant="secondary"
                    className="rounded-2xl font-black uppercase tracking-widest"
                  >
                    Lihat Demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

