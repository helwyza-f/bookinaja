import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { ConfirmModal } from "@/components/confirm-modal";
import { CtaButton } from "@/components/cta-button";
import { DirectSaleCatalogSheet } from "@/components/direct-sale-catalog-sheet";
import { ScreenShell } from "@/components/screen-shell";
import { useAdminIdentity } from "@/hooks/use-admin-identity";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useRealtime } from "@/hooks/use-realtime";
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
  paymentMethodHint,
  paymentMethodIcon,
  type OrderDetail,
  type OrderItem,
  type PaymentAttempt,
  type PaymentMethod,
  type POSCatalogResource,
} from "@/lib/admin-orders";
import { formatDateTime } from "@/lib/format";
import { matchesRealtimePrefix } from "@/lib/realtime/event-types";
import {
  tenantDashboardChannel,
  tenantOrdersChannel,
} from "@/lib/realtime/channels";

type ConfirmState =
  | {
      title: string;
      message: string;
      confirmLabel: string;
      tone?: "primary" | "danger";
      onConfirm: () => void;
    }
  | null;

function getNextAction(params: {
  status: string;
  paymentStatus: string;
  balanceDue: number;
  hasPendingAttempts: boolean;
}) {
  if (params.hasPendingAttempts) {
    return {
      title: "Review pembayaran manual",
      description: "Ada attempt yang menunggu keputusan admin.",
      backgroundColor: "#fff7ed",
      accent: "#b45309",
    };
  }
  if (params.balanceDue <= 0) {
    return {
      title: "Transaksi siap ditutup",
      description: "Tagihan sudah lunas. Tinggal tutup direct sale ini.",
      backgroundColor: "#ecfdf5",
      accent: "#059669",
    };
  }
  if (params.status === "open") {
    return {
      title: "Review cart lalu checkout",
      description: "Kunci item dan teruskan ke pembayaran.",
      backgroundColor: "#eff6ff",
      accent: "#2563eb",
    };
  }
  if (params.paymentStatus === "awaiting_verification") {
    return {
      title: "Menunggu verifikasi",
      description: "Tuntaskan review manual sebelum membuka metode lain.",
      backgroundColor: "#fff7ed",
      accent: "#b45309",
    };
  }
  return {
    title: "Selesaikan pembayaran",
    description: "Pilih metode bayar yang paling cepat.",
    backgroundColor: "#eff6ff",
    accent: "#2563eb",
  };
}

