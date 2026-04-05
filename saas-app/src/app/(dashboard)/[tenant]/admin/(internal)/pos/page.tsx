"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, Loader2, MonitorPlay, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { POSControlHub } from "@/components/pos/pos-control-hub";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { format } from "date-fns";

export default function POSPage() {
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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

  const openSessionDetail = async (id: string) => {
    try {
      const res = await api.get(`/bookings/${id}`);
      setSelectedSession(res.data);
      setIsSheetOpen(true);
    } catch (err) {
      toast.error("Gagal memuat detail sesi");
    }
  };

  const refreshSelectedSession = async (id: string) => {
    const res = await api.get(`/bookings/${id}`);
    setSelectedSession(res.data);
    setActiveSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, grand_total: res.data.grand_total } : s,
      ),
    );
  };

  const formatIDR = (val: number) => new Intl.NumberFormat("id-ID").format(val);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-plus-jakarta pb-20">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none dark:text-white">
            Kasir <span className="text-blue-600">Terminal</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] italic mt-2">
            Real-time Session Control
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge className="bg-emerald-500 text-white border-none font-black px-5 py-2.5 rounded-2xl italic animate-pulse shadow-lg shadow-emerald-500/20">
            {activeSessions.length} UNIT AKTIF
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center text-slate-300 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <span className="font-black italic text-xs tracking-widest uppercase pr-2">
            Syncing Data...
          </span>
        </div>
      ) : activeSessions.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center text-center gap-4 bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/10">
          <MonitorPlay size={64} className="text-slate-100 dark:text-white/5" />
          <p className="font-black italic text-slate-400 uppercase tracking-widest">
            Tidak ada sesi berjalan
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
          {activeSessions.map((session) => (
            <Card
              key={session.id}
              onClick={() => openSessionDetail(session.id)}
              className={cn(
                "group cursor-pointer rounded-[2.5rem] border-none transition-all duration-500 overflow-hidden relative shadow-sm hover:shadow-2xl hover:-translate-y-1 bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-white/5",
              )}
            >
              <CardContent className="p-6 space-y-5">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-inner group-hover:bg-blue-600 transition-colors duration-500">
                    <Zap className="w-6 h-6 text-slate-400 dark:text-slate-500 group-hover:text-white group-hover:fill-current" />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-black border-slate-200 dark:border-white/10 uppercase italic px-3 py-1 text-slate-500 pr-2"
                  >
                    {session.resource_name}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black uppercase italic truncate text-slate-900 dark:text-white pr-2">
                    {session.customer_name}
                  </h3>
                  <div className="flex items-center gap-2 text-slate-400 font-bold italic text-[10px]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      MULAI: {format(new Date(session.start_time), "HH:mm")}
                    </span>
                  </div>
                </div>
                <div className="pt-4 border-t border-dashed border-slate-200 dark:border-white/10 flex justify-between items-end">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">
                      Live Bill
                    </p>
                    <p className="text-lg font-black text-slate-900 dark:text-blue-400 italic tracking-tighter leading-none pr-1">
                      Rp{formatIDR(session.grand_total)}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <ChevronRight
                      size={16}
                      className="text-slate-300 group-hover:text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* DETAIL SESSION SHEET (RIGHT PANEL) */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="p-0 border-none bg-transparent sm:max-w-[480px] w-[95%]">
          {selectedSession && (
            <POSControlHub
              session={selectedSession}
              menuItems={menuItems}
              onRefresh={refreshSelectedSession}
              onClose={() => setIsSheetOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
