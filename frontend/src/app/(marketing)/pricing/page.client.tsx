"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Clock3,
  HelpCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  annualMonthlyEquivalent,
  annualSavingsPercent,
  BILLING_PLANS,
  formatIDR,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Plan = {
  key: (typeof BILLING_PLANS)[number]["key"];
  cta: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const trialFeatures = [
  "30 hari trial tanpa kartu kredit",
  "Tenant langsung punya landing + dashboard",
  "Cocok untuk uji alur booking sebelum commit",
];

const plans: Plan[] = [
  {
    key: "starter",
    cta: "Pilih Starter",
    href: "/register?plan=starter",
    icon: Rocket,
  },
  {
    key: "pro",
    cta: "Pilih Pro",
    href: "/register?plan=pro",
    icon: Users,
  },
  {
    key: "scale",
    cta: "Segera hadir",
    icon: BarChart3,
  },
];

const comparisonRows = [
  {
    label: "Landing tenant dan customer portal",
    starter: true,
    pro: true,
    scale: true,
  },
  {
    label: "Booking flow tidak dicatat manual lagi",
    starter: true,
    pro: true,
    scale: true,
  },
  {
    label: "Staff account dan role-based access",
    starter: false,
    pro: true,
    scale: true,
  },
  {
    label: "Payment ops dan checkout lebih disiplin",
    starter: false,
    pro: true,
    scale: true,
  },
  {
    label: "Membership dan retention tools",
    starter: false,
    pro: false,
    scale: true,
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const priceLabel = useMemo(
    () => (isAnnual ? "Tahunan" : "Bulanan"),
    [isAnnual],
  );
  const starterPlan = BILLING_PLANS.find((plan) => plan.key === "starter");
  const annualDiscount =
    starterPlan
      ? annualSavingsPercent(starterPlan.monthly, starterPlan.annualTotal)
      : 0;

  return (
    <section className="relative flex-1 overflow-hidden py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[900px] w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.14)_0%,transparent_68%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_78%_76%_at_50%_35%,#000_100%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <Badge
            variant="outline"
            className="border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-blue-600"
          >
            Pricing yang mengikuti fase operasional
          </Badge>

          <h1 className="mt-6 text-5xl font-black tracking-tight text-foreground sm:text-6xl">
            Pilih plan yang bikin
            <span className="block italic text-blue-500">
              bisnis makin rapi, bukan makin ribet.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            <span className="sm:hidden">
              Mulai dari trial, lalu pilih plan sesuai tahap bisnismu.
            </span>
            <span className="hidden sm:inline">
              Mulai dari trial tanpa risiko, lalu pilih plan sesuai tahap
              operasionalmu hari ini. Fokusnya bukan daftar fitur, tapi seberapa
              cepat kamu bisa merasa bisnis ini lebih tertata.
            </span>
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <Pill text="Trial 30 hari" />
            <Pill text="Tanpa kartu kredit" />
            <div className="hidden sm:contents">
              <Pill text="Onboarding dibantu" />
              <Pill text="Upgrade kapan saja" />
            </div>
          </div>

          <div className="mt-10 inline-flex items-center gap-2 rounded-2xl border border-border bg-card/60 p-1.5 backdrop-blur">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                "rounded-xl px-5 py-2.5 text-sm font-bold transition-all",
                !isAnnual
                  ? "bg-background text-blue-600 shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Bulanan
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all",
                isAnnual
                  ? "bg-background text-blue-600 shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Tahunan
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">
                Hemat {annualDiscount}%
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-6xl">
          <div className="rounded-[2rem] border border-emerald-500/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(240,253,244,0.88))] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.05)] dark:border-emerald-500/15 dark:bg-[linear-gradient(180deg,rgba(9,16,23,0.96),rgba(8,28,21,0.96))]">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">
                  <Clock3 className="h-3.5 w-3.5" />
                  Zero-risk entry
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                    Free Trial 30 hari
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:leading-7">
                    <span className="sm:hidden">
                      Coba flow dulu. Kalau cocok, baru lanjut ke plan berbayar.
                    </span>
                    <span className="hidden sm:inline">
                      Buat tenant, coba booking flow, lihat landing dan dashboard
                      hidup dulu. Kalau ternyata fit, baru lanjut ke Starter atau Pro.
                    </span>
                  </p>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {trialFeatures.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-foreground/85"
                    >
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[1.75rem] border border-border/60 bg-background/70 p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Mulai dari sini
                </div>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-6xl font-black tracking-[-0.08em] text-foreground">
                    0
                  </span>
                  <span className="pb-3 text-sm font-bold uppercase text-muted-foreground">
                    IDR
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  <span className="sm:hidden">
                    Tanpa kartu kredit. Validasi dulu flow-nya.
                  </span>
                  <span className="hidden sm:inline">
                    Tidak perlu kartu kredit. Fokusnya validasi apakah flow
                    Bookinaja cocok dengan operasional bisnismu.
                  </span>
                </p>
                <Link href="/register?plan=starter&trial=1" className="mt-5 block">
                  <Button className="h-12 w-full rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700">
                    Mulai Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const billingPlan = BILLING_PLANS.find((item) => item.key === plan.key);
            if (!billingPlan) return null;
            const displayMainPrice = isAnnual
              ? formatIDR(billingPlan.annualTotal)
              : formatIDR(billingPlan.monthly);
            const displayBefore = isAnnual
              ? formatIDR(billingPlan.annualBefore)
              : formatIDR(billingPlan.monthlyBefore);
            const annualEquivalent = annualMonthlyEquivalent(billingPlan.annualTotal);

            return (
              <div
                key={plan.key}
                className={cn(
                  "relative flex flex-col rounded-[2rem] border p-7 shadow-[0_18px_50px_rgba(15,23,42,0.05)] transition-all duration-300",
                  billingPlan.recommended
                    ? "border-blue-500 bg-card shadow-[0_28px_80px_rgba(59,130,246,0.14)]"
                    : "border-border/70 bg-card/70",
                )}
              >
                {billingPlan.recommended ? (
                  <div className="absolute -top-3 left-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                    Rekomendasi
                  </div>
                ) : null}

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="inline-flex rounded-full border border-blue-500/15 bg-blue-500/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                      {billingPlan.label}
                    </div>
                    <div>
                      <h3 className="text-3xl font-black tracking-tight text-foreground">
                        {billingPlan.name}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground sm:leading-7">
                        {billingPlan.headline}
                      </p>
                    </div>
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/8 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-8 border-t border-border/70 pt-7">
                  {displayBefore ? (
                    <div className="text-sm font-bold italic text-muted-foreground/45 line-through">
                      IDR {displayBefore}
                    </div>
                  ) : null}

                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-sm font-black uppercase text-muted-foreground">
                      IDR
                    </span>
                    <span className="text-[3.4rem] font-black leading-none tracking-[-0.08em] text-foreground">
                      {displayMainPrice}
                    </span>
                    <span className="pb-2 text-sm font-bold text-muted-foreground">
                      /{isAnnual ? "tahun" : "bln"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {priceLabel === "Tahunan"
                      ? `Setara ${formatIDR(annualEquivalent)}/bln, dibayar sekali untuk 1 tahun.`
                      : "Fleksibel untuk mulai sekarang lalu evaluasi sambil jalan."}
                  </p>
                </div>

                <div className="mt-7 flex-1 space-y-4 border-t border-border/70 pt-7">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Yang paling terasa
                  </div>
                  <ul className="space-y-3">
                    {billingPlan.publicFeatures.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-foreground/85">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-6 text-sm leading-6 text-muted-foreground">
                  <span className="sm:hidden">
                    {billingPlan.name === "Starter"
                      ? "Mulai cepat tanpa tim besar."
                      : billingPlan.name === "Pro"
                        ? "Pilihan terbaik untuk operasional tim."
                        : "Siap saat bisnis masuk fase growth."}
                  </span>
                  <span className="hidden sm:inline">{billingPlan.note}</span>
                </p>

                {billingPlan.comingSoon ? (
                  <Button
                    disabled
                    variant="secondary"
                    className="mt-6 h-12 rounded-2xl text-sm font-black opacity-100"
                  >
                    <Clock3 className="mr-2 h-4 w-4" />
                    {plan.cta}
                  </Button>
                ) : (
                  <Link
                    href={`${plan.href}&interval=${isAnnual ? "annual" : "monthly"}`}
                    className="mt-6 block"
                  >
                    <Button
                      className={cn(
                        "group h-12 w-full rounded-2xl text-sm font-black",
                        billingPlan.recommended
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-secondary text-foreground hover:bg-blue-500 hover:text-white",
                      )}
                      variant={billingPlan.recommended ? "default" : "secondary"}
                    >
                      {plan.cta}
                      <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-16 max-w-6xl rounded-[2rem] border border-border/70 bg-card/60 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                Perbandingan inti
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">
                Pilih berdasar hasil yang kamu butuhkan
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Pricing yang baik membantu user memilih cepat. Jadi di sini kami
              bedakan plan berdasarkan perubahan operasional yang paling terasa.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-border/70">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Hasil</TableHead>
                  <TableHead>Starter</TableHead>
                  <TableHead>Pro</TableHead>
                  <TableHead>Scale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="whitespace-normal font-medium text-muted-foreground">
                      {row.label}
                    </TableCell>
                    <ComparisonCell enabled={row.starter} />
                    <ComparisonCell enabled={row.pro} />
                    <ComparisonCell enabled={row.scale} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 md:grid-cols-3">
          <TrustCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Mulai tanpa risiko"
            body="Trial 30 hari ada untuk membantu validasi flow, bukan memaksa commit terlalu cepat."
          />
          <TrustCard
            icon={<Rocket className="h-5 w-5" />}
            title="Jual hasil, bukan noise"
            body="Starter untuk mulai rapi, Pro untuk tim yang sudah jalan, Scale untuk growth berikutnya."
          />
          <TrustCard
            icon={<HelpCircle className="h-5 w-5" />}
            title="Masuk akal buat Indonesia"
            body="CTA utamanya sederhana: coba dulu, pilih fase operasionalmu, lalu upgrade saat value-nya sudah terasa."
          />
        </div>

        <div className="mx-auto mt-16 max-w-3xl text-center">
          <p className="text-sm leading-7 text-muted-foreground">
            Masih ragu mulai dari mana? Lihat demo dulu atau konsultasi sebelum
            pilih plan.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/demos">
              <Button variant="secondary" className="rounded-2xl">
                Lihat Demo
              </Button>
            </Link>
            <Link href="mailto:support@bookinaja.com">
              <Button className="rounded-2xl bg-blue-600 text-white hover:bg-blue-700">
                Konsultasi dulu
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
      {text}
    </span>
  );
}

function TrustCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-border/70 bg-card/60 p-5 text-center shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/8 text-blue-600">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-black text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function ComparisonCell({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return (
      <TableCell>
        <span className="font-black text-muted-foreground/40">—</span>
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
