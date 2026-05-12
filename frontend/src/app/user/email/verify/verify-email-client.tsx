"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MailCheck, XCircle } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type VerifyState = "loading" | "success" | "error";

export default function VerifyEmailClient({ token }: { token: string }) {
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("Memverifikasi email kamu...");

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setState("error");
        setMessage("Token verifikasi email tidak ditemukan.");
        return;
      }
      try {
        const res = await api.post("/public/customer/email/verify", { token });
        setState("success");
        setMessage(res.data?.message || "Email berhasil diverifikasi.");
      } catch (error) {
        const fallback = "Verifikasi email belum berhasil.";
        if (typeof error === "object" && error !== null && "response" in error) {
          const apiError = error as { response?: { data?: { error?: string } } };
          setMessage(apiError.response?.data?.error || fallback);
        } else {
          setMessage(fallback);
        }
        setState("error");
      }
    };
    void run();
  }, [token]);

  return (
    <main className="min-h-screen bg-background px-4 py-8 dark:bg-[#050505]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <Card className="w-full rounded-[2rem] border border-[#1d4ed81a] bg-white/80 shadow-[0_32px_64px_-15px_rgba(15,23,42,0.10)] backdrop-blur-3xl dark:border-white/10 dark:bg-black/50">
          <CardContent className="space-y-6 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#eff6ff] text-[#1d4ed8] dark:bg-white/5 dark:text-sky-300">
              {state === "loading" ? <Loader2 className="h-6 w-6 animate-spin" /> : null}
              {state === "success" ? <CheckCircle2 className="h-6 w-6" /> : null}
              {state === "error" ? <XCircle className="h-6 w-6" /> : null}
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center rounded-full border border-[#1d4ed81f] bg-[#1d4ed80f] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#0f1f4a] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
                <MailCheck className="mr-2 h-3.5 w-3.5" />
                Email Verification
              </div>
              <h1 className="text-2xl font-black tracking-tight text-[#0f1f4a] dark:text-slate-100">
                {state === "success" ? "Email Terverifikasi" : state === "error" ? "Verifikasi Gagal" : "Memverifikasi"}
              </h1>
              <p className="text-sm text-slate-500">{message}</p>
            </div>
            <Button asChild className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] text-white">
              <Link href="/user/login">Lanjut ke login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
