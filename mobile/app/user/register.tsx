import { useState } from "react";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { apiFetch, ApiError } from "@/lib/api";
import { CtaButton } from "@/components/cta-button";
import { Field } from "@/components/field";
import { GoogleLogo } from "@/components/google-logo";
import { getGoogleIdToken } from "@/lib/google-native";
import { useSession } from "@/providers/session-provider";

type RegisterResponse = {
  message?: string;
};

type VerifyResponse = {
  token: string;
};

type CustomerGoogleLoginResponse =
  | {
      status: "authenticated";
      token: string;
    }
  | {
      status: "needs_phone";
      claim_token: string;
      profile?: {
        name?: string;
        email?: string | null;
      };
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
      }}
    >
      {children}
    </View>
  );
}

export default function UserRegisterScreen() {
  const insets = useSafeAreaInsets();
  const session = useSession();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  async function registerGoogle() {
    setLoading(true);
    try {
      const idToken = await getGoogleIdToken();
      const data = await apiFetch<CustomerGoogleLoginResponse>("/public/customer/google/login", {
        method: "POST",
        body: JSON.stringify({ id_token: idToken }),
      });

      if (data.status === "authenticated") {
        await session.setCustomerSession(data.token, session.tenantSlug);
        router.replace("/user/me");
        return;
      }

      router.push({
        pathname: "/user/google-claim",
        params: {
          claimToken: data.claim_token,
          name: data.profile?.name || "",
          email: data.profile?.email || "",
        },
      });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : "Google register belum berhasil.";
      Alert.alert("Google register gagal", message);
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister() {
    if (!name || !phone || !email || !password) {
      Alert.alert("Data belum lengkap", "Lengkapi dulu data customer.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch<RegisterResponse>("/public/customer/register", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.replace(/\D/g, ""),
          email: email.trim(),
          password,
        }),
      });
      setStep("otp");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Pendaftaran gagal.";
      Alert.alert("Gagal", message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (otp.length !== 6) {
      Alert.alert("OTP belum lengkap", "Masukkan 6 digit OTP aktivasi.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<VerifyResponse>("/public/customer/verify", {
        method: "POST",
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ""),
          code: otp,
        }),
      });
      await session.setCustomerSession(data.token, session.tenantSlug);
      router.replace("/user/me");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "OTP aktivasi gagal.";
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
              position: "absolute",
              top: -26,
              right: -46,
              width: 176,
              height: 176,
              borderRadius: 999,
              backgroundColor: "#dbeafe",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: 140,
              left: -54,
              width: 170,
              height: 170,
              borderRadius: 44,
              backgroundColor: "rgba(191,219,254,0.34)",
              transform: [{ rotate: "-16deg" }],
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
              <Text selectable style={{ color: "#1d4ed8", fontSize: 11, fontWeight: "800", letterSpacing: 1.6 }}>
                NEW ACCOUNT
              </Text>
            </View>
            <Text selectable style={{ color: "#0f172a", fontSize: 34, fontWeight: "900", lineHeight: 38 }}>
              Daftar
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 15, lineHeight: 23, maxWidth: "90%" }}>
              Buat akun sekali untuk simpan histori, loyalty, dan booking berikutnya lebih cepat.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(40).duration(320)}>
            <SurfaceCard>
              {step === "form" ? (
                <>
                  <Pressable
                    onPress={() => void registerGoogle()}
                    disabled={loading}
                    style={{
                      borderRadius: 22,
                      backgroundColor: "#ffffff",
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      paddingHorizontal: 16,
                      paddingVertical: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      opacity: loading ? 0.7 : 1,
                      shadowColor: "#0f172a",
                      shadowOpacity: 0.06,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 2,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 14,
                          backgroundColor: "#ffffff",
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: "#e5e7eb",
                        }}
                      >
                        <GoogleLogo />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
                          {loading ? "Memproses..." : "Daftar dengan Google"}
                        </Text>
                        <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                          Jalur tercepat buat akun baru.
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons name="arrow-forward" size={18} color="#2563eb" />
                  </Pressable>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
                    <Text selectable style={{ color: "#94a3b8", fontSize: 12, fontWeight: "700" }}>
                      atau isi manual
                    </Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
                  </View>

                  <View style={{ gap: 14 }}>
                    <Field label="Nama lengkap" value={name} onChangeText={setName} placeholder="Nama lengkap" />
                    <Field
                      label="Nomor WhatsApp"
                      value={phone}
                      onChangeText={(value) => setPhone(value.replace(/\D/g, ""))}
                      keyboardType="phone-pad"
                      placeholder="08xxxxxxxxxx"
                    />
                    <Field
                      label="Email"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholder="nama@domain.com"
                    />
                    <Field
                      label="Password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      placeholder="Buat password"
                    />
                    <CtaButton
                      label={loading ? "Memproses..." : "Lanjut"}
                      disabled={loading}
                      onPress={() => void submitRegister()}
                    />
                  </View>
                </>
              ) : (
                <View style={{ gap: 14 }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 18,
                      backgroundColor: "#e8f0ff",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons name="sms" size={24} color="#1d4ed8" />
                  </View>
                  <View style={{ gap: 4 }}>
                    <Text selectable style={{ color: "#0f172a", fontSize: 22, fontWeight: "900" }}>
                      Verifikasi akun
                    </Text>
                    <Text selectable style={{ color: "#64748b", fontSize: 14, lineHeight: 21 }}>
                      Kami kirim kode ke {phone}. Masukkan 6 digit untuk langsung masuk.
                    </Text>
                  </View>
                  <Field
                    label="Kode OTP"
                    value={otp}
                    onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
                    keyboardType="number-pad"
                    placeholder="6 digit"
                  />
                  <CtaButton
                    label={loading ? "Memproses..." : "Aktivasi akun"}
                    disabled={loading}
                    onPress={() => void verifyOtp()}
                  />
                </View>
              )}
            </SurfaceCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(90).duration(320)}>
            <Pressable
              onPress={() => router.push("/user/login")}
              style={{
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.72)",
                paddingHorizontal: 16,
                paddingVertical: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ gap: 3 }}>
                <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                  Sudah punya akun?
                </Text>
                <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                  Masuk ke akun customer kamu.
                </Text>
              </View>
              <MaterialIcons name="arrow-circle-right" size={22} color="#2563eb" />
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
