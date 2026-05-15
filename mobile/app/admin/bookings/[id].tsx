import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useAdminIdentity } from "@/hooks/use-admin-identity";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useRealtime } from "@/hooks/use-realtime";
import {
  getAdminBookingStatusMeta,
  getAdminBookingTotal,
} from "@/lib/admin-bookings";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { BOOKING_EVENT_PREFIXES, matchesRealtimePrefix } from "@/lib/realtime/event-types";
import { tenantBookingChannel } from "@/lib/realtime/channels";
import { getTenantWebUrl } from "@/lib/urls";
import { useSession } from "@/providers/session-provider";

type BookingOption = {
  id?: string;
  item_name?: string;
  item_type?: string;
  quantity?: number;
  unit_price?: number;
  price_at_booking?: number;
};

type BookingOrder = {
  fnb_item_id?: string;
  item_name?: string;
  quantity?: number;
  price_at_purchase?: number;
  subtotal?: number;
};

type BookingEvent = {
  id: string;
  actor_type?: string;
  actor_name?: string;
  actor_role?: string;
  event_type?: string;
  title?: string;
  description?: string;
  created_at?: string;
};

type BookingPaymentAttempt = {
  id: string;
  method_label?: string;
  payment_scope?: string;
  status?: string;
  reference_code?: string;
  amount?: number;
  submitted_at?: string;
  verified_at?: string;
};

type BookingDetail = {
  id: string;
  status?: string;
  payment_status?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  resource_name?: string;
  start_time?: string;
  end_time?: string;
  original_grand_total?: number;
  discount_amount?: number;
  grand_total?: number;
  total_resource?: number;
  deposit_amount?: number;
  paid_amount?: number;
  balance_due?: number;
  total_fnb?: number;
  options?: BookingOption[];
  orders?: BookingOrder[];
  events?: BookingEvent[];
  payment_attempts?: BookingPaymentAttempt[];
};

function formatAmount(value?: number) {
  const formatted = formatCurrency(value || 0);
  return formatted === "Cek harga" ? "Rp 0" : formatted;
}

function groupOptions(options: BookingOption[] = []) {
  const groups = options.reduce<Record<string, BookingOption & { quantity: number; total_price: number }>>((acc, item) => {
    const key = `${item.item_type || "option"}:${String(item.item_name || "").trim().toLowerCase()}`;
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || item.price_at_booking || 0);
    if (!acc[key]) {
      acc[key] = {
        ...item,
        quantity,
        total_price: unitPrice * quantity,
      };
    } else {
      acc[key] = {
        ...acc[key],
        quantity: Number(acc[key].quantity || 0) + quantity,
        total_price: Number(acc[key].total_price || 0) + unitPrice * quantity,
      };
    }
    return acc;
  }, {});
  return Object.values(groups);
}

function groupOrders(orders: BookingOrder[] = []) {
  const groups = orders.reduce<Record<string, BookingOrder & { quantity: number; subtotal: number }>>((acc, item) => {
    const key = String(item.item_name || "").trim().toLowerCase();
    const quantity = Number(item.quantity || 0);
    const subtotal = Number(item.subtotal || 0);
    if (!acc[key]) {
      acc[key] = { ...item, quantity, subtotal };
    } else {
      acc[key] = {
        ...acc[key],
        quantity: Number(acc[key].quantity || 0) + quantity,
        subtotal: Number(acc[key].subtotal || 0) + subtotal,
      };
    }
    return acc;
  }, {});
  return Object.values(groups);
}

function actorLabel(event: BookingEvent) {
  if (event.actor_name && event.actor_role) return `${event.actor_name} • ${event.actor_role}`;
  if (event.actor_name) return event.actor_name;
  if (event.actor_type === "customer") return "Customer";
  if (event.actor_type === "payment") return "Payment gateway";
  if (event.actor_type === "admin") return "Tim admin";
  return "Sistem";
}

