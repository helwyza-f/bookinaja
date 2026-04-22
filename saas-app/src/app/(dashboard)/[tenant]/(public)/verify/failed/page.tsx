"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const REASONS: Record<string, string> = {
  missing_code: "Kode akses tidak ditemukan di link yang kamu buka.",
  invalid_code: "Kode akses tidak valid.",
  invalid_or_expired: "Kode akses sudah kadaluarsa atau tidak bisa dipakai lagi.",
  invalid_response: "Server tidak mengembalikan data yang lengkap.",
  server_error: "Terjadi gangguan saat memverifikasi akses.",
};

export default function VerifyFailedPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "server_error";
  const description = REASONS[reason] || REASONS.server_error;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <Card className="relative w-full max-w-lg overflow-hidden border border-white/10 bg-white/5 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.18),_transparent_45%)]" />
        <div className="relative z-10 space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
            <AlertTriangle className="h-10 w-10 text-red-300" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-red-300">
              Verifikasi Gagal
            </p>
            <h1 className="text-3xl font-[1000] uppercase italic tracking-tighter">
              Link Akses Tidak Valid
            </h1>
            <p className="text-sm text-slate-300">{description}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login">
              <Button className="h-12 rounded-full bg-white text-slate-950 font-black uppercase italic tracking-widest hover:bg-slate-200 gap-2">
                <LogIn className="h-4 w-4" />
                Login Manual
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="outline"
                className="h-12 rounded-full border-white/15 bg-transparent font-black uppercase italic tracking-widest text-white hover:bg-white/10 gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
