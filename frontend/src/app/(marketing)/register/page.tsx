"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Camera,
  Check,
  Globe2,
  Lock,
  Mail,
  Monitor,
  Sparkles,
  Trophy,
  User,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TenantGoogleButton } from "@/components/auth/tenant-google-button";
import { getTenantUrl } from "@/lib/tenant";
import { setAdminAuthCookie, syncTenantCookies } from "@/lib/tenant-session";

type RegisterFormValues = {
  businessName: string;
  businessType: string;
  subdomain: string;
  referralCode: string;
  fullName: string;
  email: string;
  password: string;
  whatsappNumber: string;
  timezone: string;
};

type AccessMethod = "google" | "manual";

type GoogleAdminProfile = {
  name: string;
  email: string;
  avatar_url?: string | null;
  email_verified: boolean;
  idToken: string;
};

type TenantRegisterResponse = {
  token: string;
  tenant: {
    slug: string;
    name: string;
  };
  dashboard_url?: string;
  message?: string;
};

const CATEGORIES = [
  {
    id: "gaming_hub",
    name: "Gaming & Rental",
    icon: Monitor,
    outcome: "Booking per jam dan kontrol unit lebih rapi.",
  },
  {
    id: "creative_space",
    name: "Studio & Creative",
    icon: Camera,
    outcome: "Jadwal sesi dan follow-up customer lebih jelas.",
  },
  {
    id: "sport_center",
    name: "Sport & Courts",
    icon: Trophy,
    outcome: "Slot lapangan, DP, dan peak hour lebih terkendali.",
  },
  {
    id: "social_space",
    name: "Social & Office",
    icon: Briefcase,
    outcome: "Reservasi room dan desk terasa siap sejak hari pertama.",
  },
] as const;

const BOOTSTRAP_OPTIONS = [
  {
    id: "starter",
    name: "Starter",
    desc: "Paling cepat untuk langsung mencoba alur awal.",
  },
  {
    id: "blank",
    name: "Kosong",
    desc: "Mulai bersih dan isi semuanya sendiri.",
  },
  {
    id: "full_template",
    name: "Lengkap",
    desc: "Isi contoh lebih banyak untuk eksplorasi cepat.",
  },
] as const;

const TIMEZONE_OPTIONS = [
  { value: "Asia/Jakarta", label: "WIB" },
  { value: "Asia/Makassar", label: "WITA" },
  { value: "Asia/Jayapura", label: "WIT" },
];

const STEPS = [
  {
    title: "Bisnis",
    description: "Pilih kategori dan claim URL tenant.",
  },
  {
    title: "Setup",
    description: "Tentukan mode mulai dan info operasional.",
  },
  {
    title: "Akses",
    description: "Pilih Google atau email admin pertama.",
  },
] as const;

