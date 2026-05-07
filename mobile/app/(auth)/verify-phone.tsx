import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { ScreenShell } from "@/components/screen-shell";
import { useAppTheme } from "@/theme";
import { useCustomerRequestOtpMutation, useCustomerVerifyOtpMutation } from "@/features/auth/mutations";

type VerifyForm = {
  code: string;
};

export default function CustomerVerifyPhoneScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ phone?: string }>();
  const phone = typeof params.phone === "string" ? params.phone : "";
  const verifyOtp = useCustomerVerifyOtpMutation();
  const resendOtp = useCustomerRequestOtpMutation();
  const { control, handleSubmit } = useForm<VerifyForm>({
    defaultValues: {
      code: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await verifyOtp.mutateAsync({
      phone,
      code: values.code.trim(),
    });
    router.replace("/(customer)/(tabs)");
  });

  const handleResend = async () => {
    if (!phone) return;
    await resendOtp.mutateAsync({ phone });
  };

  return (
    <ScreenShell
      eyebrow="Verifikasi OTP"
      title="Masukkan kode"
      subtitle={phone ? `Kode OTP dikirim ke ${phone}.` : "Masukkan kode OTP dari WhatsApp kamu."}
    >
      <View
        style={[
          styles.panel,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.panelTitle, { color: theme.colors.foreground }]}>Kode verifikasi</Text>
        <Text style={[styles.panelHint, { color: theme.colors.foregroundMuted }]}>
          Kode berlaku singkat. Pastikan nomor yang kamu pakai benar.
        </Text>

        <Controller
          control={control}
          name="code"
          rules={{ required: true }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="000000"
              placeholderTextColor={theme.colors.foregroundMuted}
              keyboardType="number-pad"
              autoCapitalize="none"
              maxLength={6}
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
          onPress={() => void onSubmit()}
          disabled={verifyOtp.isPending || !phone}
          style={[
            styles.submit,
            {
              backgroundColor: theme.colors.accent,
              opacity: verifyOtp.isPending || !phone ? 0.8 : 1,
            },
          ]}
        >
          <Text style={styles.submitText}>{verifyOtp.isPending ? "Memverifikasi..." : "Verifikasi"}</Text>
        </Pressable>

        {verifyOtp.error ? (
          <Text style={[styles.error, { color: theme.colors.danger }]}>
            {verifyOtp.error instanceof Error ? verifyOtp.error.message : "Kode OTP tidak valid"}
          </Text>
        ) : null}

        <View style={styles.linksRow}>
          <Pressable onPress={() => router.replace("/(auth)/login-phone")} hitSlop={8}>
            <Text style={[styles.secondaryLink, { color: theme.colors.foregroundMuted }]}>Ganti nomor</Text>
          </Pressable>
          <Pressable onPress={() => void handleResend()} disabled={resendOtp.isPending || !phone} hitSlop={8}>
            <Text style={[styles.secondaryLink, { color: theme.colors.accent }]}>
              {resendOtp.isPending ? "Mengirim..." : "Kirim ulang OTP"}
            </Text>
          </Pressable>
        </View>

        {resendOtp.error ? (
          <Text style={[styles.error, { color: theme.colors.danger }]}>
            {resendOtp.error instanceof Error ? resendOtp.error.message : "Gagal mengirim ulang OTP"}
          </Text>
        ) : null}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 12,
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
    fontSize: 16,
    letterSpacing: 5,
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
  linksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  secondaryLink: {
    fontSize: 13,
    fontWeight: "700",
  },
});
