import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { apiFetch, ApiError } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { formatCurrency } from "@/lib/format";

type PaymentMethod = {
  code?: string;
  display_name?: string;
  category?: string;
  verification_type?: string;
  provider?: string;
  instructions?: string;
  is_active?: boolean;
  metadata?: {
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    qr_image_url?: string;
  };
};

type PaymentAttempt = {
  id?: string;
  method_label?: string;
  payment_scope?: string;
  status?: string;
  amount?: number;
  reference_code?: string;
  payer_note?: string;
  proof_url?: string;
};

type BookingPayment = {
  id?: string;
  status?: string;
  payment_status?: string;
  grand_total?: number;
  balance_due?: number;
  deposit_amount?: number;
  resource_name?: string;
  payment_methods?: PaymentMethod[];
  payment_attempts?: PaymentAttempt[];
};

type PaymentCheckoutResponse = {
  redirect_url?: string;
  reference?: string;
};

type UploadProofResponse = {
  url?: string;
};

function getPaymentStatusLabel(status?: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "awaiting_verification") return "Menunggu verifikasi";
  if (normalized === "partial_paid") return "DP tercatat";
  if (normalized === "settled" || normalized === "paid") return "Lunas";
  if (normalized === "expired") return "Kedaluwarsa";
  if (normalized === "failed") return "Gagal";
  return "Menunggu pembayaran";
}

function getMethodSummary(method?: PaymentMethod) {
  if (!method) return "";
  if (method.code === "bank_transfer") {
    const parts = [method.metadata?.bank_name, method.metadata?.account_number].filter(Boolean);
    return parts.join(" / ") || "Transfer bank";
  }
  if (method.code === "qris_static") return "Scan QRIS";
  if (method.code === "cash") return "Konfirmasi cash";
  return "Checkout otomatis";
}

