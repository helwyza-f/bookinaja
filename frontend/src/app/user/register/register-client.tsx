"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { setCookie } from "cookies-next";
import { ArrowLeft, ArrowRight, KeyRound, Loader2, Mail, Phone, User } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Step = "form" | "otp";

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

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const nextPath = searchParams.get("next") || "/user/me";

  const cleanedPhone = phone.replace(/\D/g, "");

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendCooldown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !cleanedPhone || !email.trim() || !password.trim()) {
      toast.error("Lengkapi dulu semua data pendaftaran");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/public/customer/register", {
        name: name.trim(),
        phone: cleanedPhone,
        email: email.trim(),
        password,
      });
      setPhone(cleanedPhone);
      setStep("otp");
      setResendCooldown(30);
      toast.success(
        res.data?.message || "Pendaftaran hampir selesai. OTP aktivasi sudah dikirim ke WhatsApp kamu",
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Pendaftaran belum berhasil diproses"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.replace(/\D/g, "").length !== 6) {
      toast.error("Masukkan 6 digit kode verifikasi");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/public/customer/verify", {
        phone: cleanedPhone,
        code: otp.replace(/\D/g, ""),
      });
      setCookie("customer_auth", res.data.token, {
        path: "/",
        sameSite: "lax",
      });
      toast.success("Akun kamu sudah aktif. Selamat datang di Bookinaja");
      router.push(nextPath);
    } catch (error) {
      toast.error(getErrorMessage(error, "Kode verifikasi belum valid atau sudah kedaluwarsa"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!cleanedPhone) {
      toast.error("Nomor WhatsApp belum tersedia. Silakan isi ulang formulir pendaftaran");
      setStep("form");
      return;
    }

    setResendLoading(true);
    try {
      const res = await api.post("/public/customer/register/resend", {
        phone: cleanedPhone,
      });
      setResendCooldown(30);
      toast.success(res.data?.message || "OTP aktivasi baru sudah dikirim ke WhatsApp kamu");
    } catch (error) {
      toast.error(getErrorMessage(error, "OTP aktivasi belum berhasil dikirim ulang"));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center">
        <div className="w-full space-y-6">
          <header className="space-y-2 text-center">
            <div className="inline-flex items-center rounded-full border border-[#1d4ed81f] bg-[#1d4ed80f] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0f1f4a] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
              Bookinaja Register
            </div>
            <div className="space-y-1.5">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]">
                <span className="text-[#0f1f4a] dark:text-slate-100">Buat akun </span>
                <span className="bg-gradient-to-r from-[#1d4ed8] via-[#3b82f6] to-[#60a5fa] bg-clip-text text-transparent">
                  Bookinaja
                </span>
              </h1>
              <p className="mx-auto max-w-sm text-sm leading-6 text-[#334155] dark:text-slate-400">
                Nomor WhatsApp akan diverifikasi dulu sebelum akun diaktifkan.
              </p>
            </div>
          </header>

          <Card className="rounded-3xl border border-[#1d4ed81a] bg-card shadow-sm dark:border-white/10">
            <CardContent className="space-y-5 p-4 sm:p-5">
              {step === "form" ? (
                <form onSubmit={handleRegister} className="space-y-4">
                  <p className="text-sm leading-6 text-[#334155] dark:text-slate-400">
                    Isi data akun kamu dulu. Setelah itu kami kirim OTP ke WhatsApp untuk aktivasi.
                  </p>

                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                      Nama lengkap
                    </span>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nama lengkap"
                        className="h-12 rounded-2xl border-[#1d4ed826] bg-background pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10"
                        required
                      />
                    </div>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                      Nomor WhatsApp
                    </span>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        placeholder="08xxxxxxxxxx"
                        className="h-12 rounded-2xl border-[#1d4ed826] bg-background pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10"
                        required
                      />
                    </div>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                      Email
                    </span>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@domain.com"
                        className="h-12 rounded-2xl border-[#1d4ed826] bg-background pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10"
                        required
                      />
                    </div>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                      Password
                    </span>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Buat password"
                        className="h-12 rounded-2xl border-[#1d4ed826] bg-background pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10"
                        required
                      />
                    </div>
                  </label>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] text-white hover:from-[#1741b8] hover:to-[#2563eb]"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    Lanjut Verifikasi
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#1d4ed81a] bg-[#eff6ff] px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                      Aktivasi WhatsApp
                    </div>
                    <div className="mt-1 text-[#0f1f4a] dark:text-slate-100">{cleanedPhone}</div>
                    <p className="mt-2 text-[#334155] dark:text-slate-400">
                      Masukkan 6 digit kode verifikasi untuk mengaktifkan akun dan langsung masuk.
                    </p>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                      OTP 6 digit
                    </span>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                      <Input
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="6 digit"
                        className="h-12 rounded-2xl border-[#1d4ed826] bg-background pl-11 text-base tracking-[0.32em] shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10"
                      />
                    </div>
                  </label>

                  <Button
                    type="button"
                    onClick={handleVerify}
                    disabled={loading}
                    className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#0f1f4a] to-[#1d4ed8] text-white hover:from-[#0b1838] hover:to-[#1741b8]"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    Aktivasi Akun
                  </Button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendLoading || resendCooldown > 0}
                    className="w-full text-sm font-medium text-[#1d4ed8] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline dark:text-sky-300 dark:disabled:text-slate-500"
                  >
                    {resendLoading
                      ? "Mengirim ulang OTP..."
                      : resendCooldown > 0
                        ? `Kirim ulang OTP dalam ${resendCooldown} dtk`
                        : "Kirim ulang OTP"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("form");
                      setOtp("");
                    }}
                    className="w-full text-sm font-medium text-[#1d4ed8] underline-offset-4 hover:underline dark:text-sky-300"
                  >
                    Ubah data pendaftaran
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-[#1d4ed81a] pt-4 text-sm dark:border-white/10">
                <p className="text-[#334155] dark:text-slate-400">Sudah punya akun?</p>
                <Link
                  href="/user/login"
                  className="font-medium text-[#1d4ed8] underline-offset-4 hover:underline dark:text-sky-300"
                >
                  Masuk
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 transition-colors dark:text-slate-400">
            <Link href="/user/login" className="inline-flex items-center gap-2 hover:text-slate-900 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
