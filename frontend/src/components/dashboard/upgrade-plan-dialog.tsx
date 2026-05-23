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
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.5rem] bg-white p-0 text-slate-950 shadow-2xl sm:max-w-[980px] dark:bg-slate-950 dark:text-white">
        <div className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-5 dark:border-white/10 sm:px-6">
            <DialogTitle className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Upgrade your plan
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Unlock more features and grow your workspace faster.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {loading && !loaded ? (
              <Skeleton className="h-[720px] rounded-[1.75rem] bg-slate-100 dark:bg-white/5" />
            ) : (
              <BillingPlanBoard sub={sub} compact />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
