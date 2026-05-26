"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";
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
  const railImages = safeImages.length > 1 ? [...safeImages, ...safeImages] : safeImages;
  const tone = getLandingPresetTone(preset);
  const frameRadiusClass =
    radiusStyle === "square" ? "rounded-[1.1rem] md:rounded-[1.5rem]" : radiusStyle === "soft" ? "rounded-[1.6rem] md:rounded-[2.1rem]" : "rounded-[1.5rem] md:rounded-[2rem]";
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
    <section className={cn("relative overflow-hidden border-t px-0 py-20 md:py-32", sectionBackgroundClass)}>
      {/* Glow Effect Background */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] opacity-[0.03] blur-[120px] pointer-events-none rounded-full"
        style={{ backgroundColor: accentColor || primaryColor }}
      />

      <div className="relative z-10">
        {/* Header Section */}
        <div className="container mx-auto mb-10 flex max-w-7xl flex-col items-start justify-between gap-6 px-6 md:mb-14 md:flex-row md:items-end">
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
            <h2 className={cn("text-4xl font-[1000] uppercase italic leading-none tracking-tighter md:text-7xl", tone.title)}>
              {title ? (
                title
              ) : (
                <>
                  Inside <span style={{ color: primaryColor }}>The Hub.</span>
                </>
              )}
            </h2>
            {description ? (
              <p className={cn("max-w-2xl text-sm font-medium leading-7 md:text-base", tone.body)}>
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

        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-white to-transparent dark:from-[#050505] md:w-28" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-white to-transparent dark:from-[#050505] md:w-28" />
          <div className="scrollbar-hide overflow-x-auto overscroll-x-contain pb-3">
            <div
              className={cn(
                "flex w-max gap-4 px-6 md:gap-6",
                safeImages.length > 1 && "animate-[bookinaja-gallery-rail_42s_linear_infinite] hover:[animation-play-state:paused]",
              )}
            >
              {railImages.map((url, i) => {
                const sourceIndex = i % safeImages.length;
                return (
                  <div
                    key={`${url}-${i}`}
                    className={cn(
                      "group relative h-[300px] w-[78vw] shrink-0 overflow-hidden border sm:h-[360px] sm:w-[460px] lg:h-[420px] lg:w-[620px]",
                      frameRadiusClass,
                      frameClass,
                    )}
                  >
                    <Image
                      src={url}
                      alt={`Gallery ${sourceIndex + 1}`}
                      fill
                      sizes="(min-width: 1024px) 620px, (min-width: 640px) 460px, 78vw"
                      className="object-cover object-center transition-transform duration-1000 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent" />
                    <div className="absolute bottom-5 left-5 md:bottom-7 md:left-7">
                      <p className={cn("border border-white/15 bg-black/24 px-4 py-2 text-xs font-[1000] uppercase italic tracking-widest text-white backdrop-blur-md", tagRadiusClass)}>
                        Shot {String(sourceIndex + 1).padStart(2, "0")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes bookinaja-gallery-rail {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
