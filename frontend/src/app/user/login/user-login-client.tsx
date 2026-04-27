"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setCookie } from "cookies-next";
import { Loader2, KeyRound, Mail, User, Phone, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";

export default function UserLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
            Silakan masuk untuk melanjutkan reservasi
          </p>
        </div>

        <Card className="w-full overflow-hidden rounded-[2rem] border-slate-200/50 bg-white/70 backdrop-blur-xl shadow-2xl dark:border-white/5 dark:bg-white/[0.02]">
          <CardContent className="p-6 md:p-8">
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

            <div className="mt-8 space-y-4">
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
                <span className="flex-shrink mx-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Atau</span>
                <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
              </div>

              <Link href="/user/login/phone">
                <Button
                  variant="outline"
                  className="h-14 w-full rounded-2xl border-slate-200 bg-white/50 text-slate-900 hover:bg-slate-100 dark:border-white/10 dark:bg-black/20 dark:text-white dark:hover:bg-black/40"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Masuk dengan WhatsApp
                </Button>
              </Link>

              <div className="pt-4 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Belum punya akun?{" "}
                  <Link href="/user/register" className="font-bold text-blue-600 hover:underline">
                    Daftar di sini
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
            Beranda
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

