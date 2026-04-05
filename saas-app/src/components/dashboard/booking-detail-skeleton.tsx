"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function BookingDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-10 font-plus-jakarta animate-pulse">
      {/* HEADER SECTION SKELETON */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32 bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-64 md:w-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            <Skeleton className="h-8 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-14 w-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <Skeleton className="h-14 w-14 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* LEFT COLUMN SKELETON */}
        <div className="lg:col-span-7 space-y-10">
          {/* INFO CARD */}
          <Card className="rounded-[3rem] border-none p-10 bg-white dark:bg-slate-900 space-y-10 ring-1 ring-slate-100 dark:ring-white/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-3">
                  <Skeleton className="h-3 w-24 bg-slate-100 dark:bg-slate-800" />
                  <Skeleton className="h-10 w-48 bg-slate-100 dark:bg-slate-800" />
                  <Skeleton className="h-4 w-32 bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="pt-8 border-t border-slate-50 dark:border-white/5 space-y-4">
                  <Skeleton className="h-3 w-20 bg-slate-100 dark:bg-slate-800" />
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32 bg-slate-100 dark:bg-slate-800" />
                      <Skeleton className="h-3 w-24 bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-8">
                <div className="space-y-3">
                  <Skeleton className="h-3 w-24 bg-slate-100 dark:bg-slate-800" />
                  <Skeleton className="h-8 w-56 bg-slate-100 dark:bg-slate-800" />
                  <Skeleton className="h-10 w-40 bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="pt-8 border-t border-slate-50 dark:border-white/5">
                  <Skeleton className="h-20 w-full rounded-3xl bg-slate-50 dark:bg-slate-800/50" />
                </div>
              </div>
            </div>
          </Card>

          {/* RENTAL ITEMS SKELETON */}
          <Card className="rounded-[3rem] border-none p-10 bg-white dark:bg-slate-900 space-y-8 ring-1 ring-slate-100 dark:ring-white/5">
            <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-6">
              <Skeleton className="h-6 w-48 bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-4 w-20 bg-slate-100 dark:bg-slate-800" />
            </div>
            {[1, 2].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-5">
                  <Skeleton className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-slate-50 dark:bg-slate-800" />
                    <Skeleton className="h-3 w-20 bg-slate-50 dark:bg-slate-800" />
                  </div>
                </div>
                <Skeleton className="h-6 w-24 bg-slate-50 dark:bg-slate-800" />
              </div>
            ))}
          </Card>
        </div>

        {/* RIGHT COLUMN SKELETON */}
        <div className="lg:col-span-5 space-y-10">
          {/* F&B CARD */}
          <Card className="rounded-[3rem] border-none p-10 bg-white dark:bg-slate-900 min-h-[400px] ring-1 ring-slate-100 dark:ring-white/5">
            <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-6 mb-8">
              <Skeleton className="h-6 w-32 bg-slate-50 dark:bg-slate-800" />
              <Skeleton className="h-10 w-24 rounded-xl bg-slate-50 dark:bg-slate-800" />
            </div>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28 bg-slate-50 dark:bg-slate-800" />
                    <Skeleton className="h-3 w-20 bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <Skeleton className="h-5 w-24 bg-slate-50 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          </Card>

          {/* TOTAL PAYMENT SKELETON */}
          <Card className="rounded-[3.5rem] border-none bg-slate-950 p-12 space-y-10 shadow-xl">
            <div className="space-y-6">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-32 bg-slate-800" />
                <Skeleton className="h-4 w-24 bg-slate-800" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-32 bg-slate-800" />
                <Skeleton className="h-4 w-24 bg-slate-800" />
              </div>
              <Separator className="bg-white/5" />
              <div className="space-y-4">
                <Skeleton className="h-4 w-40 bg-slate-800" />
                <Skeleton className="h-20 w-full bg-slate-800 rounded-2xl" />
              </div>
            </div>
            <Skeleton className="h-20 w-full rounded-[2rem] bg-blue-900/50" />
          </Card>
        </div>
      </div>
    </div>
  );
}
