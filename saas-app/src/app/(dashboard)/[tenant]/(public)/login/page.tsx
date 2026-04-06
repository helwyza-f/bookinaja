"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { setCookie } from "cookies-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Phone, KeyRound } from "lucide-react";

export default function CustomerLoginPage() {
  const { tenant } = useParams();
  const router = useRouter();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Minta OTP
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

  // 2. Verifikasi OTP & Save Session
  const handleVerifyOtp = async () => {
    if (otp.length < 6) return toast.error("Kode OTP harus 6 digit");
    setLoading(true);
    try {
      const res = await api.post("/public/customer/verify", {
        phone,
        code: otp,
      });

      // Simpan token di cookie (72 jam sesuai backend)
      setCookie("auth_token", res.data.token, { maxAge: 60 * 60 * 72 });

      toast.success(`Selamat datang kembali, ${res.data.customer.name}!`);
      router.push(`/${tenant}/me`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "OTP Salah");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Portal Customer
          </CardTitle>
          <CardDescription>
            {step === "phone"
              ? "Masukkan nomor WhatsApp untuk masuk"
              : `Masukkan kode OTP yang dikirim ke ${phone}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "phone" ? (
            <div className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Contoh: 0812xxx"
                  className="pl-10"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleRequestOtp}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kirim Kode OTP
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="6 Digit OTP"
                  className="pl-10 text-center tracking-[1em] font-bold"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleVerifyOtp}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verifikasi & Masuk
              </Button>
              <Button
                variant="ghost"
                className="w-full text-xs"
                onClick={() => setStep("phone")}
              >
                Ganti Nomor HP
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
