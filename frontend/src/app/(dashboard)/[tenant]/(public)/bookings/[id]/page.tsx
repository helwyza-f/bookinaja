"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  format,
  isBefore,
  startOfToday,
  parse,
  addMinutes,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  formatISO,
  isSameDay,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChevronRight,
  ArrowLeft,
  Calendar as CalendarIcon,
  Loader2,
  ShieldCheck,
  Image as ImageIcon,
  Check,
  Plus,
  AlertCircle,
  Clock,
  Zap,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/context/tenant-context";
import { syncTenantCookies } from "@/lib/tenant-session";
import { trackDiscoveryEvent } from "@/lib/discovery-analytics";
import { normalizeThemeConfig } from "@/lib/page-builder";
import {
  getPreviewSurfaceClass,
  getThemeVisuals,
} from "@/components/tenant/public/landing/builder-renderer";

export default function ResourceBookingDetail() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useTenant();

  const [resource, setResource] = useState<any>(null);
  const [busySlots, setBusySlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Scroll Refs
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);

  // Form State
  const [date, setDate] = useState<Date | undefined>(startOfToday());
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [durationValue, setDurationValue] = useState(1);
  const [selectedMainId, setSelectedMainId] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoPreview, setPromoPreview] = useState<any | null>(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI States
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState<
    "idle" | "validating" | "valid" | "invalid"
  >("idle");
  const [isReturning, setIsReturning] = useState(false);

  // 1. Fetch Detail Resource
  useEffect(() => {
    const fetchData = async () => {
      try {
        const resDetail = await api.get(`/public/resources/${params.id}`);
        setResource(resDetail.data);
      } catch {
        toast.error("Gagal memuat data unit");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  const selectedItem = useMemo(
    () => resource?.items?.find((i: any) => i.id === selectedMainId),
    [resource, selectedMainId],
  );
  const activeTheme = useMemo(
    () =>
      normalizeThemeConfig(
        profile?.landing_theme_config,
        profile?.primary_color,
      ),
    [profile],
  );
  const themeVisuals = useMemo(() => getThemeVisuals(activeTheme), [activeTheme]);
  const surfaceClass = useMemo(
    () => getPreviewSurfaceClass(activeTheme),
    [activeTheme],
  );

  const isInterday = useMemo(() => {
    if (!selectedItem) return false;
    return ["day", "week", "month", "year"].includes(selectedItem.price_unit);
  }, [selectedItem]);

  const wibNow = useMemo(() => getWIBDate(new Date()), []);
  const todayWIB = useMemo(() => startOfWIBDay(new Date()), []);

  // Smooth Scroll Trigger
  useEffect(() => {
    if (selectedMainId && !loading) {
      step2Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedMainId, loading]);

  useEffect(() => {
    if (selectedTime) {
      step3Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedTime]);

  useEffect(() => {
    if (isInterday && profile?.open_time) {
      setSelectedTime(profile.open_time);
    } else if (!isInterday) {
      setSelectedTime("");
    }
  }, [isInterday, profile]);

  useEffect(() => {
    if (date && params.id && !isInterday) {
      const fetchBusy = async () => {
        try {
          const formattedDate = format(date, "yyyy-MM-dd");
          const resBusy = await api.get(
            `/guest/availability/${params.id}?date=${formattedDate}`,
          );
          const normalized = (resBusy.data.busy_slots || []).map(
            (slot: any) => {
              const [h, m] = slot.start_time.split(":").map(Number);
              const [eh, em] = slot.end_time.split(":").map(Number);
              return { start_min: h * 60 + m, end_min: eh * 60 + em };
            },
          );
          setBusySlots(normalized);
        } catch {
          console.error("Gagal sinkron jadwal");
        }
      };
      fetchBusy();
    }
  }, [date, params.id, isInterday]);

  useEffect(() => {
    if (custPhone.length < 9) {
      setPhoneStatus("idle");
      setIsReturning(false);
      return;
    }
    const timer = setTimeout(async () => {
      setPhoneStatus("validating");
      try {
        const resExist = await api.get(
          `/public/validate-customer?phone=${custPhone}`,
        );
        if (resExist.data) {
          setIsReturning(true);
          setCustName(resExist.data.name);
          setPhoneStatus("valid");
          toast.success(`Senang melihatmu kembali, ${resExist.data.name}!`);
        } else {
          setIsReturning(false);
          const resVal = await api.get(
            `/public/validate-phone?phone=${custPhone}`,
          );
          setPhoneStatus(resVal.data.valid ? "valid" : "invalid");
        }
      } catch {
        setPhoneStatus("invalid");
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [custPhone, durationValue]);

  const availableSlots = useMemo(() => {
    if (!selectedItem || !profile || isInterday) return [];
    const step =
      selectedItem.unit_duration > 0 ? selectedItem.unit_duration : 60;
    const [closeH, closeM] = (profile.close_time || "22:00")
      .split(":")
      .map(Number);
    const closeTotalMin = closeH * 60 + closeM;

    const slots = [];
    let current = parse(
      profile.open_time || "08:00",
      "HH:mm",
      date || new Date(),
    );
    const endOperasi = parse(
      profile.close_time || "22:00",
      "HH:mm",
      date || new Date(),
    );

    while (isBefore(current, endOperasi)) {
      const timeStr = format(current, "HH:mm");
      const [h, m] = timeStr.split(":").map(Number);
      if (h * 60 + m + step <= closeTotalMin) {
        slots.push(timeStr);
      }
      current = addMinutes(current, step);
    }
    return slots;
  }, [selectedItem, date, profile, isInterday]);

  const formattedSelectedDate = useMemo(() => {
    if (!date) return "";
    return formatInWIB(date, "EEEE, dd MMM yyyy");
  }, [date]);

  const maxAvailableSessions = useMemo(() => {
    if (!selectedTime || !selectedItem || !profile) return 1;
    if (isInterday) return 12;

    const [h, m] = selectedTime.split(":").map(Number);
    const startMin = h * 60 + m;
    const unitMin = selectedItem.unit_duration || 60;
    const [closeH, closeM] = (profile.close_time || "22:00")
      .split(":")
      .map(Number);
    const closeTotalMin = closeH * 60 + closeM;

    const nextBusy = busySlots
      .filter((s) => s.start_min > startMin)
      .sort((a, b) => a.start_min - b.start_min)[0];
    let availableMin = closeTotalMin - startMin;
    if (nextBusy) {
      availableMin = Math.min(availableMin, nextBusy.start_min - startMin);
    }

    const max = Math.floor(availableMin / unitMin);
    return max > 0 ? max : 1;
  }, [selectedTime, busySlots, selectedItem, profile, isInterday]);

  useEffect(() => {
    if (durationValue > maxAvailableSessions) setDurationValue(1);
  }, [durationValue, maxAvailableSessions]);

  const smartTimeline = useMemo(() => {
    if (!selectedTime || !selectedItem || !date) return { start: "", end: "" };
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
          selectedItem.unit_duration * durationValue,
        );
    }

    return {
      start: isInterday
        ? format(startObj, "HH:mm, dd MMM")
        : format(startObj, "HH:mm"),
      end: isInterday
        ? format(endObj, "HH:mm, dd MMM yyyy")
        : format(endObj, "HH:mm"),
      fullDate: format(date, "EEEE, dd MMMM yyyy", { locale: idLocale }),
    };
  }, [selectedTime, selectedItem, date, durationValue, isInterday]);

  const calculateTotal = () => {
    if (!selectedItem) return 0;
    const mainPrice = (selectedItem.price || 0) * durationValue;
    const addonsPrice =
      resource?.items
        ?.filter((i: any) => selectedAddons.includes(i.id))
        .reduce((acc: number, curr: any) => acc + (curr.price || 0), 0) || 0;
    return mainPrice + addonsPrice;
  };

  const totalAfterPromo = () =>
    promoPreview?.valid ? Number(promoPreview.final_amount || 0) : calculateTotal();

  useEffect(() => {
    setPromoPreview(null);
  }, [selectedMainId, selectedAddons, selectedTime, date, durationValue]);

  const buildCustomerAccessRedirect = (
    accessToken: string,
    fallbackRedirect: string,
    nextStep?: "payment",
    scope?: "deposit" | "settlement",
  ) => {
    const baseUrl = accessToken
      ? `/user/verify?code=${encodeURIComponent(accessToken)}`
      : fallbackRedirect;

    if (!nextStep) return baseUrl;

    const isAbsolute =
      baseUrl.startsWith("http://") || baseUrl.startsWith("https://");

    try {
      const parsed = isAbsolute
        ? new URL(baseUrl)
        : new URL(baseUrl, "https://bookinaja.local");
      parsed.searchParams.set("next", nextStep);
      if (scope) {
        parsed.searchParams.set("scope", scope);
      }

      if (isAbsolute) return parsed.toString();
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return baseUrl;
    }
  };

  const handleBooking = async () => {
    if (phoneStatus !== "valid")
      return toast.error("Nomor WhatsApp tidak valid");
    if (!custName || !selectedTime)
      return toast.error("Lengkapi formulir boking");

    setIsSubmitting(true);
    try {
      const fullDate = parse(selectedTime, "HH:mm", date || new Date());
      const payload = {
        tenant_id: resource.tenant_id,
        customer_name: custName.toUpperCase(),
        customer_phone: custPhone,
        resource_id: resource.id,
        item_ids: [selectedMainId, ...selectedAddons],
        start_time: formatISO(fullDate),
        duration: durationValue,
        promo_code: promoPreview?.valid ? promoCode.trim().toUpperCase() : "",
      };

      const res = await api.post("/public/bookings", payload);
      const booking = res.data.booking || {};
      const sourcePost = searchParams.get("source_post");
      if (sourcePost) {
        trackDiscoveryEvent({
          tenant_id: resource.tenant_id,
          tenant_slug: params.tenant as string,
          event_type: "booking_start",
          surface: "tenant-booking",
          section_id: "resource-booking",
          card_variant: "booking-sheet",
          position_index: 0,
          metadata: {
            post_id: sourcePost,
            resource_id: resource.id,
            booking_id: res.data.booking_id,
            source_tenant: searchParams.get("source_tenant"),
            source_surface: searchParams.get("source_surface"),
          },
        });
      }
      syncTenantCookies(params.tenant as string);
      const defaultRedirect =
        res.data.redirect_url ||
        `/user/verify?code=${encodeURIComponent(booking.access_token || "")}`;
      if ((booking.deposit_amount || 0) > 0) {
        const verifyRedirect = buildCustomerAccessRedirect(
          String(booking.access_token || ""),
          defaultRedirect,
          "payment",
          "deposit",
        );
        toast.success("Booking dibuat. Pilih metode pembayaran DP untuk melanjutkan.");
        setTimeout(() => router.push(verifyRedirect), 800);
        return;
      }
      const verifyRedirect = buildCustomerAccessRedirect(
        String(booking.access_token || ""),
        defaultRedirect,
      );
      toast.success("Booking berhasil dibuat!");
      setTimeout(() => router.push(verifyRedirect), 800);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal membuat reservasi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePromoPreview = async () => {
    if (!promoCode.trim()) return toast.error("Masukkan kode promo dulu.");
    if (!selectedTime || !selectedMainId || !date) {
      return toast.error("Pilih layanan dan jadwal dulu.");
    }
    setIsCheckingPromo(true);
    try {
      const fullDate = parse(selectedTime, "HH:mm", date);
      const res = await api.post("/public/promos/preview", {
        tenant_id: resource.tenant_id,
        code: promoCode.trim().toUpperCase(),
        resource_id: resource.id,
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
    } catch {
      toast.error("Gagal memvalidasi promo.");
    } finally {
      setIsCheckingPromo(false);
    }
  };

  if (loading) return <BookingSkeleton />;

  return (
    <div
      className={cn(
        "min-h-screen overflow-x-hidden pb-[18rem] font-plus-jakarta transition-colors duration-500 md:pb-40",
        surfaceClass,
      )}
    >
      <div className="relative h-[30vh] w-full bg-slate-900 md:h-[40vh]">
        {resource?.image_url ? (
          <Image
            src={resource.image_url}
            alt="Unit"
            fill
            unoptimized
            sizes="100vw"
            className="object-cover opacity-60"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <ImageIcon className="h-10 w-10 text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#050505] via-transparent" />
        <div className="absolute top-4 left-4 z-40">
          <Button
            onClick={() => router.back()}
            size="sm"
            className="h-8 rounded-full bg-black/30 backdrop-blur-md text-white border border-white/10 px-3 text-[10px] font-bold"
          >
            <ArrowLeft size={14} className="mr-1.5" /> Kembali
          </Button>
        </div>
        <div className="absolute bottom-6 left-5 right-5 z-30 space-y-1">
          <Badge
            className="px-2 py-0 text-[8px] uppercase italic tracking-widest text-white"
            style={{ backgroundColor: activeTheme.primary_color }}
          >
            {resource?.category}
          </Badge>
          <h1
            className={cn(
              "break-words text-3xl font-[950] uppercase italic leading-[0.85] tracking-tighter md:text-6xl",
              themeVisuals.heroTitleClass,
            )}
          >
            {resource?.name}
          </h1>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-3 -translate-y-4 relative z-40 space-y-4">
        <Card
          className={cn(
            themeVisuals.panelClass,
            "space-y-8 rounded-[2rem] p-5 shadow-2xl md:rounded-[3rem] md:p-10",
          )}
        >
          {/* STEP 1: PAKET */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black italic text-white"
                style={{ backgroundColor: activeTheme.accent_color }}
              >
                01
              </span>
              <h2 className={cn("text-sm font-[950] uppercase italic", themeVisuals.titleClass)}>
                Pilih Layanan
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {resource.items
                ?.filter((i: any) => i.item_type === "main_option")
                .map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedMainId(item.id);
                      setDurationValue(1);
                    }}
                    className={cn(
                      "p-4 rounded-[1.2rem] border-[3px] text-left transition-all active:scale-95 relative overflow-hidden",
                      selectedMainId === item.id
                        ? "shadow-md"
                        : "border-slate-50 dark:border-white/5 bg-slate-50/50",
                    )}
                    style={
                      selectedMainId === item.id
                        ? {
                            borderColor: activeTheme.primary_color,
                            backgroundColor: `${activeTheme.primary_color}12`,
                          }
                        : undefined
                    }
                  >
                    <p
                      className={cn(
                        "text-base font-black uppercase italic tracking-tighter leading-none",
                        selectedMainId === item.id
                          ? ""
                          : "text-slate-900 dark:text-slate-100",
                      )}
                      style={
                        selectedMainId === item.id
                          ? { color: activeTheme.primary_color }
                          : undefined
                      }
                    >
                      {item.name}
                    </p>
                    <p className={cn("mt-1.5 text-[9px] font-bold uppercase leading-none italic tracking-tighter", themeVisuals.mutedClass)}>
                      Rp {item.price.toLocaleString()} /{" "}
                      {item.price_unit.toUpperCase()}
                    </p>
                    {selectedMainId === item.id && (
                      <Check
                        className="absolute right-3 top-1/2 h-8 w-8 -translate-y-1/2 opacity-10"
                        style={{ color: activeTheme.primary_color }}
                      />
                    )}
                  </button>
                ))}
            </div>
          </section>

          {/* STEP 2: WAKTU / TANGGAL */}
          <section
            ref={step2Ref}
            className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5 scroll-mt-20"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black italic text-white"
                  style={{ backgroundColor: activeTheme.primary_color }}
                >
                  02
                </span>
                <h2 className={cn("text-sm font-[950] uppercase italic", themeVisuals.titleClass)}>
                  Jadwal Kehadiran
                </h2>
              </div>
              <Badge
                variant="outline"
                className={cn("text-[7px] font-black uppercase border-slate-200 dark:border-white/10", themeVisuals.mutedClass)}
              >
                {profile?.open_time} - {profile?.close_time}
              </Badge>
            </div>

            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-14 w-full justify-start rounded-xl bg-slate-50/50 dark:bg-white/5 border-none font-black italic px-5 text-sm shadow-inner transition-all hover:bg-slate-100"
                >
                  <CalendarIcon
                    className="mr-2 h-4 w-4"
                    style={{ color: activeTheme.primary_color }}
                  />
                  {date ? formattedSelectedDate : "PILIH TANGGAL"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[310px] md:w-[340px] p-2 border-none rounded-[2rem] overflow-hidden shadow-2xl bg-white dark:bg-slate-900"
                align="center"
              >
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d ? startOfWIBDay(d) : d);
                    setIsCalendarOpen(false);
                  }}
                  disabled={(d) => startOfWIBDay(d) < todayWIB}
                  className="w-full"
                />
              </PopoverContent>
            </Popover>

            {date && selectedMainId && !isInterday && (
              <div className="space-y-3">
                <div className={cn("px-1 text-[10px] font-black uppercase tracking-widest", themeVisuals.eyebrowMutedClass)}>
                  Zona waktu WIB
                </div>
                {availableSlots.length === 0 ? (
                  <div className={cn("rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/30 p-6 text-center text-sm dark:border-white/10", themeVisuals.mutedClass)}>
                    Slot tidak tersedia untuk tanggal ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5 p-2.5 bg-slate-50/30 dark:bg-white/[0.02] rounded-[1.5rem] border border-slate-100 dark:border-white/5 animate-in fade-in duration-500">
                    {availableSlots.map((time) => {
                      const { isPast, isBusy } = ((timeStr: string) => {
                        const [h, m] = timeStr.split(":").map(Number);
                        const totalMin = h * 60 + m;
                        let past = false;
                        if (date && isSameDay(date, wibNow)) {
                          if (
                            totalMin <=
                            wibNow.getHours() * 60 + wibNow.getMinutes()
                          )
                            past = true;
                        }
                        const busy = busySlots.some(
                          (s) =>
                            totalMin >= s.start_min && totalMin < s.end_min,
                        );
                        return { isPast: past, isBusy: busy };
                      })(time);

                      const isSel = selectedTime === time;
                      return (
                        <button
                          key={time}
                          disabled={isPast || isBusy}
                          onClick={() => setSelectedTime(time)}
                          className={cn(
                            "h-10 rounded-lg border-2 font-black transition-all text-[11px] uppercase italic relative overflow-hidden",
                            isSel
                              ? "text-white shadow-lg"
                            : isPast
                                ? "opacity-35 cursor-not-allowed grayscale"
                                : isBusy
                                  ? "border-red-500/25 bg-red-50/40 text-red-500/70 dark:bg-red-500/10 dark:text-red-300/80 cursor-not-allowed"
                                  : "bg-white dark:bg-[#111] border-slate-100 dark:border-white/5 text-slate-900 dark:text-white",
                          )}
                          style={
                            isSel
                              ? {
                                  borderColor: activeTheme.primary_color,
                                  backgroundColor: activeTheme.primary_color,
                                }
                              : undefined
                          }
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {isInterday && (
              <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center gap-3 animate-in slide-in-from-top-2">
                <ShieldCheck className="text-emerald-500 h-5 w-5 shrink-0" />
                <p className={cn("text-[10px] font-black uppercase italic", themeVisuals.strongBodyClass)}>
                  Akses harian aktif otomatis dari jam buka toko
                </p>
              </div>
            )}
          </section>

          {/* STEP 3: DURATION */}
          {selectedTime && (
            <section
              ref={step3Ref}
              className="space-y-6 pt-4 border-t border-slate-100 dark:border-white/5 animate-in fade-in slide-in-from-bottom-2 scroll-mt-20"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black italic text-white"
                      style={{ backgroundColor: activeTheme.primary_color }}
                    >
                      03
                    </span>
                    <h2 className={cn("text-sm font-[950] uppercase italic", themeVisuals.titleClass)}>
                      Pilih Durasi
                    </h2>
                  </div>
                  <Badge
                    className="rounded-full border-none text-[8px] font-black uppercase italic tracking-widest"
                    style={{
                      backgroundColor: `${activeTheme.primary_color}16`,
                      color: activeTheme.primary_color,
                    }}
                  >
                    {maxAvailableSessions} Slot Tersedia
                  </Badge>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar snap-x px-1">
                  {Array.from(
                    { length: maxAvailableSessions },
                    (_, i) => i + 1,
                  ).map((val) => (
                    <button
                      key={val}
                      onClick={() => setDurationValue(val)}
                      className={cn(
                        "h-14 min-w-[65px] rounded-xl border-[3px] font-black text-xl transition-all italic snap-center flex flex-col items-center justify-center leading-none",
                        durationValue === val
                          ? "text-white shadow-xl scale-105"
                          : "bg-slate-50 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-300",
                      )}
                      style={
                        durationValue === val
                          ? {
                              backgroundColor: activeTheme.primary_color,
                              borderColor: activeTheme.primary_color,
                            }
                          : undefined
                      }
                    >
                      {val}{" "}
                      <span className="mt-1 text-[7px] font-bold uppercase not-italic text-slate-500 dark:text-slate-300">
                        {isInterday
                          ? selectedItem.price_unit.substring(0, 3)
                          : "SESS"}
                      </span>
                    </button>
                  ))}
                </div>

                {/* DETAILED TIMELINE BOX */}
                <div className={cn(themeVisuals.innerPanelClass, "relative overflow-hidden rounded-[2rem] border-none p-5 shadow-xl space-y-4")}>
                  <div className="mb-2 flex items-center gap-2" style={{ color: activeTheme.primary_color }}>
                    <Clock size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">
                      Rangkuman Jadwal
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-1">
                      <span className={cn("text-[8px] font-black uppercase tracking-widest", themeVisuals.eyebrowMutedClass)}>
                        Waktu Mulai
                      </span>
                      <p className={cn("text-lg font-black leading-none italic", themeVisuals.titleClass)}>
                        {smartTimeline.start}
                      </p>
                      <p className={cn("text-[9px] font-bold", themeVisuals.mutedClass)}>
                        {smartTimeline.fullDate}
                      </p>
                    </div>
                    <div className="space-y-1 text-right border-l border-white/5 pl-6">
                      <span className={cn("text-[8px] font-black uppercase tracking-widest", themeVisuals.eyebrowMutedClass)}>
                        Waktu Selesai
                      </span>
                      <p
                        className="text-lg font-black leading-none italic"
                        style={{ color: activeTheme.primary_color }}
                      >
                        {smartTimeline.end}
                      </p>
                      <p className={cn("text-[9px] font-bold italic", themeVisuals.mutedClass)}>
                        {isInterday ? "Akses Berakhir" : smartTimeline.fullDate}
                      </p>
                    </div>
                  </div>
                  <Zap className="absolute right-[-10px] bottom-[-10px] size-24 opacity-5 text-white -rotate-12" />
                </div>
              </div>

              {/* ADDONS */}
              <div className="space-y-4 pt-2">
                <h2 className={cn("flex items-center gap-2 px-1 text-[11px] font-black uppercase italic", themeVisuals.mutedClass)}>
                  <Plus size={14} /> Tambahan (Optional)
                </h2>
                <div className="grid grid-cols-1 gap-2 px-1">
                  {resource.items
                    ?.filter((i: any) => i.item_type === "add_on")
                    .map((item: any) => {
                      const isSel = selectedAddons.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() =>
                            setSelectedAddons((p) =>
                              isSel
                                ? p.filter((a) => a !== item.id)
                                : [...p, item.id],
                            )
                          }
                          className={cn(
                            "p-3 rounded-xl border-2 transition-all flex items-center justify-between active:scale-95",
                            isSel
                              ? "shadow-sm"
                              : "border-slate-50 dark:border-white/5 bg-slate-50/50",
                          )}
                          style={
                            isSel
                              ? {
                                  borderColor: activeTheme.primary_color,
                                  backgroundColor: `${activeTheme.primary_color}12`,
                                }
                              : undefined
                          }
                        >
                          <div className="text-left leading-none">
                            <p className="font-black uppercase text-[10px] italic dark:text-white leading-none">
                              {item.name}
                            </p>
                            <p className={cn("mt-1 text-[8px] font-bold leading-none", themeVisuals.mutedClass)}>
                              +Rp {item.price.toLocaleString()}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "h-6 w-6 rounded-lg flex items-center justify-center transition-colors shadow-sm",
                              isSel
                                ? "text-white"
                                : "bg-white dark:bg-white/10 border",
                            )}
                            style={
                              isSel
                                ? { backgroundColor: activeTheme.primary_color }
                                : undefined
                            }
                          >
                            {isSel ? (
                              <Check size={12} strokeWidth={4} />
                            ) : (
                              <Plus size={12} className="opacity-20" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* CUSTOMER FORM */}
              <div className="space-y-6 pt-8 border-t-4 border-slate-50 dark:border-white/5 animate-in fade-in duration-1000">
                <div className="space-y-1">
                  <h2 className="text-xl font-[1000] italic uppercase tracking-tighter dark:text-white leading-none">
                    Konfirmasi{" "}
                    <span style={{ color: activeTheme.primary_color }}>
                      Boking
                    </span>
                  </h2>
                  <p className={cn("text-[9px] font-bold uppercase tracking-widest italic", themeVisuals.mutedClass)}>
                    E-Ticket dikirim via WhatsApp
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className={cn("ml-1 text-[9px] font-black uppercase", themeVisuals.eyebrowMutedClass)}>
                      Kode Promo
                    </Label>
                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <Input
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        className="h-12 rounded-xl bg-slate-50 dark:bg-black border-none px-6 font-black uppercase tracking-[0.18em] shadow-inner"
                        placeholder="VOUCHER"
                      />
                      <Button
                        type="button"
                        onClick={handlePromoPreview}
                        disabled={isCheckingPromo}
                        className="h-12 rounded-xl px-4 text-xs font-black uppercase"
                        style={{ backgroundColor: activeTheme.primary_color }}
                      >
                        {isCheckingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pakai Promo"}
                      </Button>
                    </div>
                    {promoPreview?.valid && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                        {promoPreview.label || promoCode} aktif • Potongan Rp {Number(promoPreview.discount_amount || 0).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className={cn("ml-1 text-[9px] font-black uppercase", themeVisuals.eyebrowMutedClass)}>
                      WhatsApp Aktif
                    </Label>
                    <div className="relative">
                      <Input
                        value={custPhone}
                        onChange={(e) =>
                          setCustPhone(e.target.value.replace(/\D/g, ""))
                        }
                        className={cn(
                          "h-14 rounded-xl bg-slate-50 dark:bg-black border-none font-black px-6 text-lg shadow-inner",
                          phoneStatus === "valid"
                            ? "ring-2"
                            : phoneStatus === "invalid"
                              ? "ring-2 ring-red-500"
                              : "",
                        )}
                        style={
                          phoneStatus === "valid"
                            ? {
                                boxShadow: `0 0 0 2px ${activeTheme.primary_color}`,
                              }
                            : undefined
                        }
                        placeholder="08..."
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {phoneStatus === "validating" ? (
                          <Loader2 className="animate-spin text-blue-500 size-5" />
                        ) : phoneStatus === "valid" ? (
                          <ShieldCheck className="text-emerald-500 size-5" />
                        ) : phoneStatus === "invalid" ? (
                          <AlertCircle className="text-red-500 size-5" />
                        ) : (
                          <Smartphone className="text-slate-300 size-5" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <Label className={cn("text-[9px] font-black uppercase", themeVisuals.eyebrowMutedClass)}>
                        Nama Sesuai KTP
                      </Label>
                      {isReturning && (
                        <span className="text-[7px] font-black text-emerald-500 uppercase italic">
                          Identitas Terdaftar
                        </span>
                      )}
                    </div>
                    <Input
                      value={custName}
                      onChange={(e) =>
                        setCustName(e.target.value.toUpperCase())
                      }
                      className="h-14 rounded-xl bg-slate-50 dark:bg-black border-none font-black px-6 text-lg shadow-inner"
                      placeholder="NAMA LENGKAP"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}
        </Card>
      </main>

      {/* STICKY BILLING */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-100/80 bg-white/90 backdrop-blur-2xl dark:border-white/5 dark:bg-black/90 animate-in slide-in-from-bottom-full duration-500">
        <div className="mx-auto max-w-4xl px-3 py-3 md:px-4 md:py-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="space-y-2">
              <span className={cn("text-[8px] font-black uppercase tracking-widest italic", themeVisuals.mutedClass)}>
                Estimasi Total Booking
              </span>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex items-baseline gap-0.5">
                  <span
                    className="text-sm font-bold tracking-tighter"
                    style={{ color: activeTheme.primary_color }}
                  >
                    Rp
                  </span>
                  <h3 className="text-2xl md:text-3xl font-[1000] italic text-slate-950 dark:text-white tracking-tighter leading-none">
                    {totalAfterPromo().toLocaleString()}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {promoPreview?.valid && (
                    <Badge className="rounded-full border-none bg-emerald-500 px-3 py-1 text-[8px] font-black uppercase italic text-white">
                      Diskon Rp{Number(promoPreview.discount_amount || 0).toLocaleString()}
                    </Badge>
                  )}
                  <Badge
                    className="rounded-full border-none px-3 py-1 text-[8px] font-black uppercase italic text-white"
                    style={{ backgroundColor: activeTheme.primary_color }}
                  >
                    DP ikut policy tenant
                  </Badge>
                  <Badge
                    className="rounded-full border-none px-3 py-1 text-[8px] font-black uppercase italic"
                    style={{
                      backgroundColor: `${activeTheme.primary_color}16`,
                      color: activeTheme.primary_color,
                    }}
                  >
                    Final dihitung server
                  </Badge>
                </div>
              </div>
              <p className={cn("max-w-md text-[10px] font-bold italic leading-relaxed", themeVisuals.mutedClass)}>
                Setelah booking tersimpan, sistem akan menghitung DP sesuai policy tenant dan resource, lalu customer lanjut ke tiket pembayaran.
              </p>
            </div>
            <Button
              disabled={
                phoneStatus !== "valid" ||
                !selectedTime ||
                isSubmitting ||
                !custName
              }
              onClick={handleBooking}
              className="h-14 md:h-16 w-full md:w-auto md:px-10 rounded-2xl text-white font-[1000] uppercase italic text-sm shadow-xl transition-all active:scale-95 gap-2 active:border-b-0"
              style={{
                backgroundColor: activeTheme.primary_color,
                borderBottom: `4px solid ${activeTheme.accent_color}`,
                boxShadow: `0 14px 28px -10px ${activeTheme.primary_color}80`,
              }}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin size-5" />
              ) : (
                <>
                  SIMPAN & LANJUT{" "}
                  <ChevronRight strokeWidth={4} size={18} />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-black p-4 space-y-6">
      <Skeleton className="h-[25vh] w-full rounded-[2.5rem]" />
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-2">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function getWIBDate(date: Date) {
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
}

function startOfWIBDay(date: Date) {
  const wib = getWIBDate(date);
  return new Date(wib.getFullYear(), wib.getMonth(), wib.getDate(), 0, 0, 0, 0);
}

function formatInWIB(date: Date, pattern: string) {
  const wib = getWIBDate(date);
  if (pattern === "EEEE, dd MMM yyyy") {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
      .format(wib)
      .replace(",", "");
  }
  return format(wib, pattern);
}

function Smartphone({
  className,
  size,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}
