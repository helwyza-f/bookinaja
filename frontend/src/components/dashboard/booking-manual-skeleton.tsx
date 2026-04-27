"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function ManualBookingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] p-3 lg:p-6 space-y-5 md:space-y-6 -mt-6">
      <div className="max-w-[1600px] mx-auto space-y-5 md:space-y-6">
        {/* HEADER SKELETON */}
        <header className="flex items-center gap-4 border-b dark:border-white/5 pb-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-3 w-32 rounded-lg" />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
          {/* LEFT COLUMN SKELETON */}
          <div className="lg:col-span-8 space-y-5">
            {/* 01. Resource Picker Skeleton */}
            <Card className="rounded-[1.5rem] md:rounded-[2rem] border-none bg-white dark:bg-[#0c0c0c] p-4 md:p-6 shadow-sm ring-1 ring-black/5 dark:ring-white/5">
              <div className="flex items-center gap-3 mb-5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-2xl" />
                ))}
              </div>
              <div className="mt-6 pt-6 border-t dark:border-white/5 space-y-3">
                <Skeleton className="h-3 w-20" />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-32 rounded-xl" />
                  ))}
                </div>
              </div>
            </Card>

            {/* 02. Schedule Skeleton */}
            <Card className="rounded-[1.5rem] md:rounded-[2rem] border-none bg-white dark:bg-[#0c0c0c] p-4 md:p-8 shadow-sm ring-1 ring-black/5 dark:ring-white/5">
              <div className="flex items-center justify-between mb-6 md:mb-10">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-5 w-56" />
                </div>
                <Skeleton className="h-12 w-48 rounded-xl" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-10">
                <div className="lg:col-span-4 flex flex-col items-center border-r dark:border-white/5 pr-4 md:pr-10 space-y-5 md:space-y-6">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-16 md:h-20 w-40 rounded-2xl" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="lg:col-span-8">
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                      <Skeleton key={i} className="h-12 rounded-xl" />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN SKELETON */}
          <div className="lg:col-span-4">
            <Card className="rounded-[1.75rem] md:rounded-[2.5rem] border-none bg-slate-900 p-5 md:p-8 space-y-6 md:space-y-8">
              <div className="space-y-4">
                <Skeleton className="h-4 w-32 bg-white/10" />
                <Skeleton className="h-14 w-full rounded-xl bg-white/10" />
                <Skeleton className="h-14 w-full rounded-xl bg-white/10" />
              </div>
              <div className="space-y-4 pt-4 border-t border-white/5">
                <Skeleton className="h-4 w-24 bg-white/10" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-12 rounded-xl bg-white/10" />
                  <Skeleton className="h-12 rounded-xl bg-white/10" />
                </div>
              </div>
              <Skeleton className="h-40 w-full rounded-3xl bg-white/10" />
              <Skeleton className="h-20 w-full rounded-[2rem] bg-white/20" />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
