"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
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
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 px-5 py-8 lg:grid-cols-[1fr_420px] lg:items-center lg:gap-16">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <BookinajaAuthLogo priority className="mb-6" />
            <h1 className="text-5xl font-semibold leading-tight tracking-normal">
              Masuk ke akun, pilih workspace, lanjut operasional.
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-600">
              Satu akun Bookinaja bisa mengelola beberapa workspace. Area admin tetap memakai subdomain workspace supaya konteks bisnis selalu jelas.
            </p>
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-4rem)] items-center lg:min-h-0">
          <div className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <BookinajaAuthLogo className="mb-4 lg:hidden" />
              <h2 className="text-2xl font-semibold tracking-normal">Login akun</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Gunakan akun global Bookinaja.
              </p>
            </div>

            <CompactGoogleButton
              text="continue_with"
              loading={googleLoading}
              onCredential={onGoogleCredential}
            />

            <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              atau pakai email
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
              <Button type="submit" disabled={loading} className="h-10 w-full">
                {loading ? "Memverifikasi..." : "Masuk"}
                {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              Belum punya akun?{" "}
              <Link href="/signup" className="font-semibold text-[#174ea6]">
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
