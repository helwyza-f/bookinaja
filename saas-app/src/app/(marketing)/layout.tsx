"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Mencegah hydration mismatch untuk toggle theme
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex min-h-screen flex-col selection:bg-blue-600/30 font-plus-jakarta transition-colors duration-300">
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-[100] w-full px-4 pt-4 md:pt-6">
        <div className="container mx-auto max-w-7xl">
          <div className="flex h-16 md:h-22 items-center justify-between rounded-[1.5rem] md:rounded-[2rem] border border-border/50 dark:border-white/10 bg-background/60 dark:bg-[#07070d]/60 px-5 md:px-8 shadow-xl dark:shadow-[0_0_20px_-5px_rgba(59,130,246,0.2)] backdrop-blur-2xl transition-all">
            {/* Logo - Perbesar Ukuran */}
            <Link href="/" className="group flex items-center gap-3 md:gap-4">
              <div className="flex h-11 w-11 md:h-14 md:w-14 items-center justify-center rounded-xl md:rounded-2xl bg-[#0f1f4a] shadow-lg transition-transform group-hover:rotate-6">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 64 64"
                  fill="none"
                  className="md:w-10 md:h-10"
                >
                  <rect
                    x="14"
                    y="20"
                    width="36"
                    height="10"
                    rx="5"
                    fill="#3b82f6"
                  />
                  <rect
                    x="14"
                    y="35"
                    width="24"
                    height="10"
                    rx="5"
                    fill="#1d4ed8"
                  />
                </svg>
              </div>
              <span className="text-2xl md:text-3xl font-black tracking-tighter text-foreground">
                <span className="text-blue-500">book</span>inaja
              </span>
            </Link>

            {/* Navigation - Desktop Only */}
            <nav className="hidden lg:flex items-center gap-10">
              <Link
                href="#industries"
                className="text-sm font-bold uppercase tracking-[0.2em] text-foreground hover:text-blue-500 transition-colors"
              >
                Industries
              </Link>
              <Link
                href="#features"
                className="text-sm font-bold uppercase tracking-[0.2em] text-foreground hover:text-blue-500 transition-colors"
              >
                Fitur
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-bold uppercase tracking-[0.2em] text-foreground hover:text-blue-500 transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/faq"
                className="text-sm font-bold uppercase tracking-[0.2em] text-foreground hover:text-blue-500 transition-colors"
              >
                FAQ
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {/* Theme Toggle - Desktop Only */}
              {mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="rounded-xl hidden md:flex hover:bg-secondary/80"
                >
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              )}

              <Link href="/register">
                <Button className="rounded-xl md:rounded-2xl bg-blue-600 px-6 md:px-10 h-11 md:h-14 font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm md:text-base">
                  Mulai Bisnis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* --- FLOATING THEME TOGGLE (MOBILE ONLY) --- */}
      {mounted && (
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="md:hidden fixed bottom-6 right-6 z-[200] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_10px_30px_rgba(59,130,246,0.5)] active:scale-90 transition-all"
        >
          {theme === "dark" ? (
            <Sun className="h-6 w-6" />
          ) : (
            <Moon className="h-6 w-6" />
          )}
        </button>
      )}

      <main className="flex-1 w-full bg-background">{children}</main>

      {/* --- FOOTER --- */}
      <footer className="relative z-10 border-t border-border/50 bg-secondary/20 pt-24 pb-12 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="grid gap-16 md:grid-cols-2 lg:grid-cols-4 text-sm">
            {/* Brand Column */}
            <div className="space-y-8">
              <div className="text-3xl font-black text-foreground tracking-tighter">
                <span className="text-blue-500">book</span>inaja
              </div>
              <div className="space-y-4 text-muted-foreground font-medium">
                <p className="flex items-start gap-4">
                  <MapPin className="h-5 w-5 text-blue-500 shrink-0 mt-1" />
                  <span className="leading-relaxed">
                    Kec. Batam Kota, Kota Batam,
                    <br />
                    Kepulauan Riau 29464
                  </span>
                </p>
                <p className="flex items-center gap-4">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <span>support@bookinaja.com</span>
                </p>
                <p className="flex items-center gap-4">
                  <Phone className="h-5 w-5 text-blue-500" />
                  <span>+62 812-xxxx-xxxx</span>
                </p>
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="mb-8 font-syne text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500">
                Layanan
              </h4>
              <ul className="space-y-5 text-muted-foreground font-semibold">
                <li>
                  <Link
                    href="/pricing"
                    className="hover:text-blue-500 transition-colors"
                  >
                    Pricing Paket (IDR)
                  </Link>
                </li>
                <li>
                  <Link
                    href="#features"
                    className="hover:text-blue-500 transition-colors"
                  >
                    Digitalisasi AI
                  </Link>
                </li>
                <li>
                  <Link
                    href="#features"
                    className="hover:text-blue-500 transition-colors"
                  >
                    Publisitas Bisnis
                  </Link>
                </li>
              </ul>
            </div>

            {/* Policies */}
            <div>
              <h4 className="mb-8 font-syne text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500">
                Kebijakan
              </h4>
              <ul className="space-y-5 text-muted-foreground font-semibold">
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-blue-500 transition-colors"
                  >
                    Syarat & Ketentuan
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-blue-500 transition-colors"
                  >
                    Kebijakan Privasi
                  </Link>
                </li>
                <li>
                  <Link
                    href="/refund"
                    className="hover:text-blue-500 transition-colors"
                  >
                    Kebijakan Refund
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social */}
            <div className="space-y-8">
              <h4 className="font-syne text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500">
                Connect
              </h4>
              <div className="flex gap-4">
                <Link
                  href="https://instagram.com/bookinaja"
                  className="p-3 rounded-2xl bg-background border border-border/50 hover:bg-blue-500 hover:text-white transition-all hover:-translate-y-1 shadow-sm"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </Link>
                <Link
                  href="https://linkedin.com/company/bookinaja"
                  className="p-3 rounded-2xl bg-background border border-border/50 hover:bg-blue-500 hover:text-white transition-all hover:-translate-y-1 shadow-sm"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect width="4" height="12" x="2" y="9" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-24 border-t border-border/50 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              © 2026 bookinaja.com · Batam, Indonesia 🇮🇩
            </div>
            <div className="flex items-center gap-8 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
              <span>Security Verified</span>
              <span>Cloud Infrastructure</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
