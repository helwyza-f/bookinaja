import { router } from "expo-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { View } from "react-native";
import { apiFetch } from "@/lib/api";
import { EmptyStateCard, HeroPanel, ListRow, SectionHeader, StatusPill } from "@/components/admin-primitives";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { QuickLinkCard } from "@/components/quick-link-card";
import { ScreenShell } from "@/components/screen-shell";
import { StatTile } from "@/components/stat-tile";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useAdminIdentity } from "@/hooks/use-admin-identity";
import { hasAdminPermission } from "@/lib/admin-access";
import { formatCurrency, formatDateTime } from "@/lib/format";

type PosFeedItem = {
  id: string;
  kind?: string;
  resource_name?: string;
  customer_name?: string;
  status?: string;
  payment_status?: string;
  action_label?: string;
  balance_due?: number;
  total?: number;
  scheduled_at?: string | null;
  end_time?: string | null;
};

type ResourceCatalogItem = {
  id: string;
  status?: string;
  operating_mode?: string;
};

type FnbItem = {
  id: string;
  is_available?: boolean;
};

type ExpenseSummary = {
  total?: number;
  entries?: number;
};

function formatAmount(value?: number) {
  const formatted = formatCurrency(value || 0);
  return formatted === "Cek harga" ? "Rp 0" : formatted;
}

function isAttentionItem(item: PosFeedItem) {
  const paymentStatus = String(item.payment_status || "").toLowerCase();
  const status = String(item.status || "").toLowerCase();
  return (
    paymentStatus === "awaiting_verification" ||
    Number(item.balance_due || 0) > 0 ||
    ["active", "ongoing", "pending", "confirmed", "pending_payment"].includes(status)
  );
}

