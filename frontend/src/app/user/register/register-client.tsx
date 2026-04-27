"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setCookie } from "cookies-next";
import { Loader2, Phone, KeyRound, Mail, User, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const nextPath = searchParams.get("next") || "/user/me";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !email || !password) return toast.error("Semua field wajib diisi");
    
    setLoading(true);
    try {
      const res = await api.post("/public/customer/register", { 
        name, 
        phone: phone.replace(/\D/g, ""), 
        email, 
        password 
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

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-[#050505] flex flex-col justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="mx-auto flex w-full max-w-md flex-col z-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-lg">
            <User className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter dark:text-white">
            Daftar Akun
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Mulai reservasi dengan akun Bookinaja
          </p>
        </div>

        <Card className="w-full overflow-hidden rounded-[2rem] border-slate-200/50 bg-white/70 backdrop-blur-xl shadow-2xl dark:border-white/5 dark:bg-white/[0.02]">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="h-12 rounded-2xl pl-11 bg-white/50 dark:bg-black/20"
                  required
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Nomor WhatsApp"
                  className="h-12 rounded-2xl pl-11 bg-white/50 dark:bg-black/20"
                  required
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Aktif"
                  className="h-12 rounded-2xl pl-11 bg-white/50 dark:bg-black/20"
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
                Buat Akun Sekarang
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sudah punya akun?{" "}
                <Link href="/user/login" className="font-bold text-indigo-600 hover:underline">
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
