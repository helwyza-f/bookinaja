"use client";
import { setCookie } from "cookies-next";
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
  Timer,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/context/tenant-context";

export default function ResourceBookingDetail() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useTenant();

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

  // 2. Fetch Busy Slots
  useEffect(() => {
    if (date && params.id) {
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
          setSelectedTime("");
        } catch (err) {
          console.error("Gagal sinkron jadwal");
        }
      };
      fetchBusy();
    }
  }, [date, params.id]);

  // 3. WhatsApp Validation
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

  // --- 4. LOGIKA TIME TABLE (OPERATIONAL AWARE) ---
  const availableSlots = useMemo(() => {
    if (!selectedItem || !profile) return [];

    const step =
      selectedItem.unit_duration > 0 ? selectedItem.unit_duration : 60;
    const openTime = profile.open_time || "08:00";
    const closeTime = profile.close_time || "22:00";

    const [closeH, closeM] = closeTime.split(":").map(Number);
    const closeTotalMin = closeH * 60 + closeM;

    const slots = [];
    let current = parse(openTime, "HH:mm", date || new Date());
    const endOperasi = parse(closeTime, "HH:mm", date || new Date());

    while (isBefore(current, endOperasi)) {
      const timeStr = format(current, "HH:mm");
      const [h, m] = timeStr.split(":").map(Number);
      const currentTotalMin = h * 60 + m;

      // Filter: Hanya tampilkan jam yang kalau diambil 1 sesi masih belum tutup
      if (currentTotalMin + step <= closeTotalMin) {
        slots.push(timeStr);
      }
      current = addMinutes(current, step);
    }
    return slots;
  }, [selectedItem, date, profile]);

  // --- 5. LOGIKA MAX SESSIONS (CRITICAL FIX) ---
  const maxAvailableSessions = useMemo(() => {
    if (!selectedTime || !selectedItem || !profile) return 1;
    if (selectedItem.price_unit === "day") return 7;

    const [h, m] = selectedTime.split(":").map(Number);
    const startMin = h * 60 + m;
    const unitMin = selectedItem.unit_duration || 60;

    // A. Batas Jam Tutup
    const [closeH, closeM] = (profile.close_time || "22:00")
      .split(":")
      .map(Number);
    const closeTotalMin = closeH * 60 + closeM;
    const minUntilClose = closeTotalMin - startMin;

    // B. Batas Bokingan Berikutnya
    const nextBusy = busySlots
      .filter((s) => s.start_min > startMin)
      .sort((a, b) => a.start_min - b.start_min)[0];

    let availableMin = minUntilClose;
    if (nextBusy) {
      availableMin = Math.min(minUntilClose, nextBusy.start_min - startMin);
    }

    const max = Math.floor(availableMin / unitMin);
    return max > 0 ? max : 1;
  }, [selectedTime, busySlots, selectedItem, profile]);

  useEffect(() => {
    if (durationValue > maxAvailableSessions) setDurationValue(1);
  }, [maxAvailableSessions]);

  const checkTimeStatus = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    const totalMin = h * 60 + m;
    let isPast = false;
    if (date && isSameDay(date, new Date())) {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      if (totalMin <= currentMin) isPast = true;
    }
    const isBusy = busySlots.some(
      (s) => totalMin >= s.start_min && totalMin < s.end_min,
    );
    return { isPast, isBusy };
  };

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
      if (res.data.customer_token) {
        setCookie("customer_auth", res.data.customer_token, {
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        });
        setCookie("current_tenant_id", resource.tenant_id, {
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        });
      }
      toast.success("Booking Berhasil!");
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
      <div className="relative h-[35vh] md:h-[45vh] w-full bg-slate-900">
        {resource?.image_url ? (
          <img
            src={resource.image_url}
            className="w-full h-full object-cover opacity-50"
            alt="Unit"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <ImageIcon className="h-12 w-12 text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#050505] via-transparent" />
        <div className="absolute top-6 left-4 md:left-6 z-40">
          <Button
            onClick={() => router.back()}
            size="sm"
            className="rounded-full bg-black/20 backdrop-blur-md text-white border border-white/10 px-4 hover:bg-black/40"
          >
            <ArrowLeft size={16} className="mr-2" /> Kembali
          </Button>
        </div>
        <div className="absolute bottom-10 left-4 md:left-10 right-4 z-30">
          <Badge className="bg-blue-600 text-white mb-2 italic tracking-widest text-[10px] uppercase">
            {resource?.category}
          </Badge>
          <h1 className="text-4xl md:text-8xl font-[950] italic uppercase tracking-tighter text-slate-950 dark:text-white leading-none break-words">
            {resource?.name}
          </h1>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 -translate-y-6 relative z-40 space-y-6">
        <Card className="rounded-[2.5rem] md:rounded-[3.5rem] border-none shadow-2xl p-6 md:p-12 bg-white dark:bg-[#0a0a0a] ring-1 ring-black/5 dark:ring-white/5 space-y-12">
          {/* STEP 1: PAKET */}
          <section className="space-y-6">
            <h2 className="text-xl md:text-2xl font-[950] uppercase italic flex items-center gap-3 dark:text-white px-1">
              <span className="bg-slate-950 dark:bg-blue-600 text-white h-8 w-8 md:h-10 md:w-10 rounded-xl flex items-center justify-center text-xs md:text-sm">
                01
              </span>
              Pilih Paket Sesi
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {resource.items
                ?.filter((i: any) => i.item_type === "main_option")
                .map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedMainId(item.id);
                      setSelectedTime("");
                      setDurationValue(1);
                    }}
                    className={cn(
                      "p-5 md:p-6 rounded-[1.8rem] md:rounded-[2rem] border-4 text-left transition-all active:scale-95 relative overflow-hidden",
                      selectedMainId === item.id
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-600/5 shadow-lg"
                        : "border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-transparent",
                    )}
                  >
                    <p
                      className={cn(
                        "text-lg md:text-xl font-black uppercase italic tracking-tighter",
                        selectedMainId === item.id
                          ? "text-blue-600"
                          : "text-slate-900 dark:text-slate-100",
                      )}
                    >
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 opacity-70">
                      <Timer size={14} />
                      <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-tight">
                        Rp {item.price.toLocaleString()} /{" "}
                        {item.unit_duration >= 60
                          ? `${item.unit_duration / 60} Jam`
                          : `${item.unit_duration} Mnt`}
                      </p>
                    </div>
                    {selectedMainId === item.id && (
                      <Check className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 h-10 w-10 text-blue-600" />
                    )}
                  </button>
                ))}
            </div>
          </section>

          {/* STEP 2: WAKTU */}
          <section className="space-y-6 pt-6 border-t border-slate-100 dark:border-white/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
              <h2 className="text-xl md:text-2xl font-[950] uppercase italic flex items-center gap-3 dark:text-white">
                <span className="bg-blue-600 text-white h-8 w-8 md:h-10 md:w-10 rounded-xl flex items-center justify-center text-xs md:text-sm">
                  02
                </span>
                Waktu Mulai
              </h2>
              <Badge
                variant="secondary"
                className="w-fit font-bold italic bg-slate-100 dark:bg-white/5 text-[10px] md:text-xs"
              >
                OPERASIONAL: {profile?.open_time} - {profile?.close_time}
              </Badge>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-16 md:h-20 w-full justify-start rounded-2xl bg-slate-50/50 dark:bg-white/5 border-none font-black italic px-6 md:px-8 text-lg md:text-xl shadow-inner"
                >
                  <CalendarIcon className="mr-3 md:mr-4 h-5 w-5 text-blue-600" />
                  {date
                    ? format(date, "EEEE, dd MMM yyyy", { locale: idLocale })
                    : "PILIH TANGGAL"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-none rounded-3xl bg-white dark:bg-slate-900 shadow-2xl">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < startOfToday()}
                  className="p-4"
                />
              </PopoverContent>
            </Popover>

            {date && selectedMainId && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3 p-3 md:p-4 bg-slate-50/30 dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/5">
                {availableSlots.length > 0 ? (
                  availableSlots.map((time) => {
                    const { isPast, isBusy } = checkTimeStatus(time);
                    const isSel = selectedTime === time;
                    return (
                      <button
                        key={time}
                        disabled={isPast || isBusy}
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          "h-12 md:h-14 rounded-xl md:rounded-2xl border-2 md:border-4 font-black transition-all text-xs md:text-[13px] uppercase italic relative",
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
                  })
                ) : (
                  <div className="col-span-full py-12 text-center space-y-3">
                    <AlertCircle className="mx-auto text-slate-300" size={32} />
                    <p className="text-[10px] font-black uppercase text-slate-400 italic px-6">
                      Maaf, paket ini tidak tersedia untuk sisa waktu
                      operasional hari ini.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* STEP 3: DURATION & ADDONS */}
          {selectedTime && (
            <div className="space-y-12 pt-6 border-t border-slate-100 dark:border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xl md:text-2xl font-[950] uppercase italic flex items-center gap-3 dark:text-white">
                    <span className="bg-emerald-500 text-white h-8 w-8 md:h-10 md:w-10 rounded-xl flex items-center justify-center text-xs md:text-sm">
                      03
                    </span>
                    Jumlah Sesi
                  </h2>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black italic rounded-full text-[10px] md:text-xs">
                    {maxAvailableSessions} Slot Tersedia
                  </Badge>
                </div>

                <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 no-scrollbar snap-x px-1">
                  {Array.from(
                    { length: maxAvailableSessions },
                    (_, i) => i + 1,
                  ).map((val) => (
                    <button
                      key={val}
                      onClick={() => setDurationValue(val)}
                      className={cn(
                        "h-20 md:h-24 min-w-[80px] md:min-w-[110px] rounded-2xl md:rounded-3xl border-4 font-black text-3xl md:text-4xl transition-all italic snap-center flex flex-col items-center justify-center leading-none",
                        durationValue === val
                          ? "bg-blue-600 border-blue-600 text-white shadow-2xl scale-110"
                          : "bg-slate-50 dark:bg-white/5 border-transparent text-slate-300 dark:text-slate-800",
                      )}
                    >
                      {val}
                      <span className="text-[8px] md:text-[9px] mt-1 md:mt-2 font-bold uppercase not-italic opacity-60">
                        {selectedItem.price_unit === "day" ? "HARI" : "SESI"}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                  <Info className="text-blue-500 h-5 w-5 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                    Total durasi:{" "}
                    {selectedItem.unit_duration * durationValue >= 60
                      ? `${(selectedItem.unit_duration * durationValue) / 60} Jam`
                      : `${selectedItem.unit_duration * durationValue} Menit`}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-lg md:text-xl font-black uppercase italic flex items-center gap-3 dark:text-white px-1">
                  <Package className="text-orange-500 h-5 w-5" /> Tambahan
                  (Optional)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
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
                            "p-5 rounded-2xl md:rounded-[2rem] border-2 md:border-4 transition-all flex items-center justify-between active:scale-95",
                            isSel
                              ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10 shadow-md"
                              : "border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-transparent",
                          )}
                        >
                          <div className="text-left leading-tight">
                            <p className="font-black uppercase text-[11px] md:text-[12px] italic dark:text-white">
                              {item.name}
                            </p>
                            <p className="text-[10px] font-bold opacity-60 mt-0.5">
                              +Rp {item.price.toLocaleString()}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "h-7 w-7 rounded-full flex items-center justify-center transition-colors",
                              isSel
                                ? "bg-orange-500 text-white"
                                : "bg-white dark:bg-white/10 border",
                            )}
                          >
                            {isSel ? (
                              <Check size={14} strokeWidth={4} />
                            ) : (
                              <Plus size={14} className="opacity-20" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* DATA CUSTOMER */}
              <div className="space-y-8 pt-10 border-t-8 border-slate-50 dark:border-white/5 px-1">
                <div className="space-y-1">
                  <h2 className="text-2xl md:text-3xl font-[1000] italic uppercase tracking-tighter dark:text-white">
                    KONFIRMASI <span className="text-blue-600">TIKET</span>
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest italic">
                    Tiket akan dikirim via WhatsApp
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      Nama Sesuai KTP
                    </Label>
                    <Input
                      value={custName}
                      onChange={(e) =>
                        setCustName(e.target.value.toUpperCase())
                      }
                      className="h-14 md:h-16 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-black border-none font-black px-6 md:px-8 text-lg md:text-xl shadow-inner"
                      placeholder="NAMA LENGKAP"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      WhatsApp Aktif
                    </Label>
                    <div className="relative">
                      <Input
                        value={custPhone}
                        onChange={(e) =>
                          setCustPhone(e.target.value.replace(/\D/g, ""))
                        }
                        className={cn(
                          "h-14 md:h-16 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-black border-none font-black px-6 md:px-8 text-lg md:text-xl shadow-inner",
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

      {/* STICKY BILLING */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white/80 dark:bg-black/90 backdrop-blur-2xl border-t border-slate-100 dark:border-white/5 z-50 animate-in slide-in-from-bottom-full duration-700">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-0.5 md:mb-1">
              Estimasi Biaya
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-blue-600 text-base md:text-xl font-bold">
                Rp
              </span>
              <h3 className="text-2xl md:text-5xl font-[1000] italic text-slate-950 dark:text-white tracking-tighter leading-none">
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
            className="h-14 md:h-20 px-8 md:px-12 rounded-2xl md:rounded-[2rem] bg-blue-600 hover:bg-blue-500 text-white font-[1000] uppercase italic text-xs md:text-lg shadow-2xl transition-all active:scale-95 flex items-center gap-2 md:gap-3"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                BOOKING <ChevronRight strokeWidth={4} size={20} />
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
    <div className="min-h-screen bg-slate-50 dark:bg-black p-4 space-y-8">
      <Skeleton className="h-[30vh] w-full rounded-3xl md:rounded-[3rem]" />
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </div>
  );
}
