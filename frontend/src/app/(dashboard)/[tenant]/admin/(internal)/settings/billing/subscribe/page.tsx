"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BillingPlanBoard,
  type BillingPlanBoardSubscription,
} from "@/components/dashboard/billing-plan-board";

type SubscriptionInfo = BillingPlanBoardSubscription;

export default function SettingsBillingSubscribePage() {
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get("/billing/subscription")
      .then((res) => {
        if (!mounted) return;
        setSub(res.data || null);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Skeleton className="h-[760px] rounded-[1.75rem] bg-slate-100 dark:bg-white/5" />
    );
  }

  return (
    <div className="pb-20">
      <BillingPlanBoard
        sub={sub}
        showHeader
        backHref="/admin/settings/billing"
      />
    </div>
  );
}
