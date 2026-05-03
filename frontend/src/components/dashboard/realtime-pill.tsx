"use client";

import { Radio, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RealtimeStatus } from "@/lib/realtime/use-realtime";

export function RealtimePill({
  connected,
  status,
  className,
}: {
  connected: boolean;
  status?: RealtimeStatus;
  className?: string;
}) {
  const isReconnecting = status === "reconnecting" || status === "connecting";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
        connected
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
          : isReconnecting
            ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
        className,
      )}
    >
      {connected ? (
        <Radio className="h-3.5 w-3.5" />
      ) : (
        <WifiOff className="h-3.5 w-3.5" />
      )}
      {connected
        ? "Realtime aktif"
        : isReconnecting
          ? "Realtime menyambung ulang"
          : "Realtime belum aktif"}
    </div>
  );
}
