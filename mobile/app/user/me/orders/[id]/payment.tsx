import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { getOrderStatusMeta } from "@/lib/customer-portal";
import { formatCurrency } from "@/lib/format";
import { getPortalWebUrl } from "@/lib/urls";

type CustomerOrderPayment = {
  id?: string;
  status?: string;
  payment_status?: string;
  balance_due?: number;
  grand_total?: number;
  resource_name?: string;
};

export default function CustomerOrderPaymentScreen() {
  const guard = useAuthGuard("customer");
  const { id } = useLocalSearchParams<{ id: string }>();
  const paymentQuery = useQuery({
    queryKey: ["customer-order-payment", id],
    queryFn: () => apiFetch<CustomerOrderPayment>(`/user/me/orders/${id}`, { audience: "customer" }),
    enabled: guard.ready && Boolean(id),
  });

  const order = paymentQuery.data;
  const statusMeta = getOrderStatusMeta(order?.status, order?.payment_status, order?.balance_due);

  return (
    <ScreenShell
      eyebrow="Pembayaran order"
      title={order?.resource_name || "Pembayaran order"}
      description="Payment summary order tersedia di mobile, lalu flow gateway/manual tetap diteruskan ke web."
    >
      <CardBlock>
        <Text selectable style={{ color: statusMeta.tone, fontSize: 16, fontWeight: "900" }}>
          {statusMeta.label}
        </Text>
        {statusMeta.hint ? (
          <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
            {statusMeta.hint}
          </Text>
        ) : null}
        <Text selectable style={{ color: "#475569", fontSize: 14 }}>
          Total {formatCurrency(order?.grand_total)}
        </Text>
        <Text selectable style={{ color: "#1d4ed8", fontSize: 18, fontWeight: "800" }}>
          Sisa {formatCurrency(order?.balance_due)}
        </Text>
      </CardBlock>
      <CtaButton
        label="Lanjut pembayaran di web"
        onPress={() => {
          void WebBrowser.openBrowserAsync(getPortalWebUrl(`/user/me/orders/${id}/payment`));
        }}
      />
    </ScreenShell>
  );
}
