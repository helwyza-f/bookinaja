"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Mail, User, Phone, KeyRound, Save } from "lucide-react";
import api from "@/lib/api";
import { clearTenantSession } from "@/lib/tenant-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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
      } catch (err) {
        toast.error("Sesi telah habis, silakan login kembali");
        clearTenantSession({ keepTenantSlug: true });
        router.replace("/user/login");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
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
      toast.success("Profil berhasil diperbarui!");
      setPassword(""); // Clear password field after save
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal memperbarui profil");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-[#050505]">
        <div className="mx-auto max-w-xl space-y-6">
          <Skeleton className="h-10 w-32 rounded-xl bg-white dark:bg-white/5" />
          <Skeleton className="h-96 rounded-[2rem] bg-white dark:bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-[#050505] relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-blue-500/5 blur-3xl -z-10" />

      <div className="mx-auto max-w-xl relative z-10">
        <header className="mb-8">
          <Button asChild variant="ghost" className="mb-4 pl-0 hover:bg-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <Link href="/user/me" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter dark:text-white">
            Pengaturan Akun
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Lengkapi email dan password untuk mempermudah login Bookinaja di semua cabang.
          </p>
        </header>

        <Card className="w-full overflow-hidden rounded-[2.5rem] border-slate-200/50 bg-white/70 backdrop-blur-xl shadow-xl dark:border-white/5 dark:bg-white/[0.02]">
          <CardContent className="p-6 md:p-10">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-14 rounded-2xl pl-11 bg-white/50 dark:bg-black/20 text-md font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nomor WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={phone}
                    disabled
                    className="h-14 rounded-2xl pl-11 bg-slate-100 dark:bg-white/5 text-md font-medium text-slate-500 cursor-not-allowed"
                    title="Nomor WhatsApp tidak dapat diubah"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Email Aktif</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="h-14 rounded-2xl pl-11 bg-white/50 dark:bg-black/20 text-md font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-4 border-t border-slate-100 dark:border-white/10">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Ubah Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak ingin mengubah"
                    className="h-14 rounded-2xl pl-11 bg-white/50 dark:bg-black/20 text-md"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="h-14 w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/25 mt-4"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Save className="mr-2 h-5 w-5" />
                )}
                Simpan Perubahan
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
