"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Loader2,
  Plus,
  Calendar as CalendarIcon,
  Search,
  ArrowUpRight,
  LayoutGrid,
  List,
  User,
  Wallet,
  Clock,
  Layers,
  Filter,
  Box,
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BookingsPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterResource, setFilterResource] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/bookings`);
      setBookings(res.data || []);
    } catch (err) {
      toast.error("Gagal mengambil data reservasi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  // Menangkap semua nama resource yang unik untuk filter universal
  const uniqueResources = useMemo(() => {
    const resources = Array.from(new Set(bookings.map((b) => b.resource_name)));
    return resources.sort();
  }, [bookings]);

  // --- LOGIC: FILTERING ---
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const bDate = new Date(b.start_time);
      const matchSearch =
        b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customer_phone.includes(searchQuery);

      const matchStatus = filterStatus === "all" || b.status === filterStatus;
      const matchResource =
        filterResource === "all" || b.resource_name === filterResource;
      const matchDate =
        !selectedDate ||
        format(bDate, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");

      return matchSearch && matchStatus && matchDate && matchResource;
    });
  }, [bookings, searchQuery, filterStatus, filterResource, selectedDate]);

  // --- LOGIC: GROUPING PER UNIT ---
  const groupedData = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredBookings.forEach((b) => {
      if (!map[b.resource_name]) map[b.resource_name] = [];
      map[b.resource_name].push(b);
    });
    return map;
  }, [filteredBookings]);

  const stats = useMemo(() => {
    const totalRevenue = filteredBookings.reduce(
      (acc, curr) => acc + (curr.total_resource + curr.total_fnb),
      0,
    );
    const activeSess = filteredBookings.filter(
      (b) => b.status === "active",
    ).length;
    return { totalRevenue, activeSess };
  }, [filteredBookings]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700 px-4 mt-10 font-plus-jakarta text-slate-900">
      {/* 1. ANALYTICS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-8 rounded-[2.5rem] bg-slate-950 text-white border-none shadow-2xl relative overflow-hidden group">
          <div className="absolute right-[-5%] top-[-10%] opacity-10 group-hover:scale-110 transition-transform">
            <Wallet size={140} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic mb-2 pr-2">
            Total Omzet Terfilter
          </p>
          <h3 className="text-4xl font-black italic pr-2">
            Rp {formatIDR(stats.totalRevenue)}
          </h3>
        </Card>
        <Card className="p-8 rounded-[2.5rem] bg-white border-none shadow-xl border border-slate-100 relative overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic mb-2 pr-2">
            Sesi Aktif
          </p>
          <div className="flex items-center gap-4">
            <h3 className="text-5xl font-black italic text-blue-600 pr-1">
              {stats.activeSess}
            </h3>
            <div className="space-y-1">
              <Badge className="bg-blue-50 text-blue-600 border-none font-black italic text-[10px] pr-2">
                LIVE MONITORING
              </Badge>
              <p className="text-[9px] font-bold text-slate-400 uppercase italic pr-2">
                Unit Sedang Digunakan
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 2. HEADER & SEARCH & ACTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm ring-1 ring-slate-100">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic pr-2">
            Kelola <span className="text-blue-600">Reservasi</span>
          </h1>
          <div className="flex items-center gap-2 text-slate-400">
            <CalendarIcon size={12} />
            <span className="text-[10px] font-bold uppercase tracking-widest italic pr-2">
              {selectedDate
                ? format(selectedDate, "EEEE, dd MMMM yyyy", { locale: id })
                : "Pilih Tanggal"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cari nama atau nomor HP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-xl border-slate-100 focus:ring-blue-600 font-bold italic text-xs pr-2"
            />
          </div>

          <Button
            onClick={() => router.push(`/admin/bookings/new`)}
            className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic text-[11px] shadow-lg shadow-blue-200 gap-2 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Manual Booking
          </Button>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-lg h-10 px-4",
                viewMode === "list" && "shadow-sm font-black italic pr-2",
              )}
            >
              <List size={16} className="mr-1" /> List
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded-lg h-10 px-4",
                viewMode === "grid" && "shadow-sm font-black italic pr-2",
              )}
            >
              <LayoutGrid size={16} className="mr-1" /> Grid
            </Button>
          </div>
        </div>
      </div>

      {/* 3. UNIVERSAL FILTER BAR */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
        <div className="flex items-center gap-2 text-slate-400 mr-2">
          <Filter size={14} />
          <span className="text-[10px] font-black uppercase italic pr-1">
            Filter Data:
          </span>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-10 px-4 rounded-xl border-slate-200 bg-white font-bold italic text-[10px] gap-2 uppercase pr-2"
            >
              <CalendarIcon className="h-3.5 w-3.5 text-blue-600" />
              {selectedDate ? format(selectedDate, "dd MMM yyyy") : "Tanggal"}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 rounded-2xl shadow-2xl border-none"
            align="start"
          >
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              initialFocus
              className="font-plus-jakarta"
            />
          </PopoverContent>
        </Popover>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-10 rounded-xl border-slate-200 bg-white font-bold italic text-[10px] uppercase pr-2">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-none shadow-2xl">
            <SelectItem
              value="all"
              className="text-[10px] font-bold uppercase italic pr-2"
            >
              Semua Status
            </SelectItem>
            {["pending", "confirmed", "active", "completed", "cancelled"].map(
              (s) => (
                <SelectItem
                  key={s}
                  value={s}
                  className="text-[10px] font-bold uppercase italic pr-2"
                >
                  {s}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        <Select value={filterResource} onValueChange={setFilterResource}>
          <SelectTrigger className="w-[160px] h-10 rounded-xl border-slate-200 bg-white font-bold italic text-[10px] uppercase pr-2">
            <SelectValue placeholder="Semua Unit" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-none shadow-2xl">
            <SelectItem
              value="all"
              className="text-[10px] font-bold uppercase italic pr-2"
            >
              Semua Unit
            </SelectItem>
            {uniqueResources.map((r) => (
              <SelectItem
                key={r}
                value={r}
                className="text-[10px] font-bold uppercase italic pr-2"
              >
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 4. CONTENT AREA */}
      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4 bg-white rounded-[3rem] shadow-sm ring-1 ring-slate-100">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600/20" />
          <p className="font-black italic text-[11px] text-slate-300 uppercase tracking-widest pr-2">
            Menyinkronkan Data...
          </p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center gap-3 bg-white rounded-[3rem] shadow-sm ring-1 ring-slate-100">
          <Box size={40} className="text-slate-100" />
          <p className="text-slate-300 font-black italic uppercase pr-2 text-lg">
            Tidak Ada Data
          </p>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-8">
          {Object.entries(groupedData).map(([resourceName, sessions]) => (
            <div key={resourceName} className="space-y-4">
              <div className="flex items-center gap-4 px-4">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                  <Layers className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-black italic text-lg uppercase tracking-tighter pr-2">
                  {resourceName}
                </h3>
                <div className="flex-1 h-[1px] bg-slate-100" />
                <Badge
                  variant="secondary"
                  className="font-bold text-[9px] uppercase pr-2 bg-slate-100 text-slate-400"
                >
                  {sessions.length} Pelanggan
                </Badge>
              </div>

              <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white ring-1 ring-slate-100">
                <Table>
                  <TableBody>
                    {sessions.map((b) => (
                      <TableRow
                        key={b.id}
                        className="border-slate-50 hover:bg-slate-50/50 group cursor-pointer"
                        onClick={() => router.push(`/admin/bookings/${b.id}`)}
                      >
                        <TableCell className="pl-10 py-6 w-[35%]">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                              <User size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black uppercase italic tracking-tighter text-base pr-2">
                                {b.customer_name}
                              </span>
                              <span className="text-[11px] font-bold text-slate-400 italic pr-2">
                                {b.customer_phone}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-[30%]">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-blue-600 font-black italic text-[12px] uppercase tracking-tighter pr-2">
                              <Clock size={14} />
                              {format(new Date(b.start_time), "HH:mm")} —{" "}
                              {format(new Date(b.end_time), "HH:mm")}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase italic pr-2">
                              {format(new Date(b.start_time), "dd MMMM", {
                                locale: id,
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="w-[15%] text-center">
                          <Badge
                            className={cn(
                              "font-black italic text-[9px] uppercase px-4 py-1.5 rounded-full border-none shadow-md pr-2",
                              b.status === "active"
                                ? "bg-emerald-500 text-white animate-pulse"
                                : b.status === "confirmed"
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {b.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-10">
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-slate-300 uppercase italic mb-1 pr-2">
                              Tagihan
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-black italic text-slate-950 text-lg pr-2">
                                Rp {formatIDR(b.total_resource + b.total_fnb)}
                              </span>
                              <ArrowUpRight
                                size={16}
                                className="text-slate-200 group-hover:text-blue-600 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        /* GRID VIEW (UNIVERSAL UNITS) */
        <div className="space-y-12">
          {Object.entries(groupedData).map(([resourceName, sessions]) => (
            <div key={resourceName} className="space-y-6">
              <div className="flex items-center gap-4">
                <h3 className="font-black italic text-2xl uppercase tracking-tighter pr-2">
                  {resourceName}
                </h3>
                <div className="flex-1 h-[1px] bg-slate-200" />
                <Badge
                  variant="outline"
                  className="font-bold text-[10px] uppercase text-slate-400 border-slate-200 pr-2"
                >
                  {sessions.length} Sesi Terdaftar
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {sessions.map((b) => (
                  <Card
                    key={b.id}
                    className="p-6 rounded-[2.5rem] border-none shadow-xl hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden bg-white"
                    onClick={() => router.push(`/admin/bookings/${b.id}`)}
                  >
                    {b.status === "active" && (
                      <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500 animate-pulse" />
                    )}
                    <div className="flex justify-between items-start mb-6">
                      <Badge
                        className={cn(
                          "font-black italic text-[9px] uppercase px-3 py-1 pr-2 shadow-sm",
                          b.status === "active"
                            ? "bg-emerald-500 text-white border-none"
                            : "bg-slate-100 text-slate-500 border-none",
                        )}
                      >
                        {b.status}
                      </Badge>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <ArrowUpRight size={16} />
                      </div>
                    </div>
                    <div className="space-y-1 mb-8">
                      <h4 className="font-black italic text-xl uppercase tracking-tighter group-hover:text-blue-600 transition-colors leading-none pr-2">
                        {b.customer_name}
                      </h4>
                      <p className="text-[11px] font-bold text-slate-400 italic pr-2">
                        {b.customer_phone}
                      </p>
                    </div>
                    <div className="pt-5 border-t border-slate-50 flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase italic pr-2">
                          Waktu Sesi
                        </p>
                        <p className="text-sm font-black italic text-blue-600 pr-2">
                          {format(new Date(b.start_time), "HH:mm")} -{" "}
                          {format(new Date(b.end_time), "HH:mm")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-slate-300 uppercase italic pr-2">
                          Total
                        </p>
                        <p className="font-black italic text-slate-950 text-base pr-2">
                          Rp{formatIDR(b.total_resource + b.total_fnb)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
