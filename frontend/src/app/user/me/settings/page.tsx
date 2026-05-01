"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Phone, Save, User, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { clearTenantSession } from "@/lib/tenant-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function UserSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/user/me");
        if (res.data?.customer) {
          setName(res.data.customer.name || "");
          setPhone(res.data.customer.phone || "");
          setEmail(res.data.customer.email || "");
        }
      } catch {
        toast.error("Sesi habis, silakan login lagi");
        clearTenantSession({ keepTenantSlug: true });
        router.replace("/user/login");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put("/user/me", {
        name,
        email,
        password: password || undefined,
      });
      toast.success("Pengaturan akun berhasil disimpan");
      setPassword("");
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error ===
          "string"
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : "Gagal memperbarui akun";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-[2rem] bg-white" />
        <Skeleton className="h-[420px] rounded-[2rem] bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
          Akun
        </p>
        <h1 className="text-2xl font-black uppercase tracking-[-0.04em] md:text-3xl">
          Atur akun customer kamu
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-500">
          Lengkapi data dasar, email aktif, dan password supaya login Bookinaja
          lebih gampang di kunjungan berikutnya.
        </p>
      </section>

      <Card className="overflow-hidden rounded-[2rem] border-blue-100 bg-white shadow-sm">
        <CardContent className="p-4 md:p-6">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Nama lengkap"
                icon={<User className="h-4 w-4" />}
              >
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-2xl border-slate-200 pl-11"
                />
              </Field>

              <Field
                label="Nomor WhatsApp"
                icon={<Phone className="h-4 w-4" />}
              >
                <Input
                  value={phone}
                  disabled
                  className="h-12 cursor-not-allowed rounded-2xl border-slate-200 bg-slate-100 pl-11 text-slate-500"
                  title="Nomor WhatsApp tidak dapat diubah"
                />
              </Field>
            </div>

            <Field label="Email aktif" icon={<Mail className="h-4 w-4" />}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="h-12 rounded-2xl border-slate-200 pl-11"
              />
            </Field>

            <Field
              label="Password baru"
              hint="Kosongkan jika tidak ingin mengganti password."
              icon={<KeyRound className="h-4 w-4" />}
            >
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password baru"
                className="h-12 rounded-2xl border-slate-200 pl-11"
              />
            </Field>

            <Button
              type="submit"
              disabled={saving}
              className="h-12 w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-500 md:w-auto md:px-6"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Simpan Perubahan
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  hint,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {label}
        </div>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>
        {children}
      </div>
    </div>
  );
}
