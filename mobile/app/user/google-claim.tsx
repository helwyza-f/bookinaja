import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Text, View } from "react-native";
import { apiFetch, ApiError } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { Field } from "@/components/field";
import { ScreenShell } from "@/components/screen-shell";
import { useSession } from "@/providers/session-provider";

type ClaimResponse = {
  message?: string;
  phone?: string;
};

type VerifyResponse = {
  token: string;
};

export default function UserGoogleClaimScreen() {
  const session = useSession();
  const params = useLocalSearchParams<{
    claimToken?: string;
    name?: string;
    email?: string;
  }>();
  const [step, setStep] = useState<"claim" | "otp">("claim");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(typeof params.name === "string" ? params.name : "");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  async function submitClaim() {
    const claimToken = typeof params.claimToken === "string" ? params.claimToken : "";
    if (!claimToken || !phone.replace(/\D/g, "")) {
      Alert.alert("Data belum lengkap", "Nomor WhatsApp wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<ClaimResponse>("/public/customer/google/claim", {
        method: "POST",
        body: JSON.stringify({
          claim_token: claimToken,
          phone: phone.replace(/\D/g, ""),
          name: name.trim(),
        }),
      });
      setPhone(data.phone || phone.replace(/\D/g, ""));
      setStep("otp");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Claim Google gagal.";
      Alert.alert("Gagal", message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (otp.replace(/\D/g, "").length !== 6) {
      Alert.alert("OTP belum lengkap", "Masukkan 6 digit kode verifikasi.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<VerifyResponse>("/public/customer/verify", {
        method: "POST",
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ""),
          code: otp.replace(/\D/g, ""),
        }),
      });
      await session.setCustomerSession(data.token, session.tenantSlug);
      router.replace("/user/me");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "OTP Google belum valid.";
      Alert.alert("Verifikasi gagal", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell
      eyebrow="Google claim"
      title={step === "claim" ? "Lengkapi nomor WhatsApp" : "Verifikasi WhatsApp"}
      description={
        step === "claim"
          ? "Google kamu sudah dikenali. Tambahkan nomor WhatsApp aktif untuk menyelesaikan akun."
          : "Masukkan OTP 6 digit yang kami kirim ke WhatsApp kamu."
      }
    >
      <CardBlock>
        {typeof params.email === "string" && params.email ? (
          <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
            Google email: {params.email}
          </Text>
        ) : null}

        {step === "claim" ? (
          <View style={{ gap: 14 }}>
            <Field label="Nama lengkap" value={name} onChangeText={setName} placeholder="Nama lengkap" />
            <Field
              label="Nomor WhatsApp"
              value={phone}
              onChangeText={(value) => setPhone(value.replace(/\D/g, ""))}
              keyboardType="phone-pad"
              placeholder="08xxxxxxxxxx"
            />
            <CtaButton
              label={loading ? "Mengirim OTP..." : "Lanjutkan dengan OTP"}
              disabled={loading}
              onPress={() => void submitClaim()}
            />
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
              OTP dikirim ke {phone}. Masukkan 6 digit kode untuk mengaktifkan akun Google kamu.
            </Text>
            <Field
              label="OTP 6 digit"
              value={otp}
              onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              placeholder="6 digit"
            />
            <CtaButton
              label={loading ? "Memproses..." : "Aktifkan akun"}
              disabled={loading}
              onPress={() => void verifyOtp()}
            />
          </View>
        )}
      </CardBlock>
    </ScreenShell>
  );
}
