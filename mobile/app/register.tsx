import { useState } from "react";
import { router } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { apiFetch, ApiError } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { Field } from "@/components/field";
import { ScreenShell } from "@/components/screen-shell";
import { getGoogleIdToken } from "@/lib/google-native";
import { useSession } from "@/providers/session-provider";

const CATEGORIES = [
  { id: "gaming_hub", label: "Gaming & Rental", outcome: "Booking per jam dan unit lebih rapi." },
  { id: "creative_space", label: "Studio & Creative", outcome: "Sesi dan follow-up customer lebih jelas." },
  { id: "sport_center", label: "Sport & Courts", outcome: "Slot lapangan dan DP lebih terkendali." },
  { id: "social_space", label: "Social & Office", outcome: "Room booking siap dipakai sejak awal." },
] as const;

type RegisterResponse = {
  token: string;
  tenant: {
    slug: string;
    name: string;
  };
};

type GoogleIdentityResponse = {
  name: string;
  email: string;
  avatar_url?: string | null;
  email_verified: boolean;
};

export default function TenantRegisterScreen() {
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
      const message = error instanceof ApiError || error instanceof Error
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
    <ScreenShell
      eyebrow="Tenant setup"
      title="Buat tenant baru tanpa ribet."
      description="Flow-nya tetap sama dengan web, tapi sekarang diprioritaskan untuk Android: claim identitas bisnis, setup inti, lalu owner access native."
    >
      <Pressable
        onPress={() => void startWithGoogle()}
        disabled={loading}
        style={{
          borderRadius: 24,
          borderWidth: 1,
          borderColor: "#bfdbfe",
          backgroundColor: "#eff6ff",
          paddingHorizontal: 18,
          paddingVertical: 16,
          gap: 6,
          opacity: loading ? 0.7 : 1,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
            {loading ? "Memproses Google..." : googleIdToken ? "Google sudah terhubung" : "Mulai dengan Google"}
          </Text>
          <Text selectable style={{ color: "#2563eb", fontSize: 14, fontWeight: "700" }}>
            Native
          </Text>
        </View>
        <Text selectable style={{ color: "#334155", fontSize: 14, lineHeight: 22 }}>
          Kami ambil nama dan email owner dari Google, lalu lanjutkan onboarding tenant di app ini juga.
        </Text>
      </Pressable>

      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
          {step === 0 ? "1. Bisnis" : step === 1 ? "2. Setup awal" : "3. Akses owner"}
        </Text>
        <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
          {step === 0
            ? "Claim identitas bisnis dulu. Setelah itu tenant sudah punya nama dan URL."
            : step === 1
              ? "Lengkapi konteks operasional yang inti supaya workspace tidak terasa kosong."
              : "Buat akses owner manual di app, atau pakai Google dari auth pusat di atas."}
        </Text>

        {step === 0 ? (
          <Animated.View entering={FadeInUp.duration(320)} style={{ gap: 14 }}>
            <Field label="Nama bisnis" value={businessName} onChangeText={setBusinessName} placeholder="Contoh: Nexus Gaming Hub" />
            <Field label="URL tenant" value={subdomain} onChangeText={setSubdomain} autoCapitalize="none" placeholder="nexus-gaming" hint=".bookinaja.com" />
            <View style={{ gap: 10 }}>
              <Text selectable style={{ color: "#334155", fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" }}>
                Kategori bisnis
              </Text>
              {CATEGORIES.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setCategory(item.id)}
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: category === item.id ? "#60a5fa" : "#cbd5e1",
                    backgroundColor: category === item.id ? "#eff6ff" : "#ffffff",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    gap: 4,
                  }}
                >
                  <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                    {item.label}
                  </Text>
                  <Text selectable style={{ color: "#475569", fontSize: 13, lineHeight: 20 }}>
                    {item.outcome}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {step === 1 ? (
          <Animated.View entering={FadeInUp.duration(320)} style={{ gap: 14 }}>
            <Field label="Tipe bisnis" value={businessType} onChangeText={setBusinessType} placeholder="Contoh: Rental PS5" />
            <Field label="WhatsApp bisnis" value={whatsappNumber} onChangeText={setWhatsappNumber} keyboardType="phone-pad" placeholder="08xxxxxxxxxx" />
            <Field label="Timezone" value={timezone} onChangeText={setTimezone} placeholder="Asia/Jakarta" />
            <Field label="Referral" value={referralCode} onChangeText={setReferralCode} placeholder="Opsional" />
          </Animated.View>
        ) : null}

        {step === 2 ? (
          <Animated.View entering={FadeInUp.duration(320)} style={{ gap: 14 }}>
            <Field label="Nama owner" value={fullName} onChangeText={setFullName} placeholder="Nama owner" />
            <Field label="Email owner" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="owner@bisnis.com" />
            {!googleIdToken ? (
              <Field label="Password owner" value={password} onChangeText={setPassword} secureTextEntry placeholder="Minimal 6 karakter" />
            ) : (
              <View
                style={{
                  borderRadius: 20,
                  backgroundColor: "#eff6ff",
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                }}
              >
                <Text selectable style={{ color: "#1e3a8a", fontSize: 13, lineHeight: 21, fontWeight: "700" }}>
                  Owner access akan memakai Google native. Password manual tidak wajib untuk submit ini.
                </Text>
              </View>
            )}
            <Text selectable style={{ color: "#475569", fontSize: 13, lineHeight: 21 }}>
              {googleIdToken
                ? "Google owner sudah tervalidasi. Kamu tinggal cek ulang data bisnis lalu buat tenant."
                : "Kalau belum pakai Google, jalur manual ini tetap langsung bicara ke backend tenant yang sama."}
            </Text>
          </Animated.View>
        ) : null}

        <View style={{ flexDirection: "row", gap: 10 }}>
          {step > 0 ? (
            <View style={{ flex: 1 }}>
              <CtaButton label="Sebelumnya" tone="secondary" onPress={() => setStep((current) => current - 1)} />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            {step < 2 ? (
              <CtaButton label="Lanjut" onPress={() => setStep((current) => current + 1)} />
            ) : (
              <CtaButton label={loading ? "Menyiapkan..." : "Buat tenant"} disabled={loading} onPress={() => void submitManual()} />
            )}
          </View>
        </View>
      </CardBlock>
    </ScreenShell>
  );
}
