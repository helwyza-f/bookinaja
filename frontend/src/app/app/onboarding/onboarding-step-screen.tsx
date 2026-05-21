"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarCheck,
  Check,
  Clock3,
  Gamepad2,
  ImagePlus,
  LayoutDashboard,
  MessageCircle,
  Sparkles,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import api from "@/lib/api";
import { getTenantUrl } from "@/lib/tenant";
import { updateWorkspaceOnboardingStep } from "@/lib/workspace-client";

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
    title: "Set up a booking flow customers can use today.",
    subtitle: "Kita akan buat satu contoh real: resource, harga, jam operasional, payment mode, lalu simulasi booking.",
    action: "Start setup",
  },
  resource: {
    title: "Create your first bookable resource.",
    subtitle: "Ini data real pertama. Resource dan harga ini langsung disimpan ke workspace kamu.",
    action: "Create resource",
  },
  business: {
    title: "Define how your business accepts bookings.",
    subtitle: "Isi aturan dasar agar customer tahu kapan bisa booking dan bagaimana menghubungi kamu.",
    action: "Save business basics",
  },
  payments: {
    title: "Set up payment methods.",
    subtitle: "Default: Midtrans dan cash. Tambahkan transfer atau QRIS kalau sudah siap.",
    action: "Save payment methods",
  },
  "first-booking": {
    title: "Run a first booking simulation.",
    subtitle: "Preview bagaimana customer booking dan apa yang owner lihat di admin calendar.",
    action: "Finish onboarding",
  },
  done: {
    title: "Workspace is ready.",
    subtitle: "Masuk dashboard untuk melihat resource, kalender, dan checklist setup lanjutan.",
    action: "Open dashboard",
  },
};

const templates = [
  { name: "PS5 Room 1", category: "gaming_room", price: 25000, unit: "hour", duration: 60 },
  { name: "Studio A", category: "studio", price: 150000, unit: "session", duration: 120 },
  { name: "Court 1", category: "court", price: 80000, unit: "hour", duration: 60 },
];

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

function nextUrl(step: string, workspaceId: string, slug?: string | null) {
  return `/app/onboarding/${step}?workspace=${workspaceId}${slug ? `&slug=${slug}` : ""}`;
}

export function OnboardingStepScreen({ step }: { step: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace");
  const workspaceSlug = searchParams.get("slug");
  const currentIndex = Math.max(steps.findIndex((item) => item.key === step), 0);
  const copy = stepTitles[step] || stepTitles.template;
  const [loading, setLoading] = useState(false);
  const [resourceName, setResourceName] = useState("");
  const [resourceCategory, setResourceCategory] = useState("");
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
  const [bookingTime, setBookingTime] = useState("");

  async function continueStep() {
    if (!workspaceId) {
      toast.error("Workspace belum dipilih.");
      router.replace("/app/workspaces");
      return;
    }
    if (step === "done") {
      if (workspaceSlug) window.location.href = getTenantUrl(workspaceSlug, "/admin/dashboard");
      else router.replace("/app/workspaces");
      return;
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
              resource_category: resourceCategory,
              price_name: "Standard",
              price: Number(price || 0),
              price_unit: "hour",
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
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
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
            <StartStep />
          ) : step === "resource" ? (
            <ResourceStep
              resourceName={resourceName}
              resourceCategory={resourceCategory}
              price={price}
              duration={duration}
              setResourceName={setResourceName}
              setResourceCategory={setResourceCategory}
              setPrice={setPrice}
              setDuration={setDuration}
            />
          ) : step === "business" ? (
            <BusinessStep
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
            <BookingStep
              bookingName={bookingName}
              bookingTime={bookingTime}
              setBookingName={setBookingName}
              setBookingTime={setBookingTime}
              resourceName={resourceName}
              price={price}
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
            onBack={backStep}
            onContinue={continueStep}
          />
        </div>
      </section>
    </main>
  );
}

function StartStep() {
  const cards = [
    ["1", "Create a real resource", "Buat unit pertama yang bisa dibooking customer."],
    ["2", "Set booking rules", "Jam operasional dan kontak bisnis disiapkan."],
    ["3", "Simulate a booking", "Lihat customer journey sampai masuk admin."],
  ];
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <Sparkles className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-4xl font-semibold tracking-tight">Let’s make your workspace usable.</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
        Bukan tour pasif. Kita akan membuat data pertama dan preview flow booking yang sama seperti produk asli.
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
  resourceName: string;
  resourceCategory: string;
  price: string;
  duration: string;
  setResourceName: (value: string) => void;
  setResourceCategory: (value: string) => void;
  setPrice: (value: string) => void;
  setDuration: (value: string) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <Label>Resource name</Label>
            <OnboardingInput
              value={props.resourceName}
              onChange={(event) => props.setResourceName(event.target.value)}
              placeholder="PS5 Room 1"
            />
          </label>
          <label className="space-y-2">
            <Label>Type</Label>
            <OnboardingInput
              value={props.resourceCategory}
              onChange={(event) => props.setResourceCategory(event.target.value)}
              placeholder="gaming_room"
            />
          </label>
          <label className="space-y-2">
            <Label>Price</Label>
            <OnboardingInput
              value={props.price}
              onChange={(event) => props.setPrice(event.target.value)}
              inputMode="numeric"
              placeholder="25000"
            />
          </label>
          <label className="space-y-2">
            <Label>Duration (minutes)</Label>
            <OnboardingInput
              value={props.duration}
              onChange={(event) => props.setDuration(event.target.value)}
              inputMode="numeric"
              placeholder="60"
            />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {templates.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                props.setResourceName(item.name);
                props.setResourceCategory(item.category);
                props.setPrice(String(item.price));
                props.setDuration(String(item.duration));
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:border-blue-300 hover:bg-blue-50"
            >
              <div className="font-semibold">{item.name}</div>
              <div className="mt-1 text-xs text-slate-500">Rp{item.price.toLocaleString("id-ID")} / {item.unit}</div>
            </button>
          ))}
        </div>
      </div>
      <PreviewCard title="Customer sees">
        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <div className="text-lg font-semibold">{props.resourceName || "Resource name"}</div>
          <div className="mt-2 text-sm text-slate-300">{props.duration || "60"} menit</div>
          <div className="mt-5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950">
            Rp{Number(props.price || 0).toLocaleString("id-ID")}
          </div>
        </div>
      </PreviewCard>
    </div>
  );
}

