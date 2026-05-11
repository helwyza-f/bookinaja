"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Maximize2, Camera } from "lucide-react";
import { getLandingPresetTone } from "./theme-preset";

interface GallerySectionProps {
  images: string[];
  primaryColor: string;
  accentColor?: string;
  preset?: string;
  radiusStyle?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
}

export function GallerySection({
  images,
  primaryColor,
  accentColor,
  preset = "bookinaja-classic",
  radiusStyle = "rounded",
  eyebrow,
  title,
  description,
}: GallerySectionProps) {
  const safeImages = (images || []).filter((url) => Boolean(url?.trim()));
  if (!safeImages.length) return null;
  const tone = getLandingPresetTone(preset);
  const frameRadiusClass =
    radiusStyle === "square" ? "rounded-[1.25rem] md:rounded-[1.8rem]" : radiusStyle === "soft" ? "rounded-[2.2rem] md:rounded-[2.75rem]" : "rounded-[2rem] md:rounded-[3rem]";
  const tagRadiusClass =
    radiusStyle === "square" ? "rounded-[0.9rem]" : radiusStyle === "soft" ? "rounded-[1.15rem]" : "rounded-full";
  const sectionBackgroundClass = tone.section;
  const frameClass =
    preset === "boutique"
      ? "border-stone-200 bg-[#fff8f1] shadow-[0_20px_60px_rgba(41,37,36,0.12)]"
      : preset === "sunset-glow"
        ? "border-orange-200 bg-[#fff1e8] shadow-[0_20px_60px_rgba(124,45,18,0.14)]"
      : preset === "playful"
        ? "border-emerald-100 bg-white shadow-[0_20px_55px_rgba(20,83,45,0.12)]"
        : preset === "mono-luxe"
          ? "border-slate-300 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-[#060d19] dark:shadow-[0_20px_60px_rgba(2,6,23,0.45)]"
        : preset === "dark-pro"
          ? "border-slate-300 bg-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-transparent dark:shadow-[0_20px_60px_rgba(2,6,23,0.5)]"
          : "border-slate-100 shadow-lg";
  const statCardClass =
    preset === "boutique"
      ? "rounded-[1.25rem] bg-[#f8f3ec]"
      : preset === "sunset-glow"
        ? "rounded-[1.25rem] bg-[#fff1e8]"
      : preset === "playful"
        ? "rounded-[1.25rem] bg-emerald-50"
        : preset === "mono-luxe"
          ? "rounded-[1rem] bg-slate-100 dark:bg-[#0b1120]"
        : preset === "dark-pro"
          ? "rounded-[1rem] bg-white/70 dark:bg-[#0b1120]"
          : "rounded-2xl bg-slate-50 dark:bg-white/5";
  const subtleTextClass = tone.eyebrow;
  const bodyTextClass = tone.body;

  return (
    <section className={cn("py-24 md:py-40 px-6 border-t relative overflow-hidden", sectionBackgroundClass)}>
      {/* Glow Effect Background */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] opacity-[0.03] blur-[120px] pointer-events-none rounded-full"
        style={{ backgroundColor: accentColor || primaryColor }}
      />

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16 md:mb-24">
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div
                className="h-1.5 w-10 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <span
                className={cn(
                  "text-[11px] font-[1000] uppercase tracking-[0.5em] italic",
                  tone.eyebrow,
                )}
              >
                {eyebrow || "Visual Experience"}
              </span>
            </div>
            <h2 className={cn("text-5xl md:text-8xl font-[1000] uppercase italic tracking-tighter leading-none", tone.title)}>
              {title ? (
                title
              ) : (
                <>
                  Inside <span style={{ color: primaryColor }}>The Hub.</span>
                </>
              )}
            </h2>
            {description ? (
              <p className={cn("max-w-2xl text-sm font-medium leading-7", tone.body)}>
                {description}
              </p>
            ) : null}
          </div>

          <div className="hidden md:flex items-center gap-4 pb-4">
            <div className="flex flex-col items-end">
              <span className={cn("text-[10px] font-black uppercase tracking-widest", subtleTextClass)}>
                Total Assets
              </span>
              <span className={cn("text-2xl font-[1000] italic leading-none", bodyTextClass)}>
                {safeImages.length}
              </span>
            </div>
            <div className="h-12 w-px bg-slate-200 dark:bg-white/10" />
            <div className={cn("h-12 w-12 flex items-center justify-center", statCardClass)}>
              <Camera size={20} style={{ color: primaryColor }} />
            </div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-4 md:gap-6 h-auto md:h-[800px]">
          {safeImages.map((url, i) => (
            <div
              key={i}
              className={cn(
                "relative overflow-hidden group border",
                frameRadiusClass,
                frameClass,
                // Logic Bento: Foto pertama besar, sisanya kecil
                i === 0 && "col-span-2 row-span-2 md:col-span-2 md:row-span-2",
                i === 1 && "col-span-2 md:col-span-2 md:row-span-1",
                i === 2 && "col-span-1 md:col-span-1 md:row-span-1",
                i === 3 && "col-span-1 md:col-span-1 md:row-span-1",
                i > 3 && "hidden md:block", // Sembunyikan foto lebih dari 4 di mobile biar ga kepanjangan
              )}
            >
              <Image
                src={url}
                alt={`Gallery ${i + 1}`}
                fill
                unoptimized
                sizes="(min-width: 768px) 25vw, 50vw"
                className="object-cover object-center transition-transform duration-1000 group-hover:scale-110"
              />

              {/* Overlay on Hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center scale-50 group-hover:scale-100 transition-transform duration-500">
                  <Maximize2 className="text-white" size={24} />
                </div>
              </div>

              {/* Tagging detail kecil */}
              <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                <p className={cn("text-white font-[1000] uppercase italic text-xs tracking-widest bg-black/20 backdrop-blur-md px-4 py-2 border border-white/10", tagRadiusClass)}>
                  Shot 0{i + 1}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
