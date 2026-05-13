"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTenantUrl } from "@/lib/tenant";

function AdminVerifyEmailScreen() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const [loading, setLoading] = useState(true);
  const [tenantSlug, setTenantSlug] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        toast.error("Token verifikasi owner tidak tersedia.");
        setLoading(false);
        return;
      }
      try {
        const res = await api.post("/admin/email/verify", { token });
        setTenantSlug(String(res.data?.tenant_slug || ""));
        setSuccess(true);
        toast.success(res.data?.message || "Email owner berhasil diverifikasi.");
      } catch (error) {
        const message = (error as { response?: { data?: { error?: string } } })
          .response?.data?.error;
        toast.error(message || "Verifikasi email owner belum berhasil.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [token]);

  const targetUrl = tenantSlug
    ? getTenantUrl(tenantSlug, "/admin/settings/akun")
    : "/";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_32%),linear-gradient(180deg,#050505_0%,#0b1220_100%)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center">
        <Card className="w-full rounded-[2rem] border-0 bg-slate-950 p-2 text-white shadow-[0_40px_120px_-40px_rgba(15,23,42,0.6)]">
          <CardHeader className="space-y-4 p-5 sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100/10 bg-blue-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-sky-200">
              <MailCheck className="h-4 w-4" />
              Owner email
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                {loading ? "Memverifikasi email owner..." : success ? "Email owner sudah aktif" : "Verifikasi email belum berhasil"}
              </CardTitle>
              <CardDescription className="mt-2 text-slate-400">
                {loading
                  ? "Tunggu sebentar, kami sedang mengecek link verifikasi."
                  : success
                    ? "Kamu bisa kembali ke pengaturan akun owner untuk lanjut setup Google atau password."
                    : "Coba kirim ulang link verifikasi dari halaman akun owner."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sedang memverifikasi...
              </div>
            ) : (
              <Button asChild className="h-14 w-full rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-500">
                <a href={targetUrl}>{success ? "Kembali ke akun owner" : "Buka dashboard"}</a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminVerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <AdminVerifyEmailScreen />
    </Suspense>
  );
}
