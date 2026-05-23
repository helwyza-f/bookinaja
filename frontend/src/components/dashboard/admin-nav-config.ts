import {
  BarChart3,
  BriefcaseBusiness,
  CalendarRange,
  ClipboardList,
  CreditCard,
  Landmark,
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
  UserCog,
  Gift,
  Map,
  MessageSquare,
  LifeBuoy,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  hint?: string;
  group?: "core" | "growth" | "ops" | "system";
};

export type WorkspaceUtilityNavItem = {
  key:
    | "upgrade"
    | "refer"
    | "business"
    | "page_builder"
    | "guide"
    | "settings";
  label: string;
  icon: LucideIcon;
  href?: string;
  kind: "route" | "upgrade" | "settings" | "external";
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
  { label: "Kalender", icon: CalendarRange, href: "/admin/bookings/calendar" },
  { label: "Bookings", icon: ClipboardList, href: "/admin/bookings" },
  { label: "POS", icon: MonitorPlay, href: "/admin/pos" },
  { label: "Resources", icon: Grid2x2, href: "/admin/resources" },
  { label: "Menu", icon: Utensils, href: "/admin/fnb" },
  { label: "Pengeluaran", icon: Banknote, href: "/admin/expenses" },
  { label: "Customers", icon: Users, href: "/admin/customers" },
];

export const workspaceUtilityNavItems: WorkspaceUtilityNavItem[] = [
  { key: "upgrade", label: "Upgrade", icon: CreditCard, kind: "upgrade" },
  { key: "refer", label: "Refer & Earn", icon: Gift, href: "/admin/referral", kind: "route" },
  { key: "business", label: "Bisnis", icon: BriefcaseBusiness, href: "/admin/brand", kind: "route" },
  { key: "page_builder", label: "Page Builder", icon: Wand2, href: "/admin/page-builder", kind: "route" },
  { key: "guide", label: "Guide", icon: Map, href: "/admin/guide", kind: "route" },
  { key: "settings", label: "Settings", icon: Settings, kind: "settings" },
];

export function isAdminNavItemActive(
  pathname: string,
  href: string,
  allHrefs: string[],
) {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;

  return !allHrefs.some(
    (candidate) =>
      candidate !== href &&
      candidate.startsWith(`${href}/`) &&
      (pathname === candidate || pathname.startsWith(`${candidate}/`)),
  );
}

export const settingsNavItems: AdminNavItem[] = [
  {
    label: "Account",
    href: "/admin/settings/akun",
    icon: UserCog,
    hint: "Profile & security",
    group: "core",
  },
  {
    label: "Billing",
    href: "/admin/settings/billing",
    icon: CreditCard,
    hint: "Plan & subscription",
    group: "system",
  },
  {
    label: "Workspaces",
    href: "/admin/settings/workspaces",
    icon: BriefcaseBusiness,
    hint: "Switch & tambah",
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
    href: "/admin/settings/smart-point",
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
    label: "Nota",
    href: "/admin/settings/nota",
    icon: Printer,
    hint: "Struk & printer",
    group: "system",
  },
  {
    label: "Feedback",
    href: "/admin/settings/feedback",
    icon: MessageSquare,
    hint: "Masukan produk",
    group: "system",
  },
  {
    label: "Discord",
    href: "/admin/settings/discord",
    icon: LifeBuoy,
    hint: "Komunitas & bantuan",
    group: "system",
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
