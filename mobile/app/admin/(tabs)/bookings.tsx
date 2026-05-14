import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";

type BookingRow = {
  id: string;
  customer_name?: string;
  resource_name?: string;
  status?: string;
};

export default function AdminBookingsScreen() {
  const guard = useAuthGuard("admin");
  const bookingsQuery = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => apiFetch<BookingRow[]>("/bookings", { audience: "admin" }),
    enabled: guard.ready,
  });

  return (
    <ScreenShell eyebrow="Admin" title="Bookings" description="Tab ini disiapkan untuk parity dengan daftar booking di web.">
      {(bookingsQuery.data || []).slice(0, 8).map((item) => (
        <CardBlock key={item.id}>
          <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
            {item.customer_name || "Customer booking"}
          </Text>
          <Text selectable style={{ color: "#475569", fontSize: 14 }}>
            {item.resource_name || "Resource belum tersedia"} - {item.status || "status"}
          </Text>
        </CardBlock>
      ))}
      {!bookingsQuery.isLoading && !(bookingsQuery.data || []).length ? (
        <CardBlock>
          <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
            Endpoint booking belum mengembalikan data di environment ini, tapi shell route dan token admin sudah siap.
          </Text>
        </CardBlock>
      ) : null}
    </ScreenShell>
  );
}
