import { Linking, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useAdminIdentity } from "@/hooks/use-admin-identity";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useRealtime } from "@/hooks/use-realtime";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { BOOKING_EVENT_PREFIXES, matchesRealtimePrefix } from "@/lib/realtime/event-types";
import { tenantBookingsChannel, tenantOrdersChannel } from "@/lib/realtime/channels";

type CustomerDetail = {
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

type CustomerHistoryItem = {
  id: string;
  resource?: string;
  date?: string;
  end_date?: string;
  grand_total?: number;
  deposit_amount?: number;
  paid_amount?: number;
  balance_due?: number;
  status?: string;
  payment_status?: string;
  payment_method?: string;
};

type CustomerPointEvent = {
  id: string;
  event_type: string;
  points: number;
  description?: string;
  tenant_name?: string;
  created_at?: string;
};

type CustomerPointSummary = {
  balance?: number;
  earned_at_tenant?: number;
  earning_rule_label?: string;
  activity?: CustomerPointEvent[];
};

function formatAmount(value?: number) {
  const formatted = formatCurrency(value || 0);
  return formatted === "Cek harga" ? "Rp 0" : formatted;
}

function getTierMeta(value?: string) {
  const tier = String(value || "REGULAR").toUpperCase();
  if (tier === "VIP") return { label: "VIP", tone: "#7c3aed", bg: "#f5f3ff" };
  if (tier === "GOLD") return { label: "Gold", tone: "#b45309", bg: "#fef3c7" };
  if (tier === "NEW") return { label: "New", tone: "#2563eb", bg: "#dbeafe" };
  return { label: "Regular", tone: "#475569", bg: "#e2e8f0" };
}

function openWhatsApp(phone?: string) {
  const normalized = String(phone || "").replace(/[^\d]/g, "");
  if (!normalized) return;
  void Linking.openURL(`https://wa.me/${normalized}`);
}

export default function AdminCustomerDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = String(params.id || "");
  const guard = useAuthGuard("admin");
  const identityQuery = useAdminIdentity();
  const detailQuery = useQuery({
    queryKey: ["admin-customer-detail", id],
    enabled: guard.ready && Boolean(id),
    queryFn: async () => {
      const [detail, history, points] = await Promise.all([
        apiFetch<CustomerDetail>(`/customers/${id}`, { audience: "admin" }),
        apiFetch<{ items?: CustomerHistoryItem[] } | CustomerHistoryItem[]>(`/customers/${id}/history?limit=8`, { audience: "admin" }),
        apiFetch<CustomerPointSummary>(`/customers/${id}/points?limit=8`, { audience: "admin" }),
      ]);
      return {
        detail,
        history: Array.isArray(history) ? history : history?.items || [],
        points,
      };
    },
  });

  useRealtime({
    enabled: Boolean(identityQuery.data?.tenant_id && id),
    channels: identityQuery.data?.tenant_id
      ? [tenantBookingsChannel(identityQuery.data.tenant_id), tenantOrdersChannel(identityQuery.data.tenant_id)]
      : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      void detailQuery.refetch();
    },
    onReconnect: () => {
      void detailQuery.refetch();
    },
  });

  const detail = detailQuery.data?.detail;
  const tier = getTierMeta(detail?.tier);

  return (
    <ScreenShell
      eyebrow="Admin customer"
      title={detail?.name || "Detail customer"}
      description="Ringkasan nilai customer, histori booking, dan aktivitas poin tenant."
    >
      <Pressable
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace("/admin/customers");
        }}
        style={{ alignSelf: "flex-start", paddingVertical: 4 }}
      >
        <Text selectable style={{ color: "#64748b", fontSize: 13, fontWeight: "800" }}>
          Kembali
        </Text>
      </Pressable>

      <CardBlock>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 24, fontWeight: "900" }}>
              {detail?.name || "Customer"}
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 14 }}>
              {detail?.phone || "Nomor belum tersedia"}
            </Text>
            <Text selectable style={{ color: "#94a3b8", fontSize: 13 }}>
              {detail?.email || "Email belum tersedia"}
            </Text>
          </View>
          <View style={{ borderRadius: 999, backgroundColor: tier.bg, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" }}>
            <Text selectable style={{ color: tier.tone, fontSize: 11, fontWeight: "800" }}>
              {tier.label}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#f8fafc", padding: 12, gap: 4 }}>
            <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
              KUNJUNGAN
            </Text>
            <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "900" }}>
              {Number(detail?.total_visits || 0)}
            </Text>
          </View>
          <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#f8fafc", padding: 12, gap: 4 }}>
            <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
              TOTAL SPENT
            </Text>
            <Text selectable style={{ color: "#1d4ed8", fontSize: 16, fontWeight: "900" }}>
              {formatAmount(detail?.total_spent)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <CtaButton label="WhatsApp" tone="secondary" onPress={() => openWhatsApp(detail?.phone)} disabled={!detail?.phone} />
          <CtaButton label="Telepon" tone="secondary" onPress={() => void Linking.openURL(`tel:${detail?.phone}`)} disabled={!detail?.phone} />
        </View>
      </CardBlock>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Loyalti
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#f8fafc", padding: 12, gap: 4 }}>
            <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
              BALANCE
            </Text>
            <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "900" }}>
              {Number(detailQuery.data?.points?.balance || 0)} pts
            </Text>
          </View>
          <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#f8fafc", padding: 12, gap: 4 }}>
            <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
              DIDAPAT DI TENANT
            </Text>
            <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "900" }}>
              {Number(detailQuery.data?.points?.earned_at_tenant || 0)} pts
            </Text>
          </View>
        </View>
        <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
          {detailQuery.data?.points?.earning_rule_label || "Belum ada rule loyalti aktif."}
        </Text>
      </CardBlock>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Riwayat booking
        </Text>
        {(detailQuery.data?.history || []).length ? (
          detailQuery.data?.history?.map((item) => (
            <View key={item.id} style={{ borderRadius: 18, borderWidth: 1, borderColor: "#edf2f7", backgroundColor: "#fbfdff", padding: 14, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                    {item.resource || "Booking"}
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                    {formatDateTime(item.date)} - {formatDateTime(item.end_date)}
                  </Text>
                </View>
                <Text selectable style={{ color: "#475569", fontSize: 12, fontWeight: "800" }}>
                  {item.status || "-"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1, borderRadius: 14, backgroundColor: "#f8fafc", padding: 10, gap: 2 }}>
                  <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                    TOTAL
                  </Text>
                  <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800" }}>
                    {formatAmount(item.grand_total)}
                  </Text>
                </View>
                <View style={{ flex: 1, borderRadius: 14, backgroundColor: "#f8fafc", padding: 10, gap: 2 }}>
                  <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                    SISA
                  </Text>
                  <Text selectable style={{ color: "#1d4ed8", fontSize: 13, fontWeight: "800" }}>
                    {formatAmount(item.balance_due)}
                  </Text>
                </View>
              </View>
              <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                Payment {item.payment_status || "pending"} / {item.payment_method || "-"}
              </Text>
            </View>
          ))
        ) : (
          <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
            Riwayat booking belum ada.
          </Text>
        )}
      </CardBlock>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Aktivitas poin
        </Text>
        {(detailQuery.data?.points?.activity || []).length ? (
          detailQuery.data?.points?.activity?.map((item) => (
            <View key={item.id} style={{ borderRadius: 18, borderWidth: 1, borderColor: "#edf2f7", backgroundColor: "#fbfdff", padding: 14, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800", flex: 1 }}>
                  {item.description || item.event_type}
                </Text>
                <Text selectable style={{ color: item.points >= 0 ? "#059669" : "#b91c1c", fontSize: 13, fontWeight: "900" }}>
                  {item.points >= 0 ? `+${item.points}` : item.points} pts
                </Text>
              </View>
              <Text selectable style={{ color: "#94a3b8", fontSize: 12 }}>
                {item.tenant_name || "Tenant"} / {formatDateTime(item.created_at)}
              </Text>
            </View>
          ))
        ) : (
          <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
            Aktivitas poin belum tersedia.
          </Text>
        )}
      </CardBlock>
    </ScreenShell>
  );
}