function normalizeSlugPreview(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function RegisterFlow() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("gaming_hub");
  const [selectedBootstrapMode, setSelectedBootstrapMode] = useState("starter");
  const [accessMethod, setAccessMethod] = useState<AccessMethod>("google");
  const [googleProfile, setGoogleProfile] = useState<GoogleAdminProfile | null>(null);
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const intervalParam = searchParams.get("interval");
  const referralParam = searchParams.get("ref");
  const categoryParam = searchParams.get("category");

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    control,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      businessName: "",
      businessType: "",
      subdomain: "",
      referralCode: referralParam || "",
      fullName: "",
      email: "",
      password: "",
      whatsappNumber: "",
      timezone: "Asia/Jakarta",
    },
  });

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  const watchedBusinessName = useWatch({
    control,
    name: "businessName",
    defaultValue: "",
  });
  const watchedSubdomain = useWatch({
    control,
    name: "subdomain",
    defaultValue: "",
  });
  const watchedFullName = useWatch({
    control,
    name: "fullName",
    defaultValue: "",
  });

  const slugPreview = normalizeSlugPreview(watchedSubdomain || watchedBusinessName);
  const selectedCategoryMeta =
    CATEGORIES.find((item) => item.id === selectedCategory) || CATEGORIES[0];
  const selectedBootstrapMeta =
    BOOTSTRAP_OPTIONS.find((item) => item.id === selectedBootstrapMode) ||
    BOOTSTRAP_OPTIONS[0];

  const summaryItems = useMemo(
    () => [
      ["URL", `${slugPreview || "bisnismu"}.bookinaja.com`],
      ["Kategori", selectedCategoryMeta.name],
      ["Mode", selectedBootstrapMeta.name],
    ],
    [selectedCategoryMeta.name, selectedBootstrapMeta.name, slugPreview],
  );

  const nextStep = async () => {
    if (step === 0) {
      const valid = await trigger(["businessName", "subdomain"]);
      if (!valid) return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const prevStep = () => setStep((current) => Math.max(current - 1, 0));

  const handleGoogleIdentity = async (credential: string) => {
    setLoading(true);
    try {
      const res = await api.post<{
        name: string;
        email: string;
        avatar_url?: string | null;
        email_verified: boolean;
      }>("/register/google/identity", {
        id_token: credential,
      });

      if (!res.data.email_verified) {
        toast.error("Email Google tenant harus sudah terverifikasi.");
        return;
      }

      const profile: GoogleAdminProfile = {
        ...res.data,
        idToken: credential,
      };

      setGoogleProfile(profile);
      setAccessMethod("google");
      setValue("email", profile.email, { shouldValidate: true });
      if (!watchedFullName.trim()) {
        setValue("fullName", profile.name, { shouldValidate: true });
      }
      toast.success("Google admin siap dipakai.");
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })
        .response?.data?.error;
      toast.error(message || "Google tenant belum bisa dipakai.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: RegisterFormValues) => {
    if (accessMethod === "manual" && data.password.trim().length < 6) {
      toast.error("Password admin minimal 6 karakter.");
      return;
    }

    if (accessMethod === "google" && !googleProfile?.idToken) {
      toast.error("Hubungkan Google dulu untuk lanjut.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tenant_name: data.businessName.trim(),
        tenant_slug: data.subdomain.toLowerCase().trim(),
        business_category: selectedCategory,
        business_type: data.businessType.trim() || selectedCategoryMeta.name,
        bootstrap_mode: selectedBootstrapMode,
        referral_code: data.referralCode?.trim() || "",
        admin_name:
          accessMethod === "google"
            ? googleProfile?.name || data.fullName.trim()
            : data.fullName.trim(),
        admin_email:
          accessMethod === "google"
            ? googleProfile?.email || data.email.trim()
            : data.email.trim(),
        admin_password: accessMethod === "manual" ? data.password : "",
        google_id_token: accessMethod === "google" ? googleProfile?.idToken : "",
        whatsapp_number: data.whatsappNumber.trim(),
        timezone: data.timezone,
      };

      const res = await api.post<TenantRegisterResponse>("/register", payload);

      setAdminAuthCookie(res.data.token);
      syncTenantCookies(res.data.tenant.slug);

      toast.success(
        res.data.message || "Workspace siap. Mengarahkan ke dashboard...",
      );

      const redirectParams = new URLSearchParams();
      if (planParam) redirectParams.set("plan", planParam);
      if (intervalParam) redirectParams.set("interval", intervalParam);
      redirectParams.set("welcome", "1");

      const targetPath =
        planParam || intervalParam
          ? `/admin/billing?${redirectParams.toString()}`
          : `/admin/dashboard?${redirectParams.toString()}`;

      window.location.href = getTenantUrl(res.data.tenant.slug, targetPath);
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })
        .response?.data?.error;
      toast.error(message || "Registrasi tenant belum berhasil.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.35)] backdrop-blur dark:border-white/10 dark:bg-[#08101e]/88 lg:p-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-blue-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
              <Sparkles className="h-3.5 w-3.5" />
              Tenant setup
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Buka tenant baru tanpa ribet.
              </h1>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                Isi inti bisnis dulu, masuk ke dashboard lebih cepat, lalu rapikan sisanya dari dalam workspace.
              </p>
            </div>

            <div className="grid gap-3">
              {STEPS.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setStep(index)}
                  className={cn(
                    "rounded-[1.4rem] border px-4 py-4 text-left transition-all",
                    step === index
                      ? "border-blue-200 bg-blue-50 dark:border-sky-400/20 dark:bg-sky-400/10"
                      : "border-slate-200 bg-slate-50/60 dark:border-white/10 dark:bg-white/[0.03]",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-950 dark:text-white">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                        {item.description}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        step === index
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200",
                      )}
                    >
                      {index + 1}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Ringkasan
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {summaryItems.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 break-all text-sm font-bold text-slate-900 dark:text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.35)] backdrop-blur dark:border-white/10 dark:bg-[#08101e]/92 lg:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Step {step + 1} of {STEPS.length}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                {STEPS[step].title}
              </h2>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Progress
              </p>
              <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                {Math.round(((step + 1) / STEPS.length) * 100)}%
              </p>
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#60a5fa_100%)] transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-8">
            <div className={cn("space-y-6", step !== 0 && "hidden")}>
              <label className="block space-y-2">
                <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Nama bisnis
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Contoh: Nexus Gaming Hub"
                    className="h-14 rounded-[1.2rem] border-slate-200 bg-slate-50/70 pl-12 font-medium dark:border-white/10 dark:bg-white/5"
                    {...register("businessName", { required: "Nama bisnis wajib diisi" })}
                  />
                </div>
                {errors.businessName ? (
                  <p className="text-xs text-rose-500">{errors.businessName.message}</p>
                ) : null}
              </label>

              <label className="block space-y-2">
                <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  URL tenant
                </Label>
                <div className="relative">
                  <Globe2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="nexus-gaming"
                    className="h-14 rounded-[1.2rem] border-slate-200 bg-slate-50/70 pl-12 pr-36 lowercase font-medium dark:border-white/10 dark:bg-white/5"
                    {...register("subdomain", {
                      required: "Subdomain wajib diisi",
                      pattern: {
                        value: /^[a-z0-9-]+$/,
                        message: "Gunakan huruf kecil, angka, atau tanda minus",
                      },
                    })}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                    .bookinaja.com
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Preview: <span className="font-semibold">{slugPreview || "bisnismu"}.bookinaja.com</span>
                </p>
                {errors.subdomain ? (
                  <p className="text-xs text-rose-500">{errors.subdomain.message}</p>
                ) : null}
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                {CATEGORIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedCategory(item.id)}
                    className={cn(
                      "rounded-[1.2rem] border p-4 text-left transition-all",
                      selectedCategory === item.id
                        ? "border-blue-200 bg-blue-50 dark:border-sky-400/20 dark:bg-sky-400/10"
                        : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white">
                        <item.icon className="h-4 w-4" />
                      </div>
                      {selectedCategory === item.id ? (
                        <Check className="h-4 w-4 text-blue-600 dark:text-sky-300" />
                      ) : null}
                    </div>
                    <p className="mt-4 text-sm font-bold text-slate-950 dark:text-white">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                      {item.outcome}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className={cn("space-y-6", step !== 1 && "hidden")}>
              <div className="grid gap-4 sm:grid-cols-3">
                {BOOTSTRAP_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedBootstrapMode(item.id)}
                    className={cn(
                      "rounded-[1.2rem] border p-4 text-left transition-all",
                      selectedBootstrapMode === item.id
                        ? "border-blue-200 bg-blue-50 dark:border-sky-400/20 dark:bg-sky-400/10"
                        : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-slate-950 dark:text-white">
                        {item.name}
                      </p>
                      {selectedBootstrapMode === item.id ? (
                        <Check className="h-4 w-4 text-blue-600 dark:text-sky-300" />
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Tipe bisnis
                  </Label>
                  <Input
                    placeholder="Contoh: Rental PS5"
                    className="h-14 rounded-[1.2rem] border-slate-200 bg-slate-50/70 font-medium dark:border-white/10 dark:bg-white/5"
                    {...register("businessType")}
                  />
                </label>

                <label className="block space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    WhatsApp bisnis
                  </Label>
                  <Input
                    placeholder="08123456789"
                    className="h-14 rounded-[1.2rem] border-slate-200 bg-slate-50/70 font-medium dark:border-white/10 dark:bg-white/5"
                    {...register("whatsappNumber")}
                  />
                </label>

                <label className="block space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Timezone
                  </Label>
                  <select
                    className="h-14 w-full rounded-[1.2rem] border border-slate-200 bg-slate-50/70 px-4 text-sm font-medium text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    {...register("timezone")}
                  >
                    {TIMEZONE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Referral
                  </Label>
                  <Input
                    placeholder="Opsional"
                    className="h-14 rounded-[1.2rem] border-slate-200 bg-slate-50/70 font-medium dark:border-white/10 dark:bg-white/5"
                    {...register("referralCode")}
                  />
                </label>
              </div>
            </div>

            <div className={cn("space-y-6", step !== 2 && "hidden")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setAccessMethod("google")}
                  className={cn(
                    "rounded-[1.2rem] border p-4 text-left transition-all",
                    accessMethod === "google"
                      ? "border-blue-200 bg-blue-50 dark:border-sky-400/20 dark:bg-sky-400/10"
                      : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]",
                  )}
                >
                  <p className="text-sm font-bold text-slate-950 dark:text-white">
                    Google
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                    Paling cepat. Login berikutnya bisa satu klik.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setAccessMethod("manual")}
                  className={cn(
                    "rounded-[1.2rem] border p-4 text-left transition-all",
                    accessMethod === "manual"
                      ? "border-blue-200 bg-blue-50 dark:border-sky-400/20 dark:bg-sky-400/10"
                      : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]",
                  )}
                >
                  <p className="text-sm font-bold text-slate-950 dark:text-white">
                    Email + password
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                    Tetap tersedia kalau kamu mau jalur manual.
                  </p>
                </button>
              </div>

              <TenantGoogleButton
                text="signup_with"
                title="Google admin"
                description="Pilih akun Google owner untuk mengisi nama dan email admin otomatis."
                loading={loading}
                onCredential={handleGoogleIdentity}
              />

              {googleProfile ? (
                <div className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-200">
                    Google siap dipakai
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {googleProfile.name} · {googleProfile.email}
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Nama admin
                  </Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Nama owner"
                      className="h-14 rounded-[1.2rem] border-slate-200 bg-slate-50/70 pl-12 font-medium dark:border-white/10 dark:bg-white/5"
                      {...register("fullName", { required: "Nama admin wajib diisi" })}
                      disabled={accessMethod === "google" && !!googleProfile}
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Email admin
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="owner@bisnis.com"
                      className="h-14 rounded-[1.2rem] border-slate-200 bg-slate-50/70 pl-12 font-medium dark:border-white/10 dark:bg-white/5"
                      {...register("email", { required: "Email admin wajib diisi" })}
                      disabled={accessMethod === "google" && !!googleProfile}
                    />
                  </div>
                </label>
              </div>

              <div className={cn(accessMethod !== "manual" && "hidden")}>
                <label className="block space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Password admin
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Minimal 6 karakter"
                      className="h-14 rounded-[1.2rem] border-slate-200 bg-slate-50/70 pl-12 font-medium dark:border-white/10 dark:bg-white/5"
                      {...register("password")}
                    />
                  </div>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>

              <div className="flex flex-col gap-3 sm:flex-row">
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    className="h-12 rounded-xl px-5"
                  >
                    Sebelumnya
                  </Button>
                ) : null}

                {step < STEPS.length - 1 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="h-12 rounded-xl bg-blue-600 px-5 font-bold text-white hover:bg-blue-500"
                  >
                    Lanjut
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 rounded-xl bg-blue-600 px-5 font-bold text-white hover:bg-blue-500"
                  >
                    {loading ? "Menyiapkan..." : "Buat tenant"}
                    {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_42%,#ffffff_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_28%),linear-gradient(180deg,#030712_0%,#08101e_42%,#050814_100%)] sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center">
            <div className="rounded-full border border-blue-100 bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-sm">
              Menyiapkan onboarding tenant...
            </div>
          </div>
        }
      >
        <RegisterFlow />
      </Suspense>
    </div>
  );
}
