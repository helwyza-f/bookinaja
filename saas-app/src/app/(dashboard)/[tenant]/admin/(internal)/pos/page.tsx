"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Utensils,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Clock,
  User,
  PackageSearch,
  Loader2,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function POSPage() {
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [searchMenu, setSearchMenu] = useState("");

  const fetchData = async () => {
    try {
      const [sessionsRes, menuRes] = await Promise.all([
        api.get("/bookings/pos/active"),
        api.get("/fnb"),
      ]);
      setActiveSessions(sessionsRes.data || []);
      setMenuItems(menuRes.data || []);
    } catch (err) {
      toast.error("Gagal sinkronisasi data POS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddOrder = async (item: any) => {
    if (!selectedSession) return toast.error("Pilih unit/sesi terlebih dahulu");

    try {
      await api.post(`/bookings/pos/order/${selectedSession.id}`, {
        fnb_item_id: item.id,
        quantity: 1,
      });
      toast.success(`${item.name} ditambahkan`);
      // Refresh detail session untuk update billing
      const detailRes = await api.get(`/bookings/${selectedSession.id}`);
      setSelectedSession(detailRes.data);
      // Update juga di list kiri
      fetchData();
    } catch (err) {
      toast.error("Gagal menambah pesanan");
    }
  };

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] gap-6 p-2 animate-in fade-in duration-500 font-plus-jakarta">
      {/* LEFT: ACTIVE UNITS GRID */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              Live <span className="text-blue-600">Sessions</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
              Monitor unit yang sedang aktif
            </p>
          </div>
          <Badge className="bg-emerald-500 text-white border-none font-black px-4 py-1.5 rounded-full italic animate-pulse">
            {activeSessions.length} IN-USE
          </Badge>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-300 gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-black italic text-xs tracking-widest">
              Scanning Units...
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeSessions.map((session) => (
              <Card
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={cn(
                  "cursor-pointer rounded-[2rem] border-none transition-all duration-300 overflow-hidden",
                  selectedSession?.id === session.id
                    ? "ring-4 ring-blue-600 shadow-2xl scale-[0.98]"
                    : "bg-white hover:bg-slate-50 ring-1 ring-slate-100 shadow-sm",
                )}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner",
                        selectedSession?.id === session.id
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-400",
                      )}
                    >
                      <Utensils className="w-5 h-5" />
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-black border-slate-200 italic"
                    >
                      {session.resource_name}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase italic line-clamp-1 truncate">
                      {session.customer_name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-bold italic uppercase">
                        {new Date(session.start_time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      Bill Amount
                    </p>
                    <p className="text-lg font-black text-blue-600 italic tracking-tighter">
                      Rp{formatIDR(session.grand_total)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: POS CONSOLE (MENU & BILLING) */}
      <div className="w-full lg:w-[450px] bg-white rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100 ring-8 ring-slate-50">
        {selectedSession ? (
          <>
            {/* SESSION HEADER */}
            <div className="p-8 bg-slate-900 text-white space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] italic">
                    Current Order
                  </p>
                  <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">
                    {selectedSession.customer_name}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSession(null)}
                  className="rounded-full text-slate-500 hover:text-white"
                >
                  ✕
                </Button>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-xs font-bold italic opacity-70">
                  <Utensils className="w-4 h-4" />{" "}
                  {selectedSession.resource_name}
                </div>
              </div>
            </div>

            {/* MENU SELECTION */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="text"
                  placeholder="CARI MENU..."
                  onChange={(e) => setSearchMenu(e.target.value.toUpperCase())}
                  className="w-full h-12 bg-slate-50 rounded-2xl pl-10 pr-4 text-xs font-black italic border-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <ScrollArea className="flex-1 pr-4">
                <div className="grid grid-cols-2 gap-3">
                  {menuItems
                    .filter(
                      (m) => m.name.includes(searchMenu) && m.is_available,
                    )
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleAddOrder(item)}
                        className="flex flex-col text-left group p-4 rounded-3xl bg-slate-50 hover:bg-blue-600 hover:text-white transition-all duration-300"
                      >
                        <span className="text-[10px] font-black uppercase opacity-40 group-hover:opacity-100 mb-1">
                          {item.category}
                        </span>
                        <span className="text-xs font-black italic uppercase line-clamp-1 mb-2 tracking-tight">
                          {item.name}
                        </span>
                        <span className="mt-auto text-xs font-black tracking-tighter">
                          Rp{formatIDR(item.price)}
                        </span>
                      </button>
                    ))}
                </div>
              </ScrollArea>
            </div>

            {/* BILLING SUMMARY */}
            <div className="p-8 bg-slate-50 border-t border-slate-100 rounded-t-[3rem] space-y-6">
              <div className="space-y-3">
                {selectedSession.orders?.map((order: any) => (
                  <div
                    key={order.id}
                    className="flex justify-between items-center text-xs"
                  >
                    <div className="flex gap-2 items-center">
                      <span className="w-6 h-6 flex items-center justify-center bg-white rounded-lg font-black text-blue-600">
                        {order.quantity}x
                      </span>
                      <span className="font-bold text-slate-600 uppercase italic">
                        {order.item_name}
                      </span>
                    </div>
                    <span className="font-black text-slate-900 italic">
                      Rp{formatIDR(order.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t-2 border-dashed border-slate-200 flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Total Bill
                  </p>
                  <p className="text-3xl font-black text-slate-900 italic tracking-tighter">
                    <span className="text-blue-600 text-lg mr-1">Rp</span>
                    {formatIDR(selectedSession.grand_total)}
                  </p>
                </div>
                <Button className="h-14 px-8 rounded-2xl bg-blue-600 font-black uppercase italic tracking-widest text-[11px] shadow-xl shadow-blue-200">
                  Payment <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-6">
            <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center">
              <PackageSearch className="w-10 h-10 text-slate-200" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black italic uppercase tracking-tighter">
                No Active Session
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase leading-relaxed">
                Pilih salah satu unit yang sedang digunakan untuk mulai mencatat
                pesanan F&B.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
