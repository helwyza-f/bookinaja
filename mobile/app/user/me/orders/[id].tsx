import { Link, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { getOrderStatusMeta } from "@/lib/customer-portal";
import { formatCurrency } from "@/lib/format";

type OrderItem = {
  id: string;
  item_name?: string;
  quantity?: number;
  subtotal?: number;
};

type CustomerOrderDetail = {
  id?: string;
  status?: string;
  payment_status?: string;
  customer_id?: string;
  balance_due?: number;
  grand_total?: number;
  resource_name?: string;
  items?: OrderItem[];
};

export default function CustomerOrderDetailScreen() {
  const guard = useAuthGuard("customer");
  const { id } = useLocalSearchParams<{ id: string }>();
  const detailQuery = useQuery({
    queryKey: ["customer-order-detail", id],
    queryFn: () => apiFetch<CustomerOrderDetail>(`/user/me/orders/${id}`, { audience: "customer" }),
    enabled: guard.ready && Boolean(id),
  });

  const order = detailQuery.data;
  const statusMeta = getOrderStatusMeta(order?.status, order?.payment_status, order?.balance_due);

  return (
    <ScreenShell
      eyebrow="Order"
      title={order?.resource_name || "Ringkasan order"}
      description="Lihat status order, item yang dibeli, dan lanjutkan pembayaran langsung dari app."
    >
      <CardBlock>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900", flex: 1 }}>
            Status order
          </Text>
          <Text selectable style={{ color: statusMeta.tone, fontSize: 14, fontWeight: "800" }}>
            {statusMeta.label}
          </Text>
        </View>
        {statusMeta.hint ? (
          <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
            {statusMeta.hint}
          </Text>
        ) : null}
        <Text selectable style={{ color: "#475569", fontSize: 14 }}>
          Total {formatCurrency(order?.grand_total)}
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14 }}>
          Sisa {formatCurrency(order?.balance_due)}
        </Text>
      </CardBlock>

      {(order?.items || []).map((item) => (
        <CardBlock key={item.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor: "#f8fafc",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="shopping-bag" size={18} color="#475569" />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                  {item.item_name || "Item"}
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                  {item.quantity || 0} item
                </Text>
              </View>
            </View>
            <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
              {formatCurrency(item.subtotal)}
            </Text>
          </View>
        </CardBlock>
      ))}

      <Link href={`/user/me/orders/${id}/payment` as const} asChild>
        <View>
          <CtaButton label="Lanjut ke pembayaran" />
        </View>
      </Link>
    </ScreenShell>
  );
}
