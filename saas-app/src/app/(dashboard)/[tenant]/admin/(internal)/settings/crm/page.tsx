"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Check, Loader2, Megaphone, Upload, Wand2 } from "lucide-react";

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tier?: string;
  total_visits?: number;
  total_spent?: number;
};

type ParsedCustomer = {
  name: string;
  phone: string;
  email?: string;
};

export default function SettingsCRMPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [blastMessage, setBlastMessage] = useState(
    "Halo {nama pelanggan}, sekarang kami sudah pakai Bookinaja. Simpan nomor ini agar kamu dapat update booking, promo, dan info penting.",
  );
  const [blastLoading, setBlastLoading] = useState(false);
  const [importText, setImportText] = useState("name,phone,email\n");
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/customers");
        setCustomers(res.data || []);
      } catch {
        toast.error("Gagal memuat pelanggan");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    return {
      total: customers.length,
      vip: customers.filter((c) => c.tier === "VIP").length,
    };
  }, [customers]);

  const parseImport = (text: string): ParsedCustomer[] => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length <= 1) return [];

    return lines.slice(1).map((line) => {
      const [name = "", phone = "", email = ""] = line.split(",").map((v) => v.trim());
      return { name, phone, email: email || undefined };
    }).filter((row) => row.name && row.phone);
  };

  const handleImport = async () => {
    const rows = parseImport(importText);
    if (rows.length === 0) {
      toast.error("Format import belum valid");
      return;
    }

    setImportLoading(true);
    let success = 0;
    try {
      for (const row of rows) {
        await api.post("/customers", {
          name: row.name,
          phone: row.phone,
          email: row.email,
        });
        success += 1;
      }
      toast.success(`${success} pelanggan berhasil diimpor`);
      const refreshed = await api.get("/customers");
      setCustomers(refreshed.data || []);
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : "Gagal mengimpor pelanggan";
      toast.error(message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleBlast = async () => {
    setBlastLoading(true);
    try {
      const res = await api.post("/admin/settings/customers/blast", {
        message: blastMessage,
      });
      toast.success(`Blast terkirim ke ${res.data?.sent || 0} pelanggan`);
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : "Gagal mengirim blast";
      toast.error(message);
    } finally {
      setBlastLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card className="rounded-[1.75rem] p-5 border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a]">
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Customers</div>
          {loading ? <Skeleton className="mt-2 h-10 w-24 bg-slate-100 dark:bg-white/5" /> : <div className="mt-2 text-3xl font-black italic dark:text-white">{stats.total}</div>}
        </Card>
        <Card className="rounded-[1.75rem] p-5 border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a]">
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">VIP</div>
          {loading ? <Skeleton className="mt-2 h-10 w-24 bg-slate-100 dark:bg-white/5" /> : <div className="mt-2 text-3xl font-black italic dark:text-white">{stats.vip}</div>}
        </Card>
        <Card className="rounded-[1.75rem] p-5 border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a]">
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Mode</div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-500/5 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-blue-600">
            <Wand2 className="h-3 w-3" />
            CRM & Marketing
          </div>
        </Card>
      </div>

      <Card className="rounded-[2rem] border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-5 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Upload className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <Badge className="bg-blue-600 text-white border-none text-[9px] font-black uppercase tracking-widest">
              Migrasi Pelanggan
            </Badge>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">
              Import database lama
            </h2>
            <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400 font-medium">
              Paste data CSV `name,phone,email` untuk pindahkan pelanggan lama ke Bookinaja. Setiap baris akan di-upsert berdasarkan nomor WhatsApp.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="min-h-48 rounded-[1.5rem] border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 font-mono text-sm"
            placeholder="name,phone,email"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Format: <span className="text-blue-600">nama, nomor_wa, email</span>
            </div>
            <Button
              onClick={handleImport}
              disabled={importLoading}
              className="h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase italic tracking-[0.2em] px-5"
            >
              {importLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Import Pelanggan
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-[2rem] border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0a] p-5 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] font-black uppercase tracking-widest">
              WhatsApp Blast
            </Badge>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">
              Announce tenant sudah pakai Bookinaja
            </h2>
            <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400 font-medium">
              Kirim pesan ke semua pelanggan yang punya nomor WhatsApp. Pakai placeholder <span className="text-blue-600">{`{nama pelanggan}`}</span> untuk personalisasi.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <Textarea
            value={blastMessage}
            onChange={(e) => setBlastMessage(e.target.value)}
            className="min-h-40 rounded-[1.5rem] border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-sm"
            placeholder="Tulis pesan announcement..."
          />
          <Button
            onClick={handleBlast}
            disabled={blastLoading}
            className="h-12 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-black uppercase italic tracking-[0.2em] px-5"
          >
            {blastLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Blast ke Semua Pelanggan
          </Button>
        </div>
      </Card>
    </div>
  );
}
