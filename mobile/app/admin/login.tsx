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

type LoginResponse = {
  token: string;
};

export default function AdminLoginScreen() {
  const session = useSession();
  const [tenantSlug, setTenantSlug] = useState(session.tenantSlug || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function loginGoogle() {
    if (!tenantSlug.trim()) {
      Alert.alert("Tenant belum diisi", "Isi tenant slug dulu supaya login Google diarahkan ke tenant yang benar.");
      return;
    }

    setLoading(true);
    try {
      const idToken = await getGoogleIdToken();
      const data = await apiFetch<LoginResponse>("/login/google", {
        method: "POST",
        body: JSON.stringify({
          id_token: idToken,
          tenant_slug: tenantSlug.trim().toLowerCase(),
        }),
      });
      await session.setAdminSession(data.token, tenantSlug.trim().toLowerCase());
      router.replace("/admin/dashboard");
    } catch (error) {
      const message = error instanceof ApiError || error instanceof Error
        ? error.message
        : "Login Google admin gagal.";
      Alert.alert("Google login gagal", message);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!tenantSlug || !email || !password) {
      Alert.alert("Data belum lengkap", "Tenant, email, dan password wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<LoginResponse>("/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          tenant_slug: tenantSlug.trim().toLowerCase(),
        }),
      });
      await session.setAdminSession(data.token, tenantSlug.trim().toLowerCase());
      router.replace("/admin/dashboard");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Login admin gagal.";
      Alert.alert("Login gagal", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell
      eyebrow="Admin tenant"
      title="Login tenant, satu jalur."
      description="Untuk Android emulator, login owner dan staff sekarang native penuh. Tenant slug tetap jadi penentu workspace."
    >
      <LinearGradient
        colors={["#08111f", "#0f3c8c", "#2563eb"]}
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
            right: -18,
            top: -18,
            width: 108,
            height: 108,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.12)",
          }}
        />
        <Text selectable style={{ color: "#dbeafe", fontSize: 11, fontWeight: "800" }}>
          Owner access
        </Text>
        <Text selectable style={{ color: "#ffffff", fontSize: 24, fontWeight: "900", lineHeight: 28 }}>
          Masuk ke dashboard tenant langsung dari app.
        </Text>
        <Text selectable style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 21 }}>
          Google native tetap first-class, tapi tenant slug tetap wajib supaya backend tahu workspace admin yang dituju.
        </Text>
      </LinearGradient>
      <CardBlock>
        <Field label="Tenant slug" value={tenantSlug} onChangeText={setTenantSlug} autoCapitalize="none" placeholder="gaming-demo" />
        <Pressable
          onPress={() => void loginGoogle()}
          disabled={loading}
          style={{
            borderRadius: 22,
            borderWidth: 1,
            borderColor: "#bfdbfe",
            backgroundColor: "#eff6ff",
            paddingHorizontal: 16,
            paddingVertical: 15,
            gap: 6,
            opacity: loading ? 0.7 : 1,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Text selectable style={{ color: "#0f172a", fontSize: 16, fontWeight: "800" }}>
              {loading ? "Memproses Google..." : "Masuk dengan Google"}
            </Text>
            <Text selectable style={{ color: "#2563eb", fontSize: 14, fontWeight: "700" }}>
              Native
            </Text>
          </View>
          <Text selectable style={{ color: "#334155", fontSize: 14, lineHeight: 22 }}>
            Cocok buat owner atau staff yang akunnya sudah terhubung ke Google di tenant ini.
          </Text>
        </Pressable>
      </CardBlock>
      <CardBlock>
        <Text selectable style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>
          Login manual di app
        </Text>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="admin@bookinaja.com" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Kata sandi admin" />
        <CtaButton label={loading ? "Memverifikasi..." : "Masuk"} disabled={loading} onPress={() => void submit()} />
      </CardBlock>
    </ScreenShell>
  );
}
