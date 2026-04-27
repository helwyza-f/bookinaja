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
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal mengirim OTP");
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

      setCookie("customer_auth", res.data.token);
      toast.success(`Selamat datang, ${res.data.customer?.name || "Customer"}!`);
      router.push(nextPath);
    } catch {
      toast.error("Kode OTP salah atau sudah kedaluwarsa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-[#050505] flex flex-col justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-slate-900/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-slate-900/5 blur-3xl" />

      <div className="mx-auto flex w-full max-w-md flex-col z-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg">
            <Phone className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter dark:text-white">
            Masuk WhatsApp
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gunakan kode OTP untuk akses instan
          </p>
        </div>

        <Card className="w-full overflow-hidden rounded-[2rem] border-slate-200/50 bg-white/70 backdrop-blur-xl shadow-2xl dark:border-white/5 dark:bg-white/[0.02]">
          <CardContent className="p-6 md:p-8">
            {step === "phone" ? (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-400 mb-2">
                  Masukkan nomor WhatsApp yang terdaftar untuk menerima kode verifikasi.
                </p>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="08..."
                    className="h-14 rounded-2xl pl-11 bg-white/50 dark:bg-black/20"
                  />
                </div>
                <Button
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className="h-14 w-full rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Kirim Kode OTP
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => setStep("phone")}
                  className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Ganti Nomor
                </button>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="••••••"
                    className="h-14 rounded-2xl pl-11 tracking-[0.35em] bg-white/50 dark:bg-black/20 font-mono text-lg"
                  />
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className="h-14 w-full rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Verifikasi OTP
                </Button>
              </div>
            )}

            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Punya email & password?{" "}
                <Link href="/user/login" className="font-bold text-slate-900 dark:text-white hover:underline">
                  Masuk di sini
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <Link
            href="/user/login"
            className="flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-wider">Kembali</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