export default function AdminOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const guard = useAuthGuard("admin");
  const identity = useAdminIdentity();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState("");
  const [activeStep, setActiveStep] = useState<"summary" | "payment">("summary");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingAttemptId, setProcessingAttemptId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const canReadPos = hasAdminPermission(identity.data, "pos.read");
  const canAddOrderItems = hasAdminPermission(identity.data, "pos.order.add");
  const canCheckout = hasAdminPermission(identity.data, "pos.checkout");
  const canSettleCash = hasAdminPermission(identity.data, "pos.cash.settle");

  const detailQuery = useQuery({
    queryKey: ["admin-order-detail", id],
    enabled: guard.ready && Boolean(id) && canReadPos,
    queryFn: async () => {
      const [order, catalogRes] = await Promise.all([
        apiFetch<OrderDetail>(`/sales-orders/${id}`, { audience: "admin" }),
        apiFetch<{ items?: POSCatalogResource[] }>("/admin/resources/pos-catalog", { audience: "admin" }),
      ]);
      return {
        order,
        catalog: (catalogRes.items || []).filter(isDirectSaleResource),
      };
    },
  });

  const realtime = useRealtime({
    enabled: Boolean(identity.data?.tenant_id && id),
    channels: identity.data?.tenant_id
      ? [tenantOrdersChannel(identity.data.tenant_id), tenantDashboardChannel(identity.data.tenant_id)]
      : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, ["order.", "payment."])) return;
      const entityId = String(event.entity_id || "");
      const orderId = String((event.refs?.order_id as string) || "");
      if (entityId !== String(id) && orderId !== String(id)) return;
      void detailQuery.refetch();
    },
    onReconnect: () => {
      void detailQuery.refetch();
    },
  });

  const order = detailQuery.data?.order;
  const posCatalog = detailQuery.data?.catalog || [];
  const paymentMethods = useMemo(
    () => (order?.payment_methods || []).filter((method) => method.is_active !== false),
    [order?.payment_methods],
  );
  const selectedMethodDetail =
    paymentMethods.find((method) => method.code === selectedMethod) || paymentMethods[0] || null;
  const status = String(order?.status || "").toLowerCase();
  const balanceDue = Number(order?.balance_due || 0);
  const itemCount = (order?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const pendingAttempts = (order?.payment_attempts || []).filter((item) =>
    ["submitted", "awaiting_verification"].includes(String(item.status || "").toLowerCase()),
  );
  const hasPendingAttempts = pendingAttempts.length > 0;
  const canEdit = canAddOrderItems && !["completed", "cancelled"].includes(status);
  const canCheckoutOrder = canCheckout && status === "open" && itemCount > 0;
  const canProcessPayment = balanceDue > 0 && !["completed", "cancelled"].includes(status);
  const canCloseOrder = canCheckout && balanceDue <= 0 && !["completed", "cancelled"].includes(status);
  const nextAction = getNextAction({
    status,
    paymentStatus: String(order?.payment_status || "").toLowerCase(),
    balanceDue,
    hasPendingAttempts,
  });

  useEffect(() => {
    if (!paymentMethods.length) return;
    if (!paymentMethods.find((method) => method.code === selectedMethod)) {
      setSelectedMethod(String(paymentMethods[0]?.code || ""));
    }
  }, [paymentMethods, selectedMethod]);

  useEffect(() => {
    if (hasPendingAttempts && activeStep !== "payment") {
      setActiveStep("payment");
    }
  }, [activeStep, hasPendingAttempts]);

  async function refreshAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-order-detail", id] }),
      queryClient.invalidateQueries({ queryKey: ["admin-ops-mobile"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-mobile-direct-sale-setup"] }),
    ]);
  }

  async function addCatalogItems(payload: { resourceId: string; quantities: Record<string, number> }) {
    if (!canAddOrderItems || !id) return;
    const resource = posCatalog.find((entry) => entry.resource_id === payload.resourceId);
    const items = (resource?.available_items || []).filter((item) => Number(payload.quantities[item.id] || 0) > 0);
    if (!items.length) {
      showToast({
        title: "Belum ada item",
        message: "Pilih item dulu sebelum disimpan.",
        tone: "warning",
      });
      return;
    }

    try {
      setProcessing(true);
      for (const item of items) {
        await apiFetch(`/sales-orders/${id}/items`, {
          audience: "admin",
          method: "POST",
          body: JSON.stringify({
            resource_item_id: item.id,
            quantity: Number(payload.quantities[item.id] || 0),
          }),
        });
      }
      await refreshAll();
      showToast({
        title: "Item ditambah",
        message: `${items.length} pilihan masuk ke transaksi.`,
        tone: "success",
      });
      setCatalogOpen(false);
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal tambah item",
        message: err.message || "Item belum berhasil ditambahkan.",
        tone: "error",
      });
    } finally {
      setProcessing(false);
    }
  }

  async function updateItemQuantity(item: OrderItem, nextQuantity: number) {
    if (!canAddOrderItems || !id) return;
    if (nextQuantity <= 0) {
      setConfirmState({
        title: "Hapus item ini?",
        message: "Line item akan dikeluarkan dari transaksi.",
        confirmLabel: "Hapus",
        tone: "danger",
        onConfirm: () => void deleteItem(item.id),
      });
      return;
    }

    try {
      setProcessing(true);
      await apiFetch(`/sales-orders/${id}/items/${item.id}`, {
        audience: "admin",
        method: "PUT",
        body: JSON.stringify({
          resource_item_id: item.resource_item_id,
          item_name: item.item_name,
          item_type: item.item_type,
          quantity: nextQuantity,
          unit_price: item.unit_price,
        }),
      });
      await refreshAll();
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal update item",
        message: err.message || "Jumlah item belum berhasil diubah.",
        tone: "error",
      });
    } finally {
      setProcessing(false);
    }
  }

  async function deleteItem(itemId: string) {
    try {
      setProcessing(true);
      await apiFetch(`/sales-orders/${id}/items/${itemId}`, {
        audience: "admin",
        method: "DELETE",
      });
      await refreshAll();
      showToast({
        title: "Item dihapus",
        message: "Line item sudah keluar dari transaksi.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal hapus item",
        message: err.message || "Line item belum berhasil dihapus.",
        tone: "error",
      });
    } finally {
      setConfirmState(null);
      setProcessing(false);
    }
  }

  async function checkoutOrder() {
    if (!canCheckoutOrder) return;
    try {
      setProcessing(true);
      await apiFetch(`/sales-orders/${id}/checkout`, {
        audience: "admin",
        method: "POST",
        body: JSON.stringify({
          payment_method: order?.payment_method || "",
          notes: order?.notes || "",
        }),
      });
      await refreshAll();
      setActiveStep("payment");
      showToast({
        title: "Checkout berhasil",
        message: "Transaksi siap lanjut ke pembayaran.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal checkout",
        message: err.message || "Transaksi belum berhasil di-checkout.",
        tone: "error",
      });
    } finally {
      setProcessing(false);
    }
  }

  async function processPayment() {
    if (!id || !selectedMethodDetail || !canProcessPayment) return;
    try {
      setProcessing(true);

      if (selectedMethodDetail.code === "cash") {
        await apiFetch(`/sales-orders/${id}/settle-cash`, {
          audience: "admin",
          method: "POST",
          body: JSON.stringify({
            payment_method: "cash",
            notes: order?.notes || "",
          }),
        });
        await refreshAll();
        showToast({
          title: "Cash dicatat",
          message: "Pelunasan cash berhasil masuk.",
          tone: "success",
        });
        return;
      }

      if (selectedMethodDetail.verification_type === "auto") {
        const checkout = await apiFetch<{ redirect_url?: string }>(`/sales-orders/${id}/payment-checkout`, {
          audience: "admin",
          method: "POST",
          body: JSON.stringify({ method: selectedMethodDetail.code }),
        });
        const redirectUrl = String(checkout.redirect_url || "").trim();
        if (!redirectUrl) throw new Error("Gateway checkout tidak mengembalikan redirect URL.");
        await WebBrowser.openBrowserAsync(redirectUrl);
        await refreshAll();
        showToast({
          title: "Gateway dibuka",
          message: "Lanjutkan pembayaran dari browser.",
          tone: "success",
        });
        return;
      }

      const manual = await apiFetch<{ reference?: string }>(`/sales-orders/${id}/manual-payment`, {
        audience: "admin",
        method: "POST",
        body: JSON.stringify({
          method: selectedMethodDetail.code,
          note: "",
          proof_url: "",
        }),
      });
      await refreshAll();
      showToast({
        title: "Transaksi manual dibuat",
        message: manual.reference ? `Ref ${manual.reference}` : "Order masuk antrean review manual.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal proses bayar",
        message: err.message || "Pembayaran belum berhasil diproses.",
        tone: "error",
      });
    } finally {
      setProcessing(false);
    }
  }

  async function verifyAttempt(attemptId: string, approve: boolean) {
    try {
      setProcessingAttemptId(attemptId);
      await apiFetch(`/sales-orders/payment-attempts/${attemptId}/${approve ? "verify" : "reject"}`, {
        audience: "admin",
        method: "POST",
        body: JSON.stringify({ notes: "" }),
      });
      await refreshAll();
      showToast({
        title: "Berhasil",
        message: approve ? "Pembayaran manual diverifikasi." : "Pembayaran manual ditolak.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal review",
        message: err.message || "Review pembayaran manual belum berhasil.",
        tone: "error",
      });
    } finally {
      setConfirmState(null);
      setProcessingAttemptId(null);
    }
  }

  async function closeOrder() {
    if (!canCloseOrder) return;
    try {
      setProcessing(true);
      await apiFetch(`/sales-orders/${id}/close`, {
        audience: "admin",
        method: "POST",
      });
      await refreshAll();
      showToast({
        title: "Transaksi ditutup",
        message: "Direct sale sudah selesai.",
        tone: "success",
      });
    } catch (error) {
      const err = error as { message?: string };
      showToast({
        title: "Gagal tutup transaksi",
        message: err.message || "Transaksi belum berhasil ditutup.",
        tone: "error",
      });
    } finally {
      setConfirmState(null);
      setProcessing(false);
    }
  }

  if (!canReadPos) {
    return (
      <ScreenShell
        eyebrow="Direct sale"
        title="Akses dibatasi"
        description="Role kamu belum punya izin membuka transaksi direct sale."
      >
        <CtaButton label="Kembali ke ops" tone="secondary" onPress={() => router.replace("/admin/operations")} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      eyebrow="Direct sale"
      title={order?.resource_name || "Direct sale"}
      description="Kontrol transaksi, cart, pembayaran, dan penutupan order dari mobile."
      includeBottomSafeArea={false}
    >
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/admin/operations"))}>
        <Text selectable style={{ color: "#64748b", fontSize: 13, fontWeight: "800" }}>
          Kembali
        </Text>
      </Pressable>

      <CardBlock>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <View style={{ flex: 1, gap: 10 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <StatusChip label={orderStatusLabel(order?.status)} tone={orderStatusTone(order?.status)} />
              <StatusChip
                label={orderPaymentStatusLabel(order?.payment_status, balanceDue)}
                tone={orderPaymentStatusTone(order?.payment_status, balanceDue)}
              />
              <StatusChip
                label={realtime.connected ? "Live" : realtime.status === "connecting" ? "Connecting" : "Offline"}
                tone={realtime.connected ? "success" : realtime.status === "connecting" ? "amber" : "slate"}
              />
            </View>

            <View
              style={{
                borderRadius: 22,
                backgroundColor: nextAction.backgroundColor,
                paddingHorizontal: 15,
                paddingVertical: 15,
                gap: 4,
              }}
            >
              <Text selectable style={{ color: nextAction.accent, fontSize: 12, fontWeight: "800", letterSpacing: 0.6 }}>
                NEXT
              </Text>
              <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "900" }}>
                {nextAction.title}
              </Text>
              <Text selectable style={{ color: "#475569", fontSize: 13, lineHeight: 19 }}>
                {nextAction.description}
              </Text>
            </View>
          </View>

          <View
            style={{
              borderRadius: 999,
              backgroundColor: "#eff6ff",
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text selectable style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "900" }}>
              {formatAmount(balanceDue || order?.grand_total)}
            </Text>
          </View>
        </View>

        <StepSwitch
          activeStep={activeStep}
          showPayment={Boolean(paymentMethods.length || hasPendingAttempts || balanceDue > 0)}
          onChange={setActiveStep}
        />
      </CardBlock>

      {activeStep === "summary" ? (
        <>
          <CardBlock>
            <SectionTitle title="Kontrol" description="Aksi utama dulu, detail belakangan." />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {canEdit ? (
                <CompactActionCard
                  title="Tambah item"
                  label="Katalog"
                  badge="Cart"
                  icon="plus-box-outline"
                  onPress={() => setCatalogOpen(true)}
                />
              ) : null}
              {canCheckoutOrder ? (
                <CompactActionCard
                  title="Checkout transaksi"
                  label="Lanjut bayar"
                  badge="Step 2"
                  icon="arrow-right-circle-outline"
                  onPress={() => void checkoutOrder()}
                  disabled={processing}
                />
              ) : null}
              {canCloseOrder ? (
                <CompactActionCard
                  title="Tutup transaksi"
                  label="Selesaikan"
                  badge="Done"
                  icon="check-circle-outline"
                  tone="success"
                  onPress={() =>
                    setConfirmState({
                      title: "Tutup transaksi ini?",
                      message: "Direct sale akan ditandai selesai dan keluar dari queue aktif.",
                      confirmLabel: "Tutup",
                      onConfirm: () => void closeOrder(),
                    })
                  }
                  disabled={processing}
                />
              ) : null}
            </View>
          </CardBlock>

          <CardBlock>
            <SectionTitle
              title="Line items"
              description="Tambah, kurangi, atau hapus item tanpa keluar dari order."
            />
            {(order?.items || []).length ? (
              (order?.items || []).map((item) => (
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
                        {item.item_name}
                      </Text>
                      <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                        {labelItemType(item.item_type)} • @ {formatAmount(item.unit_price)}
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
                    {canEdit ? (
                      <Stepper
                        quantity={item.quantity}
                        onDecrease={() => void updateItemQuantity(item, item.quantity - 1)}
                        onIncrease={() => void updateItemQuantity(item, item.quantity + 1)}
                      />
                    ) : null}
                  </View>
                </View>
              ))
            ) : (
              <EmptyState text="Belum ada item. Tambahkan item direct sale ke transaksi ini." />
            )}
          </CardBlock>

          <CardBlock>
            <SectionTitle title="Snapshot" description="Ringkas saja untuk cek cepat." />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <MetricBox label="Item" value={String(itemCount)} />
              <MetricBox label="Dibayar" value={formatAmount(order?.paid_amount)} />
              <MetricBox label="Sisa" value={formatAmount(order?.balance_due)} accent />
            </View>
            <SubduedInfo
              icon="account-outline"
              title={order?.customer_name || "Walk-in order"}
              description={order?.customer_phone || "Tanpa kontak customer."}
            />
            <SubduedInfo
              icon="note-text-outline"
              title="Catatan"
              description={order?.notes || "Belum ada catatan untuk transaksi ini."}
            />
            <SubduedInfo
              icon="clock-outline"
              title="Dibuat"
              description={formatDateTime(order?.created_at) || "-"}
            />
          </CardBlock>
        </>
      ) : (
        <>
          <CardBlock>
            <SectionTitle title="Ringkasan bayar" description="Nominal dan status utama sebelum pilih metode." />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <MetricBox label="Total" value={formatAmount(order?.grand_total)} />
              <MetricBox label="Dibayar" value={formatAmount(order?.paid_amount)} />
              <MetricBox label="Sisa" value={formatAmount(order?.balance_due)} accent />
            </View>
          </CardBlock>

          {!!pendingAttempts.length ? (
            <CardBlock>
              <SectionTitle title="Review manual" description="Selesaikan antrean ini sebelum lanjut ke metode lain." />
              {pendingAttempts.map((attempt) => (
                <PendingAttemptCard
                  key={attempt.id}
                  attempt={attempt}
                  processing={processingAttemptId === attempt.id}
                  onOpenProof={() => {
                    if (!attempt.proof_url) return;
                    void WebBrowser.openBrowserAsync(attempt.proof_url);
                  }}
                  onReject={() =>
                    setConfirmState({
                      title: "Tolak pembayaran ini?",
                      message: "Attempt manual akan ditolak dan status order dikembalikan.",
                      confirmLabel: "Tolak",
                      tone: "danger",
                      onConfirm: () => void verifyAttempt(String(attempt.id || ""), false),
                    })
                  }
                  onApprove={() => void verifyAttempt(String(attempt.id || ""), true)}
                />
              ))}
            </CardBlock>
          ) : null}

          {!!paymentMethods.length ? (
            <CardBlock>
              <SectionTitle title="Metode bayar" description="Pilih metode yang aktif untuk tenant ini." />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {paymentMethods.map((method) => (
                  <PaymentMethodCard
                    key={method.code}
                    method={method}
                    active={selectedMethod === method.code}
                    disabled={method.code === "cash" && !canSettleCash}
                    onPress={() => setSelectedMethod(String(method.code || ""))}
                  />
                ))}
              </View>

              {selectedMethodDetail ? <PaymentMethodDetails method={selectedMethodDetail} /> : null}

              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#dbe7ff",
                  backgroundColor: "#f8fbff",
                  paddingHorizontal: 15,
                  paddingVertical: 15,
                  gap: 10,
                }}
              >
                <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "900" }}>
                  {selectedMethodDetail?.code === "cash"
                    ? "Terima pembayaran cash"
                    : selectedMethodDetail?.verification_type === "auto"
                      ? "Lanjutkan ke gateway"
                      : "Buat transaksi manual"}
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
                  {hasPendingAttempts
                    ? "Selesaikan review manual yang sedang antre lebih dulu."
                    : selectedMethodDetail?.code === "cash"
                      ? "Kasir langsung menandai transaksi lunas."
                      : selectedMethodDetail?.verification_type === "auto"
                        ? "Customer atau admin akan lanjut ke browser pembayaran."
                        : "Order masuk ke antrean verifikasi manual admin."}
                </Text>
                <CtaButton
                  label={
                    processing
                      ? "Memproses..."
                      : selectedMethodDetail?.code === "cash"
                        ? "Lunasi cash"
                        : selectedMethodDetail?.verification_type === "auto"
                          ? "Buka gateway"
                          : "Buat manual payment"
                  }
                  onPress={() => void processPayment()}
                  disabled={processing || hasPendingAttempts || !selectedMethodDetail || !canProcessPayment}
                />
                {canCloseOrder ? (
                  <CtaButton
                    tone="secondary"
                    label="Tutup transaksi"
                    onPress={() =>
                      setConfirmState({
                        title: "Tutup transaksi ini?",
                        message: "Direct sale akan ditandai selesai dan keluar dari queue aktif.",
                        confirmLabel: "Tutup",
                        onConfirm: () => void closeOrder(),
                      })
                    }
                    disabled={processing}
                  />
                ) : null}
              </View>
            </CardBlock>
          ) : null}
        </>
      )}

      <DirectSaleCatalogSheet
        open={catalogOpen}
        title="Tambah item"
        description="Pilih resource dan item yang mau dimasukkan ke transaksi ini."
        resources={posCatalog}
        busy={processing}
        confirmLabel="Tambah ke order"
        onClose={() => setCatalogOpen(false)}
        onApply={(payload) => void addCatalogItems(payload)}
      />

      <ConfirmModal
        open={Boolean(confirmState)}
        title={confirmState?.title || ""}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel || "Lanjut"}
        tone={confirmState?.tone === "danger" ? "danger" : "primary"}
        busy={processing || Boolean(processingAttemptId)}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => confirmState?.onConfirm()}
      />
    </ScreenShell>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={{ gap: 5 }}>
      <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
        {title}
      </Text>
      <Text selectable style={{ color: "#5b687c", fontSize: 13, lineHeight: 20 }}>
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
    <View
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.bg,
        backgroundColor: "#ffffff",
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text selectable style={{ color: colors.text, fontSize: 11, fontWeight: "800" }}>
        {label}
      </Text>
    </View>
  );
}

