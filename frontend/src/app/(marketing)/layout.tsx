"use client";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { getCookie } from "cookies-next";
import { Button } from "@/components/ui/button";
import {
  BriefcaseBusiness,
  Mail,
  Phone,
  MapPin,
  Moon,
  Sun,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Plus,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { demoSectors } from "./demos/demo-data";
import { BOOKINAJA_LOGO_NORMAL_SRC } from "@/lib/brand";
import { clearAccountSession, clearAdminSession } from "@/lib/tenant-session";
import { getRootPortalUrl } from "@/lib/tenant";

const apiBaseURL =
  process.env.NEXT_PUBLIC_API_URL || "http://api.bookinaja.local:8080/api/v1";

type MarketingAccount = {
  id: string;
  name: string;
  email: string;
};

type MarketingWorkspace = {
  id: string;
  name: string;
  slug: string;
  role?: string;
  onboarding_state?: {
    current_step?: string;
    is_completed?: boolean;
  };
};

type MarketingSession = {
  account: MarketingAccount;
  workspaces: MarketingWorkspace[];
};

function getOwnerEntryHref(session: MarketingSession | null) {
  return session?.workspaces?.length
    ? getRootPortalUrl("/app/workspaces")
    : getRootPortalUrl("/app/workspaces/new");
}

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || "A").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function MenuItem({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-foreground/80 transition hover:bg-blue-500/10 hover:text-blue-600"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMobileSubmenu, setOpenMobileSubmenu] = useState<string | null>(
    null,
  );
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [accountSession, setAccountSession] = useState<MarketingSession | null>(
    null,
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const currentTheme = resolvedTheme || theme;
  const ownerEntryHref = getOwnerEntryHref(accountSession);
  const accountInitials = getInitials(
    accountSession?.account.name,
    accountSession?.account.email,
  );

  // Mencegah hydration mismatch
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = String(
      getCookie("account_token") || getCookie("auth_token") || "",
    ).trim();
    if (!token) return;

    let active = true;
    axios
      .get<MarketingSession>(`${apiBaseURL}/auth/account/me`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      })
      .then((res) => {
        if (active) setAccountSession(res.data);
      })
      .catch(() => {
        if (active) setAccountSession(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleOwnerLogout = () => {
    clearAccountSession();
    clearAdminSession({ keepTenantSlug: false });
    setAccountSession(null);
    setProfileOpen(false);
  };

  const demoNavLinks = demoSectors.map((sector) => ({
    name: sector.shortTitle,
    href: `/demos/${sector.slug}`,
  }));

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Demo", href: "/demos", children: demoNavLinks },
    { name: "Pricing", href: "/pricing" },
    { name: "Jelajah", href: "/discovery" },
  ];

  return (
    <div className="marketing-calm flex min-h-screen flex-col selection:bg-blue-600/30 font-plus-jakarta transition-colors duration-300 relative">
      {/* --- HEADER (MELAYANG / FIXED) --- */}
      {/* Kita pakai fixed agar Hero naik ke paling atas layar */}
      <header className="fixed top-0 left-0 right-0 z-[100] w-full px-4 py-3 md:py-5 transition-all duration-300">
        <div className="container mx-auto max-w-7xl">
          <div
            className={cn(
              "flex h-[3.75rem] md:h-[4.5rem] items-center justify-between rounded-[1rem] border px-5 md:px-8 transition-all duration-500 backdrop-blur-xl",
              isScrolled
                ? "border-border/70 bg-background/92 shadow-[0_18px_48px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#07070d]/88"
                : "border-border/55 bg-background/82 shadow-[0_12px_34px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#07070d]/72",
            )}
          >
            {/* Logo */}
            <Link
              href="/"
              className="group flex items-center gap-3 md:gap-4 shrink-0"
            >
              <div className="relative flex h-10 w-10 md:h-12 md:w-12 items-center justify-center overflow-hidden rounded-xl bg-[#05070f] p-2 shadow-[0_12px_28px_rgba(15,31,74,0.22)] ring-1 ring-white/10 transition-transform group-hover:rotate-3 dark:bg-[#101827] dark:ring-blue-400/20">
                <Image
                  src={BOOKINAJA_LOGO_NORMAL_SRC}
                  alt="Bookinaja"
                  fill
                  sizes="48px"
                  priority
                  className="scale-[0.78] object-contain"
                />
              </div>
              <span className="text-xl md:text-2xl font-[850] tracking-tighter text-foreground italic uppercase">
                <span className="text-blue-500">book</span>inaja
              </span>
            </Link>

            {/* Navigation - Desktop */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) =>
                link.children ? (
                  <div key={link.name} className="group relative">
                    <Link
                      href={link.href}
                      className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.2em] text-foreground/82 transition-colors hover:text-blue-500 italic"
                    >
                      {link.name}
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
                    </Link>
                    <div className="invisible absolute left-1/2 top-full z-[120] mt-4 w-72 -translate-x-1/2 translate-y-2 rounded-[1.5rem] border border-border bg-background/95 p-3 opacity-0 shadow-2xl backdrop-blur-xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                      <Link
                        href="/demos"
                        className="mb-2 block rounded-2xl px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-500"
                      >
                        Semua demo
                      </Link>
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block rounded-2xl px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/78 transition-colors hover:bg-blue-500/10 hover:text-blue-500"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-[13px] font-bold uppercase tracking-[0.2em] text-foreground/82 hover:text-blue-500 transition-colors italic"
                  >
                    {link.name}
                  </Link>
                ),
              )}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {mounted ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setTheme(currentTheme === "dark" ? "light" : "dark")
                  }
                  className="rounded-xl hidden md:flex hover:bg-secondary/80 text-foreground"
                >
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              ) : (
                <div className="w-10 h-10 hidden md:block" />
              )}

              {accountSession ? (
                <div className="hidden sm:flex items-center gap-2">
                  <Link href={ownerEntryHref}>
                    <Button className="rounded-xl md:rounded-2xl bg-blue-600 px-6 md:px-8 h-10 md:h-11 font-semibold text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-[10px] md:text-xs uppercase italic tracking-[0.12em] border-b-4 border-blue-800 active:border-b-0">
                      Dashboard
                    </Button>
                  </Link>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setProfileOpen((open) => !open)}
                      className="flex h-11 items-center gap-2 rounded-2xl border border-border bg-background/80 px-2.5 pr-3 text-left shadow-sm transition hover:border-blue-500/40 hover:bg-blue-500/5"
                      aria-label="Buka menu akun"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-[11px] font-black uppercase tracking-tight text-white">
                        {accountInitials}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 text-muted-foreground transition-transform",
                          profileOpen && "rotate-180",
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        "absolute right-0 top-full z-[130] mt-3 w-80 origin-top-right rounded-[1.5rem] border border-border bg-background/96 p-3 shadow-2xl backdrop-blur-xl transition-all duration-200",
                        profileOpen
                          ? "visible translate-y-0 scale-100 opacity-100"
                          : "invisible -translate-y-2 scale-95 opacity-0",
                      )}
                    >
                      <div className="rounded-2xl bg-secondary/60 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                          Akun owner
                        </p>
                        <p className="mt-2 truncate text-sm font-bold text-foreground">
                          {accountSession.account.name ||
                            accountSession.account.email}
                        </p>
                        <p className="truncate text-xs font-medium text-muted-foreground">
                          {accountSession.account.email}
                        </p>
                      </div>

                      <div className="mt-3 space-y-1">
                        <MenuItem
                          href={ownerEntryHref}
                          icon={LayoutDashboard}
                          label="Dashboard bisnis"
                          onClick={() => setProfileOpen(false)}
                        />
                        <MenuItem
                          href={getRootPortalUrl("/app/workspaces")}
                          icon={BriefcaseBusiness}
                          label="Workspace"
                          onClick={() => setProfileOpen(false)}
                        />
                        <MenuItem
                          href={getRootPortalUrl("/app/workspaces/new")}
                          icon={Plus}
                          label="Tambah bisnis"
                          onClick={() => setProfileOpen(false)}
                        />
                      </div>

                      <div className="my-3 border-t border-border" />
                      <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        Sebagai customer
                      </p>
                      <MenuItem
                        href="/user/me"
                        icon={User}
                        label="Portal customer"
                        onClick={() => setProfileOpen(false)}
                      />

                      <button
                        type="button"
                        onClick={handleOwnerLogout}
                        className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-foreground/80 transition hover:bg-red-500/10 hover:text-red-600"
                      >
                        <LogOut className="h-4 w-4" />
                        Keluar dari owner
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Link href="/login" className="hidden sm:block">
                    <Button className="rounded-xl md:rounded-2xl bg-blue-600 px-5 md:px-6 h-10 md:h-11 font-semibold text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-[10px] md:text-xs uppercase italic tracking-[0.12em] border-b-4 border-blue-800 active:border-b-0">
                      Mulai
                    </Button>
                  </Link>

                  <Link href="/user/me" className="hidden sm:block">
                    <Button
                      variant="outline"
                      className="rounded-xl md:rounded-2xl px-5 md:px-6 h-10 md:h-11 font-bold uppercase italic tracking-[0.12em] text-[10px] md:text-xs text-foreground"
                    >
                      Customer
                    </Button>
                  </Link>
                </>
              )}

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
            "lg:hidden absolute top-20 left-4 right-4 bg-background/95 border border-border rounded-[1.5rem] p-5 shadow-xl transition-all duration-500 origin-top backdrop-blur-xl",
            isMobileMenuOpen
              ? "scale-y-100 opacity-100 visible translate-y-0"
              : "scale-y-95 opacity-0 invisible -translate-y-4",
          )}
        >
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) =>
              link.children ? (
                <div key={link.name} className="border-b border-border/50 pb-4">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMobileSubmenu((current) =>
                        current === link.name ? null : link.name,
                      )
                    }
                    className="flex w-full items-center justify-between py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-foreground/80 italic"
                  >
                    <span>{link.name}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        openMobileSubmenu === link.name && "rotate-180",
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "grid overflow-hidden transition-all duration-300",
                      openMobileSubmenu === link.name
                        ? "max-h-80 gap-2 opacity-100"
                        : "max-h-0 gap-0 opacity-0",
                    )}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="rounded-2xl bg-secondary/60 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                    >
                      Semua demo
                    </Link>
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="rounded-2xl bg-secondary/60 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/80 py-3 border-b border-border/50 italic"
                >
                  {link.name}
                </Link>
              ),
            )}
            {accountSession ? (
              <div className="space-y-3 pt-2">
                <div className="rounded-2xl bg-secondary/60 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Akun owner
                  </p>
                  <p className="mt-2 truncate text-sm font-bold text-foreground">
                    {accountSession.account.name || accountSession.account.email}
                  </p>
                  <p className="truncate text-xs font-medium text-muted-foreground">
                    {accountSession.account.email}
                  </p>
                </div>
                <Link
                  href={ownerEntryHref}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button className="w-full h-12 rounded-[1.25rem] bg-blue-600 font-semibold text-white uppercase italic tracking-[0.14em] shadow-lg shadow-blue-500/20 border-b-4 border-blue-800">
                    Dashboard
                  </Button>
                </Link>
                <Link
                  href="/user/me"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-[1.25rem] font-semibold uppercase italic tracking-[0.14em]"
                  >
                    Customer
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    handleOwnerLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[1.25rem] text-xs font-semibold uppercase italic tracking-[0.14em] text-muted-foreground transition hover:bg-red-500/10 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar Owner
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button className="w-full h-12 rounded-[1.25rem] bg-blue-600 font-semibold text-white uppercase italic tracking-[0.14em] shadow-lg shadow-blue-500/20 border-b-4 border-blue-800">
                    Mulai
                  </Button>
                </Link>
                <Link
                  href="/user/me"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-[1.25rem] font-semibold uppercase italic tracking-[0.14em]"
                  >
                    Customer
                  </Button>
                </Link>
              </>
            )}
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
      <footer className="relative z-10 border-t border-border/70 bg-background pt-12 pb-8">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="rounded-[1.5rem] border border-border/70 bg-card/70 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.05)] md:p-8">
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 text-sm">
              <div className="space-y-8">
                <div className="flex items-center gap-3 text-2xl font-[850] text-foreground tracking-tighter uppercase italic">
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#05070f] p-2 ring-1 ring-white/10 dark:bg-[#101827] dark:ring-blue-400/20">
                  <Image
                    src={BOOKINAJA_LOGO_NORMAL_SRC}
                    alt="Bookinaja"
                    fill
                    sizes="36px"
                    className="scale-[0.78] object-contain"
                  />
                </span>
                  <span className="text-blue-500">book</span>inaja
                </div>
                <div className="space-y-4 text-foreground/75 font-semibold">
                  <p className="flex items-start gap-4">
                    <MapPin className="h-5 w-5 text-blue-500 shrink-0 mt-1" />
                    <span className="leading-relaxed text-[11px] font-bold uppercase tracking-[0.08em]">
                      Kec. Batam Kota, Kota Batam,
                      <br />
                      Kepulauan Riau 29464
                    </span>
                  </p>
                  <p className="flex items-center gap-4">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em]">
                      support@bookinaja.com
                    </span>
                  </p>
                  <p className="flex items-center gap-4">
                    <Phone className="h-5 w-5 text-blue-500" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em]">
                      +62 812-xxxx-xxxx
                    </span>
                  </p>
                </div>
              </div>

              {/* Rest of the footer links... */}
              <div>
                <h4 className="mb-5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
                  Layanan
                </h4>
                <ul className="space-y-3 text-foreground/70 font-bold text-[10px] uppercase tracking-[0.1em] italic">
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
                      Demo Bisnis
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/discovery"
                      className="hover:text-blue-500 transition-colors"
                    >
                      Jelajah Bisnis
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
                <h4 className="mb-5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
                  Kebijakan
                </h4>
                <ul className="space-y-3 text-foreground/70 font-bold text-[10px] uppercase tracking-[0.1em] italic">
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
                <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
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

            <div className="mt-10 border-t border-border/60 pt-6 flex flex-col md:flex-row justify-between items-center gap-5 text-center md:text-left">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55 italic">
                © 2026 bookinaja.com · Indonesia 🇮🇩
              </div>
              <div className="flex items-center gap-8 text-[9px] font-bold uppercase tracking-[0.14em] text-foreground/45 italic">
                <span>Security Verified</span>
                <span>IDCloudHost Infrastructure</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
