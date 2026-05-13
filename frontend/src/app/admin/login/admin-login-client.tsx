"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  Lock,
  Mail,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTenantUrl } from "@/lib/tenant";
import {
  getTenantMismatchMessage,
  setAdminAuthCookie,
  syncTenantCookies,
} from "@/lib/tenant-session";
import { TenantGoogleButton } from "@/components/auth/tenant-google-button";

type LoginFormValues = {
  email: string;
  password: string;
};

type LoginResponse = {
  token: string;
};

function normalizeNextPath(value?: string | null, fallback = "/admin/dashboard") {
  const trimmed = (value || "").trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }
  return trimmed;
}

export function AdminLoginClient() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, handleSubmit } = useForm<LoginFormValues>();

  const tenantSlug = useMemo(
    () => (searchParams.get("tenant") || "").trim().toLowerCase(),
    [searchParams],
  );
  const nextPath = useMemo(
    () => normalizeNextPath(searchParams.get("next")),
    [searchParams],
  );

  useEffect(() => {
    if (searchParams.get("reason") !== "tenant-mismatch") return;
    const message = getTenantMismatchMessage("admin");
    toast.info(message.title, {
      description: message.description,
      duration: 5000,
    });
  }, [searchParams]);

  const onSubmit = async (data: LoginFormValues) => {
    if (!tenantSlug) {
      toast.error("Tenant bisnis belum terdeteksi. Mulai login dari halaman tenant dulu.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<LoginResponse>("/login", {
        email: data.email,
        password: data.password,
        tenant_slug: tenantSlug,
      });

      setAdminAuthCookie(res.data.token);
      syncTenantCookies(tenantSlug);
      toast.success("Login admin berhasil.");

      const plan = searchParams.get("plan");
      const interval = searchParams.get("interval");
      const welcome = searchParams.get("welcome");

      if (plan || interval) {
        const qp = new URLSearchParams();
        if (plan) qp.set("plan", plan);
        if (interval) qp.set("interval", interval);
        if (welcome) qp.set("welcome", welcome);
        router.push(
          getTenantUrl(
            tenantSlug,
            `/admin/billing${qp.toString() ? `?${qp.toString()}` : ""}`,
          ),
        );
        return;
      }

      const qp = new URLSearchParams();
      if (welcome) qp.set("welcome", welcome);
      const resolvedNext =
        qp.toString() && nextPath === "/admin/dashboard"
          ? `/admin/dashboard?${qp.toString()}`
          : nextPath;

      router.push(getTenantUrl(tenantSlug, resolvedNext));
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })
        .response?.data?.error;
      toast.error(message || "Login gagal.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (credential: string) => {
    if (!tenantSlug) {
      toast.error("Tenant bisnis belum terdeteksi. Mulai login dari halaman tenant dulu.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<LoginResponse>("/login/google", {
        id_token: credential,
        tenant_slug: tenantSlug,
      });

      setAdminAuthCookie(res.data.token);
      syncTenantCookies(tenantSlug);
      toast.success("Login Google admin berhasil.");

      const welcome = searchParams.get("welcome");
      const qp = new URLSearchParams();
      if (welcome) qp.set("welcome", welcome);
      const resolvedNext =
        qp.toString() && nextPath === "/admin/dashboard"
          ? `/admin/dashboard?${qp.toString()}`
          : nextPath;

      router.push(getTenantUrl(tenantSlug, resolvedNext));
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })
        .response?.data?.error;
      toast.error(message || "Login Google admin belum berhasil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8 text-slate-950 dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_32%),linear-gradient(180deg,#050505_0%,#0b1220_100%)] dark:text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-white/10 dark:bg-black/45 lg:p-8">
            <Button
              asChild
              variant="ghost"
              className="w-fit gap-2 rounded-xl px-0 text-slate-500 hover:bg-transparent hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <Link href="/">
                <ChevronLeft className="h-4 w-4" />
                Kembali ke Beranda
              </Link>
            </Button>

            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-blue-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
              <Shield className="h-4 w-4" />
              Admin tenant
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                Login tenant, satu jalur.
              </h1>
              <p className="max-w-lg text-sm leading-7 text-slate-600 dark:text-slate-300">
                Masuk dari domain pusat, lalu kembali ke workspace tenant yang sedang kamu buka.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Tenant", tenantSlug || "tenant"],
                ["Tujuan", nextPath],
                ["Akses", "Per tenant"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    {label}
                  </div>
                  <div className="mt-2 break-all text-sm font-bold text-slate-950 dark:text-white sm:text-base">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Card className="rounded-[2rem] border-0 bg-slate-950 p-2 text-white shadow-[0_40px_120px_-40px_rgba(15,23,42,0.6)]">
            <CardHeader className="space-y-4 p-5 sm:p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Masuk ke tenant
                </CardTitle>
                <CardDescription className="mt-2 text-slate-400">
                  {tenantSlug
                    ? `Masuk ke workspace ${tenantSlug}.`
                    : "Tenant belum terdeteksi. Buka login ini dari halaman tenant."}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
              <TenantGoogleButton
                text="continue_with"
                title="Google"
                description="Masuk cepat dengan akun Google admin."
                loading={loading}
                className="mb-6"
                onCredential={handleGoogleLogin}
              />

              <div className="mb-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  Atau manual
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label className="ml-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                    Email
                  </Label>
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
                  <Label className="ml-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <Input
                      type="password"
                      placeholder="Kata sandi admin"
                      className="h-14 rounded-2xl border-white/10 bg-white/5 pl-12 text-white placeholder:text-slate-500"
                      {...register("password")}
                      required
                    />
                  </div>
                </div>

                <Button
                  className="h-13 w-full rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-500 sm:h-14"
                  disabled={loading || !tenantSlug}
                >
                  {loading ? "Memverifikasi..." : "Masuk"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>

              <div className="mt-6 rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-400">
                Belum punya tenant?{" "}
                <Link
                  href="/register"
                  className="font-bold text-sky-300 underline underline-offset-4"
                >
                  Buat sekarang
                </Link>{" "}
                lalu kembali ke workspace yang ingin kamu buka.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
