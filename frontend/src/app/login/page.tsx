"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BookinajaAuthLogo } from "@/components/auth/bookinaja-auth-logo";
import { CompactGoogleButton } from "@/components/auth/compact-google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAccountMe, googleAuthAccount, loginAccount } from "@/lib/auth-client";
import { clearTenantSession } from "@/lib/tenant-session";
import { getCentralAdminForgotPasswordUrl } from "@/lib/tenant";

function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const forgotPasswordUrl = getCentralAdminForgotPasswordUrl();

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
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center">
        <section className="w-full">
          <Button
            asChild
            variant="ghost"
            className="mb-4 w-fit gap-2 rounded-xl px-0 text-slate-500 hover:bg-transparent hover:text-slate-900"
          >
            <Link href="/">
              <ChevronLeft className="h-4 w-4" />
              <span>Kembali</span>
            </Link>
          </Button>
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 space-y-4">
              <BookinajaAuthLogo priority />
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Masuk</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Gunakan akun Bookinaja kamu.
                </p>
              </div>
            </div>

            <CompactGoogleButton
              text="continue_with"
              loading={googleLoading}
              onCredential={onGoogleCredential}
            />

            <div className="my-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              atau
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
              <div className="-mt-2 flex justify-end">
                <Link
                  href={forgotPasswordUrl}
                  className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
                >
                  Lupa password?
                </Link>
              </div>
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
