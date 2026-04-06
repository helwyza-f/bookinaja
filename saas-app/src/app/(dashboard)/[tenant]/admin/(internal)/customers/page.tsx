"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  User,
  Phone,
  UserCheck,
  Star,
  ArrowUpRight,
  Loader2,
  Medal,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Detail States
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data || []);
    } catch (err) {
      toast.error("Gagal memuat data pelanggan");
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/customers/${id}`);
      setCustomerDetail(res.data);
    } catch (err) {
      toast.error("Gagal memuat detail pelanggan");
      setSelectedId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery),
    );
  }, [customers, searchQuery]);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700 px-4 mt-10 font-plus-jakarta text-slate-900 dark:text-slate-100">
      {/* 1. TOP ANALYTICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-8 rounded-[2.5rem] bg-slate-950 text-white border-none shadow-2xl relative overflow-hidden group">
          <UserCheck className="absolute right-[-10%] top-[-20%] opacity-10 w-32 h-32" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic mb-2 pr-2">
            Customer Database
          </p>
          <h3 className="text-5xl font-black italic pr-2">
            {loading ? "..." : customers.length}
          </h3>
        </Card>

        <Card className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-none shadow-sm ring-1 ring-slate-100 dark:ring-white/5 relative overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic mb-2 pr-2">
            VIP Members
          </p>
          <div className="flex items-center gap-4">
            <h3 className="text-5xl font-black italic text-blue-600">
              {loading
                ? "..."
                : customers.filter((c) => c.tier === "VIP").length}
            </h3>
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-none font-black italic text-[10px] pr-2 uppercase">
              Top Tier
            </Badge>
          </div>
        </Card>

        <Card className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-none shadow-sm ring-1 ring-slate-100 dark:ring-white/5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic mb-2 pr-2">
            Avg. Visits
          </p>
          <h3 className="text-4xl font-black italic text-orange-500">
            {loading
              ? "..."
              : customers.length > 0
                ? (
                    customers.reduce((acc, c) => acc + c.total_visits, 0) /
                    customers.length
                  ).toFixed(1)
                : "0"}
            x
          </h3>
        </Card>
      </div>

      {/* 2. SEARCH & FILTER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm ring-1 ring-slate-100 dark:ring-white/5">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic pr-2 leading-none">
            Database <span className="text-blue-600">Pelanggan</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic pr-2">
            Monitoring loyalitas dan pengeluaran pelanggan
          </p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari Nama atau No. HP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black italic text-xs pr-4 shadow-inner focus-visible:ring-2 focus-visible:ring-blue-600"
          />
        </div>
      </div>

      {/* 3. TABLE AREA */}
      <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden ring-1 ring-slate-100 dark:ring-white/5">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
            <TableRow className="border-none h-16 hover:bg-transparent">
              <TableHead className="pl-10 font-black uppercase text-[10px] italic tracking-[0.2em]">
                Profil Pelanggan
              </TableHead>
              <TableHead className="font-black uppercase text-[10px] italic tracking-[0.2em]">
                Status Tier
              </TableHead>
              <TableHead className="font-black uppercase text-[10px] italic tracking-[0.2em]">
                Kunjungan
              </TableHead>
              <TableHead className="font-black uppercase text-[10px] italic tracking-[0.2em]">
                Total Spend
              </TableHead>
              <TableHead className="pr-10 text-right font-black uppercase text-[10px] italic tracking-[0.2em]">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <TableRow
                  key={i}
                  className="border-slate-50 dark:border-white/5"
                >
                  <TableCell className="pl-10 py-6">
                    <Skeleton className="h-12 w-48 rounded-xl dark:bg-slate-800" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-20 rounded-lg dark:bg-slate-800" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16 rounded-lg dark:bg-slate-800" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-32 rounded-lg dark:bg-slate-800" />
                  </TableCell>
                  <TableCell className="pr-10 text-right">
                    <Skeleton className="h-10 w-10 ml-auto rounded-xl dark:bg-slate-800" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <p className="font-black italic text-slate-300 uppercase tracking-widest">
                    Belum ada data pelanggan
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((c) => (
                <TableRow
                  key={c.id}
                  className="group border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all"
                >
                  <TableCell className="pl-10 py-7">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-black italic shadow-inner text-lg">
                        {c.name.charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <span className="font-black uppercase italic tracking-tighter text-base pr-2 text-slate-900 dark:text-white block leading-none">
                          {c.name}
                        </span>
                        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold italic uppercase pr-1">
                          <Phone className="w-3 h-3 text-blue-500" /> {c.phone}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "font-black italic text-[8px] uppercase px-3 py-1 rounded-lg border-none pr-2 shadow-sm",
                        c.tier === "VIP"
                          ? "bg-purple-500 text-white animate-pulse"
                          : c.tier === "GOLD"
                            ? "bg-orange-500 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500",
                      )}
                    >
                      {c.tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-black italic text-slate-900 dark:text-white text-base">
                      {c.total_visits}{" "}
                      <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">
                        Kunjungan
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <span className="text-base font-black italic text-emerald-500">
                        Rp {formatIDR(c.total_spent)}
                      </span>
                      <p className="text-[9px] font-bold text-slate-400 uppercase italic pr-1">
                        Kontribusi Pendapatan
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="pr-10 text-right">
                    <Button
                      onClick={() => fetchDetail(c.id)}
                      variant="outline"
                      className="h-11 px-5 rounded-xl border-slate-200 dark:border-white/10 hover:bg-blue-600 hover:text-white transition-all font-black text-[10px] uppercase italic tracking-widest group/btn pr-3"
                    >
                      History{" "}
                      <ArrowUpRight className="w-4 h-4 ml-2 group-hover/btn:rotate-45 transition-transform" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 4. CUSTOMER PROFILE DIALOG */}
      <Dialog
        open={!!selectedId}
        onOpenChange={() => {
          setSelectedId(null);
          setCustomerDetail(null);
        }}
      >
        <DialogContent className="max-w-[95vw] md:max-w-3xl p-0 overflow-hidden border-none bg-white dark:bg-slate-950 rounded-[3rem] shadow-2xl font-plus-jakarta">
          {/* ACCESSIBILITY: Visually Hidden Header */}
          <VisuallyHidden.Root>
            <DialogHeader>
              <DialogTitle>
                Profil Pelanggan: {customerDetail?.name || "Memuat..."}
              </DialogTitle>
              <DialogDescription>
                Detail data statistik dan riwayat kunjungan pelanggan untuk
                manajemen loyalitas.
              </DialogDescription>
            </DialogHeader>
          </VisuallyHidden.Root>

          {loadingDetail ? (
            <div className="h-[500px] flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="font-black uppercase italic text-xs tracking-widest text-slate-400">
                Syncing Profile...
              </p>
            </div>
          ) : (
            customerDetail && (
              <div className="flex flex-col w-full max-h-[85vh]">
                {/* Profile Header */}
                <div className="bg-slate-900 p-10 text-white relative">
                  <div className="absolute right-[-5%] top-[-10%] opacity-10">
                    <User size={200} />
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="h-24 w-24 rounded-[2rem] bg-blue-600 flex items-center justify-center text-3xl font-black italic shadow-2xl ring-4 ring-white/10">
                      {customerDetail.name.charAt(0)}
                    </div>
                    <div className="text-center md:text-left space-y-2">
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <h2 className="text-4xl font-black uppercase italic tracking-tighter pr-2 leading-none">
                          {customerDetail.name}
                        </h2>
                        <Badge className="bg-blue-500 text-white font-black italic text-[10px] px-3 py-1 rounded-full uppercase pr-2">
                          {customerDetail.tier} MEMBER
                        </Badge>
                      </div>
                      <p className="text-slate-400 font-bold uppercase text-[11px] tracking-widest italic flex items-center justify-center md:justify-start gap-2 pr-2">
                        <Phone className="w-4 h-4 text-blue-400" />{" "}
                        {customerDetail.phone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CRM Statistics */}
                <div className="grid grid-cols-3 border-b dark:border-white/5 bg-slate-50 dark:bg-slate-900/50">
                  <div className="p-6 text-center border-r dark:border-white/5 space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic pr-1">
                      Kunjungan
                    </p>
                    <p className="text-xl font-black dark:text-white italic">
                      {customerDetail.total_visits}
                    </p>
                  </div>
                  <div className="p-6 text-center border-r dark:border-white/5 space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic pr-1">
                      Total Spending
                    </p>
                    <p className="text-xl font-black text-emerald-500 italic">
                      Rp {formatIDR(customerDetail.total_spent)}
                    </p>
                  </div>
                  <div className="p-6 text-center space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase italic pr-1">
                      Last Visit
                    </p>
                    <p className="text-xl font-black text-blue-500 italic">
                      {customerDetail.last_visit
                        ? format(new Date(customerDetail.last_visit), "dd MMM")
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Loyalty Milestone Box */}
                <div className="p-8 overflow-y-auto">
                  <div
                    className={cn(
                      "p-6 rounded-[2rem] border flex items-center gap-6",
                      customerDetail.tier === "VIP"
                        ? "bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/30"
                        : "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30",
                    )}
                  >
                    <div
                      className={cn(
                        "h-16 w-16 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg",
                        customerDetail.tier === "VIP"
                          ? "bg-purple-600 shadow-purple-500/40"
                          : "bg-blue-600 shadow-blue-500/40",
                      )}
                    >
                      <Medal size={32} />
                    </div>
                    <div>
                      <h4
                        className={cn(
                          "font-black italic uppercase text-base pr-2",
                          customerDetail.tier === "VIP"
                            ? "text-purple-900 dark:text-purple-400"
                            : "text-blue-900 dark:text-blue-400",
                        )}
                      >
                        Loyalty Insight
                      </h4>
                      <p
                        className={cn(
                          "text-[11px] font-bold uppercase tracking-tight italic pr-2 leading-relaxed",
                          customerDetail.tier === "VIP"
                            ? "text-purple-700/60 dark:text-purple-400/60"
                            : "text-blue-700/60 dark:text-blue-400/60",
                        )}
                      >
                        {customerDetail.tier === "VIP"
                          ? "Pelanggan ini adalah Whale. Berikan prioritas layanan dan diskon F&B khusus di kunjungan berikutnya."
                          : "Potensi pelanggan setia. Ajak pelanggan untuk boking paket durasi panjang untuk menaikkan tier ke VIP."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
