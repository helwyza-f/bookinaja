"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SingleImageUpload } from "@/components/upload/single-image-upload";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { getTenantUrl } from "@/lib/tenant";
import {
  defaultTenantProfile,
  type TenantProfile,
} from "@/app/(dashboard)/[tenant]/admin/(internal)/settings/bisnis/sections/types";

type PublicPageExample = {
  id: string;
  label: string;
  slogan: string;
  tagline: string;
  about_us: string;
  features: string[];
};

const categoryExamples: Record<string, PublicPageExample[]> = {
  gaming_hub: [
    {
      id: "gaming_fast",
      label: "Gaming cepat",
      slogan: "Booking gaming room tanpa ribet",
      tagline: "Main lebih gampang, pilih slot lebih cepat",
      about_us:
        "Pilih unit, cek jam kosong, lalu booking langsung dari halaman ini tanpa chat bolak-balik.",
      features: ["Cek slot real-time", "Pembayaran fleksibel", "Lokasi mudah dijangkau"],
    },
    {
      id: "gaming_premium",
      label: "Gaming premium",
      slogan: "Setup rapi, sesi langsung jalan",
      tagline: "Tempat main yang siap dipakai kapan saja",
      about_us:
        "Cocok untuk mabar, rental room, dan sesi spontan dengan alur booking yang singkat.",
      features: ["Device siap pakai", "Booking instan", "Cocok untuk group"],
    },
  ],
  creative_space: [
    {
      id: "creative_clean",
      label: "Studio clean",
      slogan: "Booking studio tanpa drama",
      tagline: "Pilih sesi yang pas, datang, lalu langsung produksi",
      about_us:
        "Halaman ini membantu customer memahami studio, melihat visual, dan booking lebih cepat.",
      features: ["Jadwal jelas", "Visual studio rapi", "Cocok untuk foto dan konten"],
    },
  ],
  sport_center: [
    {
      id: "sport_competitive",
      label: "Sport aktif",
      slogan: "Booking lapangan lebih cepat",
      tagline: "Cek jam kosong dan amankan sesi main kamu sekarang",
      about_us:
        "Customer bisa langsung lihat jadwal, pilih slot, dan booking tanpa proses manual yang panjang.",
      features: ["Slot real-time", "Lokasi jelas", "Cocok untuk main rutin"],
    },
  ],
  social_space: [
    {
      id: "social_meeting",
      label: "Meeting simple",
      slogan: "Sewa ruang jadi lebih jelas",
      tagline: "Cari ruang yang pas, pilih durasi, dan booking dalam beberapa langkah",
      about_us:
        "Dipakai untuk meeting room, coworking, dan event kecil dengan alur booking yang lebih rapi.",
      features: ["Durasi jelas", "Harga mudah dipahami", "Cocok untuk tim kecil"],
    },
  ],
  default: [
    {
      id: "default_clear",
      label: "Contoh umum",
      slogan: "Booking lebih cepat dan lebih jelas",
      tagline: "Pilih layanan, lihat slot, lalu booking tanpa ribet",
      about_us:
        "Halaman ini membantu customer memahami bisnis kamu, melihat visual utamanya, lalu lanjut booking dengan cepat.",
      features: ["Jadwal jelas", "Info utama singkat", "Alur booking lebih ringkas"],
    },
  ],
};

