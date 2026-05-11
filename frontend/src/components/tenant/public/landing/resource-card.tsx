"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { type BuilderResource } from "@/lib/page-builder";
import { cn } from "@/lib/utils";
import { getLandingPresetTone } from "./theme-preset";

type ResourceCardProps = {
  res: BuilderResource;
  primaryColor: string;
  accentColor: string;
  preset: string;
  radiusStyle: string;
  viewport: "desktop" | "mobile";
  getBestPrice: (resource: BuilderResource) => { value: number; unit: string } | null;
};

export function ResourceCard({
  res,
  primaryColor,
  preset,
  radiusStyle,
  getBestPrice,
  viewport,
}: ResourceCardProps) {
  const tone = getLandingPresetTone(preset);
  const bestPrice = getBestPrice(res);
  const mode = String(res.operating_mode || "timed").toLowerCase();
  const isDirectSale = mode === "direct_sale";
  const isTimed = !isDirectSale;
  const rawUnit = String(bestPrice?.unit || "").trim().toLowerCase();
  const priceUnitLabel = bestPrice?.unit || (isDirectSale ? "pcs" : "jam");
  const footerLabel = isDirectSale ? "Harga produk" : "Mulai dari";
  const modeLabel = isDirectSale ? "Direct Sale" : "Timed";
  const href = isDirectSale ? `/orders/${res.id}` : `/bookings/${res.id}`;
  const directSaleDescription =
    res.description || "Pilih produk lalu lanjutkan checkout tanpa perlu memilih slot waktu.";
  const timedDescription =
    res.description || "Resource siap ditampilkan untuk booking customer.";
  const resolvedPriceUnitLabel = isDirectSale
    ? rawUnit && rawUnit !== "sesi"
      ? priceUnitLabel
      : "pcs"
    : priceUnitLabel;

  const cardRadiusClass =
    radiusStyle === "square"
      ? "rounded-[1rem]"
      : radiusStyle === "soft"
        ? "rounded-[1.4rem]"
        : viewport === "mobile"
          ? "rounded-[1.4rem]"
          : "rounded-[1.6rem]";

  return (
    <Link href={href} className="group block h-full">
      <Card
        className={cn(
          "h-full overflow-hidden p-0 backdrop-blur transition-all duration-300 hover:-translate-y-1",
          tone.card,
          cardRadiusClass,
        )}
      >
        <div className="flex h-full flex-col">
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-white/5">
            {res.image_url ? (
              <Image
                src={res.image_url}
                alt={res.name}
                fill
                unoptimized
                sizes="(min-width: 1280px) 360px, (min-width: 768px) 50vw, 100vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-black uppercase tracking-[0.2em] text-white/35">
                No Image
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent dark:from-black/55" />

            <div className="absolute left-4 top-4">
              <Badge className="rounded-full border border-white/20 bg-black/55 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-white backdrop-blur">
                {modeLabel}
              </Badge>
            </div>
          </div>

          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className={cn("line-clamp-2 text-2xl font-[1000] uppercase italic leading-[0.95] tracking-tight", tone.title)}>
                  {res.name}
                </h3>
                <p className={cn("mt-3 line-clamp-3 text-sm leading-6", tone.body)}>
                  {isDirectSale ? directSaleDescription : timedDescription}
                </p>
              </div>

              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-auto pt-5">
              <div className="border-t border-slate-200/80 pt-4 dark:border-white/10">
                <p className={cn("text-[10px] font-black uppercase tracking-[0.24em]", tone.cardMuted)}>
                  {footerLabel}
                </p>

                {bestPrice ? (
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-3xl font-black tracking-tight text-orange-500">
                      Rp{bestPrice.value.toLocaleString("id-ID")}
                    </span>
                    <span className={cn("pb-1 text-xs font-semibold", tone.cardMuted)}>
                      /{resolvedPriceUnitLabel}
                    </span>
                  </div>
                ) : (
                  <div className={cn("mt-2 text-sm font-semibold", tone.body)}>
                    {isTimed
                      ? "Harga tampil saat opsi booking utama tersedia"
                      : "Harga tampil saat produk utama tersedia"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
