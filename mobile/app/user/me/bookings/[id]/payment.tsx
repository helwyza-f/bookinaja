import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { apiFetch, ApiError } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { Field } from "@/components/field";
import { ScreenShell } from "@/components/screen-shell";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useRealtime } from "@/hooks/use-realtime";
import { formatCurrency } from "@/lib/format";
import { customerBookingChannel } from "@/lib/realtime/channels";
import { BOOKING_EVENT_PREFIXES, matchesRealtimePrefix } from "@/lib/realtime/event-types";
import { isRealtimeEnabledForAPI } from "@/lib/realtime/ws-client";

type PaymentMethod = {
  code?: string;
  display_name?: string;
  verification_type?: string;
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
  customer_id?: string;
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

type ExitAction = {
  label: string;
  href: `/user/me/bookings/${string}` | `/user/me/bookings/${string}/live` | `/user/me/bookings/${string}/payment?scope=deposit` | `/user/me/bookings/${string}/payment?scope=settlement`;
  tone?: "primary" | "secondary";
};

type AccessState = {
  code:
    | "ok"
    | "settled"
    | "no_balance_due"
    | "settlement_locked"
    | "deposit_not_required"
    | "deposit_unavailable"
    | "deposit_methods_unavailable"
    | "settlement_methods_unavailable";
  title: string;
  message: string;
  tone: "success" | "info" | "warning";
};

function getPaymentStatusMeta(status?: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "awaiting_verification") {
    return {
      label: "Menunggu verifikasi",
      tone: "#d97706",
      bg: "#fff7ed",
      hint: "Bukti bayar sudah masuk dan sedang dicek admin tenant.",
    };
  }
  if (normalized === "partial_paid") {
    return {
      label: "DP tercatat",
      tone: "#2563eb",
      bg: "#eff6ff",
      hint: "Booking lanjut diproses. Sisa tagihan dibayar setelah sesi selesai.",
    };
  }
  if (normalized === "settled" || normalized === "paid") {
    return {
      label: "Lunas",
      tone: "#059669",
      bg: "#ecfdf5",
      hint: "Pembayaran booking sudah tercatat penuh.",
    };
  }
  if (normalized === "expired" || normalized === "failed") {
    return {
      label: "Perlu bayar ulang",
      tone: "#dc2626",
      bg: "#fef2f2",
      hint: "Pembayaran sebelumnya tidak bisa dipakai. Mulai lagi dari metode bayar.",
    };
  }
  return {
    label: "Menunggu pembayaran",
    tone: "#475569",
    bg: "#f8fafc",
    hint: "Selesaikan pembayaran agar status booking lanjut ke tahap berikutnya.",
  };
}

function getMethodSummary(method?: PaymentMethod) {
  if (!method) return "";
  if (method.code === "bank_transfer") {
    return [method.metadata?.bank_name, method.metadata?.account_number].filter(Boolean).join(" / ") || "Transfer bank";
  }
  if (method.code === "qris_static") return "Scan QRIS lalu lanjutkan konfirmasi";
  if (method.code === "cash") return "Konfirmasi cash langsung ke tenant";
  return "Checkout otomatis via gateway";
}

function getMethodIconName(code?: string): keyof typeof MaterialIcons.glyphMap {
  if (code === "qris_static") return "qr-code-2";
  if (code === "cash") return "payments";
  if (code === "bank_transfer") return "account-balance";
  return "credit-card";
}

function guessMimeType(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 16,
        backgroundColor: "#f8fafc",
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 4,
      }}
    >
      <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
        {label}
      </Text>
      <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
        {value}
      </Text>
    </View>
  );
}

