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
      <Card className="relative h-[340px] md:h-[400px] rounded-[2rem] md:rounded-[2.5rem] border border-white/20 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 group-active:scale-[0.97] shadow-xl hover:shadow-2xl">
        {/* --- Image Section --- */}
        <div className="relative h-[55%] w-full overflow-hidden p-3 pb-0">
          <div className="relative w-full h-full rounded-[1.5rem] md:rounded-[2rem] overflow-hidden">
            {res.image_url ? (
              <img
                src={res.image_url}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                alt={res.name}
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
              <Badge className="bg-white/80 dark:bg-black/60 backdrop-blur-md text-slate-900 dark:text-white border border-white/30 dark:border-white/10 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-sm">
                {res.category || "Fasilitas"}
              </Badge>
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
          </div>
        </div>

        {/* --- Info Section --- */}
        <div className="p-5 md:p-6 flex flex-col justify-between h-[45%] relative">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tight leading-tight text-slate-900 dark:text-white line-clamp-2">
                {res.name}
              </h3>
              <div className="flex items-center gap-1 shrink-0 bg-white/50 dark:bg-white/10 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20 dark:border-white/5">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  4.9
                </span>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {res.description || "Fasilitas premium yang siap mendukung aktivitas terbaikmu."}
            </p>
          </div>

          <div className="flex items-end justify-between border-t border-slate-200/50 dark:border-white/10 pt-4 mt-2">
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Mulai Dari
              </p>
              {bestRate ? (
                <div className="flex items-baseline gap-1">
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
                <span className="text-xs font-bold text-slate-400">
                  Harga belum tersedia
                </span>
              )}
            </div>

            {/* Action Button */}
            <div
              className="h-10 w-10 md:h-12 md:w-12 rounded-[1rem] flex items-center justify-center text-white shadow-xl transition-all duration-500 group-hover:-translate-y-1 group-hover:scale-105 active:scale-95"
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 10px 25px -5px ${primaryColor}66`,
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
