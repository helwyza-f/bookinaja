"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { ArrowRight, LogIn } from "lucide-react";
import { toast } from "sonner";
import { CompactGoogleButton } from "@/components/auth/compact-google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { googleAuthAccount, loginAccount } from "@/lib/auth-client";
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await loginAccount({ email, password });
      toast.success("Masuk ke akun Bookinaja berhasil.");
      router.replace(searchParams.get("next") || "/app");
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
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
      router.replace(searchParams.get("next") || "/app");
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
            <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#10275c] text-white">
              <LogIn className="h-5 w-5" />
            </div>
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
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#10275c] text-white lg:hidden">
                <LogIn className="h-5 w-5" />
              </div>
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
