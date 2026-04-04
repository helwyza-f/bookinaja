"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  Loader2,
  Eye,
  RefreshCcw,
  Plus,
  Calendar as CalendarIcon,
  Search,
  ArrowUpRight,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BookingsPage() {
  const router = useRouter();
  const params = useParams();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/bookings?status=${filterStatus}`);
      setBookings(res.data || []);
    } catch (err) {
      toast.error("Gagal mengambil data reservasi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [filterStatus]);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700 font-plus-jakarta px-4 mt-10">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-100 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600">
            <CalendarIcon className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
              Reservation Desk
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase italic">
            Manage <span className="text-blue-600">Bookings</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">
            {bookings.length} Total reservasi terdaftar
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={fetchBookings}
            variant="outline"
            className="h-14 w-14 p-0 rounded-2xl border-slate-200 hover:bg-slate-50 transition-all"
          >
            <RefreshCcw
              className={cn(
                "h-5 w-5 text-slate-400",
                loading && "animate-spin",
              )}
            />
          </Button>

          {/* NAVIGASI KE PAGE BARU */}
          <Button
            onClick={() => router.push(`/admin/bookings/new`)}
            className="h-14 px-8 rounded-2xl bg-blue-600 font-black uppercase italic tracking-widest text-[11px] shadow-xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="mr-2 h-5 w-5 stroke-[3]" /> Manual Booking
          </Button>
        </div>
      </div>

      {/* FILTER STATUS BAR */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {["", "pending", "confirmed", "active", "completed", "cancelled"].map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-6 h-11 rounded-xl text-[10px] font-black uppercase italic transition-all shrink-0 border-2",
                filterStatus === s
                  ? "bg-slate-900 border-slate-900 text-white shadow-xl"
                  : "bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600",
              )}
            >
              {s === "" ? "Show All" : s}
            </button>
          ),
        )}
      </div>

      {/* TABLE SECTION */}
      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="font-black italic uppercase text-[10px] text-slate-400 pl-10 h-16">
                  Customer Details
                </TableHead>
                <TableHead className="font-black italic uppercase text-[10px] text-slate-400 h-16">
                  Resource / Unit
                </TableHead>
                <TableHead className="font-black italic uppercase text-[10px] text-slate-400 h-16">
                  Schedule
                </TableHead>
                <TableHead className="font-black italic uppercase text-[10px] text-slate-400 h-16">
                  Status
                </TableHead>
                <TableHead className="font-black italic uppercase text-[10px] text-slate-400 h-16 text-right pr-10 h-16">
                  Billing
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-80 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-10 w-10 animate-spin text-blue-600/20" />
                      <p className="font-black italic text-[10px] text-slate-300 uppercase tracking-widest">
                        Fetching Data...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-80 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                        <Search className="w-6 h-6 text-slate-200" />
                      </div>
                      <p className="font-black italic text-slate-300 uppercase text-xl tracking-tighter">
                        No Reservations Found
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((b) => (
                  <TableRow
                    key={b.id}
                    className="border-slate-50 hover:bg-slate-50/50 group transition-all cursor-pointer"
                    onClick={() =>
                      router.push(`/${params.tenant}/admin/bookings/${b.id}`)
                    }
                  >
                    <TableCell className="pl-10 py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 uppercase italic tracking-tighter text-base group-hover:text-blue-600 transition-colors">
                          {b.customer_name}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 italic tracking-tight">
                          {b.customer_phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="font-black italic text-[10px] uppercase border-slate-200 bg-white px-3 py-1 rounded-lg shadow-sm"
                      >
                        {b.resource_name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-slate-700">
                          {format(new Date(b.start_time), "EEE, dd MMM yyyy")}
                        </span>
                        <span className="font-black italic text-[11px] text-blue-600 uppercase tracking-tighter">
                          {format(new Date(b.start_time), "HH:mm")} —{" "}
                          {format(new Date(b.end_time), "HH:mm")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "font-black italic text-[9px] uppercase border-none px-4 py-1.5 rounded-full shadow-lg",
                          b.status === "active"
                            ? "bg-emerald-500 text-white animate-pulse"
                            : b.status === "confirmed"
                              ? "bg-blue-600 text-white"
                              : b.status === "pending"
                                ? "bg-amber-400 text-white"
                                : b.status === "completed"
                                  ? "bg-slate-900 text-white"
                                  : "bg-slate-100 text-slate-400",
                        )}
                      >
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-10">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-300 uppercase italic leading-none mb-1">
                          Total Bill
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-black italic text-slate-900 text-lg tracking-tighter">
                            <span className="text-blue-600 text-xs mr-1">
                              Rp
                            </span>
                            {formatIDR(b.grand_total || 0)}
                          </span>
                          <ArrowUpRight className="w-4 h-4 text-slate-200 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
