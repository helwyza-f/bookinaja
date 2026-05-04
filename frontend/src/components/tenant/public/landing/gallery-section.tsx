"use client";

import { cn } from "@/lib/utils";
import { Maximize2, Camera } from "lucide-react";

interface GallerySectionProps {
  images: string[];
  primaryColor: string;
  eyebrow?: string;
  title?: string;
  description?: string;
}

export function GallerySection({
  images,
  primaryColor,
  eyebrow,
  title,
  description,
}: GallerySectionProps) {
  const safeImages = (images || []).filter((url) => Boolean(url?.trim()));
  if (!safeImages.length) return null;

  return (
    <section className="py-24 md:py-40 bg-white dark:bg-[#050505] px-6 border-t border-slate-100 dark:border-white/5 relative overflow-hidden">
      {/* Glow Effect Background */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] opacity-[0.03] blur-[120px] pointer-events-none rounded-full"
        style={{ backgroundColor: primaryColor }}
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
              <span className="text-[11px] font-[1000] uppercase tracking-[0.5em] text-slate-400 italic">
                {eyebrow || "Visual Experience"}
              </span>
            </div>
            <h2 className="text-5xl md:text-8xl font-[1000] uppercase italic tracking-tighter leading-none text-slate-950 dark:text-white">
              {title ? (
                title
              ) : (
                <>
                  Inside <span style={{ color: primaryColor }}>The Hub.</span>
                </>
              )}
            </h2>
            {description ? (
              <p className="max-w-2xl text-sm font-medium leading-7 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            ) : null}
          </div>

          <div className="hidden md:flex items-center gap-4 pb-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Total Assets
              </span>
              <span className="text-2xl font-[1000] italic leading-none">
                {safeImages.length}
              </span>
            </div>
            <div className="h-12 w-px bg-slate-200 dark:bg-white/10" />
            <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center">
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
                "relative overflow-hidden rounded-[2rem] md:rounded-[3rem] group border border-slate-100 dark:border-white/10 shadow-lg",
                // Logic Bento: Foto pertama besar, sisanya kecil
                i === 0 && "col-span-2 row-span-2 md:col-span-2 md:row-span-2",
                i === 1 && "col-span-2 md:col-span-2 md:row-span-1",
                i === 2 && "col-span-1 md:col-span-1 md:row-span-1",
                i === 3 && "col-span-1 md:col-span-1 md:row-span-1",
                i > 3 && "hidden md:block", // Sembunyikan foto lebih dari 4 di mobile biar ga kepanjangan
              )}
            >
              <img
                src={url}
                alt={`Gallery ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />

              {/* Overlay on Hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center scale-50 group-hover:scale-100 transition-transform duration-500">
                  <Maximize2 className="text-white" size={24} />
                </div>
              </div>

              {/* Tagging detail kecil */}
              <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                <p className="text-white font-[1000] uppercase italic text-xs tracking-widest bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
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
