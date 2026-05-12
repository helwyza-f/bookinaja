"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Loader2 } from "lucide-react";
import { setCookie } from "cookies-next";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { clearTenantSession } from "@/lib/tenant-session";

export default function UserVerifyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Menyiapkan akses customer...");
  const nextStep = searchParams.get("next");
  const accessKind = searchParams.get("kind") === "order" ? "order" : "booking";
  const paymentScope =
    searchParams.get("scope") === "settlement" ? "settlement" : "deposit";

  useEffect(() => {
    const code = searchParams.get("code") || searchParams.get("token");
    if (!code) {
      router.replace("/user/login");
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setMessage(
          accessKind === "order"
            ? "Menyiapkan akses order langsung..."
            : "Menyiapkan akses booking timed...",
        );
        const res = await api.post(
          accessKind === "order" ? "/public/sales-orders/exchange" : "/public/bookings/exchange",
          { code },
        );
        if (cancelled) return;

        const entityID = accessKind === "order" ? res.data?.order_id : res.data?.booking_id;
        if (!res.data?.customer_token || !entityID) {
          router.replace("/user/verify/failed?reason=invalid_response");
          return;
        }

        setCookie(
          "customer_auth",
          res.data.customer_token,
        );

        if (nextStep === "payment") {
          router.replace(
            accessKind === "order"
              ? `/user/me/orders/${entityID}/payment`
              : `/user/me/bookings/${entityID}/payment?scope=${paymentScope}`,
          );
          return;
        }

        const redirectUrl =
          res.data.redirect_url ||
          (accessKind === "order"
            ? `/user/me/orders/${entityID}`
            : `/user/me/bookings/${entityID}`);
        if (redirectUrl.startsWith("http://") || redirectUrl.startsWith("https://")) {
          window.location.replace(redirectUrl);
          return;
        }

        router.replace(redirectUrl);
      } catch (error: unknown) {
        if (cancelled) return;
        const status = (error as { response?: { status?: number } })?.response?.status;
        const reason =
          status === 401
            ? "invalid_or_expired"
            : status === 400
              ? "invalid_code"
              : "server_error";
        clearTenantSession({ keepTenantSlug: true });
        router.replace(`/user/verify/failed?reason=${reason}`);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [accessKind, nextStep, paymentScope, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <Card className="w-full max-w-md rounded-[2rem] border-white/10 bg-white/5 p-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <div className="text-[9px] font-black uppercase tracking-[0.35em] text-blue-300">
              {accessKind === "order" ? "Order Langsung" : "Booking Timed"}
            </div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              Verifikasi Akses
            </h1>
            <p className="text-sm leading-7 text-slate-300">{message}</p>
          </div>
          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
            <BadgeCheck className="h-4 w-4 text-emerald-400" />
            Customer portal sedang menyiapkan sesi kamu
          </div>
        </div>
      </Card>
    </div>
  );
}
