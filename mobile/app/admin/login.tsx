import { useDeferredValue, useMemo, useState } from "react";
import { Link, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import { apiFetch, ApiError } from "@/lib/api";
import { CtaButton } from "@/components/cta-button";
import { Field } from "@/components/field";
import { GoogleLogo } from "@/components/google-logo";
import { getGoogleIdToken } from "@/lib/google-native";
import { useSession } from "@/providers/session-provider";

type LoginResponse = {
  token: string;
};

type TenantOption = {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  business_category?: string;
  business_type?: string;
};

type TenantListResponse = {
  items: TenantOption[];
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
      <GoogleLogo />
    </View>
  );
}

export default function AdminLoginScreen() {
  const session = useSession();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedBusiness, setSelectedBusiness] = useState<TenantOption | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const tenantsQuery = useQuery({
    queryKey: ["public-tenants"],
    queryFn: () => apiFetch<TenantListResponse>("/public/tenants"),
  });

  const filteredBusinesses = useMemo(() => {
    const items = tenantsQuery.data?.items || [];
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) {
      return items.slice(0, 8);
    }
    return items
      .filter((item) =>
        `${item.name} ${item.slug} ${item.business_category || ""} ${item.business_type || ""} ${item.tagline || ""}`
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 12);
  }, [deferredQuery, tenantsQuery.data?.items]);

  async function loginGoogle() {
    if (!selectedBusiness?.slug) {
      Alert.alert("Pilih bisnis dulu", "Cari lalu pilih bisnis yang ingin kamu kelola.");
      return;
    }

    setLoading(true);
    try {
      const idToken = await getGoogleIdToken();
      const data = await apiFetch<LoginResponse>("/login/google", {
        method: "POST",
        body: JSON.stringify({
          id_token: idToken,
          tenant_slug: selectedBusiness.slug,
        }),
      });
      await session.setAdminSession(data.token, selectedBusiness.slug);
      router.replace("/admin/dashboard");
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : "Login Google admin gagal.";
      Alert.alert("Google login gagal", message);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!selectedBusiness?.slug || !email || !password) {
      Alert.alert("Data belum lengkap", "Pilih bisnis, isi email, dan password terlebih dulu.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<LoginResponse>("/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          tenant_slug: selectedBusiness.slug,
        }),
      });
      await session.setAdminSession(data.token, selectedBusiness.slug);
      router.replace("/admin/dashboard");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Login admin gagal.";
      Alert.alert("Login gagal", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f8ff" }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1 }}>
        <View pointerEvents="none" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <View
            style={{
              top: -38,
              right: -42,
              width: 184,
              height: 184,
              borderRadius: 999,
              backgroundColor: "#deebff",
            }}
          />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 42, gap: 16 }}>
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
                BUSINESS LOGIN
              </Text>
            </View>
            <Text selectable style={{ color: "#0f172a", fontSize: 34, fontWeight: "900", lineHeight: 38 }}>
              Cari bisnis
            </Text>
            <Text selectable style={{ color: "#64748b", fontSize: 15, lineHeight: 23, maxWidth: "92%" }}>
              Temukan bisnis yang ingin kamu kelola, lalu lanjut masuk sebagai owner atau tim tenant.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(40).duration(320)} style={{ gap: 12 }}>
            <SurfaceCard>
              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#d6deea",
                  backgroundColor: "#fbfdff",
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <MaterialIcons name="search" size={18} color="#64748b" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Cari nama bisnis atau slug"
                  placeholderTextColor="#94a3b8"
                  style={{
                    flex: 1,
                    color: "#0f172a",
                    fontSize: 15,
                    paddingVertical: 10,
                  }}
                />
              </View>

              <View style={{ gap: 10 }}>
                {filteredBusinesses.map((item) => {
                  const active = selectedBusiness?.id === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedBusiness(item)}
                      style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: active ? "#2952d9" : "#e2e8f0",
                        backgroundColor: active ? "#eef3ff" : "#ffffff",
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        gap: 4,
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                            {item.name}
                          </Text>
                          <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
                            {item.tagline || item.business_type || item.business_category || item.slug}
                          </Text>
                        </View>
                        <View
                          style={{
                            alignSelf: "flex-start",
                            borderRadius: 999,
                            backgroundColor: active ? "#dbe7ff" : "#f8fafc",
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                          }}
                        >
                          <Text selectable style={{ color: active ? "#2952d9" : "#64748b", fontSize: 12, fontWeight: "800" }}>
                            {item.slug}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}

                {!tenantsQuery.isLoading && !filteredBusinesses.length ? (
                  <View
                    style={{
                      borderRadius: 20,
                      backgroundColor: "#f8fafc",
                      paddingHorizontal: 14,
                      paddingVertical: 16,
                      gap: 4,
                    }}
                  >
                    <Text selectable style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                      Bisnis belum ketemu
                    </Text>
                    <Text selectable style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
                      Coba kata kunci lain, atau daftar bisnis baru kalau tenant kamu belum ada.
                    </Text>
                  </View>
                ) : null}
              </View>

              <Link href="/register" asChild>
                <Pressable
                  style={{
                    borderRadius: 18,
                    backgroundColor: "#f8fafc",
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <View style={{ gap: 3 }}>
                    <Text selectable style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
                      Daftar bisnis baru
                    </Text>
                    <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                      Buat tenant baru kalau belum ada di daftar.
                    </Text>
                  </View>
                  <MaterialIcons name="add-circle-outline" size={20} color="#2563eb" />
                </Pressable>
              </Link>
            </SurfaceCard>

            {selectedBusiness ? (
              <SurfaceCard>
                <View
                  style={{
                    borderRadius: 20,
                    backgroundColor: "#0f172a",
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                    gap: 4,
                  }}
                >
                  <Text selectable style={{ color: "#93c5fd", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }}>
                    BISNIS TERPILIH
                  </Text>
                  <Text selectable style={{ color: "#ffffff", fontSize: 20, fontWeight: "900" }}>
                    {selectedBusiness.name}
                  </Text>
                  <Text selectable style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
                    {selectedBusiness.slug}
                  </Text>
                </View>

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
                        {loading ? "Memproses..." : "Masuk dengan Google"}
                      </Text>
                      <Text selectable style={{ color: "#64748b", fontSize: 13 }}>
                        Jalur cepat untuk akun bisnis yang sudah aktif.
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="arrow-forward" size={18} color="#2563eb" />
                </Pressable>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
                  <Text selectable style={{ color: "#94a3b8", fontSize: 12, fontWeight: "700" }}>
                    atau login manual
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
                </View>

                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="admin@bisnis.com"
                />
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Kata sandi"
                />
                <CtaButton
                  label={loading ? "Memverifikasi..." : "Masuk"}
                  disabled={loading}
                  onPress={() => void submit()}
                />
              </SurfaceCard>
            ) : null}
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
