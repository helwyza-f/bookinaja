"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  format,
  addMinutes,
  parse,
  isBefore,
  startOfToday,
  formatISO,
  isSameDay,
  addDays,
  addWeeks,
  addMonths,
  addYears,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { ManualBookingSkeleton } from "@/components/dashboard/booking-manual-skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Clock,
  User,
  Phone,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Zap,
  Box,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ResourceItem = {
  id: string;
  name: string;
  item_type: string;
  price: number;
  price_unit?: string;
  unit_duration?: number;
};

type ResourceRow = {
  id: string;
  tenant_id: string;
  name: string;
  category?: string;
  items?: ResourceItem[];
};

type BusySlot = {
  start_min: number;
  end_min: number;
};

type AvailabilitySlot = {
  start_time: string;
  end_time: string;
};

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

type BookingMode = "scheduled" | "walkin";

function resolveRecommendedWalkInSlot(slots: string[], targetDate?: Date) {
  if (!targetDate || slots.length === 0) return "";
  const now = new Date();
  const sameDay = isSameDay(targetDate, now);
  if (!sameDay) return slots[0] || "";

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let candidate = slots[0] || "";
  for (const slot of slots) {
    const [hours, minutes] = slot.split(":").map(Number);
    const slotMinutes = hours * 60 + minutes;
    if (slotMinutes <= currentMinutes) {
      candidate = slot;
      continue;
    }
    return candidate || slot;
  }
  return candidate;
}

