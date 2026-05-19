import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { ConfirmModal } from "@/components/confirm-modal";
import { CtaButton } from "@/components/cta-button";
import { DirectSaleCatalogSheet } from "@/components/direct-sale-catalog-sheet";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useAdminIdentity } from "@/hooks/use-admin-identity";
import { useToast } from "@/hooks/use-toast";
import { hasAdminPermission } from "@/lib/admin-access";
import {
  formatAmount,
  isDirectSaleResource,
  labelItemType,
  orderPaymentStatusLabel,
  orderPaymentStatusTone,
  orderStatusLabel,
  orderStatusTone,
  type OpenOrder,
  type POSCatalogItem,
  type POSCatalogResource,
} from "@/lib/admin-orders";

type CartLine = POSCatalogItem & {
  quantity: number;
  subtotal: number;
};

function buildCartLines(
  resource: POSCatalogResource | null,
  cart: Record<string, number>,
) {
  const source = resource?.available_items || [];
  return Object.entries(cart)
    .map(([itemId, quantity]) => {
      const item = source.find((entry) => entry.id === itemId);
      if (!item || quantity <= 0) return null;
      return {
        ...item,
        quantity,
        subtotal: Number(item.price || 0) * quantity,
      };
    })
    .filter(Boolean) as CartLine[];
}

