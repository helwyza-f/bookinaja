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
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Calendar as CalendarIcon,
  Loader2,
  ShieldCheck,
  Sparkles,
  Receipt,
  Package,
  Image as ImageIcon,
  Check,
  Plus,
  Info,
  Ticket,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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
  const [phoneStatus, setPhoneStatus] = useState<"idle" | "valid" | "invalid">(
    "idle",
  );
  const [isValidating, setIsValidating] = useState(false);

  // 1. Fetch Data Unit
  useEffect(() => {
    const fetchData = async () => {
      try {
        const resDetail = await api.get(`/public/resources/${params.id}`);
        setResource(resDetail.data);
        const def = resDetail.data.items?.find(
          (i: any) => i.is_default && i.item_type === "console_option",
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

  // 2. Fetch Availability & Normalisasi UTC
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
              const start = new Date(`${formattedDate}T${slot.start_time}:00Z`);
              const end = new Date(`${formattedDate}T${slot.end_time}:00Z`);
              return {
                start_min: start.getUTCHours() * 60 + start.getUTCMinutes(),
                end_min: end.getUTCHours() * 60 + end.getUTCMinutes(),
                display_start: format(start, "HH:mm"),
                display_end: format(end, "HH:mm"),
              };
            },
          );
          setBusySlots(normalized);
          setSelectedTime("");
        } catch (err) {
          toast.error("Gagal cek jadwal");
        }
      };
      fetchBusy();
    }
  }, [date, params.id]);

  const selectedItem = useMemo(
    () => resource?.items?.find((i: any) => i.id === selectedMainId),
    [resource, selectedMainId],
  );

  // LOGIKA BUSY SLOT (Support per 15/30/60 menit)
  const isTimeBusy = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    const currentTotalMin = h * 60 + m;

    return busySlots.some((slot) => {
      // Slot dianggap busy jika jam mulai kita berada DI DALAM rentang booking orang lain
      return (
        currentTotalMin >= slot.start_min && currentTotalMin < slot.end_min
      );
    });
  };

  // LOGIKA DYNAMIC MAX SESSION
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

    if (!nextBusy) return 5; // Default max 10 sesi jika kosong sampai tutup

    const availableMin = nextBusy.start_min - startMin;
    return Math.floor(availableMin / unitMin);
  }, [selectedTime, busySlots, selectedItem]);

  // Reset durasi jika ganti jam dan durasi lama melebihi batas baru
  useEffect(() => {
    if (durationValue > maxAvailableSessions) setDurationValue(1);
  }, [maxAvailableSessions]);

  const availableSlots = useMemo(() => {
    if (!selectedItem) return [];
    const step = selectedItem.unit_duration || 60;
    if (selectedItem.price_unit === "day") return ["09:00"];

    const slots = [];
    let current = parse("09:00", "HH:mm", date || new Date());
    const end = parse("22:00", "HH:mm", date || new Date());

    while (isBefore(current, end)) {
      slots.push(format(current, "HH:mm"));
      current = addMinutes(current, step);
    }
    return slots;
  }, [selectedItem, date]);

  const calculateTotal = () => {
    if (!selectedItem) return 0;
    const mainPrice = (selectedItem.price || 0) * durationValue;
    const addonsPrice = resource.items
      ?.filter((i: any) => selectedAddons.includes(i.id))
      .reduce((acc: number, curr: any) => acc + (curr.price || 0), 0);
    return mainPrice + addonsPrice;
  };

  const handleBooking = async () => {
    if (!custName || !custPhone || !selectedTime)
      return toast.error("Data belum lengkap");
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

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-plus-jakarta pb-40 selection:bg-blue-500/30 transition-all">
      {/* HERO / COVER */}
      <div className="relative h-[35vh] md:h-[45vh] w-full overflow-hidden bg-slate-900">
        {resource?.image_url ? (
          <img
            src={resource.image_url}
            className="w-full h-full object-cover opacity-50"
            alt="Cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-700">
            <ImageIcon className="h-20 w-20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC] via-transparent to-black/20" />
        <div className="absolute top-6 left-6 z-30">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="bg-white/10 backdrop-blur-md text-white hover:bg-white/20 rounded-full font-black uppercase text-[10px] tracking-widest px-6 h-10 italic shadow-xl"
          >
            <ArrowLeft className="mr-2 h-4 w-4 stroke-[3]" /> Kembali
          </Button>
        </div>
        <div className="absolute bottom-10 left-6 right-6 z-20 space-y-2">
          <Badge className="bg-blue-600 text-white border-none rounded-md px-3 py-1 font-black text-[10px] tracking-widest uppercase italic shadow-xl">
            {resource?.category || "PREMIUM"}
          </Badge>
          <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-950 leading-none">
            {resource?.name}
          </h1>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 -translate-y-4 relative z-30 space-y-6">
        <Card className="rounded-[2.5rem] border-none shadow-2xl p-6 md:p-10 bg-white space-y-12">
          {/* STEP 1: PAKET */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-xl font-black italic">
                01
              </div>
              <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-slate-900">
                Pilih Konfigurasi
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {resource.items
                ?.filter((i: any) => i.item_type === "console_option")
                .map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedMainId(item.id);
                      setSelectedTime("");
                    }}
                    className={cn(
                      "p-6 rounded-[1.8rem] border-4 text-left transition-all relative overflow-hidden group",
                      selectedMainId === item.id
                        ? "border-blue-600 bg-blue-50/30"
                        : "border-slate-50 bg-slate-50/50 hover:border-slate-200",
                    )}
                  >
                    <div className="relative z-10 space-y-1">
                      <p
                        className={cn(
                          "text-lg font-black uppercase italic tracking-tighter leading-none",
                          selectedMainId === item.id
                            ? "text-blue-600"
                            : "text-slate-900",
                        )}
                      >
                        {item.name}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Rp {item.price.toLocaleString()} /{" "}
                        {item.price_unit === "hour"
                          ? "JAM"
                          : item.price_unit === "day"
                            ? "HARI"
                            : `${item.unit_duration} MNT`}
                      </p>
                    </div>
                    {selectedMainId === item.id && (
                      <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 text-blue-600 animate-in zoom-in duration-300 opacity-20" />
                    )}
                  </button>
                ))}
            </div>
          </section>

          {/* STEP 2: TANGGAL */}
          <section className="space-y-6 pt-10 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-slate-900">
                Pilih Tanggal
              </h2>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-20 w-full justify-start rounded-[1.5rem] bg-slate-50 border-none font-black italic px-8 text-xl md:text-2xl uppercase tracking-tighter shadow-inner"
                >
                  <CalendarIcon className="mr-4 h-6 w-6 text-blue-600" />
                  {date
                    ? format(date, "EEEE, dd MMM yyyy", { locale: idLocale })
                    : "PILIH TANGGAL"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 border-none shadow-2xl rounded-[2rem] bg-white overflow-hidden"
                align="center"
              >
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < startOfToday()}
                  className="p-4 font-bold uppercase italic"
                />
              </PopoverContent>
            </Popover>
          </section>

          {/* STEP 3: JAM (INTELLIGENT FILTER) */}
          {date && selectedMainId && (
            <section className="space-y-6 pt-10 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                    <Clock className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-slate-900">
                    Jam Mulai
                  </h2>
                </div>
                {busySlots.length > 0 && (
                  <Badge
                    variant="outline"
                    className="font-black italic text-[9px] border-red-200 text-red-500 uppercase"
                  >
                    {busySlots.length} Jadwal Terisi
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 p-4 bg-slate-50/50 rounded-[2rem] shadow-inner border border-slate-100">
                {availableSlots.map((time) => {
                  const now = new Date();
                  const slotTime = parse(time, "HH:mm", date);
                  const isPast = isBefore(slotTime, now);
                  const isBusy = isTimeBusy(time);
                  const isSelected = selectedTime === time;

                  return (
                    <button
                      key={time}
                      disabled={isPast || isBusy}
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        "h-14 rounded-xl border-4 font-black transition-all text-[13px] uppercase italic relative flex items-center justify-center",
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white shadow-xl scale-105 z-10"
                          : isPast
                            ? "bg-slate-100 border-transparent text-slate-200 opacity-40 cursor-not-allowed"
                            : isBusy
                              ? "bg-white border-transparent text-slate-200 cursor-not-allowed opacity-30"
                              : "bg-white border-white text-slate-900 hover:border-blue-600 shadow-sm",
                      )}
                    >
                      {time}
                      {isBusy && (
                        <span className="absolute bottom-1 text-[7px] opacity-60 uppercase font-black tracking-tighter">
                          Full
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* STEP 4: DURASI (DYNAMIC MAX) & ADDONS */}
          {selectedTime && (
            <div className="space-y-12 pt-4">
              {selectedItem?.price_unit !== "day" && (
                <section className="space-y-6 animate-in slide-in-from-left-4 duration-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-100">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-slate-900">
                        Berapa Lama?
                      </h2>
                    </div>
                    <Badge className="bg-blue-50 text-blue-600 border-none font-black italic text-[10px] px-3">
                      MAKS: {maxAvailableSessions} SESI
                    </Badge>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {Array.from(
                      { length: maxAvailableSessions },
                      (_, i) => i + 1,
                    ).map((val) => (
                      <button
                        key={val}
                        onClick={() => setDurationValue(val)}
                        className={cn(
                          "h-20 min-w-[90px] rounded-[1.5rem] border-4 font-black text-2xl transition-all italic shrink-0 flex flex-col items-center justify-center leading-none",
                          durationValue === val
                            ? "bg-blue-600 border-blue-600 text-white shadow-2xl scale-110"
                            : "bg-white border-slate-50 text-slate-300",
                        )}
                      >
                        {val}
                        <span className="text-[8px] font-bold mt-1 uppercase not-italic opacity-60">
                          {selectedItem?.price_unit === "hour" ? "JAM" : "Sesi"}
                        </span>
                      </button>
                    ))}
                  </div>
                  {maxAvailableSessions === 1 && busySlots.length > 0 && (
                    <div className="flex items-center gap-2 text-amber-500 bg-amber-50 p-4 rounded-xl border border-amber-100">
                      <Info className="w-4 h-4" />
                      <p className="text-[10px] font-bold uppercase italic leading-tight">
                        Durasi dibatasi karena ada jadwal booking lain yang akan
                        segera mulai.
                      </p>
                    </div>
                  )}
                </section>
              )}

              <section className="space-y-6 pt-10 border-t border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
                    <Package className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-slate-900">
                    Layanan Tambahan
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            "p-5 rounded-2xl border-4 transition-all flex items-center justify-between text-left relative",
                            isSel
                              ? "border-orange-500 bg-orange-50 text-orange-700 shadow-lg"
                              : "border-slate-50 bg-slate-50/50 text-slate-400",
                          )}
                        >
                          <div className="space-y-0.5">
                            <span className="font-black uppercase text-[11px] italic leading-tight block">
                              {item.name}
                            </span>
                            <span className="font-bold text-[10px] block opacity-60">
                              + RP {item.price.toLocaleString()}
                            </span>
                          </div>
                          <div
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                              isSel
                                ? "bg-orange-500 text-white"
                                : "bg-white border border-slate-100",
                            )}
                          >
                            {isSel ? (
                              <Check className="h-3 w-3 stroke-[5]" />
                            ) : (
                              <Plus className="h-3 w-3 opacity-20" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </section>

              {/* IDENTITAS PELANGGAN */}
              <section className="space-y-8 pt-12 border-t-8 border-slate-50">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
                    Konfirmasi <span className="text-blue-600">Tiket</span>
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                    Data tiket akan dikirim via WhatsApp
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 italic">
                      Nama Lengkap
                    </Label>
                    <Input
                      placeholder="NAMA ANDA"
                      value={custName}
                      onChange={(e) =>
                        setCustName(e.target.value.toUpperCase())
                      }
                      className="h-16 rounded-[1.5rem] bg-slate-50 border-none font-black px-8 focus:ring-8 focus:ring-blue-500/5 text-xl uppercase italic shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 italic">
                      No. WhatsApp Aktif
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="08..."
                        value={custPhone}
                        onChange={(e) =>
                          setCustPhone(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        className={cn(
                          "h-16 w-full rounded-[1.5rem] bg-slate-50 border-none font-black px-8 text-xl italic transition-all shadow-inner",
                          phoneStatus === "valid"
                            ? "ring-2 ring-emerald-500"
                            : phoneStatus === "invalid"
                              ? "ring-2 ring-red-500"
                              : "",
                        )}
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2">
                        {phoneStatus === "valid" ? (
                          <ShieldCheck className="h-7 w-7 text-emerald-500" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </Card>
      </main>

      {/* STICKY FOOTER (MASIF) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 bg-white/95 backdrop-blur-2xl border-t border-slate-100 z-50 animate-in slide-in-from-bottom-full duration-700">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col leading-none text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <Ticket className="w-4 h-4 text-blue-600" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                Estimasi Penagihan
              </p>
            </div>
            <h3 className="text-3xl md:text-6xl font-black italic text-slate-900 tracking-tighter leading-none">
              <span className="text-blue-600 text-xl md:text-3xl mr-2 font-bold leading-none">
                Rp
              </span>
              {calculateTotal().toLocaleString()}
            </h3>
          </div>

          <Button
            disabled={!selectedTime || isSubmitting || !custName || !custPhone}
            onClick={handleBooking}
            className="h-16 md:h-24 px-10 md:px-16 rounded-[2rem] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase italic tracking-widest transition-all active:scale-95 border-b-8 border-blue-800 shadow-[0_20px_50px_-10px_rgba(37,99,235,0.5)] flex items-center gap-4 group"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <span className="text-sm md:text-xl">RESERVASI SEKARANG</span>
                <ChevronRight className="h-6 w-6 md:h-8 md:w-8 stroke-[4] group-hover:translate-x-2 transition-transform" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
