"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, Star, Layers } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function ResourceCard({
  res,
  primaryColor = "#3b82f6",
  getBestPrice,
}: any) {
  const bestRate = getBestPrice(res);

  return (
    <Link
      href={`/bookings/${res.id}`}
      className="group block w-full outline-none focus:ring-0"
    >
      <Card className="relative h-[340px] md:h-[420px] rounded-[2rem] md:rounded-[2.5rem] border-none bg-white dark:bg-[#0a0a0a] overflow-hidden transition-all duration-500 hover:-translate-y-2 group-active:scale-[0.97] shadow-lg hover:shadow-2xl">
        {/* --- Image Section (55% of card - Reduced for compactness) --- */}
        <div className="relative h-[55%] w-full overflow-hidden">
          {res.image_url ? (
            <img
              src={res.image_url}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              alt={res.name}
            />
          ) : (
            <div className="w-full h-full bg-slate-50 dark:bg-white/[0.02] flex items-center justify-center relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-5 blur-2xl"
                style={{ backgroundColor: primaryColor }}
              />
              <Zap className="h-10 w-10 opacity-10 dark:opacity-20 relative z-10" />
            </div>
          )}

          {/* Badge Category - Made smaller & more elegant */}
          <div className="absolute top-4 left-4 z-20">
            <Badge className="bg-black/70 backdrop-blur-xl text-white border border-white/10 text-[8px] font-black uppercase italic tracking-widest px-3 py-1 rounded-lg">
              {res.category}
            </Badge>
          </div>

          {/* Floating Action Hint (Visible on Hover/Desktop) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 pointer-events-none">
            <div className="bg-white/90 dark:bg-black/90 p-3 rounded-full shadow-2xl">
              <ArrowRight
                size={20}
                style={{ color: primaryColor }}
                strokeWidth={3}
              />
            </div>
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-70" />
        </div>

        {/* --- Info Section (Compact & Balanced) --- */}
        <div className="p-5 md:p-6 flex flex-col justify-between h-[45%] relative bg-white dark:bg-transparent">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg md:text-xl font-[1000] pr-2 uppercase italic tracking-tighter leading-none text-slate-900 dark:text-white truncate">
                {res.name}
              </h3>
              <div className="flex items-center gap-1 shrink-0">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-[10px] font-bold text-slate-400">
                  4.9
                </span>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 line-clamp-2 italic uppercase tracking-tight opacity-70 leading-relaxed">
              {res.description || "High-performance unit ready for action."}
            </p>
          </div>

          <div className="flex items-end justify-between border-t border-slate-50 dark:border-white/5 pt-4">
            <div className="space-y-1">
              <p className="text-[8px] font-[1000] uppercase tracking-[0.2em] text-slate-400 italic">
                BEST RATE
              </p>
              {bestRate ? (
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-xl font-[1000] italic leading-none tracking-tighter"
                    style={{ color: primaryColor }}
                  >
                    Rp{bestRate.value.toLocaleString()}
                  </span>
                  <span className="text-[9px] opacity-30 font-black uppercase italic">
                    /{bestRate.unit}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] font-black opacity-30 italic uppercase">
                  N/A
                </span>
              )}
            </div>

            {/* Compact Action Button */}
            <div
              className="h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center text-white shadow-xl transition-all duration-500 group-hover:scale-110 active:scale-90"
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 8px 20px -6px ${primaryColor}88`,
              }}
            >
              <Zap size={18} fill="currentColor" strokeWidth={0} />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
