"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, isBefore, startOfToday, parse, addMinutes } from "date-fns";
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
  Zap,
  ArrowLeft,
  Calendar as CalendarIcon,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Receipt,
  Package,
  Image as ImageIcon,
  Check,
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

  // WhatsApp Validation
  const [isValidating, setIsValidating] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState<"idle" | "valid" | "invalid">(
    "idle",
  );

  // 1. Fetch Resource & Data Marketing
  useEffect(() => {
    const fetchData = async () => {
      try {
        const resDetail = await api.get(`/public/resources/${params.id}`);
        const data = resDetail.data;
        setResource(data);

        const def = data.items?.find(
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

  // 2. WhatsApp Live Check
  useEffect(() => {
    const validateWA = async (phone: string) => {
      if (phone.length < 10) {
        setPhoneStatus("idle");
        return;
      }
      setIsValidating(true);
      try {
        const res = await api.get(`/validate-phone?phone=${phone}`);
        setPhoneStatus(res.data.valid ? "valid" : "invalid");
      } catch (err) {
        setPhoneStatus("invalid");
      } finally {
        setIsValidating(false);
      }
    };
    const timer = setTimeout(() => {
      if (custPhone) validateWA(custPhone);
    }, 800);
    return () => clearTimeout(timer);
  }, [custPhone]);

  // 3. Fetch Availability
  useEffect(() => {
    if (date) {
      const fetchBusy = async () => {
        try {
          const formattedDate = format(date, "yyyy-MM-dd");
          const resBusy = await api.get(
            `/guest/availability/${params.id}?date=${formattedDate}`,
          );
          setBusySlots(resBusy.data.busy_slots || []);
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

  // 4. Logic Slot Waktu (Adaptif)
  const availableSlots = useMemo(() => {
    if (!selectedItem) return [];
    const unitMinutes = selectedItem.unit_duration || 60;
    if (selectedItem.price_unit === "day") return ["09:00"];

    const slots = [];
    let current = parse("09:00", "HH:mm", date || new Date());
    const end = parse("22:00", "HH:mm", date || new Date());

    while (isBefore(current, end)) {
      slots.push(format(current, "HH:mm"));
      current = addMinutes(current, unitMinutes);
    }
    return slots;
  }, [selectedItem, date]);

  const calculateTotal = () => {
    if (!selectedItem) return 0;
    const mainPrice = (selectedItem.price || 0) * durationValue;
    const addonsPrice = resource.items
      .filter((i: any) => selectedAddons.includes(i.id))
      .reduce((acc: number, curr: any) => acc + (curr.price || 0), 0);
    return mainPrice + addonsPrice;
  };

  const handleBooking = async () => {
    if (
      !custName ||
      !custPhone ||
      !date ||
      !selectedTime ||
      phoneStatus !== "valid"
    ) {
      toast.error("Mohon lengkapi data & validasi WA");
      return;
    }
    setIsSubmitting(true);
    try {
      const startTimeISO = `${format(date, "yyyy-MM-dd")}T${selectedTime}:00`;
      const payload = {
        tenant_id: resource.tenant_id,
        customer_name: custName.toUpperCase(),
        customer_phone: custPhone,
        resource_id: resource.id,
        item_ids: [selectedMainId, ...selectedAddons],
        start_time: startTimeISO,
        duration: durationValue,
      };
      const res = await api.post("/public/bookings", payload);
      toast.success("BOOKING BERHASIL!");
      router.push(res.data.redirect_url);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal membuat booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-plus-jakarta pb-40 selection:bg-blue-500/30 transition-colors duration-300">
      {/* --- HERO SECTION (VISUAL COVER) --- */}
      <div className="relative h-[45vh] md:h-[65vh] w-full overflow-hidden bg-slate-900">
        {resource?.image_url ? (
          <img
            src={resource.image_url}
            className="w-full h-full object-cover opacity-70 dark:opacity-50"
            alt="Cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <ImageIcon className="h-20 w-20 text-slate-700" />
          </div>
        )}

        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-transparent to-black/20" />

        <div className="absolute top-6 left-4 md:left-10 z-30">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="bg-white/10 dark:bg-black/20 backdrop-blur-xl text-white hover:bg-white/20 rounded-full font-black uppercase text-[10px] tracking-widest px-5 h-10 italic"
          >
            <ArrowLeft className="mr-2 h-4 w-4 stroke-[3]" /> Kembali
          </Button>
        </div>

        <div className="absolute bottom-12 left-4 md:left-10 right-4 z-20 space-y-3">
          <Badge className="bg-blue-600 text-white border-none rounded-md px-3 py-1 font-black text-[10px] tracking-widest uppercase italic shadow-xl">
            {resource?.category || "PREMIUM"}
          </Badge>
          <h1 className="text-4xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.85] text-slate-950 dark:text-white drop-shadow-sm">
            {resource?.name}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium italic text-sm md:text-xl max-w-2xl line-clamp-3">
            {resource?.description ||
              "Rasakan pengalaman terbaik di fasilitas eksklusif kami."}
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-6 -translate-y-6 relative z-30">
        <Card className="rounded-[2.5rem] md:rounded-[3.5rem] border-none shadow-2xl p-6 md:p-14 space-y-12 bg-white dark:bg-slate-900 transition-colors">
          {/* GALLERY SHOWCASE */}
          {resource?.gallery && resource.gallery.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-950 dark:text-white">
                  Intip Suasana
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {resource.gallery.map((img: string, i: number) => (
                  <div
                    key={i}
                    className="aspect-square rounded-2xl overflow-hidden border-2 border-slate-50 dark:border-slate-800 bg-slate-100 dark:bg-slate-800"
                  >
                    <img
                      src={img}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                      alt="Gallery"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* STEP 1: PILIH PAKET */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-slate-950 dark:bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl font-black italic">
                01
              </div>
              <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-slate-950 dark:text-white">
                Pilih Konfigurasi
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      "p-6 rounded-[2rem] border-4 text-left transition-all relative overflow-hidden group",
                      selectedMainId === item.id
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20"
                        : "border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-200",
                    )}
                  >
                    <div className="relative z-10 space-y-1">
                      <p
                        className={cn(
                          "text-lg font-black uppercase italic tracking-tighter leading-none",
                          selectedMainId === item.id
                            ? "text-blue-600"
                            : "text-slate-900 dark:text-slate-100",
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
                      <CheckCircle2 className="absolute right-6 top-1/2 -translate-y-1/2 h-8 w-8 text-blue-600 animate-in zoom-in duration-300" />
                    )}
                  </button>
                ))}
            </div>
          </section>

          {/* STEP 2: TANGGAL */}
          <section className="space-y-6 pt-10 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-slate-950 dark:text-white">
                Pilih Tanggal
              </h2>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-20 w-full justify-start rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 border-none font-black italic px-8 text-xl md:text-2xl uppercase tracking-tighter shadow-inner"
                >
                  <CalendarIcon className="mr-4 h-6 w-6 text-blue-600" />
                  {date
                    ? format(date, "EEEE, dd MMM yyyy", { locale: idLocale })
                    : "PILIH TANGGAL"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 border-none shadow-2xl rounded-[2rem] bg-white dark:bg-slate-900"
                align="center"
              >
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < startOfToday()}
                  className="p-4 uppercase italic font-black"
                />
              </PopoverContent>
            </Popover>
          </section>

          {/* STEP 3: JAM */}
          {date && selectedMainId && (
            <section className="space-y-6 pt-10 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Clock className="h-5 w-5" />
                </div>
                <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-slate-950 dark:text-white">
                  Jam Mulai
                </h2>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {availableSlots.map((time) => {
                  const now = new Date();
                  const slotTime = parse(time, "HH:mm", date);
                  const isPast = isBefore(slotTime, now);
                  const isBusy = busySlots.some((b) => time === b.start_time);
                  const isSelected = selectedTime === time;

                  return (
                    <button
                      key={time}
                      disabled={isPast || isBusy}
                      onClick={() => {
                        setSelectedTime(time);
                        setDurationValue(1);
                      }}
                      className={cn(
                        "h-14 md:h-16 rounded-2xl border-4 font-black transition-all text-xs md:text-sm uppercase italic relative",
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white shadow-xl scale-105"
                          : isPast
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 opacity-40 cursor-not-allowed"
                            : isBusy
                              ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900 text-red-400"
                              : "bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-800 text-slate-950 dark:text-slate-200 hover:border-blue-600",
                      )}
                    >
                      {time}
                      {isBusy && (
                        <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* STEP 4: DURASI & ADDONS */}
          {selectedTime && (
            <div className="space-y-12 animate-in slide-in-from-bottom-6 duration-500 pt-4">
              {selectedItem?.price_unit !== "day" && (
                <section className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-slate-950 dark:text-white">
                      Berapa Lama?
                    </h2>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        onClick={() => setDurationValue(val)}
                        className={cn(
                          "h-16 md:h-20 min-w-[80px] md:min-w-[100px] rounded-3xl border-4 font-black text-xl md:text-2xl transition-all italic shrink-0",
                          durationValue === val
                            ? "bg-blue-600 border-blue-600 text-white shadow-2xl scale-110"
                            : "bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-800 text-slate-300",
                        )}
                      >
                        {val}{" "}
                        <span className="text-[9px] block not-italic -mt-1 opacity-60 uppercase">
                          {selectedItem?.price_unit === "hour" ? "JAM" : "SESI"}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-6 pt-10 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Package className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tight text-slate-950 dark:text-white">
                    Extra Add-ons
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
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
                            "p-4 md:p-6 rounded-3xl border-4 transition-all flex flex-col items-center text-center gap-2 relative",
                            isSel
                              ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 shadow-xl"
                              : "border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-400",
                          )}
                        >
                          <span className="font-black uppercase text-[10px] italic leading-tight">
                            {item.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="font-black text-[9px] border-orange-200 dark:border-orange-900"
                          >
                            + RP {item.price.toLocaleString()}
                          </Badge>
                          {isSel && (
                            <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full p-1.5 shadow-lg">
                              <Check className="h-3 w-3 stroke-[5]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </section>

              {/* IDENTITAS PELANGGAN */}
              <section className="space-y-8 pt-12 border-t-8 border-slate-950/5 dark:border-white/5">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-950 dark:text-white leading-none">
                    Checkout <span className="text-blue-600">Details</span>
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                    Data untuk tiket konfirmasi booking
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
                      className="h-16 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 border-none font-black px-8 focus:ring-8 focus:ring-blue-600/5 text-xl uppercase italic shadow-inner dark:text-white"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 italic">
                      No. WhatsApp
                    </Label>
                    <div className="relative group">
                      <Input
                        placeholder="08..."
                        value={custPhone}
                        onChange={(e) =>
                          setCustPhone(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        className={cn(
                          "h-16 w-full rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 border-none font-black px-8 text-xl italic transition-all shadow-inner dark:text-white",
                          phoneStatus === "valid"
                            ? "ring-2 ring-emerald-500"
                            : phoneStatus === "invalid"
                              ? "ring-2 ring-red-500"
                              : "focus:ring-blue-600/5",
                        )}
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2">
                        {isValidating ? (
                          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        ) : phoneStatus === "valid" ? (
                          <ShieldCheck className="h-7 w-7 text-emerald-500 drop-shadow-sm" />
                        ) : phoneStatus === "invalid" ? (
                          <ShieldAlert className="h-7 w-7 text-red-500 drop-shadow-sm" />
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

      {/* STICKY FOOTER (TOTAL & BUTTON) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-t border-slate-100 dark:border-slate-800 z-50 animate-in slide-in-from-bottom-full duration-700">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 md:gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Receipt className="h-3 w-3 text-blue-600" />
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic leading-none">
                Total Estimasi
              </p>
            </div>
            <h3 className="text-2xl md:text-5xl font-black italic text-slate-950 dark:text-white tracking-tighter leading-none mt-1">
              Rp {calculateTotal().toLocaleString()}
            </h3>
          </div>

          <Button
            disabled={
              !selectedTime ||
              !selectedMainId ||
              isSubmitting ||
              !custName ||
              !custPhone ||
              phoneStatus !== "valid"
            }
            onClick={handleBooking}
            className="h-14 md:h-24 px-6 md:px-12 rounded-[1.5rem] md:rounded-[2.5rem] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase italic tracking-widest transition-all active:scale-95 border-b-4 md:border-b-8 border-blue-800 shadow-2xl group flex-1 md:flex-none"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <span className="flex items-center gap-2 text-xs md:text-xl">
                BOOK NOW{" "}
                <ChevronRight className="h-4 w-4 md:h-8 md:w-8 stroke-[4] group-hover:translate-x-2 transition-transform" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
