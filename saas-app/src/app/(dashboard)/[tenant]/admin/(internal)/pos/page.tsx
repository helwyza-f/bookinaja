"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, ChevronRight, Loader2, PackageSearch } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { POSControlHub } from "@/components/pos/pos-control-hub";

export default function POSPage() {
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);

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

  const refreshSelectedSession = async (id: string) => {
    const res = await api.get(`/bookings/${id}`);
    setSelectedSession(res.data);

    // Update Grand Total di list kiri secara manual tanpa hit API lagi
    setActiveSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, grand_total: res.data.grand_total } : s,
      ),
    );
  };

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] gap-6 p-2 animate-in fade-in duration-500 font-plus-jakarta">
      {/* LEFT: GRID SESSION AKTIF */}
      <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-hide">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 sticky top-0 bg-[#F8FAFC]/50 backdrop-blur-md z-10">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
              Live <span className="text-blue-600">Sessions</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic mt-1">
              Monitoring Real-time
            </p>
          </div>
          <Badge className="bg-emerald-500 text-white border-none font-black px-4 py-2 rounded-full italic animate-pulse shadow-lg">
            {activeSessions.length} SESSION ACTIVE
          </Badge>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-300 gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-black italic text-[10px] tracking-widest uppercase">
              Syncing...
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
            {activeSessions.map((session) => (
              <Card
                key={session.id}
                onClick={() => refreshSelectedSession(session.id)}
                className={cn(
                  "group cursor-pointer rounded-[2.5rem] border-none transition-all duration-500 overflow-hidden relative shadow-sm",
                  selectedSession?.id === session.id
                    ? "ring-4 ring-blue-600 shadow-2xl scale-[0.98]"
                    : "bg-white hover:bg-slate-50 ring-1 ring-slate-100",
                )}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors",
                        selectedSession?.id === session.id
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-400",
                      )}
                    >
                      <Zap
                        className={cn(
                          "w-6 h-6",
                          selectedSession?.id === session.id && "fill-current",
                        )}
                      />
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[8px] font-black border-slate-200 uppercase italic px-2"
                    >
                      {session.resource_name}
                    </Badge>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-black uppercase italic truncate text-slate-900 group-hover:text-blue-600 transition-colors">
                      {session.customer_name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold italic text-[9px]">
                      <Clock className="w-3 h-3" />
                      <span>
                        START:{" "}
                        {new Date(session.start_time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">
                      Bill
                    </p>
                    <p className="text-lg font-black text-slate-900 italic tracking-tighter leading-none">
                      Rp{formatIDR(session.grand_total)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: POS CONTROL HUB (MODULAR COMPONENT) */}
      {selectedSession ? (
        <POSControlHub
          session={selectedSession}
          menuItems={menuItems}
          onRefresh={refreshSelectedSession}
          onClose={() => setSelectedSession(null)}
        />
      ) : (
        <div className="w-full lg:w-[480px] bg-white rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-center p-12 text-center gap-8 border border-slate-100 ring-8 ring-slate-50/50">
          <div className="relative">
            <div className="w-28 h-28 rounded-[2.5rem] bg-slate-50 flex items-center justify-center shadow-inner">
              <PackageSearch className="w-12 h-12 text-slate-200" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-2 rounded-2xl shadow-xl border-4 border-white">
              <Zap className="w-5 h-5 fill-current" />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">
              Control Hub
            </h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed max-w-[280px] mx-auto italic">
              Pilih sesi aktif untuk mengelola pesanan, waktu, dan pembayaran.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
