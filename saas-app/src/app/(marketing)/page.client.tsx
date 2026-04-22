// src/app/(marketing)/page.client.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Zap,
  ArrowRight,
  Sparkles,
  Globe,
  ShieldCheck,
  Monitor,
  Camera,
  Briefcase,
  TrendingUp,
  Lock,
  CheckCircle2,
  ArrowUpRight,
  Star,
  BarChart3,
  Clock,
  Users,
  Play,
  Wallet,
  Bell,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

/* ─────────────────────────────────────────────
   HOOK: Scroll reveal
───────────────────────────────────────────── */
function useReveal(threshold = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function revealStyle(visible: boolean, delay = 0): React.CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`,
  };
}

/* ─────────────────────────────────────────────
   ANIMATED COUNTER
───────────────────────────────────────────── */
function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useReveal(0.3);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = target / (1600 / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target]);
  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────
   THEME HELPERS
───────────────────────────────────────────── */
function useThemeClasses() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : false;
  return {
    isDark,
    bg: isDark ? "bg-[#06080f]" : "bg-slate-50",
    heading: isDark ? "text-white" : "text-slate-950",
    muted: isDark ? "text-white/40" : "text-slate-500",
    card: isDark
      ? "bg-white/[0.035] border-white/[0.08]"
      : "bg-white border-slate-200",
    panel: isDark
      ? "bg-slate-900 border-white/[0.06]"
      : "bg-slate-100 border-slate-200",
    gridLine: isDark
      ? "bg-[linear-gradient(to_right,#ffffff07_1px,transparent_1px),linear-gradient(to_bottom,#ffffff07_1px,transparent_1px)]"
      : "bg-[linear-gradient(to_right,#0f172a09_1px,transparent_1px),linear-gradient(to_bottom,#0f172a09_1px,transparent_1px)]",
    divider: isDark ? "border-white/[0.06]" : "border-slate-200",
  };
}

/* ─────────────────────────────────────────────
   SECTION BADGE
───────────────────────────────────────────── */
function SectionBadge({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/[0.07] px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.28em] text-blue-500">
      {icon} {label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   ROCKET ICON
───────────────────────────────────────────── */
function Rocket({ className, size }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size ?? 24}
      height={size ?? 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   DASHBOARD WIDGET
───────────────────────────────────────────── */
function DashboardWidget() {
  const { isDark, heading, panel, divider, muted } = useThemeClasses();
  const slots = [
    { id: "PS-01", status: "busy", time: "2h 15m", customer: "Rafi A." },
    { id: "PS-02", status: "free", time: "—", customer: "—" },
    { id: "PS-03", status: "busy", time: "0h 45m", customer: "Dimas K." },
    { id: "PC-01", status: "busy", time: "1h 30m", customer: "Sari W." },
    { id: "PC-02", status: "free", time: "—", customer: "—" },
    { id: "PC-03", status: "busy", time: "3h 00m", customer: "Andi P." },
  ];
  return (
    <div
      className={`rounded-[1.5rem] border overflow-hidden ${panel} ${divider}`}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between ${divider}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Activity size={12} className="text-white" />
          </div>
          <div>
            <p
              className={`text-[10px] font-black uppercase tracking-widest leading-none ${heading}`}
            >
              Live Monitor
            </p>
            <p className="text-green-400 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
              <span
                className="inline-block w-1 h-1 rounded-full bg-green-400"
                style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
              />
              Realtime
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-black italic ${heading}`}>Rp 847.000</p>
          <p className="text-blue-400 text-[8px] font-bold uppercase tracking-widest">
            Cuan Hari Ini
          </p>
        </div>
      </div>
      {/* Slots */}
      <div className="p-3 grid grid-cols-2 gap-2">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className={`rounded-xl p-2.5 border transition-colors duration-200 ${
              slot.status === "busy"
                ? "bg-blue-600/10 border-blue-500/25"
                : isDark
                  ? "bg-white/[0.03] border-white/[0.06]"
                  : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] font-black uppercase ${heading}`}>
                {slot.id}
              </span>
              <span
                className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                  slot.status === "busy"
                    ? "bg-blue-500/20 text-blue-400"
                    : isDark
                      ? "bg-white/10 text-white/30"
                      : "bg-slate-200 text-slate-400"
                }`}
              >
                {slot.status === "busy" ? "Terisi" : "Kosong"}
              </span>
            </div>
            <p className={`text-[8px] font-medium ${muted}`}>{slot.customer}</p>
            <p
              className={`text-[9px] font-black ${slot.status === "busy" ? "text-orange-400" : isDark ? "text-white/15" : "text-slate-300"}`}
            >
              {slot.time}
            </p>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div className="px-3 pb-3">
        <div
          className={`rounded-xl px-3 py-2 flex items-center justify-between ${isDark ? "bg-white/[0.03]" : "bg-slate-200/60"}`}
        >
          <span
            className={`text-[8px] font-bold uppercase tracking-widest ${muted}`}
          >
            Occupancy
          </span>
          <div className="flex items-center gap-2">
            <div
              className={`w-16 h-1 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-slate-300"}`}
            >
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: "67%" }}
              />
            </div>
            <span className="text-blue-400 text-[10px] font-black">67%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function LandingPage() {
  const { isDark, bg, heading, muted, card, panel, gridLine, divider } =
    useThemeClasses();

  const hero = useReveal(0.04);
  const stats = useReveal(0.08);
  const feat = useReveal(0.06);
  const ind = useReveal(0.06);
  const how = useReveal(0.06);
  const staff = useReveal(0.06);
  const testim = useReveal(0.06);
  const cta = useReveal(0.06);

  return (
    <div
      className={`relative flex flex-col items-center overflow-x-hidden font-sans ${bg}`}
    >
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -300% center; }
          100% { background-position:  300% center; }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 30%, #93c5fd 50%, #60a5fa 70%, #3b82f6 100%);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 6s linear infinite;
        }
        .accent-text {
          background: linear-gradient(120deg, #2563eb, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .marquee-track {
          display: flex;
          gap: 2.5rem;
          animation: marquee 28s linear infinite;
          white-space: nowrap;
          will-change: transform;
        }
        .hover-lift {
          transition: transform 0.22s ease, border-color 0.22s ease;
        }
        .hover-lift:hover { transform: translateY(-3px); }
        .group:hover .icon-btn {
          background: #2563eb !important;
          color: white !important;
          border-color: #2563eb !important;
        }
      `}</style>

      {/* ── BACKGROUND ── */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
        <div className={`absolute inset-0 ${bg}`} />
        <div
          className={`absolute inset-0 ${gridLine} bg-[size:48px_48px] sm:bg-[size:56px_56px]`}
        />
        <div
          className={`absolute top-0 inset-x-0 h-[500px] ${
            isDark
              ? "bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(59,130,246,0.10)_0%,transparent_100%)]"
              : "bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(59,130,246,0.06)_0%,transparent_100%)]"
          }`}
        />
        <div
          className={`absolute bottom-0 right-0 w-64 h-64 rounded-full blur-[70px] ${isDark ? "bg-blue-800/15" : "bg-blue-200/30"}`}
        />
      </div>

      {/* ══════════════════════════════
          HERO
      ══════════════════════════════ */}
      <section className="relative z-10 w-full max-w-screen-xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 md:pt-32 pb-10 sm:pb-14 text-center">
        <div ref={hero.ref} className="space-y-5 sm:space-y-6">
          {/* Badge */}
          <div
            className="flex justify-center"
            style={revealStyle(hero.visible, 0.05)}
          >
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 ${isDark ? "border-blue-500/20 bg-blue-500/[0.07]" : "border-blue-300/50 bg-blue-50"}`}
            >
              <Sparkles className="h-3 w-3 text-blue-500 fill-current flex-shrink-0" />
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.22em] sm:tracking-[0.28em] text-blue-500">
                Platform Booking SaaS No.1 Indonesia
              </span>
              <span
                className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0"
                style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
              />
            </div>
          </div>

          {/* Headline */}
          <div style={revealStyle(hero.visible, 0.1)}>
            <h1
              className={`mx-auto text-[40px] sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[-0.05em] leading-[0.88] uppercase ${heading}`}
            >
              Ubah Slot Waktu
              <br />
              <span className="shimmer-text">Jadi Profit.</span>
            </h1>
          </div>

          {/* Sub */}
          <div style={revealStyle(hero.visible, 0.16)}>
            <p
              className={`max-w-sm sm:max-w-xl mx-auto text-sm sm:text-base md:text-lg font-medium leading-relaxed ${muted}`}
            >
              Platform pintar untuk monitor unit, terima pembayaran digital, dan
              kendalikan seluruh tim — dari mana saja, kapan saja.
            </p>
          </div>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row justify-center items-center gap-3"
            style={revealStyle(hero.visible, 0.22)}
          >
            <Link href="/register" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-12 px-8 text-[11px] font-black uppercase tracking-[0.18em] rounded-2xl bg-blue-600 hover:bg-blue-500 text-white border-0 transition-colors duration-200 shadow-lg shadow-blue-600/20">
                Mulai Gratis <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href="/demos" className="w-full sm:w-auto">
              <Button
                variant="ghost"
                className={`w-full sm:w-auto h-12 px-8 text-[11px] font-black uppercase tracking-[0.18em] rounded-2xl border transition-colors duration-200 ${isDark ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800"}`}
              >
                <Play className="mr-2 h-3 w-3 fill-current" /> Lihat Demo
              </Button>
            </Link>
          </div>

          {/* Social proof */}
          <div
            className="flex justify-center items-center gap-4"
            style={revealStyle(hero.visible, 0.28)}
          >
            <div className="flex -space-x-2">
              {[
                "bg-orange-400",
                "bg-blue-500",
                "bg-emerald-400",
                "bg-pink-400",
                "bg-purple-400",
              ].map((c, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 ${isDark ? "border-[#06080f]" : "border-white"} ${c} flex items-center justify-center`}
                >
                  <span className="text-[7px] sm:text-[8px] font-black text-white">
                    {String.fromCharCode(65 + i)}
                  </span>
                </div>
              ))}
            </div>
            <p className={`text-[10px] sm:text-[11px] font-medium ${muted}`}>
              <span className={`font-black ${heading}`}>2.400+</span> bisnis
              aktif
            </p>
          </div>
        </div>

        {/* ── DASHBOARD PREVIEW ── */}
        <div
          className="relative mt-10 sm:mt-14 mx-auto max-w-5xl"
          style={revealStyle(hero.visible, 0.34)}
        >
          {/* Glow */}
          <div
            className={`absolute inset-0 rounded-[2rem] blur-2xl ${isDark ? "bg-blue-600/8" : "bg-blue-400/8"}`}
          />

          {/* Frame */}
          <div
            className={`relative rounded-[1.25rem] sm:rounded-[2rem] border p-1 sm:p-1.5 ${isDark ? "border-white/[0.08] bg-white/[0.03]" : "border-slate-200 bg-white"}`}
          >
            <div
              className={`overflow-hidden rounded-[0.875rem] sm:rounded-[1.5rem] ${isDark ? "border border-white/[0.04]" : "border border-slate-100"}`}
            >
              <div
                className={`relative overflow-hidden ${isDark ? "bg-slate-950" : "bg-slate-100"}`}
                style={{ height: "clamp(200px, 42vw, 440px)" }}
              >
                <div className="absolute inset-0 p-3 sm:p-5 grid grid-cols-12 grid-rows-6 gap-1.5 sm:gap-2">
                  {/* Sidebar */}
                  <div
                    className={`col-span-2 row-span-6 rounded-xl border p-1.5 sm:p-2 flex flex-col gap-1.5 ${isDark ? "bg-white/[0.03] border-white/[0.05]" : "bg-white border-slate-200"}`}
                  >
                    <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-lg bg-blue-600 mx-auto mb-1.5" />
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-5 sm:h-6 rounded-lg ${i === 1 ? "bg-blue-600/25 border border-blue-500/25" : isDark ? "bg-white/[0.04]" : "bg-slate-100"}`}
                      />
                    ))}
                  </div>
                  {/* Stat cards */}
                  {[
                    { l: "Booking", v: "1,284", c: "text-white" },
                    { l: "Pendapatan", v: "Rp 28.4jt", c: "text-emerald-400" },
                    { l: "Unit Aktif", v: "18/24", c: "text-blue-400" },
                    { l: "Rating", v: "4.9★", c: "text-yellow-400" },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className={`col-span-2 row-span-1 rounded-xl border p-1.5 flex flex-col justify-between ${isDark ? "bg-white/[0.04] border-white/[0.05]" : "bg-white border-slate-200"}`}
                    >
                      <span
                        className={`text-[6px] sm:text-[7px] font-bold uppercase truncate ${isDark ? "text-white/30" : "text-slate-400"}`}
                      >
                        {s.l}
                      </span>
                      <span
                        className={`text-[10px] sm:text-xs font-black ${s.c}`}
                      >
                        {s.v}
                      </span>
                    </div>
                  ))}
                  {/* Chart */}
                  <div
                    className={`col-span-7 row-span-3 rounded-xl border p-2 ${isDark ? "bg-white/[0.03] border-white/[0.05]" : "bg-white border-slate-200"}`}
                  >
                    <div className="flex items-end gap-0.5 h-full pb-1">
                      {[40, 65, 45, 80, 95, 70, 85, 60, 90, 75, 100, 88].map(
                        (h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-t bg-blue-600/30 border-t border-blue-500/40"
                            style={{ height: `${h}%` }}
                          />
                        ),
                      )}
                    </div>
                  </div>
                  {/* Activity */}
                  <div
                    className={`col-span-3 row-span-3 rounded-xl border p-2 ${isDark ? "bg-white/[0.03] border-white/[0.05]" : "bg-white border-slate-200"}`}
                  >
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 sm:gap-1.5 mb-1.5 sm:mb-2"
                      >
                        <div
                          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-lg flex-shrink-0 ${["bg-blue-600/40", "bg-emerald-500/40", "bg-orange-500/40", "bg-purple-500/40"][i]}`}
                        />
                        <div className="flex-1 space-y-1">
                          <div
                            className={`h-1.5 rounded-full w-full ${isDark ? "bg-white/15" : "bg-slate-200"}`}
                          />
                          <div
                            className={`h-1 rounded-full w-2/3 ${isDark ? "bg-white/8" : "bg-slate-100"}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Slots */}
                  <div
                    className={`col-span-10 row-span-2 rounded-xl border p-1.5 sm:p-2 ${isDark ? "bg-white/[0.03] border-white/[0.05]" : "bg-white border-slate-200"}`}
                  >
                    <div className="grid grid-cols-6 gap-1 sm:gap-1.5 h-full">
                      {[
                        "PS-01•",
                        "PS-02○",
                        "PS-03•",
                        "PC-01•",
                        "PC-02○",
                        "VIP•",
                      ].map((s, i) => (
                        <div
                          key={i}
                          className={`rounded-lg flex items-center justify-center text-[6px] sm:text-[7px] font-black uppercase ${s.includes("○") ? (isDark ? "bg-white/[0.04] text-white/20" : "bg-slate-100 text-slate-400") : "bg-blue-600/20 border border-blue-500/25 text-blue-400"}`}
                        >
                          {s.replace("•", "").replace("○", "")}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating badge: Cuan — inside frame on mobile to avoid overflow */}
          <div
            className={`absolute -bottom-4 left-3 sm:-bottom-5 sm:-left-3 flex p-3 sm:p-4 rounded-2xl shadow-xl flex-col items-start -rotate-1 border ${isDark ? "bg-slate-900 border-white/[0.08]" : "bg-white border-slate-200 shadow-slate-200/60"}`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <TrendingUp size={11} className="text-emerald-400" />
              <span className="text-emerald-400 text-[8px] font-black uppercase tracking-widest">
                Cuan Hari Ini
              </span>
            </div>
            <p
              className={`text-lg sm:text-xl font-black italic leading-none ${heading}`}
            >
              +124%
            </p>
            <p className={`text-[8px] font-medium mt-0.5 ${muted}`}>
              vs bulan lalu
            </p>
          </div>

          {/* Floating badge: Notification */}
          <div className="absolute -top-3 right-3 sm:-top-4 sm:-right-3 flex bg-blue-600 p-3 sm:p-4 rounded-2xl shadow-xl shadow-blue-600/20 flex-col items-start rotate-1">
            <Bell size={12} className="text-white mb-0.5" />
            <p className="text-white text-[9px] font-black uppercase tracking-widest leading-none">
              Booking Baru!
            </p>
            <p className="text-blue-200 text-[8px] font-medium mt-0.5">
              Ahmad — PS-03 · 2 jam
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          MARQUEE
      ══════════════════════════════ */}
      <div
        className={`relative z-10 w-full py-5 overflow-hidden border-y ${divider}`}
      >
        <div className="marquee-track">
          {[...Array(2)].map((_, rep) =>
            [
              "Gaming Hub",
              "Studio Foto",
              "Lapangan Futsal",
              "Coworking",
              "Barbershop",
              "Kolam Renang",
              "Mini Golf",
              "Mesin Arcade",
            ].map((name, i) => (
              <div
                key={`${rep}-${i}`}
                className="flex items-center gap-2.5 flex-shrink-0"
              >
                <span className="h-1 w-1 rounded-full bg-blue-500/50" />
                <span
                  className={`text-[10px] font-black uppercase tracking-[0.22em] ${muted}`}
                >
                  {name}
                </span>
              </div>
            )),
          )}
        </div>
      </div>

      {/* ══════════════════════════════
          STATS
      ══════════════════════════════ */}
      <section className="relative z-10 w-full max-w-screen-xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div
          ref={stats.ref}
          className={`grid grid-cols-2 md:grid-cols-4 gap-px rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border ${divider} ${isDark ? "bg-white/[0.05]" : "bg-slate-200"}`}
          style={revealStyle(stats.visible)}
        >
          {[
            {
              val: 2400,
              suffix: "+",
              label: "Bisnis Terdaftar",
              desc: "Di seluruh Indonesia",
            },
            {
              val: 98,
              suffix: "%",
              label: "Uptime Platform",
              desc: "SLA terjamin 24/7",
            },
            {
              val: 50,
              suffix: "M+",
              label: "Transaksi Diproses",
              desc: "Setiap bulan",
            },
            {
              val: 4,
              suffix: ".9★",
              label: "Rating Pengguna",
              desc: "Dari 2.000+ ulasan",
            },
          ].map((s, i) => (
            <div
              key={i}
              className={`p-6 sm:p-9 text-center transition-colors duration-200 hover:bg-blue-600/[0.04] ${isDark ? "bg-white/[0.02]" : "bg-white"}`}
            >
              <p className="text-3xl sm:text-4xl md:text-5xl font-black mb-1.5 tabular-nums accent-text">
                <AnimatedCounter target={s.val} suffix={s.suffix} />
              </p>
              <p
                className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${heading}`}
              >
                {s.label}
              </p>
              <p className={`text-[10px] sm:text-xs mt-0.5 ${muted}`}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════
          FEATURES — BENTO
      ══════════════════════════════ */}
      <section className="relative z-10 w-full max-w-screen-xl mx-auto px-4 sm:px-6 pb-8">
        <div ref={feat.ref} style={revealStyle(feat.visible)}>
          <div className="text-center mb-10 sm:mb-14 space-y-3 sm:space-y-4">
            <SectionBadge
              icon={<Zap className="h-3 w-3 fill-current" />}
              label="Fitur Unggulan"
            />
            <h2
              className={`text-3xl sm:text-4xl md:text-[52px] font-black tracking-[-0.05em] leading-[0.9] uppercase ${heading}`}
            >
              Semua yang Kamu
              <br />
              <span className="shimmer-text">Butuhkan.</span>
            </h2>
            <p
              className={`max-w-sm sm:max-w-lg mx-auto text-sm font-medium ${muted}`}
            >
              Dirancang untuk owner yang ingin fokus tumbuh, bukan tenggelam
              dalam administrasi.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Large: Live Monitor — full width on mobile, 2-col on sm+ */}
            <div
              className={`sm:col-span-2 hover-lift group rounded-[1.75rem] border p-6 sm:p-8 overflow-hidden relative ${card}`}
            >
              <div className="absolute top-0 right-0 w-36 h-36 sm:w-48 sm:h-48 rounded-full blur-3xl bg-blue-600/[0.06] pointer-events-none" />
              <div className="flex items-center gap-3 mb-4 sm:mb-5">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center icon-btn transition-all duration-200 flex-shrink-0">
                  <Activity size={16} className="text-blue-400" />
                </div>
                <span className="text-[8px] font-black uppercase tracking-[0.22em] text-blue-400 border border-blue-500/20 rounded-full px-3 py-1">
                  Live
                </span>
              </div>
              <h3
                className={`text-lg sm:text-xl font-black tracking-tight mb-2 ${heading}`}
              >
                Monitoring Slot Realtime
              </h3>
              <p
                className={`text-sm font-medium leading-relaxed mb-5 ${muted}`}
              >
                Pantau semua unit dari HP. Tau persis mana kosong, siapa yang
                pakai, berapa sisa waktu — tanpa nelpon kasir.
              </p>
              <DashboardWidget />
            </div>

            {/* Website */}
            <div
              className={`hover-lift group rounded-[1.75rem] border p-6 sm:p-8 relative overflow-hidden ${card}`}
            >
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-purple-600/15 border border-purple-500/20 flex items-center justify-center mb-4 sm:mb-5 icon-btn transition-all duration-200">
                <Globe size={16} className="text-purple-400" />
              </div>
              <h3
                className={`text-lg font-black tracking-tight mb-2 ${heading}`}
              >
                Website Booking Otomatis
              </h3>
              <p
                className={`text-sm font-medium leading-relaxed mb-4 ${muted}`}
              >
                Portal profesional{" "}
                <span className={`font-black ${heading}`}>
                  namabisnis.bookinaja.com
                </span>{" "}
                langsung aktif saat daftar.
              </p>
              <div
                className={`rounded-xl border p-3.5 ${isDark ? "bg-slate-900 border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex gap-1 flex-shrink-0">
                    {["bg-red-400", "bg-yellow-400", "bg-green-400"].map(
                      (c, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${c}`} />
                      ),
                    )}
                  </div>
                  <div
                    className={`flex-1 min-w-0 rounded-md h-5 flex items-center px-2 ${isDark ? "bg-white/[0.05]" : "bg-white border border-slate-200"}`}
                  >
                    <span className={`text-[9px] font-mono truncate ${muted}`}>
                      gaminghub.bookinaja.com
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div
                    className={`h-2.5 rounded w-3/4 ${isDark ? "bg-white/10" : "bg-slate-200"}`}
                  />
                  <div
                    className={`h-2.5 rounded w-1/2 ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}
                  />
                  <div className="h-7 bg-blue-600/25 border border-blue-500/25 rounded-lg mt-3" />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div
              className={`hover-lift group rounded-[1.75rem] border p-6 sm:p-8 relative overflow-hidden ${card}`}
            >
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-emerald-600/15 border border-emerald-500/20 flex items-center justify-center mb-4 sm:mb-5 icon-btn transition-all duration-200">
                <Wallet size={16} className="text-emerald-400" />
              </div>
              <h3
                className={`text-lg font-black tracking-tight mb-2 ${heading}`}
              >
                Pembayaran Digital
              </h3>
              <p
                className={`text-sm font-medium leading-relaxed mb-4 ${muted}`}
              >
                QRIS, transfer bank, dompet digital. Semua tercatat otomatis.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {["QRIS", "Bank", "OVO", "GoPay", "Dana", "ShopeePay"].map(
                  (p, i) => (
                    <div
                      key={i}
                      className={`rounded-xl py-2 text-center border ${isDark ? "bg-white/[0.04] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}
                    >
                      <span
                        className={`text-[9px] font-black uppercase ${muted}`}
                      >
                        {p}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Reports */}
            <div
              className={`hover-lift group rounded-[1.75rem] border p-6 sm:p-8 relative overflow-hidden ${card}`}
            >
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-orange-600/15 border border-orange-500/20 flex items-center justify-center mb-4 sm:mb-5 icon-btn transition-all duration-200">
                <BarChart3 size={16} className="text-orange-400" />
              </div>
              <h3
                className={`text-lg font-black tracking-tight mb-2 ${heading}`}
              >
                Laporan & Analitik
              </h3>
              <p
                className={`text-sm font-medium leading-relaxed mb-4 ${muted}`}
              >
                Tren pendapatan, unit terpopuler, jam sibuk — dalam satu
                dashboard.
              </p>
              <div className="flex items-end gap-1 h-12">
                {[30, 55, 40, 80, 65, 90, 75].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-orange-500/25 border-t border-orange-500/40"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Security */}
            <div
              className={`hover-lift group rounded-[1.75rem] border p-6 sm:p-8 relative overflow-hidden ${card}`}
            >
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center mb-4 sm:mb-5 icon-btn transition-all duration-200">
                <ShieldCheck size={16} className="text-blue-400" />
              </div>
              <h3
                className={`text-lg font-black tracking-tight mb-2 ${heading}`}
              >
                Isolasi Data Bisnis
              </h3>
              <p
                className={`text-sm font-medium leading-relaxed mb-4 ${muted}`}
              >
                Setiap tenant mendapat database terisolasi. Data kamu tidak
                pernah campur dengan bisnis lain.
              </p>
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={13}
                  className="text-blue-400 flex-shrink-0"
                />
                <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">
                  Enterprise-grade Encryption
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          INDUSTRIES
      ══════════════════════════════ */}
      <section
        id="industries"
        className="relative z-10 w-full max-w-screen-xl mx-auto px-4 sm:px-6 py-14 sm:py-20"
      >
        <div ref={ind.ref} style={revealStyle(ind.visible)}>
          <div className="text-center mb-10 sm:mb-14 space-y-3 sm:space-y-4">
            <SectionBadge
              icon={<Globe className="h-3 w-3" />}
              label="Sektor Usaha"
            />
            <h2
              className={`text-3xl sm:text-4xl md:text-[52px] font-black tracking-[-0.05em] leading-[0.9] uppercase ${heading}`}
            >
              <span className="accent-text">Satu Sistem.</span>
              <br />
              <span className="shimmer-text">Apapun Bisnisnya.</span>
            </h2>
            <p
              className={`max-w-sm sm:max-w-md mx-auto text-sm font-medium ${muted}`}
            >
              Dirancang fleksibel untuk berbagai model persewaan slot & unit.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <Monitor size={20} />,
                title: "Gaming Hub",
                desc: "Rental PS, PC, & Game Center. Billing per jam otomatis.",
                accent: "blue",
                tags: ["PS5", "Xbox", "PC", "VR"],
              },
              {
                icon: <Camera size={20} />,
                title: "Studio Kreatif",
                desc: "Studio Foto, Podcast, & Musik. Kelola sesi dan paket alat.",
                accent: "purple",
                tags: ["Foto", "Video", "Podcast", "Musik"],
              },
              {
                icon: <Zap size={20} />,
                title: "Arena Olahraga",
                desc: "Futsal, Badminton, Gym. Cek slot langsung dari HP.",
                accent: "emerald",
                tags: ["Futsal", "Badminton", "Gym", "Renang"],
              },
              {
                icon: <Briefcase size={20} />,
                title: "Office Space",
                desc: "Coworking & Meeting Room. Kelola akses harian atau bulanan.",
                accent: "orange",
                tags: ["Cowork", "Meeting", "Private", "Virtual"],
              },
            ].map((item, i) => {
              const iconCls: Record<string, string> = {
                blue: "bg-blue-600/12 border-blue-500/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600",
                purple:
                  "bg-purple-600/12 border-purple-500/20 text-purple-400 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600",
                emerald:
                  "bg-emerald-600/12 border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600",
                orange:
                  "bg-orange-600/12 border-orange-500/20 text-orange-400 group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-600",
              };
              return (
                <div
                  key={i}
                  className={`group hover-lift rounded-[1.75rem] border p-6 sm:p-7 relative overflow-hidden ${card}`}
                >
                  <div
                    className={`h-10 w-10 sm:h-11 sm:w-11 rounded-2xl border flex items-center justify-center mb-4 sm:mb-5 transition-all duration-200 ${iconCls[item.accent]}`}
                  >
                    {item.icon}
                  </div>
                  <h4
                    className={`text-base font-black tracking-tight mb-2 ${heading}`}
                  >
                    {item.title}
                  </h4>
                  <p
                    className={`text-sm font-medium leading-relaxed mb-4 ${muted}`}
                  >
                    {item.desc}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((t, j) => (
                      <span
                        key={j}
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isDark ? "bg-white/[0.05] text-white/25" : "bg-slate-100 text-slate-400"}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <ArrowUpRight
                    size={22}
                    className={`absolute top-5 right-5 opacity-0 group-hover:opacity-15 transition-opacity duration-200 ${heading}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          HOW IT WORKS
      ══════════════════════════════ */}
      <section className="relative z-10 w-full max-w-screen-xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div ref={how.ref} style={revealStyle(how.visible)}>
          <div className="text-center mb-10 sm:mb-14 space-y-3 sm:space-y-4">
            <SectionBadge
              icon={<Clock className="h-3 w-3" />}
              label="Cara Kerja"
            />
            <h2
              className={`text-3xl sm:text-4xl md:text-[52px] font-black tracking-[-0.05em] leading-[0.9] uppercase ${heading}`}
            >
              <span className="accent-text">Online</span> dalam
              <br />
              <span className="shimmer-text">5 Menit.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: "01",
                title: "Daftar Bisnis",
                desc: "Isi nama bisnis, pilih tipe unit, dan atur jam operasional. Selesai dalam 2 menit.",
                icon: <Users size={17} />,
              },
              {
                step: "02",
                title: "Setup Unit & Harga",
                desc: "Tambahkan unit PS, meja, atau lapangan. Tentukan tarif per jam atau per sesi.",
                icon: <Clock size={17} />,
              },
              {
                step: "03",
                title: "Terima Booking",
                desc: "Portal langsung aktif. Customer booking online, bayar digital, dapat notifikasi.",
                icon: <CheckCircle2 size={17} />,
              },
            ].map((s, i) => (
              <div
                key={i}
                className={`group hover-lift rounded-[1.75rem] border p-6 sm:p-8 transition-colors duration-200 hover:border-blue-500/30 ${card}`}
              >
                <div className="flex items-center gap-3 mb-4 sm:mb-5">
                  <span
                    className={`text-4xl font-black leading-none ${isDark ? "text-white/[0.06]" : "text-slate-200"}`}
                  >
                    {s.step}
                  </span>
                  <div className="h-9 w-9 rounded-2xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400 transition-all duration-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 flex-shrink-0">
                    {s.icon}
                  </div>
                </div>
                <h3
                  className={`text-lg font-black tracking-tight mb-2 ${heading}`}
                >
                  {s.title}
                </h3>
                <p className={`text-sm font-medium leading-relaxed ${muted}`}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          STAFF MANAGEMENT
      ══════════════════════════════ */}
      <section className="relative z-10 w-full max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div
          ref={staff.ref}
          className={`relative overflow-hidden rounded-[2rem] border p-6 sm:p-10 md:p-16 ${isDark ? "bg-white/[0.02] border-white/[0.07]" : "bg-white border-slate-200"}`}
          style={revealStyle(staff.visible)}
        >
          <div
            className={`absolute inset-0 pointer-events-none ${isDark ? "bg-[radial-gradient(circle_at_100%_0%,rgba(59,130,246,0.06),transparent_55%)]" : "bg-[radial-gradient(circle_at_100%_0%,rgba(59,130,246,0.04),transparent_55%)]"}`}
          />
          <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-[0.025] pointer-events-none text-blue-400">
            <Lock size={120} strokeWidth={0.5} className="block sm:hidden" />
            <Lock size={280} strokeWidth={0.5} className="hidden sm:block" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-14 items-start lg:items-center">
            {/* Text */}
            <div className="space-y-4 sm:space-y-5">
              <SectionBadge
                icon={<Lock className="h-3 w-3" />}
                label="Kontrol Staff"
              />
              <h2
                className={`text-3xl sm:text-4xl md:text-[48px] font-black tracking-[-0.05em] leading-[0.9] uppercase ${heading}`}
              >
                <span className="accent-text">Tim Hebat</span>,<br />
                <span className="shimmer-text">Kontrol Penuh.</span>
              </h2>
              <p
                className={`text-sm sm:text-base font-medium leading-relaxed ${muted}`}
              >
                Buat akun kasir dengan akses terbatas. Mereka bisa kelola
                booking dan terima bayaran — tapi tidak bisa lihat laporan
                keuangan kamu.
              </p>
              <div className="space-y-2.5">
                {[
                  {
                    label: "Akses Kasir Terbatas",
                    desc: "Kasir hanya bisa lihat booking aktif",
                  },
                  {
                    label: "Cegah Fraud Transaksi",
                    desc: "Setiap transaksi tercatat dengan timestamp",
                  },
                  {
                    label: "Log Aktivitas Realtime",
                    desc: "Audit trail lengkap untuk setiap aksi",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border transition-colors duration-200 hover:border-blue-500/25 ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}
                  >
                    <CheckCircle2 className="text-blue-500 w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p
                        className={`text-sm font-black uppercase tracking-wide ${heading}`}
                      >
                        {item.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${muted}`}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Role cards */}
            <div className="flex flex-col gap-3 lg:block lg:relative lg:h-72">
              {/* Owner card */}
              <div
                className={`lg:absolute lg:top-0 lg:right-0 lg:left-8 rounded-[1.5rem] p-5 border shadow-lg ${panel} ${divider}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-sm flex-shrink-0">
                    OW
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-black uppercase text-sm leading-none ${heading}`}
                    >
                      Owner Admin
                    </p>
                    <p className="text-blue-400 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                      Full Access
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {["bg-emerald-500", "bg-blue-500", "bg-purple-500"].map(
                      (c, i) => (
                        <div key={i} className={`h-2 w-2 rounded-full ${c}`} />
                      ),
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    "Booking",
                    "Laporan",
                    "Keuangan",
                    "Staff",
                    "Setting",
                    "Unit",
                    "Analitik",
                    "Export",
                  ].map((f, i) => (
                    <div
                      key={i}
                      className="bg-blue-600/20 border border-blue-500/20 rounded-lg py-1 text-center"
                    >
                      <span className="text-blue-400 text-[8px] font-black uppercase">
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kasir card */}
              <div
                className={`lg:absolute lg:bottom-0 lg:left-0 lg:right-8 rounded-[1.5rem] p-5 border shadow-lg lg:rotate-1 hover:rotate-0 transition-transform duration-300 ${panel} ${divider}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-xl bg-slate-600 flex items-center justify-center font-black text-white text-sm flex-shrink-0">
                    KS
                  </div>
                  <div>
                    <p
                      className={`font-black uppercase text-sm leading-none ${heading}`}
                    >
                      Kasir
                    </p>
                    <p className="text-orange-400 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                      Limited Access
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { l: "Booking", a: true },
                    { l: "Laporan", a: false },
                    { l: "Keuangan", a: false },
                    { l: "Staff", a: false },
                    { l: "Setting", a: false },
                    { l: "Unit", a: true },
                    { l: "Analitik", a: false },
                    { l: "Export", a: false },
                  ].map((f, i) => (
                    <div
                      key={i}
                      className={`rounded-lg py-1 text-center border ${f.a ? "bg-emerald-600/20 border-emerald-500/20" : isDark ? "bg-white/[0.03] border-white/[0.05] opacity-40" : "bg-slate-200 border-slate-200 opacity-50"}`}
                    >
                      <span
                        className={`text-[8px] font-black uppercase ${f.a ? "text-emerald-400" : isDark ? "text-white/25" : "text-slate-400"}`}
                      >
                        {f.l}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          TESTIMONIALS
      ══════════════════════════════ */}
      <section className="relative z-10 w-full max-w-screen-xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div ref={testim.ref} style={revealStyle(testim.visible)}>
          <div className="text-center mb-10 sm:mb-14 space-y-3 sm:space-y-4">
            <SectionBadge
              icon={<Star className="h-3 w-3 fill-current" />}
              label="Testimoni"
            />
            <h2
              className={`text-3xl sm:text-4xl md:text-[52px] font-black tracking-[-0.05em] leading-[0.9] uppercase ${heading}`}
            >
              Kata Mereka
              <br />
              <span className="shimmer-text">yang Pakai.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                name: "Rizky Firmansyah",
                role: "Owner Gaming Hub Surabaya",
                text: "Sebelum pakai Bookinaja, kasir saya nulis di buku. Sekarang semua otomatis, bisa pantau dari rumah. Pendapatan naik 40%.",
                stars: 5,
                av: "RF",
                color: "bg-blue-600",
              },
              {
                name: "Siti Rahayu",
                role: "Owner Studio Foto Jakarta",
                text: "Booking online-nya bikin customer lebih happy. Mereka pilih slot sendiri, bayar QRIS, dapat konfirmasi. Nggak perlu balas WA satu-satu.",
                stars: 5,
                av: "SR",
                color: "bg-purple-600",
              },
              {
                name: "Budi Santoso",
                role: "Owner Lapangan Futsal Bandung",
                text: "Laporan keuangannya detail banget. Bisa lihat hari apa paling ramai, jam paling sepi, unit mana paling cuan. Strategi bisnis jadi lebih tajam.",
                stars: 5,
                av: "BS",
                color: "bg-emerald-600",
              },
            ].map((t, i) => (
              <div
                key={i}
                className={`hover-lift rounded-[1.75rem] border p-6 sm:p-8 ${card}`}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(t.stars)].map((_, j) => (
                    <Star
                      key={j}
                      size={12}
                      className="fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p
                  className={`text-sm font-medium leading-relaxed mb-6 italic ${isDark ? "text-white/55" : "text-slate-600"}`}
                >
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-2xl ${t.color} flex items-center justify-center font-black text-white text-sm flex-shrink-0`}
                  >
                    {t.av}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-black truncate ${heading}`}>
                      {t.name}
                    </p>
                    <p className={`text-xs truncate ${muted}`}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          CTA
      ══════════════════════════════ */}
      <section className="relative z-10 w-full max-w-screen-xl mx-auto px-4 sm:px-6 pb-14 sm:pb-24">
        <div ref={cta.ref} style={revealStyle(cta.visible)}>
          <div
            className={`relative overflow-hidden rounded-[2rem] border px-6 sm:px-10 py-14 sm:py-24 md:py-32 text-center ${isDark ? "bg-slate-950 border-white/[0.07]" : "bg-white border-slate-200"}`}
          >
            <div
              className={`absolute inset-0 pointer-events-none ${
                isDark
                  ? "bg-[radial-gradient(ellipse_70%_50%_at_50%_110%,rgba(59,130,246,0.15),transparent)]"
                  : "bg-[radial-gradient(ellipse_70%_50%_at_50%_110%,rgba(59,130,246,0.07),transparent)]"
              }`}
            />
            <div className="relative z-10 max-w-sm sm:max-w-2xl md:max-w-3xl mx-auto space-y-6 sm:space-y-8">
              <SectionBadge
                icon={<Rocket className="h-3 w-3" />}
                label="Mulai Hari Ini"
              />
              <h2
                className={`text-4xl sm:text-5xl md:text-7xl font-black tracking-[-0.06em] leading-[0.86] uppercase ${heading}`}
              >
                <span className="accent-text">Bisnis Kamu</span>
                <br />
                <span className="shimmer-text">Bisa Autopilot.</span>
              </h2>
              <p
                className={`text-sm sm:text-base font-medium max-w-xs sm:max-w-md mx-auto ${muted}`}
              >
                Bergabung dengan 2.400+ bisnis Indonesia yang sudah membuktikan.
                Gratis 14 hari, tanpa kartu kredit.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto h-12 sm:h-14 md:h-16 px-8 sm:px-10 text-[11px] font-black uppercase tracking-[0.18em] rounded-2xl bg-blue-600 hover:bg-blue-500 text-white border-0 transition-colors duration-200 shadow-lg shadow-blue-600/20">
                    Daftar Gratis Sekarang{" "}
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link
                  href="/pricing"
                  className={`text-[10px] font-black uppercase tracking-[0.3em] underline underline-offset-8 decoration-blue-500/40 transition-colors duration-200 ${muted} hover:text-blue-500`}
                >
                  Lihat Semua Paket →
                </Link>
              </div>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                {[
                  "✓ Gratis 14 hari",
                  "✓ Tanpa kartu kredit",
                  "✓ Setup 5 menit",
                  "✓ Batalkan kapanpun",
                ].map((f) => (
                  <span
                    key={f}
                    className={`text-[11px] sm:text-xs font-medium ${muted}`}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
