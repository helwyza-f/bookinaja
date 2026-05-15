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

type Mode = "wa" | "email";

type CustomerVerifyResponse = {
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

function GoogleMark() {
  return (
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
  );
}

export default function UserLoginScreen() {
  const insets = useSafeAreaInsets();
  const session = useSession();
  const [mode, setMode] = useState<Mode>("wa");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestOtp() {
    if (phone.replace(/\D/g, "").length < 9) {
      Alert.alert("Nomor belum valid", "Isi nomor WhatsApp yang terdaftar.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/public/customer/login", {
        method: "POST",
        body: JSON.stringify({ phone: phone.replace(/\D/g, "") }),
      });
      setOtpStep(true);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "OTP gagal dikirim.";
      Alert.alert("Gagal", message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (otp.length !== 6) {
      Alert.alert("OTP belum lengkap", "Masukkan 6 digit kode verifikasi.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<CustomerVerifyResponse>("/public/customer/verify", {
        method: "POST",
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ""),
          code: otp,
        }),
      });
      await session.setCustomerSession(data.token, session.tenantSlug);
      router.replace("/user/me");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "OTP tidak valid.";
      Alert.alert("Verifikasi gagal", message);
    } finally {
      setLoading(false);
    }
  }

  async function loginEmail() {
    if (!email || !password) {
      Alert.alert("Data belum lengkap", "Isi email dan password customer.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<CustomerVerifyResponse>("/public/customer/login-email", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      await session.setCustomerSession(data.token, session.tenantSlug);
      router.replace("/user/me");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Login email gagal.";
      Alert.alert("Login gagal", message);
    } finally {
      setLoading(false);
    }
  }

  async function loginGoogle() {
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
          : "Google login belum berhasil.";
      Alert.alert("Google login gagal", message);
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
              top: -36,
              right: -42,
              width: 180,
              height: 180,
              borderRadius: 999,
              backgroundColor: "#dbeafe",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: 108,
              left: -60,
              width: 180,
              height: 180,
              borderRadius: 48,
              backgroundColor: "rgba(191,219,254,0.36)",
              transform: [{ rotate: "-18deg" }],
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
                BOOKINAJA
              </Text>
            </View>
            <Text selectable style={{ color: "#0f172a", fontSize: 34, fontWeight: "900", lineHeight: 38 }}>
              Masuk
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 15, lineHeight: 23, maxWidth: "90%" }}>
              Akses booking, status sesi, dan transaksi dari satu akun customer.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(40).duration(320)}>
            <SurfaceCard>
              <Pressable
                onPress={() => void loginGoogle()}
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
                  <GoogleMark />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
                      {loading ? "Memproses..." : "Lanjut dengan Google"}
                    </Text>
                    <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                      Jalur tercepat untuk customer.
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="arrow-forward" size={18} color="#2563eb" />
              </Pressable>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
                <Text selectable style={{ color: "#94a3b8", fontSize: 12, fontWeight: "700" }}>
                  atau
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
              </View>

              <View
                style={{
                  borderRadius: 18,
                  backgroundColor: "#f8fafc",
                  padding: 6,
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                {[
                  { key: "wa" as const, label: "WhatsApp" },
                  { key: "email" as const, label: "Email" },
                ].map((item) => {
                  const active = mode === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => {
                        setMode(item.key);
                        if (item.key === "wa") setOtpStep(false);
                      }}
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        backgroundColor: active ? "#ffffff" : "transparent",
                        paddingVertical: 12,
                        alignItems: "center",
                        shadowColor: active ? "#020617" : "transparent",
                        shadowOpacity: active ? 0.05 : 0,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 3 },
                        elevation: active ? 2 : 0,
                      }}
                    >
                      <Text selectable style={{ color: active ? "#0f172a" : "#64748b", fontSize: 14, fontWeight: "800" }}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {mode === "wa" ? (
                <View style={{ gap: 14 }}>
                  <View style={{ gap: 4 }}>
                    <Text selectable style={{ color: "#0f172a", fontSize: 20, fontWeight: "900" }}>
                      {otpStep ? "Verifikasi kode" : "Masuk pakai WhatsApp"}
                    </Text>
                    <Text selectable style={{ color: "#64748b", fontSize: 14, lineHeight: 21 }}>
                      {otpStep
                        ? "Masukkan 6 digit kode yang kami kirim ke WhatsApp kamu."
                        : "Cepat, tanpa password, dan cocok untuk customer yang sering booking."}
                    </Text>
                  </View>
                  <Field
                    label="Nomor WhatsApp"
                    value={phone}
                    onChangeText={(value) => setPhone(value.replace(/\D/g, ""))}
                    keyboardType="phone-pad"
                    placeholder="08xxxxxxxxxx"
                  />
                  {otpStep ? (
                    <Field
                      label="Kode OTP"
                      value={otp}
                      onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
                      keyboardType="number-pad"
                      placeholder="6 digit"
                    />
                  ) : null}
                  <CtaButton
                    label={loading ? "Memproses..." : otpStep ? "Verifikasi" : "Kirim kode"}
                    disabled={loading}
                    onPress={() => {
                      void (otpStep ? verifyOtp() : requestOtp());
                    }}
                  />
                </View>
              ) : (
                <View style={{ gap: 14 }}>
                  <View style={{ gap: 4 }}>
                    <Text selectable style={{ color: "#0f172a", fontSize: 20, fontWeight: "900" }}>
                      Masuk pakai email
                    </Text>
                    <Text selectable style={{ color: "#64748b", fontSize: 14, lineHeight: 21 }}>
                      Untuk akun yang sudah punya email dan password customer.
                    </Text>
                  </View>
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
                    placeholder="Kata sandi"
                  />
                  <CtaButton
                    label={loading ? "Memproses..." : "Masuk"}
                    disabled={loading}
                    onPress={() => void loginEmail()}
                  />
                </View>
              )}
            </SurfaceCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(90).duration(320)}>
            <View
              style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                backgroundColor: "rgba(255,255,255,0.78)",
                padding: 12,
                gap: 8,
                shadowColor: "#0f172a",
                shadowOpacity: 0.04,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 1,
              }}
            >
              <Pressable
                onPress={() => router.push("/user/register")}
                style={{
                  borderRadius: 18,
                  paddingHorizontal: 8,
                  paddingVertical: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ gap: 3 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                    Belum punya akun?
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                    Daftar sekali, lalu pakai terus.
                  </Text>
                </View>
                <MaterialIcons name="arrow-circle-right" size={22} color="#2563eb" />
              </Pressable>

              <View style={{ height: 1, backgroundColor: "#edf2f7" }} />

              <Pressable
                onPress={() => router.push("/admin/login")}
                style={{
                  borderRadius: 18,
                  paddingHorizontal: 8,
                  paddingVertical: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ gap: 3 }}>
                  <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                    Masuk sebagai bisnis
                  </Text>
                  <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                    Untuk owner atau tim tenant.
                  </Text>
                </View>
                <MaterialIcons name="business" size={20} color="#2563eb" />
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
