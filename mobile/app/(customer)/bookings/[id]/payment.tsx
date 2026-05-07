import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { ScreenShell } from "@/components/screen-shell";
import { InfoCard } from "@/components/info-card";
import { appToast } from "@/lib/toast";
import { useAppTheme } from "@/theme";
import { useCustomerBookingDetailQuery } from "@/features/customer/queries";
import { useCustomerBookingRealtime } from "@/features/customer/realtime";
import { resolvePaymentStatusCode } from "@/features/customer/status";
import {
  useBookingCheckoutMutation,
  useSubmitManualBookingPaymentMutation,
  useUploadBookingProofMutation,
} from "@/features/customer/payment";

function formatMoney(value?: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

function getPaymentMethodMeta(method: any) {
  if (!method) return "";
  if (method.code === "bank_transfer") {
    const parts = [
      method.metadata?.bank_name,
      method.metadata?.account_number,
      method.metadata?.account_name,
    ].filter(Boolean);
    return parts.join(" | ") || "Detail rekening belum lengkap";
  }
  if (method.code === "qris_static") {
    return method.metadata?.qr_image_url
      ? "Scan QR merchant"
      : "QRIS belum siap";
  }
  if (method.code === "cash") {
    return "Bayar ke kasir";
  }
  return "Checkout otomatis";
}

function getPaymentMethodIcon(code: string): React.ComponentProps<typeof Feather>["name"] {
  if (code === "qris_static") return "grid";
  if (code === "cash") return "credit-card";
  if (code === "bank_transfer") return "home";
  return "zap";
}

function resolveSubtitle(scope: "deposit" | "settlement") {
  return scope === "deposit" ? "Pilih metode lalu bayar." : "Pilih metode lalu lunasi.";
}

function getSolidTonePalette(
  theme: ReturnType<typeof useAppTheme>,
  tone: "primary" | "accent" | "success" | "warning" | "muted",
) {
  if (tone === "primary") {
    const backgroundColor = theme.mode === "dark" ? theme.colors.inkSoft : theme.colors.primary;
    return {
      backgroundColor,
      borderColor: backgroundColor,
      textColor: theme.mode === "dark" ? theme.colors.foreground : theme.colors.primaryForeground,
    };
  }

  if (tone === "accent") {
    return {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
      textColor: theme.colors.accentContrast,
    };
  }

  if (tone === "success") {
    return {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
      textColor: theme.mode === "dark" ? theme.colors.primaryForeground : "#FFFFFF",
    };
  }

  if (tone === "warning") {
    return {
      backgroundColor: theme.colors.warning,
      borderColor: theme.colors.warning,
      textColor: theme.colors.primaryForeground,
    };
  }

  return {
    backgroundColor: theme.colors.foregroundMuted,
    borderColor: theme.colors.foregroundMuted,
    textColor: theme.mode === "dark" ? theme.colors.background : "#FFFFFF",
  };
}

export default function CustomerPaymentScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ id: string; scope?: string }>();
  const bookingId = String(params.id || "");
  const scope = params.scope === "settlement" ? "settlement" : "deposit";
  const detail = useCustomerBookingDetailQuery(bookingId);
  const booking = detail.data;
  useCustomerBookingRealtime({
    bookingId,
    enabled: Boolean(bookingId),
  });
  const checkout = useBookingCheckoutMutation(bookingId);
  const submitManual = useSubmitManualBookingPaymentMutation(bookingId);
  const uploadProof = useUploadBookingProofMutation(bookingId);

  const [selectedMethod, setSelectedMethod] = useState("midtrans");
  const [manualPaymentNote, setManualPaymentNote] = useState("");
  const [manualProofUrl, setManualProofUrl] = useState("");
  const primarySolid = getSolidTonePalette(theme, "primary");
  const accentSolid = getSolidTonePalette(theme, "accent");

  const paymentMethods = useMemo(
    () =>
      (Array.isArray(booking?.payment_methods) ? booking.payment_methods : []).filter((item) => {
        if (!item || item.is_active === false) return false;
        if (scope === "deposit" && item.code === "cash") return false;
        return true;
      }),
    [booking?.payment_methods, scope],
  );

  useEffect(() => {
    if (!paymentMethods.length) return;
    if (!paymentMethods.find((item) => item.code === selectedMethod)) {
      setSelectedMethod(paymentMethods[0].code);
    }
  }, [paymentMethods, selectedMethod]);

  const selectedMethodDetail =
    paymentMethods.find((item) => item.code === selectedMethod) || paymentMethods[0];

  const amount = useMemo(() => {
    if (!booking) return 0;
    return scope === "deposit" ? Number(booking.deposit_amount || 0) : Number(booking.balance_due || 0);
  }, [booking, scope]);

  const paymentAttempts = useMemo(
    () => (Array.isArray(booking?.payment_attempts) ? booking.payment_attempts : []),
    [booking?.payment_attempts],
  );
  const pendingManualAttempt = useMemo(
    () =>
      paymentAttempts.find(
        (item) =>
          item?.payment_scope === (scope === "deposit" ? "deposit" : "settlement") &&
          (item?.status === "submitted" || item?.status === "awaiting_verification"),
      ),
    [paymentAttempts, scope],
  );

  const paymentStatus = resolvePaymentStatusCode({
    status: booking?.payment_status,
    balanceDue: booking?.balance_due,
    paidAmount: booking?.paid_amount,
    grandTotal: booking?.grand_total,
    depositAmount: booking?.deposit_amount,
  });
  const sessionStatus = String(booking?.status || "").toLowerCase();

  const paymentAccessNoticeCode = useMemo(() => {
    if (!booking) return "";
    if (scope === "settlement") {
      if (sessionStatus !== "completed") return "settlement_locked";
      if (Number(booking.balance_due || 0) <= 0 || paymentStatus === "settled") return "no_balance_due";
      if (paymentMethods.length === 0) return "settlement_methods_unavailable";
      return "";
    }
    if (Number(booking.deposit_amount || 0) <= 0) return "deposit_not_required";
    if (paymentStatus !== "pending") return "deposit_unavailable";
    if (paymentMethods.length === 0) return "deposit_methods_unavailable";
    return "";
  }, [booking, paymentMethods.length, paymentStatus, scope, sessionStatus]);

  useEffect(() => {
    if (!booking || !paymentAccessNoticeCode) return;
    router.replace({
      pathname: "/(customer)/bookings/[id]/live",
      params: { id: bookingId, notice: paymentAccessNoticeCode },
    });
  }, [booking, bookingId, paymentAccessNoticeCode]);

  const selectedMethodRequiresProof =
    selectedMethodDetail?.verification_type === "manual" &&
    selectedMethodDetail?.code !== "cash";

  const pickProof = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.82,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    try {
      const res = await uploadProof.mutateAsync(result.assets[0].uri);
      setManualProofUrl(String(res.url || ""));
      appToast.success("Bukti bayar terupload", "Bukti bayar berhasil diupload.");
    } catch (error) {
      appToast.error(
        "Upload gagal",
        error instanceof Error ? error.message : "Gagal upload bukti bayar",
      );
    }
  };

  const handlePay = async () => {
    if (!booking || !selectedMethodDetail) return;
    if (pendingManualAttempt) {
      appToast.warning(
        "Masih menunggu",
        "Masih ada pembayaran manual yang menunggu verifikasi admin.",
      );
      return;
    }
    if (selectedMethodRequiresProof && !manualProofUrl.trim()) {
      appToast.warning(
        "Upload dulu",
        "Upload bukti bayar dulu sebelum mengirim pembayaran manual.",
      );
      return;
    }

    try {
      if (selectedMethodDetail.verification_type === "auto") {
        const res = await checkout.mutateAsync({
          scope,
          method: selectedMethodDetail.code,
        });
        if (res.redirect_url) {
          await Linking.openURL(res.redirect_url);
          appToast.info(
            "Checkout dibuka",
            "Selesaikan pembayaran di Midtrans lalu kembali ke aplikasi.",
          );
          return;
        }
        appToast.warning("Belum siap", "Redirect pembayaran belum tersedia.");
        return;
      }

      const res = await submitManual.mutateAsync({
        scope,
        method: selectedMethodDetail.code,
        note: manualPaymentNote,
        proof_url: manualProofUrl,
      });
      appToast.success(
        "Pembayaran terkirim",
        `Pembayaran manual terkirim${res.reference ? ` (${res.reference})` : ""}.`,
      );
      router.replace({
        pathname: "/(customer)/bookings/[id]/live",
        params: { id: bookingId },
      });
    } catch (error) {
      appToast.error(
        "Pembayaran gagal",
        error instanceof Error ? error.message : "Gagal memproses pembayaran.",
      );
    }
  };

  const renderInstructionPanel = (method: any) => {
    if (!method) return null;

    if (method.code === "bank_transfer") {
      return (
        <View style={styles.stack}>
          <View style={styles.grid}>
            <MiniInfoCard label="Bank" value={String(method.metadata?.bank_name || "-")} theme={theme} />
            <MiniInfoCard label="No. Rekening" value={String(method.metadata?.account_number || "-")} theme={theme} />
            <MiniInfoCard label="Atas Nama" value={String(method.metadata?.account_name || "-")} theme={theme} />
          </View>
          <InfoCard
            label="Instruksi"
            value={`Transfer ${formatMoney(amount)}`}
            hint="Transfer lalu upload bukti."
            compact
          />
        </View>
      );
    }

    if (method.code === "qris_static") {
      return (
        <View style={styles.stack}>
          {method.metadata?.qr_image_url ? (
            <View style={[styles.previewCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Image
                source={{ uri: String(method.metadata.qr_image_url) }}
                style={styles.qrImage}
                resizeMode="cover"
              />
            </View>
          ) : (
            <InfoCard
              label="QRIS"
              value="QRIS belum tersedia"
              hint="Tenant belum mengunggah gambar QRIS."
              compact
            />
          )}
          <InfoCard
            label="Instruksi"
            value="Scan, bayar, kirim."
            hint="Upload bukti setelah bayar."
            compact
          />
        </View>
      );
    }

    if (method.code === "cash") {
      return (
        <InfoCard
          label="Cash"
          value="Bayar ke kasir."
          hint="Tanpa upload bukti."
          compact
        />
      );
    }

    return (
      <InfoCard
        label="Checkout"
        value="Checkout Midtrans."
        hint="Akan membuka checkout."
        compact
      />
    );
  };

  if (detail.isLoading || !booking || paymentAccessNoticeCode) {
    return (
      <ScreenShell
        headerVariant="minimal"
        eyebrow="Pembayaran"
        title={scope === "deposit" ? "Bayar DP" : "Pelunasan"}
        subtitle="Memuat halaman pembayaran..."
      >
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={{ color: theme.colors.foregroundMuted }}>Memuat halaman pembayaran...</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      headerVariant="minimal"
      eyebrow="Pembayaran"
      title={scope === "deposit" ? "Bayar DP" : "Pelunasan"}
      subtitle={resolveSubtitle(scope)}
    >
      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <Feather name="arrow-left" size={16} color={theme.colors.foreground} />
        <Text style={[styles.backText, { color: theme.colors.foreground }]}>Live</Text>
      </Pressable>

      <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryCopy}>
            <Text style={[styles.summaryEyebrow, { color: theme.colors.foregroundMuted }]}>
              {scope === "deposit" ? "DP" : "Pelunasan"}
            </Text>
            <Text
              style={[styles.resourceName, { color: theme.colors.foreground }]}
              numberOfLines={1}
            >
              {booking.resource_name || booking.resource || "Booking"}
            </Text>
            <Text style={[styles.summaryHint, { color: theme.colors.foregroundMuted }]}>
              {scope === "deposit"
                ? "Selesaikan DP untuk mengamankan booking ini."
                : "Lunasi sisa tagihan sebelum menutup transaksi."}
            </Text>
          </View>
          <View
            style={[
              styles.amountPill,
              { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
            ]}
            >
              <Text style={[styles.amountLabel, { color: theme.colors.foregroundMuted }]}>Nominal</Text>
              <Text style={[styles.amountValue, { color: theme.colors.foreground }]}>
                {formatMoney(amount)}
              </Text>
            </View>
          </View>
      </View>

      {pendingManualAttempt ? (
        <View
          style={[
            styles.pendingCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.warning,
            },
          ]}
        >
          <View style={styles.pendingHeader}>
            <View style={[styles.pendingIcon, { backgroundColor: theme.colors.warningSoft }]}>
              <Feather name="clock" size={18} color={theme.colors.warning} />
            </View>
            <View style={styles.pendingCopy}>
              <Text style={[styles.pendingTitle, { color: theme.colors.foreground }]}>
                Menunggu verifikasi
              </Text>
              <Text style={[styles.pendingHint, { color: theme.colors.foregroundMuted }]}>
                Ref {pendingManualAttempt.reference_code || "-"} | {pendingManualAttempt.method_label || selectedMethodDetail?.display_name || "-"}
              </Text>
            </View>
          </View>

          {pendingManualAttempt.proof_url ? (
            <View style={[styles.previewCard, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
              <Image source={{ uri: pendingManualAttempt.proof_url }} style={styles.proofImage} resizeMode="cover" />
            </View>
          ) : null}

          {pendingManualAttempt.payer_note ? (
            <InfoCard label="Catatan" value={pendingManualAttempt.payer_note} compact />
          ) : null}

          <View style={styles.rowButtons}>
            <Pressable
              onPress={() => detail.refetch()}
              style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.foreground }]}>Refresh</Text>
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              style={[styles.primaryButton, { backgroundColor: primarySolid.backgroundColor }]}
            >
              <Text style={[styles.primaryButtonText, { color: primarySolid.textColor }]}>Kembali</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.sectionHeader}>
            <Feather name="credit-card" size={16} color={theme.colors.accent} />
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Metode bayar</Text>
          </View>

          <View style={styles.stack}>
            {paymentMethods.map((method) => {
              const selected = selectedMethod === method.code;
              const icon = getPaymentMethodIcon(method.code);
              return (
                <Pressable
                  key={method.code}
                  onPress={() => setSelectedMethod(method.code)}
                  style={[
                    styles.methodCard,
                    {
                      backgroundColor: selected ? theme.colors.accentSoft : theme.colors.card,
                      borderColor: selected ? theme.colors.accent : theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.methodLeft}>
                    <View
                      style={[
                        styles.methodIcon,
                        { backgroundColor: selected ? accentSolid.backgroundColor : theme.colors.surfaceAlt },
                      ]}
                    >
                      <Feather
                        name={icon}
                        size={16}
                        color={selected ? accentSolid.textColor : theme.colors.foreground}
                      />
                    </View>
                    <View style={styles.methodCopy}>
                      <Text style={[styles.methodTitle, { color: theme.colors.foreground }]}>
                        {method.display_name}
                      </Text>
                      <Text
                        style={[styles.methodHint, { color: theme.colors.foregroundMuted }]}
                        numberOfLines={2}
                      >
                        {getPaymentMethodMeta(method)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tinyBadge, { backgroundColor: theme.colors.surfaceAlt }]}>
                    <Text style={[styles.tinyBadgeText, { color: theme.colors.foregroundMuted }]}>
                      {method.verification_type === "auto" ? "Auto" : "Manual"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {selectedMethodDetail ? (
            <View style={styles.stack}>
              <InfoCard
                label="Instruksi"
                value={selectedMethodDetail.instructions || getPaymentMethodMeta(selectedMethodDetail)}
                hint={
                  selectedMethodDetail.verification_type === "auto"
                    ? "Lanjut checkout."
                    : selectedMethodDetail.code === "cash"
                      ? "Bayar lalu konfirmasi."
                      : "Upload lalu kirim."
                }
                compact
              />

              {renderInstructionPanel(selectedMethodDetail)}

              {selectedMethodDetail.verification_type === "manual" ? (
                <View style={styles.stack}>
                  {selectedMethodDetail.code !== "cash" ? (
                    <View
                      style={[
                        styles.uploadCard,
                        { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
                      ]}
                    >
                      <Pressable onPress={pickProof} style={styles.uploadButton}>
                        {manualProofUrl ? (
                          <Image source={{ uri: manualProofUrl }} style={styles.proofImage} resizeMode="cover" />
                        ) : (
                          <View style={styles.uploadPlaceholder}>
                            {uploadProof.isPending ? (
                              <ActivityIndicator color={theme.colors.accent} />
                            ) : (
                              <>
                                <Feather name="upload" size={18} color={theme.colors.accent} />
                                <Text style={[styles.uploadTitle, { color: theme.colors.foreground }]}>
                                  Upload bukti
                                </Text>
                                <Text style={[styles.uploadHint, { color: theme.colors.foregroundMuted }]}>
                                  Bukti jelas mempercepat verifikasi.
                                </Text>
                              </>
                            )}
                          </View>
                        )}
                      </Pressable>
                    </View>
                  ) : null}

                  <View style={styles.stack}>
                    <Text style={[styles.inputLabel, { color: theme.colors.foregroundMuted }]}>
                      Catatan
                    </Text>
                    <TextInput
                      value={manualPaymentNote}
                      onChangeText={setManualPaymentNote}
                      placeholder="Tambahkan catatan bila perlu"
                      placeholderTextColor={theme.colors.foregroundMuted}
                      multiline
                      style={[
                        styles.noteInput,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          color: theme.colors.foreground,
                        },
                      ]}
                    />
                  </View>
                </View>
              ) : null}

              <Pressable
                onPress={() => void handlePay()}
                disabled={checkout.isPending || submitManual.isPending}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: primarySolid.backgroundColor,
                    opacity: checkout.isPending || submitManual.isPending ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.primaryButtonText, { color: primarySolid.textColor }]}>
                  {checkout.isPending || submitManual.isPending
                    ? "Memproses..."
                    : selectedMethodDetail.verification_type === "auto"
                      ? "Lanjut Checkout"
                      : "Kirim Pembayaran"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
    </ScreenShell>
  );
}

function MiniInfoCard({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={[styles.miniCard, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
      <Text style={[styles.miniLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
      <Text style={[styles.miniValue, { color: theme.colors.foreground }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backText: {
    fontSize: 13,
    fontWeight: "700",
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 10,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
  },
  summaryEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  resourceName: {
    fontSize: 18,
    fontWeight: "800",
  },
  summaryHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  amountPill: {
    minWidth: 118,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  amountLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  amountValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  miniCard: {
    flexGrow: 1,
    flexBasis: "31%",
    minWidth: 90,
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    gap: 3,
  },
  miniLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  miniValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  promoCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  promoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  promoEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  promoCode: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "800",
  },
  promoBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  promoBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  pendingCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 10,
  },
  pendingHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  pendingIcon: {
    width: 36,
    height: 36,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingCopy: {
    flex: 1,
    gap: 2,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  pendingHint: {
    fontSize: 11,
    lineHeight: 15,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  proofImage: {
    width: "100%",
    height: 176,
  },
  qrImage: {
    width: "100%",
    aspectRatio: 1,
  },
  rowButtons: {
    flexDirection: "row",
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  stack: {
    gap: 10,
  },
  methodCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  methodLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  methodIcon: {
    width: 34,
    height: 34,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  methodCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  methodTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  methodHint: {
    fontSize: 10,
    lineHeight: 14,
  },
  tinyBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tinyBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  uploadCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  uploadButton: {
    minHeight: 148,
  },
  uploadPlaceholder: {
    flex: 1,
    minHeight: 148,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18,
  },
  uploadTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  uploadHint: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  noteInput: {
    minHeight: 78,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
    fontSize: 12,
  },
});
