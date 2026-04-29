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

type BookingRow = {
  id: string;
  customer_name: string;
  customer_phone: string;
  resource_name: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status?: string;
  deposit_amount?: number;
  balance_due?: number;
  total_resource: number;
  total_fnb: number;
};

const isOperationallyActive = (booking: BookingRow) => {
  const status = String(booking.status || "").toLowerCase();
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const balanceDue = Number(booking.balance_due || 0);
  return (
    status === "active" ||
    status === "ongoing" ||
    (status === "completed" &&
      (balanceDue > 0 || ["pending", "partial_paid", "unpaid", "failed", "expired"].includes(paymentStatus)))
  );
};

const getBookingStatusMeta = (booking: BookingRow) => {
  if (isOperationallyActive(booking) && booking.status === "completed") {
    return { label: "Perlu Pelunasan", className: "bg-amber-500 text-white" };
  }
  if (booking.status === "active" || booking.status === "ongoing") {
    return { label: "Aktif", className: "bg-emerald-500 text-white" };
  }
  if (booking.status === "confirmed") {
    return { label: "Confirmed", className: "bg-blue-600 text-white" };
  }
  return {
    label: booking.status || "pending",
    className: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  };
};

export default function BookingsPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
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
    } catch {
      toast.error("Gagal mengambil data reservasi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const syncViewMode = () => {
      setViewMode(mediaQuery.matches ? "list" : "grid");
    };

    syncViewMode();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncViewMode);
      return () => mediaQuery.removeEventListener("change", syncViewMode);
    }

    mediaQuery.addListener(syncViewMode);
    return () => mediaQuery.removeListener(syncViewMode);
  }, []);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  const getPaymentMeta = (booking: BookingRow) => {
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
      return {
        label: depositAmount > 0 ? "Menunggu DP" : "Bayar Nanti",
        className: "bg-orange-500 text-white",
      };
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

      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" ? isOperationallyActive(b) : b.status === filterStatus);
      const matchResource =
        filterResource === "all" || b.resource_name === filterResource;
      const matchDate =
        !selectedDate ||
        format(bDate, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");

      return matchSearch && matchStatus && matchDate && matchResource;
    });
  }, [bookings, searchQuery, filterStatus, filterResource, selectedDate]);

  const groupedData = useMemo(() => {
    const map: Record<string, BookingRow[]> = {};
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
    const activeSess = filteredBookings.filter(isOperationallyActive).length;
    return { totalRevenue, activeSess };
  }, [filteredBookings]);

  const bookingCountLabel = `${filteredBookings.length} booking`;

  return (
    <div className="mx-auto w-full space-y-4 px-3 pb-20 pt-5 font-plus-jakarta md:px-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#0a0a0a]">
        <div className="h-1 bg-blue-600" />
        <div className="p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-1">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white md:text-3xl">
                Bookings
              </h1>
              <div className="flex items-start gap-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                <MonitorPlay size={14} className="mt-1 shrink-0 text-blue-600" />
                <span>Kelola jadwal, status pembayaran, dan booking per resource.</span>
              </div>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-[1fr_1fr_auto] lg:w-auto lg:min-w-[520px]">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-col">
                  <span className="mb-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    Total Revenue
                  </span>
                  <span className="text-base font-semibold text-slate-950 dark:text-white">
                    Rp {formatIDR(stats.totalRevenue)}
                  </span>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Wallet size={16} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-col">
                  <span className="mb-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    Active Slot
                  </span>
                  <span className="text-base font-semibold text-blue-600">
                    {stats.activeSess} Units
                  </span>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-blue-600 dark:bg-white/10">
                  <TrendingUp size={16} />
                </div>
              </div>

              <Button
                onClick={() => router.push(`/admin/bookings/new`)}
                className="h-12 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 sm:h-auto sm:min-h-full sm:min-w-[150px] md:px-5"
              >
                <Plus size={16} strokeWidth={4} /> New Booking
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200 bg-white p-3 shadow-sm dark:border-white/5 dark:bg-[#0a0a0a] md:p-4">
        <div className="space-y-4 lg:hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 md:h-14 rounded-2xl border-none bg-slate-50 dark:bg-slate-800/50 font-semibold text-[10px] md:text-xs shadow-inner focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 md:h-12 px-3 md:px-5 rounded-xl border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800 font-semibold text-[9px] md:text-xs gap-2 md:gap-3 shadow-sm w-full"
                >
                  <CalendarIcon className="h-4 w-4 text-blue-600" />
                  {selectedDate
                    ? format(selectedDate, "dd MMM yyyy")
                    : "Pick Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[92vw] sm:w-80 p-0 border-none rounded-2xl overflow-hidden shadow-sm"
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
              <SelectTrigger className="w-full min-h-[44px] rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-semibold text-[9px] focus:ring-0 shadow-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-sm p-2">
                <SelectItem
                  value="all"
                  className="text-xs font-semibold py-3 rounded-xl"
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
                    className="text-xs font-semibold py-3 rounded-xl"
                  >
                    {s === "active" ? "active / perlu pelunasan" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterResource} onValueChange={setFilterResource}>
              <SelectTrigger className="w-full min-h-[44px] rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-semibold text-[9px] focus:ring-0 shadow-sm">
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-sm p-2">
                <SelectItem
                  value="all"
                  className="text-xs font-semibold py-3 rounded-xl"
                >
                  All Resources
                </SelectItem>
                {uniqueResources.map((r) => (
                  <SelectItem
                    key={r}
                    value={r}
                    className="text-xs font-semibold py-3 rounded-xl"
                  >
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isFilterActive ? (
              <Button
                onClick={resetFilters}
                variant="ghost"
                className="h-11 px-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold text-[9px] gap-2 rounded-2xl w-full"
              >
                <XCircle size={16} /> Clear
              </Button>
            ) : (
              <div className="flex h-11 items-center justify-center rounded-2xl border border-dashed border-slate-100 bg-slate-50/60 text-[10px] font-semibold text-slate-400 dark:border-white/5 dark:bg-slate-800/30">
                {bookingCountLabel}
              </div>
            )}

            <div className="col-span-2 flex gap-1.5 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl w-full">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-xl h-11 px-4 flex-1",
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-700 shadow-sm font-semibold"
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
                  "rounded-xl h-11 px-4 flex-1",
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-700 shadow-sm font-semibold"
                    : "text-slate-400",
                )}
              >
                <LayoutGrid size={18} />
              </Button>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-3">
          <div className="relative flex-1 min-w-[320px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-2xl border-none bg-slate-50 dark:bg-slate-800/50 font-semibold text-xs shadow-inner focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-12 px-5 rounded-xl border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800 font-semibold text-xs gap-3 shadow-sm min-w-[170px]"
              >
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                {selectedDate
                  ? format(selectedDate, "dd MMM yyyy")
                  : "Pick Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-0 border-none rounded-2xl overflow-hidden shadow-sm"
              align="start"
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
            <SelectTrigger className="h-12 w-[170px] rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-semibold text-xs focus:ring-0 shadow-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-sm p-2">
              <SelectItem
                value="all"
                className="text-xs font-semibold py-3 rounded-xl"
              >
                All Status
              </SelectItem>
              {["pending", "confirmed", "active", "completed", "cancelled"].map(
                (s) => (
                  <SelectItem
                    key={s}
                    value={s}
                    className="text-xs font-semibold py-3 rounded-xl"
                  >
                    {s === "active" ? "active / perlu pelunasan" : s}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>

          <Select value={filterResource} onValueChange={setFilterResource}>
            <SelectTrigger className="h-12 w-[180px] rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-semibold text-xs focus:ring-0 shadow-sm">
              <SelectValue placeholder="Resource" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-sm p-2">
              <SelectItem
                value="all"
                className="text-xs font-semibold py-3 rounded-xl"
              >
                All Resources
              </SelectItem>
              {uniqueResources.map((r) => (
                <SelectItem
                  key={r}
                  value={r}
                  className="text-xs font-semibold py-3 rounded-xl"
                >
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-400">
            {bookingCountLabel}
          </div>

          {isFilterActive ? (
            <Button
              onClick={resetFilters}
              variant="ghost"
              className="h-12 px-4 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold text-xs gap-2 rounded-2xl"
            >
              <XCircle size={16} /> Clear
            </Button>
          ) : null}

          <div className="ml-auto flex gap-1.5 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-xl h-11 px-4 min-w-[78px]",
                viewMode === "list"
                  ? "bg-white dark:bg-slate-700 shadow-sm font-semibold"
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
                "rounded-xl h-11 px-4 min-w-[78px]",
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-700 shadow-sm font-semibold"
                  : "text-slate-400",
              )}
            >
              <LayoutGrid size={18} />
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. DYNAMIC CONTENT AREA */}
      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-white/5 dark:bg-slate-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 dark:bg-blue-500/10">
            <Box size={30} />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              Belum ada reservasi di filter ini
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Coba ganti tanggal/filter, atau buat booking manual untuk walk-in.
            </p>
          </div>
          <Button
            onClick={() => router.push("/admin/bookings/new")}
            className="rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-6">
          {Object.entries(groupedData).map(([resourceName, sessions]) => (
            <div
              key={resourceName}
              className="space-y-3 "
            >
              <div className="flex items-center gap-3 px-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600/10 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">
                  {resourceName}
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold border-slate-100 dark:border-white/5 text-slate-400"
                >
                  {sessions.length} Booking
                </Badge>
              </div>

              <Card className="rounded-2xl md:rounded-2xl border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-white/5">
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
                                <span className="font-semibold text-base text-slate-900 dark:text-white">
                                  {b.customer_name}
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 leading-none mt-1">
                                  {b.customer_phone}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="w-[30%]">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 text-blue-600 font-semibold text-[12px] leading-none">
                                <Clock size={14} />{" "}
                                {format(new Date(b.start_time), "HH:mm")} -{" "}
                                {format(new Date(b.end_time), "HH:mm")}
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 mt-1.5">
                                {format(
                                  new Date(b.start_time),
                                  "dd MMMM yyyy",
                                  {
                                    locale: id,
                                  },
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="w-[15%]">
                            <Badge
                              className={cn(
                                "font-semibold text-[9px] px-4 py-1.5 rounded-full border-none shadow-sm",
                                getBookingStatusMeta(b).className,
                              )}
                            >
                              {getBookingStatusMeta(b).label}
                            </Badge>
                          </TableCell>
                          <TableCell className="w-[15%]">
                            <Badge
                              className={cn(
                                "font-semibold text-[9px] px-4 py-1.5 rounded-full border-none shadow-sm",
                                getPaymentMeta(b).className,
                              )}
                            >
                              {getPaymentMeta(b).label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-10">
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-semibold text-slate-400 mb-1">
                                Billing
                              </span>
                              <span className="text-lg font-semibold text-slate-950 dark:text-white leading-none">
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
                <h3 className="font-semibold text-xl text-slate-800 dark:text-slate-200">
                  {resourceName}
                </h3>
                <div className="flex-1 h-[1px] bg-slate-100 dark:bg-white/5" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {sessions.map((b) => (
                  <Card
                    key={b.id}
                    onClick={() => router.push(`/admin/bookings/${b.id}`)}
                    className="p-4 md:p-6 rounded-2xl md:rounded-2xl border-none shadow-sm hover:shadow-sm transition-all cursor-pointer group relative overflow-hidden bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-white/5"
                  >
                    {isOperationallyActive(b) && (
                      <div
                        className={cn(
                          "absolute top-0 left-0 w-full h-1.5",
                          b.status === "completed" ? "bg-amber-500" : "bg-emerald-500",
                        )}
                      />
                    )}

                    <div className="flex justify-between items-start mb-5">
                      <Badge
                        className={cn(
                          "font-semibold text-[9px] px-3 py-1 rounded-full shadow-sm",
                          getBookingStatusMeta(b).className,
                        )}
                      >
                        {getBookingStatusMeta(b).label}
                      </Badge>
                      <ArrowUpRight
                        size={18}
                        className="text-slate-200 group-hover:text-blue-600 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </div>
                    <div className="mb-4">
                      <Badge
                        className={cn(
                          "font-semibold text-[9px] px-3 py-1 rounded-full border-none shadow-sm",
                          getPaymentMeta(b).className,
                        )}
                      >
                        bayar: {getPaymentMeta(b).label}
                      </Badge>
                    </div>

                    <div className="space-y-1 mb-6">
                      <h4 className="font-semibold text-base lg:text-lg text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors">
                        {b.customer_name}
                      </h4>
                      <p className="text-[11px] font-bold text-slate-400 leading-none">
                        {b.customer_phone}
                      </p>
                    </div>

                    <div className="pt-5 border-t border-slate-50 dark:border-white/5 flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-semibold text-slate-400 leading-none mb-1.5">
                          TIME SLOT
                        </span>
                        <span className="text-[13px] font-semibold text-blue-600 dark:text-blue-400 leading-none">
                          {format(new Date(b.start_time), "HH:mm")} -{" "}
                          {format(new Date(b.end_time), "HH:mm")}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-semibold text-slate-400 mb-1.5 leading-none">
                          TOTAL
                        </span>
                        <span className="text-base font-semibold text-slate-950 dark:text-white leading-none block">
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
