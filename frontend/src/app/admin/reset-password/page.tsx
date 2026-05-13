"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCentralAdminAuthUrl } from "@/lib/tenant";

function AdminResetPasswordScreen() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [doneTenant, setDoneTenant] = useState("");
  const loginUrl = useMemo(
    () => getCentralAdminAuthUrl({ tenantSlug: doneTenant || undefined }),
    [doneTenant],
  );

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_32%),linear-gradient(180deg,#050505_0%,#0b1220_100%)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center">
        <Card className="w-full rounded-[2rem] border-0 bg-slate-950 p-2 text-white shadow-[0_40px_120px_-40px_rgba(15,23,42,0.6)]">
          <CardHeader className="space-y-4 p-5 sm:p-6">
            <Button asChild variant="ghost" className="w-fit gap-2 rounded-xl px-0 text-slate-400 hover:bg-transparent hover:text-white">
              <Link href={loginUrl}>
                <ArrowLeft className="h-4 w-4" />
                Kembali ke login
              </Link>
            </Button>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Atur password owner baru
              </CardTitle>
              <CardDescription className="mt-2 text-slate-400">
                Gunakan password manual sebagai recovery kalau nanti kamu tidak memakai Google.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="ml-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                  Password baru
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 rounded-2xl border-white/10 bg-white/5 pl-12 text-white"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="ml-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                  Konfirmasi password
                </Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-14 rounded-2xl border-white/10 bg-white/5 text-white"
                  required
                />
              </div>
              <Button className="h-14 w-full rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-500" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Simpan password owner
              </Button>
            </form>
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
