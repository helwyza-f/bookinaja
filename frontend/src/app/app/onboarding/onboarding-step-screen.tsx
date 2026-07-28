"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Gamepad2,
  ImagePlus,
  Info,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import api from "@/lib/api";
import { BOOKINAJA_LOGO_FRAMELESS_SRC } from "@/lib/brand";
import { prepareImageForUpload } from "@/lib/image-upload-prep";
import {
  readSignupIntentFromParams,
  signupIntentToQuery,
  type SignupIntent,
} from "@/lib/signup-intent";
import { getTenantAdminEntryUrl } from "@/lib/workspace-entry";
import { getWorkspaceOnboarding, listWorkspaces, updateWorkspaceOnboardingStep } from "@/lib/workspace-client";

const steps = [
  { key: "resource", label: "Resource", icon: Gamepad2 },
  { key: "payments", label: "Payment", icon: Banknote },
];

const legacyStepMap: Record<string, string> = {
  template: "resource",
  business: "payments",
  "first-booking": "payments",
  done: "payments",
};

const stepNext: Record<string, string> = {
  resource: "payments",
  payments: "done",
};

const stepPrevious: Record<string, string> = {
  resource: "resource",
  payments: "resource",
};

const stepTitles: Record<string, { title: string; subtitle: string; action: string }> = {
  resource: {
    title: "Buat unit dan paket pertamamu.",
    subtitle: "Mulai dari hal yang paling penting dulu: nama unit, cover, paket utama, dan harga mulai dari yang customer lihat.",
    action: "Simpan unit pertama",
  },
  payments: {
    title: "Aktifkan metode pembayaran.",
    subtitle: "Default-nya Midtrans dan cash sudah siap. Tambahkan transfer atau QRIS hanya kalau memang mau langsung dipakai.",
    action: "Masuk dashboard",
  },
};

const categoryProfiles: Record<string, {
  label: string;
  unitPlaceholder: string;
  summaryPlaceholder: string;
  packagePlaceholder: string;
  packageTip: string;
  businessTip: string;
}> = {
  gaming_hub: {
    label: "Gaming & Rental",
    unitPlaceholder: "PC Reguler",
    summaryPlaceholder: "RTX 3060, Ryzen 5, 16GB RAM, monitor 144Hz",
    packagePlaceholder: "Main 1 Jam",
    packageTip: "Contoh umum: paket per jam untuk PC, PS, atau room gaming.",
    businessTip: "Contoh yang cocok: slot main per jam, kontak admin aktif, dan jadwal operasional jelas.",
  },
  creative_space: {
    label: "Studio & Creative",
    unitPlaceholder: "Studio Foto A",
    summaryPlaceholder: "Backdrop putih, lighting 3 titik, area make-up",
    packagePlaceholder: "Sesi Studio",
    packageTip: "Contoh umum: paket per sesi untuk studio, rehearsal, atau ruang meeting kecil.",
    businessTip: "Biasanya customer butuh sesi jelas, kontak cepat, dan instruksi booking yang ringkas.",
  },
  sport_center: {
    label: "Sport & Courts",
    unitPlaceholder: "Lapangan Badminton 1",
    summaryPlaceholder: "Karpet standar turnamen, pencahayaan terang, tribun kecil",
    packagePlaceholder: "Sewa 1 Jam",
    packageTip: "Contoh umum: paket per jam untuk lapangan, court, atau meja game.",
    businessTip: "Biasanya customer melihat jam operasional, slot yang masih kosong, dan metode bayar yang cepat.",
  },
  social_space: {
    label: "Social & Office",
    unitPlaceholder: "Meeting Room A",
    summaryPlaceholder: "Kapasitas 10 orang, proyektor, whiteboard, AC",
    packagePlaceholder: "Sewa Harian",
    packageTip: "Contoh umum: paket per hari untuk meeting room, event space, atau coworking.",
    businessTip: "Biasanya customer ingin tahu jam buka, kontak admin, dan durasi sewa yang jelas.",
  },
};

function categoryProfileFor(value: string) {
  const normalized = value.trim().toLowerCase();
  if (categoryProfiles[normalized]) return categoryProfiles[normalized];
  return {
    label: value.trim() || "Kategori bisnis",
    unitPlaceholder: "Unit utama",
    summaryPlaceholder: "Jelaskan fasilitas atau isi utama unit ini dengan singkat.",
    packagePlaceholder: "Paket utama",
    packageTip: "Pakai nama paket yang memang kamu jual ke customer.",
    businessTip: "Tips dan contoh di langkah ini akan menyesuaikan kategori bisnis yang kamu pilih.",
  };
}

const readableInputStyle = {
  color: "#020617",
  caretColor: "#2563eb",
  backgroundColor: "#ffffff",
  opacity: 1,
} as React.CSSProperties;

type PaymentStatus = "active" | "required" | "off";

function hasBankTransferConfig(bankName: string, accountName: string, accountNumber: string) {
  return Boolean(bankName.trim() && accountName.trim() && accountNumber.trim());
}

