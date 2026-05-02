"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { setCookie } from "cookies-next";
import {
  ArrowRight,
  ChevronLeft,
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
import { getTenantMismatchMessage } from "@/lib/tenant-session";

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

  useEffect(() => {
    if (searchParams.get("reason") !== "tenant-mismatch") return;
    const message = getTenantMismatchMessage("customer");
    toast.info(message.title, {
      description: message.description,
      duration: 5000,
    });
  }, [searchParams]);

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

  const tabBase =
    "flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition";
  const tabActive =
    "bg-background text-[#0f1f4a] shadow-sm dark:bg-white/10 dark:text-sky-100";
  const tabInactive =
    "text-muted-foreground hover:text-foreground dark:hover:text-slate-300";

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-6 text-foreground transition-colors duration-500 dark:bg-[#050505] sm:px-6">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[128px] dark:bg-blue-600/10" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-sky-500/10 blur-[128px] dark:bg-sky-600/10" />

      <div className="absolute left-6 top-6 z-50 md:left-8 md:top-8">
        <Button
          asChild
          variant="ghost"
          className="gap-2 rounded-xl text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <Link href="/">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Kembali ke Beranda</span>
          </Link>
        </Button>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center">
        <div className="w-full space-y-6">
          <header className="space-y-3 text-center">
            <div className="inline-flex items-center rounded-full border border-[#1d4ed81f] bg-[#1d4ed80f] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#0f1f4a] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
              Bookinaja Access
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight sm:text-[2.15rem]">
                <span className="text-[#0f1f4a] dark:text-slate-100">
                  Masuk ke{" "}
                </span>
                <span className="bg-gradient-to-r from-[#1d4ed8] via-[#3b82f6] to-[#60a5fa] bg-clip-text text-transparent">
                  Bookinaja
                </span>
              </h1>
              <p className="mx-auto max-w-sm text-sm leading-6 text-[#334155] dark:text-slate-400">
                Akses customer dibuat cepat dan sederhana. WhatsApp jadi cara
                utama, dan email sebagai alternatif.
              </p>
            </div>
          </header>

          <Card className="rounded-[2rem] border border-[#1d4ed81a] bg-white/75 shadow-[0_32px_64px_-15px_rgba(15,23,42,0.10)] backdrop-blur-3xl dark:border-white/10 dark:bg-black/50 dark:shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)]">
            <CardContent className="space-y-6 p-5 sm:p-6">
              <div className="grid grid-cols-2 gap-2 rounded-full border border-transparent bg-[#eff6ff] p-1 dark:border-white/5 dark:bg-white/5">
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
                      ? "Masukkan nomor WhatsApp yang terdaftar untuk menerima kode OTP."
                      : "Masukkan kode OTP 6 digit yang dikirim ke WhatsApp kamu."}
                  </p>

                  {waStep === "phone" ? (
                    <div className="space-y-5">
                      <label className="block space-y-2">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                          Nomor WhatsApp
                        </span>
                        <div className="relative mt-2">
                          <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                          <Input
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={phone}
                            onChange={(e) => syncPhone(e.target.value)}
                            placeholder="08xxxxxxxxxx"
                            className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                          />
                        </div>
                      </label>

                      <Button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={loading}
                        className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] text-white shadow-xl shadow-blue-500/20 hover:from-[#1741b8] hover:to-[#2563eb]"
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
                    <div className="space-y-5">
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
                        <div className="relative mt-2">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                          <Input
                            inputMode="numeric"
                            maxLength={6}
                            value={otp}
                            onChange={(e) =>
                              setOtp(e.target.value.replace(/\D/g, ""))
                            }
                            placeholder="6 digit"
                            className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 text-base tracking-[0.32em] shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                          />
                        </div>
                      </label>

                      <Button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={loading}
                        className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#0f1f4a] to-[#1d4ed8] text-white shadow-xl shadow-blue-500/20 hover:from-[#0b1838] hover:to-[#1741b8]"
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
                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                      Email
                    </span>
                    <div className="relative mt-2">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                      <Input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@domain.com"
                        className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                      />
                    </div>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                      Password
                    </span>
                    <div className="relative mt-2">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                      <Input
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="kata sandi"
                        className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                      />
                    </div>
                  </label>

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
                    Masuk
                  </Button>
                </form>
              )}

              <div className="flex items-center justify-center border-t border-[#1d4ed81a] pt-4 text-sm dark:border-white/10">
                <p className="text-[#334155] dark:text-slate-400">
                  Belum punya akun?
                </p>
                <Link
                  href="/user/register"
                  className="ml-2 font-semibold text-[#1d4ed8] underline-offset-4 hover:underline dark:text-sky-300"
                >
                  Daftar
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
