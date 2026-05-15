import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getFeatureMeta,
  getPlanFeatureMatrixResolved,
} from "@/lib/plan-access";
import {
  annualMonthlyEquivalent,
  formatIDR,
  getBillingPlan,
  type BillingPlanKey,
} from "@/lib/pricing";

type PlanKey = Exclude<BillingPlanKey, "trial">;

type StoryCard = {
  title: string;
  body: string;
};

type PlanStory = {
  hero: string;
  summary: string;
  badge: string;
  outcomes: StoryCard[];
  fit: string[];
  notYet: string[];
  workdayWins: StoryCard[];
  chooseWhen: string[];
  faqs: { question: string; answer: string }[];
};

const PLAN_ORDER: PlanKey[] = ["starter", "pro", "scale"];

const PLAN_STORY: Record<PlanKey, PlanStory> = {
  starter: {
    badge: "Untuk owner solo",
    hero:
      "Starter cocok untuk bisnis yang ingin keluar dari catatan manual dan mulai melayani customer dengan lebih rapi.",
    summary:
      "Starter dibuat untuk bisnis yang ingin mulai rapi tanpa harus langsung masuk ke sistem yang terasa berat.",
    outcomes: [
      {
        title: "Booking tidak tercecer",
        body: "Permintaan masuk tidak lagi tercecer di chat, catatan, atau follow up manual yang rawan lupa.",
      },
      {
        title: "Owner punya panel kerja yang jelas",
        body: "Jadwal, resource, dan booking utama sudah terkumpul di satu alur yang lebih enak dipantau harian.",
      },
      {
        title: "Customer sudah bisa masuk lewat flow yang proper",
        body: "Halaman booking dan portal dasar sudah cukup untuk membuat bisnismu terlihat lebih siap di mata customer.",
      },
    ],
    fit: [
      "Bisnis masih dijalankan owner langsung.",
      "Fokus utama masih merapikan resource, jadwal, dan booking.",
      "Belum perlu banyak akun staff atau aturan akses terpisah.",
    ],
    notYet: [
      "Belum ada staff yang butuh akun masing-masing.",
      "Belum perlu pengaturan akses yang lebih detail.",
      "Belum butuh pengelolaan customer dan promosi yang lebih serius.",
    ],
    workdayWins: [
      {
        title: "Pagi lebih cepat mulai",
        body: "Owner bisa cek resource, booking, dan agenda harian tanpa bongkar chat atau spreadsheet.",
      },
      {
        title: "Customer tidak bingung cara booking",
        body: "Link booking dan flow dasar sudah cukup untuk mengurangi tanya ulang yang repetitif.",
      },
      {
        title: "Admin tidak lagi terasa serba manual",
        body: "Bukan paket yang rumit, tapi cukup untuk membuat pekerjaan harian terasa jauh lebih ringan.",
      },
    ],
    chooseWhen: [
      "Pilih Starter kalau target kamu adalah rapi dulu, bukan scale dulu.",
      "Naik ke Pro saat mulai ada staff, kasir, atau pembayaran yang perlu lebih tertib.",
    ],
    faqs: [
      {
        question: "Apakah Starter cukup untuk mulai jualan?",
        answer:
          "Cukup kalau fokusmu masih di jadwal, booking, dan pekerjaan harian yang masih kamu pegang sendiri. Ini paket untuk mulai rapi, bukan untuk tim besar.",
      },
      {
        question: "Kenapa tidak langsung Pro?",
        answer:
          "Kalau semuanya masih kamu pegang sendiri, banyak hal di Pro belum akan terpakai. Starter biasanya lebih pas untuk tahap awal.",
      },
      {
        question: "Kapan Starter mulai terasa sempit?",
        answer:
          "Biasanya saat mulai ada staff, pembayaran perlu dicek lebih rapi, atau kamu ingin mulai mengelola customer lama dengan lebih serius.",
      },
    ],
  },
  pro: {
    badge: "Paling masuk akal",
    hero:
      "Pro untuk bisnis yang sudah mulai dikerjakan bersama tim dan butuh cara kerja yang lebih tertib.",
    summary:
      "Pro dibuat untuk bisnis yang sudah berjalan lebih ramai dan butuh pembagian kerja yang lebih jelas setiap hari.",
    outcomes: [
      {
        title: "Tim bisa kerja bareng dengan akun masing-masing",
        body: "Tidak perlu lagi berbagi satu akun owner untuk kasir, admin, atau operasional harian.",
      },
      {
        title: "Payment flow terasa lebih rapi",
        body: "Metode bayar, bukti bayar, dan area kasir terasa lebih siap saat transaksi mulai ramai.",
      },
      {
        title: "Owner dapat kontrol yang lebih kuat",
        body: "Laporan, data customer, dan kontrol staff membantu owner memantau bisnis dengan lebih tenang.",
      },
    ],
    fit: [
      "Sudah ada staff, kasir, atau admin operasional.",
      "Perlu role, permission, dan verifikasi pembayaran yang lebih aman.",
      "Mulai ingin mengelola customer lama dan promosi dengan lebih rapi.",
    ],
    notYet: [
      "Belum butuh membership atau program loyalitas.",
      "Belum butuh alat yang lebih dalam untuk ekspansi dan pertumbuhan.",
      "Masih terlalu awal kalau tim dan transaksi belum benar-benar berjalan rutin.",
    ],
    workdayWins: [
      {
        title: "Staff tidak saling tabrak akses",
        body: "Akun staff dan pembagian akses membuat kerja tim lebih rapi dan lebih aman dibanding berbagi akun owner.",
      },
      {
        title: "Pembayaran lebih bisa dikontrol",
        body: "Pengaturan pembayaran dan pengecekan bukti bayar membantu transaksi tidak berhenti di chat konfirmasi saja.",
      },
      {
        title: "Owner mulai punya visibilitas yang relevan",
        body: "Laporan dan data customer memberi gambaran yang lebih jelas saat bisnis sudah tidak lagi kecil-kecilan.",
      },
    ],
    chooseWhen: [
      "Pilih Pro saat bisnis sudah bukan pekerjaan satu orang lagi.",
      "Naik ke Scale saat targetmu bukan cuma rapi, tapi membuat customer lebih sering kembali.",
    ],
    faqs: [
      {
        question: "Apa pembeda paling terasa dibanding Starter?",
        answer:
          "Akun staff, pembagian akses, pembayaran yang lebih tertib, data customer, dan laporan yang lebih jelas. Pro terasa beda saat pekerjaan harian sudah dibagi ke tim.",
      },
      {
        question: "Kalau baru punya satu staff, apakah Pro tetap relevan?",
        answer:
          "Ya. Kalau staff itu sudah ikut pegang operasional atau pembayaran, manfaat Pro tetap terasa karena yang dibeli adalah ketertiban kerja, bukan sekadar jumlah akun.",
      },
      {
        question: "Kapan harus naik ke Scale?",
        answer:
          "Saat target bisnis mulai bergeser ke repeat order, membership, dan hubungan jangka panjang dengan customer.",
      },
    ],
  },
  scale: {
    badge: "Untuk growth berikutnya",
    hero:
      "Scale untuk bisnis yang ingin customer lebih sering kembali dan nilai tiap customer terus bertumbuh.",
    summary:
      "Scale dibuat untuk bisnis yang ingin tumbuh bukan hanya dari customer baru, tapi juga dari customer yang terus kembali.",
    outcomes: [
      {
        title: "Membership dan loyalty bisa dijalankan",
        body: "Customer tidak berhenti di transaksi pertama, tapi mulai masuk ke pola beli ulang yang lebih sehat.",
      },
      {
        title: "Retention mulai bisa dibaca",
        body: "Owner bisa melihat apakah customer benar-benar kembali, bukan hanya melihat omzet sesaat.",
      },
      {
        title: "Bisnis lebih siap untuk growth",
        body: "Saat bisnis makin besar, fondasinya sudah siap untuk langkah berikutnya.",
      },
    ],
    fit: [
      "Pekerjaan harian sudah cukup rapi.",
      "Sudah mulai serius ingin customer kembali lebih sering.",
      "Owner ingin membaca pertumbuhan bisnis dengan lebih tajam.",
    ],
    notYet: [
      "Belum relevan kalau bisnis masih sibuk merapikan dasar-dasarnya.",
      "Belum perlu kalau tim dan pembayaran harian saja belum stabil.",
      "Tidak efisien kalau repeat order belum jadi prioritas utama.",
    ],
    workdayWins: [
      {
        title: "Growth bukan tebakan lagi",
        body: "Kamu bisa melihat kualitas pertumbuhan bisnis, bukan hanya jumlah transaksi yang lewat.",
      },
      {
        title: "Program repeat bisa dijalankan",
        body: "Membership dan reward memberi alasan yang jelas bagi customer untuk kembali lagi.",
      },
      {
        title: "Siap untuk bisnis yang lebih kompleks",
        body: "Scale menyiapkan bisnismu untuk langkah yang lebih besar tanpa harus bongkar ulang fondasi.",
      },
    ],
    chooseWhen: [
      "Pilih Scale saat targetmu sudah bergeser dari sekadar rapi ke membangun customer setia.",
      "Kalau hari ini masih fokus merapikan tim dan pembayaran, Pro biasanya sudah cukup.",
    ],
    faqs: [
      {
        question: "Kenapa Scale diposisikan premium?",
        answer:
          "Karena manfaatnya langsung dekat ke repeat order, loyalitas customer, dan pertumbuhan bisnis jangka panjang.",
      },
      {
        question: "Apakah Scale wajib untuk semua tenant besar?",
        answer:
          "Tidak. Scale cocok kalau kebutuhan pertumbuhan dan loyalitas customer memang sudah nyata. Kalau fokus utama masih kerja tim harian, Pro sudah cukup.",
      },
      {
        question: "Apakah semua yang ada di Pro tetap ikut?",
        answer:
          "Ya. Semua yang kamu dapat di Pro tetap ikut, lalu ditambah fitur untuk membership, reward, dan pertumbuhan customer.",
      },
    ],
  },
};