function hasQrisConfig(qrisImageUrl: string) {
  return Boolean(qrisImageUrl.trim());
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatRupiahInput(value: string) {
  const digits = digitsOnly(value);
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

function priceUnitLabel(value: string) {
  switch (value) {
    case "session":
      return "sesi";
    case "day":
      return "hari";
    case "week":
      return "minggu";
    case "month":
      return "bulan";
    case "year":
      return "tahun";
    default:
      return "jam";
  }
}

function durationHintByPriceUnit(value: string) {
  switch (value) {
    case "session":
      return "Isi durasi dalam menit untuk 1 sesi. Contoh: 120 berarti satu paket ini berlaku 2 jam per sesi.";
    case "day":
      return "Isi total menit untuk 1 hari layanan. Contoh: 720 untuk 12 jam, atau 1440 untuk full day.";
    case "week":
      return "Isi total menit yang dicakup paket mingguan ini. Cocok kalau durasi paket memang dihitung per minggu.";
    case "month":
      return "Isi total menit yang dicakup paket bulanan ini bila memang durasi layanan dibatasi per bulan.";
    case "year":
      return "Isi total menit yang dicakup paket tahunan ini bila memang ada kuota durasi per tahun.";
    default:
      return "Isi durasi dalam menit untuk 1 jam layanan. Contoh umum: 60 menit untuk per jam, atau 30 menit kalau billing setengah jam.";
  }
}

function defaultDurationByPriceUnit(value: string) {
  switch (value) {
    case "day":
      return "1440";
    case "week":
      return "10080";
    case "month":
      return "43200";
    case "year":
      return "525600";
    case "session":
      return "";
    default:
      return "60";
  }
}

function nextUrl(step: string, workspaceId: string, slug?: string | null, signupIntent?: SignupIntent) {
  const params = signupIntentToQuery(signupIntent || {});
  params.set("workspace", workspaceId);
  if (slug) params.set("slug", slug);
  return `/app/onboarding/${step}?${params.toString()}`;
}

function adminWelcomePath(signupIntent: SignupIntent) {
  const params = signupIntentToQuery(signupIntent);
  params.set("welcome", "1");
  return `/admin/dashboard?${params.toString()}`;
}

export function OnboardingStepScreen({ step }: { step: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace");
  const workspaceSlug = searchParams.get("slug");
  const workspaceCategoryQuery = searchParams.get("category") || "";
  const signupIntent = useMemo(() => readSignupIntentFromParams(searchParams), [searchParams]);
  const effectiveStep = legacyStepMap[step] || step;
  const currentIndex = Math.max(steps.findIndex((item) => item.key === effectiveStep), 0);
  const copy = stepTitles[effectiveStep] || stepTitles.resource;
  const [loading, setLoading] = useState(false);
  const [workspaceCategory, setWorkspaceCategory] = useState(workspaceCategoryQuery);
  const [resourceName, setResourceName] = useState("");
  const [resourceCategory, setResourceCategory] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [resourceImageUrl, setResourceImageUrl] = useState("");
  const [priceName, setPriceName] = useState("");
  const [priceUnit, setPriceUnit] = useState("hour");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [bankTransferEnabled, setBankTransferEnabled] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankInstructions, setBankInstructions] = useState("");
  const [qrisStaticEnabled, setQrisStaticEnabled] = useState(false);
  const [qrisImageUrl, setQrisImageUrl] = useState("");
  const [qrisInstructions, setQrisInstructions] = useState("");
  const categoryProfile = categoryProfileFor(workspaceCategory);

  useEffect(() => {
    if (!workspaceId) return;

    let alive = true;
    void listWorkspaces()
      .then((items) => {
        if (!alive) return;
        const current = items.find((item) => item.id === workspaceId);
        if (current?.business_category) {
          setWorkspaceCategory(String(current.business_category));
        }
      })
      .catch(() => {});

    void getWorkspaceOnboarding(workspaceId)
      .then((state) => {
        if (!alive || !state.seed) return;
        const resource = state.seed.resource;
        const payment = state.seed.payment_methods;

        if (resource) {
          setResourceName((current) => current || String(resource.resource_name || ""));
          setResourceCategory((current) => current || String(resource.resource_category || ""));
          setResourceDescription((current) => current || String(resource.resource_description || ""));
          setResourceImageUrl((current) => current || String(resource.resource_image_url || ""));
          setPriceName((current) => current || String(resource.price_name || ""));
          setPriceUnit((current) =>
            current === "hour" && String(resource.price_unit || "hour") !== "hour"
              ? String(resource.price_unit || "hour")
              : current || String(resource.price_unit || "hour"),
          );
          setPrice((current) => current || String(resource.price || ""));
          setDuration((current) => current || String(resource.unit_duration || ""));
        }

        if (payment) {
          setBankTransferEnabled((current) => current || Boolean(payment.bank_transfer_enabled));
          setBankName((current) => current || String(payment.bank_name || ""));
          setBankAccountName((current) => current || String(payment.bank_account_name || ""));
          setBankAccountNumber((current) => current || String(payment.bank_account_number || ""));
          setBankInstructions((current) => current || String(payment.bank_instructions || ""));
          setQrisStaticEnabled((current) => current || Boolean(payment.qris_static_enabled));
          setQrisImageUrl((current) => current || String(payment.qris_image_url || ""));
          setQrisInstructions((current) => current || String(payment.qris_instructions || ""));
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [workspaceCategoryQuery, workspaceId]);

  useEffect(() => {
    if (!resourceCategory && workspaceCategory) {
      setResourceCategory(workspaceCategory);
    }
  }, [resourceCategory, workspaceCategory]);

  const resourceValid = Boolean(
    resourceName.trim() &&
    resourceDescription.trim() &&
    priceName.trim() &&
    digitsOnly(price).trim() &&
    digitsOnly(duration).trim(),
  );
  const paymentsValid = Boolean(
    (!bankTransferEnabled || hasBankTransferConfig(bankName, bankAccountName, bankAccountNumber)) &&
    (!qrisStaticEnabled || hasQrisConfig(qrisImageUrl)),
  );
  const continueDisabled = effectiveStep === "resource"
    ? !resourceValid
      : effectiveStep === "payments"
        ? !paymentsValid
          : false;

  async function continueStep() {
    if (!workspaceId) {
      toast.error("Workspace belum dipilih.");
      router.replace("/app/workspaces");
      return;
    }
    setLoading(true);
    try {
      const target = stepNext[effectiveStep] || "resource";
      const state = await updateWorkspaceOnboardingStep(workspaceId, effectiveStep, {
        next_step: target,
        selected_start_mode: effectiveStep === "resource" ? "guided_real_setup" : undefined,
        complete: target === "done",
        ...(effectiveStep === "resource"
          ? {
              resource_name: resourceName,
              resource_category: resourceCategory || workspaceCategory || "main",
              resource_description: resourceDescription,
              resource_image_url: resourceImageUrl,
              price_name: priceName,
              price: Number(price || 0),
              price_unit: priceUnit,
              unit_duration: Number(duration || 60),
            }
          : {}),
        ...(effectiveStep === "payments"
          ? {
              payment_methods: {
                bank_transfer_enabled: bankTransferEnabled && hasBankTransferConfig(bankName, bankAccountName, bankAccountNumber),
                bank_name: bankName,
                bank_account_name: bankAccountName,
                bank_account_number: bankAccountNumber,
                bank_instructions: bankInstructions,
                qris_static_enabled: qrisStaticEnabled && hasQrisConfig(qrisImageUrl),
                qris_image_url: qrisImageUrl,
                qris_instructions: qrisInstructions,
              },
            }
          : {}),
      });
      if (target === "done") {
        if (workspaceSlug) {
          window.location.href = getTenantAdminEntryUrl(workspaceSlug, adminWelcomePath(signupIntent));
        } else {
          router.replace("/app/workspaces");
        }
        return;
      }
      router.push(nextUrl(state.current_step, workspaceId, workspaceSlug, signupIntent));
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || "Onboarding belum berhasil disimpan.");
    } finally {
      setLoading(false);
    }
  }

  function backStep() {
    if (!workspaceId) {
      router.replace("/app/workspaces");
      return;
    }
    if (effectiveStep === "resource") {
      router.replace("/app/workspaces");
      return;
    }
    router.push(nextUrl(stepPrevious[effectiveStep] || "resource", workspaceId, workspaceSlug, signupIntent));
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:overflow-visible">
        <div className="flex flex-1 flex-col p-5 sm:p-6 lg:p-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eff6ff] ring-1 ring-[#dbeafe]">
              <Image
                src={BOOKINAJA_LOGO_FRAMELESS_SRC}
                alt="Bookinaja"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Powered by
              </div>
              <div className="text-base font-semibold tracking-tight text-slate-950">Bookinaja</div>
            </div>
          </div>
          <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Step {Math.min(currentIndex + 1, steps.length)} of {steps.length}
              </p>
              <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight">{copy.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{copy.subtitle}</p>
            </div>
          </header>

          {effectiveStep === "resource" ? (
            <ResourceStep
              categoryProfile={categoryProfile}
              resourceName={resourceName}
              resourceCategory={resourceCategory}
              resourceDescription={resourceDescription}
              resourceImageUrl={resourceImageUrl}
              priceName={priceName}
              priceUnit={priceUnit}
              price={price}
              duration={duration}
              setResourceName={setResourceName}
              setResourceCategory={setResourceCategory}
              setResourceDescription={setResourceDescription}
              setResourceImageUrl={setResourceImageUrl}
              setPriceName={setPriceName}
              setPriceUnit={setPriceUnit}
              setPrice={setPrice}
              setDuration={setDuration}
            />
          ) : effectiveStep === "payments" ? (
            <PaymentStep
              price={price}
              bankTransferEnabled={bankTransferEnabled}
              setBankTransferEnabled={setBankTransferEnabled}
              bankName={bankName}
              setBankName={setBankName}
              bankAccountName={bankAccountName}
              setBankAccountName={setBankAccountName}
              bankAccountNumber={bankAccountNumber}
              setBankAccountNumber={setBankAccountNumber}
              bankInstructions={bankInstructions}
              setBankInstructions={setBankInstructions}
              qrisStaticEnabled={qrisStaticEnabled}
              setQrisStaticEnabled={setQrisStaticEnabled}
              qrisImageUrl={qrisImageUrl}
              setQrisImageUrl={setQrisImageUrl}
              qrisInstructions={qrisInstructions}
              setQrisInstructions={setQrisInstructions}
            />
          ) : null}

          <OnboardingFooter
            currentIndex={currentIndex}
            action={copy.action}
            loading={loading}
            disabled={continueDisabled}
            onBack={backStep}
            onContinue={continueStep}
          />
        </div>
      </section>
    </main>
  );
}

function ResourceStep(props: {
  categoryProfile: ReturnType<typeof categoryProfileFor>;
  resourceName: string;
  resourceCategory: string;
  resourceDescription: string;
  resourceImageUrl: string;
  priceName: string;
  priceUnit: string;
  price: string;
  duration: string;
  setResourceName: (value: string) => void;
  setResourceCategory: (value: string) => void;
  setResourceDescription: (value: string) => void;
  setResourceImageUrl: (value: string) => void;
  setPriceName: (value: string) => void;
  setPriceUnit: (value: string) => void;
  setPrice: (value: string) => void;
  setDuration: (value: string) => void;
}) {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("[data-guided-field='true']")) return;
      setActiveHint(null);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, []);

  async function uploadCover(file: File | null) {
    if (!file || !workspaceId) return;
    const preparedFile = await prepareImageForUpload(file, "media").catch(() => file);
    if (preparedFile.size > 5 * 1024 * 1024) {
      toast.error("Cover masih terlalu besar setelah diproses, maksimal 5MB.");
      return;
    }
    const formData = new FormData();
    formData.append("image", preparedFile);
    setUploadingCover(true);
    try {
      const res = await api.post<{ url: string }>(`/app/workspaces/${workspaceId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      props.setResourceImageUrl(String(res.data?.url || ""));
      toast.success("Cover unit berhasil diunggah.");
    } catch {
      toast.error("Upload cover belum berhasil.");
    } finally {
      setUploadingCover(false);
    }
  }

  function selectPriceUnit(nextValue: string) {
    props.setPriceUnit(nextValue);
    props.setDuration(defaultDurationByPriceUnit(nextValue));
    setActiveHint(nextValue === "session" ? "duration" : "price_unit");
    if (nextValue === "hour") {
      toast.success("Durasi paket otomatis diisi 60 menit untuk pola per jam.");
    } else if (nextValue === "day") {
      toast.success("Durasi paket otomatis diisi 1440 menit untuk pola per hari.");
    } else {
      toast.message("Isi sendiri durasi sesi dalam menit.");
    }
  }

  function handleDurationChange(nextValue: string) {
    const digits = digitsOnly(nextValue);
    props.setDuration(digits);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]">
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-700">
          Isi dua level inti ini dulu:
          <span className="font-semibold text-slate-950"> unit</span> yang customer pilih, lalu
          <span className="font-semibold text-slate-950"> paket utama</span> yang jadi harga mulai dari.
          <span className="mt-1 block text-slate-500">Kategori aktif: {props.categoryProfile.label}.</span>
        </div>

        <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Unit</div>
            <h3 className="mt-2 text-lg font-semibold">Yang customer lihat lebih dulu</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <GuidedField
              label="Nama unit"
              hint="Nama ini muncul di kartu booking customer. Pakai nama singkat dan jelas, misalnya PC Reguler atau VIP Room."
              activeHint={activeHint}
              onFocus={() => setActiveHint("resource_name")}
              hintKey="resource_name"
            >
              <OnboardingInput
                value={props.resourceName}
                onChange={(event) => props.setResourceName(event.target.value)}
                placeholder={props.categoryProfile.unitPlaceholder}
              />
            </GuidedField>
            <GuidedField
              label="Ringkasan singkat"
              hint="Satu sampai dua baris saja. Ini membantu customer cepat paham isi unitnya, misalnya spesifikasi PC atau fasilitas room."
              activeHint={activeHint}
              onFocus={() => setActiveHint("resource_description")}
              hintKey="resource_description"
              className="sm:col-span-2"
            >
              <OnboardingInput
                value={props.resourceDescription}
                onChange={(event) => props.setResourceDescription(event.target.value)}
                placeholder={props.categoryProfile.summaryPlaceholder}
              />
            </GuidedField>
          </div>

          <GuidedField
            label="Cover banner"
            hint="Foto ini jadi visual utama di kartu customer. Pakai foto landscape yang langsung menjelaskan unitnya."
            activeHint={activeHint}
            onFocus={() => setActiveHint("resource_image")}
            hintKey="resource_image"
          >
            <label className="block">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void uploadCover(event.target.files?.[0] || null)}
              />
              <div className="flex min-h-[180px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-blue-300 hover:bg-blue-50/40">
                {props.resourceImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={props.resourceImageUrl} alt="Cover unit" className="h-full min-h-[180px] w-full object-cover" />
                ) : (
                  <div className="px-6 text-center">
                    {uploadingCover ? <Upload className="mx-auto h-7 w-7 animate-pulse text-blue-600" /> : <ImagePlus className="mx-auto h-7 w-7 text-slate-400" />}
                    <div className="mt-3 text-sm font-semibold text-slate-950">
                      {uploadingCover ? "Mengunggah cover..." : "Upload cover unit"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Landscape PNG/JPG agar preview customer terasa nyata.</div>
                  </div>
                )}
              </div>
            </label>
          </GuidedField>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Paket utama</div>
            <h3 className="mt-2 text-lg font-semibold">Harga mulai dari untuk unit ini</h3>
            <p className="mt-1 text-sm text-slate-500">
              Biar gampang, pilih dulu pola jualnya. Setelah itu isi paket pertama yang paling sering dipilih customer.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">1. Pilih pola jual</div>
            <GuidedField
              label="Satuan harga"
              hint="Pilih cara kamu menjual paket ini: per jam, per sesi, atau per hari. Durasi di bawah tetap diisi dalam menit."
              activeHint={activeHint}
              onFocus={() => setActiveHint("price_unit")}
              hintKey="price_unit"
            >
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  ["hour", "Per jam", "Cocok untuk PC, PS, room, dan court."],
                  ["session", "Per sesi", "Cocok untuk studio atau slot tetap."],
                  ["day", "Per hari", "Cocok untuk sewa harian atau full day."],
                ].map(([value, label, desc]) => {
                  const active = props.priceUnit === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => selectPriceUnit(value)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-blue-500 bg-white text-slate-950 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/40"
                      }`}
                    >
                      <div className="font-semibold">{label}</div>
                      <div className="mt-1 text-xs text-slate-500">{desc}</div>
                    </button>
                  );
                })}
              </div>
            </GuidedField>
            <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs leading-5 text-slate-600">
              Per jam otomatis mengisi <span className="font-semibold text-slate-950">60 menit</span>.
              Per hari otomatis mengisi <span className="font-semibold text-slate-950">1440 menit</span>.
              {props.priceUnit === "session" ? " Untuk per sesi, isi sendiri durasinya." : ""}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">2. Isi paket pertama</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <GuidedField
                label="Nama paket"
                hint={props.categoryProfile.packageTip}
                activeHint={activeHint}
                onFocus={() => setActiveHint("price_name")}
                hintKey="price_name"
              >
                <OnboardingInput
                  value={props.priceName}
                  onChange={(event) => props.setPriceName(event.target.value)}
                  placeholder={props.categoryProfile.packagePlaceholder}
                />
              </GuidedField>
              <GuidedField
                label="Durasi paket (menit)"
                hint={durationHintByPriceUnit(props.priceUnit)}
                activeHint={activeHint}
                onFocus={() => setActiveHint("duration")}
                hintKey="duration"
              >
                <OnboardingInput
                  value={props.duration}
                  onChange={(event) => handleDurationChange(event.target.value)}
                  inputMode="numeric"
                  placeholder={props.priceUnit === "day" ? "1440" : props.priceUnit === "hour" ? "60" : "90"}
                />
              </GuidedField>
            </div>
            <GuidedField
              label="Harga"
              hint="Harga ini tampil sebagai mulai dari di kartu customer dan jadi fokus utama saat customer membandingkan unit."
              activeHint={activeHint}
              onFocus={() => setActiveHint("price")}
              hintKey="price"
              className="mt-5"
            >
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Paling dilihat customer</div>
                <OnboardingInput
                  value={formatRupiahInput(props.price)}
                  onChange={(event) => props.setPrice(digitsOnly(event.target.value))}
                  inputMode="numeric"
                  placeholder="6.000"
                  className="h-14 text-xl font-semibold"
                />
              </div>
            </GuidedField>
            <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
              Semua durasi tetap diisi dalam menit. Sekarang kamu memilih pola
              <span className="font-semibold text-slate-950"> {priceUnitLabel(props.priceUnit)}</span>, jadi preview customer akan membaca harga sebagai
              <span className="font-semibold text-slate-950"> Rp{Number(props.price || 0).toLocaleString("id-ID")} / {priceUnitLabel(props.priceUnit)}</span>.
              {props.priceUnit === "session" ? (
                <>
                  {" "}Untuk
                  <span className="font-semibold text-slate-950"> per sesi</span>, isi sendiri berapa menit durasi 1 sesi kamu.
                </>
              ) : null}
              {props.priceUnit === "hour" ? (
                <>
                  {" "}Durasi ini menentukan panjang 1 slot layanan. Rekomendasi paket per jam:
                  <span className="font-semibold text-slate-950"> 60 menit</span>.
                </>
              ) : null}
              {props.priceUnit === "day" ? (
                <>
                  {" "}Durasi ini menentukan cakupan 1 paket harian. Untuk full day, gunakan
                  <span className="font-semibold text-slate-950"> 1440 menit</span>.
                </>
              ) : null}
            </div>
          </div>
        </section>

      </div>
      <div className="lg:sticky lg:top-8 lg:self-start">
        <PreviewCard title="Preview customer">
          <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.08)]">
            <div className="relative h-[240px] bg-slate-100 xl:h-[260px]">
              {props.resourceImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={props.resourceImageUrl} alt="Preview customer resource" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_42%),linear-gradient(180deg,#dbeafe_0%,#eff6ff_45%,#ffffff_100%)] px-6 text-center text-sm text-slate-500">
                  Cover unit nanti tampil di sini
                </div>
              )}
              <div className="absolute left-4 top-4 rounded-full bg-slate-950/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                Timed
              </div>
            </div>
            <div className="space-y-6 p-7">
              <div className="text-[clamp(1.9rem,2vw,2.85rem)] font-black uppercase italic leading-[1.02] tracking-[-0.045em] text-slate-950 break-words">
                {props.resourceName || "Nama unit"}
              </div>
              <p className="min-h-[64px] text-[15px] leading-8 text-slate-600">
                {props.resourceDescription || "Ringkasan unit akan membantu customer cepat paham isi atau fasilitas utama."}
              </p>
              <div className="border-t border-slate-200 pt-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Mulai dari</div>
                <div className="mt-4 flex items-end gap-2.5">
                  <span className="text-[clamp(2.2rem,2.4vw,3.6rem)] font-black leading-none tracking-[-0.05em] text-orange-500">
                    Rp{Number(props.price || 0).toLocaleString("id-ID")}
                  </span>
                  <span className="pb-1.5 text-[15px] font-semibold text-slate-500">
                    / {priceUnitLabel(props.priceUnit)}
                  </span>
                </div>
                <div className="mt-5 text-[1.02rem] font-semibold tracking-[-0.02em] text-slate-900">
                  {props.priceName || "Nama paket utama"}
                </div>
                <div className="mt-2 text-[13px] text-slate-500">
                  Durasi {props.duration || "60"} menit
                </div>
              </div>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}

