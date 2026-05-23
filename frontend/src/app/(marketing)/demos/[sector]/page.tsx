import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Briefcase,
  CalendarCheck,
  Camera,
  CheckCircle2,
  CreditCard,
  Monitor,
  MousePointerClick,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { demoSectors, getDemoSector, type DemoSector } from "../demo-data";

const icons = {
  monitor: Monitor,
  camera: Camera,
  trophy: Trophy,
  briefcase: Briefcase,
};

const toneClass = {
  blue: "border-blue-500/40 bg-blue-500/15 text-blue-100",
  green: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100",
  amber: "border-amber-500/40 bg-amber-500/15 text-amber-100",
  rose: "border-rose-500/40 bg-rose-500/15 text-rose-100",
};

export function generateStaticParams() {
  return demoSectors.map((sector) => ({ sector: sector.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sector: string }>;
}): Promise<Metadata> {
  const { sector: slug } = await params;
  const sector = getDemoSector(slug);
  if (!sector) return { title: "Demo - Bookinaja" };

  return {
    title: `${sector.title} Demo | Bookinaja`,
    description: sector.description,
    alternates: { canonical: `/demos/${sector.slug}` },
  };
}

export default async function DemoSectorPage({
  params,
}: {
  params: Promise<{ sector: string }>;
}) {
  const { sector: slug } = await params;
  const sector = getDemoSector(slug);
  if (!sector) notFound();

  return (
    <main className="relative min-h-screen overflow-hidden bg-background pb-16 pt-32 md:pt-24">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-0 h-[760px] w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.2)_0%,transparent_66%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="container relative z-10 mx-auto max-w-7xl px-6">
        <Link
          href="/demos"
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-blue-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Semua demo
        </Link>

        <HeroSection sector={sector} />
        <CustomerPreview sector={sector} />
        <AdminPreview sector={sector} />
        <ProofGrid sector={sector} />
        <FinalCta sector={sector} />
      </div>
    </main>
  );
}

