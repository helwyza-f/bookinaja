import Link from "next/link";
import { ShieldAlert, ArrowLeft, Zap } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-[#060816] text-white flex items-center justify-center px-4">
      <div className="relative max-w-2xl w-full overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-xl p-8 md:p-12 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.7)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.25),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_40%)]" />
        <div className="relative space-y-8">
          <div className="flex items-center gap-3 text-blue-300">
            <ShieldAlert className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.35em]">
              403 - Station Offline
            </span>
          </div>

          <div className="space-y-4">
            <div className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
              Akses Ditolak
            </div>
            <p className="max-w-xl text-sm md:text-base text-slate-300 font-medium leading-relaxed">
              Area ini hanya untuk owner. Staff tetap bisa menjalankan operasional
              harian, tapi konfigurasi bisnis, billing, CRM, dan pegawai tetap
              terkunci di command center executive.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] shadow-xl shadow-blue-600/20"
            >
              <Zap className="h-4 w-4" />
              Kembali ke Dashboard
            </Link>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em]"
            >
              <ArrowLeft className="h-4 w-4" />
              Putuskan Sesi
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
