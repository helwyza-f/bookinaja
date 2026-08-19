"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Lock, ShieldAlert, X } from "lucide-react";
import { useAdminSession } from "@/components/dashboard/admin-session-context";

/**
 * Interstitial paywall yang muncul sekali TIAP BUKA APP saat langganan sudah
 * masuk fase friksi (2) atau lock (3). Bisa ditutup (fase 2) agar tenant tetap
 * bekerja — tekanan psikologis, bukan penghalang. Fase 3 juga bisa ditutup
 * (transaksi baru sudah dikunci di backend; interstitial hanya penjelas).
 *
 * Dismissal disimpan per-sesi tab (sessionStorage) → muncul lagi saat app
 * dibuka ulang, sesuai desain "interstitial tiap buka app".
 */
const DISMISS_KEY = "bookinaja:grace_interstitial_dismissed";

export function GraceInterstitial({ onUpgrade }: { onUpgrade?: () => void }) {
  const { trialInfo } = useAdminSession();
  const phase = trialInfo?.gracePhase ?? 0;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Muncul sejak fase Soft (≥1): tekanan lembut tapi konsisten tiap buka app.
    if (phase < 1) return;
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(DISMISS_KEY) === String(phase)) return;
    setOpen(true);
  }, [phase]);

  if (!open || phase < 1) return null;

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DISMISS_KEY, String(phase));
    }
    setOpen(false);
  };

  const locked = phase >= 3;
  const soft = phase < 2; // fase 1: fitur masih penuh, hanya "buat baru" terkunci
  const lockDay = trialInfo?.lockDay ?? 15;
  const days = trialInfo?.graceDays ?? 0;
  const daysToLock = Math.max(0, lockDay - days);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-6 shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup"
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            locked
              ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
              : soft
                ? "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                : "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
          }`}
        >
          {locked ? (
            <ShieldAlert className="h-6 w-6" />
          ) : soft ? (
            <Lock className="h-6 w-6" />
          ) : (
            <AlertTriangle className="h-6 w-6" />
          )}
        </div>

        <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
          {locked ? "Operasi terkunci" : soft ? "Langganan berakhir" : "Langganan perlu diperpanjang"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {locked
            ? "Karena langganan sudah lama tidak aktif, transaksi, booking, dan order baru kini dikunci. Pembayaran memulihkan operasi seketika."
            : soft
              ? "Transaksi & booking masih berjalan penuh, tapi menambah unit, promo, atau item baru terkunci. Perpanjang untuk membukanya kembali."
              : daysToLock > 0
                ? `Kenyamanan seperti export laporan, kirim nota WhatsApp, dan analitik sudah dinonaktifkan. Transaksi masih berjalan ${daysToLock} hari lagi sebelum operasi dikunci.`
                : "Kenyamanan seperti export laporan, kirim nota WhatsApp, dan analitik sudah dinonaktifkan. Operasi akan segera dikunci."}
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 rounded-xl border border-[var(--admin-line)] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Nanti dulu
          </button>
          <button
            type="button"
            onClick={() => {
              dismiss();
              onUpgrade?.();
            }}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
              locked ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            {locked ? "Bayar sekarang" : "Upgrade"}
          </button>
        </div>
      </div>
    </div>
  );
}
