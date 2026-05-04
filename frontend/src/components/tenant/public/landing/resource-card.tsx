"use client";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { BuilderResource } from "@/lib/page-builder";

type ResourceCardProps = {
  res: BuilderResource;
  primaryColor?: string;
  accentColor?: string;
  preset?: string;
  radiusStyle?: string;
  getBestPrice: (resource: BuilderResource) => { value: number; unit: string } | null;
};

export function ResourceCard({
  res,
  primaryColor = "#3b82f6",
  accentColor,
  preset = "bookinaja-classic",
  radiusStyle = "rounded",
  getBestPrice,
}: ResourceCardProps) {
  const bestRate = getBestPrice(res);
  const shellRadiusClass =
    radiusStyle === "square" ? "rounded-[1.2rem] md:rounded-[1.5rem]" : radiusStyle === "soft" ? "rounded-[2rem] md:rounded-[2.2rem]" : "rounded-[2rem] md:rounded-[2.5rem]";
  const mediaRadiusClass =
    radiusStyle === "square" ? "rounded-[0.9rem] md:rounded-[1rem]" : radiusStyle === "soft" ? "rounded-[1.4rem] md:rounded-[1.6rem]" : "rounded-[1.5rem] md:rounded-[2rem]";
  const chipRadiusClass =
    radiusStyle === "square" ? "rounded-[0.75rem]" : radiusStyle === "soft" ? "rounded-[1rem]" : "rounded-xl";
  const actionRadiusClass =
    radiusStyle === "square" ? "rounded-[0.85rem]" : radiusStyle === "soft" ? "rounded-[1rem]" : "rounded-[1rem]";
  const shellClass =
    preset === "boutique"
      ? "border-stone-200/70 bg-[#fffdf9]/90 dark:border-white/10 dark:bg-[#171412]/88 shadow-[0_22px_60px_rgba(41,37,36,0.14)]"
      : preset === "sunset-glow"
        ? "border-orange-200/70 bg-[#fffaf5]/92 dark:border-orange-500/20 dark:bg-[#1c0e09]/88 shadow-[0_22px_60px_rgba(124,45,18,0.16)]"
      : preset === "playful"
        ? "border-emerald-100/80 bg-white/92 dark:border-emerald-500/20 dark:bg-[#082114]/88 shadow-[0_22px_56px_rgba(20,83,45,0.14)]"
        : preset === "mono-luxe"
          ? "border-slate-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] shadow-[0_24px_64px_rgba(15,23,42,0.12)]"
        : preset === "dark-pro"
          ? "border-slate-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(226,232,240,0.96))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(7,11,22,0.98))] shadow-[0_24px_64px_rgba(15,23,42,0.14)] dark:shadow-[0_24px_64px_rgba(2,6,23,0.5)]"
          : "border-slate-200/60 bg-white/70 dark:border-white/10 dark:bg-black/40 shadow-xl";
  const chipClass =
    preset === "boutique"
      ? "bg-[#fff7ee]/88 text-stone-800 border-stone-200/80 dark:bg-[#201a17] dark:text-stone-100 dark:border-white/10"
      : preset === "sunset-glow"
        ? "bg-[#fff7ed]/90 text-orange-900 border-orange-200/80 dark:bg-[#241109] dark:text-orange-100 dark:border-orange-500/20"
      : preset === "playful"
        ? "bg-white/90 text-emerald-800 border-emerald-100/80 dark:bg-[#0b2417] dark:text-emerald-100 dark:border-emerald-500/20"
      : preset === "mono-luxe"
        ? "bg-white/92 text-slate-800 border-slate-300 dark:bg-[#0b1120] dark:text-slate-100 dark:border-white/10"
      : preset === "dark-pro"
          ? "bg-white/88 text-slate-700 border-slate-300 dark:bg-[#0b1120] dark:text-slate-100 dark:border-white/10"
          : "bg-white/80 dark:bg-black/60 text-slate-900 dark:text-white border-white/30 dark:border-white/10";
  const ratingClass =
    preset === "dark-pro"
      ? "bg-slate-100 dark:bg-white/10"
      : preset === "boutique"
        ? "bg-[#fff8f1]/80"
        : preset === "sunset-glow"
          ? "bg-[#fff1e8]/90 dark:bg-[#241109]"
        : preset === "playful"
          ? "bg-white/70"
          : preset === "mono-luxe"
            ? "bg-slate-100/90 dark:bg-[#0b1120]"
          : "bg-white/50 dark:bg-white/10";

  return (
    <Link
      href={`/bookings/${res.id}`}
      className="group block h-full w-full outline-none focus:ring-0"
    >
      <Card className={cn("relative flex h-full min-h-[32rem] flex-col overflow-hidden border backdrop-blur-3xl transition-all duration-500 hover:-translate-y-2 group-active:scale-[0.97] hover:shadow-2xl", shellRadiusClass, shellClass)}>
        {/* --- Image Section --- */}
        <div className="relative w-full p-3 pb-0 shrink-0">
          <div className={cn("relative h-[14.5rem] w-full overflow-hidden sm:h-[15rem] md:h-[220px]", mediaRadiusClass)}>
            {res.image_url ? (
              <Image
                src={res.image_url}
                alt={res.name}
                fill
                unoptimized
                sizes="(min-width: 1024px) 26vw, (min-width: 640px) 44vw, 100vw"
                className="object-cover object-center transition-transform duration-1000 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-10 blur-2xl"
                  style={{ backgroundColor: primaryColor }}
                />
                <Zap className="h-10 w-10 opacity-20 dark:opacity-40 relative z-10" />
              </div>
            )}

            {/* Badge Category */}
            <div className="absolute top-3 left-3 z-20">
              <Badge className={cn("backdrop-blur-md border text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 shadow-sm", chipRadiusClass, chipClass)}>
                {res.category || "Fasilitas"}
              </Badge>
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
          </div>
        </div>

        {/* --- Info Section --- */}
        <div className="p-5 md:p-6 flex flex-col flex-1 relative">
          <div className="mb-4 flex flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-h-[3.8rem] text-lg font-black uppercase italic leading-tight tracking-tight text-slate-900 line-clamp-2 dark:text-white md:min-h-[4.3rem] md:text-xl">
                {res.name}
              </h3>
              <div className={cn("flex items-center gap-1 shrink-0 backdrop-blur-md px-2 py-1 border border-white/20 dark:border-white/5 mt-1", chipRadiusClass, ratingClass)}>
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  4.9
                </span>
              </div>
            </div>
            <p className="mt-2 min-h-[3.4rem] text-xs font-medium leading-relaxed text-slate-500 line-clamp-2 dark:text-slate-400">
              {res.description || "Fasilitas premium yang siap mendukung aktivitas terbaikmu."}
            </p>
          </div>

          <div className="mt-2 flex min-h-[5.5rem] items-end justify-between border-t border-slate-200/50 pt-4 dark:border-white/10">
            <div className="space-y-1 self-stretch">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Mulai Dari
              </p>
              {bestRate ? (
                <div className="flex min-h-[2.4rem] items-baseline gap-1">
                  <span
                    className="text-xl font-black tracking-tight"
                    style={{ color: primaryColor }}
                  >
                    Rp{bestRate.value.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    /{bestRate.unit}
                  </span>
                </div>
              ) : (
                <span className="inline-flex min-h-[2.4rem] items-end text-xs font-bold text-slate-400">
                  Harga belum tersedia
                </span>
              )}
            </div>

            {/* Action Button */}
            <div
              className={cn("h-10 w-10 md:h-12 md:w-12 flex items-center justify-center text-white shadow-xl transition-all duration-500 group-hover:-translate-y-1 group-hover:scale-105 active:scale-95", actionRadiusClass)}
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 10px 25px -5px ${(accentColor || primaryColor)}66`,
              }}
            >
              <ArrowRight size={18} strokeWidth={3} />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
