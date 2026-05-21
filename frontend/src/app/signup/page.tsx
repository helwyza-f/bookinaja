"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { CompactGoogleButton } from "@/components/auth/compact-google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { googleAuthAccount, signupAccount } from "@/lib/auth-client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await signupAccount({ name, email, password });
      toast.success("Akun Bookinaja dibuat.");
      router.replace("/app");
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || "Signup belum berhasil.");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleCredential(credential: string) {
    setGoogleLoading(true);
    try {
      await googleAuthAccount(credential);
      toast.success("Masuk dengan Google berhasil.");
      router.replace("/app/workspaces/new");
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || "Google signup belum berhasil.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 px-5 py-8 lg:grid-cols-[1fr_430px] lg:items-center lg:gap-16">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#10275c] text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-5xl font-semibold leading-tight tracking-normal">
              Buat akun dulu. Workspace disiapkan setelah kamu masuk.
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-600">
              Signup dibuat ringan supaya owner tidak dipaksa mengisi konfigurasi bisnis sebelum punya akun.
            </p>
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-4rem)] items-center lg:min-h-0">
          <div className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#10275c] text-white lg:hidden">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-semibold tracking-normal">Sign up</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Setelah akun aktif, kamu lanjut membuat workspace pertama.
              </p>
            </div>

            <CompactGoogleButton
              text="signup_with"
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
                <Label>Nama</Label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nama owner"
                  required
                />
              </label>
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
                  minLength={6}
                />
              </label>
              <Button type="submit" disabled={loading} className="h-10 w-full">
                {loading ? "Membuat akun..." : "Buat akun"}
                {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              Sudah punya akun?{" "}
              <Link href="/login" className="font-semibold text-[#174ea6]">
                Login
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
