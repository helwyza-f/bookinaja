import { useState } from "react";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, ApiError } from "@/lib/api";
import { CtaButton } from "@/components/cta-button";
import { Field } from "@/components/field";
import { getGoogleIdToken } from "@/lib/google-native";
import { useSession } from "@/providers/session-provider";

const CATEGORIES = [
  { id: "gaming_hub", label: "Gaming", outcome: "Booking per jam dan unit lebih rapi." },
  { id: "creative_space", label: "Creative", outcome: "Sesi dan follow-up lebih tertata." },
  { id: "sport_center", label: "Sport", outcome: "Slot lapangan lebih terkendali." },
  { id: "social_space", label: "Office", outcome: "Room booking siap dipakai cepat." },
] as const;

type RegisterResponse = {
  token: string;
  tenant: {
    slug: string;
  };
};

type GoogleIdentityResponse = {
  name: string;
  email: string;
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
      <Text selectable style={{ fontSize: 22, fontWeight: "900", lineHeight: 24 }}>
        <Text style={{ color: "#4285F4" }}>G</Text>
        <Text style={{ color: "#34A853" }}>•</Text>
        <Text style={{ color: "#FBBC05" }}>•</Text>
        <Text style={{ color: "#EA4335" }}>•</Text>
      </Text>
    </View>
  );
}

