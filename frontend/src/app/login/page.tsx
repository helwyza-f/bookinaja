"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { BookinajaAuthLogo } from "@/components/auth/bookinaja-auth-logo";
import { CompactGoogleButton } from "@/components/auth/compact-google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAccountMe, googleAuthAccount, loginAccount } from "@/lib/auth-client";
import { clearTenantSession } from "@/lib/tenant-session";

function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("signed_out") !== "1") return;
    clearTenantSession();
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("verified") !== "1") return;
    toast.success("Email sudah terverifikasi. Silakan login.");
  }, [searchParams]);

  function resolveSafePostLoginNext() {
    const rawNext = (searchParams.get("next") || "").trim();
    if (!rawNext) return "";

    try {
      const parsed = new URL(rawNext, window.location.origin);
      if (parsed.pathname === "/admin" || parsed.pathname.startsWith("/admin/")) {
        return "";
      }
      if (parsed.origin !== window.location.origin) {
        return "";
      }
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return "";
    }
  }

  async function resolvePostLoginHref() {
    const next = resolveSafePostLoginNext();
    try {
      const me = await getAccountMe();
      if (me.workspaces.length === 0) {
        return "/app/workspaces/new";
      }
      return next || "/app/workspaces";
    } catch {
      return next || "/app/workspaces";
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await loginAccount({ email, password });
      toast.success("Masuk ke akun Bookinaja berhasil.");
      router.replace(await resolvePostLoginHref());
    } catch (error) {
      const response = (error as { response?: { data?: { error?: string; code?: string } } })?.response?.data;
      const message = response?.error;
      if (response?.code === "email_not_verified") {
        toast.error(message || "Email akun belum diverifikasi.");
        router.push(`/signup/verify?email=${encodeURIComponent(email)}`);
        return;
      }
      toast.error(message || "Login belum berhasil.");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleCredential(credential: string) {
    setGoogleLoading(true);
    try {
      await googleAuthAccount(credential);
      toast.success("Masuk dengan Google berhasil.");
      router.replace(await resolvePostLoginHref());
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || "Google login belum berhasil.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_52%,#ffffff_100%)] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 px-4 py-6 sm:px-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:gap-16">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <BookinajaAuthLogo priority className="mb-6" />
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              Secure workspace access
            </div>
            <h1 className="text-5xl font-semibold leading-tight tracking-tight">
              Masuk, pilih workspace, lanjut operasional.
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-600">
              Satu akun Bookinaja bisa mengelola beberapa workspace. Area admin tetap memakai subdomain workspace supaya konteks bisnis selalu jelas.
            </p>
            <div className="mt-8 grid gap-3">
              {["Akses multi-workspace", "Login Google atau email", "Session tenant tetap terpisah"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-3rem)] items-center lg:min-h-0">
          <div className="w-full overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/92 p-5 shadow-[0_24px_80px_-34px_rgba(15,23,42,0.38)] backdrop-blur sm:p-6">
            <div className="mb-6">
              <BookinajaAuthLogo className="mb-4 lg:hidden" />
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
                Bookinaja account
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">Login akun</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Gunakan akun global untuk masuk ke workspace yang kamu kelola.
              </p>
            </div>

            <CompactGoogleButton
              text="continue_with"
              loading={googleLoading}
              onCredential={onGoogleCredential}
            />

            <div className="my-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              Email
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="owner@bisnis.com"
                  className="text-slate-950 placeholder:text-slate-400 dark:border-slate-200 dark:bg-white dark:text-slate-950 dark:placeholder:text-slate-400"
                  required
                />
              </label>
              <label className="block space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="text-slate-950 placeholder:text-slate-400 dark:border-slate-200 dark:bg-white dark:text-slate-950 dark:placeholder:text-slate-400"
                  required
                />
              </label>
              <Button type="submit" disabled={loading} className="h-12 w-full rounded-2xl text-sm font-bold shadow-[0_14px_30px_rgba(37,99,235,0.22)]">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? "Memverifikasi..." : "Masuk"}
                {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              Belum punya akun?{" "}
              <Link href="/signup" className="font-semibold text-blue-700">
                Sign up
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f8fb]" />}>
      <LoginScreen />
    </Suspense>
  );
}
