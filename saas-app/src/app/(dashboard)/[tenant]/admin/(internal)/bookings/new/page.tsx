"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, addMinutes, parse, isBefore, startOfToday } from "date-fns";
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
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function NewManualBookingPage() {
  const router = useRouter();

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

  useEffect(() => {
    if (selectedResourceId && date) {
      const formattedDate = format(date, "yyyy-MM-dd");
      api
        .get(`/guest/availability/${selectedResourceId}?date=${formattedDate}`)
        .then((res) => setBusySlots(res.data.busy_slots || []));
    }
  }, [selectedResourceId, date]);

  const availableSlots = useMemo(() => {
    if (!selectedItem) return [];
    const slots = [];
    let current = parse("09:00", "HH:mm", new Date());
    const end = parse("22:00", "HH:mm", new Date());
    const step = selectedItem.unit_duration || 60;
    while (isBefore(current, end)) {
      slots.push(format(current, "HH:mm"));
      current = addMinutes(current, step);
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
    setIsSubmitting(true);
    try {
      const payload = {
        tenant_id: currentResource.tenant_id,
        resource_id: selectedResourceId,
        customer_name: custName.toUpperCase(),
        customer_phone: custPhone,
        item_ids: [selectedMainId, ...selectedAddons],
        start_time: `${format(date!, "yyyy-MM-dd")}T${selectedTime}:00`,
        duration: duration,
        status: status,
      };
      await api.post("/bookings/manual", payload);
      toast.success("Booking Manual Berhasil");

      // FIX: Routing untuk Subdomain style
      router.push("/admin/bookings");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal simpan");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="font-black italic text-[10px] uppercase tracking-widest text-slate-400 text-center">
          Configuring Workspace...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-white font-plus-jakarta flex flex-col lg:flex-row overflow-hidden">
      {/* LEFT SIDE: THE BOOKING CANVAS */}
      <div className="flex-1 bg-slate-50/40 p-4 md:p-8 xl:p-12 overflow-y-auto border-r border-slate-100 scrollbar-hide">
        <div className="max-w-5xl mx-auto space-y-10">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <Button
                variant="ghost"
                onClick={() => router.push("/admin/bookings")}
                className="h-8 px-0 text-slate-400 hover:text-slate-900 transition-colors font-bold text-[10px] uppercase tracking-[0.2em] italic flex items-center gap-2"
              >
                <ArrowLeft className="w-3 h-3 stroke-[3]" /> Back to List
              </Button>
              <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                New <span className="text-blue-600">Reservation</span>
              </h1>
            </div>
            <div className="flex flex-col sm:items-end">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">
                Workspace Entry
              </p>
              <p className="text-xs font-bold text-slate-400 italic">
                #ACTIVE_MODE
              </p>
            </div>
          </header>

          <div className="space-y-12">
            {/* 1. UNIT & PRICING */}
            <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-xl">
                  <MapPin className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-black italic uppercase tracking-tight">
                  1. Unit & Pricing
                </h2>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-4 space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 italic ml-1 tracking-[0.1em]">
                    Target Unit
                  </Label>
                  <Select
                    value={selectedResourceId}
                    onValueChange={(v) => {
                      setSelectedResourceId(v);
                      setSelectedMainId("");
                    }}
                  >
                    <SelectTrigger className="h-16 rounded-2xl border-none bg-white shadow-xl shadow-slate-200/40 font-black italic uppercase px-6 text-sm">
                      <SelectValue placeholder="SELECT ROOM" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl font-bold italic uppercase border-none shadow-2xl p-2">
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

                <div className="xl:col-span-8 space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 italic ml-1 tracking-[0.1em]">
                    Package Options
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {!currentResource ? (
                      <div className="h-16 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center italic text-slate-300 text-[10px] font-black uppercase tracking-widest bg-white/50">
                        Select unit first...
                      </div>
                    ) : (
                      currentResource.items
                        ?.filter((i: any) => i.item_type === "console_option")
                        .map((item: any) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSelectedMainId(item.id);
                              setSelectedTime("");
                            }}
                            className={cn(
                              "h-16 px-6 rounded-2xl border-4 text-left transition-all flex justify-between items-center group",
                              selectedMainId === item.id
                                ? "border-blue-600 bg-white shadow-xl shadow-blue-50 scale-[1.02]"
                                : "border-transparent bg-white shadow-sm hover:border-slate-200",
                            )}
                          >
                            <span
                              className={cn(
                                "text-xs font-black uppercase italic",
                                selectedMainId === item.id
                                  ? "text-blue-600"
                                  : "text-slate-500",
                              )}
                            >
                              {item.name}
                            </span>
                            <span className="text-xs font-black italic tracking-tighter text-slate-900">
                              Rp{item.price.toLocaleString()}
                            </span>
                          </button>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* 2. SCHEDULE SELECTION */}
            <section
              className={cn(
                "space-y-8 transition-all duration-700",
                !selectedMainId
                  ? "opacity-20 pointer-events-none scale-[0.98]"
                  : "opacity-100",
              )}
            >
              <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-100">
                  <Clock className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-black italic uppercase tracking-tight">
                  2. Schedule Selection
                </h2>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-3 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 italic ml-1 tracking-[0.1em]">
                      Session Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-16 rounded-2xl border-none bg-white shadow-xl shadow-slate-200/50 font-black italic justify-start px-6 text-sm"
                        >
                          <CalendarIcon className="mr-3 h-5 w-5 text-blue-600" />
                          {date ? format(date, "dd MMM yyyy") : "SELECT DATE"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-[2.5rem] border-none shadow-2xl">
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
                    <Label className="text-[10px] font-black uppercase text-slate-400 italic ml-1 tracking-[0.1em]">
                      Total Hours
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={1}
                        value={duration}
                        onChange={(e) =>
                          setDuration(parseInt(e.target.value) || 1)
                        }
                        className="h-16 rounded-2xl border-none bg-white shadow-xl shadow-slate-200/50 font-black italic text-xl text-center text-blue-600"
                      />
                      <Layers className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200" />
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-9 space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 italic ml-1 tracking-[0.1em]">
                    Available Time Slots
                  </Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-2 p-5 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-white max-h-[350px] overflow-y-auto scrollbar-hide">
                    {availableSlots.map((t) => {
                      const isBusy = busySlots.some((b) => b.start_time === t);
                      return (
                        <button
                          key={t}
                          disabled={isBusy}
                          onClick={() => setSelectedTime(t)}
                          className={cn(
                            "h-14 rounded-2xl text-[11px] font-black italic border-2 transition-all flex items-center justify-center",
                            selectedTime === t
                              ? "bg-blue-600 border-blue-600 text-white shadow-xl scale-105"
                              : isBusy
                                ? "opacity-20 cursor-not-allowed bg-slate-100 border-transparent text-slate-300"
                                : "bg-white border-slate-50 hover:border-blue-600 text-slate-600 hover:shadow-lg",
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: OPERATIONAL SIDEBAR */}
      <div className="w-full lg:w-[400px] xl:w-[480px] p-6 md:p-10 overflow-y-auto flex flex-col justify-between space-y-10 border-l border-slate-100 bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.02)]">
        <div className="space-y-10">
          <section className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black italic uppercase tracking-tighter">
                Customer <span className="text-blue-600">Info</span>
              </h3>
              <User className="w-5 h-5 text-slate-200" />
            </div>
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                <Input
                  placeholder="FULL NAME"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value.toUpperCase())}
                  className="h-16 pl-12 rounded-2xl bg-slate-50 border-none font-black italic focus:ring-8 focus:ring-blue-500/5 transition-all uppercase text-sm"
                />
              </div>
              <div className="relative group">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                <Input
                  placeholder="WHATSAPP NUMBER"
                  value={custPhone}
                  onChange={(e) =>
                    setCustPhone(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  className="h-16 pl-12 rounded-2xl bg-slate-50 border-none font-black italic focus:ring-8 focus:ring-blue-500/5 transition-all text-sm"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <Label className="text-[10px] font-black uppercase text-slate-400 italic ml-1 tracking-widest leading-none">
              Initial Status
            </Label>
            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/50 shadow-inner">
              {["pending", "confirmed", "active"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    "flex-1 h-12 rounded-xl text-[10px] font-black uppercase italic transition-all",
                    status === s
                      ? "bg-white text-slate-950 shadow-md scale-105"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[9px] font-bold text-blue-500/60 uppercase italic ml-2">
              *Select 'Active' to push directly to POS
            </p>
          </section>

          {currentResource?.items?.some(
            (i: any) => i.item_type === "add_on",
          ) && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <LayoutGrid className="w-4 h-4 text-blue-600" />
                <h3 className="text-[10px] font-black italic uppercase tracking-widest text-slate-900">
                  Add-ons Available
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentResource.items
                  .filter((i: any) => i.item_type === "add_on")
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
                          "px-5 py-3 rounded-xl border-2 font-black uppercase italic transition-all text-[9px] flex items-center gap-2",
                          active
                            ? "border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-50"
                            : "border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200",
                        )}
                      >
                        {addon.name}
                      </button>
                    );
                  })}
              </div>
            </section>
          )}
        </div>

        {/* BILLING FOOTER */}
        <div className="space-y-6 pt-10">
          <div className="bg-slate-950 p-8 xl:p-10 rounded-[3rem] text-white space-y-6 relative overflow-hidden shadow-2xl">
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-2 opacity-50">
                <Ticket className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">
                  Final Estimation
                </span>
              </div>
              <p className="text-5xl xl:text-6xl font-black italic tracking-tighter leading-none flex items-start">
                <span className="text-blue-500 text-2xl mr-2 mt-1">Rp</span>
                {calculateTotal().toLocaleString()}
              </p>
            </div>
            <div className="pt-6 border-t border-white/10 flex justify-between items-center relative z-10">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-slate-500 uppercase italic tracking-widest leading-none mb-1">
                  Time In
                </span>
                <span className="text-xs font-black italic text-blue-400 uppercase">
                  {selectedTime || "--:--"}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[8px] font-bold text-slate-500 uppercase italic tracking-widest leading-none mb-1">
                  Duration
                </span>
                <span className="text-xs font-black italic text-white uppercase">
                  {duration}{" "}
                  {selectedItem?.price_unit === "hour" ? "Hours" : "Sess"}
                </span>
              </div>
            </div>
            <Calculator className="w-32 h-32 absolute -right-6 -top-6 opacity-5 rotate-12" />
          </div>

          <Button
            onClick={handleSave}
            disabled={
              isSubmitting || !selectedTime || !custName || !selectedMainId
            }
            className="w-full h-24 rounded-[2.5rem] bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-[0_20px_50px_-10px_rgba(37,99,235,0.4)] active:scale-95 group border-b-8 border-blue-800"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <div className="flex items-center gap-4">
                <span className="font-black uppercase italic tracking-[0.3em] text-sm md:text-base">
                  Push Reservation
                </span>
                <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform stroke-[4]" />
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