function PaymentStep(props: {
  price: string;
  bankTransferEnabled: boolean;
  setBankTransferEnabled: (value: boolean) => void;
  bankName: string;
  setBankName: (value: string) => void;
  bankAccountName: string;
  setBankAccountName: (value: string) => void;
  bankAccountNumber: string;
  setBankAccountNumber: (value: string) => void;
  bankInstructions: string;
  setBankInstructions: (value: string) => void;
  qrisStaticEnabled: boolean;
  setQrisStaticEnabled: (value: boolean) => void;
  qrisImageUrl: string;
  setQrisImageUrl: (value: string) => void;
  qrisInstructions: string;
  setQrisInstructions: (value: string) => void;
}) {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace");
  const [panel, setPanel] = useState<"methods" | "bank" | "qris">("methods");
  const [uploadingQris, setUploadingQris] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const bankConfigured = hasBankTransferConfig(props.bankName, props.bankAccountName, props.bankAccountNumber);
  const qrisConfigured = hasQrisConfig(props.qrisImageUrl);
  const bankActive = props.bankTransferEnabled && bankConfigured;
  const qrisActive = props.qrisStaticEnabled && qrisConfigured;
  const bankStatus: PaymentStatus = bankActive ? "active" : props.bankTransferEnabled ? "required" : "off";
  const qrisStatus: PaymentStatus = qrisActive ? "active" : props.qrisStaticEnabled ? "required" : "off";

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("[data-guided-field='true']")) return;
      setActiveHint(null);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, []);

  async function uploadQris(file: File | null) {
    if (!file || !workspaceId) return;
    const preparedFile = await prepareImageForUpload(file, "qris").catch(() => file);
    if (preparedFile.size > 5 * 1024 * 1024) {
      toast.error("QRIS masih terlalu besar setelah diproses, maksimal 5MB.");
      return;
    }

    const formData = new FormData();
    formData.append("image", preparedFile);
    setUploadingQris(true);
    try {
      const res = await api.post<{ url: string }>(`/app/workspaces/${workspaceId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      props.setQrisImageUrl(res.data.url);
      props.setQrisStaticEnabled(true);
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || "Upload QRIS gagal.");
    } finally {
      setUploadingQris(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-700">
          Midtrans dan cash sudah aktif.
          <span className="font-semibold text-slate-950"> Transfer manual</span> dan
          <span className="font-semibold text-slate-950"> QRIS static</span> opsional.
        </div>

        <div className="lg:hidden">
          <div className="grid w-full max-w-[360px] grid-cols-3 rounded-2xl bg-slate-100 p-1 text-sm font-semibold sm:w-[360px]">
            {[
              ["methods", "Methods"],
              ["bank", "Bank"],
              ["qris", "QRIS"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPanel(key as "methods" | "bank" | "qris")}
                className={`rounded-xl px-4 py-2 transition ${
                  panel === key ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <section className={`${panel === "methods" ? "block" : "hidden"} space-y-4 lg:block`}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Metode pembayaran</div>
            <h3 className="mt-2 text-lg font-semibold">Opsi checkout customer</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <PaymentMethodCard
              title="Midtrans / QRIS Gateway"
              description="Default"
              status="active"
              locked
            />
            <PaymentMethodCard
              title="Cash / Bayar di tempat"
              description="Default"
              status="active"
              locked
            />
            <PaymentMethodCard
              title="Transfer manual"
              description={bankActive ? "Siap" : bankConfigured ? "Bisa diaktifkan" : "Lengkapi data"}
              status={bankStatus}
              onClick={() => setPanel("bank")}
            />
            <PaymentMethodCard
              title="QRIS static"
              description={qrisActive ? "Siap" : qrisConfigured ? "Bisa diaktifkan" : "Upload QR"}
              status={qrisStatus}
              onClick={() => setPanel("qris")}
            />
          </div>
        </section>

        <section className={`${panel === "bank" ? "block" : "hidden"} space-y-4 rounded-2xl border border-slate-200 p-4 lg:block`}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Transfer manual</div>
            <h3 className="mt-2 text-lg font-semibold">Siapkan rekening tujuan</h3>
          </div>
          <PanelHeader
            title="Transfer manual"
            status={bankStatus}
            canEnable={bankConfigured}
            onToggle={() => props.setBankTransferEnabled(!props.bankTransferEnabled)}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <GuidedField
              label="Bank"
              hint="Pakai nama bank yang benar-benar menerima transfer customer, misalnya BCA, BRI, Mandiri, atau BNI."
              activeHint={activeHint}
              onFocus={() => setActiveHint("bank_name")}
              hintKey="bank_name"
            >
              <OnboardingInput value={props.bankName} onChange={(event) => props.setBankName(event.target.value)} placeholder="BCA" />
            </GuidedField>
            <GuidedField
              label="Account name"
              hint="Nama ini tampil sebagai nama penerima transfer. Cocokkan dengan nama rekening agar customer tidak ragu."
              activeHint={activeHint}
              onFocus={() => setActiveHint("bank_account_name")}
              hintKey="bank_account_name"
            >
              <OnboardingInput value={props.bankAccountName} onChange={(event) => props.setBankAccountName(event.target.value)} placeholder="PT Contoh Bisnis" />
            </GuidedField>
            <GuidedField
              label="Account number"
              hint="Isi nomor rekening tanpa spasi tambahan. Ini dipakai customer untuk transfer manual."
              activeHint={activeHint}
              onFocus={() => setActiveHint("bank_account_number")}
              hintKey="bank_account_number"
            >
              <OnboardingInput value={props.bankAccountNumber} onChange={(event) => props.setBankAccountNumber(event.target.value)} placeholder="1234567890" />
            </GuidedField>
          </div>
          <GuidedField
            label="Instructions"
            hint="Tulis alur singkat setelah transfer, misalnya kirim bukti bayar lewat WhatsApp admin agar verifikasi lebih cepat."
            activeHint={activeHint}
            onFocus={() => setActiveHint("bank_instructions")}
            hintKey="bank_instructions"
          >
            <OnboardingInput
              value={props.bankInstructions}
              onChange={(event) => props.setBankInstructions(event.target.value)}
              placeholder="Transfer lalu kirim bukti bayar."
            />
          </GuidedField>
        </section>

        <section className={`${panel === "qris" ? "block" : "hidden"} space-y-4 rounded-2xl border border-slate-200 p-4 lg:block`}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">QRIS static</div>
            <h3 className="mt-2 text-lg font-semibold">Upload QR yang siap dipindai</h3>
          </div>
          <PanelHeader
            title="QRIS static"
            status={qrisStatus}
            canEnable={qrisConfigured}
            onToggle={() => props.setQrisStaticEnabled(!props.qrisStaticEnabled)}
          />
          <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
            <GuidedField
              label="Upload QRIS"
              hint="Upload gambar QRIS yang final dan mudah dipindai. Gunakan file yang tajam, tidak blur, dan bukan screenshot terpotong."
              activeHint={activeHint}
              onFocus={() => setActiveHint("qris_image")}
              hintKey="qris_image"
            >
              <label className="block">
                <span className="sr-only">Upload QRIS static</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void uploadQris(event.target.files?.[0] || null)}
                />
                <div className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-blue-300 hover:bg-blue-50/50">
                  {props.qrisImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={props.qrisImageUrl} alt="QRIS static" className="h-28 w-28 rounded-xl object-cover" />
                  ) : uploadingQris ? (
                    <Upload className="h-7 w-7 animate-pulse text-blue-600" />
                  ) : (
                    <ImagePlus className="h-7 w-7 text-slate-400" />
                  )}
                  <span className="mt-3 text-sm font-semibold text-slate-950">
                    {uploadingQris ? "Uploading..." : props.qrisImageUrl ? "Replace QRIS" : "Upload QRIS"}
                  </span>
                  <span className="mt-1 text-xs text-slate-500">PNG/JPG up to 5MB</span>
                </div>
              </label>
            </GuidedField>
            <GuidedField
              label="Instructions"
              hint="Beritahu customer apa yang harus dilakukan setelah scan, misalnya kirim bukti transfer atau tunggu konfirmasi otomatis."
              activeHint={activeHint}
              onFocus={() => setActiveHint("qris_instructions")}
              hintKey="qris_instructions"
            >
              <OnboardingInput
                value={props.qrisInstructions}
                onChange={(event) => props.setQrisInstructions(event.target.value)}
                placeholder="Scan QRIS lalu kirim bukti bayar."
              />
            </GuidedField>
          </div>
        </section>
      </div>
      <div className="lg:sticky lg:top-8 lg:self-start">
        <PreviewCard title="Payment preview">
          <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.08)]">
            <div className="rounded-2xl bg-blue-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Booking total</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Rp{Number(props.price || 0).toLocaleString("id-ID")}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <PaymentPreviewLine label="Midtrans / QRIS Gateway" status="active" />
              <PaymentPreviewLine label="Cash" status="active" />
              <PaymentPreviewLine label={`Transfer bank${props.bankName ? ` (${props.bankName})` : ""}`} status={bankStatus} />
              <PaymentPreviewLine label="QRIS static" status={qrisStatus} />
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}

