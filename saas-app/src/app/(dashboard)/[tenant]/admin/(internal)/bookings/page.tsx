"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
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
  MonitorPlay,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookingsPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
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

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setViewMode("list");
    }
  }, []);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  const getPaymentMeta = (booking: any) => {
    const status = (booking?.payment_status || "").toLowerCase();
    const depositAmount = Number(booking?.deposit_amount || 0);
    const balanceDue = Number(booking?.balance_due || 0);

    if (status === "settled" || (status === "paid" && balanceDue === 0)) {
      return { label: "Lunas", className: "bg-emerald-500 text-white" };
    }
    if (status === "partial_paid" || (status === "paid" && depositAmount > 0)) {
      return { label: "DP Masuk", className: "bg-blue-600 text-white" };
    }
    if (status === "pending") {
      return { label: depositAmount > 0 ? "Menunggu DP" : "Bayar Nanti", className: "bg-orange-500 text-white" };
    }
    if (status === "expired") {
      return { label: "DP Kadaluarsa", className: "bg-red-500 text-white" };
    }
    if (status === "failed") {
      return { label: "Gagal Bayar", className: "bg-red-500 text-white" };
    }
    return { label: "Belum Dibayar", className: "bg-slate-500 text-white" };
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterResource("all");
    setSelectedDate(new Date());
  };

  const isFilterActive = useMemo(() => {
    return (
      searchQuery !== "" || filterStatus !== "all" || filterResource !== "all"
    );
  }, [searchQuery, filterStatus, filterResource]);

  const uniqueResources = useMemo(() => {
    const resources = Array.from(new Set(bookings.map((b) => b.resource_name)));
    return resources.sort();
  }, [bookings]);

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
    <div className="max-w-7xl mx-auto space-y-5 md:space-y-6 pb-20 animate-in fade-in duration-500 px-3 md:px-4 mt-4 md:mt-6 font-plus-jakarta">
      {/* 1. TOP HEADER SECTION */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 md:gap-6">
        <div className="space-y-1 max-w-2xl">
          <h1 className="text-2xl md:text-5xl font-[1000] tracking-tighter uppercase italic text-slate-900 dark:text-white leading-none pr-0 md:pr-4">
            Master <span className="text-blue-600">Bookings.</span>
          </h1>
          <div className="flex items-center gap-2 text-slate-400 font-bold italic text-[10px] uppercase tracking-widest">
            <MonitorPlay size={12} className="text-blue-600" />
            Live Inventory Management
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-3 bg-slate-950 dark:bg-white p-1.5 pl-4 rounded-2xl shadow-xl border-b-4 border-slate-800 dark:border-slate-300 w-full sm:w-auto">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase leading-none mb-0.5">
                Total Revenue
              </span>
              <span className="text-sm font-black italic text-white dark:text-slate-950">
                Rp {formatIDR(stats.totalRevenue)}
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
              <Wallet size={18} />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 pl-4 rounded-2xl shadow-md border border-slate-100 dark:border-white/5 w-full sm:w-auto">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-0.5">
                Active Slot
              </span>
              <span className="text-sm font-black italic text-blue-600">
                {stats.activeSess} Units
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-blue-600">
              <TrendingUp size={18} />
            </div>
          </div>

          <Button
            onClick={() => router.push(`/admin/bookings/new`)}
            className="h-12 md:h-14 px-5 md:px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic text-[11px] shadow-2xl border-b-4 border-blue-800 gap-2 transition-all active:scale-95 ml-auto lg:ml-0 w-full sm:w-auto"
          >
            <Plus size={16} strokeWidth={4} /> New Booking
          </Button>
        </div>
      </div>

      {/* 2. ENHANCED SEARCH & FILTER BAR */}
      <Card className="p-4 md:p-5 rounded-[1.75rem] md:rounded-[2.5rem] bg-white dark:bg-slate-900 border-none shadow-sm ring-1 ring-slate-100 dark:ring-white/5">
        <div className="flex flex-col lg:flex-row gap-4 md:gap-5">
          {/* Main Search */}
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 md:h-14 rounded-2xl border-none bg-slate-50 dark:bg-slate-800/50 font-black italic text-xs shadow-inner focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          {/* Expanded Filters */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 md:h-12 px-4 md:px-5 rounded-xl border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800 font-[1000] italic text-xs gap-3 uppercase shadow-sm w-full sm:w-auto"
                >
                  <CalendarIcon className="h-4 w-4 text-blue-600" />
                  {selectedDate
                    ? format(selectedDate, "dd MMM yyyy")
                    : "Pick Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
              className="w-[92vw] sm:w-80 p-0 border-none rounded-3xl overflow-hidden shadow-2xl"
                align="end"
              >
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="w-full"
                />
              </PopoverContent>
            </Popover>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[160px] min-h-[45px] rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-[1000] italic text-xs uppercase focus:ring-0 shadow-sm ">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                <SelectItem
                  value="all"
                  className="text-xs font-black uppercase italic py-3 rounded-xl"
                >
                  All Status
                </SelectItem>
                {[
                  "pending",
                  "confirmed",
                  "active",
                  "completed",
                  "cancelled",
                ].map((s) => (
                  <SelectItem
                    key={s}
                    value={s}
                    className="text-xs font-black uppercase italic py-3 rounded-xl"
                  >
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterResource} onValueChange={setFilterResource}>
            <SelectTrigger className="w-full sm:w-[180px] min-h-[45px] rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-[1000] italic text-xs uppercase focus:ring-0 shadow-sm">
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                <SelectItem
                  value="all"
                  className="text-xs font-black uppercase italic py-3 rounded-xl"
                >
                  All Resources
                </SelectItem>
                {uniqueResources.map((r) => (
                  <SelectItem
                    key={r}
                    value={r}
                    className="text-xs font-black uppercase italic py-3 rounded-xl"
                  >
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isFilterActive && (
              <Button
                onClick={resetFilters}
                variant="ghost"
                className="h-12 px-4 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-black italic text-[10px] uppercase gap-2 rounded-2xl w-full sm:w-auto"
              >
                <XCircle size={16} /> Clear
              </Button>
            )}

            <div className="h-10 w-[1px] bg-slate-100 dark:bg-white/5 hidden xl:block mx-1" />

            <div className="flex gap-1.5 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl w-full sm:w-auto">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-xl h-11 px-4",
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-700 shadow-md font-black"
                    : "text-slate-400",
                )}
              >
                <List size={18} />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-xl h-11 px-4",
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-700 shadow-md font-black"
                    : "text-slate-400",
                )}
              >
                <LayoutGrid size={18} />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. DYNAMIC CONTENT AREA */}
      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-[2.5rem]" />
          <Skeleton className="h-64 w-full rounded-[2.5rem]" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="h-80 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/5">
          <div className="h-16 w-16 rounded-3xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-200 dark:text-slate-800">
            <Box size={32} />
          </div>
          <p className="text-slate-400 font-black italic uppercase text-sm tracking-widest">
            No Reservation Found
          </p>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-6">
          {Object.entries(groupedData).map(([resourceName, sessions]) => (
            <div
              key={resourceName}
              className="space-y-3 animate-in slide-in-from-bottom-2 duration-300"
            >
              <div className="flex items-center gap-3 px-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600/10 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-[1000] italic text-lg uppercase tracking-tight text-slate-800 dark:text-slate-200">
                  {resourceName}
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-black italic border-slate-100 dark:border-white/5 text-slate-400"
                >
                  {sessions.length} Booking
                </Badge>
              </div>

              <Card className="rounded-[1.75rem] md:rounded-[2.5rem] border-none shadow-lg overflow-hidden bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-white/5">
                <div className="overflow-x-auto">
                <Table className="min-w-[920px]">
                  <TableBody>
                    {sessions.map((b) => (
                      <TableRow
                        key={b.id}
                        onClick={() => router.push(`/admin/bookings/${b.id}`)}
                        className="border-slate-50 dark:border-white/5 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 group cursor-pointer transition-colors"
                      >
                        <TableCell className="pl-10 py-6 w-[35%]">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                              <User size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-[1000] uppercase italic tracking-tighter text-base text-slate-900 dark:text-white">
                                {b.customer_name}
                              </span>
                              <span className="text-[11px] font-bold text-slate-400 italic leading-none mt-1">
                                {b.customer_phone}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-[30%]">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-blue-600 font-black italic text-[12px] uppercase tracking-tighter leading-none">
                              <Clock size={14} />{" "}
                              {format(new Date(b.start_time), "HH:mm")} —{" "}
                              {format(new Date(b.end_time), "HH:mm")}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase italic mt-1.5">
                              {format(new Date(b.start_time), "dd MMMM yyyy", {
                                locale: id,
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="w-[15%]">
                          <Badge
                            className={cn(
                              "font-black italic text-[9px] uppercase px-4 py-1.5 rounded-full border-none shadow-sm",
                              b.status === "active"
                                ? "bg-emerald-500 text-white animate-pulse"
                                : b.status === "confirmed"
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-400",
                            )}
                          >
                            {b.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[15%]">
                          <Badge
                            className={cn(
                              "font-black italic text-[9px] uppercase px-4 py-1.5 rounded-full border-none shadow-sm",
                              getPaymentMeta(b).className,
                            )}
                          >
                            {getPaymentMeta(b).label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-10">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase italic mb-1">
                              Billing
                            </span>
                            <span className="text-lg font-[1000] italic text-slate-950 dark:text-white leading-none">
                              Rp {formatIDR(b.total_resource + b.total_fnb)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        /* GRID VIEW COMPACT */
        <div className="space-y-12">
          {Object.entries(groupedData).map(([resourceName, sessions]) => (
            <div key={resourceName} className="space-y-5">
              <div className="flex items-center gap-3 px-3">
                <h3 className="font-[1000] italic text-xl uppercase tracking-tight text-slate-800 dark:text-slate-200">
                  {resourceName}
                </h3>
                <div className="flex-1 h-[1px] bg-slate-100 dark:bg-white/5" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {sessions.map((b) => (
                  <Card
                    key={b.id}
                    onClick={() => router.push(`/admin/bookings/${b.id}`)}
                    className="p-4 md:p-6 rounded-[1.75rem] md:rounded-[2.5rem] border-none shadow-md hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-white/5"
                  >
                    {b.status === "active" && (
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500 animate-pulse" />
                    )}

                    <div className="flex justify-between items-start mb-5">
                      <Badge
                        className={cn(
                          "font-black italic text-[9px] uppercase px-3 py-1 rounded-full shadow-sm",
                          b.status === "active"
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-400",
                        )}
                      >
                        {b.status}
                      </Badge>
                      <ArrowUpRight
                        size={18}
                        className="text-slate-200 group-hover:text-blue-600 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </div>
                    <div className="mb-4">
                      <Badge
                        className={cn(
                          "font-black italic text-[9px] uppercase px-3 py-1 rounded-full border-none shadow-sm",
                          getPaymentMeta(b).className,
                        )}
                      >
                        bayar: {getPaymentMeta(b).label}
                      </Badge>
                    </div>

                    <div className="space-y-1 mb-6">
                      <h4 className="font-[1000] italic text-base lg:text-lg uppercase tracking-tighter text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors">
                        {b.customer_name}
                      </h4>
                      <p className="text-[11px] font-bold text-slate-400 italic leading-none">
                        {b.customer_phone}
                      </p>
                    </div>

                    <div className="pt-5 border-t border-slate-50 dark:border-white/5 flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase italic leading-none mb-1.5">
                          TIME SLOT
                        </span>
                        <span className="text-[13px] font-[1000] italic text-blue-600 dark:text-blue-400 leading-none">
                          {format(new Date(b.start_time), "HH:mm")} -{" "}
                          {format(new Date(b.end_time), "HH:mm")}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black text-slate-400 uppercase italic mb-1.5 leading-none">
                          TOTAL
                        </span>
                        <span className="text-base font-black italic text-slate-950 dark:text-white leading-none block">
                          Rp{formatIDR(b.total_resource + b.total_fnb)}
                        </span>
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
