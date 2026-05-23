"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import api from "@/lib/api";
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

function SectionTitle({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">
          {title}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      {badge}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning";
  icon: typeof ShieldCheck;
}) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
        : "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClassName}`}>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-current/70">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </div>
    </div>
  );
}

export default function OwnerAccountSettingsPage() {
  const [activeSection, setActiveSection] = useState<"profile" | "security">("profile");
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncSection = () => {
      setActiveSection(window.location.hash === "#security" ? "security" : "profile");
    };
    syncSection();
    window.addEventListener("hashchange", syncSection);
    return () => window.removeEventListener("hashchange", syncSection);
  }, []);

  const tenantSlug = data.tenant.slug || "";
  const draftEmail = email.trim().toLowerCase();
  const storedEmail = String(data.user.email || "").trim().toLowerCase();
  const emailChanged = draftEmail !== "" && draftEmail !== storedEmail;
  const hasEmail = draftEmail !== "";
  const effectiveEmailVerified =
    !emailChanged && hasEmail && data.auth.email_verified;
  const needsPasswordSetup =
    data.auth.password_setup_required || !data.auth.has_password;
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
  const identityStatusLabel = effectiveEmailVerified
    ? "Verified"
    : hasEmail
      ? "Perlu verifikasi"
      : "Belum diisi";
  const accountSnapshot = [
    {
      label: "Email owner",
      value: hasEmail ? email.trim() : "Belum diisi",
      tone: effectiveEmailVerified ? "success" : "warning",
      icon: Mail,
    },
    {
      label: "Google owner",
      value: data.auth.google_linked ? "Terhubung" : "Belum terhubung",
      tone: data.auth.google_linked ? "success" : "neutral",
      icon: ArrowRightLeft,
    },
    {
      label: "Password fallback",
      value: needsPasswordSetup ? "Perlu setup" : "Aktif",
      tone: needsPasswordSetup ? "warning" : "success",
      icon: KeyRound,
    },
  ] as const;

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
          ? "Email baru disimpan. Lanjut kirim verifikasi."
          : "Identitas owner diperbarui.",
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
      toast.success("Link verifikasi sudah dikirim.");
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })
        .response?.data?.error;
      toast.error(message || "Gagal mengirim verifikasi email");
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
      toast.error("Konfirmasi password belum cocok");
      return;
    }

    setSavingPassword(true);
    try {
      if (needsPasswordSetup) {
        await api.post("/admin/account/password/setup", {
          new_password: newPassword,
        });
      } else {
        if (!currentPassword.trim()) {
          toast.error("Isi password saat ini dulu");
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
      toast.success(
        needsPasswordSetup
          ? "Password cadangan berhasil dibuat."
          : "Password berhasil diganti.",
      );
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
      toast.error("Ketik slug tenant dengan benar");
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
      toast.success("Akses owner dihapus.");
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
      <div className="space-y-3">
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-20">
      {activeSection === "profile" ? (
        <>
          <Card
            id="profile"
            className="rounded-3xl border-slate-200/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#0f172a]"
          >
            <SectionTitle
              title="Profile"
              description="Nama owner, email login, dan akun Google."
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {accountSnapshot.map((item) => (
                <StatTile
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  tone={item.tone}
                  icon={item.icon}
                />
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
            <SectionTitle
              title="Owner"
              description="Dipakai untuk login, notifikasi penting, dan pemulihan akun."
              badge={
                <Badge
                  className={
                    effectiveEmailVerified
                      ? "rounded-full border-none bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                      : "rounded-full border-none bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200"
                  }
                >
                  {identityStatusLabel}
                </Badge>
              }
            />

            <div className="mt-5 grid gap-4">
              <div className="space-y-2">
                <Label>Nama owner</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Email owner</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="h-11 rounded-2xl"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                {emailChanged
                  ? "Simpan email baru dulu, lalu kirim verifikasi."
                  : effectiveEmailVerified
                    ? "Email owner sudah siap dipakai."
                    : hasEmail
                      ? "Verifikasi email ini agar pemulihan akun aman."
                      : "Tambahkan email owner yang aktif."}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => void handleSaveIdentity()}
                  disabled={savingIdentity}
                  className="rounded-2xl"
                >
                  {savingIdentity ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Simpan identitas
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleSendVerification()}
                  disabled={sendingVerify || !hasEmail || emailChanged}
                  className="rounded-2xl"
                >
                  {sendingVerify ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  {emailChanged
                    ? "Simpan email dulu"
                    : effectiveEmailVerified
                      ? "Kirim ulang verifikasi"
                      : "Kirim verifikasi"}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
            <SectionTitle
              title="Google"
              description="Login lebih cepat tanpa password."
              badge={
                <Badge className="rounded-full border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                  {data.auth.google_linked ? "Terhubung" : "Belum terhubung"}
                </Badge>
              }
            />

            <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {data.auth.google_linked ? (
                  <>
                    <p>
                      Google owner aktif untuk{" "}
                      <span className="font-medium text-slate-950 dark:text-white">
                        {data.user.email}
                      </span>
                      .
                    </p>
                    <p>Pilih akun baru kalau ingin mengganti akses Google.</p>
                  </>
                ) : (
                  <>
                    <p>Hubungkan Google agar owner bisa login lebih cepat.</p>
                    <p>Pilih akun yang memang dipakai untuk mengelola bisnis ini.</p>
                  </>
                )}
              </div>

              <Button asChild className="rounded-2xl">
                <a href={googleConnectUrl}>
                  {data.auth.google_linked ? "Ganti akun Google" : "Hubungkan Google"}
                  <ArrowRightLeft className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </Card>
        </>
      ) : (
        <>
          <Card
            id="security"
            className="scroll-mt-24 rounded-3xl border-slate-200/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#0f172a]"
          >
            <SectionTitle
              title="Security"
              description="Password cadangan dan pemulihan akses owner."
              badge={
                <Badge className="rounded-full border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                  {needsPasswordSetup ? "Perlu setup" : "Aktif"}
                </Badge>
              }
            />

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                {needsPasswordSetup
                  ? "Buat password cadangan untuk login manual saat Google tidak bisa dipakai."
                  : effectiveEmailVerified
                    ? "Link reset password akan dikirim ke email owner yang sudah terverifikasi."
                    : "Pastikan email owner aktif dan terverifikasi untuk pemulihan akun."}
              </div>

              {!needsPasswordSetup ? (
                <div className="space-y-2">
                  <Label>Password saat ini</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-11 rounded-2xl"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>{needsPasswordSetup ? "Password baru" : "Password pengganti"}</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Konfirmasi password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 rounded-2xl"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => void handleSavePassword()}
                  disabled={savingPassword}
                  className="rounded-2xl"
                >
                  {savingPassword ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  {needsPasswordSetup ? "Setup password pertama" : "Ganti password"}
                </Button>
                <Button asChild variant="outline" className="rounded-2xl">
                  <a href={forgotPasswordUrl}>Lupa password</a>
                </Button>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-rose-200/80 p-6 shadow-sm dark:border-rose-500/20 dark:bg-[#19090b]">
            <SectionTitle
              title="Delete owner"
              description="Hapus akses owner dari bisnis ini."
              badge={
                <Badge className="rounded-full border-none bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                  Risiko tinggi
                </Badge>
              }
            />

            <div className="mt-5 grid gap-4">
              <div className="space-y-2">
                <Label>Ketik slug tenant</Label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={tenantSlug || "slug-tenant"}
                  className="h-11 rounded-2xl"
                />
              </div>

              {!needsPasswordSetup ? (
                <div className="space-y-2">
                  <Label>Password owner saat ini</Label>
                  <Input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="h-11 rounded-2xl"
                  />
                </div>
              ) : null}

              <Button
                variant="destructive"
                onClick={() => void handleDeleteAccount()}
                disabled={deleting}
                className="rounded-2xl"
              >
                {deleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Hapus akun owner
              </Button>

              <div className="flex items-start gap-2 rounded-2xl border border-rose-200/70 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                Setelah akun owner dihapus, sesi ini ditutup dan kamu harus menyiapkan
                owner baru lewat jalur yang aman.
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