function GuidedField({
  label,
  hint,
  hintKey,
  activeHint,
  onFocus,
  children,
  className = "",
}: {
  label: string;
  hint: string;
  hintKey: string;
  activeHint: string | null;
  onFocus: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const open = activeHint === hintKey;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip open={open}>
        <label className={`space-y-2 ${className}`} onFocusCapture={onFocus} data-guided-field="true">
          <div className="flex items-center gap-2">
            <Label>{label}</Label>
            <TooltipTrigger asChild>
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Panduan ${label}`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
          </div>
          {children}
        </label>
        <TooltipContent
          side="top"
          align="center"
          sideOffset={10}
          collisionPadding={16}
          className="z-[60] max-w-[260px] rounded-xl bg-slate-950 px-3 py-2 text-[11px] leading-5 text-white"
        >
          {hint}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function PaymentMethodCard(props: { title: string; description: string; status: PaymentStatus; locked?: boolean; onClick?: () => void }) {
  const Comp = props.onClick ? "button" : "div";
  const badge = paymentStatusBadge(props.locked ? "default" : props.status);
  return (
    <Comp
      type={props.onClick ? "button" : undefined}
      onClick={props.onClick}
      className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{props.title}</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
          {badge.label}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{props.description}</p>
    </Comp>
  );
}

function PanelHeader(props: { title: string; status: PaymentStatus; canEnable: boolean; onToggle: () => void }) {
  const badge = paymentStatusBadge(props.status);
  const isOn = props.status === "active" || props.status === "required";
  const disabled = !isOn && !props.canEnable;
  const cta = isOn ? "Matikan" : disabled ? "Lengkapi dulu" : "Aktifkan";

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold">{props.title}</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
          {badge.label}
        </span>
      </div>
      <button
        type="button"
        onClick={props.onToggle}
        disabled={disabled}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
          disabled
            ? "cursor-not-allowed bg-slate-100 text-slate-400"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950"
        }`}
      >
        {cta}
      </button>
    </div>
  );
}

