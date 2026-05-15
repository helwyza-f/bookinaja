import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, ApiError } from "@/lib/api";
import { CtaButton } from "@/components/cta-button";
import { Field } from "@/components/field";
import { useSession } from "@/providers/session-provider";

type ClaimResponse = {
  phone?: string;
};

type VerifyResponse = {
  token: string;
};

function SurfaceCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 28,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        backgroundColor: "#ffffff",
        padding: 18,
        gap: 14,
        shadowColor: "#0f172a",
        shadowOpacity: 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 1,
      }}
    >
      {children}
    </View>
  );
}

export default function UserGoogleClaimScreen() {
  const insets = useSafeAreaInsets();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f8ff" }} edges={["top", "right", "bottom", "left"]}>
      <View style={{ flex: 1 }}>
        <View pointerEvents="none" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <View
            style={{
              top: -34,
              right: -40,
              width: 180,
              height: 180,
              borderRadius: 999,
              backgroundColor: "#deebff",
            }}
          />
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingTop: 14,
            paddingBottom: Math.max(insets.bottom, 12) + 24,
            gap: 16,
          }}
        >
          <Animated.View entering={FadeInUp.duration(280)} style={{ gap: 10 }}>
            <View
              style={{
                alignSelf: "flex-start",
                borderRadius: 999,
                backgroundColor: "#e8f0ff",
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text selectable style={{ color: "#1d4ed8", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 }}>
                GOOGLE ACCOUNT
              </Text>
            </View>
            <Text selectable style={{ color: "#0f172a", fontSize: 34, fontWeight: "900", lineHeight: 38 }}>
              {step === "claim" ? "Selesaikan akun" : "Verifikasi"}
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 15, lineHeight: 23, maxWidth: "92%" }}>
              {step === "claim"
                ? "Google kamu sudah dikenali. Tambahkan WhatsApp aktif untuk mengaktifkan akun customer."
                : "Masukkan kode OTP yang kami kirim ke WhatsApp kamu."}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(40).duration(320)}>
            <SurfaceCard>
              {typeof params.email === "string" && params.email ? (
                <View
                  style={{
                    borderRadius: 18,
                    backgroundColor: "#f8fafc",
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Ionicons name="mail-outline" size={18} color="#2563eb" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text selectable style={{ color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1.1 }}>
                      GOOGLE EMAIL
                    </Text>
                    <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "700" }}>
                      {params.email}
                    </Text>
                  </View>
                </View>
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
                    label={loading ? "Mengirim kode..." : "Lanjut"}
                    disabled={loading}
                    onPress={() => void submitClaim()}
                  />
                </View>
              ) : (
                <View style={{ gap: 14 }}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      backgroundColor: "#e8f0ff",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={22} color="#1d4ed8" />
                  </View>
                  <Text selectable style={{ color: "#64748b", fontSize: 14, lineHeight: 21 }}>
                    OTP dikirim ke {phone}. Masukkan 6 digit kode untuk mengaktifkan akun ini.
                  </Text>
                  <Field
                    label="Kode OTP"
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
            </SurfaceCard>
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
