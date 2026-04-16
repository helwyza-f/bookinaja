"use client";
import { setCookie } from "cookies-next";
import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Info,
  AlertCircle,
  Timer,
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

export default function ResourceBookingDetail() {
  const params = useParams();
  const router = useRouter();
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
        const def = resDetail.data.items?.find(
          (i: any) =>
            i.is_default &&
            (i.item_type === "main_option" || i.item_type === "main"),
        );
        if (def) setSelectedMainId(def.id);
      } catch (err) {
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

  const isInterday = useMemo(() => {
    if (!selectedItem) return false;
    return ["day", "week", "month", "year"].includes(selectedItem.price_unit);
  }, [selectedItem]);

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
        } catch (err) {
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
  }, [custPhone]);

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
  }, [maxAvailableSessions]);

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
      };

      const res = await api.post("/public/bookings", payload);
      if (res.data.customer_token)
        setCookie("customer_auth", res.data.customer_token, {
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        });
      syncTenantCookies(params.tenant as string, resource?.tenant_id);
      toast.success("Boking Berhasil Dibuat!");
      setTimeout(() => router.push(res.data.redirect_url), 800);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal membuat reservasi");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <BookingSkeleton />;

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] font-plus-jakarta pb-40 transition-colors duration-500 overflow-x-hidden">
      {/* Header Visual */}
      <div className="relative h-[30vh] md:h-[40vh] w-full bg-slate-900">
        {resource?.image_url ? (
          <img
            src={resource.image_url}
            className="w-full h-full object-cover opacity-60"
            alt="Unit"
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
          <Badge className="bg-blue-600 text-white italic tracking-widest text-[8px] uppercase py-0 px-2">
            {resource?.category}
          </Badge>
          <h1 className="text-3xl md:text-6xl font-[950] italic uppercase tracking-tighter text-slate-950 dark:text-white leading-[0.85] break-words">
            {resource?.name}
          </h1>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-3 -translate-y-4 relative z-40 space-y-4">
        <Card className="rounded-[2rem] md:rounded-[3rem] border-none shadow-2xl p-5 md:p-10 bg-white dark:bg-[#0a0a0a] ring-1 ring-black/5 dark:ring-white/5 space-y-8">
          {/* STEP 1: PAKET */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <span className="bg-slate-950 dark:bg-blue-600 text-white h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black italic">
                01
              </span>
              <h2 className="text-sm font-[950] uppercase italic dark:text-white">
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
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-600/5 shadow-md"
                        : "border-slate-50 dark:border-white/5 bg-slate-50/50",
                    )}
                  >
                    <p
                      className={cn(
                        "text-base font-black uppercase italic tracking-tighter leading-none",
                        selectedMainId === item.id
                          ? "text-blue-600"
                          : "text-slate-900 dark:text-slate-100",
                      )}
                    >
                      {item.name}
                    </p>
                    <p className="text-[9px] font-bold uppercase opacity-60 mt-1.5 leading-none italic tracking-tighter">
                      Rp {item.price.toLocaleString()} /{" "}
                      {item.price_unit.toUpperCase()}
                    </p>
                    {selectedMainId === item.id && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 opacity-10 h-8 w-8 text-blue-600" />
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
                <span className="bg-blue-600 text-white h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black italic">
                  02
                </span>
                <h2 className="text-sm font-[950] uppercase italic dark:text-white">
                  Jadwal Kehadiran
                </h2>
              </div>
              <Badge
                variant="outline"
                className="text-[7px] font-black uppercase border-slate-200 opacity-60"
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
                  <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                  {date
                    ? format(date, "EEEE, dd MMM yyyy", { locale: idLocale })
                    : "PILIH TANGGAL"}
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
                    setDate(d);
                    setIsCalendarOpen(false);
                  }}
                  disabled={(d) => d < startOfToday()}
                  className="w-full"
                />
              </PopoverContent>
            </Popover>

            {date && selectedMainId && !isInterday && (
              <div className="grid grid-cols-4 gap-1.5 p-2.5 bg-slate-50/30 dark:bg-white/[0.02] rounded-[1.5rem] border border-slate-100 dark:border-white/5 animate-in fade-in duration-500">
                {availableSlots.map((time) => {
                  const { isPast, isBusy } = ((timeStr: string) => {
                    const [h, m] = timeStr.split(":").map(Number);
                    const totalMin = h * 60 + m;
                    let past = false;
                    if (date && isSameDay(date, new Date())) {
                      const nowTime = new Date();
                      if (
                        totalMin <=
                        nowTime.getHours() * 60 + nowTime.getMinutes()
                      )
                        past = true;
                    }
                    const busy = busySlots.some(
                      (s) => totalMin >= s.start_min && totalMin < s.end_min,
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
                          ? "border-blue-600 bg-blue-600 text-white shadow-lg"
                          : isPast
                            ? "opacity-10 cursor-not-allowed grayscale"
                            : isBusy
                              ? "border-red-500/20 bg-red-50/30 text-red-500/30 cursor-not-allowed"
                              : "bg-white dark:bg-[#111] border-slate-100 dark:border-white/5 text-slate-900 dark:text-white",
                      )}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}

            {isInterday && (
              <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center gap-3 animate-in slide-in-from-top-2">
                <ShieldCheck className="text-emerald-500 h-5 w-5 shrink-0" />
                <p className="text-[10px] font-black text-emerald-600 uppercase italic">
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
                    <span className="bg-emerald-500 text-white h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black italic">
                      03
                    </span>
                    <h2 className="text-sm font-[950] uppercase italic">
                      Pilih Durasi
                    </h2>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black italic rounded-full text-[8px] tracking-widest uppercase">
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
                          ? "bg-blue-600 border-blue-600 text-white shadow-xl scale-105"
                          : "bg-slate-50 dark:bg-white/5 border-transparent text-slate-300",
                      )}
                    >
                      {val}{" "}
                      <span className="text-[7px] mt-1 font-bold not-italic opacity-60 uppercase">
                        {isInterday
                          ? selectedItem.price_unit.substring(0, 3)
                          : "SESS"}
                      </span>
                    </button>
                  ))}
                </div>

                {/* DETAILED TIMELINE BOX */}
                <div className="bg-slate-950 dark:bg-blue-600/10 p-5 rounded-[2rem] border-none shadow-xl space-y-4 relative overflow-hidden">
                  <div className="flex items-center gap-2 text-blue-400 dark:text-blue-500 mb-2">
                    <Clock size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">
                      Rangkuman Jadwal
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-slate-500 dark:text-blue-400/50 uppercase tracking-widest">
                        Waktu Mulai
                      </span>
                      <p className="text-lg font-black text-white leading-none italic">
                        {smartTimeline.start}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 opacity-60">
                        {smartTimeline.fullDate}
                      </p>
                    </div>
                    <div className="space-y-1 text-right border-l border-white/5 pl-6">
                      <span className="text-[8px] font-black text-slate-500 dark:text-blue-400/50 uppercase tracking-widest">
                        Waktu Selesai
                      </span>
                      <p className="text-lg font-black text-blue-500 leading-none italic">
                        {smartTimeline.end}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 opacity-60 italic">
                        {isInterday ? "Akses Berakhir" : smartTimeline.fullDate}
                      </p>
                    </div>
                  </div>
                  <Zap className="absolute right-[-10px] bottom-[-10px] size-24 opacity-5 text-white -rotate-12" />
                </div>
              </div>

              {/* ADDONS */}
              <div className="space-y-4 pt-2">
                <h2 className="text-[11px] font-black uppercase italic flex items-center gap-2 dark:text-white px-1 opacity-50">
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
                              ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10 shadow-sm"
                              : "border-slate-50 dark:border-white/5 bg-slate-50/50",
                          )}
                        >
                          <div className="text-left leading-none">
                            <p className="font-black uppercase text-[10px] italic dark:text-white leading-none">
                              {item.name}
                            </p>
                            <p className="text-[8px] font-bold opacity-60 mt-1 leading-none">
                              +Rp {item.price.toLocaleString()}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "h-6 w-6 rounded-lg flex items-center justify-center transition-colors shadow-sm",
                              isSel
                                ? "bg-orange-500 text-white"
                                : "bg-white dark:bg-white/10 border",
                            )}
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
                    Konfirmasi <span className="text-blue-600">Boking</span>
                  </h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60">
                    E-Ticket dikirim via WhatsApp
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">
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
                            ? "ring-2 ring-emerald-500"
                            : phoneStatus === "invalid"
                              ? "ring-2 ring-red-500"
                              : "",
                        )}
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
                      <Label className="text-[9px] font-black uppercase text-slate-400">
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
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/80 dark:bg-black/90 backdrop-blur-2xl border-t border-slate-100 dark:border-white/5 z-50 animate-in slide-in-from-bottom-full duration-500">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex-1 flex-col pl-2">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic opacity-60">
              Estimasi Tagihan
            </span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-blue-600 text-sm font-bold tracking-tighter">
                Rp
              </span>
              <h3 className="text-xl md:text-3xl font-[1000] italic text-slate-950 dark:text-white tracking-tighter leading-none">
                {calculateTotal().toLocaleString()}
              </h3>
            </div>
          </div>
          <Button
            disabled={
              phoneStatus !== "valid" ||
              !selectedTime ||
              isSubmitting ||
              !custName
            }
            onClick={handleBooking}
            className="h-14 flex-1 md:flex-none md:px-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-[1000] uppercase italic text-sm shadow-xl transition-all active:scale-95 gap-2 border-b-4 border-blue-800 active:border-b-0"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin size-5" />
            ) : (
              <>
                AMANKAN SLOT <ChevronRight strokeWidth={4} size={18} />
              </>
            )}
          </Button>
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