export default function AdminNewOrderScreen() {
  const guard = useAuthGuard("admin");
  const identity = useAdminIdentity();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const canCreateOrder = hasAdminPermission(identity.data, "pos.order.add");
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const setupQuery = useQuery({
    queryKey: ["admin-mobile-direct-sale-setup"],
    enabled: guard.ready && canCreateOrder,
    queryFn: async () => {
      const [catalogRes, openOrdersRes] = await Promise.all([
        apiFetch<{ items?: POSCatalogResource[] }>("/admin/resources/pos-catalog", { audience: "admin" }),
        apiFetch<{ items?: OpenOrder[] }>("/sales-orders/open?limit=10", { audience: "admin" }),
      ]);
      return {
        resources: (catalogRes.items || []).filter(isDirectSaleResource),
        openOrders: openOrdersRes.items || [],
      };
    },
  });

  const resources = setupQuery.data?.resources || [];
  const openOrders = setupQuery.data?.openOrders || [];

  useEffect(() => {
    if (!selectedResourceId && resources[0]?.resource_id) {
      setSelectedResourceId(resources[0].resource_id);
    }
  }, [resources, selectedResourceId]);

  const selectedResource = useMemo(
    () => resources.find((item) => item.resource_id === selectedResourceId) || null,
    [resources, selectedResourceId],
  );
  const quickItems = useMemo(() => {
    const source = selectedResource?.available_items || [];
    const needle = search.trim().toLowerCase();
    const filtered = needle
      ? source.filter((item) =>
          `${item.name || ""} ${item.item_type || ""}`.toLowerCase().includes(needle),
        )
      : source;
    return filtered.slice(0, 5);
  }, [search, selectedResource?.available_items]);
  const cartLines = useMemo(
    () => buildCartLines(selectedResource, cart),
    [cart, selectedResource],
  );
  const cartCount = cartLines.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartLines.reduce((sum, item) => sum + item.subtotal, 0);

  function changeCartQuantity(itemId: string, nextQuantity: number) {
    setCart((current) => {
      const next = { ...current };
      if (nextQuantity <= 0) delete next[itemId];
      else next[itemId] = nextQuantity;
      return next;
    });
  }

  async function createOrder() {
    if (!canCreateOrder || !selectedResource) return;
    if (!cartLines.length) {
      showToast({
        title: "Cart masih kosong",
        message: "Pilih minimal satu item dulu.",
        tone: "warning",
      });
      return;
    }

    try {
      setCreating(true);
      const created = await apiFetch<{ id?: string; order?: { id?: string } }>("/sales-orders", {
        audience: "admin",
        method: "POST",
        body: JSON.stringify({
          resource_id: selectedResource.resource_id,
          notes: notes.trim(),
          payment_method: "",
        }),
      });
      const orderId = String(created.order?.id || created.id || "").trim();
      if (!orderId) throw new Error("Sales order gagal dibuat.");

      for (const item of cartLines) {
        await apiFetch(`/sales-orders/${orderId}/items`, {
          audience: "admin",
          method: "POST",
          body: JSON.stringify({
            resource_item_id: item.id,
            quantity: item.quantity,
          }),
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-mobile-direct-sale-setup"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-ops-mobile"] }),
      ]);

      showToast({
        title: "Direct sale dibuat",
        message: "Transaksi baru siap diproses.",
        tone: "success",
      });
      router.replace({
        pathname: "/admin/orders/[id]",
        params: { id: orderId },
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal buat order",
        message: err.message || "Direct sale belum berhasil dibuat.",
        tone: "error",
      });
    } finally {
      setCreating(false);
      setConfirmOpen(false);
    }
  }

  if (!canCreateOrder) {
    return (
      <ScreenShell
        eyebrow="Direct sale"
        title="Akses dibatasi"
        description="Role kamu belum punya izin membuat direct sale."
      >
        <CtaButton label="Kembali ke ops" tone="secondary" onPress={() => router.replace("/admin/operations")} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      eyebrow="Direct sale"
      title="Order langsung"
      description="Pilih resource, susun cart, lalu lanjut ke pembayaran."
      includeBottomSafeArea={false}
    >
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/admin/operations"))}>
        <Text selectable style={{ color: "#64748b", fontSize: 13, fontWeight: "800" }}>
          Kembali
        </Text>
      </Pressable>

      {!!openOrders.length ? (
        <CardBlock>
          <SectionHeading title="Masih berjalan" description="Lanjutkan order yang belum selesai dulu kalau perlu." />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {openOrders.map((order) => (
              <Pressable
                key={order.id}
                onPress={() =>
                  router.push({
                    pathname: "/admin/orders/[id]",
                    params: { id: order.id },
                  })
                }
                style={{
                  width: 220,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  backgroundColor: "#fbfdff",
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  <StatusChip label={orderStatusLabel(order.status)} tone={orderStatusTone(order.status)} />
                  <StatusChip
                    label={orderPaymentStatusLabel(order.payment_status, Number(order.balance_due || 0))}
                    tone={orderPaymentStatusTone(order.payment_status, Number(order.balance_due || 0))}
                  />
                </View>
                <View style={{ gap: 3 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                    {order.resource_name || "Direct sale"}
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                    Sisa {formatAmount(order.balance_due || order.grand_total)}
                  </Text>
                </View>
                <Text selectable style={{ color: "#2563eb", fontSize: 12, fontWeight: "800" }}>
                  Buka order
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </CardBlock>
      ) : null}

      <CardBlock>
        <SectionHeading
          title="Resource"
          description="Pilih counter atau resource jual untuk transaksi ini."
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {resources.map((resource) => {
            const active = selectedResourceId === resource.resource_id;
            return (
              <Pressable
                key={resource.resource_id}
                onPress={() => {
                  setSelectedResourceId(resource.resource_id);
                  setCart({});
                  setSearch("");
                }}
                style={{
                  width: 220,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: active ? "#2563eb" : "#dbe2ea",
                  backgroundColor: active ? "#eff6ff" : "#ffffff",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 124,
                    backgroundColor: "#edf4ff",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {resource.resource_image_url ? (
                    <Image
                      source={{ uri: resource.resource_image_url }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  ) : (
                    <MaterialCommunityIcons name="shopping-outline" size={30} color="#2563eb" />
                  )}
                </View>
                <View style={{ paddingHorizontal: 14, paddingVertical: 14, gap: 4 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                    {resource.resource_name}
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                    {resource.category || "Direct sale"} • {resource.available_items?.length || 0} item
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </CardBlock>

      <CardBlock>
        <SectionHeading
          title="Cart builder"
          description="Edit cepat dari sini, atau buka katalog penuh untuk tambah item."
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Cari item cepat"
          placeholderTextColor="#94a3b8"
          style={inputStyle}
        />
        {quickItems.length ? (
          quickItems.map((item) => {
            const quantity = Number(cart[item.id] || 0);
            return (
              <View
                key={item.id}
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: quantity > 0 ? "#bfdbfe" : "#e2e8f0",
                  backgroundColor: quantity > 0 ? "#f8fbff" : "#ffffff",
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                      {item.name}
                    </Text>
                    <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                      {labelItemType(item.item_type)} • {formatAmount(item.price)}
                    </Text>
                  </View>
                  {item.is_default ? <StatusChip label="Default" tone="blue" /> : null}
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800" }}>
                    {quantity > 0 ? formatAmount(Number(item.price || 0) * quantity) : "Belum dipilih"}
                  </Text>
                  <Stepper
                    quantity={quantity}
                    onDecrease={() => changeCartQuantity(item.id, quantity - 1)}
                    onIncrease={() => changeCartQuantity(item.id, quantity + 1)}
                  />
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState text="Pilih resource dulu atau ubah pencarian." />
        )}

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <CtaButton
              tone="secondary"
              label="Buka katalog"
              onPress={() => {
                if (!selectedResource) {
                  showToast({
                    title: "Pilih resource dulu",
                    message: "Cart direct sale harus punya resource utama.",
                    tone: "info",
                  });
                  return;
                }
                setCatalogOpen(true);
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <CtaButton
              label="Reset cart"
              tone="secondary"
              onPress={() => setCart({})}
              disabled={cartCount <= 0}
            />
          </View>
        </View>
      </CardBlock>

      <CardBlock>
        <SectionHeading title="Cart" description="Cek dulu sebelum transaksi dibuat." />
        {cartLines.length ? (
          cartLines.map((item) => (
            <View
              key={item.id}
              style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                backgroundColor: "#fbfdff",
                paddingHorizontal: 14,
                paddingVertical: 14,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                    {item.name}
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                    {labelItemType(item.item_type)} • @ {formatAmount(item.price)}
                  </Text>
                </View>
                <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "900" }}>
                  {formatAmount(item.subtotal)}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                  Qty {item.quantity}
                </Text>
                <Stepper
                  quantity={item.quantity}
                  onDecrease={() => changeCartQuantity(item.id, item.quantity - 1)}
                  onIncrease={() => changeCartQuantity(item.id, item.quantity + 1)}
                />
              </View>
            </View>
          ))
        ) : (
          <EmptyState text="Cart masih kosong. Tambah item dari quick pick atau katalog." />
        )}

        <View
          style={{
            borderRadius: 22,
            backgroundColor: "#091d3a",
            paddingHorizontal: 16,
            paddingVertical: 16,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <View style={{ gap: 2 }}>
              <Text selectable style={{ color: "#94a3b8", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
                RINGKASAN
              </Text>
              <Text selectable style={{ color: "#ffffff", fontSize: 20, fontWeight: "900" }}>
                {cartCount} item
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 2 }}>
              <Text selectable style={{ color: "#94a3b8", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 }}>
                TOTAL
              </Text>
              <Text selectable style={{ color: "#7dd3fc", fontSize: 20, fontWeight: "900" }}>
                {formatAmount(cartTotal)}
              </Text>
            </View>
          </View>

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Catatan order opsional"
            placeholderTextColor="#9fb0cb"
            multiline
            style={[inputStyle, darkInputStyle]}
          />

          <CtaButton
            label={creating ? "Memproses..." : "Buat transaksi"}
            onPress={() => setConfirmOpen(true)}
            disabled={creating || !selectedResource || cartCount <= 0}
          />
        </View>
      </CardBlock>

      <DirectSaleCatalogSheet
        open={catalogOpen}
        title="Tambah item"
        description="Pilih item direct sale untuk resource ini."
        resources={selectedResource ? [selectedResource] : []}
        initialResourceId={selectedResource?.resource_id}
        initialQuantities={cart}
        onClose={() => setCatalogOpen(false)}
        onApply={({ quantities }) => {
          setCart(quantities);
          setCatalogOpen(false);
        }}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Buat transaksi ini?"
        message="Total akan dikunci ke sales order baru dan lanjut ke screen pembayaran."
        confirmLabel="Buat transaksi"
        busy={creating}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void createOrder()}
      >
        <View
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#dbe7ff",
            backgroundColor: "#f8fbff",
            paddingHorizontal: 14,
            paddingVertical: 14,
            gap: 8,
          }}
        >
          <SummaryRow label="Resource" value={selectedResource?.resource_name || "-"} />
          <SummaryRow label="Item" value={`${cartCount} item`} />
          <SummaryRow label="Total" value={formatAmount(cartTotal)} strong />
        </View>
      </ConfirmModal>
    </ScreenShell>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "900" }}>
        {title}
      </Text>
      <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
        {description}
      </Text>
    </View>
  );
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "blue" | "success" | "amber" | "danger" | "slate";
}) {
  const colors = {
    blue: { bg: "#dbeafe", text: "#1d4ed8" },
    success: { bg: "#dcfce7", text: "#15803d" },
    amber: { bg: "#fef3c7", text: "#b45309" },
    danger: { bg: "#fee2e2", text: "#dc2626" },
    slate: { bg: "#e2e8f0", text: "#475569" },
  }[tone];

  return (
    <View style={{ borderRadius: 999, backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 6 }}>
      <Text selectable style={{ color: colors.text, fontSize: 11, fontWeight: "800" }}>
        {label}
      </Text>
    </View>
  );
}

function Stepper({
  quantity,
  onDecrease,
  onIncrease,
}: {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <QtyButton label="-" onPress={onDecrease} />
      <Text selectable style={{ minWidth: 18, textAlign: "center", color: "#0f172a", fontSize: 14, fontWeight: "900" }}>
        {quantity}
      </Text>
      <QtyButton label="+" onPress={onIncrease} />
    </View>
  );
}

function QtyButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={stepperButtonStyle}>
      <Text selectable style={stepperButtonText}>
        {label}
      </Text>
    </Pressable>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
        {label}
      </Text>
      <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: strong ? "900" : "800", flex: 1, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderStyle: "dashed",
        backgroundColor: "#fbfdff",
        paddingHorizontal: 14,
        paddingVertical: 18,
      }}
    >
      <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
        {text}
      </Text>
    </View>
  );
}

const inputStyle = {
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#d6deea",
  backgroundColor: "#fbfdff",
  paddingHorizontal: 14,
  paddingVertical: 14,
  color: "#0f172a",
  fontSize: 15,
} as const;

const darkInputStyle = {
  borderColor: "#27446e",
  backgroundColor: "#0f274a",
  color: "#ffffff",
  minHeight: 96,
  textAlignVertical: "top",
} as const;

const stepperButtonStyle = {
  width: 34,
  height: 34,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#dbe2ea",
  backgroundColor: "#ffffff",
  alignItems: "center",
  justifyContent: "center",
} as const;

const stepperButtonText = {
  color: "#0f172a",
  fontSize: 16,
  fontWeight: "900",
} as const;
