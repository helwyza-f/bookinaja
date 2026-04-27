"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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

export default function NewManualBookingPage() {
  const router = useRouter();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busySlots, setBusySlots] = useState<any[]>([]);
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
    () => currentResource?.items?.find((i: any) => i.id === selectedMainId),
    [currentResource, selectedMainId],
  );

  const isInterday = useMemo(() => {
    if (!selectedItem) return false;
    return ["day", "week", "month", "year"].includes(selectedItem.price_unit);
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
            const normalized = (res.data.busy_slots || []).map((slot: any) => {
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
  }, [maxAvailableSessions]);

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
          selectedItem.unit_duration * durationValue,
        );
    }
    return `${format(startObj, "HH:mm")} s/d ${format(endObj, isInterday ? "dd MMM, HH:mm" : "HH:mm")}`;
  }, [selectedTime, selectedItem, date, durationValue, isInterday]);

  const calculateTotal = () => {
    if (!selectedItem) return 0;
    const addonsPrice =
      currentResource?.items
        ?.filter((i: any) => selectedAddons.includes(i.id))
        .reduce((acc: number, curr: any) => acc + (curr.price || 0), 0) || 0;
    return selectedItem.price * durationValue + addonsPrice;
  };

  const handleSave = async () => {
    if (!selectedTime || !custName || !custPhone)
      return toast.error("Data belum lengkap");
    setIsSubmitting(true);
    try {
      const fullDate = parse(selectedTime, "HH:mm", date || new Date());
      await api.post("/bookings/manual", {
        tenant_id: currentResource.tenant_id,
        resource_id: selectedResourceId,
        customer_name: custName.toUpperCase(),
        customer_phone: custPhone,
        item_ids: [selectedMainId, ...selectedAddons],
        start_time: formatISO(fullDate),
        duration: durationValue,
      });
      toast.success("Reservasi Berhasil Disimpan");
      router.push("/admin/bookings");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal menyimpan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Ganti blok loading lama dengan ini:
  if (loading) {
    return <ManualBookingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] font-plus-jakarta pb-20 -mt-6">
      <div className="max-w-[1600px] mx-auto p-3 md:p-4 lg:p-6 space-y-4 md:space-y-6">
        {/* COMPACT HEADER */}
        <header className="flex items-center gap-3 pt-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full hover:bg-slate-200 dark:hover:bg-white/5"
          >
            <ArrowLeft size={20} className="dark:text-white" />
          </Button>
          <div>
            <h1 className="text-lg md:text-xl font-[1000] uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">
              Manual <span className="text-blue-600">Handshake</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Input reservasi & walk-in langsung
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
          {/* LEFT: SELECTION FLOW */}
          <div className="lg:col-span-8 space-y-5">
            {/* 01. PILIH UNIT & PAKET */}
            <Card className="rounded-[1.5rem] md:rounded-[2rem] border-none bg-white dark:bg-[#0c0c0c] p-4 md:p-6 shadow-sm ring-1 ring-black/5 dark:ring-white/5">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Box size={16} />
                </div>
                <h2 className="text-sm font-[1000] uppercase italic text-slate-900 dark:text-white">
                  01. Pilih Unit & Layanan
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {resources.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedResourceId(r.id);
                      setSelectedMainId("");
                      setSelectedTime("");
                    }}
                    className={cn(
                      "p-3.5 rounded-2xl border-2 text-left transition-all",
                      selectedResourceId === r.id
                        ? "border-blue-600 bg-blue-50/10 dark:bg-blue-600/10 shadow-md scale-[1.02]"
                        : "border-transparent bg-slate-50 dark:bg-white/5 text-slate-400",
                    )}
                  >
                    <p
                      className={cn(
                        "text-xs font-[1000] uppercase italic truncate",
                        selectedResourceId === r.id
                          ? "text-blue-600"
                          : "text-slate-900 dark:text-slate-200",
                      )}
                    >
                      {r.name}
                    </p>
                    <p className="text-[7px] font-bold uppercase opacity-50 mt-1 italic tracking-widest">
                      {r.category}
                    </p>
                  </button>
                ))}
              </div>

              {currentResource && (
                <div className="mt-5 pt-5 border-t border-slate-100 dark:border-white/5">
                  <p className="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest italic leading-none">
                    Paket Tersedia
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {currentResource.items
                      ?.filter((i: any) =>
                        ["main_option", "main"].includes(i.item_type),
                      )
                      .map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedMainId(item.id);
                            if (!isInterday) setSelectedTime("");
                          }}
                          className={cn(
                            "px-4 py-2.5 rounded-xl border-2 text-[9px] font-[1000] uppercase italic transition-all shadow-sm",
                            selectedMainId === item.id
                              ? "bg-slate-900 dark:bg-white text-white dark:text-black border-transparent scale-105"
                              : "bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white",
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
              className={cn(
                "rounded-[2rem] border-none bg-white dark:bg-[#0c0c0c] p-5 md:p-8 shadow-sm ring-1 ring-black/5 dark:ring-white/5 transition-all",
                !selectedMainId && "opacity-20 pointer-events-none",
              )}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 md:mb-10">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                    <Clock size={18} />
                  </div>
                  <h2 className="text-base md:text-lg font-[1000] uppercase italic text-slate-900 dark:text-white tracking-tight leading-none">
                    02. Kontrol Jadwal & Durasi
                  </h2>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl font-black italic text-[10px] uppercase gap-3 bg-slate-50 dark:bg-white/5 px-4 border-slate-200 dark:border-white/5 text-slate-900 dark:text-white"
                    >
                      <CalendarIcon size={16} className="text-blue-600" />
                      {date
                        ? format(date, "dd MMMM yyyy", { locale: idLocale })
                        : "Pilih Tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 border-none rounded-2xl shadow-2xl"
                    align="end"
                  >
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) => d < startOfToday()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-10">
                <div className="lg:col-span-4 flex flex-col items-center justify-center border-r border-slate-100 dark:border-white/5 pr-4 md:pr-10">
                  <span className="text-[9px] font-black uppercase text-slate-400 italic mb-5 tracking-[0.2em] leading-none text-center">
                    Jumlah Unit / Sesi
                  </span>
                  <div className="flex items-center gap-6">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setDurationValue((d) => Math.max(1, d - 1))
                      }
                      className="h-9 w-9 rounded-full shadow-sm dark:bg-white/5 dark:border-white/10 dark:text-white"
                    >
                      -
                    </Button>
                    <span className="text-3xl md:text-7xl font-[1000] italic text-blue-600 tabular-nums leading-none tracking-tighter">
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
                      className="h-9 w-9 rounded-full shadow-sm dark:bg-white/5 dark:border-white/10 dark:text-white"
                    >
                      +
                    </Button>
                  </div>
                  <Badge
                    variant="secondary"
                    className="mt-5 text-[8px] font-black uppercase tracking-widest italic px-4 py-1 dark:bg-white/5 dark:text-slate-400"
                  >
                    Slot Maks: {maxAvailableSessions}
                  </Badge>
                </div>

                <div className="lg:col-span-8">
                  {!isInterday ? (
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                      {availableSlots.map((t) => {
                        const isBusy = busySlots.some((s) => {
                          const [h, m] = t.split(":").map(Number);
                          const tm = h * 60 + m;
                          return tm >= s.start_min && tm < s.end_min;
                        });
                        const isPast =
                          isSameDay(date!, new Date()) &&
                          isBefore(parse(t, "HH:mm", date!), new Date());
                        const isSel = selectedTime === t;

                        return (
                          <button
                            key={t}
                            disabled={isBusy || isPast}
                            onClick={() => setSelectedTime(t)}
                            className={cn(
                              "h-11 rounded-xl text-[10px] font-black italic border-2 transition-all flex items-center justify-center relative",
                              isSel
                                ? "bg-blue-600 border-blue-600 text-white shadow-xl scale-110 z-10"
                                : isBusy || isPast
                                  ? "opacity-20 grayscale cursor-not-allowed bg-slate-100 dark:bg-[#111]"
                                  : "bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-500 hover:border-blue-600 dark:hover:text-white shadow-sm",
                            )}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex items-center p-4 md:p-8 bg-blue-500/5 rounded-[1.5rem] md:rounded-[2rem] border border-blue-500/10 gap-4 md:gap-5">
                      <ShieldCheck className="text-blue-500 h-9 w-9 shrink-0" />
                      <p className="text-[10px] md:text-xs font-black text-blue-600 uppercase italic leading-relaxed tracking-wide">
                        Logic Antar Hari Aktif: Boking dimulai otomatis pukul
                        08:00 untuk paket {selectedItem?.price_unit}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* SISI KANAN: RINGKASAN & KONFIRMASI */}
          <div
            className={cn(
              "lg:col-span-4 space-y-5 transition-all duration-500",
              !selectedTime && "opacity-20 pointer-events-none",
            )}
          >
            <Card className="rounded-[1.75rem] md:rounded-[2.5rem] border-none bg-slate-950 p-4 md:p-8 text-white shadow-2xl space-y-5 md:space-y-8 ring-1 ring-white/5">
              {/* CUSTOMER INFO */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <p className="text-[9px] font-black uppercase italic tracking-widest text-slate-500">
                    Profil Pelanggan
                  </p>
                  <Smartphone size={16} className="text-blue-500" />
                </div>
                <div className="space-y-4">
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <Input
                      placeholder="NOMOR WHATSAPP (08...)"
                      value={custPhone}
                      onChange={(e) =>
                        setCustPhone(e.target.value.replace(/\D/g, ""))
                      }
                      className="h-12 bg-white/5 border-none font-black italic text-sm pl-12 rounded-xl placeholder:text-slate-700 focus-visible:ring-blue-600 text-white"
                    />
                    {isReturning && (
                      <Badge className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-[7px] font-black uppercase italic border-none shadow-lg">
                        Member Sultan
                      </Badge>
                    )}
                  </div>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <Input
                      placeholder="NAMA LENGKAP"
                      value={custName}
                      onChange={(e) =>
                        setCustName(e.target.value.toUpperCase())
                      }
                      className="h-12 bg-white/5 border-none font-black italic text-sm pl-12 rounded-xl placeholder:text-slate-700 focus-visible:ring-blue-600 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* FLOW & ADDONS */}
              <div className="space-y-5 pt-4 border-t border-white/5">
                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase italic tracking-widest text-slate-500 leading-none">
                    Flow Booking
                  </p>
                  <div className="rounded-2xl border border-orange-500/15 bg-orange-500/10 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-orange-200">
                          Status awal otomatis
                        </p>
                        <p className="mt-2 text-[13px] font-[1000] italic text-white">
                          Pending, belum aktif
                        </p>
                      </div>
                      <Badge className="border-none bg-orange-600 text-white text-[7px] font-black uppercase italic shadow-lg">
                        pending
                      </Badge>
                    </div>
                    <p className="mt-3 text-[10px] font-bold leading-relaxed text-orange-50/85">
                      Semua booking manual tetap mengikuti flow DP. Jika unit
                      sedang kosong dan customer langsung masuk, sesi bisa
                      diaktifkan manual nanti dari detail booking atau oleh
                      admin.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase italic tracking-widest text-slate-500 leading-none">
                    Layanan Tambahan
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {currentResource?.items
                      ?.filter((i: any) => i.item_type === "add_on")
                      .map((addon: any) => {
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
                              "px-3.5 py-2 rounded-lg text-[8px] font-black uppercase italic transition-all shadow-sm",
                              active
                                ? "bg-blue-600 text-white"
                                : "bg-white/5 text-slate-500 hover:text-slate-300",
                            )}
                          >
                            {addon.name}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* TOTAL BILL */}
              <div className="bg-white/5 p-4 md:p-6 rounded-3xl space-y-4 relative overflow-hidden border border-white/5 shadow-inner">
                <div className="relative z-10">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 italic leading-none">
                    Estimasi Tagihan
                  </p>
                  <p className="text-2xl md:text-5xl font-[1000] italic tracking-tighter text-white leading-none">
                    Rp{calculateTotal().toLocaleString()}
                  </p>
                </div>
                <div className="relative z-10 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1.5">
                      Garis Waktu
                    </span>
                    <span className="text-[9px] font-black italic text-blue-400 leading-none">
                      {timelineSummary}
                    </span>
                  </div>
                  <Badge className="font-[1000] italic text-[8px] uppercase shadow-lg px-3 py-1 border-none bg-orange-600">
                    pending
                  </Badge>
                </div>
                <Zap className="absolute right-[-15px] top-[-15px] size-24 opacity-5 text-white -rotate-12" />
              </div>

              <Button
                onClick={handleSave}
                disabled={isSubmitting || !selectedTime || !custName}
                className="w-full h-14 md:h-20 rounded-[1.5rem] md:rounded-[2rem] bg-blue-600 hover:bg-blue-500 text-white font-[1000] uppercase italic tracking-widest text-sm md:text-base border-b-8 border-blue-800 shadow-2xl transition-all active:scale-95 gap-4"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    SIMPAN & GAS <ChevronRight size={22} strokeWidth={4} />
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
