import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { ScreenShell } from "@/components/screen-shell";
import { useSessionStore } from "@/stores/session-store";
import { useAppTheme } from "@/theme";
import {
  useCustomerEmailLoginMutation,
  useCustomerGoogleLoginMutation,
} from "@/features/auth/mutations";
import { configureGoogleNativeSignIn, getGoogleIdToken } from "@/features/auth/google-native";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginScreen() {
  const theme = useAppTheme();
  const signInAsRole = useSessionStore((state) => state.signInAsRole);
  const customerLogin = useCustomerEmailLoginMutation();
  const googleLogin = useCustomerGoogleLoginMutation();
  const [googleAuthError, setGoogleAuthError] = useState("");
  const { control, handleSubmit } = useForm<LoginForm>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    configureGoogleNativeSignIn();
  }, []);

  const handleSignIn = async (role: "customer" | "admin") => {
    await signInAsRole({
      role,
      token: `demo-${role}-token`,
      tenantSlug: "gaming-demo",
      tenantId: "tenant-demo",
      customerId: role === "customer" ? "customer-demo" : null,
      adminName: role === "admin" ? "Gaming Demo Admin" : null,
    });

    router.replace(role === "admin" ? "/(admin)/(tabs)" : "/(customer)/(tabs)");
  };

  const onSubmitCustomer = handleSubmit(async (values) => {
    await customerLogin.mutateAsync(values);
    router.replace("/(customer)/(tabs)");
  });

  const handleGoogleSignIn = async () => {
    try {
      setGoogleAuthError("");
      const idToken = await getGoogleIdToken();
      const result = await googleLogin.mutateAsync(idToken);
      if (result.status === "authenticated") {
        router.replace("/(customer)/(tabs)");
        return;
      }
      router.push({
        pathname: "/(auth)/google-claim",
        params: {
          claimToken: result.claim_token,
          name: result.profile?.name || "",
          email: result.profile?.email || "",
        },
      });
    } catch (error) {
      setGoogleAuthError(
        error instanceof Error ? error.message : "Google login belum berhasil.",
      );
    }
  };

  return (
    <ScreenShell
      eyebrow="Bookinaja Mobile"
      title="Masuk"
      subtitle="Lanjutkan booking, cek pembayaran, dan akses sesi aktifmu."
    >
      <View style={styles.stack}>
        <View
          style={[
            styles.panel,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: theme.colors.foreground }]}>Masuk sebagai Customer</Text>
            <Text style={[styles.panelHint, { color: theme.colors.foregroundMuted }]}>
              Gunakan email yang sudah terdaftar di Bookinaja.
            </Text>
          </View>
          <Controller
            control={control}
            name="email"
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Email"
                placeholderTextColor={theme.colors.foregroundMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.foreground,
                  },
                ]}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Password"
                placeholderTextColor={theme.colors.foregroundMuted}
                secureTextEntry
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.foreground,
                  },
                ]}
              />
            )}
          />
          <Pressable
            onPress={() => void onSubmitCustomer()}
            disabled={customerLogin.isPending}
            style={[
              styles.submit,
              {
                backgroundColor: theme.colors.accent,
                opacity: customerLogin.isPending ? 0.8 : 1,
              },
            ]}
          >
            <Text style={styles.submitText}>
              {customerLogin.isPending ? "Masuk..." : "Masuk Customer"}
            </Text>
          </Pressable>
          {customerLogin.error ? (
            <Text style={[styles.error, { color: theme.colors.danger }]}>
              {customerLogin.error instanceof Error ? customerLogin.error.message : "Login gagal"}
            </Text>
          ) : null}

          <Pressable onPress={() => router.push("/(auth)/login-phone")} hitSlop={8} style={styles.secondaryLinkWrap}>
            <Text style={[styles.secondaryLink, { color: theme.colors.accent }]}>Masuk via No. HP dan OTP</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              void handleGoogleSignIn();
            }}
            disabled={googleLogin.isPending}
            style={[
              styles.googleButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: googleLogin.isPending ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.googleButtonText, { color: theme.colors.foreground }]}>
              {googleLogin.isPending ? "Memproses Google..." : "Masuk dengan Google"}
            </Text>
          </Pressable>
          {googleAuthError ? (
            <Text style={[styles.error, { color: theme.colors.danger }]}>{googleAuthError}</Text>
          ) : googleLogin.error ? (
            <Text style={[styles.error, { color: theme.colors.danger }]}>
              {googleLogin.error instanceof Error ? googleLogin.error.message : "Google login gagal"}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.adminRow,
            {
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.adminCopy}>
            <Text style={[styles.adminLabel, { color: theme.colors.foreground }]}>Login admin</Text>
            <Text style={[styles.adminHint, { color: theme.colors.foregroundMuted }]}>
              Untuk staff atau owner tenant.
            </Text>
          </View>
          <Pressable onPress={() => void handleSignIn("admin")} hitSlop={8}>
            <Text style={[styles.adminLink, { color: theme.colors.accent }]}>Masuk</Text>
          </Pressable>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  panelHeader: {
    gap: 4,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  panelHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  submit: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  error: {
    fontSize: 12,
    lineHeight: 17,
  },
  secondaryLinkWrap: {
    paddingTop: 2,
  },
  secondaryLink: {
    fontSize: 13,
    fontWeight: "700",
  },
  googleButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  adminRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  adminCopy: {
    flex: 1,
    gap: 2,
  },
  adminLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  adminHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  adminLink: {
    fontSize: 13,
    fontWeight: "800",
  },
});
