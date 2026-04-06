"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function ResourceCard({
  res,
  activeTheme,
  getBestPrice,
  tenantSlug,
}: any) {
  const bestRate = getBestPrice(res);

  return (
    <Link
      href={`/bookings/${res.id}`}
      className="group block w-[280px] md:w-full shrink-0"
    >
      <Card className="relative h-[380px] md:h-[450px] rounded-[2.5rem] border-none bg-slate-100 dark:bg-[#111] overflow-hidden transition-all duration-500 hover:-translate-y-2 group-active:scale-95 shadow-lg">
        {/* --- Image Section (60% of card) --- */}
        <div className="relative h-[65%] w-full overflow-hidden">
          {res.image_url ? (
            <img
              src={res.image_url}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              alt={res.name}
            />
          ) : (
            <div className="w-full h-full bg-slate-200 dark:bg-white/5 flex items-center justify-center">
              <Zap className="h-12 w-12 opacity-10" />
            </div>
          )}

          {/* Badge Category - Compact Style */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <Badge className="bg-black/60 backdrop-blur-md text-white border-none text-[8px] uppercase tracking-widest px-3 py-1 rounded-full">
              {res.category}
            </Badge>
          </div>

          {/* Rating Overlay (Fake/Static for aesthetic) */}
          <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-white/90 dark:bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[10px] font-bold">4.9</span>
          </div>

          {/* Gradient for Text Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
        </div>

        {/* --- Info Section (Compact) --- */}
        <div className="p-5 flex flex-col justify-between h-[35%]">
          <div className="space-y-1">
            <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter leading-none truncate pr-4">
              {res.name}
            </h3>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1 italic uppercase tracking-wider">
              {res.description || "Premium Facility"}
            </p>
          </div>

          <div className="flex items-end justify-between border-t border-slate-200 dark:border-white/5 pt-3">
            <div className="space-y-0.5">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40">
                Best Rate
              </p>
              {bestRate ? (
                <div className="flex items-baseline gap-1">
                  <span
                    className={cn(
                      "text-lg font-[900] italic leading-none",
                      activeTheme.primary,
                    )}
                  >
                    Rp{bestRate.value.toLocaleString()}
                  </span>
                  <span className="text-[9px] opacity-30 font-bold">
                    /{bestRate.unit}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] font-black opacity-30 italic">
                  COMING SOON
                </span>
              )}
            </div>

            {/* Action Button Small */}
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-12",
                activeTheme.bgPrimary,
              )}
            >
              <ArrowRight size={18} strokeWidth={3} />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
