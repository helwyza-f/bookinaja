"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Loader2, Phone, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getCentralCustomerAuthUrl,
  getCustomerPostAuthUrl,
} from "@/lib/tenant";
import { setCustomerAuthCookie } from "@/lib/tenant-session";

type GoogleFlowMode = "login" | "register";
type ClaimStep = "claim" | "otp";

type GoogleLoginResponse = {
  status?: "authenticated" | "needs_phone";
  token?: string;
  customer?: {
    name?: string;
    phone?: string;
  };
  claim_token?: string;
  profile?: {
    name?: string;
    email?: string | null;
  };
  message?: string;
};

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    return (error as ApiError).response?.data?.error || fallback;
  }
  return fallback;
}

export function CustomerGoogleAuth({
  mode,
  nextPath,
  tenantSlug,
  className = "",
}: {
  mode: GoogleFlowMode;
  nextPath: string;
  tenantSlug?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== "undefined" && !!window.google?.accounts?.id,
  );
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [claimStep, setClaimStep] = useState<ClaimStep>("claim");
  const [claimToken, setClaimToken] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const googleClientID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const linkGoogleAfterLoginPath = "/user/me/settings?sheet=google";
  const postAuthTarget = useMemo(
    () =>
      getCustomerPostAuthUrl({
        tenantSlug,
        next: nextPath,
      }),
    [nextPath, tenantSlug],
  );

  const buttonText = useMemo(
    () => (mode === "register" ? "signup_with" : "continue_with"),
    [mode],
  );

  useEffect(() => {
    if (!googleClientID || scriptReady) return;
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity-services="true"]',
    );
    if (existing) {
      const markReady = () => {
        if (window.google?.accounts?.id) {
          setScriptReady(true);
        }
      };
      markReady();
      existing.addEventListener("load", markReady);
      const timer = window.setInterval(markReady, 250);
      return () => {
        existing.removeEventListener("load", markReady);
        window.clearInterval(timer);
      };
    }
    let disposed = false;
    const markReady = () => {
      if (!disposed && window.google?.accounts?.id) {
        setScriptReady(true);
      }
    };
    const timer = window.setInterval(markReady, 250);
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentityServices = "true";
    script.onload = markReady;
    document.head.appendChild(script);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      script.onload = null;
    };
  }, [googleClientID, scriptReady]);

  const handleGoogleCredential = useCallback(async (credential: string) => {
    setLoading(true);
    try {
      const res = await api.post<GoogleLoginResponse>(
        "/public/customer/google/login",
        {
          id_token: credential,
        },
      );
      const payload = res.data;
      if (payload.status === "authenticated" && payload.token) {
        setCustomerAuthCookie(payload.token);
        toast.success(payload.message || "Login Google berhasil");
        router.push(postAuthTarget);
        return;
      }
      if (payload.status === "needs_phone" && payload.claim_token) {
        setClaimToken(payload.claim_token);
        setName(payload.profile?.name || "");
        setEmail(payload.profile?.email || "");
        setPhone("");
        setOtp("");
        setClaimStep("claim");
        setDialogOpen(true);
        toast.success(
          payload.message ||
            "Lengkapi nomor WhatsApp untuk mengaktifkan akun Google kamu.",
        );
        return;
      }
      toast.error("Respons Google login belum dikenali");
    } catch (error) {
      toast.error(getErrorMessage(error, "Login Google belum berhasil"));
    } finally {
      setLoading(false);
    }
  }, [postAuthTarget, router]);

  useEffect(() => {
    if (
      !scriptReady ||
      !buttonRef.current ||
      !googleClientID ||
      !window.google?.accounts?.id
    ) {
      return;
    }
    buttonRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: googleClientID,
      callback: async (response) => {
        if (!response.credential) {
          toast.error("Google credential tidak tersedia");
          return;
        }
        await handleGoogleCredential(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: 320,
      text: buttonText,
      shape: "pill",
      logo_alignment: "left",
    });
  }, [buttonText, googleClientID, scriptReady, handleGoogleCredential]);

  async function handleClaimAccount() {
    if (!claimToken || !phone.replace(/\D/g, "")) {
      toast.error("Nomor WhatsApp wajib diisi");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/public/customer/google/claim", {
        claim_token: claimToken,
        phone: phone.replace(/\D/g, ""),
        name: name.trim(),
      });
      setPhone(res.data?.phone || phone.replace(/\D/g, ""));
      setClaimStep("otp");
      toast.success(
        res.data?.message || "OTP aktivasi sudah dikirim ke WhatsApp kamu.",
      );
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Claim akun Google belum berhasil",
      );
      if (message.includes("Masuk dulu lalu hubungkan Google")) {
        setDialogOpen(false);
        toast.info("Nomor ini sudah punya akun Bookinaja", {
          description:
            "Masuk dulu ke akun yang sama, lalu hubungkan Google dari halaman keamanan akun.",
          duration: 6000,
        });
        router.push(
          getCentralCustomerAuthUrl("login", {
            tenantSlug,
            next: linkGoogleAfterLoginPath,
          }),
        );
        return;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otp.replace(/\D/g, "").length !== 6) {
      toast.error("OTP harus 6 digit");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/public/customer/verify", {
        phone: phone.replace(/\D/g, ""),
        code: otp.replace(/\D/g, ""),
      });
      setCustomerAuthCookie(res.data.token);
      setDialogOpen(false);
      toast.success(
        "Akun Google kamu sudah aktif. Selamat datang di Bookinaja",
      );
      router.push(postAuthTarget);
    } catch (error) {
      toast.error(getErrorMessage(error, "OTP aktivasi Google belum valid"));
    } finally {
      setLoading(false);
    }
  }

  if (!googleClientID) {
    return null;
  }

  return (
    <>
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#1d4ed8] dark:text-sky-300">
          <Sparkles className="h-3.5 w-3.5" />
          Google access
        </div>
        <div className="rounded-[1.75rem] border border-[#1d4ed81a] bg-white/80 p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.22)] backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
            <p className="text-sm leading-6 text-[#334155] dark:text-slate-400">
              {mode === "register"
                ? "Daftar lebih cepat pakai Google, lalu lengkapi WhatsApp untuk aktivasi akun."
                : "Masuk cepat pakai Google. Kalau akun baru, kami bantu claim lewat WhatsApp."}
            </p>
            <div ref={buttonRef} className="min-h-[44px]" />
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memproses Google sign-in...
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setClaimStep("claim");
            setClaimToken("");
            setPhone("");
            setOtp("");
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-[2rem] border border-slate-200 bg-white/95 p-0 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-[#0b1220]/95">
          <DialogHeader className="border-b border-slate-200/80 px-6 py-5 dark:border-white/10">
            <DialogTitle className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
              {claimStep === "claim"
                ? "Lengkapi Akun Google"
                : "Verifikasi WhatsApp"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              {claimStep === "claim"
                ? "Google kamu sudah dikenali. Tinggal tambahkan nomor WhatsApp supaya akun Bookinaja aktif penuh."
                : "Masukkan OTP 6 digit yang kami kirim ke WhatsApp untuk menyelesaikan aktivasi akun Google."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5">
            {claimStep === "claim" ? (
              <>
                <div className="rounded-2xl border border-[#1d4ed81a] bg-[#eff6ff]/80 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                  {email
                    ? `Google email: ${email}`
                    : "Akun Google siap di-claim."}
                </div>

                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                    Nama
                  </span>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama lengkap"
                    className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 dark:border-white/10 dark:bg-white/5"
                  />
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
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="08xxxxxxxxxx"
                      className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 dark:border-white/10 dark:bg-white/5"
                    />
                  </div>
                </label>

                <Button
                  type="button"
                  onClick={handleClaimAccount}
                  disabled={loading}
                  className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] text-white"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Kirim OTP Aktivasi
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-[#1d4ed81a] bg-[#eff6ff]/80 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                  OTP dikirim ke <span className="font-semibold">{phone}</span>
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
                      className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11 tracking-[0.32em] dark:border-white/10 dark:bg-white/5"
                    />
                  </div>
                </label>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 flex-1 rounded-2xl"
                    onClick={() => setClaimStep("claim")}
                  >
                    Ubah nomor
                  </Button>
                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading}
                    className="h-12 flex-1 rounded-2xl bg-gradient-to-r from-[#0f1f4a] to-[#1d4ed8] text-white"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    Aktivasi akun
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