export default function PublicPageSetupPage() {
  const searchParams = useSearchParams();
  const { tenantCategory, tenantName, tenantSlug } = useAdminSession();
  const [profile, setProfile] = useState<TenantProfile>(defaultTenantProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [featureInput, setFeatureInput] = useState("");
  const isWelcomeFlow = searchParams.get("welcome") === "1";

  const exampleOptions = useMemo(() => {
    const normalized = String(tenantCategory || "").trim().toLowerCase();
    return categoryExamples[normalized] || categoryExamples.default;
  }, [tenantCategory]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<TenantProfile>("/admin/profile");
      setProfile({
        ...defaultTenantProfile,
        ...(res.data || {}),
      });
    } catch {
      toast.error("Gagal memuat setup halaman publik");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const applyExample = useCallback((example: PublicPageExample) => {
    setProfile((current) => ({
      ...current,
      slogan: current.slogan || example.slogan,
      tagline: current.tagline || example.tagline,
      about_us: current.about_us || example.about_us,
      features: current.features.length > 0 ? current.features : example.features,
    }));
  }, []);

  const removeFeature = useCallback((index: number) => {
    setProfile((current) => ({
      ...current,
      features: current.features.filter((_, idx) => idx !== index),
    }));
  }, []);

  const addFeature = useCallback(() => {
    const next = featureInput.trim();
    if (!next) return;
    setProfile((current) => ({
      ...current,
      features: [...current.features, next],
    }));
    setFeatureInput("");
  }, [featureInput]);

  const handleSave = useCallback(async () => {
    if (!profile.tagline.trim() || !profile.about_us.trim()) {
      toast.error("Isi minimal headline dan deskripsi singkat dulu.");
      return;
    }

    setSaving(true);
    try {
      const payload: TenantProfile = {
        ...profile,
        slogan: profile.slogan.trim(),
        tagline: profile.tagline.trim(),
        about_us: profile.about_us.trim(),
        features: profile.features.map((item) => item.trim()).filter(Boolean),
      };
      const res = await api.put("/admin/profile", payload);
      setProfile({
        ...defaultTenantProfile,
        ...(res.data?.data || payload),
      });
      toast.success("Halaman publik berhasil disimpan.");
      if (isWelcomeFlow) {
        window.location.href = "/admin/dashboard";
      }
    } catch {
      toast.error("Gagal menyimpan halaman publik.");
    } finally {
      setSaving(false);
    }
  }, [isWelcomeFlow, profile]);

  const publicUrl = tenantSlug ? getTenantUrl(tenantSlug) : "/";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-3 pb-20 pt-3 md:px-5 md:pb-8">
      <section className="rounded-[1.6rem] border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
              Setup halaman publik
            </Badge>
            {tenantCategory ? (
              <Badge className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                {tenantCategory.replace(/_/g, " ")}
              </Badge>
            ) : null}
          </div>
          <div className="space-y-2">
            <h1 className="text-[1.7rem] font-semibold leading-tight tracking-tight text-slate-950">
              {isWelcomeFlow ? "Siapkan halaman booking pertamamu" : "Rapikan halaman publik bisnismu"}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-500">
              Isi copy utama sambil lihat preview langsung. Tujuannya supaya kamu tidak menebak-nebak field ini muncul di mana.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-10 rounded-xl">
              <Link href="/admin/dashboard" prefetch={false}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-10 rounded-xl">
              <a href={publicUrl} target="_blank" rel="noreferrer">
                Buka halaman publik
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
        <section className="space-y-4 lg:order-2">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Preview
                </div>
                <h2 className="mt-1 text-base font-semibold text-slate-950">
                  Yang dilihat customer
                </h2>
              </div>
              <Badge className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                Mobile first
              </Badge>
            </div>
            <PublicPageMobilePreview profile={profile} businessName={tenantName} />
          </div>
        </section>

        <section className="space-y-4 lg:order-1">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Contoh isi
                </div>
                <h2 className="mt-1 text-base font-semibold text-slate-950">
                  Mulai dari contoh yang relevan
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Klik salah satu supaya kamu tidak mulai dari form kosong.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {exampleOptions.map((example) => (
                <button
                  key={example.id}
                  type="button"
                  onClick={() => applyExample(example)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    {example.label}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {example.tagline}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="space-y-4">
              <Field
                label="Kalimat kecil di atas judul"
                helper="Muncul paling atas dan membantu customer cepat paham bisnis kamu."
              >
                <Input
                  value={profile.slogan}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, slogan: event.target.value }))
                  }
                  placeholder="Contoh: Booking cepat tanpa ribet"
                />
              </Field>

              <Field
                label="Judul utama yang dilihat customer"
                helper="Ini adalah headline utama halaman publik. Buat singkat dan jelas."
              >
                <Input
                  value={profile.tagline}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, tagline: event.target.value }))
                  }
                  placeholder="Contoh: Pilih slot, booking, lalu langsung datang"
                />
              </Field>

              <Field
                label="Penjelasan singkat tentang bisnis"
                helper="Isi 1-2 kalimat yang menjelaskan apa yang bisa dibooking di tempat kamu."
              >
                <Textarea
                  value={profile.about_us}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, about_us: event.target.value }))
                  }
                  className="min-h-28"
                  placeholder="Contoh: Customer bisa cek jadwal, pilih layanan, dan booking langsung dari halaman ini."
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <SingleImageUpload
                  value={profile.banner_url}
                  onChange={(url) =>
                    setProfile((current) => ({ ...current, banner_url: url }))
                  }
                  endpoint="/admin/upload"
                  label="Banner hero"
                  emptyTitle="Upload banner"
                  emptyHint="Pakai gambar yang mewakili suasana bisnis"
                  aspect="video"
                  uploadPreset="hero"
                />
                <SingleImageUpload
                  value={profile.logo_url}
                  onChange={(url) =>
                    setProfile((current) => ({ ...current, logo_url: url }))
                  }
                  endpoint="/admin/upload"
                  label="Logo"
                  emptyTitle="Upload logo"
                  emptyHint="Tampil di header dan identitas bisnis"
                  aspect="square"
                  uploadPreset="logo"
                />
              </div>

              <Field
                label="3 keunggulan utama bisnis kamu"
                helper="Tulis poin yang paling membuat customer yakin untuk lanjut booking."
              >
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={featureInput}
                      onChange={(event) => setFeatureInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addFeature();
                        }
                      }}
                      placeholder="Contoh: Slot real-time"
                    />
                    <Button type="button" onClick={addFeature} className="rounded-xl">
                      Tambah
                    </Button>
                  </div>
                  <div className="flex min-h-12 flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    {profile.features.length === 0 ? (
                      <span className="text-sm text-slate-400">
                        Belum ada keunggulan. Isi minimal 2-3 poin.
                      </span>
                    ) : (
                      profile.features.map((feature, index) => (
                        <span
                          key={`${feature}-${index}`}
                          className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                        >
                          {feature}
                          <button
                            type="button"
                            aria-label="Hapus selling point"
                            onClick={() => removeFeature(index)}
                            className="rounded-full bg-white/80 px-1 text-[10px] text-blue-700"
                          >
                            x
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </Field>

              <div className="grid gap-3 pt-2 sm:grid-cols-[1fr_auto]">
                <Button
                  type="button"
                  disabled={loading || saving}
                  onClick={() => void handleSave()}
                  className="h-12 rounded-2xl"
                >
                  {saving ? "Menyimpan..." : isWelcomeFlow ? "Simpan dan lanjut dashboard" : "Simpan perubahan"}
                </Button>
                <Button asChild type="button" variant="ghost" className="h-12 rounded-2xl px-4">
                  <Link href="/admin/dashboard" prefetch={false}>
                    Nanti saja
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function PublicPageMobilePreview({
  profile,
  businessName,
}: {
  profile: TenantProfile;
  businessName?: string;
}) {
  const title = profile.tagline || "Judul utama halaman publik akan tampil di sini";
  const slogan = profile.slogan || businessName || "Kalimat kecil di atas judul";
  const description =
    profile.about_us ||
    "Penjelasan singkat bisnis kamu akan membantu customer paham sebelum lanjut booking.";
  const features =
    profile.features.length > 0
      ? profile.features
      : ["Keunggulan pertama", "Keunggulan kedua", "Keunggulan ketiga"];

  return (
    <div className="mx-auto w-full max-w-[340px]">
      <div className="rounded-[2rem] border-[6px] border-slate-900 bg-slate-900 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
        <div className="overflow-hidden rounded-[1.5rem] bg-white">
          <div className="relative h-52 bg-slate-950">
            {profile.banner_url ? (
              <img
                src={profile.banner_url}
                alt="Banner preview"
                className="absolute inset-0 h-full w-full object-cover opacity-45"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/55 to-slate-950" />
            <div className="relative flex h-full flex-col justify-end px-4 py-4 text-white">
              <div className="mb-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/90 shadow-sm">
                {profile.logo_url ? (
                  <img src={profile.logo_url} alt="Logo preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-black text-slate-900">
                    {(businessName || "B").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                {slogan}
              </div>
              <h3 className="mt-2 text-2xl font-semibold leading-tight">{title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/75">
                {description}
              </p>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div className="grid gap-2">
              {features.slice(0, 3).map((feature, index) => (
                <div
                  key={`${feature}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700"
                >
                  {feature}
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.25)]">
              Lanjut booking
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <Label>{label}</Label>
      {children}
      <span className="text-xs leading-5 text-slate-500">{helper}</span>
    </label>
  );
}
