"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, History, Moon, Settings, Ticket } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/user/me", label: "Home", icon: Compass },
  { href: "/user/me/active", label: "Aktif", icon: Ticket },
  { href: "/user/me/history", label: "Riwayat", icon: History },
  { href: "/user/me/settings", label: "Profil", icon: Settings },
];

export function CustomerPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const headerMeta = resolveHeaderMeta(pathname);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-950 transition-colors dark:bg-[#060911] dark:text-white">
      <div className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl dark:border-white/10 dark:bg-[#060911]/92">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-3 md:px-5">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
              {headerMeta.eyebrow}
            </div>
            <div className="truncate text-sm font-semibold tracking-tight text-slate-950 dark:text-white">
              {headerMeta.title}
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition-all",
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="h-10 w-10 rounded-2xl border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]"
            aria-label="Ubah tema"
          >
            <Moon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <main className="w-full px-3 pb-24 pt-3 md:mx-auto md:max-w-6xl md:px-5 md:pb-8 md:pt-5">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/96 px-2 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-[#060911]/96 md:hidden">
        <div className="grid grid-cols-4 gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition-all",
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function resolveHeaderMeta(pathname: string) {
  if (pathname.startsWith("/user/me/orders/") && pathname.includes("/payment")) {
    return { eyebrow: "Customer", title: "Pembayaran Order" };
  }
  if (pathname.startsWith("/user/me/orders/")) {
    return { eyebrow: "Customer", title: "Order" };
  }
  if (pathname.startsWith("/user/me/bookings/") && pathname.includes("/payment")) {
    return { eyebrow: "Customer", title: "Pembayaran" };
  }
  if (pathname.startsWith("/user/me/bookings/") && pathname.includes("/live")) {
    return { eyebrow: "Customer", title: "Live" };
  }
  if (pathname.startsWith("/user/me/bookings/")) {
    return { eyebrow: "Customer", title: "Booking" };
  }
  if (pathname.startsWith("/user/me/active")) {
    return { eyebrow: "Customer", title: "Aktif" };
  }
  if (pathname.startsWith("/user/me/history")) {
    return { eyebrow: "Customer", title: "Riwayat" };
  }
  if (pathname.startsWith("/user/me/settings")) {
    return { eyebrow: "Customer", title: "Profil" };
  }
  return { eyebrow: "Customer", title: "Home" };
}
