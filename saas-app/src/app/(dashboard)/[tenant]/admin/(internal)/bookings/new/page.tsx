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
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarIcon,
  Clock,
  User,
  Phone,
  Loader2,
  ChevronRight,
  Calculator,
  ArrowLeft,
  Ticket,
  MapPin,
  Layers,
  History,
  Lock,
  LayoutGrid,
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
  const [now, setNow] = useState(new Date());

  // Form State
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState(1);
  const [selectedMainId, setSelectedMainId] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [status, setStatus] = useState("confirmed");

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentResource = useMemo(
    () =>
      Array.isArray(resources)
        ? resources.find((r) => r.id === selectedResourceId)
        : null,
    [resources, selectedResourceId],
  );

  const selectedItem = useMemo(
    () => currentResource?.items?.find((i: any) => i.id === selectedMainId),
    [currentResource, selectedMainId],
  );

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

  useEffect(() => {
    if (selectedResourceId && date) {
      api
        .get(
          `/guest/availability/${selectedResourceId}?date=${format(date, "yyyy-MM-dd")}`,
        )
        .then((res) => {
          const normalized = (res.data.busy_slots || []).map((slot: any) => {
            const start = new Date(
              `${format(date, "yyyy-MM-dd")}T${slot.start_time}:00Z`,
            );
            const end = new Date(
              `${format(date, "yyyy-MM-dd")}T${slot.end_time}:00Z`,
            );
            return {
              start_time: format(start, "HH:mm"),
              end_time: format(end, "HH:mm"),
              raw_start: slot.start_time,
            };
          });
          setBusySlots(normalized);
        });
    }
  }, [selectedResourceId, date]);

  const isTimePassed = (timeStr: string) => {
    if (!date || !isSameDay(date, now)) return false;
    const [hours, minutes] = timeStr.split(":").map(Number);
    const slotTime = new Date(date);
    slotTime.setHours(hours, minutes, 0, 0);
    return isBefore(slotTime, now);
  };

  const isTimeBusy = (timeStr: string) => {
    const targetMinutes =
      parse(timeStr, "HH:mm", new Date()).getHours() * 60 +
      parse(timeStr, "HH:mm", new Date()).getMinutes();
    return busySlots.some((slot) => {
      const [sh, sm] = slot.start_time.split(":").map(Number);
      const [eh, em] = slot.end_time.split(":").map(Number);
      return targetMinutes >= sh * 60 + sm && targetMinutes < eh * 60 + em;
    });
  };

  const maxAvailableDuration = useMemo(() => {
    if (!selectedTime || !selectedItem) return 1;
    if (selectedItem.price_unit === "day") return 1;

    const [startH, startM] = selectedTime.split(":").map(Number);
    const startTotalMinutes = startH * 60 + startM;
    const unitMinutes = selectedItem.unit_duration || 60;

    const nextBusyMinutes = busySlots
      .map((s) => {
        const [h, m] = s.start_time.split(":").map(Number);
        return h * 60 + m;
      })
      .filter((m) => m > startTotalMinutes)
      .sort((a, b) => a - b)[0];

    const storeCloseMinutes = 23 * 60 + 59;
    const limitMinutes = nextBusyMinutes || storeCloseMinutes;
    const availableMinutes = limitMinutes - startTotalMinutes;
    const calculatedMax = Math.floor(availableMinutes / unitMinutes);

    return calculatedMax > 0 ? calculatedMax : 1;
  }, [selectedTime, busySlots, selectedItem]);

  useEffect(() => {
    if (duration > maxAvailableDuration) setDuration(1);
  }, [selectedTime, maxAvailableDuration]);

  const availableSlots = useMemo(() => {
    if (!selectedItem) return [];
    const slots = [];
    let current = parse("09:00", "HH:mm", new Date());
    const end = parse("23:30", "HH:mm", new Date());
    const interval = selectedItem.unit_duration || 60;
    while (isBefore(current, end)) {
      slots.push(format(current, "HH:mm"));
      current = addMinutes(current, interval);
    }
    return slots;
  }, [selectedItem]);

  const calculateTotal = () => {
    if (!selectedItem) return 0;
    const mainPrice = (selectedItem.price || 0) * duration;
    const addonsPrice = (currentResource?.items || [])
      .filter((i: any) => selectedAddons.includes(i.id))
      .reduce((acc: number, curr: any) => acc + (curr.price || 0), 0);
    return mainPrice + addonsPrice;
  };

  const handleSave = async () => {
    if (!selectedTime || !custName || !custPhone)
      return toast.error("Lengkapi data wajib");
    setIsSubmitting(true);
    try {
      const fullDate = parse(selectedTime, "HH:mm", date || new Date());
      const payload = {
        tenant_id: currentResource.tenant_id,
        resource_id: selectedResourceId,
        customer_name: custName.toUpperCase(),
        customer_phone: custPhone,
        item_ids: [selectedMainId, ...selectedAddons],
        start_time: formatISO(fullDate),
        duration: duration,
        status: status,
      };
      await api.post("/bookings/manual", payload);
      toast.success("Reservasi Berhasil Dibuat");
      router.push("/admin/bookings");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal menyimpan reservasi");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-plus-jakarta pb-20">
      <div className="max-w-[1500px] mx-auto p-4 lg:p-10 space-y-10">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <Button
              variant="ghost"
              onClick={() => router.push("/admin/bookings")}
              className="h-8 px-0 text-slate-400 hover:text-slate-950 dark:hover:text-white font-black text-[10px] uppercase tracking-widest italic flex items-center gap-2 pr-2 transition-all"
            >
              <ArrowLeft className="w-3 h-3 stroke-[4]" /> KEMBALI KE DAFTAR
            </Button>
            <h1 className="text-3xl lg:text-6xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none pr-2">
              Input <span className="text-blue-600">Reservasi</span>
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-3 bg-blue-600/10 px-5 py-3 rounded-2xl border border-blue-600/20">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase italic tracking-widest leading-none pr-1">
              Admin Manual Booking Panel
            </p>
          </div>
        </header>

        <div className="flex flex-col xl:flex-row gap-10 items-start">
          <div className="w-full xl:flex-1 space-y-8">
            {/* STEP 01: Resource Selection */}
            <Card className="rounded-[3rem] border-none shadow-xl shadow-slate-200/40 dark:shadow-none p-8 lg:p-12 bg-white dark:bg-slate-900 space-y-10 ring-1 ring-slate-100 dark:ring-white/5 overflow-hidden">
              <div className="flex items-center gap-4 border-b border-slate-50 dark:border-white/5 pb-8">
                <div className="w-12 h-12 rounded-2xl bg-slate-950 dark:bg-slate-800 flex items-center justify-center text-white shadow-xl">
                  <MapPin size={24} />
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tight dark:text-white pr-2">
                  01.{" "}
                  <span className="text-slate-300 dark:text-slate-600">
                    Pilih Resource
                  </span>
                </h2>
              </div>

              <div className="space-y-10">
                <div className="max-w-md space-y-4">
                  <Label className="text-[10px] font-black uppercase text-slate-400 italic ml-2 tracking-widest pr-2">
                    Katalog Unit Tersedia
                  </Label>
                  <Select
                    value={selectedResourceId}
                    onValueChange={(v) => {
                      setSelectedResourceId(v);
                      setSelectedMainId("");
                      setSelectedTime("");
                    }}
                  >
                    <SelectTrigger className="h-20 rounded-[1.5rem] border-none bg-slate-50 dark:bg-slate-800 font-black italic uppercase px-8 text-xl shadow-inner dark:text-white pr-2 focus:ring-0">
                      <SelectValue placeholder="PILIH UNIT" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl font-bold uppercase italic border-none shadow-2xl p-2 dark:bg-slate-800 dark:text-white">
                      {resources.map((r) => (
                        <SelectItem
                          key={r.id}
                          value={r.id}
                          className="rounded-xl h-14 pr-2 italic"
                        >
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {currentResource && (
                  <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                    <Label className="text-[10px] font-black uppercase text-slate-400 italic ml-2 tracking-widest pr-2">
                      Pilih Paket Layanan
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {currentResource.items
                        ?.filter(
                          (i: any) =>
                            i.item_type === "main_option" ||
                            i.item_type === "main" ||
                            i.item_type === "console_option",
                        )
                        .map((item: any) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSelectedMainId(item.id);
                              setSelectedTime("");
                            }}
                            className={cn(
                              "h-28 px-8 rounded-[2rem] border-4 text-left transition-all flex justify-between items-center group",
                              selectedMainId === item.id
                                ? "border-blue-600 bg-white dark:bg-slate-800 shadow-2xl scale-[1.03]"
                                : "border-transparent bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700",
                            )}
                          >
                            <div className="flex flex-col">
                              <span
                                className={cn(
                                  "text-base font-black uppercase italic pr-2",
                                  selectedMainId === item.id
                                    ? "text-blue-600"
                                    : "text-slate-500 dark:text-slate-400",
                                )}
                              >
                                {item.name}
                              </span>
                              <span className="text-[11px] font-bold text-slate-400 uppercase italic">
                                /{" "}
                                {item.price_unit === "day"
                                  ? "Harian"
                                  : `${item.unit_duration} Menit`}
                              </span>
                            </div>
                            <span className="text-2xl font-black italic text-slate-950 dark:text-white tracking-tighter pr-2">
                              Rp{item.price.toLocaleString()}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* STEP 02: Schedule Selection */}
            <Card
              className={cn(
                "rounded-[3rem] border-none shadow-xl shadow-slate-200/40 dark:shadow-none p-8 lg:p-12 bg-white dark:bg-slate-900 space-y-10 transition-all duration-700 ring-1 ring-slate-100 dark:ring-white/5",
                !selectedMainId && "opacity-20 pointer-events-none blur-[2px]",
              )}
            >
              <div className="flex items-center gap-4 border-b border-slate-50 dark:border-white/5 pb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200 dark:shadow-none">
                  <Clock size={24} />
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tight dark:text-white pr-2">
                  02.{" "}
                  <span className="text-slate-300 dark:text-slate-600">
                    Durasi & Slot Waktu
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4 space-y-10">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-slate-400 italic ml-2 tracking-widest pr-2">
                      Tentukan Tanggal
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-20 rounded-[1.5rem] border-none bg-slate-50 dark:bg-slate-800 font-black italic justify-start px-8 text-xl shadow-inner dark:text-white pr-2"
                        >
                          <CalendarIcon className="mr-4 h-6 w-6 text-blue-600" />
                          {date
                            ? format(date, "dd MMM yyyy", { locale: idLocale })
                            : "PILIH TANGGAL"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-3xl border-none shadow-2xl overflow-hidden dark:bg-slate-900">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          disabled={(d) => d < startOfToday()}
                          className="p-4"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between px-2 items-end">
                      <Label className="text-[10px] font-black uppercase text-slate-400 italic tracking-widest pr-2 leading-none">
                        Jumlah Durasi
                      </Label>
                      <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-black italic text-[10px] px-3 py-1 rounded-full border-none">
                        MAX: {maxAvailableDuration}
                      </Badge>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        value={duration}
                        onChange={(e) =>
                          setDuration(
                            Math.min(
                              parseInt(e.target.value) || 1,
                              maxAvailableDuration,
                            ),
                          )
                        }
                        className="h-24 rounded-[2rem] border-none bg-slate-50 dark:bg-slate-800 font-black italic text-6xl text-center text-blue-600 shadow-inner pr-2 focus-visible:ring-0"
                      />
                      <Layers className="absolute right-10 top-1/2 -translate-y-1/2 w-8 h-8 text-slate-100 dark:text-white/5" />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-4">
                  <Label className="text-[10px] font-black uppercase text-slate-400 italic ml-2 tracking-widest pr-2">
                    Slot Waktu (Klik Jam Mulai)
                  </Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-6 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] shadow-inner max-h-[420px] overflow-y-auto scrollbar-hide border border-slate-100 dark:border-white/5">
                    {availableSlots.map((t) => {
                      const busy = isTimeBusy(t);
                      const passed = isTimePassed(t);
                      const selected = selectedTime === t;
                      const isDisabled = busy || passed;

                      return (
                        <button
                          key={t}
                          disabled={isDisabled}
                          onClick={() => setSelectedTime(t)}
                          className={cn(
                            "h-20 rounded-2xl text-base font-black italic border-2 transition-all flex flex-col items-center justify-center relative pr-1",
                            selected
                              ? "bg-blue-600 border-blue-600 text-white shadow-2xl scale-110 z-10"
                              : passed
                                ? "bg-white dark:bg-slate-950 border-transparent text-slate-200 dark:text-slate-800 cursor-not-allowed opacity-40"
                                : busy
                                  ? "bg-red-50 dark:bg-red-950/20 border-transparent text-red-300 dark:text-red-900 cursor-not-allowed"
                                  : "bg-white dark:bg-slate-900 border-white dark:border-transparent text-slate-700 dark:text-slate-400 hover:border-blue-600 shadow-sm",
                          )}
                        >
                          <span>{t}</span>
                          {passed ? (
                            <History size={12} className="mt-1 opacity-50" />
                          ) : busy ? (
                            <Lock size={12} className="mt-1 opacity-50" />
                          ) : null}
                          {isDisabled && (
                            <span className="text-[7px] absolute bottom-1.5 font-black uppercase tracking-tighter opacity-80">
                              {passed ? "Lalu" : "Penuh"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* SIDEBAR: Admin Controls */}
          <div
            className={cn(
              "w-full xl:w-[420px] space-y-6 sticky top-8 transition-all duration-700",
              !selectedTime && "opacity-20 blur-[1px] pointer-events-none",
            )}
          >
            <Card className="rounded-[3rem] border-none shadow-xl p-8 lg:p-10 bg-white dark:bg-slate-900 space-y-8 ring-1 ring-slate-100 dark:ring-white/5">
              <div className="flex items-center justify-between border-b border-slate-50 dark:border-white/5 pb-5">
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none pr-2">
                  Info <span className="text-blue-600">Pelanggan</span>
                </h3>
                <User className="w-5 h-5 text-slate-300" />
              </div>
              <div className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                  <Input
                    placeholder="NAMA LENGKAP"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value.toUpperCase())}
                    className="h-16 pl-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black italic focus:ring-4 focus:ring-blue-500/5 transition-all text-xs uppercase pr-2 shadow-inner dark:text-white focus-visible:ring-0"
                  />
                </div>
                <div className="relative group">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                  <Input
                    placeholder="NOMOR WHATSAPP"
                    value={custPhone}
                    onChange={(e) =>
                      setCustPhone(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    className="h-16 pl-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black italic focus:ring-4 focus:ring-blue-500/5 transition-all text-xs pr-2 shadow-inner dark:text-white focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-slate-400 italic ml-2 tracking-widest pr-2 leading-none">
                  Aktivasi Status
                </Label>
                <div className="flex gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-2xl shadow-inner border border-slate-100 dark:border-white/5">
                  {["pending", "confirmed", "active"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={cn(
                        "flex-1 h-12 rounded-xl text-[9px] font-black uppercase italic transition-all pr-1",
                        status === s
                          ? "bg-slate-900 dark:bg-blue-600 text-white shadow-xl"
                          : "text-slate-400 hover:text-slate-600 dark:text-slate-500",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="rounded-[3rem] border-none shadow-xl p-8 lg:p-10 bg-white dark:bg-slate-900 space-y-8 ring-1 ring-slate-100 dark:ring-white/5">
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-50 dark:border-white/5 pb-3">
                  <LayoutGrid className="w-4 h-4 text-blue-600" />
                  <h3 className="text-[10px] font-black italic uppercase tracking-widest text-slate-900 dark:text-white pr-2">
                    Add-ons Opsional
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {currentResource?.items
                    ?.filter(
                      (i: any) =>
                        i.item_type === "add_on" || i.item_type === "addon",
                    )
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
                            "px-6 py-4 rounded-2xl border-2 font-black uppercase italic transition-all text-[10px] flex justify-between items-center group",
                            active
                              ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm"
                              : "border-slate-50 dark:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200",
                          )}
                        >
                          <span className="truncate pr-1">{addon.name}</span>
                          <span className="font-bold whitespace-nowrap opacity-60 text-[9px] pr-1">
                            Rp{addon.price.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="pt-4 border-t-2 border-slate-50 dark:border-white/5 flex flex-col gap-6">
                <div className="bg-slate-950 p-8 rounded-[3rem] text-white space-y-8 relative overflow-hidden shadow-2xl">
                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-3 opacity-50">
                      <Ticket className="w-5 h-5 text-blue-400" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] italic pr-2">
                        Grand Total Bill
                      </span>
                    </div>
                    <p className="text-6xl font-black italic tracking-tighter leading-none flex items-start py-4 pr-6">
                      <span className="text-2xl mr-2 mt-1.5 text-blue-500 font-bold not-italic">
                        Rp
                      </span>
                      {calculateTotal().toLocaleString()}
                    </p>
                  </div>
                  <div className="pt-6 border-t border-white/10 flex justify-between items-center relative z-10">
                    <div className="flex flex-col leading-tight">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 italic pr-1">
                        Start At
                      </span>
                      <span className="text-sm font-black italic text-blue-400 pr-1">
                        {selectedTime || "--:--"}
                      </span>
                    </div>
                    <div className="flex flex-col text-right leading-tight">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 italic pr-1">
                        Booked Time
                      </span>
                      <span className="text-sm font-black italic text-white uppercase pr-1">
                        {duration}{" "}
                        {selectedItem?.price_unit === "hour" ? "Jam" : "Sesi"}
                      </span>
                    </div>
                  </div>
                  <Calculator
                    size={160}
                    className="absolute -right-12 -top-12 opacity-[0.03] rotate-12"
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={
                    isSubmitting ||
                    !selectedTime ||
                    !custName ||
                    !selectedMainId
                  }
                  className="w-full h-20 rounded-[2.5rem] bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-2xl shadow-blue-500/30 active:scale-95 group border-b-8 border-blue-800 dark:border-blue-900 gap-4 pr-3"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin text-white" />
                  ) : (
                    <>
                      <span className="font-black uppercase italic tracking-[0.3em] text-base pr-1">
                        Finalize Booking
                      </span>
                      <ChevronRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform stroke-[4]" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
