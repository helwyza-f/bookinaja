"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const currentTheme = resolvedTheme || theme;

  // Mencegah hydration mismatch
  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Demo", href: "/demos" },
    { name: "Pricing", href: "/pricing" },
    { name: "Jelajahi Bisnis", href: "/tenants" },
  ];

  return (
    <div className="flex min-h-screen flex-col selection:bg-blue-600/30 font-plus-jakarta transition-colors duration-300 relative">
      {/* --- HEADER (MELAYANG / FIXED) --- */}
      {/* Kita pakai fixed agar Hero naik ke paling atas layar */}
      <header className="fixed top-0 left-0 right-0 z-[100] w-full px-4 py-4 md:py-6 transition-all duration-300">
        <div className="container mx-auto max-w-7xl">
          <div
            className={cn(
              "flex h-16 md:h-20 items-center justify-between rounded-[1rem] md:rounded-[1rem] border px-5 md:px-8 transition-all duration-500",
              // Efek Glassmorphism yang menyesuaikan scroll
              isScrolled
                ? "border-border/50 dark:border-white/10 bg-background/80 dark:bg-[#07070d]/80 shadow-2xl backdrop-blur-2xl py-2"
                : "border-transparent bg-transparent py-4 shadow-none backdrop-blur-none",
            )}
          >
            {/* Logo */}
            <Link
              href="/"
              className="group flex items-center gap-3 md:gap-4 shrink-0"
            >
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-[#0f1f4a] shadow-lg transition-transform group-hover:rotate-6">
                <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
                  <rect
                    x="10"
                    y="18"
                    width="46"
                    height="12"
                    rx="5"
                    fill="#3b82f6"
                  />
                  <rect
                    x="10"
                    y="37"
                    width="26"
                    height="12"
                    rx="5"
                    fill="#1d4ed8"
                  />
                </svg>
              </div>
              <span className="text-xl md:text-2xl font-[1000] tracking-tighter text-foreground italic uppercase">
                <span className="text-blue-500">book</span>inaja
              </span>
            </Link>

            {/* Navigation - Desktop */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-[14px] font-black uppercase tracking-[0.25em] text-foreground/70 hover:text-blue-500 transition-colors italic"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {mounted ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
                  className="rounded-xl hidden md:flex hover:bg-secondary/80 text-foreground"
                >
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              ) : (
                <div className="w-10 h-10 hidden md:block" />
              )}

              <Link href="/register" className="hidden sm:block">
                <Button className="rounded-xl md:rounded-2xl bg-blue-600 px-6 md:px-8 h-10 md:h-12 font-black text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-[10px] md:text-xs uppercase italic tracking-widest border-b-4 border-blue-800 active:border-b-0">
                  Mulai Bisnis
                </Button>
              </Link>

              <Link href="/user/me" className="hidden sm:block">
                <Button
                  variant="outline"
                  className="rounded-xl md:rounded-2xl px-6 md:px-8 h-10 md:h-12 font-black uppercase italic tracking-widest text-[10px] md:text-xs"
                >
                  Portal Customer
                </Button>
              </Link>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden rounded-xl text-foreground"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X /> : <Menu />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div
          className={cn(
            "lg:hidden absolute top-24 left-4 right-4 bg-background/95 border border-border rounded-[2.5rem] p-8 shadow-2xl transition-all duration-500 origin-top backdrop-blur-xl",
            isMobileMenuOpen
              ? "scale-y-100 opacity-100 visible translate-y-0"
              : "scale-y-95 opacity-0 invisible -translate-y-4",
          )}
        >
          <nav className="flex flex-col gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-xs font-black uppercase tracking-[0.3em] text-foreground/80 py-4 border-b border-border/50 italic"
              >
                {link.name}
              </Link>
            ))}
            <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
              <Button className="w-full h-16 rounded-[1.5rem] bg-blue-600 font-black text-white uppercase italic tracking-[0.2em] shadow-xl shadow-blue-500/20 border-b-4 border-blue-800">
                Mulai Bisnis Sekarang
              </Button>
            </Link>
            <Link href="/user/me" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="outline"
                className="w-full h-16 rounded-[1.5rem] font-black uppercase italic tracking-[0.2em]"
              >
                Portal Customer
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      {/* Karena header fixed, main content akan otomatis naik ke atas (0,0) */}
      <main className="flex-1 w-full bg-background">{children}</main>

      {/* --- FLOATING THEME TOGGLE (MOBILE ONLY) --- */}
      {mounted && currentTheme && (
        <button
          onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
          className="md:hidden fixed bottom-6 right-6 z-[200] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_10px_30px_rgba(59,130,246,0.5)] active:scale-90 transition-all border-4 border-background/20"
        >
          {currentTheme === "dark" ? (
            <Sun className="h-6 w-6" />
          ) : (
            <Moon className="h-6 w-6" />
          )}
        </button>
      )}

      {/* --- FOOTER --- */}
      <footer className="relative z-10 border-t border-border/50 bg-secondary/10 pt-24 pb-12 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="grid gap-16 md:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="space-y-8">
              <div className="text-2xl font-[1000] text-foreground tracking-tighter uppercase italic">
                <span className="text-blue-500">book</span>inaja
              </div>
              <div className="space-y-4 text-muted-foreground font-medium">
                <p className="flex items-start gap-4">
                  <MapPin className="h-5 w-5 text-blue-500 shrink-0 mt-1" />
                  <span className="leading-relaxed text-[11px] font-bold uppercase tracking-wider">
                    Kec. Batam Kota, Kota Batam,
                    <br />
                    Kepulauan Riau 29464
                  </span>
                </p>
                <p className="flex items-center gap-4">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    support@bookinaja.com
                  </span>
                </p>
                <p className="flex items-center gap-4">
                  <Phone className="h-5 w-5 text-blue-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    +62 812-xxxx-xxxx
                  </span>
                </p>
              </div>
            </div>

            {/* Rest of the footer links... */}
            <div>
              <h4 className="mb-8 font-black text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500">
                Layanan
              </h4>
              <ul className="space-y-5 text-muted-foreground font-bold text-[10px] uppercase tracking-widest italic">
                <li>
                  <Link
                    href="/pricing"
                    className="hover:text-blue-500 transition-colors"
                  >
                    Pricing Paket
                  </Link>
                </li>
                <li>
                  <Link
                    href="/demos"
                    className="hover:text-blue-500 transition-colors"
                  >
                    Live Demos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/documentation"
                    className="hover:text-blue-500 transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="/faq"
                    className="hover:text-blue-500 transition-colors"
                  >
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-8 font-black text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500">
                Kebijakan
              </h4>
              <ul className="space-y-5 text-muted-foreground font-bold text-[10px] uppercase tracking-widest italic">
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

            <div className="space-y-8">
              <h4 className="font-black text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500">
                Connect
              </h4>
              <div className="flex gap-4">
                <Link
                  href="https://instagram.com/bookinajacom"
                  target="_blank"
                  className="p-3 rounded-2xl bg-background border border-border/50 hover:bg-blue-500 hover:text-white transition-all hover:-translate-y-1"
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
                  href="https://linkedin.com"
                  target="_blank"
                  className="p-3 rounded-2xl bg-background border border-border/50 hover:bg-blue-500 hover:text-white transition-all hover:-translate-y-1"
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

          <div className="mt-24 border-t border-border/50 pt-10 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 italic">
              © 2026 bookinaja.com · Indonesia 🇮🇩
            </div>
            <div className="flex items-center gap-8 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 italic">
              <span>Security Verified</span>
              <span>IDCloudHost Infrastructure</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