export default function AdminOperationsScreen() {
  const guard = useAuthGuard("admin");
  const identity = useAdminIdentity();
  const user = identity.data;
  const canCreateBookings = hasAdminPermission(user, "bookings.create");
  const canCreateDirectSale = hasAdminPermission(user, "pos.order.add");

  const opsQuery = useQuery({
    queryKey: ["admin-ops-mobile"],
    enabled: guard.ready,
    queryFn: async () => {
      const canReadPos = hasAdminPermission(user, "pos.read");
      const canReadResources = hasAdminPermission(user, "resources.read");
      const canReadFnb = hasAdminPermission(user, "fnb.read");
      const canReadExpenses = hasAdminPermission(user, "expenses.read");

      const [feedRes, resourcesRes, menuRes, expensesRes] = await Promise.allSettled([
        canReadPos
          ? apiFetch<{ items?: PosFeedItem[] }>("/pos/action-feed?window_minutes=360&limit=12", { audience: "admin" })
          : Promise.resolve({ items: [] }),
        canReadResources
          ? apiFetch<{ items?: ResourceCatalogItem[] }>("/admin/resources/list", { audience: "admin" })
          : Promise.resolve({ items: [] }),
        canReadFnb ? apiFetch<FnbItem[]>("/fnb", { audience: "admin" }) : Promise.resolve([]),
        canReadExpenses
          ? apiFetch<ExpenseSummary>("/expenses/summary", { audience: "admin" })
          : Promise.resolve({ total: 0, entries: 0 }),
      ]);

      return {
        feed: feedRes.status === "fulfilled" ? feedRes.value?.items || [] : [],
        resources: resourcesRes.status === "fulfilled" ? resourcesRes.value?.items || [] : [],
        menu: menuRes.status === "fulfilled" ? menuRes.value || [] : [],
        expenses:
          expensesRes.status === "fulfilled"
            ? expensesRes.value || { total: 0, entries: 0 }
            : { total: 0, entries: 0 },
      };
    },
  });

  const payload = opsQuery.data;
  const feed = payload?.feed || [];
  const resources = payload?.resources || [];
  const menu = payload?.menu || [];
  const attentionQueue = feed.filter(isAttentionItem);

  const stats = useMemo(() => {
    const activeResources = resources.filter((item) => String(item.status || "").toLowerCase() === "available").length;
    const busyResources = resources.filter((item) => ["occupied", "busy"].includes(String(item.status || "").toLowerCase())).length;
    const readyMenu = menu.filter((item) => item.is_available !== false).length;
    return {
      activeResources,
      busyResources,
      readyMenu,
    };
  }, [menu, resources]);

  return (
    <ScreenShell
      eyebrow="Operations"
      title="Control hub"
      description="Akses cepat ke antrian live, resource, menu, dan pengeluaran tanpa harus buka dashboard web."
      includeBottomSafeArea={false}
      bottomDockInset={118}
    >
      <CardBlock>
        <HeroPanel
          eyebrow="Control hub"
          title="Operasional harian"
          description="Masuk ke booking, POS, resource, dan queue dari satu layar kerja."
        />
      </CardBlock>

      {canCreateBookings ? (
        <CardBlock>
          <SectionHeader title="Booking cepat" description="Masuk ke scheduled atau walk-in langsung dari sini." />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <CtaButton
                label="Booking baru"
                onPress={() => router.push({ pathname: "/admin/bookings/new", params: { mode: "scheduled" } })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <CtaButton
                tone="secondary"
                label="Walk-in"
                onPress={() => router.push({ pathname: "/admin/bookings/new", params: { mode: "walkin" } })}
              />
            </View>
          </View>
        </CardBlock>
      ) : null}

      {canCreateDirectSale ? (
        <CardBlock>
          <SectionHeader title="Direct sale" description="Buka order kasir tanpa flow booking waktu." />
          <CtaButton label="Order langsung" onPress={() => router.push("/admin/orders/new")} />
        </CardBlock>
      ) : null}

      <CardBlock>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatTile
            label="Perlu aksi"
            value={String(attentionQueue.length)}
            hint="Queue POS, pembayaran, dan sesi yang perlu dicek."
            tone="amber"
            icon={<MaterialIcons name="priority-high" size={18} color="#b45309" />}
          />
          <StatTile
            label="Resource siap"
            value={String(stats.activeResources)}
            hint={busyResourcesHint(stats.busyResources)}
            tone="blue"
            icon={<MaterialIcons name="grid-view" size={18} color="#2563eb" />}
          />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatTile
            label="Menu ready"
            value={String(stats.readyMenu)}
            hint={`${menu.length} item katalog F&B`}
            tone="emerald"
            icon={<MaterialIcons name="restaurant-menu" size={18} color="#059669" />}
          />
          <StatTile
            label="Pengeluaran"
            value={formatAmount(payload?.expenses?.total)}
            hint={`${Number(payload?.expenses?.entries || 0)} entri periode aktif`}
            tone="violet"
            icon={<MaterialIcons name="payments" size={18} color="#7c3aed" />}
          />
        </View>
      </CardBlock>

      <CardBlock>
        <SectionHeader title="Modul" description="Masuk ke area kerja yang paling sering dipakai admin." />
        <View style={{ gap: 10 }}>
          {hasAdminPermission(user, "resources.read") ? (
            <QuickLinkCard
              label="Resources"
              description="Pantau status meja, room, atau resource tenant."
              icon={<MaterialIcons name="grid-view" size={20} color="#2563eb" />}
              badge={`${resources.length} unit`}
              onPress={() => router.push("/admin/resources")}
            />
          ) : null}
          {hasAdminPermission(user, "fnb.read") ? (
            <QuickLinkCard
              label="Menu F&B"
              description="Kelola katalog aktif dan item yang perlu dirapikan."
              icon={<MaterialIcons name="restaurant-menu" size={20} color="#2563eb" />}
              badge={`${stats.readyMenu}/${menu.length || 0} ready`}
              onPress={() => router.push("/admin/menu")}
            />
          ) : null}
          {hasAdminPermission(user, "expenses.read") ? (
            <QuickLinkCard
              label="Expenses"
              description="Catat dan cek pengeluaran tenant dari mobile."
              icon={<MaterialIcons name="receipt-long" size={20} color="#2563eb" />}
              badge={formatAmount(payload?.expenses?.total)}
              onPress={() => router.push("/admin/expenses")}
            />
          ) : null}
          {canCreateDirectSale ? (
            <QuickLinkCard
              label="Direct sale"
              description="Buat transaksi POS langsung dan lanjutkan ke pembayaran."
              icon={<MaterialIcons name="point-of-sale" size={20} color="#2563eb" />}
              badge="POS"
              onPress={() => router.push("/admin/orders/new")}
            />
          ) : null}
        </View>
      </CardBlock>

      <CardBlock>
        <SectionHeader title="Queue cepat" description="Antrian yang perlu dilihat duluan." />
        {attentionQueue.length ? (
          attentionQueue.slice(0, 6).map((item) => (
            <QueueCard
              key={`${item.kind || "queue"}:${item.id}`}
              item={item}
              onPress={
                item.kind === "booking"
                  ? () =>
                      router.push({
                        pathname: "/admin/bookings/[id]",
                        params: { id: item.id },
                      })
                  : item.kind === "sales_order"
                    ? () =>
                        router.push({
                          pathname: "/admin/orders/[id]",
                          params: { id: item.id },
                        })
                    : undefined
              }
            />
          ))
        ) : (
          <EmptyStateCard title="Queue kosong" description="Belum ada antrian yang butuh perhatian sekarang." />
        )}
      </CardBlock>
    </ScreenShell>
  );
}

function busyResourcesHint(count: number) {
  if (count <= 0) return "Tidak ada resource yang sedang sibuk.";
  return `${count} resource sedang dipakai customer.`;
}

function QueueCard({ item, onPress }: { item: PosFeedItem; onPress?: () => void }) {
  return (
    <ListRow
      title={item.resource_name || item.customer_name || "Antrian operasional"}
      subtitle={item.customer_name || item.kind || "Queue"}
      meta={`${item.scheduled_at ? `Jadwal ${formatDateTime(item.scheduled_at)}` : "Antrian POS aktif"}${item.end_time ? ` • selesai ${formatDateTime(item.end_time)}` : ""} • ${item.kind === "booking" ? `Sisa ${formatAmount(item.balance_due)}` : `Total ${formatAmount(item.total)}`}`}
      badge={<StatusPill label={item.action_label || item.status || "Cek"} tone="blue" />}
      onPress={onPress}
    />
  );
}
