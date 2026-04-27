"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { clearTenantSession, isTenantAuthError } from "@/lib/tenant-session";

type Customer = {
  name?: string;
  phone?: string;
  email?: string | null;
};

export default function UserSettingsPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await api.get("/user/me");
        if (!active) return;
        const current = res.data?.customer || {};
        setCustomer(current);
        setForm({
          name: current.name || "",
          email: current.email || "",
          password: "",
        });
      } catch (error) {
        if (isTenantAuthError(error)) {
          clearTenantSession({ keepTenantSlug: true });
        }
        router.replace("/user/login");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/user/me", {
        name: form.name,
        email: form.email || null,
        password: form.password || null,
      });
      toast.success("Profil customer diperbarui");
      setForm((prev) => ({ ...prev, password: "" }));
      router.refresh();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Gagal menyimpan profil";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-2xl px-4 py-10 text-slate-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-[#050505]">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.35em] text-blue-600">
            Customer Settings
          </div>
          <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tighter dark:text-white">
            Email & Password
          </h1>
        </div>

        <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.03]">
          <CardContent className="space-y-4 p-5">
            <div className="space-y-2">
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nama customer"
                className="h-12 rounded-2xl"
              />
              <Input
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                type="email"
                className="h-12 rounded-2xl"
              />
              <Input
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Password baru"
                type="password"
                className="h-12 rounded-2xl"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-12 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
              Nomor WhatsApp yang dipakai saat silent register:{" "}
              <span className="font-mono">{customer?.phone || "-"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
