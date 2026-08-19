"use client";

import { Lock } from "lucide-react";
import { useAdminSession } from "@/components/dashboard/admin-session-context";

/**
 * Banner peringatan saat langganan tenant tidak aktif (trial habis / belum
 * bayar). Tenant masih bisa transaksi & merampungkan booking, tapi tak bisa
 * membuat item baru (unit/resource/promo/item F&B) — selaras middleware backend
 * RequireActiveSubscription (402 subscription_inactive). Tampil hanya saat
 * grace aktif.
 */
export function GraceBanner({ onUpgrade }: { onUpgrade?: () => void }) {
  const { trialInfo } = useAdminSession();
  if (!trialInfo?.graceActive) return null;
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/40 dark:bg-amber-500/10">
      <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-amber-900 dark:text-amber-200">
          Langganan berakhir
        </p>
        <p className="mt-0.5 text-amber-800/90 dark:text-amber-100/80">
          Transaksi & booking tetap jalan, tapi menambah unit, promo, atau item
          baru dikunci sampai upgrade.
        </p>
      </div>
      {onUpgrade ? (
        <button
          type="button"
          onClick={onUpgrade}
          className="shrink-0 self-center rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
        >
          Upgrade
        </button>
      ) : null}
    </div>
  );
}
