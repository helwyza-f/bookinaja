"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { setCookie } from "cookies-next";
import { ArrowRight, Shield, Mail, Lock, Building2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTenantMismatchMessage } from "@/lib/tenant-session";

type LoginFormValues = {
  email: string;
  password: string;
};

export function PlatformLoginForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, handleSubmit } = useForm<LoginFormValues>();

  useEffect(() => {
    if (searchParams.get("reason") !== "tenant-mismatch") return;
    const message = getTenantMismatchMessage("platform");
    toast.info(message.title, {
      description: message.description,
      duration: 5000,
    });
  }, [searchParams]);

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      const res = await api.post("/platform/login", {
        email: data.email,
        password: data.password,
      });

      setCookie("auth_token", res.data.token, {
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      toast.success("Login admin pusat berhasil.");

      const next = searchParams.get("next") || "/dashboard/overview";
      router.push(next);
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })
        .response?.data?.error;
      toast.error(message || "Login gagal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-10 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8 rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-blue-700">
              <Shield className="h-4 w-4" />
              Admin pusat Bookinaja
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">
                Control Center.
              </h1>
              <p className="max-w-xl text-sm font-medium leading-7 text-slate-600">
                Masuk ke dashboard pusat untuk memonitor daftar tenant, status aktivasi,
                customer lintas tenant, dan transaksi platform.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Tenant terdaftar", "Realtime"],
                ["Customer global", "Teragregasi"],
                ["Transaksi", "Settlement ready"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</div>
                  <div className="mt-2 text-lg font-black uppercase">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <Card className="rounded-[2rem] border-0 bg-slate-950 p-2 text-white shadow-[0_40px_120px_-40px_rgba(15,23,42,0.6)]">
            <CardHeader className="space-y-4 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl font-black uppercase tracking-tight text-white">
                  Sign in
                </CardTitle>
                <CardDescription className="mt-2 text-slate-400">
                  Gunakan akun super admin Bookinaja.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label className="ml-1 text-xs font-black uppercase tracking-[0.2em] text-slate-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <Input
                      type="email"
                      placeholder="admin@bookinaja.com"
                      className="h-14 rounded-2xl border-white/10 bg-white/5 pl-12 text-white placeholder:text-slate-500"
                      {...register("email")}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="ml-1 text-xs font-black uppercase tracking-[0.2em] text-slate-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="h-14 rounded-2xl border-white/10 bg-white/5 pl-12 text-white placeholder:text-slate-500"
                      {...register("password")}
                      required
                    />
                  </div>
                </div>
                <Button
                  className="h-14 w-full rounded-2xl bg-blue-600 text-sm font-black uppercase tracking-[0.25em] text-white hover:bg-blue-500"
                  disabled={loading}
                >
                  {loading ? "Memverifikasi..." : "Masuk ke Dashboard"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
