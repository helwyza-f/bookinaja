import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";

type CustomerRow = {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
};

export default function AdminCustomersScreen() {
  const guard = useAuthGuard("admin");
  const customersQuery = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => apiFetch<CustomerRow[]>("/customers", { audience: "admin" }),
    enabled: guard.ready,
  });

  return (
    <ScreenShell eyebrow="Admin" title="Customers" description="Tab customer mengikuti permukaan CRM/customer list dari web.">
      {(customersQuery.data || []).slice(0, 8).map((item) => (
        <CardBlock key={item.id}>
          <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
            {item.name || "Customer"}
          </Text>
          <Text selectable style={{ color: "#475569", fontSize: 14 }}>
            {item.phone || item.email || "Kontak belum tersedia"}
          </Text>
        </CardBlock>
      ))}
      {!customersQuery.isLoading && !(customersQuery.data || []).length ? (
        <CardBlock>
          <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
            List customer belum tampil di environment ini. Route dan query boundary-nya sudah siap untuk diisi berikutnya.
          </Text>
        </CardBlock>
      ) : null}
    </ScreenShell>
  );
}
