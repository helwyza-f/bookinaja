"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MailCheck, XCircle } from "lucide-react";
import { BookinajaAuthLogo } from "@/components/auth/bookinaja-auth-logo";
import { Button } from "@/components/ui/button";
import { verifyAccountEmail } from "@/lib/auth-client";

type VerifyState = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f6f8fb]" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("Memverifikasi email akun kamu...");

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setState("error");
        setMessage("Token verifikasi email tidak ditemukan.");
        return;
      }

      try {
        const res = await verifyAccountEmail(token);
        setState("success");
        setMessage(res.message || "Email akun berhasil diverifikasi.");
      } catch (error) {
        const fallback = "Verifikasi email belum berhasil.";
        const apiMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setState("error");
        setMessage(apiMessage || fallback);
      }
    };

    void run();
  }, [token]);

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-5 py-8 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <BookinajaAuthLogo priority className="mb-6" />

          <div className="mb-5 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#174ea6]">
            <MailCheck className="mr-2 h-3.5 w-3.5" />
            Aktivasi akun
          </div>

          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-[#174ea6]">
            {state === "loading" ? <Loader2 className="h-6 w-6 animate-spin" /> : null}
            {state === "success" ? <CheckCircle2 className="h-6 w-6" /> : null}
            {state === "error" ? <XCircle className="h-6 w-6 text-rose-500" /> : null}
          </div>

          <h1 className="text-2xl font-semibold tracking-normal">
            {state === "success" ? "Email sudah aktif" : state === "error" ? "Verifikasi gagal" : "Memverifikasi email"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">{message}</p>

          <div className="mt-6 space-y-3">
            <Button asChild className="h-11 w-full">
              <Link href={state === "success" ? "/login?verified=1" : "/signup/verify"}>
                {state === "success" ? "Lanjut ke login" : "Buka halaman verifikasi"}
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