function resolveExitActions(
  booking: BookingPayment | undefined,
  scope: "deposit" | "settlement",
  hasAccessError: boolean,
): { primary: ExitAction | null; secondary: ExitAction | null } {
  const bookingID = String(booking?.id || "");
  if (!bookingID) return { primary: null, secondary: null };

  const status = String(booking?.status || "").toLowerCase();
  const paymentStatus = String(booking?.payment_status || "").toLowerCase();
  const depositAmount = Number(booking?.deposit_amount || 0);
  const balanceDue = Number(booking?.balance_due || 0);

  if (scope === "deposit") {
    if (paymentStatus === "awaiting_verification") {
      return {
        primary: { href: `/user/me/bookings/${bookingID}` as const, label: "Pantau status booking" },
        secondary: { href: `/user/me/bookings/${bookingID}/live` as const, label: "Buka mode live", tone: "secondary" },
      };
    }
    if (paymentStatus === "partial_paid" || paymentStatus === "paid" || paymentStatus === "settled") {
      return {
        primary:
          status === "completed"
            ? { href: `/user/me/bookings/${bookingID}/live` as const, label: "Lihat ringkasan sesi" }
            : { href: `/user/me/bookings/${bookingID}` as const, label: "Kembali" },
        secondary:
          status === "completed" && balanceDue > 0
            ? { href: `/user/me/bookings/${bookingID}/payment?scope=settlement` as const, label: "Lanjutkan pelunasan", tone: "secondary" }
            : { href: `/user/me/bookings/${bookingID}` as const, label: "Kembali", tone: "secondary" },
      };
    }
    if (depositAmount <= 0) {
      return {
        primary: { href: `/user/me/bookings/${bookingID}/live` as const, label: "Buka mode live" },
        secondary: { href: `/user/me/bookings/${bookingID}` as const, label: "Kembali", tone: "secondary" },
      };
    }
  }

  if (scope === "settlement") {
    if (status !== "completed") {
      return {
        primary: { href: `/user/me/bookings/${bookingID}/live` as const, label: "Buka mode live" },
        secondary: { href: `/user/me/bookings/${bookingID}` as const, label: "Kembali", tone: "secondary" },
      };
    }
    if (balanceDue <= 0 || paymentStatus === "settled" || paymentStatus === "paid") {
      return {
        primary: { href: `/user/me/bookings/${bookingID}` as const, label: "Kembali" },
        secondary: null,
      };
    }
  }

  if (hasAccessError) {
    return {
      primary: { href: `/user/me/bookings/${bookingID}` as const, label: "Kembali" },
      secondary: null,
    };
  }

  return {
    primary: { href: `/user/me/bookings/${bookingID}` as const, label: "Kembali", tone: "secondary" },
    secondary: null,
  };
}

