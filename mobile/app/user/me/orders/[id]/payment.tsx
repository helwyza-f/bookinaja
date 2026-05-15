import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { Link, useLocalSearchParams } from "expo-router";
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
import { getOrderStatusMeta } from "@/lib/customer-portal";

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
  method_code?: string;
  method_label?: string;
  verification_type?: string;
  payment_scope?: string;
  amount?: number;
  status?: string;
  reference_code?: string;
  payer_note?: string;
  proof_url?: string;
};

type CustomerOrderPayment = {
  id?: string;
  status?: string;
  payment_status?: string;
  balance_due?: number;
  grand_total?: number;
  resource_name?: string;
  payment_methods?: PaymentMethod[];
  payment_attempts?: PaymentAttempt[];
};

type PaymentCheckoutResponse = {
  redirect_url?: string;
  method_label?: string;
  status?: string;
  reference?: string;
};

type UploadProofResponse = {
  url?: string;
};

function getPaymentMethodMeta(method?: PaymentMethod) {
  if (!method) return "Pilih metode pembayaran.";
  if (method.code === "bank_transfer") {
    const parts = [method.metadata?.bank_name, method.metadata?.account_number, method.metadata?.account_name].filter(Boolean);
    return parts.join(" / ") || "Detail rekening belum lengkap.";
  }
  if (method.code === "qris_static") {
    return method.metadata?.qr_image_url ? "Scan QRIS lalu kirim pembayaran." : "QRIS belum dikonfigurasi.";
  }
  if (method.code === "cash") {
    return "Konfirmasi langsung ke kasir atau admin tenant.";
  }
  return "Checkout otomatis via gateway.";
}

