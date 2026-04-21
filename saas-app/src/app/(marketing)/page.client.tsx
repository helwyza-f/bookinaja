// src/app/(marketing)/page.client.tsx
"use client";

import { Badge } from "@/components/ui/badge";
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
  ChevronRight,
  TrendingUp,
  Lock,
  Search,
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
   HOOK: Intersection Observer for scroll reveals
───────────────────────────────────────────── */
function useReveal(threshold = 0.15) {
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
    const duration = 2000;
    const step = target / (duration / 16);
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
   FLOATING PARTICLE FIELD
───────────────────────────────────────────── */
function getThemeClasses(isDark: boolean) {
  return {
    sectionHeadingClass: isDark ? "text-white" : "text-slate-950",
    mutedClass: isDark ? "text-white/40" : "text-slate-600",
    cardClass: isDark
      ? "bg-white/[0.03] border-white/10"
      : "bg-white border-slate-200",
    subtleCardClass: isDark
      ? "bg-white/[0.02] border-white/10"
      : "bg-slate-50 border-slate-200",
    innerPanelClass: isDark ? "bg-slate-900" : "bg-slate-100",
  };
}

function ParticleField() {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    // Generate partikel hanya di client
    const generated = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 8,
      duration: Math.random() * 10 + 8,
    }));
    setParticles(generated);
  }, []);

  if (particles.length === 0) return null; // Cegah mismatch saat SSR
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-blue-500/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            animation: `floatParticle ${p.duration}s ${p.delay}s infinite ease-in-out alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes floatParticle {
          0% { transform: translateY(0px) translateX(0px) scale(1); opacity: 0.3; }
          100% { transform: translateY(-40px) translateX(20px) scale(1.5); opacity: 0.8; }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(60px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59,130,246,0.3); }
          50% { box-shadow: 0 0 60px rgba(59,130,246,0.6), 0 0 100px rgba(59,130,246,0.2); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(120px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
        }
        @keyframes orbit2 {
          from { transform: rotate(120deg) translateX(180px) rotate(-120deg); }
          to { transform: rotate(480deg) translateX(180px) rotate(-480deg); }
        }
        @keyframes orbit3 {
          from { transform: rotate(240deg) translateX(150px) rotate(-240deg); }
          to { transform: rotate(600deg) translateX(150px) rotate(-600deg); }
        }
        @keyframes typing {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .reveal-up { animation: slideUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards; }
        .reveal-right { animation: slideRight 0.8s cubic-bezier(0.16,1,0.3,1) forwards; }
        .reveal-fade { animation: fadeIn 1s ease forwards; }
        .shimmer-text {
          background: linear-gradient(90deg, #3b82f6, #60a5fa, #93c5fd, #3b82f6);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        .card-tilt {
          transition: transform 0.5s cubic-bezier(0.23,1,0.32,1), box-shadow 0.5s;
        }
        .card-tilt:hover {
          transform: perspective(1000px) rotateX(-3deg) rotateY(5deg) translateY(-8px);
          box-shadow: 20px 30px 60px rgba(0,0,0,0.3), 0 0 40px rgba(59,130,246,0.1);
        }
        .glow-pulse { animation: pulse-glow 3s ease-in-out infinite; }
        .marquee-track {
          display: flex;
          gap: 3rem;
          animation: marquee 25s linear infinite;
          white-space: nowrap;
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .number-gradient {
          background: linear-gradient(135deg, #3b82f6, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-badge-glow {
          box-shadow: 0 0 30px rgba(59,130,246,0.2), inset 0 0 30px rgba(59,130,246,0.05);
        }
        .bento-hover {
          transition: all 0.4s cubic-bezier(0.23,1,0.32,1);
        }
        .bento-hover:hover {
          transform: translateY(-4px) scale(1.01);
        }
        .line-draw {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawLine 2s ease forwards;
        }
        @keyframes drawLine {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MOCK DASHBOARD WIDGET
───────────────────────────────────────────── */
function DashboardWidget() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { sectionHeadingClass, subtleCardClass, cardClass } =
    getThemeClasses(isDark);
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
      className={`rounded-[2rem] border overflow-hidden shadow-2xl ${cardClass}`}
    >
      {/* Header */}
      <div
        className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? "border-white/5" : "border-slate-200"}`}
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center">
            <Activity size={14} className="text-white" />
          </div>
          <div>
            <p
              className={`text-xs font-black uppercase tracking-widest ${sectionHeadingClass}`}
            >
              Live Monitor
            </p>
            <p className="text-green-400 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Realtime
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-black italic ${sectionHeadingClass}`}>
            Rp 847.000
          </p>
          <p className="text-blue-400 text-[9px] font-bold uppercase tracking-widest">
            Cuan Hari Ini
          </p>
        </div>
      </div>
      {/* Slot Grid */}
      <div className="p-4 grid grid-cols-2 gap-2">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className={`rounded-xl p-3 border transition-all duration-300 ${
              slot.status === "busy"
                ? "bg-blue-600/10 border-blue-500/30"
                : subtleCardClass
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-[10px] font-black uppercase ${sectionHeadingClass}`}
              >
                {slot.id}
              </span>
              <span
                className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                  slot.status === "busy"
                    ? "bg-blue-500/20 text-blue-400"
                    : isDark
                      ? "bg-white/10 text-white/40"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {slot.status === "busy" ? "Terisi" : "Kosong"}
              </span>
            </div>
            <p
              className={`text-[9px] font-semibold ${isDark ? "text-white/60" : "text-slate-500"}`}
            >
              {slot.customer}
            </p>
            <p
              className={`text-[10px] font-black ${slot.status === "busy" ? "text-orange-400" : isDark ? "text-white/20" : "text-slate-300"}`}
            >
              {slot.time}
            </p>
          </div>
        ))}
      </div>
      {/* Footer bar */}
      <div className="px-4 pb-4">
        <div
          className={`rounded-xl px-4 py-3 flex items-center justify-between ${isDark ? "bg-white/5" : "bg-slate-50"}`}
        >
          <span
            className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? "text-white/50" : "text-slate-500"}`}
          >
            Occupancy
          </span>
          <div className="flex items-center gap-2">
            <div
              className={`w-24 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-slate-200"}`}
            >
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: "67%" }}
              />
            </div>
            <span className="text-blue-400 text-xs font-black">67%</span>
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const {
    sectionHeadingClass,
    mutedClass,
    cardClass,
    subtleCardClass,
    innerPanelClass,
  } = getThemeClasses(isDark);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  const heroReveal = useReveal(0.05);
  const statsReveal = useReveal(0.2);
  const featReveal = useReveal(0.15);
  const indReveal = useReveal(0.15);
  const staffReveal = useReveal(0.15);
  const testimReveal = useReveal(0.15);
  const pricingReveal = useReveal(0.15);
  const ctaReveal = useReveal(0.15);

  return (
    <div
      className={`relative flex flex-col items-center selection:bg-blue-600/30 overflow-x-hidden font-sans transition-colors duration-500 ${
        isDark ? "bg-[#050810] text-white" : "bg-slate-50 text-slate-950"
      }`}
    >
      {/* ── BACKGROUND SYSTEM ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className={`absolute inset-0 ${isDark ? "bg-[#050810]" : "bg-slate-50"}`}
        />
        <div
          className={`absolute w-[600px] h-[600px] rounded-full blur-[150px] transition-all duration-1000 ${
            isDark ? "opacity-20" : "opacity-30"
          }`}
          style={{
            background: isDark
              ? "radial-gradient(circle, #3b82f6, #1d4ed8)"
              : "radial-gradient(circle, rgba(59,130,246,0.18), rgba(29,78,216,0.08))",
            left: `${mousePos.x * 100 - 30}%`,
            top: `${mousePos.y * 100 - 30}%`,
          }}
        />
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-[900px] ${
            isDark
              ? "bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.12)_0%,transparent_70%)]"
              : "bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.08)_0%,transparent_70%)]"
          }`}
        />
        <div
          className={`absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] ${
            isDark ? "opacity-10 bg-blue-800" : "opacity-20 bg-blue-200"
          }`}
        />
        <div
          className={`absolute inset-0 ${
            isDark
              ? "bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)]"
              : "bg-[linear-gradient(to_right,#0f172a0a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a0a_1px,transparent_1px)]"
          } bg-[size:60px_60px]`}
        />
        <ParticleField />
      </div>

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section className="relative z-10 w-full max-w-screen-xl mx-auto px-6 pt-24 md:pt-36 pb-20 text-center">
        <div
          ref={heroReveal.ref}
          className="space-y-8"
          style={{
            opacity: heroReveal.visible ? 1 : 0,
            transition: "opacity 0.1s",
          }}
        >
          {/* Badge */}
          <div
            className="flex justify-center"
            style={{
              animation: heroReveal.visible
                ? "slideUp 0.7s 0.1s cubic-bezier(0.16,1,0.3,1) both"
                : "none",
            }}
          >
            <div className="hero-badge-glow inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/5 px-5 py-2 backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-blue-400 fill-current" />
              <span className="text-[9px] font-black uppercase tracking-[0.35em] text-blue-400">
                Platform Booking SaaS No.1 Indonesia
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              animation: heroReveal.visible
                ? "slideUp 0.9s 0.2s cubic-bezier(0.16,1,0.3,1) both"
                : "none",
            }}
          >
            <h1
              className={`max-w-5xl mx-auto text-5xl sm:text-7xl md:text-8xl lg:text-[96px] font-black tracking-[-0.04em] leading-[0.88] ${
                isDark ? "text-white" : "text-slate-950"
              }`}
            >
              Ubah Slot Waktu
              <br />
              <span className="shimmer-text">Jadi Profit.</span>
            </h1>
          </div>

          {/* Sub */}
          <div
            style={{
              animation: heroReveal.visible
                ? "slideUp 0.9s 0.35s cubic-bezier(0.16,1,0.3,1) both"
                : "none",
            }}
          >
            <p
              className={`max-w-xl mx-auto text-base md:text-lg font-medium leading-relaxed ${
                isDark ? "text-white/40" : "text-slate-600"
              }`}
            >
              Satu platform pintar untuk monitor unit, terima pembayaran
              digital, dan kendalikan seluruh tim — dari mana saja, kapan saja.
            </p>
          </div>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row justify-center items-center gap-4"
            style={{
              animation: heroReveal.visible
                ? "slideUp 0.9s 0.45s cubic-bezier(0.16,1,0.3,1) both"
                : "none",
            }}
          >
            <Link href="/register">
              <Button className="h-14 px-10 text-xs font-black uppercase tracking-[0.2em] rounded-2xl bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all glow-pulse italic text-white border-0">
                Mulai Gratis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button
                variant="ghost"
                className={`h-14 px-10 text-xs font-black uppercase tracking-[0.2em] rounded-2xl border italic backdrop-blur-sm transition-all hover:scale-105 ${
                  isDark
                    ? "border-white/10 bg-white/5 hover:bg-white/10 text-white"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-900"
                }`}
              >
                <Play className="mr-2 h-3 w-3 fill-current" /> Lihat Demo
              </Button>
            </Link>
          </div>

          {/* Trust signals */}
          <div
            className="flex justify-center items-center gap-6 pt-2"
            style={{
              animation: heroReveal.visible
                ? "slideUp 0.9s 0.55s cubic-bezier(0.16,1,0.3,1) both"
                : "none",
            }}
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
                  className={`w-7 h-7 rounded-full border-2 ${
                    isDark ? "border-[#050810]" : "border-white"
                  } ${c} flex items-center justify-center`}
                >
                  <span
                    className={`text-[8px] font-black ${
                      isDark ? "text-white" : "text-slate-950"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                </div>
              ))}
            </div>
            <p
              className={`text-[11px] font-semibold ${
                isDark ? "text-white/40" : "text-slate-600"
              }`}
            >
              <span
                className={
                  isDark ? "text-white font-black" : "text-slate-950 font-black"
                }
              >
                2.400+
              </span>{" "}
              bisnis aktif menggunakan Bookinaja
            </p>
          </div>
        </div>

        {/* ── HERO VISUAL ── */}
        <div
          className="relative mt-20 mx-auto max-w-5xl"
          style={{
            animation: heroReveal.visible
              ? "slideUp 1s 0.6s cubic-bezier(0.16,1,0.3,1) both"
              : "none",
          }}
        >
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-[3rem] bg-blue-600/10 blur-3xl scale-105" />

          {/* Main dashboard frame */}
          <div
            className={`relative rounded-[2.5rem] border p-2 backdrop-blur-xl shadow-2xl ${
              isDark
                ? "border-white/10 bg-white/5"
                : "border-slate-200 bg-white/80"
            }`}
          >
            <div
              className={`overflow-hidden rounded-[2rem] ${
                isDark ? "border border-white/5" : "border border-slate-200"
              }`}
            >
              <div
                className={`relative h-[340px] md:h-[480px] overflow-hidden ${
                  isDark ? "bg-slate-950" : "bg-slate-50"
                }`}
              >
                {/* Fake dashboard UI */}
                <div className="absolute inset-0 p-6 grid grid-cols-12 grid-rows-6 gap-3">
                  {/* Sidebar */}
                  <div className="col-span-2 row-span-6 bg-white/5 rounded-2xl border border-white/5 p-3 flex flex-col gap-2">
                    <div className="h-6 w-6 rounded-lg bg-blue-600 mx-auto mb-3" />
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-8 rounded-xl ${i === 1 ? "bg-blue-600/30 border border-blue-500/30" : "bg-white/5"}`}
                      />
                    ))}
                  </div>

                  {/* Stats row */}
                  {[
                    {
                      label: "Total Booking",
                      val: "1,284",
                      color: "text-white",
                    },
                    {
                      label: "Pendapatan",
                      val: "Rp 28.4jt",
                      color: "text-emerald-400",
                    },
                    {
                      label: "Unit Aktif",
                      val: "18/24",
                      color: "text-blue-400",
                    },
                    { label: "Rating", val: "4.9★", color: "text-yellow-400" },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className="col-span-2 row-span-1 bg-white/5 rounded-xl border border-white/5 p-2 flex flex-col justify-between"
                    >
                      <span className="text-white/30 text-[8px] font-bold uppercase">
                        {s.label}
                      </span>
                      <span className={`text-sm font-black ${s.color}`}>
                        {s.val}
                      </span>
                    </div>
                  ))}

                  {/* Chart area */}
                  <div className="col-span-7 row-span-3 bg-white/5 rounded-2xl border border-white/5 p-4">
                    <div className="flex items-end gap-1 h-full">
                      {[40, 65, 45, 80, 95, 70, 85, 60, 90, 75, 100, 88].map(
                        (h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-t-md bg-blue-600/30 border-t border-blue-500/50 transition-all"
                            style={{
                              height: `${h}%`,
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ),
                      )}
                    </div>
                  </div>

                  {/* Recent activity */}
                  <div className="col-span-3 row-span-3 bg-white/5 rounded-2xl border border-white/5 p-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <div
                          className={`h-6 w-6 rounded-lg flex-shrink-0 ${["bg-blue-600/40", "bg-emerald-500/40", "bg-orange-500/40", "bg-purple-500/40"][i]}`}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="h-2 bg-white/20 rounded-full w-full" />
                          <div className="h-1.5 bg-white/10 rounded-full w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom row */}
                  <div className="col-span-10 row-span-2 bg-white/5 rounded-2xl border border-white/5 p-3">
                    <div className="grid grid-cols-6 gap-2 h-full">
                      {[
                        "PS-01 •",
                        "PS-02 ○",
                        "PS-03 •",
                        "PC-01 •",
                        "PC-02 ○",
                        "VIP •",
                      ].map((slot, i) => (
                        <div
                          key={i}
                          className={`rounded-xl flex items-center justify-center text-[8px] font-black uppercase ${
                            slot.includes("○")
                              ? "bg-white/5 text-white/30"
                              : "bg-blue-600/20 border border-blue-500/30 text-blue-400"
                          }`}
                        >
                          {slot.replace(" •", "").replace(" ○", "")}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating badge 1: Cuan */}
          <div className="absolute -bottom-5 -left-4 hidden md:flex bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-2xl flex-col items-start gap-1 -rotate-2 hover:rotate-0 transition-transform duration-500">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                Cuan Hari Ini
              </span>
            </div>
            <p className="text-white text-xl font-black italic">+124%</p>
            <p className="text-white/40 text-[8px] font-semibold">
              vs bulan lalu
            </p>
          </div>

          {/* Floating badge 2: Notification */}
          <div className="absolute -top-4 -right-4 hidden md:flex bg-blue-600 p-4 rounded-2xl shadow-2xl flex-col items-start gap-1 rotate-2 hover:rotate-0 transition-transform duration-500">
            <Bell size={14} className="text-white mb-1" />
            <p className="text-white text-[10px] font-black uppercase tracking-widest leading-none">
              Booking Baru!
            </p>
            <p className="text-blue-200 text-[9px] font-semibold">
              Ahmad — PS-03 • 2 jam
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          MARQUEE LOGOS
      ══════════════════════════════════════ */}
      <div
        className={`relative z-10 w-full py-8 overflow-hidden border-y ${isDark ? "border-white/5" : "border-slate-200"}`}
      >
        <div className="flex gap-16 marquee-track">
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
                className="flex items-center gap-3 flex-shrink-0"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500/60" />
                <span
                  className={`text-sm font-black uppercase tracking-widest ${isDark ? "text-white/30" : "text-slate-500"}`}
                >
                  {name}
                </span>
              </div>
            )),
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          STATS
      ══════════════════════════════════════ */}
      <section className="relative z-10 w-full max-w-screen-xl mx-auto px-6 py-24">
        <div
          ref={statsReveal.ref}
          className={`grid grid-cols-2 md:grid-cols-4 gap-px rounded-[2.5rem] overflow-hidden border ${isDark ? "bg-white/5 border-white/5" : "bg-slate-200 border-slate-200"}`}
          style={{
            opacity: statsReveal.visible ? 1 : 0,
            transform: statsReveal.visible ? "none" : "translateY(40px)",
            transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)",
          }}
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
              className={`p-10 text-center group hover:bg-blue-600/5 transition-colors duration-500 ${isDark ? "bg-white/[0.02]" : "bg-white"}`}
            >
              <p className="text-4xl md:text-5xl font-black number-gradient mb-2 tabular-nums">
                <AnimatedCounter target={s.val} suffix={s.suffix} />
              </p>
              <p
                className={`text-sm font-black uppercase tracking-wider ${sectionHeadingClass}`}
              >
                {s.label}
              </p>
              <p
                className={`text-xs font-semibold mt-1 ${isDark ? "text-white/30" : "text-slate-500"}`}
              >
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURES — BENTO GRID
      ══════════════════════════════════════ */}
      <section className="relative z-10 w-full max-w-screen-xl mx-auto px-6 py-12">
        <div
          ref={featReveal.ref}
          style={{
            opacity: featReveal.visible ? 1 : 0,
            transform: featReveal.visible ? "none" : "translateY(50px)",
            transition: "all 0.9s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Section label */}
          <div className="text-center mb-16 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-blue-400">
              <Zap className="h-3 w-3 fill-current" /> Fitur Unggulan
            </span>
            <h2
              className={`text-4xl md:text-6xl font-black tracking-[-0.04em] leading-none ${sectionHeadingClass}`}
            >
              Semua yang Kamu
              <br />
              <span className="shimmer-text">Butuhkan.</span>
            </h2>
            <p className={`max-w-lg mx-auto font-medium ${mutedClass}`}>
              Dirancang untuk owner yang ingin fokus mengembangkan bisnis, bukan
              tenggelam dalam urusan administrasi.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Large card: Live Monitor */}
            <div
              className={`md:col-span-2 lg:col-span-2 bento-hover card-tilt rounded-[2.5rem] p-8 overflow-hidden relative group ${cardClass}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                    <Activity size={18} className="text-blue-400" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400 border border-blue-500/20 rounded-full px-3 py-1">
                    Live
                  </span>
                </div>
                <h3
                  className={`text-2xl font-black tracking-tight mb-3 ${sectionHeadingClass}`}
                >
                  Monitoring Slot Realtime
                </h3>
                <p
                  className={`text-sm font-medium leading-relaxed mb-8 ${mutedClass}`}
                >
                  Pantau semua unit dari HP. Tau persis mana yang kosong, siapa
                  yang pakai, dan berapa sisa waktu — tanpa nelpon kasir.
                </p>
                <DashboardWidget />
              </div>
            </div>

            {/* Website Otomatis */}
            <div
              className={`bento-hover card-tilt rounded-[2.5rem] p-8 relative group overflow-hidden ${cardClass}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="h-10 w-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mb-6">
                <Globe size={18} className="text-purple-400" />
              </div>
              <h3
                className={`text-xl font-black tracking-tight mb-3 ${sectionHeadingClass}`}
              >
                Website Booking Otomatis
              </h3>
              <p
                className={`text-sm font-medium leading-relaxed mb-6 ${mutedClass}`}
              >
                Portal profesional{" "}
                <span className="text-white/70 font-black">
                  namabisnis.bookinaja.com
                </span>{" "}
                langsung aktif saat daftar. Siap terima booking 24 jam.
              </p>
              <div
                className={`rounded-2xl border p-4 ${innerPanelClass} ${isDark ? "border-white/5" : "border-slate-200"}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex gap-1">
                    {["bg-red-500", "bg-yellow-500", "bg-green-500"].map(
                      (c, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${c}`} />
                      ),
                    )}
                  </div>
                  <div
                    className={`flex-1 rounded-md h-5 flex items-center px-2 ${isDark ? "bg-white/5" : "bg-slate-100"}`}
                  >
                    <span
                      className={`text-[9px] font-mono ${isDark ? "text-white/30" : "text-slate-500"}`}
                    >
                      gaminghub.bookinaja.com
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div
                    className={
                      isDark
                        ? "h-3 bg-white/10 rounded w-3/4"
                        : "h-3 bg-slate-200 rounded w-3/4"
                    }
                  />
                  <div
                    className={
                      isDark
                        ? "h-3 bg-white/5 rounded w-1/2"
                        : "h-3 bg-slate-100 rounded w-1/2"
                    }
                  />
                  <div className="h-8 bg-blue-600/30 border border-blue-500/30 rounded-lg mt-4" />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div
              className={`bento-hover card-tilt rounded-[2.5rem] p-8 relative group overflow-hidden ${cardClass}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="h-10 w-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mb-6">
                <Wallet size={18} className="text-emerald-400" />
              </div>
              <h3
                className={`text-xl font-black tracking-tight mb-3 ${sectionHeadingClass}`}
              >
                Pembayaran Digital
              </h3>
              <p
                className={`text-sm font-medium leading-relaxed mb-6 ${mutedClass}`}
              >
                QRIS, transfer bank, dan dompet digital. Semua tercatat otomatis
                tanpa rekap manual.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {["QRIS", "Bank", "OVO", "GoPay", "Dana", "ShopeePay"].map(
                  (p, i) => (
                    <div
                      key={i}
                      className={`rounded-xl py-2 text-center ${isDark ? "bg-white/5 border border-white/5" : "bg-slate-50 border border-slate-200"}`}
                    >
                      <span
                        className={`text-[9px] font-black uppercase ${isDark ? "text-white/50" : "text-slate-500"}`}
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
              className={`bento-hover card-tilt rounded-[2.5rem] p-8 relative group overflow-hidden ${cardClass}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="h-10 w-10 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center mb-6">
                <BarChart3 size={18} className="text-orange-400" />
              </div>
              <h3
                className={`text-xl font-black tracking-tight mb-3 ${sectionHeadingClass}`}
              >
                Laporan & Analitik
              </h3>
              <p
                className={`text-sm font-medium leading-relaxed mb-6 ${mutedClass}`}
              >
                Lihat tren pendapatan, unit terpopuler, dan jam sibuk — semua
                dalam satu dashboard eksekutif.
              </p>
              <div className="flex items-end gap-1 h-16">
                {[30, 55, 40, 80, 65, 90, 75].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-orange-500/30 border-t border-orange-500/50"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Security */}
            <div
              className={`bento-hover card-tilt rounded-[2.5rem] p-8 relative group overflow-hidden ${cardClass}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="h-10 w-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-6">
                <ShieldCheck size={18} className="text-blue-400" />
              </div>
              <h3
                className={`text-xl font-black tracking-tight mb-3 ${sectionHeadingClass}`}
              >
                Isolasi Data Bisnis
              </h3>
              <p
                className={`text-sm font-medium leading-relaxed mb-4 ${mutedClass}`}
              >
                Setiap tenant mendapat database terisolasi. Data kamu tidak
                pernah campur dengan bisnis lain.
              </p>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-blue-400" />
                <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">
                  Enterprise-grade Encryption
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          INDUSTRIES
      ══════════════════════════════════════ */}
      <section
        id="industries"
        className="relative z-10 w-full max-w-screen-xl mx-auto px-6 py-24"
      >
        <div
          ref={indReveal.ref}
          style={{
            opacity: indReveal.visible ? 1 : 0,
            transform: indReveal.visible ? "none" : "translateY(50px)",
            transition: "all 0.9s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div className="text-center mb-16 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-blue-400">
              <Globe className="h-3 w-3" /> Sektor Usaha
            </span>
            <h2
              className={`text-4xl md:text-6xl font-black tracking-[-0.04em] leading-none ${sectionHeadingClass}`}
            >
              Satu Sistem.
              <br />
              <span className="shimmer-text">Apapun Bisnisnya.</span>
            </h2>
            <p className={`max-w-md mx-auto font-medium ${mutedClass}`}>
              Dirancang fleksibel untuk berbagai model persewaan slot & unit di
              seluruh Indonesia.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <Monitor size={24} />,
                title: "Gaming Hub",
                desc: "Rental PS, PC, & Game Center. Billing per jam otomatis.",
                accent: "blue",
                industries: ["PS5", "Xbox", "PC Gaming", "VR"],
              },
              {
                icon: <Camera size={24} />,
                title: "Studio Kreatif",
                desc: "Studio Foto, Podcast, & Musik. Kelola sesi dan paket alat.",
                accent: "purple",
                industries: ["Foto", "Video", "Podcast", "Musik"],
              },
              {
                icon: <Zap size={24} />,
                title: "Arena Olahraga",
                desc: "Futsal, Badminton, Gym. Cek slot langsung dari HP.",
                accent: "emerald",
                industries: ["Futsal", "Badminton", "Gym", "Renang"],
              },
              {
                icon: <Briefcase size={24} />,
                title: "Office Space",
                desc: "Coworking, Meeting Room. Kelola akses harian atau bulanan.",
                accent: "orange",
                industries: ["Cowork", "Meeting", "Private", "Virtual"],
              },
            ].map((item, i) => {
              const accents: Record<string, string> = {
                blue: "bg-blue-600/15 border-blue-500/20 text-blue-400 group-hover:bg-blue-600",
                purple:
                  "bg-purple-600/15 border-purple-500/20 text-purple-400 group-hover:bg-purple-600",
                emerald:
                  "bg-emerald-600/15 border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-600",
                orange:
                  "bg-orange-600/15 border-orange-500/20 text-orange-400 group-hover:bg-orange-600",
              };
              return (
                <div
                  key={i}
                  className={`group bento-hover rounded-[2.5rem] p-8 relative overflow-hidden hover:border-white/20 transition-all duration-500 ${cardClass}`}
                  style={{ transitionDelay: `${i * 0.1}s` }}
                >
                  <div
                    className={`h-12 w-12 rounded-2xl border flex items-center justify-center mb-6 transition-all duration-500 ${accents[item.accent]} group-hover:text-white`}
                  >
                    {item.icon}
                  </div>
                  <h4
                    className={`text-lg font-black tracking-tight mb-3 ${sectionHeadingClass}`}
                  >
                    {item.title}
                  </h4>
                  <p
                    className={`text-sm font-medium leading-relaxed mb-6 ${mutedClass}`}
                  >
                    {item.desc}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.industries.map((tag, j) => (
                      <span
                        key={j}
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isDark ? "bg-white/5 text-white/30" : "bg-slate-100 text-slate-500"}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <ArrowUpRight
                    size={32}
                    className="absolute top-6 right-6 text-white/5 group-hover:text-white/10 transition-colors"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════ */}
      <section className="relative z-10 w-full max-w-screen-xl mx-auto px-6 py-24">
        <div className="text-center mb-16 space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-blue-400">
            <Clock className="h-3 w-3" /> Cara Kerja
          </span>
          <h2
            className={`text-4xl md:text-6xl font-black tracking-[-0.04em] leading-none ${sectionHeadingClass}`}
          >
            Online dalam
            <br />
            <span className="shimmer-text">5 Menit.</span>
          </h2>
        </div>
        <div className="relative grid md:grid-cols-3 gap-4">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          {[
            {
              step: "01",
              title: "Daftar Bisnis",
              desc: "Isi nama bisnis, pilih tipe unit, dan atur jam operasional. Selesai dalam 2 menit.",
              icon: <Users size={20} />,
            },
            {
              step: "02",
              title: "Setup Unit & Harga",
              desc: "Tambahkan unit PS, meja, lapangan, atau apapun. Tentukan tarif per jam atau per sesi.",
              icon: <Clock size={20} />,
            },
            {
              step: "03",
              title: "Terima Booking",
              desc: "Portal langsung aktif. Customer bisa booking online, bayar digital, dan dapat notifikasi otomatis.",
              icon: <CheckCircle2 size={20} />,
            },
          ].map((s, i) => (
            <div
              key={i}
              className={`group relative rounded-[2.5rem] p-8 bento-hover hover:border-blue-500/30 transition-all duration-500 ${cardClass}`}
            >
              <div className="flex items-center gap-4 mb-6">
                <span
                  className={`text-5xl font-black leading-none ${isDark ? "text-white/5" : "text-slate-200"}`}
                >
                  {s.step}
                </span>
                <div className="h-10 w-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                  {s.icon}
                </div>
              </div>
              <h3
                className={`text-xl font-black tracking-tight mb-3 ${sectionHeadingClass}`}
              >
                {s.title}
              </h3>
              <p
                className={`font-medium leading-relaxed text-sm ${mutedClass}`}
              >
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          STAFF MANAGEMENT
      ══════════════════════════════════════ */}
      <section className="relative z-10 w-full max-w-screen-xl mx-auto px-6 py-12">
        <div
          ref={staffReveal.ref}
          className={`relative overflow-hidden rounded-[3rem] p-10 md:p-16 ${isDark ? "border border-white/10 bg-white/[0.02]" : "border border-slate-200 bg-white"}`}
          style={{
            opacity: staffReveal.visible ? 1 : 0,
            transform: staffReveal.visible ? "none" : "translateY(50px)",
            transition: "all 0.9s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(59,130,246,0.08),transparent_60%)]" />
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
            <Lock size={400} strokeWidth={0.5} className="text-blue-400" />
          </div>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-blue-400">
                <Lock className="h-3 w-3" /> Kontrol Staff
              </span>
              <h2
                className={`text-4xl md:text-6xl font-black tracking-[-0.04em] leading-none ${sectionHeadingClass}`}
              >
                Tim Hebat,
                <br />
                <span className="shimmer-text">Kontrol Penuh.</span>
              </h2>
              <p
                className={`font-medium leading-relaxed text-base ${mutedClass}`}
              >
                Buat akun kasir dengan akses terbatas. Mereka bisa kelola
                booking dan terima bayaran — tapi tidak bisa lihat total cuan
                atau laporan rahasia kamu.
              </p>
              <div className="space-y-3 pt-4">
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
                    className={`flex items-start gap-4 p-4 rounded-2xl hover:border-blue-500/20 transition-colors ${isDark ? "bg-white/5 border border-white/5" : "bg-slate-50 border border-slate-200"}`}
                  >
                    <CheckCircle2 className="text-blue-500 w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p
                        className={`text-sm font-black uppercase tracking-wide ${sectionHeadingClass}`}
                      >
                        {item.label}
                      </p>
                      <p className={`text-xs font-medium mt-0.5 ${mutedClass}`}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Role Cards Visual */}
            <div className="relative h-72 md:h-80">
              {/* Owner card */}
              <div
                className={`absolute top-0 right-0 left-10 rounded-[2rem] p-6 border shadow-2xl ${isDark ? "bg-slate-900 border-white/10" : "bg-slate-50 border-slate-200"}`}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-sm">
                    OW
                  </div>
                  <div>
                    <p
                      className={`font-black uppercase text-sm leading-none ${sectionHeadingClass}`}
                    >
                      Owner Admin
                    </p>
                    <p className="text-blue-400 text-[9px] font-bold uppercase tracking-widest mt-1">
                      Full Access
                    </p>
                  </div>
                  <div className="ml-auto flex gap-1">
                    {["bg-emerald-500", "bg-blue-500", "bg-purple-500"].map(
                      (c, i) => (
                        <div key={i} className={`h-2 w-2 rounded-full ${c}`} />
                      ),
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
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
                className={`absolute bottom-0 left-0 right-10 rounded-[2rem] p-6 border shadow-2xl rotate-1 group hover:rotate-0 transition-transform duration-500 ${isDark ? "bg-slate-900 border-white/10" : "bg-slate-50 border-slate-200"}`}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-700 flex items-center justify-center font-black text-white text-sm">
                    KS
                  </div>
                  <div>
                    <p
                      className={`font-black uppercase text-sm leading-none ${sectionHeadingClass}`}
                    >
                      Kasir
                    </p>
                    <p className="text-orange-400 text-[9px] font-bold uppercase tracking-widest mt-1">
                      Limited Access
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Booking", active: true },
                    { label: "Laporan", active: false },
                    { label: "Keuangan", active: false },
                    { label: "Staff", active: false },
                    { label: "Setting", active: false },
                    { label: "Unit", active: true },
                    { label: "Analitik", active: false },
                    { label: "Export", active: false },
                  ].map((f, i) => (
                    <div
                      key={i}
                      className={`rounded-lg py-1 text-center border ${f.active ? "bg-emerald-600/20 border-emerald-500/20" : isDark ? "bg-white/5 border-white/5 opacity-40" : "bg-slate-100 border-slate-200 opacity-60"}`}
                    >
                      <span
                        className={`text-[8px] font-black uppercase ${f.active ? "text-emerald-400" : isDark ? "text-white/30" : "text-slate-500"}`}
                      >
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════ */}
      <section className="relative z-10 w-full max-w-screen-xl mx-auto px-6 py-24">
        <div
          ref={testimReveal.ref}
          style={{
            opacity: testimReveal.visible ? 1 : 0,
            transform: testimReveal.visible ? "none" : "translateY(50px)",
            transition: "all 0.9s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div className="text-center mb-16 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-blue-400">
              <Star className="h-3 w-3 fill-current" /> Testimoni
            </span>
            <h2
              className={`text-4xl md:text-6xl font-black tracking-[-0.04em] leading-none ${sectionHeadingClass}`}
            >
              Kata Mereka
              <br />
              <span className="shimmer-text">yang Pakai.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                name: "Rizky Firmansyah",
                role: "Owner Gaming Hub Surabaya",
                text: "Sebelum pakai Bookinaja, kasir saya nulis di buku. Sekarang semua otomatis, saya bisa pantau dari rumah sambil santai. Pendapatan naik 40% karena nggak ada lagi 'lupa catat'.",
                stars: 5,
                avatar: "RF",
                color: "bg-blue-600",
              },
              {
                name: "Siti Rahayu",
                role: "Owner Studio Foto Jakarta",
                text: "Booking online-nya bikin customer saya lebih happy. Mereka bisa pilih slot sendiri, bayar lewat QRIS, dan langsung dapat konfirmasi. Saya nggak perlu lagi balas WA satu-satu.",
                stars: 5,
                avatar: "SR",
                color: "bg-purple-600",
              },
              {
                name: "Budi Santoso",
                role: "Owner Lapangan Futsal Bandung",
                text: "Fitur laporan keuangannya detail banget. Saya bisa lihat hari apa paling ramai, jam berapa paling sepi, dan unit mana yang paling cuan. Strategi bisnis jadi lebih tajam.",
                stars: 5,
                avatar: "BS",
                color: "bg-emerald-600",
              },
            ].map((t, i) => (
              <div
                key={i}
                className={`group rounded-[2.5rem] p-8 bento-hover hover:border-white/20 transition-all duration-500 ${cardClass}`}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(t.stars)].map((_, j) => (
                    <Star
                      key={j}
                      size={14}
                      className="fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p
                  className={`text-sm font-medium leading-relaxed mb-8 italic ${isDark ? "text-white/60" : "text-slate-600"}`}
                >
                  "{t.text}"
                </p>
                <div className="flex items-center gap-4">
                  <div
                    className={`h-10 w-10 rounded-2xl ${t.color} flex items-center justify-center font-black text-white text-sm flex-shrink-0`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className={`text-sm font-black ${sectionHeadingClass}`}>
                      {t.name}
                    </p>
                    <p className={`text-xs font-medium ${mutedClass}`}>
                      {t.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          PRICING
      ══════════════════════════════════════ */}
      <section className="relative z-10 w-full max-w-screen-xl mx-auto px-6 py-24">
        <div
          ref={pricingReveal.ref}
          style={{
            opacity: pricingReveal.visible ? 1 : 0,
            transform: pricingReveal.visible ? "none" : "translateY(50px)",
            transition: "all 0.9s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div className="text-center mb-16 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-blue-400">
              <Wallet className="h-3 w-3" /> Harga Paket
            </span>
            <h2
              className={`text-4xl md:text-6xl font-black tracking-[-0.04em] leading-none ${sectionHeadingClass}`}
            >
              Investasi Kecil,
              <br />
              <span className="shimmer-text">Cuan Berlipat.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4 items-start">
            {[
              {
                name: "Starter",
                price: "149K",
                period: "/bulan",
                desc: "Digitalisasi dasar untuk operasional bisnis persewaan tunggal.",
                features: [
                  "1 Akun Utama (Owner Only)",
                  "Akses Full Dashboard Admin",
                  "Website Booking (Subdomain)",
                  "Manajemen 1-5 Unit/Resource",
                  "Laporan Pendapatan Bulanan",
                  "Email & Chat Support",
                ],
                cta: "Pilih Starter",
                highlight: false,
              },
              {
                name: "Pro",
                price: "299K",
                period: "/bulan",
                desc: "Fitur lengkap untuk bisnis dengan tim dan trafik tinggi.",
                features: [
                  "Akses Akun Staff/Karyawan",
                  "Role-Based Access (Admin/Kasir)",
                  "Unit & Resource Tanpa Batas",
                  "Dashboard Status Live Real-time",
                  "Sistem Harga Khusus Weekend",
                  "WhatsApp Reminder Otomatis",
                  "Prioritas Support 24/7",
                ],
                cta: "Pilih Pro",
                highlight: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "/bulan",
                desc: "Dukungan eksklusif untuk jaringan bisnis skala nasional.",
                features: [
                  "Custom Domain (bisnisanda.com)",
                  "Hapus Logo & Branding Bookinaja",
                  "Unlimited Multi-User Roles",
                  "Analitik Data Konsumen Lanjutan",
                  "SLA & Akun Manajer Khusus",
                  "Setup Dibantu Tim Ahli",
                ],
                cta: "Hubungi Kami",
                highlight: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`rounded-[2.5rem] p-8 border relative overflow-hidden transition-all duration-500 bento-hover ${
                  plan.highlight
                    ? "bg-blue-600 border-blue-500 shadow-2xl shadow-blue-500/25 scale-105 text-white"
                    : cardClass + " hover:border-white/20"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute top-6 right-6">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-white">
                      Terpopuler
                    </span>
                  </div>
                )}
                <p
                  className={`text-sm font-black uppercase tracking-widest mb-2 ${plan.highlight ? "text-blue-200" : mutedClass}`}
                >
                  {plan.name}
                </p>
                <div className="flex items-end gap-1 mb-4">
                  <span
                    className={`text-5xl font-black ${sectionHeadingClass}`}
                  >
                    Rp {plan.price}
                  </span>
                  <span
                    className={`text-sm font-bold mb-2 ${plan.highlight ? "text-blue-200" : mutedClass}`}
                  >
                    {plan.period}
                  </span>
                </div>
                <p
                  className={`text-sm font-medium leading-relaxed mb-8 ${plan.highlight ? "text-blue-100" : mutedClass}`}
                >
                  {plan.desc}
                </p>
                <div className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <CheckCircle2
                        size={16}
                        className={
                          plan.highlight ? "text-white" : "text-blue-400"
                        }
                      />
                      <span
                        className={`text-sm font-semibold ${plan.highlight ? "text-white" : isDark ? "text-white/60" : "text-slate-600"}`}
                      >
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
                <Link href="/register">
                  <Button
                    className={`w-full h-12 text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all hover:scale-105 ${
                      plan.highlight
                        ? "bg-white text-blue-600 hover:bg-blue-50"
                        : "bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white"
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════ */}
      <section className="relative z-10 w-full max-w-screen-xl mx-auto px-6 pb-24">
        <div
          ref={ctaReveal.ref}
          style={{
            opacity: ctaReveal.visible ? 1 : 0,
            transform: ctaReveal.visible ? "none" : "translateY(50px)",
            transition: "all 0.9s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div
            className={`relative overflow-hidden rounded-[3rem] border px-8 py-24 md:py-36 text-center ${isDark ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"}`}
          >
            <div
              className={`absolute inset-0 ${isDark ? "bg-[radial-gradient(ellipse_at_50%_100%,rgba(59,130,246,0.25)_0%,transparent_60%)]" : "bg-[radial-gradient(ellipse_at_50%_100%,rgba(59,130,246,0.10)_0%,transparent_60%)]"}`}
            />
            <div
              className={`absolute inset-0 ${isDark ? "bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.08)_0%,transparent_60%)]" : "bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.05)_0%,transparent_60%)]"}`}
            />
            <ParticleField />

            <div className="relative z-10 max-w-4xl mx-auto space-y-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-blue-400">
                <Rocket className="h-3 w-3" /> Mulai Hari Ini
              </span>
              <h2
                className={`text-5xl md:text-8xl font-black tracking-[-0.04em] leading-[0.88] uppercase ${sectionHeadingClass}`}
              >
                Bisnis Kamu
                <br />
                <span className="shimmer-text">Bisa Autopilot.</span>
              </h2>
              <p
                className={`font-medium text-base max-w-lg mx-auto ${mutedClass}`}
              >
                Bergabung dengan 2.400+ bisnis Indonesia yang sudah membuktikan.
                Gratis 14 hari, tanpa kartu kredit.
              </p>

              <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
                <Link href="/register">
                  <Button className="h-16 md:h-20 px-12 text-xs font-black uppercase tracking-[0.2em] rounded-2xl bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all text-white border-0 shadow-2xl shadow-blue-500/30">
                    Daftar Gratis Sekarang{" "}
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link
                  href="/pricing"
                  className={`transition-colors text-[10px] font-black uppercase tracking-[0.4em] underline underline-offset-8 decoration-blue-500/50 ${isDark ? "text-white/40 hover:text-white" : "text-slate-500 hover:text-slate-950"}`}
                >
                  Lihat Semua Paket →
                </Link>
              </div>

              {/* Feature bullets */}
              <div className="flex flex-wrap justify-center items-center gap-6 pt-4">
                {[
                  "✓ Gratis 14 hari",
                  "✓ Tanpa kartu kredit",
                  "✓ Setup 5 menit",
                  "✓ Batalkan kapanpun",
                ].map((f) => (
                  <span
                    key={f}
                    className={`text-xs font-semibold ${isDark ? "text-white/30" : "text-slate-500"}`}
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

/* ─────────────────────────────────────────────
   (unused imports kept for compatibility)
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
