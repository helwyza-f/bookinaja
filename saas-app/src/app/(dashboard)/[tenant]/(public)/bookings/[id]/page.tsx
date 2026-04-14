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
  const [isReturning, setIsReturning] = useState(false);

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
          toast.success(`Welcome back, ${resExist.data.name}!`);
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

  const selectedItem = useMemo(
    () => resource?.items?.find((i: any) => i.id === selectedMainId),
    [resource, selectedMainId],
  );

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
      if (currentTotalMin + step <= closeTotalMin) {
        slots.push(timeStr);
      }
      current = addMinutes(current, step);
    }
    return slots;
  }, [selectedItem, date, profile]);

  const maxAvailableSessions = useMemo(() => {
    if (!selectedTime || !selectedItem || !profile) return 1;
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
    return max > 0 ? (max > 12 ? 12 : max) : 1;
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
    <div className="min-h-screen bg-white dark:bg-[#050505] font-plus-jakarta pb-32 transition-colors duration-500 overflow-x-hidden">
      {/* Header Visual - Compact */}
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
            className="h-8 rounded-full bg-black/30 backdrop-blur-md text-white border border-white/10 px-3 hover:bg-black/50 text-[10px] font-bold"
          >
            <ArrowLeft size={14} className="mr-1.5" /> Back
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
          {/* STEP 1: PAKET - COMPACT */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <span className="bg-slate-950 dark:bg-blue-600 text-white h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black italic">
                01
              </span>
              <h2 className="text-sm font-[950] uppercase italic dark:text-white">
                Pilih Paket
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
                      setSelectedTime("");
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
                        "text-base font-black uppercase italic tracking-tighter",
                        selectedMainId === item.id
                          ? "text-blue-600"
                          : "text-slate-900 dark:text-slate-100",
                      )}
                    >
                      {item.name}
                    </p>
                    <p className="text-[9px] font-bold uppercase opacity-60 mt-0.5">
                      Rp {item.price.toLocaleString()} /{" "}
                      {item.unit_duration >= 60
                        ? `${item.unit_duration / 60} Jam`
                        : `${item.unit_duration} Mnt`}
                    </p>
                    {selectedMainId === item.id && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 opacity-10 h-8 w-8 text-blue-600" />
                    )}
                  </button>
                ))}
            </div>
          </section>

          {/* STEP 2: WAKTU - IMPROVED CALENDAR */}
          <section className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="bg-blue-600 text-white h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black italic">
                  02
                </span>
                <h2 className="text-sm font-[950] uppercase italic dark:text-white">
                  Mulai Boking
                </h2>
              </div>
              <Badge
                variant="outline"
                className="text-[7px] font-black uppercase border-slate-200 opacity-60"
              >
                {profile?.open_time} - {profile?.close_time}
              </Badge>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-14 w-full justify-start rounded-xl bg-slate-50/50 dark:bg-white/5 border-none font-black italic px-5 text-sm shadow-inner"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                  {date
                    ? format(date, "EEEE, dd MMM yyyy", { locale: idLocale })
                    : "PILIH TANGGAL"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[340px] p-0 border-none rounded-[2rem] overflow-hidden shadow-2xl bg-white dark:bg-slate-900"
                align="center"
              >
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < startOfToday()}
                  className="p-4 w-full"
                />
              </PopoverContent>
            </Popover>

            {date && selectedMainId && (
              <div className="grid grid-cols-4 gap-1.5 p-2.5 bg-slate-50/30 dark:bg-white/[0.02] rounded-[1.5rem] border border-slate-100 dark:border-white/5">
                {availableSlots.map((time) => {
                  const { isPast, isBusy } = checkTimeStatus(time);
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
                              ? "border-red-500/10 bg-red-50/30 text-red-500/30 cursor-not-allowed"
                              : "bg-white dark:bg-[#111] border-slate-100 dark:border-white/5 text-slate-900 dark:text-white",
                      )}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* STEP 3: DURATION - COMPACT SESI */}
          {selectedTime && (
            <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-white/5 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500 text-white h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black italic">
                      03
                    </span>
                    <h2 className="text-sm font-[950] uppercase italic dark:text-white">
                      Jumlah Sesi
                    </h2>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black italic rounded-full text-[8px]">
                    {maxAvailableSessions} Slot Available
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
                      <span className="text-[7px] mt-1 font-bold not-italic opacity-60">
                        SESS
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 p-3 bg-blue-50/50 dark:bg-blue-500/5 rounded-xl border border-blue-100 dark:border-blue-500/20">
                  <Info className="text-blue-500 h-4 w-4" />
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase italic">
                    Duration:{" "}
                    {selectedItem.unit_duration * durationValue >= 60
                      ? `${(selectedItem.unit_duration * durationValue) / 60}h`
                      : `${selectedItem.unit_duration * durationValue}m`}
                    <span className="ml-1.5 opacity-60">
                      ({selectedTime} -{" "}
                      {format(
                        addMinutes(
                          parse(selectedTime, "HH:mm", new Date()),
                          selectedItem.unit_duration * durationValue,
                        ),
                        "HH:mm",
                      )}
                      )
                    </span>
                  </p>
                </div>
              </div>

              {/* ADDONS - SLIMMER */}
              <div className="space-y-4">
                <h2 className="text-[11px] font-black uppercase italic flex items-center gap-2 dark:text-white px-1">
                  <Plus className="text-orange-500 h-3.5 w-3.5" /> Additional
                  (Optional)
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
                            <p className="font-black uppercase text-[10px] italic dark:text-white">
                              {item.name}
                            </p>
                            <p className="text-[8px] font-bold opacity-60 mt-1">
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

              {/* CUSTOMER FORM - COMPACT */}
              <div className="space-y-6 pt-8 border-t-4 border-slate-50 dark:border-white/5">
                <div className="space-y-1">
                  <h2 className="text-xl font-[1000] italic uppercase tracking-tighter dark:text-white leading-none">
                    Ticket <span className="text-blue-600">Confirmation</span>
                  </h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60">
                    Ticket sent to your WhatsApp
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                      WhatsApp Number
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
                        Full Name (KTP)
                      </Label>
                      {isReturning && (
                        <span className="text-[7px] font-black text-emerald-500 uppercase italic">
                          Registered Account
                        </span>
                      )}
                    </div>
                    <Input
                      value={custName}
                      onChange={(e) =>
                        setCustName(e.target.value.toUpperCase())
                      }
                      className="h-14 rounded-xl bg-slate-50 dark:bg-black border-none font-black px-6 text-lg shadow-inner"
                      placeholder="INPUT NAME"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </main>

      {/* STICKY BILLING - COMPACT & HIGH CONTRAST */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/80 dark:bg-black/90 backdrop-blur-2xl border-t border-slate-100 dark:border-white/5 z-50 animate-in slide-in-from-bottom-full duration-500">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex-1 flex-col pl-2">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic opacity-60">
              Estimation
            </span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-blue-600 text-sm font-bold">Rp</span>
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
                BOOKING <ChevronRight strokeWidth={4} size={18} />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

const XCircle = ({
  className,
  size,
}: {
  className?: string;
  size?: number;
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
);

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