function guessMimeType(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export default function CustomerOrderPaymentScreen() {
  const guard = useAuthGuard("customer");
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [manualPaymentNote, setManualPaymentNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofLocalUri, setProofLocalUri] = useState("");
  const [proofUploading, setProofUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const paymentQuery = useQuery({
    queryKey: ["customer-order-payment", id],
    queryFn: () => apiFetch<CustomerOrderPayment>(`/user/me/orders/${id}`, { audience: "customer" }),
    enabled: guard.ready && Boolean(id),
  });

  const order = paymentQuery.data;
  const statusMeta = getOrderStatusMeta(order?.status, order?.payment_status, order?.balance_due);
  const paymentMethods = useMemo(
    () => (order?.payment_methods || []).filter((method) => method.is_active !== false),
    [order?.payment_methods],
  );

  useEffect(() => {
    if (!paymentMethods.length) return;
    if (!paymentMethods.find((item) => item.code === selectedMethod)) {
      setSelectedMethod(paymentMethods[0].code || "");
    }
  }, [paymentMethods, selectedMethod]);

  useEffect(() => {
    const currentMethod = paymentMethods.find((item) => item.code === selectedMethod);
    if (currentMethod?.code === "cash") {
      setProofUrl("");
      setProofLocalUri("");
    }
  }, [paymentMethods, selectedMethod]);

  const selectedMethodDetail =
    paymentMethods.find((item) => item.code === selectedMethod) || paymentMethods[0];

  const pendingManualAttempt = useMemo(
    () =>
      (order?.payment_attempts || []).find(
        (item) => item.payment_scope === "settlement" && (item.status === "submitted" || item.status === "awaiting_verification"),
      ),
    [order?.payment_attempts],
  );

  const selectedMethodRequiresProof =
    selectedMethodDetail?.verification_type !== "auto" && selectedMethodDetail?.code !== "cash";

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
    const fileName = asset.fileName || `order-payment-proof-${Date.now()}.jpg`;
    const mimeType = asset.mimeType || guessMimeType(localUri);

    setProofUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: localUri,
        name: fileName,
        type: mimeType,
      } as never);

      const uploaded = await apiFetch<UploadProofResponse>(`/user/me/orders/${id}/upload-proof`, {
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
        const result = await apiFetch<PaymentCheckoutResponse>(`/user/me/orders/${id}/payment-checkout`, {
          method: "POST",
          audience: "customer",
          body: JSON.stringify({ method: selectedMethodDetail.code }),
        });

        if (result.redirect_url) {
          await WebBrowser.openBrowserAsync(result.redirect_url);
          await paymentQuery.refetch();
          return;
        }

        Alert.alert("Checkout dibuat", "Instruksi pembayaran sudah dibuat untuk order ini.");
        await paymentQuery.refetch();
        return;
      }

      const result = await apiFetch<PaymentCheckoutResponse>(`/user/me/orders/${id}/manual-payment`, {
        method: "POST",
        audience: "customer",
        body: JSON.stringify({
          method: selectedMethodDetail.code,
          note: manualPaymentNote,
          proof_url: proofUrl,
        }),
      });

      Alert.alert("Terkirim", `Pembayaran manual terkirim${result.reference ? ` (${result.reference})` : ""}.`);
      await paymentQuery.refetch();
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error ? error.message : "Checkout pembayaran gagal dibuat.";
      Alert.alert("Checkout gagal", message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <ScreenShell
      eyebrow="Pembayaran order"
      title={order?.resource_name || "Pembayaran order"}
      description="Pilih metode bayar, lanjutkan checkout, atau kirim pembayaran manual langsung dari app."
    >
      <CardBlock>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
              PELUNASAN ORDER
            </Text>
            <Text selectable style={{ color: "#0f172a", fontSize: 28, fontWeight: "900" }}>
              {formatCurrency(order?.balance_due)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Text selectable style={{ color: statusMeta.tone, fontSize: 13, fontWeight: "800" }}>
              {statusMeta.label}
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
              Total {formatCurrency(order?.grand_total)}
            </Text>
          </View>
        </View>

        {statusMeta.hint ? (
          <Text selectable style={{ color: "#475569", fontSize: 13, lineHeight: 20 }}>
            {statusMeta.hint}
          </Text>
        ) : null}
      </CardBlock>

      {pendingManualAttempt ? (
        <CardBlock>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: "#fef3c7",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="schedule" size={20} color="#d97706" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                Pembayaran order sedang direview admin
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
                Referensi {pendingManualAttempt.reference_code || "-"} / {pendingManualAttempt.method_label || "Manual"}
              </Text>
              {pendingManualAttempt.proof_url ? (
                <View
                  style={{
                    marginTop: 6,
                    height: 148,
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
                  Catatan: {pendingManualAttempt.payer_note}
                </Text>
              ) : null}
            </View>
          </View>
        </CardBlock>
      ) : null}

      {(order?.payment_methods || []).length ? (
        <>
          <CardBlock>
            <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
              Pilih metode bayar
            </Text>
            <View style={{ gap: 10 }}>
              {paymentMethods.map((method) => {
                const selected = selectedMethod === method.code;
                return (
                  <Pressable
                    key={`${method.code}-${method.display_name}`}
                    onPress={() => setSelectedMethod(method.code || "")}
                    style={{
                      borderRadius: 22,
                      borderWidth: 1,
                      borderColor: selected ? "#93c5fd" : "#e2e8f0",
                      backgroundColor: selected ? "#eff6ff" : "#ffffff",
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 14,
                          backgroundColor: selected ? "#2563eb" : "#f1f5f9",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MaterialIcons
                          name={
                            method.code === "qris_static"
                              ? "qr-code-2"
                              : method.code === "cash"
                                ? "payments"
                                : method.verification_type === "auto"
                                  ? "credit-card"
                                  : "account-balance"
                          }
                          size={20}
                          color={selected ? "#ffffff" : "#334155"}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                          {method.display_name || method.code || "Payment method"}
                        </Text>
                        <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                          {getPaymentMethodMeta(method)}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                      <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                        {method.verification_type === "auto" ? "Auto" : "Manual"}
                      </Text>
                      <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                        {[method.category, method.provider].filter(Boolean).join(" / ") || "Pembayaran"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </CardBlock>

          {selectedMethodDetail ? (
            <CardBlock>
              <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
                Instruksi
              </Text>
              <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
                {selectedMethodDetail.instructions || getPaymentMethodMeta(selectedMethodDetail)}
              </Text>

              {selectedMethodDetail.code === "bank_transfer" ? (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {[
                    ["Bank", selectedMethodDetail.metadata?.bank_name || "-"],
                    ["Rekening", selectedMethodDetail.metadata?.account_number || "-"],
                    ["Atas nama", selectedMethodDetail.metadata?.account_name || "-"],
                  ].map(([label, value]) => (
                    <View
                      key={label}
                      style={{
                        flex: 1,
                        borderRadius: 18,
                        backgroundColor: "#f8fafc",
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        gap: 4,
                      }}
                    >
                      <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                        {label}
                      </Text>
                      <Text selectable style={{ color: "#0f172a", fontSize: 13, fontWeight: "700" }}>
                        {value}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {selectedMethodDetail.verification_type !== "auto" ? (
                <View style={{ gap: 10 }}>
                  {selectedMethodRequiresProof ? (
                    <Pressable
                      onPress={() => void uploadProofFromGallery()}
                      disabled={proofUploading}
                      style={{
                        borderRadius: 22,
                        borderWidth: 1,
                        borderStyle: "dashed",
                        borderColor: proofUrl ? "#86efac" : "#93c5fd",
                        backgroundColor: proofUrl ? "#f0fdf4" : "#f8fbff",
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        gap: 10,
                      }}
                    >
                      {proofLocalUri ? (
                        <View
                          style={{
                            height: 188,
                            borderRadius: 18,
                            overflow: "hidden",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          <Image source={proofLocalUri} contentFit="cover" style={{ width: "100%", height: "100%" }} />
                        </View>
                      ) : (
                        <View
                          style={{
                            height: 116,
                            borderRadius: 18,
                            backgroundColor: "#ffffff",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 10,
                          }}
                        >
                          <View
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 16,
                              backgroundColor: "#eff6ff",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <MaterialIcons name="upload" size={24} color="#2563eb" />
                          </View>
                          <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                            {proofUploading ? "Mengupload..." : "Upload bukti transfer"}
                          </Text>
                        </View>
                      )}
                      <Text selectable style={{ color: proofUrl ? "#15803d" : "#64748b", fontSize: 13, lineHeight: 20 }}>
                        {proofUrl
                          ? "Bukti transfer sudah terupload. Tap untuk ganti gambar."
                          : "Pilih gambar dari galeri, lalu kirim pembayaran manual ke admin tenant."}
                      </Text>
                    </Pressable>
                  ) : null}

                  <TextInput
                    value={manualPaymentNote}
                    onChangeText={setManualPaymentNote}
                    placeholder={
                      selectedMethodDetail.code === "cash"
                        ? "Contoh: sudah bayar ke kasir"
                        : "Contoh: transfer BCA 13:20"
                    }
                    placeholderTextColor="#94a3b8"
                    multiline
                    style={{
                      minHeight: 84,
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
      ) : (
        <CardBlock>
          <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
            Metode belum tersedia
          </Text>
          <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
            Tenant belum menyiapkan metode pembayaran untuk order ini.
          </Text>
        </CardBlock>
      )}

      {(order?.payment_attempts || []).length ? (
        <CardBlock>
          <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
            Riwayat pembayaran
          </Text>
          {(order?.payment_attempts || []).map((attempt) => (
            <View
              key={attempt.id}
              style={{
                borderRadius: 18,
                backgroundColor: "#f8fafc",
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 4,
              }}
            >
              <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                {attempt.method_label || "Pembayaran"}
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 12 }}>
                {attempt.status || "-"} / {formatCurrency(attempt.amount)}
              </Text>
            </View>
          ))}
        </CardBlock>
      ) : null}

      <Link href={`/user/me/orders/${id}` as const} asChild>
        <View>
          <CtaButton label="Kembali ke order" tone="secondary" />
        </View>
      </Link>
    </ScreenShell>
  );
}
