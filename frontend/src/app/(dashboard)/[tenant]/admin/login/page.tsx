"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { setCookie } from "cookies-next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";
import { Lock, Mail, ArrowRight, ChevronLeft } from "lucide-react";
import api from "@/lib/api";
import {
  getTenantMismatchMessage,
  syncTenantCookies,
} from "@/lib/tenant-session";

type LoginForm = {
  email: string;
  password: string;
};

type LoginResponse = {
  token: string;
  user?: {
    role?: string;
    tenant_id?: string;
  };
};

export default function TenantLoginPage() {
  const [loading, setLoading] = useState(false);
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, handleSubmit } = useForm<LoginForm>();
  const tenantSlug = params.tenant as string;

  useEffect(() => {
    if (searchParams.get("reason") !== "tenant-mismatch") return;
    const message = getTenantMismatchMessage("admin");
    toast.info(message.title, {
      description: message.description,
      duration: 5000,
    });
  }, [searchParams]);

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>("/login", {
        email: data.email,
        password: data.password,
        tenant_slug: tenantSlug,
      });

      setCookie("auth_token", res.data.token, {
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      syncTenantCookies(tenantSlug);
      toast.success("Login Berhasil!");

      const plan = searchParams.get("plan");
      const interval = searchParams.get("interval");
      const welcome = searchParams.get("welcome");
      if (plan || interval) {
        const qp = new URLSearchParams();
        if (plan) qp.set("plan", plan);
        if (interval) qp.set("interval", interval);
        if (welcome) qp.set("welcome", welcome);
        router.push(`/admin/billing?${qp.toString()}`);
      } else {
        const qp = new URLSearchParams();
        if (welcome) qp.set("welcome", welcome);
        router.push(qp.toString() ? `/admin/dashboard?${qp.toString()}` : "/admin/dashboard");
      }
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response
          ?.data?.error === "string"
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
          : "Login Gagal.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#050505] px-4 relative overflow-hidden transition-colors duration-500">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/20 dark:bg-blue-600/10 mix-blend-multiply dark:mix-blend-screen filter blur-[128px] opacity-70 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/20 dark:bg-violet-600/10 mix-blend-multiply dark:mix-blend-screen filter blur-[128px] opacity-70 pointer-events-none" />

      {/* Fallback Link */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-50">
        <Button
          asChild
          variant="ghost"
          className="gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 rounded-xl transition-colors"
        >
          <Link href={`/`}>
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Kembali ke Beranda</span>
          </Link>
        </Button>
      </div>

      <Card className="w-full max-w-[420px] relative z-10 border border-slate-200/50 dark:border-white/10 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-4 sm:p-6 bg-white/70 dark:bg-black/50 backdrop-blur-3xl">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/20">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Admin Login
            </CardTitle>
            <CardDescription className="font-bold uppercase text-blue-600 dark:text-blue-400 text-xs tracking-[0.2em] mt-2">
              Panel {tenantSlug}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label className="font-bold ml-1 text-slate-700 dark:text-slate-300">
                Email Admin
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="email"
                  placeholder="admin@email.com"
                  className="h-14 pl-12 rounded-2xl border-slate-200/50 dark:border-white/10 bg-white dark:bg-white/5 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-blue-500 transition-all"
                  {...register("email")}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold ml-1 text-slate-700 dark:text-slate-300">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="h-14 pl-12 rounded-2xl border-slate-200/50 dark:border-white/10 bg-white dark:bg-white/5 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-blue-500 transition-all"
                  {...register("password")}
                  required
                />
              </div>
            </div>
            <div className="pt-2">
              <Button
                className="w-full h-14 rounded-2xl bg-blue-600 text-lg font-bold shadow-xl shadow-blue-600/20 hover:bg-blue-700 text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? "Memverifikasi..." : "Masuk ke Dashboard"}
                {!loading && <ArrowRight className="h-5 w-5" />}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
