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
  Box,
  CheckCircle2,
  Plus,
  Minus,
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

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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
    if (selectedResourceId && date) {
      api
        .get(
          `/guest/availability/${selectedResourceId}?date=${format(date, "yyyy-MM-dd")}`,
        )
        .then((res) => {
          const normalized = (res.data.busy_slots || []).map((slot: any) => ({
            start_time: slot.start_time,
            end_time: slot.end_time,
          }));
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
    const [h, m] = timeStr.split(":").map(Number);
    const targetMin = h * 60 + m;
    return busySlots.some((slot) => {
      const [sh, sm] = slot.start_time.split(":").map(Number);
      const [eh, em] = slot.end_time.split(":").map(Number);
      return targetMin >= sh * 60 + sm && targetMin < eh * 60 + em;
    });
  };

  const availableSlots = useMemo(() => {
    if (!selectedItem) return [];
    const slots = [];
    let current = parse("08:00", "HH:mm", new Date());
    const end = parse("23:30", "HH:mm", new Date());
    const interval = selectedItem.unit_duration || 60;
    while (isBefore(current, end)) {
      slots.push(format(current, "HH:mm"));
      current = addMinutes(current, interval);
    }
    return slots;
  }, [selectedItem]);

  const maxAvailableDuration = useMemo(() => {
    if (!selectedTime || !selectedItem) return 1;
    const [startH, startM] = selectedTime.split(":").map(Number);
    const startTotal = startH * 60 + startM;
    const nextBusy = busySlots
      .map((s) => {
        const [h, m] = s.start_time.split(":").map(Number);
        return h * 60 + m;
      })
      .filter((m) => m > startTotal)
      .sort((a, b) => a - b)[0];

    const limit = nextBusy || 23 * 60 + 59;
    return (
      Math.floor((limit - startTotal) / (selectedItem.unit_duration || 60)) || 1
    );
  }, [selectedTime, busySlots, selectedItem]);

  useEffect(() => {
    if (duration > maxAvailableDuration) setDuration(1);
  }, [selectedTime, maxAvailableDuration]);

  const calculateTotal = () => {
    if (!selectedItem) return 0;
    const addonsPrice = (currentResource?.items || [])
      .filter((i: any) => selectedAddons.includes(i.id))
      .reduce((acc: number, curr: any) => acc + (curr.price || 0), 0);
    return selectedItem.price * duration + addonsPrice;
  };

  const handleSave = async () => {
    if (!selectedTime || !custName || !custPhone)
      return toast.error("Lengkapi data wajib");
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
        duration: duration,
        status: "confirmed",
      });
      toast.success("Reservasi Berhasil");
      router.push("/admin/bookings");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal menyimpan");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center dark:bg-slate-950">
        <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-plus-jakarta pb-20 -mt-4">
      <div className="max-w-[1500px] mx-auto p-4 lg:p-6 space-y-6">
        {/* COMPACT HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Button
              variant="ghost"
              onClick={() => router.push("/admin/bookings")}
              className="h-6 px-0 text-slate-400 hover:text-blue-600 font-black text-[9px] uppercase tracking-widest italic flex items-center gap-2 transition-all"
            >
              <ArrowLeft className="w-2.5 h-2.5 stroke-[4]" /> Back to List
            </Button>
            <h1 className="text-4xl lg:text-5xl font-[1000] italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none pr-4">
              Manual <span className="text-blue-600">Entry.</span>
            </h1>
          </div>
          <Badge className="w-fit bg-blue-600 text-white border-none font-black italic text-[9px] px-3 py-1 rounded-lg uppercase tracking-tighter shadow-lg shadow-blue-500/20">
            Admin Handshake Mode
          </Badge>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 space-y-6">
            {/* 01. RESOURCE PICKER */}
            <Card className="rounded-[2.5rem] border-none shadow-sm p-8 bg-white dark:bg-slate-900 ring-1 ring-slate-200/50 dark:ring-white/5">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-10 w-10 rounded-xl bg-slate-950 dark:bg-blue-600 flex items-center justify-center text-white shadow-lg">
                  <Box size={22} />
                </div>
                <h2 className="text-xl font-black uppercase italic tracking-tight dark:text-white">
                  01. Select Resource
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {resources.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedResourceId(r.id);
                      setSelectedMainId("");
                      setSelectedTime("");
                    }}
                    className={cn(
                      "p-6 rounded-[2rem] border-4 text-left transition-all relative overflow-hidden",
                      selectedResourceId === r.id
                        ? "border-blue-600 bg-blue-50/30 dark:bg-blue-600/10 shadow-md scale-[1.02]"
                        : "border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-transparent hover:border-slate-200",
                    )}
                  >
                    <p
                      className={cn(
                        "text-lg md:text-xl font-[1000] uppercase italic tracking-tighter truncate leading-tight",
                        selectedResourceId === r.id
                          ? "text-blue-600"
                          : "text-slate-900 dark:text-slate-200",
                      )}
                    >
                      {r.name}
                    </p>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-1.5 tracking-[0.2em]">
                      {r.category}
                    </p>
                    {selectedResourceId === r.id && (
                      <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {currentResource && (
                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 animate-in fade-in slide-in-from-top-2">
                  <p className="text-[10px] font-black uppercase text-slate-400 italic mb-5 tracking-[0.3em]">
                    Configure Package
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {currentResource.items
                      ?.filter((i: any) =>
                        ["main_option", "main"].includes(i.item_type),
                      )
                      .map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedMainId(item.id);
                            setSelectedTime("");
                          }}
                          className={cn(
                            "px-8 py-4 rounded-2xl border-2 font-[1000] uppercase italic text-xs transition-all",
                            selectedMainId === item.id
                              ? "bg-slate-950 dark:bg-white text-white dark:text-slate-950 border-transparent shadow-xl scale-105"
                              : "border-slate-100 dark:border-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white",
                          )}
                        >
                          {item.name} • Rp{item.price.toLocaleString()}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </Card>

            {/* 02. SCHEDULE PICKER */}
            <Card
              className={cn(
                "rounded-[2.5rem] border-none shadow-sm p-8 bg-white dark:bg-slate-900 ring-1 ring-slate-200/50 dark:ring-white/5 transition-all duration-500",
                !selectedMainId && "opacity-30 blur-[1px] pointer-events-none",
              )}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                    <Clock size={22} />
                  </div>
                  <h2 className="text-xl font-black uppercase italic tracking-tight dark:text-white">
                    02. Schedule Control
                  </h2>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-14 w-full md:w-[320px] rounded-2xl border-slate-200 dark:border-white/10 font-[1000] italic text-xs uppercase gap-4 justify-start px-6 shadow-sm bg-slate-50 dark:bg-slate-800/50 hover:bg-white"
                    >
                      <CalendarIcon className="w-5 h-5 text-blue-600" />
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-[9px] text-slate-400 font-black tracking-widest">
                          SELECTED DATE
                        </span>
                        <span className="mt-0.5">
                          {date
                            ? format(date, "EEEE, dd MMMM yyyy", {
                                locale: idLocale,
                              })
                            : "Select Date"}
                        </span>
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-80 p-0 border-none rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-500/10"
                    align="end"
                  >
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) => d < startOfToday()}
                      className="w-full"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* DURATION CONTROL - SESSIONS */}
                <div className="lg:col-span-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 flex flex-col items-center shadow-inner">
                    <Label className="text-[10px] font-black uppercase text-slate-400 italic mb-6 tracking-widest text-center">
                      Total Sessions
                    </Label>

                    <div className="flex items-center gap-6 mb-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={duration <= 1}
                        onClick={() => setDuration((d) => d - 1)}
                        className="h-12 w-12 rounded-full bg-white dark:bg-slate-700 shadow-md text-slate-400 hover:text-red-500 border border-slate-100 dark:border-white/5 transition-all active:scale-90"
                      >
                        <Minus size={20} strokeWidth={4} />
                      </Button>

                      <div className="flex flex-col items-center min-w-[60px]">
                        <span className="text-6xl font-[1000] italic text-blue-600 leading-none tabular-nums">
                          {duration}
                        </span>
                        <Badge
                          variant="outline"
                          className="mt-3 text-[9px] font-black italic border-blue-100 dark:border-blue-900 text-blue-400 uppercase"
                        >
                          Limit: {maxAvailableDuration}
                        </Badge>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={duration >= maxAvailableDuration}
                        onClick={() => setDuration((d) => d + 1)}
                        className="h-12 w-12 rounded-full bg-white dark:bg-slate-700 shadow-md text-slate-400 hover:text-blue-600 border border-slate-100 dark:border-white/5 transition-all active:scale-90"
                      >
                        <Plus size={20} strokeWidth={4} />
                      </Button>
                    </div>

                    <div className="w-full pt-4 border-t border-slate-200 dark:border-white/5">
                      <p className="text-[10px] text-center font-black text-slate-400 uppercase italic leading-relaxed">
                        Total usage:{" "}
                        <span className="text-blue-600 dark:text-blue-400">
                          {selectedItem?.unit_duration * duration} Mins
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* TIME SLOTS - FULL HEIGHT NO SCROLL */}
                <div className="lg:col-span-9">
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
                    {availableSlots.map((t) => {
                      const busy = isTimeBusy(t);
                      const passed = isTimePassed(t);
                      const sel = selectedTime === t;
                      return (
                        <button
                          key={t}
                          disabled={busy || passed}
                          onClick={() => setSelectedTime(t)}
                          className={cn(
                            "h-16 rounded-2xl text-xs font-black italic border-2 transition-all flex items-center justify-center relative pr-0.5",
                            sel
                              ? "bg-blue-600 border-blue-600 text-white shadow-xl scale-110 z-20"
                              : passed
                                ? "bg-slate-100 dark:bg-slate-900 border-transparent text-slate-300 dark:text-slate-800 opacity-40 grayscale cursor-not-allowed"
                                : busy
                                  ? "bg-red-50/50 dark:bg-red-950/20 text-red-300 dark:text-red-900 border-transparent cursor-not-allowed"
                                  : "bg-white dark:bg-slate-800 border-slate-50 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-blue-600 shadow-sm",
                          )}
                        >
                          {t}
                          {busy && (
                            <Lock
                              size={12}
                              className="absolute top-1.5 right-1.5 opacity-40"
                            />
                          )}
                          {passed && (
                            <History
                              size={12}
                              className="absolute top-1.5 right-1.5 opacity-40"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div
            className={cn(
              "xl:col-span-4 space-y-6 transition-all duration-700",
              !selectedTime && "opacity-30 blur-[2px] pointer-events-none",
            )}
          >
            <Card className="rounded-[2.5rem] border-none shadow-xl p-10 bg-white dark:bg-slate-900 ring-1 ring-slate-200/50 dark:ring-white/5 space-y-8">
              <div className="flex items-center justify-between border-b border-slate-50 dark:border-white/5 pb-5">
                <h3 className="text-sm font-black italic uppercase tracking-[0.2em] text-slate-900 dark:text-white leading-none">
                  Customer Profile
                </h3>
                <User size={18} className="text-blue-600" />
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                  <Input
                    placeholder="CLIENT FULL NAME"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value.toUpperCase())}
                    className="h-14 pl-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black italic text-xs shadow-inner focus-visible:ring-2 focus-visible:ring-blue-600/20"
                  />
                </div>
                <div className="relative group">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                  <Input
                    placeholder="WHATSAPP (08...)"
                    value={custPhone}
                    onChange={(e) =>
                      setCustPhone(e.target.value.replace(/\D/g, ""))
                    }
                    className="h-14 pl-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black italic text-xs shadow-inner focus-visible:ring-2 focus-visible:ring-blue-600/20"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <p className="text-[10px] font-black uppercase text-slate-400 italic ml-1 tracking-widest">
                  Selectable Add-ons
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {currentResource?.items
                    ?.filter((i: any) =>
                      ["add_on", "addon"].includes(i.item_type),
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
                            "px-5 py-3 rounded-xl border-2 font-black italic text-[10px] uppercase transition-all",
                            active
                              ? "bg-blue-600 border-blue-600 text-white shadow-md scale-105"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent hover:border-slate-200",
                          )}
                        >
                          {addon.name}
                        </button>
                      );
                    })}
                </div>
              </div>
            </Card>

            {/* CHECKOUT CARD */}
            <Card className="rounded-[3rem] border-none bg-slate-950 p-10 text-white space-y-8 relative overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]">
              <Calculator
                size={180}
                className="absolute -right-20 -top-20 opacity-[0.03] rotate-12"
              />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3 opacity-40">
                  <Ticket size={18} className="text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] italic">
                    Handshake Terminal
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-black italic text-blue-500 uppercase tracking-widest">
                    Grand Total Bill
                  </p>
                  <p className="text-7xl font-[1000] italic tracking-tighter text-white leading-none tabular-nums">
                    <span className="text-2xl text-blue-600 mr-2 font-bold not-italic">
                      Rp
                    </span>
                    {calculateTotal().toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/10 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">
                    START TIME
                  </span>
                  <span className="text-sm font-black italic text-blue-400 uppercase tracking-tighter">
                    {selectedTime || "--:--"}
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">
                    UNIT USAGE
                  </span>
                  <span className="text-sm font-black italic text-white uppercase tracking-tighter">
                    {duration}{" "}
                    {selectedItem?.price_unit === "hour" ? "Hours" : "Sessions"}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSubmitting || !selectedTime || !custName}
                className="w-full h-20 rounded-[2rem] bg-blue-600 hover:bg-blue-500 text-white font-[1000] uppercase italic tracking-widest text-base border-b-8 border-blue-800 shadow-2xl transition-all active:scale-95 gap-4"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    FINALIZE ENTRY <ChevronRight size={22} strokeWidth={4} />
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
