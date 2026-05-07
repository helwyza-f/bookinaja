import { useMemo, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScreenShell } from "@/components/screen-shell";
import { InfoCard } from "@/components/info-card";
import { useAppTheme } from "@/theme";
import { useCustomerBookingDetailQuery } from "@/features/customer/queries";
import { getPaymentStatusMeta, getSessionStatusMeta } from "@/features/customer/status";

function formatMoney(value?: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTimeRange(start?: string, end?: string | null) {
  if (!start) return "-";
  const formatter = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const startLabel = formatter.format(new Date(start));
  if (!end) return startLabel;
  return `${startLabel} - ${formatter.format(new Date(end))}`;
}

function getUnitLabel(unitDuration?: number) {
  return Number(unitDuration || 60) === 60 ? "jam" : "sesi";
}

function getSolidTonePalette(
  theme: ReturnType<typeof useAppTheme>,
  tone: "success" | "warning" | "danger" | "info" | "neutral",
) {
  if (tone === "success") {
    return {
      backgroundColor: theme.colors.success,
      textColor: theme.mode === "dark" ? theme.colors.primaryForeground : "#FFFFFF",
    };
  }

  if (tone === "warning") {
    return {
      backgroundColor: theme.colors.warning,
      textColor: theme.colors.primaryForeground,
    };
  }

  if (tone === "danger") {
    return {
      backgroundColor: theme.colors.danger,
      textColor: "#FFFFFF",
    };
  }

  if (tone === "info") {
    return {
      backgroundColor: theme.colors.accent,
      textColor: theme.colors.accentContrast,
    };
  }

  return {
    backgroundColor: theme.colors.surfaceAlt,
    textColor: theme.colors.foreground,
  };
}

function toneStyles(
  theme: ReturnType<typeof useAppTheme>,
  tone: "success" | "warning" | "danger" | "info" | "neutral",
) {
  const palette = getSolidTonePalette(theme, tone);
  return { backgroundColor: palette.backgroundColor, color: palette.textColor };
}

export default function CustomerBookingDetailScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const bookingId = String(params.id || "");
  const detail = useCustomerBookingDetailQuery(bookingId);
  const booking = detail.data;
  const [itemsOpen, setItemsOpen] = useState(false);
  const sessionMeta = getSessionStatusMeta(booking?.status);
  const paymentMeta = getPaymentStatusMeta({
    status: booking?.payment_status,
    balanceDue: booking?.balance_due,
    paidAmount: booking?.paid_amount,
    grandTotal: booking?.grand_total,
    depositAmount: booking?.deposit_amount,
  });
  const sessionTone = toneStyles(theme, sessionMeta.tone);
  const paymentTone = toneStyles(theme, paymentMeta.tone);
  const successTone = getSolidTonePalette(theme, "success");
  const hasPromo =
    Number(booking?.discount_amount || 0) > 0 && String(booking?.promo_code || "").trim() !== "";
  const bookingOptions = useMemo(
    () => (Array.isArray(booking?.options) ? booking.options : []),
    [booking?.options],
  );
  const bookingOrders = useMemo(
    () => (Array.isArray(booking?.orders) ? booking.orders : []),
    [booking?.orders],
  );

  const groupedOptions = useMemo(() => {
    if (!bookingOptions.length) return [];
    const groups = bookingOptions.reduce((acc: Record<string, any>, item) => {
      const itemType = String(item.item_type || "").toLowerCase();
      const key = `${String(item.item_name || "").trim().toLowerCase()}::${itemType}`;
      if (!acc[key]) {
        acc[key] = {
          ...item,
          quantity: Number(item.quantity || 0),
          totalPrice: Number(item.price_at_booking || item.total_price || 0),
        };
      } else {
        acc[key].quantity += Number(item.quantity || 0);
        acc[key].totalPrice += Number(item.price_at_booking || item.total_price || 0);
      }
      return acc;
    }, {});

    return Object.values(groups).map((item: any) => ({
      ...item,
      unitPrice:
        Number(item.unit_price || 0) ||
        Number(item.totalPrice || 0) / Math.max(Number(item.quantity || 1), 1),
    }));
  }, [bookingOptions]);

  const groupedMainOptions = useMemo(
    () =>
      groupedOptions.filter((item: any) =>
        ["main", "main_option", "console_option"].includes(
          String(item.item_type || "").toLowerCase(),
        ),
      ),
    [groupedOptions],
  );

  const groupedAddonOptions = useMemo(
    () =>
      groupedOptions.filter(
        (item: any) => String(item.item_type || "").toLowerCase() === "add_on",
      ),
    [groupedOptions],
  );

  const groupedOrders = useMemo(() => {
    if (!bookingOrders.length) return [];
    const groups = bookingOrders.reduce((acc: Record<string, any>, item) => {
      const orderName =
        "item_name" in item && typeof item.item_name === "string"
          ? item.item_name
          : item.product_name || "Pesanan";
      const key = String(orderName).toLowerCase();
      if (!acc[key]) {
        acc[key] = {
          item_name: orderName,
          quantity: 0,
          subtotal: 0,
          price_at_purchase: 0,
        };
      }
      const qty = Number(item.quantity || item.qty || 1);
      acc[key].quantity += qty;
      acc[key].subtotal += Number(item.subtotal || item.total_price || 0);
      acc[key].price_at_purchase =
        Number(item.price_at_purchase || 0) ||
        Number(acc[key].subtotal || 0) / Math.max(Number(acc[key].quantity || 1), 1);
      return acc;
    }, {});
    return Object.values(groups);
  }, [bookingOrders]);

  return (
    <ScreenShell
      headerVariant="none"
      eyebrow="Detail"
      title={booking?.resource_name || booking?.resource || "Detail booking"}
      subtitle={booking?.tenant_name || "Ringkasan read-only booking."}
    >
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backButton,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Feather name="arrow-left" size={16} color={theme.colors.foreground} />
          <Text style={[styles.backText, { color: theme.colors.foreground }]}>Kembali</Text>
        </Pressable>
      </View>

      {detail.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={{ color: theme.colors.foregroundMuted }}>Memuat detail booking...</Text>
        </View>
      ) : booking ? (
        <>
          <View
            style={[
              styles.receiptCard,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.receiptTop}>
              <View style={styles.receiptCopy}>
                <Text style={[styles.receiptEyebrow, { color: theme.colors.accent }]}>
                  Booking receipt
                </Text>
                <Text style={[styles.receiptTitle, { color: theme.colors.foreground }]}>
                  {booking.resource_name || booking.resource || "Booking"}
                </Text>
                <Text style={[styles.receiptHint, { color: theme.colors.foregroundMuted }]}>
                  {[booking.tenant_name, booking.tenant_slug].filter(Boolean).join(" | ")}
                </Text>
                <Text style={[styles.receiptRef, { color: theme.colors.foregroundMuted }]}>
                  Ref {booking.id.slice(0, 8).toUpperCase()}
                </Text>
              </View>
              <View style={styles.statusStack}>
                <View style={[styles.statusPill, { backgroundColor: sessionTone.backgroundColor }]}>
                  <Text style={[styles.statusPillText, { color: sessionTone.color }]}>
                    {sessionMeta.label}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: paymentTone.backgroundColor }]}>
                  <Text style={[styles.statusPillText, { color: paymentTone.color }]}>
                    {paymentMeta.label}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <MetricBox
                label="Tanggal"
                value={formatDate(booking.start_time || booking.date)}
                theme={theme}
              />
              <MetricBox
                label="Jam"
                value={formatTimeRange(
                  booking.start_time || booking.date,
                  booking.end_time || booking.end_date,
                )}
                theme={theme}
              />
              <MetricBox
                label="Total"
                value={formatMoney(booking.grand_total)}
                theme={theme}
              />
              <MetricBox
                label="Dibayar"
                value={formatMoney(booking.paid_amount)}
                theme={theme}
              />
            </View>
          </View>

          <CollapsibleSection
            eyebrow="Item booking"
            title="Rincian pesanan"
            open={itemsOpen}
            onToggle={() => setItemsOpen((current) => !current)}
            theme={theme}
          >
            <View style={styles.itemGroup}>
              <Text style={[styles.groupTitle, { color: theme.colors.foreground }]}>
                Layanan utama
              </Text>
              {groupedMainOptions.length ? (
                groupedMainOptions.map((item: any) => (
                  <LineItem
                    key={`${item.item_name}-${item.item_type}`}
                    title={item.item_name}
                    subtitle={`${item.quantity} ${getUnitLabel(booking?.unit_duration)} | ${formatMoney(item.unitPrice || 0)}`}
                    value={formatMoney(item.totalPrice || 0)}
                    theme={theme}
                  />
                ))
              ) : (
                <InfoCard
                  label="Layanan utama"
                  value="Tidak ada rincian"
                  hint="Booking ini tidak punya item layanan tambahan yang tersimpan."
                  compact
                />
              )}
            </View>

            <View style={styles.itemGroup}>
              <Text style={[styles.groupTitle, { color: theme.colors.foreground }]}>
                Add-on
              </Text>
              {groupedAddonOptions.length ? (
                groupedAddonOptions.map((item: any) => (
                  <LineItem
                    key={`${item.item_name}-${item.item_type}`}
                    title={item.item_name}
                    subtitle={`${item.quantity} unit | ${formatMoney(item.unitPrice || 0)}`}
                    value={formatMoney(item.totalPrice || 0)}
                    theme={theme}
                  />
                ))
              ) : (
                <InfoCard
                  label="Add-on"
                  value="Tidak ada add-on"
                  hint="Booking ini tidak memakai add-on."
                  compact
                />
              )}
            </View>

            <View style={styles.itemGroup}>
              <Text style={[styles.groupTitle, { color: theme.colors.foreground }]}>
                Pesanan F&B
              </Text>
              {groupedOrders.length ? (
                groupedOrders.map((item: any) => (
                  <LineItem
                    key={String(item.item_name || "").toLowerCase()}
                    title={item.item_name}
                    subtitle={`${item.quantity} porsi | ${formatMoney(item.price_at_purchase || 0)}`}
                    value={formatMoney(item.subtotal || 0)}
                    theme={theme}
                  />
                ))
              ) : (
                <InfoCard
                  label="F&B"
                  value="Tidak ada pesanan"
                  hint="Booking ini tidak punya pesanan F&B."
                  compact
                />
              )}
            </View>
          </CollapsibleSection>

          {hasPromo ? (
            <View
              style={[
                styles.promoCard,
                {
                  backgroundColor: theme.colors.successSoft,
                  borderColor: theme.colors.success,
                },
              ]}
            >
              <View style={styles.promoHeader}>
                <View>
                  <Text style={[styles.promoEyebrow, { color: theme.colors.success }]}>
                    Promo
                  </Text>
                  <Text style={[styles.promoCode, { color: theme.colors.foreground }]}>
                    {booking.promo_code}
                  </Text>
                </View>
                <View style={[styles.promoBadge, { backgroundColor: theme.colors.success }]}>
                  <Text style={[styles.promoBadgeText, { color: successTone.textColor }]}>
                    -{formatMoney(booking.discount_amount)}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryGrid}>
                <MetricBox
                  label="Sebelum"
                  value={formatMoney(booking.original_grand_total)}
                  theme={theme}
                  soft
                />
                <MetricBox
                  label="Sesudah"
                  value={formatMoney(booking.grand_total)}
                  theme={theme}
                  soft
                />
              </View>
            </View>
          ) : null}

          <InfoCard
            label="Catatan"
            value="Layar ini khusus arsip booking yang sudah selesai."
            hint="Detail ini dipakai untuk melihat hasil akhir booking, bukan untuk aksi live atau pembayaran aktif."
          />
        </>
      ) : (
        <InfoCard
          label="Booking"
          value="Detail tidak ditemukan"
          hint="Coba kembali dari halaman aktif atau riwayat."
        />
      )}
    </ScreenShell>
  );
}