function PaymentPreviewLine({ label, status }: { label: string; status: PaymentStatus }) {
  const active = status === "active";
  const required = status === "required";
  const badge = paymentStatusBadge(status);

  return (
    <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${
      active ? "bg-white" : required ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-400"
    }`}>
      <span>{label}</span>
      <span className={`text-xs font-semibold ${badge.textClassName}`}>
        {badge.label}
      </span>
    </div>
  );
}

function paymentStatusBadge(status: PaymentStatus | "default") {
  if (status === "default") {
    return {
      label: "Default active",
      className: "bg-emerald-50 text-emerald-700",
      textClassName: "text-emerald-600",
    };
  }
  if (status === "active") {
    return {
      label: "Active",
      className: "bg-emerald-50 text-emerald-700",
      textClassName: "text-emerald-600",
    };
  }
  if (status === "required") {
    return {
      label: "Setup required",
      className: "bg-amber-50 text-amber-700",
      textClassName: "text-amber-700",
    };
  }
  return {
    label: "Off",
    className: "bg-slate-100 text-slate-500",
    textClassName: "text-slate-400",
  };
}

function PreviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-5">
      <div className="mb-4 text-sm font-semibold text-slate-950">{title}</div>
      {children}
    </aside>
  );
}

function OnboardingFooter(props: {
  currentIndex: number;
  action: string;
  loading: boolean;
  disabled?: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <footer className="mt-auto pt-8">
      <div className="flex flex-col-reverse items-center justify-center gap-4 sm:flex-row">
        <Button
          type="button"
          variant="ghost"
          onClick={props.onBack}
          className="h-10 rounded-xl px-5 text-slate-500 hover:bg-transparent hover:text-slate-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span className="text-sm">Kembali</span>
        </Button>
        <Button onClick={props.onContinue} disabled={props.loading || props.disabled} className="h-12 min-w-[220px] rounded-xl px-8">
          {props.loading ? "Menyimpan..." : props.action}
          {!props.loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
        </Button>
      </div>
      <ProgressDots currentIndex={props.currentIndex} />
    </footer>
  );
}

function ProgressDots({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="flex justify-center gap-2 pt-6" aria-label={`Step ${currentIndex + 1} of ${steps.length}`}>
      {steps.map((item, index) => (
        <span
          key={item.key}
          className={`h-2.5 w-2.5 rounded-full transition ${
            index === currentIndex ? "bg-slate-950" : index < currentIndex ? "bg-blue-500" : "bg-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

function OnboardingInput(props: React.ComponentProps<"input">) {
  const { className = "", style, ...rest } = props;

  return (
    <input
      {...rest}
      className={`h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-4 text-base font-medium text-slate-950 shadow-[inset_0_1px_0_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${className}`}
      style={{ ...readableInputStyle, ...style }}
    />
  );
}
