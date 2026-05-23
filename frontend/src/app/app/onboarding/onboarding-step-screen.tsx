"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarCheck,
  CalendarIcon,
  Check,
  Clock3,
  Gamepad2,
  ImagePlus,
  Info,
  LayoutDashboard,
  MessageCircle,
  Sparkles,
  Upload,
} from "lucide-react";
import { addDays, addMinutes, format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import api from "@/lib/api";
import { getTenantAdminEntryUrl } from "@/lib/workspace-entry";
import { getWorkspaceOnboarding, listWorkspaces, updateWorkspaceOnboardingStep } from "@/lib/workspace-client";

const steps = [
  { key: "template", label: "Start", icon: Sparkles },
  { key: "resource", label: "Resource", icon: Gamepad2 },
  { key: "business", label: "Business", icon: Building2 },
  { key: "payments", label: "Payment", icon: Banknote },
  { key: "first-booking", label: "Test", icon: CalendarCheck },
  { key: "done", label: "Ready", icon: LayoutDashboard },
];

const stepNext: Record<string, string> = {
  template: "resource",
  resource: "business",
  business: "payments",
  payments: "first-booking",
  "first-booking": "done",
  done: "done",
};

const stepPrevious: Record<string, string> = {
  template: "template",
  resource: "template",
  business: "resource",
  payments: "business",
  "first-booking": "payments",
  done: "first-booking",
};

const hour12Options = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const minuteOptions = ["00", "15", "30", "45"];

const stepTitles: Record<string, { title: string; subtitle: string; action: string }> = {
  template: {
    title: "Siapkan alur booking pertamamu.",
    subtitle: "Kita bikin satu setup real: unit, paket harga, jam operasional, payment mode, lalu simulasi booking.",
    action: "Mulai setup",
  },
  resource: {
    title: "Buat unit dan paket pertamamu.",
    subtitle: "Customer nanti melihat cover, nama unit, dan harga mulai dari paket utama yang kamu isi di sini.",
    action: "Simpan unit pertama",
  },
  business: {
    title: "Atur dasar operasional bisnis.",
    subtitle: "Isi aturan dasar agar customer tahu kapan bisa booking dan bagaimana menghubungi kamu.",
    action: "Simpan info bisnis",
  },
  payments: {
    title: "Aktifkan metode pembayaran.",
    subtitle: "Default: Midtrans dan cash. Tambahkan transfer atau QRIS kalau sudah siap.",
    action: "Simpan pembayaran",
  },
  "first-booking": {
    title: "Coba simulasi booking pertama.",
    subtitle: "Preview bagaimana customer booking dan apa yang owner lihat di admin calendar.",
    action: "Lanjut ke langkah akhir",
  },
  done: {
    title: "Siap masuk dashboard.",
    subtitle: "Booking pertama sudah terset. Lanjutkan operasional dari dashboard admin.",
    action: "Buka dashboard",
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

function normalizeTenantClock(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "09:00";
  const hours = Math.min(23, Math.max(0, Number(match[1] || "9")));
  const minutes = Math.min(59, Math.max(0, Number(match[2] || "0")));
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function clockToMinutes(value: string) {
  const [hours, minutes] = normalizeTenantClock(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToClock(totalMinutes: number) {
  const safe = Math.max(0, Math.min(totalMinutes, 23 * 60 + 59));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getOperatingWindow(openTime: string, closeTime: string) {
  const openMinutes = clockToMinutes(openTime);
  let closeMinutes = clockToMinutes(closeTime);
  if (normalizeTenantClock(closeTime) === "23:59") {
    closeMinutes = 24 * 60;
  }
  if (closeMinutes <= openMinutes) {
    closeMinutes = 23 * 60 + 59;
  }
  return { openMinutes, closeMinutes };
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

function quantityUnitLabel(value: string) {
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

function nextUrl(step: string, workspaceId: string, slug?: string | null) {
  return `/app/onboarding/${step}?workspace=${workspaceId}${slug ? `&slug=${slug}` : ""}`;
}

export function OnboardingStepScreen({ step }: { step: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace");
  const workspaceSlug = searchParams.get("slug");
  const workspaceCategoryQuery = searchParams.get("category") || "";
  const currentIndex = Math.max(steps.findIndex((item) => item.key === step), 0);
  const copy = stepTitles[step] || stepTitles.template;
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
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bankTransferEnabled, setBankTransferEnabled] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankInstructions, setBankInstructions] = useState("");
  const [qrisStaticEnabled, setQrisStaticEnabled] = useState(false);
  const [qrisImageUrl, setQrisImageUrl] = useState("");
  const [qrisInstructions, setQrisInstructions] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingDate, setBookingDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bookingTime, setBookingTime] = useState("");
  const [bookingMode, setBookingMode] = useState<"scheduled" | "walkin">("scheduled");
  const [bookingQuantity, setBookingQuantity] = useState(0);
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
        const business = state.seed.business;
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

        if (business) {
          setOpenTime((current) => current || String(business.open_time || ""));
          setCloseTime((current) => current || String(business.close_time || ""));
          setWhatsapp((current) => current || String(business.whatsapp_number || ""));
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
  }, [workspaceId]);

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
  const businessValid = Boolean(openTime.trim() && closeTime.trim() && whatsapp.trim());
  const paymentsValid = Boolean(
    (!bankTransferEnabled || hasBankTransferConfig(bankName, bankAccountName, bankAccountNumber)) &&
    (!qrisStaticEnabled || hasQrisConfig(qrisImageUrl)),
  );
  const firstBookingValid = Boolean(
    bookingQuantity > 0 && bookingTime && bookingName.trim() && bookingPhone.trim(),
  );
  const continueDisabled = step === "resource"
    ? !resourceValid
    : step === "business"
      ? !businessValid
      : step === "payments"
        ? !paymentsValid
        : step === "first-booking"
          ? !firstBookingValid
          : false;

  async function continueStep() {
    if (!workspaceId) {
      toast.error("Workspace belum dipilih.");
      router.replace("/app/workspaces");
      return;
    }
    if (step === "done") {
      if (workspaceSlug) window.location.href = getTenantAdminEntryUrl(workspaceSlug, "/admin/dashboard");
      else router.replace("/app/workspaces");
      return;
    }
    if (step === "first-booking") {
      if (!bookingQuantity || bookingQuantity <= 0) {
        toast.error("Pilih resource, paket, dan jumlah booking dulu.");
        return;
      }
      if (!bookingTime) {
        toast.error("Pilih slot jam booking dulu.");
        return;
      }
      if (!bookingName.trim() || !bookingPhone.trim()) {
        toast.error("Isi nama dan WhatsApp customer simulasi.");
        return;
      }
    }

    setLoading(true);
    try {
      const target = stepNext[step] || "resource";
      const state = await updateWorkspaceOnboardingStep(workspaceId, step, {
        next_step: target,
        selected_start_mode: step === "template" ? "guided_real_setup" : undefined,
        complete: target === "done",
        ...(step === "resource"
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
        ...(step === "payments"
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
        ...(step === "business"
          ? {
              open_time: openTime || "09:00",
              close_time: closeTime || "22:00",
              whatsapp_number: whatsapp,
            }
          : {}),
        ...(step === "first-booking"
          ? {
              first_booking: {
                customer_name: bookingName,
                customer_phone: bookingPhone,
                booking_date: bookingDate,
                booking_time: bookingTime,
                booking_mode: bookingMode,
                quantity: bookingQuantity,
              },
            }
          : {}),
      });
      router.push(nextUrl(state.current_step, workspaceId, workspaceSlug));
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
    if (step === "template") {
      router.replace("/app/workspaces");
      return;
    }
    router.push(nextUrl(stepPrevious[step] || "template", workspaceId, workspaceSlug));
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:overflow-visible">
        <div className="flex flex-1 flex-col p-5 sm:p-6 lg:p-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">B</div>
            <div className="font-semibold">Bookinaja</div>
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

          {step === "template" ? (
            <StartStep categoryLabel={categoryProfile.label} />
          ) : step === "resource" ? (
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
          ) : step === "business" ? (
            <BusinessStep
              categoryProfile={categoryProfile}
              openTime={openTime}
              closeTime={closeTime}
              whatsapp={whatsapp}
              setOpenTime={setOpenTime}
              setCloseTime={setCloseTime}
              setWhatsapp={setWhatsapp}
            />
          ) : step === "payments" ? (
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
          ) : step === "first-booking" ? (
            <BookingExperienceStep
              categoryLabel={categoryProfile.label}
              bookingName={bookingName}
              bookingPhone={bookingPhone}
              bookingTime={bookingTime}
              bookingMode={bookingMode}
              bookingQuantity={bookingQuantity}
              setBookingName={setBookingName}
              setBookingPhone={setBookingPhone}
              setBookingDate={setBookingDate}
              setBookingTime={setBookingTime}
              setBookingMode={setBookingMode}
              setBookingQuantity={setBookingQuantity}
              resourceName={resourceName}
              priceName={priceName}
              priceUnit={priceUnit}
              price={price}
              duration={duration}
              openTime={openTime}
              closeTime={closeTime}
              paymentLabel={
                bankTransferEnabled && hasBankTransferConfig(bankName, bankAccountName, bankAccountNumber)
                  ? "Bank transfer"
                  : qrisStaticEnabled && hasQrisConfig(qrisImageUrl)
                    ? "QRIS static"
                    : "Cash / Midtrans"
              }
            />
          ) : (
            <DoneStep workspaceSlug={workspaceSlug} />
          )}

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

function StartStep({ categoryLabel }: { categoryLabel: string }) {
  const cards = [
    ["1", "Buat unit pertama", "Siapkan unit dan paket utama yang benar-benar akan dijual."],
    ["2", "Atur dasar operasional", "Jam operasional, kontak, dan payment mode disiapkan."],
    ["3", "Coba alur booking", "Lihat simulasi dari sisi customer sampai masuk admin."],
  ];
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <Sparkles className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-4xl font-semibold tracking-tight">Mari bikin workspace ini siap dipakai.</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
        Setup ini disesuaikan untuk kategori <span className="font-semibold text-slate-950">{categoryLabel}</span>, jadi contoh data dan tipsnya lebih relevan.
      </p>
      <div className="mt-8 grid gap-3 text-left">
        {cards.map(([number, title, description]) => (
          <div key={number} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
              {number}
            </div>
            <div>
              <div className="font-semibold">{title}</div>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
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
    const formData = new FormData();
    formData.append("image", file);
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

    if (props.priceUnit === "hour" && digits && digits !== "60") {
      props.setPriceUnit("session");
      return;
    }

    if (props.priceUnit === "day" && digits && digits !== "1440") {
      props.setPriceUnit("session");
    }
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
                  {" "}Kalau durasi kamu ubah dari
                  <span className="font-semibold text-slate-950"> 60 menit</span>, sistem akan membaca paket ini sebagai
                  <span className="font-semibold text-slate-950"> per sesi</span>.
                </>
              ) : null}
              {props.priceUnit === "day" ? (
                <>
                  {" "}Kalau durasi kamu ubah dari
                  <span className="font-semibold text-slate-950"> 1440 menit</span>, sistem akan membaca paket ini sebagai
                  <span className="font-semibold text-slate-950"> per sesi</span>.
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

function BusinessStep(props: {
  categoryProfile: ReturnType<typeof categoryProfileFor>;
  openTime: string;
  closeTime: string;
  whatsapp: string;
  setOpenTime: (value: string) => void;
  setCloseTime: (value: string) => void;
  setWhatsapp: (value: string) => void;
}) {
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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-700">
          Di langkah ini kita tentukan
          <span className="font-semibold text-slate-950"> kapan customer bisa booking</span> dan
          <span className="font-semibold text-slate-950"> ke nomor mana mereka diarahkan</span> kalau butuh konfirmasi cepat.
          <span className="mt-1 block text-slate-500">{props.categoryProfile.businessTip}</span>
        </div>
        <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Jam operasional</div>
            <h3 className="mt-2 text-lg font-semibold">Kapan booking dibuka</h3>
            <p className="mt-1 text-sm text-slate-500">
              Customer hanya akan melihat slot booking di rentang jam ini.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["09:00", "22:00", "09.00 - 22.00"],
              ["10:00", "22:00", "10.00 - 22.00"],
              ["00:00", "23:59", "24 jam"],
            ].map(([open, close, label]) => (
              <button
                key={`${open}-${close}`}
                type="button"
                onClick={() => {
                  props.setOpenTime(open);
                  props.setCloseTime(close);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  props.openTime === open && props.closeTime === close
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <GuidedField
              label="Jam buka"
              hint="Jam paling awal customer bisa melihat slot dan membuat booking."
              activeHint={activeHint}
              onFocus={() => setActiveHint("open_time")}
              hintKey="open_time"
            >
              <OnboardingTimePicker value={props.openTime} onChange={props.setOpenTime} placeholder="09:00" />
            </GuidedField>
            <GuidedField
              label="Jam tutup"
              hint="Jam terakhir booking masih bisa dijadwalkan di hari yang sama."
              activeHint={activeHint}
              onFocus={() => setActiveHint("close_time")}
              hintKey="close_time"
            >
              <OnboardingTimePicker value={props.closeTime} onChange={props.setCloseTime} placeholder="22:00" />
            </GuidedField>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Kontak cepat</div>
            <h3 className="mt-2 text-lg font-semibold">Nomor WhatsApp bisnis</h3>
            <p className="mt-1 text-sm text-slate-500">
              Ini dipakai kalau customer perlu tanya jadwal, konfirmasi, atau follow-up cepat.
            </p>
          </div>
          <GuidedField
            label="WhatsApp bisnis"
            hint="Pakai nomor yang benar-benar aktif untuk admin atau CS. Contoh: 0812xxxx atau 62812xxxx."
            activeHint={activeHint}
            onFocus={() => setActiveHint("whatsapp")}
            hintKey="whatsapp"
          >
            <div className="relative">
              <MessageCircle className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <OnboardingInput
                value={props.whatsapp}
                onChange={(event) => props.setWhatsapp(event.target.value)}
                placeholder="08123456789"
                autoComplete="off"
                inputMode="tel"
                className="pl-11"
              />
            </div>
          </GuidedField>
        </section>
      </div>
      <div className="lg:sticky lg:top-8 lg:self-start">
        <PreviewCard title="Preview public booking">
          <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_48px_rgba(15,23,42,0.08)]">
            <div className="rounded-2xl bg-blue-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Customer bisa booking</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {props.openTime || "09:00"} - {props.closeTime || "22:00"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Kontak follow-up</div>
              <div className="mt-2 flex items-center gap-3 text-sm text-slate-700">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                <span>{props.whatsapp || "Nomor WhatsApp bisnis akan tampil di sini"}</span>
              </div>
            </div>
            <div className="space-y-3">
              <InfoLine icon={Clock3} label={`Booking dibuka ${props.openTime || "09:00"} - ${props.closeTime || "22:00"}`} />
              <InfoLine icon={CalendarCheck} label="Kalender customer mengikuti jam operasional ini" />
              <InfoLine icon={Building2} label="Customer tahu ke mana harus kontak saat butuh bantuan" />
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

    const formData = new FormData();
    formData.append("image", file);
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

/* eslint-disable @typescript-eslint/no-unused-vars */
// Legacy step kept temporarily while richer admin-like preview is used below.
function BookingStep(props: {
  bookingName: string;
  bookingPhone: string;
  bookingTime: string;
  bookingMode: "scheduled" | "walkin";
  resourceName: string;
  price: string;
  duration: string;
  openTime: string;
  closeTime: string;
  paymentLabel: string;
  setBookingName: (value: string) => void;
  setBookingPhone: (value: string) => void;
  setBookingTime: (value: string) => void;
  setBookingMode: (value: "scheduled" | "walkin") => void;
}) {
  const [selectedDay, setSelectedDay] = useState<"today" | "tomorrow">("today");
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const unitMinutes = Math.max(Number(props.duration || 60), 30);
  const startClock = normalizeTenantClock(props.openTime || "09:00");
  const endClock = normalizeTenantClock(props.closeTime || "22:00");
  const operatingWindow = getOperatingWindow(startClock, endClock);
  const effectiveDay = props.bookingMode === "walkin" ? "today" : selectedDay;
  const dateLabel = effectiveDay === "today" ? "Hari ini" : "Besok";
  const bookingDate = effectiveDay === "today" ? new Date() : addDays(new Date(), 1);
  const availableSlots = useMemo(() => {
    const slots: string[] = [];
    let currentMinutes = operatingWindow.openMinutes;
    while (currentMinutes + unitMinutes <= operatingWindow.closeMinutes) {
      slots.push(minutesToClock(currentMinutes));
      currentMinutes += unitMinutes;
    }
    return slots;
  }, [operatingWindow.closeMinutes, operatingWindow.openMinutes, unitMinutes]);

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

  const endTime = useMemo(() => {
    if (!props.bookingTime) return "";
    const [hours, minutes] = props.bookingTime.split(":").map(Number);
    return format(addMinutes(new Date(2026, 0, 1, hours || 0, minutes || 0), unitMinutes), "HH:mm");
  }, [props.bookingTime, unitMinutes]);

  const statusLabel = props.bookingMode === "walkin" ? "active" : "pending";
  const statusTone = props.bookingMode === "walkin" ? "bg-emerald-500 text-white" : "bg-orange-500 text-white";
  const destinationLabel = props.bookingMode === "walkin" ? "Masuk ke POS" : "Masuk ke kalender booking";
  const summaryTitle = props.bookingMode === "walkin" ? "Sesi langsung dibuka" : "Booking masuk ke antrean";
  const summaryNote = props.bookingMode === "walkin"
    ? "Owner lanjut billing dan kontrol sesi dari POS."
    : "Owner melihat booking ini di kalender lalu lanjut ke detail booking.";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-700">
          Step ini mensimulasikan flow create booking dari admin.
          <span className="font-semibold text-slate-950"> Scheduled</span> masuk ke kalender.
          <span className="font-semibold text-slate-950"> Walk-in</span> langsung buka sesi ke POS.
        </div>

        <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">2. Jalur kerja</div>
            <h3 className="mt-2 text-lg font-semibold">Tentukan alur masuknya</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["scheduled", "Scheduled booking", "Masuk ke kalender"],
              ["walkin", "Walk-in / right away", "Langsung ke POS"],
            ].map(([value, title, note]) => {
              const active = props.bookingMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    const nextMode = value as "scheduled" | "walkin";
                    props.setBookingMode(nextMode);
                    props.setBookingTime("");
                    if (nextMode === "walkin" && selectedDay !== "today") setSelectedDay("today");
                  }}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    active
                      ? "border-blue-500 bg-blue-50 text-slate-950 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/40"
                  }`}
                >
                  <div className="font-semibold">{title}</div>
                  <div className="mt-1 text-sm text-slate-500">{note}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Jadwal</div>
            <h3 className="mt-2 text-lg font-semibold">Pilih hari dan slot mulai</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["today", "Hari ini"],
              ["tomorrow", "Besok"],
            ].map(([value, label]) => {
              const disabled = props.bookingMode === "walkin" && value === "tomorrow";
              const active = effectiveDay === value;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedDay(value as "today" | "tomorrow")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    disabled
                      ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-300"
                      : active
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/40"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Jam operasional {startClock} - {endClock} | durasi paket {unitMinutes} menit
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {availableSlots.map((slot) => {
              const active = props.bookingTime === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => props.setBookingTime(slot)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/40"
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Customer</div>
            <h3 className="mt-2 text-lg font-semibold">Isi profil booking</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <GuidedField
              label="Nama customer"
              hint="Nama ini tampil di daftar booking, kalender, dan detail booking admin."
              activeHint={activeHint}
              onFocus={() => setActiveHint("booking_name")}
              hintKey="booking_name"
            >
              <OnboardingInput
                value={props.bookingName}
                onChange={(event) => props.setBookingName(event.target.value)}
                placeholder="Demo Customer"
              />
            </GuidedField>
            <GuidedField
              label="WhatsApp"
              hint="Nomor ini dipakai untuk follow-up, konfirmasi, dan portal booking customer."
              activeHint={activeHint}
              onFocus={() => setActiveHint("booking_phone")}
              hintKey="booking_phone"
            >
              <OnboardingInput
                value={props.bookingPhone}
                onChange={(event) => props.setBookingPhone(digitsOnly(event.target.value))}
                inputMode="tel"
                placeholder="08123456789"
              />
            </GuidedField>
          </div>
        </section>
      </div>
      <div className="space-y-5 lg:sticky lg:top-8 lg:self-start">
        <PreviewCard title="Admin receives">
          <div className="space-y-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_48px_rgba(15,23,42,0.08)] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">{dateLabel}</div>
                <div className="mt-2 text-lg font-semibold text-slate-950">{summaryTitle}</div>
                <p className="mt-1 text-sm text-slate-500">{summaryNote}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}>
                {statusLabel}
              </span>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Ringkasan booking</div>
              <div className="mt-3 font-semibold text-slate-950">{props.resourceName || "Unit pertama"}</div>
              <div className="mt-1 text-sm text-slate-500">
                {props.bookingName || "Demo Customer"} | {props.bookingPhone || "08xxxxxxxxxx"}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span>{format(bookingDate, "dd MMM yyyy")} | {props.bookingTime || "--:--"}{endTime ? ` - ${endTime}` : ""}</span>
                <span className="font-semibold">Rp{Number(props.price || 0).toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {props.bookingMode === "walkin" ? "POS session card" : "Calendar lane"}
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-950">{props.resourceName || "Unit pertama"}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {props.bookingTime || "--:--"}{endTime ? ` - ${endTime}` : ""} | {props.bookingName || "Demo Customer"}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone}`}>
                    {statusLabel}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm">
                  <span>{props.paymentLabel}</span>
                  <span>{destinationLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </PreviewCard>
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-unused-vars */

function BookingExperienceStep(props: {
  categoryLabel: string;
  bookingName: string;
  bookingPhone: string;
  bookingTime: string;
  bookingMode: "scheduled" | "walkin";
  bookingQuantity: number;
  resourceName: string;
  priceName: string;
  priceUnit: string;
  price: string;
  duration: string;
  openTime: string;
  closeTime: string;
  paymentLabel: string;
  setBookingName: (value: string) => void;
  setBookingPhone: (value: string) => void;
  setBookingDate: (value: string) => void;
  setBookingTime: (value: string) => void;
  setBookingMode: (value: "scheduled" | "walkin") => void;
  setBookingQuantity: (value: number) => void;
}) {
  const bookingTime = props.bookingTime;
  const setBookingTime = props.setBookingTime;
  const quantity = props.bookingQuantity;
  const setQuantity = props.setBookingQuantity;
  const setBookingDate = props.setBookingDate;
  const todayValue = format(new Date(), "yyyy-MM-dd");
  const tomorrowDate = addDays(new Date(), 1);
  const tomorrowValue = format(tomorrowDate, "yyyy-MM-dd");
  const [selectedResource, setSelectedResource] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(false);
  const [selectedDay, setSelectedDay] = useState<"today" | "tomorrow" | "custom">("today");
  const [customDate, setCustomDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const baseUnitMinutes = Math.max(Number(props.duration || 60), 30);
  const selectionReady = selectedResource && selectedPackage;
  const unitMinutes = baseUnitMinutes * Math.max(quantity, 1);
  const startClock = normalizeTenantClock(props.openTime || "09:00");
  const endClock = normalizeTenantClock(props.closeTime || "22:00");
  const operatingWindow = getOperatingWindow(startClock, endClock);
  const maxQuantity = Math.max(1, Math.floor((operatingWindow.closeMinutes - operatingWindow.openMinutes) / baseUnitMinutes));
  const effectiveDay = props.bookingMode === "walkin" ? "today" : selectedDay;
  const bookingDateValue = effectiveDay === "today"
    ? todayValue
    : effectiveDay === "tomorrow"
      ? tomorrowValue
      : customDate;
  const bookingDate = new Date(`${bookingDateValue}T12:00:00`);
  const dateLabel = effectiveDay === "today"
    ? "Hari ini"
    : effectiveDay === "tomorrow"
      ? "Besok"
      : format(bookingDate, "dd MMM");
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const availableSlots = useMemo(() => {
    const slots: { value: string; label: string; note?: string; disabled: boolean }[] = [];
    let currentMinutes = operatingWindow.openMinutes;
    while (currentMinutes + unitMinutes <= operatingWindow.closeMinutes) {
      const value = minutesToClock(currentMinutes);
      const isPast = bookingDateValue === todayValue && currentMinutes <= nowMinutes;
      slots.push({
        value,
        label: props.priceUnit === "day" ? "Full day" : value,
        note: props.priceUnit === "day" ? `${startClock} - ${props.closeTime || "23:59"}` : isPast ? "Lewat" : undefined,
        disabled: isPast,
      });
      currentMinutes += baseUnitMinutes;
    }
    return slots;
  }, [baseUnitMinutes, bookingDateValue, nowMinutes, operatingWindow.closeMinutes, operatingWindow.openMinutes, props.closeTime, props.priceUnit, startClock, todayValue, unitMinutes]);

  useEffect(() => {
    setBookingDate(bookingDateValue);
  }, [bookingDateValue, setBookingDate]);

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

  useEffect(() => {
    if (!bookingTime) return;
    if (!selectionReady || !availableSlots.some((slot) => slot.value === bookingTime && !slot.disabled)) {
      setBookingTime("");
    }
  }, [availableSlots, bookingTime, selectionReady, setBookingTime]);

  const endTime = useMemo(() => {
    if (!props.bookingTime) return "";
    const [hours, minutes] = props.bookingTime.split(":").map(Number);
    return format(addMinutes(new Date(2026, 0, 1, hours || 0, minutes || 0), unitMinutes), "HH:mm");
  }, [props.bookingTime, unitMinutes]);

  const statusLabel = props.bookingMode === "walkin" ? "active" : "pending";
  const statusTone = props.bookingMode === "walkin" ? "bg-emerald-500 text-white" : "bg-orange-500 text-white";
  const destinationLabel = props.bookingMode === "walkin" ? "Masuk ke POS" : "Masuk ke kalender booking";
  const summaryTitle = props.bookingMode === "walkin" ? "Sesi langsung dibuka" : "Booking masuk ke antrean";
  const summaryNote = props.bookingMode === "walkin"
    ? "Owner lanjut billing dan kontrol sesi dari POS."
    : "Owner melihat booking ini di kalender lalu lanjut ke detail booking.";
  const packageLabel = props.priceName || "Paket utama";
  const unitLabel = priceUnitLabel(props.priceUnit);
  const quantityLabel = quantityUnitLabel(props.priceUnit);
  const bookingTotal = Number(props.price || 0) * quantity;
  const timeRangeLabel = props.bookingTime
    ? props.priceUnit === "day"
      ? `${startClock} - ${props.closeTime || "23:59"}`
      : `${props.bookingTime}${endTime ? ` - ${endTime}` : ""}`
    : "--:--";
  const paymentTypeTone = props.paymentLabel.includes("Bank") || props.paymentLabel.includes("QRIS")
    ? "bg-sky-50 text-sky-700"
    : props.paymentLabel.includes("Cash")
      ? "bg-slate-100 text-slate-700"
      : "bg-emerald-50 text-emerald-700";
  const paymentStateLabel = props.bookingMode === "walkin"
    ? "unpaid"
    : props.paymentLabel.includes("Bank") || props.paymentLabel.includes("QRIS")
      ? "pending manual"
      : "pending dp";
  const paymentStateTone = props.bookingMode === "walkin"
    ? "bg-rose-50 text-rose-700"
    : "bg-amber-50 text-amber-700";
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-700">
          Simulasikan booking admin untuk kategori {props.categoryLabel}.
        </div>

        <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">1. Unit & paket</div>
            <h3 className="mt-2 text-lg font-semibold">Pilih dulu yang dibooking</h3>
            <p className="mt-1 text-sm text-slate-500">Mulai dari unit, lalu paket utamanya.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setSelectedResource(true);
                setSelectedPackage(false);
                setQuantity(0);
                props.setBookingTime("");
              }}
              className={`rounded-2xl border p-4 text-left transition ${
                selectedResource
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-white"
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Unit</div>
              <div className="mt-2 font-semibold text-slate-950">{props.resourceName || "Unit pertama"}</div>
              <div className="mt-1 text-sm text-slate-500">
                {selectedResource ? "Unit dipilih" : "Klik untuk pilih unit"}
              </div>
            </button>
            <button
              type="button"
              disabled={!selectedResource}
              onClick={() => {
                if (!selectedResource) return;
                setSelectedPackage(true);
                setQuantity(1);
                props.setBookingTime("");
              }}
              className={`rounded-2xl border p-4 text-left transition ${
                !selectedResource
                  ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                  : selectedPackage
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-white"
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Paket utama</div>
              <div className="mt-2 font-semibold text-slate-950">{packageLabel}</div>
              <div className="mt-1 text-sm text-slate-500">
                Rp{Number(props.price || 0).toLocaleString("id-ID")} / {unitLabel}
              </div>
              <div className="mt-2 text-sm text-slate-500">
                {!selectedResource ? "Pilih unit dulu" : selectedPackage ? "Paket dipilih" : "Klik untuk pilih paket"}
              </div>
            </button>
          </div>
        </section>

        <section className={`space-y-4 rounded-2xl border p-4 transition ${selectionReady ? "border-slate-200" : "border-slate-100 bg-slate-50/70 opacity-70"}`}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">2. Jadwal</div>
            <h3 className="mt-2 text-lg font-semibold">Pilih hari dan slot mulai</h3>
            {!selectionReady ? (
              <p className="mt-1 text-sm text-slate-500">Selesaikan step di atas dulu.</p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["scheduled", "Scheduled booking", "Masuk ke kalender"],
              ["walkin", "Walk-in / right away", "Langsung ke POS"],
            ].map(([value, title, note]) => {
              const active = props.bookingMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    const nextMode = value as "scheduled" | "walkin";
                    props.setBookingMode(nextMode);
                    props.setBookingTime("");
                  }}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    active
                      ? "border-blue-500 bg-blue-50 text-slate-950 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/40"
                  }`}
                >
                  <div className="font-semibold">{title}</div>
                  <div className="mt-1 text-sm text-slate-500">{note}</div>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["today", "Hari ini"],
              ["tomorrow", "Besok"],
            ].map(([value, label]) => {
              const disabled = props.bookingMode === "walkin" && value !== "today";
              const active = effectiveDay === value;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={disabled || !selectionReady}
                  onClick={() => setSelectedDay(value as "today" | "tomorrow")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    disabled || !selectionReady
                      ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-300"
                      : active
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/40"
                  }`}
                >
                  {label}
                </button>
              );
            })}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={props.bookingMode === "walkin" || !selectionReady}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    props.bookingMode === "walkin" || !selectionReady
                      ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-300"
                      : effectiveDay === "custom"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/40"
                  }`}
                >
                  <span>Kalender</span>
                  <span>{format(bookingDate, "dd/MM/yyyy")}</span>
                  <CalendarIcon className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
              >
                <Calendar
                  mode="single"
                  selected={bookingDate}
                  onSelect={(value) => {
                    if (!value) return;
                    const nextValue = format(value, "yyyy-MM-dd");
                    if (nextValue === todayValue) {
                      setSelectedDay("today");
                    } else if (nextValue === tomorrowValue) {
                      setSelectedDay("tomorrow");
                    } else {
                      setSelectedDay("custom");
                      setCustomDate(nextValue);
                    }
                    setCalendarOpen(false);
                  }}
                  disabled={(date) => format(date, "yyyy-MM-dd") < todayValue}
                  initialFocus
                  className="w-full [--cell-size:2.5rem]"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Jam operasional {startClock} - {props.closeTime || "23:59"} | dasar slot {baseUnitMinutes} menit
          </div>
          {selectionReady && !availableSlots.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
              {quantity > maxQuantity
                ? `Jumlah ${quantityLabel} melebihi kapasitas harian. Maksimal ${maxQuantity} ${quantityLabel}.`
                : `Durasi total ${unitMinutes} menit tidak muat di rentang operasional ini. Kurangi jumlah ${quantityLabel} atau ubah jam buka-tutup.`}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 min-[520px]:grid-cols-3 sm:grid-cols-4">
              {availableSlots.map((slot) => {
                const active = props.bookingTime === slot.value;
                return (
                  <button
                    key={slot.value}
                    type="button"
                    disabled={!selectionReady || slot.disabled}
                    onClick={() => props.setBookingTime(slot.value)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      !selectionReady || slot.disabled
                        ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-300"
                        : active
                          ? "border-blue-500 bg-blue-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/40"
                    }`}
                  >
                    <div>{slot.label}</div>
                    {slot.note ? (
                      <div className={`mt-1 text-[11px] font-medium ${active ? "text-blue-100" : slot.disabled ? "text-rose-500" : "text-slate-400"}`}>
                        {slot.note}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className={`space-y-4 rounded-2xl border p-4 transition ${selectedPackage ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">3. Durasi booking</div>
          <h4 className="text-base font-semibold text-slate-950">Tentukan jumlah {quantityLabel}</h4>
          <p className="text-sm text-slate-500">
            Maksimal {maxQuantity} {quantityLabel} dari jam operasional dan paket dasar yang kamu isi.
          </p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={!selectedPackage || quantity <= 1}
              onClick={() => {
                if (!selectedPackage) return;
                const next = Math.max(1, quantity - 1);
                setQuantity(next);
                props.setBookingTime("");
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300"
            >
              -
            </button>
            <div className="min-w-[136px] rounded-2xl bg-slate-50 px-4 py-3 text-center sm:min-w-[160px]">
              <div className="text-2xl font-semibold text-slate-950">{quantity || "--"}</div>
              <div className="mt-1 text-sm text-slate-500">
                {quantity > 0 ? `${quantity} ${quantityLabel}` : "Pilih paket dulu"}
              </div>
            </div>
            <button
              type="button"
              disabled={!selectedPackage || quantity >= maxQuantity}
              onClick={() => {
                if (!selectedPackage) return;
                const next = Math.min(maxQuantity, Math.max(1, quantity + 1));
                setQuantity(next);
                props.setBookingTime("");
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300"
            >
              +
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: Math.min(4, maxQuantity) }, (_, index) => index + 1).map((value) => (
              <button
                key={value}
                type="button"
                disabled={!selectedPackage}
                onClick={() => {
                  if (!selectedPackage) return;
                  setQuantity(value);
                  props.setBookingTime("");
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  !selectedPackage
                    ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                    : quantity === value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/40"
                }`}
              >
                {value} {quantityLabel}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">4. Customer</div>
            <h3 className="mt-2 text-lg font-semibold">Isi profil booking</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <GuidedField
              label="Nama customer"
              hint="Nama ini tampil di daftar booking, kalender, dan detail booking admin."
              activeHint={activeHint}
              onFocus={() => setActiveHint("booking_name")}
              hintKey="booking_name"
            >
              <OnboardingInput
                value={props.bookingName}
                onChange={(event) => props.setBookingName(event.target.value)}
                placeholder="Demo Customer"
              />
            </GuidedField>
            <GuidedField
              label="WhatsApp"
              hint="Nomor ini dipakai untuk follow-up, konfirmasi, dan portal booking customer."
              activeHint={activeHint}
              onFocus={() => setActiveHint("booking_phone")}
              hintKey="booking_phone"
            >
              <OnboardingInput
                value={props.bookingPhone}
                onChange={(event) => props.setBookingPhone(digitsOnly(event.target.value))}
                inputMode="tel"
                placeholder="08123456789"
              />
            </GuidedField>
          </div>
        </section>
      </div>

      <div className="space-y-5 lg:sticky lg:top-8 lg:self-start">
        <PreviewCard title="Admin receives">
          <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">{dateLabel}</div>
                <div className="mt-2 text-lg font-semibold text-slate-950">{summaryTitle}</div>
                <p className="mt-1 text-sm text-slate-500">{summaryNote}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}>
                {statusLabel}
              </span>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Ringkasan</div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-950">
                    {selectedResource ? (props.resourceName || "Unit pertama") : "Pilih unit"}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {format(bookingDate, "dd MMM yyyy")} | {timeRangeLabel}
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-950">Rp{bookingTotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {quantity > 0 ? `${quantity} ${quantityLabel}` : `Pilih jumlah ${quantityLabel}`}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${paymentTypeTone}`}>
                  {props.paymentLabel}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${paymentStateTone}`}>
                  {paymentStateLabel}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {props.bookingMode === "walkin" ? "POS session card" : "Agenda booking"}
              </div>
              <div className="rounded-2xl border border-slate-200 p-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {selectedResource ? (props.resourceName || "Unit pertama") : "Resource"}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">
                        {format(bookingDate, "dd MMM yyyy")}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {props.bookingMode === "walkin" ? "Masuk ke sesi aktif / POS" : "Muncul di agenda booking admin"}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-semibold text-slate-950">
                          {selectedResource ? (props.resourceName || "Unit pertama") : "Pilih unit"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {timeRangeLabel} | {props.bookingName || "Demo Customer"}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          {selectedPackage ? packageLabel : "Pilih paket"} | {quantity > 0 ? `${quantity} ${quantityLabel}` : `Pilih jumlah ${quantityLabel}`}
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-sm font-semibold text-slate-950">
                          Rp{bookingTotal.toLocaleString("id-ID")}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 sm:justify-end">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${paymentTypeTone}`}>
                            {props.paymentLabel}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${paymentStateTone}`}>
                            {paymentStateLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
                    <span className="font-semibold text-slate-950">Next:</span> {destinationLabel}
                  </div>
                  <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
                    <span className="font-semibold text-slate-950">Phone:</span> {props.bookingPhone || "08xxxxxxxxxx"}
                  </div>
                </div>
              </div>
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

function DoneStep({ workspaceSlug }: { workspaceSlug?: string | null }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <Check className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-3xl font-semibold tracking-tight">Selamat, booking manual pertamamu sudah berhasil dibuat.</h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        Customer juga bisa booking dari sisi customer, dan booking baru akan masuk ke dashboard kamu.
      </p>
      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Lanjut ke dashboard untuk cek booking masuk dan rapikan data real.
      </div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
        {workspaceSlug ? `${workspaceSlug}.bookinaja.com/admin` : "Workspace admin"}
      </div>
    </div>
  );
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
          ← Kembali
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

function OnboardingTimePicker({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const initial = parseTimeToParts(value || placeholder);
  const [draftHour, setDraftHour] = useState(initial.hour);
  const [draftMinute, setDraftMinute] = useState(initial.minute);
  const [draftPeriod, setDraftPeriod] = useState<"AM" | "PM">(initial.period);

  function syncDraftFromValue() {
    const next = parseTimeToParts(value || placeholder);
    setDraftHour(next.hour);
    setDraftMinute(next.minute);
    setDraftPeriod(next.period);
  }

  function applyDraft() {
    onChange(to24HourTime(draftHour, draftMinute, draftPeriod));
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) syncDraftFromValue();
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-12 w-full items-center justify-between rounded-xl border-2 border-slate-300 bg-white px-4 text-left text-base font-medium text-slate-950 shadow-[inset_0_1px_0_rgba(15,23,42,0.04)] outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <span className={value ? "text-slate-950" : "text-slate-400"}>
            {value ? formatTimeDisplay(value) : placeholder}
          </span>
          <Clock3 className="h-4 w-4 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] overflow-hidden rounded-2xl p-0">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-lg font-semibold">Select Time</div>
        </div>
        <div className="space-y-5 px-5 py-5">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Hour</div>
            <PickerButtonGrid value={draftHour} options={hour12Options} onChange={setDraftHour} columns="grid-cols-6" />
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Minutes</div>
              <PickerButtonGrid value={draftMinute} options={minuteOptions} onChange={setDraftMinute} columns="grid-cols-4" />
            </div>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
            {(["AM", "PM"] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setDraftPeriod(period)}
                className={`rounded-lg px-3 py-1.5 ${
                  draftPeriod === period ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"
                }`}
              >
                {period}
              </button>
            ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={applyDraft}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PickerButtonGrid({
  value,
  options,
  onChange,
  columns,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  columns: string;
}) {
  return (
    <div className={`grid gap-2 ${columns}`}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`h-10 rounded-lg text-sm font-semibold transition ${
            value === option
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
          }`}
        >
            {option}
        </button>
      ))}
    </div>
  );
}

function parseTimeToParts(value: string) {
  const [rawHour, rawMinute] = value.split(":");
  const parsedHour = Number(rawHour);
  const hour24 = Number.isFinite(parsedHour) ? parsedHour : 9;
  const minute = minuteOptions.includes(rawMinute) ? rawMinute : "00";
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return {
    hour: String(hour12).padStart(2, "0"),
    minute,
    period: period as "AM" | "PM",
  };
}

function to24HourTime(hour: string, minute: string, period: "AM" | "PM") {
  let hourNumber = Number(hour);
  if (period === "AM" && hourNumber === 12) hourNumber = 0;
  if (period === "PM" && hourNumber !== 12) hourNumber += 12;
  return `${String(hourNumber).padStart(2, "0")}:${minute}`;
}

function formatTimeDisplay(value: string) {
  const parts = parseTimeToParts(value);
  return `${Number(parts.hour)}:${parts.minute} ${parts.period}`;
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

function InfoLine({ icon: Icon, label }: { icon: typeof Clock3; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-3 rounded-xl bg-white p-3 text-sm text-slate-600">
      <Icon className="h-4 w-4 text-blue-600" />
      {label}
    </div>
  );
}
