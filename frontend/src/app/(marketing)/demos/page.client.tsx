"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Camera,
  ChevronRight,
  Monitor,
  Sparkles,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { demoSectors, type DemoSector } from "./demo-data";

const icons = {
  monitor: Monitor,
  camera: Camera,
  trophy: Trophy,
  briefcase: Briefcase,
};

export default function DemosPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-16 pt-32 md:pt-24">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-0 h-[720px] w-full -translate-x-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.18)_0%,transparent_68%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <Badge
            variant="outline"
            className="rounded-full border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-500"
          >
            <Sparkles className="mr-2 h-3.5 w-3.5 fill-current" />
            Demo per jenis bisnis
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.06] tracking-[-0.045em] text-foreground md:text-5xl">
            Pilih demo yang paling dekat dengan bisnismu.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-muted-foreground">
            Pilih contoh yang paling mirip dengan bisnismu, lalu lihat alur
            booking dan dashboard yang relevan.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
          {demoSectors.map((sector) => (
            <SectorCard key={sector.slug} sector={sector} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SectorCard({ sector }: { sector: DemoSector }) {
  const Icon = icons[sector.icon];

  return (
    <Link
      href={`/demos/${sector.slug}`}
      className="group relative overflow-hidden rounded-[1.5rem] border border-border bg-card/60 p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10"
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r",
          sector.color,
        )}
      />
      <div className="flex items-start justify-between gap-6">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-[1.1rem] bg-gradient-to-br text-white shadow-lg",
            sector.color,
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {sector.previewUrl}
        </span>
      </div>

      <div className="mt-6">
        <h2 className="text-2xl font-semibold leading-tight tracking-[-0.035em] text-foreground">
          {sector.title}
        </h2>
        <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-muted-foreground">
          {sector.description}
        </p>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {sector.features.slice(0, 4).map((feature) => (
          <span
            key={feature}
            className="rounded-2xl border border-border bg-background/70 px-3.5 py-2.5 text-xs font-semibold text-foreground/80"
          >
            {feature}
          </span>
        ))}
      </div>

      <Button className="mt-6 h-11 rounded-2xl bg-foreground px-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-background hover:bg-blue-600">
        Lihat demo ini
        <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Button>
    </Link>
  );
}
