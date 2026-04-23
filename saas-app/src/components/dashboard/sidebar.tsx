"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Box,
  MonitorPlay,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Utensils,
  Moon,
  Sun,
  ChevronsUpDown,
  ShieldCheck,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearTenantSession } from "@/lib/tenant-session";
import api from "@/lib/api";
import { Badge } from "../ui/badge";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
}

const FALLBACK_LOGO = "https://cdn.bookinaja.com/tenants/logo_frameless.png";

type SidebarUser = {
  name?: string;
  email?: string;
  role?: string;
  logo_url?: string;
  initials?: string;
};

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [userData, setUserData] = useState<SidebarUser | null>(null);
  const [tenantName, setTenantName] = useState<string>(String(params.tenant || "HUB"));

  useEffect(() => {
    let active = true;

    api
      .get("/auth/me")
      .then(async (res) => {
        if (!active) return;
        setUserData(res.data.user);

        try {
          const profileRes = await api.get("/admin/profile");
          if (active) {
            setTenantName(profileRes.data?.name || String(params.tenant || "HUB"));
          }
        } catch {
          if (active) {
            setTenantName(String(params.tenant || "HUB"));
          }
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [params.tenant]);

  // Logic Fallback Logo
  const tenantLogo =
    userData?.logo_url && userData.logo_url !== ""
      ? userData.logo_url
      : FALLBACK_LOGO;

  const routes = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
    { label: "Bookings", icon: CalendarDays, href: "/admin/bookings" },
    { label: "POS / Kasir", icon: MonitorPlay, href: "/admin/pos" },
    { label: "Resources", icon: Box, href: "/admin/resources" },
    { label: "F&B / Menu", icon: Utensils, href: "/admin/fnb" },
    { label: "Customers", icon: Users, href: "/admin/customers" },
  ];

  const handleLogout = () => {
    clearTenantSession({ keepTenantSlug: true });
    window.location.href = "/admin/login";
  };

  return (
    <div className="relative flex h-full flex-col bg-white dark:bg-[#0a0a0a] font-sans border-r border-slate-200 dark:border-white/5 shadow-xl transition-colors duration-500">
      {/* COLLAPSE TOGGLE BUTTON */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 z-[60] flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-500 dark:text-white shadow-xl hover:bg-blue-600 hover:text-white transition-all active:scale-90"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* LOGO AREA - DYNAMIC TENANT LOGO */}
      <div
        className={cn(
          "flex h-20 items-center transition-all shrink-0 px-4",
          isCollapsed ? "justify-center" : "justify-start px-6",
        )}
      >
        <Link href="/admin/dashboard" className="flex items-center gap-3 group">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5 shadow-inner ring-1 ring-black/5 dark:ring-white/10">
            <div
              className="h-full w-full bg-cover bg-center transition-transform group-hover:scale-110 duration-500"
              style={{ backgroundImage: `url(${tenantLogo})` }}
              role="img"
              aria-label="Tenant logo"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300 min-w-0">
              <span className="text-xs font-[1000] italic tracking-tighter dark:text-white uppercase leading-none truncate w-32">
                {tenantName}
              </span>
              <span className="text-[7px] font-black text-blue-500 uppercase tracking-[0.4em] mt-1 italic leading-none">
                Management
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* MAIN NAVIGATION */}
      <nav className="flex flex-col flex-1 gap-1 p-3 pt-4 overflow-y-auto scrollbar-hide">
        {routes.map((route) => {
          const isActive = pathname.includes(route.href);
          return (
            <Tooltip key={route.href}>
              <TooltipTrigger asChild>
                <Link
                  href={route.href}
                  className={cn(
                    "group flex items-center transition-all duration-200",
                    isCollapsed
                      ? "h-11 w-11 justify-center mx-auto rounded-xl"
                      : "px-4 py-3 w-full gap-3 rounded-xl",
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white",
                  )}
                >
                  <route.icon
                    className={cn(
                      "shrink-0",
                      isCollapsed ? "h-5 w-5" : "h-4 w-4",
                      isActive && "scale-110",
                    )}
                  />
                  {!isCollapsed && (
                    <span className="text-[10px] font-[1000] uppercase italic tracking-widest truncate animate-in fade-in duration-300">
                      {route.label}
                    </span>
                  )}
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent
                  side="right"
                  className="bg-blue-600 border-none font-[1000] italic uppercase text-[9px] text-white px-3 py-1.5 shadow-2xl ml-2"
                >
                  {route.label}
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>

      {/* FOOTER: NAV USER POPOVER */}
      <div className="p-3 mt-auto border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center w-full transition-all duration-200 outline-none group rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 min-w-0",
                isCollapsed ? "h-12 w-12 justify-center mx-auto" : "p-2 gap-3",
              )}
            >
              <div className="h-9 w-9 shrink-0 rounded-xl bg-blue-600 flex items-center justify-center font-[1000] text-white shadow-lg italic border-b-2 border-blue-800 uppercase overflow-hidden">
                {userData?.logo_url && userData.logo_url !== "" ? (
                  <div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${userData.logo_url})` }}
                    role="img"
                    aria-label="User avatar"
                  />
                ) : (
                  userData?.initials || "U"
                )}
              </div>

              {!isCollapsed && (
                <>
                  <div className="flex flex-col flex-1 text-left min-w-0">
                    <span className="text-[10px] font-[1000] uppercase italic dark:text-white leading-none truncate">
                      {userData?.name || "Admin Sultan"}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight truncate mt-1.5">
                      {userData?.email || "syncing..."}
                    </span>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 text-slate-400 shrink-0 group-hover:text-blue-500 transition-colors" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-64 rounded-[1.8rem] p-2 bg-white dark:bg-[#0c0c0c] border-slate-200 dark:border-white/10 shadow-2xl"
            side="right"
            align="end"
            sideOffset={12}
          >
            <DropdownMenuLabel className="p-4">
              <div className="rounded-[1.25rem] bg-slate-950 text-white p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="text-[10px] font-[1000] uppercase italic leading-none tracking-widest">
                      {tenantName}
                    </div>
                    <div className="text-[8px] font-bold uppercase tracking-[0.3em] text-slate-300">
                      Command Center
                    </div>
                  </div>
                  <Badge className="bg-white/10 text-white border-none text-[7px] px-2 py-0 uppercase font-black italic">
                    {String(userData?.role || "staff").toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em] text-blue-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {userData?.role === "owner" ? "Owner Console" : "Staff Console"}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 mx-2" />

            <DropdownMenuGroup className="p-1 space-y-0.5">
              {userData?.role === "owner" && (
                <DropdownMenuItem
                  onClick={() => router.push("/admin/owner")}
                  className="rounded-xl px-3 py-3 cursor-pointer text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 focus:bg-slate-100 dark:focus:bg-white/5 focus:text-blue-600 dark:focus:text-white transition-all"
                >
                  <ShieldCheck className="mr-3 h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">
                    Owner Command
                  </span>
                </DropdownMenuItem>
              )}

              {userData?.role === "owner" && (
                <DropdownMenuItem
                  onClick={() => router.push("/admin/settings")}
                  className="rounded-xl px-3 py-3 cursor-pointer text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 focus:bg-slate-100 dark:focus:bg-white/5 focus:text-blue-600 dark:focus:text-white transition-all"
                >
                  <Settings className="mr-3 h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">
                    Konfigurasi Bisnis
                  </span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-xl px-3 py-3 cursor-pointer text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 focus:bg-slate-100 dark:focus:bg-white/5 transition-all"
              >
                {theme === "dark" ? (
                  <Sun className="mr-3 h-4 w-4 text-amber-500 fill-amber-500/20" />
                ) : (
                  <Moon className="mr-3 h-4 w-4 text-blue-500 fill-blue-500/20" />
                )}
                <span className="text-[10px] font-black uppercase tracking-widest italic">
                  Tampilan {theme === "dark" ? "Terang" : "Gelap"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 mx-2" />

            <div className="p-1">
              <DropdownMenuItem
                onClick={handleLogout}
                className="rounded-xl px-3 py-3 cursor-pointer text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 focus:bg-red-50 dark:focus:bg-red-500/10 transition-all group"
              >
                <LogOut className="mr-3 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                <span className="text-[10px] font-black uppercase tracking-widest italic">
                  Putuskan Sesi
                </span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
