import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { formatCurrency } from "@/lib/format";

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
  const [search, setSearch] = useState("");
  const customersQuery = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => apiFetch<CustomerRow[]>("/customers", { audience: "admin" }),
    enabled: guard.ready,
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
    <ScreenShell eyebrow="Admin" title="Customers" description="Lihat pelanggan tenant, tier, kunjungan, dan nilai customer dengan cepat.">
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
              value: formatCurrency(totalSpent),
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

      {filtered.map((item) => {
        const tier = getTierMeta(item.tier);
        return (
          <Pressable key={item.id}>
            <CardBlock>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 15,
                      backgroundColor: "#f1f5f9",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text selectable style={{ color: "#475569", fontSize: 16, fontWeight: "900" }}>
                      {String(item.name || "C").trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
                      {item.name || "Customer"}
                    </Text>
                    <Text selectable style={{ color: "#475569", fontSize: 13 }}>
                      {item.phone || item.email || "Kontak belum tersedia"}
                    </Text>
                    <Text selectable style={{ color: "#94a3b8", fontSize: 12 }}>
                      {item.email || "Email belum ada"}
                    </Text>
                  </View>
                </View>
                <View style={{ borderRadius: 999, backgroundColor: tier.bg, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" }}>
                  <Text selectable style={{ color: tier.tone, fontSize: 11, fontWeight: "800" }}>
                    {tier.label}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 12, gap: 3 }}>
                  <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                    KUNJUNGAN
                  </Text>
                  <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "900" }}>
                    {Number(item.total_visits || 0)}
                  </Text>
                </View>
                <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 12, gap: 3 }}>
                  <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                    SPENT
                  </Text>
                  <Text selectable style={{ color: "#1d4ed8", fontSize: 14, fontWeight: "900" }}>
                    {formatCurrency(item.total_spent || 0)}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                  Last visit {formatDate(item.last_visit)}
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                  {Number(item.loyalty_points || 0)} pts
                </Text>
              </View>
            </CardBlock>
          </Pressable>
        );
      })}

      {!customersQuery.isLoading && !filtered.length ? (
        <CardBlock>
          <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
            Belum ada customer yang cocok dengan pencarian ini.
          </Text>
        </CardBlock>
      ) : null}
    </ScreenShell>
  );
}
