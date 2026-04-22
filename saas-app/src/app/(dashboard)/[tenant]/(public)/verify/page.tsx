"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { setCookie } from "cookies-next";
import { Loader2, BadgeCheck } from "lucide-react";
import api from "@/lib/api";
import { syncTenantCookies } from "@/lib/tenant-session";

export default function VerifyExchangePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Memverifikasi akses booking...");

  useEffect(() => {
    const code = searchParams.get("code") || searchParams.get("token");
    const tenantSlug = params.tenant as string;

    if (!code) {
      router.replace("/verify/failed?reason=missing_code");
      return;
    }

    let cancelled = false;

    const exchange = async () => {
      try {
        setMessage("Menukar akses booking...");
        const res = await api.post("/public/bookings/exchange", { code });
        if (cancelled) return;

        if (!res.data?.customer_token || !res.data?.booking_id) {
          router.replace("/verify/failed?reason=invalid_response");
          return;
        }

        setCookie("customer_auth", res.data.customer_token, {
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        });
        if (res.data.customer?.tenant_id) {
          syncTenantCookies(tenantSlug, res.data.customer.tenant_id);
        } else {
          syncTenantCookies(tenantSlug);
        }

        router.replace(res.data.redirect_url || `/me/bookings/${res.data.booking_id}`);
      } catch (err: unknown) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        const reason =
          status === 401
            ? "invalid_or_expired"
            : status === 400
              ? "invalid_code"
              : "server_error";
        router.replace(`/verify/failed?reason=${reason}`);
      }
    };

    exchange();

    return () => {
      cancelled = true;
    };
  }, [params.tenant, router, searchParams]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_40%)]" />
        <div className="relative z-10 flex flex-col items-center text-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10">
            <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-300">
              Silent Login
            </p>
            <h1 className="text-3xl font-[1000] uppercase italic tracking-tighter">
              Verifikasi Akses
            </h1>
            <p className="text-sm text-slate-300">{message}</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
            <BadgeCheck className="h-4 w-4 text-emerald-400" />
            <span>Akses booking sedang ditukar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
