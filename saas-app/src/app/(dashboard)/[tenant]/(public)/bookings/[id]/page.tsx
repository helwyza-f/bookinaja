"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  format,
  isBefore,
  startOfToday,
  parse,
  addMinutes,
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
  Clock,
  ChevronRight,
  ArrowLeft,
  Calendar as CalendarIcon,
  Loader2,
  ShieldCheck,
  Package,
  Image as ImageIcon,
  Check,
  Plus,
  Info,
  Smartphone,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResourceBookingDetail() {
  const params = useParams();
  const router = useRouter();

  const [resource, setResource] = useState<any>(null);
  const [busySlots, setBusySlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [date, setDate] = useState<Date | undefined>(startOfToday());
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [durationValue, setDurationValue] = useState(1);
  const [selectedMainId, setSelectedMainId] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState<
    "idle" | "validating" | "valid" | "invalid"
  >("idle");

  // 1. Fetch Data Unit
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

  // 2. Fetch Availability & Normalisasi UTC ke Local Timezone
  useEffect(() => {
    if (date && params.id) {
      const fetchBusy = async () => {
        try {
          const formattedDate = format(date, "yyyy-MM-dd");
          const resBusy = await api.get(
            `/guest/availability/${params.id}?date=${formattedDate}`,
          );

          // Backend sudah kirim jam lokal (09:00), kita tinggal hitung menitnya saja
          const normalized = (resBusy.data.busy_slots || []).map(
            (slot: any) => {
              const [h, m] = slot.start_time.split(":").map(Number);
              const [eh, em] = slot.end_time.split(":").map(Number);

              return {
                start_min: h * 60 + m,
                end_min: eh * 60 + em,
              };
            },
          );
          setBusySlots(normalized);
          setSelectedTime("");
        } catch (err) {
          console.error("Gagal sinkron jadwal");
        }
      };
      fetchBusy();
    }
  }, [date, params.id]);

  // 3. Validasi WhatsApp (Debounce)
  useEffect(() => {
    if (custPhone.length < 9) {
      setPhoneStatus("idle");
      return;
    }
    const timer = setTimeout(async () => {
      setPhoneStatus("validating");
      try {
        const res = await api.get(`/public/validate-phone?phone=${custPhone}`);
        setPhoneStatus(res.data.valid ? "valid" : "invalid");
      } catch {
        setPhoneStatus("invalid");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [custPhone]);

  const selectedItem = useMemo(
    () => resource?.items?.find((i: any) => i.id === selectedMainId),
    [resource, selectedMainId],
  );

  // 4. Logika Smart Time Table (Dinamis per 15/30/60 mnt)
  const availableSlots = useMemo(() => {
    if (!selectedItem) return [];
    const step = selectedItem.unit_duration || 60; // Sesuai settingan database tenant
    if (selectedItem.price_unit === "day") return ["09:00"]; // Jika harian, slot cuma satu jam mulai

    const slots = [];
    let current = parse("08:00", "HH:mm", date || new Date());
    const end = parse("23:00", "HH:mm", date || new Date());

    while (isBefore(current, end)) {
      slots.push(format(current, "HH:mm"));
      current = addMinutes(current, step);
    }
    return slots;
  }, [selectedItem, date]);

  // 5. Logika isPast & isBusy
  const checkTimeStatus = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    const totalMin = h * 60 + m;

    // Cek apakah waktu sudah lewat (khusus hari ini)
    let isPast = false;
    if (date && isSameDay(date, new Date())) {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      if (totalMin <= currentMin) isPast = true;
    }

    // Cek apakah slot sudah dibooking orang lain
    const isBusy = busySlots.some(
      (s) => totalMin >= s.start_min && totalMin < s.end_min,
    );

    return { isPast, isBusy };
  };

  // 6. Logika Max Session (Mencegah bokingan menabrak bokingan orang lain di depan)
  const maxAvailableSessions = useMemo(() => {
    if (!selectedTime || !selectedItem) return 1;
    if (selectedItem.price_unit === "day") return 1;

    const [h, m] = selectedTime.split(":").map(Number);
    const startMin = h * 60 + m;
    const unitMin = selectedItem.unit_duration || 60;

    // Cari booking terdekat yang mulainya SETELAH selectedTime kita
    const nextBusy = busySlots
      .filter((s) => s.start_min > startMin)
      .sort((a, b) => a.start_min - b.start_min)[0];

    if (!nextBusy) return 12; // Jika kosong terus, batasi max 12 sesi/jam

    const availableMin = nextBusy.start_min - startMin;
    const max = Math.floor(availableMin / unitMin);
    return max > 0 ? max : 1;
  }, [selectedTime, busySlots, selectedItem]);

  useEffect(() => {
    if (durationValue > maxAvailableSessions) setDurationValue(1);
  }, [maxAvailableSessions]);

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
      return toast.error("Lengkapi data formulir");
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
      router.push(res.data.redirect_url);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <BookingSkeleton />;

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] font-plus-jakarta pb-96 transition-colors duration-500">
      {/* Header Visual */}
      <div className="relative h-[30vh] md:h-[45vh] w-full overflow-hidden bg-slate-900">
        {resource?.image_url ? (
          <img
            src={resource.image_url}
            className="w-full h-full object-cover opacity-60"
            alt="Unit"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <ImageIcon className="h-12 w-12 text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#050505] via-transparent to-transparent" />
        <div className="absolute top-6 left-6 z-40">
          <Button
            onClick={() => router.back()}
            size="sm"
            className="rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-md text-white border border-white/10 shadow-xl px-4 italic hover:bg-white/20"
          >
            <ArrowLeft size={14} className="mr-2" /> Kembali
          </Button>
        </div>
        <div className="absolute bottom-10 left-6 right-6 z-30">
          <Badge className="bg-blue-600 text-white mb-2 italic tracking-[0.2em] text-[10px]">
            {resource?.category}
          </Badge>
          <h1 className="text-4xl md:text-8xl font-[950] italic uppercase tracking-tighter text-slate-900 dark:text-white drop-shadow-sm leading-none">
            {resource?.name}
          </h1>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 -translate-y-4 relative z-40 space-y-6">
        <Card className="rounded-[3rem] border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] dark:shadow-none p-6 md:p-12 bg-white dark:bg-[#0a0a0a] ring-1 ring-black/5 dark:ring-white/5 space-y-16">
          {/* STEP 1: PAKET UTAMA */}
          <section className="space-y-8">
            <h2 className="text-2xl font-[950] uppercase italic flex items-center gap-4 dark:text-white px-2">
              <span className="bg-slate-900 dark:bg-blue-600 text-white h-10 w-10 rounded-2xl flex items-center justify-center text-sm shadow-xl">
                01
              </span>{" "}
              Pilih Konfigurasi
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {resource.items
                ?.filter((i: any) => i.item_type === "main_option")
                .map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedMainId(item.id);
                      setSelectedTime("");
                    }}
                    className={cn(
                      "p-6 rounded-[2rem] border-4 text-left transition-all active:scale-95 relative overflow-hidden",
                      selectedMainId === item.id
                        ? "border-blue-600 bg-white dark:bg-white/5 shadow-xl"
                        : "border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-transparent",
                    )}
                  >
                    <p
                      className={cn(
                        "text-xl font-black uppercase italic tracking-tighter",
                        selectedMainId === item.id
                          ? "text-blue-600"
                          : "text-slate-900 dark:text-slate-100",
                      )}
                    >
                      {item.name}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                      Rp {item.price.toLocaleString()} /{" "}
                      {item.price_unit === "hour" ? "jam" : "hari"}
                    </p>
                    {selectedMainId === item.id && (
                      <Check className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 h-10 w-10 text-blue-600" />
                    )}
                  </button>
                ))}
            </div>
          </section>

          {/* STEP 2: TANGGAL & JAM (SMART FILTER) */}
          <section className="space-y-8 pt-10 border-t border-slate-50 dark:border-white/5">
            <h2 className="text-2xl font-[950] uppercase italic flex items-center gap-4 dark:text-white px-2">
              <span className="bg-blue-600 text-white h-10 w-10 rounded-2xl flex items-center justify-center text-sm shadow-xl">
                02
              </span>{" "}
              Jadwal Main
            </h2>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-20 w-full justify-start rounded-2xl bg-slate-50 dark:bg-white/5 border-none font-black italic px-8 text-xl shadow-inner dark:text-white"
                >
                  <CalendarIcon className="mr-4 h-6 w-6 text-blue-600" />
                  {date
                    ? format(date, "EEEE, dd MMM yyyy", { locale: idLocale })
                    : "PILIH TANGGAL"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-none rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 shadow-2xl">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < startOfToday()}
                  className="p-4 uppercase font-bold"
                />
              </PopoverContent>
            </Popover>

            {date && selectedMainId && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 p-4 bg-slate-50/50 dark:bg-white/[0.02] rounded-[2.5rem] border border-slate-100 dark:border-white/5">
                {availableSlots.map((time) => {
                  const { isPast, isBusy } = checkTimeStatus(time);
                  const isSel = selectedTime === time;
                  return (
                    <button
                      key={time}
                      disabled={isPast || isBusy}
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        "h-14 rounded-2xl border-4 font-black transition-all text-[13px] uppercase italic relative",
                        isSel
                          ? "border-blue-600 bg-blue-600 text-white shadow-xl scale-105"
                          : isPast || isBusy
                            ? "opacity-10 cursor-not-allowed grayscale bg-slate-100 dark:bg-white/5 border-transparent"
                            : "bg-white dark:bg-[#111] border-white dark:border-white/5 text-slate-900 dark:text-white",
                      )}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* STEP 3: QUANTITY (MAX SESSION AWARE) & ADDONS */}
          {selectedTime && (
            <div className="space-y-16 pt-10 border-t border-slate-50 dark:border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* DURATION SELECTOR */}
              <div className="space-y-8 px-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-[950] uppercase italic flex items-center gap-4 dark:text-white">
                    <span className="bg-emerald-500 text-white h-10 w-10 rounded-2xl flex items-center justify-center text-sm shadow-xl">
                      03
                    </span>{" "}
                    Durasi Main
                  </h2>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black italic px-4 py-1.5 rounded-full">
                    MAX: {maxAvailableSessions}{" "}
                    {selectedItem.price_unit === "day" ? "HARI" : "JAM"}
                  </Badge>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x">
                  {Array.from(
                    { length: maxAvailableSessions },
                    (_, i) => i + 1,
                  ).map((val) => (
                    <button
                      key={val}
                      onClick={() => setDurationValue(val)}
                      className={cn(
                        "h-24 min-w-[110px] rounded-3xl border-4 font-black text-4xl transition-all italic snap-center flex flex-col items-center justify-center leading-none",
                        durationValue === val
                          ? "bg-blue-600 border-blue-600 text-white shadow-2xl scale-110"
                          : "bg-slate-50 dark:bg-white/5 border-transparent text-slate-300 dark:text-slate-800",
                      )}
                    >
                      {val}
                      <span className="text-[9px] mt-2 font-bold uppercase not-italic opacity-60">
                        {selectedItem.price_unit === "day" ? "HARI" : "JAM"}
                      </span>
                    </button>
                  ))}
                </div>
                {maxAvailableSessions === 1 && busySlots.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/5 rounded-2xl border border-amber-200 dark:border-amber-500/20 animate-pulse">
                    <Info className="text-amber-500 h-5 w-5 shrink-0" />
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight">
                      Durasi dibatasi karena ada bokingan customer lain di jam
                      berikutnya.
                    </p>
                  </div>
                )}
              </div>

              {/* ADDONS GRID */}
              <div className="space-y-8">
                <h2 className="text-xl font-black uppercase italic flex items-center gap-4 dark:text-white px-2">
                  <Package className="text-orange-500" /> Tambahan (Optional)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2">
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
                            "p-6 rounded-[2rem] border-4 transition-all flex items-center justify-between active:scale-95",
                            isSel
                              ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10 shadow-lg"
                              : "border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-transparent",
                          )}
                        >
                          <div className="text-left leading-tight">
                            <p className="font-black uppercase text-[12px] italic dark:text-white">
                              {item.name}
                            </p>
                            <p className="text-[10px] font-bold opacity-60 mt-1">
                              +Rp {item.price.toLocaleString()}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center",
                              isSel
                                ? "bg-orange-500 text-white"
                                : "bg-white dark:bg-white/10 border",
                            )}
                          >
                            {isSel ? (
                              <Check size={16} strokeWidth={4} />
                            ) : (
                              <Plus size={16} className="opacity-20" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* CUSTOMER DATA */}
              <div className="space-y-10 pt-12 border-t-8 border-slate-50 dark:border-white/5 px-2">
                <div className="space-y-1">
                  <h2 className="text-3xl font-[1000] italic uppercase tracking-tighter dark:text-white">
                    KONFIRMASI <span className="text-blue-600">TIKET</span>
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest italic">
                    Data ini digunakan untuk pengiriman tiket via WhatsApp
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                      Nama Sesuai KTP
                    </Label>
                    <Input
                      value={custName}
                      onChange={(e) =>
                        setCustName(e.target.value.toUpperCase())
                      }
                      className="h-16 rounded-2xl bg-slate-50 dark:bg-black border-none font-black px-8 text-xl shadow-inner dark:text-white"
                      placeholder="NAMA LENGKAP"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                      Nomor WhatsApp Aktif
                    </Label>
                    <div className="relative">
                      <Input
                        value={custPhone}
                        onChange={(e) =>
                          setCustPhone(e.target.value.replace(/\D/g, ""))
                        }
                        className={cn(
                          "h-16 rounded-2xl bg-slate-50 dark:bg-black border-none font-black px-8 text-xl shadow-inner dark:text-white",
                          phoneStatus === "valid"
                            ? "ring-2 ring-emerald-500"
                            : phoneStatus === "invalid"
                              ? "ring-2 ring-red-500"
                              : "",
                        )}
                        placeholder="08..."
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2">
                        {phoneStatus === "validating" ? (
                          <Loader2 className="animate-spin text-blue-500" />
                        ) : phoneStatus === "valid" ? (
                          <ShieldCheck className="text-emerald-500" />
                        ) : phoneStatus === "invalid" ? (
                          <AlertCircle className="text-red-500" />
                        ) : (
                          <Smartphone className="text-slate-300" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </main>

      {/* STICKY BILLING BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 bg-white/90 dark:bg-black/95 backdrop-blur-3xl border-t border-slate-100 dark:border-white/5 z-50 animate-in slide-in-from-bottom-full duration-700">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">
              Total Bill
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-blue-600 text-xl font-bold">Rp</span>
              <h3 className="text-3xl md:text-6xl font-[1000] italic text-slate-900 dark:text-white tracking-tighter leading-none">
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
            className="h-16 md:h-24 px-10 md:px-16 rounded-[2rem] bg-blue-600 hover:bg-blue-500 text-white font-[1000] uppercase italic text-sm md:text-xl shadow-2xl transition-all active:scale-95 flex items-center gap-4"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                BOOKING <ChevronRight strokeWidth={4} />
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
    <div className="min-h-screen bg-slate-50 dark:bg-black p-6 space-y-10">
      <Skeleton className="h-[30vh] w-full rounded-[3rem]" />
      <div className="max-w-4xl mx-auto space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-32 rounded-[2rem]" />
          <Skeleton className="h-32 rounded-[2rem]" />
        </div>
        <Skeleton className="h-20 w-full rounded-[2rem]" />
        <div className="grid grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
