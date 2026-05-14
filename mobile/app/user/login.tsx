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

type Mode = "wa" | "email";

type CustomerVerifyResponse = {
  token: string;
};

type CustomerGoogleLoginResponse =
  | {
      status: "authenticated";
      token: string;
      customer?: {
        id?: string;
        name?: string;
      };
      message?: string;
    }
  | {
      status: "needs_phone";
      claim_token: string;
      profile?: {
        name?: string;
        email?: string | null;
      };
      message?: string;
    };

export default function UserLoginScreen() {
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
      const message = error instanceof ApiError || error instanceof Error
        ? error.message
        : "Google login belum berhasil.";
      Alert.alert("Google login gagal", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell
      eyebrow="Customer access"
      title="Masuk dan lanjutkan booking tanpa ribet."
      description="Google tetap paling depan. Kalau mau cepat, pakai WhatsApp OTP. Kalau sudah punya akun, tinggal email dan password."
    >
      <LinearGradient
        colors={["#0f172a", "#1d4ed8", "#60a5fa"]}
        style={{
          borderRadius: 28,
          padding: 18,
          gap: 14,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            right: -22,
            top: -12,
            width: 124,
            height: 124,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.12)",
          }}
        />
        <View
          style={{
            alignSelf: "flex-start",
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.12)",
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Text selectable style={{ color: "#dbeafe", fontSize: 11, fontWeight: "800" }}>
            Customer portal
          </Text>
        </View>
        <Text selectable style={{ color: "#ffffff", fontSize: 24, fontWeight: "900", lineHeight: 28 }}>
          Booking, bayar, dan cek sesi aktif dari satu tempat.
        </Text>
        <Text selectable style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 21 }}>
          Struktur flow tetap sama seperti di web, tapi dipadatkan supaya terasa cepat dipakai di mobile.
        </Text>
      </LinearGradient>

      <Pressable
        onPress={() => void loginGoogle()}
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
            {loading ? "Memproses Google..." : "Lanjut dengan Google"}
          </Text>
          <Text selectable style={{ color: "#2563eb", fontSize: 14, fontWeight: "700" }}>
            Native
          </Text>
        </View>
        <Text selectable style={{ color: "#334155", fontSize: 14, lineHeight: 22 }}>
          Masuk paling cepat dengan akun Google langsung dari Android emulator.
        </Text>
      </Pressable>
      <CardBlock>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => {
              setMode("wa");
              setOtpStep(false);
            }}
            style={{
              flex: 1,
              borderRadius: 999,
              backgroundColor: mode === "wa" ? "#1d4ed8" : "#e2e8f0",
              paddingVertical: 12,
            }}
          >
            <Text selectable style={{ textAlign: "center", color: mode === "wa" ? "#ffffff" : "#0f172a", fontWeight: "800" }}>
              WhatsApp
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("email")}
            style={{
              flex: 1,
              borderRadius: 999,
              backgroundColor: mode === "email" ? "#1d4ed8" : "#e2e8f0",
              paddingVertical: 12,
            }}
          >
            <Text selectable style={{ textAlign: "center", color: mode === "email" ? "#ffffff" : "#0f172a", fontWeight: "800" }}>
              Email
            </Text>
          </Pressable>
        </View>

        {mode === "wa" ? (
          <View style={{ gap: 14 }}>
            <Text selectable style={{ color: "#475569", fontSize: 13, lineHeight: 20 }}>
              {otpStep
                ? "Masukkan 6 digit kode yang barusan kami kirim ke WhatsApp kamu."
                : "Pakai nomor WhatsApp untuk akses paling cepat tanpa perlu ingat password."}
            </Text>
            <Field label="Nomor WhatsApp" value={phone} onChangeText={(value) => setPhone(value.replace(/\D/g, ""))} keyboardType="phone-pad" placeholder="08xxxxxxxxxx" />
            {otpStep ? (
              <Field label="OTP 6 digit" value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" placeholder="6 digit" />
            ) : null}
            <CtaButton
              label={loading ? "Memproses..." : otpStep ? "Verifikasi OTP" : "Kirim OTP"}
              disabled={loading}
              onPress={() => {
                void (otpStep ? verifyOtp() : requestOtp());
              }}
            />
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <Text selectable style={{ color: "#475569", fontSize: 13, lineHeight: 20 }}>
              Masuk dengan email yang sudah kamu pakai di Bookinaja.
            </Text>
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="nama@domain.com" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Kata sandi" />
            <CtaButton label={loading ? "Memproses..." : "Masuk"} disabled={loading} onPress={() => void loginEmail()} />
          </View>
        )}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[
            "Google untuk akses lintas device",
            "WhatsApp untuk OTP instan",
            "Email kalau akunmu sudah siap",
          ].map((item) => (
            <View
              key={item}
              style={{
                borderRadius: 999,
                backgroundColor: "#f8fafc",
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            >
              <Text selectable style={{ color: "#475569", fontSize: 12, fontWeight: "700" }}>
                {item}
              </Text>
            </View>
          ))}
        </View>

        <Pressable onPress={() => router.push("/user/register")}>
          <Text selectable style={{ color: "#1d4ed8", textAlign: "center", fontWeight: "700" }}>
            Belum punya akun? Daftar
          </Text>
        </Pressable>
      </CardBlock>
    </ScreenShell>
  );
}
