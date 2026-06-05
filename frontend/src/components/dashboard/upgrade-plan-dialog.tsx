"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import {
  BillingPlanBoard,
  type BillingPlanBoardSubscription,
} from "@/components/dashboard/billing-plan-board";

type UpgradePlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UpgradePlanDialog({
  open,
  onOpenChange,
}: UpgradePlanDialogProps) {
  const [sub, setSub] = useState<BillingPlanBoardSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;

    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/billing/subscription");
        if (mounted) {
          setSub(res.data || null);
          setLoaded(true);
        }
      } catch {
        toast.error("Gagal memuat paket billing.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [loaded, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-hidden rounded-none bg-white p-0 text-slate-950 shadow-2xl sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-[980px] sm:rounded-[1.5rem] dark:bg-slate-950 dark:text-white">
        <div className="flex h-full max-h-[100dvh] flex-col overflow-hidden sm:max-h-[calc(100vh-2rem)]">
          <div className="shrink-0 border-b border-slate-200 px-5 py-4 dark:border-white/10 sm:px-6 sm:py-5">
            <DialogTitle className="pr-10 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl dark:text-white">
              Upgrade paket
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Pilih paket saat booking, POS, dan laporan sudah siap dipakai lebih serius.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {loading && !loaded ? (
              <Skeleton className="h-[620px] rounded-[1.25rem] bg-slate-100 dark:bg-white/5" />
            ) : (
              <BillingPlanBoard sub={sub} compact />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
