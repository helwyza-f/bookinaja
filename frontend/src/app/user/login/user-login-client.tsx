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

export default function UserLoginClient() {
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
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Gagal mengirim OTP";
      toast.error(message);
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
    <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-[#050505]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <Card className="w-full overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-2xl dark:border-white/5 dark:bg-white/[0.03]">
          <CardContent className="p-6 md:p-8">
            {step === "phone" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="text-[9px] font-black uppercase tracking-[0.35em] text-blue-600">
                    Customer Login
                  </div>
                  <h1 className="text-3xl font-black italic uppercase tracking-tighter dark:text-white">
                    Masuk pakai nomor WhatsApp
                  </h1>
                  <p className="text-sm leading-7 text-slate-500 dark:text-slate-400">
                    Akun customer tetap global. OTP dipakai sebagai pintu masuk awal.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="08..."
                      className="h-14 rounded-2xl pl-11"
                    />
                  </div>

                  <Button
                    onClick={handleRequestOtp}
                    disabled={loading}
                    className="h-14 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Kirim OTP
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <button
                  onClick={() => setStep("phone")}
                  className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Kembali
                </button>

                <div className="space-y-2">
                  <div className="text-[9px] font-black uppercase tracking-[0.35em] text-blue-600">
                    OTP Verification
                  </div>
                  <h1 className="text-3xl font-black italic uppercase tracking-tighter dark:text-white">
                    Masukkan kode
                  </h1>
                  <p className="text-sm leading-7 text-slate-500 dark:text-slate-400">
                    Kode 6 digit dikirim ke <span className="font-mono">{phone}</span>.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="••••••"
                      className="h-14 rounded-2xl pl-11 tracking-[0.35em]"
                    />
                  </div>

                  <Button
                    onClick={handleVerifyOtp}
                    disabled={loading}
                    className="h-14 w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-500"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Masuk
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-[11px] leading-7 text-slate-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
              Password bisa ditambahkan nanti di menu settings customer setelah akun aktif.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