function BusinessStep(props: {
  openTime: string;
  closeTime: string;
  whatsapp: string;
  setOpenTime: (value: string) => void;
  setCloseTime: (value: string) => void;
  setWhatsapp: (value: string) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <Label>Open time</Label>
            <OnboardingTimePicker value={props.openTime} onChange={props.setOpenTime} placeholder="09:00" />
          </label>
          <label className="space-y-2">
            <Label>Close time</Label>
            <OnboardingTimePicker value={props.closeTime} onChange={props.setCloseTime} placeholder="22:00" />
          </label>
        </div>
        <label className="block space-y-2">
          <Label>WhatsApp for booking follow-up</Label>
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
        </label>
      </div>
      <PreviewCard title="Public page behavior">
        <InfoLine icon={Clock3} label={`Booking available ${props.openTime || "09:00"} - ${props.closeTime || "22:00"}`} />
        <InfoLine icon={Building2} label="Business profile appears on public page" />
        <InfoLine icon={CalendarCheck} label="Calendar uses your operating hours" />
      </PreviewCard>
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
  const bankConfigured = hasBankTransferConfig(props.bankName, props.bankAccountName, props.bankAccountNumber);
  const qrisConfigured = hasQrisConfig(props.qrisImageUrl);
  const bankActive = props.bankTransferEnabled && bankConfigured;
  const qrisActive = props.qrisStaticEnabled && qrisConfigured;
  const bankStatus: PaymentStatus = bankActive ? "active" : props.bankTransferEnabled ? "required" : "off";
  const qrisStatus: PaymentStatus = qrisActive ? "active" : props.qrisStaticEnabled ? "required" : "off";

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
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
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

        {panel === "methods" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <PaymentMethodCard
              title="Midtrans / QRIS Gateway"
              description="Auto verification"
              status="active"
              locked
            />
            <PaymentMethodCard
              title="Cash / Bayar di tempat"
              description="Manual settlement"
              status="active"
              locked
            />
            <PaymentMethodCard
              title="Transfer manual"
              description={bankActive ? "Configured" : props.bankTransferEnabled ? "Complete bank details" : "Optional"}
              status={bankStatus}
              onClick={() => setPanel("bank")}
            />
            <PaymentMethodCard
              title="QRIS static"
              description={qrisActive ? "Configured" : props.qrisStaticEnabled ? "Upload QRIS image" : "Optional"}
              status={qrisStatus}
              onClick={() => setPanel("qris")}
            />
          </div>
        ) : null}

        {panel === "bank" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <PanelHeader
              title="Transfer manual"
              status={bankStatus}
              onToggle={() => props.setBankTransferEnabled(!props.bankTransferEnabled)}
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="space-y-2">
                <Label>Bank</Label>
                <OnboardingInput value={props.bankName} onChange={(event) => props.setBankName(event.target.value)} placeholder="BCA" />
              </label>
              <label className="space-y-2">
                <Label>Account name</Label>
                <OnboardingInput value={props.bankAccountName} onChange={(event) => props.setBankAccountName(event.target.value)} placeholder="PT Contoh Bisnis" />
              </label>
              <label className="space-y-2">
                <Label>Account number</Label>
                <OnboardingInput value={props.bankAccountNumber} onChange={(event) => props.setBankAccountNumber(event.target.value)} placeholder="1234567890" />
              </label>
            </div>
            <label className="mt-3 block space-y-2">
              <Label>Instructions</Label>
              <OnboardingInput
                value={props.bankInstructions}
                onChange={(event) => props.setBankInstructions(event.target.value)}
                placeholder="Transfer lalu kirim bukti bayar."
              />
            </label>
          </section>
        ) : null}

        {panel === "qris" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <PanelHeader
              title="QRIS static"
              status={qrisStatus}
              onToggle={() => props.setQrisStaticEnabled(!props.qrisStaticEnabled)}
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-[220px_1fr]">
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
              <label className="space-y-2">
                <Label>Instructions</Label>
                <OnboardingInput
                  value={props.qrisInstructions}
                  onChange={(event) => props.setQrisInstructions(event.target.value)}
                  placeholder="Scan QRIS lalu kirim bukti bayar."
                />
              </label>
            </div>
          </section>
        ) : null}
      </div>
      <PreviewCard title="Payment preview">
        <div className="text-sm text-slate-500">Booking total</div>
        <div className="mt-1 text-3xl font-semibold">Rp{Number(props.price || 0).toLocaleString("id-ID")}</div>
        <div className="mt-4 space-y-2 text-sm">
          <PaymentPreviewLine label="Midtrans / QRIS Gateway" status="active" />
          <PaymentPreviewLine label="Cash" status="active" />
          <PaymentPreviewLine label={`Transfer bank${props.bankName ? ` (${props.bankName})` : ""}`} status={bankStatus} />
          <PaymentPreviewLine label="QRIS static" status={qrisStatus} />
        </div>
      </PreviewCard>
    </div>
  );
}

