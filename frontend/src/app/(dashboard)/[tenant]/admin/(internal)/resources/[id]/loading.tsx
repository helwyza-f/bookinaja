import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function ResourceDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 pb-24 px-3 md:px-4 font-plus-jakarta animate-pulse mt-6 md:mt-10">
      {/* --- HEADER SKELETON --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-slate-100 dark:border-white/5 pb-6 md:pb-10 gap-4 md:gap-6">
        <div className="space-y-4">
          {/* Breadcrumb back link */}
          <Skeleton className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="flex items-center gap-4">
            {/* Title "Setup Unit" */}
            <Skeleton className="h-10 md:h-12 w-64 md:w-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            {/* Badge Unit Name */}
            <Skeleton className="h-8 w-32 bg-blue-100 dark:bg-blue-900/30 rounded-lg hidden md:block" />
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Action Buttons */}
          <Skeleton className="h-12 flex-1 md:w-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <Skeleton className="h-12 flex-1 md:w-40 bg-blue-600/20 dark:bg-blue-600/20 rounded-2xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-10">
        {/* --- LEFT: MARKETING SHOWCASE SKELETON (lg:col-span-5) --- */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-[2rem] md:rounded-[3rem] border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden ring-1 ring-slate-100 dark:ring-white/5">
            {/* Tabs Toggle View/Edit */}
            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
              <Skeleton className="h-10 flex-1 rounded-2xl bg-white dark:bg-slate-800 shadow-sm" />
              <Skeleton className="h-11 flex-1 rounded-2xl bg-transparent" />
            </div>

            <div className="p-5 md:p-10 space-y-6 md:space-y-10">
              {/* Cover Image Placeholder */}
              <Skeleton className="aspect-video w-full rounded-[2.5rem] bg-slate-100 dark:bg-slate-800" />

              {/* Title & Category Placeholder */}
              <div className="space-y-4">
                <Skeleton className="h-10 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <Skeleton className="h-6 w-1/4 bg-slate-100 dark:bg-slate-800 rounded-lg" />
              </div>

              {/* Description Placeholder */}
              <div className="space-y-3">
                <Skeleton className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-md" />
                <Skeleton className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-md" />
                <Skeleton className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800 rounded-md" />
              </div>

              {/* Gallery Grid Placeholder */}
              <div className="space-y-4 pt-4">
                <Skeleton className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton
                      key={i}
                      className="aspect-square rounded-2xl bg-slate-100 dark:bg-slate-800"
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* --- RIGHT: INVENTORY LISTING SKELETON (lg:col-span-7) --- */}
        <div className="lg:col-span-7 space-y-8 md:space-y-12">
          {/* Main Configurations Section */}
          <div className="space-y-8">
            <div className="flex items-center gap-3 px-2">
              <Skeleton className="h-2 w-12 rounded-full bg-blue-500/30" />
              <Skeleton className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card
                  key={i}
                  className="rounded-[2rem] md:rounded-[2.5rem] border-none p-4 md:p-8 bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-white/5 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-8">
                    {/* Icon Box */}
                    <Skeleton className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-slate-800" />
                      <Skeleton className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-slate-800" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-7 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <Skeleton className="h-5 w-1/2 bg-blue-50 dark:bg-blue-900/20 rounded-lg" />
                    <Skeleton className="h-4 w-1/3 bg-slate-100 dark:bg-slate-800 rounded-md" />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Add-ons Section */}
          <div className="space-y-8">
            <div className="flex items-center gap-3 px-2">
              <Skeleton className="h-2 w-12 rounded-full bg-orange-500/30" />
              <Skeleton className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-6">
              {[1, 2].map((i) => (
                <Card
                  key={i}
                  className="rounded-[2rem] md:rounded-[2.5rem] border-none p-4 md:p-7 bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5"
                >
                  <div className="flex items-center justify-between mb-6">
                    <Skeleton className="h-12 w-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    <Skeleton className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <Skeleton className="h-4 w-1/3 bg-slate-100 dark:bg-slate-800 rounded-md" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