function resolveAccessState(
  booking: BookingPayment | undefined,
  scope: "deposit" | "settlement",
  methodsCount: number,
): AccessState {
  if (!booking) {
    return {
      code: "ok",
      title: "",
      message: "",
      tone: "info",
    };
  }

  const bookingStatus = String(booking.status || "").toLowerCase();
  const paymentStatus = String(booking.payment_status || "").toLowerCase();
  const balanceDue = Number(booking.balance_due || 0);
  const depositAmount = Number(booking.deposit_amount || 0);

  if (scope === "settlement") {
    if (bookingStatus !== "completed") {
      return {
        code: "settlement_locked",
        title: "Pelunasan belum dibuka",
        message: "Pelunasan baru tersedia setelah sesi selesai.",
        tone: "info",
      };
    }
    if (balanceDue <= 0 || paymentStatus === "settled" || paymentStatus === "paid") {
      return {
        code: paymentStatus === "settled" || paymentStatus === "paid" ? "settled" : "no_balance_due",
        title: "Pembayaran sudah selesai",
        message: "Booking ini sudah tidak memiliki sisa tagihan.",
        tone: "success",
      };
    }
    if (!methodsCount) {
      return {
        code: "settlement_methods_unavailable",
        title: "Metode pelunasan belum tersedia",
        message: "Tenant belum menyiapkan metode pembayaran untuk pelunasan.",
        tone: "warning",
      };
    }
    return { code: "ok", title: "", message: "", tone: "info" };
  }

  if (depositAmount <= 0) {
    return {
      code: "deposit_not_required",
      title: "DP tidak diperlukan",
      message: "Booking ini tidak membutuhkan DP.",
      tone: "info",
    };
  }
  if (paymentStatus !== "pending") {
    return {
      code: "deposit_unavailable",
      title: "DP sudah tercatat",
      message: "Halaman DP hanya tersedia sebelum pembayaran DP tercatat.",
      tone: "success",
    };
  }
  if (!methodsCount) {
    return {
      code: "deposit_methods_unavailable",
      title: "Metode DP belum tersedia",
      message: "Tenant belum menyiapkan metode pembayaran untuk DP.",
      tone: "warning",
    };
  }

  return { code: "ok", title: "", message: "", tone: "info" };
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
    refetchInterval: isRealtimeEnabledForAPI() ? false : 15_000,
  });

  const booking = paymentQuery.data;
  const paymentMeta = getPaymentStatusMeta(booking?.payment_status);
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

  const selectedMethodDetail = methods.find((item) => item.code === selectedMethod) || methods[0];
  const amount =
    resolvedScope === "deposit"
      ? Number(booking?.deposit_amount || 0)
      : Number(booking?.balance_due || 0);
  const pendingManualAttempt = useMemo(
    () =>
      (booking?.payment_attempts || []).find(
        (item) =>
          item.payment_scope === resolvedScope &&
          (item.status === "submitted" || item.status === "awaiting_verification"),
      ),
    [booking?.payment_attempts, resolvedScope],
  );

  const selectedMethodRequiresProof =
    selectedMethodDetail?.verification_type !== "auto" && selectedMethodDetail?.code !== "cash";
  const customerID = String(booking?.customer_id || "");

  useRealtime({
    enabled: guard.ready && isRealtimeEnabledForAPI() && Boolean(customerID && id),
    channels: customerID && id ? [customerBookingChannel(customerID, String(id))] : [],
    onEvent: (event) => {
      if (!matchesRealtimePrefix(event.type, BOOKING_EVENT_PREFIXES)) return;
      void paymentQuery.refetch();
    },
    onReconnect: () => {
      void paymentQuery.refetch();
    },
  });

  const paymentAccessError = useMemo(() => {
    if (!booking) return "";
    const bookingStatus = String(booking.status || "").toLowerCase();
    const paymentStatus = String(booking.payment_status || "").toLowerCase();

    if (resolvedScope === "settlement") {
      if (bookingStatus !== "completed") return "Pelunasan baru tersedia setelah sesi selesai.";
      if (Number(booking.balance_due || 0) <= 0 || paymentStatus === "settled") return "Booking ini sudah tidak memiliki sisa tagihan.";
      if (!methods.length) return "Metode pelunasan belum tersedia.";
      return "";
    }

    if (Number(booking.deposit_amount || 0) <= 0) return "Booking ini tidak membutuhkan DP.";
    if (paymentStatus !== "pending") return "Halaman DP hanya tersedia sebelum pembayaran DP tercatat.";
    if (!methods.length) return "Metode DP belum tersedia.";
    return "";
  }, [booking, methods.length, resolvedScope]);
  const exitActions = useMemo(
    () => resolveExitActions(booking, resolvedScope, Boolean(paymentAccessError)),
    [booking, paymentAccessError, resolvedScope],
  );
  const accessState = useMemo(
    () => resolveAccessState(booking, resolvedScope, methods.length),
    [booking, methods.length, resolvedScope],
  );

  useEffect(() => {
    if (selectedMethodDetail?.code === "cash" && proofUrl) {
      setProofUrl("");
      setProofLocalUri("");
    }
  }, [proofUrl, selectedMethodDetail?.code]);

  async function uploadProofFromGallery() {
    if (!id) return;
    let ImagePicker: typeof import("expo-image-picker");
    try {
      ImagePicker = await import("expo-image-picker");
    } catch {
      Alert.alert("Perlu rebuild app", "Dev client yang terpasang belum memuat module upload gambar.");
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
      const message = error instanceof ApiError || error instanceof Error ? error.message : "Gagal memproses pembayaran.";
      Alert.alert("Pembayaran gagal", message);
    } finally {
      setProcessing(false);
    }
  }

  const primaryLabel =
    processing
      ? "Memproses..."
      : selectedMethodDetail?.verification_type === "auto"
        ? resolvedScope === "deposit"
          ? "Lanjut ke checkout DP"
          : "Lanjut ke checkout pelunasan"
        : selectedMethodDetail?.code === "cash"
        ? resolvedScope === "deposit"
          ? "Konfirmasi DP cash"
          : "Konfirmasi pelunasan cash"
        : resolvedScope === "deposit"
          ? "Kirim bukti DP"
          : "Kirim bukti pelunasan";

  function goBackToBooking() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(`/user/me/bookings/${id}`);
  }

  function handleExitAction(action: ExitAction) {
    if (action.label.toLowerCase().includes("kembali")) {
      goBackToBooking();
      return;
    }
    router.push(action.href);
  }

  return (
    <ScreenShell
      eyebrow="Pembayaran"
      title={booking?.resource_name || "Pembayaran booking"}
      description={
        resolvedScope === "deposit"
          ? "Selesaikan DP agar booking siap diproses tanpa cek manual berulang."
          : "Tutup sisa tagihan booking dari halaman pembayaran yang sama."
      }
    >
      <CardBlock>
          <View style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
                {resolvedScope === "deposit" ? "DP SAAT INI" : "PELUNASAN"}
              </Text>
              <Text selectable style={{ color: "#0f172a", fontSize: 30, fontWeight: "900", letterSpacing: -0.8 }}>
                {amount > 0 ? formatCurrency(amount) : resolvedScope === "settlement" ? "Lunas" : "Tidak perlu DP"}
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
                {paymentMeta.hint}
              </Text>
            </View>

            <View style={{ borderRadius: 999, backgroundColor: paymentMeta.bg, paddingHorizontal: 10, paddingVertical: 7 }}>
              <Text selectable style={{ color: paymentMeta.tone, fontSize: 12, fontWeight: "800" }}>
                {paymentMeta.label}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <MetaTile label="TOTAL BOOKING" value={formatCurrency(booking?.grand_total)} />
            <MetaTile
              label={resolvedScope === "deposit" ? "SETELAH INI" : "STATUS"}
              value={resolvedScope === "deposit" ? "Booking siap diproses" : Number(booking?.balance_due || 0) > 0 ? "Sisa berkurang" : "Lunas"}
            />
          </View>

          {resolvedScope === "deposit" ? (
            <View style={{ borderRadius: 16, backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 12 }}>
              <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 19 }}>
                Setelah DP tercatat, tenant bisa lanjut memproses booking ini sesuai jadwal.
              </Text>
            </View>
          ) : null}
        </View>
      </CardBlock>

      {paymentAccessError ? (
        <CardBlock>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                backgroundColor: accessState.tone === "success" ? "#ecfdf5" : accessState.tone === "warning" ? "#fff7ed" : "#eff6ff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons
                name={accessState.tone === "success" ? "check-circle-outline" : "info-outline"}
                size={18}
                color={accessState.tone === "success" ? "#059669" : accessState.tone === "warning" ? "#d97706" : "#2563eb"}
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                {accessState.title}
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
                {accessState.message}
              </Text>
            </View>
          </View>
        </CardBlock>
      ) : pendingManualAttempt ? (
        <CardBlock>
          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
              Menunggu review admin
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
              Bukti pembayaran sudah dikirim. Status di halaman ini akan berubah otomatis setelah dicek tenant.
            </Text>
          </View>

          <View style={{ borderRadius: 18, borderWidth: 1, borderColor: "#e6ebf2", backgroundColor: "#ffffff", padding: 14, gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                  METODE
                </Text>
                <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                  {pendingManualAttempt.method_label || "-"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                  JUMLAH
                </Text>
                <Text selectable style={{ color: "#2563eb", fontSize: 16, fontWeight: "900" }}>
                  {formatCurrency(pendingManualAttempt.amount || amount)}
                </Text>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: "#eef2f7" }} />

            <View style={{ gap: 6 }}>
              <Text selectable style={{ color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                REFERENSI
              </Text>
              <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                {pendingManualAttempt.reference_code || "-"}
              </Text>
            </View>
          </View>

          {pendingManualAttempt.proof_url ? (
            <View style={{ height: 196, borderRadius: 18, overflow: "hidden", backgroundColor: "#f8fafc" }}>
              <Image source={pendingManualAttempt.proof_url} contentFit="cover" style={{ width: "100%", height: "100%" }} />
            </View>
          ) : null}

          <View style={{ borderRadius: 16, backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 12 }}>
            <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 19 }}>
              {resolvedScope === "deposit"
                ? "Begitu admin menyetujui pembayaran ini, booking akan lanjut ke tahap sesi."
                : "Begitu admin menyetujui pembayaran ini, sisa tagihan booking akan dianggap selesai."}
            </Text>
          </View>
        </CardBlock>
      ) : (
        <>
          <CardBlock>
            <View style={{ gap: 6 }}>
              <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
                Pilih metode bayar
              </Text>
              <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
                Pilih satu metode, lalu lanjutkan sesuai instruksinya.
              </Text>
            </View>

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
                      borderColor: selected ? "#9ab7ff" : "#e6ebf2",
                      backgroundColor: selected ? "#f6f9ff" : "#ffffff",
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        backgroundColor: selected ? "#e7efff" : "#f8fafc",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons name={getMethodIconName(method.code)} size={20} color={selected ? "#2952d9" : "#64748b"} />
                    </View>

                    <View style={{ flex: 1, gap: 4 }}>
                      <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                        {method.display_name || method.code || "Metode bayar"}
                      </Text>
                      <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>
                        {getMethodSummary(method)}
                      </Text>
                    </View>

                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        backgroundColor: selected ? "#2952d9" : "#ffffff",
                        borderWidth: 1,
                        borderColor: selected ? "#2952d9" : "#d9e2ec",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {selected ? <MaterialIcons name="check" size={14} color="#ffffff" /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </CardBlock>

          {selectedMethodDetail ? (
            <CardBlock>
              <View style={{ gap: 6 }}>
                <Text selectable style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
                  Lanjut dengan {selectedMethodDetail.display_name || "metode ini"}
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
                  {selectedMethodDetail.instructions || getMethodSummary(selectedMethodDetail)}
                </Text>
              </View>

              {selectedMethodDetail.code === "bank_transfer" ? (
                <View style={{ gap: 10 }}>
                  <MetaTile label="BANK" value={selectedMethodDetail.metadata?.bank_name || "-"} />
                  <MetaTile label="NOMOR REKENING" value={selectedMethodDetail.metadata?.account_number || "-"} />
                  <MetaTile label="ATAS NAMA" value={selectedMethodDetail.metadata?.account_name || "-"} />
                </View>
              ) : null}

              {selectedMethodDetail.code === "qris_static" && selectedMethodDetail.metadata?.qr_image_url ? (
                <View style={{ borderRadius: 20, backgroundColor: "#f8fafc", padding: 16 }}>
                  <View style={{ height: 244, borderRadius: 16, overflow: "hidden", backgroundColor: "#ffffff" }}>
                    <Image source={selectedMethodDetail.metadata.qr_image_url} contentFit="contain" style={{ width: "100%", height: "100%" }} />
                  </View>
                </View>
              ) : null}

              {selectedMethodDetail.verification_type !== "auto" ? (
                <View style={{ gap: 12 }}>
                  {selectedMethodRequiresProof ? (
                    <Pressable
                      onPress={() => void uploadProofFromGallery()}
                      disabled={proofUploading}
                      style={{
                        borderRadius: 18,
                        borderWidth: 1,
                        borderStyle: "dashed",
                        borderColor: proofUrl ? "#9bd6ad" : "#d9e2ec",
                        backgroundColor: proofUrl ? "#f4fbf6" : "#f8fafc",
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        gap: 12,
                      }}
                    >
                      {proofLocalUri ? (
                        <View style={{ height: 180, borderRadius: 14, overflow: "hidden", backgroundColor: "#ffffff" }}>
                          <Image source={proofLocalUri} contentFit="cover" style={{ width: "100%", height: "100%" }} />
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" }}>
                            <MaterialIcons name="upload" size={20} color="#2952d9" />
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                              {proofUploading ? "Mengupload..." : "Upload bukti pembayaran"}
                            </Text>
                            <Text selectable style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>
                              Pilih gambar dari galeri agar tenant bisa verifikasi transfer.
                            </Text>
                          </View>
                        </View>
                      )}

                      {proofUrl ? (
                        <Text selectable style={{ color: "#15803d", fontSize: 12, fontWeight: "700" }}>
                          Bukti bayar sudah siap. Tap area ini jika ingin mengganti.
                        </Text>
                      ) : null}
                    </Pressable>
                  ) : null}

                  <Field
                    label={selectedMethodDetail.code === "cash" ? "Catatan cash" : "Catatan transfer"}
                    value={manualPaymentNote}
                    onChangeText={setManualPaymentNote}
                    placeholder={selectedMethodDetail.code === "cash" ? "Contoh: bayar di kasir utama" : "Tambahkan catatan bila perlu"}
                    multiline
                    style={{
                      minHeight: 92,
                      textAlignVertical: "top",
                      paddingTop: 14,
                      paddingBottom: 14,
                    }}
                  />
                </View>
              ) : null}
            </CardBlock>
          ) : null}

          <CtaButton
            label={primaryLabel}
            disabled={processing || proofUploading || !selectedMethodDetail}
            onPress={() => void handlePay()}
          />
        </>
      )}

      {exitActions.primary ? (
        <CtaButton
          label={exitActions.primary.label}
          tone={exitActions.primary.tone}
          onPress={() => handleExitAction(exitActions.primary!)}
        />
      ) : null}

      {exitActions.secondary ? (
        <CtaButton
          label={exitActions.secondary.label}
          tone="secondary"
          onPress={() => handleExitAction(exitActions.secondary!)}
        />
      ) : !exitActions.primary ? (
        <CtaButton label="Kembali" tone="secondary" onPress={goBackToBooking} />
      ) : null}
    </ScreenShell>
  );
}