export default function TenantRegisterScreen() {
  const insets = useSafeAreaInsets();
  const session = useSession();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("gaming_hub");
  const [businessName, setBusinessName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [googleIdToken, setGoogleIdToken] = useState("");

  async function startWithGoogle() {
    setLoading(true);
    try {
      const idToken = await getGoogleIdToken();
      const profile = await apiFetch<GoogleIdentityResponse>("/register/google/identity", {
        method: "POST",
        body: JSON.stringify({ id_token: idToken }),
      });
      setGoogleIdToken(idToken);
      setFullName(profile.name || fullName);
      setEmail(profile.email || email);
      setStep(2);
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : "Google setup belum berhasil.";
      Alert.alert("Google setup gagal", message);
    } finally {
      setLoading(false);
    }
  }

  async function submitManual() {
    if (!businessName || !subdomain || !fullName || !email || (!googleIdToken && !password)) {
      Alert.alert("Data belum lengkap", "Isi nama bisnis, subdomain, dan akses owner dulu.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<RegisterResponse>("/register", {
        method: "POST",
        body: JSON.stringify({
          tenant_name: businessName.trim(),
          tenant_slug: subdomain.trim().toLowerCase(),
          business_category: category,
          business_type: businessType.trim() || category,
          bootstrap_mode: "starter",
          referral_code: referralCode.trim(),
          admin_name: fullName.trim(),
          admin_email: email.trim(),
          admin_password: googleIdToken ? "" : password,
          google_id_token: googleIdToken,
          whatsapp_number: whatsappNumber.trim(),
          timezone,
        }),
      });

      await session.setAdminSession(data.token, data.tenant.slug);
      router.replace("/admin/dashboard");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Registrasi tenant belum berhasil.";
      Alert.alert("Registrasi gagal", message);
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
              top: -36,
              right: -44,
              width: 184,
              height: 184,
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
                NEW BUSINESS
              </Text>
            </View>
            <Text selectable style={{ color: "#0f172a", fontSize: 34, fontWeight: "900", lineHeight: 38 }}>
              Buat tenant
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 15, lineHeight: 23, maxWidth: "92%" }}>
              Tiga langkah singkat untuk mulai kelola booking bisnis langsung dari app.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(40).duration(320)} style={{ gap: 12 }}>
            <SurfaceCard>
              <Pressable
                onPress={() => void startWithGoogle()}
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
                      {loading ? "Memproses..." : googleIdToken ? "Google sudah terhubung" : "Mulai dengan Google"}
                    </Text>
                    <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                      Ambil data owner lebih cepat dan lanjutkan setup di app.
                    </Text>
                  </View>
                </View>
                <Ionicons name="arrow-forward" size={18} color="#2563eb" />
              </Pressable>

              <View style={{ flexDirection: "row", gap: 8 }}>
                {["Bisnis", "Setup", "Owner"].map((label, index) => {
                  const active = step === index;
                  const done = step > index;
                  return (
                    <View
                      key={label}
                      style={{
                        flex: 1,
                        borderRadius: 16,
                        backgroundColor: active ? "#e8f0ff" : "#f8fafc",
                        paddingHorizontal: 12,
                        paddingVertical: 11,
                        gap: 2,
                      }}
                    >
                      <Text selectable style={{ color: done || active ? "#1d4ed8" : "#94a3b8", fontSize: 11, fontWeight: "800" }}>
                        {done ? "DONE" : `STEP ${index + 1}`}
                      </Text>
                      <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {step === 0 ? (
                <View style={{ gap: 14 }}>
                  <Field label="Nama bisnis" value={businessName} onChangeText={setBusinessName} placeholder="Contoh: Nexus Gaming Hub" />
                  <Field label="Slug tenant" value={subdomain} onChangeText={setSubdomain} autoCapitalize="none" placeholder="nexus-gaming" />
                  <View style={{ gap: 8 }}>
                    <Text selectable style={{ color: "#334155", fontSize: 11, fontWeight: "800", letterSpacing: 1.1, textTransform: "uppercase" }}>
                      Kategori
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {CATEGORIES.map((item) => {
                        const active = category === item.id;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => setCategory(item.id)}
                            style={{
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor: active ? "#2952d9" : "#d6deea",
                              backgroundColor: active ? "#eef3ff" : "#ffffff",
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                            }}
                          >
                            <Text selectable style={{ color: active ? "#2952d9" : "#0f172a", fontSize: 13, fontWeight: "800" }}>
                              {item.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                      {CATEGORIES.find((item) => item.id === category)?.outcome}
                    </Text>
                  </View>
                </View>
              ) : null}

              {step === 1 ? (
                <View style={{ gap: 14 }}>
                  <Field label="Tipe bisnis" value={businessType} onChangeText={setBusinessType} placeholder="Contoh: Rental PS5" />
                  <Field label="WhatsApp bisnis" value={whatsappNumber} onChangeText={setWhatsappNumber} keyboardType="phone-pad" placeholder="08xxxxxxxxxx" />
                  <Field label="Timezone" value={timezone} onChangeText={setTimezone} placeholder="Asia/Jakarta" />
                  <Field label="Referral" value={referralCode} onChangeText={setReferralCode} placeholder="Opsional" />
                </View>
              ) : null}

              {step === 2 ? (
                <View style={{ gap: 14 }}>
                  <Field label="Nama owner" value={fullName} onChangeText={setFullName} placeholder="Nama owner" />
                  <Field label="Email owner" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="owner@bisnis.com" />
                  {!googleIdToken ? (
                    <Field label="Password owner" value={password} onChangeText={setPassword} secureTextEntry placeholder="Minimal 6 karakter" />
                  ) : (
                    <View
                      style={{
                        borderRadius: 18,
                        backgroundColor: "#f8fafc",
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                      }}
                    >
                      <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 20 }}>
                        Google owner sudah aktif. Password manual tidak wajib untuk step ini.
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}

              <View style={{ flexDirection: "row", gap: 10 }}>
                {step > 0 ? (
                  <View style={{ flex: 1 }}>
                    <CtaButton label="Kembali" tone="secondary" onPress={() => setStep((current) => current - 1)} />
                  </View>
                ) : null}
                <View style={{ flex: 1 }}>
                  {step < 2 ? (
                    <CtaButton label="Lanjut" onPress={() => setStep((current) => current + 1)} />
                  ) : (
                    <CtaButton
                      label={loading ? "Menyiapkan..." : "Buat tenant"}
                      disabled={loading}
                      onPress={() => void submitManual()}
                    />
                  )}
                </View>
              </View>
            </SurfaceCard>
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
