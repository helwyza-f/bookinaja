import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function ResourceDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 px-4 font-plus-jakarta animate-pulse">
      {/* --- HEADER SKELETON --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 dark:border-slate-800 pb-6 gap-4">
        <div className="space-y-3">
          {/* Tombol Kembali & Breadcrumb */}
          <Skeleton className="h-4 w-20 rounded-md" />
          <div className="flex items-center gap-3">
            {/* Title "Setup Unit" */}
            <Skeleton className="h-10 w-64 rounded-xl" />
            {/* Badge Unit Name */}
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Action Buttons */}
          <Skeleton className="h-12 w-32 rounded-xl" />
          <Skeleton className="h-12 w-40 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* --- LEFT: MARKETING SHOWCASE SKELETON (lg:col-span-5) --- */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-[3rem] border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800">
            {/* Toggle View/Edit */}
            <div className="p-1 bg-slate-50 dark:bg-slate-800 flex items-center gap-1">
              <Skeleton className="h-10 flex-1 rounded-full" />
              <Skeleton className="h-10 flex-1 rounded-full" />
            </div>

            <div className="p-8 space-y-8">
              {/* Cover Image Placeholder */}
              <Skeleton className="aspect-video w-full rounded-[2rem]" />

              {/* Title & Desc Placeholder */}
              <div className="space-y-4">
                <Skeleton className="h-10 w-3/4 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                </div>
              </div>

              {/* Gallery Grid Placeholder */}
              <div className="space-y-4">
                <Skeleton className="h-3 w-32 rounded-md" />
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="aspect-square rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* --- RIGHT: INVENTORY LISTING SKELETON (lg:col-span-7) --- */}
        <div className="lg:col-span-7 space-y-12">
          {/* Main Configurations Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <Skeleton className="h-1.5 w-10 rounded-full" />
              <Skeleton className="h-4 w-48 rounded-md" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <Card
                  key={i}
                  className="rounded-[2.5rem] border-none p-7 bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800"
                >
                  <div className="flex items-start justify-between mb-6">
                    {/* Icon Box */}
                    <Skeleton className="h-12 w-12 rounded-2xl" />
                    {/* Action Buttons */}
                    <div className="flex gap-1.5">
                      <Skeleton className="h-9 w-9 rounded-xl" />
                      <Skeleton className="h-9 w-9 rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-3/4 rounded-lg" />
                    <Skeleton className="h-5 w-1/2 rounded-lg" />
                    <Skeleton className="h-4 w-1/3 rounded-md" />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Add-ons Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <Skeleton className="h-1.5 w-10 rounded-full bg-slate-200" />
              <Skeleton className="h-4 w-40 rounded-md" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2].map((i) => (
                <Card
                  key={i}
                  className="rounded-[2.5rem] border-none p-6 bg-slate-50/50 dark:bg-slate-900/50"
                >
                  <div className="flex items-start justify-between mb-5">
                    <Skeleton className="h-11 w-11 rounded-xl" />
                    <Skeleton className="h-8 w-16 rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-1/2 rounded-lg" />
                    <Skeleton className="h-4 w-1/3 rounded-md" />
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
