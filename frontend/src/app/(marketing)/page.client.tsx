// src/app/(marketing)/page.client.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Gamepad2,
  Globe2,
  LockKeyhole,
  MonitorPlay,
  MousePointer2,
  Play,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Star,
  TimerReset,
  TrendingUp,
  UsersRound,
  Video,
  WalletCards,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type DemoTab = "monitor" | "booking" | "payment" | "staff" | "report";
type UseCaseKey =
  | "gaming"
  | "studio"
  | "sport"
  | "office"
  | "barber"
  | "pool"
  | "vr";

function useReveal(threshold = 0.12) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, threshold]);

  return [setNode, visible] as const;
}

function revealStyle(visible: boolean, delay = 0): CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(26px)",
    transition: `opacity 650ms cubic-bezier(.2,.8,.2,1) ${delay}s, transform 650ms cubic-bezier(.2,.8,.2,1) ${delay}s`,
  };
}

function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
}: {
  target: number;
  suffix?: string;
  prefix?: string;
}) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useReveal(0.35);

  useEffect(() => {
    if (!visible) return;

    let frame = 0;
    const totalFrames = 70;
    const timer = window.setInterval(() => {
      frame += 1;
      const progress = 1 - Math.pow(1 - frame / totalFrames, 3);
      setCount(Math.round(target * progress));
      if (frame >= totalFrames) window.clearInterval(timer);
    }, 18);

    return () => window.clearInterval(timer);
  }, [target, visible]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString("id-ID")}
      {suffix}
    </span>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  align?: "center" | "left";
}) {
  return (
    <div
      className={`mx-auto max-w-3xl space-y-4 ${
        align === "center" ? "text-center" : "text-left"
      }`}
    >
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-500 dark:text-blue-300 ${
          align === "center" ? "mx-auto" : ""
        }`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {eyebrow}
      </div>
      <h2 className="font-[var(--font-syne)] text-4xl font-black uppercase leading-[0.9] tracking-[-0.055em] text-slate-950 dark:text-white sm:text-5xl md:text-6xl">
        {title}
      </h2>
      <p className="mx-auto max-w-2xl text-base font-medium leading-7 text-slate-600 dark:text-slate-300">
        {description}
      </p>
    </div>
  );
}

function PrimaryCta({
  children = "Coba Gratis 30 Hari",
}: {
  children?: string;
}) {
  return (
    <Link href="/signup" className="w-full sm:w-auto">
      <Button className="h-14 w-full rounded-2xl bg-blue-600 px-8 text-[12px] font-black uppercase tracking-[0.16em] text-white shadow-2xl shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-500 sm:w-auto">
        {children}
        <ArrowUpRight className="ml-2 h-4 w-4" />
      </Button>
    </Link>
  );
}

function SecondaryCta() {
  return (
    <Link href="/demos" className="w-full sm:w-auto">
      <Button
        variant="outline"
        className="h-14 w-full rounded-2xl border-slate-300 bg-white/70 px-7 text-[12px] font-black uppercase tracking-[0.16em] text-slate-900 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 sm:w-auto"
      >
        <Play className="mr-2 h-4 w-4 fill-current" />
        Lihat Demo 2 Menit
      </Button>
    </Link>
  );
}

function TrustMicrocopy() {
  return (
    <div className="flex flex-wrap justify-center gap-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 sm:gap-5">
      {["Tanpa kartu kredit", "Gratis 30 hari", "Setup cepat"].map((item) => (
        <span key={item} className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
          {item}
        </span>
      ))}
    </div>
  );
}

function AvatarStack() {
  const avatars = [
    "bg-blue-500",
    "bg-cyan-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
      <div className="flex -space-x-3">
        {avatars.map((color, index) => (
          <div
            key={color}
            className={`grid h-10 w-10 place-items-center rounded-full border-4 border-white text-[11px] font-black text-white shadow-lg dark:border-slate-950 ${color}`}
          >
            {String.fromCharCode(65 + index)}
          </div>
        ))}
      </div>
      <div className="text-center text-sm font-bold text-slate-700 dark:text-slate-200 sm:text-left">
        2.400+ bisnis aktif di Indonesia
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          rental, studio, venue, sport, dan service appointment
        </div>
      </div>
    </div>
  );
}

const demoTabs: Array<{ key: DemoTab; label: string; icon: ReactNode }> = [
  {
    key: "monitor",
    label: "Live Monitor",
    icon: <Activity className="h-4 w-4" />,
  },
  {
    key: "booking",
    label: "Booking",
    icon: <CalendarClock className="h-4 w-4" />,
  },
  { key: "payment", label: "Bayar", icon: <WalletCards className="h-4 w-4" /> },
  { key: "staff", label: "Staff", icon: <UsersRound className="h-4 w-4" /> },
  { key: "report", label: "Laporan", icon: <BarChart3 className="h-4 w-4" /> },
];

function SlotGrid({ compact = false }: { compact?: boolean }) {
  const slots = [
    ["PS-01", "Live", "bg-blue-500/20 text-blue-300 border-blue-400/30"],
    [
      "PS-02",
      "Kosong",
      "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
    ],
    ["PC-01", "DP", "bg-amber-500/15 text-amber-300 border-amber-400/25"],
    ["PC-02", "Live", "bg-blue-500/20 text-blue-300 border-blue-400/30"],
    ["VIP", "Ditahan", "bg-rose-500/15 text-rose-300 border-rose-400/25"],
    [
      "VR-02",
      "Kosong",
      "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
    ],
  ];

  return (
    <div
      className={`grid ${compact ? "grid-cols-3 gap-2" : "grid-cols-2 gap-3 sm:grid-cols-3"}`}
    >
      {slots.map(([name, status, color], index) => (
        <div
          key={name}
          className={`rounded-2xl border p-3 ${color}`}
          style={{ animation: `demo-pop 540ms ease ${index * 90}ms both` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-[0.16em]">
              {name}
            </span>
            <span className="h-2 w-2 rounded-full bg-current" />
          </div>
          <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] opacity-80">
            {status}
          </div>
        </div>
      ))}
    </div>
  );
}

function MonitorPanel() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Occupancy", "76%", "w-[76%]"],
          ["Bayar Masuk", "Rp8,4 jt", "w-[88%]"],
          ["Antrian", "12", "w-[42%]"],
        ].map(([label, value, width]) => (
          <div
            key={label}
            className="rounded-3xl border border-white/10 bg-white/[0.06] p-4"
          >
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
              {label}
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-white">
              {value}
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full bg-blue-400 ${width} animate-fill`}
              />
            </div>
          </div>
        ))}
      </div>
      <SlotGrid />
    </div>
  );
}