function StepSwitch({
  activeStep,
  showPayment,
  onChange,
}: {
  activeStep: "summary" | "payment";
  showPayment: boolean;
  onChange: (step: "summary" | "payment") => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        borderRadius: 18,
        backgroundColor: "#f8fafc",
        padding: 4,
      }}
    >
      <Pressable
        onPress={() => onChange("summary")}
        style={{
          flex: 1,
          borderRadius: 14,
          backgroundColor: activeStep === "summary" ? "#ffffff" : "transparent",
          paddingVertical: 10,
          paddingHorizontal: 12,
          shadowColor: activeStep === "summary" ? "#0f172a" : "transparent",
          shadowOpacity: activeStep === "summary" ? 0.05 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: activeStep === "summary" ? 1 : 0,
        }}
      >
        <Text
          selectable
          style={{
            color: activeStep === "summary" ? "#0f172a" : "#94a3b8",
            fontSize: 13,
            fontWeight: "800",
            textAlign: "center",
          }}
        >
          Ringkasan
        </Text>
      </Pressable>
      {showPayment ? (
        <Pressable
          onPress={() => onChange("payment")}
          style={{
            flex: 1,
            borderRadius: 14,
            backgroundColor: activeStep === "payment" ? "#ffffff" : "transparent",
            paddingVertical: 10,
            paddingHorizontal: 12,
            shadowColor: activeStep === "payment" ? "#0f172a" : "transparent",
            shadowOpacity: activeStep === "payment" ? 0.05 : 0,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: activeStep === "payment" ? 1 : 0,
          }}
        >
          <Text
            selectable
            style={{
              color: activeStep === "payment" ? "#0f172a" : "#94a3b8",
              fontSize: 13,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            Bayar
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CompactActionCard({
  title,
  label,
  badge,
  icon,
  tone = "primary",
  disabled,
  onPress,
}: {
  title: string;
  label: string;
  badge?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone?: "primary" | "success";
  disabled?: boolean;
  onPress: () => void;
}) {
  const isSuccess = tone === "success";
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        width: "48.5%",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: isSuccess ? "#ccefd9" : "#e3e8f1",
        backgroundColor: isSuccess ? "#f4fbf6" : "#ffffff",
        paddingHorizontal: 15,
        paddingVertical: 15,
        gap: 12,
        opacity: disabled ? 0.55 : 1,
        shadowColor: "#0f172a",
        shadowOpacity: 0.03,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 1,
        minHeight: 156,
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            backgroundColor: isSuccess ? "#def7e5" : "#e9f1ff",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name={icon} size={18} color={isSuccess ? "#16a34a" : "#2563eb"} />
        </View>
        {badge ? <StatusChip label={badge} tone={isSuccess ? "success" : "blue"} /> : null}
      </View>
      <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800", lineHeight: 19, minHeight: 38 }}>
        {title}
      </Text>
      <Text selectable style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function MetricBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 18,
        backgroundColor: "#f8fafc",
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 4,
      }}
    >
      <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
        {label.toUpperCase()}
      </Text>
      <Text selectable style={{ color: accent ? "#1d4ed8" : "#0f172a", fontSize: 13, fontWeight: "900" }}>
        {value}
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

function EmptyState({ text }: { text: string }) {
  return (
    <View
      style={{
        borderRadius: 20,
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

function SubduedInfo({
  icon,
  title,
  description,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#e8edf3",
        backgroundColor: "#fcfdff",
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: "row",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 14,
          backgroundColor: "#eef2ff",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons name={icon} size={18} color="#64748b" />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
          {title}
        </Text>
        <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>
          {description}
        </Text>
      </View>
    </View>
  );
}

function PendingAttemptCard({
  attempt,
  processing,
  onOpenProof,
  onReject,
  onApprove,
}: {
  attempt: PaymentAttempt;
  processing: boolean;
  onOpenProof: () => void;
  onReject: () => void;
  onApprove: () => void;
}) {
  return (
    <View
      style={{
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#fed7aa",
        backgroundColor: "#fff7ed",
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
            {attempt.method_label || attempt.method_code || "Manual payment"}
          </Text>
          <Text selectable style={{ color: "#9a3412", fontSize: 12 }}>
            {formatAmount(attempt.amount)} • {attempt.reference_code || "Awaiting review"}
          </Text>
        </View>
        <StatusChip label="Review" tone="amber" />
      </View>

      {attempt.payer_note ? (
        <Text selectable style={{ color: "#7c2d12", fontSize: 12, lineHeight: 18 }}>
          {attempt.payer_note}
        </Text>
      ) : null}

      {attempt.proof_url ? (
        <Pressable onPress={onOpenProof}>
          <Text selectable style={{ color: "#c2410c", fontSize: 12, fontWeight: "800" }}>
            Buka bukti bayar
          </Text>
        </Pressable>
      ) : null}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <CtaButton
            tone="secondary"
            label={processing ? "Memproses..." : "Tolak"}
            onPress={onReject}
            disabled={processing}
          />
        </View>
        <View style={{ flex: 1 }}>
          <CtaButton
            label={processing ? "Memproses..." : "Verifikasi"}
            onPress={onApprove}
            disabled={processing}
          />
        </View>
      </View>
    </View>
  );
}

function PaymentMethodCard({
  method,
  active,
  disabled,
  onPress,
}: {
  method: PaymentMethod;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const icon = paymentMethodIcon(method.code) as keyof typeof MaterialCommunityIcons.glyphMap;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        width: "48.5%",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: active ? "#2563eb" : "#dbe2ea",
        backgroundColor: active ? "#eff6ff" : "#ffffff",
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 12,
        opacity: disabled ? 0.45 : 1,
        minHeight: 154,
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            backgroundColor: active ? "#dbeafe" : "#eef2ff",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name={icon} size={18} color="#2563eb" />
        </View>
        <StatusChip
          label={String(method.verification_type || "").toLowerCase() === "auto" ? "Gateway" : "Manual"}
          tone={String(method.verification_type || "").toLowerCase() === "auto" ? "blue" : "slate"}
        />
      </View>

      <View style={{ gap: 4 }}>
        <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
          {method.display_name || method.code}
        </Text>
        <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>
          {paymentMethodHint(method)}
        </Text>
      </View>
    </Pressable>
  );
}

function PaymentMethodDetails({ method }: { method: PaymentMethod }) {
  const qrImage = method.metadata?.qr_image_url;

  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        backgroundColor: "#fbfdff",
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 10,
      }}
    >
      <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "900" }}>
        {method.display_name || method.code}
      </Text>

      {String(method.code || "").toLowerCase() === "bank_transfer" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <MetaTile label="Bank" value={method.metadata?.bank_name || "-"} />
          <MetaTile label="Rekening" value={method.metadata?.account_number || "-"} />
          <MetaTile label="Atas nama" value={method.metadata?.account_name || "-"} />
        </View>
      ) : null}

      {String(method.code || "").toLowerCase() === "qris_static" && qrImage ? (
        <View
          style={{
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "#e2e8f0",
            backgroundColor: "#ffffff",
          }}
        >
          <Image source={{ uri: qrImage }} style={{ width: "100%", aspectRatio: 1 }} contentFit="contain" />
        </View>
      ) : null}

      <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>
        {method.instructions || "Gunakan metode ini sesuai SOP tenant."}
      </Text>
    </View>
  );
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        minWidth: "31%",
        flex: 1,
        borderRadius: 16,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 3,
      }}
    >
      <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 }}>
        {label.toUpperCase()}
      </Text>
      <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800" }}>
        {value}
      </Text>
    </View>
  );
}

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
