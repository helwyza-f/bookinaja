"use client";

import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getCentralAdminAuthUrl } from "@/lib/tenant";
import { getTenantMismatchMessage } from "@/lib/tenant-session";

export default function TenantLoginPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenant as string;

  useEffect(() => {
    if (searchParams.get("reason") !== "tenant-mismatch") return;
    const message = getTenantMismatchMessage("admin");
    toast.info(message.title, {
      description: message.description,
      duration: 5000,
    });
  }, [searchParams]);

  useEffect(() => {
    const target = getCentralAdminAuthUrl({
      tenantSlug,
      next: searchParams.get("next") || "/admin/dashboard",
      reason: searchParams.get("reason"),
      plan: searchParams.get("plan"),
      interval: searchParams.get("interval"),
      welcome: searchParams.get("welcome"),
    });
    const current = typeof window !== "undefined" ? window.location.href : "";
    if (current !== target) {
      window.location.replace(target);
    }
  }, [searchParams, tenantSlug]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-[#050505]">
      <div className="rounded-full border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
        Mengalihkan ke auth pusat {tenantSlug}...
      </div>
    </div>
  );
}
