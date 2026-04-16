"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { setCookie } from "cookies-next";
import { toast } from "sonner";
import { ArrowRight, Lock, Mail } from "lucide-react";
import api from "@/lib/api";
import { syncTenantCookies } from "@/lib/tenant-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RootAdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register, handleSubmit } = useForm();
  const platformSlug =
    process.env.NEXT_PUBLIC_PLATFORM_TENANT_SLUG || "bookinaja";

  useEffect(() => {
    syncTenantCookies(platformSlug, null);
  }, [platformSlug]);

  const onSubmit = async (data: { email?: string; password?: string }) => {
    setLoading(true);
    try {
      const res = await api.post("/platform/login", {
        email: data.email,
        password: data.password,
      });

      setCookie("auth_token", res.data.token, { maxAge: 60 * 60 * 24 * 7, path: "/" });
      syncTenantCookies(platformSlug, null);
      toast.success("Login berhasil");

      const searchParams = new URLSearchParams(window.location.search);
      const plan = searchParams.get("plan");
      const interval = searchParams.get("interval");
      if (plan || interval) {
        const qp = new URLSearchParams();
        if (plan) qp.set("plan", plan);
        if (interval) qp.set("interval", interval);
        router.push(`/dashboard/billing?${qp.toString()}`);
      } else {
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error && "response" in error
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
          : null;
      toast.error(message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-[420px] border-none shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] rounded-[2.5rem] p-4">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/20">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-black tracking-tight">
              Admin Login
            </CardTitle>
            <CardDescription className="font-bold uppercase text-blue-600 text-xs tracking-[0.2em] mt-2">
              Bookinaja Platform
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label className="font-bold ml-1">Email Admin</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input type="email" className="h-13 pl-12 rounded-xl border-slate-200" {...register("email")} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold ml-1">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input type="password" className="h-13 pl-12 rounded-xl border-slate-200" {...register("password")} required />
              </div>
            </div>
            <Button className="w-full h-14 rounded-2xl bg-blue-600 text-lg font-bold shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95" disabled={loading}>
              {loading ? "Memverifikasi..." : "Masuk ke Dashboard"}
              {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
