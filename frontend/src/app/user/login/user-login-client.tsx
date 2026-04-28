"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { setCookie } from "cookies-next";
import {
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  MessageSquareText,
  Phone,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type AuthMode = "wa" | "email";
type WaStep = "phone" | "otp";

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

export default function UserLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("wa");
  const [waStep, setWaStep] = useState<WaStep>("phone");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const nextPath = searchParams.get("next") || "/user/me";

  const syncPhone = (value: string) => {
    setPhone(value.replace(/\D/g, ""));
  };

  const handleRequestOtp = async () => {
    const cleanedPhone = phone.replace(/\D/g, "");

    if (!cleanedPhone || cleanedPhone.length < 9) {
      toast.error("Nomor WhatsApp belum valid");
      return;
    }

    setLoading(true);
    try {
      await api.post("/public/customer/login", { phone: cleanedPhone });
      setPhone(cleanedPhone);
      setWaStep("otp");
      toast.success("Kode OTP dikirim ke WhatsApp");
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal mengirim OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanedOtp = otp.replace(/\D/g, "");

    if (cleanedOtp.length !== 6) {
      toast.error("OTP harus 6 digit");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/public/customer/verify", {
        phone: phone.replace(/\D/g, ""),
        code: cleanedOtp,
      });

      setCookie("customer_auth", res.data.token, {
        path: "/",
        sameSite: "lax",
      });

      toast.success(`Selamat datang, ${res.data.customer?.name || "Customer"}`);
      router.push(nextPath);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Kode OTP salah atau sudah kedaluwarsa"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Email dan password wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/public/customer/login-email", {
        email: email.trim(),
        password,
      });

      setCookie("customer_auth", res.data.token, {
        path: "/",
        sameSite: "lax",
      });

      toast.success(
        `Selamat datang kembali, ${res.data.customer?.name || "Customer"}`,
      );
      router.push(nextPath);
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal masuk"));
    } finally {
      setLoading(false);
    }
  };

  const resetLogin = () => {
    setMode("wa");
    setWaStep("phone");
    setPhone("");
    setOtp("");
    setEmail("");
    setPassword("");
  };

  const tabBase =
    "flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition";
  const tabActive =
    "bg-background text-[#0f1f4a] shadow-sm dark:text-sky-100";
  const tabInactive = "text-muted-foreground hover:text-foreground";

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center">
        <div className="w-full space-y-6">
          <header className="space-y-2 text-center">
            <div className="inline-flex items-center rounded-full border border-[#1d4ed81f] bg-[#1d4ed80f] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0f1f4a] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
              Bookinaja Access
            </div>
            <div className="space-y-1.5">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]">
                <span className="text-[#0f1f4a] dark:text-slate-100">
                  Masuk ke{" "}
                </span>
                <span className="bg-gradient-to-r from-[#1d4ed8] via-[#3b82f6] to-[#60a5fa] bg-clip-text text-transparent">
                  Bookinaja
                </span>
              </h1>
              <p className="mx-auto max-w-sm text-sm leading-6 text-[#334155] dark:text-slate-400">
                Login default menggunakan nomor WhatsApp. Email dan password
                tersedia sebagai alternatif.
              </p>
            </div>
          </header>

          <Card className="rounded-3xl border border-[#1d4ed81a] bg-card shadow-sm dark:border-white/10">
            <CardContent className="space-y-5 p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-2 rounded-full bg-[#eff6ff] p-1 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setMode("wa")}
                  className={`${tabBase} ${mode === "wa" ? tabActive : tabInactive}`}
                >
                  <Phone className="h-4 w-4" />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setMode("email")}
                  className={`${tabBase} ${mode === "email" ? tabActive : tabInactive}`}
                >
                  <Mail className="h-4 w-4" />
                  Email
                </button>
              </div>

              {mode === "wa" ? (
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-[#334155] dark:text-slate-400">
                    {waStep === "phone"
                      ? "Masukkan nomor WhatsApp yang terdaftar untuk menerima OTP."
                      : "Masukkan OTP 6 digit yang dikirim ke WhatsApp kamu."}
                  </p>

                  {waStep === "phone" ? (
                    <div className="space-y-6">
                      <label className="block space-y-2">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                          Nomor WhatsApp
                        </span>
                        <div className="relative">
                          <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                          <Input
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={phone}
                            onChange={(e) => syncPhone(e.target.value)}
                            placeholder="08xxxxxxxxxx"
                            className="h-12 rounded-2xl border-[#1d4ed826] bg-background pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10"
                          />
                        </div>
                      </label>

                      <Button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={loading}
                        className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] text-white hover:from-[#1741b8] hover:to-[#2563eb]"
                      >
                        {loading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquareText className="mr-2 h-4 w-4" />
                        )}
                        Kirim OTP
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#1d4ed81a] bg-[#eff6ff] px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                        <div className="min-w-0 text-[#334155] dark:text-slate-400">
                          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                            Nomor
                          </span>
                          <span className="block truncate text-[#0f1f4a] dark:text-slate-100">
                            {phone}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setWaStep("phone");
                            setOtp("");
                          }}
                          className="text-xs font-medium text-[#1d4ed8] underline-offset-4 hover:underline dark:text-sky-300"
                        >
                          Ganti
                        </button>
                      </div>

                      <label className="block space-y-2">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                          OTP 6 digit
                        </span>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                          <Input
                            inputMode="numeric"
                            maxLength={6}
                            value={otp}
                            onChange={(e) =>
                              setOtp(e.target.value.replace(/\D/g, ""))
                            }
                            placeholder="6 digit"
                            className="h-12 rounded-2xl border-[#1d4ed826] bg-background pl-11 text-base tracking-[0.32em] shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10"
                          />
                        </div>
                      </label>

                      <Button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={loading}
                        className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#0f1f4a] to-[#1d4ed8] text-white hover:from-[#0b1838] hover:to-[#1741b8]"
                      >
                        {loading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="mr-2 h-4 w-4" />
                        )}
                        Masuk
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-6">
                  <p className="text-sm leading-6 text-[#334155] dark:text-slate-400">
                    Gunakan email dan password jika akun kamu sudah memakai
                    login klasik.
                  </p>

                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                      Email
                    </span>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                      <Input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@domain.com"
                        className="h-12 rounded-2xl border-[#1d4ed826] bg-background pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10"
                      />
                    </div>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                      Password
                    </span>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                      <Input
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="kata sandi"
                        className="h-12 rounded-2xl border-[#1d4ed826] bg-background pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10"
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
                    Masuk
                  </Button>
                </form>
              )}

              <div className="flex items-center justify-between border-t border-[#1d4ed81a] pt-4 text-sm dark:border-white/10">
                <p className="text-[#334155] dark:text-slate-400">Belum punya akun?</p>
                <Link
                  href="/user/register"
                  className="font-medium text-[#1d4ed8] underline-offset-4 hover:underline dark:text-sky-300"
                >
                  Daftar
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-3 text-xs font-medium uppercase tracking-[0.22em] text-[#64748b] dark:text-slate-400">
            <Link href="/" className="transition hover:text-[#0f1f4a] dark:hover:text-slate-100">
              Beranda
            </Link>
            <span className="h-1 w-1 rounded-full bg-[#1d4ed8]/30 dark:bg-sky-300/30" />
            <button
              type="button"
              onClick={resetLogin}
              className="transition hover:text-[#0f1f4a] dark:hover:text-slate-100"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
