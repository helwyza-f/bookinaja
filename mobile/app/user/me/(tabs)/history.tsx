import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { formatDateTime } from "@/lib/format";
import { CustomerPortalItem } from "@/lib/customer-portal";

export default function CustomerHistoryScreen() {
  const guard = useAuthGuard("customer");
  const historyQuery = useQuery({
    queryKey: ["customer-history"],
    queryFn: () => apiFetch<CustomerPortalItem[]>("/user/me/history", { audience: "customer" }),
    enabled: guard.ready,
  });

  return (
    <ScreenShell eyebrow="Customer" title="Riwayat" description="Riwayat transaction customer mengikuti endpoint history yang sama dengan web.">
      {(historyQuery.data || []).slice(0, 10).map((item) => (
        <Link
          key={item.id}
          href={
            String(item.kind || "").toLowerCase().includes("order")
              ? (`/user/me/orders/${item.id}` as const)
              : (`/user/me/bookings/${item.id}` as const)
          }
          asChild
        >
          <View>
            <CardBlock>
              <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
                {item.tenant_name || "Tenant"}
              </Text>
              <Text selectable style={{ color: "#475569", fontSize: 14 }}>
                {item.status || "status"} - {formatDateTime(item.date || item.start_time)}
              </Text>
            </CardBlock>
          </View>
        </Link>
      ))}
      {!historyQuery.isLoading && !(historyQuery.data || []).length ? (
        <CardBlock>
          <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
            Riwayat customer belum tersedia di session ini.
          </Text>
        </CardBlock>
      ) : null}
    </ScreenShell>
  );
}