export default function AdminBookingDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = String(params.id || "");
  const guard = useAuthGuard("admin");
  const session = useSession();
  const identityQuery = useAdminIdentity();
  const bookingQuery = useQuery({
    queryKey: ["admin-booking-detail", id],
    enabled: guard.ready && Boolean(id),
    queryFn: () => apiFetch<BookingDetail>(`/bookings/${id}`, { audience: "admin" }),
  });

  useRealtime({
    enabled: Boolean(identityQuery.data?.tenant_id && id),
    channels: identityQuery.data?.tenant_id ? [tenantBookingChannel(identityQuery.data.tenant_id, id)] : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      void bookingQuery.refetch();
    },
    onReconnect: () => {
      void bookingQuery.refetch();
    },
  });

  const booking = bookingQuery.data;
  const statusMeta = booking ? getAdminBookingStatusMeta(booking) : null;
  const groupedOptions = useMemo(() => groupOptions(booking?.options || []), [booking?.options]);
  const groupedOrders = useMemo(() => groupOrders(booking?.orders || []), [booking?.orders]);
  const mainOptions = groupedOptions.filter((item) => item.item_type === "main_option");
  const addonOptions = groupedOptions.filter((item) => item.item_type !== "main_option");
  const needsPaymentAttention =
    String(booking?.payment_status || "").toLowerCase() === "awaiting_verification" ||
    Number(booking?.balance_due || 0) > 0;

  return (
    <ScreenShell
      eyebrow="Admin booking"
      title={booking?.resource_name || "Detail booking"}
      description="Ringkasan operasional booking, pembayaran, item, dan timeline aktivitas."
    >
      <Pressable
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }
          router.replace("/admin/bookings");
        }}
        style={{ alignSelf: "flex-start", paddingVertical: 4 }}
      >
        <Text selectable style={{ color: "#64748b", fontSize: 13, fontWeight: "800" }}>
          Kembali
        </Text>
      </Pressable>

      <CardBlock>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text selectable style={{ color: "#94a3b8", fontSize: 12 }}>
              {booking?.customer_name || "Customer"} / {booking?.customer_phone || "-"}
            </Text>
            <Text selectable style={{ color: "#0f172a", fontSize: 24, fontWeight: "900" }}>
              {booking?.resource_name || "Booking"}
            </Text>
          </View>
          {statusMeta ? (
            <View style={{ alignSelf: "flex-start", borderRadius: 999, backgroundColor: statusMeta.bg, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text selectable style={{ color: statusMeta.tone, fontSize: 11, fontWeight: "800" }}>
                {statusMeta.label}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#f8fafc", padding: 12, gap: 4 }}>
            <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
              MULAI
            </Text>
            <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
              {formatDateTime(booking?.start_time)}
            </Text>
          </View>
          <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#f8fafc", padding: 12, gap: 4 }}>
            <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
              SELESAI
            </Text>
            <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
              {formatDateTime(booking?.end_time)}
            </Text>
          </View>
        </View>
      </CardBlock>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Pembayaran
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { label: "Total", value: formatAmount(getAdminBookingTotal(booking || {})) },
            { label: "Dibayar", value: formatAmount(booking?.paid_amount) },
            { label: "Sisa", value: formatAmount(booking?.balance_due) },
          ].map((item) => (
            <View key={item.label} style={{ flex: 1, borderRadius: 16, backgroundColor: "#f8fafc", padding: 12, gap: 4 }}>
              <Text selectable style={{ color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                {item.label.toUpperCase()}
              </Text>
              <Text selectable style={{ color: item.label === "Sisa" ? "#1d4ed8" : "#0f172a", fontSize: 16, fontWeight: "900" }}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
        <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
          Status pembayaran: {booking?.payment_status || "pending"}
        </Text>
      </CardBlock>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Langkah admin
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
          Mobile fokus ke pemantauan cepat. Area yang masih berat seperti verifikasi manual, ubah status, atau receipt tetap dilempar ke web admin.
        </Text>
        <View style={{ gap: 10 }}>
          <CtaButton
            label={needsPaymentAttention ? "Buka pembayaran di web" : "Buka booking di web"}
            onPress={() => {
              if (!session.tenantSlug || !id) return;
              void WebBrowser.openBrowserAsync(getTenantWebUrl(session.tenantSlug, `/admin/bookings/${id}`));
            }}
          />
          <CtaButton
            tone="secondary"
            label="Lihat customer"
            onPress={() => {
              if (!booking?.customer_id) return;
              router.push(`/admin/customers/${booking.customer_id}`);
            }}
            disabled={!booking?.customer_id}
          />
        </View>
      </CardBlock>

      {mainOptions.length ? (
        <CardBlock>
          <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
            Layanan utama
          </Text>
          {mainOptions.map((item, index) => (
            <View key={`${item.item_name || "main"}-${index}`} style={{ borderRadius: 18, backgroundColor: "#f8fafc", padding: 14, gap: 4 }}>
              <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                {item.item_name || "Paket booking"}
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                {Number(item.quantity || 0)} item
              </Text>
              <Text selectable style={{ color: "#1d4ed8", fontSize: 13, fontWeight: "800" }}>
                {formatAmount(Number(item.price_at_booking || item.unit_price || 0) * Number(item.quantity || 0))}
              </Text>
            </View>
          ))}
        </CardBlock>
      ) : null}

      {addonOptions.length ? (
        <CardBlock>
          <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
            Add-on booking
          </Text>
          {addonOptions.map((item, index) => (
            <View key={`${item.item_name || "addon"}-${index}`} style={{ borderRadius: 18, backgroundColor: "#f8fafc", padding: 14, gap: 4 }}>
              <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                {item.item_name || "Add-on"}
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                {Number(item.quantity || 0)} item
              </Text>
              <Text selectable style={{ color: "#1d4ed8", fontSize: 13, fontWeight: "800" }}>
                {formatAmount(Number(item.price_at_booking || item.unit_price || 0) * Number(item.quantity || 0))}
              </Text>
            </View>
          ))}
        </CardBlock>
      ) : null}

      {groupedOrders.length ? (
        <CardBlock>
          <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
            Pesanan F&B
          </Text>
          {groupedOrders.map((item, index) => (
            <View key={`${item.item_name || "order"}-${index}`} style={{ borderRadius: 18, backgroundColor: "#f8fafc", padding: 14, gap: 4 }}>
              <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                {item.item_name || "Pesanan"}
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                {Number(item.quantity || 0)} item
              </Text>
              <Text selectable style={{ color: "#1d4ed8", fontSize: 13, fontWeight: "800" }}>
                {formatAmount(item.subtotal)}
              </Text>
            </View>
          ))}
        </CardBlock>
      ) : null}

      {booking?.payment_attempts?.length ? (
        <CardBlock>
          <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
            Attempt pembayaran
          </Text>
          {booking.payment_attempts.map((attempt) => (
            <View key={attempt.id} style={{ borderRadius: 18, borderWidth: 1, borderColor: "#edf2f7", backgroundColor: "#fbfdff", padding: 14, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800", flex: 1 }}>
                  {attempt.method_label || "Metode pembayaran"}
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 12, fontWeight: "800" }}>
                  {attempt.status || "-"}
                </Text>
              </View>
              <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                {attempt.payment_scope || "booking"} / {attempt.reference_code || "-"}
              </Text>
              <Text selectable style={{ color: "#1d4ed8", fontSize: 13, fontWeight: "800" }}>
                {formatAmount(attempt.amount)}
              </Text>
            </View>
          ))}
        </CardBlock>
      ) : null}

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
          Riwayat booking
        </Text>
        {(booking?.events || []).length ? (
          booking?.events?.map((event) => (
            <View key={event.id} style={{ borderRadius: 18, borderWidth: 1, borderColor: "#edf2f7", backgroundColor: "#fbfdff", padding: 14, gap: 6 }}>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                  <MaterialIcons name="history" size={16} color="#2563eb" />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                    {event.title || event.event_type || "Aktivitas booking"}
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
                    {event.description || event.event_type || "Perubahan status tercatat."}
                  </Text>
                  <Text selectable style={{ color: "#94a3b8", fontSize: 12 }}>
                    {actorLabel(event)} / {formatDateTime(event.created_at)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
            Timeline belum tersedia untuk booking ini.
          </Text>
        )}
      </CardBlock>
    </ScreenShell>
  );
}