function BookingStep(props: {
  bookingName: string;
  bookingTime: string;
  resourceName: string;
  price: string;
  paymentLabel: string;
  setBookingName: (value: string) => void;
  setBookingTime: (value: string) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
        <label className="block space-y-2">
          <Label>Demo customer</Label>
          <OnboardingInput
            value={props.bookingName}
            onChange={(event) => props.setBookingName(event.target.value)}
            placeholder="Demo Customer"
          />
        </label>
        <label className="block space-y-2">
          <Label>Booking time</Label>
          <OnboardingTimePicker value={props.bookingTime} onChange={props.setBookingTime} placeholder="19:00" />
        </label>
      </div>
      <PreviewCard title="Admin calendar receives">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Pending booking</div>
          <div className="mt-2 font-semibold">{props.resourceName}</div>
          <div className="mt-1 text-sm text-slate-500">{props.bookingName || "Demo Customer"} at {props.bookingTime || "19:00"}</div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm">
            <span>{props.paymentLabel}</span>
            <span>Rp{Number(props.price || 0).toLocaleString("id-ID")}</span>
          </div>
        </div>
      </PreviewCard>
    </div>
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

function PanelHeader(props: { title: string; status: PaymentStatus; onToggle: () => void }) {
  const badge = paymentStatusBadge(props.status);
  const cta = props.status === "active" ? "Disable" : props.status === "required" ? "Disable" : "Enable";

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
        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-950"
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
      <h2 className="mt-5 text-3xl font-semibold tracking-tight">Your first booking system is ready.</h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        Resource pertama sudah disiapkan. Buka dashboard untuk melanjutkan setup real data, staff, payment method, dan public booking page.
      </p>
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
          ← Back
        </Button>
        <Button onClick={props.onContinue} disabled={props.loading} className="h-12 min-w-[220px] rounded-xl px-8">
          {props.loading ? "Saving..." : props.action}
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
