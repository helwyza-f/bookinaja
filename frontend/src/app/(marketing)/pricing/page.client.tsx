"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  Zap,
  ChevronRight,
  Clock3,
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
 * Prelaunch pricing: honest trial-first offer with clear upgrade paths.
 */
export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const plans = [
    {
      name: "Free Trial",
      badge: "Trial 30 Hari",
      effectiveMonthly: "0",
      originalMonthly: null,
      originalAnnualTotal: null,
      annualTotal: null,
      desc: "Untuk tenant yang ingin mencoba flow Bookinaja dulu tanpa kartu kredit dan tanpa komitmen awal.",
      features: [
        "30 hari trial tanpa kartu kredit",
        "Setup dibantu dari awal",
        "Booking flow bisa langsung dicoba",
        "Customer portal bisa langsung dilihat",
        "Cocok untuk validasi apakah operasionalmu memang fit",
      ],
      cta: "Mulai Trial",
      popular: false,
      comingSoon: false,
      trial: true,
      planKey: "starter",
      note: "Setelah trial selesai, lanjut ke Starter atau Pro.",
    },
    {
      name: "Starter",
      badge: "Untuk Mulai Rapi",
      effectiveMonthly: "149.000",
      originalMonthly: "199.000",
      originalAnnualTotal: "2.388.000",
      annualTotal: "1.490.000",
      desc: "Untuk owner yang ingin berhenti dari catatan manual dan mulai menjalankan booking lebih rapi tanpa tim besar.",
      features: [
        "1 akun utama (owner only)",
        "Dashboard admin dasar",
        "Website booking / subdomain tenant",
        "Customer portal dasar",
        "Promo code dasar",
        "Tracking pembayaran dasar",
        "Laporan pendapatan dasar",
        "Resource management",
        "Booking flow customer yang rapi",
        "Onboarding awal dan support standar",
      ],
      cta: "Pilih Starter",
      popular: false,
      comingSoon: false,
      trial: false,
      planKey: "starter",
      note: "Cocok untuk owner solo atau bisnis kecil yang ingin operasional lebih tertata.",
    },
    {
      name: "Pro",
      badge: "Paling Masuk Akal",
      effectiveMonthly: "349.000",
      originalMonthly: "449.000",
      originalAnnualTotal: "5.388.000",
      annualTotal: "3.490.000",
      desc: "Untuk bisnis yang sudah punya staff dan butuh kontrol operasional, payment flow, dan customer ops yang lebih disiplin.",
      features: [
        "Semua fitur Starter",
        "Multi staff account",
        "Role-based access admin / kasir",
        "POS dan checkout workflow",
        "Payment method management",
        "Manual payment verification",
        "Customer import",
        "Blast WhatsApp ke pelanggan",
        "CRM visibility dasar",
        "Priority onboarding dan support",
      ],
      cta: "Pilih Pro",
      popular: true,
      comingSoon: false,
      trial: false,
      planKey: "pro",
      note: "Beda sedikit dari plan atas, tapi sudah kuat untuk operasional tim yang serius.",
    },
    {
      name: "Scale",
      badge: "Coming Soon",
      effectiveMonthly: "499.000",
      originalMonthly: "649.000",
      originalAnnualTotal: "7.788.000",
      annualTotal: "4.990.000",
      desc: "Untuk bisnis yang ingin main di retention, membership, loyalty, dan growth yang lebih terukur.",
      features: [
        "Semua fitur Pro",
        "Membership per tenant",
        "Auto-join membership",
        "Repeat purchase reward",
        "Reward redemption di checkout",
        "Advanced CRM segmentation",
        "Retention analytics",
        "Growth tools yang lebih dalam",
        "Multi-outlet readiness",
      ],
      cta: "Hubungi Kami",
      popular: false,
      comingSoon: true,
      trial: false,
      planKey: "scale",
      note: "Ditampilkan sebagai anchor premium. Fitur growth dan loyalty sedang disiapkan.",
    },
  ];

  const comparisonRows = [
    {
      label: "Trial 30 hari tanpa kartu kredit",
      free: true,
      starter: false,
      pro: false,
      scale: false,
    },
    {
      label: "Booking tidak dicatat manual lagi",
      free: true,
      starter: true,
      pro: true,
      scale: true,
    },
    {
      label: "Owner bisa pantau operasional dari dashboard",
      free: true,
      starter: true,
      pro: true,
      scale: true,
    },
    {
      label: "Staff punya akses sesuai role",
      free: false,
      starter: false,
      pro: true,
      scale: true,
    },
    {
      label: "Customer ops lebih fleksibel dan lebih kuat",
      free: false,
      starter: false,
      pro: true,
      scale: true,
    },
    {
      label: "Blast customer dan payment ops lebih disiplin",
      free: false,
      starter: false,
      pro: true,
      scale: true,
    },
    {
      label: "Membership, loyalty, dan retention tools",
      free: false,
      starter: false,
      pro: false,
      scale: true,
    },
    {
      label: "Bisnis lebih siap scale ke banyak unit / outlet",
      free: false,
      starter: false,
      pro: false,
      scale: true,
    },
    {
      label: "Onboarding dan support lebih prioritas",
      free: true,
      starter: false,
      pro: true,
      scale: true,
    },
  ];

  return (
    <section className="relative flex-1 flex flex-col items-center overflow-hidden py-24 md:py-32 selection:bg-blue-600/30">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-0 h-[1000px] w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.15)_0%,transparent_70%)]" />
        <div className="sticky top-0 h-screen w-full overflow-hidden opacity-40">
          <div className="absolute right-[-10%] top-[-10%] h-[40rem] w-[40rem] animate-pulse rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute bottom-[10%] left-[-10%] h-[35rem] w-[35rem] rounded-full bg-indigo-600/10 blur-[100px]" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_100%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mx-auto mb-20 flex max-w-[58rem] flex-col items-center space-y-6 text-center">
          <Badge
            variant="outline"
            className="border-blue-500/20 bg-blue-500/5 px-5 py-1.5 font-syne text-[10px] font-bold uppercase tracking-widest text-blue-500"
          >
            Prelaunch Offer
          </Badge>
          <h1 className="text-5xl font-black leading-[0.9] tracking-tighter text-foreground sm:text-7xl">
            Pilih paket yang bikin <br />
            <span className="italic text-blue-500">
              chaos operasional berhenti.
            </span>
          </h1>
          <p className="max-w-[32rem] text-lg font-medium text-muted-foreground md:text-xl">
            Mulai dari trial 30 hari tanpa kartu kredit, lalu pilih plan yang
            paling cocok untuk tahap operasional bisnis kamu hari ini. Scale
            tetap ditampilkan sebagai arah premium berikutnya.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span className="rounded-full border border-blue-500/15 bg-blue-500/5 px-3 py-1 text-blue-600">
              Trial 30 hari
            </span>
            <span className="rounded-full border border-emerald-500/15 bg-emerald-500/5 px-3 py-1 text-emerald-600">
              Tanpa kartu kredit
            </span>
            <span className="rounded-full border border-slate-200 bg-white/60 px-3 py-1">
              Onboarding dibantu
            </span>
            <span className="rounded-full border border-amber-500/15 bg-amber-500/5 px-3 py-1 text-amber-600">
              Scale coming soon
            </span>
          </div>

          <div className="mt-8 flex items-center gap-5 rounded-2xl border border-border bg-secondary/30 p-1.5 backdrop-blur-md">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                "rounded-xl px-6 py-2.5 text-sm font-bold transition-all",
                !isAnnual
                  ? "bg-background text-blue-500 shadow-lg"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Bulanan
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all",
                isAnnual
                  ? "bg-background text-blue-500 shadow-lg"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Tahunan
              <Badge className="border-none bg-green-500/10 px-2 py-0 text-[10px] text-green-600">
                Hemat 20%
              </Badge>
            </button>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-7xl items-stretch gap-8 xl:grid-cols-4 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-[3rem] border p-10 transition-all duration-500 hover:shadow-[0_40px_80px_-15px_rgba(59,130,246,0.15)]",
                plan.popular
                  ? "z-20 scale-105 border-blue-500 bg-card shadow-2xl ring-4 ring-blue-500/5"
                  : "border-border/60 bg-card/40 shadow-sm backdrop-blur-sm hover:border-blue-500/30",
              )}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-blue-500 px-6 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
                  <Sparkles className="h-3.5 w-3.5 fill-white" />
                  Rekomendasi
                </div>
              )}

              <div className="mb-8 text-center lg:text-left">
                <div className="mb-3 inline-flex rounded-full border border-blue-500/15 bg-blue-500/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
                  {plan.badge}
                </div>
                <h3 className="text-2xl font-black tracking-tight">
                  {plan.name}
                </h3>
                <p className="mt-3 text-sm font-medium leading-relaxed text-muted-foreground">
                  {plan.desc}
                </p>
              </div>

              <div className="mb-10 flex flex-col items-center lg:items-start">
                {plan.originalMonthly ? (
                  <div className="mb-1 text-sm font-bold italic text-muted-foreground/40 line-through">
                    IDR {plan.originalMonthly}
                  </div>
                ) : (
                  <div className="mb-1 text-sm font-bold uppercase tracking-widest text-emerald-600">
                    Tanpa biaya awal
                  </div>
                )}

                <div
                  className={cn(
                    "flex w-full items-end gap-2",
                    plan.trial ? "justify-start" : "justify-start",
                  )}
                >
                  {!plan.trial ? (
                    <span className="pb-2 text-sm font-black uppercase text-muted-foreground">
                      IDR
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "leading-none font-black tracking-[-0.06em] text-foreground",
                      plan.trial
                        ? "text-[4.5rem] sm:text-[5rem]"
                        : "text-[3.8rem] sm:text-[4.3rem] lg:text-[4.6rem]",
                    )}
                  >
                    {plan.effectiveMonthly}
                  </span>
                  {!plan.trial ? (
                    <span className="pb-2 text-base font-bold text-muted-foreground">
                      /bln
                    </span>
                  ) : null}
                </div>

                {isAnnual && plan.annualTotal ? (
                  <div className="mt-2 space-y-1.5">
                    {plan.originalAnnualTotal ? (
                      <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40 line-through">
                        IDR {plan.originalAnnualTotal}
                      </div>
                    ) : null}
                    <div className="inline-flex max-w-full rounded-full border border-blue-500/10 bg-blue-500/5 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-blue-500">
                      <span className="whitespace-normal">
                        Tagihan tahunan IDR {plan.annualTotal}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mb-10 flex-1 space-y-6 border-t border-border pt-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
                  Layanan Tersedia:
                </p>
                <ul className="space-y-4">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="group flex items-start gap-4 text-sm font-semibold text-muted-foreground"
                    >
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span className="leading-tight transition-colors group-hover:text-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mb-5 text-sm leading-6 text-muted-foreground">
                {plan.note}
              </p>

              {plan.comingSoon ? (
                <Button
                  disabled
                  className="h-16 w-full rounded-2xl text-lg font-black opacity-100"
                  variant="secondary"
                >
                  <Clock3 className="mr-2 h-5 w-5" />
                  {plan.cta}
                </Button>
              ) : (
                <Link
                  href={`/register?plan=${plan.planKey}&interval=${isAnnual ? "annual" : "monthly"}`}
                  className="w-full group"
                >
                  <Button
                    className={cn(
                      "h-16 w-full rounded-2xl text-lg font-black transition-all active:scale-95",
                      plan.popular
                        ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700"
                        : "bg-secondary text-foreground hover:bg-blue-500 hover:text-white",
                    )}
                    variant={plan.popular ? "default" : "secondary"}
                  >
                    {plan.cta}
                    <ChevronRight className="ml-2 h-5 w-5 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="mx-auto mt-20 max-w-6xl rounded-[2.5rem] border border-border/60 bg-card/40 p-6 shadow-sm backdrop-blur-sm md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight md:text-3xl">
                Bandingkan Berdasarkan Hasil yang Kamu Butuhkan
              </h2>
              <p className="max-w-3xl text-sm font-semibold text-muted-foreground">
                Kalau kamu masih ragu, mulai dari transformasi yang paling ingin
                kamu capai dulu.
              </p>
            </div>
            <Link href="/documentation">
              <Button
                variant="secondary"
                className="rounded-2xl font-black uppercase tracking-widest"
              >
                Baca Documentation
              </Button>
            </Link>
          </div>

          <div className="mt-6">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[36%]">Hasil / Fitur</TableHead>
                  <TableHead>Free Trial</TableHead>
                  <TableHead>Starter</TableHead>
                  <TableHead>Pro</TableHead>
                  <TableHead>Scale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="font-semibold text-muted-foreground whitespace-normal">
                      {row.label}
                    </TableCell>
                    <ComparisonCell enabled={row.free} />
                    <ComparisonCell enabled={row.starter} />
                    <ComparisonCell enabled={row.pro} />
                    <ComparisonCell enabled={row.scale} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="mx-auto mt-24 grid max-w-4xl gap-8 border-t border-border/50 py-12 md:grid-cols-3">
          <div className="flex flex-col items-center space-y-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/5 text-blue-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Risiko Rendah</h4>
            <p className="text-pretty text-xs text-muted-foreground">
              Trial 30 hari menurunkan risiko masuk tanpa bikin pricing terlihat murahan.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/5 text-blue-500">
              <Zap className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-foreground">
              Fokus ke Hasil
            </h4>
            <p className="text-pretty text-xs text-muted-foreground">
              Starter untuk mulai rapi, Pro untuk kontrol tim, Scale untuk arah growth berikutnya.
            </p>
          </div>
          <div className="flex flex-col items-center space-y-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/5 text-blue-500">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-foreground">
              Onboarding Dekat
            </h4>
            <p className="text-pretty text-xs text-muted-foreground">
              Scale tetap tampil sebagai anchor premium, tapi fokus jual aktif sekarang ada di Starter dan Pro.
            </p>
          </div>
        </div>

        <p className="mt-16 text-center text-sm font-medium text-muted-foreground">
          Ragu memilih paket? Cek dulu{" "}
          <Link
            href="/demos"
            className="font-bold text-blue-500 hover:underline underline-offset-4"
          >
            Live Demo Sistem
          </Link>{" "}
          atau{" "}
          <Link
            href="mailto:support@bookinaja.com"
            className="font-bold text-blue-500 hover:underline underline-offset-4"
          >
            Konsultasi Prelaunch
          </Link>
        </p>
      </div>
    </section>
  );
}

function ComparisonCell({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return (
      <TableCell>
        <span className="font-black text-muted-foreground/50">—</span>
      </TableCell>
    );
  }

  return (
    <TableCell>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
        <Check className="h-4 w-4" />
      </span>
    </TableCell>
  );
}
