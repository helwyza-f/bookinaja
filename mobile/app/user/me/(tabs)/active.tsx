import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";

type ActiveResponse = {
  active_bookings?: Array<{ id: string; tenant_name?: string; status?: string }>;
  active_orders?: Array<{ id: string; tenant_name?: string; status?: string }>;
};

export default function CustomerActiveScreen() {
  const guard = useAuthGuard("customer");
  const activeQuery = useQuery({
    queryKey: ["customer-active"],
    queryFn: () => apiFetch<ActiveResponse>("/user/me/active", { audience: "customer" }),
    enabled: guard.ready,
  });

  const items = [
    ...(activeQuery.data?.active_orders || []).map((item) => ({ ...item, kind: "Order" })),
    ...(activeQuery.data?.active_bookings || []).map((item) => ({ ...item, kind: "Booking" })),
  ];

  return (
    <ScreenShell eyebrow="Customer" title="Transaksi aktif" description="Permukaan aktif untuk order dan booking yang masih berjalan.">
      {items.map((item) => (
        <Link
          key={`${item.kind}-${item.id}`}
          href={
            item.kind === "Order"
              ? (`/user/me/orders/${item.id}` as const)
              : (`/user/me/bookings/${item.id}` as const)
          }
          asChild
        >
          <View>
            <CardBlock>
              <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
                {item.kind} - {item.tenant_name || "Tenant"}
              </Text>
              <Text selectable style={{ color: "#475569", fontSize: 14 }}>{item.status || "status"}</Text>
            </CardBlock>
          </View>
        </Link>
      ))}
      {!activeQuery.isLoading && !items.length ? (
        <CardBlock>
          <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
            Belum ada transaksi aktif saat ini.
          </Text>
        </CardBlock>
      ) : null}
    </ScreenShell>
  );
}
