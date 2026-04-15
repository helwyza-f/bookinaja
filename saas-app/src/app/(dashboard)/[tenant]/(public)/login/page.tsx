"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { setCookie } from "cookies-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  Phone,
  KeyRound,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES: Record<string, any> = {
  gaming_hub: {
    primary: "text-blue-500",
    bgPrimary: "bg-blue-600",
    glow: "shadow-blue-500/20",
    ring: "focus-visible:ring-blue-500",
    accent: "bg-blue-500/10",
  },
  creative_space: {
    primary: "text-rose-500",
    bgPrimary: "bg-rose-600",
    glow: "shadow-rose-500/20",
    ring: "focus-visible:ring-rose-500",
    accent: "bg-rose-500/10",
  },
  sport_center: {
    primary: "text-emerald-500",
    bgPrimary: "bg-emerald-600",
    glow: "shadow-emerald-500/20",
    ring: "focus-visible:ring-emerald-500",
    accent: "bg-emerald-500/10",
  },
  social_space: {
    primary: "text-indigo-500",
    bgPrimary: "bg-indigo-600",
    glow: "shadow-indigo-500/20",
    ring: "focus-visible:ring-indigo-500",
    accent: "bg-indigo-500/10",
  },
};

export default function CustomerLoginPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [tenantData, setTenantData] = useState<any>(null);

  useEffect(() => {
    api
      .get(`/public/landing?slug=${tenantSlug}`)
      .then((res) => setTenantData(res.data))
      .catch(() => console.error("Failed to load tenant theme"));
  }, [tenantSlug]);

  const theme = useMemo(() => {
    const cat = tenantData?.profile?.business_category || "social_space";
    return THEMES[cat] || THEMES.social_space;
  }, [tenantData]);

  const handleRequestOtp = async () => {
    if (!phone || phone.length < 9)
      return toast.error("Nomor WhatsApp tidak valid");
    setLoading(true);
    try {
      await api.post("/public/customer/login", { phone });
      setStep("otp");
      toast.success("OTP Berhasil Dikirim", {
        description: "Silakan cek WhatsApp Anda.",
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal mengirim OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return toast.error("Kode OTP harus 6 digit");
    setLoading(true);
    try {
      const res = await api.post("/public/customer/verify", {
        phone,
        code: otp,
      });

      setCookie("customer_auth", res.data.token, {
        maxAge: 60 * 60 * 72,
        path: "/",
      });

      if (res.data.customer?.tenant_id) {
        setCookie("current_tenant_id", res.data.customer.tenant_id, {
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        });
      }

      toast.success(`Selamat Datang, ${res.data.customer.name}!`);
      router.push("/me");
    } catch (err: any) {
      toast.error("Kode OTP Salah atau Kadaluarsa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white dark:bg-[#050505] font-plus-jakarta overflow-hidden">
      {/* Background Decor - Slim & Modern */}
      <div
        className={cn("fixed top-0 left-0 w-full h-1 z-50", theme.bgPrimary)}
      />
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

      <div className="w-full max-w-[420px] z-10 space-y-10 animate-in fade-in zoom-in-95 duration-700">
        {/* Header Branding */}
        <div className="text-center relative">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-5 scale-150 pointer-events-none">
            <Zap size={120} className={theme.primary} fill="currentColor" />
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-[10px] font-black uppercase tracking-[0.2em] ring-1 ring-inset transition-all",
              theme.accent,
              theme.primary,
              "ring-current/20",
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Secure Customer Portal
          </div>

          <h1 className="text-5xl font-[1000] uppercase italic tracking-tighter leading-none dark:text-white">
            {tenantData?.profile?.name || "Bookinaja"}
            <span className="block text-2xl opacity-20 mt-1">
              Sultan Access
            </span>
          </h1>
        </div>

        <Card className="border-none shadow-2xl dark:shadow-none bg-white/50 dark:bg-[#0c0c0c] backdrop-blur-xl rounded-[2.5rem] ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
          <CardContent className="p-8 md:p-12">
            {step === "phone" ? (
              <div className="space-y-8">
                <div className="space-y-2 text-center">
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">
                    Welcome
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    Masuk dengan nomor WhatsApp
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 z-20">
                      <Phone
                        className={cn(
                          "h-5 w-5 transition-colors",
                          theme.primary,
                        )}
                      />
                    </div>
                    <Input
                      type="tel"
                      placeholder="08..."
                      className={cn(
                        "h-16 pl-14 rounded-2xl bg-slate-50 dark:bg-black border-none font-black text-xl shadow-inner focus-visible:ring-2 focus-visible:ring-offset-0 transition-all",
                        theme.ring,
                      )}
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </div>

                  <Button
                    className={cn(
                      "w-full h-16 rounded-2xl font-black uppercase italic tracking-widest text-white transition-all hover:scale-[1.02] active:scale-95 shadow-xl flex items-center justify-center gap-3",
                      theme.bgPrimary,
                      theme.glow,
                    )}
                    onClick={handleRequestOtp}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        Masuk Sekarang{" "}
                        <ChevronRight size={20} strokeWidth={3} />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <button
                  onClick={() => setStep("phone")}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all group"
                >
                  <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />{" "}
                  Kembali
                </button>

                <div className="space-y-2 text-center">
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">
                    Verifikasi
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    Kode dikirim ke{" "}
                    <span className="text-blue-500">{phone}</span>
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 z-20">
                      <KeyRound className={cn("h-5 w-5", theme.primary)} />
                    </div>
                    <Input
                      placeholder="• • • • • •"
                      className={cn(
                        "h-16 pl-14 rounded-2xl bg-slate-50 dark:bg-black border-none font-black text-3xl tracking-[0.3em] text-center focus-visible:ring-2 focus-visible:ring-offset-0",
                        theme.ring,
                      )}
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>

                  <Button
                    className={cn(
                      "w-full h-16 rounded-2xl font-black uppercase italic tracking-widest text-white transition-all hover:scale-[1.02] shadow-xl flex items-center justify-center",
                      theme.bgPrimary,
                      theme.glow,
                    )}
                    onClick={handleVerifyOtp}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      "Verifikasi & Lanjut"
                    )}
                  </Button>

                  <div className="text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Tidak terima kode?
                    </p>
                    <button
                      className={cn(
                        "mt-1 text-[10px] font-black uppercase tracking-widest underline underline-offset-4",
                        theme.primary,
                      )}
                    >
                      Kirim Ulang
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Branding Footer */}
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-6 opacity-20">
            <div className="h-[1px] w-12 bg-current" />
            <Sparkles size={16} />
            <div className="h-[1px] w-12 bg-current" />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 dark:text-white leading-loose">
            Infrastructure Powered by <br />
            <span className="text-blue-600 opacity-100">
              Standardized Bookinaja Engine
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
