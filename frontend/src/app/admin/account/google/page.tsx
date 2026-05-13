"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { TenantGoogleButton } from "@/components/auth/tenant-google-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCentralAdminAuthUrl, getTenantUrl } from "@/lib/tenant";

type OwnerAccountResponse = {
  tenant?: {
    slug?: string;
  };
};

function AdminGoogleConnectScreen() {
  const searchParams = useSearchParams();
  const tenantSlug = (searchParams.get("tenant") || "").trim().toLowerCase();
  const nextPath = (searchParams.get("next") || "/admin/settings/akun").trim();
  const [loading, setLoading] = useState(false);
  const loginUrl = useMemo(
    () => getCentralAdminAuthUrl({ tenantSlug, next: nextPath }),
    [nextPath, tenantSlug],
  );

  async function handleCredential(credential: string) {
    setLoading(true);
    try {
      const res = await api.post<{ data?: OwnerAccountResponse; message?: string }>(
        "/admin/account/google/link",
        { id_token: credential },
      );
      const resolvedTenant = String(res.data?.data?.tenant?.slug || tenantSlug || "");
      toast.success(res.data?.message || "Akun Google owner berhasil dihubungkan.");
      if (resolvedTenant) {
        window.location.assign(getTenantUrl(resolvedTenant, nextPath));
        return;
      }
      window.location.assign("/");
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })
        .response?.data?.error;
      toast.error(message || "Google owner belum berhasil dihubungkan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_32%),linear-gradient(180deg,#050505_0%,#0b1220_100%)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center">
        <Card className="w-full rounded-[2rem] border-0 bg-slate-950 p-2 text-white shadow-[0_40px_120px_-40px_rgba(15,23,42,0.6)]">
          <CardHeader className="space-y-4 p-5 sm:p-6">
            <Button asChild variant="ghost" className="w-fit gap-2 rounded-xl px-0 text-slate-400 hover:bg-transparent hover:text-white">
              <Link href={loginUrl}>
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100/10 bg-blue-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-sky-200">
              <Shield className="h-4 w-4" />
              Owner google
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Hubungkan atau ganti akun Google owner
              </CardTitle>
              <CardDescription className="mt-2 text-slate-400">
                Proses Google dilakukan di domain pusat, lalu owner akan diarahkan kembali ke tenant tujuan.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
            <TenantGoogleButton
              text="continue_with"
              title="Google owner"
              description="Pilih akun Google owner yang ingin dipakai untuk login tenant."
              loading={loading}
              onCredential={handleCredential}
            />
            <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-400">
              Kalau sesi owner sudah habis, login dulu dari pusat lalu kembali ke halaman ini.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminGoogleConnectPage() {
  return (
    <Suspense fallback={null}>
      <AdminGoogleConnectScreen />
    </Suspense>
  );
}
