"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { CustomerGoogleAuth } from "@/components/customer/customer-google-auth";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  getTenantMismatchMessage,
  setCustomerAuthCookie,
} from "@/lib/tenant-session";
import {
  getCustomerPostAuthUrl,
  getCentralCustomerAuthUrl,
  getTenantSlugFromBrowser,
} from "@/lib/tenant";

type AuthMode = "wa" | "email";
type WaStep = "phone" | "otp";
type ForgotMode = "wa" | "email";

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
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotMode, setForgotMode] = useState<ForgotMode>("wa");
  const [forgotStep, setForgotStep] = useState<"request" | "verify">("request");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const nextPath = searchParams.get("next") || "/user/me";
  const tenantQuery = searchParams.get("tenant");
  const postAuthTarget = getCustomerPostAuthUrl({
    tenantSlug: tenantQuery,
    next: nextPath,
  });
  const registerHref = getCentralCustomerAuthUrl("register", {
    tenantSlug: tenantQuery,
    next: nextPath,
    reason: searchParams.get("reason"),
  });

  useEffect(() => {
    if (searchParams.get("reason") !== "tenant-mismatch") return;
    const message = getTenantMismatchMessage("customer");
    toast.info(message.title, {
      description: message.description,
      duration: 5000,
    });
  }, [searchParams]);

  useEffect(() => {
    const tenantSlug = getTenantSlugFromBrowser();
    if (!tenantSlug) return;

    const next = searchParams.get("next") || "/user/me";
    const target = getCentralCustomerAuthUrl("login", {
      tenantSlug,
      next,
      reason: searchParams.get("reason"),
    });
    const current = typeof window !== "undefined" ? window.location.href : "";
    if (current !== target) {
      window.location.replace(target);
    }
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

      setCustomerAuthCookie(res.data.token);

      toast.success(`Selamat datang, ${res.data.customer?.name || "Customer"}`);
      router.push(postAuthTarget);
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

      setCustomerAuthCookie(res.data.token);

      toast.success(
        `Selamat datang kembali, ${res.data.customer?.name || "Customer"}`,
      );
      router.push(postAuthTarget);
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal masuk"));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestForgotPassword = async () => {
    const cleanedPhone = forgotPhone.replace(/\D/g, "");
    if (!cleanedPhone || cleanedPhone.length < 9) {
      toast.error("Nomor WhatsApp belum valid");
      return;
    }

    setForgotLoading(true);
    try {
      await api.post("/public/customer/password/reset/request", {
        phone: cleanedPhone,
      });
      setForgotPhone(cleanedPhone);
      setForgotStep("verify");
      toast.success("OTP reset password dikirim ke WhatsApp");
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal mengirim OTP reset password"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (forgotPassword !== forgotConfirmPassword) {
      toast.error("Konfirmasi password baru belum sama");
      return;
    }

    setForgotLoading(true);
    try {
      await api.post("/public/customer/password/reset/verify", {
        phone: forgotPhone.replace(/\D/g, ""),
        code: forgotCode.replace(/\D/g, ""),
        new_password: forgotPassword,
      });
      toast.success("Password berhasil direset. Silakan login.");
      setForgotOpen(false);
      setForgotStep("request");
      setForgotCode("");
      setForgotPassword("");
      setForgotConfirmPassword("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal mereset password"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleRequestForgotPasswordEmail = async () => {
    if (!forgotEmail.trim()) {
      toast.error("Email wajib diisi");
      return;
    }
    setForgotLoading(true);
    try {
      await api.post("/public/customer/password/reset/request-email", {
        email: forgotEmail.trim(),
      });
      toast.success("Link reset password dikirim ke email kamu");
      setForgotOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal mengirim link reset password"));
    } finally {
      setForgotLoading(false);
    }
  };

  const tabBase =
    "flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition";
  const tabActive =
    "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-slate-100";
  const tabInactive =
    "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 dark:bg-[#050505] dark:text-white sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center">
        <div className="w-full space-y-4">
          <Button
            asChild
            variant="ghost"
            className="w-fit gap-2 rounded-xl px-0 text-slate-500 hover:bg-transparent hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <Link href="/">
              <ChevronLeft className="h-4 w-4" />
              <span>Kembali</span>
            </Link>
          </Button>

          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
            <CardContent className="space-y-6 p-6">
              <header className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  Masuk
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Pilih Google, WhatsApp, atau email.
                </p>
              </header>

              <CustomerGoogleAuth
                mode="login"
                nextPath={nextPath}
                tenantSlug={tenantQuery}
              />

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  atau
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1 dark:bg-white/5">
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
                  <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {waStep === "phone"
                      ? "Masukkan nomor WhatsApp yang terdaftar untuk menerima kode OTP."
                      : "Masukkan kode OTP 6 digit yang dikirim ke WhatsApp kamu."}
                  </p>

                  {waStep === "phone" ? (
                    <div className="space-y-5">
                      <label className="block space-y-2">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Nomor WhatsApp
                        </span>
                        <div className="relative mt-2">
                          <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={phone}
                            onChange={(e) => syncPhone(e.target.value)}
                            placeholder="08xxxxxxxxxx"
                            className="h-12 rounded-2xl border-slate-200 bg-white pl-11 text-base shadow-none placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                          />
                        </div>
                      </label>

                      <Button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={loading}
                        className="h-12 w-full rounded-2xl"
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
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                        <div className="min-w-0 text-slate-500 dark:text-slate-400">
                          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            Nomor
                          </span>
                          <span className="block truncate text-slate-900 dark:text-slate-100">
                            {phone}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setWaStep("phone");
                            setOtp("");
                          }}
                          className="text-xs font-medium text-slate-600 underline-offset-4 hover:underline dark:text-slate-300"
                        >
                          Ganti
                        </button>
                      </div>

                      <label className="block space-y-2">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          OTP 6 digit
                        </span>
                        <div className="relative mt-2">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            inputMode="numeric"
                            maxLength={6}
                            value={otp}
                            onChange={(e) =>
                              setOtp(e.target.value.replace(/\D/g, ""))
                            }
                            placeholder="6 digit"
                            className="h-12 rounded-2xl border-slate-200 bg-white pl-11 text-base tracking-[0.32em] shadow-none placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                          />
                        </div>
                      </label>

                      <Button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={loading}
                        className="h-12 w-full rounded-2xl"
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
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Email
                    </span>
                    <div className="relative mt-2">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@domain.com"
                        className="h-12 rounded-2xl border-slate-200 bg-white pl-11 text-base shadow-none placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                      />
                    </div>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Password
                    </span>
                    <div className="relative mt-2">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="kata sandi"
                        className="h-12 rounded-2xl border-slate-200 bg-white pl-11 text-base shadow-none placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                      />
                    </div>
                  </label>

                  <div className="-mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline dark:text-slate-300"
                    >
                      Lupa password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-2xl"
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

              <div className="flex items-center justify-center border-t border-slate-200 pt-4 text-sm dark:border-white/10">
                <p className="text-slate-500 dark:text-slate-400">
                  Belum punya akun?
                </p>
                <Link
                  href={registerHref}
                  className="ml-2 font-semibold text-blue-700 underline-offset-4 hover:underline"
                >
                  Daftar
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet
        open={forgotOpen}
        onOpenChange={(open) => {
          setForgotOpen(open);
          if (!open) {
            setForgotMode("wa");
            setForgotStep("request");
            setForgotCode("");
            setForgotPassword("");
            setForgotConfirmPassword("");
          }
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[90vh] overflow-y-auto rounded-t-[2rem] border-0 bg-white px-0 pb-0 pt-0 dark:bg-[#0b0f19]"
        >
          <SheetHeader className="border-b border-slate-200/80 pb-4 dark:border-white/10">
            <SheetTitle>Reset password customer</SheetTitle>
            <SheetDescription>
              Pakai OTP WhatsApp untuk membuat password baru kalau kamu lupa password lama.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4">
            {forgotStep === "request" ? (
              <>
                <div className="grid grid-cols-2 gap-2 rounded-full border border-transparent bg-[#eff6ff] p-1 dark:border-white/5 dark:bg-white/5">
                  <button
                    type="button"
                    onClick={() => setForgotMode("wa")}
                    className={`${tabBase} ${forgotMode === "wa" ? tabActive : tabInactive}`}
                  >
                    <Phone className="h-4 w-4" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotMode("email")}
                    className={`${tabBase} ${forgotMode === "email" ? tabActive : tabInactive}`}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </button>
                </div>

                {forgotMode === "wa" ? (
                  <>
                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                    Nomor WhatsApp
                  </span>
                  <div className="relative mt-2">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                    <Input
                      type="tel"
                      inputMode="tel"
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="08xxxxxxxxxx"
                      className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                    />
                  </div>
                </label>

                <Button
                  type="button"
                  onClick={handleRequestForgotPassword}
                  disabled={forgotLoading}
                  className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] text-white shadow-xl shadow-blue-500/20 hover:from-[#1741b8] hover:to-[#2563eb]"
                >
                  {forgotLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquareText className="mr-2 h-4 w-4" />
                  )}
                  Kirim OTP reset
                </Button>
                  </>
                ) : (
                  <>
                    <label className="block space-y-2">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                        Email terverifikasi
                      </span>
                      <div className="relative mt-2">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                        <Input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="nama@domain.com"
                          className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                        />
                      </div>
                    </label>

                    <Button
                      type="button"
                      onClick={handleRequestForgotPasswordEmail}
                      disabled={forgotLoading}
                      className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] text-white shadow-xl shadow-blue-500/20 hover:from-[#1741b8] hover:to-[#2563eb]"
                    >
                      {forgotLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      Kirim link reset
                    </Button>
                  </>
                )}
              </>
            ) : (
              <form onSubmit={handleVerifyForgotPassword} className="space-y-4">
                <div className="rounded-2xl border border-[#1d4ed81a] bg-[#eff6ff] px-4 py-3 text-sm text-[#334155] dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  OTP dikirim ke <span className="font-semibold">{forgotPhone}</span>.
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
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="6 digit"
                      className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 text-base tracking-[0.32em] shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                    Password baru
                  </span>
                  <div className="relative mt-2">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                    <Input
                      type="password"
                      value={forgotPassword}
                      onChange={(e) => setForgotPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                    Ulangi password baru
                  </span>
                  <div className="relative mt-2">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                    <Input
                      type="password"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang password baru"
                      className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[#3b82f6] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                    />
                  </div>
                </label>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 flex-1 rounded-2xl"
                    onClick={() => setForgotStep("request")}
                  >
                    Ganti nomor
                  </Button>
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="h-12 flex-1 rounded-2xl bg-gradient-to-r from-[#0f1f4a] to-[#1d4ed8] text-white shadow-xl shadow-blue-500/20 hover:from-[#0b1838] hover:to-[#1741b8]"
                  >
                    {forgotLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    Reset
                  </Button>
                </div>
              </form>
            )}
          </div>

          <SheetFooter className="border-t border-slate-200/80 bg-white dark:border-white/10 dark:bg-[#0b0f19]" />
        </SheetContent>
      </Sheet>
    </main>
  );
}