const BASE_INCLUDED_BY_PLAN: Record<PlanKey, string[]> = {
  starter: [
    "Landing tenant dan portal customer dasar",
    "Halaman booking inti untuk customer dan owner",
    "Dashboard admin dasar untuk memantau bisnis harian",
    "Pengaturan jadwal dan unit utama",
  ],
  pro: [
    "Semua kemampuan Starter",
    "Kerja tim dengan akun staff dan akses terpisah",
    "Pembayaran, kasir, dan verifikasi manual yang lebih rapi",
    "Pengelolaan customer dan laporan yang lebih berguna",
  ],
  scale: [
    "Semua kemampuan Pro",
    "Membership, loyalty, dan reward",
    "Laporan pertumbuhan dan repeat order yang lebih dalam",
    "Siap untuk langkah bisnis yang lebih besar",
  ],
};

function normalizePlanParam(value: string): PlanKey | null {
  const plan = String(value || "").toLowerCase();
  if (plan === "starter" || plan === "pro" || plan === "scale") {
    return plan;
  }
  return null;
}

function getNeighborPlan(
  current: PlanKey,
  direction: "previous" | "next",
): PlanKey | null {
  const currentIndex = PLAN_ORDER.indexOf(current);
  if (currentIndex === -1) return null;
  const targetIndex =
    direction === "previous" ? currentIndex - 1 : currentIndex + 1;
  return PLAN_ORDER[targetIndex] ?? null;
}

