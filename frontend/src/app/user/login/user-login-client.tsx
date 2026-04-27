"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setCookie } from "cookies-next";
import { Loader2, Phone, KeyRound, ArrowLeft, Mail, User } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UserLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  
  // Email Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Register state
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const nextPath = searchParams.get("next") || "/user/me";

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Email dan password wajib diisi");
    
    setLoading(true);
    try {
      const res = await api.post("/public/customer/login-email", { email, password });
      setCookie("customer_auth", res.data.token);
      toast.success(`Selamat datang kembali, ${res.data.customer?.name || "Customer"}!`);
      router.push(nextPath);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal masuk");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone || !regEmail || !regPassword) return toast.error("Semua field wajib diisi");
    
    setLoading(true);
    try {
      const res = await api.post("/public/customer/register", { 
        name: regName, 
        phone: regPhone.replace(/\D/g, ""), 
        email: regEmail, 
        password: regPassword 
      });
      setCookie("customer_auth", res.data.token);
      toast.success("Akun berhasil dibuat!");
      router.push(nextPath);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal mendaftar");
    } finally {
      setLoading(false);
    }
  };

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
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-purple-500/10 blur-3xl" />

      <div className="mx-auto flex w-full max-w-md flex-col z-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <User className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter dark:text-white">
            Bookinaja
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Satu akun untuk semua reservasi
          </p>
        </div>

        <Card className="w-full overflow-hidden rounded-[2rem] border-slate-200/50 bg-white/70 backdrop-blur-xl shadow-2xl dark:border-white/5 dark:bg-white/[0.02]">
          <CardContent className="p-6 md:p-8">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100 dark:bg-white/5 rounded-2xl p-1">
                <TabsTrigger value="login" className="rounded-xl text-xs font-semibold">Masuk</TabsTrigger>
                <TabsTrigger value="register" className="rounded-xl text-xs font-semibold">Daftar</TabsTrigger>
                <TabsTrigger value="otp" className="rounded-xl text-xs font-semibold">OTP</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 focus:outline-none">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="h-14 rounded-2xl pl-11 bg-white/50 dark:bg-black/20"
                      required
                    />
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="h-14 rounded-2xl pl-11 bg-white/50 dark:bg-black/20"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-14 w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-500/25"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Masuk Sekarang
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 focus:outline-none">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Nama Lengkap"
                      className="h-12 rounded-2xl pl-11 bg-white/50 dark:bg-black/20"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="Nomor WhatsApp"
                      className="h-12 rounded-2xl pl-11 bg-white/50 dark:bg-black/20"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="Email Aktif"
                      className="h-12 rounded-2xl pl-11 bg-white/50 dark:bg-black/20"
                      required
                    />
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Password"
                      className="h-12 rounded-2xl pl-11 bg-white/50 dark:bg-black/20"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-14 w-full rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-500/25 mt-2"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Buat Akun Bookinaja
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="otp" className="focus:outline-none">
                {step === "phone" ? (
                  <div className="space-y-4">
                    <p className="text-sm leading-6 text-slate-500 dark:text-slate-400 mb-2">
                      Pengguna lama tanpa password? Masuk dengan OTP WhatsApp.
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
                      Verifikasi
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
