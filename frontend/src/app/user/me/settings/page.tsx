"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  ChevronRight,
  History,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  PencilLine,
  Phone,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { clearTenantSession } from "@/lib/tenant-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type SheetKey =
  | "profile"
  | "password"
  | "recovery"
  | "phone"
  | "email"
  | "google"
  | null;
type GoogleSheetStatus = "idle" | "ready";
type RecoveryStep = "request" | "verify";

type CustomerSettingsData = {
  customer?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    tier?: string;
    avatar_url?: string | null;
    email_verified_at?: string | null;
    last_login_method?: string | null;
  };
  points?: number;
  point_activity?: PointEvent[];
  past_history?: BookingItem[];
  identity_methods?: string[];
  has_password?: boolean;
};

type PointEvent = {
  id: string;
  tenant_name?: string;
  points: number;
  created_at: string;
};

type BookingItem = {
  id: string;
  tenant_name?: string;
  resource?: string;
  date?: string;
  status?: string;
  grand_total?: number;
};

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

const SHEET_KEYS = new Set([
  "profile",
  "password",
  "recovery",
  "phone",
  "email",
  "google",
]);

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const apiError = error as ApiError;
    return apiError.response?.data?.error || fallback;
  }

  return fallback;
}

function maskEmail(email?: string | null) {
  const value = String(email || "").trim();
  const [localPart, domain] = value.split("@");
  if (!localPart || !domain) return "Belum ada email";
  if (localPart.length <= 2) return `${localPart[0] || "*"}*@${domain}`;
  return `${localPart.slice(0, 2)}***@${domain}`;
}

