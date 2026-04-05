"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  format,
  addMinutes,
  parse,
  isBefore,
  startOfToday,
  formatISO,
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
  Zap,
  ArrowLeft,
  Ticket,
  LayoutGrid,
  MapPin,
  Layers,
  CheckCircle2,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function NewManualBookingPage() {
  const router = useRouter();
  const params = useParams();

  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busySlots, setBusySlots] = useState<any[]>([]);

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

  // Normalisasi UTC ke Lokal
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
            };
          });
          setBusySlots(normalized);
        });
    }
  }, [selectedResourceId, date]);

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
    if (!selectedTime || !selectedItem) return 12;
    if (selectedItem.price_unit === "day") return 1;
    const startMinutes =
      parse(selectedTime, "HH:mm", new Date()).getHours() * 60 +
      parse(selectedTime, "HH:mm", new Date()).getMinutes();
    const nextBooking = busySlots
      .map(
        (s) =>
          s.start_time.split(":").map(Number)[0] * 60 +
          s.start_time.split(":").map(Number)[1],
      )
      .filter((s) => s > startMinutes)
      .sort((a, b) => a - b)[0];
    if (!nextBooking) return 12;
    return Math.floor(
      (nextBooking - startMinutes) / (selectedItem.unit_duration || 60),
    );
  }, [selectedTime, busySlots, selectedItem]);

  useEffect(() => {
    if (duration > maxAvailableDuration) setDuration(1);
  }, [selectedTime, maxAvailableDuration]);

  const availableSlots = useMemo(() => {
    if (!selectedItem) return [];
    const slots = [];
    let current = parse("09:00", "HH:mm", new Date());
    const end = parse("22:00", "HH:mm", new Date());
    while (isBefore(current, end)) {
      slots.push(format(current, "HH:mm"));
      current = addMinutes(current, selectedItem.unit_duration || 60);
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
      return toast.error("Lengkapi semua data wajib");
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
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-plus-jakarta pb-20">
      <div className="max-w-[1500px] mx-auto p-4 lg:p-10 space-y-10">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <Button
              variant="ghost"
              onClick={() => router.push("/admin/bookings")}
              className="h-8 px-0 text-slate-400 hover:text-slate-900 font-bold text-[10px] uppercase tracking-widest italic flex items-center gap-2"
            >
              <ArrowLeft className="w-3 h-3 stroke-[3]" /> Kembali ke Daftar
            </Button>
            <h1 className="text-3xl lg:text-5xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
              Reservasi <span className="text-blue-600">Baru</span>
            </h1>
          </div>
          <div className="hidden md:block bg-blue-600/10 px-4 py-2 rounded-xl">
            <p className="text-[10px] font-black text-blue-600 uppercase italic tracking-widest leading-none">
              Sinkronisasi Waktu Aktif
            </p>
          </div>
        </header>

        <div className="flex flex-col xl:flex-row gap-10 items-start">
          {/* KOLOM KIRI: KONFIGURASI (LEBIH LUAS) */}
          <div className="w-full xl:flex-1 space-y-8">
            {/* STEP 01: UNIT & PAKET */}
            <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/40 p-8 lg:p-12 bg-white space-y-10 overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                  <MapPin className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tight">
                  Step 01. <span className="text-slate-300">Pilih Unit</span>
                </h2>
              </div>

              <div className="space-y-8">
                <div className="max-w-md space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 italic ml-2 tracking-widest leading-none">
                    Pilih Unit/Ruangan
                  </Label>
                  <Select
                    value={selectedResourceId}
                    onValueChange={(v) => {
                      setSelectedResourceId(v);
                      setSelectedMainId("");
                      setSelectedTime("");
                    }}
                  >
                    <SelectTrigger className="h-20 rounded-[1.5rem] border-none bg-slate-50 font-black italic uppercase px-8 text-lg shadow-inner">
                      <SelectValue placeholder="PILIH RESOURCE" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl font-bold uppercase italic border-none shadow-2xl p-2">
                      {resources.map((r) => (
                        <SelectItem
                          key={r.id}
                          value={r.id}
                          className="rounded-xl h-12"
                        >
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {currentResource && (
                  <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                    <Label className="text-[10px] font-black uppercase text-slate-400 italic ml-2 tracking-widest leading-none">
                      Pilih Paket Harga
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              "h-24 px-8 rounded-[1.5rem] border-4 text-left transition-all flex justify-between items-center group",
                              selectedMainId === item.id
                                ? "border-blue-600 bg-white shadow-xl scale-[1.02]"
                                : "border-transparent bg-slate-50 hover:bg-slate-100",
                            )}
                          >
                            <div className="flex flex-col leading-tight">
                              <span
                                className={cn(
                                  "text-sm font-black uppercase italic",
                                  selectedMainId === item.id
                                    ? "text-blue-600"
                                    : "text-slate-500",
                                )}
                              >
                                {item.name}
                              </span>
                              <span className="text-[10px] font-bold text-slate-300 uppercase italic">
                                /{" "}
                                {item.price_unit === "day"
                                  ? "Harian"
                                  : `${item.unit_duration} Menit`}
                              </span>
                            </div>
                            <span className="text-xl font-black italic text-slate-900 tracking-tighter">
                              Rp{item.price.toLocaleString()}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* STEP 02: JADWAL */}
            <Card
              className={cn(
                "rounded-[2.5rem] border-none shadow-xl shadow-slate-200/40 p-8 lg:p-12 bg-white space-y-10 transition-all duration-700",
                !selectedMainId && "opacity-20 pointer-events-none",
              )}
            >
              <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                  <Clock className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tight">
                  Step 02. <span className="text-slate-300">Penjadwalan</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4 space-y-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 italic ml-2 tracking-widest leading-none">
                      Pilih Tanggal
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-20 rounded-[1.5rem] border-none bg-slate-50 font-black italic justify-start px-8 text-lg shadow-inner"
                        >
                          <CalendarIcon className="mr-4 h-6 w-6 text-blue-600" />
                          {date
                            ? format(date, "dd MMM yyyy", { locale: idLocale })
                            : "PILIH TANGGAL"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-3xl border-none shadow-2xl overflow-hidden">
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

                  <div className="space-y-3">
                    <div className="flex justify-between px-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 italic tracking-widest leading-none">
                        Durasi / Sesi
                      </Label>
                      <Badge className="bg-blue-50 text-blue-600 font-black italic text-[9px] uppercase border-none px-2 py-0.5 tracking-tight">
                        Maks: {maxAvailableDuration}
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
                        className="h-24 rounded-[1.5rem] border-none bg-slate-50 font-black italic text-5xl text-center text-blue-600 shadow-inner"
                      />
                      <Layers className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-100" />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 italic ml-2 tracking-widest leading-none">
                    Pilih Jam Mulai
                  </Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-6 bg-slate-50 rounded-[2rem] shadow-inner max-h-[400px] overflow-y-auto scrollbar-hide border border-slate-100">
                    {availableSlots.map((t) => {
                      const busy = isTimeBusy(t);
                      const selected = selectedTime === t;
                      return (
                        <button
                          key={t}
                          disabled={busy}
                          onClick={() => setSelectedTime(t)}
                          className={cn(
                            "h-16 rounded-2xl text-sm font-black italic border-2 transition-all flex flex-col items-center justify-center relative",
                            selected
                              ? "bg-blue-600 border-blue-600 text-white shadow-xl scale-105"
                              : busy
                                ? "bg-white border-transparent text-slate-200 cursor-not-allowed opacity-50"
                                : "bg-white border-white hover:border-blue-600 text-slate-600",
                          )}
                        >
                          <span>{t}</span>
                          {busy && (
                            <span className="text-[7px] absolute bottom-1 font-black uppercase tracking-tighter">
                              Penuh
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

          {/* KOLOM KANAN: ADMINISTRASI (MODERN SIDEBAR) */}
          <div
            className={cn(
              "w-full xl:w-[420px] space-y-6 sticky top-8 transition-all duration-700",
              !selectedTime && "opacity-20 blur-[1px]",
            )}
          >
            {/* DATA PELANGGAN */}
            <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/40 p-8 lg:p-10 bg-white space-y-8">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                  Data <span className="text-blue-600">Pelanggan</span>
                </h3>
                <User className="w-5 h-5 text-slate-200" />
              </div>
              <div className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                  <Input
                    placeholder="NAMA LENGKAP"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value.toUpperCase())}
                    className="h-16 pl-12 rounded-2xl bg-slate-50 border-none font-black italic focus:ring-4 focus:ring-blue-500/5 transition-all text-xs uppercase shadow-inner"
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
                    className="h-16 pl-12 rounded-2xl bg-slate-50 border-none font-black italic focus:ring-4 focus:ring-blue-500/5 transition-all text-xs shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-slate-400 italic ml-2 tracking-widest leading-none">
                  Status Awal
                </Label>
                <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl shadow-inner border border-slate-100">
                  {["pending", "confirmed", "active"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={cn(
                        "flex-1 h-12 rounded-xl text-[9px] font-black uppercase italic transition-all",
                        status === s
                          ? "bg-slate-900 text-white shadow-lg"
                          : "text-slate-400 hover:text-slate-600",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* TAMBAHAN & RINGKASAN */}
            <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/40 p-8 lg:p-10 bg-white space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                  <LayoutGrid className="w-4 h-4 text-blue-600" />
                  <h3 className="text-[10px] font-black italic uppercase tracking-widest text-slate-900">
                    Layanan Tambahan
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-2">
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
                            "px-5 py-4 rounded-2xl border-2 font-black uppercase italic transition-all text-[10px] flex justify-between items-center group",
                            active
                              ? "border-blue-600 bg-blue-50 text-blue-600 shadow-sm"
                              : "border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200",
                          )}
                        >
                          <span className="truncate mr-2">{addon.name}</span>
                          <span className="font-bold whitespace-nowrap opacity-60 text-[9px]">
                            Rp{addon.price.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* AREA BILLING AKHIR */}
              <div className="pt-4 border-t-2 border-slate-50 flex flex-col gap-5">
                <div className="bg-slate-950 p-8 rounded-[2.5rem] text-white space-y-6 relative overflow-hidden shadow-2xl">
                  <div className="relative z-10 space-y-1">
                    <div className="flex items-center gap-2 opacity-40">
                      <Ticket className="w-4 h-4 text-blue-400" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] italic leading-none">
                        Total Tagihan
                      </span>
                    </div>
                    <p className="text-5xl font-black italic tracking-tighter leading-none flex items-start py-2">
                      <span className="text-xl mr-1 mt-1 text-blue-500 font-bold leading-none">
                        Rp
                      </span>
                      {calculateTotal().toLocaleString()}
                    </p>
                  </div>
                  <div className="pt-5 border-t border-white/10 flex justify-between items-center relative z-10">
                    <div className="flex flex-col leading-none">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">
                        Jam Mulai
                      </span>
                      <span className="text-xs font-black italic text-blue-400">
                        {selectedTime || "--:--"}
                      </span>
                    </div>
                    <div className="flex flex-col text-right leading-none">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">
                        Total Durasi
                      </span>
                      <span className="text-xs font-black italic text-white uppercase">
                        {duration}{" "}
                        {selectedItem?.price_unit === "hour" ? "Jam" : "Sesi"}
                      </span>
                    </div>
                  </div>
                  <Calculator className="w-32 h-32 absolute -right-8 -top-8 opacity-[0.03] rotate-12" />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={
                    isSubmitting ||
                    !selectedTime ||
                    !custName ||
                    !selectedMainId
                  }
                  className="w-full h-20 rounded-[1.5rem] bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-[0_20px_50px_-12px_rgba(37,99,235,0.4)] active:scale-95 group border-b-8 border-blue-800"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin text-white" />
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="font-black uppercase italic tracking-[0.3em] text-base">
                        Proses Reservasi
                      </span>
                      <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform stroke-[4]" />
                    </div>
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
