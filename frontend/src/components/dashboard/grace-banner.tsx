"use client";

import { Lock, AlertTriangle, ShieldAlert } from "lucide-react";
import { useAdminSession } from "@/components/dashboard/admin-session-context";

/**
 * Banner peringatan bertingkat saat langganan tenant non-aktif. Eskalasi
 * berbasis WAKTU (bukan jumlah transaksi), selaras access.GracePhase backend:
 *
 *   Fase 1 (soft, hari 0..friction-1): katalog beku. Transaksi & fitur penuh
 *     tetap jalan; hanya "＋ Buat" dikunci. Nada informatif (amber).
 *   Fase 2 (friksi, hari friction..lock-1): kenyamanan (export, nota WA,
 *     analitik) dicabut + hitung mundur menuju lock. Nada mendesak (orange).
 *   Fase 3 (lock, hari lock+): transaksi/booking/order baru dikunci. Nada
 *     kritis (merah) — "upgrade untuk lanjut operasi".
 */
export function GraceBanner({ onUpgrade }: { onUpgrade?: () => void }) {
  const { trialInfo } = useAdminSession();
  if (!trialInfo?.graceActive) return null;

  const phase = trialInfo.gracePhase ?? 1;
  const lockDay = trialInfo.lockDay ?? 15;
  const days = trialInfo.graceDays ?? 0;
  const daysToLock = Math.max(0, lockDay - days);

  const variant =
    phase >= 3
      ? {
          box: "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10",
          icon: <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />,
          title: "text-red-900 dark:text-red-200",
          body: "text-red-800/90 dark:text-red-100/80",
          btn: "bg-red-600 hover:bg-red-700",
          heading: "Operasi dikunci",
          message:
            "Transaksi, booking, dan order baru dikunci karena langganan lama tidak aktif. Upgrade untuk melanjutkan operasi.",
          cta: "Upgrade sekarang",
        }
      : phase >= 2
        ? {
            box: "border-orange-300 bg-orange-50 dark:border-orange-500/40 dark:bg-orange-500/10",
            icon: <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400" />,
            title: "text-orange-900 dark:text-orange-200",
            body: "text-orange-800/90 dark:text-orange-100/80",
            btn: "bg-orange-600 hover:bg-orange-700",
            heading: "Fitur mulai dibatasi",
            message:
              daysToLock > 0
                ? `Export laporan, nota WhatsApp, dan analitik dinonaktifkan. Transaksi masih jalan ${daysToLock} hari lagi sebelum operasi dikunci — upgrade untuk memulihkan semuanya.`
                : "Export laporan, nota WhatsApp, dan analitik dinonaktifkan. Operasi akan segera dikunci — upgrade untuk memulihkan semuanya.",
            cta: "Upgrade",
          }
        : {
            box: "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10",
            icon: <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />,
            title: "text-amber-900 dark:text-amber-200",
            body: "text-amber-800/90 dark:text-amber-100/80",
            btn: "bg-amber-600 hover:bg-amber-700",
            heading: "Langganan berakhir",
            message:
              "Transaksi & booking tetap jalan, tapi menambah unit, promo, atau item baru dikunci sampai upgrade.",
            cta: "Upgrade",
          };

  return (
    <div className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${variant.box}`}>
      {variant.icon}
      <div className="flex-1 text-sm">
        <p className={`font-semibold ${variant.title}`}>{variant.heading}</p>
        <p className={`mt-0.5 ${variant.body}`}>{variant.message}</p>
      </div>
      {onUpgrade ? (
        <button
          type="button"
          onClick={onUpgrade}
          className={`shrink-0 self-center rounded-lg px-3 py-1.5 text-sm font-semibold text-white ${variant.btn}`}
        >
          {variant.cta}
        </button>
      ) : null}
    </div>
  );
}