function HeroSection({ sector }: { sector: DemoSector }) {
  const Icon = icons[sector.icon];

  return (
    <section className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <div>
        <Badge
          variant="outline"
          className="rounded-full border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-500"
        >
          <Sparkles className="mr-2 h-3.5 w-3.5 fill-current" />
          Demo {sector.title}
        </Badge>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.06] tracking-[-0.045em] text-foreground md:text-5xl">
          {sector.hero}
        </h1>
        <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-muted-foreground">
          {sector.subhero}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={sector.demoUrl} target="_blank">
            <Button className="h-11 rounded-2xl bg-blue-600 px-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-blue-700">
              Buka Website Demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href={sector.scheduleUrl}>
            <Button
              variant="outline"
              className="h-11 rounded-2xl px-6 text-[11px] font-semibold uppercase tracking-[0.1em]"
            >
              Jadwalkan Demo
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative rounded-[1.5rem] border border-border bg-card/70 p-4 shadow-xl shadow-blue-500/10 backdrop-blur-xl">
        <div
          className={cn(
            "rounded-[1.35rem] bg-gradient-to-br p-6 text-white",
            sector.color,
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Icon className="h-6 w-6" />
            </div>
            <span className="rounded-full bg-white/20 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
              {sector.previewUrl}
            </span>
          </div>
          <p className="mt-12 max-w-md text-3xl font-semibold leading-[1.08] tracking-[-0.035em] md:text-[2.15rem]">
            Website booking dan dashboard operasional disesuaikan untuk{" "}
            {sector.shortTitle}.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {sector.customerSteps.slice(0, 4).map((step, index) => (
              <div
                key={step}
                className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-medium"
              >
                0{index + 1}. {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CustomerPreview({ sector }: { sector: DemoSector }) {
  return (
    <section className="mt-12 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[1.5rem] border border-border bg-card/70 p-5 shadow-sm backdrop-blur-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">
              Website booking pelanggan
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] md:text-[1.8rem]">
              Pelanggan paham alurnya tanpa perlu dijelaskan.
            </h2>
          </div>
          <MousePointerClick className="hidden h-8 w-8 text-blue-500 md:block" />
        </div>

        <div className="rounded-[1.5rem] border border-border bg-background/90 p-4">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-2 flex-1 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-muted-foreground">
              {sector.previewUrl}
            </span>
          </div>
          <div
            className={cn(
              "rounded-[1.25rem] bg-gradient-to-br p-5 text-white",
              sector.color,
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">
              Halaman booking
            </p>
            <h3 className="mt-8 max-w-md text-3xl font-bold leading-[1.04] tracking-[-0.03em]">
              Pilih jadwal, isi data, bayar DP.
            </h3>
            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {sector.customerSteps.map((step, index) => (
                <div
                  key={step}
                  className="rounded-2xl bg-white/15 p-3 text-xs font-semibold"
                >
                  <span className="block text-white/60">0{index + 1}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-border bg-card/70 p-5 shadow-sm backdrop-blur-xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">
          Yang terlihat oleh bisnis
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] md:text-[1.8rem]">
          Detail booking langsung siap ditindaklanjuti.
        </h2>
        <div className="mt-6 space-y-3">
          {sector.features.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-3 rounded-2xl border border-border bg-background/70 px-4 py-4"
            >
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-semibold">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdminPreview({ sector }: { sector: DemoSector }) {
  return (
    <section className="mt-5 rounded-[1.5rem] border border-slate-800 bg-[#070b1a] p-5 text-white shadow-xl shadow-blue-500/15">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-300">
            Tampilan dashboard operasional
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] md:text-3xl">
            Booking, bayar, tim, dan laporan dalam satu tempat.
          </h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
          Realtime
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {sector.adminPanels.map((panel) => (
          <div
            key={panel.label}
            className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              {panel.label}
            </p>
            <p className="mt-3 text-2xl font-semibold">{panel.value}</p>
            <p className="mt-1 text-sm font-medium text-white/55">
              {panel.helper}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
              Status unit dan jadwal
            </p>
            <CalendarCheck className="h-5 w-5 text-blue-300" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {sector.resources.map((item) => (
              <div
                key={item.name}
                className={cn(
                  "rounded-2xl border p-4",
                  toneClass[item.tone],
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold">{item.name}</p>
                  <span className="h-2.5 w-2.5 rounded-full bg-current" />
                </div>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] opacity-80">
                  {item.status}
                </p>
                <p className="mt-1 text-sm font-medium text-white/80">
                  {item.meta}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <Panel title="Pembayaran masuk" icon={<CreditCard className="h-5 w-5" />}>
            {sector.payments.map((payment) => (
              <div
                key={`${payment.label}-${payment.amount}`}
                className="flex items-center justify-between rounded-2xl bg-white/[0.06] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{payment.label}</p>
                  <p className="text-xs font-medium text-white/45">
                    {payment.method}
                  </p>
                </div>
                <p className="font-bold text-emerald-300">{payment.amount}</p>
              </div>
            ))}
          </Panel>
          <Panel title="Kontrol tim" icon={<Users className="h-5 w-5" />}>
            {sector.staff.map((member) => (
              <div key={member.role} className="rounded-2xl bg-white/[0.06] p-4">
                <p className="font-semibold">{member.role}</p>
                <p className="mt-1 text-xs font-medium leading-5 text-white/50">
                  {member.access}
                </p>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </section>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
          {title}
        </p>
        <div className="text-blue-300">{icon}</div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ProofGrid({ sector }: { sector: DemoSector }) {
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-3">
      <div className="rounded-[1.5rem] border border-border bg-card/70 p-5 shadow-sm backdrop-blur-xl lg:col-span-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">
              Laporan yang relevan
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] md:text-[1.8rem]">
              Angka yang ditampilkan sesuai cara bisnis ini berjalan.
            </h2>
          </div>
          <BarChart3 className="hidden h-10 w-10 text-blue-500 md:block" />
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {sector.report.map((item) => (
            <div
              key={item.label}
              className="rounded-[1.5rem] border border-border bg-background/75 p-5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-4 text-2xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-border bg-card/70 p-5 shadow-sm backdrop-blur-xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">
          Langkah berikutnya
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] md:text-[1.8rem]">
          Mau lihat dashboardnya?
        </h2>
        <p className="mt-4 text-sm font-medium leading-7 text-muted-foreground">
          Jadwalkan demo supaya tim Bookinaja bisa tunjukkan alur dashboard
          sesuai kebutuhan {sector.shortTitle.toLowerCase()}.
        </p>
        <Link href={sector.scheduleUrl}>
          <Button className="mt-6 h-11 w-full rounded-2xl bg-blue-600 text-[11px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-blue-700">
            Jadwalkan Demo
          </Button>
        </Link>
      </div>
    </section>
  );
}

function FinalCta({ sector }: { sector: DemoSector }) {
  return (
    <section className="mt-8 overflow-hidden rounded-[1.5rem] bg-[#070b1a] p-6 text-white md:p-8">
      <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-300">
            Demo {sector.title}
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.08] tracking-[-0.035em] md:text-[2.15rem]">
            Lihat website booking dulu, lalu jadwalkan demo dashboard.
          </h2>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-white/55">
            Calon pengguna melihat pengalaman booking dulu, lalu menunjukkan
            minat kalau ingin melihat dashboard operasional bersama tim
            Bookinaja.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
          <Link href={sector.demoUrl} target="_blank">
            <Button className="h-11 w-full rounded-2xl bg-white px-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-950 hover:bg-blue-50">
              Buka Website Demo
            </Button>
          </Link>
          <Link href={sector.scheduleUrl}>
            <Button
              variant="outline"
              className="h-11 w-full rounded-2xl border-white/20 bg-white/10 px-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-white hover:text-slate-950"
            >
              Jadwalkan Demo
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