export default function UserSettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CustomerSettingsData | null>(null);
  const [activeSheet, setActiveSheet] = useState<SheetKey>(null);

  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetStep, setResetStep] = useState<RecoveryStep>("request");
  const [newPhone, setNewPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneStep, setPhoneStep] = useState<"request" | "verify">("request");

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetVerifying, setResetVerifying] = useState(false);
  const [resetEmailSending, setResetEmailSending] = useState(false);
  const [verificationSending, setVerificationSending] = useState(false);
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [googleSheetStatus, setGoogleSheetStatus] =
    useState<GoogleSheetStatus>("idle");
  const [googleLinking, setGoogleLinking] = useState(false);
  const [googleButtonRendered, setGoogleButtonRendered] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/user/me/settings");
        hydrateDashboard(res.data);
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sheet = new URLSearchParams(window.location.search).get("sheet");
    if (sheet === "reset-password") {
      setActiveSheet("recovery");
      return;
    }
    if (sheet === "email" || sheet === "google") {
      setActiveSheet("profile");
      return;
    }
    if (sheet && SHEET_KEYS.has(sheet)) {
      setActiveSheet(sheet as Exclude<SheetKey, null>);
    }
  }, []);

  const customer = data?.customer;
  const history = data?.past_history || [];
  const pointActivity = data?.point_activity || [];
  const identityMethods = data?.identity_methods || [];
  const hasPassword = Boolean(data?.has_password);
  const hasEmail = Boolean(customer?.email?.trim());
  const emailVerified = Boolean(customer?.email_verified_at);
  const hasGoogle = identityMethods.includes("google");
  const googleClientID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const draftEmail = profileEmail.trim();
  const effectiveEmail =
    activeSheet === "profile" ? draftEmail : customer?.email || "";
  const hasEffectiveEmail = Boolean(effectiveEmail.trim());
  const emailChanged =
    draftEmail.toLowerCase() !== (customer?.email || "").trim().toLowerCase();
  const currentHost =
    typeof window !== "undefined" ? window.location.hostname : "";
  const googleNeedsLocalhostHint =
    currentHost.endsWith(".local") && currentHost !== "localhost";
  const canRenderGoogleButton =
    Boolean(googleClientID) && !googleNeedsLocalhostHint;
  const recoverySummary = [
    emailVerified ? "email siap" : hasEmail ? "email pending" : null,
    customer?.phone ? "WhatsApp aktif" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const loginSummary = [
    hasPassword ? "password aktif" : "belum ada password",
    hasGoogle ? "Google terhubung" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const initials = useMemo(() => {
    return String(customer?.name || "CU")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }, [customer?.name]);

  const avatarStyle = customer?.avatar_url
    ? { backgroundImage: `url(${customer.avatar_url})` }
    : undefined;

  const openRecoverySheet = () => {
    setResetStep("request");
    setResetCode("");
    setResetPassword("");
    setResetConfirmPassword("");
    setActiveSheet("recovery");
  };

  useEffect(() => {
    if (hasGoogle || !canRenderGoogleButton) return;
    if (window.google?.accounts?.id) {
      setGoogleSheetStatus("ready");
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity-services="true"]',
    );
    if (existing) {
      const markReady = () => {
        if (window.google?.accounts?.id) {
          setGoogleSheetStatus("ready");
        }
      };
      markReady();
      existing.addEventListener("load", markReady);
      const timer = window.setInterval(markReady, 250);
      return () => {
        existing.removeEventListener("load", markReady);
        window.clearInterval(timer);
      };
    }

    let disposed = false;
    const markReady = () => {
      if (!disposed && window.google?.accounts?.id) {
        setGoogleSheetStatus("ready");
      }
    };
    const timer = window.setInterval(markReady, 250);

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentityServices = "true";
    script.onload = markReady;
    document.head.appendChild(script);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      script.onload = null;
    };
  }, [canRenderGoogleButton, hasGoogle]);

  const hydrateDashboard = (nextData: CustomerSettingsData) => {
    setData(nextData);
    setProfileName(nextData.customer?.name || "");
    setProfileEmail(nextData.customer?.email || "");
  };

  const syncCustomer = (
    patch: Partial<NonNullable<CustomerSettingsData["customer"]>>,
  ) => {
    setData((current) => ({
      ...(current || {}),
      customer: {
        ...(current?.customer || {}),
        ...patch,
      },
    }));
  };

  async function handleLinkGoogle(credential: string) {
    setGoogleLinking(true);
    try {
      const res = await api.post("/user/me/google/link", {
        id_token: credential,
      });
      hydrateDashboard({
        ...(data || {}),
        customer: res.data?.customer || data?.customer,
        identity_methods: Array.from(
          new Set([...(data?.identity_methods || []), "google"]),
        ),
        has_password: data?.has_password,
      });
      toast.success("Akun Google berhasil dihubungkan");
      closeSheet();
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Akun Google belum berhasil dihubungkan"),
      );
    } finally {
      setGoogleLinking(false);
    }
  }

  const initializeGoogleLink = () => {
    if (!window.google?.accounts?.id) {
      return false;
    }
    window.google.accounts.id.initialize({
      client_id: googleClientID,
      callback: async (response) => {
        if (!response.credential) {
          toast.error("Google credential tidak tersedia");
          return;
        }
        await handleLinkGoogle(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    return true;
  };

  const handleGoogleLinkFallback = () => {
    if (!initializeGoogleLink()) {
      toast.error("Google Sign-In belum siap. Coba refresh halaman ini sekali.");
      return;
    }
    try {
      window.google.accounts.id.prompt();
    } catch {
      toast.error("Google chooser belum bisa dibuka. Coba refresh halaman ini.");
    }
  };

  useEffect(() => {
    if (
      activeSheet !== "profile" ||
      hasGoogle ||
      googleSheetStatus !== "ready" ||
      !googleButtonRef.current ||
      !canRenderGoogleButton ||
      !window.google?.accounts?.id
    ) {
      return;
    }

    const container = googleButtonRef.current;
    let disposed = false;
    let attempts = 0;

    const tryRender = () => {
      if (
        disposed ||
        !container ||
        !window.google?.accounts?.id ||
        hasGoogle ||
        activeSheet !== "profile"
      ) {
        return false;
      }

      container.innerHTML = "";
      try {
        if (!initializeGoogleLink()) {
          return false;
        }
        window.google.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
        });
      } catch {
        return false;
      }

      const rendered =
        container.childElementCount > 0 || container.innerHTML.trim() !== "";
      setGoogleButtonRendered(rendered);
      return rendered;
    };

    const timer = window.setInterval(() => {
      attempts += 1;
      const rendered = tryRender();
      if (rendered || attempts >= 6) {
        window.clearInterval(timer);
      }
    }, 250);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [
    activeSheet,
    canRenderGoogleButton,
    googleClientID,
    googleSheetStatus,
    hasGoogle,
  ]);

  useEffect(() => {
    if (hasGoogle || activeSheet !== "profile") {
      setGoogleButtonRendered(false);
    }
  }, [activeSheet, hasGoogle]);

  const closeSheet = () => {
    setActiveSheet(null);
    if (
      typeof window !== "undefined" &&
      window.location.search.includes("sheet=")
    ) {
      router.replace("/user/me/settings", { scroll: false });
    }
  };

  const handleLogout = () => {
    clearTenantSession({ keepTenantSlug: true });
    router.push("/user/login");
  };

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    setAvatarUploading(true);
    try {
      const res = await api.post("/user/me/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      syncCustomer({
        avatar_url: res.data?.customer?.avatar_url || res.data?.url || null,
      });
      toast.success("Foto profil berhasil diperbarui");
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal upload foto profil"));
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const previousEmail = (customer?.email || "").trim().toLowerCase();
    const nextEmail = profileEmail.trim().toLowerCase();
    setProfileSaving(true);

    try {
      const res = await api.put("/user/me", {
        name: profileName,
        email: profileEmail,
      });
      syncCustomer({
        name: res.data?.customer?.name || profileName,
        email: res.data?.customer?.email || profileEmail,
        email_verified_at: res.data?.customer?.email_verified_at ?? null,
      });
      if (previousEmail !== nextEmail && nextEmail) {
        toast.success("Profil diperbarui. Kirim verifikasi email dari menu ini saat siap.");
      } else {
        toast.success("Data profil berhasil diperbarui");
      }
      closeSheet();
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal memperbarui profil"));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!currentPassword.trim() || !newPassword.trim()) {
      toast.error("Password lama dan password baru wajib diisi");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password baru belum sama");
      return;
    }

    setPasswordSaving(true);
    try {
      await api.post("/user/me/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Password berhasil diperbarui");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      closeSheet();
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal memperbarui password"));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleRequestResetPassword = async () => {
    if (!customer?.phone) {
      toast.error("Nomor WhatsApp akun belum tersedia");
      return;
    }

    setResetSending(true);
    try {
      await api.post("/public/customer/password/reset/request", {
        phone: customer.phone,
      });
      setResetStep("verify");
      toast.success("OTP reset password dikirim ke WhatsApp kamu");
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal mengirim OTP reset password"));
    } finally {
      setResetSending(false);
    }
  };

  const handleRequestResetPasswordEmail = async () => {
    if (!customer?.email?.trim()) {
      toast.error("Tambahkan email aktif dulu di profil akun");
      return;
    }
    if (!emailVerified) {
      toast.error("Verifikasi email dulu sebelum pakai reset via email");
      return;
    }

    setResetEmailSending(true);
    try {
      await api.post("/public/customer/password/reset/request-email", {
        email: customer.email.trim(),
      });
      toast.success("Link reset password dikirim ke email kamu");
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal mengirim link reset password"));
    } finally {
      setResetEmailSending(false);
    }
  };

  const handleVerifyResetPassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (resetPassword !== resetConfirmPassword) {
      toast.error("Konfirmasi password baru belum sama");
      return;
    }

    setResetVerifying(true);
    try {
      await api.post("/public/customer/password/reset/verify", {
        phone: customer?.phone,
        code: resetCode,
        new_password: resetPassword,
      });
      toast.success("Password berhasil direset");
      setResetCode("");
      setResetPassword("");
      setResetConfirmPassword("");
      setResetStep("request");
      closeSheet();
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal mereset password"));
    } finally {
      setResetVerifying(false);
    }
  };

  const handleRequestPhoneChange = async () => {
    const cleanedPhone = newPhone.replace(/\D/g, "");
    if (!cleanedPhone) {
      toast.error("Nomor WhatsApp baru wajib diisi");
      return;
    }

    setPhoneSending(true);
    try {
      await api.post("/user/me/phone/request-change", {
        new_phone: cleanedPhone,
      });
      setNewPhone(cleanedPhone);
      setPhoneStep("verify");
      toast.success("OTP pergantian nomor dikirim ke WhatsApp baru");
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Gagal mengirim OTP pergantian nomor"),
      );
    } finally {
      setPhoneSending(false);
    }
  };

  const handleVerifyPhoneChange = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setPhoneVerifying(true);

    try {
      const res = await api.post("/user/me/phone/verify-change", {
        new_phone: newPhone,
        code: phoneCode,
      });
      syncCustomer({
        phone: res.data?.customer?.phone || newPhone,
      });
      toast.success("Nomor WhatsApp berhasil diperbarui");
      setPhoneCode("");
      setNewPhone("");
      setPhoneStep("request");
      closeSheet();
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal memverifikasi nomor baru"));
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleRequestEmailVerification = async () => {
    if (!customer?.email?.trim()) {
      toast.error("Tambahkan email aktif dulu di profil akun");
      return;
    }
    if (emailVerified) {
      toast.success("Email ini sudah terverifikasi");
      return;
    }

    setVerificationSending(true);
    try {
      await api.post("/user/me/email/verify/request", {});
      toast.success("Link verifikasi dikirim ke email kamu");
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal mengirim email verifikasi"));
    } finally {
      setVerificationSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[1.75rem]" />
        <Skeleton className="h-48 rounded-[1.75rem]" />
        <Skeleton className="h-64 rounded-[1.75rem]" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Card className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
          <CardContent className="space-y-5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative shrink-0">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(37,99,235,0.88))] bg-cover bg-center text-2xl font-semibold text-white shadow-sm"
                    style={avatarStyle}
                  >
                    {customer?.avatar_url ? null : initials || "CU"}
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={avatarUploading}
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-2xl border-white bg-white text-slate-700 shadow-sm dark:border-[#0b0f19] dark:bg-[#111827] dark:text-white"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatarUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleAvatarUpload(file);
                    }}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">
                    Profil
                  </p>
                  <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                    {customer?.name || "Customer"}
                  </h1>
                  <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                    {customer?.email || customer?.phone || "Bookinaja"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="rounded-full border-none bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                      Tier {customer?.tier || "NEW"}
                    </Badge>
                    <Badge className="rounded-full border-none bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                      {(data?.points || 0).toLocaleString("id-ID")} points
                    </Badge>
                    <Badge
                      className={`rounded-full border-none ${
                        emailVerified
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200"
                      }`}
                    >
                      {emailVerified
                        ? "Email verified"
                        : hasEmail
                          ? "Email pending"
                          : "Email belum diisi"}
                    </Badge>
                    {hasGoogle ? (
                      <Badge className="rounded-full border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                        Google terhubung
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0 rounded-2xl dark:border-white/10 dark:bg-white/[0.03]"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <MiniStat
                label="Points"
                value={(data?.points || 0).toLocaleString("id-ID")}
                icon={Wallet}
              />
              <MiniStat
                label="Tier"
                value={customer?.tier || "NEW"}
                icon={Sparkles}
              />
              <MiniStat
                label="Riwayat"
                value={String(history.length)}
                icon={History}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
          <CardContent className="space-y-5 p-3">
            <div className="space-y-2">
              <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Akun & identitas
              </div>
              <div className="space-y-2">
                <SectionRow
                  title="Identitas akun"
                  description="Nama, email, status verifikasi, dan akses Google"
                  value={[
                    customer?.name || "Customer",
                    customer?.email || "Belum ada email",
                    emailVerified
                      ? "email verified"
                      : hasEmail
                        ? "email pending"
                        : "email belum diisi",
                    hasGoogle ? "Google terhubung" : "Google belum terhubung",
                  ].join(" · ")}
                  icon={User}
                  actionLabel="Kelola"
                  onClick={() => setActiveSheet("profile")}
                />
                <SectionRow
                  title="Nomor WhatsApp"
                  description="Nomor utama untuk OTP dan update akun"
                  value={customer?.phone || "Belum ada nomor"}
                  icon={Phone}
                  actionLabel="Ganti"
                  onClick={() => {
                    setPhoneStep("request");
                    setActiveSheet("phone");
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Security & recovery
              </div>
              <div className="space-y-2">
                <SectionRow
                  title="Password akun"
                  description={
                    hasPassword
                      ? "Perbarui password login email kamu"
                      : "Belum ada password. Buat dulu lewat jalur recovery"
                  }
                  value={loginSummary}
                  icon={ShieldCheck}
                  actionLabel={hasPassword ? "Ganti" : "Atur"}
                  onClick={() =>
                    hasPassword
                      ? setActiveSheet("password")
                      : openRecoverySheet()
                  }
                />
                <SectionRow
                  title="Pulihkan akses akun"
                  description="Pilih jalur reset via email atau OTP WhatsApp"
                  value={
                    recoverySummary ||
                    "Siapkan email dan WhatsApp untuk recovery"
                  }
                  icon={RotateCcw}
                  actionLabel="Buka"
                  onClick={openRecoverySheet}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Riwayat
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                    Booking terakhir
                  </p>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  className="h-10 rounded-2xl px-3"
                >
                  <Link href="/user/me/history">Semua</Link>
                </Button>
              </div>

              {history.length ? (
                history.slice(0, 3).map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/user/me/bookings/${booking.id}`}
                    className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-950 dark:text-white">
                        {booking.resource || "Booking"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {booking.tenant_name || "Tenant"} · Rp{" "}
                        {Number(booking.grand_total || 0).toLocaleString(
                          "id-ID",
                        )}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                ))
              ) : (
                <EmptyBlock label="Belum ada riwayat booking yang bisa ditampilkan." />
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0f19]">
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  Aktivitas points
                </p>
                <p className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                  Perolehan loyalty terbaru
                </p>
              </div>

              {pointActivity.length ? (
                pointActivity.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-950 dark:text-white">
                        {event.tenant_name || "Bookinaja"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(event.created_at).toLocaleDateString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-300">
                      +{event.points}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyBlock label="Belum ada aktivitas loyalty yang tercatat." />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet
        open={Boolean(activeSheet)}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[92vh] overflow-y-auto rounded-t-[2rem] border-0 bg-white px-0 pb-0 pt-0 dark:bg-[#0b0f19] md:!left-1/2 md:!right-auto md:!top-1/2 md:!bottom-auto md:!h-auto md:!max-h-[min(88vh,900px)] md:!w-[min(880px,calc(100vw-2rem))] md:!translate-x-[-50%] md:!translate-y-[-50%] md:!rounded-[2rem] md:border md:border-slate-200/80 md:shadow-[0_32px_90px_-30px_rgba(15,23,42,0.45)] dark:md:border-white/10 dark:md:shadow-[0_40px_100px_-40px_rgba(0,0,0,0.7)]"
        >
          {activeSheet === "profile" ? (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <SheetHeader className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/96 pb-4 backdrop-blur dark:border-white/10 dark:bg-[#0b0f19]/96">
                <SheetTitle>Kelola identitas akun</SheetTitle>
                <SheetDescription>
                  Satu tempat untuk memperbarui nama, email utama, status
                  verifikasi, dan koneksi Google akun customer kamu.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-4 md:px-6">
                <Field label="Nama lengkap" icon={<User className="h-4 w-4" />}>
                  <Input
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    className="h-12 rounded-2xl border-slate-200 pl-11 dark:border-white/10 dark:bg-white/[0.03]"
                  />
                </Field>

                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Akses Google
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-950 dark:text-white">
                        {hasGoogle
                          ? "Google sudah terhubung"
                          : "Google belum terhubung"}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {hasGoogle
                          ? "Kamu sudah bisa masuk lebih cepat lintas device dengan Google."
                          : "Hubungkan Google supaya login lebih cepat dan tetap punya WhatsApp sebagai recovery utama."}
                      </p>
                    </div>
                    <Badge className="rounded-full border-none bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                      {hasGoogle ? "Connected" : "Optional"}
                    </Badge>
                  </div>

                  {hasGoogle ? null : googleNeedsLocalhostHint ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                      Buka halaman ini dari{" "}
                      <span className="font-semibold">
                        http://localhost:3000
                      </span>{" "}
                      supaya tombol Google bisa muncul. Google Sign-In tidak
                      jalan dari domain lokal seperti{" "}
                      <span className="font-semibold">{currentHost}</span>.
                    </div>
                  ) : googleClientID ? (
                    <div className="mt-4 space-y-3">
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        Pilih akun Google yang mau dihubungkan ke akun Bookinaja
                        ini.
                      </div>
                      <div className="flex justify-center">
                        <div ref={googleButtonRef} className="min-h-[44px]" />
                      </div>
                      {!googleButtonRendered && googleSheetStatus === "ready" ? (
                        <Button
                          type="button"
                          onClick={handleGoogleLinkFallback}
                          disabled={googleLinking}
                          className="h-11 w-full rounded-2xl"
                        >
                          {googleLinking ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Hubungkan Google
                        </Button>
                      ) : null}
                      {googleSheetStatus !== "ready" ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Menyiapkan tombol Google...
                        </div>
                      ) : null}
                      {googleLinking ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Menghubungkan akun Google...
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                      Google sign-in belum dikonfigurasi di environment frontend
                      ini.
                    </div>
                  )}
                </div>

                <Field label="Email aktif" icon={<Mail className="h-4 w-4" />}>
                  <Input
                    type="email"
                    value={profileEmail}
                    onChange={(event) => setProfileEmail(event.target.value)}
                    placeholder="nama@email.com"
                    className="h-12 rounded-2xl border-slate-200 pl-11 dark:border-white/10 dark:bg-white/[0.03]"
                  />
                </Field>

                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Status email
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-950 dark:text-white">
                        {hasEffectiveEmail
                          ? maskEmail(effectiveEmail)
                          : "Belum ada email"}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {emailChanged
                          ? "Email baru sudah kamu isi, tapi belum disimpan ke akun. Simpan profil dulu sebelum verifikasi."
                          : emailVerified
                            ? hasGoogle
                              ? "Email ini sudah ikut tervalidasi dari identitas Google dan siap dipakai untuk login serta recovery."
                              : "Email ini sudah terverifikasi dan siap dipakai untuk login serta recovery."
                            : hasEffectiveEmail
                              ? "Simpan email yang benar, lalu kirim verifikasi supaya jalur reset via email aktif."
                              : "Tambahkan email aktif untuk login yang lebih rapi dan recovery yang lebih aman."}
                      </p>
                    </div>
                    <Badge
                      className={`rounded-full border-none ${
                        emailVerified
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200"
                      }`}
                    >
                      {emailVerified
                        ? "Verified"
                        : emailChanged
                          ? "Draft"
                          : hasEffectiveEmail
                            ? "Pending"
                            : "Kosong"}
                    </Badge>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {emailVerified ? (
                      <div className="flex h-11 flex-1 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                        Email siap dipakai
                      </div>
                    ) : emailChanged ? (
                      <div className="flex h-11 flex-1 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                        Simpan profil dulu
                      </div>
                    ) : (
                      <Button
                        type="button"
                        disabled={!hasEffectiveEmail || verificationSending}
                        className="h-11 flex-1 rounded-2xl"
                        onClick={handleRequestEmailVerification}
                      >
                        {verificationSending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="mr-2 h-4 w-4" />
                        )}
                        Kirim verifikasi
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <SheetFooter className="sticky bottom-0 border-t border-slate-200/80 bg-white/96 dark:border-white/10 dark:bg-[#0b0f19]/96">
                <Button
                  type="submit"
                  disabled={profileSaving}
                  className="h-12 rounded-2xl"
                >
                  {profileSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PencilLine className="mr-2 h-4 w-4" />
                  )}
                  Simpan profil
                </Button>
              </SheetFooter>
            </form>
          ) : null}

          {activeSheet === "password" ? (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <SheetHeader className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/96 pb-4 backdrop-blur dark:border-white/10 dark:bg-[#0b0f19]/96">
                <SheetTitle>Ganti password</SheetTitle>
                <SheetDescription>
                  Masukkan password lama dulu, lalu tentukan password baru untuk
                  akun ini.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-4 md:px-6">
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                  Kalau lupa password lama, pakai jalur recovery lewat email
                  atau OTP WhatsApp dari menu keamanan.
                </div>

                <Field
                  label="Password lama"
                  icon={<LockKeyhole className="h-4 w-4" />}
                >
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Masukkan password lama"
                    className="h-12 rounded-2xl border-slate-200 pl-11 dark:border-white/10 dark:bg-white/[0.03]"
                  />
                </Field>

                <Field
                  label="Password baru"
                  icon={<KeyRound className="h-4 w-4" />}
                >
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="h-12 rounded-2xl border-slate-200 pl-11 dark:border-white/10 dark:bg-white/[0.03]"
                  />
                </Field>

                <Field
                  label="Ulangi password baru"
                  icon={<ShieldCheck className="h-4 w-4" />}
                >
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Ketik ulang password baru"
                    className="h-12 rounded-2xl border-slate-200 pl-11 dark:border-white/10 dark:bg-white/[0.03]"
                  />
                </Field>
              </div>

              <SheetFooter className="sticky bottom-0 border-t border-slate-200/80 bg-white/96 dark:border-white/10 dark:bg-[#0b0f19]/96">
                <div className="flex w-full gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 flex-1 rounded-2xl dark:border-white/10 dark:bg-white/[0.03]"
                    onClick={openRecoverySheet}
                  >
                    Lupa password
                  </Button>
                  <Button
                    type="submit"
                    disabled={passwordSaving}
                    className="h-12 flex-1 rounded-2xl"
                  >
                    {passwordSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    Perbarui password
                  </Button>
                </div>
              </SheetFooter>
            </form>
          ) : null}

          {activeSheet === "recovery" ? (
            <div className="space-y-5">
              <SheetHeader className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/96 pb-4 backdrop-blur dark:border-white/10 dark:bg-[#0b0f19]/96">
                <SheetTitle>Pulihkan akses akun</SheetTitle>
                <SheetDescription>
                  Pilih jalur yang paling nyaman. Email cocok untuk link reset
                  formal, WhatsApp cocok untuk OTP cepat.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-4 md:px-6">
                <div className="grid gap-3">
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                          Reset via email
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-950 dark:text-white">
                          {customer?.email || "Belum ada email"}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {emailVerified
                            ? "Kami kirim link reset password ke email terverifikasi ini."
                            : hasEmail
                              ? "Verifikasi email dulu sebelum reset via email bisa dipakai."
                              : "Tambahkan email dulu di profil untuk membuka jalur reset via email."}
                        </p>
                      </div>
                      <Badge
                        className={`rounded-full border-none ${
                          emailVerified
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200"
                        }`}
                      >
                        {emailVerified ? "Siap" : "Belum siap"}
                      </Badge>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        type="button"
                        disabled={
                          !hasEmail || !emailVerified || resetEmailSending
                        }
                        className="h-12 flex-1 rounded-2xl"
                        onClick={handleRequestResetPasswordEmail}
                      >
                        {resetEmailSending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="mr-2 h-4 w-4" />
                        )}
                        Kirim link reset
                      </Button>
                      {!emailVerified ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!hasEmail || verificationSending}
                          className="h-12 rounded-2xl dark:border-white/10 dark:bg-white/[0.03]"
                          onClick={handleRequestEmailVerification}
                        >
                          {verificationSending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Verifikasi email
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Reset via OTP WhatsApp
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-950 dark:text-white">
                      {customer?.phone || "-"}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Jalur cepat kalau kamu sedang pegang nomor WhatsApp akun
                      dan butuh pasang password baru sekarang.
                    </p>
                  </div>
                </div>

                {resetStep === "request" ? (
                  <div className="space-y-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Kirim OTP reset dulu ke WhatsApp kamu. Setelah kode masuk,
                      lanjut verifikasi dan tentukan password baru.
                    </p>
                    <Button
                      type="button"
                      disabled={resetSending}
                      className="h-12 w-full rounded-2xl"
                      onClick={handleRequestResetPassword}
                    >
                      {resetSending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Kirim OTP reset
                    </Button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleVerifyResetPassword}
                    className="space-y-4"
                  >
                    <Field
                      label="OTP 6 digit"
                      icon={<Phone className="h-4 w-4" />}
                    >
                      <Input
                        inputMode="numeric"
                        maxLength={6}
                        value={resetCode}
                        onChange={(event) =>
                          setResetCode(event.target.value.replace(/\D/g, ""))
                        }
                        placeholder="Masukkan OTP"
                        className="h-12 rounded-2xl border-slate-200 pl-11 tracking-[0.24em] dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </Field>

                    <Field
                      label="Password baru"
                      icon={<KeyRound className="h-4 w-4" />}
                    >
                      <Input
                        type="password"
                        value={resetPassword}
                        onChange={(event) =>
                          setResetPassword(event.target.value)
                        }
                        placeholder="Minimal 6 karakter"
                        className="h-12 rounded-2xl border-slate-200 pl-11 dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </Field>

                    <Field
                      label="Ulangi password baru"
                      icon={<ShieldCheck className="h-4 w-4" />}
                    >
                      <Input
                        type="password"
                        value={resetConfirmPassword}
                        onChange={(event) =>
                          setResetConfirmPassword(event.target.value)
                        }
                        placeholder="Ketik ulang password baru"
                        className="h-12 rounded-2xl border-slate-200 pl-11 dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </Field>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 flex-1 rounded-2xl dark:border-white/10 dark:bg-white/[0.03]"
                        onClick={() => setResetStep("request")}
                      >
                        Ulang kirim OTP
                      </Button>
                      <Button
                        type="submit"
                        disabled={resetVerifying}
                        className="h-12 flex-1 rounded-2xl"
                      >
                        {resetVerifying ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-2 h-4 w-4" />
                        )}
                        Reset password
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ) : null}

          {activeSheet === "phone" ? (
            <div className="space-y-5">
              <SheetHeader className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/96 pb-4 backdrop-blur dark:border-white/10 dark:bg-[#0b0f19]/96">
                <SheetTitle>Ganti nomor WhatsApp</SheetTitle>
                <SheetDescription>
                  Masukkan nomor baru, kirim OTP ke nomor tersebut, lalu
                  verifikasi sebelum nomor akun diganti.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-4 md:px-6">
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Nomor sekarang
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-950 dark:text-white">
                    {customer?.phone || "-"}
                  </div>
                </div>

                {phoneStep === "request" ? (
                  <div className="space-y-4">
                    <Field
                      label="Nomor WhatsApp baru"
                      icon={<Phone className="h-4 w-4" />}
                    >
                      <Input
                        inputMode="tel"
                        value={newPhone}
                        onChange={(event) =>
                          setNewPhone(event.target.value.replace(/\D/g, ""))
                        }
                        placeholder="08xxxxxxxxxx"
                        className="h-12 rounded-2xl border-slate-200 pl-11 dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </Field>

                    <Button
                      type="button"
                      disabled={phoneSending}
                      className="h-12 w-full rounded-2xl"
                      onClick={handleRequestPhoneChange}
                    >
                      {phoneSending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Phone className="mr-2 h-4 w-4" />
                      )}
                      Kirim OTP ke nomor baru
                    </Button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleVerifyPhoneChange}
                    className="space-y-4"
                  >
                    <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                      OTP sudah dikirim ke{" "}
                      <span className="font-semibold">{newPhone}</span>.
                    </div>

                    <Field
                      label="OTP 6 digit"
                      icon={<KeyRound className="h-4 w-4" />}
                    >
                      <Input
                        inputMode="numeric"
                        maxLength={6}
                        value={phoneCode}
                        onChange={(event) =>
                          setPhoneCode(event.target.value.replace(/\D/g, ""))
                        }
                        placeholder="Masukkan OTP"
                        className="h-12 rounded-2xl border-slate-200 pl-11 tracking-[0.24em] dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </Field>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 flex-1 rounded-2xl dark:border-white/10 dark:bg-white/[0.03]"
                        onClick={() => setPhoneStep("request")}
                      >
                        Ubah nomor
                      </Button>
                      <Button
                        type="submit"
                        disabled={phoneVerifying}
                        className="h-12 flex-1 rounded-2xl"
                      >
                        {phoneVerifying ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-2 h-4 w-4" />
                        )}
                        Verifikasi nomor
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        {label}
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

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function SectionRow({
  title,
  description,
  value,
  icon: Icon,
  actionLabel,
  onClick,
}: {
  title: string;
  description: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm dark:bg-[#111827] dark:text-white">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">
          {title}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
        <p className="mt-2 truncate text-sm text-slate-700 dark:text-slate-200">
          {value}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
          {actionLabel}
        </div>
        <ChevronRight className="ml-auto mt-2 h-4 w-4 text-slate-400" />
      </div>
    </button>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-slate-200 px-4 py-5 text-sm leading-6 text-slate-500 dark:border-white/10 dark:text-slate-400">
      {label}
    </div>
  );
}
