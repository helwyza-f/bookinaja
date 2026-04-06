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
} from "lucide-react";
import { cn } from "@/lib/utils";

/** * Mapping tema yang sama dengan Landing Page
 * agar portal login terasa seperti bagian dari brand tenant.
 */
const THEMES: Record<string, any> = {
  gaming_hub: {
    primary: "text-blue-500",
    bgPrimary: "bg-blue-600",
    glow: "shadow-blue-500/20",
  },
  creative_space: {
    primary: "text-rose-500",
    bgPrimary: "bg-rose-600",
    glow: "shadow-rose-500/20",
  },
  sport_center: {
    primary: "text-emerald-500",
    bgPrimary: "bg-emerald-600",
    glow: "shadow-emerald-500/20",
  },
  social_space: {
    primary: "text-indigo-500",
    bgPrimary: "bg-indigo-600",
    glow: "shadow-indigo-500/20",
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

  // Fetch data tenant untuk ambil kategori bisnis (Tema)
  useEffect(() => {
    api
      .get(`/public/landing?slug=${tenantSlug}`)
      .then((res) => setTenantData(res.data))
      .catch(() => console.error("Failed to load tenant theme"));
  }, [tenantSlug]);

  const activeTheme = useMemo(() => {
    const cat = tenantData?.profile?.business_category || "social_space";
    return THEMES[cat] || THEMES.social_space;
  }, [tenantData]);

  const handleRequestOtp = async () => {
    if (!phone) return toast.error("Masukkan nomor WhatsApp");
    setLoading(true);
    try {
      await api.post("/public/customer/login", { phone });
      setStep("otp");
      toast.success("Kode OTP terkirim ke WhatsApp!");
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

      setCookie("auth_token", res.data.token, { maxAge: 60 * 60 * 72 });
      toast.success(`Selamat datang kembali, ${res.data.customer.name}!`);

      // Redirect ke /me (Subdomain routing handled by proxy.ts)
      router.push("/me");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "OTP Salah");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-[#050505] font-plus-jakarta">
      {/* Background Decor */}
      <div
        className={cn("fixed top-0 left-0 w-full h-1", activeTheme.bgPrimary)}
      />
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />

      <div className="w-full max-w-[400px] z-10 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-[10px] font-black uppercase tracking-[0.2em]",
              activeTheme.primary,
            )}
          >
            <ShieldCheck className="h-3 w-3" /> Secure Access
          </div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            {tenantData?.profile?.name || "Bookinaja"} <br />
            <span className="opacity-20 stroke-text">Customer</span>
          </h1>
        </div>

        <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] dark:shadow-none dark:bg-[#111] rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 md:p-10">
            {step === "phone" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-black italic uppercase tracking-tight">
                    Welcome Back
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Masukkan nomor WA untuk masuk
                  </p>
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Phone
                      className={cn(
                        "h-5 w-5 transition-colors",
                        activeTheme.primary,
                      )}
                    />
                  </div>
                  <Input
                    type="tel"
                    placeholder="08123456789"
                    className="h-16 pl-12 rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-bold text-lg focus-visible:ring-2 focus-visible:ring-offset-0"
                    style={
                      { "--tw-ring-color": "var(--active-primary)" } as any
                    }
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <Button
                  className={cn(
                    "w-full h-16 rounded-2xl font-black uppercase italic tracking-widest text-white transition-all hover:scale-[1.02] active:scale-95 shadow-xl",
                    activeTheme.bgPrimary,
                    activeTheme.glow,
                  )}
                  onClick={handleRequestOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Kirim Kode OTP <ChevronRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <button
                  onClick={() => setStep("phone")}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                >
                  <ArrowLeft className="h-3 w-3" /> Ganti Nomor
                </button>

                <div className="space-y-2">
                  <h3 className="text-xl font-black italic uppercase tracking-tight">
                    Verifikasi
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    Kode dikirim ke{" "}
                    <span className="text-foreground">{phone}</span>
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <KeyRound className={cn("h-5 w-5", activeTheme.primary)} />
                  </div>
                  <Input
                    placeholder="6 DIGIT"
                    className="h-16 pl-12 rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-black text-2xl tracking-[0.5em] text-center"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>

                <Button
                  className={cn(
                    "w-full h-16 rounded-2xl font-black uppercase italic tracking-widest text-white transition-all hover:scale-[1.02] shadow-xl",
                    activeTheme.bgPrimary,
                    activeTheme.glow,
                  )}
                  onClick={handleVerifyOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Verifikasi & Masuk"
                  )}
                </Button>

                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                  Tidak menerima kode?{" "}
                  <button className={cn("ml-1 underline", activeTheme.primary)}>
                    Kirim Ulang
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer info */}
        <div className="text-center space-y-4">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-20">
            Powered by Bookinaja standardized security
          </p>
          <div className="flex justify-center gap-4 opacity-30">
            <Sparkles className="h-4 w-4" />
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