function guessMimeType(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export default function CustomerBookingPaymentScreen() {
  const guard = useAuthGuard("customer");
  const { id, scope } = useLocalSearchParams<{ id: string; scope?: string }>();
  const resolvedScope = scope === "settlement" ? "settlement" : "deposit";
  const [selectedMethod, setSelectedMethod] = useState("");
  const [manualPaymentNote, setManualPaymentNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofLocalUri, setProofLocalUri] = useState("");
  const [proofUploading, setProofUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const paymentQuery = useQuery({
    queryKey: ["customer-booking-payment", id],
    queryFn: () => apiFetch<BookingPayment>(`/user/me/bookings/${id}`, { audience: "customer" }),
    enabled: guard.ready && Boolean(id),
  });

  const booking = paymentQuery.data;
  const methods = useMemo(() => {
    const items = booking?.payment_methods || [];
    return items.filter((item) => {
      if (item.is_active === false) return false;
      if (resolvedScope === "deposit" && item.code === "cash") return false;
      return true;
    });
  }, [booking?.payment_methods, resolvedScope]);

  useEffect(() => {
    if (!methods.length) return;
    if (!methods.find((item) => item.code === selectedMethod)) {
      setSelectedMethod(methods[0].code || "");
    }
  }, [methods, selectedMethod]);

  useEffect(() => {
    const currentMethod = methods.find((item) => item.code === selectedMethod);
    if (currentMethod?.code === "cash") {
      setProofUrl("");
      setProofLocalUri("");
    }
  }, [methods, selectedMethod]);

  const selectedMethodDetail = methods.find((item) => item.code === selectedMethod) || methods[0];
  const selectedMethodRequiresProof =
    selectedMethodDetail?.verification_type !== "auto" && selectedMethodDetail?.code !== "cash";

  const amount =
    resolvedScope === "deposit"
      ? Number(booking?.deposit_amount || 0)
      : Number(booking?.balance_due || 0);

  const paymentStatus = String(booking?.payment_status || "").toLowerCase();
  const bookingStatus = String(booking?.status || "").toLowerCase();

  const pendingManualAttempt = useMemo(
    () =>
      (booking?.payment_attempts || []).find(
        (item) =>
          item.payment_scope === resolvedScope &&
          (item.status === "submitted" || item.status === "awaiting_verification"),
      ),
    [booking?.payment_attempts, resolvedScope],
  );

  const paymentAccessError = useMemo(() => {
    if (!booking) return "";
    if (resolvedScope === "settlement") {
      if (bookingStatus !== "completed") return "Pelunasan baru tersedia setelah sesi selesai.";
      if (Number(booking.balance_due || 0) <= 0 || paymentStatus === "settled") {
        return "Booking ini sudah tidak memiliki sisa tagihan.";
      }
      if (!methods.length) return "Metode pelunasan belum tersedia.";
      return "";
    }

    if (Number(booking.deposit_amount || 0) <= 0) return "Booking ini tidak membutuhkan DP.";
    if (paymentStatus !== "pending") return "Halaman DP hanya tersedia sebelum pembayaran DP tercatat.";
    if (!methods.length) return "Metode DP belum tersedia.";
    return "";
  }, [booking, bookingStatus, methods.length, paymentStatus, resolvedScope]);

  async function uploadProofFromGallery() {
    if (!id) return;
    let ImagePicker: typeof import("expo-image-picker");
    try {
      ImagePicker = await import("expo-image-picker");
    } catch {
      Alert.alert(
        "Perlu rebuild app",
        "Dev client Android yang terpasang belum memuat module upload gambar. Jalankan ulang build `npm run android`, lalu buka app lagi.",
      );
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Izin dibutuhkan", "Aktifkan akses galeri agar kamu bisa upload bukti bayar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    const asset = result.assets[0];
    const localUri = asset.uri;
    const fileName = asset.fileName || `payment-proof-${Date.now()}.jpg`;
    const mimeType = asset.mimeType || guessMimeType(localUri);

    setProofUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: localUri,
        name: fileName,
        type: mimeType,
      } as never);

      const uploaded = await apiFetch<UploadProofResponse>(`/user/me/bookings/${id}/upload-proof`, {
        method: "POST",
        audience: "customer",
        body: formData,
      });

      setProofLocalUri(localUri);
      setProofUrl(uploaded.url || "");
      Alert.alert("Berhasil", "Bukti bayar berhasil diupload.");
    } catch (error) {
      const message = error instanceof ApiError || error instanceof Error ? error.message : "Gagal upload bukti bayar.";
      Alert.alert("Upload gagal", message);
    } finally {
      setProofUploading(false);
    }
  }

  async function handlePay() {
    if (!selectedMethodDetail?.code || !id) return;
    if (paymentAccessError) {
      Alert.alert("Belum tersedia", paymentAccessError);
      return;
    }
    if (pendingManualAttempt) {
      Alert.alert("Menunggu review", "Masih ada pembayaran manual yang menunggu verifikasi admin.");
      return;
    }
    if (selectedMethodRequiresProof && !proofUrl.trim()) {
      Alert.alert("Upload bukti dulu", "Pilih dan upload bukti transfer sebelum mengirim pembayaran manual.");
      return;
    }

    setProcessing(true);
    try {
      if (selectedMethodDetail.verification_type === "auto") {
        const result = await apiFetch<PaymentCheckoutResponse>(
          `/public/bookings/${id}/checkout?mode=${resolvedScope === "deposit" ? "dp" : "settlement"}&method=${selectedMethodDetail.code}`,
          { method: "POST" },
        );
        if (result.redirect_url) {
          await WebBrowser.openBrowserAsync(result.redirect_url);
          await paymentQuery.refetch();
          return;
        }
        Alert.alert("Checkout dibuat", "Instruksi pembayaran sudah dibuat.");
        await paymentQuery.refetch();
        return;
      }

      const result = await apiFetch<PaymentCheckoutResponse>(`/user/me/bookings/${id}/manual-payment`, {
        method: "POST",
        audience: "customer",
        body: JSON.stringify({
          booking_id: id,
          scope: resolvedScope,
          method: selectedMethodDetail.code,
          note: manualPaymentNote,
          proof_url: proofUrl,
        }),
      });

      Alert.alert("Terkirim", `Pembayaran manual terkirim${result.reference ? ` (${result.reference})` : ""}.`);
      await paymentQuery.refetch();
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error ? error.message : "Gagal memproses pembayaran.";
      Alert.alert("Pembayaran gagal", message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <ScreenShell
      eyebrow="Pembayaran"
      title={booking?.resource_name || "Pembayaran booking"}
      description="Pilih metode bayar."
    >
      <CardBlock>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
              {resolvedScope === "deposit" ? "DP" : "PELUNASAN"}
            </Text>
            <Text selectable style={{ color: "#0f172a", fontSize: 28, fontWeight: "900" }}>
              {formatCurrency(amount)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "800" }}>
              {getPaymentStatusLabel(booking?.payment_status)}
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
              Total {formatCurrency(booking?.grand_total)}
            </Text>
          </View>
        </View>
      </CardBlock>

      {paymentAccessError ? (
        <CardBlock>
          <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
            {paymentAccessError}
          </Text>
        </CardBlock>
      ) : pendingManualAttempt ? (
        <CardBlock>
          <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
            Menunggu review admin
          </Text>
          <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
            {pendingManualAttempt.method_label || "Manual"} / {pendingManualAttempt.reference_code || "-"}
          </Text>
          {pendingManualAttempt.proof_url ? (
            <View
              style={{
                height: 164,
                borderRadius: 18,
                overflow: "hidden",
                backgroundColor: "#f8fafc",
              }}
            >
              <Image source={pendingManualAttempt.proof_url} contentFit="cover" style={{ width: "100%", height: "100%" }} />
            </View>
          ) : null}
          {pendingManualAttempt.payer_note ? (
            <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
              {pendingManualAttempt.payer_note}
            </Text>
          ) : null}
        </CardBlock>
      ) : (
        <>
          <CardBlock>
            <View style={{ gap: 10 }}>
              {methods.map((method) => {
                const selected = selectedMethod === method.code;
                return (
                  <Pressable
                    key={`${method.code}-${method.display_name}`}
                    onPress={() => setSelectedMethod(method.code || "")}
                    style={{
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: selected ? "#93c5fd" : "#e2e8f0",
                      backgroundColor: selected ? "#eff6ff" : "#ffffff",
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      gap: 4,
                    }}
                  >
                    <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                      {method.display_name || method.code || "Metode bayar"}
                    </Text>
                    <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                      {getMethodSummary(method)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </CardBlock>

          {selectedMethodDetail ? (
            <CardBlock>
              <Text selectable style={{ color: "#475569", fontSize: 13, lineHeight: 20 }}>
                {selectedMethodDetail.instructions || getMethodSummary(selectedMethodDetail)}
              </Text>

              {selectedMethodDetail.code === "bank_transfer" ? (
                <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
                  {[
                    selectedMethodDetail.metadata?.bank_name,
                    selectedMethodDetail.metadata?.account_number,
                    selectedMethodDetail.metadata?.account_name,
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                </Text>
              ) : null}

              {selectedMethodDetail.verification_type !== "auto" ? (
                <View style={{ gap: 10 }}>
                  {selectedMethodRequiresProof ? (
                    <Pressable
                      onPress={() => void uploadProofFromGallery()}
                      disabled={proofUploading}
                      style={{
                        borderRadius: 18,
                        borderWidth: 1,
                        borderStyle: "dashed",
                        borderColor: proofUrl ? "#86efac" : "#cbd5e1",
                        backgroundColor: proofUrl ? "#f0fdf4" : "#f8fafc",
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        gap: 10,
                      }}
                    >
                      {proofLocalUri ? (
                        <View
                          style={{
                            height: 180,
                            borderRadius: 14,
                            overflow: "hidden",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          <Image source={proofLocalUri} contentFit="cover" style={{ width: "100%", height: "100%" }} />
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <MaterialIcons name="upload" size={20} color="#2563eb" />
                          <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "700" }}>
                            {proofUploading ? "Mengupload..." : "Upload bukti transfer"}
                          </Text>
                        </View>
                      )}
                      <Text selectable style={{ color: proofUrl ? "#15803d" : "#64748b", fontSize: 12 }}>
                        {proofUrl ? "Bukti sudah terupload. Tap untuk ganti." : "Pilih gambar dari galeri."}
                      </Text>
                    </Pressable>
                  ) : null}

                  <TextInput
                    value={manualPaymentNote}
                    onChangeText={setManualPaymentNote}
                    placeholder={selectedMethodDetail.code === "cash" ? "Catatan cash" : "Catatan transfer"}
                    placeholderTextColor="#94a3b8"
                    multiline
                    style={{
                      minHeight: 76,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: "#d6deea",
                      backgroundColor: "#fbfdff",
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      color: "#0f172a",
                      fontSize: 15,
                      textAlignVertical: "top",
                    }}
                  />
                </View>
              ) : null}
            </CardBlock>
          ) : null}

          <CtaButton
            label={
              processing
                ? "Memproses..."
                : selectedMethodDetail?.verification_type === "auto"
                  ? "Lanjut ke checkout"
                  : selectedMethodDetail?.code === "cash"
                    ? "Konfirmasi cash"
                    : "Kirim pembayaran manual"
            }
            disabled={processing || proofUploading || !selectedMethodDetail}
            onPress={() => void handlePay()}
          />
        </>
      )}

      <CtaButton
        label="Kembali"
        tone="secondary"
        onPress={() => router.replace(`/user/me/bookings/${id}`)}
      />
    </ScreenShell>
  );
}
