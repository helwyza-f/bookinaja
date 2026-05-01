"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setCookie } from "cookies-next";
import { Loader2, Phone, KeyRound, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const apiError = error as ApiError;
    return apiError.response?.data?.error || fallback;
  }

  return fallback;
}

export default function PhoneLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const nextPath = searchParams.get("next") || "/user/me";

  const handleRequestOtp = async () => {
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned || cleaned.length < 9) {
      toast.error("Nomor WhatsApp tidak valid");
      return;
    }

    setLoading(true);
    try {
      await api.post("/public/customer/login", { phone: cleaned });
      setPhone(cleaned);
      setStep("otp");
      toast.success("OTP berhasil dikirim");
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal mengirim OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length < 6) {
      toast.error("Kode OTP harus 6 digit");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/public/customer/verify", {
        phone,
        code: otp.trim(),
      });

      setCookie("customer_auth", res.data.token, {
        path: "/",
        sameSite: "lax",
      });
      toast.success(`Selamat datang, ${res.data.customer?.name || "Customer"}!`);
      router.push(nextPath);
    } catch (error) {
      toast.error(getErrorMessage(error, "Kode OTP salah atau sudah kedaluwarsa"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-background px-4 py-8 dark:bg-[#050505]">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[460px] w-[460px] rounded-full bg-sky-500/10 blur-[120px]" />

      <div className="z-10 mx-auto flex w-full max-w-md flex-col">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex items-center rounded-full border border-[#1d4ed81f] bg-[#1d4ed80f] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#0f1f4a] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
            Bookinaja Access
          </div>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f1f4a] to-[#1d4ed8] shadow-xl shadow-blue-500/20">
            <Phone className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#0f1f4a] dark:text-white">
            Masuk via WhatsApp
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Cara tercepat untuk customer masuk ke Bookinaja tanpa perlu ingat
            password.
          </p>
        </div>

        <Card className="w-full overflow-hidden rounded-[2rem] border border-[#1d4ed81a] bg-white/75 shadow-[0_32px_64px_-15px_rgba(15,23,42,0.10)] backdrop-blur-3xl dark:border-white/10 dark:bg-black/50 dark:shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)]">
          <CardContent className="p-6 md:p-8">
            {step === "phone" ? (
              <div className="space-y-5">
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Masukkan nomor WhatsApp yang terdaftar untuk menerima kode
                  verifikasi.
                </p>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="08xxxxxxxxxx"
                    className="h-14 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10 dark:bg-white/5"
                  />
                </div>
                <div className="rounded-2xl border border-[#1d4ed812] bg-[#eff6ff]/70 px-4 py-3 text-sm text-[#334155] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                  OTP cocok untuk login cepat dan lebih ramah untuk customer umum.
                </div>
                <Button
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] text-white shadow-xl shadow-blue-500/20 hover:from-[#1741b8] hover:to-[#2563eb]"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Kirim Kode OTP
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <button
                  onClick={() => setStep("phone")}
                  className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Ganti Nomor
                </button>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="6 digit"
                    className="h-14 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 font-mono text-lg tracking-[0.35em] shadow-none focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10 dark:bg-white/5"
                  />
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#0f1f4a] to-[#1d4ed8] text-white shadow-xl shadow-blue-500/20 hover:from-[#0b1838] hover:to-[#1741b8]"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Verifikasi OTP
                </Button>
              </div>
            )}

            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Punya email & password?{" "}
                <Link
                  href="/user/login"
                  className="font-semibold text-[#1d4ed8] hover:underline dark:text-sky-300"
                >
                  Masuk di sini
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <Link
            href="/user/login"
            className="flex items-center justify-center gap-2 text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              Kembali
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
