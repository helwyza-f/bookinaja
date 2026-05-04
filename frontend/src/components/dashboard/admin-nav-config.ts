import {
  BarChart3,
  CalendarDays,
  CreditCard,
  Link2,
  Printer,
  Grid2x2,
  LayoutDashboard,
  Megaphone,
  MonitorPlay,
  Radio,
  Sparkles,
  Users,
  UsersRound,
  Banknote,
  Utensils,
  Wand2,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  hint?: string;
  group?: "core" | "growth" | "ops" | "system";
};

export const growthHubNavItem: AdminNavItem = {
  label: "Promosi Bisnis",
  href: "/growth/feed",
  icon: Sparkles,
  hint: "Feed, konten, performa",
  group: "growth",
};

export const operationalNavItems: AdminNavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { label: "Bookings", icon: CalendarDays, href: "/admin/bookings" },
  { label: "POS / Kasir", icon: MonitorPlay, href: "/admin/pos" },
  { label: "Resources", icon: Grid2x2, href: "/admin/resources" },
  { label: "F&B / Menu", icon: Utensils, href: "/admin/fnb" },
  { label: "Pengeluaran", icon: Banknote, href: "/admin/expenses" },
  { label: "Customers", icon: Users, href: "/admin/customers" },
];

export const settingsNavItems: AdminNavItem[] = [
  {
    label: "Landing Page Studio",
    href: "/admin/settings/page-builder",
    icon: Wand2,
    hint: "Konten, layout, tema, preview",
    group: "core",
  },
  {
    label: "Manajemen Pegawai",
    href: "/admin/settings/staff",
    icon: UsersRound,
    hint: "Staff, RBAC, aktivitas",
    group: "ops",
  },
  {
    label: "CRM & Marketing",
    href: "/admin/settings/crm",
    icon: Megaphone,
    hint: "Migrasi & blast WA",
    group: "growth",
  },
  {
    label: "Laporan & Analitik",
    href: "/admin/settings/analytics",
    icon: BarChart3,
    hint: "Grafik & export",
    group: "ops",
  },
  {
    label: "Smart Point",
    href: "/admin/devices",
    icon: Radio,
    hint: "Alat, pairing, status",
    group: "system",
  },
  {
    label: "Subscription & Billing",
    href: "/admin/settings/billing",
    icon: CreditCard,
    hint: "Paket SaaS & Midtrans",
    group: "system",
  },
  {
    label: "Nota & Printer",
    href: "/admin/settings/nota",
    icon: Printer,
    hint: "Struk, WhatsApp, printer",
    group: "system",
  },
  {
    label: "Referral",
    href: "/admin/settings/referral",
    icon: Link2,
    hint: "Kode referral & bonus",
    group: "growth",
  },
];

export const growthNavItems: AdminNavItem[] = [
  {
    label: "Feed Bookinaja",
    href: "/growth/feed",
    icon: Sparkles,
    hint: "Pantau tampilan feed",
    group: "growth",
  },
  {
    label: "Tampilan Bisnis",
    href: "/growth/profile",
    icon: Wand2,
    hint: "Yang dilihat customer",
    group: "growth",
  },
  {
    label: "Postingan & Konten",
    href: "/growth/posts",
    icon: Megaphone,
    hint: "Kelola postingan",
    group: "growth",
  },
  {
    label: "Performa",
    href: "/growth/insights",
    icon: BarChart3,
    hint: "Reach & performa",
    group: "growth",
  },
];