function getUpgradeOnlyFeatures(plan: PlanKey) {
  const matrix = getPlanFeatureMatrixResolved();
  const current = matrix[plan] || [];
  const previousPlan = getNeighborPlan(plan, "previous");
  if (!previousPlan) return [];
  const previous = matrix[previousPlan] || [];
  return current.filter((item) => !previous.includes(item)).map(getFeatureMeta);
}

function getNextPlanHighlights(plan: PlanKey) {
  const matrix = getPlanFeatureMatrixResolved();
  const current = matrix[plan] || [];
  const nextPlan = getNeighborPlan(plan, "next");
  if (!nextPlan) return { nextPlan: null, items: [] as ReturnType<typeof getFeatureMeta>[] };
  const next = matrix[nextPlan] || [];
  return {
    nextPlan,
    items: next.filter((item) => !current.includes(item)).map(getFeatureMeta),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ plan: string }>;
}): Promise<Metadata> {
  const { plan } = await params;
  const normalizedPlan = normalizePlanParam(plan);
  if (!normalizedPlan) {
    return {
      title: "Plan - Bookinaja",
    };
  }

  const billingPlan = getBillingPlan(normalizedPlan);
  return {
    title: `${billingPlan?.name || "Plan"} - Bookinaja`,
    description: PLAN_STORY[normalizedPlan].summary,
    alternates: { canonical: `/pricing/${normalizedPlan}` },
  };
}

