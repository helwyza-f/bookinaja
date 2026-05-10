import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  Landmark,
  Link2,
  Printer,
  Grid2x2,
  LayoutDashboard,
  Megaphone,
  MonitorPlay,
  Radio,
  TicketPercent,
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
  label: "Promosi",
  href: "/growth/feed",
  icon: Sparkles,
  hint: "Feed & performa",
  group: "growth",
};

export const operationalNavItems: AdminNavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { label: "Bookings", icon: CalendarDays, href: "/admin/bookings" },
  { label: "POS", icon: MonitorPlay, href: "/admin/pos" },
  { label: "Resources", icon: Grid2x2, href: "/admin/resources" },
  { label: "Menu", icon: Utensils, href: "/admin/fnb" },
  { label: "Pengeluaran", icon: Banknote, href: "/admin/expenses" },
  { label: "Customers", icon: Users, href: "/admin/customers" },
];

export const settingsNavItems: AdminNavItem[] = [
  {
    label: "Bisnis",
    href: "/admin/settings/bisnis",
    icon: BriefcaseBusiness,
    hint: "Setup inti tenant",
    group: "core",
  },
  {
    label: "Page Builder",
    href: "/admin/settings/page-builder",
    icon: Wand2,
    hint: "Layout & preview",
    group: "core",
  },
  {
    label: "Staff",
    href: "/admin/settings/staff",
    icon: UsersRound,
    hint: "Staff & RBAC",
    group: "ops",
  },
  {
    label: "CRM",
    href: "/admin/settings/crm",
    icon: Megaphone,
    hint: "Blast & migrasi",
    group: "growth",
  },
  {
    label: "Analitik",
    href: "/admin/settings/analytics",
    icon: BarChart3,
    hint: "Grafik & export",
    group: "ops",
  },
  {
    label: "Smart Point",
    href: "/admin/devices",
    icon: Radio,
    hint: "Alat & pairing",
    group: "system",
  },
  {
    label: "Metode Bayar",
    href: "/admin/settings/payment-methods",
    icon: Landmark,
    hint: "Transfer & gateway",
    group: "system",
  },
  {
    label: "Promo",
    href: "/admin/settings/promo",
    icon: TicketPercent,
    hint: "Voucher & diskon",
    group: "growth",
  },
  {
    label: "Billing",
    href: "/admin/settings/billing",
    icon: CreditCard,
    hint: "Paket & Midtrans",
    group: "system",
  },
  {
    label: "Nota",
    href: "/admin/settings/nota",
    icon: Printer,
    hint: "Struk & printer",
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
