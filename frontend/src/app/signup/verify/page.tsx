"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MailCheck, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { BookinajaAuthLogo } from "@/components/auth/bookinaja-auth-logo";
import { Button } from "@/components/ui/button";
import { requestAccountEmailVerification } from "@/lib/auth-client";

export default function SignupVerifyPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f6f8fb]" />}>
      <SignupVerifyContent />
    </Suspense>
  );
}

function SignupVerifyContent() {
  const searchParams = useSearchParams();
  const email = useMemo(() => (searchParams.get("email") || "").trim().toLowerCase(), [searchParams]);
  const sent = searchParams.get("sent") !== "0";
  const [resending, setResending] = useState(false);

  async function handleResend() {
    if (!email) {
      toast.error("Email belum tersedia untuk kirim ulang verifikasi.");
      return;
    }
    setResending(true);
    try {
      const res = await requestAccountEmailVerification(email);
      toast.success(res.message || "Link verifikasi baru sudah dikirim.");
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || "Email verifikasi belum berhasil dikirim ulang.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-5 py-8 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <BookinajaAuthLogo priority className="mb-6" />

          <div className="mb-5 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#174ea6]">
            <MailCheck className="mr-2 h-3.5 w-3.5" />
            Verifikasi email
          </div>

          <h1 className="text-2xl font-semibold tracking-normal">
            Cek inbox untuk aktivasi akun
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {sent
              ? "Akun email sudah dibuat. Buka link verifikasi yang kami kirim sebelum lanjut login."
              : "Akun email sudah dibuat, tapi link verifikasi belum sempat terkirim. Kirim ulang dari sini."}
          </p>

          {email ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Dikirim ke <span className="font-semibold text-slate-950">{email}</span>
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            <Button type="button" className="h-11 w-full" onClick={handleResend} disabled={resending || !email}>
              {resending ? "Mengirim ulang..." : "Kirim ulang email verifikasi"}
              {resending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <RotateCw className="ml-2 h-4 w-4" />}
            </Button>

            <Button asChild type="button" variant="outline" className="h-11 w-full">
              <Link href="/login?check_email=1">
                Saya sudah verifikasi, lanjut login
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <p className="mt-5 text-center text-sm text-slate-500">
            Masuk dengan Google tidak perlu langkah ini.{" "}
            <Link href="/signup" className="font-semibold text-[#174ea6]">
              Kembali ke sign up
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
