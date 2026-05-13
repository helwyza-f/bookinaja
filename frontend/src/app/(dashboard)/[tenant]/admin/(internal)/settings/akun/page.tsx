"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  ShieldAlert,
  Trash2,
  UserCog,
} from "lucide-react";
import api from "@/lib/api";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { clearTenantSession } from "@/lib/tenant-session";
import {
  getCentralAdminForgotPasswordUrl,
  getCentralAdminGoogleConnectUrl,
} from "@/lib/tenant";

type OwnerAccountResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    email_verified_at?: string | null;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  auth: {
    google_linked: boolean;
    has_password: boolean;
    password_setup_required: boolean;
    email_verified: boolean;
    email_verified_at?: string | null;
  };
};

const emptyAccount: OwnerAccountResponse = {
  user: {
    id: "",
    name: "",
    email: "",
    role: "owner",
    email_verified_at: null,
  },
  tenant: {
    id: "",
    name: "",
    slug: "",
  },
  auth: {
    google_linked: false,
    has_password: false,
    password_setup_required: false,
    email_verified: false,
    email_verified_at: null,
  },
};

export default function OwnerAccountSettingsPage() {
  const { user: sessionUser, tenantName } = useAdminSession();
  const [data, setData] = useState<OwnerAccountResponse>(emptyAccount);
  const [loading, setLoading] = useState(true);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [sendingVerify, setSendingVerify] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const fetchAccount = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<OwnerAccountResponse>("/admin/account");
      const payload = res.data || emptyAccount;
      setData(payload);
      setName(payload.user.name || "");
      setEmail(payload.user.email || "");
    } catch {
      toast.error("Gagal memuat akun owner");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAccount();
  }, [fetchAccount]);

  const tenantSlug = data.tenant.slug || "";
  const draftEmail = email.trim().toLowerCase();
  const emailChanged =
    draftEmail !== "" &&
    draftEmail !== String(data.user.email || "").trim().toLowerCase();
  const googleConnectUrl = useMemo(
    () =>
      getCentralAdminGoogleConnectUrl({
        tenantSlug,
        next: "/admin/settings/akun",
      }),
    [tenantSlug],
  );
  const forgotPasswordUrl = useMemo(
    () => getCentralAdminForgotPasswordUrl({ tenantSlug }),
    [tenantSlug],
  );

  async function handleSaveIdentity() {
    if (!name.trim() || !email.trim()) {
      toast.error("Nama dan email owner wajib diisi");
      return;
    }
    setSavingIdentity(true);
    try {
      const res = await api.put("/admin/account/identity", {
        name: name.trim(),
        email: email.trim(),
      });
      const nextData = (res.data?.data || data) as OwnerAccountResponse;
      setData(nextData);
      setName(nextData.user.name || "");
      setEmail(nextData.user.email || "");
      toast.success(
        emailChanged
          ? "Identitas owner disimpan. Verifikasi email baru dari halaman ini."
          : "Identitas owner berhasil diperbarui",
      );
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })
        .response?.data?.error;
      toast.error(message || "Gagal memperbarui identitas owner");
    } finally {
      setSavingIdentity(false);
    }
  }

  async function handleSendVerification() {
    setSendingVerify(true);
    try {
      await api.post("/admin/account/email/verify/request", {
        email: email.trim(),
      });
      toast.success("Link verifikasi email owner sudah dikirim");
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })
        .response?.data?.error;
      toast.error(message || "Gagal mengirim verifikasi email owner");
    } finally {
      setSendingVerify(false);
    }
  }

  async function handleSavePassword() {
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password baru belum cocok");
      return;
    }
    setSavingPassword(true);
    try {
      if (data.auth.password_setup_required || !data.auth.has_password) {
        await api.post("/admin/account/password/setup", {
          new_password: newPassword,
        });
      } else {
        if (!currentPassword.trim()) {
          toast.error("Password saat ini wajib diisi");
          setSavingPassword(false);
          return;
        }
        await api.post("/admin/account/password/change", {
          current_password: currentPassword,
          new_password: newPassword,
        });
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password owner berhasil diperbarui");
      await fetchAccount();
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })
        .response?.data?.error;
      toast.error(message || "Gagal menyimpan password owner");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (!tenantSlug || deleteConfirmText.trim() !== tenantSlug) {
      toast.error("Ketik slug tenant dengan benar sebelum menghapus akun owner");
      return;
    }
    setDeleting(true);
    try {
      await api.delete("/admin/account", {
        data: {
          confirm_text: deleteConfirmText.trim(),
          current_password: deletePassword,
        },
      });
      clearTenantSession();
      toast.success("Akun owner dihapus. Sesi dibersihkan.");
      window.location.assign("/");
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })
        .response?.data?.error;
      toast.error(message || "Akun owner belum bisa dihapus");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-[1.75rem]" />
        <Skeleton className="h-72 rounded-[1.75rem]" />
        <Skeleton className="h-56 rounded-[1.75rem]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <Card className="rounded-[1.75rem] border-slate-200/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94))] p-5 shadow-sm dark:border-white/12 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(8,47,73,0.94))]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--bookinaja-200)] bg-[var(--bookinaja-50)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--bookinaja-700)] dark:border-[rgba(96,165,250,0.24)] dark:bg-[rgba(59,130,246,0.14)] dark:text-[var(--bookinaja-100)]">
              <UserCog className="h-3.5 w-3.5" />
              Akun Owner
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Satu tempat untuk akses owner
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Rapikan email login, verifikasi email, setup password manual, lalu
              hubungkan atau ganti akun Google tanpa keluar dari flow bisnis.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-full border-none bg-slate-900 text-white dark:bg-white dark:text-slate-950">
              {sessionUser?.role || "owner"}
            </Badge>
            <Badge className="rounded-full border-none bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
              {tenantName || data.tenant.name || "Tenant"}
            </Badge>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_400px]">
        <div className="space-y-4">
          <Card className="rounded-[1.75rem] border-slate-200/90 p-5 shadow-sm dark:border-white/12 dark:bg-[#0f172a]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">
                  Identitas owner
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Email ini dipakai untuk login manual, recovery, dan notifikasi keamanan.
                </p>
              </div>
              {data.auth.email_verified ? (
                <Badge className="rounded-full border-none bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Verified
                </Badge>
              ) : (
                <Badge className="rounded-full border-none bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                  Belum verified
                </Badge>
              )}
            </div>

            <div className="mt-5 grid gap-4">
              <div className="space-y-2">
                <Label>Nama owner</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Email owner</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="h-11 rounded-xl" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                {emailChanged
                  ? "Email baru masih draft. Simpan dulu, lalu kirim verifikasi untuk mengaktifkan email ini."
                  : data.auth.email_verified
                    ? "Email owner sudah terverifikasi dan aman dipakai untuk login serta recovery."
                    : "Verifikasi email owner dulu supaya forgot password dan recovery tetap aman."}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void handleSaveIdentity()} disabled={savingIdentity} className="rounded-xl">
                  {savingIdentity ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Simpan identitas
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleSendVerification()}
                  disabled={sendingVerify || !email.trim() || emailChanged}
                  className="rounded-xl"
                >
                  {sendingVerify ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  {data.auth.email_verified && !emailChanged ? "Kirim ulang verifikasi" : "Kirim verifikasi"}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="rounded-[1.75rem] border-slate-200/90 p-5 shadow-sm dark:border-white/12 dark:bg-[#0f172a]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">
                  Password owner
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Owner yang awalnya masuk lewat Google tetap bisa punya password cadangan.
                </p>
              </div>
              <Badge className="rounded-full border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                {data.auth.password_setup_required || !data.auth.has_password ? "Perlu setup" : "Aktif"}
              </Badge>
            </div>

            <div className="mt-5 grid gap-4">
              {!data.auth.password_setup_required && data.auth.has_password ? (
                <div className="space-y-2">
                  <Label>Password saat ini</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>{data.auth.password_setup_required || !data.auth.has_password ? "Password baru" : "Password pengganti"}</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Konfirmasi password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void handleSavePassword()} disabled={savingPassword} className="rounded-xl">
                  {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  {data.auth.password_setup_required || !data.auth.has_password ? "Setup password" : "Ganti password"}
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <a href={forgotPasswordUrl}>Lupa password</a>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-[1.75rem] border-slate-200/90 p-5 shadow-sm dark:border-white/12 dark:bg-[#0f172a]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">
                  Google owner
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Semua flow Google dilakukan di domain pusat lalu owner diarahkan balik ke tenant ini.
                </p>
              </div>
              <Badge className="rounded-full border-none bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                {data.auth.google_linked ? "Terhubung" : "Belum terhubung"}
              </Badge>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {data.auth.google_linked
                  ? "Kalau kamu mau ganti akun Google owner, lanjutkan dari pusat lalu pilih akun Google baru."
                  : "Hubungkan Google supaya login owner lebih cepat dan tetap punya email recovery yang rapi."}
              </div>
              <Button asChild className="mt-4 w-full rounded-xl">
                <a href={googleConnectUrl}>
                  {data.auth.google_linked ? "Ganti akun Google" : "Hubungkan Google"}
                  <ArrowRightLeft className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </Card>

          <Card className="rounded-[1.75rem] border-rose-200/80 p-5 shadow-sm dark:border-rose-500/20 dark:bg-[#19090b]">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-slate-950 dark:text-white">
                  Hapus akun owner
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Flow ini menghapus akses owner aktif. Demi keamanan operasional, sistem akan menolak penghapusan kalau tenant masih punya staff.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="space-y-2">
                <Label>Ketik slug tenant untuk konfirmasi</Label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={tenantSlug || "slug-tenant"}
                  className="h-11 rounded-xl"
                />
              </div>
              {!data.auth.password_setup_required && data.auth.has_password ? (
                <div className="space-y-2">
                  <Label>Password owner saat ini</Label>
                  <Input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
              ) : null}
              <Button
                variant="destructive"
                onClick={() => void handleDeleteAccount()}
                disabled={deleting}
                className="rounded-xl"
              >
                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Hapus akun owner
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
