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
  ArrowUpRight,
  Loader2,
  Medal,
  Users,
  TrendingUp,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data || []);
    } catch (err) {
      toast.error("Gagal sinkronisasi database pelanggan");
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
      toast.error("Gagal memuat profil");
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

  const stats = useMemo(() => {
    const total = customers.length;
    const vips = customers.filter((c) => c.tier === "VIP").length;
    const avgVisits =
      total > 0
        ? (
            customers.reduce((acc, c) => acc + c.total_visits, 0) / total
          ).toFixed(1)
        : "0";
    return { total, vips, avgVisits };
  }, [customers]);

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20 animate-in fade-in duration-500 px-4 mt-6 font-plus-jakarta">
      {/* 1. COMPACT ANALYTICS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 rounded-[1.5rem] bg-slate-950 text-white border-none shadow-xl relative overflow-hidden group">
          <Users className="absolute right-[-5%] top-[-10%] opacity-10 w-24 h-24" />
          <div className="relative z-10">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 italic mb-1">
              Total Database
            </p>
            <h3 className="text-3xl font-[1000] italic leading-none">
              {loading ? "..." : stats.total}{" "}
              <span className="text-[10px] not-italic opacity-40 uppercase">
                Clients
              </span>
            </h3>
          </div>
        </Card>

        <Card className="p-6 rounded-[1.5rem] bg-white dark:bg-slate-900 border-[0.5px] border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic mb-1">
                VIP Retention
              </p>
              <h3 className="text-3xl font-[1000] italic text-blue-600 leading-none">
                {loading ? "..." : stats.vips}
              </h3>
            </div>
            <Badge className="bg-purple-500/10 text-purple-600 border-none font-black italic text-[9px] uppercase px-2 py-0.5">
              Top Tier
            </Badge>
          </div>
        </Card>

        <Card className="p-6 rounded-[1.5rem] bg-white dark:bg-slate-900 border-[0.5px] border-slate-200 dark:border-white/5 shadow-sm">
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic mb-1">
            Avg. Loyalty Rank
          </p>
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-[1000] italic text-orange-500 leading-none">
              {stats.avgVisits}x
            </h3>
            <TrendingUp size={16} className="text-emerald-500 opacity-50" />
          </div>
        </Card>
      </div>

      {/* 2. COMPACT HEADER & SEARCH */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border-[0.5px] border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
            <UserCheck size={20} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-[1000] italic uppercase tracking-tighter leading-none dark:text-white">
              CRM <span className="text-blue-600">Terminal.</span>
            </h1>
            <p className="hidden sm:block text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] italic mt-1.5">
              Loyalty Management & Spend Tracking
            </p>
          </div>
        </div>

        <div className="relative w-full lg:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-black italic text-xs shadow-inner focus-visible:ring-2 focus-visible:ring-blue-600/20"
          />
        </div>
      </div>

      {/* 3. TABLE AREA */}
      <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden ring-1 ring-slate-100 dark:ring-white/5">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
            <TableRow className="border-none h-14 hover:bg-transparent">
              <TableHead className="pl-8 font-[1000] uppercase text-[9px] italic tracking-widest text-slate-400">
                Customer Identity
              </TableHead>
              <TableHead className="font-[1000] uppercase text-[9px] italic tracking-widest text-slate-400">
                Tier Status
              </TableHead>
              <TableHead className="font-[1000] uppercase text-[9px] italic tracking-widest text-slate-400">
                Activity
              </TableHead>
              <TableHead className="font-[1000] uppercase text-[9px] italic tracking-widest text-slate-400">
                Contribution
              </TableHead>
              <TableHead className="pr-8 text-right font-[1000] uppercase text-[9px] italic tracking-widest text-slate-400">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <TableRow
                  key={i}
                  className="border-slate-50 dark:border-white/5"
                >
                  <TableCell className="pl-8 py-5">
                    <Skeleton className="h-10 w-48 rounded-lg" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20 rounded-md" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16 rounded-md" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-32 rounded-md" />
                  </TableCell>
                  <TableCell className="pr-8 text-right">
                    <Skeleton className="h-10 w-10 ml-auto rounded-lg" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-64 text-center text-slate-300 font-black italic uppercase tracking-widest"
                >
                  Database Empty
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((c) => (
                <TableRow
                  key={c.id}
                  className="group border-slate-50 dark:border-white/5 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors cursor-default"
                >
                  <TableCell className="pl-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner font-black italic">
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-[1000] uppercase italic tracking-tight text-sm text-slate-900 dark:text-white leading-none mb-1">
                          {c.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 italic">
                          ID: {c.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "font-black italic text-[8px] uppercase px-3 py-0.5 rounded-lg border-none shadow-sm",
                        c.tier === "VIP"
                          ? "bg-purple-600 text-white animate-pulse"
                          : c.tier === "GOLD"
                            ? "bg-orange-500 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500",
                      )}
                    >
                      {c.tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-[1000] italic text-slate-900 dark:text-white text-sm leading-none">
                        {c.total_visits}{" "}
                        <span className="text-[8px] text-slate-400 font-black uppercase not-italic">
                          Visits
                        </span>
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold italic mt-1">
                        <Phone size={10} className="text-blue-500" /> {c.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <span className="text-sm font-[1000] italic text-emerald-500">
                        Rp {formatIDR(c.total_spent)}
                      </span>
                      <p className="text-[8px] font-black text-slate-400 uppercase italic opacity-60">
                        Grand Lifetime Spend
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="pr-8 text-right">
                    <Button
                      onClick={() => fetchDetail(c.id)}
                      variant="outline"
                      className="h-10 px-4 rounded-xl border-slate-200 dark:border-white/10 hover:bg-blue-600 hover:text-white transition-all font-black text-[9px] uppercase italic tracking-widest gap-2 group/btn"
                    >
                      Profile{" "}
                      <ArrowUpRight
                        size={14}
                        className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform"
                      />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 4. CUSTOMER PROFILE DIALOG (ELITE STYLE) */}
      <Dialog
        open={!!selectedId}
        onOpenChange={() => {
          setSelectedId(null);
          setCustomerDetail(null);
        }}
      >
        <DialogContent className="max-w-[95vw] md:max-w-3xl p-0 overflow-hidden border-none bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl font-plus-jakarta">
          <VisuallyHidden.Root>
            <DialogHeader>
              <DialogTitle>Customer Analytics</DialogTitle>
              <DialogDescription>Detailed loyalty profile</DialogDescription>
            </DialogHeader>
          </VisuallyHidden.Root>

          {loadingDetail ? (
            <div className="h-[400px] flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="font-black uppercase italic text-[10px] tracking-widest text-slate-400">
                Synchronizing Identity...
              </p>
            </div>
          ) : (
            customerDetail && (
              <div className="flex flex-col w-full">
                <div className="bg-slate-950 p-8 text-white relative overflow-hidden">
                  <div className="absolute right-[-5%] top-[-20%] opacity-10">
                    <User size={240} />
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="h-20 w-20 rounded-[1.8rem] bg-blue-600 flex items-center justify-center text-3xl font-[1000] italic shadow-2xl ring-4 ring-white/10">
                      {customerDetail.name.charAt(0)}
                    </div>
                    <div className="text-center md:text-left space-y-1">
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <h2 className="text-3xl lg:text-4xl font-[1000] uppercase italic tracking-tighter leading-none">
                          {customerDetail.name}
                        </h2>
                        <Badge className="bg-blue-500 text-white font-black italic text-[9px] px-3 py-1 rounded-lg uppercase">
                          {customerDetail.tier} MEMBER
                        </Badge>
                      </div>
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic flex items-center justify-center md:justify-start gap-2">
                        <Phone className="w-3 h-3 text-blue-400" />{" "}
                        {customerDetail.phone}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 border-b-[0.5px] border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50">
                  <div className="p-5 text-center border-r-[0.5px] border-slate-100 dark:border-white/5">
                    <p className="text-[7px] font-black text-slate-400 uppercase italic mb-1">
                      Lifetime Visits
                    </p>
                    <p className="text-xl font-[1000] dark:text-white italic">
                      {customerDetail.total_visits}
                    </p>
                  </div>
                  <div className="p-5 text-center border-r-[0.5px] border-slate-100 dark:border-white/5">
                    <p className="text-[7px] font-black text-slate-400 uppercase italic mb-1">
                      Total Revenue
                    </p>
                    <p className="text-xl font-[1000] text-emerald-500 italic">
                      Rp{formatIDR(customerDetail.total_spent)}
                    </p>
                  </div>
                  <div className="p-5 text-center">
                    <p className="text-[7px] font-black text-slate-400 uppercase italic mb-1">
                      Last Interaction
                    </p>
                    <p className="text-xl font-[1000] text-blue-500 italic">
                      {customerDetail.last_visit
                        ? format(new Date(customerDetail.last_visit), "dd MMM")
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="p-8">
                  <div
                    className={cn(
                      "p-6 rounded-[2rem] border-[0.5px] flex items-center gap-5 transition-all shadow-sm",
                      customerDetail.tier === "VIP"
                        ? "bg-purple-50/50 dark:bg-purple-900/10 border-purple-200/50"
                        : "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50",
                    )}
                  >
                    <div
                      className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg",
                        customerDetail.tier === "VIP"
                          ? "bg-purple-600"
                          : "bg-blue-600",
                      )}
                    >
                      <Medal size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-black italic uppercase text-xs text-slate-900 dark:text-slate-100">
                        Customer Insight
                      </h4>
                      <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500 leading-relaxed italic">
                        {customerDetail.tier === "VIP"
                          ? "High-value client. Prioritize terminal availability and offer premium FnB complimentary deals."
                          : "Growing loyalty detected. Encourage long-duration bookings to elevate tier status to VIP."}
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
