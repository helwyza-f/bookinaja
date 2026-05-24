"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Clock3,
  Rocket,
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
  detailHref?: string;
  kicker: string;
  bestFor: string;
};

const trialFeatures = [
  "Trial 30 hari",
  "Tanpa kartu kredit",
  "Setup tenant dulu",
];

const plans: Plan[] = [
  {
    key: "starter",
    cta: "Pilih Starter",
    href: "/signup?plan=starter",
    icon: Rocket,
    detailHref: "/pricing/starter",
    kicker: "Core booking",
    bestFor: "Untuk owner yang ingin booking dan jadwal lebih rapi.",
  },
  {
    key: "pro",
    cta: "Pilih Pro",
    href: "/signup?plan=pro",
    icon: Users,
    detailHref: "/pricing/pro",
    kicker: "Team ops",
    bestFor: "Untuk bisnis dengan staff, kasir, dan pembayaran harian.",
  },
  {
    key: "scale",
    cta: "Segera hadir",
    icon: BarChart3,
    detailHref: "/pricing/scale",
    kicker: "Growth",
    bestFor: "Untuk membership, loyalty, dan repeat order.",
  },
];

const comparisonRows = [
  {
    label: "Website booking dan customer portal",
    starter: true,
    pro: true,
    scale: true,
  },
  {
    label: "Booking dan jadwal terpusat",
    starter: true,
    pro: true,
    scale: true,
  },
  {
    label: "Akun staff dan kontrol akses",
    starter: false,
    pro: true,
    scale: true,
  },
  {
    label: "Kasir, payment, dan checkout",
    starter: false,
    pro: true,
    scale: true,
  },
  {
    label: "Membership, loyalty, dan retention",
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
    <section className="relative flex-1 overflow-hidden pb-20 pt-32 md:py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[900px] w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.14)_0%,transparent_68%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_78%_76%_at_50%_35%,#000_100%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <Badge
            variant="outline"
            className="border-blue-500/20 bg-blue-500/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600"
          >
            Pricing
          </Badge>

          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
            Harga sederhana untuk bisnis yang ingin lebih rapi.
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            <span className="sm:hidden">
              Mulai gratis. Lanjut saat sudah cocok.
            </span>
            <span className="hidden sm:inline">
              Coba 30 hari tanpa kartu kredit. Setelah cocok, pilih paket yang
              sesuai dengan cara bisnismu berjalan.
            </span>
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Pill text="Trial 30 hari" />
              <Pill text="Tanpa kartu kredit" />
              <Pill text="Upgrade kapan saja" />
          </div>

        </div>

        <div className="mx-auto mt-10 max-w-6xl">
          <div className="rounded-[1.5rem] border border-emerald-500/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(240,253,244,0.88))] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.045)] dark:border-emerald-500/15 dark:bg-[linear-gradient(180deg,rgba(9,16,23,0.96),rgba(8,28,21,0.96))]">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600">
                  <Clock3 className="h-3.5 w-3.5" />
                  Mulai tanpa risiko
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Mulai gratis 30 hari
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:leading-7">
                    <span className="sm:hidden">
                      Coba dulu. Kalau cocok, baru lanjut ke paket berbayar.
                    </span>
                    <span className="hidden sm:inline">
                      Coba website booking dan dashboard. Kalau alurnya cocok,
                      baru lanjut berlangganan.
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

              <div className="rounded-[1.35rem] border border-border/60 bg-background/70 p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Mulai dari sini
                </div>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-[-0.07em] text-foreground">
                    0
                  </span>
                  <span className="pb-2 text-sm font-semibold uppercase text-muted-foreground">
                    IDR
                  </span>
                </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  <span className="sm:hidden">
                    Tanpa kartu kredit. Coba dulu, baru putuskan.
                  </span>
                  <span className="hidden sm:inline">
                    Tidak perlu kartu kredit. Lanjut hanya kalau Bookinaja
                    memang membantu operasional harian.
                  </span>
                </p>
                <Link href="/signup?plan=starter&trial=1" className="mt-5 block">
                  <Button className="h-11 w-full rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700">
                    Mulai Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card/60 p-1.5 backdrop-blur">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                "rounded-xl px-5 py-2.5 text-sm font-semibold transition-all",
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
                "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all",
                isAnnual
                  ? "bg-background text-blue-600 shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Tahunan
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600">
                Hemat {annualDiscount}%
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-8 grid max-w-6xl gap-5 lg:grid-cols-3">
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
                id={plan.key}
                className={cn(
                  "relative flex flex-col rounded-[1.5rem] border p-5 shadow-[0_14px_38px_rgba(15,23,42,0.045)] transition-all duration-300",
                  billingPlan.recommended
                    ? "border-blue-500 bg-card shadow-[0_22px_60px_rgba(59,130,246,0.12)]"
                    : "border-border/70 bg-card/70",
                )}
              >
                {billingPlan.recommended ? (
                  <div className="absolute -top-3 left-5 inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                    Rekomendasi
                  </div>
                ) : null}

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="inline-flex rounded-full border border-blue-500/15 bg-blue-500/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">
                      {plan.kicker}
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                        {billingPlan.name}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground sm:leading-7">
                        {plan.bestFor}
                      </p>
                    </div>
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/8 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-7 border-t border-border/70 pt-6">
                  {displayBefore ? (
                    <div className="text-sm font-semibold italic text-muted-foreground/45 line-through">
                      IDR {displayBefore}
                    </div>
                  ) : null}

                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-sm font-semibold uppercase text-muted-foreground">
                      IDR
                    </span>
                    <span className="text-[2.85rem] font-semibold leading-none tracking-[-0.075em] text-foreground">
                      {displayMainPrice}
                    </span>
                    <span className="pb-1.5 text-sm font-semibold text-muted-foreground">
                      /{isAnnual ? "tahun" : "bln"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {priceLabel === "Tahunan"
                      ? `Setara ${formatIDR(annualEquivalent)}/bln, dibayar sekali untuk 1 tahun.`
                      : "Fleksibel untuk mulai sekarang lalu evaluasi sambil jalan."}
                  </p>
                </div>

                <div className="mt-7 flex-1 border-t border-border/70 pt-6">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Yang didapat
                  </div>

                  <div className="mt-4 grid gap-3">
                    {billingPlan.publicFeatures.slice(0, 6).map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm text-foreground/85">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {billingPlan.comingSoon ? (
                  <div className="mt-6 space-y-3">
                    <Button
                      disabled
                      variant="secondary"
                      className="h-11 w-full rounded-2xl text-sm font-semibold opacity-100"
                    >
                      <Clock3 className="mr-2 h-4 w-4" />
                      {plan.cta}
                    </Button>
                    {plan.detailHref ? (
                      <Link href={plan.detailHref} className="block">
                        <Button variant="outline" className="h-11 w-full rounded-2xl">
                          Lihat selengkapnya
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    <Link
                      href={`${plan.href}&interval=${isAnnual ? "annual" : "monthly"}`}
                      className="block"
                    >
                      <Button
                        className={cn(
                          "group h-11 w-full rounded-2xl text-sm font-semibold",
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
                    {plan.detailHref ? (
                      <Link href={plan.detailHref} className="block">
                        <Button variant="outline" className="h-11 w-full rounded-2xl">
                          Lihat selengkapnya
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-12 max-w-6xl rounded-[1.5rem] border border-border/70 bg-card/60 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.045)] md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Ringkasan fitur
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                Lihat bedanya sekilas
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Starter untuk operasional inti. Pro untuk tim. Scale untuk
              membership dan repeat order.
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

        <div className="mx-auto mt-12 max-w-3xl text-center">
          <p className="text-sm leading-7 text-muted-foreground">
            Kalau masih ragu mulai dari mana, lihat demo dulu atau ngobrol dulu
            sebelum pilih paket.
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
    <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {text}
    </span>
  );
}

function ComparisonCell({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return (
      <TableCell>
        <span className="font-semibold text-muted-foreground/40">-</span>
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