function MetricBox({
  label,
  value,
  theme,
  soft = false,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>;
  soft?: boolean;
}) {
  return (
    <View
      style={[
        styles.metricBox,
        {
          backgroundColor: soft ? theme.colors.surface : theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text style={[styles.metricLabel, { color: theme.colors.foregroundMuted }]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: theme.colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function CollapsibleSection({
  eyebrow,
  title,
  open,
  onToggle,
  theme,
  children,
}: {
  eyebrow: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof useAppTheme>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Pressable
        onPress={onToggle}
        style={[
          styles.collapseHeader,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionEyebrow, { color: theme.colors.foregroundMuted }]}>
            {eyebrow}
          </Text>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
            {title}
          </Text>
        </View>
        <View
          style={[
            styles.collapseIconWrap,
            { backgroundColor: theme.colors.surfaceAlt },
          ]}
        >
          <Feather
            name={open ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.colors.foreground}
          />
        </View>
      </Pressable>
      {open ? children : null}
    </View>
  );
}

function LineItem({
  title,
  subtitle,
  value,
  theme,
}: {
  title: string;
  subtitle: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View
      style={[
        styles.lineItem,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.lineCopy}>
        <Text style={[styles.lineTitle, { color: theme.colors.foreground }]}>{title}</Text>
        <Text style={[styles.lineSubtitle, { color: theme.colors.foregroundMuted }]}>
          {subtitle}
        </Text>
      </View>
      <Text style={[styles.lineValue, { color: theme.colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    marginTop: 10,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  backText: {
    fontSize: 13,
    fontWeight: "800",
  },
  loading: {
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  receiptCard: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 16,
    gap: 14,
  },
  receiptTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  receiptCopy: {
    flex: 1,
    gap: 4,
  },
  receiptEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  receiptTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  receiptHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  receiptRef: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusStack: {
    alignItems: "flex-end",
    gap: 8,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    gap: 4,
  },
  collapseHeader: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  collapseIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  itemGroup: {
    gap: 10,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricBox: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  promoCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 14,
    gap: 12,
  },
  promoHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  promoEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  promoCode: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "900",
  },
  promoBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  promoBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  lineItem: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  lineCopy: {
    flex: 1,
    gap: 4,
  },
  lineTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  lineSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  lineValue: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
    maxWidth: 96,
  },
});
