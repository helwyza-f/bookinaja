"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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

export default function ResetPasswordEmailClient({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      toast.error("Token reset password tidak ditemukan");
      return;
    }
    if (password !== confirm) {
      toast.error("Konfirmasi password baru belum sama");
      return;
    }
    setLoading(true);
    try {
      await api.post("/public/customer/password/reset/verify-email", {
        token,
        new_password: password,
      });
      toast.success("Password berhasil direset. Silakan login.");
      router.push("/user/login");
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal mereset password lewat email"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 dark:bg-[#050505]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <Card className="w-full rounded-[2rem] border border-[#1d4ed81a] bg-white/80 shadow-[0_32px_64px_-15px_rgba(15,23,42,0.10)] backdrop-blur-3xl dark:border-white/10 dark:bg-black/50">
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center rounded-full border border-[#1d4ed81f] bg-[#1d4ed80f] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#0f1f4a] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
                Bookinaja Reset
              </div>
              <h1 className="text-2xl font-black tracking-tight text-[#0f1f4a] dark:text-slate-100">
                Buat Password Baru
              </h1>
              <p className="text-sm text-slate-500">
                Simpan password baru yang aman untuk akun Bookinaja kamu.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                  Password baru
                </span>
                <div className="relative mt-2">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#1d4ed8] dark:text-sky-300">
                  Ulangi password baru
                </span>
                <div className="relative mt-2">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1d4ed8] dark:text-sky-300" />
                  <Input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Ketik ulang password baru"
                    className="h-12 rounded-2xl border-[#1d4ed826] bg-white/90 pl-11"
                  />
                </div>
              </label>

              <Button type="submit" disabled={loading} className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] text-white">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Simpan password baru
              </Button>
            </form>

            <div className="text-center text-sm text-slate-500">
              <Link href="/user/login" className="font-semibold text-[#1d4ed8]">
                Kembali ke login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