function BookingPanel() {
  const rows = [
    ["Rafi", "PS-01", "14:00", "DP paid"],
    ["Maya", "Studio A", "15:30", "Confirmed"],
    ["Doni", "Futsal 2", "17:00", "Pending"],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
      <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200">
              Booking Hari Ini
            </div>
            <div className="mt-1 text-2xl font-black text-white">34 order</div>
          </div>
          <CalendarClock className="h-9 w-9 text-blue-300" />
        </div>
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={row.join("-")}
              className="grid grid-cols-4 items-center gap-2 rounded-2xl bg-slate-950/35 px-3 py-3 text-xs font-bold text-white"
              style={{
                animation: `slide-in-right 620ms ease ${index * 140}ms both`,
              }}
            >
              <span>{row[0]}</span>
              <span className="text-white/55">{row[1]}</span>
              <span className="text-white/55">{row[2]}</span>
              <span className="rounded-full bg-blue-500/20 px-2 py-1 text-[10px] uppercase tracking-wide text-blue-200">
                {row[3]}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
          Calendar View
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 28 }).map((_, index) => (
            <div
              key={index}
              className={`aspect-square rounded-xl ${
                [2, 5, 8, 12, 13, 17, 20, 21, 24].includes(index)
                  ? "bg-blue-500 text-white"
                  : "bg-white/8 text-white/40"
              } grid place-items-center text-[10px] font-black`}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PaymentPanel() {
  const payments = [
    ["DP Studio A", "Rp350.000", "QRIS", "Tercatat"],
    ["Pelunasan PS-01", "Rp125.000", "Cash", "Masuk POS"],
    ["Booking Futsal 2", "Rp220.000", "Transfer", "Menunggu cek"],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
      <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">
              Pembayaran Hari Ini
            </div>
            <div className="mt-1 text-3xl font-black text-white">Rp8,4 jt</div>
          </div>
          <WalletCards className="h-9 w-9 text-emerald-300" />
        </div>
        <div className="space-y-2">
          {payments.map((payment, index) => (
            <div
              key={payment.join("-")}
              className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl bg-slate-950/35 px-4 py-3 text-sm font-bold text-white"
              style={{
                animation: `slide-in-right 620ms ease ${index * 130}ms both`,
              }}
            >
              <div>
                <div>{payment[0]}</div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                  {payment[2]} · {payment[3]}
                </div>
              </div>
              <div className="text-right font-black text-emerald-300">
                {payment[1]}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
          Metode aktif
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {["QRIS", "Transfer", "Cash", "DP"].map((method) => (
            <div
              key={method}
              className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-4 text-center text-xs font-black uppercase tracking-[0.16em] text-emerald-200"
            >
              {method}
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl bg-emerald-400/10 p-4">
          <div className="flex items-center justify-between text-sm font-black text-white">
            <span>Tercatat otomatis</span>
            <span className="text-emerald-300">Realtime</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-full rounded-full bg-emerald-400 animate-fill" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1fr]">
      <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200">
              Hak Akses Tim
            </div>
            <div className="mt-1 text-2xl font-black text-white">
              Owner tetap pegang kontrol
            </div>
          </div>
          <ShieldCheck className="h-9 w-9 text-blue-300" />
        </div>
        {[
          ["Owner", "Laporan, harga, setting", "8 menu"],
          ["Kasir", "Booking, POS, pembayaran", "3 menu"],
          ["Staff", "Check-in dan sesi aktif", "1 menu"],
        ].map(([role, access, menu], index) => (
          <div
            key={role}
            className="mb-2 flex items-center justify-between rounded-2xl bg-slate-950/35 px-4 py-3"
            style={{
              animation: `slide-in-right 620ms ease ${index * 120}ms both`,
            }}
          >
            <div>
              <div className="text-sm font-black text-white">{role}</div>
              <div className="mt-1 text-xs font-medium text-white/45">
                {access}
              </div>
            </div>
            <div className="rounded-full bg-blue-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-blue-200">
              {menu}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
          Aktivitas staff
        </div>
        <div className="mt-5 space-y-3">
          {[
            ["Kasir Rini", "Terima DP Studio A", "15:28"],
            ["Staff Doni", "Check-in PS-01", "15:31"],
            ["Owner", "Export laporan harian", "15:40"],
            ["Kasir Rini", "Pelunasan PC-02", "15:46"],
          ].map(([name, action, time], index) => (
            <div
              key={`${name}-${time}`}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/35 p-3"
              style={{ animation: `demo-pop 520ms ease ${index * 90}ms both` }}
            >
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/20 text-xs font-black text-blue-200">
                {name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-white">{action}</div>
                <div className="text-xs font-medium text-white/40">{name}</div>
              </div>
              <div className="text-xs font-black text-white/45">{time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1fr]">
      <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
          Revenue
        </div>
        <div className="mt-2 text-4xl font-black tracking-tight text-white">
          Rp128jt
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300">
          <TrendingUp className="h-3.5 w-3.5" />
          naik 31%
        </div>
        <div className="mt-6 flex h-32 items-end gap-2">
          {[36, 54, 48, 70, 62, 82, 96].map((height, index) => (
            <div
              key={height + index}
              className="flex-1 rounded-t-2xl bg-gradient-to-t from-blue-700 to-blue-300"
              style={{
                height: `${height}%`,
                animation: `bar-rise 720ms ease ${index * 80}ms both`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
              Owner Summary
            </div>
            <div className="mt-1 text-xl font-black text-white">
              Semua cabang terkendali
            </div>
          </div>
          <BadgeCheck className="h-9 w-9 text-blue-300" />
        </div>
        {[
          ["Booking selesai", "1.204"],
          ["Pembayaran tercatat", "Realtime"],
          ["Staff activity", "842 log"],
          ["Jam ramai", "19:00"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between border-t border-white/10 py-3"
          >
            <span className="text-sm font-medium text-white/55">{label}</span>
            <span className="text-sm font-black text-white">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimatedDashboard() {
  const [activeTab, setActiveTab] = useState<DemoTab>("monitor");

  useEffect(() => {
    const order: DemoTab[] = [
      "monitor",
      "booking",
      "payment",
      "staff",
      "report",
    ];
    const timer = window.setInterval(() => {
      setActiveTab(
        (current) => order[(order.indexOf(current) + 1) % order.length],
      );
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto max-w-6xl">
      <div className="absolute -left-4 top-16 z-20 hidden w-64 rounded-3xl border border-blue-300/30 bg-slate-950/90 p-4 text-white shadow-2xl shadow-blue-950/30 backdrop-blur-xl animate-float lg:block">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-500">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
              Booking Baru
            </div>
            <div className="mt-1 text-sm font-bold">
              Studio A, 15:30, DP masuk
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -right-3 bottom-12 z-20 hidden w-64 rounded-3xl border border-emerald-300/30 bg-slate-950/90 p-4 text-white shadow-2xl shadow-blue-950/30 backdrop-blur-xl animate-float-delayed lg:block">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500">
            <WalletCards className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
              Pembayaran Masuk
            </div>
            <div className="mt-1 text-sm font-bold">Rp350.000 via QRIS</div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-[0_40px_120px_-50px_rgba(37,99,235,0.75)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/50 sm:block">
            app.bookinaja.com/{activeTab === "monitor" ? "live" : activeTab}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            realtime
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[240px_1fr]">
          <aside className="hidden border-r border-white/10 bg-white/[0.025] p-5 lg:block">
            <div className="mb-8 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 font-black text-white">
                B
              </div>
              <div>
                <div className="text-sm font-black uppercase text-white">
                  Bookinaja
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                  Ops Command
                </div>
              </div>
            </div>
            {[
              ["monitor", "Live"],
              ["booking", "Booking"],
              ["payment", "Bayar"],
              ["staff", "Staff"],
              ["report", "Laporan"],
            ].map(([key, item]) => (
              <div
                key={item}
                className={`mb-2 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black ${
                  activeTab === key
                    ? "bg-blue-500 text-white"
                    : "text-white/45 hover:bg-white/[0.04]"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                {item}
              </div>
            ))}
          </aside>

          <div className="p-4 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">
                  Dashboard Preview
                </div>
                <h3 className="mt-1 text-2xl font-black tracking-tight text-white">
                  Satu layar untuk booking, kasir, dan owner.
                </h3>
              </div>
              <div className="grid grid-cols-5 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
                {demoTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition ${
                      activeTab === tab.key
                        ? "bg-blue-500 text-white"
                        : "text-white/45 hover:text-white"
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div key={activeTab} className="demo-panel min-h-[360px]">
              {activeTab === "monitor" && <MonitorPanel />}
              {activeTab === "booking" && <BookingPanel />}
              {activeTab === "payment" && <PaymentPanel />}
              {activeTab === "staff" && <StaffPanel />}
              {activeTab === "report" && <ReportPanel />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialProof() {
  const logos: Array<[string, LucideIcon]> = [
    ["Gaming Hub", Gamepad2],
    ["Creative Studio", Video],
    ["Sport Arena", TimerReset],
    ["Office Space", Building2],
    ["Barbershop", UsersRound],
    ["Pool Club", Activity],
    ["VR Arena", MonitorPlay],
    ["Rental Gear", BriefcaseBusiness],
  ];

  return (
    <section id="proof" className="relative z-10 w-full px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white/80 p-4 shadow-xl shadow-slate-950/[0.03] backdrop-blur dark:border-white/10 dark:bg-white/[0.035]">
        <div className="marquee-mask overflow-hidden">
          <div className="marquee-track">
            {[...logos, ...logos].map(([label, LogoIcon], index) => {
              return (
                <div
                  key={`${label}-${index}`}
                  className="flex min-w-max items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white">
                    <LogoIcon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-black uppercase tracking-[0.16em] text-slate-700 dark:text-white/70">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["2.400+", "bisnis aktif"],
            ["Realtime", "update dashboard"],
            ["50M+", "transaksi tercatat"],
            ["4.9", "rating onboarding"],
          ].map(([value, label]) => (
            <div
              key={label}
              className="rounded-3xl border border-slate-200 bg-white px-5 py-6 text-center dark:border-white/10 dark:bg-slate-950/50"
            >
              <div className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                {value === "2.400+" ? (
                  <AnimatedCounter target={2400} suffix="+" />
                ) : value === "50M+" ? (
                  <AnimatedCounter target={50} suffix="M+" />
                ) : value === "4.9" ? (
                  <>
                    <Star className="mb-1 mr-1 inline h-5 w-5 fill-amber-400 text-amber-400" />
                    {value}
                  </>
                ) : (
                  value
                )}
              </div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-white/40">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemSolution() {
  const [ref, visible] = useReveal();
  const problems = [
    ["Booking tercecer", "Chat dan walk-in tidak sinkron."],
    ["Owner stand-by", "Cek slot masih tanya tim."],
    ["Akses terlalu bebas", "Staff tanpa batas kontrol."],
  ];

  return (
    <section ref={ref} className="relative z-10 w-full px-4 py-16 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div style={revealStyle(visible)} className="space-y-5">
          <SectionHeader
            align="left"
            eyebrow="Tantangan Harian"
            title={
              <>
                Ramai saja
                <br />
                belum cukup.
              </>
            }
            description="Kalau booking, pembayaran, dan staff tidak terkoneksi, bisnis tetap terasa berantakan."
          />

          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/45">
                Tanpa sistem
              </div>
            </div>
            {[
              ["Booking", "nyebar di chat dan walk-in"],
              ["Pembayaran", "harus dicek manual"],
              ["Owner", "tetap bergantung ke update staff"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0 dark:border-white/5"
              >
                <span className="text-sm font-black text-slate-950 dark:text-white">
                  {label}
                </span>
                <span className="text-right text-sm font-medium text-slate-500 dark:text-slate-300">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4" style={revealStyle(visible, 0.12)}>
          <div className="grid gap-3 sm:grid-cols-3">
            {problems.map(([title, desc], index) => (
              <div
                key={title}
                className="group rounded-[1.5rem] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-blue-300 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-500 group-hover:bg-blue-600 group-hover:text-white dark:bg-white/10 dark:text-white/55">
                  {index === 0 && <CalendarClock className="h-4 w-4" />}
                  {index === 1 && <Clock3 className="h-4 w-4" />}
                  {index === 2 && <LockKeyhole className="h-4 w-4" />}
                </div>
                <h3 className="text-sm font-black tracking-tight text-slate-950 dark:text-white">
                  {title}
                </h3>
                <p className="mt-1 text-sm font-medium leading-5 text-slate-600 dark:text-slate-300">
                  {desc}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-[0_35px_100px_-55px_rgba(37,99,235,0.9)]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">
                  Dengan Bookinaja
                </div>
                <div className="mt-1 text-2xl font-black tracking-tight">
                  Semua bergerak dalam satu alur.
                </div>
              </div>
              <span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 sm:inline-flex">
                Live update
              </span>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-4">
                {[
                  ["Booking masuk", "Studio A · 15:30"],
                  ["Slot terkunci", "Tidak bisa double booking"],
                  ["DP tercatat", "Rp50.000 via QRIS"],
                  ["Staff melihat", "Siap check-in"],
                ].map(([label, value], index) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 border-b border-white/10 py-3 last:border-0"
                    style={{
                      animation: `slide-in-right 520ms ease ${index * 90}ms both`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 place-items-center rounded-xl bg-blue-500/20 text-[10px] font-black text-blue-200">
                        {index + 1}
                      </span>
                      <span className="text-sm font-black">{label}</span>
                    </div>
                    <span className="text-right text-xs font-semibold text-white/55">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-[1.4rem] border border-white/10 bg-blue-500/10 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">
                    Owner View
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    realtime
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Booking", "34"],
                    ["Pendapatan", "Rp847k"],
                    ["Terisi", "67%"],
                    ["Staff log", "128"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-white/10 p-3">
                      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/45">
                        {label}
                      </div>
                      <div className="mt-1 text-lg font-black">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniVisual({
  type,
}: {
  type: "monitor" | "web" | "pay" | "report" | "staff";
}) {
  if (type === "monitor") {
    const slots = [
      ["PS-01", "Rafi A.", "2j 15m", "Terisi"],
      ["PS-02", "-", "-", "Kosong"],
      ["PS-03", "Dimas K.", "0j 45m", "Terisi"],
      ["PC-01", "Sari W.", "1j 30m", "Terisi"],
      ["PC-02", "-", "-", "Kosong"],
      ["PC-03", "Andi P.", "3j 00m", "Terisi"],
    ];

    return (
      <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-50 shadow-inner dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-blue-600 text-white">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 dark:text-white">
                Live Monitor
              </div>
              <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Realtime
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-slate-950 dark:text-white">
              Rp 847.000
            </div>
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-500">
              Cuan hari ini
            </div>
          </div>
        </div>

        <div className="grid gap-2 p-3 sm:grid-cols-2">
          {slots.map(([unit, customer, time, status]) => {
            const busy = status === "Terisi";
            return (
              <div
                key={unit}
                className={`rounded-2xl border p-3 ${
                  busy
                    ? "border-blue-300 bg-blue-100/70 text-blue-950 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-50"
                    : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/45"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-black">{unit}</div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${
                      busy
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-300"
                        : "bg-slate-200 text-slate-500 dark:bg-white/10"
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <div className="mt-3 text-[11px] font-semibold">{customer}</div>
                <div
                  className={`text-[11px] font-black ${
                    busy ? "text-orange-500" : "text-slate-400"
                  }`}
                >
                  {time}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-3 pb-3">
          <div className="flex items-center justify-between rounded-2xl bg-slate-200/70 px-4 py-3 dark:bg-white/10">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-white/45">
              Occupancy
            </span>
            <div className="flex items-center gap-3">
              <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-300 dark:bg-white/10">
                <div className="h-full w-[67%] rounded-full bg-blue-500 animate-fill" />
              </div>
              <span className="text-xs font-black text-blue-500">67%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "web") {
    return (
      <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <div className="ml-2 flex-1 rounded-full bg-slate-100 px-3 py-1 text-[9px] font-bold text-slate-500 dark:bg-white/10 dark:text-white/50">
              gaminghub.bookinaja.com
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 p-4 text-white">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
              Gaming Hub
            </div>
            <div className="mt-8 text-2xl font-black tracking-tight">
              Pilih unit, bayar DP, main.
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["14:00", "15:00", "16:00"].map((time, index) => (
              <div
                key={time}
                className={`rounded-xl px-2 py-2 text-center text-[10px] font-black ${
                  index === 1
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/50"
                }`}
              >
                {time}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === "pay") {
    return (
      <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
        <div className="grid grid-cols-3 gap-2">
          {["QRIS", "BANK", "OVO", "GOPAY", "DANA", "DP"].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-emerald-200 bg-white px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:border-emerald-400/20 dark:bg-slate-950/50 dark:text-emerald-300"
            >
              {item}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-white p-3 dark:bg-slate-950/50">
          <div className="flex items-center justify-between text-xs font-black text-slate-950 dark:text-white">
            <span>Tercatat otomatis</span>
            <span className="text-emerald-500">Realtime</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-white/10">
            <div className="h-full w-full rounded-full bg-emerald-500 animate-fill" />
          </div>
        </div>
      </div>
    );
  }

  if (type === "report") {
    return (
      <div className="rounded-[1.6rem] border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-400/20 dark:bg-orange-400/10">
        <div className="flex items-end gap-2">
          {[38, 62, 49, 76, 58, 88, 70].map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-xl bg-gradient-to-t from-orange-400 to-orange-200"
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            ["Jam ramai", "19:00"],
            ["Top unit", "PS-01"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl bg-white p-3 dark:bg-slate-950/50"
            >
              <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                {label}
              </div>
              <div className="mt-1 text-sm font-black text-slate-950 dark:text-white">
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.6rem] border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
      {[
        ["Owner", "Akses penuh", "bg-blue-500", "8 menu"],
        ["Kasir", "Terbatas", "bg-amber-500", "2 menu"],
        ["Staff", "Khusus booking", "bg-emerald-500", "1 menu"],
      ].map(([name, access, color, menu]) => (
        <div
          key={name}
          className="mb-2 flex items-center justify-between rounded-2xl bg-white px-3 py-3 dark:bg-slate-950/50"
        >
          <div className="flex items-center gap-2">
            <span className={`h-8 w-8 rounded-xl ${color}`} />
            <span className="text-sm font-black text-slate-950 dark:text-white">
              {name}
            </span>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-white/45">
              {access}
            </span>
            <span className="text-[10px] font-black text-blue-500">{menu}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeatureBento() {
  const [ref, visible] = useReveal();
  const features = [
    {
      title: "Monitor Slot Real-time",
      desc: "Pantau unit kosong, sesi berjalan, sisa waktu, dan pemasukan hari ini dari satu layar.",
      icon: <MonitorPlay className="h-5 w-5" />,
      visual: <MiniVisual type="monitor" />,
      className: "lg:col-span-2",
      accent: "blue",
      label: "Live",
    },
    {
      title: "Website Booking Otomatis",
      desc: "Portal publik tenant langsung siap dipakai untuk pilih unit, jadwal, dan DP.",
      icon: <Globe2 className="h-5 w-5" />,
      visual: <MiniVisual type="web" />,
      className: "lg:col-span-1",
      accent: "purple",
      label: "Halaman publik",
    },
    {
      title: "Pembayaran Digital",
      desc: "QRIS, bank, e-wallet, DP, dan pelunasan tercatat otomatis tanpa rekap manual.",
      icon: <CreditCard className="h-5 w-5" />,
      visual: <MiniVisual type="pay" />,
      className: "lg:col-span-1",
      accent: "emerald",
      label: "Pembayaran",
    },
    {
      title: "Laporan & Analitik",
      desc: "Owner tahu jam ramai, unit terlaris, dan tren pendapatan tanpa buka spreadsheet.",
      icon: <ReceiptText className="h-5 w-5" />,
      visual: <MiniVisual type="report" />,
      className: "lg:col-span-1",
      accent: "orange",
      label: "Laporan",
    },
    {
      title: "Kontrol Staff",
      desc: "Kasir bisa jalan, tapi laporan, harga, dan setting tetap di tangan owner.",
      icon: <ShieldCheck className="h-5 w-5" />,
      visual: <MiniVisual type="staff" />,
      className: "lg:col-span-1",
      accent: "blue",
      label: "Akses",
    },
  ];

  return (
    <section
      id="features"
      ref={ref}
      className="relative z-10 w-full px-4 py-16 sm:px-6"
    >
      <div className="mx-auto max-w-7xl">
        <div style={revealStyle(visible)}>
          <SectionHeader
            eyebrow="Fitur Unggulan"
            title={
              <>
                Semua yang kamu
                <br />
                <span className="text-blue-600 dark:text-blue-300">
                  butuhkan.
                </span>
              </>
            }
            description="Pantau slot, terima booking, catat pembayaran, dan baca laporan dari satu tempat."
          />
        </div>

        <div
          className="mt-12 grid gap-5 lg:grid-cols-3"
          style={revealStyle(visible, 0.12)}
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.45)] transition hover:-translate-y-1 hover:border-blue-300 dark:border-white/10 dark:bg-white/[0.04] ${feature.className}`}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="mb-5 flex items-start justify-between gap-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition group-hover:scale-105">
                    {feature.icon}
                  </div>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-blue-600 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300">
                    {feature.label}
                  </span>
                </div>
              </div>
              <h3 className="relative text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                {feature.title}
              </h3>
              <p className="relative mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                {feature.desc}
              </p>
              <div className="relative mt-6">{feature.visual}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const [ref, visible] = useReveal();
  const testimonials = [
    {
      name: "Raka Pradana",
      role: "Owner Gaming Hub",
      quote: (
        <>
          Slot aktif jadi <Mark>lebih gampang dipantau</Mark>. Kasir tidak perlu
          bolak-balik konfirmasi ke owner.
        </>
      ),
      color: "from-blue-500 to-cyan-400",
      initials: "RP",
    },
    {
      name: "Maya Lestari",
      role: "Studio Foto",
      quote: (
        <>
          Jadwal dan DP customer sekarang <Mark>langsung tercatat</Mark>. Tidak
          perlu rekap manual dari chat.
        </>
      ),
      color: "from-rose-500 to-orange-400",
      initials: "ML",
    },
    {
      name: "Bimo Aditya",
      role: "Arena Olahraga",
      quote: (
        <>
          Laporan harian lebih jelas. Owner bisa cek performa
          <Mark> tanpa harus ada di lokasi</Mark>.
        </>
      ),
      color: "from-emerald-500 to-lime-400",
      initials: "BA",
    },
  ];

  return (
    <section ref={ref} className="relative z-10 w-full px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div style={revealStyle(visible)}>
          <SectionHeader
            eyebrow="Cerita Pengguna"
            title={
              <>
                Dipakai untuk
                <br />
                operasional harian.
              </>
            }
            description="Cerita singkat dari bisnis yang ingin booking lebih rapi, pembayaran lebih jelas, dan owner lebih mudah memantau."
          />
        </div>
        <div
          className="mt-12 grid gap-4 md:grid-cols-3"
          style={revealStyle(visible, 0.12)}
        >
          {testimonials.map((item) => (
            <div
              key={item.name}
              className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <div className="mb-5 flex gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="text-lg font-bold leading-8 text-slate-800 dark:text-white">
                &quot;{item.quote}&quot;
              </p>
              <div className="mt-8 flex items-center gap-3 border-t border-slate-200 pt-5 dark:border-white/10">
                <div
                  className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${item.color} text-sm font-black text-white`}
                >
                  {item.initials}
                </div>
                <div>
                  <div className="font-black text-slate-950 dark:text-white">
                    {item.name}
                  </div>
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {item.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Mark({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-blue-500/15 px-1.5 py-0.5 text-blue-600 dark:text-blue-300">
      {children}
    </span>
  );
}

const useCases: Record<
  UseCaseKey,
  {
    label: string;
    title: string;
    desc: string;
    features: string[];
    icon: ReactNode;
    mockup: {
      unitLabel: string;
      price: string;
      progress: string;
      accent: string;
      items: Array<{
        name: string;
        status: string;
        note: string;
        tone: "blue" | "emerald" | "amber" | "rose" | "cyan" | "violet";
      }>;
    };
  }
> = {
  gaming: {
    label: "Gaming Hub",
    title: "Kontrol PS, PC, billing waktu, dan sesi walk-in.",
    desc: "Cocok untuk rental PS, warnet modern, dan game center yang butuh live monitor per unit.",
    features: ["Durasi aktif", "Extend sesi", "POS kasir", "DP booking"],
    icon: <Gamepad2 className="h-4 w-4" />,
    mockup: {
      unitLabel: "Unit billing",
      price: "Rp125.000",
      progress: "72%",
      accent: "bg-blue-400",
      items: [
        { name: "PS-01", status: "Live", note: "2j 15m", tone: "blue" },
        { name: "PS-02", status: "Kosong", note: "Siap", tone: "emerald" },
        { name: "PC-01", status: "DP", note: "14:00", tone: "amber" },
        { name: "PC-02", status: "Live", note: "1j 30m", tone: "blue" },
        { name: "VIP", status: "Ditahan", note: "Maya", tone: "rose" },
        { name: "VR-02", status: "Kosong", note: "Siap", tone: "emerald" },
      ],
    },
  },
  studio: {
    label: "Studio Kreatif",
    title: "Jadwal studio, paket sesi, dan DP masuk di satu flow.",
    desc: "Untuk studio foto, podcast, rehearsal, atau konten kreatif yang menjual slot terbatas.",
    features: ["Calendar booking", "Paket per sesi", "Addon", "Reminder"],
    icon: <Video className="h-4 w-4" />,
    mockup: {
      unitLabel: "Studio schedule",
      price: "Rp350.000",
      progress: "64%",
      accent: "bg-cyan-400",
      items: [
        { name: "Studio A", status: "Dipesan", note: "Pre-wed", tone: "cyan" },
        { name: "Studio B", status: "Kosong", note: "Siap", tone: "emerald" },
        { name: "Podcast", status: "DP", note: "16:00", tone: "amber" },
        { name: "Makeup", status: "Addon", note: "+Rp75k", tone: "violet" },
        { name: "Lighting", status: "Dipakai", note: "2 jam", tone: "blue" },
        { name: "Editor", status: "Ditahan", note: "Review", tone: "rose" },
      ],
    },
  },
  sport: {
    label: "Arena Olahraga",
    title: "Lapangan, court, dan sesi ramai tetap bisa dipantau.",
    desc: "Buat futsal, badminton, mini soccer, atau venue olahraga dengan peak hour padat.",
    features: ["Grid jadwal", "Jam ramai", "Multi lapangan", "Pelunasan"],
    icon: <TimerReset className="h-4 w-4" />,
    mockup: {
      unitLabel: "Court booking",
      price: "Rp220.000",
      progress: "86%",
      accent: "bg-emerald-400",
      items: [
        { name: "Futsal 1", status: "Main", note: "19:00", tone: "emerald" },
        { name: "Futsal 2", status: "DP", note: "20:00", tone: "amber" },
        { name: "Badminton A", status: "Kosong", note: "Siap", tone: "cyan" },
        { name: "Badminton B", status: "Main", note: "1j 10m", tone: "blue" },
        { name: "Mini Soccer", status: "Penuh", note: "Ramai", tone: "rose" },
        { name: "Court C", status: "Kosong", note: "Siap", tone: "emerald" },
      ],
    },
  },
  office: {
    label: "Office Space",
    title: "Meeting room dan coworking space tanpa spreadsheet.",
    desc: "Cocok untuk office space yang butuh jadwal ruangan dan laporan pemakaian.",
    features: ["Room booking", "Invoice", "Company account", "Report"],
    icon: <Building2 className="h-4 w-4" />,
    mockup: {
      unitLabel: "Room schedule",
      price: "Rp450.000",
      progress: "58%",
      accent: "bg-violet-400",
      items: [
        {
          name: "Meeting 01",
          status: "Dipesan",
          note: "PT Asta",
          tone: "violet",
        },
        { name: "Meeting 02", status: "Kosong", note: "Siap", tone: "emerald" },
        { name: "Private 1", status: "Invoice", note: "Sent", tone: "blue" },
        { name: "Coworking", status: "12 pax", note: "Today", tone: "cyan" },
        { name: "Boardroom", status: "Ditahan", note: "13:00", tone: "amber" },
        {
          name: "Event Hall",
          status: "Dipesan",
          note: "Seharian",
          tone: "rose",
        },
      ],
    },
  },
  barber: {
    label: "Barbershop",
    title: "Appointment barber lebih rapi, antrean lebih terukur.",
    desc: "Pelanggan pilih jam, staff tahu antrean, owner lihat performa harian.",
    features: ["Appointment", "Staff schedule", "Deposit", "Repeat customer"],
    icon: <UsersRound className="h-4 w-4" />,
    mockup: {
      unitLabel: "Stylist queue",
      price: "Rp85.000",
      progress: "69%",
      accent: "bg-amber-400",
      items: [
        { name: "Barber A", status: "Cutting", note: "Rafi", tone: "amber" },
        { name: "Barber B", status: "Next", note: "Maya", tone: "blue" },
        { name: "Chair 03", status: "Kosong", note: "Siap", tone: "emerald" },
        { name: "Hair Wash", status: "Addon", note: "+Rp20k", tone: "cyan" },
        { name: "Premium", status: "Dipesan", note: "17:00", tone: "violet" },
        { name: "Walk-in", status: "Queue", note: "3 orang", tone: "rose" },
      ],
    },
  },
  pool: {
    label: "Kolam Renang",
    title: "Tiket, paket keluarga, dan kapasitas bisa dikontrol.",
    desc: "Bantu pool club atau waterpark kecil mengelola pengunjung dan pembayaran.",
    features: ["Ticket slot", "Capacity", "QR check-in", "Cashless"],
    icon: <Activity className="h-4 w-4" />,
    mockup: {
      unitLabel: "Capacity control",
      price: "Rp40.000",
      progress: "81%",
      accent: "bg-cyan-400",
      items: [
        { name: "Reguler", status: "128 pax", note: "Open", tone: "cyan" },
        { name: "Family", status: "DP", note: "6 pax", tone: "amber" },
        { name: "Cabana 1", status: "Dipesan", note: "Seharian", tone: "blue" },
        { name: "Cabana 2", status: "Kosong", note: "Siap", tone: "emerald" },
        { name: "QR Gate", status: "Check-in", note: "87", tone: "violet" },
        { name: "Locker", status: "Penuh", note: "Ramai", tone: "rose" },
      ],
    },
  },
  vr: {
    label: "VR Arena",
    title: "Sesi VR, headset, dan room tetap sinkron.",
    desc: "Untuk bisnis experience-based yang butuh inventory dan jadwal ketat.",
    features: ["Asset unit", "Session timer", "Bundle", "Live status"],
    icon: <MonitorPlay className="h-4 w-4" />,
    mockup: {
      unitLabel: "VR session",
      price: "Rp180.000",
      progress: "74%",
      accent: "bg-blue-400",
      items: [
        { name: "Room A", status: "Live", note: "18m", tone: "blue" },
        { name: "Room B", status: "Siap", note: "Bersih", tone: "emerald" },
        { name: "Headset 01", status: "Dipakai", note: "Raka", tone: "violet" },
        { name: "Headset 02", status: "Isi daya", note: "72%", tone: "amber" },
        { name: "Zombie Pack", status: "Dipesan", note: "19:30", tone: "rose" },
        { name: "Racing", status: "Kosong", note: "Siap", tone: "cyan" },
      ],
    },
  },
};

const useCaseKeys = Object.keys(useCases) as UseCaseKey[];

function UseCaseMockup({
  current,
}: {
  current: (typeof useCases)[UseCaseKey];
}) {
  const toneClass = {
    blue: "border-blue-400/30 bg-blue-500/15 text-blue-100",
    emerald: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
    amber: "border-amber-400/30 bg-amber-500/15 text-amber-100",
    rose: "border-rose-400/30 bg-rose-500/15 text-rose-100",
    cyan: "border-cyan-400/30 bg-cyan-500/15 text-cyan-100",
    violet: "border-violet-400/30 bg-violet-500/15 text-violet-100",
  };

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200">
            {current.label}
          </div>
          <div className="mt-1 text-xl font-black text-white">
            {current.mockup.unitLabel}
          </div>
        </div>
        <MousePointer2 className="h-8 w-8 text-blue-300" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {current.mockup.items.map((item, index) => (
          <div
            key={item.name}
            className={`rounded-2xl border p-4 ${toneClass[item.tone]}`}
            style={{ animation: `demo-pop 480ms ease ${index * 55}ms both` }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.14em]">
                {item.name}
              </span>
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-current" />
            </div>
            <div className="mt-5 text-[10px] font-black uppercase tracking-[0.14em] opacity-80">
              {item.status}
            </div>
            <div className="mt-1 text-xs font-black text-white">
              {item.note}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl bg-blue-500/15 p-4">
        <div className="flex items-center justify-between text-sm font-black text-white">
          <span>Siap dibooking</span>
          <span>{current.mockup.price}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${current.mockup.accent} animate-fill`}
            style={{ width: current.mockup.progress }}
          />
        </div>
      </div>
    </div>
  );
}

function UseCases() {
  const [active, setActive] = useState<UseCaseKey>("gaming");
  const [ref, visible] = useReveal();
  const current = useCases[active];

  useEffect(() => {
    if (!visible) return;

    const timer = window.setInterval(() => {
      setActive((currentKey) => {
        const index = useCaseKeys.indexOf(currentKey);
        return useCaseKeys[(index + 1) % useCaseKeys.length];
      });
    }, 4500);

    return () => window.clearInterval(timer);
  }, [visible]);

  return (
    <section
      id="use-cases"
      ref={ref}
      className="relative z-10 w-full px-4 py-16 sm:px-6"
    >
      <div className="mx-auto max-w-7xl">
        <div style={revealStyle(visible)}>
          <SectionHeader
            eyebrow="Jenis Bisnis"
            title={
              <>
                Satu sistem,
                <br />
                banyak jenis bisnis.
              </>
            }
            description="Bookinaja fleksibel untuk bisnis berbasis jadwal, sesi, unit, ruangan, tiket, atau appointment."
          />
        </div>

        <div
          className="mt-10 flex flex-wrap justify-center gap-2"
          style={revealStyle(visible, 0.1)}
        >
          {useCaseKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                active === key
                  ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60"
              }`}
            >
              {useCases[key].icon}
              {useCases[key].label}
            </button>
          ))}
        </div>

        <div
          key={active}
          className="mt-8 grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04] lg:grid-cols-[1fr_1fr]"
          style={revealStyle(visible, 0.16)}
        >
          <div className="p-6 sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
              {current.icon}
              {current.label}
            </div>
            <h3 className="mt-6 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              {current.title}
            </h3>
            <p className="mt-4 text-base font-medium leading-7 text-slate-600 dark:text-slate-300">
              {current.desc}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {current.features.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-800 dark:border-white/10 dark:bg-slate-950/50 dark:text-white"
                >
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-950 p-6 sm:p-10">
            <UseCaseMockup current={current} />
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const [ref, visible] = useReveal();
  const steps = [
    {
      step: "01",
      title: "Pelanggan buka halaman booking",
      outcome: "Link publik siap dibagikan",
      desc: "Mereka pilih unit, tanggal, jam, dan paket tanpa harus chat admin dulu.",
      icon: <Globe2 className="h-5 w-5" />,
      visual: "booking",
    },
    {
      step: "02",
      title: "Bookinaja kunci slot & catat pembayaran",
      outcome: "Tidak ada jadwal tabrakan",
      desc: "DP, pelunasan, status booking, dan ketersediaan unit langsung sinkron.",
      icon: <LockKeyhole className="h-5 w-5" />,
      visual: "system",
    },
    {
      step: "03",
      title: "Tim menjalankan dari dashboard",
      outcome: "Owner tetap pegang kontrol",
      desc: "Kasir melihat sesi aktif. Owner melihat revenue, laporan, dan aktivitas staff.",
      icon: <MonitorPlay className="h-5 w-5" />,
      visual: "dashboard",
    },
  ];

  return (
    <section
      id="demo"
      ref={ref}
      className="relative z-10 w-full px-4 py-16 sm:px-6"
    >
      <div className="mx-auto max-w-7xl">
        <div style={revealStyle(visible)}>
          <SectionHeader
            eyebrow="Cara Kerja"
            title={
              <>
                Cara Bookinaja
                <br />
                menjalankan flow.
              </>
            }
            description="Pelanggan booking dari link bisnis kamu, Bookinaja mengunci jadwal dan mencatat pembayaran, lalu tim memantau semuanya dari dashboard."
          />
        </div>

        <div
          className="relative mt-14 grid gap-5 lg:grid-cols-3"
          style={revealStyle(visible, 0.12)}
        >
          <div className="absolute left-0 right-0 top-20 hidden h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent lg:block" />
          {steps.map((item, index) => (
            <div
              key={item.step}
              className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="mb-8 flex items-center justify-between">
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-blue-600 text-xl font-black text-white shadow-xl shadow-blue-600/20">
                  {item.step}
                </div>
                <div
                  className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-blue-600 dark:bg-white/10 dark:text-blue-300"
                  style={{
                    animation: `demo-bob 2.8s ease-in-out ${index * 0.2}s infinite`,
                  }}
                >
                  {item.icon}
                </div>
              </div>
              <h3 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                {item.title}
              </h3>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                {item.desc}
              </p>
              <div className="mt-6 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/50">
                {item.visual === "booking" && (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      <span className="ml-2 rounded-full bg-white px-3 py-1 text-[9px] font-bold text-slate-500 dark:bg-white/10 dark:text-white/50">
                        tenant.bookinaja.com
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {["14:00", "15:00", "16:00"].map((slot, slotIndex) => (
                        <div
                          key={slot}
                          className={`rounded-xl px-2 py-3 text-center text-[10px] font-black ${
                            slotIndex === 1
                              ? "bg-blue-600 text-white"
                              : "bg-white text-slate-500 dark:bg-white/10 dark:text-white/50"
                          }`}
                        >
                          {slot}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {item.visual === "system" && (
                  <div className="space-y-3">
                    {[
                      ["Slot locked", "PS-01 / 15:00"],
                      ["DP tercatat", "Rp50.000"],
                      ["Status berubah", "Terkonfirmasi"],
                    ].map(([label, value], rowIndex) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-2xl bg-white px-3 py-3 text-xs font-black dark:bg-white/10"
                        style={{
                          animation: `slide-in-right 520ms ease ${rowIndex * 100}ms both`,
                        }}
                      >
                        <span className="text-slate-500 dark:text-white/50">
                          {label}
                        </span>
                        <span className="text-blue-600 dark:text-blue-300">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {item.visual === "dashboard" && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-white/45">
                        Live dashboard
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Sync
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["Pendapatan", "Rp847k"],
                        ["Occupancy", "67%"],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-2xl bg-white p-3 dark:bg-white/10"
                        >
                          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                            {label}
                          </div>
                          <div className="mt-1 text-sm font-black text-slate-950 dark:text-white">
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6 rounded-2xl bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-600 dark:text-blue-300">
                {item.outcome}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const [annual, setAnnual] = useState(true);
  const [ref, visible] = useReveal();
  const plans = [
    {
      name: "Starter",
      monthly: 149000,
      annual: 1490000,
      desc: "Untuk owner solo atau bisnis kecil yang ingin keluar dari catatan manual.",
      cta: "Pilih Starter",
      note: "Booking Inti",
      href: "/signup",
      features: [
        "Dashboard admin dasar",
        "Kalender booking",
        "Kelola unit/resource",
        "Website booking + subdomain",
        "Portal pelanggan & detail booking",
        "Tracking pembayaran dasar",
        "Promo code dasar",
        "Laporan pendapatan dasar",
        "1 akun owner",
      ],
    },
    {
      name: "Pro",
      monthly: 349000,
      annual: 3490000,
      desc: "Untuk bisnis dengan staff, kasir, dan operasional pembayaran yang lebih disiplin.",
      cta: "Pilih Pro",
      popular: true,
      note: "Operasional Tim",
      href: "/signup",
      features: [
        "Semua fitur Starter",
        "Multi staff account",
        "Hak akses staff",
        "Alur POS / kasir lengkap",
        "Kelola metode pembayaran",
        "Verifikasi pembayaran manual",
        "Impor & data pelanggan tanpa batas",
        "WhatsApp reminder dasar",
        "Aturan harga fleksibel",
        "Visibilitas pelanggan dasar",
      ],
    },
    {
      name: "Scale",
      monthly: 499000,
      annual: 4990000,
      desc: "Untuk growth, repeat order, membership, loyalty, dan kontrol bisnis lebih dalam.",
      cta: "Masuk Waitlist",
      comingSoon: true,
      note: "Segera Hadir",
      href: "/demos",
      features: [
        "Semua fitur Pro",
        "Membership otomatis",
        "Wallet loyalty & reward",
        "Reward pembelian berulang",
        "Segmentasi pelanggan lanjutan",
        "Analitik retention & growth",
        "Siap multi-outlet",
        "Kontrol automasi lanjutan",
        "Visibilitas group bisnis",
      ],
    },
  ];

  return (
    <section
      id="pricing"
      ref={ref}
      className="relative z-10 w-full px-4 py-16 sm:px-6"
    >
      <div className="mx-auto max-w-7xl">
        <div style={revealStyle(visible)}>
          <SectionHeader
            eyebrow="Paket Harga"
            title={
              <>
                Pilih plan sesuai
                <br />
                tahap bisnis.
              </>
            }
            description="Mulai dari operasional booking yang rapi, lalu naik ke kontrol staff, CRM, loyalty, dan growth saat bisnis sudah siap."
          />
        </div>

        <div
          className="mt-8 flex justify-center"
          style={revealStyle(visible, 0.08)}
        >
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            {[
              ["Bulanan", false],
              ["Tahunan", true],
            ].map(([label, value]) => (
              <button
                key={String(label)}
                onClick={() => setAnnual(Boolean(value))}
                className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
                  annual === Boolean(value)
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 dark:text-white/50"
                }`}
              >
                {label}
                {value && (
                  <span className="ml-2 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] text-emerald-300">
                    hemat 2 bulan
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div
          className="mt-10 grid gap-5 lg:grid-cols-3"
          style={revealStyle(visible, 0.14)}
        >
          {plans.map((plan) => {
            const price = annual ? plan.annual : plan.monthly;
            return (
              <div
                key={plan.name}
                className={`relative flex min-h-[620px] flex-col rounded-[2rem] border p-6 shadow-sm ${
                  plan.popular
                    ? "border-blue-500 bg-blue-600 text-white shadow-2xl shadow-blue-600/25"
                    : "border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                }`}
              >
                {plan.popular && (
                  <div className="absolute right-6 top-6 rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                    Most Popular
                  </div>
                )}
                {plan.comingSoon && (
                  <div className="absolute right-6 top-6 rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white dark:bg-white dark:text-slate-950">
                    Segera Hadir
                  </div>
                )}
                <div
                  className={`mb-4 inline-flex self-start rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                    plan.popular
                      ? "bg-white/15 text-blue-50"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-300"
                  }`}
                >
                  {plan.note}
                </div>
                <h3 className="text-2xl font-black">{plan.name}</h3>
                <p
                  className={`mt-3 min-h-20 text-sm font-medium leading-6 ${
                    plan.popular
                      ? "text-blue-50"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {plan.desc}
                </p>
                <div className="mt-6">
                  <span className="text-4xl font-black tracking-tight">
                    {price === 0
                      ? "Gratis"
                      : `Rp${price.toLocaleString("id-ID")}`}
                  </span>
                  {price > 0 && (
                    <span
                      className={`ml-2 text-sm font-bold ${
                        plan.popular
                          ? "text-blue-100"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      /{annual ? "tahun" : "bulan"}
                    </span>
                  )}
                </div>
                {annual && plan.monthly > 0 && (
                  <div
                    className={`mt-2 text-xs font-bold ${
                      plan.popular
                        ? "text-blue-100"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Setara Rp
                    {Math.round(plan.annual / 12).toLocaleString("id-ID")} /
                    bulan
                  </div>
                )}
                <Link href={plan.href}>
                  <Button
                    className={`mt-8 h-13 w-full rounded-2xl text-[11px] font-black uppercase tracking-[0.16em] ${
                      plan.popular
                        ? "bg-white text-blue-600 hover:bg-blue-50"
                        : "bg-slate-950 text-white hover:bg-blue-600 dark:bg-white dark:text-slate-950"
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
                <div className="mt-8 flex-1 space-y-3">
                  <div
                    className={`mb-4 text-[10px] font-black uppercase tracking-[0.2em] ${
                      plan.popular ? "text-blue-100" : "text-slate-400"
                    }`}
                  >
                    Yang didapat
                  </div>
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-3 text-sm font-bold leading-5"
                    >
                      <CheckCircle2
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          plan.popular ? "text-blue-100" : "text-blue-500"
                        }`}
                      />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="mt-6 rounded-[2rem] border border-blue-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04] sm:flex sm:items-center sm:justify-between sm:gap-6"
          style={revealStyle(visible, 0.18)}
        >
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">
              Mulai gratis
            </div>
            <div className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white">
              Coba Bookinaja 30 hari sebelum pilih plan.
            </div>
            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              Tanpa kartu kredit. Coba flow booking, setup workspace, dan lihat
              apakah operasionalmu jadi lebih rapi.
            </p>
          </div>
          <Link href="/signup" className="mt-4 block shrink-0 sm:mt-0">
            <Button className="h-12 w-full rounded-2xl bg-blue-600 px-6 text-[11px] font-black uppercase tracking-[0.16em] text-white hover:bg-blue-500 sm:w-auto">
              Mulai Trial Gratis
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  const [ref, visible] = useReveal();
  const items = [
    [
      "Apakah bisa coba tanpa kartu kredit?",
      "Bisa. Trial 30 hari dibuat supaya owner bisa melihat value sebelum memilih plan berbayar.",
    ],
    [
      "Bookinaja cocok untuk bisnis apa saja?",
      "Paling cocok untuk bisnis yang menjual slot, sesi, unit, ruangan, lapangan, atau appointment.",
    ],
    [
      "Apakah bisa dipakai oleh kasir?",
      "Bisa. Role staff dibuat agar kasir bisa operasional tanpa melihat atau mengubah area sensitif owner.",
    ],
    [
      "Apakah customer perlu install aplikasi?",
      "Tidak. Pelanggan booking lewat website publik bisnis kamu, jadi link bisa dibagikan lewat WhatsApp, Instagram, atau Google Business.",
    ],
    [
      "Di mana saya bisa belajar lebih detail?",
      "Kamu bisa lihat demo, pricing, FAQ, dan Jelajah untuk memahami alur Bookinaja lebih lanjut.",
    ],
  ];

  return (
    <section
      id="faq"
      ref={ref}
      className="relative z-10 w-full px-4 py-16 sm:px-6"
    >
      <div className="mx-auto max-w-4xl">
        <div style={revealStyle(visible)}>
          <SectionHeader
            eyebrow="Pertanyaan Umum"
            title={
              <>
                Pertanyaan sebelum
                <br />
                mulai trial.
              </>
            }
            description="Jawaban singkat sebelum kamu mencoba Bookinaja untuk operasional bisnismu."
          />
        </div>
        <div className="mt-10 space-y-3" style={revealStyle(visible, 0.12)}>
          {items.map(([question, answer], index) => (
            <div
              key={question}
              className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]"
            >
              <button
                onClick={() => setOpen(open === index ? -1 : index)}
                className="flex w-full items-center justify-between gap-5 p-5 text-left"
              >
                <span className="text-base font-black text-slate-950 dark:text-white">
                  {question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-slate-400 transition ${
                    open === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === index && (
                <div className="border-t border-slate-200 px-5 pb-5 pt-4 dark:border-white/10">
                  <p className="text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                    {answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const [ref, visible] = useReveal();

  return (
    <section
      ref={ref}
      className="relative z-10 w-full px-4 pb-20 pt-8 sm:px-6 sm:pb-24"
    >
      <div
        className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-blue-400/20 bg-slate-950 p-6 text-white shadow-[0_35px_110px_-65px_rgba(37,99,235,0.85)] sm:p-8 md:p-10"
        style={revealStyle(visible)}
      >
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-200">
              <Zap className="h-3.5 w-3.5" />
              Mulai gratis
            </div>
            <h2 className="mt-5 text-3xl font-black leading-[1.02] tracking-[-0.045em] sm:text-4xl md:text-5xl">
              Coba dulu. Rasakan operasional yang lebih rapi.
            </h2>
            <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-blue-50/70 sm:text-base">
              Pakai Bookinaja gratis 30 hari untuk melihat apakah booking,
              pembayaran, dan kontrol staff benar-benar lebih mudah di bisnis
              kamu.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:w-72">
            <PrimaryCta />
            <SecondaryCta />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [heroRef, heroVisible] = useReveal(0.04);
  const [demoRef, demoVisible] = useReveal(0.08);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#f7fbff] text-slate-950 dark:bg-[#050914] dark:text-white">
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-14px) rotate(1deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) rotate(1deg); }
          50% { transform: translateY(12px) rotate(-1deg); }
        }
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes demo-pop {
          from { opacity: 0; transform: scale(.92) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fill {
          from { width: 0; }
        }
        @keyframes bar-rise {
          from { height: 8%; opacity: .25; }
        }
        @keyframes demo-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          gap: 1rem;
          animation: marquee 30s linear infinite;
        }
        .marquee-mask {
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
        .animate-float { animation: float 5s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 5.5s ease-in-out infinite; }
        .animate-fill { animation: fill 1.1s cubic-bezier(.2,.8,.2,1) both; }
        .demo-panel { animation: demo-pop 520ms ease both; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:54px_54px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.055)_1px,transparent_1px)]" />
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-blue-500/15 blur-[120px] dark:bg-blue-500/20" />
        <div className="absolute -bottom-40 right-0 h-[440px] w-[440px] rounded-full bg-cyan-400/10 blur-[100px]" />
      </div>

      <main className="relative z-10">
        <section
          ref={heroRef}
          className="mx-auto flex min-h-[calc(100svh-7rem)] w-full max-w-7xl flex-col items-center justify-start px-4 pb-12 pt-36 text-center sm:px-6 sm:pt-32 md:min-h-[calc(100vh-2rem)] md:justify-center md:pt-36"
        >
          <div style={revealStyle(heroVisible)} className="space-y-6">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-white/70 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-600 shadow-sm backdrop-blur dark:bg-white/5 dark:text-blue-300">
              <Sparkles className="h-3.5 w-3.5 fill-current" />
              Sistem booking dan operasional untuk bisnis Indonesia
            </div>

            <h1 className="mx-auto max-w-5xl font-sans text-[2.35rem] font-[900] leading-[1.04] tracking-[-0.055em] text-slate-950 dark:text-white sm:text-[3.25rem] md:text-[4.1rem] lg:text-[4.75rem]">
              <span className="block">Kendali Penuh Operasional</span>
              <span className="block text-blue-600 dark:text-blue-300">
                Bisnis Anda
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-base font-medium leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
              Bookinaja merapikan booking otomatis, memantau unit secara
              real-time, dan membantu owner tetap pegang kontrol tanpa harus
              selalu ada di tempat.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PrimaryCta />
              <SecondaryCta />
            </div>

            <TrustMicrocopy />
            <AvatarStack />
          </div>
        </section>

        <section
          ref={demoRef}
          className="relative z-10 w-full px-4 pb-16 sm:px-6"
        >
          <div style={revealStyle(demoVisible)}>
            <AnimatedDashboard />
          </div>
        </section>

        <SocialProof />
        <ProblemSolution />
        <FeatureBento />
        <Testimonials />
        <UseCases />
        <HowItWorks />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
    </div>
  );
}
