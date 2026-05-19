import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { EmptyStateCard, HeroPanel, ListRow, SectionHeader, StatusPill, SummaryPair } from "@/components/admin-primitives";
import { CardBlock } from "@/components/card-block";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useAdminIdentity } from "@/hooks/use-admin-identity";
import { useRealtime } from "@/hooks/use-realtime";
import { formatCurrency } from "@/lib/format";
import { BOOKING_EVENT_PREFIXES, matchesRealtimePrefix } from "@/lib/realtime/event-types";
import { tenantBookingsChannel, tenantOrdersChannel } from "@/lib/realtime/channels";

type CustomerRow = {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  tier?: string;
  total_visits?: number;
  total_spent?: number;
  last_visit?: string;
  loyalty_points?: number;
};

function formatDate(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(parsed);
}

function getTierMeta(value?: string) {
  const tier = String(value || "REGULAR").toUpperCase();
  if (tier === "VIP") return { label: "VIP", tone: "#7c3aed", bg: "#f5f3ff" };
  if (tier === "GOLD") return { label: "Gold", tone: "#b45309", bg: "#fef3c7" };
  if (tier === "NEW") return { label: "New", tone: "#2563eb", bg: "#dbeafe" };
  return { label: "Regular", tone: "#475569", bg: "#e2e8f0" };
}

export default function AdminCustomersScreen() {
  const guard = useAuthGuard("admin");
  const identityQuery = useAdminIdentity();
  const [search, setSearch] = useState("");
  const customersQuery = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => apiFetch<CustomerRow[]>("/customers", { audience: "admin" }),
    enabled: guard.ready,
  });

  useRealtime({
    enabled: Boolean(identityQuery.data?.tenant_id && guard.ready),
    channels: identityQuery.data?.tenant_id
      ? [tenantBookingsChannel(identityQuery.data.tenant_id), tenantOrdersChannel(identityQuery.data.tenant_id)]
      : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      void customersQuery.refetch();
    },
    onReconnect: () => {
      void customersQuery.refetch();
    },
  });

  const customers = customersQuery.data || [];
  const filtered = useMemo(() => {
    return customers.filter((item) => {
      const haystack = [item.name, item.phone, item.email, item.tier].join(" ").toLowerCase();
      return !search.trim() || haystack.includes(search.trim().toLowerCase());
    });
  }, [customers, search]);

  const totalSpent = customers.reduce((sum, item) => sum + Number(item.total_spent || 0), 0);
  const vipCount = customers.filter((item) => String(item.tier || "").toUpperCase() === "VIP").length;

  return (
    <ScreenShell
      eyebrow="Admin"
      title="Customers"
      description="CRM ringkas untuk nilai customer, kunjungan, dan follow-up."
      includeBottomSafeArea={false}
      bottomDockInset={118}
    >
      <CardBlock>
        <HeroPanel
          eyebrow="CRM"
          title="Basis customer"
          description="Lihat tier, total spent, dan buka profil customer yang butuh follow-up."
          tone="slate"
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <SummaryPair label="Customer" value={String(customers.length)} />
          <SummaryPair label="VIP" value={String(vipCount)} accent />
        </View>
      </CardBlock>

      <CardBlock>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Cari nama / WA / email"
          placeholderTextColor="#94a3b8"
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#d6deea",
            backgroundColor: "#fbfdff",
            paddingHorizontal: 14,
            paddingVertical: 14,
            color: "#0f172a",
            fontSize: 15,
          }}
        />
      </CardBlock>

      <CardBlock>
        <SectionHeader title="Snapshot" description="Ringkas saja untuk baca kesehatan customer base." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {[
            {
              label: "Total customer",
              value: String(customers.length),
              hint: "Basis tenant",
              icon: "groups-2" as const,
              tone: "#2563eb",
              bg: "#eff6ff",
            },
            {
              label: "VIP",
              value: String(vipCount),
              hint: "Tier atas",
              icon: "workspace-premium" as const,
              tone: "#7c3aed",
              bg: "#f5f3ff",
            },
            {
              label: "Total spent",
              value: formatCurrency(totalSpent) === "Cek harga" ? "Rp 0" : formatCurrency(totalSpent),
              hint: "Lifetime value",
              icon: "payments" as const,
              tone: "#059669",
              bg: "#ecfdf5",
            },
          ].map((item) => (
            <View key={item.label} style={{ width: 150, borderRadius: 20, backgroundColor: item.bg, paddingHorizontal: 14, paddingVertical: 14, gap: 8 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  backgroundColor: "#ffffff",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name={item.icon} size={20} color={item.tone} />
              </View>
              <View style={{ gap: 2 }}>
                <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                  {item.label.toUpperCase()}
                </Text>
                <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
                  {item.value}
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                  {item.hint}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </CardBlock>

      <CardBlock>
        <SectionHeader title="Daftar customer" description={`${filtered.length} customer cocok dengan pencarian.`} />
        {filtered.map((item) => {
        const tier = getTierMeta(item.tier);
        return (
          <ListRow
            key={item.id}
            onPress={() =>
              router.push({
                pathname: "/admin/customers/[id]",
                params: { id: item.id },
              })
            }
            title={item.name || "Customer"}
            subtitle={item.phone || item.email || "Kontak belum tersedia"}
            meta={`Visit ${Number(item.total_visits || 0)} • ${formatCurrency(item.total_spent || 0) === "Cek harga" ? "Rp 0" : formatCurrency(item.total_spent || 0)} • Last ${formatDate(item.last_visit)} • ${Number(item.loyalty_points || 0)} pts`}
            badge={<StatusPill label={tier.label} tone={mapTierTone(tier.label)} />}
          />
        );
      })}
      </CardBlock>

      {!customersQuery.isLoading && !filtered.length ? (
        <EmptyStateCard title="Tidak ada hasil" description="Coba ubah kata kunci pencarian customer." />
      ) : null}
    </ScreenShell>
  );
}

function mapTierTone(label: string): "blue" | "success" | "amber" | "danger" | "slate" {
  const normalized = label.toLowerCase();
  if (normalized === "vip") return "success";
  if (normalized === "gold") return "amber";
  if (normalized === "new") return "blue";
  return "slate";
}
