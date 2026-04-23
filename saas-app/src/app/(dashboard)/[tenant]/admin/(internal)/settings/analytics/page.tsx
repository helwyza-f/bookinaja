import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download } from "lucide-react";
import Link from "next/link";

export default function SettingsAnalyticsPage() {
  return (
    <div className="space-y-6 pb-20">
      <Card className="rounded-[2rem] border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-5 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <Badge className="bg-blue-600 text-white border-none text-[9px] font-black uppercase tracking-widest">
              Laporan & Analitik
            </Badge>
            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter dark:text-white">
              Grafik pendapatan dan export data
            </h1>
            <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400 font-medium">
              Area ini dirancang untuk owner memantau performa bisnis, resource
              utilization, dan ekspor CSV/Excel tanpa perlu membuka panel
              operasional.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card className="rounded-[1.75rem] p-5 border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a]">
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Revenue Deep Dive</div>
          <div className="mt-2 text-lg font-black italic uppercase dark:text-white">Grafik harian</div>
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Pantau trend pendapatan per channel dan periode.
          </div>
        </Card>
        <Card className="rounded-[1.75rem] p-5 border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a]">
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Resource Performance</div>
          <div className="mt-2 text-lg font-black italic uppercase dark:text-white">Unit paling laku</div>
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Lihat resource yang paling sering dipakai pelanggan.
          </div>
        </Card>
        <Card className="rounded-[1.75rem] p-5 border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a]">
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Export</div>
          <Link
            href="/dashboard/revenue"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white"
          >
            <Download className="h-3.5 w-3.5" />
            Buka dashboard revenue
          </Link>
          <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Siap untuk CSV/Excel dan share ke tim internal.
          </div>
        </Card>
      </div>
    </div>
  );
}