export default function NewManualBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const packageRef = useRef<HTMLDivElement | null>(null);
  const scheduleRef = useRef<HTMLDivElement | null>(null);
  const durationRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [isReturning, setIsReturning] = useState(false);

  // Form State
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [durationValue, setDurationValue] = useState(1);
  const [selectedMainId, setSelectedMainId] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoPreview, setPromoPreview] = useState<{
    valid?: boolean;
    label?: string;
    message?: string;
    discount_amount?: number;
    final_amount?: number;
  } | null>(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [bookingMode, setBookingMode] = useState<BookingMode>(
    searchParams.get("mode") === "walkin" ? "walkin" : "scheduled",
  );

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    window.setTimeout(() => {
      ref.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  const handleTimeSelection = (time: string) => {
    setSelectedTime(time);
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      scrollToSection(durationRef);
      return;
    }
    scrollToSection(summaryRef);
  };

  // 1. Fetch Resources
  useEffect(() => {
    api
      .get("/resources-all")
      .then((res) => {
        const data = res.data.resources || res.data;
        setResources(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => toast.error("Gagal memuat daftar unit"));
  }, []);

  const currentResource = useMemo(
    () => resources.find((r) => r.id === selectedResourceId),
    [resources, selectedResourceId],
  );

  const selectedItem = useMemo(
    () => currentResource?.items?.find((i) => i.id === selectedMainId),
    [currentResource, selectedMainId],
  );

  const isInterday = useMemo(() => {
    if (!selectedItem) return false;
    return ["day", "week", "month", "year"].includes(
      selectedItem.price_unit || "",
    );
  }, [selectedItem]);

  // 2. Load Availability & Auto-select Interday
  useEffect(() => {
    if (selectedResourceId && date) {
      if (isInterday) {
        setSelectedTime("08:00");
      } else {
        api
          .get(
            `/guest/availability/${selectedResourceId}?date=${format(date, "yyyy-MM-dd")}`,
          )
          .then((res) => {
            const normalized = (
              (res.data.busy_slots || []) as AvailabilitySlot[]
            ).map((slot) => {
              const [h, m] = slot.start_time.split(":").map(Number);
              const [eh, em] = slot.end_time.split(":").map(Number);
              return { start_min: h * 60 + m, end_min: eh * 60 + em };
            });
            setBusySlots(normalized);
          });
      }
    }
  }, [selectedResourceId, date, isInterday]);

  // 3. CRM Check
  useEffect(() => {
    if (custPhone.length < 9) {
      setIsReturning(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const resExist = await api.get(
          `/public/validate-customer?phone=${custPhone}`,
        );
        if (resExist.data) {
          setIsReturning(true);
          setCustName(resExist.data.name);
          toast.info(`Pelanggan Terdaftar: ${resExist.data.name}`);
        } else {
          setIsReturning(false);
        }
      } catch {
        setIsReturning(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [custPhone]);

  // 4. Time Slots Generator
  const availableSlots = useMemo(() => {
    if (!selectedItem || isInterday) return [];
    const step = selectedItem.unit_duration || 60;
    const slots = [];
    let current = parse("08:00", "HH:mm", new Date());
    const end = parse("23:30", "HH:mm", new Date());
    while (isBefore(current, end)) {
      slots.push(format(current, "HH:mm"));
      current = addMinutes(current, step);
    }
    return slots;
  }, [selectedItem, isInterday]);

  const recommendedWalkInSlot = useMemo(() => {
    if (bookingMode !== "walkin") return "";
    return resolveRecommendedWalkInSlot(availableSlots, date);
  }, [availableSlots, bookingMode, date]);

  const maxAvailableSessions = useMemo(() => {
    if (!selectedTime || !selectedItem || isInterday) return 12;
    const [h, m] = selectedTime.split(":").map(Number);
    const startMin = h * 60 + m;
    const nextBusy = busySlots
      .filter((s) => s.start_min > startMin)
      .sort((a, b) => a.start_min - b.start_min)[0];
    let availableMin = 23 * 60 + 59 - startMin;
    if (nextBusy)
      availableMin = Math.min(availableMin, nextBusy.start_min - startMin);
    return Math.floor(availableMin / (selectedItem.unit_duration || 60)) || 1;
  }, [selectedTime, busySlots, selectedItem, isInterday]);

  useEffect(() => {
    if (durationValue > maxAvailableSessions) setDurationValue(1);
  }, [durationValue, maxAvailableSessions]);

  useEffect(() => {
    if (bookingMode !== "walkin") return;
    setDate(new Date());
    if (!selectedTime && recommendedWalkInSlot) {
      setSelectedTime(recommendedWalkInSlot);
    }
  }, [bookingMode, recommendedWalkInSlot, selectedTime]);

  // 5. Timeline Summary
  const timelineSummary = useMemo(() => {
    if (!selectedTime || !selectedItem || !date) return "Tentukan Jadwal";
    const startObj = parse(selectedTime, "HH:mm", date);
    let endObj;
    switch (selectedItem.price_unit) {
      case "day":
        endObj = addDays(startObj, durationValue);
        break;
      case "week":
        endObj = addWeeks(startObj, durationValue);
        break;
      case "month":
        endObj = addMonths(startObj, durationValue);
        break;
      case "year":
        endObj = addYears(startObj, durationValue);
        break;
      default:
        endObj = addMinutes(
          startObj,
          (selectedItem.unit_duration || 60) * durationValue,
        );
    }
    return `${format(startObj, "HH:mm")} s/d ${format(endObj, isInterday ? "dd MMM, HH:mm" : "HH:mm")}`;
  }, [selectedTime, selectedItem, date, durationValue, isInterday]);

  const calculateTotal = () => {
    if (!selectedItem) return 0;
    const addonsPrice =
      currentResource?.items
        ?.filter((i) => selectedAddons.includes(i.id))
        .reduce((acc, curr) => acc + (curr.price || 0), 0) || 0;
    return selectedItem.price * durationValue + addonsPrice;
  };

  const totalAfterPromo = () =>
    promoPreview?.valid ? Number(promoPreview.final_amount || 0) : calculateTotal();

  useEffect(() => {
    setPromoPreview(null);
  }, [selectedResourceId, selectedMainId, selectedAddons, selectedTime, date, durationValue]);

  const handlePromoPreview = async () => {
    if (!promoCode.trim()) return toast.error("Masukkan kode promo.");
    if (!selectedResourceId || !selectedMainId || !selectedTime || !date) {
      return toast.error("Pilih unit, layanan, dan jadwal dulu.");
    }
    setIsCheckingPromo(true);
    try {
      const fullDate = parse(selectedTime, "HH:mm", date);
      const res = await api.post("/public/promos/preview", {
        code: promoCode.trim().toUpperCase(),
        resource_id: selectedResourceId,
        start_time: formatISO(fullDate),
        end_time: formatISO(fullDate),
        subtotal: calculateTotal(),
      });
      setPromoPreview(res.data);
      if (res.data?.valid) {
        toast.success("Promo berhasil diterapkan.");
      } else {
        toast.error(res.data?.message || "Promo tidak berlaku.");
      }
    } catch (err: unknown) {
      toast.error((err as ApiError).response?.data?.error || "Gagal memvalidasi promo");
    } finally {
      setIsCheckingPromo(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTime || !custName || !custPhone || !currentResource)
      return toast.error("Data belum lengkap");
    setIsSubmitting(true);
    try {
      const fullDate = parse(selectedTime, "HH:mm", date || new Date());
      const res = await api.post("/bookings/manual", {
        tenant_id: currentResource.tenant_id,
        resource_id: selectedResourceId,
        customer_name: custName.toUpperCase(),
        customer_phone: custPhone,
        item_ids: [selectedMainId, ...selectedAddons],
        start_time: formatISO(fullDate),
        duration: durationValue,
        booking_mode: bookingMode,
        promo_code: promoPreview?.valid ? promoCode.trim().toUpperCase() : "",
      });
      toast.success(
        bookingMode === "walkin"
          ? "Sesi walk-in berhasil dibuat"
          : "Reservasi berhasil disimpan",
      );
      const redirectPath =
        bookingMode === "walkin"
          ? `/admin/pos?active=${res.data?.booking_id || res.data?.booking?.id || ""}`
          : "/admin/bookings";
      router.push(redirectPath);
    } catch (err: unknown) {
      toast.error((err as ApiError).response?.data?.error || "Gagal menyimpan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Ganti blok loading lama dengan ini:
  if (loading) {
    return <ManualBookingSkeleton />;
  }

  const steps = [
    {
      label: "Unit",
      active: Boolean(selectedResourceId),
      current: !selectedResourceId,
    },
    {
      label: "Paket",
      active: Boolean(selectedMainId),
      current: Boolean(selectedResourceId) && !selectedMainId,
    },
    {
      label: "Jadwal",
      active: Boolean(selectedTime),
      current: Boolean(selectedMainId) && !selectedTime,
    },
    {
      label: "Customer",
      active: Boolean(custName && custPhone),
      current: Boolean(selectedTime) && !custName,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24 pt-6 px-3 font-plus-jakarta dark:bg-[#050505]">
      <div className="mx-auto max-w-400 space-y-4  md:p-4 lg:p-6">
        <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#0a0a0a]">
          <div className="h-1 bg-blue-600" />
          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <ArrowLeft size={20} className="dark:text-white" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white md:text-3xl">
                  {bookingMode === "walkin" ? "Walk-in Sekarang" : "Booking Terjadwal"}
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {bookingMode === "walkin"
                    ? "Buka sesi langsung tanpa DP lalu lanjutkan billing dari POS."
                    : "Catat booking yang akan datang dan tetap ikuti flow konfirmasi + DP."}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 md:min-w-[420px]">
              <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setBookingMode("scheduled");
                    setSelectedTime("");
                  }}
                  className={cn(
                    "flex-1 rounded-[1rem] px-4 py-2.5 text-xs font-semibold transition-all",
                    bookingMode === "scheduled"
                      ? "bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:text-white"
                      : "text-slate-500 dark:text-slate-300",
                  )}
                >
                  Scheduled booking
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBookingMode("walkin");
                    setSelectedTime("");
                  }}
                  className={cn(
                    "flex-1 rounded-[1rem] px-4 py-2.5 text-xs font-semibold transition-all",
                    bookingMode === "walkin"
                      ? "bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:text-white"
                      : "text-slate-500 dark:text-slate-300",
                  )}
                >
                  Walk-in / right away
                </button>
              </div>
            <div className="grid grid-cols-4 gap-2 md:min-w-[420px]">
              {steps.map((step, index) => (
                <div
                  key={step.label}
                  className={cn(
                    "rounded-xl border px-2.5 py-2 text-center transition-colors",
                    step.active
                      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                      : step.current
                        ? "border-slate-300 bg-white text-slate-900 dark:border-white/15 dark:bg-white/5 dark:text-white"
                        : "border-slate-200 bg-slate-50 text-slate-400 dark:border-white/5 dark:bg-white/[0.03]",
                  )}
                >
                  <div className="text-[10px] font-semibold">{index + 1}</div>
                  <div className="mt-0.5 truncate text-[10px] font-medium">
                    {step.label}
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start p-0 ">
          {/* LEFT: SELECTION FLOW */}
          <div className="lg:col-span-8 space-y-5">
            {/* 01. PILIH UNIT & PAKET */}
            <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#0c0c0c] md:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <Box size={16} />
                </div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Pilih Unit & Layanan
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {resources.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedResourceId(r.id);
                      setSelectedMainId("");
                      setSelectedTime("");
                      scrollToSection(packageRef);
                    }}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-all",
                      selectedResourceId === r.id
                        ? "border-blue-300 bg-blue-50 shadow-sm dark:border-blue-500/40 dark:bg-blue-600/10"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-white dark:border-white/5 dark:bg-white/5 dark:text-slate-300",
                    )}
                  >
                    <p
                      className={cn(
                        "truncate text-sm font-semibold",
                        selectedResourceId === r.id
                          ? "text-blue-600"
                          : "text-slate-900 dark:text-slate-200",
                      )}
                    >
                      {r.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{r.category}</p>
                  </button>
                ))}
              </div>

              {currentResource && (
                <div
                  ref={packageRef}
                  className="mt-5 scroll-mt-20 border-t border-slate-100 pt-5 dark:border-white/5"
                >
                  <p className="mb-3 text-xs font-semibold text-slate-400">
                    Paket Tersedia
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {currentResource.items
                      ?.filter((i) =>
                        ["main_option", "main"].includes(i.item_type),
                      )
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedMainId(item.id);
                            if (!isInterday) setSelectedTime("");
                            scrollToSection(scheduleRef);
                          }}
                          className={cn(
                            "rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all",
                            selectedMainId === item.id
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:hover:text-white",
                          )}
                        >
                          {item.name} • Rp{item.price.toLocaleString()}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </Card>

            {/* 02. JADWAL & DURASI - LEBIH BESAR */}
            <Card
              ref={scheduleRef}
              className={cn(
                "scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all dark:border-white/5 dark:bg-[#0c0c0c] md:p-6",
                !selectedMainId && "pointer-events-none opacity-60",
              )}
            >
              <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                    <Clock size={18} />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white md:text-lg">
                    Jadwal & Durasi
                  </h2>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-900 dark:border-white/5 dark:bg-white/5 dark:text-white"
                    >
                      <CalendarIcon size={16} className="text-blue-600" />
                      {date
                        ? format(date, "dd MMMM yyyy", { locale: idLocale })
                        : "Pilih Tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden rounded-2xl border-none p-0 shadow-lg"
                    align="end"
                  >
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) =>
                        bookingMode === "walkin"
                          ? !isSameDay(d, new Date())
                          : d < startOfToday()
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="order-1 lg:col-span-8">
                  {!isInterday ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                      {availableSlots.map((t) => {
                        const isBusy = busySlots.some((s) => {
                          const [h, m] = t.split(":").map(Number);
                          const tm = h * 60 + m;
                          return tm >= s.start_min && tm < s.end_min;
                        });
                        const isPast =
                          bookingMode !== "walkin" &&
                          isSameDay(date!, new Date()) &&
                          isBefore(parse(t, "HH:mm", date!), new Date());
                        const isSel = selectedTime === t;

                        return (
                          <button
                            key={t}
                            disabled={isBusy || isPast}
                            onClick={() => handleTimeSelection(t)}
                            className={cn(
                              "relative flex h-11 items-center justify-center rounded-xl border text-xs font-semibold transition-all",
                              isSel
                                ? "z-10 border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                : isBusy || isPast
                                  ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-300 dark:border-white/5 dark:bg-[#111]"
                                  : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-blue-600 dark:border-white/5 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white",
                            )}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-full items-center gap-4 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4 md:gap-5 md:p-8">
                      <ShieldCheck className="text-blue-500 h-9 w-9 shrink-0" />
                      <p className="text-xs font-semibold leading-relaxed text-blue-600">
                        Logic Antar Hari Aktif: Boking dimulai otomatis pukul
                        08:00 untuk paket {selectedItem?.price_unit}.
                      </p>
                    </div>
                  )}
                </div>

                <div
                  ref={durationRef}
                  className="order-2 flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 dark:bg-white/5 lg:col-span-4"
                >
                  <span className="mb-4 text-center text-xs font-semibold text-slate-400 dark:text-slate-300">
                    Jumlah Unit / Sesi
                  </span>
                  <div className="flex items-center gap-6">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setDurationValue((d) => Math.max(1, d - 1))
                      }
                      className="h-10 w-10 rounded-xl border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                      -
                    </Button>
                    <span className="text-5xl font-semibold tabular-nums leading-none text-[var(--bookinaja-600)] md:text-6xl">
                      {durationValue}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setDurationValue((d) =>
                          Math.min(maxAvailableSessions, d + 1),
                        )
                      }
                      className="h-10 w-10 rounded-xl border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                      +
                    </Button>
                  </div>
                  <Badge
                    variant="secondary"
                    className="mt-4 px-4 py-1 text-[10px] font-semibold dark:bg-white/5 dark:text-slate-300"
                  >
                    Slot Maks: {maxAvailableSessions}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>

          {/* SISI KANAN: RINGKASAN & KONFIRMASI */}
          <div
            ref={summaryRef}
            className={cn(
              "scroll-mt-20 space-y-5 transition-all duration-300 lg:sticky lg:top-6 lg:col-span-4",
              !selectedTime && "pointer-events-none opacity-70",
            )}
          >
            <Card className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:shadow-xl md:p-6">
              {/* CUSTOMER INFO */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/5">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-300">
                    Profil Pelanggan
                  </p>
                  <Smartphone
                    size={16}
                    className="text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-300)]"
                  />
                </div>
                <div className="space-y-4">
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <Input
                      placeholder="NOMOR WHATSAPP (08...)"
                      value={custPhone}
                      onChange={(e) =>
                        setCustPhone(e.target.value.replace(/\D/g, ""))
                      }
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus-visible:ring-[var(--bookinaja-500)] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600"
                    />
                    {isReturning && (
                      <Badge className="absolute right-3 top-1/2 -translate-y-1/2 border-none bg-[var(--bookinaja-600)] text-[10px] font-semibold text-white">
                        Member
                      </Badge>
                    )}
                  </div>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <Input
                      placeholder="NAMA LENGKAP"
                      value={custName}
                      onChange={(e) =>
                        setCustName(e.target.value.toUpperCase())
                      }
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus-visible:ring-[var(--bookinaja-500)] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* FLOW & ADDONS */}
              <div className="space-y-5 border-t border-slate-100 pt-4 dark:border-white/5">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-300">
                    Flow Booking
                  </p>
                  <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4 dark:border-orange-500/15 dark:bg-orange-500/10">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold text-orange-500 dark:text-orange-200">
                          Status awal otomatis
                        </p>
                        <p className="mt-1 text-sm font-semibold text-orange-900 dark:text-white">
                          {bookingMode === "walkin"
                            ? "Aktif sekarang, lanjut di POS"
                            : "Pending, menunggu jadwal & aktivasi"}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "border-none text-[10px] font-semibold",
                          bookingMode === "walkin"
                            ? "bg-emerald-600 text-white"
                            : "bg-orange-600 text-white",
                        )}
                      >
                        {bookingMode === "walkin" ? "active" : "pending"}
                      </Badge>
                    </div>
                    <p className="mt-3 text-[10px] font-bold leading-relaxed text-orange-700 dark:text-orange-50/85">
                      {bookingMode === "walkin"
                        ? "Mode walk-in langsung membuka sesi tanpa DP. Tagihan tetap berjalan, lalu pelunasan dilakukan dari POS atau saat sesi selesai."
                        : "Mode scheduled dipakai untuk transaksi yang akan datang. Booking masuk sebagai pending dan tetap mengikuti flow konfirmasi serta pembayaran DP."}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-300">
                    Layanan Tambahan
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {currentResource?.items
                      ?.filter((i) => i.item_type === "add_on")
                      .map((addon) => {
                        const active = selectedAddons.includes(addon.id);
                        return (
                          <button
                            key={addon.id}
                            onClick={() =>
                              setSelectedAddons((p) =>
                                active
                                  ? p.filter((x) => x !== addon.id)
                                  : [...p, addon.id],
                              )
                            }
                            className={cn(
                              "rounded-lg px-3.5 py-2 text-[10px] font-semibold transition-all",
                              active
                                ? "bg-[var(--bookinaja-600)] text-white"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:bg-white/5 dark:text-slate-500 dark:hover:text-slate-300",
                            )}
                          >
                            {addon.name}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-300">
                  Promo Booking
                </p>
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <Input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Masukkan voucher"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
                  />
                  <Button type="button" onClick={handlePromoPreview} disabled={isCheckingPromo} className="h-11 rounded-xl bg-violet-600 text-white hover:bg-violet-700">
                    {isCheckingPromo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                    Cek Promo
                  </Button>
                </div>
                {promoPreview?.valid && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {promoPreview.label || promoCode} aktif • Potongan Rp{Number(promoPreview.discount_amount || 0).toLocaleString()}
                  </div>
                )}
              </div>

              {/* TOTAL BILL */}
              <div className="relative space-y-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-inner dark:border-white/5 dark:bg-white/5 md:p-5">
                <div className="relative z-10">
                  <p className="mb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-400">
                    Estimasi Tagihan
                  </p>
                <p className="text-3xl font-semibold leading-none text-slate-950 dark:text-white md:text-4xl">
                  Rp{totalAfterPromo().toLocaleString()}
                </p>
                {promoPreview?.valid && (
                  <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                    Diskon Rp{Number(promoPreview.discount_amount || 0).toLocaleString()}
                  </p>
                )}
                <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  DP final mengikuti policy tenant dan override resource saat booking disimpan.
                </p>
              </div>
                <div className="relative z-10 flex items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-white/5">
                  <div className="flex flex-col">
                    <span className="mb-1.5 text-[7px] font-semibold leading-none tracking-[0.2em] text-slate-500 dark:text-slate-500">
                      Timeline
                    </span>
                    <span className="text-xs font-semibold text-[var(--bookinaja-600)] dark:text-[var(--bookinaja-300)]">
                      {timelineSummary}
                    </span>
                  </div>
                  <Badge className="border-none bg-orange-600 px-3 py-1 text-[10px] font-semibold">
                    {bookingMode === "walkin" ? "active / unpaid" : "pending / dp"}
                  </Badge>
                </div>
                <Zap className="absolute right-[-15px] top-[-15px] size-24 -rotate-12 text-slate-900/5 dark:text-white/5" />
              </div>

              <Button
                onClick={handleSave}
                disabled={isSubmitting || !selectedTime || !custName}
                className="h-14 w-full rounded-2xl bg-[var(--bookinaja-600)] text-sm font-semibold text-white shadow-lg shadow-[color:rgba(30,143,146,0.2)] transition-all hover:bg-[var(--bookinaja-500)] active:scale-95 md:h-16 md:text-base"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    {bookingMode === "walkin" ? "Buka Sesi Sekarang" : "Simpan Booking"}
                    <ChevronRight size={22} strokeWidth={4} />
                  </>
                )}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
