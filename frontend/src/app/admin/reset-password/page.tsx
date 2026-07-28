"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCentralAdminAuthUrl } from "@/lib/tenant";

function AdminResetPasswordScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [doneTenant, setDoneTenant] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const loginUrl = useMemo(
    () => getCentralAdminAuthUrl({ tenantSlug: doneTenant || undefined }),
    [doneTenant],
  );

  useEffect(() => {
    if (!doneTenant) return;
    setRedirecting(true);
    const timeout = window.setTimeout(() => {
      router.replace(loginUrl);
    }, 1400);
    return () => window.clearTimeout(timeout);
  }, [doneTenant, loginUrl, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      toast.error("Token reset password owner tidak tersedia.");
      return;
    }
    if (password.trim().length < 6) {
      toast.error("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Konfirmasi password belum cocok.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/admin/password/reset/verify", {
        token,
        new_password: password,
      });
      setDoneTenant(String(res.data?.tenant_slug || ""));
      toast.success(res.data?.message || "Password owner berhasil diperbarui.");
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })
        .response?.data?.error;
      toast.error(message || "Reset password owner belum berhasil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.14),_transparent_34%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_56%,#ffffff_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_32%),linear-gradient(180deg,#050505_0%,#0b1220_100%)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center">
        <Card className="w-full rounded-[2rem] border border-slate-200 bg-white/92 p-2 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.32)] backdrop-blur dark:border-white/10 dark:bg-slate-950/88 dark:text-white">
          <CardHeader className="space-y-4 p-5 sm:p-6">
            <Button asChild variant="ghost" className="w-fit gap-2 rounded-xl px-0 text-slate-500 hover:bg-transparent hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
              <Link href={loginUrl}>
                <ArrowLeft className="h-4 w-4" />
                Kembali ke login
              </Link>
            </Button>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Recovery owner
            </div>
            {doneTenant ? (
              <div className="space-y-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    Password berhasil diperbarui
                  </CardTitle>
                  <CardDescription className="mt-2 text-slate-600 dark:text-slate-300">
                    Kamu akan diarahkan ke login owner supaya bisa masuk lagi dengan password baru.
                  </CardDescription>
                </div>
              </div>
            ) : (
              <div>
                <CardTitle className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  Atur password owner baru
                </CardTitle>
                <CardDescription className="mt-2 text-slate-600 dark:text-slate-300">
                  Gunakan password manual sebagai jalur cadangan kalau akses Google sedang tidak bisa dipakai.
                </CardDescription>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
            {doneTenant ? (
              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                  Password owner baru sudah aktif. Login manual sekarang bisa dipakai sebagai fallback.
                </div>
                <Button asChild className="h-14 w-full rounded-2xl bg-blue-600 font-bold text-white hover:bg-blue-500">
                  <Link href={loginUrl}>
                    {redirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Lanjut ke login owner
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  Setelah ini kamu bisa login pakai email owner dan password baru, tanpa wajib masuk lewat Google.
                </div>
                <div className="space-y-2">
                  <Label className="ml-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                    Password baru
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="h-14 rounded-2xl border-slate-200 bg-white pl-12 text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="ml-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                    Konfirmasi password
                  </Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password baru"
                    className="h-14 rounded-2xl border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    required
                  />
                </div>
                <Button className="h-14 w-full rounded-2xl bg-blue-600 font-bold text-white hover:bg-blue-500" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Simpan password owner
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <AdminResetPasswordScreen />
    </Suspense>
  );
}