export default function PricingPlanDetailPage({
  params,
}: {
  params: Promise<{ plan: string }>;
}) {
  return <PricingPlanDetailContent params={params} />;
}

async function PricingPlanDetailContent({
  params,
}: {
  params: Promise<{ plan: string }>;
}) {
  const { plan } = await params;
  const normalizedPlan = normalizePlanParam(plan);
  if (!normalizedPlan) {
    notFound();
  }

  const billingPlan = getBillingPlan(normalizedPlan);
  if (!billingPlan) {
    notFound();
  }

  const story = PLAN_STORY[normalizedPlan];
  const annualEquivalent = annualMonthlyEquivalent(billingPlan.annualTotal);
  const comparePlanKey = getNeighborPlan(normalizedPlan, "previous") || getNeighborPlan(normalizedPlan, "next");
  const compareTarget = comparePlanKey ? getBillingPlan(comparePlanKey) : null;
  const compareHref = compareTarget ? `/pricing/${compareTarget.key}` : "/pricing";
  const upgradeOnlyFeatures = getUpgradeOnlyFeatures(normalizedPlan);
  const nextPlanHighlights = getNextPlanHighlights(normalizedPlan);

  return (
    <section className="relative overflow-hidden py-20 md:py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[720px] w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.12)_0%,transparent_72%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_78%_76%_at_50%_35%,#000_100%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 px-6">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="ghost" className="rounded-lg px-0">
              <Link href="/pricing">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke pricing
              </Link>
            </Button>
            <Badge
              variant="outline"
              className="border-blue-500/20 bg-blue-500/5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600"
            >
                  Penjelasan Paket
            </Badge>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
            <div className="space-y-6">
              <div className="inline-flex rounded-full border border-blue-500/15 bg-blue-500/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                {story.badge}
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="max-w-4xl text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                  {billingPlan.name} untuk hasil yang terasa di bisnis harian
                </h1>
                <p className="max-w-3xl text-base leading-8 text-muted-foreground">
                  {story.hero}
                </p>
              </div>

              <div className="max-w-3xl divide-y divide-border/70 rounded-[1.5rem] border border-border/70 bg-card/65">
                {story.outcomes.map((item) => (
                  <div key={item.title} className="px-5 py-4 sm:px-6">
                    <div className="text-base font-semibold text-foreground">
                      {item.title}
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Card className="rounded-[1.75rem] border-border/70 bg-card/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] lg:sticky lg:top-24">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                Harga
              </div>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-sm font-black uppercase text-muted-foreground">
                  IDR
                </span>
                <span className="text-[3.4rem] font-black leading-none tracking-[-0.08em] text-foreground">
                  {formatIDR(billingPlan.monthly)}
                </span>
                <span className="pb-2 text-sm font-bold text-muted-foreground">
                  /bln
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Atau Rp {formatIDR(billingPlan.annualTotal)}/tahun, setara Rp{" "}
                {formatIDR(annualEquivalent)}/bln.
              </p>

              <div className="mt-5 rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Kenapa banyak bisnis pilih paket ini
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {story.summary}
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {story.chooseWhen.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-foreground/85">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {billingPlan.comingSoon ? (
                  <Button disabled className="h-12 rounded-xl">
                    Segera hadir
                  </Button>
                ) : (
                  <Button asChild className="h-12 rounded-xl bg-blue-600 text-white hover:bg-blue-700">
                    <Link href={`/register?plan=${billingPlan.key}`}>
                      Pilih {billingPlan.name}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}

                <Button asChild variant="outline" className="h-12 rounded-xl">
                  <Link href={compareHref}>
                    {compareTarget
                      ? `Bandingkan dengan ${compareTarget.name}`
                      : "Bandingkan plan lain"}
                  </Link>
                </Button>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {story.workdayWins.map((item, index) => (
              <Card
                key={item.title}
                className="rounded-[1.5rem] border-border/70 bg-card/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                  {index === 0 ? (
                    <Users className="h-5 w-5" />
                  ) : index === 1 ? (
                    <Wallet className="h-5 w-5" />
                  ) : (
                    <TrendingUp className="h-5 w-5" />
                  )}
                </div>
                <div className="mt-4 text-lg font-semibold text-foreground">
                  {item.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.body}
                </p>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card className="rounded-[1.75rem] border-border/70 bg-card/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Cocok untuk
              </div>
              <div className="mt-4 space-y-3">
                {story.fit.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-foreground/85">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

            </Card>

            <Card className="rounded-[1.75rem] border-border/70 bg-card/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Kemampuan plan
                  </div>
                  <div className="mt-4 grid gap-3">
                    {BASE_INCLUDED_BY_PLAN[normalizedPlan].map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-foreground/85"
                      >
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Belum perlu paket ini kalau
                  </div>
                  <div className="mt-4 space-y-3">
                    {story.notYet.map((item) => (
                      <div key={item} className="flex items-start gap-3 text-sm text-foreground/85">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <CircleHelp className="h-3.5 w-3.5" />
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card className="rounded-[1.75rem] border-border/70 bg-card/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                Yang benar-benar kamu dapat
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">
                  Yang benar-benar bisa kamu pakai
                </h2>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Disusun dari hak akses paket yang dipakai di produk
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                {upgradeOnlyFeatures.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {upgradeOnlyFeatures.map((feature) => (
                      <div
                        key={feature.shortLabel}
                        className="rounded-2xl border border-border/70 bg-background/60 px-4 py-4"
                      >
                        <div className="text-sm font-semibold text-foreground">
                          {feature.label}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/70 bg-background/60 px-5 py-5 text-sm leading-6 text-muted-foreground">
                    Starter fokus ke kebutuhan dasar bisnis. Kamu sudah bisa mulai rapi dari sisi halaman booking, jadwal, unit, dan admin harian. Saat tim mulai bertambah atau kebutuhan bisnis mulai lebih kompleks, biasanya orang naik ke Pro.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/60 px-5 py-5">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Langkah berikutnya
                </div>
                {nextPlanHighlights.nextPlan ? (
                  <>
                    <div className="mt-3 text-base font-semibold text-foreground">
                      Pertimbangkan {getBillingPlan(nextPlanHighlights.nextPlan)?.name} saat kamu mulai butuh:
                    </div>
                    <div className="mt-4 space-y-3">
                      {nextPlanHighlights.items.slice(0, 4).map((feature) => (
                        <div key={feature.shortLabel} className="flex items-start gap-3 text-sm text-foreground/85">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                          <span>
                            <span className="font-medium text-foreground">{feature.label}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-3 text-sm leading-6 text-muted-foreground">
                    Ini paket paling tinggi saat ini. Fokus berikutnya adalah memaksimalkan semua yang sudah kamu buka di sini.
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="rounded-[1.75rem] border-border/70 bg-card/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              Pertanyaan yang sering ditanyakan
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {story.faqs.map((item) => (
                <div
                  key={item.question}
                  className="rounded-2xl border border-border/70 bg-background/60 px-5 py-5"
                >
                  <div className="text-base font-semibold text-foreground">
                    {item.question}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
