"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  User,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerGoogleAuth } from "@/components/customer/customer-google-auth";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { setCustomerAuthCookie } from "@/lib/tenant-session";
import {
  getCustomerPostAuthUrl,
  getCentralCustomerAuthUrl,
  getTenantSlugFromBrowser,
} from "@/lib/tenant";

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
  const tenantQuery = searchParams.get("tenant");
  const postAuthTarget = getCustomerPostAuthUrl({
    tenantSlug: tenantQuery,
    next: nextPath,
  });
  const loginHref = getCentralCustomerAuthUrl("login", {
    tenantSlug: tenantQuery,
    next: nextPath,
  });

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

  useEffect(() => {
    const tenantSlug = getTenantSlugFromBrowser();
    if (!tenantSlug) return;

    const next = searchParams.get("next") || "/user/me";
    const target = getCentralCustomerAuthUrl("register", {
      tenantSlug,
      next,
    });
    const current = typeof window !== "undefined" ? window.location.href : "";
    if (current !== target) {
      window.location.replace(target);
    }
  }, [searchParams]);

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
        res.data?.message ||
          "Pendaftaran hampir selesai. OTP aktivasi sudah dikirim ke WhatsApp kamu",
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Pendaftaran belum berhasil diproses"),
      );
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
      setCustomerAuthCookie(res.data.token);
      toast.success("Akun kamu sudah aktif. Selamat datang di Bookinaja");
      router.push(postAuthTarget);
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Kode verifikasi belum valid atau sudah kedaluwarsa",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!cleanedPhone) {
      toast.error(
        "Nomor WhatsApp belum tersedia. Silakan isi ulang formulir pendaftaran",
      );
      setStep("form");
      return;
    }

    setResendLoading(true);
    try {
      const res = await api.post("/public/customer/register/resend", {
        phone: cleanedPhone,
      });
      setResendCooldown(30);
      toast.success(
        res.data?.message || "OTP aktivasi baru sudah dikirim ke WhatsApp kamu",
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error, "OTP aktivasi belum berhasil dikirim ulang"),
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-6 text-foreground dark:bg-[#050505] sm:px-6">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[128px] dark:bg-blue-600/10" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-sky-500/10 blur-[128px] dark:bg-sky-600/10" />

      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center">
        <div className="w-full space-y-6">
          <header className="space-y-3 text-center">
            <div className="inline-flex items-center rounded-full border border-[#1d4ed81f] bg-[#1d4ed80f] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#0f1f4a] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
              Bookinaja Register
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight sm:text-[2.15rem]">
                <span className="text-[#0f1f4a] dark:text-slate-100">
                  Buat akun{" "}
                </span>
                <span className="bg-gradient-to-r from-[#1d4ed8] via-[#3b82f6] to-[#60a5fa] bg-clip-text text-transparent">
                  Bookinaja
                </span>
              </h1>
              <p className="mx-auto max-w-sm text-sm leading-6 text-[#334155] dark:text-slate-400">
                Daftar cepat, lalu aktifkan akun lewat WhatsApp supaya aksesmu
                lebih aman dan lebih praktis.
              </p>
            </div>
          </header>

          <Card className="rounded-[2rem] border border-[#1d4ed81a] bg-white/75 shadow-[0_32px_64px_-15px_rgba(15,23,42,0.10)] backdrop-blur-3xl dark:border-white/10 dark:bg-black/50 dark:shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)]">
            <CardContent className="space-y-6 p-5 sm:p-6">
              {step === "form" ? (
                <>
                  <CustomerGoogleAuth
                    mode="register"
                    nextPath={nextPath}
                    tenantSlug={tenantQuery}
                  />

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">
                      atau daftar manual
                    </span>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                  </div>
                </>
              ) : null}

              {step === "form" ? (
                <form onSubmit={handleRegister} className="space-y-5">
                  <p className="text-sm leading-6 text-[#334155] dark:text-slate-400">
                    Isi data akun kamu dulu. Setelah itu kami kirim OTP ke
                    WhatsApp untuk aktivasi.
                  </p>

                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                      Nama lengkap
                    </span>
                    <div className="relative mt-2">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nama lengkap"
                        className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10 dark:bg-white/5"
                        required
                      />
                    </div>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                      Nomor WhatsApp
                    </span>
                    <div className="relative mt-2">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="08xxxxxxxxxx"
                        className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10 dark:bg-white/5"
                        required
                      />
                    </div>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                      Email
                    </span>
                    <div className="relative mt-2">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@domain.com"
                        className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10 dark:bg-white/5"
                        required
                      />
                    </div>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                      Password
                    </span>
                    <div className="relative mt-2">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Buat password"
                        className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10 dark:bg-white/5"
                        required
                      />
                    </div>
                  </label>

                  <div className="rounded-2xl border border-[#1d4ed812] bg-[#eff6ff]/70 px-4 py-3 text-sm text-[#334155] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                    Aktivasi akun dilakukan lewat WhatsApp supaya proses masuk
                    sesudahnya lebih cepat.
                  </div>

                  <div className="grid gap-2 rounded-[1.5rem] border border-[#1d4ed812] bg-white/70 p-4 text-sm text-[#334155] dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
                    <div className="font-semibold text-[#0f1f4a] dark:text-slate-200">
                      Cara paling cepat:
                    </div>
                    <div>Google untuk mulai dalam beberapa klik.</div>
                    <div>Manual kalau kamu ingin langsung set email + password sendiri.</div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] text-white shadow-xl shadow-blue-500/20 hover:from-[#1741b8] hover:to-[#2563eb]"
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
                <div className="space-y-5">
                  <div className="rounded-2xl border border-[#1d4ed81a] bg-[#eff6ff] px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                      Aktivasi WhatsApp
                    </div>
                    <div className="mt-1 text-[#0f1f4a] dark:text-slate-100">
                      {cleanedPhone}
                    </div>
                    <p className="mt-2 text-[#334155] dark:text-slate-400">
                      Masukkan 6 digit kode verifikasi untuk mengaktifkan akun
                      dan langsung masuk.
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
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="6 digit"
                        className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 text-base tracking-[0.32em] shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10 dark:bg-white/5"
                      />
                    </div>
                  </label>

                  <Button
                    type="button"
                    onClick={handleVerify}
                    disabled={loading}
                    className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#0f1f4a] to-[#1d4ed8] text-white shadow-xl shadow-blue-500/20 hover:from-[#0b1838] hover:to-[#1741b8]"
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

              <div className="flex items-center justify-center border-t border-[#1d4ed81a] pt-4 text-sm dark:border-white/10">
                <p className="text-[#334155] dark:text-slate-400">
                  Sudah punya akun?
                </p>
                <Link
                  href={loginHref}
                  className="ml-2 font-semibold text-[#1d4ed8] underline-offset-4 hover:underline dark:text-sky-300"
                >
                  Masuk
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 transition-colors dark:text-slate-400">
            <Link
              href={loginHref}
              className="inline-flex items-center gap-2 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
