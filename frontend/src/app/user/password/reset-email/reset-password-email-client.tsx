"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
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
  const [done, setDone] = useState(false);

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
      setDone(true);
      toast.success("Password berhasil direset. Silakan login.");
      window.setTimeout(() => {
        router.replace("/user/login");
      }, 1400);
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal mereset password lewat email"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_52%,#ffffff_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_32%),linear-gradient(180deg,#050505_0%,#0b1220_100%)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <Card className="w-full rounded-[2rem] border border-[#1d4ed81a] bg-white/80 shadow-[0_32px_64px_-15px_rgba(15,23,42,0.10)] backdrop-blur-3xl dark:border-white/10 dark:bg-black/50">
          <CardContent className="space-y-6 p-6">
            <div className="space-y-3">
              <Link href="/user/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Kembali ke login
              </Link>
              <div className="inline-flex items-center rounded-full border border-[#1d4ed81f] bg-[#1d4ed80f] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#0f1f4a] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
                Bookinaja Reset
              </div>
              {done ? (
                <div className="space-y-3 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-[#0f1f4a] dark:text-slate-100">
                    Password berhasil diperbarui
                  </h1>
                  <p className="text-sm leading-6 text-slate-500">
                    Kamu akan diarahkan ke login customer untuk masuk dengan password baru.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 text-center">
                  <h1 className="text-2xl font-black tracking-tight text-[#0f1f4a] dark:text-slate-100">
                    Buat password baru
                  </h1>
                  <p className="text-sm leading-6 text-slate-500">
                    Simpan password baru yang aman supaya akun kamu tetap bisa dipakai walau akses Google atau email lama sedang bermasalah.
                  </p>
                </div>
              )}
            </div>

            {done ? (
              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                  Password baru sudah aktif. Kamu bisa login lagi dengan email dan password ini.
                </div>
                <Button asChild className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6] text-white">
                  <Link href="/user/login">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Lanjut ke login
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-[1.5rem] border border-[#1d4ed81a] bg-[#1d4ed80a] px-4 py-3 text-sm leading-6 text-slate-600 dark:border-sky-400/15 dark:bg-sky-400/5 dark:text-slate-300">
                  Setelah disimpan, password ini langsung bisa dipakai untuk login manual.
                </div>
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
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
