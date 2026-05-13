"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Mail, Shield } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCentralAdminAuthUrl } from "@/lib/tenant";

function AdminForgotPasswordScreen() {
  const searchParams = useSearchParams();
  const tenantSlug = (searchParams.get("tenant") || "").trim().toLowerCase();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const loginUrl = useMemo(
    () => getCentralAdminAuthUrl({ tenantSlug }),
    [tenantSlug],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post("/admin/password/reset/request", {
        email: email.trim(),
      });
      toast.success("Kalau email owner terdaftar, link reset password sudah dikirim.");
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })
        .response?.data?.error;
      toast.error(message || "Permintaan reset password owner belum berhasil.");
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
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100/10 bg-blue-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-sky-200">
              <Shield className="h-4 w-4" />
              Owner recovery
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Reset password owner
              </CardTitle>
              <CardDescription className="mt-2 text-slate-400">
                Masukkan email owner tenant. Link reset akan dikirim ke inbox yang aktif.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="ml-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                  Email owner
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@bisnis.com"
                    className="h-14 rounded-2xl border-white/10 bg-white/5 pl-12 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
              </div>
              <Button className="h-14 w-full rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-500" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Kirim link reset
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <AdminForgotPasswordScreen />
    </Suspense>
  );
}
