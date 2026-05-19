import { useDeferredValue, useMemo, useState } from "react";
import { Link, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch, ApiError } from "@/lib/api";
import { CardBlock } from "@/components/card-block";
import { CtaButton } from "@/components/cta-button";
import { Field } from "@/components/field";
import { GoogleLogo } from "@/components/google-logo";
import { ScreenShell } from "@/components/screen-shell";
import { StatusPill } from "@/components/admin-primitives";
import { getGoogleIdToken } from "@/lib/google-native";
import { useToast } from "@/providers/toast-provider";
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

function SearchField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#d7dfeb",
        backgroundColor: "#fbfcff",
        paddingHorizontal: 14,
        paddingVertical: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      <MaterialCommunityIcons name="magnify" size={18} color="#64748b" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
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
  );
}

function BusinessRow({
  item,
  active,
  onPress,
}: {
  item: TenantOption;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: active ? "#c7d7ff" : "#e6edf5",
        backgroundColor: active ? "#f5f8ff" : "#ffffff",
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              color: "#0f172a",
              fontSize: 15,
              fontWeight: "800",
            }}
          >
            {item.name}
          </Text>
          <Text style={{ color: "#5b687c", fontSize: 13, lineHeight: 19 }}>
            {item.tagline || item.business_type || item.business_category || item.slug}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <StatusPill label={active ? "Dipilih" : item.slug} tone={active ? "blue" : "slate"} />
        </View>
      </View>
    </Pressable>
  );
}

function GoogleLoginCard({
  loading,
  onPress,
}: {
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={{
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#dbe7ff",
        backgroundColor: "#f8fbff",
        paddingHorizontal: 16,
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        opacity: loading ? 0.7 : 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            backgroundColor: "#ffffff",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <GoogleLogo />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: "#0f172a", fontSize: 15, fontWeight: "800" }}>
            {loading ? "Memproses..." : "Masuk dengan Google"}
          </Text>
          <Text style={{ color: "#5b687c", fontSize: 13, lineHeight: 19 }}>
            Jalur cepat untuk owner dan tim tenant.
          </Text>
        </View>
      </View>
      <MaterialCommunityIcons name="arrow-right" size={18} color="#2563eb" />
    </Pressable>
  );
}

export default function AdminLoginScreen() {
  const session = useSession();
  const { showToast } = useToast();
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
      showToast({
        tone: "warning",
        title: "Pilih bisnis dulu",
        message: "Cari lalu pilih tenant yang ingin kamu kelola.",
      });
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
      showToast({ tone: "error", title: "Google login gagal", message });
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!selectedBusiness?.slug || !email || !password) {
      showToast({
        tone: "warning",
        title: "Data belum lengkap",
        message: "Pilih bisnis, isi email, lalu masukkan password.",
      });
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
      showToast({ tone: "error", title: "Login gagal", message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell
      eyebrow="Admin access"
      title="Masuk ke bisnis"
      description="Pilih tenant dulu, lalu lanjut masuk cepat dengan Google atau email."
    >
      <CardBlock>
        <View style={{ gap: 10 }}>
          <SearchField value={query} onChangeText={setQuery} />

          {selectedBusiness ? (
            <View
              style={{
                borderRadius: 18,
                backgroundColor: "#f8fbff",
                borderWidth: 1,
                borderColor: "#dbe7ff",
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                  {selectedBusiness.name}
                </Text>
                <Text style={{ color: "#5b687c", fontSize: 12 }}>
                  {selectedBusiness.slug}
                </Text>
              </View>
              <StatusPill label="Dipilih" tone="blue" />
            </View>
          ) : null}
        </View>

        <View style={{ gap: 10 }}>
          {tenantsQuery.isLoading ? (
            <View
              style={{
                borderRadius: 18,
                backgroundColor: "#f8fafc",
                paddingHorizontal: 14,
                paddingVertical: 16,
              }}
            >
              <Text style={{ color: "#64748b", fontSize: 13 }}>
                Memuat daftar bisnis...
              </Text>
            </View>
          ) : null}

          {filteredBusinesses.map((item) => (
            <BusinessRow
              key={item.id}
              item={item}
              active={selectedBusiness?.id === item.id}
              onPress={() => setSelectedBusiness(item)}
            />
          ))}

          {!tenantsQuery.isLoading && !filteredBusinesses.length ? (
            <View
              style={{
                borderRadius: 18,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: "#d9e2ee",
                backgroundColor: "#fbfdff",
                paddingHorizontal: 14,
                paddingVertical: 16,
                gap: 4,
              }}
            >
              <Text style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                Bisnis belum ketemu
              </Text>
              <Text style={{ color: "#64748b", fontSize: 13, lineHeight: 19 }}>
                Coba kata kunci lain, atau buat tenant baru kalau belum ada.
              </Text>
            </View>
          ) : null}
        </View>

        <Link href="/register" asChild>
          <Pressable
            style={{
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#e6edf5",
              backgroundColor: "#fbfdff",
              paddingHorizontal: 14,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ gap: 3 }}>
              <Text style={{ color: "#0f172a", fontSize: 14, fontWeight: "800" }}>
                Daftar bisnis baru
              </Text>
              <Text style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>
                Buat tenant baru kalau belum ada di daftar.
              </Text>
            </View>
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#2563eb" />
          </Pressable>
        </Link>
      </CardBlock>

      {selectedBusiness ? (
        <CardBlock>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: "#0f172a", fontSize: 18, fontWeight: "900" }}>
                  {selectedBusiness.name}
                </Text>
                <Text style={{ color: "#5b687c", fontSize: 13, lineHeight: 19 }}>
                  Masuk sebagai owner atau tim tenant untuk bisnis ini.
                </Text>
              </View>
              <StatusPill label={selectedBusiness.slug} tone="slate" />
            </View>

            <GoogleLoginCard loading={loading} onPress={() => void loginGoogle()} />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: "#e6edf5" }} />
            <Text style={{ color: "#94a3b8", fontSize: 12, fontWeight: "700" }}>
              atau email
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "#e6edf5" }} />
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
        </CardBlock>
      ) : null}
    </ScreenShell>
  );
}
