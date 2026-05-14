import { useState } from "react";
import { router } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch, ApiError } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { Field } from "@/components/field";
import { ScreenShell } from "@/components/screen-shell";
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

export default function UserRegisterScreen() {
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
      const message = error instanceof ApiError || error instanceof Error
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
    <ScreenShell
      eyebrow="Customer register"
      title="Buat akun Bookinaja."
      description="Di Android, jalur tercepat sekarang native. Kalau tidak, tetap bisa daftar manual lalu aktivasi lewat WhatsApp."
    >
      {step === "form" ? (
        <>
          <LinearGradient
            colors={["#0f172a", "#1d4ed8", "#60a5fa"]}
            style={{
              borderRadius: 28,
              padding: 18,
              gap: 12,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                position: "absolute",
                left: -18,
                bottom: -26,
                width: 112,
                height: 112,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.12)",
              }}
            />
            <Text selectable style={{ color: "#dbeafe", fontSize: 11, fontWeight: "800" }}>
              Android first
            </Text>
            <Text selectable style={{ color: "#ffffff", fontSize: 24, fontWeight: "900", lineHeight: 28 }}>
              Masuk cepat, simpan akun sekali, lanjut booking tanpa putus flow.
            </Text>
            <Text selectable style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 21 }}>
              Google native paling cocok buat emulator Android yang jadi target device kita sekarang.
            </Text>
          </LinearGradient>

          <Pressable
            onPress={() => void registerGoogle()}
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
                {loading ? "Memproses Google..." : "Daftar dengan Google"}
              </Text>
              <Text selectable style={{ color: "#2563eb", fontSize: 14, fontWeight: "700" }}>
                Native
              </Text>
            </View>
            <Text selectable style={{ color: "#334155", fontSize: 14, lineHeight: 22 }}>
              Kalau akun customer belum ada, flow lanjut ke claim nomor WhatsApp di app ini juga.
            </Text>
          </Pressable>
        </>
      ) : null}
      <CardBlock>
        {step === "form" ? (
          <View style={{ gap: 14 }}>
            <Field label="Nama lengkap" value={name} onChangeText={setName} placeholder="Nama lengkap" />
            <Field label="Nomor WhatsApp" value={phone} onChangeText={(value) => setPhone(value.replace(/\D/g, ""))} keyboardType="phone-pad" placeholder="08xxxxxxxxxx" />
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="nama@domain.com" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Buat password" />
            <CtaButton label={loading ? "Memproses..." : "Lanjut verifikasi"} disabled={loading} onPress={() => void submitRegister()} />
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <Text selectable style={{ color: "#475569", fontSize: 14, lineHeight: 22 }}>
              OTP aktivasi sudah dikirim ke {phone}. Masukkan 6 digit kode untuk langsung masuk.
            </Text>
            <Field label="OTP 6 digit" value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" placeholder="6 digit" />
            <CtaButton label={loading ? "Memproses..." : "Aktivasi akun"} disabled={loading} onPress={() => void verifyOtp()} />
          </View>
        )}
        <Pressable onPress={() => router.push("/user/login")}>
          <Text selectable style={{ color: "#1d4ed8", textAlign: "center", fontWeight: "700" }}>
            Sudah punya akun? Masuk
          </Text>
        </Pressable>
      </CardBlock>
    </ScreenShell>
  );
}
